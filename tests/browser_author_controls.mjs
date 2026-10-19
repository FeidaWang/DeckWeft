// S9a author controls in the real Studio UI: six-question entry and three measured directions, planned author actions with
// stated effects, undo/redo, chapters, separate locks, page planning, design profiles and the PowerPoint/PDF export menu.
// Isolated browser only (outside /Applications, temporary profile); every non-loopback request is refused and recorded.
// Usage: CHROMIUM_PATH=/isolated/chrome PLAYWRIGHT_MODULE=/abs/playwright/index.mjs node tests/browser_author_controls.mjs [--out dist/s9a-author-controls]
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile,realpath,rm,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {revealStudio,studioExport,closeExportDialog} from './studio-controls.mjs';
const {values:a}=parseArgs({options:{out:{type:'string'},widths:{type:'string'}}}),out=path.resolve(a.out||'dist/s9a-author-controls'),shots=path.join(out,'shots');
await rm(path.join(out,'library'),{recursive:true,force:true});await mkdir(path.join(out,'library'),{recursive:true});await mkdir(shots,{recursive:true});
const home=await realpath(path.join(out,'library')),binary=await realpath(process.env.CHROMIUM_PATH||'');assert.ok(!/\/Applications\//i.test(binary),'Use an isolated browser outside /Applications.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),store=await new VisualProjectStore(home).init();
const TEXT={en:'Why do exports drift?\nTeams lose hours fixing slides after export.\nThe fixes are rarely recorded.\n---\nHow the pipeline works\nThe browser measures the static scene.\nEach page is repaired on its own.\n- Measure the static scene\n- Repair one page\n---\nEvidence: what we measured\nPowerPoint editability passed on 18 of 18 decks.\n---\nLimits\nKeynote was not run.\n---\nNext steps\n- Run PowerPoint yourself\n- Record the result',
 'zh-CN':'为什么导出会走样？\n团队在导出后花很多时间修补幻灯片。\n这些修补很少被记录。\n---\n流程如何运作\n浏览器测量静态场景。\n每一页单独修复。\n- 测量静态场景\n- 修复一页\n---\n证据：我们测到了什么\nPowerPoint 可编辑性在 18 份文稿中全部通过。\n---\n局限\n尚未运行 Keynote。\n---\n下一步\n- 由你运行 PowerPoint\n- 记录结果'};
const fresh=async()=>store.save(await createCompositionDemo('en',store.home),{create:true});let deckA=await fresh();const deckB=await store.save(await createCompositionDemo('zh-CN',store.home),{create:true});
const app=await startStudio({home,port:0,captureBrowser:binary}),browser=await chromium.launch({executablePath:binary,headless:true});
const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
const api=async(route,data,method=data===undefined?'GET':'POST')=>{const r=await fetch(app.url+'/api/visual/'+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});return r.json();};
const trace=[],errors=[],external=[],started=Date.now();
const record=(width,step,detail={})=>{trace.push({width,step,ms:Date.now()-started,...detail});console.log(width,step,JSON.stringify(detail).slice(0,240));};
async function open(width,query){
 const context=await browser.newContext({viewport:{width,height:width<500?860:1000},acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push({width,message:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({width,console:m.text()});});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(app.url+'/')||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();external.push(u);return r.abort();});
 await page.goto(app.url+'/visual'+query);await page.waitForFunction(()=>document.querySelector('#sceneTitle')?.textContent.length>0||!document.querySelector('#emptyCanvas')?.hidden);
 return {context,page};
}
const saveDeck=async page=>{await page.locator('#save').click();await page.waitForFunction(()=>/Saved on this computer|已保存在本机/.test(document.querySelector('#message').textContent)&&document.querySelector('#save').disabled);};
const measured=page=>page.waitForFunction(()=>/✓/.test(document.querySelector('#fit')?.textContent||''),{},{timeout:60000});
const settle=async page=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);};
async function shot(page,name,target){await settle(page);const file=path.join(shots,name+'.png');if(target)await page.locator(target).screenshot({path:file});else await page.screenshot({path:file,fullPage:false});return path.relative(out,file);}
async function action(page,width,{level,object,act,kind,expect}){
 await revealStudio(page,'edit');if(!await page.locator('#authorControls').evaluate(n=>n.open))await page.locator('#authorControls > summary').click();
 if(level)await page.locator('#actionLevel').selectOption(level);if(object)await page.locator('#actionObject').selectOption(object);if(kind)await page.locator('#lockKind').selectOption(kind);
 await page.locator(`[data-author-action="${act}"]`).click();await page.locator('#actionPlan').waitFor({state:'visible'});
 const plan={scope:await page.locator('#actionScope').textContent(),effects:await page.locator('#actionEffects li').allTextContents(),kept:await page.locator('#actionKept li').allTextContents(),applyEnabled:await page.locator('#actionApply').isEnabled()};
 if(expect)assert.match([plan.scope,...plan.effects,...plan.kept].join(' '),expect,act);
 return plan;
}
const widths=(a.widths||'1440,1024,390').split(',').map(Number),artifacts={};
try{
 for(const width of widths){
  if(width!==widths[0])deckA=await fresh();
  // 1. Default entry: six questions, three measured directions of the same text.
  {const {context,page}=await open(width,'?project='+deckA.id);
   await revealStudio(page,'create');await page.locator('#workbenchPrompt').fill(TEXT.en);await page.locator('#entryAudience').fill('Release reviewers');await page.locator('#entryOutput').selectOption('pptx');
   await page.locator('#entryDirections').click();await page.waitForFunction(()=>document.querySelectorAll('.direction-card').length===3&&[...document.querySelectorAll('.direction-card .candidate-fit')].every(n=>!/Measuring/.test(n.textContent)),{},{timeout:90000});
   const cards=await page.locator('.direction-card').evaluateAll(cards=>cards.map(c=>({title:c.querySelector('h3').textContent,fit:c.querySelector('.candidate-fit').textContent,use:!c.querySelector('[data-use-direction]').disabled,explain:[...c.querySelectorAll('dd')].map(d=>d.textContent)})));
   assert.equal(cards.length,3);assert.equal(new Set(cards.map(c=>c.explain[1])).size,3,'type differs');
   const facts=await page.locator('#directionFacts').textContent(),plan=await page.locator('#entryPagePlan').textContent();
   if(width<1000&&await page.locator('#closeDirection').isVisible())await page.locator('#closeDirection').click();
   await page.locator('#directionsPanel').scrollIntoViewIfNeeded();const panel=await shot(page,`directions-${width}`,'#directionsPanel'),each=[];
   // Each card on screen before its capture: off-screen iframes are not painted in a tall element screenshot.
   for(let k=0;k<3;k++){const card=page.locator(`[data-direction="${k}"]`);await card.scrollIntoViewIfNeeded();await page.waitForTimeout(400);each.push(await shot(page,`direction-${k+1}-${width}`,`[data-direction="${k}"]`));}
   record(width,'entry: three directions measured',{cards,facts,plan,shot:panel,cardShots:each});
   if(width===1440){
    // Expand direction 2 to the deck through the workbench, then check the deck has its design and the same words.
    const chosen=cards[1].title;await page.locator('[data-use-direction="1"]').click();
    await page.waitForFunction(()=>['browser-capture','exported','actual-image-review','review-required'].includes(document.querySelector('#workbenchProgress').dataset.status),{},{timeout:120000});
    const list=(await api('projects')).projects,made=list.find(p=>p.id!==deckA.id&&p.id!==deckB.id&&/exports drift/.test(p.title)),project=(await api('projects/'+made.id)).project;artifacts.generated=made.id;
    assert.ok(project.extensions.deckweftDirection);assert.ok(chosen.includes(project.extensions.deckweftDirection.theme));
    await measured(page);await page.locator('#frameSpace').scrollIntoViewIfNeeded();record(width,'entry: direction expanded to the deck',{chosen,theme:project.extensions.deckweftDirection.theme,pages:project.plan.scenes.map(s=>s.composition),shot:await shot(page,`expanded-${width}`,'#frameSpace')});
   }
   await context.close();}
  // 2. Author actions on the six-family deck: plan → statement → apply → undo/redo.
  {const {context,page}=await open(width,'?project='+deckA.id+'&scene=chapter');await measured(page);
   const reduce=await action(page,width,{level:'object',object:'chapter-body',act:'reduce-text',expect:/behind “More detail”[\s\S]*PowerPoint notes/});
   record(width,'reduce text: effect stated before apply',{...reduce,shot:await shot(page,`plan-reduce-${width}`,'#authorControls')});
   await page.locator('#actionApply').click();await measured(page);await page.frameLocator('#preview').locator('.scene-disclosure').first().waitFor();
   const summary=await page.frameLocator('#preview').locator('.scene-disclosure summary').first().textContent();record(width,'reduce text: applied; disclosure in preview',{summary,shot:await shot(page,`applied-reduce-${width}`,'#frameSpace')});
   await revealStudio(page,'file');await page.locator('#undo').click();await measured(page);assert.equal(await page.frameLocator('#preview').locator('.scene-disclosure').count(),0,'undo removes the disclosure');
   await revealStudio(page,'file');await page.locator('#redo').click();await measured(page);assert.equal(await page.frameLocator('#preview').locator('.scene-disclosure').count(),1,'redo restores it');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);record(width,'reduce text: undo and redo',{horizontalOverflowPx:overflow});if(width===390)assert.ok(overflow<=1,'no horizontal page scroll at 390 px');
   if(width===1440){
    // Give the chart more space: in Research Atlas the theme's figure layout draws the plot largest (measured); undo returns the side layout.
    await page.locator('[data-scene="evidence"]').first().click();await measured(page);await revealStudio(page,'edit');await page.locator('#designTab').click();await page.locator('#theme').selectOption('fresh-report');await measured(page);
    const space=await action(page,width,{level:'page',act:'chart-space',expect:/figure layout draws the plot largest/});await page.locator('#actionApply').click();await measured(page);
    assert.match(await page.frameLocator('#preview').locator('section#evidence').getAttribute('class'),/atlas-figure/);const plotAfter=await page.frameLocator('#preview').locator('section#evidence .chart-plot svg').first().boundingBox();
    record(width,'chart space: largest measured layout for the theme',{effects:space.effects,plot:plotAfter,shot:await shot(page,`chart-space-${width}`,'#frameSpace')});
    // Keep this layout on a theme-own composition: a theme change is refused by name. On a shared composition the geometry survives.
    const keep=await action(page,width,{level:'page',act:'keep-layout',expect:/this theme's own composition|本主题专属/});await page.locator('#actionApply').click();await measured(page);
    await page.locator('#designTab').click();await page.locator('#theme').selectOption('dark-data');await page.waitForFunction(()=>document.querySelector('#message').classList.contains('error'));const refusal=await page.locator('#message').textContent();
    await page.locator('[data-scene="collage"]').first().click();await measured(page);await action(page,width,{level:'page',act:'keep-layout',expect:/shared composition/});await page.locator('#actionApply').click();await measured(page);
    await page.locator('#designTab').click();await page.locator('#theme').selectOption('orange-launch');await measured(page);const collage=await page.frameLocator('#preview').locator('section#collage').getAttribute('class');assert.match(collage,/metric-left/);
    record(width,'keep layout: theme-own layout refuses a theme change; shared layout survives it',{keep:keep.effects,refusal,collage,shot:await shot(page,`keep-layout-${width}`,'#frameSpace')});
    await page.locator('[data-scene="evidence"]').first().click();await measured(page);
    const lock=await action(page,width,{level:'object',object:'data-chart',act:'lock',kind:'data',expect:/Separates text, data and source locks first[\s\S]*Locks data: adoption-quarterly/});await page.locator('#actionApply').click();
    record(width,'separate data lock (explicit migration stated)',{effects:lock.effects,summary:await page.locator('#lockSummary').textContent()});
    await page.locator('[data-scene="comparison"]').first().click();await measured(page);
    const chapter=await action(page,width,{act:'start-chapter',expect:/starts a chapter: pages 5–6/});await page.locator('#actionApply').click();await measured(page);
    const editorial=await action(page,width,{level:'chapter',act:'more-editorial',expect:/Chapter from page 5/});await page.locator('#actionApply').click();await measured(page);
    record(width,'chapter started and chapter-level More editorial',{chapter:chapter.effects,editorial:editorial.effects,flags:await page.locator('#scenes .scene-flag').allTextContents(),shot:await shot(page,`chapter-${width}`,'.scene-panel')});
    await saveDeck(page);
    const saved=(await api('projects/'+deckA.id)).project;assert.equal(saved.document.authorOverrides.lockMode,'separate');assert.deepEqual(saved.plan.chapters.map(c=>c.startSceneId),['comparison']);assert.ok(saved.plan.scenes.find(s=>s.id==='chapter').disclosure);
    // Profile: promote the saved design (author acceptance), reload, apply to the Chinese deck, export all four formats.
    await revealStudio(page,'edit');await page.locator('#profileName').fill('Six-family editorial');await page.locator('#profileAttest').check();await page.locator('#profileSave').click();
    await page.waitForFunction(()=>document.querySelectorAll('#profileList option').length>0);record(width,'profile saved',{message:await page.locator('#message').textContent()});
    // History restore as a copy keeps chapters, disclosure and the separate locks: supersede the saved revision, then restore it.
    const next=structuredClone(saved);next.plan.scenes[0].colorMode='default';const resaved=(await api('projects/'+deckA.id,{project:next,expectedRevision:saved.revision.number},'PUT')).project;assert.equal(resaved.revision.number,saved.revision.number+1);
    const snap=await api('projects/'+deckA.id+'/history/'+saved.revision.number),restored=(await api('projects/'+deckA.id+'/history/'+saved.revision.number+'/restore',{mode:'copy',snapshotHash:snap.sha256,requestId:'s9a-browser-restore-0001'})).project;
    assert.deepEqual(restored.plan.chapters,saved.plan.chapters);assert.deepEqual(restored.document.authorOverrides,saved.document.authorOverrides);assert.deepEqual(restored.plan.scenes.map(s=>s.disclosure||null),saved.plan.scenes.map(s=>s.disclosure||null));
    record(width,'saved; history restore-as-copy keeps chapters, disclosure and locks',{restored:restored.id,revision:saved.revision.number});
    await context.close();
    const second=await open(width,'?project='+deckB.id);await measured(second.page);await revealStudio(second.page,'edit');if(!await second.page.locator('#authorControls').evaluate(n=>n.open))await second.page.locator('#authorControls > summary').click();
    await second.page.waitForFunction(()=>document.querySelectorAll('#profileList option').length>0,{},{timeout:10000});assert.equal(await second.page.locator('#profileList option').count(),1,'profile listed after reload');
    const applied=await action(second.page,width,{level:'deck',act:'apply-profile'});await second.page.locator('#actionApply').click();await measured(second.page);
    await saveDeck(second.page);await measured(second.page);
    const after=(await api('projects/'+deckB.id)).project;record(width,'profile applied to the zh-CN deck',{effects:applied.effects.slice(0,6),kept:applied.kept,themes:[...new Set(after.plan.scenes.map(s=>s.theme))],shot:await shot(second.page,`profile-applied-${width}`,'#frameSpace')});
    for(const [id,ext] of [['#exportHTML','html'],['#exportPPTX','pptx'],['#exportPDF','pdf'],['#exportJSON','json']]){
     await second.page.waitForFunction(s=>!document.querySelector(s).disabled,id);const before=await second.page.locator('#message').textContent(),waiting=second.page.waitForEvent('download',{timeout:120000});
     // PowerPoint and PDF go through the export dialog (F1): paging auto by default, then Export.
     if(ext==='pptx'||ext==='pdf'){const r=await studioExport(second.page,id);if(r.status!=='pass')throw Error(`${ext} export refused (${r.status}): ${r.text}`);record(width,'export dialog '+ext,{status:r.status,paginateVisible:r.paginateVisible});await closeExportDialog(second.page);}else await second.page.locator(id).click();
     const download=await Promise.race([waiting,second.page.waitForFunction(b=>document.querySelector('#message').classList.contains('error')&&document.querySelector('#message').textContent!==b,before,{timeout:120000}).then(async()=>{throw Error(ext+' export refused: '+await second.page.locator('#message').textContent());})]);
     const file=path.join(out,'exports','profile-applied-zh-CN.'+ext);await mkdir(path.dirname(file),{recursive:true});await download.saveAs(file);const bytes=await readFile(file);
     assert.ok(ext==='pptx'?bytes.subarray(0,2).toString()==='PK':ext==='pdf'?bytes.subarray(0,4).toString()==='%PDF':bytes.length>100);
     record(width,'export '+ext,{bytes:bytes.length,message:await second.page.locator('#message').textContent()});}
    const [exported]=await Promise.all([second.page.waitForEvent('download'),second.page.locator('#profileExport').click()]),pfile=path.join(out,'exports','profile.design-profile.json');await exported.saveAs(pfile);
    await second.page.locator('#profileImport').setInputFiles(pfile);await second.page.waitForFunction(()=>document.querySelectorAll('#profileList option').length===2);
    record(width,'profile exported and imported as a copy',{profiles:await second.page.locator('#profileList option').allTextContents()});
    await second.context.close();
   }else await context.close();}
  // 3. Pages from the argument on the expanded text deck: questions, evidence-required mark, export refused.
  if(width===1440&&artifacts.generated){const {context,page}=await open(width,'?project='+artifacts.generated);await measured(page);
   await revealStudio(page,'edit');if(!await page.locator('#authorControls').evaluate(n=>n.open))await page.locator('#authorControls > summary').click();
   await page.locator('#planDetail').selectOption('detailed');await page.locator('#planTarget').fill('9');await page.locator('#planPages').click();await page.locator('#pagePlan').waitFor({state:'visible'});
   const questions=await page.locator('#pagePlan .plan-questions li').allTextContents();assert.ok(questions.some(q=>/will not (pad|invent)/i.test(q)||/不会/.test(q)),'the planner asks instead of padding');
   record(width,'page plan asks for material instead of padding',{questions,shot:await shot(page,`page-plan-${width}`,'#authorControls')});
   if(await page.locator('#planMark').isEnabled()){await page.locator('#planMark').click();await measured(page);await page.waitForFunction(()=>document.querySelectorAll('#scenes .scene-flag.evidence').length>0&&[...document.querySelectorAll('#scenes .scene-thumb')].every(n=>n.children.length),{},{timeout:15000}).catch(()=>{});const flags=await page.evaluate(()=>document.querySelectorAll('#scenes .scene-flag.evidence').length);
    await saveDeck(page);
    const marked=(await api('projects/'+artifacts.generated)).project,refused=await api('export',{project:marked,format:'html'});assert.equal(refused.error?.code,'EVIDENCE_REQUIRED');
    record(width,'evidence-required marked; final export refused by name',{flags,pages:marked.plan.scenes.filter(s=>s.contentStatus==='evidence-required').map(s=>s.id),refusal:refused.error.message,shot:await shot(page,`evidence-required-${width}`,'.scene-panel')});}
   else record(width,'no page to mark',{});
   await context.close();}
 }
 record(0,'done',{errors:errors.length,external:external.length});
}catch(e){record(0,'failed',{message:e.message,stack:e.stack?.split('\n').slice(0,4)});process.exitCode=1;}
finally{await writeFile(path.join(out,'trace.json'),JSON.stringify({format:'deckweft-s9a-browser-trace',version:1,browser:browser.version(),binary:/ms-playwright/.test(binary)?'Chrome for Testing (Playwright cache, isolated)':'isolated',node:process.version,widths,errors,externalRequests:external,trace},null,1));await browser.close();await app.close();}
