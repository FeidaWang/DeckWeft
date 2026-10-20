// S9b blueprint A in the real Studio: make a page Explain → Diagram → Explore through the normal edit path, honour the scene lock,
// undo and redo it, choose its static state, and export PowerPoint and PDF from the Studio menu (refused first, by name, while the
// static state is missing or at Explain). Isolated browser only; every non-loopback request is refused and recorded.
// Usage: CHROMIUM_PATH=/isolated/chrome PLAYWRIGHT_MODULE=/abs/playwright/index.mjs node tests/browser_blueprint_studio.mjs [--out dist/s9b-blueprint-a]
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile,realpath,rm,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {readZip} from '../src/targets/pptx/audit.mjs';
import {revealStudio,studioExport,closeExportDialog,closeStudio,saveNow} from './studio-controls.mjs';
import {blueprintFixture} from './blueprint-a.mjs';
const {values:a}=parseArgs({options:{out:{type:'string'},widths:{type:'string'}}}),out=path.resolve(a.out||'dist/s9b-blueprint-a'),shots=path.join(out,'studio');
await rm(path.join(out,'library'),{recursive:true,force:true});await mkdir(path.join(out,'library'),{recursive:true});await rm(shots,{recursive:true,force:true});await mkdir(shots,{recursive:true});await mkdir(path.join(out,'exports'),{recursive:true});
const home=await realpath(path.join(out,'library')),binary=await realpath(process.env.CHROMIUM_PATH||'');assert.ok(!/\/Applications\//i.test(binary),'Use an isolated browser outside /Applications.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),store=await new VisualProjectStore(home).init();
// The author's deck before S9b: the same pages, the diagram page without any interaction.
async function plainDeck(locale){const {document,plan}=await blueprintFixture(locale),s=plan.scenes[1];for(const k of ['interactions','cues','keyStates','staticState'])delete s[k];document.explanations=[];return store.save(createVisualProject(document,plan,{id:`s9b-studio-${locale}`}),{create:true});}
const app=await startStudio({home,port:0,captureBrowser:binary}),browser=await chromium.launch({executablePath:binary,headless:true});
const trace=[],errors=[],external=[],started=Date.now(),widths=(a.widths||'1440,1024,390').split(',').map(Number);
const record=(width,step,detail={})=>{trace.push({width,step,ms:Date.now()-started,...detail});console.log(width,step,JSON.stringify(detail).slice(0,220));};
async function open(width,id){
 const context=await browser.newContext({viewport:{width,height:width<500?860:1000},acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push({width,message:e.message}));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource: the server responded with a status of 4\d\d/.test(m.text()))errors.push({width,console:m.text()});});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(app.url+'/')||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();external.push(u);return r.abort();});
 await page.goto(app.url+'/?project='+id);await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#sceneTitle')?.textContent.length>0);return {context,page};
}
// Single entry step 3: the canvas says when these exact edits are measured; autosave and ⌘/Ctrl S replace Save.
const measured=page=>page.waitForFunction(()=>{const c=document.querySelector('#canvas');return !document.querySelector('#exportHTML').disabled&&c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale');},{},{timeout:90000});
// Save is disabled while a preview is being measured; wait for the measurement first.
const save=async page=>{await measured(page);if(await page.locator('#save').isDisabled())return;await saveNow(page);};
async function shot(page,name){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);const file=path.join(shots,name+'.png');await page.screenshot({path:file});return path.relative(out,file);}
const interactionPlan=async page=>JSON.parse(await page.locator('#interactionJSON').inputValue());
// The blueprint, the transition and the still picture open from "Let this page move" in Look.
const openInteractions=async page=>{await revealStudio(page,'compositions');if(await page.locator('#motionControls').isHidden())await page.locator('#motionSwitch').click();await page.locator('#motionControls').waitFor({state:'visible'});};
async function exportFile(page,id,ext,{refused,paginate}={}){
 const waiting=page.waitForEvent('download',{timeout:180000});waiting.catch(()=>{});
 const r=await studioExport(page,id,{paginate});
 if(refused){assert.equal(r.status,'error',`${ext} must be refused: ${r.text}`);assert.match(r.text,refused);await closeExportDialog(page);return r.text;}
 if(r.status!=='pass')throw Error(`${ext} export refused (${r.status}): ${r.text}`);
 const file=path.join(out,'exports',`studio-${path.basename(id).slice(7).toLowerCase()}-${ext==='pdf'?'print':'deck'}.${ext}`);await (await waiting).saveAs(file);await closeExportDialog(page);return {file,dialog:r};
}
const slideCount=async file=>[...readZip(await readFile(file)).keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
const artifacts={};
try{
 const en=await plainDeck('en'),zh=await plainDeck('zh-CN');
 // 1440: the whole author path in English.
 let {context,page}=await open(widths[0],en.id);await measured(page);await page.locator('#slideList [data-slide="pipeline"]').click();await openInteractions(page);
 assert.equal(await page.locator('#blueprintStatic').isHidden(),true);artifacts.before=await shot(page,'1440-1-before');
 await page.locator('#keepPage').click();await page.waitForFunction(()=>document.querySelector('#enableBlueprint').disabled&&document.querySelector('#keepPage').getAttribute('aria-pressed')==='true');record(widths[0],'page lock disables the action',{disabled:true});
 await page.locator('#keepPage').click();await page.waitForFunction(()=>!document.querySelector('#enableBlueprint').disabled);
 await page.locator('#enableBlueprint').click();await measured(page);let plan=await interactionPlan(page);
 assert.equal(plan.interactions[0].blueprint.questionBlockId,'pipeline-question');assert.equal(plan.cues.length,5);
 const hint=await page.locator('#blueprintStatic').textContent();assert.match(hint,/refuse this page until you choose its static state/);
 const preview=page.frameLocator('#preview');await preview.locator('#pipeline [data-blueprint-stage="explain"], #pipeline[data-blueprint-stage="explain"]').first().waitFor();
 record(widths[0],'Make this page Explain → Diagram → Explore',{blueprint:plan.interactions[0].blueprint,cues:plan.cues.length,keyStates:(await page.locator('#staticState option').allTextContents()),hint,shot:artifacts.made=await shot(page,'1440-2-made')});
 await closeStudio(page);await page.locator('#undo').click();await measured(page);assert.equal((await interactionPlan(page)).interactions.length,0,'Undo removes it');
 // Redo: ⌘/Ctrl Shift Z (the band shows Redo on a long press of Undo).
 await page.locator('#undo').focus();await page.keyboard.press('Control+Shift+z');await measured(page);assert.ok((await interactionPlan(page)).interactions[0].blueprint,'Redo restores it');record(widths[0],'Undo, Redo',{undo:'no interaction',redo:'blueprint'});
 await save(page);await measured(page);
 // The preview is the player: it opens on Explain, and Next stage reaches Diagram.
 // The Studio frame is a scaled, read-only view (no pointer input), so the button is activated directly, as assistive technology would.
 await preview.locator('#pipeline [data-cue-next]').evaluate(b=>b.click());await preview.locator('#pipeline[data-blueprint-stage="diagram"]').waitFor();record(widths[0],'preview player: Next stage → Diagram',{shot:artifacts.preview=await shot(page,'1440-3-preview-diagram')});
 // Paged exports refuse while the static state is missing, then at Explain.
 const missing=await exportFile(page,'#exportPPTX','pptx',{refused:/static state/i});record(widths[0],'PowerPoint refused without a static state',{message:missing});
 await openInteractions(page);const options=await page.locator('#staticState option').evaluateAll(o=>o.map(n=>({value:n.value,text:n.textContent})));
 await page.locator('#staticState').selectOption(options.find(o=>/Explain/.test(o.text)).value);await measured(page);await save(page);await measured(page);
 const explain=await exportFile(page,'#exportPDF','pdf',{refused:/Explain|object/i});record(widths[0],'PDF refused with Explain as the static state',{message:explain,hint:await page.locator('#blueprintStatic').textContent()});
 await openInteractions(page);await page.locator('#staticState').selectOption(options.find(o=>/Diagram/.test(o.text)).value);await measured(page);await save(page);await measured(page);
 assert.match(await page.locator('#blueprintStatic').textContent(),/Static state: Diagram/);artifacts.chosen=await shot(page,'1440-4-static-diagram');
 const {file:pptx,dialog:pagedDialog}=await exportFile(page,'#exportPPTX','pptx'),{file:pdf}=await exportFile(page,'#exportPDF','pdf');
 // Since F1 (2026-10-19) the tall blueprint page is paged (auto) into two slides; the explanations are text on one of its slides (between the opening and closing pages).
 const files=readZip(await readFile(pptx)),names=[...files.keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.length-b.length||a.localeCompare(b)),xml=names.slice(1,-1).map(n=>files.get(n).toString('utf8')).join('\n'),saved=await store.get(en.id);
 const explanations=saved.document.explanations,onSlide=explanations.filter(e=>xml.includes(e.text.replace(/&/g,'&amp;')));
 assert.equal(onSlide.length,explanations.length,'every explanation is text on a slide of the blueprint page');assert.equal(names.length,4,'opening, the two parts of the blueprint page, closing');assert.equal((await readFile(pdf)).subarray(0,4).toString(),'%PDF');
 record(widths[0],'Studio PowerPoint and PDF export with Diagram as the static state',{pptx:path.relative(out,pptx),pdf:path.relative(out,pdf),explanationsOnSlide:onSlide.length,slides:names.length});
 // F1: whole (paginate none), the page's part numbers fall under the typography minimum. The dialog shows the failures in yellow and
 // downloads nothing; only the author's explicit acceptance exports the file, recorded with its time, and the status stays yellow.
 const YELLOW='rgb(255, 246, 214)';assert.ok(pagedDialog.paginateVisible,'the paging option is offered for PowerPoint');assert.notEqual(pagedDialog.color,YELLOW,'a passing export is not yellow');assert.equal(pagedDialog.acceptVisible,false);
 const whole=await studioExport(page,'#exportPPTX',{paginate:'none'});
 assert.match(await page.locator('#exportEvidence').textContent(),/unattested/);assert.match(await page.locator('#exportEvidence').textContent(),/not run/);
 assert.equal(whole.status,'fail',whole.text);assert.equal(whole.color,YELLOW);assert.ok(whole.acceptVisible,'the acceptance is offered');
 assert.ok(whole.failures.length>0&&whole.failures.every(f=>/\d+(\.\d+)? pt/.test(f)),whole.failures.join(' | '));assert.ok(whole.failures.some(f=>f.includes('pipeline')),'the failures name the page');
 artifacts.typographyFail=await shot(page,'1440-5-typography-fail');
 record(widths[0],'PowerPoint whole (paginate none): typography failures listed in yellow, nothing downloaded',{status:whole.status,text:whole.text,failures:whole.failures,shot:artifacts.typographyFail});
 const waitingWhole=page.waitForEvent('download',{timeout:180000});
 const accepted=await studioExport(page,'#exportPPTX',{accept:true,open:false});
 assert.equal(accepted.status,'accepted',accepted.text);assert.equal(accepted.color,YELLOW,'accepted stays yellow');assert.match(accepted.acceptedAt||'',/^\d{4}-\d\d-\d\dT/);assert.deepEqual(accepted.failures,whole.failures);
 const wholeFile=path.join(out,'exports','studio-pptx-whole-accepted.pptx');await (await waitingWhole).saveAs(wholeFile);
 const wholeSlides=await slideCount(wholeFile),pagedSlides=await slideCount(pptx);assert.ok(pagedSlides>wholeSlides,`paged ${pagedSlides} > whole ${wholeSlides}`);
 artifacts.typographyAccepted=await shot(page,'1440-6-typography-accepted');await closeExportDialog(page);
 record(widths[0],'PowerPoint whole after the author accepted the sizes: exported, still yellow, acceptance time shown',{status:accepted.status,text:accepted.text,acceptedAt:accepted.acceptedAt,wholeSlides,pagedSlides,pptx:path.relative(out,wholeFile),shot:artifacts.typographyAccepted});
 // Opening the dialog again starts clean: paging back to auto by default, no acceptance carried over, and the paged export passes.
 await revealStudio(page,'file');await page.locator('#exportPPTX').click();await page.locator('#exportDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#exportPaginate').inputValue(),'none','the author\'s last choice is kept while the Studio is open');assert.equal(await page.locator('#exportAcceptField').isHidden(),true);assert.equal(await page.locator('#exportStatus').getAttribute('data-status'),'idle');
 await page.locator('#exportPaginate').selectOption('auto');const waitingPaged=page.waitForEvent('download',{timeout:180000});const again=await studioExport(page,'#exportPPTX',{open:false});assert.equal(again.status,'pass',again.text);await waitingPaged;await closeExportDialog(page);
 record(widths[0],'export dialog reopened: no acceptance carried over; paged export passes',{status:again.status});
 await context.close();
 // 1024 and 390: the saved deck in Chinese is made a blueprint page and shown; the controls and hint fit the narrow inspector.
 for(const width of widths.slice(1)){
  ({context,page}=await open(width,zh.id));await measured(page);const question=(await store.get(zh.id)).document.blocks.find(b=>b.id==='pipeline-question').text;
  // The narrow layout hides the page list; the Studio's Next page control selects the second page.
  const pipelineScene=(await store.get(zh.id)).plan.scenes.find(s=>s.blockIds.includes('pipeline-question')).id;await page.locator(`#slideList [data-slide="${pipelineScene}"]`).click();await page.waitForFunction(q=>document.querySelector('#sceneTitle').textContent===q,question);await openInteractions(page);
  if(!(await interactionPlan(page)).interactions.length){await page.locator('#enableBlueprint').click();await measured(page);await save(page);await measured(page);await openInteractions(page);}
  const opts=await page.locator('#staticState option').evaluateAll(o=>o.map(n=>({value:n.value,text:n.textContent})));await page.locator('#staticState').selectOption(opts.find(o=>/图解/.test(o.text)).value);await measured(page);
  const zhHint=await page.locator('#blueprintStatic').textContent();assert.match(zhHint,/Static state: 图解/);await page.locator('#blueprintStatic').scrollIntoViewIfNeeded();
  record(width,'zh-CN blueprint page and static state in the Studio',{hint:zhHint,shot:artifacts['studio-'+width]=await shot(page,`${width}-zh-CN-static`)});await measured(page);if(await page.locator('#save').isEnabled())await save(page);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();await app.close();}
await writeFile(path.join(out,'studio-trace.json'),JSON.stringify({format:'deckweft-s9b-studio-trace',version:1,widths,steps:trace,artifacts,errors,external},null,1)+'\n');
console.log(JSON.stringify({steps:trace.length,errors:errors.length,external:external.length}));
