import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assertPresentation} from '../src/core/blocks.mjs';
import {assertDesignPlan} from '../src/design/plan.mjs';
import {assertVisualProject,assertVisualLocks} from '../src/core/visual-project.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {resolveTheme} from '../src/design/theme-registry.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {runtime} from '../src/render/web/runtime.mjs';
import {blockHTML} from '../src/render/web/components/blocks.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {chartSemantics} from '../src/components/charts/semantics.mjs';
import {objectAnchor} from '../src/components/annotations/identity.mjs';
import {staticInteractionState} from '../src/motion/cues.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {createCueClock} from '../src/motion/clock.mjs';
import {addExplanatoryInteractions,useStaticState} from '../public/studio/interactions.js';
import {evidenceScene,evidenceProject,semanticView,declaredExportLevels} from './evidence-scene.mjs';
const html=project=>exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan});
const section=(body,id)=>body.slice(body.indexOf(`<section id="${id}"`),body.indexOf('</section>',body.indexOf(`<section id="${id}"`)));
const runtimeData=body=>JSON.parse(body.match(/<script type="application\/json" id="dw-runtime-data">([\s\S]*?)<\/script>/)[1]);
const rejects=(fn,code,pattern)=>assert.throws(fn,error=>{assert.equal(error.code,code);if(pattern)assert.match(error.message,pattern);return true;});
const sceneOf=p=>p.plan.scenes.find(s=>s.id==='evidence');
// A value never wraps away from its unit in the static statement.
const values={en:['Claim first 38\u00a0%','Outline first 31\u00a0%','Data first 27\u00a0%'],'zh-CN':['先写结论 38\u00a0%','先列提纲 31\u00a0%','先看数据 27\u00a0%']};

