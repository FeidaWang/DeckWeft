import {readFile,readdir} from 'node:fs/promises';
import {assertVisualProject} from '../core/visual-project.mjs';
import {contentHash} from '../scene/web/compile.mjs';
import {visualAssetResources} from '../assets/visual.mjs';
import {exportDeck} from '../render/export.mjs';
import {compositions,inferFamily} from '../design/compositions.mjs';
import {checkRender} from '../quality/render-checks.mjs';
import {boundedRepair} from '../quality/repair-plan.mjs';
import {createQualityReceipt,recordVisualReview,receiptCurrent} from '../quality/visual-review.mjs';
import {designBrief,inspectContent} from './design-brief.mjs';
import {parseRevision,applyRevision} from './revision-plan.mjs';
import {TASK_TOOLS} from './director.mjs';
import {DeckError} from '../core/errors.mjs';
import {assertEvidenceSupplied} from '../design/scene-semantics.mjs';
const fail=(code,message)=>{throw new DeckError(code,message,409);};
const hash=contentHash;
/** Bytes of the local renderer/contracts/themes invalidate receipts after source changes. */
export async function rendererBasis(){const entries=[];async function scan(url){for(const e of (await readdir(url,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const u=new URL(e.name+(e.isDirectory()?'/':''),url);if(e.isDirectory())await scan(u);else entries.push([u.pathname,hash((await readFile(u)).toString('base64'))]);}}for(const folder of ['../','../../schemas/','../../themes/'])await scan(new URL(folder,import.meta.url));return hash(entries);}
async function resolveAssets(project,home){const resources=await visualAssetResources(project,home);const missing=project.document.blocks.filter(b=>b.type==='image'&&!resources[b.assetId]).map(b=>b.assetId);if(missing.length)fail('ASSET_MISSING','Restore original local assets: '+missing.join(', '));return resources;}
async function preview(project,home){const resources=await resolveAssets(project,home);return exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:resources}).body;}
const invalidate=t=>{t.receipt=null;t.observation=null;t.previewHash=null;t.status='revision-pending';t.brief=designBrief(t.project,t.request,t.scope);};
/** Same dispatcher for local scripts, bridge and MCP. Browser/image operations are explicit
 * capabilities: a host may report observations; the runtime never silently launches a provider. */
