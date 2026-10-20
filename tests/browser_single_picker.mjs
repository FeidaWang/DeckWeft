// Single entry, step 2: the More drawer's #projectPicker lists classic and visual decks together, each marked with its type.
// Choosing a visual deck opens it in Visual Studio; choosing a classic deck stays in the workbench. Neither switch may
// call /api/visual/migrate; only the "Make a new-version copy" button does, once, and the original stays.
// Optional QA: isolated browser + external Playwright module; no runtime dependency.
// EVIDENCE_DIR=<folder> also saves the two screenshots.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdir,mkdtemp,realpath } from 'node:fs/promises';
import { startStudio } from '../src/services/server.mjs';
import { createProject } from '../src/core/model.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),shots=process.env.EVIDENCE_DIR?path.resolve(process.env.EVIDENCE_DIR):path.join(root,'dist/single-picker');await mkdir(shots,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const report={browser:'',checks:[],errors:[],externalRequests:[]};
const step=text=>{report.checks.push(text);console.log('PASS: '+text);};
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-single-picker-')));
const app=await startStudio({home,port:0,seed:false}),browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
try{
 const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
 const call=async(route,data,method='POST')=>{const r=await fetch(app.url+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;};
 // Two classic decks, then a visual one, each a second apart so the modified order is certain: visual, Roadmap, Quarterly.
 const pause=()=>new Promise(resolve=>setTimeout(resolve,1100));
 const quarterly=(await call('/api/projects',{project:createProject({title:'Quarterly story'})})).project;await pause();
 const roadmap=(await call('/api/projects',{project:createProject({title:'Roadmap review'})})).project;await pause();
 const visual=(await call('/api/visual/demo',{locale:'en'})).project,visualTitle=visual.document.title;
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
 const page=await context.newPage(),requests=[];
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>requests.push(`${r.method()} ${new URL(r.url()).pathname}`));
 const migrations=()=>requests.filter(r=>r.includes('/api/visual/migrate'));
 const settled=()=>page.waitForFunction(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale')&&document.querySelector('#saveState').dataset.state==='saved';},{},{timeout:30000});
 const optionTexts=()=>page.locator('#projectPicker option').evaluateAll(list=>list.map(o=>({value:o.value,text:o.textContent})));
// A native select list does not show in a headless screenshot, so it is drawn open as a list box for the picture only.
 const shoot=async name=>{await page.locator('#projectPicker').evaluate(n=>{n.size=n.options.length;});await page.screenshot({path:path.join(shots,name)});await page.locator('#projectPicker').evaluate(n=>{n.size=1;});};
 const openDrawer=async()=>{if(!await page.locator('#moreDialog').evaluate(n=>n.open))await page.locator('#openMore').click();};

 await page.goto(app.url+'/');await settled();
 // 1. one list, typed, newest first. Both reads happen at startup; neither converts.
 assert.ok(requests.includes('GET /api/projects')&&requests.includes('GET /api/visual/projects'),'both lists are read at startup');
 let options=await optionTexts();
 assert.deepEqual(options.map(o=>o.text),[`${visualTitle} (Visual)`,'Roadmap review (Classic)','Quarterly story (Classic)'],'typed labels, newest first');
 assert.deepEqual(options.map(o=>o.value),['visual:'+visual.id,roadmap.id,quarterly.id]);
 assert.equal(await page.locator('#projectPicker').inputValue(),roadmap.id,'the newest classic deck is the open one');
 step('startup reads both lists and shows one typed list, newest first');

 // 2. the copy button sits under the picker and is enabled for the open classic deck.
 await openDrawer();
 assert.equal(await page.locator('#projectPicker + #makeCopy').count(),1,'Make a new-version copy sits directly under the picker');
 assert.equal(await page.locator('#makeCopy').isDisabled(),false);
 assert.equal(await page.locator('#makeCopy').textContent(),'Make a new-version copy');
 await shoot('picker-en.png');
 step('the picker shows both types with the copy button under it (English)');

 // 3. choosing the visual deck opens Visual Studio on it.
 await page.locator('#projectPicker').selectOption('visual:'+visual.id);
 await page.waitForURL(url=>url.pathname==='/visual'&&url.searchParams.get('project')===visual.id);
 await page.waitForFunction(()=>document.querySelector('#sceneTitle')?.textContent.length>0);
 assert.equal(await page.locator('#library').inputValue(),visual.id,'Visual Studio opened the chosen deck');
 step('choosing a visual deck opens /visual?project=<id> on that deck');

 // 4. back in the workbench: a classic deck switches in place (no navigation), then the visual one is chosen again.
 await page.goto(app.url+'/');await settled();await openDrawer();
 await page.locator('#projectPicker').selectOption(quarterly.id);
 await page.waitForFunction(()=>document.querySelector('#deckTitle').value==='Quarterly story');await settled();
 assert.equal(new URL(page.url()).pathname,'/');
 step('choosing a classic deck switches in place and stays in the workbench');

 // 5. no list path and no switch called migrate.
 assert.deepEqual(migrations(),[],'no request to /api/visual/migrate while listing or switching');
 step('network record has no /api/visual/migrate after switching between both types');

 // 6. Chinese: labels, button.
 await page.evaluate(()=>document.querySelector('#uiLanguage').click());
 await page.waitForFunction(()=>document.documentElement.lang==='zh-CN');
 await page.locator('#library, #projectPicker').first().waitFor({state:'attached'});
 options=await optionTexts();assert.ok(options.some(o=>o.text.endsWith('（经典）'))&&options.some(o=>o.text.endsWith('（视觉）')),'Chinese type marks');
 assert.equal(await page.locator('#makeCopy').textContent(),'做一份新版副本');
 await openDrawer();await shoot('picker-zh.png');
 step('Chinese labels and button match');
 await page.evaluate(()=>document.querySelector('#uiLanguage').click());
 await page.waitForFunction(()=>document.documentElement.lang==='en');

 // 7. the copy button migrates once, opens the copy, and leaves the original alone.
 const before={classic:(await call('/api/projects',undefined,'GET')).projects.length,visual:(await call('/api/visual/projects',undefined,'GET')).projects.length};
 await openDrawer();await page.locator('#makeCopy').click();
 await page.waitForURL(url=>url.pathname==='/visual'&&url.searchParams.get('project')&&url.searchParams.get('project')!==visual.id);
 const copyId=new URL(page.url()).searchParams.get('project');
 assert.equal(migrations().length,1,'exactly one migrate request, from the button');
 const after={classic:(await call('/api/projects',undefined,'GET')).projects.length,visual:(await call('/api/visual/projects',undefined,'GET')).projects.length};
 assert.equal(after.classic,before.classic,'the classic original is kept');assert.equal(after.visual,before.visual+1,'one new visual copy');
 assert.ok((await call('/api/visual/projects',undefined,'GET')).projects.some(p=>p.id===copyId));
 step('Make a new-version copy migrates once, opens the copy, and keeps the original');

 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
 console.log(`Single picker passed: ${report.checks.length} checks.`);
}finally{await browser.close();await app.close?.();}
process.exit(0);
