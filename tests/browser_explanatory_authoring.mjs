// Integration regression on the existing Studio, saved source, measured preview and actual HTML download.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {revealStudio} from './studio-controls.mjs';
const binary=await realpath(process.env.CHROMIUM_PATH);assert.ok(!/\/Applications\//i.test(binary));
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),out=path.resolve('dist/explanatory-authoring');await mkdir(out,{recursive:true});
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-explanatory-ui-'))),store=await new VisualProjectStore(home).init();
const app=await startStudio({home,port:0}),browser=await chromium.launch({executablePath:binary,headless:true}),errors=[],external=[];
const report={checks:[],errors,external,browser:browser.version()};
try{
 for(const locale of ['en','zh-CN']){
  const source=await createCompositionDemo(locale,store.home);
  source.document.visualBrief.profile.motionIntensity='subtle';
  const saved=await store.save(source,{create:true}),page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(app.url+'/')||/^(data|blob):/.test(r.request().url())?r.continue():(external.push(r.request().url()),r.abort()));
  await page.goto(app.url+'/?project='+saved.id+'&scene=evidence&ui='+locale);await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#sceneTitle').textContent.length>0);await revealStudio(page,'edit');
  // Single entry step 3: "Let this page move" in Look opens the ways the page can move; the explanations are one of them.
  await revealStudio(page,'compositions');assert.equal(await page.locator('#motionSwitch').getAttribute('aria-checked'),'false');assert.ok(await page.locator('#motionControls').isHidden());
  await page.locator('#motionSwitch').click();await page.locator('#motionControls').waitFor({state:'visible'});assert.equal(await page.locator('#motionSwitch').getAttribute('aria-checked'),'true');
  console.log(locale,'enable chart');await page.locator('#enableInteractions').click();await page.waitForFunction(()=>!document.querySelector('#useInteractionOpening').disabled);
  // S5: the series buttons focus one series and hide nothing; the checkboxes show and hide whole series.
  // Player .9: the slide carries no controls; the focus and the hide are the events an authored cue sends.
  let frame=page.frameLocator('#preview');assert.equal(await frame.locator('.web-scene :is(button,input,select)').count(),0,'no controls on the slide');
  const picked=await frame.locator('body').evaluate(()=>{const scene=document.querySelector('.chart-current-view').closest('.web-scene'),cfg=JSON.parse(document.getElementById('dw-runtime-data').textContent).scenes.find(s=>s.id===scene.id),i=cfg.interactions.findIndex(x=>x.kind==='chart-select'),spec=cfg.interactions[i],now=()=>window.deckweftInteractions.snapshot().find(s=>s.sceneId===scene.id).state[i],series=now().seriesIds[0];window.deckweftInteractions.dispatch(scene.id,{event:'data.focus',interactionId:spec.id,seriesId:series});const v=now();return {sceneId:scene.id,specId:spec.id,series,focus:v.focusSeriesId,fromId:v.fromId,toId:v.toId};});
  const series=picked.series;assert.equal(picked.focus,series);assert.equal(await frame.locator('.chart-current-view .legend li').count(),2);
  await frame.locator('body').evaluate((n,v)=>window.deckweftInteractions.dispatch(v.sceneId,{event:'data.filter',interactionId:v.specId,seriesIds:[v.series],fromId:v.fromId,toId:v.toId}),picked);
  assert.equal(await frame.locator('.chart-current-view .legend li').count(),1);
  const explanation=await frame.locator('.chart-selection-explanation').textContent();assert.ok(explanation.includes('78')||explanation.includes('45'));
  await page.locator('#useInteractionOpening').click();await page.waitForFunction(()=>!document.querySelector('#useInteractionOpening').disabled);await page.keyboard.press('Control+s');await page.waitForFunction(()=>document.querySelector('#saveState').dataset.state==='saved'&&!document.querySelector('#exportHTML').disabled);
  await page.locator('#slideList [data-slide="process"]').click();await page.locator('#motionSwitch').click();await page.locator('#motionControls').waitFor({state:'visible'});await page.locator('#enableInteractions').click();await page.locator('#sceneMotion').selectOption('subtle');
  const note=page.locator('#explanationFields textarea').nth(1);const authored=locale==='en'?'Compare every candidate before review.':'审阅前比较每个候选。';await note.fill(authored);await note.press('Tab');await page.waitForFunction(()=>!document.querySelector('#useInteractionOpening').disabled);
  frame=page.frameLocator('#preview');await frame.locator('body').evaluate(()=>{const cfg=JSON.parse(document.getElementById('dw-runtime-data').textContent).scenes.find(s=>s.id==='process'),spec=cfg.interactions.find(x=>x.kind==='steps');window.deckweftInteractions.dispatch('process',{event:'step.select',interactionId:spec.id,stepId:spec.steps[1].id});});assert.ok((await frame.locator('.step-explanation').textContent()).includes(authored));assert.equal(await frame.locator('.semantic-step-target').getAttribute('data-object-id'),'compare');
  await page.locator('#useInteractionOpening').click();await page.waitForFunction(()=>!document.querySelector('#useInteractionOpening').disabled);await page.keyboard.press('Control+s');await page.waitForFunction(()=>document.querySelector('#saveState').dataset.state==='saved'&&!document.querySelector('#exportHTML').disabled);
  await page.locator('#preview').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,locale+'-editor.png'),fullPage:true});
  const downloadEvent=page.waitForEvent('download');await revealStudio(page,'file');await page.locator('#exportHTML').click();const dl=await downloadEvent,file=path.join(out,locale+'-export.html');await dl.saveAs(file);
  const final=await store.get(saved.id);assert.equal(final.plan.scenes.length,saved.plan.scenes.length);assert.deepEqual(final.document.blocks,saved.document.blocks);assert.deepEqual(final.document.datasets.map(d=>d.series),saved.document.datasets.map(d=>d.series));
  assert.deepEqual(final.plan.scenes.find(s=>s.id==='evidence').interactions[0].initialSeriesIds,[series]);assert.equal(final.plan.scenes.find(s=>s.id==='evidence').interactions[0].initialFocusSeriesId,series);
  const exported=await browser.newPage({viewport:{width:1440,height:1000}});exported.on('pageerror',e=>errors.push(e.message));await exported.goto(pathToFileURL(file).href+'#scene=process');await exported.waitForFunction(()=>document.body.dataset.ready==='true');assert.ok((await exported.locator('.step-explanation').textContent()).includes(authored));assert.equal(await exported.locator('.chart-current-view .legend li').count(),1);
  await exported.evaluate(()=>Promise.all(document.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));await exported.locator('#process').screenshot({path:path.join(out,locale+'-flow.png')});
  await exported.goto(pathToFileURL(file).href+'#scene=evidence');await exported.waitForFunction(()=>document.body.dataset.ready==='true');await exported.evaluate(()=>{const cfg=JSON.parse(document.getElementById('dw-runtime-data').textContent).scenes.find(s=>s.id==='evidence'),spec=cfg.interactions.find(x=>x.kind==='chart-select'),d=cfg.components[spec.id].dataset;window.deckweftInteractions.dispatch('evidence',{event:'data.filter',interactionId:spec.id,seriesIds:d.series.map(v=>v.id),fromId:d.categoryIds[0],toId:d.categoryIds.at(-1)});});assert.equal(await exported.locator('.chart-current-view .legend li').count(),2);await exported.evaluate(()=>Promise.all(document.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));await exported.locator('#evidence').screenshot({path:path.join(out,locale+'-chart.png')});
  await exported.setViewportSize({width:390,height:844});await exported.emulateMedia({reducedMotion:'reduce'});await exported.evaluate(()=>{const cfg=JSON.parse(document.getElementById('dw-runtime-data').textContent).scenes.find(s=>s.id==='evidence'),spec=cfg.interactions.find(x=>x.kind==='chart-select'),d=cfg.components[spec.id].dataset;window.deckweftInteractions.dispatch('evidence',{event:'data.filter',interactionId:spec.id,seriesIds:d.series.slice(1).map(v=>v.id),fromId:d.categoryIds[0],toId:d.categoryIds.at(-1)});});assert.equal(await exported.locator('.chart-current-view .legend li').count(),1);assert.ok(await exported.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await exported.evaluate(()=>window.deckweftInteractions.snapshot().every(s=>s.resources.animations===0)));
  await exported.screenshot({path:path.join(out,locale+'-mobile.png'),fullPage:true});
  await page.reload();await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>!document.querySelector('#exportHTML').disabled);await page.locator('#slideList [data-slide="process"]').click();assert.ok((await page.frameLocator('#preview').locator('.step-explanation').textContent()).includes(authored));
  report.checks.push({locale,sourceId:saved.id,verified:'Existing-page authoring, exact values, saved opening, source-bound explanation, reload, measured HTML download and interactive offline export at 1440/390px'});await exported.close();await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.ok=true;
}catch(error){for(const page of browser.contexts().flatMap(c=>c.pages())){console.error(await page.locator('#issueBanner').textContent({timeout:500}).catch(()=>''));console.error(await page.locator('#saveState').getAttribute('title',{timeout:500}).catch(()=>''));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}throw error;}finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await app.close();await rm(home,{recursive:true,force:true});}
console.log(JSON.stringify(report,null,2));
