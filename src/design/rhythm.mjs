import {narrativeCost} from './art-direction.mjs';
import { createHash } from 'node:crypto';
import { assertVisualProject, assertVisualLocks } from '../core/visual-project.mjs';
import { compositions, inferFamily, assertComposition, describeCandidate } from './compositions.mjs';
import { DeckError } from '../core/errors.mjs';
export const CANDIDATE_HEIGHT = 900;
export function candidateProjects(project,overrides={}) {
 assertVisualProject(project);
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))throw new DeckError('CANDIDATE_FAMILY','Supply scene ids mapped to family names.',422);
 for(const [id,family]of Object.entries(overrides))if(!project.plan.scenes.some(s=>s.id===id)||!compositions.some(c=>c.family===family))throw new DeckError('CANDIDATE_FAMILY','Choose an existing scene and composition family.',422);
 return [0,1,2].map(index=>{
  const copy=structuredClone(project);
  for(const s of copy.plan.scenes){
   const locked=copy.document.authorOverrides.sceneLocks?.some(l=>l.sceneId===s.id&&l.fields.includes('composition'));
   if(locked)continue;
   const family=Object.hasOwn(overrides,s.id)?overrides[s.id]:inferFamily(copy.document,s),variant=compositions.find(c=>c.family===family&&c.index===index);
   s.composition=variant.id;assertComposition(copy.document,s);
  }
  assertVisualLocks(project,copy);return assertVisualProject(copy);
 });
}
export function candidateFit(check,viewport){
 const reasons=[];
 if(!check)reasons.push('Missing current browser measurement');
 else{if(viewport.width>700&&check.components?.some(c=>c.scrollWidth>c.clientWidth+1||c.minTextPixels<10))reasons.push('Component requires scrolling or text is below 10px at presentation size');if(check.overflow.length)reasons.push('Region overflow');if(check.clipIssues.length)reasons.push('Clipped content');if(check.contrastIssues.length)reasons.push('Contrast failure');if(check.text.some(t=>!t.inside))reasons.push('Text outside scene');if(check.fonts.some(f=>!f.loaded))reasons.push('Font not ready');if(viewport.width>700&&check.height>CANDIDATE_HEIGHT)reasons.push(`Scene exceeds ${CANDIDATE_HEIGHT}px presentation budget (${Math.ceil(check.height)}px)`);}
 return {ok:!reasons.length,reasons,height:check?.height,...(check?.visualFeatures?{features:{focus:check.visualFeatures.focus,density:check.visualFeatures.density,imageRatio:check.visualFeatures.imageRatio}}:{})};
}
// Theme identity and source facts stay attached to stable scene ids, including after reordering.
export function moveScene(project,sceneId,offset){
 const copy=structuredClone(assertVisualProject(project)),scenes=copy.plan.scenes,i=scenes.findIndex(s=>s.id===sceneId),j=i+offset;
 if(![-1,1].includes(offset)||i<0||j<0||j>=scenes.length)throw new DeckError('SCENE_ORDER','Choose an adjacent page in this deck.',422);
 [scenes[i],scenes[j]]=[scenes[j],scenes[i]];assertVisualLocks(project,copy);return assertVisualProject(copy);
}
export function transitionCost(a,b){
 const parts={geometry:a.id===b.id?8:0,focus:a.focus===b.focus?3:0,density:Math.abs(a.density-b.density)<.12?2:0,color:a.theme===b.theme&&a.colorMode===b.colorMode?2:0,imageRatio:Math.abs(a.imageRatio-b.imageRatio)<.15?1:0};
 return {total:Object.values(parts).reduce((a,b)=>a+b,0),parts};
}
export function chooseRhythm(project,candidates,feasibility){
 assertVisualProject(project);
 if(candidates.length!==3||feasibility.length!==3)throw new DeckError('CANDIDATE_MEASUREMENT','Measure all three candidate sets first.',422);
 for(const c of candidates){
  assertVisualProject(c);assertVisualLocks(project,c);
  if(JSON.stringify(c.document)!==JSON.stringify(project.document)||JSON.stringify(c.assets)!==JSON.stringify(project.assets)||c.plan.scenes.length!==project.plan.scenes.length||c.plan.scenes.some((s,i)=>JSON.stringify({...s,composition:''})!==JSON.stringify({...project.plan.scenes[i],composition:''})))throw new DeckError('CANDIDATE_CONTENT','Candidates must preserve content, assets, scene identity, order, theme, crops and focal bindings.',422);
 }
 const rows=project.plan.scenes.map((s,i)=>candidates.map((p,k)=>({scene:p.plan.scenes[i],k,fit:feasibility[k][i],descriptor:{...describeCandidate(p.document,p.plan.scenes[i]),...feasibility[k][i]?.features}})).filter(c=>c.fit?.ok));
 const blocked=rows.flatMap((r,i)=>r.length?[]:[project.plan.scenes[i].id]);
 if(blocked.length)throw new DeckError('NO_FEASIBLE_CANDIDATE','No measured candidate fits: '+blocked.join(', ')+'. Preserve content and repair the layout.',422);
 let states=rows[0].map(c=>({cost:narrativeCost(c.scene,c.descriptor,0,rows.length).cost,path:[c]}));
 for(let i=1;i<rows.length;i++)states=rows[i].map(c=>states.map(prev=>({cost:prev.cost+narrativeCost(c.scene,c.descriptor,i,rows.length).cost+transitionCost(prev.path.at(-1).descriptor,c.descriptor).total,path:[...prev.path,c]})).sort((a,b)=>a.cost-b.cost)[0]);
 const winner=states.sort((a,b)=>a.cost-b.cost)[0],copy=structuredClone(project);copy.plan.scenes=winner.path.map(c=>structuredClone(c.scene));
 if(JSON.stringify(copy.document)!==JSON.stringify(project.document)||JSON.stringify(copy.assets)!==JSON.stringify(project.assets))throw new DeckError('CANDIDATE_CONTENT','Candidates must preserve the semantic document and assets.',422);
 assertVisualLocks(project,copy);assertVisualProject(copy);
 const report={cost:winner.cost,method:'Dynamic programming across measured candidates; narrative suitability plus adjacent repetition; deterministic ties',scenes:winner.path.map((c,i)=>({sceneId:c.scene.id,candidate:c.k,...c.descriptor,fit:c.fit,narrative:narrativeCost(c.scene,c.descriptor,i,rows.length),...(i?{transition:transitionCost(winner.path[i-1].descriptor,c.descriptor)}:{})}))};
 copy.extensions.deckweftRhythm={version:1,basisHash:createHash('sha256').update(JSON.stringify({document:copy.document,plan:copy.plan,assets:copy.assets})).digest('hex'),...report};
 return {project:assertVisualProject(copy),report};
}
