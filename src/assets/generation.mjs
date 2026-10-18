// Tool-mediated generation. This module never makes a network request or reads keys.
import {randomUUID} from 'node:crypto';
import {AgentBridge} from '../services/agent-bridge.mjs';
import {assertProject} from '../core/validate.mjs';
import {DeckError} from '../core/errors.mjs';
import {hash} from '../planning/storyboard.mjs';
import {registerAsset,assetResources} from './registry.mjs';
const fail=(code,message)=>{throw new DeckError(code,message,409);};
const verifyAsset=async(asset,home)=>{const resources=await assetResources({assets:[asset],slides:[{intent:{assetIds:[asset.id]}}]},home);if(!resources[asset.id])fail('IMAGE_MISSING','Restore the original hash-matching local image before reusing it.');};
const text=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max;
export class ImageJobs {
 constructor(home){this.home=home;this.bridge=new AgentBridge(home);}
 transact(fn){return this.bridge.transact(s=>{s.imageJobs??=[];return fn(s.imageJobs);});}
 async prepare({project,slideId,prompt,tool,metadata,consent,requestId}){
  assertProject(project);
  if(project.schemaVersion!==2||!project.planning.reviewed||!project.slides.some(s=>s.id===slideId))fail('IMAGE_REVIEW','Approve a version 2 storyboard and select a slide first.');
  if(consent!==true||!text(prompt,2000)||tool!=='host-image-tool'||!text(requestId,80)||!/^[A-Za-z0-9_-]+$/.test(requestId))fail('IMAGE_CONSENT','Explicitly approve this prompt for the host image tool.');
  const clean={};for(const k of ['license','allowedUse','alt','fallback']){if(!text(metadata?.[k],{license:500,allowedUse:500,alt:1000,fallback:1000}[k]))fail('IMAGE_METADATA','Supply rights, allowed use, alt text and fallback.');clean[k]=metadata[k];}
  const input={projectId:project.id,slideId,sourceHash:hash(project),prompt,tool,metadata:clean},inputHash=hash(input),cacheKey=hash({projectId:project.id,prompt,tool,metadata:clean});
  return this.transact(async jobs=>{
   const previous=jobs.find(j=>j.requestId===requestId);if(previous){if(previous.inputHash!==inputHash)fail('IMAGE_CONFLICT','Request id already belongs to another prompt or draft.');return structuredClone(previous);}
   if(jobs.length>=40)fail('IMAGE_LIMIT','This library has 40 image jobs. Use a separate library.');
   if(jobs.some(j=>j.cacheKey===cacheKey&&['prepared','dispatched'].includes(j.status)))fail('IMAGE_IN_FLIGHT','A matching request is already prepared or dispatched. Recover it before creating another chargeable request.');
   const cached=jobs.find(j=>j.cacheKey===cacheKey&&j.status==='needs-review');
   if(cached){await verifyAsset(cached.asset,this.home);}
   const job={id:randomUUID().replaceAll('-',''),requestId,inputHash,cacheKey,input,status:cached?'needs-review':'prepared',asset:cached?.asset??null,attempts:0,createdAt:Date.now(),reused:!!cached};jobs.push(job);return structuredClone(job);
  });
 }
 async get(id){return this.transact(jobs=>structuredClone(this.find(jobs,id)));}
 find(jobs,id){const j=jobs.find(j=>j.id===id);if(!j)fail('IMAGE_JOB','Image request does not exist.');return j;}
 async dispatch(id){return this.transact(jobs=>{const j=this.find(jobs,id);if(j.status!=='prepared')fail('IMAGE_UNKNOWN','Already dispatched or stopped. Recover the original result; do not blindly repeat a chargeable request.');j.status='dispatched';j.attempts++;j.dispatchedAt=Date.now();return {id:j.id,prompt:j.input.prompt,tool:j.input.tool,idempotencyKey:j.id,attempt:j.attempts,instructions:'Call only the opted-in host tool. If its outcome is unknown, recover the same output or stop for review. No automatic retries.'};});}
 async complete(id,bytes){return this.transact(async jobs=>{const j=this.find(jobs,id);if(j.status==='needs-review'){if(hash(bytes.toString('base64'))!==j.outputHash)fail('IMAGE_CONFLICT','Different image already completed this request.');return structuredClone(j);}if(j.status!=='dispatched')fail('IMAGE_STATE','Only the original dispatched request can complete.');j.asset=await registerAsset(this.home,bytes,{...j.input.metadata,provenance:`Generated with opted-in ${j.input.tool}; request ${j.id}; prompt hash ${hash(j.input.prompt)}. Decorative artwork; not evidence.`});j.outputHash=hash(bytes.toString('base64'));j.status='needs-review';j.completedAt=Date.now();return structuredClone(j);});}
 async cancel(id){return this.transact(jobs=>{const j=this.find(jobs,id);j.status='cancelled';return {id,status:j.status};});}
 async attach(id,project,slideId){assertProject(project);return this.transact(async jobs=>{const j=this.find(jobs,id);if(j.status!=='needs-review'||hash(project)!==j.input.sourceHash||slideId!==j.input.slideId)fail('IMAGE_STALE','The draft changed or request was cancelled. Review the current draft and prepare a new request; matching cached assets can be reused.');await verifyAsset(j.asset,this.home);const copy=structuredClone(project),s=copy.slides.find(s=>s.id===slideId);const existing=copy.assets.find(a=>a.id===j.asset.id);if(existing&&['hash','mime','width','height','path','license','allowedUse','alt','fallback'].some(k=>existing[k]!==j.asset[k]))fail('IMAGE_METADATA_CONFLICT','This image already has different rights metadata. Review it before replacement.');if(!existing)copy.assets.push(j.asset);s.intent.assetIds=[j.asset.id];s.intent.spatialRecipe='none';s.intent.visualFamily='image-caption';s.intent.interaction={kind:'none',initial:0,labels:[]};assertProject(copy);return {project:copy};});}
}
// V3 never inherits the legacy host job's authorization or dispatches it implicitly.
export {imageCapabilities} from './providers/local.mjs';
