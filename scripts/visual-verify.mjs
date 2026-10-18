// Optional local browser QA. Playwright and its isolated binary are supplied separately.
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,mkdtemp,readFile,writeFile,realpath,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {inspectRenderedPage,checkRender} from '../src/quality/render-checks.mjs';
import {createQualityReceipt,recordVisualReview,receiptCurrent} from '../src/quality/visual-review.mjs';
import {preserveValidArtifacts} from '../src/quality/artifacts.mjs';
import {boundedRepair,repairBudget} from '../src/quality/repair-plan.mjs';
import {compositions,inferFamily} from '../src/design/compositions.mjs';
import {contentHash} from '../src/scene/web/compile.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},case:{type:'string',default:'release-gallery'},project:{type:'string'},home:{type:'string'},review:{type:'string'},serve:{type:'boolean'},'max-rounds':{type:'string'},'max-candidates':{type:'string'},'max-scene-changes':{type:'string'},'max-ms':{type:'string'},help:{type:'boolean'}}});
if(args.help){console.log('Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/qa/playwright/index.mjs npm run visual:verify -- [--case release-gallery] [--out dist/visual-quality] [--project file --home local-asset-home] [--max-rounds 2 --max-candidates 6 --max-scene-changes 2 --max-ms 60000]\nThen inspect the actual images and supply --review review.json to bind judgments to the saved report. --serve opens a loopback evidence gallery. No model/image/network service is called.');process.exit(0);}
if(args.case!=='release-gallery')throw Error('Unknown case; use release-gallery or --project. This is a representative local gallery, not host release certification.');
const out=path.resolve(args.out||path.join(root,'dist/visual-quality'));await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
async function sourceTreeHash(){const entries=[];async function scan(dir){for(const item of (await readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=dir+'/'+item.name;if(item.isDirectory())await scan(file);else entries.push([file,hash(await readFile(path.join(root,file)))]);}}for(const dir of ['src','schemas','themes'])await scan(dir);entries.push(['scripts/visual-verify.mjs',hash(await readFile(fileURLToPath(import.meta.url)))]);return contentHash(entries);}
async function gallery(report){
 const links=report.cases.map(c=>`<article><h2>${escape(c.name)} · ${c.receipt.status}</h2><a href="${c.name}.html">Explore the live editable-source output / 交互预览</a><p>Receipt: ${c.receipt.id}</p>${c.repair.artifact?.startsWith('accepted/')?`<a href="${c.repair.artifact}">Last valid artifact retained / 保留的最后有效产物</a>`:''}<a href="${c.name}-contact.png"><img src="${c.name}-contact.png" alt="Complete story contact sheet"></a><details><summary>Full resolution scenes and explored states</summary>${c.receipt.captures.filter(i=>!i.file.endsWith('-contact.png')).map(i=>`<a href="${i.file}">${escape(i.file)}</a><br>`).join('')}</details><p>${escape(c.receipt.review?.judgment||'Actual image review required / 需要实际图像审阅')}</p></article>`).join('');
 await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DeckWeft local quality review</title><style>body{font:16px system-ui;margin:24px;background:#eee;color:#151515}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}article{min-width:0;padding:16px;background:white;overflow-wrap:anywhere}img{width:100%}a{color:#124caa}code{overflow-wrap:anywhere}</style><h1>Browser quality / 浏览器质量审阅</h1><p>${escape(report.status)} · <a href="report.json">Diagnostics, coverage, budgets and action traces</a> · <a href="faults-contact.png">Injected faults</a> · <a href="repair-before.png">Before scoped repair</a></p><main>${links}</main></html>`);
}
if(args.review){
 const report=JSON.parse(await readFile(path.join(out,'report.json'),'utf8')),reviews=JSON.parse(await readFile(path.resolve(args.review),'utf8'));
 assert.equal(report.sourceTreeHash,await sourceTreeHash(),'Renderer/contract/theme changed; recapture before review');if(report.projectFile)assert.equal(hash(await readFile(report.projectFile)),report.projectFileHash,'Project changed; old receipt is stale');
 for(const c of report.cases){for(const capture of c.receipt.captures)assert.equal(hash(await readFile(path.join(out,capture.file))),capture.sha256,'Changed screenshot invalidates review');assert.equal(hash(await readFile(path.join(out,c.name+'.html'))),c.htmlHash,'Changed output invalidates review');assert.ok(receiptCurrent(c.receipt,c.project,c.observation));const review=reviews.find(r=>r.receiptId===c.receipt.id);if(review)c.receipt=recordVisualReview(c.receipt,review);}
 report.status=report.cases.every(c=>c.receipt.status==='passed')?'passed':'failed-or-review-incomplete';report.ok=report.status==='passed';await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await gallery(report);console.log(JSON.stringify({status:report.status,out}));if(!report.ok)process.exitCode=1;
}else if(!args.serve){
 let previous=null;try{previous=JSON.parse(await readFile(path.join(out,'report.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const lastValid=await preserveValidArtifacts(out,previous);
 const budget=repairBudget(Object.fromEntries([['maxRounds','max-rounds'],['maxCandidates','max-candidates'],['maxSceneChanges','max-scene-changes'],['maxMilliseconds','max-ms']].filter(([,key])=>args[key]!==undefined).map(([key,arg])=>[key,Number(args[arg])])));
 if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated test browser outside /Applications.');
 const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browser bundles are read-only.');
 const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
 const temporary=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-quality-'))),home=args.home?path.resolve(args.home):temporary;
 const routes=new Map(),server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||req.method!=='GET'||!routes.has(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(routes.get(req.url));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath,headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',deviceScaleFactor:1,hasTouch:true});
 const report={format:'deckweft-browser-quality',version:1,sourceTreeHash:await sourceTreeHash(),...(args.project?{projectFile:path.resolve(args.project),projectFileHash:hash(await readFile(path.resolve(args.project)))}:{}),browser:browser.version(),binaryHash:hash(await readFile(executablePath)),node:process.version,isolation:'Testing binary outside Applications, temporary context, loopback only; no installed browser/profile changes',budget,cases:[],faults:[],status:'running',errors:[],externalRequests:[]};
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('data:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
 const page=await context.newPage();let consoleEntries=[],errors=[];page.on('console',m=>consoleEntries.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>{errors.push(e.message);report.errors.push(e.message);});page.setDefaultTimeout(8000);
 async function load(project,name){const resources=await visualAssetResources(project,home),output=exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:resources});await writeFile(path.join(out,name+'.html'),output.body);routes.set('/'+name+'.html',output.body);await page.goto(origin+'/'+name+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);return output;}
 async function shot(file,locator=page){if(locator===page){await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}await locator.screenshot({path:path.join(out,file),animations:'disabled',...(locator===page?{fullPage:true}:{})});return {file,sha256:hash(await readFile(path.join(out,file)))};}
 async function action(sceneId,blockId,actionName,act,test){const before=await page.evaluate(()=>window.deckweftInteractions.snapshot());let error=null;try{await act();}catch(e){error=e.message;}const after=await page.evaluate(()=>window.deckweftInteractions.snapshot());const ok=!error&&await test();return {sceneId,blockId,action:actionName,before,after,ok,error};}
 async function exercise(project){const traces=[];
  for(const scene of project.plan.scenes)for(const spec of scene.interactions||[]){
   const root=page.locator('#'+scene.id+' [data-block-id="'+spec.blockId+'"]');
   if(spec.kind==='chart-select'){
    const block=project.document.blocks.find(b=>b.id===spec.blockId),data=project.document.datasets.find(d=>d.id===block.datasetId),category=data.categoryIds[Math.min(2,data.categoryIds.length-1)],remaining=data.categoryIds.length-data.categoryIds.indexOf(category);
    traces.push(await action(scene.id,spec.blockId,'select actual chart category '+category,()=>root.locator('[data-range="fromId"]').selectOption(category),async()=>{const state=await page.evaluate(id=>window.deckweftInteractions.snapshot().find(s=>s.sceneId===id).state,scene.id);return state.find(s=>s.id===spec.id||s.fromId===category)?.fromId===category&&await root.locator('.chart-current-view tbody tr').count()===remaining&&await root.locator('.full-source-data tbody tr').count()===data.categoryIds.length;}));
   }else if(spec.kind==='steps'){
    const step=spec.steps[Math.min(1,spec.steps.length-1)],note=project.document.explanations.find(e=>e.id===step.explanationId);
    traces.push(await action(scene.id,spec.blockId,'keyboard select explanation '+step.id,()=>root.locator('[data-step-id="'+step.id+'"]').press('Enter'),async()=>await root.locator('[data-step-id="'+step.id+'"]').getAttribute('aria-pressed')==='true'&&(await root.locator('.step-explanation').textContent()).includes(note.text)));
   }else if(spec.kind==='image-compare'){
    traces.push(await action(scene.id,spec.blockId,'touch first crop then keyboard second',async()=>{await root.locator('[data-tab-id="first"]').tap();await root.locator('[data-tab-id="first"]').press('ArrowRight');},async()=>await root.locator('.compare-panel').getAttribute('data-tab')==='second'&&await root.locator('.compare-panel .web-image:visible').count()===1));
   }else if(spec.kind==='image-hotspots'){
    const spot=spec.hotspots[0],control=page.locator('#'+scene.id+' [data-hotspot-id="'+spot.id+'"]'),note=project.document.blocks.find(b=>b.id===spot.annotationId);
    traces.push(await action(scene.id,spec.blockId,'touch reveal original-image context',()=>control.tap(),async()=>await control.getAttribute('aria-expanded')==='true'&&(await page.locator('#'+scene.id+' .hotspot-explanation').textContent()).includes(note.text)));
   }
  }
  const replayScene=project.plan.scenes.find(s=>s.cues?.length&&s.interactions?.some(i=>i.kind==='steps'));
  if(replayScene)traces.push(await action(replayScene.id,replayScene.interactions[0].blockId,'deterministic replay and seek',()=>page.evaluate(id=>{window.deckweftInteractions.replay(id);window.deckweftInteractions.seek(id,1);},replayScene.id),async()=>{const s=await page.evaluate(id=>window.deckweftInteractions.snapshot().find(s=>s.sceneId===id),replayScene.id);return s.position===1;}));
  return traces;
 }
 async function observe(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return page.evaluate(inspectRenderedPage);}
 const compact=o=>({...o,dom:undefined,domHash:hash(o.dom),scenes:o.scenes.map(s=>({...s,regions:s.regions.map(r=>({...r,images:r.images.map(i=>({...i,src:hash(i.src)}))}))}))});
 async function measure(p,name){await load(p,name);const o=await observe(),checks=checkRender(p,[o]);return {...checks,artifact:name+'.html'};}
 try{
  const fixtures=args.project?[{project:JSON.parse(await readFile(path.resolve(args.project),'utf8')),name:'project'}]:await Promise.all(['en','zh-CN'].flatMap(locale=>['cream-collage','dark-data','electric-violet'].map(async theme=>{const project=await createInteractionDemo(locale,home);for(const s of project.plan.scenes)if(s.interactions?.length)s.theme=theme;return {project,name:locale+'-'+theme};})));
  for(const {project:original,name}of fixtures){consoleEntries=[];errors=[];
   const initial=await measure(original,name+'-initial');if(!initial.ok){await shot(name+'-before-repair.png');if(!args.project&&name===fixtures[0].name)await shot('repair-before.png',page.locator('#component-stacked'));}
   const repair=await boundedRepair({project:original,initial,budget,lastValid:lastValid.get(name)||null,propose:async(p,issues)=>{const id=issues.find(i=>i.kind==='repeated-composition')?.sceneId;if(!id)return [];const scene=p.plan.scenes.find(s=>s.id===id);return compositions.filter(c=>c.family===inferFamily(p.document,scene)&&c.id!==scene.composition).map(c=>({sceneId:id,composition:c.id}));},evaluate:(p,meta)=>measure(p,name+'-repair-'+meta.candidate)});
   const requestedProject=original,project=repair.ok?repair.project:(repair.candidate?.project||original),output=await load(project,name);if(!args.project&&name===fixtures[0].name)await shot('repair-after.png',page.locator('#component-stacked'));await writeFile(path.join(out,name+'.html'),output.body);
   const observations=[],captures=[],traces=[];
   for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1000});await load(project,name);await page.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);observations.push(await observe());traces.push(...await exercise(project));observations.push(await observe());captures.push(await shot(name+'-'+width+'-explored.png'));if(!args.project&&width===1440)for(const id of ['component-line','image-comparison','violet'])captures.push(await shot(name+'-'+id+'-explored.png',page.locator('#'+id)));}
   await page.setViewportSize({width:1440,height:1000});await load(project,name);
   for(const scene of project.plan.scenes)captures.push(await shot(name+'-'+scene.id+'.png',page.locator('#'+scene.id)));
   const diagnostics={console:[...consoleEntries],errors:[...errors],externalRequests:[...report.externalRequests]},checks=checkRender(project,observations,{traces,...diagnostics,requireInteractions:true});
   // Sheet from actual native captures. It is a browsing aid, never the export representation.
   const sheet='<style>body{margin:0;padding:16px;font:18px system-ui;background:#ddd}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0;background:white}img{width:100%;display:block}</style><h1>'+escape(name)+'</h1><main>'+await Promise.all(project.plan.scenes.map(async s=>'<figure><figcaption>'+escape(s.id)+'</figcaption><img src="data:image/png;base64,'+(await readFile(path.join(out,name+'-'+s.id+'.png'))).toString('base64')+'"></figure>')).then(a=>a.join(''))+'</main>';
   await page.setViewportSize({width:1800,height:1000});await page.setContent(sheet);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));captures.push(await shot(name+'-contact.png'));
   const session=await context.newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');await load(project,name);const doc=await session.send('DOM.getDocument'),ids=await session.send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'.region h2,.semantic-code code,.chart svg text'}),platformFonts=[];for(const nodeId of ids.nodeIds)platformFonts.push(await session.send('CSS.getPlatformFontsForNode',{nodeId}));await session.detach();
   for(const c of captures)c.reviewRequired=/-contact\.png$|-1440-explored\.png$|-component-code\.png$|-component-line-explored\.png$|-image-comparison-explored\.png$|-violet-explored\.png$/.test(c.file);
   const observation={sourceTreeHash:report.sourceTreeHash,platformFonts,htmlHash:hash(output.body),browser:report.browser,observations:observations.map(compact),traces,diagnostics};
   const receipt=createQualityReceipt(project,observation,checks,captures);report.cases.push({name,project,requestedProject,lastValid:lastValid.get(name)||null,htmlHash:hash(output.body),observation,repair,receipt});
  }
  if(!args.project){
   const p=structuredClone(report.cases[0].project);for(const scene of p.plan.scenes)if(scene.id.startsWith('component-')&&p.document.blocks.some(b=>b.id===scene.id&&b.type==='chart'))scene.composition='evidence-top';await page.setViewportSize({width:1440,height:1000});await load(p,'faults');
   const originalObservation=await observe();
   await page.locator('#collage .region h2').evaluate(n=>{n.style.height='1px';n.style.overflow='hidden';});
   await page.locator('#component-code .region h2').evaluate(n=>{n.style.color='rgb(255,255,255)';n.style.background='rgb(255,255,255)';});
   await page.locator('#violet img').first().evaluate(n=>{n.src='data:image/png;base64,AA==';});
   await page.locator('[data-block-id="component-code"] [data-step-id="difference"]').evaluate(n=>n.addEventListener('click',e=>e.stopImmediatePropagation(),{capture:true}));
   const trace=await action('component-code','component-code','injected dead explanation button',()=>page.locator('[data-block-id="component-code"] [data-step-id="difference"]').click(),()=>page.locator('[data-block-id="component-code"] [data-step-id="difference"]').getAttribute('aria-pressed').then(v=>v==='true'));
   const faultObservation=await observe(),faults=checkRender(p,[faultObservation],{traces:[trace]});
   for(const kind of ['clipping','contrast','missing-asset','repeated-composition','broken-interaction'])assert.ok(faults.issues.some(i=>i.kind===kind),'Undetected injection: '+kind);
   const faultImages=[];for(const id of ['collage','component-code','violet'])faultImages.push(await shot('fault-'+id+'.png',page.locator('#'+id)));
   report.faults=faults;report.faultTrace=trace;report.receiptInvalidation={dom:contentHash(compact(originalObservation))!==contentHash(compact(faultObservation))};
   await page.setContent('<style>body{margin:0;font:20px system-ui}img{width:100%}</style><h1>Injected clipping / contrast + dead control / missing asset</h1>'+await Promise.all(faultImages.map(async i=>'<img src="data:image/png;base64,'+(await readFile(path.join(out,i.file))).toString('base64')+'">')).then(a=>a.join('')));await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await shot('faults-contact.png');
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.machineOk=report.cases.every(c=>c.receipt.checks.ok);report.status=report.machineOk?'awaiting-visual-review':'failed';report.ok=false;
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally{await browser.close();await new Promise(r=>server.close(r));await rm(temporary,{recursive:true,force:true});await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await gallery(report);}
 console.log(JSON.stringify({status:report.status,machineOk:report.machineOk,cases:report.cases.map(c=>({name:c.name,issues:c.receipt.checks.issues,repair:c.repair.spent})),failure:report.failure,out},null,2));if(!report.machineOk)process.exitCode=1;
}
if(args.serve){const server=http.createServer(async(req,res)=>{try{if(req.headers.host!==`127.0.0.1:${server.address().port}`||req.method!=='GET')throw Error();const name=req.url==='/'?'index.html':req.url.slice(1);if(!/^(?:accepted\/[a-f0-9]{64}\/)?[a-zA-Z0-9_.-]+$/.test(name))throw Error();const bytes=await readFile(path.join(out,name));res.writeHead(200,{'Content-Type':name.endsWith('.png')?'image/png':name.endsWith('.json')?'application/json':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1',()=>console.log(`Quality review: http://127.0.0.1:${server.address().port}/`));process.once('SIGINT',()=>server.close());process.once('SIGTERM',()=>server.close());}
