// Real geometry regression for the VIS-012 review blockers; isolated QA browser only.
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import {mkdir,realpath,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
const out=path.resolve('dist/responsive-components');await mkdir(out,{recursive:true});
const executablePath=await realpath(process.env.CHROMIUM_PATH||'');assert.ok(!/\/Applications\//i.test(executablePath));
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),routes=new Map(),errors=[],external=[];
const server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||!routes.has(req.url)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(routes.get(req.url));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({executablePath,headless:true}),page=await browser.newPage();
page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')?r.continue():(external.push(r.request().url()),r.abort()));
const report={browser:browser.version(),cases:[],errors,external};
try{
 for(const locale of ['en','zh-CN']){
  const project=await createCompositionDemo(locale,out),original=structuredClone(project),resources=await visualAssetResources(project,out),artifact=exportDeck(project.document,'html',{plan:project.plan,experimentalWeb:true,assetResources:resources});routes.set('/'+locale,artifact.body);await page.goto(origin+'/'+locale);await page.waitForFunction(()=>document.body.dataset.ready==='true');
  for(const width of [1440,390,320,700,701,390,1440]){
   await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);
   const result=await page.evaluate(()=>({fit:window.deckweftFit,components:[...document.querySelectorAll('[data-compact-chart],[data-responsive-diagram]')].map(svg=>{const box=svg.getBoundingClientRect(),scroller=svg.parentElement;return {viewBox:svg.getAttribute('viewBox'),width:box.width,scrollWidth:scroller.scrollWidth,clientWidth:scroller.clientWidth,ids:[...svg.querySelectorAll('[id]')].map(e=>e.id),labels:[...svg.querySelectorAll('text')].map(t=>{const b=t.getBoundingClientRect();return {text:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height};})};})}));
   assert.equal(result.fit.ok,true,JSON.stringify(result.fit.checks.flatMap(s=>s.clipIssues)));
   assert.equal(result.components.length,2);for(const c of result.components){assert.equal(c.scrollWidth,c.clientWidth);assert.equal(new Set(c.ids).size,c.ids.length);}
   const diagram=result.components[1];assert.equal(diagram.viewBox.startsWith('0 0 360 '),width<=700);
   if(width<=700){const labels=result.components[0].labels;for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`Overlapping exact values: ${a.text}/${b.text}`);}}
   report.cases.push({locale,width,components:result.components});
   if(width===390||width===1440)for(const id of ['evidence','process'])await page.locator('#'+id).screenshot({path:path.join(out,`${locale}-${width}-${id}.png`)});
  }
  const clipping=await page.evaluate(()=>{const svg=document.querySelector('[data-responsive-diagram]'),node=svg.querySelector('g[data-object-id]'),before=node.getAttribute('transform');node.setAttribute('transform','translate(5000 0)');const issues=window.deckweftAuditScene(svg.closest('.web-scene')).clipIssues;node.setAttribute('transform',before);return issues;});assert.ok(clipping.some(i=>i.reason==='Text outside component viewBox'),'Transformed text outside the viewBox must still be rejected');
  assert.deepEqual(project,original);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.ok=true;
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({ok:report.ok,cases:report.cases.length,out}));
