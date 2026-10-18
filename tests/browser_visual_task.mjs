// Real local shared-tool integration. Optional QA dependencies, never runtime imports.
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createVisualTask} from '../src/agent/director.mjs';
import {executeVisualTool} from '../src/agent/tools.mjs';
import {inspectRenderedPage} from '../src/quality/render-checks.mjs';
const out=path.resolve('dist/visual-task'),shots=path.resolve('dist/visual-task/browser-captures');await mkdir(out,{recursive:true});await mkdir(shots,{recursive:true});
const executablePath=await realpath(process.env.CHROMIUM_PATH||'');if(/\/Applications\//i.test(executablePath)||/\/Applications\//i.test(process.env.CHROMIUM_PATH))throw Error('Use an isolated testing browser outside Applications.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),routes=new Map();
const server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||!routes.has(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(routes.get(req.url));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath,headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')?r.continue():(external.push(r.request().url()),r.abort()));
const sha=b=>createHash('sha256').update(b).digest('hex');let serial=0,label='story';
async function capture({project,html,htmlHash,signal}){
 if(signal?.aborted)throw Error('Capture cancelled');
 const key=label+'-'+(++serial);routes.set('/'+key+'.html',html);await writeFile(path.join(out,key+'.html'),html);await page.goto(origin+'/'+key+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const observations=[],captures=[];
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit.viewport.width===w,width);await page.evaluate(()=>document.fonts.ready);observations.push(await page.evaluate(inspectRenderedPage));const file=key+'-'+width+'.png';await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(shots,file),fullPage:true,animations:'disabled'});await writeFile(path.join(out,file),await readFile(path.join(shots,file)));captures.push({file,sha256:sha(await readFile(path.join(out,file))),reviewRequired:true});}
 await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>window.deckweftFit.viewport.width===1440);
 const scene=project.plan.scenes[Math.min(3,project.plan.scenes.length-1)],file=key+'-scene4.png';await page.locator('#'+scene.id).screenshot({path:path.join(shots,file),animations:'disabled'});await writeFile(path.join(out,file),await readFile(path.join(shots,file)));captures.push({file,sha256:sha(await readFile(path.join(out,file))),reviewRequired:true});
 return {htmlHash,browser:browser.version(),delivery:'Actual isolated Chromium DOM, font-ready screenshots; actual image attestation still required',observations,captures,diagnostics:{errors:[...errors],externalRequests:[...external]},traces:[]};
}
async function run(task,name,args={}){const r=await executeVisualTool(task,name,{expectedSequence:task.sequence,...args},{home:out,capture});assert.equal(r.ok,true,JSON.stringify(r.error));return r;}
async function prepare(task){for(const n of ['content.inspect','design.propose','assets.resolve','render.preview'])task=(await run(task,n)).task;return task;}
const request='Local-first presentation planning\nBuild a story from supplied facts and keep original evidence.\n---\nPlan before compiling\nChoose scene roles, focal points and candidate compositions.\n---\nInspect the real result\nWait for fonts and inspect actual image captures.\n---\nExact supplied example\nThese are illustrative local fixture values, not a business claim.\n---\nKeep a recovery path\nExport the reviewed result and retain a checkpoint.';
let report={format:'deckweft-visual-task-browser',browser:browser.version(),runtime:'real local shared-tool orchestration; no host/model invocation',ok:false};
try{
 let task=createVisualTask({request});const source=JSON.parse(await readFile(new URL('../examples/visual-demo.en.json',import.meta.url),'utf8'));task.project.document.datasets=structuredClone(source.document.datasets);task.project.document.sources=structuredClone(source.document.sources);task.original=structuredClone(task.project);
 task=await prepare(task);let r=await run(task,'render.inspect');task=r.task;await writeFile(path.join(out,'before.task.json'),JSON.stringify(task,null,2));report.before={status:task.status,receipt:task.receipt,htmlHash:task.previewHash};assert.equal(task.receipt.checks.ok,true);
 // Exact page-4 request; explicit original dataset selection, no prose parsing.
 const before=structuredClone(task.project);r=await run(task,'design.patch',{request:'把第 4 页改成图表，保持原文和颜色',datasetId:source.document.datasets[0].id});task=r.task;
 assert.deepEqual(task.project.document.blocks.slice(0,before.document.blocks.length),before.document.blocks);assert.deepEqual(task.project.document.datasets,before.document.datasets);assert.deepEqual(task.project.document.sources,before.document.sources);assert.deepEqual(task.project.plan.scenes.filter((_,i)=>i!==3),before.plan.scenes.filter((_,i)=>i!==3));for(const k of ['theme','colorMode','focalBlockId'])assert.equal(task.project.plan.scenes[3][k],before.plan.scenes[3][k]);
 label='revision';task=await prepare(task);r=await run(task,'render.inspect');task=r.task;assert.equal(task.receipt.checks.ok,true,JSON.stringify(task.receipt.checks.issues));report.after={status:task.status,receipt:task.receipt,htmlHash:task.previewHash};await writeFile(path.join(out,'after.task.json'),JSON.stringify(task,null,2));
 const noData=createVisualTask({request,project:before});const missing=await executeVisualTool(noData,'design.patch',{expectedSequence:0,request:'make slide 4 a chart'},{home:out});assert.equal(missing.error.code,'DATA_REQUIRED');await writeFile(path.join(out,'missing-data.task.json'),JSON.stringify(missing.task,null,2));
 const repeated=structuredClone(before);for(const s of repeated.plan.scenes)s.composition='statement-split';const locked=structuredClone(repeated);locked.document.authorOverrides.sceneLocks=locked.plan.scenes.map(s=>({sceneId:s.id,fields:['composition']}));
 label='bounded-repair';let repair=await prepare(createVisualTask({request,project:repeated}));repair=(await run(repair,'render.inspect',{repair:true})).task;assert.equal(repair.receipt.checks.ok,true);assert.ok(repair.repairSpent.rounds<=2);report.repair={status:repair.status,spent:repair.repairSpent,attempts:repair.repair.attempts,receipt:repair.receipt};await writeFile(path.join(out,'repair.task.json'),JSON.stringify(repair,null,2));
 label='locked-recovery';let failed=await prepare(createVisualTask({request,project:locked}));failed=(await run(failed,'render.inspect',{repair:true})).task;assert.equal(failed.status,'repair-exhausted');assert.equal(failed.repairSpent.rounds,2);assert.ok(failed.repair.attempts.every(a=>a.status==='rejected'));assert.deepEqual(failed.project,locked);report.failure={status:failed.status,spent:failed.repairSpent,attempts:failed.repair.attempts,receipt:failed.receipt};await writeFile(path.join(out,'failure.task.json'),JSON.stringify(failed,null,2));
 // Never infer an image judgment here; --review is a separate operation after pixel delivery.
 report.ok=true;report.checks=['Natural supplied story rendered at desktop/mobile','Page 4 only: exact typed data, words, colors, sources and identities preserved','Missing data refused without fabricated chart','Actual browser quality failure repaired within default budget','Locked failure retained after two rounds'];
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{report.errors=errors;report.externalRequests=external;await browser.close();await new Promise(r=>server.close(r));await writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:report.ok,statuses:[report.before?.status,report.after?.status,report.repair?.status,report.failure?.status],failure:typeof report.failure==='string'?report.failure:undefined,shots,out},null,2));}
