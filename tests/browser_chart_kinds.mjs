// S4 chart kinds in a real, isolated browser: every new kind and S1 declaration, both languages, 1440 / 1024 / 390 px, with and without JavaScript, in grayscale, and through the Studio measurement gate.
// CHROMIUM_PATH=/isolated/chrome-for-testing PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_chart_kinds.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {startStudio} from '../src/services/server.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {chartKindsProject,CHART_KIND_SCENES} from './chart-kinds.mjs';
if(!process.env.CHROMIUM_PATH||!process.env.PLAYWRIGHT_MODULE)throw Error('Set CHROMIUM_PATH (isolated testing binary outside Applications) and PLAYWRIGHT_MODULE.');
const binary=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(binary)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),out=path.resolve(process.env.DECKWEFT_EVIDENCE_OUT||'dist/chart-kinds');await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s4-kinds-'))),app=await startStudio({home,port:0});
const browser=await chromium.launch({executablePath:binary,headless:true}),hash=b=>createHash('sha256').update(b).digest('hex');
const report={step:'S4 chart renderer',browser:browser.version(),binary:'isolated Chrome for Testing outside /Applications; Playwright temporary profile per context',scenes:CHART_KIND_SCENES,views:[],parity:[],gate:[],captures:[],errors:[],external:[]};
async function context(options={}){const c=await browser.newContext({deviceScaleFactor:1,...options});await c.route('**/*',r=>{const url=r.request().url();if(url.startsWith(app.url+'/')||/^(data|blob|file):/.test(url))return r.continue();report.external.push(url);return r.abort();});return c;}
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>Promise.all(document.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));}
async function capture(target,name,{settled=true}={}){const page=target.page?target.page():target;await target.scrollIntoViewIfNeeded?.();if(settled)await settle(page);const file=path.join(out,name);await target.screenshot({path:file,animations:'disabled'});report.captures.push({file:name,sha256:hash(await readFile(file))});}
async function ready(page,url){await page.goto(url);await page.waitForFunction(()=>['true','failed'].includes(document.body.dataset.ready));assert.equal(await page.evaluate(()=>document.body.dataset.ready),'true','the player did not finish measuring');}
/** Every label a chart marks as needed for its conclusion: visible, inside the viewport and every scroller, and not under another such label. */
const labels=page=>page.evaluate(()=>{const vw=document.documentElement.clientWidth;return [...document.querySelectorAll('.web-scene')].map(scene=>{const nodes=[...scene.querySelectorAll('.chart [data-conclusion-label]')].filter(n=>!n.closest('details:not([open])'));const hidden=nodes.filter(n=>{const r=n.getBoundingClientRect();if(!r.width||!r.height)return true;if(r.left<-1||r.right>vw+1)return true;for(let p=n.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(s.overflowX==='visible'&&s.overflowY==='visible')continue;const b=p.getBoundingClientRect();if(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1)return true;}return false;}).map(n=>n.textContent);const scrollers=[...scene.querySelectorAll('.chart *')].filter(n=>['auto','scroll'].includes(getComputedStyle(n).overflowX)&&n.scrollWidth>n.clientWidth+1&&n.querySelector('[data-conclusion-label]')).length;return {sceneId:scene.id,labels:nodes.length,hidden,scrollers};});});
try{
 for(const locale of ['en','zh-CN']){
  const project=chartKindsProject(locale),body=exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan}).body,file=path.join(out,`${locale}-chart-kinds.html`);await writeFile(file,body);const url=pathToFileURL(file).href;
  for(const width of [1440,1024,390]){
   const page=await (await context({viewport:{width,height:1000}})).newPage();page.on('pageerror',e=>report.errors.push(`${locale} ${width}: ${e.message}`));await ready(page,url);
   const fit=await page.evaluate(()=>window.deckweftFit),seen=await labels(page);
   assert.equal(fit.ok,true,JSON.stringify(fit.checks.filter(c=>c.clipIssues.length||c.overflow.length||c.contrastIssues.length||c.text.some(t=>!t.inside))));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no page-level horizontal scroll');
   for(const s of seen){assert.deepEqual(s.hidden,[],`${locale} ${width} ${s.sceneId}`);assert.equal(s.scrollers,0,`${locale} ${width} ${s.sceneId}`);}
   report.views.push({locale,width,javascript:true,fit:fit.ok,conclusionLabels:seen.reduce((n,s)=>n+s.labels,0),hidden:0,scrollersWithConclusionLabels:0,minTextPixels:Math.min(...fit.checks.flatMap(c=>c.components.map(x=>x.minTextPixels)))});
   for(const id of CHART_KIND_SCENES)await capture(page.locator('#'+id),`${locale}-${width}-${id}.png`);
   if(width===1440){
    // Black-and-white (Chromium's achromatopsia emulation): the main series stay apart by dash, shape, focus outline or a direct name.
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'achromatopsia'});for(const id of ['grouped','dot-interval','trend','small-multiples','direct-bar','benchmark'])await capture(page.locator('#'+id),`${locale}-grayscale-${id}.png`);
   }
   await page.context().close();
   const noJS=await (await context({viewport:{width,height:1000},javaScriptEnabled:false})).newPage();await noJS.goto(url);
   const still=await labels(noJS);for(const s of still){assert.deepEqual(s.hidden,[],`no-JS ${locale} ${width} ${s.sceneId}`);assert.equal(s.scrollers,0);}
   report.views.push({locale,width,javascript:false,conclusionLabels:still.reduce((n,s)=>n+s.labels,0),hidden:0});
   if(width!==1024)for(const id of CHART_KIND_SCENES)await capture(noJS.locator('#'+id),`${locale}-${width}-nojs-${id}.png`,{settled:false});
   await noJS.context().close();
  }
  // C19: the frozen filter-sort chart has the same size and marks with and without JavaScript.
  for(const width of [1440,390]){
   const sizes={};for(const js of [true,false]){const page=await (await context({viewport:{width,height:1000},javaScriptEnabled:js})).newPage();if(js)await ready(page,url);else await page.goto(url);sizes[js?'js':'nojs']=await page.evaluate(()=>{const rows=document.querySelector('#filter-sort .chart-rows'),b=rows.getBoundingClientRect(),p=rows.closest('.region').getBoundingClientRect();return {rows:[Math.round(b.width),Math.round(b.height)],region:Math.round(p.width),marks:[...rows.querySelectorAll('.chart-row')].map(r=>r.dataset.categoryId+' '+r.querySelector('.chart-value').textContent),statement:document.querySelector('#filter-sort .static-state-note').textContent};});await page.context().close();}
   assert.deepEqual(sizes.js.marks,sizes.nojs.marks);assert.equal(sizes.js.statement,sizes.nojs.statement);assert.equal(sizes.js.rows[1],sizes.nojs.rows[1]);if(sizes.js.region===sizes.nojs.region)assert.equal(sizes.js.rows[0],sizes.nojs.rows[0]);
   report.parity.push({locale,width,...sizes});
  }
  // The Studio gate: a measured preview passes; the same preview with a conclusion label pushed into a scroller is refused.
  const token=(await (await fetch(app.url+'/api/session')).json()).token,api=(route,data)=>fetch(app.url+'/api/visual/'+route,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)}).then(async r=>({status:r.status,body:await r.json()}));
  const preview=await api('preview',{project});assert.equal(preview.status,200,JSON.stringify(preview.body));
  for(const broken of [false,true]){
   const c=await context({viewport:{width:390,height:1000}});if(broken)await c.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='.chart-rows{min-width:640px}.region[data-component=chart] figure{overflow-x:auto}';document.head.append(s);}));
   const page=await c.newPage();page.on('pageerror',e=>report.errors.push(`${locale} gate: ${e.message}`));await ready(page,app.url+preview.body.artifactUrl);
   const fit=await page.evaluate(()=>window.deckweftFit),measured=await api('measure',{ticket:preview.body.ticket,fit}),reasons=[...new Set(fit.checks.flatMap(s=>s.clipIssues.filter(i=>i.element==='conclusion label').map(i=>i.reason)))];
   if(broken){assert.equal(fit.ok,false);assert.ok(reasons.includes('Conclusion label is clipped or only reachable by scrolling'));assert.equal(measured.status,422);assert.equal(measured.body.error.code,'VISUAL_FIT');}
   else{assert.equal(fit.ok,true);assert.equal(measured.status,200);}
   report.gate.push({locale,width:390,injected:broken?'.chart-rows{min-width:640px} inside an overflow-x:auto figure':null,fitOk:fit.ok,measureStatus:measured.status,code:measured.body.error?.code??null,reasons});
   await c.close();
  }
 }
 // Contact sheets of the captures above, for review; each image keeps its file name.
 const sheet=await (await context({viewport:{width:1600,height:1000}})).newPage();
 for(const [name,files,cols] of [...['en','zh-CN'].flatMap(locale=>[...[1440,1024].map(w=>[`${locale}-${w}-sheet.png`,CHART_KIND_SCENES.map(id=>`${locale}-${w}-${id}.png`),3]),[`${locale}-390-sheet.png`,CHART_KIND_SCENES.map(id=>`${locale}-390-${id}.png`),6],[`${locale}-390-nojs-sheet.png`,CHART_KIND_SCENES.map(id=>`${locale}-390-nojs-${id}.png`),6],[`${locale}-grayscale-sheet.png`,['grouped','dot-interval','trend','small-multiples','direct-bar','benchmark'].map(id=>`${locale}-grayscale-${id}.png`),3]])]){
  let html=`<style>body{margin:0;padding:12px;background:#bbb;font:13px Arial}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;align-items:start}img{width:100%;display:block;border:1px solid #555}p{margin:0 0 4px}</style><main>`;
  for(const file of files)html+=`<div><p>${file}</p><img src="data:image/png;base64,${(await readFile(path.join(out,file))).toString('base64')}"></div>`;
  await sheet.setContent(html+'</main>');await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));const target=path.join(out,name);await sheet.screenshot({path:target,fullPage:true});report.captures.push({file:name,sha256:hash(await readFile(target)),sheetOf:files});
 }
 await sheet.context().close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);report.ok=true;
}catch(error){report.ok=false;report.failure=String(error.stack||error);throw error;}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await app.close();await rm(home,{recursive:true,force:true});}
console.log(JSON.stringify({ok:report.ok,views:report.views.length,captures:report.captures.length,gate:report.gate,parity:report.parity.map(p=>({locale:p.locale,width:p.width,js:p.js.rows,nojs:p.nojs.rows}))},null,1));
