import {revealStudio,closeStudio} from './studio-controls.mjs';
// Optional real-browser QA for the S3 families; uses an isolated preinstalled test binary only.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {candidateProjects,candidateFit,chooseRhythm,splitSmallMultiples} from '../src/design/rhythm.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {compositions,families} from '../src/design/compositions.mjs';
import {familyProject,S3_FAMILIES} from './families.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/visual-families/acceptance');await mkdir(out,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated testing binary outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-families-browser-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0}),browser=await chromium.launch({executablePath,headless:true});
const report={browser:browser.version(),isolation:'Isolated cached testing binary; ephemeral contexts with temporary profiles; installed apps and personal profiles untouched',cases:[],responsive:[],labels:[],selected:[],studio:[],knownIssues:[],captures:[],errors:[],externalRequests:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),routes=new Map();
await context.route('**/*',async route=>{const url=route.request().url();if(routes.has(url))await route.fulfill({status:200,contentType:'text/html',body:routes.get(url)});else if(url.startsWith(app.url+'/')||url.startsWith('data:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));let editor;
async function capture(target,name,locator){await (locator||target).screenshot({path:path.join(out,name),...(locator?{}:{fullPage:true})});report.captures.push({file:name,sha256:hash(await readFile(path.join(out,name)))});}
async function render(p,name){const o=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:await visualAssetResources(p,store.home)});routes.set(app.url+'/'+name+'.html',o.body);await page.goto(app.url+'/'+name+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');return page.evaluate(()=>window.deckweftFit);}
async function resize(width){await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);return page.evaluate(()=>window.deckweftFit);}
// Region boxes relative to the scene, and whether regions stack in DOM order or sit side by side.
const layout=()=>page.locator('.web-scene').evaluateAll(nodes=>nodes.map(s=>{const sb=s.getBoundingClientRect(),rs=[...s.querySelectorAll(':scope > .regions > .region')].map(r=>({id:r.dataset.blockId,b:r.getBoundingClientRect()}));let stacked=true,side=false;for(let i=1;i<rs.length;i++)if(rs[i].b.top<rs[i-1].b.bottom-1)stacked=false;for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i].b,b=rs[j].b;if(a.top<b.bottom-1&&b.top<a.bottom-1&&(a.right<=b.left+1||b.right<=a.left+1))side=true;}const lefts=rs.map(r=>Math.round(r.b.left)),aligned=Math.max(...lefts)-Math.min(...lefts)<=2;return {sceneId:s.id,stacked,side,aligned,regions:rs.map(r=>({id:r.id,x:Math.round(r.b.x-sb.x),y:Math.round(r.b.y-sb.y),width:Math.round(r.b.width),height:Math.round(r.b.height)}))};}));
// C12 (owned by S8): Chrome trims a line-end full-width closing mark when breaking, but the measured box keeps the whole glyph.
// Such an overflow is recorded and listed, never hidden; any other overflowing glyph fails the run.
const CJK_CLOSING=/[）」』】〕》〉，。、；：？！”’]/u;
const classifyOverflow=ids=>page.evaluate(({ids,closing})=>ids.map(id=>{const r=document.getElementById(id),right=r.getBoundingClientRect().right,size=parseFloat(getComputedStyle(r.querySelector('p,h2,li,blockquote,a')||r).fontSize),walker=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),past=[];for(let t;t=walker.nextNode();)for(let i=0;i<t.length;i++){const g=document.createRange();g.setStart(t,i);g.setEnd(t,i+1);const b=g.getBoundingClientRect();if(b.right>right+.5)past.push({glyph:t.data[i],by:+(b.right-right).toFixed(2)});}return {regionId:id,component:r.dataset.component,past,c12:past.length>0&&past.every(g=>new RegExp(closing,'u').test(g.glyph)&&g.by<=size/2)};}),{ids,closing:CJK_CLOSING.source});
async function platformFonts(selector){const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const tree=await cdp.send('DOM.getDocument'),nodes=await cdp.send('DOM.querySelectorAll',{nodeId:tree.root.nodeId,selector}),fonts=[];for(const nodeId of nodes.nodeIds)fonts.push((await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts.map(f=>f.familyName));await cdp.detach();return fonts;}
async function sheet(name,title,cells,columns=3){let html=`<style>body{margin:0;padding:20px;background:#ddd;font:14px Arial}main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:12px;align-items:start}img{width:100%;display:block}.cell{background:white;padding:8px}p{margin:4px 0 6px}.fail{color:#a00;font-weight:700}</style><h1>${title}</h1><main>`;for(const c of cells)html+=`<div class="cell"><p class="${c.ok?'':'fail'}">${c.label}</p><img src="data:image/png;base64,${(await readFile(path.join(out,c.file))).toString('base64')}"></div>`;await page.setViewportSize({width:columns>3?2400:1800,height:1000});await page.setContent(html+'</main>');await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));await capture(page,name);}
const variant=id=>compositions.find(c=>c.id===id);
try{
 for(const locale of ['en','zh-CN'])for(const theme of ['cream-collage','electric-violet','dark-data']){
  const p=await familyProject(locale,store.home);p.plan.scenes.forEach(s=>s.theme=theme);const candidates=candidateProjects(p),fits=[],geometries=[],cells=[],narrow=[];
  for(const [k,c]of candidates.entries()){
   await page.setViewportSize({width:1440,height:1000});const name=`${locale}-${theme}-${k}`,fit=await render(c,name),accepted=fit.checks.map(s=>candidateFit(s,fit.viewport));fits.push(accepted);
   const geometry=await layout(),fonts={headings:await platformFonts('.web-scene h2'),quotes:await platformFonts('.web-scene blockquote')};geometries.push(geometry);
   report.cases.push({locale,theme,k,compositions:c.plan.scenes.map(s=>s.composition),fit:accepted,fonts,geometry:geometry.map(g=>({sceneId:g.sceneId,regions:g.regions})),checks:fit.checks});
   for(const [i,s]of c.plan.scenes.entries()){const file=`${name}-${s.id}.png`;await capture(page,file,page.locator('#'+s.id));cells.push({file,ok:accepted[i].ok,family:s.id,k,label:`${s.composition} · ${accepted[i].ok?'passes':'FAILS: '+accepted[i].reasons.join('; ')} · ${Math.ceil(accepted[i].height)}px`});}
   // Every bound semantic region survives; the panels keep their shared fixed axis.
   assert.equal(await page.locator('.region').count(),c.plan.scenes.reduce((n,s)=>n+s.blockIds.length,0));
   assert.equal(await page.locator('#small-multiples .chart').count(),2);for(const caption of await page.locator('#small-multiples .chart figcaption').allTextContents())assert.match(caption,locale==='en'?/fixed/:/固定范围/);
   // The baseline label is visible before any interaction: generated above each frame, baseline first, equal frames.
   const labels=async()=>page.locator('#before-after .region[data-component=image]').evaluateAll(rs=>rs.map(r=>{const f=r.querySelector('.web-image'),before=getComputedStyle(f,'::before'),frame=r.querySelector('.image-crop').getBoundingClientRect();return {blockId:r.dataset.blockId,label:before.content,display:before.display,height:parseFloat(before.height)||null,frame:[Math.round(frame.width),Math.round(frame.height)]};}));
   const pair=await labels(),baselineLabels=locale==='en'?['"Before · baseline"','"After"']:['"之前 · 基线"','"之后"'];
   assert.deepEqual(pair.map(v=>[v.blockId,v.label,v.display]),[['pair-before',baselineLabels[0],'block'],['pair-after',baselineLabels[1],'block']]);assert.deepEqual(pair[0].frame,pair[1].frame,'equal frames');report.labels.push({locale,theme,k,width:1440,pair});
   // The same deck at 1024 and 390 px follows each variant's declared columns; at 390 every page reads in DOM order.
   for(const width of [1024,390]){
    const f=await resize(width),rows=await layout();
    for(const check of f.checks){assert.deepEqual([check.clipIssues,check.contrastIssues,check.text.filter(t=>!t.inside),check.fonts.filter(v=>!v.loaded)],[[],[],[],[]],JSON.stringify({width,sceneId:check.sceneId}));
     if(check.overflow.length){const found=await classifyOverflow(check.overflow);assert.ok(found.every(v=>v.c12),JSON.stringify({width,sceneId:check.sceneId,found}));report.knownIssues.push({issue:'C12',locale,theme,k,width,sceneId:check.sceneId,composition:c.plan.scenes.find(v=>v.id===check.sceneId).composition,found});}}assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page-level horizontal scroll at '+width);
    for(const [i,s]of c.plan.scenes.entries()){const expected=variant(s.composition).columns[width],g=rows[i];assert.ok(expected===1?g.stacked:g.side,JSON.stringify({width,composition:s.composition,expected,g:{stacked:g.stacked,side:g.side}}));if(width===390)assert.ok(g.aligned,'one left edge at 390 px: '+s.composition);report.responsive.push({locale,theme,width,composition:s.composition,columns:expected,stacked:g.stacked,sideBySide:g.side,leftAligned:g.aligned});
     if(s.id==='before-after'){const pair=await labels();assert.deepEqual(pair.map(v=>v.label),baselineLabels);report.labels.push({locale,theme,k,width,pair});}
     if(width===390){const file=`${name}-${s.id}-390.png`;await capture(page,file,page.locator('#'+s.id));narrow.push({file,ok:true,label:`${s.composition} · 390 px · reading order`,family:s.id,k});}}
   }
   for(const [i,s]of c.plan.scenes.entries()){const expected=variant(s.composition).columns[1440],g=geometry[i];assert.ok(expected===1?g.stacked:g.side,JSON.stringify({width:1440,composition:s.composition,expected}));report.responsive.push({locale,theme,width:1440,composition:s.composition,columns:expected,stacked:g.stacked,sideBySide:g.side});}
  }
  for(const [i,s]of p.plan.scenes.entries()){
   assert.ok(fits.filter(row=>row[i].ok).length>=2,JSON.stringify({locale,theme,scene:s.id,fits:fits.map(r=>r[i])}));
   const signatures=geometries.map(g=>JSON.stringify([...g[i].regions].sort((a,b)=>a.id.localeCompare(b.id))));assert.equal(new Set(signatures).size,3,'Three distinct measured geometries required: '+s.id);
  }
  const selected=chooseRhythm(p,candidates,fits);await page.setViewportSize({width:1440,height:1000});const fit=await render(selected.project,`${locale}-${theme}-rhythm`);assert.equal(fit.ok,true,JSON.stringify(fit));
  for(const [i,s]of selected.project.plan.scenes.entries())assert.equal(fits[selected.report.scenes[i].candidate][i].ok,true,'failed candidates are never selected: '+s.id);
  await capture(page,`${locale}-${theme}-full-deck.png`);report.selected.push({locale,theme,compositions:selected.project.plan.scenes.map(s=>s.composition),rhythm:selected.report});
  for(const width of [1024,390]){const f=await resize(width);for(const check of f.checks.filter(v=>v.overflow.length))assert.ok((await classifyOverflow(check.overflow)).every(v=>v.c12));await capture(page,`${locale}-${theme}-reading-${width}.png`);}
  const order=(a,b)=>S3_FAMILIES.indexOf(a.family)-S3_FAMILIES.indexOf(b.family)||a.k-b.k;
  await sheet(`${locale}-${theme}-contact.png`,`${locale} · ${theme} · six S3 families × three geometries at 1440 px (failed candidates labelled, excluded from selection)`,cells.sort(order));
  await sheet(`${locale}-${theme}-contact-390.png`,`${locale} · ${theme} · the same eighteen geometries at 390 px`,narrow.sort(order),6);
 }
 // Exclusion and the split remedy: four complete panels on one page exceed the 900 px budget in every geometry.
 {const wide=await familyProject('en',store.home),d=wide.document;wide.plan.scenes.forEach(s=>s.theme='cream-collage');
  for(const k of ['c','d'])d.datasets.push({...structuredClone(d.datasets[0]),id:'team-'+k,series:[{...structuredClone(d.datasets[0].series[0]),id:`team-${k}-hours`}]}),d.blocks.push({id:'panel-'+k,type:'chart',sourceIds:['family-sample'],datasetId:'team-'+k,chartType:'line',axis:{policy:'fixed',min:0,max:40}});
  wide.plan.scenes.find(s=>s.id==='small-multiples').blockIds.splice(3,0,'panel-c','panel-d');assertVisualProject(wide);
  const measure=async(p,label)=>{const sets=candidateProjects(p),fits=[];await page.setViewportSize({width:1440,height:1000});for(const [k,c]of sets.entries()){const fit=await render(c,`${label}-${k}`);fits.push(fit.checks.map(v=>candidateFit(v,fit.viewport)));for(const [i,s]of c.plan.scenes.entries())if(s.id.startsWith('small-multiples'))await capture(page,`${label}-${k}-${s.id}.png`,page.locator('#'+s.id));}return {sets,fits};};
  const before=await measure(wide,'stress-four-panels'),i=wide.plan.scenes.findIndex(s=>s.id==='small-multiples');
  assert.deepEqual(before.fits.map(r=>r[i].ok),[false,false,false]);assert.ok(before.fits.every(r=>r[i].reasons.some(x=>/900px presentation budget/.test(x))));
  assert.throws(()=>chooseRhythm(wide,before.sets,before.fits),/No measured candidate fits: small-multiples/);
  const split=splitSmallMultiples(wide,'small-multiples'),after=await measure(split,'stress-split');
  for(const id of ['small-multiples','small-multiples-2']){const j=split.plan.scenes.findIndex(s=>s.id===id);assert.ok(after.fits.filter(r=>r[j].ok).length>=2,id);}
  chooseRhythm(split,after.sets,after.fits);
  report.stress={fourPanels:before.fits.map((r,k)=>({composition:before.sets[k].plan.scenes[i].composition,...r[i]})),afterSplit:['small-multiples','small-multiples-2'].map(id=>{const j=split.plan.scenes.findIndex(s=>s.id===id);return {sceneId:id,fits:after.fits.map((r,k)=>({composition:after.sets[k].plan.scenes[j].composition,...r[j]}))};})};
  const cells=[...before.sets.map((c,k)=>({file:`stress-four-panels-${k}-small-multiples.png`,ok:false,label:`four panels · ${c.plan.scenes[i].composition} · FAILS: ${before.fits[k][i].reasons.join('; ')}`})),...after.sets.flatMap((c,k)=>['small-multiples','small-multiples-2'].map(id=>{const j=c.plan.scenes.findIndex(s=>s.id===id);return {file:`stress-split-${k}-${id}.png`,ok:after.fits[k][j].ok,label:`after split · ${id} · ${c.plan.scenes[j].composition} · ${after.fits[k][j].ok?'passes':'FAILS'} · ${Math.ceil(after.fits[k][j].height)}px`};}))];
  await sheet('stress-small-multiples.png','Four panels fail every geometry and are refused; the layout-only split passes',cells);}
 // Direct-loopback Studio: the family control offers the new families; compare, choose, save and reopen.
 const project=await familyProject('en',store.home),saved=await store.save(project,{create:true});editor=await context.newPage();editor.on('pageerror',e=>report.errors.push(e.message));await editor.setViewportSize({width:1920,height:1100});
 await editor.goto(app.url+'/visual?project='+saved.id+'&scene=quote');const ready=()=>editor.waitForFunction(()=>!document.querySelector('#exportHTML').disabled);await ready();
 // Single entry step 3: the composition family is a developer setting in More; the choices lead Look and measure themselves.
 const storedWhen=async test=>{for(let k=0;k<120;k++){const s=await store.get(saved.id);if(test(s))return s;await new Promise(r=>setTimeout(r,250));}throw Error('autosave did not land');};
 for(const gone of ['#designTab','#compare','.candidate-card','[data-select-candidate]'])assert.equal(await editor.locator(gone).count(),0,gone);
 const options=await editor.locator('#family option').evaluateAll(o=>o.map(v=>({value:v.value,disabled:v.disabled,selected:v.selected})));
 for(const family of S3_FAMILIES)assert.ok(options.some(o=>o.value===family),family);
 assert.equal(options.find(o=>o.selected).value,'quote');assert.deepEqual(options.filter(o=>!o.disabled).map(o=>o.value).sort(),['chapter','quote','statement']);
 await revealStudio(editor,'compositions');await editor.waitForFunction(()=>!document.querySelector('#rhythm').disabled,null,{timeout:120000});
 assert.equal(await editor.locator('#candidates .candidate').count(),3);const titles=await editor.locator('#candidates .candidate-label span').allTextContents();assert.ok(titles.every(t=>/quote|verbatim/i.test(t)),JSON.stringify(titles));
 await editor.locator('[data-zone=look] .directions').scrollIntoViewIfNeeded();await capture(editor,'studio-quote-candidates.png');
 await editor.locator('[data-inspect-layout="2"]').click();await editor.locator('#candidateDialog').waitFor({state:'visible'});await editor.frameLocator('#largeCandidate').locator('#quote').waitFor({state:'visible'});await capture(editor,'studio-quote-large.png');await editor.locator('#candidateClose').click();
 await editor.locator('#candidates .candidate[data-layout="2"]:enabled').click();await ready();await storedWhen(s=>s.plan.scenes.find(v=>v.id==='quote').composition==='quote-band');await editor.reload();await ready();
 assert.equal((await store.get(saved.id)).plan.scenes.find(s=>s.id==='quote').composition,'quote-band');report.studio.push('Quote family: three measured candidates, larger view, quote-band selected, saved and reopened');
 // An author's family choice wins: the quotation page becomes a chapter opener when the author says so.
 await revealStudio(editor,'developer');await editor.locator('#family').selectOption('chapter');await closeStudio(editor);await revealStudio(editor,'compositions');await editor.waitForFunction(()=>!document.querySelector('#rhythm').disabled,null,{timeout:120000});
 const chapterTitles=await editor.locator('#candidates .candidate-label span').allTextContents();assert.ok(chapterTitles.some(t=>/headline/i.test(t)),JSON.stringify(chapterTitles));
 await editor.locator('#candidates .candidate:enabled').first().click();await ready();assert.match((await editor.locator('#composition').textContent()),/chapter-/);await capture(editor,'studio-author-family.png');
 await revealStudio(editor,'compositions');await editor.waitForFunction(()=>!document.querySelector('#rhythm').disabled,null,{timeout:120000});await editor.locator('#rhythm').click();await ready();assert.ok((await editor.locator('#rhythmReport').textContent()).includes('Story rhythm cost'));await revealStudio(editor,'developer');await editor.locator('#rhythmReport').scrollIntoViewIfNeeded();await capture(editor,'studio-rhythm.png');await closeStudio(editor);
 const kept=(await editor.evaluate(()=>document.querySelector('#composition').textContent));report.studio.push('Author family override chapter applied to the quote page and kept through deck rhythm: '+kept);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.ok=true;
}catch(e){report.ok=false;report.failure=e.stack;await capture(editor||page,'failure.png').catch(()=>{});process.exitCode=1;}
finally{await browser.close();await app.close();await rm(home,{recursive:true,force:true});await writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,knownIssues:report.knownIssues.length,cases:report.cases.length,candidates:report.cases.length*6,passing:report.cases.reduce((n,c)=>n+c.fit.filter(f=>f.ok).length,0),responsive:report.responsive.length,captures:report.captures.length,failure:report.failure,out},null,2));
