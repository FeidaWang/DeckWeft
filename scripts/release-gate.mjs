// VIS-014 release gate (S6). Optional local browser QA: Playwright and an isolated browser are supplied separately.
// It builds the frozen gallery and the 8-page stories, runs the VIS-010 quality pipeline on every deck, the explicit failure
// cases, the VIS-001 legacy comparison and the exported package outside the repository. It never certifies a deck: the
// captures still need an actual image review, and host runs are recorded separately (npm run host:visual).
import path from 'node:path';
import os from 'node:os';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {cp,mkdir,mkdtemp,readFile,readdir,realpath,rm,unlink,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {LOCALES,THEMES,releaseProject} from '../tests/release-gate.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {inspectRenderedPage,checkRender} from '../src/quality/render-checks.mjs';
import {migrateToPresentation} from '../src/core/adapters/legacy-project.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {families,inferFamily} from '../src/design/compositions.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},steps:{type:'string',default:'build,quality,cases,legacy,standalone'},engines:{type:'string',default:'firefox,webkit'},help:{type:'boolean'}}});
if(args.help){console.log('Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/abs/playwright/index.mjs [FIREFOX_PATH=… WEBKIT_PATH=…] node scripts/release-gate.mjs [--out dist/visual-acceptance] [--steps build,quality,cases,legacy,standalone] [--engines firefox,webkit]\nThen view the captures and record the review. Hosts run separately with npm run host:visual.');process.exit(0);}
const out=path.resolve(args.out||path.join(root,'dist/visual-acceptance')),home=path.join(out,'home'),projects=path.join(out,'projects'),steps=new Set(args.steps.split(','));
const hash=b=>createHash('sha256').update(b).digest('hex');
const DECKS=LOCALES.flatMap(locale=>[{name:`gallery-${locale}`,kind:'gallery',locale},...THEMES.map(theme=>({name:`story-${theme}-${locale}`,kind:'story',locale,theme}))]);
const gate={format:'deckweft-vis-014-gate',version:1,renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,node:process.version,steps:{}};
const report=async(name,data)=>{gate.steps[name]=data;await writeFile(path.join(out,name+'.json'),JSON.stringify(data,null,2)+'\n');};
const load=async name=>JSON.parse(await readFile(path.join(projects,name+'.json'),'utf8'));
const html=async p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:await visualAssetResources(p,home)});
await mkdir(projects,{recursive:true});

// 1. Build: the frozen projects, their exported size and render identity.
if(steps.has('build')){
 const decks=[];
 for(const d of DECKS){const p=await releaseProject(d.kind,d.locale,home,d.theme);await writeFile(path.join(projects,d.name+'.json'),JSON.stringify(p,null,1));const o=await html(p);decks.push({...d,scenes:p.plan.scenes.length,renderHash:o.renderHash,htmlBytes:Buffer.byteLength(o.body),images:p.document.blocks.filter(b=>b.type==='image').length});}
 await report('build',{decks});
}

// The browser steps share one isolated binary and a loopback-free file:// load with every non-file request refused and logged.
let chromium,executablePath,playwright;
async function browser(){
 if(chromium)return chromium;
 if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated test browser outside /Applications.');
 executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser bundles are read-only.');
 const module=process.env.PLAYWRIGHT_MODULE||'playwright';playwright=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
 chromium=await playwright.chromium.launch({executablePath,headless:true});return chromium;
}
async function open(file,{width=1440,js=true,reducedMotion='reduce',init,blocked}={}){
 const context=await (await browser()).newContext({viewport:{width,height:1000},deviceScaleFactor:1,javaScriptEnabled:js,reducedMotion});
 const external=blocked||[],errors=[];await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('file:')||url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
 if(init)await context.addInitScript(init);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(pathToFileURL(file).href);
 // Without JavaScript only the load event is available.
 if(!js){await page.waitForLoadState('load');return {page,context,errors,external};}
 await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>null))]));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 return {page,context,errors,external};
}
const sceneIssues=(project,observation,sceneId)=>checkRender(project,[observation]).issues.filter(i=>i.sceneId===sceneId);
const observe=page=>page.evaluate(inspectRenderedPage);
const shot=async(page,file,locator)=>{await (locator?page.locator(locator):page).screenshot({path:file,animations:'disabled',...(locator?{}:{fullPage:true})});return {file:path.relative(out,file),sha256:hash(await readFile(file))};};

