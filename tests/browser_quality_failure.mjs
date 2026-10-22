// Optional real-browser failure/recovery probe. Never mutates the library or installed apps.
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import {mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {inspectRenderedPage,checkRender} from '../src/quality/render-checks.mjs';
import {createQualityReceipt,receiptCurrent} from '../src/quality/visual-review.mjs';
import {boundedRepair} from '../src/quality/repair-plan.mjs';
const executablePath=await realpath(process.env.CHROMIUM_PATH||'');if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Use an isolated testing binary outside Applications.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module),out=path.resolve('dist/visual-quality');
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-quality-recovery-'))),routes=new Map(),server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||!routes.has(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html'});res.end(routes.get(req.url));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath,headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(external.push(r.request().url()),r.abort()));
let report={ok:false,browser:browser.version()};
try{
 const original=await createInteractionDemo('en',home),p=structuredClone(original);p.plan.scenes.find(s=>s.id==='component-stacked').composition='evidence-left';
 const resources=await visualAssetResources(p,home);
 async function measure(project,name){const output=exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:resources});routes.set('/'+name+'.html',output.body);await page.goto(origin+'/'+name+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');const observation=await page.evaluate(inspectRenderedPage);return {observation,checks:checkRender(project,[observation]),output};}
 const good=await measure(p,'good');assert.equal(good.checks.ok,true);await writeFile(path.join(out,'recovery-last-valid.html'),good.output.body);
 const receipt=createQualityReceipt(p,good.observation,good.checks,[{file:'native.png',sha256:'probe'}]);
 await page.evaluate(()=>window.deckweftInteractions.dispatch('component-code',{event:'step.select',interactionId:'explain-code',stepId:'difference'}));const changed=await page.evaluate(inspectRenderedPage);assert.equal(receiptCurrent(receipt,p,changed),false);
 const locked=structuredClone(original);for(const s of locked.plan.scenes.filter(s=>s.id.startsWith('component-')&&s.composition==='evidence-top')){const lock=locked.document.authorOverrides.sceneLocks.find(l=>l.sceneId===s.id);if(lock)lock.fields.push('composition');else locked.document.authorOverrides.sceneLocks.push({sceneId:s.id,fields:['composition']});}
 const failed=await measure(locked,'locked');assert.equal(failed.checks.ok,false);await writeFile(path.join(out,'recovery-incomplete-candidate.html'),failed.output.body);await page.screenshot({path:path.join(out,'recovery-incomplete-candidate.png'),fullPage:true});
 const result=await boundedRepair({project:locked,initial:failed.checks,lastValid:{project:p,artifact:'recovery-last-valid.html'},propose:async(project,issues)=>issues.filter(i=>i.kind==='repeated-composition').map(i=>({sceneId:i.sceneId,composition:'evidence-left'})),evaluate:async()=>{throw Error('Locked candidate must never reach evaluation');}});
 assert.equal(result.ok,false);assert.equal(result.artifact,'recovery-last-valid.html');assert.ok(result.candidate);assert.ok(result.attempts.every(a=>a.status==='rejected'&&a.reason.includes('Unlock')));assert.deepEqual(result.project,p);assert.equal(await readFile(path.join(out,'recovery-last-valid.html'),'utf8'),good.output.body);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 report={ok:true,browser:browser.version(),checks:['Actual semantic interaction invalidates prior receipt','Browser detects locked repeated layout','Both rounds refuse author-locked changes','Last valid HTML remains byte-identical','Incomplete source and HTML remain available'],failure:result,errors,external};
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await new Promise(r=>server.close(r));await rm(home,{recursive:true,force:true});await writeFile(path.join(out,'failure-recovery.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,checks:report.checks,failure:typeof report.failure==='string'?report.failure:undefined},null,2));
