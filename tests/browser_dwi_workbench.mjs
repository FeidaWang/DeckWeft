// DWI-040/041/042/043 (workpacks/wes-instrument): the shared workbench shell driven like an author in isolated Chromium.
// One obvious next action per state; one position gauge; the slide dial by keyboard, buttons and pointer with stable ids through
// reorder and deletion; no wheel hijack and no page turn while typing; the tick off by default and silent in an automated session;
// focus returns after dialogs; the canvas keeps its 1440 px scene coordinates at 1366×768, 1920×1080 and 200 % zoom.
// Optional QA: isolated browser + external Playwright module. EVIDENCE_DIR=<folder> saves screenshots and report.json.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,mkdtemp,realpath,writeFile} from 'node:fs/promises';
import {startStudio} from '../src/services/server.mjs';
import {createProject,createSlide} from '../src/core/model.mjs';
import {revealStudio} from './studio-controls.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),shots=process.env.EVIDENCE_DIR?path.resolve(process.env.EVIDENCE_DIR):path.join(root,'dist/dwi-workbench');await mkdir(shots,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const report={browser:'',checks:[],measurements:{},errors:[],externalRequests:[],screenshots:[]};
const step=text=>{report.checks.push(text);console.log('PASS: '+text);};
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-dwi-workbench-')));
const app=await startStudio({home,port:0,seed:false}),browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
try{
 const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
 const call=async(route,data,method='POST')=>{const r=await fetch(app.url+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;};
 const newContext=async(viewport,scale=1)=>{const c=await browser.newContext({viewport,deviceScaleFactor:scale});await c.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:')||url.startsWith('about:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
  // Count synthesized sounds: every oscillator the page creates is recorded.
  await c.addInitScript(()=>{window.__oscillators=0;const A=window.AudioContext;if(A){const make=A.prototype.createOscillator;A.prototype.createOscillator=function(){window.__oscillators++;return make.call(this);};}});return c;};
 const visibleNextActions=page=>page.evaluate(()=>[...document.querySelectorAll('button.primary,button[type=submit],#openExport')].filter(b=>!b.disabled&&b.getClientRects().length&&getComputedStyle(b).visibility!=='hidden'&&!b.closest('dialog:not([open])')&&!b.closest('[hidden]')).filter(b=>{const d=b.closest('dialog[open]');const top=[...document.querySelectorAll('dialog[open]')].at(-1);return top?d===top:true;}).map(b=>b.id||b.textContent.trim()));
 const shoot=async(page,name)=>{await page.screenshot({path:path.join(shots,name)});report.screenshots.push(name);};

 // ---- Empty library: the first run asks for material and offers one action.
 {const c=await newContext({width:1440,height:900}),page=await c.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(app.url+'/');await page.locator('#firstRun').waitFor({state:'visible'});
  const actions=await visibleNextActions(page);report.measurements.emptyNextActions=actions;assert.deepEqual(actions,['Arrange'],JSON.stringify(actions));
  assert.ok(await page.locator('#slideDial').isHidden(),'no dial without pages');
  step('empty library: one next action (Arrange); no dial');await shoot(page,'state-empty.png');await c.close();}

 const demo=(await call('/api/visual/demo',{locale:'en'})).project;
 // ---- An open deck at 1440 × 900: one next action, one position gauge, the dial.
 const c=await newContext({width:1440,height:900}),page=await c.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const measured=()=>page.waitForFunction(()=>{const v=document.querySelector('#canvas');return v?.getAttribute('aria-busy')==='false'&&!v.classList.contains('stale');},{},{timeout:60000});
 const active=()=>page.evaluate(()=>document.querySelector('#slideList .thumbnail.active')?.dataset.slide);
 await page.goto(app.url+'/?project='+demo.id);await measured();await page.locator('#slideList [data-slide]').first().waitFor();await page.waitForFunction(()=>!document.querySelector('#openExport').disabled);
 const ids=demo.plan.scenes.map(s=>s.id),n=ids.length;
 assert.deepEqual(await visibleNextActions(page),['openExport']);
 assert.equal(await page.locator('.dial-value').textContent(),`1 / ${n}`);assert.ok(await page.locator('#pageCount').isHidden());
 assert.equal(await page.locator('meter:visible,progress:visible').count(),0);
 const dupIds=await page.evaluate(()=>{const seen=new Map();for(const e of document.querySelectorAll('[id]'))seen.set(e.id,(seen.get(e.id)||0)+1);return [...seen].filter(([,k])=>k>1).map(([id])=>id);});assert.deepEqual(dupIds,[]);
 step(`open deck: one next action (Take away), one position gauge (the dial “1 / ${n}”; the page count is hidden), no meters, no duplicate ids`);
 await shoot(page,'state-deck.png');
 // Keyboard on the dial: arrows, End, Home.
 const range=page.locator('#slideDial input[type=range]');await range.focus();
 await page.keyboard.press('ArrowRight');await measured();assert.equal(await active(),ids[1]);assert.equal(await page.locator('.dial-value').textContent(),`2 / ${n}`);
 await page.keyboard.press('End');await measured();assert.equal(await active(),ids.at(-1));
 await page.keyboard.press('ArrowRight');await measured();assert.equal(await active(),ids.at(-1),'no wrap past the last page');
 await page.keyboard.press('Home');await measured();assert.equal(await active(),ids[0]);
 assert.equal(await page.evaluate(()=>document.activeElement?.matches('#slideDial input')),true,'focus stays on the dial');
 step('dial by keyboard: ArrowRight, End (no wrap), Home; focus stays on the dial');
 await page.locator('[data-dial=next]').click();await measured();assert.equal(await active(),ids[1]);assert.ok(await page.locator('[data-dial=prev]').isEnabled());
 step('the next and previous buttons are the non-gesture route');
 // Pointer: drag the thumb to the far right.
 const box=await range.boundingBox();await page.mouse.move(box.x+box.width*0.1,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-2,box.y+box.height/2,{steps:8});await page.mouse.up();await measured();
 assert.equal(await active(),ids.at(-1));step('a pointer drag to the end opens the last page once the input settles');
 // No wheel hijack: wheel over the canvas and the strip does not turn the page.
 await page.locator('#slideList [data-slide]').nth(1).click();await measured();
 await page.mouse.move(600,500);await page.mouse.wheel(0,600);await page.waitForTimeout(300);assert.equal(await active(),ids[1]);
 // The studio itself does not scroll: a wheel over the page must not carry the top band (Undo, the title) off screen.
 assert.equal(await page.evaluate(()=>scrollY),0,'the document does not scroll');assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true,'nothing overflows the window');
 step('the mouse wheel over the page does not turn pages or scroll the studio');
 // Reorder keeps the selection by id.
 await page.locator('#moveDown').click();await measured();assert.equal(await active(),ids[1]);assert.equal(await page.locator('.dial-value').textContent(),`3 / ${n}`);
 await page.locator('#moveUp').click();await measured();assert.equal(await active(),ids[1]);assert.equal(await page.locator('.dial-value').textContent(),`2 / ${n}`);
 step('moving the open page down keeps it selected (now 3 / N); moving it back up returns it to 2 / N');
 // Undo and Redo take a page move back and forth like any other edit.
 const strip=()=>page.evaluate(()=>[...document.querySelectorAll('#slideList [data-slide]')].map(e=>e.dataset.slide));
 const moved=[ids[0],ids[2],ids[1],...ids.slice(3)];
 await page.locator('#moveDown').click();await measured();assert.deepEqual(await strip(),moved);
 await page.locator('#undo').click();await measured();assert.deepEqual(await strip(),ids,'Undo restores the order');assert.equal(await active(),ids[1]);assert.equal(await page.locator('.dial-value').textContent(),`2 / ${n}`);
 await page.keyboard.press(process.platform==='darwin'?'Meta+Shift+z':'Control+Shift+z');await measured();assert.deepEqual(await strip(),moved,'Redo moves it again');assert.equal(await page.locator('.dial-value').textContent(),`3 / ${n}`);
 await page.locator('#undo').click();await measured();assert.deepEqual(await strip(),ids);
 await page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.state==='saved',{},{timeout:30000});
 assert.deepEqual((await call('/api/visual/projects/'+demo.id,undefined,'GET')).project.plan.scenes.map(s=>s.id),ids,'autosave stores the restored order');
 step('Undo after Move down restores the order (2 / N); Redo moves the page down again; Undo once more, and autosave stores that order');
 // Typing in a field never turns the page.
 const field=page.locator('#fields textarea, #fields input[type=text]').first();await field.click();const before=await active();await page.keyboard.press('ArrowRight');await page.keyboard.press('End');await page.waitForTimeout(200);assert.equal(await active(),before);
 step('arrow keys while editing a field move the caret, not the page');
 // The tick: off by default; turning it on persists; an automated session synthesizes nothing.
 assert.equal(await page.locator('#dialSound').isChecked(),false);
 await page.locator('#dialSound').check();assert.equal(await page.evaluate(()=>localStorage.getItem('deckweft.dialTick')),'on');
 await range.focus();for(let i=0;i<20;i++)await page.keyboard.press(i%2?'ArrowLeft':'ArrowRight');await measured();
 assert.equal(await page.evaluate(()=>window.__oscillators),0,'navigator.webdriver: silent');
 await page.locator('#dialSound').uncheck();assert.equal(await page.evaluate(()=>localStorage.getItem('deckweft.dialTick')),'off');
 step('tick off by default; the preference persists; 20 rapid detents in an automated session make no sound');
 // Focus returns after dialogs.
 await page.locator('#openExport').click();await page.locator('#exportDialog').waitFor({state:'visible'});
 await page.keyboard.press('Escape');await page.locator('#exportDialog').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'openExport');
 await page.locator('#openMore').click();await page.locator('#moreDialog').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#moreDialog').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'openMore');
 step('focus returns to Take away and to More after Escape');
 // Restore as copy: an earlier version opens as a new deck; the deck it came from keeps every revision.
 await page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.state==='saved',{},{timeout:30000});
 const original=(await call('/api/visual/projects/'+demo.id,undefined,'GET')).project;
 // Autosave writes the earlier versions; wait until the store lists one, so the dialog has something to restore.
 for(let i=0;i<40&&!(await call('/api/visual/projects/'+demo.id+'/history',undefined,'GET')).snapshots.length;i++)await page.waitForTimeout(250);
 // The drawer sits over the out-of-process preview frame: a click right after it paints can land in the frame (single-entry step 3 trap). One bounded retry, counted in the report.
 for(let attempt=1;;attempt++){await revealStudio(page,'library');await page.locator('#openHistory').click();try{await page.locator('#historyDialog [data-revision]').first().waitFor({timeout:5000});report.measurements.historyOpenAttempts=attempt;break;}catch(e){if(attempt>=2)throw e;}}
 report.measurements.historyItems=await page.locator('#historyList [data-revision]').count();for(let attempt=1;;attempt++){await page.locator('#historyList [data-revision]').last().press('Enter');try{await page.locator('#restore').waitFor({state:'visible',timeout:5000});report.measurements.snapshotOpenAttempts=attempt;break;}catch(e){if(attempt>=2)throw e;}}await page.locator('#restore').click();
 await page.locator('#historyDialog').waitFor({state:'hidden'});await measured();
 const projects=(await call('/api/visual/projects',undefined,'GET')).projects;assert.ok(projects.length>=2,'a copy was created');
 assert.deepEqual((await call('/api/visual/projects/'+demo.id,undefined,'GET')).project,original,'the source deck is unchanged');
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'openMore','focus returns to More after the history dialog');
 step('restore as copy opens a new deck, the source deck is unchanged, and focus returns to More');
 report.measurements.exportDialogActions=await (async()=>{await page.locator('#openExport').click();await page.locator('#exportDialog').waitFor({state:'visible'});const a=await visibleNextActions(page);await shoot(page,'state-export.png');await page.keyboard.press('Escape');return a;})();
 await c.close();

 // ---- Classic deck: deleting the open page falls back to its neighbour; a one-page deck disables movement.
 {const p=createProject({title:'Three pages'});p.slides=[createSlide({title:'One'}),createSlide({title:'Two'}),createSlide({title:'Three'})];const saved=(await call('/api/projects',{project:p})).project;
  const k=await newContext({width:1440,height:900}),pg=await k.newPage();pg.on('pageerror',e=>report.errors.push(e.message));pg.on('dialog',d=>d.accept());
  await pg.goto(app.url+'/?project='+saved.id);await pg.locator('#slideDial').waitFor({state:'visible'});
  const act=()=>pg.evaluate(()=>document.querySelector('#slideList .thumbnail.active')?.dataset.slide);
  await pg.locator('[data-dial=next]').click();await pg.waitForFunction(id=>document.querySelector('#slideList .thumbnail.active')?.dataset.slide===id,saved.slides[1].id);
  await pg.locator('#deleteSlide').click();await pg.waitForFunction(()=>document.querySelectorAll('#slideList .thumbnail').length===2);
  const now=await act();assert.ok([saved.slides[0].id,saved.slides[2].id].includes(now));assert.equal(await pg.locator('.dial-value').textContent(),`${now===saved.slides[0].id?1:2} / 2`);
  step('classic deck: deleting the open page lands on its neighbour and the dial shows N−1 pages');
  await pg.locator('#deleteSlide').click();await pg.waitForFunction(()=>document.querySelectorAll('#slideList .thumbnail').length===1);
  assert.ok(await pg.locator('#slideDial input').isDisabled());assert.ok(await pg.locator('[data-dial=prev]').isDisabled());assert.ok(await pg.locator('[data-dial=next]').isDisabled());assert.equal(await pg.locator('.dial-value').textContent(),'1 / 1');
  step('one page: the dial shows 1 / 1 and movement is disabled');await k.close();}

 // ---- Viewports: the scene keeps 1440 px coordinates; primary controls stay reachable.
 for(const [name,viewport,scale] of [['1366x768',{width:1366,height:768},1],['1920x1080',{width:1920,height:1080},1],['200pct-of-1366x768',{width:683,height:384},2]]){
  const v=await newContext(viewport,scale),pg=await v.newPage();pg.on('pageerror',e=>report.errors.push(e.message));
  await pg.goto(app.url+'/?project='+demo.id);await pg.waitForFunction(()=>document.querySelector('#canvas')?.getAttribute('aria-busy')==='false'&&document.querySelector('#preview')?.offsetWidth>0,{},{timeout:60000});
  const m=await pg.evaluate(()=>{const f=document.querySelector('#preview');const r=f?.getBoundingClientRect();const inView=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const b=e.getBoundingClientRect();return b.right<=innerWidth+1&&b.bottom<=innerHeight+1&&b.left>=-1&&b.top>=-1;};return {frameLayoutWidth:f?.offsetWidth??null,frameShownWidth:r?Math.round(r.width):null,takeAway:inView('#openExport'),undo:inView('#undo'),dial:inView('#slideDial'),edit:inView('#toggleInspector')};});
  report.measurements[name]=m;assert.equal(m.frameLayoutWidth,1440,`${name}: the scene is laid out at 1440 px and scaled`);assert.equal(m.takeAway,true,`${name}: Take away reachable`);assert.equal(m.undo,true,`${name}: Undo reachable`);
  await shoot(pg,`viewport-${name}.png`);await v.close();
 }
 step('1366×768, 1920×1080 and 200 % zoom: the scene stays 1440 px wide inside and is scaled; Take away and Undo stay on screen');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);step('no page errors and no external requests');
}finally{await writeFile(path.join(shots,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await app.close();}