// 2. Quality: the VIS-010 pipeline on every deck (measurement, bounded repair, three-width traces, captures, receipt).
if(steps.has('quality')){
 const decks=[];
 for(const d of DECKS){
  const dir=path.join(out,'runs',d.name);await rm(dir,{recursive:true,force:true});
  const run=spawnSync(process.execPath,[path.join(root,'scripts/visual-verify.mjs'),'--project',path.join(projects,d.name+'.json'),'--home',home,'--out',dir],{encoding:'utf8',env:process.env});
  const r=JSON.parse(await readFile(path.join(dir,'report.json'),'utf8')),c=r.cases[0];
  decks.push({deck:d.name,status:r.status,machineOk:!!r.machineOk,exit:run.status,browser:r.browser,issues:c?c.receipt.checks.issues.map(i=>({kind:i.kind,sceneId:i.sceneId,reason:i.reason})):[],traces:c?c.observation.traces.map(t=>({sceneId:t.sceneId,action:t.action,ok:t.ok})):[],repair:c?.repair?.spent||null,receipt:c?.receipt.id||null,captures:c?c.receipt.captures.filter(x=>x.reviewRequired).map(x=>x.file):[],errors:r.errors,externalRequests:r.externalRequests});
 }
 await report('quality',{decks,ok:decks.every(d=>d.machineOk)});
}

