// S9a author controls in the real Studio UI, on the shared shell since single entry step 3: three measured directions at a chosen
// detail, the Look buttons with stated effects, undo/redo, chapters from the page menu, one page lock, saved looks and the
// PowerPoint/PDF part of Take away. Actions that left the browser (reduce text, chart space, keep layout, page planning) are
// planned through the same API with the same stated effects.
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
import {revealStudio,studioExport,closeExportDialog,closeStudio,saved as squareSaved} from './studio-controls.mjs';
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
 await page.goto(app.url+'/'+query);await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#sceneTitle')?.textContent.length>0||!document.querySelector('#emptyCanvas')?.hidden);
 return {context,page};
}
// Single entry step 3: autosave and the state square replace Save; the canvas says when the preview of these exact edits is measured.
const measured=page=>page.waitForFunction(()=>{const c=document.querySelector('#canvas');return c?.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale');},{},{timeout:60000});
const settle=async page=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);};
async function shot(page,name,target){await settle(page);const file=path.join(shots,name+'.png');if(target)await page.locator(target).screenshot({path:file});else await page.screenshot({path:file,fullPage:false});return path.relative(out,file);}
// The stated effect of a Look button, shown after it applied.
async function note(page,expect){await page.locator('#actionPlan').waitFor({state:'visible'});const plan={title:await page.locator('#actionTitle').textContent(),scope:await page.locator('#actionScope').textContent(),effects:await page.locator('#actionEffects li').allTextContents(),kept:await page.locator('#actionKept li').allTextContents()};if(expect)assert.match([plan.scope,...plan.effects,...plan.kept].join(' '),expect,plan.title);return plan;}
// The author actions that left the browser are still planned through the API, with the same stated effect.
const planned=async(project,action,level,id,options={})=>{const r=await api('author-action',{project,action,level,id,options});assert.ok(!r.error,JSON.stringify(r.error));return r;};
const statement=p=>[p.scopeStatement.en,...p.effects.map(v=>v.en),...p.kept.map(v=>v.en)].join(' ');
const current=async id=>(await api('projects/'+id)).project;
// Autosave lands 1.2 s after an edit: poll the saved deck until it shows the change.
async function savedWhen(id,test,timeout=30000){const end=Date.now()+timeout;for(;;){const p=await current(id);if(test(p))return p;if(Date.now()>end)throw Error('autosave did not land');await new Promise(r=>setTimeout(r,250));}}
const widths=(a.widths||'1440,1024,390').split(',').map(Number),artifacts={};
try{
 for(const width of widths){
  if(width!==widths[0])deckA=await fresh();
  // 1. Three measured directions of the open deck, at the chosen detail. The six questions left with the first-run paste box.
  // Directions are applied to a copy of their own, so the actions below start from the untouched six-family deck.
  {const deckDir=await fresh(),{context,page}=await open(width,'?project='+deckDir.id);await measured(page);
   for(const gone of ['#entryFields','#entryAudience','#entryOutput','#entryBasis','#entryStyle','#entryMotion','#closeDirection','#workbench-uiLanguage','#workbench-promptLanguage','#workbench-contentTone'])assert.equal(await page.locator(gone).count(),0,gone);
   await revealStudio(page,'compositions');await page.locator('[data-detail="detailed"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('.direction-card').length===3&&[...document.querySelectorAll('.direction-card .candidate-fit')].every(n=>!/Measuring/.test(n.textContent)),{},{timeout:90000});
   const cards=await page.locator('.direction-card').evaluateAll(cards=>cards.map(c=>({title:c.querySelector('.candidate-label span').textContent,fit:c.querySelector('.candidate-fit').textContent,use:!c.querySelector('[data-use-direction]').disabled,explain:[...c.querySelectorAll('dd')].map(d=>d.textContent)})));
   assert.equal(cards.length,3);assert.equal(new Set(cards.map(c=>c.explain[1])).size,3,'type differs');
   const facts=await page.locator('#directionFacts').textContent(),plan=await page.locator('#entryPagePlan').textContent();
   await page.locator('#directionsPanel').scrollIntoViewIfNeeded();const panel=await shot(page,`directions-${width}`,'#directionsPanel'),each=[];
   // Each card on screen before its capture: off-screen iframes are not painted in a tall element screenshot.
   for(let k=0;k<3;k++){const card=page.locator(`[data-direction="${k}"]`);await card.scrollIntoViewIfNeeded();await page.waitForTimeout(400);each.push(await shot(page,`direction-${k+1}-${width}`,`[data-direction="${k}"]`));}
   record(width,'entry: three directions measured',{cards,facts,plan,shot:panel,cardShots:each});
   if(width===1440){
    // Apply direction 2 to the deck: every page takes its design and the words stay.
    const chosen=cards[1].title,before=await current(deckDir.id);await page.locator('[data-use-direction="1"]').click();await measured(page);
    const project=await savedWhen(deckDir.id,p=>!!p.extensions.deckweftDirection);await squareSaved(page);assert.ok(project.extensions.deckweftDirection);assert.ok(chosen.includes(project.extensions.deckweftDirection.theme));
    assert.deepEqual(project.document.blocks.map(b=>b.text??null),before.document.blocks.map(b=>b.text??null),'the same words');
    await page.locator('#frameSpace').scrollIntoViewIfNeeded();record(width,'entry: direction applied to the deck',{chosen,theme:project.extensions.deckweftDirection.theme,pages:project.plan.scenes.map(s=>s.composition),shot:await shot(page,`expanded-${width}`,'#frameSpace')});
   }
   await context.close();}
  // 2. Author actions on the six-family deck. Reduce text left the browser: planned and applied through the API, then seen in the preview.
  {let base=await current(deckA.id);const reduce=await planned(base,'reduce-text','object','chapter-body');assert.match(statement(reduce),/behind “More detail”[\s\S]*PowerPoint notes/);
   base=(await api('projects/'+deckA.id,{project:reduce.project,expectedRevision:base.revision.number},'PUT')).project;record(width,'reduce text (API): effect stated before apply',{scope:reduce.scopeStatement.en,effects:reduce.effects.map(v=>v.en)});
   const {context,page}=await open(width,'?project='+deckA.id+'&scene=chapter');await measured(page);
   for(const gone of ['#authorControls','#actionLevel','#actionObject','#lockKind','#actionApply','#actionCancel','#replaceFields','#planPages','#planMark','#planSplit','#pagePlan','#planDetail','#planTarget','[data-author-action="reduce-text"]','[data-author-action="chart-space"]','[data-author-action="keep-layout"]','[data-author-action="quieter"]','[data-author-action="replace-visual"]','[data-author-action="lock"]','[data-author-action="unlock"]','[data-author-action="start-chapter"]','[data-author-action="remove-chapter"]','[data-author-action="apply-profile"]'])assert.equal(await page.locator(gone).count(),0,gone);
   await page.frameLocator('#preview').locator('.scene-disclosure').first().waitFor();
   const summary=await page.frameLocator('#preview').locator('.scene-disclosure summary').first().textContent();record(width,'reduce text: applied; disclosure in preview',{summary,shot:await shot(page,`applied-reduce-${width}`,'#frameSpace')});
   // More space: one button, applied at once with its stated effect; Undo and Redo in the band restore and repeat it. Page 6 takes it.
   const sectionClass=()=>page.frameLocator('#preview').locator('section#process').getAttribute('class');
   await page.locator('#slideList [data-slide="process"]').click();await measured(page);await revealStudio(page,'compositions');const beforeSpace=await sectionClass();await page.locator('#moreSpace').click();const space=await note(page);await measured(page);const afterSpace=await sectionClass();
   record(width,'more space: effect stated after it applied',{...space,beforeSpace,afterSpace,shot:await shot(page,`plan-more-space-${width}`,'[data-zone=look]')});
   assert.notEqual(afterSpace,beforeSpace,'more space changes the page');
   // Below 1050 px Look is a sheet over the page; close it to reach Undo in the band. On a phone Undo and Redo sit at the top of More.
   const band=async id=>{await closeStudio(page);if(!await page.locator(id).isVisible())await revealStudio(page,'library');await page.locator(id).click();await closeStudio(page);};
   await band('#undo');await measured(page);assert.equal(await sectionClass(),beforeSpace,'undo restores the layout');
   if(await page.locator('#redo').isHidden()&&await page.locator('#undo').isVisible()){await page.locator('#undo').hover();await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();}
   await band('#redo');await measured(page);assert.equal(await sectionClass(),afterSpace,'redo repeats it');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);record(width,'more space: undo and redo',{horizontalOverflowPx:overflow});if(width===390)assert.ok(overflow<=1,'no horizontal page scroll at 390 px');
   if(width===1440){
    // Give the chart more space (API): in Research Atlas the theme's figure layout draws the plot largest (measured); the preview shows it.
    await page.locator('#slideList [data-slide="evidence"]').click();await measured(page);await revealStudio(page,'compositions');await page.locator('[data-zone=look] [data-theme="fresh-report"]').click();await measured(page);
    let deck=await savedWhen(deckA.id,p=>p.plan.scenes.find(s=>s.id==='evidence').theme==='fresh-report');await squareSaved(page);const space=await planned(deck,'chart-space','page','evidence');assert.match(statement(space),/figure layout draws the plot largest/);
    deck=(await api('projects/'+deckA.id,{project:space.project,expectedRevision:deck.revision.number},'PUT')).project;await page.reload();await page.waitForSelector('#root.workspace',{state:'attached'});await measured(page);await page.locator('#slideList [data-slide="evidence"]').click();await measured(page);
    assert.match(await page.frameLocator('#preview').locator('section#evidence').getAttribute('class'),/atlas-figure/);const plotAfter=await page.frameLocator('#preview').locator('section#evidence .chart-plot svg').first().boundingBox();
    record(width,'chart space (API): largest measured layout for the theme',{effects:space.effects.map(v=>v.en),plot:plotAfter,shot:await shot(page,`chart-space-${width}`,'#frameSpace')});
    // Keep this layout (API): a theme-own composition refuses a theme change by name; a shared composition keeps its geometry.
    const keep=await planned(deck,'keep-layout','page','evidence');assert.match(statement(keep),/this theme's own composition/);
    const refused=await api('theme',{project:keep.project,sceneId:'evidence',theme:'dark-data'});assert.ok(refused.error?.message,'theme change refused');
    const keepShared=await planned(keep.project,'keep-layout','page','collage');assert.match(statement(keepShared),/shared composition/);
    const themed=await api('theme',{project:keepShared.project,sceneId:'collage',theme:'orange-launch'});assert.match(themed.project.plan.scenes.find(s=>s.id==='collage').composition,/metric-left/);
    record(width,'keep layout (API): theme-own layout refuses a theme change; shared layout survives it',{keep:keep.effects.map(v=>v.en),refusal:refused.error.message,collage:themed.project.plan.scenes.find(s=>s.id==='collage').composition});
    // Lock this page: the four author locks in one button, data lock included (explicit separation stated); the colours lock too.
    const lock=await (async()=>{await revealStudio(page,'compositions');await page.locator('#keepPage').click();return note(page,/Separates text, data and source locks first[\s\S]*Locks data: adoption-quarterly/);})();
    assert.equal(await page.locator('#keepPage').getAttribute('aria-pressed'),'true');assert.ok(await page.locator('[data-zone=look] [data-theme="dark-data"]').isDisabled());
    record(width,'lock this page: separate data lock (explicit migration stated)',{effects:lock.effects,summary:await page.locator('#lockSummary').textContent()});
    // A chapter starts from the page menu of the strip.
    await page.locator('#slideList [data-slide="comparison"]').click();await measured(page);await page.locator('#slideList [data-slide="comparison"]').click({button:'right'});await page.locator('#pageMenu').waitFor({state:'visible'});await page.locator('#pageMenu [role=menuitem]').first().click();
    const chapter=await note(page,/starts a chapter: pages 5–6/);await measured(page);
    deck=await savedWhen(deckA.id,p=>(p.plan.chapters||[]).some(c=>c.startSceneId==='comparison')&&p.document.authorOverrides.lockMode==='separate');await squareSaved(page);const chapterId=deck.plan.chapters.find(c=>c.startSceneId==='comparison').id,editorial=await planned(deck,'more-editorial','chapter',chapterId);assert.match(statement(editorial),/Chapter from page 5/);
    record(width,'chapter started from the page menu; chapter-level More editorial (API)',{chapter:chapter.effects,editorial:editorial.effects.map(v=>v.en),flags:await page.locator('#slideList .thumbnail-mark:not([hidden])').allTextContents(),shot:await shot(page,`chapter-${width}`,'.page-strip')});
    assert.ok((await page.locator('#slideList .thumbnail-mark:not([hidden])').allTextContents()).some(t=>/Chapter/.test(t)),'the chapter shows on the strip');
    const saved=await current(deckA.id);assert.equal(saved.document.authorOverrides.lockMode,'separate');assert.deepEqual(saved.plan.chapters.map(c=>c.startSceneId),['comparison']);assert.ok(saved.plan.scenes.find(s=>s.id==='chapter').disclosure);
    // Save this look: promote the saved design (author acceptance), reload, apply to the Chinese deck, export all four formats.
    await revealStudio(page,'library');await page.locator('#saveLook > summary').click();await page.locator('#profileName').fill('Six-family editorial');await page.locator('#profileAttest').check();await page.locator('#profileSave').click();
    await page.waitForFunction(()=>document.querySelectorAll('#profileList option').length>0);record(width,'profile saved',{message:await page.locator('#toastRegion').textContent()});
    // History restore as a copy keeps chapters, disclosure and the separate locks: supersede the saved revision, then restore it.
    const next=structuredClone(saved);next.plan.scenes[0].colorMode='default';const resaved=(await api('projects/'+deckA.id,{project:next,expectedRevision:saved.revision.number},'PUT')).project;assert.equal(resaved.revision.number,saved.revision.number+1);
    const snap=await api('projects/'+deckA.id+'/history/'+saved.revision.number),restored=(await api('projects/'+deckA.id+'/history/'+saved.revision.number+'/restore',{mode:'copy',snapshotHash:snap.sha256,requestId:'s9a-browser-restore-0001'})).project;
    assert.deepEqual(restored.plan.chapters,saved.plan.chapters);assert.deepEqual(restored.document.authorOverrides,saved.document.authorOverrides);assert.deepEqual(restored.plan.scenes.map(s=>s.disclosure||null),saved.plan.scenes.map(s=>s.disclosure||null));
    record(width,'saved; history restore-as-copy keeps chapters, disclosure and locks',{restored:restored.id,revision:saved.revision.number});
    await context.close();
    const second=await open(width,'?project='+deckB.id);await measured(second.page);await revealStudio(second.page,'library');await second.page.locator('#saveLook > summary').click();
    await second.page.waitForFunction(()=>document.querySelectorAll('#profileList option').length>0,{},{timeout:10000});assert.equal(await second.page.locator('#profileList option').count(),1,'profile listed after reload');
    const beforeProfile=await current(deckB.id);await second.page.locator('#profileApply').click();const applied=await note(second.page);await closeStudio(second.page);await measured(second.page);
    const after=await savedWhen(deckB.id,p=>p.revision.number>beforeProfile.revision.number);await squareSaved(second.page);await measured(second.page);record(width,'profile applied to the zh-CN deck',{effects:applied.effects.slice(0,6),kept:applied.kept,themes:[...new Set(after.plan.scenes.map(s=>s.theme))],shot:await shot(second.page,`profile-applied-${width}`,'#frameSpace')});
    for(const [id,ext] of [['#exportHTML','html'],['#exportPPTX','pptx'],['#exportPDF','pdf'],['[data-export="json"]','json']]){
     await second.page.waitForFunction(s=>!document.querySelector(s).disabled,id);const before=await second.page.locator('#issueBanner').textContent(),waiting=second.page.waitForEvent('download',{timeout:120000});
     // PowerPoint and PDF go through the Take away dialog's F1 part: paging auto by default, then Export. HTML runs at once; the backup is in the drawer.
     if(ext==='pptx'||ext==='pdf'){const r=await studioExport(second.page,id);if(r.status!=='pass')throw Error(`${ext} export refused (${r.status}): ${r.text}`);record(width,'export dialog '+ext,{status:r.status,paginateVisible:r.paginateVisible});await closeExportDialog(second.page);}
     else if(ext==='html'){await revealStudio(second.page,'file');await second.page.locator(id).click();}
     else{await revealStudio(second.page,'library');await second.page.locator('#moreDialog '+id).click();}
     const download=await Promise.race([waiting,second.page.waitForFunction(b=>!document.querySelector('#issueBanner').hidden&&document.querySelector('#issueBanner').textContent!==b,before,{timeout:120000}).then(async()=>{throw Error(ext+' export refused: '+await second.page.locator('#issueBanner').textContent());})]);
     const file=path.join(out,'exports','profile-applied-zh-CN.'+ext);await mkdir(path.dirname(file),{recursive:true});await download.saveAs(file);const bytes=await readFile(file);
     assert.ok(ext==='pptx'?bytes.subarray(0,2).toString()==='PK':ext==='pdf'?bytes.subarray(0,4).toString()==='%PDF':bytes.length>100);
     record(width,'export '+ext,{bytes:bytes.length,message:await second.page.locator('#toastRegion').textContent()});await closeStudio(second.page);}
    await revealStudio(second.page,'library');if(!await second.page.locator('#saveLook').evaluate(n=>n.open))await second.page.locator('#saveLook > summary').click();
    const [exported]=await Promise.all([second.page.waitForEvent('download'),second.page.locator('#profileExport').click()]),pfile=path.join(out,'exports','profile.design-profile.json');await exported.saveAs(pfile);
    await second.page.locator('#profileImport').setInputFiles(pfile);await second.page.waitForFunction(()=>document.querySelectorAll('#profileList option').length===2);
    record(width,'profile exported and imported as a copy',{profiles:await second.page.locator('#profileList option').allTextContents()});
    await second.context.close();
   }else await context.close();}
  // 3. Pages from the argument left the browser: the API plans a deck made from pasted text, asks instead of padding, marks the
  // evidence-required pages (shown on the strip) and the final export is refused by name.
  if(width===1440){
   const made=await api('directions',{answers:{topic:TEXT.en,detail:'detailed'},locale:'en'}),created=(await api('import',{project:made.base})).project;artifacts.generated=created.id;
   const pagePlan=await api('page-plan',{project:created,detail:'detailed',targetPages:9});assert.ok(!pagePlan.error,JSON.stringify(pagePlan.error));
   const questions=pagePlan.questions.map(q=>q.en);assert.ok(pagePlan.questions.some(q=>/will not (pad|invent)/i.test(q.en)||/不会/.test(q.zh)),'the planner asks instead of padding');
   record(width,'page plan (API) asks for material instead of padding',{questions});
   if(pagePlan.evidenceRequired.length){const applied=await api('page-plan/apply',{project:created,plan:pagePlan,mark:true});assert.ok(!applied.error,JSON.stringify(applied.error));
    const marked=(await api('projects/'+created.id,{project:applied.project,expectedRevision:created.revision.number},'PUT')).project,refused=await api('export',{project:marked,format:'html'});assert.equal(refused.error?.code,'EVIDENCE_REQUIRED');
    const {context,page}=await open(width,'?project='+created.id);await page.waitForFunction(()=>[...document.querySelectorAll('#slideList .thumbnail-mark')].some(n=>!n.hidden&&/Evidence required/i.test(n.textContent)),{},{timeout:15000});
    const flags=await page.evaluate(()=>[...document.querySelectorAll('#slideList .thumbnail-mark')].filter(n=>!n.hidden&&/Evidence required/i.test(n.textContent)).length);
    record(width,'evidence-required marked; final export refused by name',{flags,pages:marked.plan.scenes.filter(s=>s.contentStatus==='evidence-required').map(s=>s.id),refusal:refused.error.message,shot:await shot(page,`evidence-required-${width}`,'.page-strip')});
    await context.close();}
   else record(width,'no page to mark',{});
  }
 }
 record(0,'done',{errors:errors.length,external:external.length});
}catch(e){record(0,'failed',{message:e.message,stack:e.stack?.split('\n').slice(0,4)});process.exitCode=1;}
finally{await writeFile(path.join(out,'trace.json'),JSON.stringify({format:'deckweft-s9a-browser-trace',version:1,browser:browser.version(),binary:/ms-playwright/.test(binary)?'Chrome for Testing (Playwright cache, isolated)':'isolated',node:process.version,widths,errors,externalRequests:external,trace},null,1));await browser.close();await app.close();}
