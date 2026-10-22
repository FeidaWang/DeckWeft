// Real preview responses and measured downloaded HTML; no injected styles or screenshot mocks.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {startStudio} from '../src/services/server.mjs';
const binary=await realpath(process.env.CHROMIUM_PATH);assert.ok(!/\/Applications\//i.test(binary));
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),out=path.resolve('dist/interaction-visual-regression');await mkdir(out,{recursive:true});
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-interaction-parity-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0}),browser=await chromium.launch({executablePath:binary,headless:true});
const analysis=await browser.newPage();
const report={pixelTolerance:{usualChannelDifference:1,sparseEdgeChannelDifference:16,maximumSparseEdgePixelFraction:0.00001,reason:'Browser SVG edge raster rounding only; exact HTML/scene markup and selected state are checked separately. The numbers come from differences observed in earlier runs (1-level channel noise, a few 12-level edge pixels); they are not a cross-platform statistical calibration.'},browser:browser.version(),cases:[],comparisons:[],errors:[],externalRequests:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
async function api(route,body){const r=await fetch(app.url+'/api/visual/'+route,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());return r;}
async function capture(page,id,file){const scene=page.locator('#'+id);await scene.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));const bytes=await scene.screenshot({path:path.join(out,file),animations:'disabled'});return bytes;}
async function compare(preview,exported,name){
 const previewHash=hash(preview),exportHash=hash(exported);
 const diff=previewHash===exportHash?{maximumChannelDifference:0,differingPixels:0,sparseEdgePixels:0,totalPixels:0}:await analysis.evaluate(async([left,right])=>{
  const decode=async data=>{const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),image=await createImageBitmap(new Blob([bytes],{type:'image/png'})),canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();return {width:canvas.width,height:canvas.height,pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data};};
  const a=await decode(left),b=await decode(right);if(a.width!==b.width||a.height!==b.height)return {maximumChannelDifference:255,differingPixels:-1};let maximumChannelDifference=0,differingPixels=0,sparseEdgePixels=0;
  for(let i=0;i<a.pixels.length;i+=4){let different=false,pixelDelta=0;for(let j=0;j<4;j++){const delta=Math.abs(a.pixels[i+j]-b.pixels[i+j]);maximumChannelDifference=Math.max(maximumChannelDifference,delta);pixelDelta=Math.max(pixelDelta,delta);different||=delta>0;}if(different)differingPixels++;if(pixelDelta>1)sparseEdgePixels++;}return {maximumChannelDifference,differingPixels,sparseEdgePixels,totalPixels:a.width*a.height};
 },[preview.toString('base64'),exported.toString('base64')]);
 assert.ok(diff.maximumChannelDifference<=16&&diff.sparseEdgePixels<=Math.floor(diff.totalPixels*0.00001),name+': '+JSON.stringify(diff));report.comparisons.push({name,previewHash,exportHash,...diff,withinTolerance:true});
}
try{
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  const project=await createInteractionDemo(locale,store.home);for(const s of project.plan.scenes)if(s.interactions?.length)s.theme=theme;
  const preview=await(await api('preview',{project})).json(),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(app.url+'/')||/^(file|data):/.test(r.request().url())?r.continue():(report.externalRequests.push(r.request().url()),r.abort()));
  const a=await context.newPage(),b=await context.newPage();for(const p of [a,b]){p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));}
  const url=app.url+preview.artifactUrl;await a.goto(url);await a.waitForFunction(()=>document.body.dataset.ready==='true');const fit=await a.evaluate(()=>window.deckweftFit);assert.equal(fit.ok,true,locale+theme+JSON.stringify(fit.checks.filter(c=>c.contrastIssues.length||c.clipIssues.length||c.overflow.length)));
  await api('measure',{ticket:preview.ticket,fit});const downloaded=await(await api('export',{project,format:'html',ticket:preview.ticket})).text(),served=await(await fetch(url)).text();assert.equal(downloaded,served);
  const name=locale+'-'+theme,file=path.join(out,name+'.html');await writeFile(file,downloaded);await b.goto(pathToFileURL(file).href);await b.waitForFunction(()=>document.body.dataset.ready==='true');
  report.cases.push({locale,theme,renderHash:preview.renderHash,htmlHash:hash(downloaded),sameArtifactBytes:true});
  for(const width of [1440,390]){
   for(const p of [a,b]){await p.setViewportSize({width,height:1000});await p.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);assert.equal(await p.evaluate(()=>window.deckweftFit.ok),true,name+'/'+width);}
   for(const scene of project.plan.scenes){assert.equal(await a.locator('#'+scene.id).innerHTML(),await b.locator('#'+scene.id).innerHTML());const prefix=name+'-'+width+'-'+scene.id,previewHash=await capture(a,scene.id,prefix+'-preview.png'),exportHash=await capture(b,scene.id,prefix+'-export.png');await compare(previewHash,exportHash,prefix);}
   for(const p of [a,b]){
    await p.evaluate(()=>{const d=window.deckweftInteractions;d.dispatch('component-line',{event:'data.focus',interactionId:'select-line',seriesId:'reviewed'});d.dispatch('component-process',{event:'step.select',interactionId:'explain-process',stepId:'revise'});d.dispatch('image-comparison',{event:'tab.select',interactionId:'compare-crops',tabId:'second'});});
   }
   for(const id of ['component-line','component-process','image-comparison']){assert.equal(await a.locator('#'+id).innerHTML(),await b.locator('#'+id).innerHTML());assert.deepEqual(await a.evaluate(id=>window.deckweftInteractions.snapshot().find(s=>s.sceneId===id).state,id),await b.evaluate(id=>window.deckweftInteractions.snapshot().find(s=>s.sceneId===id).state,id));const prefix=name+'-'+width+'-'+id+'-selected',previewHash=await capture(a,id,prefix+'-preview.png'),exportHash=await capture(b,id,prefix+'-export.png');await compare(previewHash,exportHash,prefix);}
  }
  await context.close();console.log(name+' passed');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.ok=true;
}catch(e){report.ok=false;report.failure=e.stack;process.exitCode=1;}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await app.close();await rm(home,{recursive:true,force:true});}
console.log(JSON.stringify({ok:report.ok,cases:report.cases.length,comparisons:report.comparisons.length,failure:report.failure},null,2));
