// §5 history capacity: as a deck's saved snapshots approach the suggested limit, both studios say so after
// a save and in the history dialog, explain how to clean up, and never delete a snapshot themselves.
// Small limits are passed to the local studio so a few saves reach them.
// Optional QA: isolated browser + external Playwright module; no runtime dependency.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdir,mkdtemp,realpath,readFile,readdir,writeFile,rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { startStudio } from '../src/services/server.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { createVisualDemo } from '../src/core/visual-demo.mjs';
import { revealStudio } from './studio-controls.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/history-capacity');await mkdir(out,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-history-capacity-')));
const visualStore=await new VisualProjectStore(home).init(),visualDemo=await visualStore.save(await createVisualDemo('en',visualStore.home),{create:true});
// Warn from 4 snapshots (80% of 5); 5 or more is over the limit.
const app=await startStudio({home,port:0,historyLimits:{snapshots:5,bytes:1_000_000_000}});
const report={browser:'',isolation:'Cached test binary and ephemeral contexts; no installed app or personal profile',checks:[],captures:[],errors:[],externalRequests:[],consoleErrors:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function call(route,data,method='GET'){
 const {token}=await (await fetch(app.url+'/api/session')).json();
 const response=await fetch(app.url+route,{method,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error.message),value.error);return value;
}
const browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
async function capture(page,name){await page.screenshot({path:path.join(out,name)});report.captures.push({file:name,hash:hash(await readFile(path.join(out,name)))});}
const snapshotFiles=async(kind,id)=>(await readdir(path.join(home,...(kind==='visual'?['visual']:[]),'history',id))).filter(f=>f.endsWith('.json')).sort();
// Each studio says how to open it, edit one field, save, read the save message and open its history dialog.
const studios=[
 {name:'classic',kind:'classic',projectRoute:id=>'/api/projects/'+id,
  async open(page){await page.goto(app.url+'/');await page.waitForFunction(()=>document.querySelector('#slideTitle')?.value);await page.waitForLoadState('networkidle');return (await call('/api/projects')).projects[0].id;},
  async edit(page,text){await page.locator('#slideTitle').fill(text);await page.waitForFunction(()=>document.querySelector('#fitStatus').textContent.includes('ready to export'),{},{timeout:30000});},
  async save(page){await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#saveState').textContent==='Saved on this computer',{},{timeout:20000});},
  saveNote:page=>page.locator('#issueBanner'),
  async history(page){await page.locator('#openHistory').click();await page.locator('#historyDialog [data-revision]').first().waitFor();return page.locator('#historyCapacity');},
  close:page=>page.locator('#historyDialog [data-close]').first().click()},
 {name:'visual',kind:'visual',projectRoute:id=>'/api/visual/projects/'+id,
  async open(page){await page.goto(app.url+'/visual?project='+visualDemo.id);await page.waitForFunction(()=>!document.querySelector('#exportHTML').disabled,{},{timeout:30000});await revealStudio(page,'edit');return visualDemo.id;},
  async edit(page,text){await page.locator('#title').fill(text);await page.waitForFunction(()=>!document.querySelector('#save').disabled,{},{timeout:30000});},
  async save(page){await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('Saved on this computer'),{},{timeout:20000});},
  saveNote:page=>page.locator('#message'),
  async history(page){await revealStudio(page,'file');await page.locator('#history').click();await page.locator('#historyDialog [data-revision]').first().waitFor();return page.locator('#historyCapacity');},
  close:page=>page.locator('#historyClose').click()}
];
try{
 for(const studio of studios){
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${studio.name}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(`${studio.name}: ${m.text()}`);});
  const id=await studio.open(page),step=text=>report.checks.push(`${studio.name}: ${text}`);
  // Below the warning: three snapshots, no note after the save or in the dialog.
  for(let i=1;i<=3;i++){await studio.edit(page,`Capacity ${studio.name} ${i}`);await studio.save(page);}
  assert.equal((await snapshotFiles(studio.kind,id)).length,3);
  assert.ok(!(await studio.saveNote(page).textContent()).includes('suggested limit'),'No note below 80%');
  let note=await studio.history(page);assert.ok(await note.isHidden(),'The dialog shows no note below 80%');await studio.close(page);
  step('Three snapshots: no capacity note after saving or in history');
  // Fourth snapshot reaches 80%: the save message and the dialog both explain cleanup.
  await studio.edit(page,`Capacity ${studio.name} 4`);await studio.save(page);
  const saveNote=await studio.saveNote(page).textContent();
  for(const part of ['4 earlier versions','close to the suggested limit','never deletes',path.join(home,...(studio.kind==='visual'?['visual']:[]),'history',id)])assert.ok(saveNote.includes(part),`${studio.name} save note: ${part}`);
  await capture(page,`${studio.name}-save-near.png`);
  note=await studio.history(page);assert.ok(await note.isVisible());assert.ok((await note.textContent()).includes('close to the suggested limit'));
  await capture(page,`${studio.name}-history-near.png`);await studio.close(page);
  step('Four snapshots: the save message and history dialog warn and explain cleanup');
  // Past the limit: the note says so and every snapshot file is still on disk.
  for(const n of [5,6]){await studio.edit(page,`Capacity ${studio.name} ${n}`);await studio.save(page);}
  assert.ok((await studio.saveNote(page).textContent()).includes('over the suggested limit'));
  note=await studio.history(page);assert.ok((await note.textContent()).includes('6 earlier versions'));
  await capture(page,`${studio.name}-history-over.png`);await studio.close(page);
  const files=await snapshotFiles(studio.kind,id);assert.equal(files.length,6,'No snapshot was deleted');
  const usage=(await call(studio.projectRoute(id)+'/history')).usage;assert.equal(usage.snapshots,6);assert.equal(usage.level,'over');
  step(`Six snapshots: over the limit, all ${files.length} files kept`);
  await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
 report.ok=true;console.log(`History capacity passed: ${report.checks.length} checks.`);
}finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser.close();await app.close();await rm(home,{recursive:true,force:true});
}
