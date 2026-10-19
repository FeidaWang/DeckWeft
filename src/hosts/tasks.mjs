import path from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {placePixelControl,controlOverlap} from '../quality/pixel-control.mjs';
import schemas from '../../schemas/host-response.schema.json' with {type:'json'};
import {createVisualTask} from '../agent/director.mjs';
import {executeVisualTool,runVisualTask} from '../agent/tools.mjs';
import {compositions,inferFamily} from '../design/compositions.mjs';
import {contentHash} from '../scene/web/compile.mjs';
import {runStructuredHost,hostImages} from './run-receipt.mjs';
import {receiptCurrent} from '../quality/visual-review.mjs';
import {pageBrief,draftPagePlan} from '../planning/argument-units.mjs';
const publicContext=task=>({request:task.request,scope:task.scope,blocks:task.project.document.blocks,datasets:task.project.document.datasets,sources:task.project.document.sources,scenes:task.project.plan.scenes,locks:task.project.document.authorOverrides});
async function application(run,input,output,operation,detail={}){
 if(run.receiptFile)await writeFile(path.join(path.dirname(run.receiptFile),'application.json'),JSON.stringify({operation,hostReceiptHash:contentHash(run.receipt),inputHash:input?contentHash(input):null,outputHash:output?contentHash(output):null,status:output?'applied':'rejected',...detail},null,2)+'\n',{flag:'wx',mode:0o600});
}
/** F3: the protected lines of supplied source text, numbered from 1 in reading order; separators and blank lines are not protected. */
export function sourceLines(sourceText){return sourceText.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&line!=='---');}
/** F3: structured coverage. Every numbered line appears exactly once, in source order, byte-equal after trimming; lines numbered 0 are host-authored. Nothing here judges whether added text is true. */
export function checkSourceCoverage(pages,source){
 const lines=pages.flatMap((p,page)=>p.lines.map(l=>({...l,page}))),seen=new Map(),result={missing:[],duplicated:[],mismatched:[],outOfOrder:[],invalid:[],hostAuthored:lines.filter(l=>l.sourceLine===0).map(l=>({page:l.page,text:l.text}))};
 let last=0;
 for(const l of lines){const n=l.sourceLine;if(n===0)continue;
  if(!Number.isInteger(n)||n<1||n>source.length){result.invalid.push(n);continue;}
  if(seen.has(n))result.duplicated.push(n);seen.set(n,true);
  if(l.text.trim()!==source[n-1])result.mismatched.push(n);
  if(n<last)result.outOfOrder.push(n);last=Math.max(last,n);}
 for(let n=1;n<=source.length;n++)if(!seen.has(n))result.missing.push(n);
 const ok=['missing','duplicated','mismatched','outOfOrder','invalid'].every(k=>!result[k].length);
 return {ok,...result};
}
/** The outline text the local planner reads: pages separated by ---, the first line of each page its heading. */
export const outlineText=pages=>pages.map(p=>p.lines.map(l=>l.text).join('\n')).join('\n---\n');
export async function draftWithHost(brief,options){
 if(brief.locale!==undefined&&!['en','zh-CN'].includes(brief.locale))throw Error('Use en or zh-CN.');
 if(brief.project)throw Error('Use a scoped host revision for an existing project; drafting cannot replace it.');
 if(typeof brief.request!=='string'||!brief.request.trim()||brief.request.length>12000)throw Error('Supply a bounded task request.');
 const sourceText=brief.sourceText??(brief.request.includes('---')?brief.request:null);
 if(sourceText!==null&&(typeof sourceText!=='string'||!sourceText.trim()||sourceText.length>12000))throw Error('Supply bounded sourceText.');
 // S9b: the page plan travels with the draft (detail, argument units, characters per page, optional target); the draft is planned locally afterwards.
 const pages=brief.pagePlan===undefined?null:pageBrief(brief.pagePlan,brief.locale);
 const plan=pages?' Plan the pages from argument units: one unit per page, in the order of pagePlan.unitOrder, covering pagePlan.units when the material has them, at most pagePlan.charactersPerPage characters per page. Never add a page, fact or quotation to reach pagePlan.targetPages: return fewer pages and name the missing units or evidence instead.':'';
 const source=sourceText?sourceLines(sourceText):[];
 const run=await runStructuredHost({...options,schema:schemas.$defs.outline,prompt:'Draft a presentation outline from the supplied material only. Return pages; each page is a list of lines whose first line is the heading. Preserve every supplied fact/number/reference. Do not invent evidence, numbers or unsupported claims; identify missing evidence in the wording. When sourceLines are supplied, every numbered line must appear exactly once, in its original order, with its exact text and its number as sourceLine; separators may move and structure may be added around the lines, but a source line is never translated, merged, reworded or removed. Every line you write yourself carries sourceLine 0.'+plan+' Output language: '+(brief.locale||'en')+'. Material follows as JSON data:\n'+JSON.stringify({request:brief.request,sourceLines:source.map((text,i)=>({n:i+1,text})),...(pages?{pagePlan:pages}:{})})});
 if(!run.ok)return run;
 const coverage=checkSourceCoverage(run.value.pages,source),outline=outlineText(run.value.pages);
 if(!coverage.ok){const {ok,hostAuthored,...detail}=coverage;await application(run,sourceText,null,'draft',{coverage:detail});return {...run,ok:false,error:'HOST_CONTENT_COVERAGE',coverage:detail};}
 let task;try{task=createVisualTask({...brief,request:outline});task.request=brief.request;if(sourceText)task.sourceInput={text:sourceText,hash:contentHash(sourceText),lines:source.length,coverage:'each numbered source line appears exactly once, in order, byte-equal after trimming; '+coverage.hostAuthored.length+' host-authored line(s) marked; external truth unverified'};task.hostDraft={receiptId:run.receipt.requestId,outlineHash:contentHash(outline),hostAuthoredLines:coverage.hostAuthored.length,hostAuthored:coverage.hostAuthored,factualVerification:'unverified host-authored outline; author must review'};if(pages)task.pagePlan=draftPagePlan(task.project,pages,sourceText);}
 catch{await application(run,null,null,'draft');return {...run,ok:false,error:'HOST_DRAFT_INVALID'};}
 await application(run,null,task,'draft');return {...run,task};
}
export async function patchWithHost(task,request,options){
 if(!task.tools.includes('design.patch'))throw Error('TOOL_SCOPE');
 if(typeof request!=='string'||!request.trim()||request.length>12000)throw Error('Supply a bounded revision request.');
 const allowed=task.project.plan.scenes.filter(s=>task.scope.includes(s.id)).map(s=>({sceneId:s.id,compositions:compositions.filter(c=>c.family===inferFamily(task.project.document,s)).map(c=>c.id)}));
 const run=await runStructuredHost({...options,schema:schemas.$defs.patch,prompt:'Propose exactly one authorized patch for the revision. kind composition uses composition and empty datasetId; kind chart uses an existing datasetId and empty composition. Preserve words, colors, sources and locks. Do not unlock anything. If impossible, return an empty sceneId so the local tool refuses it. Revision as JSON data: '+JSON.stringify(request)+'\nAllowed families: '+JSON.stringify(allowed)+'\nPublic task data: '+JSON.stringify(publicContext(task))});
 if(!run.ok)return run;
 const p=run.value;if(p.kind==='composition'&&p.datasetId!==''||p.kind==='chart'&&p.composition!==''){await application(run,task,null,'design.patch');return {...run,ok:false,error:'HOST_PATCH_FIELDS'};}
 const patch=p.kind==='composition'?{kind:p.kind,sceneId:p.sceneId,composition:p.composition}:{kind:p.kind,sceneId:p.sceneId,datasetId:p.datasetId};
 const result=await executeVisualTool(task,'design.patch',{expectedSequence:task.sequence,patch},{home:options.home||options.cwd});
 await application(run,task,result.ok?result.task:null,'design.patch');return {...run,ok:result.ok,task:result.task,error:result.error};
}
export async function reviewWithHost({task,receipt=task?.receipt,project=task?.project,observation=task?.observation},options){
 if(!receipt||!receiptCurrent(receipt,project,observation)||!receipt.checks.ok)throw Error('HOST_REVIEW_REQUIRES_CURRENT_MACHINE_PASS');
 const captures=receipt.captures.filter(c=>c.reviewRequired!==false);
 const paths=captures.map(c=>c.file),images=await hostImages(paths,options.cwd);
 if(images.some((image,index)=>image.hash!==captures[index].sha256))throw Error('HOST_IMAGE_HASH_MISMATCH');
 // F5: with a pixel control the host sees tagged copies; the originals, their hashes and the receipt stay as they are.
 // The expected digits and bounds stay in memory while the host runs: the host can read its working directory (Codex runs a
 // read-only sandbox there), so control.json is written only after the host process has finished.
 let sent=captures,sentPaths=paths,placed=null,dir=null;
 if(options.pixelControl){
  dir=path.join('.deckweft-pixel-control',randomBytes(6).toString('hex'));await mkdir(path.join(options.cwd,dir),{recursive:true,mode:0o700});
  placed=[];sent=[];sentPaths=[];
  for(const [index,c] of captures.entries()){const control=placePixelControl(images[index].bytes),file=path.join(dir,path.basename(c.file));await writeFile(path.join(options.cwd,file),control.bytes,{flag:'wx',mode:0o600});placed.push({file:c.file,sentFile:file,text:control.text,bounds:control.bounds});sent.push({...c,file,sha256:control.sha256});sentPaths.push(file);}
 }
 const review=schemas.$defs.review,schema=placed?{...review,properties:{...review.properties,controls:schemas.$defs.reviewControls},required:[...review.required,'controls']}:review;
 const context={scenes:project.plan.scenes.map(s=>({id:s.id,blockIds:s.blockIds})),blocks:project.document.blocks};
 const run=await runStructuredHost({...options,images:sentPaths,schema,prompt:'Actually inspect every attached image. Return scene-specific visible findings for each file and its exact supplied sha256, including the weakest page. Judge clipping, contrast, overlap, hierarchy and story rhythm. Machine checks do not prove visual quality. Report errors/warnings using current sceneId and a nodeId from that scene blockIds, with image-pixel bounds. Do not claim an unseen image passed.'+(placed?' A small numbered colour tag (a magenta block with three black digits) was placed on each attached image for verification: in controls, report for every file the three digits you read and the tag\'s pixel bounds. The tag is not part of the page; do not report it as a defect.':'')+' Image order and metadata: '+JSON.stringify(sent)+'\nPublic scene data: '+JSON.stringify(context)});
 if(placed)await writeFile(path.join(options.cwd,dir,'control.json'),JSON.stringify({format:'deckweft-pixel-control',version:1,receiptId:receipt.id,writtenAfterHost:true,images:placed},null,1)+'\n',{flag:'wx',mode:0o600});
 if(!run.ok)return run;
 try{
 const seen=new Set();for(const i of run.value.images){const c=sent.find(c=>c.file===i.file);if(!c||c.sha256!==i.sha256||seen.has(i.file)||!i.finding.trim())throw Error('HOST_IMAGE_FINDINGS_INVALID');seen.add(i.file);}
 if(seen.size!==sent.length)throw Error('HOST_IMAGE_FINDINGS_INCOMPLETE');
 for(const issue of run.value.issues){const s=project.plan.scenes.find(s=>s.id===issue.sceneId);if(!s||!s.blockIds.includes(issue.nodeId))throw Error('HOST_REVIEW_IDENTITY_INVALID');}
 // The attestation says what the review proves: hash-matching findings (metadata) or, with every tag read back, that pixels reached the answer.
 let attestation='host-metadata-only',controls;
 if(placed){
  const reported=Array.isArray(run.value.controls)?run.value.controls:[];
  const results=placed.map(p=>{const r=reported.find(c=>c.file===p.sentFile)||null;const hit=!!r&&r.text===p.text&&controlOverlap(r.bounds,p.bounds)>=0.25;return {file:p.file,sentFile:p.sentFile,hit,expected:{text:p.text,bounds:p.bounds},reported:r?{text:r.text,bounds:r.bounds}:null};});
  controls={summary:{hits:results.filter(r=>r.hit).length,total:results.length},images:results};
  if(controls.summary.total&&controls.summary.hits===controls.summary.total)attestation='host-pixel-control';
 }
 await application(run,{receiptId:receipt.id},run.value,'render.inspect-review',controls?{pixelControl:controls.summary}:{});
 return {...run,review:{receiptId:receipt.id,reviewer:options.host+' local CLI',delivery:'Attached actual local images through '+options.host+'; per-image visual findings in host response; receipt '+run.receipt.requestId+(controls?'; pixel control '+controls.summary.hits+'/'+controls.summary.total:''),images:paths,judgment:run.value.judgment+'\n'+run.value.images.map(i=>i.file+': '+i.finding).join('\n'),issues:run.value.issues,verdict:run.value.verdict,attestation,...(controls?{controls}:{})}};
 }catch(error){await application(run,{receiptId:receipt.id},null,'render.inspect-review');return {...run,ok:false,error:'HOST_REVIEW_FINDINGS_INVALID',reason:error.message};}
}
/** One probe is reused through a run; capture stays an explicit local capability. */
export async function runHostVisualTask(task,{capture,checkpoint,home,...options}){
 const {probeHost}=await import('./capabilities.mjs');const capabilities=options.capabilities||await probeHost(options);
 return runVisualTask(task,{home,capture,checkpoint,review:async input=>{const r=await reviewWithHost(input,{...options,capabilities});if(!r.ok)throw Error((r.error||r.receipt.error||'HOST_REVIEW_FAILED')+(r.reason?': '+r.reason:''));return r.review;}});
}