export async function executeVisualTool(input,name,args={}, {home,capture,now=Date.now}={}) {
 const task=structuredClone(input);let value;
 try{
  if(task.format!=='deckweft-visual-task'||task.version!==1)fail('TASK_FORMAT','Use a current task checkpoint.');
  assertVisualProject(task.project);
  if(!TASK_TOOLS.includes(name)||!task.tools.includes(name))fail('TOOL_SCOPE','Tool is outside this task grant.');
  if(args.expectedSequence!==task.sequence)fail('REVISION_CONFLICT','Task changed. Reload its checkpoint and replan.');
  if(name==='content.inspect'){value=inspectContent(task.project);task.contentCheck=value;task.status='content-inspected';}
  if(name==='design.propose'){value=designBrief(task.project,task.request,task.scope);task.brief=value;task.status='design-proposed';}
  if(name==='assets.resolve'){value={assetIds:Object.keys(await resolveAssets(task.project,home)),policy:'local-originals-only; no automatic image requests'};task.status='assets-resolved';}
  if(name==='render.preview'){
   if(!task.contentCheck)fail('CONTENT_CHECK_REQUIRED','Inspect supplied claims and references first.');
   const html=await preview(task.project,home);task.previewHash=hash(html);task.rendererBasis=await rendererBasis();task.status='preview-ready';value={html,htmlHash:task.previewHash,projectHash:hash(task.project),rendererBasis:task.rendererBasis};
  }
  if(name==='design.patch'){
   const patch=args.patch||parseRevision(task.project,args.request||task.request,{sceneId:args.sceneId,datasetId:args.datasetId});
   const next=applyRevision(task.project,patch,task.scope);
   task.history.push({sequence:task.sequence,project:task.project,receipt:task.receipt,observation:task.observation});task.project=next;task.contentCheck=null;invalidate(task);value={patch,project:next};
  }
  if(name==='render.inspect'){
   if(!task.previewHash||task.rendererBasis!==await rendererBasis()||hash(await preview(task.project,home))!==task.previewHash)fail('STALE_PREVIEW','Render the current source before inspection.');
   if(args.review){
    if(!task.receipt||!receiptCurrent(task.receipt,task.project,task.observation))fail('STALE_RECEIPT','Recapture the current source and audience state.');
    // The caller must actually deliver/view pixels. The attestation is never a DOM inference.
    task.receipt=recordVisualReview(task.receipt,args.review);task.status=task.receipt.status==='passed'?'reviewed':'quality-failed';value=task.receipt;
   }else{
    const measure=async(project,meta={})=>{
     const html=await preview(project,home),htmlHash=hash(html);
     const measured=capture?await capture({project,html,htmlHash,...meta}):args.measurement;
     if(!measured||measured.htmlHash!==htmlHash||!measured.captures?.length||!measured.observations?.length||!measured.delivery?.trim())fail('BROWSER_REQUIRED','Supply fresh browser observations, image captures and an honest delivery record for this HTML.');
     if(measured.captures.some(c=>!c.file||!(/^[a-f0-9]{64}$/).test(c.sha256)))fail('CAPTURE_INVALID','Bind each actual image to its SHA-256 bytes.');
     const checks=checkRender(project,measured.observations,{...measured.diagnostics,traces:measured.traces||[],requireInteractions:true});
     const observation={...measured,rendererBasis:task.rendererBasis,provenance:capture?'local-capture-callback':'host-reported-not-independently-verified'};
     return {...checks,observation,captures:measured.captures,artifact:html};
    };
    let checked=await measure(task.project);
    if(args.repair===true&&task.receipt?.review?.issues.some(i=>i.severity==='error'))checked={...checked,ok:false,issues:[...checked.issues,...task.receipt.review.issues.filter(i=>i.severity==='error').map(i=>({...i,kind:'visual-review'}))]};
    if(!checked.ok&&args.repair===true){
     if(!task.tools.includes('design.patch'))fail('TOOL_SCOPE','Repair requires design.patch scope.');
     if(!capture)fail('BROWSER_REQUIRED','Automatic repair requires a fresh capture capability for each candidate.');
     const b=task.budget,s=task.repairSpent;
     const result=await boundedRepair({project:task.project,initial:checked,now,budget:{maxRounds:Math.max(0,b.maxRounds-s.rounds),maxCandidates:Math.max(0,b.maxCandidates-s.candidates),maxSceneChanges:Math.max(0,b.maxSceneChanges-s.sceneChanges),maxMilliseconds:Math.max(0,b.maxMilliseconds-s.milliseconds)},lastValid:task.lastValid,propose:async(p,issues)=>{const issue=issues.find(i=>['repeated-composition','visual-review'].includes(i.kind)&&task.scope.includes(i.sceneId));if(!issue)return [];const scene=p.plan.scenes.find(s=>s.id===issue.sceneId);return compositions.filter(c=>c.family===inferFamily(p.document,scene)&&c.id!==scene.composition).map(c=>({sceneId:scene.id,composition:c.id}));},evaluate:measure});
     for(const key of Object.keys(s))s[key]+=result.spent[key];
     // Keep diagnostics/source, but do not duplicate huge HTML in each attempt.
     task.repair={...result,result:{...result.result,artifact:undefined},artifact:undefined};
     if(result.ok){task.history.push({sequence:task.sequence,project:task.project,receipt:task.receipt,observation:task.observation});task.project=result.project;checked=result.result;task.previewHash=hash(checked.artifact);task.brief=designBrief(task.project,task.request,task.scope);}
     else {task.status='repair-exhausted';task.diagnostics.push({code:'REPAIR_EXHAUSTED',recovery:'Restore a missing resource or revise the affected unlocked layout. Keep this checkpoint and last valid artifact; start an explicit new task for more rounds.'});}
    }
    task.observation=checked.observation;task.receipt=createQualityReceipt(task.project,checked.observation, {ok:checked.ok,issues:checked.issues,coverage:checked.coverage,traceCount:checked.traceCount},checked.captures);
    if(task.status!=='repair-exhausted')task.status=checked.ok?'awaiting-image-review':'quality-failed';value={receipt:task.receipt,repair:task.repair||null};
   }
  }
  if(name==='artifact.export'){
   if(args.format==='project'){value={file:'recovery.project.json',body:JSON.stringify(task.project,null,2),mime:'application/json'};}
   else if(args.format==='checkpoint'){value={file:'recovery.task.json',body:JSON.stringify(task,null,2),mime:'application/json'};}
   else if(args.format==='html'){
    assertEvidenceSupplied(task.project.plan);
    const html=await preview(task.project,home);
    if(task.receipt?.status!=='passed'||!receiptCurrent(task.receipt,task.project,task.observation)||task.rendererBasis!==await rendererBasis()||hash(html)!==task.previewHash)fail('STALE_RECEIPT','Final HTML needs a current passing machine and actual image review receipt.');
    task.lastValid={project:structuredClone(task.project),artifact:html,receipt:task.receipt,htmlHash:hash(html)};task.status='exported';value={file:'presentation.html',body:html,mime:'text/html',htmlHash:hash(html),receiptId:task.receipt.id};
   }else fail('EXPORT_FORMAT','Use html, project or checkpoint. Native v3 exporters remain a later gate.');
  }
  task.sequence++;task.basis=hash(task.project);task.events.push({sequence:task.sequence,tool:name,status:task.status});return {ok:true,task,value};
 }catch(e){task.sequence++;const diagnostic={code:e.code||'TASK_FAILED',message:e.message,recovery:'Reload this checkpoint; preserve original and lastValid. Correct only the diagnosed input or scope and retry.'};task.diagnostics.push(diagnostic);task.status=diagnostic.code==='REVISION_CONFLICT'?'revision-conflict':diagnostic.code==='DATA_REQUIRED'?'data-required':diagnostic.code==='STALE_RECEIPT'?'stale-receipt':'blocked';task.events.push({sequence:task.sequence,tool:name,status:task.status,diagnostic});return {ok:false,task,error:diagnostic};}
}

