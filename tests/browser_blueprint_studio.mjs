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
import {revealStudio} from './studio-controls.mjs';
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
 await page.goto(app.url+'/visual?project='+id);await page.waitForFunction(()=>document.querySelector('#sceneTitle')?.textContent.length>0);return {context,page};
}
const measured=page=>page.waitForFunction(()=>!document.querySelector('#exportHTML').disabled&&document.querySelector('#fit').textContent.startsWith('✓'),{},{timeout:90000});
// Save is disabled while a preview is being measured; wait for the measurement first.
const save=async page=>{await measured(page);await revealStudio(page,'file');if(await page.locator('#save').isDisabled())return;await page.locator('#save').click();await page.waitForFunction(()=>/Saved on this computer|已保存在本机/.test(document.querySelector('#message').textContent)&&document.querySelector('#save').disabled);};
async function shot(page,name){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);const file=path.join(shots,name+'.png');await page.screenshot({path:file});return path.relative(out,file);}
const interactionPlan=async page=>JSON.parse(await page.locator('#interactionJSON').inputValue());
const openInteractions=async page=>{await revealStudio(page,'edit');await page.locator('#contentTab').click();const d=page.locator('details').filter({has:page.locator('#enableBlueprint')});if(!await d.evaluate(n=>n.open))await d.locator(':scope > summary').click();};
async function exportFile(page,id,ext,{refused}={}){
 await revealStudio(page,'file');await page.waitForFunction(s=>!document.querySelector(s).disabled,id);const before=await page.locator('#message').textContent(),waiting=page.waitForEvent('download',{timeout:180000});await page.locator(id).click();
 const error=page.waitForFunction(b=>document.querySelector('#message').classList.contains('error')&&document.querySelector('#message').textContent!==b,before,{timeout:180000}).then(()=>page.locator('#message').textContent());
 const result=await Promise.race([waiting.then(d=>({download:d})),error.then(message=>({message}))]);
 if(refused){assert.ok(result.message,`${ext} must be refused`);assert.match(result.message,refused);waiting.catch(()=>{});return result.message;}
 if(!result.download)throw Error(`${ext} export refused: ${result.message}`);
 const file=path.join(out,'exports',`studio-${path.basename(id).slice(7).toLowerCase()}-${ext==='pdf'?'print':'deck'}.${ext}`);await result.download.saveAs(file);return file;
}
const artifacts={};
try{
 const en=await plainDeck('en'),zh=await plainDeck('zh-CN');
 // 1440: the whole author path in English.
 let {context,page}=await open(widths[0],en.id);await measured(page);await page.locator('[data-scene="pipeline"]').first().click();await openInteractions(page);
 assert.equal(await page.locator('#blueprintStatic').isHidden(),true);artifacts.before=await shot(page,'1440-1-before');
 await page.locator('#lockInteractions').check();await page.waitForFunction(()=>document.querySelector('#enableBlueprint').disabled);record(widths[0],'scene interaction lock disables the action',{disabled:true});
 await page.locator('#lockInteractions').uncheck();await page.waitForFunction(()=>!document.querySelector('#enableBlueprint').disabled);
 await page.locator('#enableBlueprint').click();await measured(page);let plan=await interactionPlan(page);
 assert.equal(plan.interactions[0].blueprint.questionBlockId,'pipeline-question');assert.equal(plan.cues.length,5);
 const hint=await page.locator('#blueprintStatic').textContent();assert.match(hint,/refuse this page until you choose its static state/);
 const preview=page.frameLocator('#preview');await preview.locator('#pipeline [data-blueprint-stage="explain"], #pipeline[data-blueprint-stage="explain"]').first().waitFor();
 record(widths[0],'Make this page Explain → Diagram → Explore',{blueprint:plan.interactions[0].blueprint,cues:plan.cues.length,keyStates:(await page.locator('#staticState option').allTextContents()),hint,shot:artifacts.made=await shot(page,'1440-2-made')});
 await revealStudio(page,'file');await page.locator('#undo').click();await measured(page);assert.equal((await interactionPlan(page)).interactions.length,0,'Undo removes it');
 await page.locator('#redo').click();await measured(page);assert.ok((await interactionPlan(page)).interactions[0].blueprint,'Redo restores it');record(widths[0],'Undo, Redo',{undo:'no interaction',redo:'blueprint'});
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
 const pptx=await exportFile(page,'#exportPPTX','pptx'),pdf=await exportFile(page,'#exportPDF','pdf');
 const files=readZip(await readFile(pptx)),slide=[...files.keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort()[1],xml=files.get(slide).toString('utf8'),saved=await store.get(en.id);
 const explanations=saved.document.explanations,onSlide=explanations.filter(e=>xml.includes(e.text.replace(/&/g,'&amp;')));
 assert.equal(onSlide.length,explanations.length,'every explanation is text on slide 2');assert.equal((await readFile(pdf)).subarray(0,4).toString(),'%PDF');
 record(widths[0],'Studio PowerPoint and PDF export with Diagram as the static state',{pptx:path.relative(out,pptx),pdf:path.relative(out,pdf),explanationsOnSlide:onSlide.length,parts:4});
 await context.close();
 // 1024 and 390: the saved deck in Chinese is made a blueprint page and shown; the controls and hint fit the narrow inspector.
 for(const width of widths.slice(1)){
  ({context,page}=await open(width,zh.id));await measured(page);const question=(await store.get(zh.id)).document.blocks.find(b=>b.id==='pipeline-question').text;
  // The narrow layout hides the page list; the Studio's Next page control selects the second page.
  while((await page.locator('#sceneTitle').textContent())!==question){await page.locator('#nextScene').click();await page.waitForTimeout(200);}await openInteractions(page);
  if(!(await interactionPlan(page)).interactions.length){await page.locator('#enableBlueprint').click();await measured(page);await save(page);await measured(page);}
  const opts=await page.locator('#staticState option').evaluateAll(o=>o.map(n=>({value:n.value,text:n.textContent})));await page.locator('#staticState').selectOption(opts.find(o=>/图解/.test(o.text)).value);await measured(page);
  const zhHint=await page.locator('#blueprintStatic').textContent();assert.match(zhHint,/Static state: 图解/);await page.locator('#blueprintStatic').scrollIntoViewIfNeeded();
  record(width,'zh-CN blueprint page and static state in the Studio',{hint:zhHint,shot:artifacts['studio-'+width]=await shot(page,`${width}-zh-CN-static`)});await measured(page);if(await page.locator('#save').isEnabled())await save(page);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();await app.close();}
await writeFile(path.join(out,'studio-trace.json'),JSON.stringify({format:'deckweft-s9b-studio-trace',version:1,widths,steps:trace,artifacts,errors,external},null,1)+'\n');
console.log(JSON.stringify({steps:trace.length,errors:errors.length,external:external.length}));
