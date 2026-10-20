// Optional real-browser QA; uses an isolated preinstalled test binary only.
import assert from 'node:assert/strict';
import {saveNow} from './studio-controls.mjs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdir,mkdtemp,realpath,readFile,writeFile,rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { startStudio } from '../src/services/server.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { createComponentDemo } from '../src/core/component-demo.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { visualAssetResources } from '../src/assets/visual.mjs';
import { candidateProjects,candidateFit,chooseRhythm } from '../src/design/rhythm.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/visual-components/acceptance');await mkdir(out,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated testing binary outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-components-browser-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0}),browser=await chromium.launch({executablePath,headless:true});
const report={browser:browser.version(),isolation:'Isolated cached testing binary; ephemeral context; installed apps and personal profiles untouched',checks:[],cases:[],captures:[],errors:[],externalRequests:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),routes=new Map();
await context.route('**/*',async route=>{const url=route.request().url();if(routes.has(url))await route.fulfill({status:200,contentType:'text/html',body:routes.get(url)});else if(url.startsWith(app.url+'/')||url.startsWith('data:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));let editor;
async function capture(page,name,locator){if(!locator){await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}await (locator||page).screenshot({path:path.join(out,name),...(locator?{}:{fullPage:true})});report.captures.push({file:name,sha256:hash(await readFile(path.join(out,name)))});}
async function render(p,name){const resources=await visualAssetResources(p,store.home),o=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:resources});await writeFile(path.join(out,name+'.html'),o.body);routes.set(app.url+'/'+name+'.html',o.body);await page.goto(app.url+'/'+name+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');return page.evaluate(()=>window.deckweftFit);}

try{
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  const p=await createComponentDemo(locale,store.home);
  for(const s of p.plan.scenes){if(s.id.startsWith('component-'))s.theme=theme;}
  const name=locale+'-'+theme;const fit=await render(p,name);
  report.cases.push({locale,theme,fit});assert.equal(fit.ok,true,JSON.stringify(fit.checks.filter(c=>c.overflow.length||c.clipIssues.length||c.contrastIssues.length||c.text.some(t=>!t.inside))));
  await capture(page,name+'-full-deck.png');
  for(const s of p.plan.scenes)await capture(page,name+'-'+s.id+'.png',page.locator('#'+s.id));
  const code=p.document.blocks.find(b=>b.id==='component-code');assert.equal(await page.locator('[data-block-id="component-code"] code').textContent(),code.text);
  assert.equal(await page.locator('[data-block-id="component-code"] .code-emphasis').count(),2);
  const broken=await page.locator('.semantic-annotation a').evaluateAll(links=>links.filter(a=>!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.href));assert.deepEqual(broken,[]);
  for(const kind of ['line','area','ranked-bar','stacked','scatter','heatmap']){const figure=page.locator('[data-block-id="component-'+kind+'"]');await figure.locator('summary').click();assert.ok(await figure.locator('table').isVisible());assert.ok((await figure.locator('tbody').textContent()).includes('-3.125'));assert.ok((await figure.locator('tbody').textContent()).includes(locale==='en'?'Missing':'缺失'));await figure.locator('summary').press('Enter');}
  for(const width of [1024,390]){await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);assert.equal((await page.evaluate(()=>window.deckweftFit)).ok,true,JSON.stringify(await page.evaluate(()=>window.deckweftFit.checks.filter(c=>c.clipIssues.length||c.overflow.length||c.text.some(t=>!t.inside)))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:1440,height:1000});

  if(theme==='cream-collage'){
   for(const kind of ['line','area','ranked-bar','stacked','scatter','heatmap']){
    await render(p,name+'-before-edit');const before=await page.locator('[data-block-id="component-'+kind+'"] svg :is(circle,rect,polyline,polygon)').evaluateAll(ns=>ns.map(n=>n.outerHTML).join(''));
    const copy=structuredClone(p),d=copy.document.datasets.find(d=>d.id==='data-'+kind);d.series[0].values[0]=-7.8125;d.series[0].label=locale==='en'?'Edited series':'已修改系列';const changed=await render(copy,name+'-changed-'+kind);assert.equal(changed.ok,true);const figure=page.locator('[data-block-id="component-'+kind+'"]');assert.ok((await figure.textContent()).includes('-7.8125'));assert.ok((await figure.textContent()).includes(d.series[0].label));const after=await figure.locator('svg :is(circle,rect,polyline,polygon)').evaluateAll(ns=>ns.map(n=>n.outerHTML).join(''));assert.notEqual(after,before);await figure.locator('summary').click();assert.ok((await figure.locator('tbody').textContent()).includes('-7.8125'));report.checks.push({locale,kind,dataMutation:'geometry, labels, series text and exact accessible table changed together'});
   }
  }
  // Measure every actual composition candidate before selecting a complete story.
  const candidates=candidateProjects(p),fits=[];
  for(const [k,c]of candidates.entries()){const f=await render(c,name+'-candidate-'+k);fits.push(f.checks.map(s=>candidateFit(s,f.viewport)));}
  const chosen=chooseRhythm(p,candidates,fits);assert.deepEqual(chosen.project.document,p.document);report.checks.push({locale,theme,candidates:fits,rhythm:chosen.report});
  await render(chosen.project,name+'-rhythm');await capture(page,name+'-rhythm.png');
  // Zero-JS output keeps source tables, relationships, exact code and annotation links.
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:1000}}),q=await nojs.newPage();await q.route('**/*',r=>routes.has(r.request().url())?r.fulfill({status:200,contentType:'text/html',body:routes.get(r.request().url())}):r.abort());await q.goto(app.url+'/'+name+'.html');assert.equal(await q.locator('h2').count(),14);assert.equal(await q.locator('[data-block-id="component-code"] code').textContent(),code.text);await q.locator('[data-block-id="component-line"] summary').click();assert.ok(await q.locator('[data-block-id="component-line"] table').isVisible());await nojs.close();
  if(locale==='en'&&theme==='cream-collage'){
   const saved=await store.save(p,{create:true});editor=await context.newPage();editor.on('pageerror',e=>report.errors.push(e.message));await editor.setViewportSize({width:1920,height:1100});await editor.goto(app.url+'/visual?project='+saved.id+'&scene=component-line');const ready=()=>editor.waitForFunction(()=>!document.querySelector('#exportHTML').disabled);await ready();
   await editor.locator('[data-dataset="component-line"]').fill(JSON.stringify({...p.document.datasets.find(d=>d.id==='data-line'),series:[{id:'local',label:'Edited series',values:[-7.8125,0,null,8.25]},{id:'reviewed',label:'Reviewed',values:[2.5,-1,4,6]}]}));await ready();assert.ok((await editor.frameLocator('#preview').locator('[data-block-id="component-line"]').textContent()).includes('-7.8125'));assert.ok((await editor.frameLocator('#preview').locator('.legend').allTextContents()).some(s=>s.includes('Edited series')));await saveNow(editor);await ready();await editor.reload();await ready();assert.equal((await store.get(saved.id)).document.datasets.find(d=>d.id==='data-line').series[0].values[0],-7.8125);
   await capture(editor,'studio-edited-line.png');await editor.locator('#slideList [data-slide="component-code"]').click();const exactEdit=code.text+'// appended  \t\n';await editor.locator('[data-text="component-code"]').fill(exactEdit);await ready();
   // Single entry step 3: the code block's language, emphasis and anchor sit under "Code settings" in its Words card.
   await editor.locator('[data-field-kind="code"] .field-more > summary').click();const metadata=JSON.parse(await editor.locator('[data-code-meta="component-code"]').inputValue());metadata.emphasizedLines=[3];await editor.locator('[data-code-meta="component-code"]').fill(JSON.stringify(metadata));await ready();assert.equal(await editor.frameLocator('#preview').locator('[data-block-id="component-code"] code').textContent(),exactEdit);await capture(editor,'studio-code.png');await editor.locator('#moveUp').click();await ready();await saveNow(editor);await ready();const moved=await store.get(saved.id);assert.equal(moved.plan.scenes.at(-2).id,'component-code');assert.deepEqual(moved.document.blocks.find(b=>b.id==='component-code-note').target,{blockId:'component-code',line:3});await editor.close();editor=null;
   report.checks.push('Actual editor data+legend update, save/reload, code editor, reordered annotation identity');
  }
 }

 const exact=await createComponentDemo('en',store.home),codeBlock=exact.document.blocks.find(b=>b.id==='component-code');codeBlock.text='<script>\r\n\treturn value;  \r\n';codeBlock.emphasizedLines=[2];
 await render(exact,'exact-whitespace');assert.equal(await page.locator('[data-block-id="component-code"] code').textContent(),codeBlock.text);

 const crlf=await store.save(exact,{create:true});editor=await context.newPage();await editor.goto(app.url+'/visual?project='+crlf.id+'&scene=component-code');const codeReady=()=>editor.waitForFunction(()=>!document.querySelector('#exportHTML').disabled);await codeReady();await editor.locator('[data-text="component-code"]').fill('<script>\n\treturn changed;  \n');await codeReady();await saveNow(editor);await codeReady();assert.equal((await store.get(crlf.id)).document.blocks.find(b=>b.id==='component-code').text,'<script>\r\n\treturn changed;  \r\n');await editor.close();editor=null;report.checks.push('Actual raw code editor preserves CRLF delimiters, tab, trailing spaces and final newline through save');
 const negative=structuredClone(exact);negative.document.datasets.find(d=>d.id==='data-line').categories[0]='Unshortened source category '.repeat(3);const bad=await render(negative,'negative-label-overflow');assert.equal(bad.ok,false);assert.ok(bad.checks.some(c=>c.clipIssues.length));report.checks.push('Actual browser: CRLF/tab/trailing whitespace exact; oversized SVG labels rejected without truncating source');
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  const name=locale+'-'+theme;let html='<style>body{margin:0;padding:16px;background:#ddd;font:14px Arial}main{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}img{width:100%;display:block}.cell{background:white;padding:8px}p{margin:4px}</style><h1>'+name+' · charts / diagrams / code / annotations</h1><main>';
  for(const kind of ['line','area','ranked-bar','stacked','scatter','heatmap','relationship','sequence','process','code']){const file=name+'-component-'+kind+'.png';html+='<div class="cell"><p>'+kind+'</p><img src="data:image/png;base64,'+(await readFile(path.join(out,file))).toString('base64')+'"></div>';}
  html+='</main>';await page.setViewportSize({width:1500,height:1000});await page.setContent(html);await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));await capture(page,name+'-contact.png');let story=html.slice(0,html.indexOf('<main>'))+'<main>';for(const id of ['collage','evidence','violet','chapter','component-line','component-area','component-ranked-bar','component-stacked','component-scatter','component-heatmap','component-relationship','component-sequence','component-process','component-code']){story+='<div class="cell"><p>'+id+'</p><img src="data:image/png;base64,'+(await readFile(path.join(out,name+'-'+id+'.png'))).toString('base64')+'"></div>';}story+='</main>';await page.setContent(story);await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));await capture(page,name+'-story-contact.png');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.ok=true;
}catch(e){report.ok=false;report.failure=e.stack;await capture(editor||page,'failure.png').catch(()=>{});process.exitCode=1;}
finally{await browser.close();await app.close();await rm(home,{recursive:true,force:true});await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,cases:report.cases.length,captures:report.captures.length,failure:report.failure,out},null,2));