/** Drive ordinary internal stages under one task scope. review is an explicit capability
 * that receives the current captured images; its absence is a resumable boundary. */
export async function runVisualTask(input,{home,capture,review,checkpoint=async()=>{},now}={}){
 let task=structuredClone(input),artifact=null;
 async function step(name,args={}){const r=await executeVisualTool(task,name,{expectedSequence:task.sequence,...args},{home,capture,now});task=r.task;await checkpoint(task);return r;}
 for(const name of ['content.inspect','design.propose','assets.resolve','render.preview']){const r=await step(name);if(!r.ok)return {ok:false,task,artifact,error:r.error};if(name==='render.preview')artifact={file:'preview.html',body:r.value.html};}
 if(!capture)return {ok:false,task,artifact,required:'browser-capture'};
 let r=await step('render.inspect',{repair:true});if(!r.ok||task.receipt?.checks.ok!==true)return {ok:false,task,artifact,error:r.error,required:'quality-repair'};
 if(!review)return {ok:false,task,artifact,required:'actual-image-review'};
 while(true){
  r=await step('render.inspect',{review:await review({receipt:task.receipt,project:task.project,observation:task.observation})});
  if(!r.ok)return {ok:false,task,artifact,error:r.error,required:'actual-image-review'};
  if(task.receipt?.status==='passed')break;
  if(!task.receipt?.review?.issues.some(i=>i.severity==='error'))return {ok:false,task,artifact,required:'scoped-visual-diagnostic'};
  r=await step('render.inspect',{repair:true});
  if(!r.ok||task.receipt?.checks.ok!==true)return {ok:false,task,artifact,error:r.error,required:'quality-repair'};
 }
 r=await step('artifact.export',{format:'html'});if(r.ok)artifact=r.value;return {ok:r.ok,task,artifact,error:r.error};
}
