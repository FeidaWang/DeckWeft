import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {assertVisualProject,assertVisualLocks} from '../src/core/visual-project.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {compileCues} from '../src/motion/cues.mjs';
import {initialInteractionState,reduceInteractionState,seekInteractionState,selectedDataset} from '../src/motion/timeline.mjs';
import {effectiveMotion} from '../src/motion/policies.mjs';
import {compileInteractionRuntime,inertJSON} from '../src/motion/web.mjs';
import {runtime} from '../src/render/web/runtime.mjs';
import {createSceneResources} from '../public/runtime/resources.js';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-motion-'))),p=await createInteractionDemo('en',home);test.after(()=>rm(home,{recursive:true,force:true}));
test('VIS-009 strict bilingual contracts and derived scenes preserve authored stable cues',async()=>{
 for(const locale of ['en','zh-CN']){const p=await createInteractionDemo(locale,home);assert.equal(compileWebScenes(p.document,p.plan).length,15);const before=structuredClone(p);compileInteractionRuntime(p.document,p.plan);assert.deepEqual(p,before);}
 new vm.Script(runtime);assert.ok(runtime.includes('mountSemanticInteractions'));assert.equal(JSON.parse(inertJSON({text:'</script>\u2028&'})).text,'</script>\u2028&');assert.ok(!inertJSON({text:'</script>'}).includes('<'));
});
test('VIS-009 exact numeric selection, missing values, color identities and one-category range',()=>{
 const scene=p.plan.scenes.find(s=>s.id==='component-scatter'),compiled=compileCues(p.document,scene),d=p.document.datasets.find(d=>d.id==='data-scatter'),before=structuredClone(d),state=reduceInteractionState(compiled.interactions,initialInteractionState(compiled.interactions),{event:'data.filter',interactionId:'select-scatter',seriesIds:['reviewed'],fromId:'gamma',toId:'gamma'}),view=selectedDataset(d,state[0]);assert.deepEqual(view.series[0].values,[4]);assert.deepEqual(view.series[0].xValues,[6]);assert.deepEqual(view.categoryIds,['gamma']);assert.deepEqual(d,before);
 const invalid=[{seriesIds:[],fromId:'alpha',toId:'delta'},{seriesIds:['local'],fromId:'delta',toId:'alpha'},{seriesIds:['unknown'],fromId:'alpha',toId:'delta'}];for(const event of invalid)assert.throws(()=>reduceInteractionState(compiled.interactions,state,{...event,event:'data.filter',interactionId:'select-scatter'}));
});
test('VIS-009 replay and cue-boundary seek are pure and deterministic after arbitrary exploration',()=>{
 for(const scene of p.plan.scenes){const c=compileCues(p.document,scene),initial=initialInteractionState(c.interactions);for(let i=0;i<=c.cues.length;i++){const state=c.cues.slice(0,i).reduce((s,e)=>reduceInteractionState(c.interactions,s,e),initial);assert.deepEqual(seekInteractionState(c.interactions,c.cues,i),state);}assert.deepEqual(seekInteractionState(c.interactions,c.cues,0),initial);}
 const c=compileCues(p.document,p.plan.scenes.find(s=>s.id==='component-code'));assert.throws(()=>seekInteractionState(c.interactions,c.cues,1.5));assert.throws(()=>seekInteractionState(c.interactions,c.cues,-1));assert.throws(()=>reduceInteractionState(c.interactions,initialInteractionState(c.interactions),{event:'eval',interactionId:'explain-code'}));
});
test('VIS-009 invalid identities, missing targets, crops and future/executable fields fail without repair',()=>{
 for(const edit of [p=>p.plan.scenes.find(s=>s.id==='component-line').interactions[0].initialFromId='missing',p=>p.plan.scenes.find(s=>s.id==='component-code').interactions[0].steps[0].lines=[999],p=>p.plan.scenes.find(s=>s.id==='component-process').interactions[0].steps[0].objectId='inferred-edge',p=>p.plan.scenes.find(s=>s.id==='violet').interactions[0].hotspots[0].x=0,p=>p.plan.scenes.find(s=>s.id==='image-comparison').interactions[0].otherBlockId='missing',p=>p.plan.scenes.find(s=>s.id==='component-line').cues[0].event='execute',p=>p.plan.scenes.find(s=>s.id==='component-line').motion.durationMs=999,p=>delete p.document.datasets.find(d=>d.id==='data-line').categoryIds]){const copy=structuredClone(p);edit(copy);assert.throws(()=>assertVisualProject(copy));}
});
test('VIS-009 author locks protect interaction plans, linked cues, shared targets and scene motion',()=>{
 const base=structuredClone(p);base.document.authorOverrides.lockedBlockIds.push('component-code');const copy=structuredClone(base);copy.document.explanations.find(n=>n.id==='code-signature').text='Changed explanation';assert.throws(()=>assertVisualLocks(base,copy));
 const locked=structuredClone(p);locked.document.authorOverrides.sceneLocks=[{sceneId:'component-line',fields:['interactions','cues','motion']}];for(const key of ['interactions','cues','motion']){const copy=structuredClone(locked);delete copy.plan.scenes.find(s=>s.id==='component-line')[key];assert.throws(()=>assertVisualLocks(locked,copy));}
 const reordered=structuredClone(locked);reordered.plan.scenes.reverse();assertVisualLocks(locked,reordered);assertVisualProject(reordered);
});
test('VIS-009 finite scene resource cleanup and reduced motion retain information',async()=>{
 assert.deepEqual(effectiveMotion({policy:'subtle',durationMs:240,reduced:true}),{enabled:false,durationMs:0});assert.equal(effectiveMotion({policy:'subtle',durationMs:240,active:false}).enabled,false);
 const resources=createSceneResources();let released=0,cancelled=0;resources.register(()=>released++);let fired=false;resources.schedule(()=>fired=true,5);const pending=new Promise(()=>{});resources.animate({animate(){return {finished:pending,cancel(){cancelled++;}};}},effectiveMotion({policy:'subtle',durationMs:240}));assert.equal(resources.snapshot().animations,1);resources.dispose();resources.dispose();await new Promise(r=>setTimeout(r,12));assert.equal(fired,false);assert.equal(released,1);assert.equal(cancelled,1);assert.deepEqual(resources.snapshot(),{animations:0,timers:0,registered:0});
});
test('VIS-009 persisted author configuration, conflicts and restore preserve exact data/code/source',async()=>{
 const store=await new VisualProjectStore(path.join(home,'store')).init(),first=await store.save(p,{create:true}),copy=structuredClone(first);copy.plan.scenes.find(s=>s.id==='component-line').interactions[0].initialSeriesIds=['reviewed'];const saved=await store.save(copy,{expectedRevision:1});assert.deepEqual(saved.document,first.document);await assert.rejects(store.save(first,{expectedRevision:1}),{code:'REVISION_CONFLICT'});const snapshot=await store.snapshot(first.id,1),restored=await store.restoreAsCopy(first.id,1,{snapshotHash:snapshot.sha256,requestId:'motion-restore-000001'});assert.deepEqual(restored.project.plan.scenes,first.plan.scenes);assert.deepEqual(restored.project.document.blocks,first.document.blocks);assert.deepEqual(restored.project.document.datasets,first.document.datasets);
});
test('VIS-009 explanatory facts live once in semantic content, not copied into plans',()=>{
 for(const scene of p.plan.scenes)for(const i of scene.interactions||[])for(const step of i.steps||[]){assert.equal(Object.hasOwn(step,'text'),false);assert.equal(Object.hasOwn(step,'label'),false);assert.ok(p.document.explanations.some(n=>n.id===step.explanationId));}
 const copy=structuredClone(p),note=copy.document.explanations.find(n=>n.id==='code-difference');note.text='Updated exact semantic explanation.';assertVisualProject(copy);const compiled=compileCues(copy.document,copy.plan.scenes.find(s=>s.id==='component-code'));assert.equal(compiled.interactions[0].steps[1].text,note.text);assert.deepEqual(copy.plan,p.plan);
 copy.document.visualBrief.profile.motionIntensity='off';assert.ok(compileInteractionRuntime(copy.document,copy.plan).scenes.every(s=>s.motion.policy==='off'));assert.equal(copy.plan.scenes.find(s=>s.id==='component-code').motion.policy,'subtle');
});
