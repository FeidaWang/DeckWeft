// F6: after the local studio restarts, both editors reconnect without a page reload and keep the in-memory draft.
// Saving then follows the revision check; a newer revision leads to a separate copy, never an overwrite.
// Optional QA: isolated browser + external Playwright module; no runtime dependency.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdir,mkdtemp,realpath,readFile,writeFile,rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { startStudio } from '../src/services/server.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { createVisualDemo } from '../src/core/visual-demo.mjs';
import { revealStudio } from './studio-controls.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/session-reconnect');await mkdir(out,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-session-reconnect-')));
const visualStore=await new VisualProjectStore(home).init(),visualDemo=await visualStore.save(await createVisualDemo('en',visualStore.home),{create:true});
let app=await startStudio({home,port:0});const port=Number(new URL(app.url).port);
const report={browser:'',isolation:'Cached test binary and ephemeral contexts; no installed app or personal profile',checks:[],captures:[],errors:[],externalRequests:[],consoleErrors:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// A restart issues a new random session token on the same loopback port; the page keeps its old one.
async function restart(){await app.close();app=await startStudio({home,port,seed:false});}
// Node's fetch sends no Origin, like any local HTTP client (see docs/en/architecture.md).
async function call(route,data,method='GET'){
 const {token}=await (await fetch(app.url+'/api/session')).json();
 const response=await fetch(app.url+route,{method,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error.message),value.error);return value;
}
const browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
async function capture(page,name){await page.screenshot({path:path.join(out,name)});report.captures.push({file:name,hash:hash(await readFile(path.join(out,name)))});}
const settle=page=>page.waitForLoadState('networkidle');
const dialog=page=>page.locator('#sessionDialog');
// Each studio says how to open it, edit one field, start or await a save, and tell that a save finished.
// The classic studio autosaves 1.2 s after an edit: hold() keeps that PUT until the restart (and any other writer) is done,
// so it reaches the restarted server; ⌘/Ctrl S is its explicit save. Since single entry step 3 Visual Studio does the same.
const studios=[
 {name:'classic',projectRoute:id=>'/api/projects/'+id,listRoute:'/api/projects',
  async open(page){await page.goto(app.url+'/');await page.waitForFunction(()=>document.querySelector('#slideTitle')?.value);await settle(page);return (await call('/api/projects')).projects[0].id;},
  // Wait for the debounced preview so no background request reaches the restarted server first.
  async edit(page,text){await page.locator('#slideTitle').fill(text);await page.waitForFunction(()=>(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale')&&document.querySelector('#saveState').dataset.state!=='attention';})(),{},{timeout:30000});},
  value:page=>page.locator('#slideTitle').inputValue(),
  autosaves:true,
  async hold(page){let open;const gate=new Promise(resolve=>{open=resolve;});await page.unrouteAll({behavior:'wait'});await page.route(url=>url.pathname.startsWith('/api/projects/'),async route=>{if(route.request().method()==='PUT')await gate;await route.continue();});return open;},
  save:page=>page.keyboard.press('ControlOrMeta+s'),
  unsaved:async page=>{await page.waitForSelector('#saveState[data-state="attention"]',{state:'attached'});return true;},
  saved:page=>page.waitForSelector('#saveState[data-state="saved"]',{state:'attached',timeout:20000})},
 // Single entry step 3: Visual Studio shares the shell, so it autosaves and recovers exactly like classic.
 {name:'visual',projectRoute:id=>'/api/visual/projects/'+id,listRoute:'/api/visual/projects',
  async open(page){await page.goto(app.url+'/visual?project='+visualDemo.id);await page.waitForFunction(()=>!document.querySelector('#exportHTML').disabled,{},{timeout:30000});await revealStudio(page,'edit');await settle(page);return visualDemo.id;},
  async edit(page,text){await page.locator('#deckTitle').fill(text);await page.waitForFunction(()=>(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale')&&document.querySelector('#saveState').dataset.state!=='attention';})(),{},{timeout:30000});},
  value:page=>page.locator('#deckTitle').inputValue(),
  autosaves:true,
  async hold(page){let open;const gate=new Promise(resolve=>{open=resolve;});await page.unrouteAll({behavior:'wait'});await page.route(url=>url.pathname.startsWith('/api/visual/projects/'),async route=>{if(route.request().method()==='PUT')await gate;await route.continue();});return open;},
  save:page=>page.keyboard.press('ControlOrMeta+s'),
  unsaved:async page=>{await page.waitForSelector('#saveState[data-state="attention"]',{state:'attached'});return true;},
  saved:page=>page.waitForSelector('#saveState[data-state="saved"]',{state:'attached',timeout:20000})}
];
try{
 for(const studio of studios){
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${studio.name}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(`${studio.name}: ${m.text()}`);});
  const id=await studio.open(page);await page.evaluate(()=>{window.__deckweftSamePage=true;});
  const step=text=>report.checks.push(`${studio.name}: ${text}`);

  // 1. Restart, decline, then reconnect: the draft stays in memory and the save completes.
  const first=`Reconnected ${studio.name} draft`;const release=await studio.hold(page);await studio.edit(page,first);await restart();release();
  if(!studio.autosaves)await studio.save(page);await dialog(page).waitFor({state:'visible'});await capture(page,`${studio.name}-reconnect.png`);
  await dialog(page).locator('[data-session="cancel"]').click();await dialog(page).waitFor({state:'detached'});
  assert.equal(await studio.value(page),first);assert.ok(await studio.unsaved(page),'Declining keeps the edit unsaved');
  assert.ok(!JSON.stringify((await call(studio.projectRoute(id))).project).includes(first),'Nothing is saved before reconnecting');
  step('Declining reconnect keeps the draft and saves nothing');
  await studio.save(page);await dialog(page).waitFor({state:'visible'});await dialog(page).locator('[data-session="confirm"]').click();await studio.saved(page);
  const saved=(await call(studio.projectRoute(id))).project;assert.ok(JSON.stringify(saved).includes(first),'The reconnected save is persisted');
  assert.equal(await page.evaluate(()=>window.__deckweftSamePage),true,'Reconnect does not reload the page');
  step(`Reconnect saved revision ${saved.revision.number} without reloading the page`);

  // 2. Another writer saves during the restart: the save gets 409 and the draft becomes a separate copy.
  const before=new Set((await call(studio.listRoute)).projects.map(p=>p.id));
  const second=`Conflicting ${studio.name} draft`;const release2=await studio.hold(page);await studio.edit(page,second);await restart();
  const other=(await call(studio.projectRoute(id),{project:saved,expectedRevision:saved.revision.number},'PUT')).project;release2();
  if(!studio.autosaves)await studio.save(page);await dialog(page).waitFor({state:'visible'});await dialog(page).locator('[data-session="confirm"]').click();
  // The classic autosave meets the 409 without opening a dialog (red square, banner); ⌘/Ctrl S then offers the copy.
  if(studio.autosaves){await page.waitForSelector('#saveState[data-state="attention"]',{state:'attached'});assert.equal(await page.locator('#conflictDialog').count(),0);await studio.save(page);}
  const conflict=page.locator('#conflictDialog');await conflict.waitFor({state:'visible'});await capture(page,`${studio.name}-conflict.png`);
  assert.equal(await studio.value(page),second);
  await conflict.locator('[data-session="confirm"]').click();await conflict.waitFor({state:'detached'});await studio.saved(page);
  const original=(await call(studio.projectRoute(id))).project;assert.equal(original.revision.number,other.revision.number,'The newer revision is not overwritten');assert.ok(!JSON.stringify(original).includes(second));
  const added=(await call(studio.listRoute)).projects.filter(p=>!before.has(p.id));assert.equal(added.length,1,'Exactly one separate copy');
  const copied=(await call(studio.projectRoute(added[0].id))).project;assert.ok(JSON.stringify(copied).includes(second),'The copy holds the draft');
  assert.equal(await studio.value(page),second);assert.equal(await page.evaluate(()=>window.__deckweftSamePage),true);
  step(`409 after reconnect saved the draft as ${added[0].id}; ${id} stays at revision ${original.revision.number}`);
  await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
 report.ok=true;console.log(`Session reconnect passed: ${report.checks.length} checks.`);
}finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser.close();await app.close();await rm(home,{recursive:true,force:true});
}
