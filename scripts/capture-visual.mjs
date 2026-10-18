// Optional QA tool only. No browser package or binary is shipped in the runtime.
import path from 'node:path';
import http from 'node:http';
import { mkdir, readFile, writeFile, realpath, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { renderBaseline } from './capture-visual-baseline.mjs';
import { renderVisual } from './render-visual.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},help:{type:'boolean'}}});
if(args.help){console.log('Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/optional/playwright/index.mjs npm run visual:capture -- [--out dist/visual/capture]\nRequires an isolated browser outside /Applications and an independently installed Playwright QA module. Captures baseline and Wave A after fonts/images; no remote requests.');process.exit(0);}
const binary=process.env.CHROMIUM_PATH;
if(!binary)throw Error('Set CHROMIUM_PATH to an isolated testing browser outside /Applications.');
const executablePath=await realpath(binary);
if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(binary))throw Error('Installed browser bundles are read-only. Use an isolated test installation outside Applications.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const out=path.resolve(args.out||path.join(root,'dist/visual/capture'));await mkdir(out,{recursive:true});
const baseDir=path.join(root,'dist/visual/baseline'),webDir=path.join(root,'dist/visual/wave-a');
const baseline=await renderBaseline({out:baseDir}),visual=await renderVisual({out:webDir});
const files=new Map();for(const [dir,manifest]of [[baseDir,baseline],[webDir,visual]])for(const a of manifest.artifacts)files.set('/'+a.file,await readFile(path.join(dir,a.file)));
const server=http.createServer((req,res)=>{if(req.method!=='GET'||req.headers.host!==`127.0.0.1:${server.address().port}`||!files.has(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(files.get(req.url));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=[];async function scan(dir){for(const entry of (await readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=dir+'/'+entry.name;if(entry.isDirectory())await scan(name);else sources.push({path:name,sha256:hash(await readFile(path.join(root,name)))});}}
for(const dir of ['src','schemas','scripts','tests/fixtures/visual'])await scan(dir);
const report={format:'deckweft-visual-capture',version:1,sourceCommit:baseline.sourceCommit,sourceTreeHash:hash(JSON.stringify(sources)),sourceFiles:sources,workingTree:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim().split('\n'),node:process.version,platform:process.platform,architecture:process.arch,isolation:'Explicit cached testing browser, ephemeral Playwright contexts; no installed application or personal profile',browserBinaryHash:hash(await readFile(executablePath)),browser:null,cases:[],errors:[],externalRequests:[]};
let browser;
try {
 browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'en-AU',reducedMotion:'reduce'});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin+'/'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(15000);
 for(const a of baseline.artifacts){
   await page.goto(origin+'/'+a.file);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
   const screenshot=a.file.replace('.html','.png');await page.screenshot({path:path.join(out,screenshot),fullPage:true});
   const fonts=await page.locator('svg text').evaluateAll(nodes=>[...new Set(nodes.map(n=>getComputedStyle(n).fontFamily))]);
   report.cases.push({kind:'legacy-baseline',...a,viewport:{width:1440,height:1000},fontPreferences:fonts,screenshot,screenshotHash:hash(await readFile(path.join(out,screenshot)))});
 }
 for(const a of visual.artifacts){
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/'+a.file);await page.waitForFunction(()=>document.body.dataset.ready==='true');
   const fit=await page.evaluate(()=>window.deckweftFit);assert.equal(fit.ok,true,JSON.stringify(fit));assert.equal(fit.renderHash,a.renderHash);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const session=await context.newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');
   const doc=await session.send('DOM.getDocument');const ids=await session.send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'.region h2,.region p,.chart svg text'});
   const platformFonts=[];for(const id of ids.nodeIds){platformFonts.push(await session.send('CSS.getPlatformFontsForNode',{nodeId:id}));}await session.detach();
   const screenshots=[];
   for(const scene of ['collage','evidence']){const name=`${a.locale}-${width}-${scene}.png`;await page.locator('#'+scene).screenshot({path:path.join(out,name)});screenshots.push({file:name,sha256:hash(await readFile(path.join(out,name)))});}
   const data=await page.locator('table tbody tr').allTextContents();assert.equal(data.length,6);assert.ok(data[5].includes('78')&&data[5].includes('45'));
   await page.locator('summary').click();assert.ok(await page.locator('table').isVisible());await page.locator('summary').press('Enter');assert.equal(await page.locator('table').isVisible(),false);
   await page.locator('#present').click();assert.ok(await page.locator('#collage').isVisible());assert.equal(await page.locator('#evidence').isVisible(),false);
   await page.locator('#next').click();assert.ok(await page.locator('#evidence').isVisible());assert.equal(await page.locator('#collage').isVisible(),false);await page.locator('#present').click();
   report.cases.push({kind:'wave-a',...a,viewport:{width,height:1000},fit,platformFonts,dataRows:data,screenshots,checks:['No horizontal document overflow','Exact table values retained','Data disclosure toggles with mouse and Enter','Presentation next/reading controls work'],fingerprint:hash(JSON.stringify({renderHash:a.renderHash,viewport:{width,height:1000},browser:report.browser,platformFonts,state:'reading, data closed'}))});
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:1000}});const reading=await nojs.newPage();await reading.goto(origin+'/'+a.file);
  assert.equal(await reading.locator('h2').count(),2);assert.ok(await reading.locator('#collage').isVisible());assert.ok(await reading.locator('#evidence').isVisible());await reading.locator('summary').click();assert.ok(await reading.locator('table').isVisible());await nojs.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.ok=true;
} catch(error){report.ok=false;report.failure=error.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(path.join(out,'capture-manifest.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,browser:report.browser,cases:report.cases.length,errors:report.errors,failure:report.failure,out},null,2));