// 3. Explicit cases: each records page, state, host, reproduction, observed result and fix (or the open item).
if(steps.has('cases')){
 const dir=path.join(out,'cases');await mkdir(dir,{recursive:true});const cases=[];
 const write=async(name,p)=>{const file=path.join(dir,name+'.html');await writeFile(file,(await html(p)).body);return file;};
 const record=c=>{cases.push({host:'local isolated Chromium (file://)',...c});console.log(c.id,c.passed?'pass':'FAIL',c.observed);};
 // Long title: the cover's long bilingual title at three widths.
 for(const locale of LOCALES){
  const p=await load('gallery-'+locale),file=await write('long-title-'+locale,p),widths={};
  for(const width of [1440,1024,390]){const {page,context}=await open(file,{width});widths[width]=sceneIssues(p,await observe(page),'cc-cover').map(i=>i.kind+': '+i.reason);if(width===390)await shot(page,path.join(dir,`long-title-${locale}-390.png`),'#cc-cover');await context.close();}
  record({id:'long-title',locale,page:'gallery 1 · cc-cover',state:'opening',reproduction:'Open the gallery at 1440, 1024 and 390 px.',observed:widths,passed:Object.values(widths).every(v=>!v.length),fix:'Cover citation and metric fixes in ee20343.'});
 }
 // Overlong legend: series names of about 90 characters on the chart-and-image page.
 for(const locale of LOCALES){
  const p=await load('gallery-'+locale),d=p.document.datasets.find(d=>d.id==='unit-search'),long=locale==='en'?[' who read the internationalization review on a phone during the release week (synthetic)',' who read the same review on a desktop monitor during the release week (synthetic)']:['在发布周用手机阅读国际化审阅稿的读者，名称特意写得很长以测试图例换行（合成）','在发布周用桌面显示器阅读同一份审阅稿的读者，名称同样很长（合成）'];
  d.series.forEach((s,j)=>{s.label=(locale==='en'?s.label:'')+long[j];});const file=await write('overlong-legend-'+locale,p),widths={};
  for(const width of [1440,390]){const {page,context}=await open(file,{width});widths[width]=sceneIssues(p,await observe(page),'ev-evidence').map(i=>i.kind+': '+i.reason);await shot(page,path.join(dir,`overlong-legend-${locale}-${width}.png`),'#ev-evidence');await context.close();}
  record({id:'overlong-legend',locale,page:'gallery 8 · ev-evidence',state:'opening',reproduction:'Replace both series labels of the grouped bar with ~90-character names; open at 1440 and 390 px.',observed:widths,passed:Object.values(widths).every(v=>!v.length),fix:Object.values(widths).every(v=>!v.length)?'None needed: legend and row labels wrap.':'Open'});
 }
 // Missing glyph: a private-use character no installed font draws.
 {
  const p=await load('story-cream-collage-en'),title=p.document.blocks.find(b=>b.id==='open-title');title.text+=' ';const file=await write('missing-glyph',p);
  const {page,context}=await open(file);const issues=sceneIssues(p,await observe(page),'st-open').map(i=>i.kind+': '+i.reason);
  const session=await context.newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');const doc=await session.send('DOM.getDocument'),node=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#st-open h2'}),fonts=(await session.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts;
  await shot(page,path.join(dir,'missing-glyph.png'),'#st-open');await context.close();
  const fallback=fonts.filter(f=>/LastResort/i.test(f.familyName)||/LastResort/i.test(f.postScriptName||''));
  record({id:'missing-glyph',locale:'en',page:'story 1 · st-open (cream-collage)',state:'opening',reproduction:'Append U+E000 to the cover title; open at 1440 px; read Chromium platform fonts for the heading.',observed:{renderChecks:issues,platformFonts:fonts,lastResortGlyphs:fallback.reduce((n,f)=>n+f.glyphCount,0)},passed:fallback.length>0&&issues.length===0,detectedBy:fallback.length?'CDP platform-font probe (this gate)':'not detected',fix:'Open: the fit audit and the Studio gate do not report missing glyphs (C13); only this probe does.'});
 }
 // No-image asset: the generated starfield file is removed from the asset home before export.
 {
  const temporary=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-gate-noimage-')));
  try{
   await cp(home,temporary,{recursive:true});const p=await load('gallery-en'),asset=p.assets.find(a=>a.path.includes(p.assets.find(a=>a.alt.startsWith('Generated starfield')).hash));await unlink(path.join(temporary,asset.path));
   let observed,passed;
   try{const o=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:await visualAssetResources(p,temporary)}),file=path.join(dir,'no-image.html');await writeFile(file,o.body);
    const {page,context}=await open(file),issues=sceneIssues(p,await observe(page),'ev-photo');const text=await page.locator('#ev-photo').innerText();await shot(page,path.join(dir,'no-image.png'),'#ev-photo');await context.close();
    observed={export:'succeeded',issues:issues.map(i=>i.kind+': '+i.reason),fallbackVisible:text.includes(asset.fallback)||text.includes(asset.alt)};passed=issues.some(i=>i.kind==='missing-asset')||observed.fallbackVisible;
   }catch(error){observed={export:'refused',code:error.code,message:error.message,details:error.details};passed=(error.details||[]).some(d=>d.code==='ASSET_UNRESOLVED'&&d.blockId==='photo-image');}
   record({id:'no-image-asset',locale:'en',page:'gallery 5 · ev-photo',state:'opening',reproduction:'Delete the starfield PNG from a copy of the asset home, then export and open the gallery.',observed,passed,fix:passed?'None needed: the failure is named, not hidden.':'Open'});
  }finally{await rm(temporary,{recursive:true,force:true});}
 }
 // Missing data: the 390 px series has one value not collected.
 {
  const p=await load('gallery-en'),file=await write('missing-data',p),{page,context}=await open(file,{width:390});
  const observed=await page.evaluate(()=>{const s=document.querySelector('#dd-trend'),lines=[...s.querySelectorAll('.chart-plot polyline')].length,notes=[...s.querySelectorAll('.chart-notes li')].map(li=>li.textContent);const note=notes.find(t=>/not collected/.test(t));const r=[...s.querySelectorAll('.chart-notes li')].find(li=>/not collected/.test(li.textContent))?.getBoundingClientRect();return {polylines:lines,note,noteVisible:!!r&&r.width>0&&r.height>0,cell:[...s.querySelectorAll('tbody td')].map(td=>td.textContent).filter(t=>/Missing/.test(t))};});
  await shot(page,path.join(dir,'missing-data-390.png'),'#dd-trend');await context.close();
  record({id:'missing-data',locale:'en',page:'gallery 9 · dd-trend',state:'opening',reproduction:'Open the trend page at 390 px; the 390 px series has no value at 11:00.',observed,passed:observed.polylines===4&&observed.noteVisible&&observed.cell.length>=1,fix:'None needed: drawn as a gap, named in a visible note and the table; never zero.'});
 }
 // Reload: audience exploration never persists.
 {
  const p=await load('story-dark-data-en'),file=await write('reload',p),{page,context}=await open(file);
  const snap=()=>page.evaluate(()=>window.deckweftInteractions.snapshot().map(s=>({sceneId:s.sceneId,position:s.position,state:s.state})));const before=await snap();
  await page.locator('#st-evidence [data-range="fromId"]').selectOption('evidence');await page.locator('#st-process [data-step-id="e2"]').click();await page.locator('#st-pair [data-tab-id="second"]').click();const explored=await snap();
  await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');const after=await snap(),storage=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));await context.close();
  record({id:'reload',locale:'en',page:'story 3, 5, 6 (dark-data)',state:'explored → reload',reproduction:'Change the chart range, select step 2 and the second image, then reload.',observed:{changed:JSON.stringify(explored)!==JSON.stringify(before),restored:JSON.stringify(after)===JSON.stringify(before),storage},passed:JSON.stringify(explored)!==JSON.stringify(before)&&JSON.stringify(after)===JSON.stringify(before)&&storage.local===0,fix:'None needed: the authored opening returns; nothing is stored.'});
 }
 // Rapid paging and pause/resume: one clock, no leftover timers or animations.
 const timerProbe=()=>{const live=new Set(),st=setTimeout,ct=clearTimeout;window.setTimeout=function(fn,ms,...rest){const id=st.call(window,function(){live.delete(id);return typeof fn==='function'?fn.apply(this,arguments):undefined;},ms,...rest);live.add(id);return id;};window.clearTimeout=id=>{live.delete(id);return ct.call(window,id);};Object.defineProperty(window,'__dwPendingTimers',{get:()=>live.size});};
 {
  const p=await load('story-dark-data-en'),file=await write('rapid-paging',p),{page,context}=await open(file,{reducedMotion:'no-preference',init:timerProbe});
  await page.evaluate(()=>{location.hash='scene=st-evidence';});await page.waitForFunction(()=>document.getElementById('st-evidence').classList.contains('active'));await page.locator('#st-evidence [data-cue-replay]').click();
  const flip=id=>page.evaluate(id=>document.getElementById(id).click(),id);for(let i=0;i<10;i++){await flip('next');await flip('next');await flip('previous');}for(let i=0;i<12;i++)await flip('previous');
  await page.waitForTimeout(500);const observed=await page.evaluate(()=>({page:document.getElementById('page').textContent,timers:window.__dwPendingTimers,animations:document.getAnimations({subtree:true}).length,busy:window.deckweftInteractions.snapshot().filter(s=>s.playing||s.resources.timers||s.resources.animations).map(s=>s.sceneId)}));await context.close();
  record({id:'rapid-paging',locale:'en',page:'story (dark-data), from page 3',state:'replaying',reproduction:'Replay page 3, then press Next/Next/Previous ten times and Previous twelve times without waiting.',observed,passed:observed.page==='1 / 8'&&observed.timers===0&&observed.animations===0&&!observed.busy.length,fix:'None needed.'});
 }
 {
  const p=await load('story-dark-data-en'),file=await write('pause-resume',p),{page,context}=await open(file,{reducedMotion:'no-preference',init:timerProbe});
  await page.evaluate(()=>{location.hash='scene=st-evidence';});await page.waitForFunction(()=>document.getElementById('st-evidence').classList.contains('active'));
  const snap=()=>page.evaluate(()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId==='st-evidence'));
  await page.evaluate(()=>window.deckweftInteractions.play('st-evidence'));await page.waitForFunction(()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId==='st-evidence').position>=1);
  await page.evaluate(()=>window.deckweftInteractions.pause('st-evidence'));const paused=await snap();await page.waitForTimeout(1200);const later=await snap(),timers=await page.evaluate(()=>window.__dwPendingTimers);
  await page.evaluate(()=>window.deckweftInteractions.play('st-evidence'));await page.waitForFunction(()=>{const s=window.deckweftInteractions.snapshot().find(s=>s.sceneId==='st-evidence');return !s.playing;},null,{timeout:8000});const done=await snap();await context.close();
  const observed={pausedAt:paused.position,afterWait:later.position,playingWhilePaused:later.playing,timersWhilePaused:timers,resumedTo:done.position,cues:2};
  record({id:'pause-resume',locale:'en',page:'story 3 · st-evidence (dark-data)',state:'playing → paused → playing',reproduction:'Play the cue sequence, pause after the first cue, wait 1.2 s, play again.',observed,passed:observed.pausedAt>=1&&observed.afterWait===observed.pausedAt&&!observed.playingWhilePaused&&observed.timersWhilePaused===0&&observed.resumedTo===2,fix:'None needed.'});
 }
 // Export final state: the author's static state is what readers without JavaScript and with reduced motion get.
 {
  const p=await load('story-dark-data-en');p.plan.scenes.find(s=>s.id==='st-evidence').staticState={keyStateId:'argument'};const file=await write('export-final-state',p);
  const nojs=await open(file,{js:false});const rows=await nojs.page.locator('#st-evidence figure.chart .chart-row').count(),note=await nojs.page.locator('#st-evidence .static-state-note').innerText();await shot(nojs.page,path.join(dir,'export-final-state-nojs.png'),'#st-evidence');await nojs.context.close();
  const reduced=await open(file);const s=await reduced.page.evaluate(()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId==='st-evidence'));await reduced.context.close();
  const observed={noJsRows:rows,noJsStatement:note,reducedOpensAt:s.position,frozen:s.frozen};
  record({id:'export-final-state',locale:'en',page:'story 3 · st-evidence (dark-data)',state:'static state “argument” (position 1)',reproduction:'Set the static state to the argument key state, export, open without JavaScript and with reduced motion.',observed,passed:rows===3&&/Filter/.test(note)&&s.position===1,fix:'None needed.'});
 }
 await report('cases',{cases,ok:cases.every(c=>c.passed)});
}

