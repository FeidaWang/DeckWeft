// S5 motion and state in a real, isolated browser: keyboard traces (no parameter change turns the page), reduced-motion and motion
// primitive traces, fast paging, static states without JavaScript, the measured static state (gate) and the Studio opening guard.
// CHROMIUM_PATH=/isolated/chrome-for-testing PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_motion_state.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {compileCues} from '../src/motion/cues.mjs';
import {seekInteractionState} from '../src/motion/timeline.mjs';
import {MOTION_PRIMITIVES} from '../src/motion/primitives.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {revealStudio} from './studio-controls.mjs';
import {evidenceProject} from './evidence-scene.mjs';
if(!process.env.CHROMIUM_PATH||!process.env.PLAYWRIGHT_MODULE)throw Error('Set CHROMIUM_PATH (isolated testing binary outside Applications) and PLAYWRIGHT_MODULE.');
const binary=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(binary)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),out=path.resolve(process.env.DECKWEFT_EVIDENCE_OUT||'dist/motion-state');await mkdir(out,{recursive:true});
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s5-motion-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0});
const browser=await chromium.launch({executablePath:binary,headless:true}),hash=b=>createHash('sha256').update(b).digest('hex');
// Optional before/after: DECKWEFT_BEFORE="en=/path/s2-en.html,zh-CN=/path/s2-zh.html" points at exports of the same evidence scene made by an earlier player (S2, 232060e).
const before=Object.fromEntries((process.env.DECKWEFT_BEFORE||'').split(',').filter(Boolean).map(v=>v.split('=')));
const report={browser:browser.version(),before:[],binary:'isolated Chrome for Testing outside /Applications; Playwright temporary profile per context',keyboard:[],reducedMotion:[],primitives:[],fastPaging:[],staticViews:[],gate:[],studio:[],captures:[],errors:[],external:[]};
const log=(kind,locale,result)=>{report[kind].push({locale,...result});console.log(kind,locale,JSON.stringify(result).slice(0,220));};
// Counts every pending page timer so cancellation is measured, not assumed (as in the S2 probe).
const timerProbe=()=>{const live=new Set(),st=setTimeout,ct=clearTimeout,si=setInterval,ci=clearInterval;window.setTimeout=function(fn,ms,...rest){const id=st.call(window,function(){live.delete(id);return typeof fn==='function'?fn.apply(this,arguments):undefined;},ms,...rest);live.add(id);return id;};window.clearTimeout=id=>{live.delete(id);return ct.call(window,id);};window.setInterval=function(fn,ms,...rest){const id=si.call(window,fn,ms,...rest);live.add(id);return id;};window.clearInterval=id=>{live.delete(id);return ci.call(window,id);};Object.defineProperty(window,'__dwPendingTimers',{get:()=>live.size});};
async function context(options={}){const c=await browser.newContext({deviceScaleFactor:1,...options});await c.addInitScript(timerProbe);await c.route('**/*',r=>{const url=r.request().url();if(url.startsWith(app.url+'/')||/^(data|blob|file):/.test(url))return r.continue();report.external.push(url);return r.abort();});return c;}
async function page(options,name){const p=await (await context(options)).newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(name+': '+e.message));return p;}
async function settle(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.evaluate(()=>Promise.all(document.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));}
// An element is scrolled into view first: in reading view, entering the viewport starts the scene's entry motion, which must finish before the capture.
async function capture(target,name,{settled=true,...options}={}){const p=target.page?target.page():target;if(target.page)await target.scrollIntoViewIfNeeded();if(settled){await p.waitForTimeout(50);await settle(p);}const file=path.join(out,name);await target.screenshot({path:file,animations:'disabled',...options});report.captures.push({file:name,sha256:hash(await readFile(file))});}
async function ready(p,url){await p.goto(url);await p.waitForFunction(()=>['true','failed'].includes(document.body.dataset.ready));assert.equal(await p.evaluate(()=>document.body.dataset.ready),'true',await p.locator('#status').textContent());}
const snap=(p,id)=>p.evaluate(id=>window.deckweftInteractions.snapshot().find(s=>s.sceneId===id),id);
const pageLabel=p=>p.locator('#page').textContent();
const viewport=width=>({width,height:width===390?844:1000});
const STATIC_SCENES={'component-line':1,'component-process':1,'component-code':1,'image-comparison':2,'violet':1};
/** The interaction demo plus author choices that exercise S5: a focus key state on a two-series line chart, and frozen steps, code lines, a comparison tab and a hotspot. */
async function demoProject(locale){
 const p=await createInteractionDemo(locale,store.home,{id:'s5-demo-'+locale}),zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en,scene=id=>p.plan.scenes.find(s=>s.id===id);
 const line=scene('component-line'),d=p.document.datasets.find(v=>v.id===p.document.blocks.find(b=>b.id==='component-line').datasetId),all={fromId:d.categoryIds[0],toId:d.categoryIds.at(-1)};
 line.cues=[{id:'focus-reviewed',event:'data.focus',interactionId:'select-line',seriesId:'reviewed',label:t('Focus on Reviewed; Local stays as context','聚焦“已审阅”，“本地”保留为背景')},{id:'hide-local',event:'data.filter',interactionId:'select-line',seriesIds:['reviewed'],...all,label:t('Hide Local','隐藏“本地”')},{id:'show-both',event:'data.filter',interactionId:'select-line',seriesIds:['local','reviewed'],...all,label:t('Show both series again','重新显示两个系列')}];
 line.motion={policy:'subtle',durationMs:240,reducedMotion:'static'};
 for(const [id,position] of Object.entries(STATIC_SCENES)){const s=scene(id);s.keyStates=[{id:'opening',position:0,label:t('Opening','开场')},{id:'frozen',position,label:t('Author static state','作者静态状态')}];s.staticState={keyStateId:'frozen'};}
 return p;
}
/** Keyboard trace: every key on every visible control, slider, tab, link, disclosure and focusable chart mark of one scene, in presentation view. */
async function keyboardTrace(p,sceneId,locale,width){
 await p.evaluate(id=>{location.hash='scene='+id;},sceneId);await p.waitForFunction(id=>document.getElementById(id).classList.contains('active'),sceneId);const start=await pageLabel(p),origin=(await snap(p,sceneId)).position;
 const targets=await p.evaluate(id=>{
  const scene=document.getElementById(id),visible=n=>n.getClientRects().length&&!n.closest('[hidden]')&&(!n.closest('details:not([open])')||n.matches('summary'));
  const marks=[...scene.querySelectorAll('.chart-current-view g[tabindex][data-series-id]')].filter(visible).slice(0,3).map(g=>({selector:`#${id} .chart-current-view g[data-object-id="${g.dataset.objectId}"][data-series-id="${g.dataset.seriesId}"]`,tag:'g',label:'chart mark '+g.dataset.objectId+' · '+g.dataset.seriesId}));
  // Elements the chart view redraws are found again by structure; every other control keeps a trace marker.
  const controls=[...scene.querySelectorAll('input,select,button,summary,a[href^="#"],[tabindex]:not(g),[role=tab]')].filter(n=>visible(n)&&!n.disabled).map((n,i)=>{const redrawn=n.closest('.chart-current-view');if(!redrawn)n.dataset.trace=id+'-'+i;return {selector:redrawn?`#${id} .chart-current-view ${n.tagName.toLowerCase()}`:`[data-trace="${id}-${i}"]`,tag:n.tagName.toLowerCase(),label:(n.getAttribute('aria-label')||n.textContent||n.type||'').trim().replace(/\s+/g,' ').slice(0,50)};});
  return [...controls,...marks];
 },sceneId);
 const presses=[];
 for(const target of targets)for(const key of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End','Space','Enter']){
  if(target.tag==='select'&&['Space','Enter'].includes(key))continue; // would open the native picker; arrows and Home/End change the selection
  // Every press starts from the scene's starting cue boundary (this also stops playback), so earlier keys cannot remove a later target.
  const focused=await p.evaluate(([s,id,position])=>{window.deckweftInteractions.seek(id,position);const n=document.querySelector(s);if(!n||n.disabled)return false;n.focus();return document.activeElement===n;},[target.selector,sceneId,origin]);if(!focused){presses.push({...target,key,skipped:'not focusable at the starting boundary'});continue;}
  const before=JSON.stringify((await snap(p,sceneId)).state)+(await snap(p,sceneId)).position;await p.keyboard.press(key);const after=JSON.stringify((await snap(p,sceneId)).state)+(await snap(p,sceneId)).position,label=await pageLabel(p);
  presses.push({...target,key,page:label,parameterChanged:before!==after});
  assert.equal(label,start,`${locale} ${width} ${sceneId}: ${key} on ${target.label} turned the page`);
  if(await p.evaluate(id=>!document.getElementById(id).classList.contains('active'),sceneId))throw Error('The scene left the stage on '+key+' / '+target.label);
 }
 // Positive control: with nothing focused the same key does turn the page, so the guard is not simply off.
 const [n,total]=start.split(' / ').map(Number),[away,home]=n<total?['ArrowRight','ArrowLeft']:['ArrowLeft','ArrowRight'];
 await p.evaluate(()=>{document.activeElement?.blur();});await p.keyboard.press(away);const moved=await pageLabel(p);await p.keyboard.press(home);const back=await pageLabel(p);
 assert.notEqual(moved,start,away+' with nothing focused turns the page');assert.equal(back,start);
 return {sceneId,page:start,startPosition:origin,targets:targets.length,presses:presses.filter(x=>!x.skipped).length,skipped:presses.filter(x=>x.skipped).length,parameterChanges:presses.filter(x=>x.parameterChanged).length,pageChanges:0,marks:targets.filter(x=>x.tag==='g').length,positiveControl:{[away]:moved,[home]:back},detail:presses.map(x=>[x.label,x.key,x.parameterChanged?'parameter changed':'parameter unchanged',x.skipped||'page '+x.page].join(' | '))};
}
// Animations carry their primitive name as the Web Animations id; the keyframes are checked against the registry as the browser reports them.
const canon=(k,v)=>{v=String(v).trim().replace(/\s+/g,' ');const m=k==='clipPath'&&v.match(/^inset\((.*)\)$/);if(!m)return v;let t=m[1].split(' ').map(x=>x==='0px'?'0':x);if(t.length===1)t=[t[0],t[0],t[0],t[0]];else if(t.length===2)t=[t[0],t[1],t[0],t[1]];else if(t.length===3)t=[t[0],t[1],t[2],t[1]];return 'inset('+t.join(' ')+')';};
async function liveAnimations(p){return p.evaluate(()=>document.getAnimations({subtree:true}).map(a=>({id:a.id,frames:a.effect.getKeyframes().map(k=>Object.fromEntries(Object.entries(k).filter(([n])=>['opacity','transform','clipPath'].includes(n)).map(([n,v])=>[n,String(v)]))),duration:a.effect.getTiming().duration,delay:a.effect.getTiming().delay})));}
const framesMatch=a=>{const want=MOTION_PRIMITIVES[a.id]?.frames;return !!want&&want.length===a.frames.length&&want.every((f,i)=>Object.entries(f).every(([k,v])=>k==='opacity'?Number(a.frames[i][k])===v:canon(k,a.frames[i][k])===canon(k,v)));};

