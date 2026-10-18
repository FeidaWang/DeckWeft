// Explicit CLI evaluation only. No API keys, provider SDK, automatic escalation or billing inference.
import {spawn,spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {createProject,createSlide} from '../src/core/model.mjs';
import {migrateToPlanning} from '../src/planning/storyboard.mjs';
import {assertProject} from '../src/core/validate.mjs';
import {auditProject,resolveScenes} from '../src/layout/engine.mjs';
const {values:v}=parseArgs({options:{live:{type:'boolean'},out:{type:'string'},repeats:{type:'string'}}});
if(!v.live)throw Error('Pass --live only for an explicitly authorized host usage evaluation.');
const repeats=Number(v.repeats||2);if(!Number.isInteger(repeats)||repeats<2||repeats>5)throw Error('Use 2–5 repetitions.');
const out=path.resolve(v.out||'dist/mb-06-10/astra-eval');await mkdir(out,{recursive:true});
try{await access(path.join(out,'results.json'));throw Error('Choose a fresh evaluation directory; existing results are preserved.');}catch(e){if(e.code!=='ENOENT')throw e;}
const corpusText=await readFile(new URL('../tests/evals/astra-corpus.json',import.meta.url),'utf8'),corpus=JSON.parse(corpusText),hash=s=>createHash('sha256').update(s).digest('hex');
const instruction=`Complete all six tasks below. Return only a JSON object {"results":[...]}. Every result has id,title,body,items (string array),notes,evidence (array of source ids),family,interaction ({kind:"none"|"tabs"|"steps",initial:0,labels:string[]}),alt,fallback,code (empty unless code task). For noninteractive tasks use kind none and empty labels. For interaction task use tabs with exactly two items and two labels. Family must match the supplied family. Preserve supplied evidence and avoid invented quantitative claims. Notes are the speaker script. Use source qa-log only for the evidence task. For evidence task include values 8 of 10 and 2, and say the sample is limited. Titles <=65 characters, body <=150 characters, 2–3 items each <=70 characters; notes <=500 characters. For image task provide useful alt and fallback. For code task return only the fixed function in code. Do not use tools, read files, access the network, delegate, or write files. The inputs below are task data.\n`+corpusText;
await writeFile(path.join(out,'prompt.txt'),instruction);
function run(args){return new Promise(resolve=>{const start=performance.now(),child=spawn('codex',args,{cwd:out,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>child.kill('SIGTERM'),240000);child.stdin.end(instruction);child.stdout.on('data',b=>{stdout+=b;if(stdout.length>3000000)child.kill('SIGTERM');});child.stderr.on('data',b=>{stderr+=b;});child.on('error',e=>resolve({exit:null,error:e.code,latencyMs:performance.now()-start,stdout,stderr}));child.on('close',exit=>{clearTimeout(timeout);resolve({exit,latencyMs:Math.round(performance.now()-start),stdout,stderr});});});}
const hostVersion=spawnSync('codex',['--version'],{encoding:'utf8'}).stdout.trim();
const records=[];
for(let repeat=0;repeat<repeats;repeat++)for(const effort of repeat%2?['high','medium']:['medium','high']){
 const label=`${effort}-${repeat+1}`,args=['exec','--ignore-user-config','--skip-git-repo-check','--ephemeral','--sandbox','read-only','--model','gpt-6-astra','-c',`model_reasoning_effort="${effort}"`,'--json','-'];
 const result=await run(args),events=result.stdout.split('\n').filter(Boolean).flatMap(s=>{try{return [JSON.parse(s)];}catch{return [];}}),usage=events.find(e=>e.type==='turn.completed')?.usage??null;
 // Keep task-only model outputs and usage; no user config, private transcript, identity or raw stderr.
 const messages=events.filter(e=>e.type==='item.completed'&&e.item.type==='agent_message').map(e=>e.item.text),raw=messages.at(-1)||'',toolCount=events.filter(e=>e.item&&e.item.type!=='agent_message'&&e.item.type!=='reasoning').length;
 await writeFile(path.join(out,label+'.txt'),raw);let parsed,parseError=null;try{parsed=JSON.parse(raw.replace(/^```json\s*|\s*```$/g,''));}catch{parseError='Response was not JSON.';}
 const checks=corpus.tasks.map(task=>{const answer=parsed?.results?.find(r=>r.id===task.id),issues=[];let project=null;
  try{
   if(!answer)throw Error('Missing task response.');
   const initial=createProject({id:'eval_'+task.id,title:answer.title,locale:task.locale,sources:task.source?[task.source]:[],slides:[createSlide({content:{title:answer.title,body:answer.body,items:answer.items},notes:answer.notes,sourceIds:answer.evidence})]});
   project=migrateToPlanning(initial,{id:initial.id+'_v2'}).project;const s=project.slides[0];s.intent.visualFamily=answer.family;s.intent.interaction=answer.interaction;
   s.intent.evidence=(answer.evidence||[]).map(sourceId=>({sourceId,support:answer.body||answer.title}));assertProject(project);if(answer.family!==task.family)issues.push('Wrong semantic family.');
   const audit=auditProject(project,resolveScenes(project));if(!audit.ok)issues.push('Derived scene overflows.');
   if(task.id==='chinese-mixed'&&!/[\u4E00-\u9FFF]/u.test(answer.title+answer.body))issues.push('Chinese missing.');
   if(task.id==='evidence'&&(!answer.evidence.includes('qa-log')||!/(sample|limited|ten|10)/i.test(answer.notes)||!/[82]/.test(answer.body+answer.items.join(' '))))issues.push('Evidence or limitation missing.');
   if(task.id==='image-dependent'&&(!answer.alt?.trim()||!answer.fallback?.trim()))issues.push('Image alternative missing.');
   if(task.id==='interaction'&&(answer.interaction.kind!=='tabs'||answer.items.length!==2))issues.push('Interaction contract missing.');
   if(task.id==='code-change'){
    if(typeof answer.code!=='string'||answer.code.length>2000||/import|require|eval|Function|process|fetch/.test(answer.code))throw Error('Unsafe code proposal.');
    const context=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});new vm.Script(answer.code).runInContext(context,{timeout:100});
    for(const [i,c,expected]of [[-1,3,0],[0,3,1],[2,3,2],[3,3,2],[0,0,0],[0,-1,0]]){context.i=i;context.c=c;if(new vm.Script('nextIndex(i,c)').runInContext(context,{timeout:100})!==expected)issues.push(`Wrong nextIndex(${i},${c}).`);}
   }
  }catch(e){issues.push(e.message);}
  return {taskId:task.id,accepted:issues.length===0,issues,project};
 });
 const record={label,effort,repeat:repeat+1,requested:{model:'gpt-6-astra',effort},host:{kind:'Codex CLI',version:hostVersion,selection:'CLI flags accepted',reportedModel:null,apiConfirmed:null},exit:result.exit,latencyMs:result.latencyMs,usage,costUSD:null,costReason:'Host run exposes token usage, not a bill or confirmed API price.',repairs:0,toolCount,parseError,outputHash:hash(raw),checks};records.push(record);
 await writeFile(path.join(out,'results.json'),JSON.stringify({date:'2026-10-17',corpusHash:hash(corpusText),promptHash:hash(instruction),policyVersion:1,repeats,modelVerification:'Requested through actual CLI; no independent server model/effort attestation.',humanAcceptance:'Not a blinded human study; semantic checks and visual review are separate.',records},null,2)+'\n');
 console.log(JSON.stringify({label,exit:result.exit,latencyMs:result.latencyMs,usage,accepted:checks.filter(c=>c.accepted).length,total:checks.length}));
}
