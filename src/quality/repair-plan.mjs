import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {contentHash} from '../scene/web/compile.mjs';
export const DEFAULT_REPAIR_BUDGET=Object.freeze({maxRounds:2,maxCandidates:6,maxSceneChanges:2,maxMilliseconds:60000});
export function repairBudget(options={}) {
 if(Object.keys(options).some(k=>!(k in DEFAULT_REPAIR_BUDGET)))throw Error('Unknown repair budget field.');
 const b={...DEFAULT_REPAIR_BUDGET,...options};
 for(const v of Object.values(b))if(!Number.isSafeInteger(v)||v<0)throw Error('Repair budgets must be nonnegative finite integers.');
 if(b.maxRounds>2)throw Error('Automatic repair is capped at two rounds; start a new explicit review for further work.');
 return b;
}
export function applyScopedRepair(project,proposal,issues) {
 assertVisualProject(project);const copy=structuredClone(project),affected=new Set(issues.map(i=>i.sceneId));
 if(!proposal||Object.keys(proposal).some(k=>!['sceneId','composition'].includes(k))||!affected.has(proposal.sceneId)||typeof proposal.composition!=='string')throw Error('Repair must target an affected scene composition only.');
 const scene=copy.plan.scenes.find(s=>s.id===proposal.sceneId);if(!scene)throw Error('Unknown scene.');scene.composition=proposal.composition;
 assertVisualLocks(project,copy);assertVisualProject(copy);return copy;
}
/** Evaluation includes fresh browser capture. Original input and last accepted artifact are immutable. */
export async function boundedRepair({project,initial,propose,evaluate,budget:options={},lastValid=null,now=Date.now}) {
 const budget=repairBudget(options),started=now(),attempts=[];let current=structuredClone(project),result=initial,spent=0,changes=0;
 let incomplete=null,rounds=0;
 async function bounded(operation){const remaining=Math.max(0,budget.maxMilliseconds-(now()-started)),controller=new AbortController();let timer;try{return await Promise.race([Promise.resolve().then(()=>operation(controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Repair wall-time budget exhausted'));},Math.min(remaining,2147483647));})]);}finally{clearTimeout(timer);}}
 for(let round=1;round<=budget.maxRounds&&!result.ok;round++){
  if(spent>=budget.maxCandidates||changes>=budget.maxSceneChanges||now()-started>=budget.maxMilliseconds)break;
  rounds=round;
  let proposals;try{proposals=await bounded(signal=>propose(current,result.issues,round,{signal}));}catch(error){result={...result,failure:error.message};break;}
  for(const proposal of proposals){
   if(spent>=budget.maxCandidates||changes>=budget.maxSceneChanges||now()-started>=budget.maxMilliseconds)break;
   spent++;let candidate;
   try{candidate=applyScopedRepair(current,proposal,result.issues);}catch(error){attempts.push({round,proposal,status:'rejected',reason:error.message});continue;}
   let measured;
   try{measured=await bounded(signal=>evaluate(candidate,{round,candidate:spent,signal,remainingMilliseconds:Math.max(0,budget.maxMilliseconds-(now()-started))}));}catch(error){measured={ok:false,issues:result.issues,failure:error.message};}
   if(!measured||typeof measured.ok!=='boolean'||!Array.isArray(measured.issues))measured={ok:false,issues:result.issues,failure:'Incomplete browser measurement'};
   incomplete={project:candidate,result:measured};
   const improved=measured.issues.filter(i=>i.severity==='error').length<result.issues.filter(i=>i.severity==='error').length;
   const withinBudget=now()-started<=budget.maxMilliseconds;
   attempts.push({round,proposal,status:withinBudget&&(measured.ok||improved)?'accepted':'rejected',basis:contentHash(candidate),withinBudget});
   if(withinBudget&&(measured.ok||improved)){current=candidate;result=measured;changes++;break;}
  }
 }
 const ok=result.ok===true;
 return {ok,budget,spent:{rounds,candidates:spent,sceneChanges:changes,milliseconds:now()-started},attempts,project:ok?current:structuredClone(lastValid?.project||project),artifact:ok?result.artifact:lastValid?.artifact||null,candidate:ok?null:incomplete||{project:current,result},result,status:ok?'machine-passed-review-required':'failed-last-valid-retained'};
}
