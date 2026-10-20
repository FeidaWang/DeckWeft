// CINE batch 1 browser evidence (docs/plans/cinematic-composition-build-map.md, Task 12): the ten-page corpus in both languages
// at 1440, 1024 and 390 px, the candidate gate per page (with the label and media features), the subject fraction of the three
// images, the source strip's measured height against its 48 px budget, grayscale copies of the product and evidence pages, the
// stated split of the overflow page from measured bounds, and the size every image-family and system-map variant gives the
// primary media (docs/evidence/cine-p0/media-space.json, the basis of LARGEST_MEDIA). Isolated preinstalled test binary only.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,mkdtemp,realpath,readFile,writeFile,rm,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {candidateFit} from '../src/design/rhythm.mjs';
import {subjectFraction,mediaRoles,subjectOf} from '../src/design/media.mjs';
import {sceneReferences} from '../src/references/presentation.mjs';
import {effectiveIntent} from '../src/design/intent.mjs';
import {planAuthorAction} from '../src/workbench/author-actions.mjs';
import {inspectRenderedPage} from '../src/quality/render-checks.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {TARGETS} from '../src/targets/target-budget.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {cineProject,CINE_SCENES} from './cine-corpus.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/visual-cine/acceptance'),evidence=path.join(root,'docs/evidence/cine-p0');await mkdir(out,{recursive:true});await mkdir(evidence,{recursive:true});
const writeEvidence=process.argv.includes('--evidence');
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated testing binary outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Installed browsers are read-only.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-cine-browser-'))),store=await new VisualProjectStore(home).init(),app=await startStudio({home,port:0}),browser=await chromium.launch({executablePath,headless:true});
const report={format:'deckweft-cine-p0-browser',version:1,recordedAt:new Date().toISOString().slice(0,10),browser:browser.version(),renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,isolation:'Isolated cached testing binary; ephemeral contexts with temporary profiles; installed apps and personal profiles untouched',target:TARGETS.presentation,pages:[],strips:[],subjects:[],media:[],split:null,grayscale:[],captures:[],errors:[],externalRequests:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),routes=new Map();
await context.route('**/*',async route=>{const url=route.request().url();if(routes.has(url))await route.fulfill({status:200,contentType:'text/html',body:routes.get(url)});else if(url.startsWith(app.url+'/')||url.startsWith('data:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
async function capture(name,locator,{fullPage=false}={}){await (locator||page).screenshot({path:path.join(out,name),...(locator?{animations:'disabled'}:{fullPage})});report.captures.push({file:name,sha256:hash(await readFile(path.join(out,name)))});return name;}
async function render(p,name){const o=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:await visualAssetResources(p,store.home)});routes.set(app.url+'/'+name+'.html',o.body);await page.goto(app.url+'/'+name+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');return page.evaluate(()=>window.deckweftFit);}
async function resize(width){await page.setViewportSize({width,height:1000});await page.waitForFunction(w=>window.deckweftFit?.viewport.width===w,width);return page.evaluate(()=>window.deckweftFit);}
/** Per scene: the scene box, each region's box, the image boxes (the drawn <img> and the figure), the diagram svg box and the strip height. */
const geometry=()=>page.locator('.web-scene').evaluateAll(nodes=>nodes.map(s=>{const sb=s.getBoundingClientRect(),box=n=>{const b=n.getBoundingClientRect();return {x:b.x-sb.x,y:b.y-sb.y,width:b.width,height:b.height};};
 return {sceneId:s.id,height:sb.height,regions:[...s.querySelectorAll('.regions > .region')].map(r=>({blockId:r.dataset.blockId,component:r.dataset.component,mediaRole:r.dataset.mediaRole||null,box:box(r)})),
  images:[...s.querySelectorAll('.regions .region[data-component=image]')].map(r=>({blockId:r.dataset.blockId,mediaRole:r.dataset.mediaRole||null,figure:box(r.querySelector('.web-image')),crop:box(r.querySelector('.image-crop')),img:box(r.querySelector('img'))})),
  diagrams:[...s.querySelectorAll('.regions .region[data-component=diagram] .semantic-diagram svg')].map(n=>{const b=box(n),vb=n.viewBox?.baseVal,aspect=vb&&vb.height?vb.width/vb.height:b.width/b.height;return {box:b,drawn:b.width/b.height>aspect?{width:b.height*aspect,height:b.height}:{width:b.width,height:b.width/aspect},viewBox:vb?[vb.width,vb.height]:null};}),
  strip:s.querySelector('.source-strip')?{box:box(s.querySelector('.source-strip')),items:s.querySelectorAll('.source-strip .region').length,budget:parseFloat(getComputedStyle(s.querySelector('.source-strip')).getPropertyValue('--strip-budget'))||null,panelOpen:!!s.querySelector('.reference-panel[open]')}:null};}));
async function sheet(name,title,cells,columns=3){let html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#ddd;font:14px Arial}main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:12px;align-items:start}img{width:100%;display:block}.cell{background:white;padding:8px}p{margin:4px 0 6px}.fail{color:#a00;font-weight:700}</style><h1>${title}</h1><main>`;for(const c of cells)html+=`<div class="cell"><p class="${c.ok?'':'fail'}">${c.label}</p><img src="data:image/png;base64,${(await readFile(path.join(out,c.file))).toString('base64')}"></div>`;await page.setViewportSize({width:columns>3?2200:1800,height:1000});routes.set(app.url+'/'+name+'.html',html+'</main>');await page.goto(app.url+'/'+name+'.html');await page.screenshot({path:path.join(out,name),fullPage:true,type:'jpeg',quality:70});report.captures.push({file:name,sha256:hash(await readFile(path.join(out,name)))});}
const THEMES=['cream-collage','dark-data','electric-violet','silver-gray-editorial','fresh-report','orange-launch'];
const IMAGE_VARIANTS=[...THEMES.flatMap(t=>['image-left','image-strip','image-right'].map(c=>[t,c])),['electric-violet','photo-split'],['orange-launch','stage-hero']],MAP_VARIANTS=THEMES.flatMap(t=>['system-map-wide','system-map-rail','system-map-key'].map(c=>[t,c]));
try{
 for(const locale of ['en','zh-CN']){
  const p=await cineProject(locale,store.home),cells=[],narrow=[];
  await page.setViewportSize({width:1440,height:1000});const fit=await render(p,`cine-${locale}`),g=await geometry(),inspected=await page.evaluate(inspectRenderedPage);
  assert.equal(inspected.renderHash,fit.renderHash);
  for(const [i,s]of p.plan.scenes.entries()){
   const check=fit.checks[i],geo=g[i],cropOf=id=>s.crops?.find(c=>c.blockId===id)||null,images=geo.images.map(im=>({blockId:im.blockId,box:im.img,subjectBounds:subjectOf(s,im.blockId),crop:cropOf(im.blockId)}));
   const accepted=candidateFit({...check,images},fit.viewport),intent=effectiveIntent(p.document,p.plan,i),refs=sceneReferences(p.document,p.plan,s);
   report.pages.push({locale,sceneId:s.id,composition:s.composition,theme:s.theme,declared:CINE_SCENES[s.id]||{},intent,references:{mode:refs.mode,strip:refs.strip.length,regions:refs.regions.length,claims:refs.claims.length},mediaRoles:Object.fromEntries(mediaRoles(p.document,s)),width:1440,height:Math.ceil(check.height),fit:accepted,images:geo.images,diagrams:geo.diagrams});
   if(geo.strip)report.strips.push({locale,sceneId:s.id,width:1440,height:Math.round(geo.strip.box.height*10)/10,budget:geo.strip.budget,items:geo.strip.items,withinBudget:geo.strip.box.height<=(geo.strip.budget||48)+0.5});
   for(const im of geo.images)report.subjects.push({locale,sceneId:s.id,blockId:im.blockId,mediaRole:im.mediaRole,imageBox:im.img,subjectBounds:subjectOf(s,im.blockId),crop:cropOf(im.blockId),...subjectFraction({pageWidth:1440,pageHeight:check.height,imageBox:im.img,subjectBounds:subjectOf(s,im.blockId),crop:cropOf(im.blockId)})});
   const file=await capture(`cine-${locale}-${s.id}-1440.png`,page.locator('#'+s.id));cells.push({file,ok:accepted.ok,label:`${s.id} · ${s.composition} · ${accepted.ok?'passes':'FAILS: '+accepted.reasons.join('; ')} · ${Math.ceil(check.height)}px`});
  }
  // Grayscale copies: the primary subject must still read without colour (spec §8, a diagnostic signal, not eye tracking).
  await page.addStyleTag({content:'html{filter:grayscale(1)}'});for(const id of ['product','evidence'])report.grayscale.push({locale,sceneId:id,file:await capture(`cine-${locale}-${id}-1440-grayscale.png`,page.locator('#'+id))});
  await page.evaluate(()=>{for(const st of document.querySelectorAll('style'))if(st.textContent.includes('grayscale(1)'))st.remove();});
  for(const width of [1024,390]){
   const f=await resize(width),rows=await geometry();
   for(const [i,s]of p.plan.scenes.entries()){const check=f.checks[i],accepted=candidateFit(check,f.viewport);report.pages.push({locale,sceneId:s.id,composition:s.composition,width,height:Math.ceil(check.height),fit:accepted});
    if(rows[i].strip)report.strips.push({locale,sceneId:s.id,width,height:Math.round(rows[i].strip.box.height*10)/10,budget:rows[i].strip.budget,items:rows[i].strip.items,withinBudget:null});
    const file=await capture(`cine-${locale}-${s.id}-${width}.png`,page.locator('#'+s.id));if(width===390)narrow.push({file,ok:accepted.ok,label:`${s.id} · ${s.composition} · 390 px${accepted.ok?'':' · '+accepted.reasons.join('; ')}`});}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page-level horizontal scroll at '+width);
  }
  await sheet(`cine-${locale}-contact.jpg`,`${locale} · CINE batch 1 corpus at 1440 px (renderer ${WEB_RENDERER_VERSION})`,cells);
  await sheet(`cine-${locale}-contact-390.jpg`,`${locale} · the same ten pages at 390 px`,narrow,5);
  // The stated split: the overflow page from measured region bounds (y from the top of the page), then both pages rendered.
  if(locale==='en'){
   await page.setViewportSize({width:1440,height:1000});await render(p,'cine-en');const geo=(await geometry()).find(x=>x.sceneId==='overflow');
   const regionBounds=geo.regions.map(r=>({blockId:r.blockId,y:r.box.y,height:r.box.height}));
   // Each pass cuts one page from its measured bounds; the continuation is measured and cut again until every part fits or nothing changes.
   let current=p,bounds=regionBounds,target='overflow',round=0;const passes=[];let after=null;
   while(round++<4){const plan=planAuthorAction(current,{action:'fit-page',level:'page',id:target,options:{regionBounds:bounds}});passes.push({page:target,changed:plan.changed,effects:plan.effects.map(e=>e.en),kept:plan.kept.map(k=>k.en)});if(!plan.changed)break;current=plan.project;
    after=await render(current,'cine-en-split-'+round);const g2=await geometry(),over=current.plan.scenes.map((s,i)=>({s,i})).filter(({s,i})=>s.id.startsWith('overflow')&&after.checks[i].height>TARGETS.presentation.candidateHeight);if(!over.length)break;
    target=over[0].s.id;bounds=g2[over[0].i].regions.map(r=>({blockId:r.blockId,y:r.box.y,height:r.box.height}));}
   const ids=current.plan.scenes.map(s=>s.id).filter(id=>id.startsWith('overflow'));
   const fits=after?ids.map(id=>{const i=current.plan.scenes.findIndex(s=>s.id===id);return {sceneId:id,height:Math.ceil(after.checks[i].height),fit:candidateFit(after.checks[i],after.viewport)};}):null;
   const files=[];if(after)for(const id of ids)files.push(await capture(`cine-en-${id}-split-1440.png`,page.locator('#'+id)));
   report.split={regionBounds,passes,changed:current!==p,pages:ids,fits,files,blockIds:Object.fromEntries(ids.map(id=>[id,current.plan.scenes.find(s=>s.id===id).blockIds]))};
  }
 }
 // Media variants on the product (image family and the two theme heroes) and mechanism (system-map) pages, at 1440 px.
 const base=await cineProject('en',store.home);await page.setViewportSize({width:1440,height:1000});
 for(const [pageId,variants,family] of [['product',IMAGE_VARIANTS,'image'],['mechanism',MAP_VARIANTS,'system-map']]){
  for(const [theme,composition] of variants){
   const q=structuredClone(base),s=q.plan.scenes.find(v=>v.id===pageId);s.theme=theme;s.composition=composition;delete q.document.authorOverrides.sceneLocks;
   try{assertVisualProject(q);}catch(e){report.media.push({page:pageId,family,theme,composition,refused:e.message});continue;}
   const name=`cine-media-${pageId}-${theme}-${composition}`,fit=await render(q,name),i=q.plan.scenes.indexOf(s),check=fit.checks[i],geo=(await geometry())[i],accepted=candidateFit(check,fit.viewport);
   const drawn=pageId==='product'?geo.images[0].img:geo.diagrams[0]?.drawn,box=pageId==='product'?geo.images[0].figure:geo.diagrams[0]?.box;
   report.media.push({page:pageId,family,theme,composition,drawn:drawn?[Math.round(drawn.width),Math.round(drawn.height)]:null,box:box?[Math.round(box.width),Math.round(box.height)]:null,sceneHeight:Math.ceil(check.height),fit:accepted.ok,reasons:accepted.reasons,file:await capture(name+'.png',page.locator('#'+pageId))});
  }
 }
 const mediaCells=report.media.filter(r=>r.file).map(r=>({file:r.file,ok:r.fit,label:`${r.page} · ${r.theme} · ${r.composition} · drawn ${r.drawn?.join('×')} px · ${r.fit?'fits':'FAILS: '+r.reasons.join('; ')} · ${r.sceneHeight}px`}));
 await sheet('cine-media-contact.jpg','Primary media size per variant at 1440 px (the basis of LARGEST_MEDIA)',mediaCells,4);
 // The winner per family: the largest drawn area among variants that pass the candidate gate, across the themes measured; a tie
 // within 1 % goes to the family's show-product variant (image-right) or the overview variant (system-map-wide).
 // Shared variants are compared across every theme (the shared winner); a theme-only composition that draws the media larger
 // than the shared winner in its own theme is recorded under byTheme, mirroring LARGEST_PLOT.
 const area=r=>r.drawn[0]*r.drawn[1],pick=(rows,tieBreak)=>{const fits=rows.filter(r=>r.fit),pool=fits.length?fits:rows,best=[...pool].sort((a,b)=>area(b)-area(a))[0],ties=pool.filter(r=>area(r)>=area(best)*.99);return best?{composition:ties.some(r=>r.composition===tieBreak)?tieBreak:best.composition,drawn:best.drawn,theme:best.theme,fits:fits.length,of:rows.length,ties:[...new Set(ties.map(r=>r.composition))]}:null;};
 const shared=new Set(['image-left','image-strip','image-right','system-map-wide','system-map-rail','system-map-key']);
 const winner=(family,tieBreak)=>{const rows=report.media.filter(r=>r.family===family&&r.drawn),general=pick(rows.filter(r=>shared.has(r.composition)),tieBreak),byTheme={};
  for(const theme of THEMES){const own=rows.filter(r=>r.theme===theme),w=pick(own,tieBreak);if(w&&!shared.has(w.composition)){const sharedHere=pick(own.filter(r=>shared.has(r.composition)),tieBreak);if(!sharedHere||area(w)>area(sharedHere)*1.01)byTheme[theme]=w;}}
  return {shared:general.composition,sharedDrawn:general.drawn,sharedFits:`${general.fits} of ${general.of}`,ties:general.ties,byTheme:Object.fromEntries(Object.entries(byTheme).map(([t,w])=>[t,{composition:w.composition,drawn:w.drawn}]))};};
 const winners={image:winner('image','image-right'),'system-map':winner('system-map','system-map-wide')};
 const media={format:'deckweft-cine-media-sizes',version:1,recordedAt:report.recordedAt,width:1440,browser:report.browser,renderer:WEB_RENDERER_VERSION,note:'drawn = the <img> box, or the diagram drawing inside its <svg> box (viewBox aspect), in CSS px at 1440 px; box = the figure or svg; fit = the candidate gate (900 px budget, no clip, no overflow, labels ≥ 10 px). The winner per family is the largest drawn area among variants that pass the gate (ties within 1 % go to image-right / system-map-wide).',winners,rows:report.media};
 await writeFile(path.join(out,'media-space.json'),JSON.stringify(media,null,1)+'\n');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,1)+'\n');
 if(writeEvidence){await writeFile(path.join(evidence,'media-space.json'),JSON.stringify(media,null,1)+'\n');await writeFile(path.join(evidence,'browser-report.json'),JSON.stringify(report,null,1)+'\n');for(const f of report.captures.filter(c=>c.file.endsWith('.jpg')))await copyFile(path.join(out,f.file),path.join(evidence,f.file));}
 console.log(JSON.stringify({browser:report.browser,pages:report.pages.length,failing:report.pages.filter(x=>!x.fit.ok).map(x=>`${x.locale}/${x.sceneId}@${x.width}: ${x.fit.reasons.join('; ')}`),strips:report.strips.filter(s=>s.width===1440).map(s=>`${s.locale}/${s.sceneId}: ${s.height}px of ${s.budget}`),winners:media.winners,media:report.media.map(r=>`${r.page} ${r.theme} ${r.composition}: ${r.drawn?.join('×')} ${r.fit?'fits':'FAILS: '+(r.reasons||[]).join('; ')}${r.refused?' refused':''}`),split:report.split&&{changed:report.split.changed,passes:report.split.passes.length,pages:report.split.pages,fits:report.split.fits?.map(f=>`${f.sceneId}:${f.height}px ${f.fit.ok?'ok':f.fit.reasons.join('; ')}`)},out},null,1));
}finally{await context.close();await browser.close();await app.close();await rm(home,{recursive:true,force:true});}
