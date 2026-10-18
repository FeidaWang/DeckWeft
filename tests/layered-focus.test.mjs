import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {compileCues,assertSceneInteractions,staticInteractionState} from '../src/motion/cues.mjs';
import {initialInteractionState,reduceInteractionState} from '../src/motion/timeline.mjs';
import {SERIES_FOCUS_KINDS} from '../src/components/charts/semantics.mjs';
import {resolveTheme} from '../src/design/theme-registry.mjs';
import {focusTheme,focusedChart} from '../public/runtime/charts.js';
import {evidenceProject} from './evidence-scene.mjs';

const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s6-focus-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const demo=async()=>{const p=await createInteractionDemo('en',home);return {p,resources:await visualAssetResources(p,home)};};
const sceneOf=(p,id)=>p.plan.scenes.find(s=>s.id===id);
const section=(body,id)=>body.slice(body.indexOf(`<section id="${id}"`),body.indexOf('</section>',body.indexOf(`<section id="${id}"`)));
const legend=m=>[...m.matchAll(/<li( data-muted="true")?><svg class="legend-key"[\s\S]*?<\/svg>([^<]+)<\/li>/g)].map(x=>[x[2],!!x[1]]);

test('S6 layered focus: the embedded kind list matches the renderer, and the rule picks one drawing per kind',()=>{
 const block=kind=>({id:'b',type:'chart',chartType:kind,datasetId:'d',focus:{seriesIds:['a']}}),dataset={series:[{id:'a'},{id:'b'}]},theme=resolveTheme('dark-data','1.0.0','en');
 // focusedChart is embedded without imports, so its copy of the kind list is checked here against the renderer's.
 for(const kind of ['line','area','stacked','scatter','grouped-bar','dot-interval','small-multiples']){
  const drawn=focusedChart(block(kind),theme,dataset,{focusSeriesId:'b'}),declared=SERIES_FOCUS_KINDS.includes(kind);
  if(declared){assert.deepEqual(drawn.block.focus,{seriesIds:['b']},kind);assert.equal(drawn.theme,theme,kind);}
  else{assert.equal('focus' in drawn.block,false,kind);assert.deepEqual(drawn.theme,focusTheme(theme,dataset,{focusSeriesId:'b'}),kind);}
 }
 // Without a reader focus the author's declared focus is drawn unchanged.
 const own=block('line');assert.equal(focusedChart(own,theme,dataset,{focusSeriesId:null}).block,own);
});

test('S6 layered focus: a single-series chart refuses a series focus and keeps its declared category focus',async()=>{
 const project=await evidenceProject('en'),scene=project.plan.scenes[0],specs=compileCues(project.document,scene).interactions,spec=specs.find(s=>s.kind==='chart-select');
 assert.equal(spec.seriesIds.length,1);assert.ok(project.document.blocks.find(b=>b.id===spec.blockId).focus.categoryIds.length);
 assert.throws(()=>reduceInteractionState(specs,initialInteractionState(specs),{event:'data.focus',interactionId:spec.id,seriesId:spec.seriesIds[0]}),/single-series chart cannot focus a series/);
 // Clearing is still allowed (it is the default).
 assert.equal(reduceInteractionState(specs,initialInteractionState(specs),{event:'data.focus',interactionId:spec.id}).find(s=>s.id===spec.id).focusSeriesId,null);
 const bad=structuredClone(project);bad.plan.scenes[0].interactions.find(i=>i.kind==='chart-select').initialFocusSeriesId=spec.seriesIds[0];
 assert.throws(()=>assertSceneInteractions(bad.document,bad.plan.scenes[0]),/single-series chart cannot focus a series/);
});

test('S6 layered focus: the declared series focus is the default, a frozen reader focus wins in static output',async()=>{
 const {p,resources}=await demo(),q=structuredClone(p),block=q.document.blocks.find(b=>b.id==='component-line'),scene=sceneOf(q,'component-line');
 block.focus={seriesIds:['local']};assertVisualProject(q);
 // No static state: the no-JavaScript view draws the author's focus.
 const plain=section(exportDeck(q.document,'html',{experimentalWeb:true,plan:q.plan,assetResources:resources}).body,'component-line');
 assert.deepEqual(legend(plain.slice(0,plain.indexOf('<details>'))),[['Local · Focus',false],['Reviewed',true]]);
 // A static state that freezes the reader's focus on Reviewed overrides the declared focus.
 scene.cues.splice(1,1,{id:'focus-reviewed',event:'data.focus',interactionId:'select-line',seriesId:'reviewed',label:'Focus on Reviewed'});scene.cues.splice(0,1);
 scene.keyStates=[{id:'opening',position:0},{id:'focus',position:1,label:'Reviewed in focus'}];scene.staticState={keyStateId:'focus'};assertVisualProject(q);
 assert.equal(staticInteractionState(q.document,scene)[0].focusSeriesId,'reviewed');
 const frozen=section(exportDeck(q.document,'html',{experimentalWeb:true,plan:q.plan,assetResources:resources}).body,'component-line'),figure=frozen.slice(frozen.indexOf('<figure class="chart"'),frozen.indexOf('<details>',frozen.indexOf('<figure class="chart"')));
 assert.deepEqual(legend(figure),[['Local',true],['Reviewed · Focus',false]]);assert.match(frozen,/Focus: Reviewed\. Complete data below\./);
 // The complete table is the same in both files: focus never changes data.
 const table=m=>m.slice(m.indexOf('<details>'),m.indexOf('</details>',m.indexOf('<details>')));assert.equal(table(frozen.slice(frozen.indexOf('<figure class="chart"'))),table(plain.slice(plain.indexOf('<figure class="chart"'))));
});
