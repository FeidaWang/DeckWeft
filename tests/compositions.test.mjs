import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import {narrativeCost} from '../src/design/art-direction.mjs';
import { createCompositionDemo } from '../src/core/composition-demo.mjs';
import { candidateProjects, candidateFit, chooseRhythm, transitionCost, moveScene } from '../src/design/rhythm.mjs';
import { applySceneTheme } from '../src/design/profile.mjs';
import { blockHTML } from '../src/render/web/components/blocks.mjs';
import { compositions, describeCandidate, families } from '../src/design/compositions.mjs';
import { compileWebScenes } from '../src/scene/web/compile.mjs';
import { assertVisualProject, assertVisualLocks } from '../src/core/visual-project.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
const fixture=async fn=>{const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-compositions-')));try{await fn(home);}finally{await rm(home,{recursive:true,force:true});}};
test('VIS-006: six typed families provide three candidates in all themes and both languages without changing facts or assets',()=>fixture(async home=>{
 assert.equal(compositions.length,18);
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  const p=await createCompositionDemo(locale,home);p.plan.scenes.forEach(s=>{s.theme=theme;});
  const candidates=candidateProjects(p);
  for(const c of candidates){assert.deepEqual(c.document,p.document);assert.deepEqual(c.assets,p.assets);assert.deepEqual(c.revision,p.revision);assertVisualProject(c);compileWebScenes(c.document,c.plan);for(const [i,s]of c.plan.scenes.entries()){assert.deepEqual({...s,composition:''},{...p.plan.scenes[i],composition:''});}}
  for(const [i,s]of p.plan.scenes.entries())assert.equal(new Set(candidates.map(c=>c.plan.scenes[i].composition)).size,3,s.id);
 }
}));
test('VIS-006: family requirements reject incompatible content without repair; reading paths are derived without mutating blocks',()=>fixture(async home=>{
 const p=await createCompositionDemo('en',home);
 assert.throws(()=>candidateProjects(p,{chapter:'evidence'}),/needs a heading and chart/);
 assert.throws(()=>candidateProjects(p,{absent:'statement'}),/existing scene/);
 const c=candidateProjects(p)[0],metric=compileWebScenes(c.document,c.plan).find(s=>s.id==='collage');
 assert.equal(metric.regions[0].component,'metric');assert.equal(p.plan.scenes.find(s=>s.id==='collage').blockIds[0],'cover-title');
}));
test('VIS-006: rhythm finds the global minimum across all five transition terms and excludes failed candidates',()=>fixture(async home=>{
 const p=await createCompositionDemo('en',home),c=candidateProjects(p),fits=c.map(v=>v.plan.scenes.map(()=>({ok:true,reasons:[],height:720})));
 fits[0][1]={ok:false,reasons:['Clipping'],height:950};
 const r=chooseRhythm(p,c,fits);let minimum=Infinity;
 function search(i,last,cost){if(i===p.plan.scenes.length){minimum=Math.min(minimum,cost);return;}for(let k=0;k<3;k++)if(fits[k][i].ok){const d=describeCandidate(p.document,c[k].plan.scenes[i]);search(i+1,d,cost+narrativeCost(c[k].plan.scenes[i],d,i,p.plan.scenes.length).cost+(last?transitionCost(last,d).total:0));}}
 search(0,null,0);assert.equal(r.report.cost,minimum);assert.deepEqual(r.project.document,p.document);assert.deepEqual(r.project.assets,p.assets);assert.notEqual(r.report.scenes[1].candidate,0);
 assert.deepEqual(Object.keys(r.report.scenes[1].transition.parts),['geometry','focus','density','color','imageRatio']);
 fits.forEach(row=>row[2]={ok:false,reasons:['Height']});assert.throws(()=>chooseRhythm(p,c,fits),/No measured candidate fits: collage/);
}));
test('VIS-006: author scene/content/crop locks and theme identities survive candidates, rhythm and reordering',()=>fixture(async home=>{
 const p=await createCompositionDemo('zh-CN',home);p.document.authorOverrides.lockedBlockIds=['cover-metric','violet-image','data-chart'];p.document.authorOverrides.sceneLocks=[{sceneId:'chapter',fields:['theme','composition','blockIds','crops']}];
 const c=candidateProjects(p),r=chooseRhythm(p,c,c.map(v=>v.plan.scenes.map(()=>({ok:true})))).project;
 for(const v of [...c,r]){assertVisualLocks(p,v);assert.deepEqual(v.plan.scenes[0],p.plan.scenes[0]);}
 const moved=moveScene(r,'chapter',1);assert.equal(moved.plan.scenes[1].id,'chapter');for(const s of p.plan.scenes)assert.equal(moved.plan.scenes.find(v=>v.id===s.id).theme,s.theme);assertVisualLocks(p,moved);
 assert.throws(()=>moveScene(p,'chapter',-1),/adjacent page/);
}));
test('VIS-006: candidates never earn feasibility through clipped, overflowing, low-contrast or oversized content',()=>{
 const good={height:800,overflow:[],clipIssues:[],contrastIssues:[],text:[{inside:true}],fonts:[{loaded:true}]};assert.equal(candidateFit(good,{width:1440}).ok,true);
 for(const patch of [{height:901},{overflow:['r']},{clipIssues:['r']},{contrastIssues:['r']},{text:[{inside:false}]},{fonts:[{loaded:false}]}])assert.equal(candidateFit({...good,...patch},{width:1440}).ok,false);
 assert.equal(candidateFit({...good,height:1500},{width:390}).ok,true);assert.equal(candidateFit(null,{width:1440}).ok,false);
});
test('VIS-006: selected rhythm persists with revision conflicts and history recovery intact',()=>fixture(async home=>{
 const store=await new VisualProjectStore(home).init(),p=await store.save(await createCompositionDemo('en',home),{create:true}),c=candidateProjects(p),selected=chooseRhythm(p,c,c.map(v=>v.plan.scenes.map(()=>({ok:true})))).project;
 await store.save(selected,{expectedRevision:p.revision.number});await assert.rejects(store.save(p,{expectedRevision:p.revision.number}),{code:'REVISION_CONFLICT'});
 const history=await store.historyPage(p.id),snapshot=await store.snapshot(p.id,history.snapshots[0].revision),restored=await store.restoreAsCopy(p.id,snapshot.project.revision.number,{snapshotHash:snapshot.sha256,requestId:'composition-restore'});
 assert.notEqual(restored.project.id,p.id);assert.deepEqual(restored.project.document.blocks,p.document.blocks);assert.deepEqual(restored.project.plan.scenes,p.plan.scenes);
}));

test('VIS-006: exact metric decimals and selected geometry survive presentation and theme revisions',()=>fixture(async home=>{
 const p=await createCompositionDemo('en',home),c=candidateProjects(p)[1],s=c.plan.scenes.find(s=>s.id==='collage'),metric=c.document.blocks.find(b=>b.id==='cover-metric');metric.value=81.250125;
 const html=blockHTML(metric,c.document,{});assert.ok(html.includes('81.250125'));const changed=applySceneTheme(c,s.id,'dark-data');assert.equal(changed.plan.scenes.find(v=>v.id===s.id).composition,'metric-band');assert.deepEqual(changed.document,c.document);
}));
