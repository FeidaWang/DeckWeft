// Actual failed rerun after a pixel-reviewed accepted export. No simulated evaluator.
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createVisualTask} from '../src/agent/director.mjs';
import {runVisualTask} from '../src/agent/tools.mjs';
import {inspectRenderedPage} from '../src/quality/render-checks.mjs';
const out=path.resolve('dist/visual-task'),accepted=JSON.parse(await readFile(path.join(out,'after.task.json'),'utf8'));assert.equal(accepted.status,'exported');
const binary=await realpath(process.env.CHROMIUM_PATH);if(/\/Applications\//i.test(binary)||/\/Applications\//i.test(process.env.CHROMIUM_PATH))throw Error('Use an isolated test browser.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),browser=await chromium.launch({executablePath:binary,headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});let html='';const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
const server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')?r.continue():(external.push(r.request().url()),r.abort()));
try{
 const p=structuredClone(accepted.project);for(const s of p.plan.scenes)s.composition='statement-split';p.document.authorOverrides.sceneLocks=p.plan.scenes.map(s=>({sceneId:s.id,fields:['composition']}));const task=createVisualTask({request:accepted.request,project:p});task.lastValid=structuredClone(accepted.lastValid);let captures=0;
 const result=await runVisualTask(task,{home:out,checkpoint:async t=>writeFile(path.join(out,'recovery.task.json'),JSON.stringify(t,null,2)),capture:async({html:body,htmlHash})=>{captures++;html=body;await page.goto(origin+'/failure');await page.waitForFunction(()=>document.body.dataset.ready==='true');const observation=await page.evaluate(inspectRenderedPage),file='accepted-recovery-failure.png';await page.screenshot({path:path.join(out,file),fullPage:true});return {htmlHash,delivery:'Actual isolated browser failure rerun following accepted export',observations:[observation],captures:[{file,sha256:createHash('sha256').update(await readFile(path.join(out,file))).digest('hex')}],diagnostics:{errors,externalRequests:external}};}});
 assert.equal(result.ok,false);assert.equal(result.task.status,'repair-exhausted');assert.equal(result.task.repairSpent.rounds,2);assert.equal(captures,1,'Locked candidates cannot reach capture');assert.equal(result.task.lastValid.artifact,await readFile(path.join(out,'after.html'),'utf8'));assert.equal(result.task.lastValid.htmlHash,accepted.lastValid.htmlHash);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await writeFile(path.join(out,'accepted-recovery.json'),JSON.stringify({ok:true,captures,browser:browser.version(),status:result.task.status,spent:result.task.repairSpent,attempts:result.task.repair.attempts,lastValidHash:result.task.lastValid.htmlHash,checks:['Actual failed rerun after accepted export','Both rounds reject locked candidates before rendering','Previous accepted source and HTML bytes retained'],errors,external},null,2));console.log('Actual accepted-artifact recovery passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
