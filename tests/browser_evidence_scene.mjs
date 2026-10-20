// S2 vertical sample: one illustrative evidence scene through the whole local pipeline in a real, isolated browser.
// CHROMIUM_PATH=/isolated/chrome-for-testing PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_evidence_scene.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {seekInteractionState} from '../src/motion/timeline.mjs';
import {compileCues} from '../src/motion/cues.mjs';
import {revealStudio,closeStudio} from './studio-controls.mjs';
import {evidenceProject,semanticView,declaredExportLevels} from './evidence-scene.mjs';
if(!process.env.CHROMIUM_PATH||!process.env.PLAYWRIGHT_MODULE)throw Error('Set CHROMIUM_PATH (isolated testing binary outside Applications) and PLAYWRIGHT_MODULE.');
const binary=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(binary)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),out=path.resolve(process.env.DECKWEFT_EVIDENCE_OUT||'dist/evidence-scene');await mkdir(out,{recursive:true});
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s2-evidence-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0});
const browser=await chromium.launch({executablePath:binary,headless:true}),hash=b=>createHash('sha256').update(b).digest('hex');
const report={step:'S4 rerun of the S2 vertical sample',browser:browser.version(),binary:'isolated Chrome for Testing outside /Applications; Playwright temporary profile per context',stages:[],captures:[],conflicts:[],errors:[],external:[]};
const stage=(locale,name,result)=>{report.stages.push({locale,stage:name,...result});console.log(locale,name,JSON.stringify(result).slice(0,240));};
// Counts every pending page timer so cancellation is measured, not assumed.
const timerProbe=()=>{const live=new Set(),st=setTimeout,ct=clearTimeout,si=setInterval,ci=clearInterval;window.setTimeout=function(fn,ms,...rest){const id=st.call(window,function(){live.delete(id);return typeof fn==='function'?fn.apply(this,arguments):undefined;},ms,...rest);live.add(id);return id;};window.clearTimeout=id=>{live.delete(id);return ct.call(window,id);};window.setInterval=function(fn,ms,...rest){const id=si.call(window,fn,ms,...rest);live.add(id);return id;};window.clearInterval=id=>{live.delete(id);return ci.call(window,id);};Object.defineProperty(window,'__dwPendingTimers',{get:()=>live.size});};
async function context(options={}){const c=await browser.newContext({deviceScaleFactor:1,...options});await c.addInitScript(timerProbe);await c.route('**/*',r=>{const url=r.request().url();if(url.startsWith(app.url+'/')||/^(data|blob|file):/.test(url))return r.continue();report.external.push(url);return r.abort();});return c;}
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>Promise.all(document.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));}
async function capture(target,name,{settled=true,...options}={}){const page=target.page?target.page():target;if(settled)await settle(page);const file=path.join(out,name);await target.screenshot({path:file,animations:'disabled',...options});report.captures.push({file:name,sha256:hash(await readFile(file))});}
async function ready(page,url){await page.goto(url);await page.waitForFunction(()=>['true','failed'].includes(document.body.dataset.ready));assert.equal(await page.evaluate(()=>document.body.dataset.ready),'true',await page.locator('#status').textContent());}
const snapshot=page=>page.evaluate(()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId==='evidence'));
const pageLabel=page=>page.locator('#page').textContent();
async function pending(page){await page.waitForTimeout(400);return page.evaluate(()=>({timers:window.__dwPendingTimers,scenes:window.deckweftInteractions.snapshot().map(s=>({sceneId:s.sceneId,playing:s.playing,...s.resources})),animations:document.getAnimations({subtree:true}).length}));}
/** Actual platform fonts Chromium used for each text role, read after document.fonts.ready. */
async function fonts(page){
 const status=await page.evaluate(async()=>{await document.fonts.ready;const scene=document.getElementById('evidence'),chart=scene.querySelector('.region[data-block-id="evidence-chart"]'),mark=(n,role)=>n?.setAttribute('data-font-probe',role);
  mark(document.querySelector('header h1'),'document-title');mark(scene.querySelector('.region[data-block-id="evidence-title"] h2'),'title');mark(scene.querySelector('.region[data-block-id="evidence-takeaway"] p'),'takeaway');mark(scene.querySelector('.region[data-block-id="evidence-caption"] p'),'caption');mark(chart.querySelector('figcaption'),'chart-caption');mark(chart.querySelector('.chart-value'),'value-label');mark(chart.querySelector('.chart-row-label [data-conclusion-label]'),'category-label');mark(chart.querySelector('.legend li'),'legend');mark(scene.querySelector('.citation a'),'source');
  return {status:document.fonts.status,faces:document.fonts.size,fit:window.deckweftFit.checks.find(c=>c.sceneId==='evidence').fonts.map(f=>({family:f.family,loaded:f.loaded,probeWidth:Math.round(f.probeWidth*10)/10}))};});
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument',{depth:-1}),used={};
 for(const role of ['document-title','title','takeaway','caption','chart-caption','category-label','value-label','legend','source']){const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:`[data-font-probe="${role}"]`});used[role]=nodeId?(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts.map(f=>`${f.familyName} (${f.glyphCount})`):null;}
 await cdp.detach();return {...status,platform:used};
}
/** The static-state content rule: each fact is visible text without hover; a fact only inside an SVG <title> or a horizontal scroller counts as pointer-dependent. */
async function staticContent(page){
 return page.evaluate(()=>{
  const scene=document.getElementById('evidence'),vw=document.documentElement.clientWidth,region=id=>scene.querySelector(`.region[data-block-id="${id}"]`);
  const visible=n=>{if(!n)return false;const r=n.getBoundingClientRect(),s=getComputedStyle(n);if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')return false;if(n.closest('details:not([open])')&&!n.closest('summary'))return false;for(let p=n.parentElement;p&&p!==document.body;p=p.parentElement){const ps=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(ps.overflowX)){const pr=p.getBoundingClientRect();if(r.left<pr.left-1||r.right>pr.right+1)return false;}}return r.left>=-1&&r.right<=vw+1;};
  const chart=region('evidence-chart'),rows=chart.querySelector('.chart-current-view .chart-rows,.chart .chart-rows'),note=chart.querySelector('.static-state-note'),noteText=visible(note)?note.textContent:'';
  const marks=[...rows.querySelectorAll('.chart-row')].map(row=>{const value=row.querySelector('.chart-value'),label=row.querySelector('.chart-row-label [data-conclusion-label]'),category=label.textContent;return {objectId:row.dataset.categoryId,category,value:value.textContent,focus:row.dataset.focus??null,categoryVisible:visible(label),valueVisible:visible(value),valueRight:Math.round(value.getBoundingClientRect().right),inStaticNote:noteText.includes(category+' '+value.textContent)};});
  const scroller=rows.closest('.chart-plot');
  return {width:vw,title:visible(region('evidence-title').querySelector('h2')),chart:visible(rows),question:visible(chart.querySelector('.chart-question')),chartTakeaway:visible(chart.querySelector('.chart-takeaway')),definition:visible(chart.querySelector('.chart-definition'))?chart.querySelector('.chart-definition').textContent:null,size:(b=>[Math.round(b.width),Math.round(b.height)])(rows.getBoundingClientRect()),takeaway:visible(region('evidence-takeaway').querySelector('p')),caption:visible(region('evidence-caption').querySelector('p')),chartCaption:visible(chart.querySelector('figcaption')),legend:[...chart.querySelectorAll('.legend li')].filter(visible).map(li=>li.textContent),source:visible(region('evidence-source').querySelector('a')),staticNote:noteText,marks,bars:rows.querySelectorAll('.chart-mark rect').length,scroller:scroller?{scrollWidth:scroller.scrollWidth,clientWidth:scroller.clientWidth}:null,pointerOnly:marks.filter(m=>!(m.categoryVisible&&m.valueVisible)&&!m.inStaticNote).map(m=>m.category),horizontalPageScroll:document.documentElement.scrollWidth>vw+1};
 });
}

try{
 for(const locale of ['en','zh-CN']){
  const zh=locale==='zh-CN',source=await evidenceProject(locale),studioContext=await context({viewport:{width:1600,height:1100},acceptDownloads:true}),studio=await studioContext.newPage();studio.setDefaultTimeout(20000);studio.on('pageerror',e=>report.errors.push(locale+' studio: '+e.message));
  // Single entry step 3: the canvas says when the preview of these exact edits is measured; autosave and ⌘/Ctrl S replace Save.
  const measured=()=>studio.waitForFunction(()=>{const c=document.querySelector('#canvas');return !document.querySelector('#exportHTML').disabled&&c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale');});
  const save=async()=>{await studio.keyboard.press('Control+s');await studio.waitForFunction(()=>document.querySelector('#saveState').dataset.state==='saved');await measured();};
  // 1. Import data: the visual JSON envelope through the Studio file import (validated and copied to a new local id).
  const projectFile=path.join(out,locale+'-import.visual.json');await writeFile(projectFile,JSON.stringify(source,null,2)+'\n');
  const token=(await(await fetch(app.url+'/api/session')).json()).token,anchor=(await(await fetch(app.url+'/api/visual/demo',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({locale})})).json()).project; // one address: a visual deck must be open for the visual kind's drawer
  await studio.goto(app.url+'/?project='+anchor.id+'&ui='+locale);await studio.waitForSelector('#root.workspace',{state:'attached'});await studio.waitForFunction(()=>document.querySelector('#uiLanguage'));await revealStudio(studio,'library');
  await studio.locator('#projectFile').setInputFiles(projectFile);await studio.waitForFunction(title=>document.querySelector('#deckTitle').value===title,source.document.title);await closeStudio(studio);await measured();
  
  const id=await studio.locator('#projectPicker').inputValue(),imported=await store.get(id);
  assert.notEqual(id,source.id);assert.deepEqual(imported.document.blocks,source.document.blocks);assert.deepEqual(imported.document.datasets,source.document.datasets);assert.deepEqual(imported.plan.scenes,source.plan.scenes);assert.equal(imported.extensions.deckweftImport.sourceId,source.id);
  stage(locale,'import data',{route:'Studio #projectFile → POST /api/visual/import',projectId:id,blocks:imported.document.blocks.length,datasets:imported.document.datasets.map(d=>({id:d.id,synthetic:d.synthetic,categories:d.categories.length,unit:d.unit})),contentStatus:imported.plan.scenes[0].contentStatus,valuesUnchanged:true});
  // 2. Choose theme: two existing packs through the Studio theme control; the semantic document must not move.
  await revealStudio(studio,'edit');const before=semanticView(imported),themes={};
  for(const theme of ['cream-collage','dark-data']){
   await revealStudio(studio,'compositions');await studio.locator(`[data-zone=look] [data-theme="${theme}"]`).click();await measured();await save();
   const saved=await store.get(id),scene=saved.plan.scenes[0];assert.deepEqual(semanticView(saved),before);assert.equal(scene.theme,theme);
   const artifact=await studio.locator('#preview').getAttribute('src'),view=await (await context({viewport:{width:1440,height:1000}})).newPage();view.on('pageerror',e=>report.errors.push(locale+' preview: '+e.message));
   await ready(view,app.url+artifact.split('#')[0]);await capture(view.locator('#evidence'),`${locale}-theme-${theme}-1440.png`);
   themes[theme]={composition:scene.composition,colorMode:scene.colorMode??null,fit:await view.evaluate(()=>window.deckweftFit.ok),fonts:await fonts(view)};await view.context().close();
  }
  stage(locale,'choose theme',{semanticDocumentEqual:true,themes:Object.fromEntries(Object.entries(themes).map(([k,v])=>[k,{composition:v.composition,colorMode:v.colorMode,fit:v.fit}]))});
  // 3. Fonts after document.fonts.ready, per theme: declared stacks, the gate's loaded flag, and the platform font Chromium actually drew.
  stage(locale,'measure fonts',{themes:Object.fromEntries(Object.entries(themes).map(([k,v])=>[k,v.fonts]))});
  // 4–5. Legend focus by mouse and keyboard, pause and seek, rapid navigation: on the measured preview in presentation view.
  const artifact=(await studio.locator('#preview').getAttribute('src')).split('#')[0],present=await (await context({viewport:{width:1440,height:1000}})).newPage();present.on('pageerror',e=>report.errors.push(locale+' present: '+e.message));
  await ready(present,app.url+artifact+'#scene=evidence');assert.equal(await pageLabel(present),'1 / 2');
  const specs=compileCues(source.document,source.plan.scenes[0]),focus=[];
  // Layered focus rule (S6): a single-series chart offers no series focus or show/hide controls; its emphasis is the declared category focus.
  focus.push({input:'series controls on a single-series chart',page:await pageLabel(present),state:(await snapshot(present)).state[0],hidden:await present.locator('#evidence .chart-series-switch').isHidden()&&await present.locator('#evidence .chart-series-visibility').isHidden()});
  await present.locator('#evidence select[data-range="toId"]').selectOption('data-first');
  focus.push({input:'pointer selection of the To category',page:await pageLabel(present),state:(await snapshot(present)).state[0],bars:await present.locator('#evidence .chart-current-view .chart-mark rect').count()});
  await present.locator('#evidence select[data-range="toId"]').focus();await present.keyboard.press('ArrowDown');await present.keyboard.press('ArrowRight');await present.keyboard.press('ArrowLeft');
  focus.push({input:'keyboard ArrowDown/ArrowRight/ArrowLeft on the To category',page:await pageLabel(present),state:(await snapshot(present)).state[0],bars:await present.locator('#evidence .chart-current-view .chart-mark rect').count()});
  await present.locator('#evidence select[data-range="fromId"]').focus();await present.keyboard.press('Enter');await present.keyboard.press('Tab');await present.keyboard.press('ArrowRight');
  focus.push({input:'keyboard Enter/Tab/ArrowRight on the range controls',page:await pageLabel(present),state:(await snapshot(present)).state[0],focused:await present.evaluate(()=>document.activeElement.textContent)});
  assert.ok(focus.every(f=>f.page==='1 / 2'),'keyboard and pointer focus changes never advance the page');assert.deepEqual(focus[1].state.toId,'data-first');assert.equal(focus[1].bars,3);assert.equal(focus[2].state.toId,'template');
  // S4 draws the declared category focus; with no series controls the reader's focus stays empty, so the declared focus is what both views draw.
  assert.equal(focus[0].hidden,true);assert.equal(focus[0].state.focusSeriesId,null);const focusRows=await present.locator('#evidence .chart-current-view .chart-row').evaluateAll(rows=>rows.map(r=>r.dataset.focus));assert.deepEqual(focusRows,['true',...Array(focusRows.length-1).fill('false')]);report.conflicts.push({id:'C1',observed:'Fixed in S6 (layered rule): the declared category focus (Claim first) is drawn in both views; a single-series chart offers no series controls',locale});
  stage(locale,'switch legend focus',{focus});
  const timeline=present.locator('#evidence .semantic-timeline'),replay=timeline.locator('button').nth(0),pause=timeline.locator('[data-cue-pause]'),seek=timeline.locator('[data-cue-position]');
  await replay.click();const playing=await snapshot(present);assert.equal(playing.playing,true);assert.equal(playing.resources.timers,1);
  await present.waitForFunction(()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId==='evidence').position===1,null,{timeout:3000});await pause.click();const paused=await snapshot(present);
  assert.equal(paused.playing,false);assert.equal(paused.position,1);assert.equal(paused.resources.timers,0);
  await seek.focus();await present.keyboard.press('ArrowRight');const sought=await snapshot(present);assert.equal(sought.position,2);assert.deepEqual(sought.state,seekInteractionState(specs.interactions,specs.cues,2));assert.equal(await pageLabel(present),'1 / 2');
  await present.keyboard.press('Home');assert.equal((await snapshot(present)).position,0);
  // Rapid next/previous while a cue timer is pending: every scene-owned timer and animation must be cancelled.
  await replay.click();for(let i=0;i<6;i++){await present.locator('#next').click();await present.locator('#previous').click();}
  await replay.click();await timeline.locator('[data-cue-next]').click();await seek.focus();await present.keyboard.press('ArrowLeft');await present.keyboard.press('ArrowLeft');await replay.click();await present.locator('#next').click();
  const left=await pending(present);assert.equal(left.timers,0,JSON.stringify(left));assert.ok(left.scenes.every(s=>!s.playing&&s.timers===0&&s.animations===0&&s.registered===0));assert.equal(left.animations,0);assert.equal(await pageLabel(present),'2 / 2');
  stage(locale,'pause and seek',{playingTimers:playing.resources.timers,paused:{position:paused.position,timers:paused.resources.timers},seekPosition:sought.position,rapidNavigation:left});
  await present.context().close();
  // 6. Freeze the author's static state in Studio, beside "Use current chart / step as opening"; cue and motion locks refuse it.
  // The still-picture choice sits behind "Let this page move", which is on for a page that already has interactions.
  await revealStudio(studio,'compositions');assert.equal(await studio.locator('#motionSwitch').getAttribute('aria-checked'),'true');await studio.locator('#motionControls').waitFor({state:'visible'});
  assert.deepEqual(await studio.locator('#staticState option').evaluateAll(o=>o.map(n=>n.value)),['','opening','structure-first','complete']);
  await studio.locator('#keepPage').click();await studio.waitForFunction(()=>document.querySelector('#staticState').disabled&&document.querySelector('#keepPage').getAttribute('aria-pressed')==='true');await save();
  const refused=await studio.evaluate(async id=>{const token=(await(await fetch('/api/session')).json()).token,headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},{project}=await(await fetch('/api/visual/projects/'+id,{headers})).json();project.plan.scenes[0].staticState={keyStateId:'structure-first'};const r=await fetch('/api/visual/projects/'+id,{method:'PUT',headers,body:JSON.stringify({project,expectedRevision:project.revision.number})});return {status:r.status,code:(await r.json()).error?.code};},id);
  assert.deepEqual(refused,{status:409,code:'AUTHOR_LOCK'});
  await studio.locator('#keepPage').click();await studio.waitForFunction(()=>!document.querySelector('#staticState').disabled);
  await studio.locator('#staticState').selectOption('structure-first');await measured();await save();
  const frozen=await store.get(id);assert.deepEqual(frozen.plan.scenes[0].staticState,{keyStateId:'structure-first'});assert.deepEqual(frozen.document.authorOverrides.sceneLocks??[],[]);
  for(const key of ['title','blocks','datasets','sources','rules'])assert.deepEqual(frozen.document[key],imported.document[key],key);
  await studio.locator('#staticState').scrollIntoViewIfNeeded();await capture(studio,`${locale}-studio-static-state.png`,{fullPage:true});
  stage(locale,'freeze static state',{picker:'#staticState',chosen:'structure-first',position:1,lockedPickerDisabled:true,lockedServerSave:refused,saved:frozen.plan.scenes[0].staticState});
  // 7. Export HTML through the existing review gate: measured preview ticket → /measure → /export.
  const download=studio.waitForEvent('download');await revealStudio(studio,'file');await studio.locator('#exportHTML').click();const file=path.join(out,locale+'-export.html');await (await download).saveAs(file);
  const exported=await readFile(file,'utf8'),preview=await (await fetch(app.url+(await studio.locator('#preview').getAttribute('src')).split('#')[0])).text();
  assert.equal(exported,preview,'the download is the measured preview');assert.ok(exported.includes('createCueClock'));assert.ok(exported.includes('"staticState":{"keyStateId":"structure-first","position":1,"reducedMotion":"static"}'));
  stage(locale,'export html',{gate:'preview ticket measured in this browser, POST /api/visual/export',bytes:Buffer.byteLength(exported),sha256:hash(exported),renderHash:exported.match(/deckweft-render-hash" content="([^"]+)"/)[1]});
  // 8. The exported file: reading, presentation, no-JavaScript and reduced-motion views at 1440 and 390 px.
  const url=pathToFileURL(file).href,views={};
  for(const width of [1440,390]){
   const reading=await (await context({viewport:{width,height:width===390?844:1000}})).newPage();reading.on('pageerror',e=>report.errors.push(locale+' reading: '+e.message));await ready(reading,url);
   const start=await snapshot(reading);assert.equal(start.position,1);assert.deepEqual(start.state,seekInteractionState(specs.interactions,specs.cues,1));assert.deepEqual([start.state[0].seriesIds,start.state[0].fromId,start.state[0].toId],[['reduction'],'claim-first','data-first']);
   views[`reading-${width}`]={position:start.position,fit:await reading.evaluate(()=>window.deckweftFit.ok),content:await staticContent(reading)};assert.equal(views[`reading-${width}`].fit,true);
   await capture(reading,`${locale}-reading-${width}.png`,{fullPage:true});await reading.context().close();
   const presentation=await (await context({viewport:{width,height:width===390?844:1000}})).newPage();presentation.on('pageerror',e=>report.errors.push(locale+' presentation: '+e.message));await ready(presentation,url+'#scene=evidence');
   assert.equal((await snapshot(presentation)).position,1);await capture(presentation,`${locale}-present-${width}.png`);
   await presentation.locator('#evidence .semantic-timeline button').nth(0).click();const replayed=await snapshot(presentation);assert.equal(replayed.position,0);
   await presentation.waitForFunction(()=>{const s=window.deckweftInteractions.snapshot().find(s=>s.sceneId==='evidence');return s.position===2&&!s.playing;},null,{timeout:4000});
   views[`present-${width}`]={startPosition:1,replayStart:replayed.position,replayEnd:2,pending:await pending(presentation)};assert.equal(views[`present-${width}`].pending.timers,0);await presentation.context().close();
   const noJS=await (await context({viewport:{width,height:width===390?844:1000},javaScriptEnabled:false})).newPage();await noJS.goto(url);
   views[`nojs-${width}`]={content:await staticContent(noJS)};const content=views[`nojs-${width}`].content;
   assert.ok(content.title&&content.chart&&content.takeaway&&content.caption&&content.chartCaption&&content.source,JSON.stringify(content));assert.equal(content.bars,3);assert.deepEqual(content.legend.length,2);assert.deepEqual(content.pointerOnly,[]);assert.equal(content.horizontalPageScroll,false);
   await capture(noJS,`${locale}-nojs-${width}.png`,{fullPage:true,settled:false});await noJS.context().close();
  }
  // C2 fixed in S4: every category and value label is visible text beside its bar, with no scroller, at 1440 and 390 px, with and without JavaScript.
  for(const view of ['reading-1440','reading-390','nojs-1440','nojs-390']){const c=views[view].content;assert.deepEqual(c.pointerOnly,[],view);assert.equal(c.scroller,null,view);assert.deepEqual(c.marks.filter(m=>!m.valueVisible||!m.categoryVisible).map(m=>m.category),[],view);assert.ok(c.question&&c.chartTakeaway&&c.definition,view);}
  // C19 fixed in S4: both views draw the frozen chart at the same size (390 px differs only by the scene padding rule keyed on has-interactions).
  assert.deepEqual(views['reading-1440'].content.size,views['nojs-1440'].content.size);assert.equal(views['reading-390'].content.size[1],views['nojs-390'].content.size[1]);
  // The gate check: restoring the old 600 px plot scroller must fail the fit audit with a conclusion-label issue.
  const gate=await (await context({viewport:{width:390,height:844}})).newPage();await ready(gate,url);
  const audit=await gate.evaluate(()=>{const style=document.createElement('style');style.textContent='.chart-rows{min-width:600px}.region[data-block-id="evidence-chart"] .chart-current-view{overflow-x:auto}';document.head.append(style);const r=window.deckweftAuditScene(document.getElementById('evidence'));style.remove();return {broken:r.clipIssues.filter(i=>i.element==='conclusion label').map(i=>i.reason),restored:window.deckweftAuditScene(document.getElementById('evidence')).clipIssues.length};});
  assert.ok(audit.broken.includes('Conclusion label is clipped or only reachable by scrolling'),JSON.stringify(audit));assert.equal(audit.restored,0);await gate.context().close();
  stage(locale,'conclusion-label gate',{width:390,injected:'.chart-rows{min-width:600px} inside an overflow-x:auto view',issues:audit.broken.length,reasons:[...new Set(audit.broken)],afterRemoval:audit.restored});
  // Reduced motion: the static fallback is shown and cues do not play, from the OS setting or the page control.
  const reduced=await (await context({viewport:{width:1440,height:1000},reducedMotion:'reduce'})).newPage();reduced.on('pageerror',e=>report.errors.push(locale+' reduced: '+e.message));await ready(reduced,url+'#scene=evidence');
  const replayButton=reduced.locator('#evidence .semantic-timeline button').nth(0);assert.equal(await replayButton.isDisabled(),true);assert.equal(await reduced.locator('#evidence [data-static-fallback]').isVisible(),true);
  await reduced.evaluate(()=>window.deckweftInteractions.play('evidence'));const still=await snapshot(reduced);assert.equal(still.position,1);assert.equal(still.playing,false);
  await capture(reduced,`${locale}-reduced-1440.png`);const reducedPending=await pending(reduced);assert.equal(reducedPending.timers,0);await reduced.context().close();
  const toggled=await (await context({viewport:{width:1440,height:1000}})).newPage();await ready(toggled,url+'#scene=evidence');await toggled.locator('#evidence .semantic-timeline button').nth(0).click();assert.equal((await snapshot(toggled)).playing,true);
  await toggled.locator('#semantic-motion').click();const user=await snapshot(toggled);assert.equal(user.playing,false);assert.equal(user.position,1);assert.equal(await toggled.locator('#evidence .semantic-timeline button').nth(0).isDisabled(),true);
  await toggled.locator('#semantic-motion').click();assert.equal(await toggled.locator('#evidence .semantic-timeline button').nth(0).isDisabled(),false);const toggledPending=await pending(toggled);await toggled.context().close();
  stage(locale,'static state and reduced motion',{views,reducedMotion:{system:{position:still.position,playing:still.playing,replayDisabled:true,pending:reducedPending},userControl:{position:user.position,playing:user.playing,pending:toggledPending}}});
  // 9. Declared PPTX / PDF level per component; no export code is added.
  const levels=declaredExportLevels(frozen.document,frozen.plan);stage(locale,'declared pptx/pdf levels',levels);
  await studioContext.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);report.ok=true;
}catch(error){report.ok=false;report.failure=String(error.stack||error);for(const page of browser.contexts().flatMap(c=>c.pages()))await page.screenshot({path:path.join(out,'failure-'+report.captures.length+'.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await app.close();await rm(home,{recursive:true,force:true});}
console.log(JSON.stringify({ok:report.ok,stages:report.stages.length,captures:report.captures.map(c=>c.file),conflicts:report.conflicts},null,2));
