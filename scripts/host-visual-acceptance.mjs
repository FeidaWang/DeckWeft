// Explicit real-host/browser QA. Optional browser tooling is never a runtime dependency.
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {parseArgs} from 'node:util';
import {mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {buildPlugin} from '../src/plugin/packager.mjs';
import {rejectSymlinks} from '../src/services/io.mjs';
const {values:a}=parseArgs({options:{host:{type:'string'},live:{type:'boolean'},out:{type:'string'},case:{type:'string',default:'gallery'},help:{type:'boolean'}}});
if(a.help){console.log('Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/qa/playwright-core/index.mjs npm run host:visual -- --host codex|claude-code --live --out dist/host-visual-NEW [--case gallery|drafted]\nRuns the selected existing host for drafting, real captured-image review, scoped revision and reviewed HTML export from an isolated bundled runtime. No login, provider fallback, desktop certification or global installation. Existing host configuration may consume its allowance.');process.exit(0);}
if(!['gallery','drafted'].includes(a.case))throw Error('Use --case gallery (supplied diagnostic gallery, the VIS-012 run) or --case drafted (the host-drafted deck itself is reviewed, exported and revised; VIS-014).');
if(!a.live||!['codex','claude-code'].includes(a.host)||!a.out)throw Error('Choose --host, --live and a new --out folder. Claude must only be selected when separately authorized.');
const binary=await realpath(process.env.CHROMIUM_PATH||'');if(/\/Applications\//i.test(binary)||/\/Applications\//i.test(process.env.CHROMIUM_PATH))throw Error('Use an isolated QA browser outside Applications.');
const out=path.resolve(a.out);await rejectSymlinks(out);await mkdir(path.dirname(out),{recursive:true});await mkdir(out);const work=path.join(out,'work');await mkdir(work);
const bundle=await buildPlugin(path.join(out,'bundle')),runtime=path.join(bundle.directory,'runtime'),load=rel=>import(pathToFileURL(path.join(runtime,rel)));
const {draftWithHost,patchWithHost,runHostVisualTask}=await load('src/hosts/tasks.mjs'),{probeHost}=await load('src/hosts/capabilities.mjs'),{inspectRenderedPage}=await load('src/quality/render-checks.mjs');
const {createVisualTask}=await load('src/agent/director.mjs'),{executeVisualTool}=await load('src/agent/tools.mjs'),{createCompositionDemo}=await load('src/core/composition-demo.mjs'),{compositions,inferFamily}=await load('src/design/compositions.mjs');
const capabilities=await probeHost({host:a.host,cwd:work,authentication:true});await writeFile(path.join(out,'capabilities.json'),JSON.stringify(capabilities,null,2));
if(capabilities.authentication.status!=='available')throw Error('Existing host authentication was not proven available; no login was attempted.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),routes=new Map(),errors=[],external=[];
const server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||req.method!=='GET'||!routes.has(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(routes.get(req.url));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,task,serial=0;const sha=b=>createHash('sha256').update(b).digest('hex'),options={host:a.host,cwd:work,home:work,capabilities,live:true,timeout:120000};
const report={format:'deckweft-real-host-visual-acceptance',version:1,host:a.host,browser:null,case:a.case,scope:a.case==='drafted'?'Copied bundle: the host drafts a deck from a prompt, reviews its actual captures, exports it, then revises one page and exports again; not native desktop/plugin discovery':'Copied bundle CLI drafting plus supplied synthetic diagnostic gallery; not native desktop/plugin discovery or VIS-014 story release',ok:false,runs:[],errors,externalRequests:external};
const checkpoint=async t=>{task=t;await writeFile(path.join(work,'task.json'),JSON.stringify(t,null,2));};
try{
 browser=await chromium.launch({executablePath:binary,headless:true});report.browser=browser.version();const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')?r.continue():(external.push(r.request().url()),r.abort()));
 const capture=async({project,html,htmlHash})=>{
  const stem='capture-'+(++serial);routes.set('/'+stem,html);await page.goto(origin+'/'+stem);await page.waitForFunction(()=>document.body.dataset.ready==='true');const observations=[],captures=[];
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit.viewport.width===w,width);await page.evaluate(()=>document.fonts.ready);observations.push(await page.evaluate(inspectRenderedPage));const file=stem+'-'+width+'.png';await page.screenshot({path:path.join(work,file),fullPage:true,animations:'disabled'});captures.push({file,sha256:sha(await readFile(path.join(work,file))),reviewRequired:true});
   if(width===390)for(const [index,scene] of project.plan.scenes.entries()){
    const result=await page.locator('#'+scene.id).evaluate(element=>{const rows=[...element.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+5&&['auto','scroll'].includes(getComputedStyle(e).overflowX));return rows.map(e=>{const before=e.scrollLeft;e.scrollLeft=e.scrollWidth;return {before,after:e.scrollLeft,end:Math.abs(e.scrollWidth-e.clientWidth-e.scrollLeft)<2};});});
    if(['evidence','process'].includes(scene.id)){const file=stem+'-mobile-scene-'+(index+1)+'.png';await page.locator('#'+scene.id).screenshot({path:path.join(work,file),animations:'disabled'});captures.push({file,sha256:sha(await readFile(path.join(work,file))),reviewRequired:true});}
    if(result.length){assert.ok(result.every(r=>r.end));const file=stem+'-mobile-scroll-end-'+(index+1)+'.png';await page.locator('#'+scene.id).screenshot({path:path.join(work,file),animations:'disabled'});captures.push({file,sha256:sha(await readFile(path.join(work,file))),reviewRequired:true});await page.locator('#'+scene.id).evaluate(e=>{for(const node of e.querySelectorAll('*'))node.scrollLeft=0;});}
   }
  }
  await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>window.deckweftFit.viewport.width===1440);
  for(const [index,s] of project.plan.scenes.entries()){const file=stem+'-scene-'+(index+1)+'.png';await page.locator('#'+s.id).screenshot({path:path.join(work,file),animations:'disabled'});captures.push({file,sha256:sha(await readFile(path.join(work,file))),reviewRequired:true});}
  return {htmlHash,browser:browser.version(),delivery:'Actual isolated browser pixels supplied to selected host CLI',observations,captures,diagnostics:{errors:[...errors],externalRequests:[...external]},traces:[]};
 };
 const sourceText='Paper workshop\nThis is a fictional local club exercise about folding a paper model.\n---\nChoose a shape\nUse a simple design and keep the instructions beside the paper.\n---\nFold and compare\nFollow one crease at a time, then compare the model with the instructions.\n---\nInspect the model\nCheck the folds and note where a step needs a clearer explanation.\n---\nKeep a record\nSave the instructions and the observations for the next workshop.';
 const brief={request:'Arrange the supplied fictional workshop into five readable pages. Keep every supplied line exactly.',sourceText,locale:'en'};
 const drafted=await draftWithHost(brief,options);assert.equal(drafted.ok,true,JSON.stringify(drafted.receipt));report.draftReceipt=drafted.receipt;let draftTask=drafted.task;for(const tool of ['content.inspect','design.propose','assets.resolve','render.preview']){const r=await executeVisualTool(draftTask,tool,{expectedSequence:draftTask.sequence},{home:work});assert.equal(r.ok,true);draftTask=r.task;if(r.value?.html)await writeFile(path.join(out,'draft-preview.html'),r.value.html);}await writeFile(path.join(out,'draft-task.json'),JSON.stringify(draftTask,null,2));
 if(a.case==='drafted'){
  // VIS-014: the artifact that the prompt produced is the one reviewed, exported, revised in scope and exported again.
  await checkpoint(draftTask);let completed=await runHostVisualTask(task,{...options,capture,checkpoint});assert.equal(completed.ok,true,JSON.stringify({required:completed.required,status:completed.task.status,diagnostics:completed.task.diagnostics}));
  await writeFile(path.join(out,'before.html'),completed.artifact.body);report.runs.push({stage:'before',receipt:task.receipt,htmlHash:completed.artifact.htmlHash});
  const previous=structuredClone(task.project),index=Math.min(2,previous.plan.scenes.length-1),scene=previous.plan.scenes[index],family=compositions.find(c=>c.id===scene.composition)?.family||inferFamily(previous.document,scene);
  const targetComposition=compositions.find(c=>c.family===family&&c.id!==scene.composition).id;task.scope=[scene.id];await checkpoint(task);
  const patched=await patchWithHost(task,'Make page '+(index+1)+' use '+targetComposition+'. Keep every word, color, source and other page exactly unchanged.',options);assert.equal(patched.ok,true,JSON.stringify(patched.error));assert.deepEqual(patched.task.project.document,previous.document);assert.equal(patched.task.project.plan.scenes[index].composition,targetComposition);await checkpoint(patched.task);
  completed=await runHostVisualTask(task,{...options,capture,checkpoint});assert.equal(completed.ok,true,JSON.stringify({required:completed.required,status:completed.task.status,diagnostics:completed.task.diagnostics}));
  assert.equal(task.project.plan.scenes[index].composition,targetComposition,'The requested distinct revision must survive review and repair');assert.deepEqual(task.project.assets,previous.assets);
  assert.notEqual(completed.artifact.htmlHash,report.runs[0].htmlHash,'Revision must change final HTML, not only sequence metadata');assert.deepEqual(task.project.document,previous.document);for(const [i,s] of previous.plan.scenes.entries())if(i!==index)assert.deepEqual(task.project.plan.scenes[i],s);
  await writeFile(path.join(out,'after.html'),completed.artifact.body);report.runs.push({stage:'after',receipt:task.receipt,htmlHash:completed.artifact.htmlHash});report.revision={page:index+1,sceneId:scene.id,from:scene.composition,to:targetComposition};
 }else{
  const supplied=await createCompositionDemo('en',work,{id:'host-adapter-gallery'});await checkpoint(createVisualTask({project:supplied,request:'Review this intentionally mixed-theme, six-family synthetic diagnostic gallery. Preserve exact supplied content, data and sources.'}));
  let completed=await runHostVisualTask(task,{...options,capture,checkpoint});assert.equal(completed.ok,true,JSON.stringify({required:completed.required,status:completed.task.status,diagnostics:completed.task.diagnostics}));
  await writeFile(path.join(out,'before.html'),completed.artifact.body);report.runs.push({stage:'before',receipt:task.receipt,htmlHash:completed.artifact.htmlHash});
  const previous=structuredClone(task.project);task.scope=[task.project.plan.scenes[3].id];await checkpoint(task);
  const targetComposition=previous.plan.scenes[3].composition==='evidence-top'?'evidence-right':'evidence-top';
  const patched=await patchWithHost(task,'Make page 4 use '+targetComposition+'. Keep every word, color, source and other page exactly unchanged.',options);assert.equal(patched.ok,true,JSON.stringify(patched.error));assert.deepEqual(patched.task.project.document,previous.document);for(const [index,s] of previous.plan.scenes.entries())if(index!==3)assert.deepEqual(patched.task.project.plan.scenes[index],s);assert.equal(patched.task.project.plan.scenes[3].composition,targetComposition);assert.notEqual(patched.task.project.plan.scenes[3].composition,previous.plan.scenes[3].composition);report.patchReceipt=patched.receipt;await checkpoint(patched.task);
  completed=await runHostVisualTask(task,{...options,capture,checkpoint});assert.equal(completed.ok,true,JSON.stringify({required:completed.required,status:completed.task.status,diagnostics:completed.task.diagnostics}));
  assert.equal(task.project.plan.scenes[3].composition,targetComposition,'Repair must retain the requested distinct revision');assert.deepEqual(task.project.assets,previous.assets);
  assert.notEqual(completed.artifact.htmlHash,report.runs[0].htmlHash,'Revision must change final HTML, not only sequence metadata');assert.deepEqual(task.project.document,previous.document);for(const [index,s] of previous.plan.scenes.entries())if(index!==3)assert.deepEqual(task.project.plan.scenes[index],s);
  await writeFile(path.join(out,'after.html'),completed.artifact.body);report.runs.push({stage:'after',receipt:task.receipt,htmlHash:completed.artifact.htmlHash});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.ok=true;report.exactScope=a.case==='drafted'?'Only page '+report.revision.page+' composition changed; semantic document and all other scenes byte-equivalent':'Only page 4 composition changed; semantic document and all other scenes byte-equivalent';report.hostReceipts=await (await import('node:fs/promises')).readdir(path.join(work,'.deckweft-host-runs'));
}catch(e){report.failure=e.code||e.message;throw e;}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({out,host:a.host,ok:report.ok,browser:report.browser,exports:report.runs.length}));