// 4. VIS-001 legacy baseline: the same content, migrated explicitly, drawn by the three themes beside the frozen legacy capture.
if(steps.has('legacy')){
 const dir=path.join(out,'legacy');await mkdir(dir,{recursive:true});const rows=[];
 for(const name of ['product-en','strategy-zh-CN','technical-en']){
  const legacy=JSON.parse(await readFile(path.join(root,`tests/fixtures/visual/${name}.baseline.json`),'utf8')),{document,plan}=migrateToPresentation(legacy);
  // The migration keeps every page in reading flow; the composed copy only chooses each page's family geometry (no content change).
  const composed=structuredClone(plan);for(const s of composed.scenes)s.composition=families[inferFamily(document,s)].variants[0][0];
  const renders=[];
  for(const [variant,base] of [['migrated',plan],['composed',composed]])for(const theme of THEMES){
   let p=createVisualProject(document,base,{id:`legacy-${name}-${variant}-${theme}`.toLowerCase()});for(const s of p.plan.scenes)p=applySceneTheme(p,s.id,theme);
   const o=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan}),file=path.join(dir,`${name}-${variant}-${theme}.html`);await writeFile(file,o.body);
   const strings=legacy.slides.flatMap(s=>[s.content.title,s.content.body,...s.content.items].filter(Boolean)),{page,context}=await open(file);const text=await page.locator('main').innerText(),issues=checkRender(p,[await observe(page)]).issues;
   const capture=await shot(page,path.join(dir,`${name}-${variant}-${theme}.png`),'main');await context.close();
   renders.push({variant,theme,compositions:p.plan.scenes.map(s=>s.composition),missingText:strings.filter(s=>!text.includes(s)),issues:issues.map(i=>i.kind),capture});
  }
  rows.push({fixture:name,legacyCapture:`docs/visual-baseline/${name}.png`,renders});
 }
 // One sheet per fixture: legacy capture, then the composed renders in each theme.
 const ctx=await (await browser()).newContext({viewport:{width:2200,height:1000}}),page=await ctx.newPage();
 for(const r of rows){const img=async f=>'data:image/png;base64,'+(await readFile(path.isAbsolute(f)?f:path.join(root,f))).toString('base64');
  const cells=[[`VIS-001 legacy (${r.fixture})`,await img(r.legacyCapture)],...await Promise.all(r.renders.filter(x=>x.variant==='composed').map(async x=>[`v3 composed · ${x.theme}`,await img(path.join(out,x.capture.file))]))];
  await page.setContent(`<style>body{margin:0;padding:16px;font:20px system-ui;background:#ddd}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start}figure{margin:0;background:#fff}img{width:100%;display:block}</style><main>${cells.map(([t,s])=>`<figure><figcaption>${t}</figcaption><img src="${s}"></figure>`).join('')}</main>`);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  r.sheet=await shot(page,path.join(dir,`${r.fixture}-sheet.png`));}
 await ctx.close();
 await report('legacy',{rows,ok:rows.every(r=>r.renders.every(x=>!x.missingText.length))});
}