test('S2 import: the bilingual evidence scene is one illustrative claim, ranked bar, source and focus without S4 declarations',async()=>{
 for(const locale of ['en','zh-CN']){
  const {document:d,plan:p}=await evidenceScene(locale),project=assertVisualProject(await evidenceProject(locale));
  assertPresentation(d);assertDesignPlan(d,p);assert.deepEqual(project.document.blocks,d.blocks);
  const scene=p.scenes[0],chart=d.blocks.find(b=>b.type==='chart'),dataset=d.datasets[0];
  assert.equal(scene.contentStatus,'illustrative');assert.equal(dataset.synthetic,true);assert.equal(d.rules.misreading,'strict');
  assert.deepEqual(scene.blockIds.map(id=>d.blocks.find(b=>b.id===id).type),['heading','chart','callout','paragraph','citation']);
  assert.equal(d.sources.length,1);assert.equal(scene.interactions.length,1);assert.equal(scene.interactions[0].kind,'chart-select');assert.equal(chart.chartType,'ranked-bar');
  assert.ok(d.title.length>(locale==='zh-CN'?36:100)&&/[—–]/.test(d.title)&&/[?？]/.test(d.title)&&/[(（]2026/.test(d.title),'long title with mixed punctuation');
  assert.deepEqual(chartSemantics(chart,dataset),{kind:'ranked-bar',question:chart.question,takeaway:chart.takeaway,scale:{y:'linear',x:'linear'},sort:'value-desc',truncation:null,intervalSeriesIds:[],eventIds:[],missingReasons:0});
  assert.deepEqual(presentationCapabilities('html',d,{},p).issues,[]);
  assert.ok(scene.keyStates.find(k=>k.id==='structure-first').position>0);
 }
});

test('S2 theme switch changes composition and type roles, never facts, ids, sources or semantic fields',async()=>{
 for(const locale of ['en','zh-CN']){
  const dark=await evidenceProject(locale,{staticState:'structure-first'}),before=semanticView(dark);
  const cream=applySceneTheme(dark,'evidence','cream-collage'),back=applySceneTheme(cream,'evidence','dark-data');
  assert.deepEqual(semanticView(cream),before);assert.deepEqual(semanticView(back),before);
  // Conflict C9 (fixed in S3): the round trip leaves the plan, the scene source hash and the render hash unchanged.
  assert.deepEqual(back.plan,dark.plan);assert.equal('colorMode' in sceneOf(back),false);assert.equal('colorMode' in sceneOf(cream),false);
  assert.equal(html(back).renderHash,html(dark).renderHash);
  assert.equal(sceneOf(dark).composition,'chart-with-evidence-rail');assert.equal(sceneOf(cream).composition,'reading-flow');assert.equal(sceneOf(cream).theme,'cream-collage');
  const roles=p=>{const t=resolveTheme(sceneOf(p).theme,sceneOf(p).themeVersion,locale);return {display:t.display,body:t.body,paper:t.paper};};
  assert.notEqual(roles(cream).display,roles(dark).display);assert.notEqual(roles(cream).paper,roles(dark).paper);
  // The same facts reach both renders: values, labels, takeaway and source text.
  for(const project of [dark,cream]){const body=section(html(project).body,'evidence');for(const fact of [...values[locale],project.document.blocks.find(b=>b.id==='evidence-takeaway').text,project.document.sources[0].title])assert.ok(body.includes(fact.replaceAll("'",'&#39;')),fact);}
 }
});

test('S2 static export draws the frozen chart selection without JavaScript and keeps every identity and value',async()=>{
 for(const locale of ['en','zh-CN']){
  const project=await evidenceProject(locale,{staticState:'structure-first'}),scene=sceneOf(project),out=html(project),markup=section(out.body,'evidence'),d=project.document.datasets[0];
  const frozen=staticInteractionState(project.document,scene)[0];assert.deepEqual([frozen.fromId,frozen.toId],['claim-first','data-first']);
  const figure=markup.slice(markup.indexOf('<figure class="chart"'),markup.indexOf('</figure>')),plot=figure.slice(0,figure.indexOf('<details>'));
  // Title, chart, visible labels, legend identity, takeaway, source and caption, with no fact only in a hover title.
  // Since S4 the ranked bar is HTML rows: real category and value text beside each bar, never only in a hover title (C2).
  const rows=plot.slice(plot.indexOf('<ol class="chart-rows"'),plot.indexOf('</ol>'));assert.equal((rows.match(/<rect /g)||[]).length,3);
  for(const [i,id]of ['claim-first','outline-first','data-first'].entries()){const k=d.categoryIds.indexOf(id);assert.ok(rows.includes(`<span data-conclusion-label="true">${d.categories[k]}</span>`));assert.ok(rows.includes(`<span class="chart-value" data-conclusion-label="true">${d.series[0].values[k]}</span>`));assert.ok(plot.includes(`id="${objectAnchor('evidence','evidence-chart',id,'reduction')}"`),String(i));}
  for(const id of ['template','slide-by-slide','no-habit'])assert.equal(plot.includes(objectAnchor('evidence','evidence-chart',id,'reduction')),false);
  // The declared category focus (C1) replaces a single-series legend: one focus key and one key for the other bars.
  assert.match(plot,/<ul class="legend"><li><svg class="legend-key"[^>]*>.*?<\/svg>[^<]+<\/li><li><svg class="legend-key"[^>]*>.*?<\/svg>[^<]+<\/li><\/ul>/);
  const note=markup.match(/<p class="component-note static-state-note" data-static-state="structure-first">([^<]+)<\/p><figure class="chart"/)[1];
  assert.ok(note.includes(scene.keyStates[1].label));for(const v of values[locale])assert.ok(note.includes(v),v);
  assert.ok(plot.includes(locale==='zh-CN'?'合成演示数据':'Synthetic demonstration data'));
  for(const id of ['evidence-title','evidence-takeaway','evidence-caption'])assert.ok(markup.includes(project.document.blocks.find(b=>b.id===id).text.replaceAll("'",'&#39;')),id);
  assert.ok(markup.includes(`<p class="citation"><a href="${project.document.sources[0].url}"`));
  // The complete table stays unfiltered; marks outside the frozen view keep their anchors there.
  const table=figure.slice(figure.indexOf('<details>'));assert.equal((table.match(/<tr><th scope="row">/g)||[]).length,6);
  for(const id of d.categoryIds)for(const s of ['','reduction'])assert.equal(markup.split(`id="${objectAnchor('evidence','evidence-chart',id,s)}"`).length,2,id+s);
  assert.equal((table.match(/data-excluded-anchor="true"/g)||[]).length,6);
  // S5 folded the S2 static-state extension into the one embedded player: every export carries the same runtime.
  assert.ok(out.body.includes(`<script>${runtime}</script>`));
  assert.ok(out.csp.includes(createHash('sha256').update(runtime).digest('base64')));
  assert.deepEqual(out.staticStates,[{sceneId:'evidence',keyStateId:'structure-first',position:1}]);
  assert.deepEqual(runtimeData(out.body).scenes.map(s=>s.staticState),[{keyStateId:'structure-first',position:1,reducedMotion:'static'},undefined]);
  assert.deepEqual(runtimeData(out.body).scenes[0].interactions[0].initialSeriesIds,['reduction']);assert.equal(runtimeData(out.body).scenes[0].interactions[0].initialToId,'no-habit');
  // Without a static state the scene renders exactly as before: plain runtime and the unfrozen chart.
  const legacy=structuredClone(project);delete sceneOf(legacy).staticState;sceneOf(legacy).motion.reducedMotion='instant';
  const plain=html(legacy);assert.ok(plain.body.includes(`<script>${runtime}</script>`));assert.equal(section(plain.body,'evidence').includes('static-state-note'),false);assert.deepEqual(plain.staticStates,[]);assert.equal(runtimeData(plain.body).scenes[0].staticState,undefined);
  const theme=resolveTheme('dark-data','1.0.0',locale,{role:'evidence',profile:legacy.document.visualBrief.profile});
  assert.ok(section(plain.body,'evidence').includes(blockHTML(legacy.document.blocks[1],legacy.document,theme,{sceneId:'evidence'})));
 }
});

test('S2 static states that change steps are drawn for HTML since S5 (C8); STATIC_STATE_UNIMPLEMENTED is gone',async()=>{
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s2-steps-')));
 try{
  const p=addExplanatoryInteractions(await createCompositionDemo('en',home),'process'),scene=p.plan.scenes.find(s=>s.id==='process');
  scene.keyStates=[{id:'opening',position:0},{id:'second-step',position:1}];scene.staticState={keyStateId:'second-step'};assertVisualProject(p);
  const codes=()=>presentationCapabilities('html',p.document,{},p.plan).issues.filter(i=>i.code.startsWith('STATIC_STATE')).map(i=>[i.code,i.sceneId]);
  assert.deepEqual(codes(),[]);
  scene.staticState={keyStateId:'opening'};assert.deepEqual(codes(),[]);
 }finally{await rm(home,{recursive:true,force:true});}
});

test('S2 Studio static-state choice names an existing key state and respects cue and motion locks',async()=>{
 const project=await evidenceProject('en'),chosen=useStaticState(project,'evidence','structure-first');
 assert.deepEqual(sceneOf(chosen).staticState,{keyStateId:'structure-first'});assert.deepEqual(sceneOf(project).staticState,{keyStateId:'opening'});assertVisualProject(chosen);assertVisualLocks(project,chosen);
 assert.throws(()=>useStaticState(project,'evidence','absent'),/existing key state/);assert.throws(()=>useStaticState(project,'absent','opening'),/existing scene/);
 assert.throws(()=>useStaticState(project,'evidence',null),/needs a static state/);
 const instant=structuredClone(project);sceneOf(instant).motion.reducedMotion='instant';assert.equal(sceneOf(useStaticState(instant,'evidence',null)).staticState,undefined);
 for(const fields of [['cues'],['motion'],['interactions','cues','motion']]){
  const locked=structuredClone(project);locked.document.authorOverrides.sceneLocks=[{sceneId:'evidence',fields}];
  assert.throws(()=>useStaticState(locked,'evidence','structure-first'),/Unlock this scene cue order and motion/);
  const bypass=structuredClone(locked);sceneOf(bypass).staticState={keyStateId:'structure-first'};rejects(()=>assertVisualLocks(locked,bypass),'AUTHOR_LOCK');
  const moved=structuredClone(locked);sceneOf(moved).keyStates[0].position=1;rejects(()=>assertVisualLocks(locked,moved),'AUTHOR_LOCK');
  const unlocked=structuredClone(bypass);unlocked.document.authorOverrides.sceneLocks=[];assertVisualLocks(locked,unlocked);
  const extra=structuredClone(locked);sceneOf(extra).keyStates.push({id:'extra',position:2});assertVisualLocks(locked,extra);
 }
 const other=structuredClone(project);other.document.authorOverrides.sceneLocks=[{sceneId:'evidence',fields:['interactions','composition']}];useStaticState(other,'evidence','structure-first');
});

test('S2 static state on the one clock: the player opens there, and reduced motion shows it instead of playing cues',()=>{
 // S5 replaced the S2 runtime extension with the cue clock every export embeds (tests/motion-state.test.mjs covers the clock itself).
 const pending=new Set(),log=[],schedule=fn=>{const t={fn};pending.add(t);return ()=>pending.delete(t);},clock=createCueClock({count:2,schedule,apply:(position,reason)=>log.push([reason,position]),staticState:{keyStateId:'structure-first',position:1,reducedMotion:'static'}});
 clock.seek(1,'static');assert.deepEqual(log,[['static',1]]);
 assert.equal(clock.restart(),true);assert.deepEqual(log.at(-1),['restart',0]);assert.equal(pending.size,1,'Replay still starts from the authored opening');
 clock.explore();assert.equal(pending.size,0);clock.setReduced(true);assert.deepEqual(log.at(-1),['static',1]);assert.equal(clock.frozen,true);
 const count=log.length;assert.equal(clock.play(),false);assert.equal(clock.restart(),false);assert.equal(log.length,count,'a frozen scene neither plays nor re-seeks');assert.equal(pending.size,0);
 clock.next();assert.deepEqual(log.at(-1),['next',2]);clock.setReduced(true);assert.deepEqual(log.at(-1),['static',1],'reduction returns to the static state');
 clock.setReduced(false);assert.equal(clock.frozen,false);assert.equal(clock.restart(),true);assert.deepEqual(log.at(-1),['restart',0]);
});

test('S2 declared PPTX and PDF levels: no component declares L1, L2 or L3 and both targets are refused',async()=>{
 for(const locale of ['en','zh-CN']){
  const {document:d,plan:p}=await evidenceScene(locale),report=declaredExportLevels(d,p);
  for(const target of ['pptx','pdf']){
   assert.deepEqual(report[target].refused,['TARGET_UNIMPLEMENTED']);
   assert.deepEqual(report[target].components.map(c=>[c.blockId,c.level,c.supported,c.representation]),d.blocks.map(b=>[b.id,null,false,'unimplemented']));
  }
 }
});
