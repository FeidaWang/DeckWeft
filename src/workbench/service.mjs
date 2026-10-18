import path from 'node:path';
import {mkdir,open,rm,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {atomicWrite,rejectSymlinks,readJSON} from '../services/io.mjs';
import {createVisualTask} from '../agent/director.mjs';
import {executeVisualTool,runVisualTask} from '../agent/tools.mjs';
import {draftWithHost,patchWithHost,reviewWithHost} from '../hosts/tasks.mjs';
import {contentHash} from '../scene/web/compile.mjs';
import {preferences,applyChoices} from './preferences.mjs';
import {localCapture} from './capture.mjs';
import {hostImages} from '../hosts/run-receipt.mjs';
import {DeckError} from '../core/errors.mjs';
const fail=(code,message,status=409)=>{throw new DeckError(code,message,status);};
const text=value=>{if(typeof value!=='string'||!value.trim()||value.length>12000)fail('WORKBENCH_REQUEST','Supply a prompt of 1–12000 characters.',422);return value;};
export class WorkbenchService {
 constructor({store,browserPath,capture,hostOptions={}}){this.store=store;this.root=path.join(store.home,'workbench');this.capture=capture||localCapture(browserPath);this.hostOptions=hostOptions;this.active=new Map();}
 directory(id){if(!/^[a-f0-9-]{36}$/.test(id))fail('WORKBENCH_ID','Choose a current workbench.',404);return path.join(this.root,id);}
 async read(id){const file=path.join(this.directory(id),'checkpoint.json');await rejectSymlinks(file);return readJSON(file,64_000_000);}
 async write(r){await atomicWrite(path.join(this.directory(r.id),'checkpoint.json'),JSON.stringify(r));}
 summary(r){const t=r.task;return {id:r.id,running:r.running,sequence:r.sequence,status:r.status,error:r.error||null,preferences:r.preferences,request:r.request,taskStatus:t?.status,project:t?.project||null,diagnostics:t?.diagnostics||[],events:t?.events||[],repairSpent:t?.repairSpent,receipt:t?.receipt?{id:t.receipt.id,status:t.receipt.status,checks:t.receipt.checks,review:t.receipt.review,captures:t.receipt.captures}:null,hasLastValid:!!t?.lastValid,preview:!!r.html,canExport:r.status==='exported'&&t?.receipt?.status==='passed'&&t.status==='exported'&&!r.running,captureAvailable:!!this.capture};}
 async get(id){return this.summary(await this.read(id));}
 async create(data){
  const profile=preferences(data.preferences),request=text(data.request);if(data.sourceText!==undefined)text(data.sourceText);if(data.host&&!['local','codex'].includes(data.host))fail('WORKBENCH_HOST','Choose local or explicitly opt-in Codex; Claude is deferred.',422);
  if(data.host==='codex'&&data.live!==true)fail('HOST_LIVE_OPT_IN_REQUIRED','Explicitly allow this Codex operation.');
  const id=randomUUID(),dir=this.directory(id);await rejectSymlinks(dir);await mkdir(dir,{recursive:true,mode:0o700});
  let project;if(data.projectId){project=await this.store.get(data.projectId);if(project.revision.number!==data.expectedRevision)fail('REVISION_CONFLICT','Save and reload the selected source.');if(project.extensions.deckweftWorkbench)fail('WORKBENCH_EXISTS','Resume the existing workbench for this source.');}
  const record={id,sequence:0,preferences:profile,request,sourceInput:{text:data.sourceText||null,project:project?structuredClone(project):null},running:false,status:'planned',task:null,html:null};await this.write(record);
  return this.start(record,{...data,action:'generate',source:project});
 }
 async action(id,data){const r=await this.read(id);if(data.expectedSequence!==r.sequence)fail('REVISION_CONFLICT','This checkpoint changed. Reload before continuing.');if(r.running)fail('WORKBENCH_BUSY','Wait for the current operation or cancel it.');if(!r.task)fail('WORKBENCH_EMPTY','Retry generation with the original prompt.');return this.start(r,data);}
 async start(record,data){
  if(data.host&&!['local','codex'].includes(data.host))fail('WORKBENCH_HOST','No fallback: choose local or explicitly opt-in Codex.',422);
  const id=record.id;if(this.active.has(id))fail('WORKBENCH_BUSY','An operation is already running.');
  const dir=this.directory(id),lock=path.join(dir,'operation.lock');await rejectSymlinks(lock);let handle;
  try{handle=await open(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')fail('WORKBENCH_BUSY','This checkpoint is locked; use Recover after an interrupted server.');throw e;}
  const controller=new AbortController();this.active.set(id,controller);await handle.writeFile(JSON.stringify({pid:process.pid}));
  record.running=true;record.status='running';record.error=null;record.sequence++;await this.write(record);
  const job=this.perform(record,data,controller.signal).catch(async e=>{record.status=controller.signal.aborted?'cancelled':'blocked';record.error={code:controller.signal.aborted?'WORKBENCH_CANCELLED':e.code||(/^HOST_|^CAPTURE_/.test(e.message)?e.message:'WORKBENCH_FAILED'),message:controller.signal.aborted?'Cancelled. Keep the checkpoint and last valid export.':e instanceof DeckError?e.message:'Operation did not complete. Keep the checkpoint; check the local host/browser and retry explicitly.'};}).finally(async()=>{record.running=false;record.sequence++;try{await this.write(record);}finally{this.active.delete(id);await handle.close();await rm(lock,{force:true});}});
  this.active.get(id).job=job;job.catch(()=>{});return this.summary(record);
 }
 async perform(r,data,signal){
  const home=this.directory(r.id),options={...this.hostOptions,host:'codex',cwd:home,home:this.store.home,live:data.live===true,signal};
  const checkpoint=async task=>{r.task=task;r.sequence++;await this.write(r);};
  const capture=this.capture&&data.capture===true?(input=>this.capture({...input,home,signal})):null;
  let task=r.task;
  if(data.action==='generate'){
   if(data.host==='codex'&&!data.source){const drafted=await draftWithHost({request:r.request+'\nAuthor preferences (data): '+JSON.stringify(r.preferences),sourceText:data.sourceText,locale:r.preferences.outputLanguage},options);if(!drafted.ok)fail(drafted.error||drafted.receipt.error,'Host drafting failed; original prompt remains available.');task=drafted.task;}
   else task=createVisualTask({request:data.sourceText||r.request,project:data.source,locale:r.preferences.outputLanguage});
   task.project=applyChoices(task.project,{id:r.id,profile:r.preferences,projectWide:true});task.project=await this.store.save(task.project,data.source?{expectedRevision:data.source.revision.number}:{create:true});task.original=structuredClone(task.project);await checkpoint(task);
  }else{
   const current=await this.store.get(task.project.id);if(data.action!=='sync'&&contentHash(current)!==contentHash(task.project))fail('REVISION_CONFLICT','The source was edited elsewhere. Recover or start from its saved version.');
   if(data.action==='sync'){const previous=task;task=createVisualTask({request:task.request,project:current});task.lastValid=previous.lastValid;task.repairSpent=previous.repairSpent;task.history=previous.history;await checkpoint(task);
   }else if(data.action==='revise'){
    const request=text(data.request);if(!Array.isArray(data.sceneIds)||!data.sceneIds.length||data.sceneIds.some(id=>!task.project.plan.scenes.some(s=>s.id===id)))fail('TOOL_SCOPE','Choose existing pages for this revision.');task.scope=[...new Set(data.sceneIds)];
    const style=request.match(/(?:use|switch to|theme[: ]*|使用|改为|改成)\s*(electric-violet|dark-data|cream-collage)\b/i);
    let result;if(style&&!/(?:statement|evidence|image|metric|comparison|process)-/.test(request)){const profile={...r.preferences,visualStyle:style[1].toLowerCase()};task.project=applyChoices(task.project,{id:r.id,profile,scope:task.scope});task.receipt=null;task.observation=null;task.previewHash=null;result={ok:true,task};}
    else if(data.host==='codex'){if(data.live!==true)fail('HOST_LIVE_OPT_IN_REQUIRED','Explicitly allow this revision.');result=await patchWithHost(task,request,options);}else{
     const match=request.match(/(?:statement|evidence|image|metric|comparison|process)-(?:[a-z]+-?)+/i);result=await executeVisualTool(task,'design.patch',{expectedSequence:task.sequence,request,sceneId:task.scope[0],datasetId:data.datasetId,...(match?{patch:{kind:'composition',sceneId:task.scope[0],composition:match[0]}}:{})},{home:this.store.home});
    }
    if(!result.ok){if(result.task)await checkpoint(result.task);fail(result.error?.code||'WORKBENCH_REVISION','The scoped revision could not be applied. Keep the source and diagnose its data/locks.');}task=result.task;
   }else if(data.action==='choices'){
    const profile=preferences(data.preferences),next=applyChoices(task.project,{id:r.id,profile,scope:data.sceneIds,projectWide:data.projectWide===true,keepImages:data.keepImages||[]});
    // These are explicit author design choices; no source text is regenerated.
    task.history.push({sequence:task.sequence,project:task.project,receipt:task.receipt,observation:task.observation});task.project=next;task.receipt=null;task.observation=null;task.previewHash=null;if(data.projectWide===true)r.preferences=profile;
   }else if(!['inspect','review'].includes(data.action))fail('WORKBENCH_ACTION','Choose generate, revise, choices, inspect or review.',422);
   if(['revise','choices'].includes(data.action)){task.project=await this.store.save(task.project,{expectedRevision:current.revision.number});await checkpoint(task);}
  }
  signal.throwIfAborted();
  if(data.action==='review'&&data.host!=='codex'){
   await this.verifyImages(r);const receipt=task.receipt;if(!receipt||!data.review)fail('WORKBENCH_REVIEW','Open and actually inspect every current image first.');
   const reviewed=await executeVisualTool(task,'render.inspect',{expectedSequence:task.sequence,review:{...data.review,receiptId:receipt.id}},{home:this.store.home});await checkpoint(reviewed.task);if(!reviewed.ok)fail(reviewed.error.code,reviewed.error.message);
   const exported=await executeVisualTool(r.task,'artifact.export',{expectedSequence:r.task.sequence,format:'html'},{home:this.store.home});await checkpoint(exported.task);r.status=exported.ok?'exported':'review-required';return;
  }
  const review=data.host==='codex'&&data.live===true?async input=>{const result=await reviewWithHost(input, {...options,home:this.store.home});if(!result.ok)fail(result.error||result.receipt.error,'Image review failed. Retain the current checkpoint.');return result.review;}:undefined;
  let persisted=await this.store.get(task.project.id);const previousAccepted=task.lastValid;
  // Repair may select a new scene inside the shared tool. Save through the normal
  // revision writer, then recapture/review that exact saved envelope. Never rebind a receipt.
  for(let attempt=0;attempt<task.budget.maxRounds+2;attempt++){
   const completed=await runVisualTask(task,{home:this.store.home,capture,review,checkpoint});signal.throwIfAborted();task=completed.task;
   if(contentHash(task.project)!==contentHash(persisted)){
    const current=await this.store.get(task.project.id);if(contentHash(current)!==contentHash(persisted)){task.lastValid=previousAccepted;await checkpoint(task);fail('REVISION_CONFLICT','A newer source was saved during repair. Keep the candidate checkpoint.');}
    persisted=await this.store.save(task.project,{expectedRevision:persisted.revision.number});task.project=persisted;task.lastValid=previousAccepted;task.receipt=null;task.observation=null;task.previewHash=null;task.contentCheck=null;await checkpoint(task);continue;
   }
   r.task=task;r.html=completed.artifact?.body||r.html;r.status=completed.ok?'exported':completed.required||task.status;return;
  }
  fail('WORKBENCH_REPAIR_EXHAUSTED','Repair synchronization reached its bounded limit. Keep the checkpoint and last accepted artifact.');
 }
 async cancel(id){const active=this.active.get(id);if(!active)fail('WORKBENCH_IDLE','No operation is running.');active.abort();return {cancelRequested:true};}
 async recover(id){if(this.active.has(id))fail('WORKBENCH_BUSY','Cancel or wait for the current operation.');const dir=this.directory(id),lock=path.join(dir,'operation.lock');await rejectSymlinks(lock);try{const state=JSON.parse(await readFile(lock,'utf8'));try{process.kill(state.pid,0);fail('WORKBENCH_BUSY','The owning server is still alive.');}catch(e){if(e.code!=='ESRCH')throw e;}await rm(lock);}catch(e){if(e.code!=='ENOENT')throw e;}const r=await this.read(id);r.running=false;r.status='interrupted';r.sequence++;await this.write(r);return this.summary(r);}
 async verifyImages(r){const captures=r.task?.receipt?.captures||[];if(!captures.length)fail('WORKBENCH_REVIEW','Capture actual images first.');const images=await hostImages(captures.map(c=>c.file),this.directory(r.id));if(images.some((i,k)=>i.hash!==captures[k].sha256))fail('HOST_IMAGE_HASH_MISMATCH','Images changed; capture and review again.');}
 async export(id,lastValid=false){const r=await this.read(id);if(r.running)fail('WORKBENCH_BUSY','Wait for completion before export.');if(lastValid){if(!r.task?.lastValid)fail('WORKBENCH_LAST_VALID','No accepted export exists.');if(contentHash(r.task.lastValid.artifact)!==r.task.lastValid.htmlHash)fail('WORKBENCH_LAST_VALID','Accepted artifact bytes changed.');return {body:r.task.lastValid.artifact,mime:'text/html; charset=utf-8'};}await this.verifyImages(r);if(r.status!=='exported')fail('WORKBENCH_REVIEW','The current attempt has not passed. Use the explicit last accepted artifact when available.');const current=await this.store.get(r.task.project.id);if(contentHash(current)!==contentHash(r.task.project))fail('REVISION_CONFLICT','Source changed; recapture and review.');const result=await executeVisualTool(r.task,'artifact.export',{expectedSequence:r.task.sequence,format:'html'},{home:this.store.home});if(!result.ok)fail(result.error.code,result.error.message);return result.value;}
 async close(){await Promise.all([...this.active.values()].map(async a=>{a.abort();await a.job;}));}
}
