// DWI-013 (workpacks/wes-instrument): the palette picker in the Look zone of the visual deck, driven like an author.
// Choose a palette for one page, switch its mode, read the evidence note, undo it, and check that the page's text and the other
// pages stay as they were, that a theme lock disables the picker, and that keyboard alone reaches it.
// Optional QA: isolated browser + external Playwright module; no runtime dependency. EVIDENCE_DIR=<folder> saves screenshots and report.json.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,mkdtemp,realpath,writeFile} from 'node:fs/promises';
import {startStudio} from '../src/services/server.mjs';
import {revealStudio} from './studio-controls.mjs';
import {dwiSliceProject} from './dwi-slice.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),shots=process.env.EVIDENCE_DIR?path.resolve(process.env.EVIDENCE_DIR):path.join(root,'dist/dwi-palette');await mkdir(shots,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const report={browser:'',checks:[],errors:[],externalRequests:[],screenshots:[]};
const step=text=>{report.checks.push(text);console.log('PASS: '+text);};
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-dwi-palette-')));
const app=await startStudio({home,port:0,seed:false}),browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
try{
 const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
 const call=async(route,data,method='POST')=>{const r=await fetch(app.url+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;};
 const saved=(await call('/api/visual/projects',{project:await dwiSliceProject('en')})).project;
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:')||url.startsWith('about:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const measured=()=>page.waitForFunction(()=>{const c=document.querySelector('#canvas');return c?.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale');},{},{timeout:60000});
 const shoot=async(name,selector)=>{const file=path.join(shots,name);await(selector?page.locator(selector).screenshot({path:file}):page.screenshot({path:file}));report.screenshots.push(name);};
 const frameStyle=()=>page.frameLocator('#canvas iframe, iframe#canvas, #canvas').locator('section.web-scene').first().getAttribute('style').catch(()=>null);
 await page.goto(app.url+'/?project='+saved.id);await measured();
 await revealStudio(page,'compositions');
 const select=page.locator('#paletteSelect');await page.waitForFunction(()=>document.querySelector('#paletteSelect').options.length===23,{},{timeout:20000});
 assert.equal(await select.inputValue(),'');assert.ok(await page.locator('#paletteEvidence').isHidden());assert.ok(await page.locator('#paletteMode').isHidden());
 step('the picker lists 22 palettes after “None, theme colours”; no evidence note or mode until one is chosen');
 await select.scrollIntoViewIfNeeded();await shoot('look-before.png');
 await select.selectOption('Darjeeling2');await measured();
 assert.ok(await page.locator('#paletteEvidence').isVisible());assert.equal(await page.locator('#paletteMode').inputValue(),'light');
 await page.locator('#paletteEvidence > summary').click();
 const note=await page.locator('#paletteEvidenceText').textContent();
 assert.match(note,/The Darjeeling Limited \(2007\)/);assert.match(note,/Not an official film colour standard/);assert.match(note,/5 swatches, 1 exact/);
 assert.deepEqual(await page.locator('#paletteSwatches span').evaluateAll(l=>l.map(n=>getComputedStyle(n).backgroundColor)),['rgb(236, 203, 174)','rgb(4, 108, 154)','rgb(214, 156, 78)','rgb(171, 221, 222)','rgb(0, 0, 0)'],'the five source swatches are painted');
 step('choosing Darjeeling2 shows the light mode and a compact note: film, community source, not official, screenshot comparison 5 swatches / 1 exact');
 const stored=async()=>(await call('/api/visual/projects/'+saved.id,undefined,'GET')).project;
 await page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.state==='saved',{},{timeout:30000});
 let p=await stored();assert.deepEqual(p.plan.scenes[0].palette,{id:'Darjeeling2',registryVersion:1,mode:'light'});assert.deepEqual(p.document.blocks,saved.document.blocks);assert.deepEqual(p.plan.scenes.slice(1),saved.plan.scenes.slice(1));
 step('the saved project holds the palette on page 1 only; blocks and the other five pages are unchanged');
 await page.locator('#paletteEvidence').scrollIntoViewIfNeeded();await shoot('look-darjeeling2-light.png');await shoot('studio-darjeeling2-light.png');
 await page.locator('#paletteMode').selectOption('stage');await measured();await page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.state==='saved',{},{timeout:30000});
 p=await stored();assert.equal(p.plan.scenes[0].palette.mode,'stage');step('switching the mode to stage is saved');
 await shoot('studio-darjeeling2-stage.png');
 // Undo twice returns to no palette, through the normal edit history.
 const undo=page.locator('#undo');await undo.click();await measured();await undo.click();await measured();await page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.state==='saved',{},{timeout:30000});
 p=await stored();assert.equal(p.plan.scenes[0].palette,undefined);assert.equal(await select.inputValue(),'');
 step('two undos remove the mode change and the palette; the saved page has no palette again');
 // Keyboard: focus the picker and type the start of a film title (select type-ahead; on macOS the arrow keys open the list instead).
 await select.focus();await page.keyboard.type('Moonrise');await page.waitForFunction(()=>document.querySelector('#paletteSelect').value!=='',{},{timeout:10000});await measured();
 assert.notEqual(await select.inputValue(),'');step(`keyboard alone chose a palette (${await select.inputValue()})`);
 // A theme lock disables the picker: lock the page with "Leave this page", which holds composition and theme.
 await page.locator('#keepPage').click();await page.waitForFunction(()=>document.querySelector('#keepPage').getAttribute('aria-pressed')==='true',{},{timeout:20000});await measured();
 assert.ok(await page.locator('[data-zone=look] [data-theme="dark-data"]').isDisabled(),'the theme swatches are locked');
 assert.ok(await select.isDisabled());step('Leave this page (composition and theme locked) disables the palette picker');
 await select.scrollIntoViewIfNeeded();await shoot('look-locked.png');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);step('no page errors and no external requests');
}finally{await writeFile(path.join(shots,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await app.close();}
