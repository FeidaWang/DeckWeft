import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,realpath,rm,readFile} from 'node:fs/promises';
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {createVisualProject,assertVisualProject} from '../src/core/visual-project.mjs';
import {assertAssetBrief,defaultBrief,assertImageSlots} from '../src/assets/brief.mjs';
import {safeCrop,cropFloor,cropCeiling,isEvidenceBrief,contains} from '../src/assets/crop.mjs';
import {applySlotCrop,slotFor} from '../src/assets/slots.mjs';
import {subjectFraction,subjectOf} from '../src/design/media.mjs';
import {cineProject,cineFixture,cineScenes,CINE_SCENES,CINE_FIELDS,CINE_SLOTS} from './cine-corpus.mjs';
import {checkRender} from '../src/quality/render-checks.mjs';
import {renderBaseline} from './render-baseline.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {artDirectionCSS} from '../src/render/web/art-direction.mjs';
/**
 * CINE batch 2 (docs/plans/cinematic-composition-batch-2.md): CINE-005 subject-aware framing, CINE-006 typography and
 * luminance hierarchy, CINE-007 aesthetic evaluation, on the batch 1 corpus (tests/cine-corpus.mjs).
 */
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-cine-p1-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const html=(p,resources={})=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources});
const blocksOf=p=>new Map(p.document.blocks.map(b=>[b.id,b]));
const applyNegative=(fixture,c)=>{const {document,plan,assets}=structuredClone(fixture),p={document,plan,assets};for(const [path,value]of Object.entries(c.set)){const keys=path.split('.');let o=p;for(const k of keys.slice(0,-1))o=o[/^\d+$/.test(k)?Number(k):k];o[keys.at(-1)]=structuredClone(value);}return p;};
const negativeCases=async tag=>{const n=JSON.parse(await readFile(new URL('./fixtures/visual/cine.negative.json',import.meta.url),'utf8'));return n.cases.filter(c=>c.task===tag);};
const FULL={x:0,y:0,width:1,height:1};
/** Markup helpers (as in cine-p0): a balanced element slice, its text, and the regions of one scene section with their images' alt. */
const element=(markup,open)=>{const at=markup.search(open);if(at<0)return null;const m=markup.slice(at).match(/^<(\w+)/),tag=m[1],re=new RegExp(`<${tag}(\\s[^>]*)?>|</${tag}>`,'g');re.lastIndex=markup.slice(at).indexOf('>')+1;let depth=1,x,rest=markup.slice(at);while(depth&&(x=re.exec(rest)))depth+=x[0][1]==='/'?-1:1;return depth?null:rest.slice(0,re.lastIndex);};
const unescape=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const textOf=html=>unescape(html.replace(/<[^>]+>/g,''));
const regionsOf=markup=>{const out=[],re=/<div id="(r[a-f0-9]+)" class="region" data-block-id="([^"]+)" data-component="([^"]+)"([^>]*)>/g;let m;while((m=re.exec(markup))){const html=element(markup.slice(m.index),/^<div/);out.push({nodeId:m[1],blockId:m[2],component:m[3],attrs:m[4],html,text:textOf(html),links:[...html.matchAll(/href="([^"]*)"/g)].map(x=>({href:unescape(x[1])})),images:[...html.matchAll(/<img [^>]*alt="([^"]*)"/g)].map(x=>({ready:true,alt:unescape(x[1])}))});}return out;};
const observationOf=(p,out)=>({viewport:{width:1440},fit:{viewport:{width:1440},checks:[]},fontStatus:'loaded',documentOverflow:false,sourceLinks:[...out.body.matchAll(/href="([^"]*)"/g)].map(m=>unescape(m[1])),dom:'',scenes:out.scenes.map((s,i)=>({sceneId:s.id,composition:s.composition,bounds:{x:0,y:0,width:1440,height:810},regions:regionsOf(out.sceneMarkup[i]),disclosed:[]}))});
const productBrief=()=>({...defaultBrief(),requiredWidth:240,requiredHeight:240,focalPoint:{x:.5,y:.5},safeRegion:{x:.3,y:.3,width:.4,height:.4},subjectBounds:{x:.3,y:.3,width:.4,height:.4},protectedRegions:[{x:.28,y:.28,width:.44,height:.44}],contextRegion:{x:.1,y:.1,width:.8,height:.8},visibleCaption:'The product in its field; the drawing is synthetic'});

// ---- Task 1: CINE-005 brief contract, subject-aware safeCrop, evidence screenshots, corpus annotations ----
test('CINE-005 brief: subjectBounds, protectedRegions, contextRegion, visibleCaption and detailLocator validate; rects outside the context region, a 9th protected region and a locator that is not an image of the page are refused',async()=>{
 const p=await cineProject('en',home),detail=p.plan.scenes.find(s=>s.id==='detail');
 const brief=productBrief();assert.equal(assertAssetBrief(brief,p.document),brief);
 const locator={...brief,detailLocator:{blockId:'det-locator',region:{x:.3,y:.3,width:.4,height:.4}}};assert.equal(assertAssetBrief(locator,p.document),locator);
 assert.throws(()=>assertAssetBrief({...brief,subjectBounds:{x:0,y:0,width:.5,height:.5}},p.document),{code:'SAFE_REGION'},'the subject must lie inside the context region');
 assert.throws(()=>assertAssetBrief({...brief,protectedRegions:[{x:.05,y:.3,width:.4,height:.4}]},p.document),{code:'SAFE_REGION'},'every protected region lies inside the context region');
 assert.throws(()=>assertAssetBrief({...brief,contextRegion:{x:.35,y:.35,width:.3,height:.3}},p.document),{code:'SAFE_REGION'},'the context region contains the safe region');
 assert.throws(()=>assertAssetBrief({...brief,protectedRegions:Array.from({length:9},()=>({x:.3,y:.3,width:.1,height:.1}))},p.document),{code:'ASSET_BRIEF'});
 assert.throws(()=>assertAssetBrief({...brief,visibleCaption:'x'.repeat(301)},p.document),{code:'ASSET_BRIEF'});
 assert.throws(()=>assertAssetBrief({...brief,subjectBounds:{x:.3,y:.3,width:0,height:.4}},p.document),{code:'ASSET_BRIEF'});
 // The locator is validated against the page: another image of this page, never the slot's own block or a paragraph.
 const slot=structuredClone(detail.imageSlots.find(s=>s.blockId==='det-hero'));
 for(const blockId of ['det-hero','det-body','prod-image']){const scene={...structuredClone(detail),imageSlots:[{...slot,brief:{...slot.brief,detailLocator:{blockId,region:{x:.3,y:.3,width:.4,height:.4}}}}]};assert.throws(()=>assertImageSlots(p.document,scene,p.assets),{code:'IMAGE_SLOT'},blockId);}
});
test('CINE-005 safeCrop: the floor is the union of safeRegion and the protected regions, the ceiling is the context region; the corpus product crop at aspect 1 is {.2,.1,.6,.8}; a floor that cannot fit the aspect is refused PROTECTED_REGION with contain',()=>{
 const asset={width:800,height:600},brief=productBrief();
 assert.deepEqual(cropFloor(brief),{x:.28,y:.28,width:.44,height:.44});assert.deepEqual(cropCeiling(brief),{x:.1,y:.1,width:.8,height:.8});
 assert.deepEqual(cropFloor({...brief,protectedRegions:[]}),brief.safeRegion);assert.deepEqual(cropCeiling({...brief,contextRegion:undefined}),FULL);
 const r=safeCrop(asset,{...brief,aspect:1});
 assert.equal(r.ok,true);assert.equal(r.mode,'cover');
 for(const k of ['x','y','width','height'])assert.ok(Math.abs(r.crop[k]-{x:.2,y:.1,width:.6,height:.8}[k])<1e-9,k+' '+r.crop[k]);
 assert.ok(contains(r.crop,cropFloor(brief)));assert.ok(contains(cropCeiling(brief),r.crop));
 assert.ok(Math.abs(asset.width*r.crop.width/(asset.height*r.crop.height)-1)<1e-9,'the crop has the asked aspect in pixels');
 // Without a context region the same aspect takes the full height; the protected floor still holds.
 const wide=safeCrop(asset,{...brief,contextRegion:undefined,aspect:1});assert.equal(wide.ok,true);assert.ok(Math.abs(wide.crop.height-1)<1e-9);assert.ok(contains(wide.crop,cropFloor(brief)));
 // A floor wider than the maximal crop inside the ceiling is refused, never cut.
 const refused=safeCrop(asset,{...brief,protectedRegions:[{x:.1,y:.1,width:.8,height:.8}],aspect:1});
 assert.equal(refused.ok,false);assert.equal(refused.code,'PROTECTED_REGION');assert.equal(refused.mode,'contain');assert.deepEqual(refused.crop,FULL);
 // A brief without the new fields behaves exactly as before (VIS-007).
 const legacy=safeCrop({width:1200,height:800},{...defaultBrief(),safeRegion:{x:.4,y:.25,width:.2,height:.35},focalPoint:{x:.95,y:.9},aspect:3/4});
 assert.equal(legacy.ok,true);assert.ok(contains(legacy.crop,{x:.4,y:.25,width:.2,height:.35}));assert.ok(Math.abs(legacy.crop.height-1)<1e-9);
});
test('CINE-005 evidence screenshot: product-screenshot + factual refuses every crop with PROTECTED_REGION, accepts contain, and applySlotCrop names the code',async()=>{
 const p=await cineProject('en',home),asset={width:800,height:600},brief={...defaultBrief(),role:'product-screenshot',factual:true,sourceId:'src-product'};
 assert.equal(isEvidenceBrief(brief),true);assert.equal(isEvidenceBrief({...brief,factual:false}),false);assert.equal(isEvidenceBrief({...brief,role:'photo'}),false);
 for(const aspect of [1,16/9,4/3]){const r=safeCrop(asset,{...brief,aspect});assert.equal(r.ok,false);assert.equal(r.code,'PROTECTED_REGION');assert.equal(r.mode,'contain');assert.deepEqual(r.crop,FULL);}
 // The corpus product-center page is the evidence screenshot that must not be cropped (spec §8).
 const slot=slotFor(p,'product-center','pc-image');assert.equal(slot.display,'contain');assert.equal(isEvidenceBrief(slot.brief),true);
 assert.throws(()=>applySlotCrop(p,'product-center','pc-image',{mode:'crop',aspect:1}),{code:'PROTECTED_REGION'});
 const contained=applySlotCrop(p,'product-center','pc-image',{mode:'contain',aspect:4/3});assert.deepEqual(contained.plan.scenes.find(s=>s.id==='product-center').crops.find(c=>c.blockId==='pc-image'),{blockId:'pc-image',...FULL});
 // A saved project whose evidence crop is not the whole image is refused by name.
 const forged=structuredClone(p);forged.plan.scenes.find(s=>s.id==='product-center').crops=[{blockId:'pc-image',x:.1,y:.1,width:.8,height:.8}];
 assert.throws(()=>assertVisualProject(forged),{code:'PROTECTED_REGION'});
 // A crop on an ordinary image that cuts the protected floor keeps the VIS-007 code.
 assert.throws(()=>applySlotCrop(p,'product','prod-image',{mode:'crop',aspect:10}),{code:'UNSAFE_CROP'});
});
test('CINE-005 corpus: both locales carry the annotated product and tall slots, cineProject validates with imageSlots and crops declared, the legacy corpus still validates; every negative case tagged CINE-005 is refused',async()=>{
 assert.deepEqual(CINE_FIELDS,['references','intent','media','imageSlots','crops']);
 for(const locale of ['en','zh-CN']){
  const p=await cineProject(locale,home),product=p.plan.scenes.find(s=>s.id==='product'),detail=p.plan.scenes.find(s=>s.id==='detail'),center=p.plan.scenes.find(s=>s.id==='product-center');
  const hero=product.imageSlots.find(s=>s.blockId==='prod-image');assert.deepEqual(hero.brief.subjectBounds,{x:.3,y:.3,width:.4,height:.4});assert.equal(hero.brief.protectedRegions.length,1);assert.ok(hero.brief.visibleCaption);assert.equal(hero.display,'crop');
  const crop=product.crops.find(c=>c.blockId==='prod-image');assert.ok(contains(crop,cropFloor(hero.brief)));assert.ok(contains(cropCeiling(hero.brief),crop));
  const tall=detail.imageSlots.find(s=>s.blockId==='det-hero');assert.deepEqual(tall.brief.detailLocator,{blockId:'det-locator',region:{x:.3,y:.3,width:.4,height:.4}});assert.ok(tall.brief.visibleCaption);assert.ok(contains(detail.crops.find(c=>c.blockId==='det-hero'),tall.brief.subjectBounds));
  const locator=detail.imageSlots.find(s=>s.blockId==='det-locator');assert.equal(locator.display,'contain');assert.deepEqual(locator.brief.subjectBounds,{x:.3,y:.3,width:.4,height:.4});
  const evidence=center.imageSlots.find(s=>s.blockId==='pc-image');assert.equal(evidence.brief.role,'product-screenshot');assert.equal(evidence.brief.factual,true);assert.equal(p.document.blocks.find(b=>b.id==='pc-image').factual,true);
  assert.deepEqual(subjectOf(product,'prod-image'),{x:.3,y:.3,width:.4,height:.4});assert.equal(subjectOf(p.plan.scenes.find(s=>s.id==='context'),'ctx-image'),null);
  // The scene-level declarations are the ones the corpus table states.
  assert.deepEqual(CINE_SCENES.product.imageSlots.map(s=>s.blockId),['prod-image']);assert.deepEqual(CINE_SCENES.detail.imageSlots.map(s=>s.blockId),['det-hero','det-locator']);
  const legacy=await cineProject(locale,home,{declared:[]});for(const s of legacy.plan.scenes)assert.equal('imageSlots' in s||'crops' in s,false);
  const without=await cineProject(locale,home,{declared:['references','intent','media']});assert.equal(without.plan.scenes.find(s=>s.id==='product').imageSlots,undefined);
 }
 const fixture=await cineFixture('en'),cases=await negativeCases('CINE-005');assert.ok(cases.length>=4);
 const declared=structuredClone(fixture),scenes=cineScenes('en');for(const s of declared.plan.scenes)for(const f of CINE_FIELDS)if(scenes[s.id]?.[f])s[f]=structuredClone(scenes[s.id][f]);
 assert.doesNotThrow(()=>createVisualProject(declared.document,declared.plan,{id:'declared',assets:declared.assets}));
 for(const c of cases){const b=applyNegative(declared,c);
  assert.throws(()=>createVisualProject(b.document,b.plan,{id:'negative',assets:b.assets}),e=>e.code===(c.code||'INVALID_DESIGN_PLAN'),c.why);}
});
test('CINE-005 subject fraction: the product hero with its 40 % × 40 % subject reports annotated:true and the subject share of its crop; an image without subjectBounds reports annotated:false and "no subject annotation"',()=>{
 const page={pageWidth:1440,pageHeight:810},box={x:700,y:100,width:600,height:600};
 const annotated=subjectFraction({...page,imageBox:box,subjectBounds:{x:.3,y:.3,width:.4,height:.4},crop:{x:.2,y:.1,width:.6,height:.8}});
 assert.equal(annotated.annotated,true);assert.ok(Math.abs(annotated.containerFraction-360000/(1440*810))<1e-9);
 assert.ok(Math.abs(annotated.subjectFraction-annotated.containerFraction*(.16/.48))<1e-9,'subject area over crop area');
 // A subject partly outside the crop counts only its visible part.
 const partial=subjectFraction({...page,imageBox:box,subjectBounds:{x:.3,y:.3,width:.4,height:.4},crop:{x:.5,y:0,width:.5,height:1}});
 assert.ok(Math.abs(partial.subjectFraction-partial.containerFraction*((.2*.4)/.5))<1e-9);
 // Without a crop the whole image is the frame (batch 1 arithmetic unchanged).
 const whole=subjectFraction({...page,imageBox:box,subjectBounds:{x:.3,y:.3,width:.4,height:.4}});assert.ok(Math.abs(whole.subjectFraction-whole.containerFraction*.16)<1e-9);
 const none=subjectFraction({...page,imageBox:box,crop:{x:.2,y:.1,width:.6,height:.8}});assert.equal(none.annotated,false);assert.equal(none.note,'no subject annotation');assert.equal(none.subjectFraction,none.containerFraction);
 const full=subjectFraction({...page,imageBox:box,subjectBounds:FULL});assert.equal(full.annotated,false);
});

// ---- Task 2: CINE-005 visible caption, locator frame and alt preservation in the web renderer; renderer .14 ----
test('CINE-005 web: the product page prints the visible caption in <figcaption> and keeps the alt on <img>; the detail page draws the locator frame on the locator image at the declared rect; pages without slots render as before',async()=>{
 for(const locale of ['en','zh-CN']){
  const p=await cineProject(locale,home),resources=await visualAssetResources(p,home),out=html(p,resources),at=id=>out.sceneMarkup[p.plan.scenes.findIndex(s=>s.id===id)],block=id=>p.document.blocks.find(b=>b.id===id);
  const product=regionsOf(at('product')).find(r=>r.blockId==='prod-image');
  assert.ok(product.html.includes(`<figcaption>${CINE_SLOTS[locale].product} <sup class="source-marker">`),'the caption is the figcaption (followed by the page\'s claim markers)');
  assert.deepEqual(product.images,[{ready:true,alt:block('prod-image').alt}],'the alt stays on the image');
  assert.ok(!product.html.includes(block('prod-image').alt.replace(/&/g,'&amp;')+'</figcaption>'),'the alt is not printed as the caption');
  const detail=regionsOf(at('detail')),hero=detail.find(r=>r.blockId==='det-hero'),locator=detail.find(r=>r.blockId==='det-locator');
  assert.ok(hero.html.includes(`<figcaption>${CINE_SLOTS[locale].detail}</figcaption>`));assert.ok(!hero.html.includes('locator-frame'),'the detail itself carries no frame');
  assert.ok(locator.html.includes('<figure class="web-image" data-locator-for="det-hero"'),'the locator figure names the detail it locates');
  assert.ok(locator.html.includes('<span class="locator-frame" style="left:30%;top:30%;width:40%;height:40%" aria-hidden="true"></span></div><figcaption>'),'the frame is drawn inside the crop at the declared rect, before the caption');
  assert.deepEqual(locator.images,[{ready:true,alt:block('det-locator').alt}]);
  const context=regionsOf(at('context')).find(r=>r.blockId==='ctx-image');
  assert.ok(context.html.includes(`<figcaption>${block('ctx-image').alt} <sup`),'without a slot the alt is the caption, as before');assert.ok(!context.html.includes('locator-frame'));
  const legacy=await cineProject(locale,home,{declared:[]}),lo=html(legacy,await visualAssetResources(legacy,home));
  assert.ok(!lo.sceneMarkup.join('').includes('locator-frame')&&!lo.body.includes('data-locator-for'),'legacy markup carries no frame (the stylesheet rule is the only mention)');
  assert.equal(lo.scenes.every(s=>s.regions.every(r=>!('locator' in r))),true);
  assert.ok(out.scenes.find(s=>s.id==='detail').regions.find(r=>r.blockId==='det-locator').locator.forBlockId==='det-hero');
 }
 assert.ok(artDirectionCSS.includes('.web-scene .image-crop .locator-frame{position:absolute;'));
});
test('CINE-005 checks: checkRender from a synthetic observation passes text coverage with the caption and fails when the observed alt differs from the block alt',async()=>{
 const p=await cineProject('en',home),resources=await visualAssetResources(p,home),out=html(p,resources),observation=observationOf(p,out);
 const r=checkRender(p,[observation]);assert.deepEqual(r.issues.filter(i=>['text-coverage','source-coverage','coverage','missing-asset'].includes(i.kind)),[]);assert.equal(r.ok,true);
 // The observed page carries each image's alt; a page whose <img> lost or changed it fails text coverage by name.
 const tampered=structuredClone(observation),scene=tampered.scenes.find(s=>s.sceneId==='product'),region=scene.regions.find(r=>r.blockId==='prod-image');region.images[0].alt='A different description';
 const bad=checkRender(p,[tampered]),issue=bad.issues.find(i=>i.kind==='text-coverage'&&i.blockId==='prod-image');assert.ok(issue,'alt change is a text-coverage issue');assert.match(issue.reason,/alt/i);assert.equal(bad.ok,false);
 // An observation without alt information (older runners, synthetic observations) is not penalized.
 const silent=structuredClone(observation);for(const s of silent.scenes)for(const q of s.regions)for(const im of q.images)delete im.alt;assert.equal(checkRender(p,[silent]).ok,true);
});
test('CINE batch 2: a legacy deck renders the same markup except the renderer version (render-baseline parts: markup unchanged, renderer .14)',async()=>{
 const baseline=JSON.parse(await readFile(new URL('./fixtures/visual/render-baseline.json',import.meta.url),'utf8')),current=await renderBaseline();
 assert.equal(WEB_RENDERER_VERSION,'visual-art-direction.18');assert.equal(current.renderer,'visual-art-direction.18');
 assert.deepEqual(current.content,baseline.content);
 // The content view strips the stylesheet and the hashes that carry the renderer version; the reader-visible markup is unchanged.
 assert.deepEqual(Object.fromEntries(Object.entries(current.parts).map(([k,v])=>[k,v.data])),Object.fromEntries(Object.entries(baseline.parts).map(([k,v])=>[k,v.data])));
});

// ---- Task 3: CINE-005 captions and alt in the paged exports; annotated subjects in the candidate report ----
import {syntheticLayout} from './export-layout.mjs';
import {candidateFit} from '../src/design/rhythm.mjs';
import {targetFit} from '../src/targets/target-budget.mjs';
/** Compiles one paged target from the synthetic layout (unit tests only; real runs measure a browser). */
function paged(p,target,{resources={},layout,paginate}={}){
 const h=html(p,resources),l=layout||syntheticLayout({...p,resources},h);
 return {html:h,layout:l,out:exportDeck(p.document,target,{experimentalWeb:true,plan:p.plan,assetResources:resources,layout:l,rasters:{},...(paginate?{paginate}:{})})};
}
test('CINE-005 exports: with the synthetic layout the product page compiles the caption as real text in PowerPoint and PDF and the picture description is the alt; the typography report classes the caption as reference',async()=>{
 const p=await cineProject('en',home),resources=await visualAssetResources(p,home),alt=p.document.blocks.find(b=>b.id==='prod-image').alt,caption=CINE_SLOTS.en.product;
 const pptx=paged(p,'pptx',{resources}).out,slides=pptx.run.output.slides.filter(s=>s.sceneId==='product'),own=slides.flatMap(s=>s.elements.filter(x=>x.blockId==='prod-image'));
 assert.ok(own.some(s=>s.kind==='picture'&&s.descr===alt),'the picture description is the alt');
 assert.ok(own.some(s=>s.kind!=='picture'&&String(s.text).includes(caption)),'the caption is native slide text');
 assert.ok(!own.some(s=>s.kind!=='picture'&&String(s.text).includes(alt)),'the alt is not duplicated as slide text');
 assert.equal(pptx.report.check.sceneCheck.status,'pass');assert.equal(pptx.report.check.typography.status,'pass');
 const pdf=paged(p,'pdf',{resources}).out,page=[...pdf.run.output.html.matchAll(/<div class="dw-page"[\s\S]*?(?=<div class="dw-page"|<section class="dw-notes")/g)].map(m=>m[0]).find(h=>h.includes('id="product"'));
 assert.ok(page.includes(caption),'the PDF page carries the caption');assert.ok(page.includes(`alt="${alt}"`),'the PDF figure keeps the alt');
 // The typography report classes the caption (the image block's text) as reference: 12 px is 8 pt in PowerPoint, above the 6 pt minimum and below the 10 pt target.
 const {layout}=paged(p,'pptx',{resources}),m=layout.scenes[p.plan.scenes.findIndex(s=>s.id==='product')],fit=targetFit(m,blocksOf(p),{format:'pptx',titleBlockId:'prod-title',strip:60});
 const caption12=fit.typography.flatMap(t=>t.target.below).find(r=>r.blockId==='prod-image');assert.ok(caption12,'the caption row');assert.equal(caption12.role,'reference');assert.equal(caption12.target,10);assert.ok(Math.abs(caption12.pt-8*fit.scale)<.05);assert.equal(fit.typography.every(t=>t.minimum.status==='pass'),true);
});
test('CINE-005 candidateFit: media entries with subjectBounds report annotated:true and the subject fraction; without them annotated:false',async()=>{
 const p=await cineProject('en',home),product=p.plan.scenes.find(s=>s.id==='product'),crop=product.crops.find(c=>c.blockId==='prod-image');
 const check={height:810,components:[],overflow:[],clipIssues:[],contrastIssues:[],glyphs:[],text:[],fonts:[],images:[{blockId:'prod-image',box:{x:700,y:100,width:600,height:600},subjectBounds:subjectOf(product,'prod-image'),crop},{blockId:'other',box:{x:0,y:0,width:300,height:300}}]};
 const fit=candidateFit(check,{width:1440,height:1000});assert.equal(fit.ok,true);
 const [hero,other]=fit.features.media;assert.equal(hero.blockId,'prod-image');assert.equal(hero.annotated,true);assert.ok(Math.abs(hero.subjectFraction-hero.containerFraction*(.16/.48))<1e-9);
 assert.equal(other.annotated,false);assert.equal(other.note,'no subject annotation');assert.equal(other.subjectFraction,other.containerFraction);
});

// ---- Task 4: CINE-006 type roles, delivered sizes against the target, one border per citation run ----
import {TYPE_ROLES,themeTypeRoles,themePacks} from '../src/design/theme-registry.mjs';
import {sceneDirection} from '../src/design/art-direction.mjs';
import {PT_PER_PX,TARGETS} from '../src/targets/target-budget.mjs';
test('CINE-006 type roles: every pack declares six roles that deliver at least the 24/18/14/10 pt targets in PowerPoint except the recorded fresh-report body; themeTypeRoles throws for an unknown pack',()=>{
 assert.deepEqual(TYPE_ROLES,['title','lead','body','label','reference','numeric']);
 const target=TARGETS.presentation.typography.target,pt=px=>px*PT_PER_PX.pptx;
 for(const pack of themePacks()){
  const roles=themeTypeRoles(pack.id);assert.deepEqual(Object.keys(roles),TYPE_ROLES,pack.id);for(const k of TYPE_ROLES)assert.ok(Number.isInteger(roles[k])&&roles[k]>0,pack.id+' '+k);
  assert.ok(pt(roles.title)>=target.title-1e-9,pack.id+' title');assert.ok(pt(roles.label)>=target.label-1e-9,pack.id+' label');assert.ok(pt(roles.reference)>=target.reference-1e-9,pack.id+' reference');
  if(pack.id==='fresh-report')assert.ok(pt(roles.body)<target.body&&roles.body===25,'the atlas keeps its tight demi-bold body at 25 px (16.7 pt), a recorded theme decision');else assert.ok(pt(roles.body)>=target.body-1e-9,pack.id+' body');
  assert.ok(roles.lead>=roles.body&&roles.title>roles.lead&&roles.body>roles.label&&roles.label>roles.reference,pack.id+' hierarchy');
  assert.deepEqual(themeTypeRoles(pack.id),pack.typography.roles,'the pack declares its roles');
 }
 assert.throws(()=>themeTypeRoles('unknown'),{code:'THEME_VERSION'});
});
test('CINE-006 direction: a declared product page gets body 27 px and label/reference sizes; the same page without declared fields keeps 22 px; the dense overflow page keeps 22 px and is reported dense',async()=>{
 const p=await cineProject('en',home),legacy=await cineProject('en',home,{declared:[]}),at=(q,id)=>sceneDirection(q.document,q.plan,q.plan.scenes.findIndex(s=>s.id===id));
 const product=at(p,'product');assert.equal(product.declared,true);assert.equal(product.dense,false);assert.equal(product.body,27);assert.equal(product.lead,28);assert.equal(product.label,21);assert.equal(product.reference,15);assert.deepEqual(product.roles,themeTypeRoles('cream-collage'));
 const before=at(legacy,'product');assert.equal(before.declared,false);assert.equal(before.body,22);assert.equal(before.lead,24);assert.equal(before.label,21);assert.equal(before.reference,15);
 const overflow=at(p,'overflow');assert.equal(overflow.declared,true);assert.equal(overflow.dense,true);assert.equal(overflow.body,22);assert.equal(overflow.lead,24);
 // Every other declared corpus page is raised: body at or above the 18 pt target in PowerPoint; the dense set is the overflow page alone.
 const dense=p.plan.scenes.filter((s,i)=>sceneDirection(p.document,p.plan,i).dense).map(s=>s.id);assert.deepEqual(dense,['overflow']);
 for(const [i,s]of p.plan.scenes.entries()){const d=sceneDirection(p.document,p.plan,i);if(!d.dense)assert.ok(d.body*PT_PER_PX.pptx>=18-1e-9,s.id);}
 // The S8 themes keep their own body as the floor; the atlas is raised to its 25 px role.
 const q=structuredClone(p);for(const s of q.plan.scenes)s.theme='fresh-report';assert.equal(at(q,'product').body,25);
});
test('CINE-006 markup: a declared page carries --label-size and --reference-size; a legacy page carries neither; the stylesheet consumes both with the previous literal fallbacks and a citation run has one border',async()=>{
 const p=await cineProject('en',home),resources=await visualAssetResources(p,home),out=html(p,resources),section=id=>out.sceneMarkup[p.plan.scenes.findIndex(s=>s.id===id)].match(/<section [^>]*>/)[0];
 assert.ok(section('product').includes('--body-size:27px;--lead-size:28px;'));assert.ok(section('product').includes('--label-size:21px;--reference-size:15px'));
 assert.ok(section('overflow').includes('--body-size:22px;')&&section('overflow').includes('--label-size:21px'),'a dense declared page keeps its body size but still names the role sizes');
 const legacy=await cineProject('en',home,{declared:[]}),lo=html(legacy,await visualAssetResources(legacy,home));
 for(const m of lo.sceneMarkup){assert.ok(!m.includes('--label-size'));assert.ok(!m.includes('--reference-size'));assert.ok(m.includes('--body-size:22px;'));}
 for(const rule of ['.web-scene .citation{font:400 var(--reference-size,12px)/1.6 var(--body)','.web-scene .web-image figcaption{font:400 var(--reference-size,12px)/1.5 var(--body)','.web-scene .source-strip .citation{font:400 12px/1.3 var(--body)','.web-scene .reference-panel{font:400 12px/1.3 var(--body)','.web-scene .chart-rows{font-size:var(--label-size,15px)}','.web-scene .legend{font-size:var(--label-size,14px)}','.web-scene .regions>.region[data-component=citation]+.region[data-component=citation]{border-top:0;margin-top:0;padding-top:6px}'])assert.ok(artDirectionCSS.includes(rule),rule);
});

// ---- Task 5: CINE-006/007 player: grayscale hierarchy audit and per-region measurements; semantic-player.7 ----
import {runtime,PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {grayscaleScript} from '../src/render/web/contrast.mjs';
test('CINE-007 player: the runtime declares semantic-player.7, carries auditGrayscale, and check() reports per-region minTextPx, per-image boxes and the strip height (string checks on the embedded player)',()=>{
 assert.equal(PLAYER_VERSION,'semantic-player.9');assert.ok(runtime.includes("player:'semantic-player.9'"));
 assert.ok(grayscaleScript.startsWith('function auditGrayscale(scene)'));assert.ok(runtime.includes(grayscaleScript),'the grayscale audit is embedded');
 for(const field of ['regions:regionBoxes,','minTextPx:','maxTextPx:','images:imageBoxes,','strip,grayscale:auditGrayscale(scene)','grayscale:auditGrayscale(scene)','window.deckweftAuditScene=scene=>({contrastIssues:auditContrast(scene),clipIssues:[...auditClipping(scene),...auditComponentGeometry(scene)],glyphIssues:scanMissingGlyphs(scene),grayscale:auditGrayscale(scene)})'])assert.ok(runtime.includes(field),field);
 // The player stays one parseable script (it runs under a CSP hash; a syntax error would break every exported page).
 assert.doesNotThrow(()=>new Function(runtime));assert.doesNotThrow(()=>new Function(grayscaleScript));
 // The audit names its method honestly and never claims eye tracking.
 assert.match(grayscaleScript,/diagnostic/);assert.ok(!/eye[- ]tracking/i.test(grayscaleScript.replace(/not eye tracking/g,'')));
});

// ---- Task 6: CINE-007 soft features with documented definitions; the weakest page ----
import {SOFT_FEATURES,SOFT_WEIGHTS,softFeatures,softScore,weakestPage} from '../src/quality/render-checks.mjs';
import {createQualityReceipt} from '../src/quality/visual-review.mjs';
const playerCheck=()=>({sceneId:'s',height:810,regions:[{regionId:'r1',blockId:'title',box:{x:64,y:56,width:600,height:100},minTextPx:48,maxTextPx:64},{regionId:'r2',blockId:'para',box:{x:64,y:200,width:600,height:120},minTextPx:22,maxTextPx:22},{regionId:'r3',blockId:'img',box:{x:700,y:56,width:600,height:600},minTextPx:12,maxTextPx:12}],images:[{regionId:'r3',blockId:'img',box:{x:700,y:56,width:600,height:600}}],strip:{height:60,items:12},grayscale:{holds:true,primary:{regionId:'r3'},strongest:'r3'},components:[],overflow:[],clipIssues:[],contrastIssues:[],glyphs:[],text:[],fonts:[]});
test('CINE-007 soft features: from a synthetic player .7 check the seven features compute as defined (subject area, strip height over budget, grouping gap variance, alignment axes, competing accents, title-figure distance, entry clarity); an undeclared entry gives entryClarity null',()=>{
 assert.deepEqual(Object.keys(SOFT_FEATURES),['subjectArea','stripHeight','groupingGapVariance','alignmentAxes','competingAccents','titleFigureDistance','entryClarity']);
 for(const [k,d]of Object.entries(SOFT_FEATURES)){assert.ok(d.definition&&d.unit&&['higher','lower','none'].includes(d.better),k);assert.ok(d.exceptions,k+' names its exceptions');}
 assert.deepEqual(Object.keys(SOFT_WEIGHTS),Object.keys(SOFT_FEATURES));assert.ok(Math.abs(Object.values(SOFT_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-9,'weights sum to one');
 const f=softFeatures(playerCheck(),{pageWidth:1440,entry:'left',focalBlockId:'title',mediaBlockIds:['img'],subjects:[{blockId:'img',containerFraction:360000/(1440*810),subjectFraction:.1,annotated:true}]});
 assert.deepEqual(f.subjectArea,{value:.1,annotated:true,blockId:'img',containerFraction:360000/(1440*810)});
 assert.deepEqual(f.stripHeight,{value:12,height:60,budget:48,items:12});
 assert.deepEqual(f.groupingGapVariance,{value:484,gaps:[44,0]});
 assert.deepEqual(f.alignmentAxes,{value:2,axes:[64,704]},'edges rounded to 8 px');
 assert.deepEqual(f.competingAccents,{value:0,regionIds:[]});
 assert.deepEqual(f.titleFigureDistance,{value:0,titleRegionId:'r1',figureRegionId:'r3'});
 assert.deepEqual(f.entryClarity,{value:true,entry:'left',focalCenterX:364/1440});
 // A competing accent: a region whose smallest text is at least the focal region's largest; a centred entry on a left-placed focal block fails.
 const loud=playerCheck();loud.regions[1].minTextPx=72;loud.regions[1].maxTextPx=72;
 const g=softFeatures(loud,{pageWidth:1440,entry:'center',focalBlockId:'title',mediaBlockIds:[]});
 assert.deepEqual(g.competingAccents,{value:1,regionIds:['r2']});assert.deepEqual(g.entryClarity,{value:false,entry:'center',focalCenterX:364/1440});
 assert.equal(g.titleFigureDistance.value,0,'without declared media the first image is the figure');assert.equal(g.subjectArea.annotated,false);assert.ok(Math.abs(g.subjectArea.value-360000/(1440*810))<1e-9,'without a subject the container is the subject');
 assert.equal(softFeatures(playerCheck(),{pageWidth:1440,focalBlockId:'title'}).entryClarity,null);
 const noStrip=playerCheck();noStrip.strip=null;noStrip.images=[];assert.equal(softFeatures(noStrip,{pageWidth:1440,focalBlockId:'title'}).stripHeight,null);assert.equal(softFeatures(noStrip,{pageWidth:1440,focalBlockId:'title'}).titleFigureDistance,null);
 // Scores: in [0,1], higher is better; with the same subject the loud, mis-entered page scores lower than the quiet one.
 const h=softFeatures(loud,{pageWidth:1440,entry:'center',focalBlockId:'title',mediaBlockIds:['img'],subjects:[{blockId:'img',containerFraction:360000/(1440*810),subjectFraction:.1,annotated:true}]});
 assert.ok(softScore(f).score>softScore(h).score);assert.ok(Math.abs(softScore(h).score-(softScore(f).score-SOFT_WEIGHTS.competingAccents/3-SOFT_WEIGHTS.entryClarity))<1e-6,'one accent of three and a failed entry');assert.ok(softScore(f).score<=1&&softScore(g).score>=0);assert.deepEqual(Object.keys(softScore(f).penalties),Object.keys(SOFT_FEATURES));
});
test('CINE-007 weakest page: the page with the lowest score is named with its reasons; checkRender carries features and the receipt names the weakest page; a check without the player .7 fields yields no features and no error',async()=>{
 const quiet={sceneId:'quiet',features:softFeatures(playerCheck(),{pageWidth:1440,entry:'left',focalBlockId:'title',mediaBlockIds:['img']})};
 const loudCheck=playerCheck();for(const k of [1,2]){loudCheck.regions[k].minTextPx=72;loudCheck.regions[k].maxTextPx=72;}loudCheck.strip.height=120;
 const loud={sceneId:'loud',features:softFeatures(loudCheck,{pageWidth:1440,entry:'center',focalBlockId:'title',mediaBlockIds:['img']})};
 const w=weakestPage([quiet,loud]);assert.equal(w.sceneId,'loud');assert.ok(w.score<softScore(quiet.features).score);assert.ok(w.reasons.some(r=>/strip/i.test(r))&&w.reasons.some(r=>/accent/i.test(r)));
 assert.equal(weakestPage([]),null);
 // Through checkRender: the corpus product page with a player .7 fit check gets features; the legacy observation without them gets none.
 const p=await cineProject('en',home),resources=await visualAssetResources(p,home),out=html(p,resources),observation=observationOf(p,out);
 const i=p.plan.scenes.findIndex(s=>s.id==='product'),check={...playerCheck(),sceneId:'product',regions:[{regionId:'a',blockId:'prod-title',box:{x:64,y:56,width:500,height:120},minTextPx:60,maxTextPx:60},{regionId:'b',blockId:'prod-image',box:{x:640,y:56,width:700,height:540},minTextPx:15,maxTextPx:15},{regionId:'c',blockId:'prod-callout',box:{x:64,y:220,width:500,height:80},minTextPx:28,maxTextPx:28}],images:[{regionId:'b',blockId:'prod-image',box:{x:660,y:60,width:600,height:450}}]};
 observation.fit.checks=p.plan.scenes.map((s,k)=>k===i?check:{sceneId:s.id,height:810,components:[],overflow:[],clipIssues:[],contrastIssues:[],glyphs:[],text:[],fonts:[]});
 const r=checkRender(p,[observation]);assert.equal(r.ok,true);assert.equal(r.features.length,1);assert.equal(r.features[0].sceneId,'product');
 assert.equal(r.features[0].features.subjectArea.annotated,true,'the authored subject reaches the feature');assert.equal(r.features[0].features.entryClarity.entry,'left');assert.ok(r.features[0].score>0);
 assert.deepEqual(r.weakestPage.sceneId,'product');
 const receipt=createQualityReceipt(p,observation,r,[{file:'x.png',sha256:'0'}]);assert.equal(receipt.weakestPage.sceneId,'product');
 const legacy=checkRender(p,[observationOf(p,out)]);assert.deepEqual(legacy.features,[]);assert.equal(legacy.weakestPage,null);assert.equal(legacy.ok,true);
});
test('CINE-007 docs: docs/visual-acceptance/review.md defines every SOFT_FEATURES key (string check)',async()=>{
 const doc=await readFile(new URL('../docs/visual-acceptance/review.md',import.meta.url),'utf8');
 assert.ok(doc.includes('## Soft features (CINE-007)'));for(const k of Object.keys(SOFT_FEATURES))assert.ok(doc.includes('`'+k+'`'),k);assert.match(doc,/not eye tracking/);
});

// ---- Task 7: CINE-007 ranked candidates with stated differences; the release gate names the weakest page ----
import {candidateProjects,chooseRhythm,rankCandidates} from '../src/design/rhythm.mjs';
test('CINE-007 ranking: on the product page three measured candidates rank hard gates first (the over-budget image-strip last), then by weighted soft features, and each loser states what differs from the winner; chooseRhythm carries the ranking',async()=>{
 const p=await cineProject('en',home),candidates=candidateProjects(p),i=p.plan.scenes.findIndex(s=>s.id==='product');
 assert.deepEqual(candidates.map(c=>c.plan.scenes[i].composition),['image-left','image-strip','image-right']);
 const soft=(subject,extra={})=>softFeatures({...playerCheck(),...extra},{pageWidth:1440,entry:'left',focalBlockId:'title',mediaBlockIds:['img'],subjects:[{blockId:'img',containerFraction:.3,subjectFraction:subject,annotated:true}]});
 const fits=candidates.map((c,k)=>c.plan.scenes.map((s,j)=>{if(j!==i)return {ok:true,reasons:[],height:810,viewport:{width:1440,height:1000}};
  return k===1?{ok:false,reasons:['Scene exceeds 900px presentation budget (1059px)'],height:1059,viewport:{width:1440,height:1000},soft:soft(.12)}:{ok:true,reasons:[],height:810,viewport:{width:1440,height:1000},soft:soft(k===2?.11:.08)};}));
 const ranking=rankCandidates(p,candidates,fits),page=ranking[i];
 assert.equal(ranking.length,p.plan.scenes.length);assert.equal(page.sceneId,'product');
 assert.deepEqual(page.ranked.map(r=>[r.composition,r.ok]),[['image-right',true],['image-left',true],['image-strip',false]]);
 assert.equal(page.ranked[0].candidate,2);assert.ok(page.ranked[0].score>page.ranked[1].score);assert.deepEqual(page.ranked[0].differences,[]);
 const left=page.ranked[1];assert.ok(left.differences.some(d=>d.feature==='composition'&&d.winner==='image-right'&&d.this==='image-left'));assert.ok(left.differences.some(d=>d.feature==='subjectArea'&&Math.abs(d.winner-.11)<1e-9&&Math.abs(d.this-.08)<1e-9));
 const strip=page.ranked[2];assert.ok(strip.differences.some(d=>d.feature==='hardGate'&&/900px/.test(d.this)));assert.ok(strip.differences.some(d=>d.feature==='height'&&d.this===1059));
 // Ties keep the earlier candidate; a page with no soft features ranks by hard gates alone and says so.
 const flat=fits.map(f=>f.map(x=>({ok:x.ok,reasons:x.reasons,height:x.height,viewport:x.viewport})));const plain=rankCandidates(p,candidates,flat)[i];
 assert.deepEqual(plain.ranked.map(r=>r.composition),['image-left','image-right','image-strip']);assert.equal(plain.ranked[0].soft,null);
 const chosen=chooseRhythm(p,candidates,fits);assert.equal(chosen.report.ranking.length,p.plan.scenes.length);assert.deepEqual(chosen.report.ranking[i].ranked.map(r=>r.composition),['image-right','image-left','image-strip']);
 assert.equal(chosen.project.plan.scenes[i].composition,'image-right');assert.match(chosen.report.method,/hard gates first/);
});
test('CINE-007 A/B rule: rankCandidates refuses candidates whose document, assets or viewport differ (CANDIDATE_CONTENT)',async()=>{
 const p=await cineProject('en',home),candidates=candidateProjects(p),fits=candidates.map(c=>c.plan.scenes.map(()=>({ok:true,reasons:[],viewport:{width:1440,height:1000}})));
 assert.doesNotThrow(()=>rankCandidates(p,candidates,fits));
 const other=structuredClone(fits);other[1][0].viewport={width:1024,height:1000};assert.throws(()=>rankCandidates(p,candidates,other),{code:'CANDIDATE_CONTENT'});
 const edited=structuredClone(candidates);edited[0].document.blocks.find(b=>b.id==='prod-callout').text='changed';assert.throws(()=>rankCandidates(p,edited,fits),{code:'CANDIDATE_CONTENT'});
 assert.throws(()=>rankCandidates(p,candidates.slice(0,2),fits.slice(0,2)),{code:'CANDIDATE_MEASUREMENT'});
 const source=await readFile(new URL('../scripts/release-gate.mjs',import.meta.url),'utf8');assert.match(source,/weakestPage/);assert.match(source,/weakest:/);
});

// ---- Task 8: docs ----
test('CINE batch 2 docs: migration, verification and visual-studio pages mention subjectBounds, the type roles and the soft features in English and Chinese',async()=>{
 const read=f=>readFile(new URL('../docs/'+f,import.meta.url),'utf8');
 for(const locale of ['en','zh-CN']){
  const migration=await read(locale+'/migration.md'),verification=await read(locale+'/verification.md'),studio=await read(locale+'/visual-studio.md'),handoff=await read(locale+'/handoff.md');
  for(const term of ['subjectBounds','protectedRegions','contextRegion','visibleCaption','detailLocator','PROTECTED_REGION','typography.roles','--label-size','semantic-player.7','visual-art-direction.14'])assert.ok(migration.includes(term),locale+' migration '+term);
  for(const term of ['cine-p1','subjectBounds','semantic-player.7','visual-art-direction.14'])assert.ok(verification.includes(term),locale+' verification '+term);
  for(const term of ['subjectBounds','visibleCaption','detailLocator','PROTECTED_REGION'])assert.ok(studio.includes(term),locale+' visual-studio '+term);
  for(const term of ['CINE-005','CINE-006','CINE-007','cine-p1'])assert.ok(handoff.includes(term),locale+' handoff '+term);
 }
 const roadmap=JSON.parse(await readFile(new URL('../roadmap.json',import.meta.url),'utf8')),tasks=Array.isArray(roadmap)?roadmap:roadmap.tasks;
 for(const id of ['VIS-006','VIS-007','VIS-010','VIS-014','VIS-016'])assert.ok(tasks.find(t=>t.id===id).notes.some(n=>n.includes('CINE batch 2')),id);
});
