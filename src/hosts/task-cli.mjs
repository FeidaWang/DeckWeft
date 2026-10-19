import path from 'node:path';
import {parseArgs} from 'node:util';
import {mkdir,open,rm,readFile} from 'node:fs/promises';
import {createVisualTask} from '../agent/director.mjs';
import {executeVisualTool} from '../agent/tools.mjs';
import {atomicWrite,rejectSymlinks} from '../services/io.mjs';
import {assertHost,probeHost} from './capabilities.mjs';
import {draftWithHost,patchWithHost,reviewWithHost} from './tasks.mjs';
export async function runTaskCli(argv=process.argv.slice(2)){
 const {values:a}=parseArgs({args:argv,options:{brief:{type:'string'},out:{type:'string'},task:{type:'string'},tool:{type:'string'},args:{type:'string'},home:{type:'string'},help:{type:'boolean'},host:{type:'string'},live:{type:'boolean'},'pixel-control':{type:'boolean'},model:{type:'string'},request:{type:'string'},'expected-sequence':{type:'string'},'timeout-ms':{type:'string'}}});
 if(a.help){console.log('Create: deckweft visual-task --brief brief.json --out dist/my-task [--home asset-home] [--host codex|claude-code --live [--pixel-control]]\nContinue: --task task.json --tool TOOL --args args.json\nHost revision: --task task.json --host codex --live --tool design.patch --request "..." --expected-sequence N\nHost pixel review: --task task.json --host codex --live --tool render.inspect --expected-sequence N\nOptions: --model exact-model (otherwise host default), --timeout-ms 120000 (1000–600000).\nEvery continuation requires the current expectedSequence. HTML requires current browser capture and actual image review. Host selection uses existing configured authentication and may consume its allowance; no host/model fallback. Without --host, all work stays deterministic and local.');return;}
 if(a.host){assertHost(a.host);if(!a.live)throw Error('HOST_LIVE_OPT_IN_REQUIRED: add --live only for the selected authorized host.');}
 else if(a.live||a.model)throw Error('Choose --host for live/model options.');
 let file,task;
 if(a.brief){if(!a.out||a.task)throw Error('Choose a new output folder.');await rejectSymlinks(path.resolve(a.out));await mkdir(path.dirname(path.resolve(a.out)),{recursive:true});await mkdir(path.resolve(a.out),{recursive:false});file=path.resolve(a.out,'task.json');}
 else{if(!a.task||!a.tool)throw Error('Use --brief/--out or --task/--tool; see --help.');file=path.resolve(a.task);await rejectSymlinks(file);}
 const lock=file+'.lock';await rejectSymlinks(lock);const handle=await open(lock,'wx',0o600);
 const controller=new AbortController(),abort=()=>controller.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try{
  const cwd=path.dirname(file),home=a.home||cwd,options={host:a.host,cwd,home,live:!!a.live,pixelControl:!!a['pixel-control'],signal:controller.signal,...(a.model?{model:a.model}:{}),timeout:a['timeout-ms']===undefined?120000:Number(a['timeout-ms'])};
  if(a.brief){const brief=JSON.parse(await readFile(a.brief,'utf8'));if(a.host){options.capabilities=await probeHost({host:a.host,cwd});const r=await draftWithHost(brief,options);if(!r.ok){console.error(JSON.stringify({error:r.error||r.receipt.error,receipt:r.receiptFile}));process.exitCode=1;return;}task=r.task;}else task=createVisualTask(brief);await atomicWrite(file,JSON.stringify(task,null,2));}
  else task=JSON.parse(await readFile(file,'utf8'));
  if(a.host&&!a.brief){
   const expected=a.args?JSON.parse(await readFile(a.args,'utf8')).expectedSequence:Number(a['expected-sequence']);
   if(!Number.isSafeInteger(expected)||expected!==task.sequence)throw Error('REVISION_CONFLICT: supply the current --expected-sequence or args expectedSequence.');
   let r;
   if(a.tool==='design.patch')r=await patchWithHost(task,a.request,options);
   else if(a.tool==='render.inspect'){const review=await reviewWithHost({task},options);if(!review.ok){console.error(JSON.stringify({error:review.error||review.receipt.error,receipt:review.receiptFile}));process.exitCode=1;return;}r=await executeVisualTool(task,'render.inspect',{expectedSequence:task.sequence},{home,trustedReview:review.review});}
   else throw Error('Host continuation supports design.patch or render.inspect; use shared local tools for other steps.');
   if(r.task){task=r.task;await atomicWrite(file,JSON.stringify(task,null,2));}
   if(!r.ok){console.error(JSON.stringify({error:r.error||r.receipt?.error,receipt:r.receiptFile}));process.exitCode=1;return;}
  }else{
   const calls=a.brief?['content.inspect','design.propose','assets.resolve','render.preview']:[a.tool];
   for(const name of calls){const args=a.args?JSON.parse(await readFile(a.args,'utf8')):{expectedSequence:task.sequence};const result=await executeVisualTool(task,name,args,{home});task=result.task;await atomicWrite(file,JSON.stringify(task,null,2));
    if(result.ok){if(result.value?.html)await atomicWrite(path.join(cwd,'preview.html'),result.value.html);if(result.value?.file){const output=await open(path.join(cwd,task.sequence+'-'+result.value.file),'wx',0o600);try{await output.writeFile(result.value.body);}finally{await output.close();}}}
    else{console.error(JSON.stringify(result.error));process.exitCode=1;break;}
   }
  }
  console.log(JSON.stringify({task:file,sequence:task.sequence,status:task.status,diagnostics:task.diagnostics}));
 }finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);await handle.close();await rm(lock);}
}
