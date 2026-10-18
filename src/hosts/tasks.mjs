import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import schemas from '../../schemas/host-response.schema.json' with {type:'json'};
import {createVisualTask} from '../agent/director.mjs';
import {executeVisualTool,runVisualTask} from '../agent/tools.mjs';
import {compositions,inferFamily} from '../design/compositions.mjs';
import {contentHash} from '../scene/web/compile.mjs';
import {runStructuredHost,hostImages} from './run-receipt.mjs';
import {receiptCurrent} from '../quality/visual-review.mjs';
const publicContext=task=>({request:task.request,scope:task.scope,blocks:task.project.document.blocks,datasets:task.project.document.datasets,sources:task.project.document.sources,scenes:task.project.plan.scenes,locks:task.project.document.authorOverrides});
async function application(run,input,output,operation){
 if(run.receiptFile)await writeFile(path.join(path.dirname(run.receiptFile),'application.json'),JSON.stringify({operation,hostReceiptHash:contentHash(run.receipt),inputHash:input?contentHash(input):null,outputHash:output?contentHash(output):null,status:output?'applied':'rejected'},null,2)+'\n',{flag:'wx',mode:0o600});
}
export async function draftWithHost(brief,options){
 if(brief.locale!==undefined&&!['en','zh-CN'].includes(brief.locale))throw Error('Use en or zh-CN.');
 if(brief.project)throw Error('Use a scoped host revision for an existing project; drafting cannot replace it.');
 if(typeof brief.request!=='string'||!brief.request.trim()||brief.request.length>12000)throw Error('Supply a bounded task request.');
 const sourceText=brief.sourceText??(brief.request.includes('---')?brief.request:null);
 if(sourceText!==null&&(typeof sourceText!=='string'||!sourceText.trim()||sourceText.length>12000))throw Error('Supply bounded sourceText.');
 const run=await runStructuredHost({...options,schema:schemas.$defs.outline,prompt:'Draft a presentation outline from the supplied material only. Use --- between pages, a heading then short support text. Preserve every supplied fact/number/reference. Do not invent evidence, numbers or unsupported claims; identify missing evidence in the wording. When sourceText is supplied, preserve each nonempty source line verbatim (--- separators may move); add structure around it, never translate or remove it. Output language: '+(brief.locale||'en')+'. Material follows as JSON data:\n'+JSON.stringify({request:brief.request,sourceText})});
 if(!run.ok)return run;
 const normalized=text=>text.replace(/\s+/gu,' ').trim();
 if(sourceText&&sourceText.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&line!=='---').some(line=>!normalized(run.value.outline).includes(normalized(line)))){await application(run,sourceText,null,'draft');return {...run,ok:false,error:'HOST_CONTENT_COVERAGE'};}
 let task;try{task=createVisualTask({...brief,request:run.value.outline});task.request=brief.request;if(sourceText)task.sourceInput={text:sourceText,hash:contentHash(sourceText),coverage:'all supplied nonempty lines retained; external truth unverified'};task.hostDraft={receiptId:run.receipt.requestId,outlineHash:contentHash(run.value.outline),factualVerification:'unverified host-authored outline; author must review'};}
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
 const context={scenes:project.plan.scenes.map(s=>({id:s.id,blockIds:s.blockIds})),blocks:project.document.blocks};
 const run=await runStructuredHost({...options,images:paths,schema:schemas.$defs.review,prompt:'Actually inspect every attached image. Return scene-specific visible findings for each file and its exact supplied sha256, including the weakest page. Judge clipping, contrast, overlap, hierarchy and story rhythm. Machine checks do not prove visual quality. Report errors/warnings using current sceneId and a nodeId from that scene blockIds, with image-pixel bounds. Do not claim an unseen image passed. Image order and metadata: '+JSON.stringify(captures)+'\nPublic scene data: '+JSON.stringify(context)});
 if(!run.ok)return run;
 try{
 const seen=new Set();for(const i of run.value.images){const c=captures.find(c=>c.file===i.file);if(!c||c.sha256!==i.sha256||seen.has(i.file)||!i.finding.trim())throw Error('HOST_IMAGE_FINDINGS_INVALID');seen.add(i.file);}
 if(seen.size!==captures.length)throw Error('HOST_IMAGE_FINDINGS_INCOMPLETE');
 for(const issue of run.value.issues){const s=project.plan.scenes.find(s=>s.id===issue.sceneId);if(!s||!s.blockIds.includes(issue.nodeId))throw Error('HOST_REVIEW_IDENTITY_INVALID');}
 await application(run,{receiptId:receipt.id},run.value,'render.inspect-review');
 return {...run,review:{receiptId:receipt.id,reviewer:options.host+' local CLI',delivery:'Attached actual local images through '+options.host+'; per-image visual findings in host response; receipt '+run.receipt.requestId,images:paths,judgment:run.value.judgment+'\n'+run.value.images.map(i=>i.file+': '+i.finding).join('\n'),issues:run.value.issues,verdict:run.value.verdict}};
 }catch{await application(run,{receiptId:receipt.id},null,'render.inspect-review');return {...run,ok:false,error:'HOST_REVIEW_FINDINGS_INVALID'};}
}
/** One probe is reused through a run; capture stays an explicit local capability. */
export async function runHostVisualTask(task,{capture,checkpoint,home,...options}){
 const {probeHost}=await import('./capabilities.mjs');const capabilities=options.capabilities||await probeHost(options);
 return runVisualTask(task,{home,capture,checkpoint,review:async input=>{const r=await reviewWithHost(input,{...options,capabilities});if(!r.ok)throw Error(r.error||r.receipt.error||'HOST_REVIEW_FAILED');return r.review;}});
}
