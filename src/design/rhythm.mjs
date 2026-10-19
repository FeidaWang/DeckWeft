import {narrativeCost} from './art-direction.mjs';
import { createHash } from 'node:crypto';
import { assertVisualProject, assertVisualLocks } from '../core/visual-project.mjs';
import { compositions, families, inferFamily, assertComposition, describeCandidate, eligibleFamilies } from './compositions.mjs';
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
 else{if(viewport.width>700&&check.components?.some(c=>c.scrollWidth>c.clientWidth+1||c.minTextPixels<10))reasons.push('Component requires scrolling or text is below 10px at presentation size');if(check.overflow.length)reasons.push('Region overflow');if(check.clipIssues.length)reasons.push('Clipped content');if(check.contrastIssues.length)reasons.push('Contrast failure');if(check.glyphs?.length)reasons.push('Missing glyph');if(check.text.some(t=>!t.inside))reasons.push('Text outside scene');if(check.fonts.some(f=>!f.loaded))reasons.push('Font not ready');if(viewport.width>700&&check.height>CANDIDATE_HEIGHT)reasons.push(`Scene exceeds ${CANDIDATE_HEIGHT}px presentation budget (${Math.ceil(check.height)}px)`);}
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
/** Handoff rhythm rules. Families come from content and the author; selection only varies geometry, so variety is advice. */
export const RHYTHM_RULES=Object.freeze({variety:Object.freeze({minPages:10,maxPages:15,minFamilies:4}),maxRepeat:2,cardRun:3});
const RULE_COST=100,parallel=run=>run.every(d=>d.family===run[0].family)&&!!families[run[0].family]?.parallel;
/** Cost of the third page in a row: the same composition again (unless a sequence or comparison continues) or a third heading-plus-cards page. */
export function rulePenalty(a,b,c){
 if(!a)return 0;
 return (a.id===b.id&&b.id===c.id&&!parallel([a,b,c])?RULE_COST:0)+(a.cards&&b.cards&&c.cards?RULE_COST:0);
}
/** Rule findings for a plan as it stands. Locked compositions are the author's: reported, never changed. */
export function rhythmIssues(project){
 const scenes=project.plan.scenes,d=scenes.map(s=>describeCandidate(project.document,s)),issues=[];
 const locked=id=>!!project.document.authorOverrides.sceneLocks?.some(l=>l.sceneId===id&&l.fields.includes('composition'));
 const note=(rule,i,extra)=>{const last=issues.findLast(v=>v.rule===rule);if(last?.rule===rule&&last.sceneIds.at(-1)===scenes[i-1].id){last.sceneIds.push(scenes[i].id);last.author||=locked(scenes[i].id);return;}const ids=[i-2,i-1,i].map(k=>scenes[k].id);issues.push({rule,sceneIds:ids,...extra,author:ids.some(locked)});};
 for(let i=2;i<scenes.length;i++){
  const run=[d[i-2],d[i-1],d[i]];
  if(run.every(v=>v.id===run[0].id)&&!parallel(run))note('repeat',i,{composition:run[0].id});
  if(run.every(v=>v.cards))note('card-run',i,{});
 }
 const used=[...new Set(d.map(v=>v.family))],{minPages,maxPages,minFamilies}=RHYTHM_RULES.variety;
 if(scenes.length>=minPages&&scenes.length<=maxPages&&used.length<minFamilies)issues.push({rule:'variety',families:used,required:minFamilies,author:scenes.some(s=>locked(s.id)),suggestions:scenes.filter(s=>!locked(s.id)).flatMap(s=>eligibleFamilies(project.document,s).filter(f=>!used.includes(f)).map(family=>({sceneId:s.id,family})))});
 return issues;
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
 // States remember the last two pages so the repeat and card-run rules can see three in a row. Ties keep the earlier candidate.
 let states=rows[0].map(c=>({cost:narrativeCost(c.scene,c.descriptor,0,rows.length).cost,path:[c]}));
 for(let i=1;i<rows.length;i++)states=rows[i].flatMap(c=>rows[i-1].flatMap(p=>states.filter(s=>s.path.at(-1)===p).map(prev=>({cost:prev.cost+narrativeCost(c.scene,c.descriptor,i,rows.length).cost+transitionCost(p.descriptor,c.descriptor).total+rulePenalty(prev.path.at(-2)?.descriptor,p.descriptor,c.descriptor),path:[...prev.path,c]})).sort((a,b)=>a.cost-b.cost).slice(0,1)));
 const winner=states.sort((a,b)=>a.cost-b.cost)[0],copy=structuredClone(project);copy.plan.scenes=winner.path.map(c=>structuredClone(c.scene));
 if(JSON.stringify(copy.document)!==JSON.stringify(project.document)||JSON.stringify(copy.assets)!==JSON.stringify(project.assets))throw new DeckError('CANDIDATE_CONTENT','Candidates must preserve the semantic document and assets.',422);
 assertVisualLocks(project,copy);assertVisualProject(copy);
 const report={cost:winner.cost,method:'Dynamic programming across measured candidates; narrative suitability, adjacent repetition and the handoff rhythm rules; deterministic ties',rules:{limits:RHYTHM_RULES,issues:rhythmIssues(copy)},scenes:winner.path.map((c,i)=>({sceneId:c.scene.id,candidate:c.k,...c.descriptor,fit:c.fit,narrative:narrativeCost(c.scene,c.descriptor,i,rows.length),...(i?{transition:transitionCost(winner.path[i-1].descriptor,c.descriptor)}:{})}))};
 copy.extensions.deckweftRhythm={version:1,basisHash:createHash('sha256').update(JSON.stringify({document:copy.document,plan:copy.plan,assets:copy.assets})).digest('hex'),...report};
 return {project:assertVisualProject(copy),report};
}
/** Layout-only page split for small multiples: every panel stays in order on the shared scale; each page repeats the heading and the sources. */
export function splitSmallMultiples(project,sceneId,perPage=families['small-multiples'].panels.perPage){
 const copy=structuredClone(assertVisualProject(project)),scenes=copy.plan.scenes,index=scenes.findIndex(s=>s.id===sceneId),scene=scenes[index],fail=message=>{throw new DeckError('PANEL_SPLIT',message,422);};
 if(!scene||compositions.find(c=>c.id===scene.composition)?.family!=='small-multiples')fail('Choose a small-multiples page in this deck.');
 if(copy.document.authorOverrides.sceneLocks?.some(l=>l.sceneId===sceneId&&l.fields.some(f=>['blockIds','composition'].includes(f))))throw new DeckError('AUTHOR_LOCK','Unlock this page before splitting its panels.',409);
 if(scene.interactions?.length||scene.cues?.length||scene.keyStates)fail('Interactions, cues and key states belong to one page; split this page by hand.');
 const blocks=scene.blockIds.map(id=>copy.document.blocks.find(b=>b.id===id)),charts=blocks.filter(b=>b.type==='chart').map(b=>b.id),pages=Math.ceil(charts.length/perPage);
 if(!Number.isInteger(perPage)||perPage<families['small-multiples'].panels.min)fail('Keep at least two panels on each page.');
 if(pages<2)fail('This page already holds no more panels than the page size.');
 const base=Math.floor(charts.length/pages),extra=charts.length%pages;if(base<families['small-multiples'].panels.min)fail('Choose a page size that leaves at least two panels on every page.');
 const groups=Array.from({length:pages},(_,k)=>charts.splice(0,base+(k<extra?1:0))),shared=new Set(blocks.filter(b=>['heading','citation'].includes(b.type)).map(b=>b.id));
 const owner=b=>b.type==='chart'?groups.findIndex(g=>g.includes(b.id)):b.type==='annotation'?groups.findIndex(g=>g.includes(b.target.blockId)):0;
 const ids=new Set(scenes.map(s=>s.id)),pageId=k=>{if(!k)return sceneId;let n=k+1,id;do id=`${sceneId}-${n++}`.slice(0,64);while(ids.has(id));ids.add(id);return id;};
 const split=groups.map((_,k)=>{const blockIds=blocks.filter(b=>shared.has(b.id)||owner(b)===k).map(b=>b.id),page={...structuredClone(scene),id:pageId(k),blockIds,focalBlockId:blockIds.includes(scene.focalBlockId)?scene.focalBlockId:blocks.find(b=>b.type==='heading').id};
  if(page.takeaway&&!blockIds.includes(page.takeaway.blockId))delete page.takeaway;for(const key of ['crops','imageSlots'])if(page[key])page[key]=page[key].filter(v=>blockIds.includes(v.blockId));return page;});
 scenes.splice(index,1,...split);assertVisualLocks(project,copy);
 if(JSON.stringify(copy.document)!==JSON.stringify(project.document))fail('Splitting pages never changes the semantic document.');
 return assertVisualProject(copy);
}
