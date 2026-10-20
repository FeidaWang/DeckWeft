// M6 first run: with an empty library the stage shows one paste box and Arrange instead of an empty workbench.
// The studio starts with seed:false on an empty home; `deckweft studio` still seeds the welcome deck by default.
// Optional QA: isolated browser + external Playwright module; no runtime dependency.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdir,mkdtemp,realpath,writeFile,rm } from 'node:fs/promises';
import { startStudio } from '../src/services/server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/first-run');await mkdir(out,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const report={browser:'',checks:[],errors:[],externalRequests:[]};
const browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
const homes=[],apps=[];
// Each scenario gets its own empty library.
async function fresh(){const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-first-run-')));homes.push(home);const app=await startStudio({home,port:0,seed:false});apps.push(app);
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(app.url+'/');await page.locator('#firstRun').waitFor();return page;}
const ready=page=>page.waitForFunction(()=>(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale')&&document.querySelector('#saveState').dataset.state!=='attention';})(),{},{timeout:30000});
const step=text=>{report.checks.push(text);console.log('PASS:',text);};
try{
 // 1. Paste three blank-line-separated paragraphs and Arrange: three pages, measured choices, the form is gone.
 let page=await fresh();
 assert.equal(await page.locator('#slideList .thumbnail').count(),0);assert.ok(await page.locator('#canvas').isHidden());
 assert.equal(await page.locator('#firstRun textarea').getAttribute('placeholder'),'Paste what you want to say here. Leave a blank line between pages.');
 assert.equal((await page.locator('#firstRun button[type=submit]').textContent()).trim(),'Arrange');
 assert.equal((await page.locator('#firstRun [data-example]').textContent()).trim(),'See an example first');
 step('empty library: the stage holds only the paste box, Arrange and the example link');
 await page.locator('#firstRun textarea').fill('Why we are here\nThe plan in one sentence.\n\nWhat changes\nThree steps, one owner each.\n\n\nWhat we need\nA decision by Friday.');
 const started=Date.now();await page.locator('#firstRun button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelectorAll('#slideList .thumbnail').length===3,{},{timeout:10000});await ready(page);const seconds=(Date.now()-started)/1000;
 assert.equal(await page.locator('#firstRun').count(),0);assert.ok(await page.locator('#canvas svg').isVisible());assert.ok(await page.locator('#candidates .candidate').count()>=3);
 assert.equal(await page.locator('#slideTitle').inputValue(),'Why we are here');
 step(`three pasted paragraphs became 3 pages with measured choices in ${seconds.toFixed(2)} s; the form is removed`);
 await page.context().close();
 // 2. The example link loads the welcome deck in the interface language.
 page=await fresh();await page.locator('#uiLanguage').dispatchEvent('click');
 assert.equal((await page.locator('#firstRun button[type=submit]').textContent()).trim(),'排好');
 assert.equal(await page.locator('#firstRun textarea').getAttribute('placeholder'),'把你要讲的话贴在这里。每一页之间空一行。');
 await page.locator('#firstRun [data-example]').click();await page.waitForFunction(()=>document.querySelectorAll('#slideList .thumbnail').length===6,{},{timeout:10000});await ready(page);
 assert.ok((await page.locator('#slideTitle').inputValue()).includes('好想法'));assert.equal(await page.locator('#firstRun').count(),0);
 step('Chinese interface: 排好, Chinese placeholder, and 先看个例子 loads welcome.zh-CN.deck.json');
 await page.context().close();
 // 3. A .md file dropped on the stage goes through the existing file handler.
 page=await fresh();
 const md='# Dropped first page\nFrom a file.\n---\n# Dropped second page\nStill local.';
 const transfer=await page.evaluateHandle(text=>{const t=new DataTransfer();t.items.add(new File([text],'notes.md',{type:'text/markdown'}));return t;},md);
 await page.locator('#stage').dispatchEvent('dragover',{dataTransfer:transfer});
 assert.ok(await page.locator('#stage').evaluate(e=>e.classList.contains('drop-ready')&&getComputedStyle(e).outlineStyle==='dashed'&&getComputedStyle(e).outlineWidth==='2px'&&getComputedStyle(e).outlineColor==='rgb(255, 212, 0)'),'2 px yellow dashed outline while dragging over');
 await page.locator('#stage').dispatchEvent('drop',{dataTransfer:transfer});
 await page.waitForFunction(()=>document.querySelectorAll('#slideList .thumbnail').length===2,{},{timeout:10000});await ready(page);
 assert.equal(await page.locator('#slideTitle').inputValue(),'Dropped first page');assert.ok(!(await page.locator('#stage').evaluate(e=>e.classList.contains('drop-ready'))));
 step('a dropped .md file starts a two-page deck through the file handler; the dashed outline clears');
 await page.context().close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.ok=true;console.log(`First run passed: ${report.checks.length} checks.`);
}finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();
 for(const app of apps)await app.close();for(const home of homes)await rm(home,{recursive:true,force:true});
}