// 5. Standalone: the exported files and the portable bundle, copied outside the repository, offline.
if(steps.has('standalone')){
 const outside=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-standalone-')));assert.ok(!outside.startsWith(await realpath(root)),'the standalone copy must be outside the repository');
 const result={directory:'<os temp>/deckweft-standalone-*',decks:[],engines:{},bundle:null};
 try{
  for(const d of DECKS){const p=await load(d.name),file=path.join(outside,d.name+'.html');await writeFile(file,(await html(p)).body);result.decks.push({deck:d.name,file:path.basename(file),bytes:Buffer.byteLength(await readFile(file))});}
  const engines=[['chromium',null],...args.engines.split(',').filter(Boolean).map(e=>[e,e])];
  for(const [engine] of engines){
   let launched;
   // Other engines use Playwright's cached build, or FIREFOX_PATH / WEBKIT_PATH for an isolated binary outside /Applications.
   try{
    if(engine==='chromium')launched=await browser();
    else{await browser();const explicit=process.env[engine.toUpperCase()+'_PATH'],binary=explicit&&await realpath(explicit);if(binary&&/[\\/]Applications[\\/]/i.test(binary))throw Error('Installed browser bundles are read-only.');launched=await playwright[engine].launch({headless:true,...(binary?{executablePath:binary}:{})});}
   }
   catch(error){result.engines[engine]={available:false,reason:error.message.split('\n')[0]};continue;}
   const runs=[];
   for(const d of DECKS){
    const context=await launched.newContext({viewport:{width:1440,height:1000}}),external=[],errors=[];await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('file:')||url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);let ok=false,interaction=null,error=null;
    try{
     await page.goto(pathToFileURL(path.join(outside,d.name+'.html')).href);await page.waitForFunction(()=>document.body.dataset.ready==='true');
     const images=await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().then(()=>i.naturalWidth>0,()=>false))));
     if(d.kind==='story'){await page.locator('#st-process [data-step-id="e3"]').click();interaction=await page.locator('#st-process [data-step-id="e3"]').getAttribute('aria-pressed');}
     else{await page.locator('#ev-case [data-hotspot-id="thread"]').click();interaction=await page.locator('#ev-case [data-hotspot-id="thread"]').getAttribute('aria-expanded');}
     if(d.name==='gallery-en'||d.name==='story-electric-violet-zh-CN')await page.screenshot({path:path.join(out,`standalone-${engine}-${d.name}.png`),animations:'disabled'});
     ok=images.every(Boolean)&&interaction==='true'&&!external.length&&!errors.length;result.decks.find(x=>x.deck===d.name).images=images.length;
    }catch(e){error=e.message.split('\n')[0];}
    runs.push({deck:d.name,ok,interaction,external,errors,error});await context.close();
   }
   result.engines[engine]={available:true,version:launched.version(),runs,ok:runs.every(r=>r.ok)};if(engine!=='chromium')await launched.close();
  }
  // The portable bundle runs a deterministic local task outside the repository.
  const bundle=path.join(outside,'deckweft-plugin');await cp(path.join(root,'dist/deckweft-plugin'),bundle,{recursive:true});
  const brief=path.join(outside,'brief.json');await writeFile(brief,JSON.stringify({request:'Release review\nReview every page at 390 px.\n---\nName the weakest page\nWrite it in the review record.'}));
  const run=spawnSync(process.execPath,[path.join(bundle,'runtime/bin/deckweft.mjs'),'visual-task','--brief',brief,'--out',path.join(outside,'task')],{cwd:outside,encoding:'utf8'});
  result.bundle={exit:run.status,stderr:run.stderr.slice(0,400),files:run.status===0?(await readdir(path.join(outside,'task'))).sort():[]};
 }finally{await rm(outside,{recursive:true,force:true});}
 result.ok=Object.values(result.engines).filter(e=>e.available).every(e=>e.ok)&&result.bundle?.exit===0;
 await report('standalone',result);
}
if(chromium)await chromium.close();
await writeFile(path.join(out,'gate.json'),JSON.stringify(gate,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(gate.steps).map(([k,v])=>[k,v.ok??true]))));
