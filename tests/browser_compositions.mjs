import {revealStudio,closeStudio} from './studio-controls.mjs';
// Optional real-browser QA; uses an isolated preinstalled test binary only.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdir,mkdtemp,realpath,readFile,writeFile,rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { startStudio } from '../src/services/server.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { createCompositionDemo } from '../src/core/composition-demo.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { visualAssetResources } from '../src/assets/visual.mjs';
import { candidateProjects,candidateFit,chooseRhythm } from '../src/design/rhythm.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/visual-compositions/acceptance');await mkdir(out,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated testing binary outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-compositions-browser-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0}),browser=await chromium.launch({executablePath,headless:true});
const report={browser:browser.version(),isolation:'Isolated cached testing binary; ephemeral context; installed apps and personal profiles untouched',checks:[],cases:[],captures:[],errors:[],externalRequests:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),routes=new Map();
await context.route('**/*',async route=>{const url=route.request().url();if(routes.has(url))await route.fulfill({status:200,contentType:'text/html',body:routes.get(url)});else if(url.startsWith(app.url+'/')||url.startsWith('data:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));let editor;
async function capture(page,name,locator){await (locator||page).screenshot({path:path.join(out,name),...(locator?{}:{fullPage:true})});report.captures.push({file:name,sha256:hash(await readFile(path.join(out,name)))});}
async function render(p,name){const resources=await visualAssetResources(p,store.home),o=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:resources});await writeFile(path.join(out,name+'.html'),o.body);routes.set(app.url+'/'+name+'.html',o.body);await page.goto(app.url+'/'+name+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');return page.evaluate(()=>window.deckweftFit);}
const originalExamples=[];
try{
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  const p=await createCompositionDemo(locale,store.home);p.plan.scenes.forEach(s=>s.theme=theme);const candidates=candidateProjects(p),fits=[],geometries=[];
  for(const [k,c]of candidates.entries()){
   await page.setViewportSize({width:1440,height:1000});const name=locale+'-'+theme+'-'+k,fit=await render(c,name),accepted=fit.checks.map(s=>candidateFit(s,fit.viewport));fits.push(accepted);
   const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const tree=await cdp.send('DOM.getDocument'),nodes=await cdp.send('DOM.querySelectorAll',{nodeId:tree.root.nodeId,selector:'.web-scene h2'}),platformFonts=[];for(const nodeId of nodes.nodeIds)platformFonts.push(await cdp.send('CSS.getPlatformFontsForNode',{nodeId}));await cdp.detach();
   const geometry=await page.locator('.web-scene').evaluateAll(nodes=>nodes.map(s=>({sceneId:s.id,regions:[...s.querySelectorAll('.region')].map(r=>{const b=r.getBoundingClientRect(),sb=s.getBoundingClientRect();return {id:r.dataset.blockId,x:Math.round(b.x-sb.x),y:Math.round(b.y-sb.y),width:Math.round(b.width),height:Math.round(b.height)};})})));
   geometries.push(geometry);report.cases.push({locale,theme,k,platformFonts,fit:accepted,geometry,checks:fit.checks});
   for(const s of c.plan.scenes)await capture(page,`${name}-${s.id}.png`,page.locator('#'+s.id));
   // Exact DOM values and all bound semantic regions survive each candidate.
   assert.equal(await page.locator('.region').count(),c.plan.scenes.reduce((n,s)=>n+s.blockIds.length,0));assert.ok((await page.locator('#comparison table').textContent()).includes('81.25%'));
  }
  for(const [i,s]of p.plan.scenes.entries()){assert.ok(fits.filter(row=>row[i].ok).length>=2,JSON.stringify({locale,theme,scene:s.id,fits:fits.map(r=>r[i])}));const signatures=geometries.map(g=>JSON.stringify([...g[i].regions].sort((a,b)=>a.id.localeCompare(b.id))));assert.equal(new Set(signatures).size,3,'Three distinct measured geometries required: '+s.id);}
  const selected=chooseRhythm(p,candidates,fits);const fit=await render(selected.project,locale+'-'+theme+'-rhythm');assert.equal(fit.ok,true,JSON.stringify(fit));await capture(page,locale+'-'+theme+'-full-deck.png');report.checks.push({locale,theme,rhythm:selected.report});
  if(theme==='cream-collage')originalExamples.push(p);
  for(const width of [1024,390]){await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);assert.equal((await page.evaluate(()=>window.deckweftFit)).ok,true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(page,locale+'-'+theme+'-reading-'+width+'.png');}
 }
 // Density stress: failed candidates remain complete; no silent repair or content deletion.
 await page.setViewportSize({width:1440,height:1000});const dense=structuredClone(originalExamples[0]);dense.document.blocks.find(b=>b.id==='chapter-body').text='Retain this exact sentence. '.repeat(350);const denseFit=await render(candidateProjects(dense)[0],'dense-failure');const stress=candidateFit(denseFit.checks[0],denseFit.viewport);assert.equal(stress.ok,false);assert.ok((await page.locator('#chapter').textContent()).includes('Retain this exact sentence.'));report.checks.push({negative:'Oversized complete content is rejected',stress});
 // Direct-loopback editor API/UI: compare, select, rhythm, order, save/reopen, stale candidates.
 const p=await store.save(originalExamples[0],{create:true});editor=await context.newPage();editor.on('pageerror',e=>report.errors.push(e.message));await editor.setViewportSize({width:1920,height:1100});await editor.goto(app.url+'/?project='+p.id);await editor.waitForSelector('#root.workspace',{state:'attached'});
 const ready=()=>editor.waitForFunction(()=>!document.querySelector('#exportHTML').disabled);
 // Single entry step 3: the three choices lead the Look zone and are measured as soon as the page is; there is no Compare button.
 const storedWhen=async test=>{for(let k=0;k<120;k++){const s=await store.get(p.id);if(test(s))return s;await new Promise(r=>setTimeout(r,250));}throw Error('autosave did not land');};
 await ready();for(const gone of ['#compare','#designTab','#contentTab','.candidate-card'])assert.equal(await editor.locator(gone).count(),0,gone);await revealStudio(editor,'compositions');await editor.waitForFunction(()=>!document.querySelector('#rhythm').disabled,{},{timeout:60000});await editor.locator('[data-zone=look] .directions').scrollIntoViewIfNeeded();await capture(editor,'studio-candidates.png');await editor.locator('[data-inspect-layout="1"]').click();await editor.locator('#candidateDialog').waitFor({state:'visible'});await editor.frameLocator('#largeCandidate').locator('#chapter').waitFor({state:'visible'});await capture(editor,'studio-candidate-large.png');await editor.locator('#candidateClose').click();
 assert.equal(await editor.locator('#candidates .candidate').count(),3);const passing=editor.locator('#candidates .candidate:enabled');assert.ok(await passing.count()>=2);await passing.last().click();await ready();await storedWhen(s=>s.plan.scenes[0].composition==='statement-center');await editor.reload();await editor.waitForSelector('#root.workspace',{state:'attached'});await ready();assert.equal((await store.get(p.id)).plan.scenes[0].composition,'statement-center');
 await revealStudio(editor,'compositions');await editor.waitForFunction(()=>!document.querySelector('#rhythm').disabled,{},{timeout:60000});await editor.locator('#rhythm').click();await ready();assert.ok((await editor.locator('#rhythmReport').textContent()).includes('Story rhythm cost'));await revealStudio(editor,'developer');await editor.locator('#rhythmReport').scrollIntoViewIfNeeded();await capture(editor,'studio-rhythm.png');await closeStudio(editor);
 const beforeMove=(await store.get(p.id)).revision.number;await editor.locator('#moveDown').click();await ready();const saved=await storedWhen(s=>s.revision.number>beforeMove&&s.plan.scenes[1].id==='chapter');assert.equal(saved.plan.scenes[1].id,'chapter');assert.deepEqual(saved.document,p.document);for(const s of p.plan.scenes)assert.equal(saved.plan.scenes.find(v=>v.id===s.id).theme,s.theme);
 // Request exact candidate receipts through the actual API; stale source and failed fit rejected.
 const api=async(route,data)=>editor.evaluate(async({route,data})=>{const token=(await(await fetch('/api/session')).json()).token;const r=await fetch('/api/visual/'+route,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()};},{route,data});
 const sets=await api('candidates',{project:saved});assert.equal(sets.status,200);let response=await api('rhythm',{project:saved,tickets:sets.body.sets.map(s=>s.ticket)});assert.equal(response.status,409);
 const live=await browser.newContext({viewport:{width:1440,height:1000}});for(const set of sets.body.sets){const q=await live.newPage();await q.goto(app.url+set.artifactUrl);await q.waitForFunction(()=>document.body.dataset.ready==='true');const fit=await q.evaluate(()=>window.deckweftFit);response=await api('candidate-measure',{ticket:set.ticket,fit});assert.equal(response.status,200);await q.close();}await live.close();
 const stale=structuredClone(saved);stale.document.title+=' changed';response=await api('rhythm',{project:stale,tickets:sets.body.sets.map(s=>s.ticket)});assert.equal(response.status,409);report.checks.push('Actual editor candidate comparison/selection, measured rhythm, reorder identity, save/reopen, unmeasured and stale candidate refusal');
 await revealStudio(editor,'compositions');await editor.waitForFunction(()=>!document.querySelector('#rhythm').disabled,{},{timeout:60000});await editor.locator('#deckTitle').fill('Changed after comparing');assert.equal(await editor.locator('#candidates .candidate').count(),0);assert.ok(await editor.locator('#rhythm').isDisabled());
 report.checks.push('Any local edit invalidates measured candidate receipts in the UI');
 // Build an actual screenshot contact sheet of all eighteen geometries per theme/language.
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  let html='<style>body{margin:0;padding:20px;background:#ddd;font:14px Arial}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}img{width:100%;display:block}.cell{background:white;padding:8px}p{margin:4px}</style><h1>'+locale+' · '+theme+' · six families × three geometries</h1><main>';
  for(const id of ['chapter','violet','collage','evidence','comparison','process'])for(let k=0;k<3;k++){const name=`${locale}-${theme}-${k}-${id}.png`;html+='<div class="cell"><p>'+id+' / '+(k+1)+'</p><img src="data:image/png;base64,'+(await readFile(path.join(out,name))).toString('base64')+'"></div>';}html+='</main>';await page.setViewportSize({width:1800,height:1000});await page.setContent(html);await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));await capture(page,locale+'-'+theme+'-contact.png');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.ok=true;
}catch(e){report.ok=false;report.failure=e.stack;await capture(editor||page,'failure.png').catch(()=>{});process.exitCode=1;}
finally{await browser.close();await app.close();await rm(home,{recursive:true,force:true});await writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,cases:report.cases.length,captures:report.captures.length,failure:report.failure,out},null,2));
