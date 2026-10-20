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
 assert.equal(WEB_RENDERER_VERSION,'visual-art-direction.14');assert.equal(current.renderer,'visual-art-direction.14');
 assert.deepEqual(current.content,baseline.content);
 // The content view strips the stylesheet and the hashes that carry the renderer version; the reader-visible markup is unchanged.
 assert.deepEqual(Object.fromEntries(Object.entries(current.parts).map(([k,v])=>[k,v.data])),Object.fromEntries(Object.entries(baseline.parts).map(([k,v])=>[k,v.data])));
});
