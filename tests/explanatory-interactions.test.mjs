import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {addExplanatoryInteractions} from '../public/studio/interactions.js';
import {assertVisualProject,assertVisualLocks} from '../src/core/visual-project.mjs';
import {compileCues} from '../src/motion/cues.mjs';
import {seekInteractionState} from '../src/motion/timeline.mjs';
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-explain-')));test.after(()=>rm(home,{recursive:true,force:true}));
test('Existing bilingual works gain source-bound chart/flow interactions without new scenes or changed values',async()=>{
 for(const locale of ['en','zh-CN']){
  const original=await createCompositionDemo(locale,home),before=structuredClone(original);let p=original;
  for(const scene of original.plan.scenes.filter(s=>s.blockIds.some(id=>['chart','diagram'].includes(original.document.blocks.find(b=>b.id===id).type))))p=addExplanatoryInteractions(p,scene.id);
  assertVisualProject(p);assertVisualLocks(original,p);assert.deepEqual(original,before);assert.equal(p.id,original.id);assert.deepEqual(p.document.blocks,original.document.blocks);assert.deepEqual(p.assets,original.assets);assert.equal(p.plan.scenes.length,original.plan.scenes.length);
  for(const data of original.document.datasets){const after=p.document.datasets.find(d=>d.id===data.id);assert.deepEqual(after.series,data.series);assert.deepEqual(after.categories,data.categories);assert.equal(new Set(after.categoryIds).size,data.categories.length);}
  for(const scene of p.plan.scenes.filter(s=>s.interactions?.length)){const c=compileCues(p.document,scene);for(let i=0;i<=c.cues.length;i++)assert.doesNotThrow(()=>seekInteractionState(c.interactions,c.cues,i));assert.throws(()=>addExplanatoryInteractions(p,scene.id));}
 }
});
test('Authoring is atomic across locks and never rewrites an existing explanation',async()=>{
 const p=await createCompositionDemo('en',home),chart=p.plan.scenes.find(s=>s.blockIds.some(id=>p.document.blocks.find(b=>b.id===id).type==='chart'));
 p.document.authorOverrides.sceneLocks=[{sceneId:chart.id,fields:['interactions']}];assert.throws(()=>addExplanatoryInteractions(p,chart.id));p.document.authorOverrides.sceneLocks=[];
 const block=p.document.blocks.find(b=>chart.blockIds.includes(b.id)&&b.type==='chart');p.document.authorOverrides.lockedBlockIds.push(block.id);const before=structuredClone(p);assert.throws(()=>addExplanatoryInteractions(p,chart.id));assert.deepEqual(p,before);
});
test('Explicit opening commits survive compilation and reject stale targets atomically',async()=>{
 const {useInteractionOpening}=await import('../public/studio/interactions.js');
 let p=await createCompositionDemo('en',home);p=addExplanatoryInteractions(p,'evidence');p=addExplanatoryInteractions(p,'process');
 const chart=compileCues(p.document,p.plan.scenes.find(s=>s.id==='evidence')).interactions[0],flow=compileCues(p.document,p.plan.scenes.find(s=>s.id==='process')).interactions[0];
 const c={id:chart.id,seriesIds:[chart.seriesIds[1]],fromId:chart.categoryIds.at(-1),toId:chart.categoryIds.at(-1)};
 const explored={position:0,exploring:true},saved=useInteractionOpening(useInteractionOpening(p,'evidence',[c],explored),'process',[{id:flow.id,stepId:flow.steps[1].id}],explored);assertVisualProject(saved);assertVisualLocks(p,saved);
 const initial=seekInteractionState(compileCues(saved.document,saved.plan.scenes.find(s=>s.id==='evidence')).interactions,[],0)[0];assert.deepEqual(initial.seriesIds,c.seriesIds);assert.equal(initial.fromId,c.fromId);
 assert.equal(compileCues(saved.document,saved.plan.scenes.find(s=>s.id==='process')).interactions[0].initialStepId,flow.steps[1].id);
 const before=structuredClone(saved);assert.throws(()=>useInteractionOpening(saved,'evidence',[{...c,toId:'stale'}],explored));assert.deepEqual(saved,before);assert.throws(()=>useInteractionOpening(saved,'process',[{id:flow.id,stepId:'stale'}],explored));
});