try{
 for(const locale of ['en','zh-CN']){
  const zh=locale==='zh-CN';
  // 1. Gate (C5): Studio measures the opening and every declared static state before HTML export; the download is that measured preview.
  const studioContext=await context({viewport:{width:1600,height:1100},acceptDownloads:true}),studio=await studioContext.newPage();studio.setDefaultTimeout(30000);studio.on('pageerror',e=>report.errors.push(locale+' studio: '+e.message));
  const measured=()=>studio.waitForFunction(()=>!document.querySelector('#exportHTML').disabled&&document.querySelector('#fit').textContent.startsWith('✓'));
  const files={};
  for(const [name,project] of [['demo',await demoProject(locale)],['evidence',await evidenceProject(locale,{staticState:'structure-first'})]]){
   const saved=await store.save(project,{create:true}),fits=[];studio.on('console',()=>{});
   await studio.goto(app.url+'/visual?project='+saved.id+'&ui='+locale);await measured();
   const preview=(await studio.locator('#preview').getAttribute('src')).split('#')[0],fit=await studio.frameLocator('#preview').locator('body').evaluate(()=>window.deckweftFit);
   assert.equal(fit.ok,true);assert.equal(fit.player,PLAYER_VERSION);assert.deepEqual(fit.states.map(s=>[s.sceneId,s.keyStateId,s.position]),project.plan.scenes.filter(s=>s.staticState).map(s=>[s.id,s.staticState.keyStateId,s.keyStates.find(k=>k.id===s.staticState.keyStateId).position]));
   const download=studio.waitForEvent('download');await studio.locator('#exportHTML').click();const file=path.join(out,`${locale}-${name}.html`);await (await download).saveAs(file);
   const exported=await readFile(file,'utf8');assert.equal(exported,await (await fetch(app.url+preview)).text(),'the download is the measured preview');files[name]={file,url:pathToFileURL(file).href,project:saved};
   log('gate',locale,{project:name,measuredStates:fit.states.map(s=>({sceneId:s.sceneId,keyStateId:s.keyStateId,position:s.position,overflow:s.overflow.length,clip:s.clipIssues.length,contrast:s.contrastIssues.length})),ok:fit.ok,viewport:fit.viewport,bytes:Buffer.byteLength(exported),sha256:hash(exported)});
  }
  // 2. Studio opening guard (C20): the preview opens on the static state; copying it without exploring is refused.
  await studio.goto(app.url+'/visual?project='+files.evidence.project.id+'&scene=evidence&ui='+locale);await measured();await revealStudio(studio,'edit');await studio.locator('#contentTab').click();
  const disclosure=studio.locator('details').filter({has:studio.locator('#useInteractionOpening')});if(!await disclosure.evaluate(n=>n.open))await disclosure.locator(':scope > summary').click();
  const frame=studio.frameLocator('#preview'),previewSnap=()=>frame.locator('body').evaluate(()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId==='evidence'));
  assert.equal((await previewSnap()).position,1);await studio.locator('#useInteractionOpening').click();await studio.waitForFunction(()=>document.querySelector('#message').classList.contains('error'));
  const refused=await studio.locator('#message').textContent();assert.match(refused,zh?/提示位置 1（静态状态）/:/cue position 1 \(the static state\)/);
  assert.equal(await studio.locator('#save').isDisabled(),true,'nothing changed');await studio.locator('#message').scrollIntoViewIfNeeded();await capture(studio,`${locale}-studio-opening-refused.png`);
  await frame.locator('#evidence select[data-range="toId"]').selectOption('template');assert.equal((await previewSnap()).exploring,true);await studio.locator('#useInteractionOpening').click();await studio.waitForFunction(()=>!document.querySelector('#save').disabled);
  const accepted=await studio.locator('#message').textContent();
  log('studio',locale,{opensAt:1,refusedWithoutExploring:refused,afterExploringToTemplate:accepted,saveEnabled:true});
  await studioContext.close();
  // 2b. Before/after on the evidence scene: a focused chart mark with ArrowRight (C14) and the explanation line (C4).
  for(const [player,url] of [...(before[locale]?[['S2 (232060e)',pathToFileURL(path.resolve(before[locale])).href]]:[]),['S5 (this build)',files.evidence.url]]){
   const p=await page({viewport:viewport(1440)},locale+' before/after');await ready(p,url+'#scene=evidence');const start=await pageLabel(p);
   await p.evaluate(()=>document.querySelector('#evidence .chart-current-view .chart-mark[tabindex]').focus());const focused=await p.evaluate(()=>document.activeElement.tagName+'['+document.activeElement.dataset.objectId+']');await p.keyboard.press('ArrowRight');
   const result={player,start,focused,afterArrowRight:await pageLabel(p),explanation:await p.locator('#evidence .chart-selection-explanation').textContent()};report.before.push({locale,...result});console.log('before/after',locale,JSON.stringify(result));await p.context().close();
  }
  // 3. Keyboard traces at 1440 and 390 px in presentation view: no parameter key turns the page (C14).
  for(const width of [1440,390]){
   const p=await page({viewport:viewport(width)},locale+' keyboard '+width);await ready(p,files.demo.url+'#scene=component-line');
   for(const id of ['component-line','component-heatmap','component-process','component-code','image-comparison','violet'])log('keyboard',locale,{width,file:'demo',...await keyboardTrace(p,id,locale,width)});
   await ready(p,files.evidence.url+'#scene=evidence');log('keyboard',locale,{width,file:'evidence',...await keyboardTrace(p,'evidence',locale,width)});
   // A focused chart mark (reachable through annotation anchors) with ArrowRight pressed: the page stays 1 / 2.
   await p.evaluate(()=>document.querySelector('#evidence .chart-current-view .chart-mark[tabindex]').focus());await p.keyboard.press('ArrowRight');assert.equal(await pageLabel(p),'1 / 2');
   await capture(p,`${locale}-keyboard-mark-${width}.png`);await p.context().close();
  }
  // 4. Motion primitives with motion on, then reduced motion: the same actions animate with the named frames, or not at all.
  const motion=await page({viewport:viewport(1440)},locale+' motion');await ready(motion,files.demo.url+'#scene=component-line');
  const seen={};const act=async(sceneId,label,fn)=>{await motion.evaluate(id=>{location.hash='scene='+id;},sceneId);await motion.waitForFunction(id=>document.getElementById(id).classList.contains('active'),sceneId);await settle(motion);await fn();const live=await liveAnimations(motion);for(const a of live){assert.ok(framesMatch(a),JSON.stringify(a));assert.ok(a.duration+a.delay<=400,JSON.stringify(a));seen[a.id]=(seen[a.id]||0)+1;}report.primitives.push({locale,sceneId,action:label,animations:live.map(a=>({primitive:a.id,duration:a.duration,delay:a.delay,framesMatchRegistry:true}))});await settle(motion);};
  await act('component-line','focus Reviewed',()=>motion.locator('#component-line .chart-series-switch button[data-select-series="reviewed"]').click());
  await act('component-line','hide Local',()=>motion.locator('#component-line input[data-series="local"]').uncheck());
  await act('component-line','show Local again',()=>motion.locator('#component-line input[data-series="local"]').check());
  await act('component-process','select a step',()=>motion.locator('#component-process [data-step-id]').nth(2).click());
  await act('image-comparison','select the second image',()=>motion.locator('#image-comparison [data-tab-id="second"]').click());
  await act('violet','open a hotspot',()=>motion.locator('#violet [data-hotspot-id="source"]').click());
  await act('component-code','replay (scene entry)',()=>motion.locator('#component-code [data-cue-replay]').click());
  for(const name of Object.keys(MOTION_PRIMITIVES))assert.ok(seen[name],`${locale}: ${name} was not observed`);assert.deepEqual(Object.keys(seen).filter(k=>!MOTION_PRIMITIVES[k]),[]);
  report.primitives.push({locale,summary:seen});
  // 5. Fast paging: replay, then rapid Next/Previous across scenes while cue timers and animations are pending.
  await motion.evaluate(()=>{location.hash='scene=component-line';});await motion.waitForFunction(()=>document.getElementById('component-line').classList.contains('active'));await motion.locator('#component-line [data-cue-replay]').click();await motion.evaluate(()=>window.deckweftInteractions.registerResource('component-line',()=>{window.__released=(window.__released||0)+1;}));
  const flip=id=>motion.evaluate(id=>document.getElementById(id).click(),id);
  for(let i=0;i<8;i++){await flip('next');await flip('next');await flip('previous');}
  for(let i=0;i<6;i++)await flip('previous');
  await motion.evaluate(()=>{location.hash='scene=component-code';});await motion.waitForFunction(()=>document.getElementById('component-code').classList.contains('active'));await motion.locator('#component-code [data-cue-replay]').click();await flip('next');await flip('previous');await flip('next');
  await motion.waitForTimeout(400);const left=await motion.evaluate(()=>({timers:window.__dwPendingTimers,animations:document.getAnimations({subtree:true}).length,released:window.__released||0,scenes:window.deckweftInteractions.snapshot().filter(s=>s.playing||s.resources.timers||s.resources.animations||s.resources.registered).map(s=>s.sceneId)}));
  assert.deepEqual(left,{timers:0,animations:0,released:1,scenes:[]});log('fastPaging',locale,left);await motion.context().close();
  for(const width of [1440,390]){
   const reduced=await page({viewport:viewport(width),reducedMotion:'reduce'},locale+' reduced '+width);await ready(reduced,files.demo.url+'#scene=component-line');
   const frozen=await snap(reduced,'component-line');assert.equal(frozen.frozen,true);assert.equal(frozen.position,1);assert.equal(frozen.state[0].focusSeriesId,'reviewed');
   const replay=reduced.locator('#component-line [data-cue-replay]');assert.equal(await replay.isDisabled(),true);assert.equal(await reduced.locator('#component-line [data-static-fallback]').isVisible(),true);
   const trace=[];for(const [label,fn] of [['next cue',()=>reduced.locator('#component-line [data-cue-next]').click()],['previous cue',()=>reduced.locator('#component-line [data-cue-previous]').click()],['slider End',async()=>{await reduced.locator('#component-line [data-cue-position]').focus();await reduced.keyboard.press('End');}],['focus Local',()=>reduced.locator('#component-line .chart-series-switch button[data-select-series="local"]').click()],['play (refused)',()=>reduced.evaluate(()=>window.deckweftInteractions.play('component-line'))],['step',async()=>{await reduced.evaluate(()=>{location.hash='scene=component-process';});await reduced.locator('#component-process [data-step-id]').nth(0).click();}],['tab',async()=>{await reduced.evaluate(()=>{location.hash='scene=image-comparison';});await reduced.locator('#image-comparison [data-tab-id="first"]').click();}]]){
    await fn();const s=await reduced.evaluate(()=>({animations:document.getAnimations({subtree:true}).length,scenes:window.deckweftInteractions.snapshot().map(s=>s.resources.animations).reduce((a,b)=>a+b,0)}));trace.push({action:label,...s,line:await snap(reduced,'component-line').then(v=>({position:v.position,playing:v.playing,exploring:v.exploring}))});assert.equal(s.animations,0,label);assert.equal(s.scenes,0,label);
   }
   assert.equal(trace.find(t=>t.action==='play (refused)').line.playing,false);
   await reduced.evaluate(()=>{location.hash='scene=component-line';});await reduced.waitForFunction(()=>document.getElementById('component-line').classList.contains('active'));await reduced.evaluate(()=>window.deckweftInteractions.play('component-line'));
   const back=await snap(reduced,'component-line');assert.equal(back.position,1,'reduced motion returns to the static state');await capture(reduced,`${locale}-reduced-${width}.png`);
   log('reducedMotion',locale,{width,opensAt:frozen.position,frozen:true,replayDisabled:true,noticeVisible:true,trace,afterPlay:{position:back.position,playing:back.playing},timers:await reduced.evaluate(()=>window.__dwPendingTimers)});await reduced.context().close();
  }
  // 6. Static states: the player opens on each, its statement is visible, and the measured receipt includes it; then the no-JavaScript view.
  const expected=Object.fromEntries(Object.entries(STATIC_SCENES).map(([id,position])=>{const project=files.demo.project,c=compileCues(project.document,project.plan.scenes.find(s=>s.id===id));return [id,seekInteractionState(c.interactions,c.cues,position)];}));
  for(const width of [1440,390]){
   const js=await page({viewport:viewport(width)},locale+' reading '+width);await ready(js,files.demo.url);
   const views={};for(const [id,position] of Object.entries(STATIC_SCENES)){const s=await snap(js,id);assert.equal(s.position,position,id);assert.deepEqual(s.state,expected[id],id);views[id]={position:s.position,statementVisible:await js.locator(`#${id} .static-state-note`).first().isVisible()};assert.equal(views[id].statementVisible,true,id);}
   const fit=await js.evaluate(()=>window.deckweftFit);assert.equal(fit.ok,true);assert.equal(fit.viewport.width,width);assert.equal(fit.states.length,Object.keys(STATIC_SCENES).length);
   if(width===1440){await capture(js.locator('#component-line'),`${locale}-focus-1440.png`);await js.locator('#component-line input[data-series="local"]').uncheck();await capture(js.locator('#component-line'),`${locale}-hide-1440.png`);}
   await js.context().close();
   const nojs=await page({viewport:viewport(width),javaScriptEnabled:false},locale+' nojs '+width);await nojs.goto(files.demo.url);
   const content=await nojs.evaluate(()=>{const text=id=>document.querySelector(`#${id} .static-state-note`)?.textContent||null;return {line:{statement:text('component-line'),legend:[...document.querySelectorAll('#component-line .chart .legend li')].map(n=>n.textContent),swatches:[...document.querySelectorAll('#component-line .chart .legend li svg.legend-key path')].map(n=>n.getAttribute('stroke'))},process:{statement:text('component-process'),targets:[...document.querySelectorAll('#component-process .semantic-step-target')].map(n=>n.dataset.objectId)},code:{statement:text('component-code'),lines:[...document.querySelectorAll('#component-code .semantic-step-target')].map(n=>n.dataset.line)},comparison:{statement:text('image-comparison'),wrapped:[...document.querySelectorAll('#image-comparison details[data-static-wrapper] > summary')].map(n=>n.textContent),openImages:[...document.querySelectorAll('#image-comparison .web-image')].filter(n=>!n.closest('details')).length},hotspots:{statement:text('violet'),markers:document.querySelectorAll('#violet .static-hotspot').length,open:document.querySelectorAll('#violet .static-hotspot[data-active]').length},horizontalPageScroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};});
   // Since S6 the frozen focus is its own sentence of the statement (S4 statement + S5 focus).
   assert.ok(content.line.statement.includes(zh?'重点：':'Focus: '));assert.equal(content.line.legend.length,2);assert.notEqual(content.line.swatches[0],content.line.swatches[1]);
   assert.equal(content.process.targets.length,3);assert.deepEqual(content.code.lines,['3']);assert.equal(content.comparison.wrapped.length,1);assert.equal(content.comparison.openImages,1);assert.equal(content.hotspots.markers,2);assert.equal(content.hotspots.open,1);assert.equal(content.horizontalPageScroll,false);
   for(const v of Object.values(content).filter(v=>typeof v==='object'))assert.ok(v.statement,JSON.stringify(v));
   const shots=width===1440?['component-line','component-process','image-comparison','violet']:['component-process','image-comparison','violet'];for(const id of shots)await capture(nojs.locator('#'+id),`${locale}-nojs-${id}-${width}.png`,{settled:false});
   log('staticViews',locale,{width,javascript:views,receipt:fit.states.map(s=>({sceneId:s.sceneId,position:s.position})),nojs:content});await nojs.context().close();
  }
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);report.ok=true;
}catch(error){report.ok=false;report.failure=String(error.stack||error);for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:path.join(out,'failure-'+report.captures.length+'.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await app.close();await rm(home,{recursive:true,force:true});}
console.log(JSON.stringify({ok:report.ok,keyboard:report.keyboard.map(k=>[k.locale,k.width,k.sceneId,k.presses,k.pageChanges]),captures:report.captures.map(c=>c.file)},null,1));
