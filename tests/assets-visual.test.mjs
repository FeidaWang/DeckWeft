import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {assertWebScene} from '../src/scene/web/validate.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,realpath,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {safeCrop,contains,cropVariants} from '../src/assets/crop.mjs';
import {defaultBrief} from '../src/assets/brief.mjs';
import {inspectImage} from '../src/assets/formats.mjs';
import {uploadImageBlob,registerVisualImport,readImageBlob} from '../src/assets/import.mjs';
import {registerAsset,assetHash} from '../src/assets/registry.mjs';
import {configureSlot,slotFor,applySlotCrop,attachSlotAsset,addSlotAsset} from '../src/assets/slots.mjs';
import {copySourceAsset} from '../src/assets/selection.mjs';
import {imageCapabilities} from '../src/assets/generation.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {assertVisualProject,assertVisualLocks} from '../src/core/visual-project.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
const metadata={provenance:'Original authored synthetic local QA fixture. Not a historical screenshot.',license:'MIT; original repository fixture',allowedUse:'Local tests and examples',alt:'A centered orange subject on a navy panel',fallback:'A protected rectangular subject'};
const fixture=async fn=>{const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-asset-')));try{await fn(home);}finally{await rm(home,{recursive:true,force:true});}};
const load=ext=>readFile(new URL('./fixtures/visual/assets/subject.'+ext,import.meta.url));
async function imported(home,{origin='original',web=true}={}){const png=await load('png'),original=await uploadImageBlob(home,png,'image/png'),derivative=web?await uploadImageBlob(home,await load('webp'),'image/webp'):undefined;return registerVisualImport(home,{original,native:original,web:derivative,metadata,origin});}
async function bound(home){let p=await createCompositionDemo('en',home),asset=await imported(home);p=attachSlotAsset(p,'violet','violet-image',asset);return {p,asset};}
test('VIS-007: portrait and wide crops preserve the protected subject and satisfy focal/ratio geometry',()=>{
 const asset={width:1200,height:800},brief={...defaultBrief(),safeRegion:{x:.4,y:.25,width:.2,height:.35},focalPoint:{x:.95,y:.9}},variants=cropVariants(asset,brief);assert.equal(variants.length,3);
 for(const v of variants){assert.equal(v.ok,true);assert.ok(contains(v.crop,brief.safeRegion));assert.ok(Math.abs(asset.width*v.crop.width/(asset.height*v.crop.height)-v.aspect)<1e-6);}
 assert.equal(safeCrop(asset,{...brief,aspect:16/9,safeRegion:{x:0,y:0,width:1,height:1}}).ok,false);assert.throws(()=>safeCrop(asset,{...brief,aspect:NaN}),/aspect/);assert.throws(()=>safeCrop(asset,{...brief,safeRegion:{x:.9,y:0,width:.2,height:1},aspect:1}),/normalized/);
});
test('VIS-007: real PNG/JPEG/WebP containers, EXIF orientation, truncation and animated WebP rejection',async()=>{
 for(const [ext,mime]of [['png','image/png'],['jpg','image/jpeg'],['webp','image/webp']]){const bytes=await load(ext);assert.deepEqual(inspectImage(bytes,mime),{width:1200,height:800,orientation:1});assert.throws(()=>inspectImage(bytes.subarray(0,30),mime));}
 const jpg=await load('jpg'),exif=Buffer.from('45786966000049492a0008000000010012010300010000000600000000000000','hex'),length=Buffer.alloc(2);length.writeUInt16BE(exif.length+2);const oriented=Buffer.concat([jpg.subarray(0,2),Buffer.from([255,225]),length,exif,jpg.subarray(2)]);assert.equal(inspectImage(oriented,'image/jpeg').orientation,6);
 const web=await load('webp'),bad=Buffer.from(web);bad.write('ANIM',12,'ascii');assert.throws(()=>inspectImage(bad,'image/webp'),/static WebP/);assert.throws(()=>inspectImage(web,'image/png'));assert.throws(()=>inspectImage(web,'constructor'),{code:'ASSET_FORMAT'});
});
test('VIS-007: original/native/derivative hashes bind immutable bytes, and duplicates reuse rather than overwrite',()=>fixture(async home=>{
 const asset=await imported(home),again=await imported(home);assert.deepEqual(again,asset);assert.equal(asset.original.hash,asset.hash);assert.equal(asset.derivatives[0].sourceHash,asset.original.hash);assert.deepEqual(await readImageBlob(home,asset.original),await load('png'));
 await writeFile(path.join(home,asset.original.path),'changed');await assert.rejects(()=>readImageBlob(home,asset.original),{code:'ASSET_TYPE'});const original=await load('png');await assert.rejects(()=>uploadImageBlob(home,original,'image/png'),{code:'ASSET_COLLISION'});
}));
test('VIS-007: source extraction preserves source files and all attribution; changed bytes and symlinks stop extraction',()=>fixture(async home=>{
 const from=path.join(home,'source'),to=path.join(home,'target'),asset=await imported(from),before=await readFile(path.join(from,asset.path));const copy=await copySourceAsset(asset,from,to);assert.deepEqual(copy,asset);assert.deepEqual(await readFile(path.join(from,asset.path)),before);assert.deepEqual(await readImageBlob(to,copy.original),await load('png'));
 await writeFile(path.join(from,asset.path),'broken');await assert.rejects(()=>copySourceAsset(asset,from,to));const linked=path.join(home,'linked');await symlink(to,linked);await assert.rejects(()=>copySourceAsset(copy,linked,path.join(home,'other')),{code:'SYMLINK_PATH'});
}));
test('VIS-007: replacing a named slot preserves family, theme, other content and shared-image bindings',()=>fixture(async home=>{
 const {p,asset}=await bound(home),other=p.plan.scenes.find(s=>s.id==='chapter');other.blockIds.push('violet-image');const before=structuredClone(p),newAsset=await registerAsset(home,await readFile(new URL('../public/assets/devday/mesh/dot-blue.png',import.meta.url)),metadata),next=attachSlotAsset(p,'violet','violet-image',newAsset);assert.equal(next.plan.scenes.find(s=>s.id==='violet').composition,before.plan.scenes.find(s=>s.id==='violet').composition);assert.deepEqual(next.plan.scenes.find(s=>s.id==='chapter'),other);assert.equal(next.document.blocks.find(b=>b.id==='violet-image').assetId,asset.id);assert.ok(next.document.blocks.some(b=>b.type==='image'&&b.id!=='violet-image'&&b.assetId===newAsset.id));assert.deepEqual(next.document.datasets,p.document.datasets);assert.deepEqual(next.document.sources,p.document.sources);assert.deepEqual(next.document.sourceSnapshots,p.document.sourceSnapshots);
 const conflict={...asset,license:'Different rights'};assert.throws(()=>attachSlotAsset(p,'violet','violet-image',conflict),{code:'ASSET_METADATA_CONFLICT'});
}));
test('VIS-007: unsafe crop, insufficient pixels, generated evidence and author locks fail without repairing the project',()=>fixture(async home=>{
 const {p}=await bound(home),slot=slotFor(p,'violet','violet-image');slot.brief.safeRegion={x:0,y:0,width:1,height:1};slot.display='contain';const configured=configureSlot(p,'violet','violet-image',slot),before=structuredClone(configured);assert.throws(()=>applySlotCrop(configured,'violet','violet-image',{mode:'crop',aspect:16/9}),{code:'UNSAFE_CROP'});assert.deepEqual(configured,before);
 const contained=applySlotCrop(configured,'violet','violet-image',{mode:'contain',aspect:16/9});assert.equal(contained.plan.scenes.find(s=>s.id==='violet').imageSlots[0].display,'contain');
 const poor=structuredClone(slot);poor.brief.requiredWidth=8192;assert.throws(()=>configureSlot(p,'violet','violet-image',poor),{code:'ASSET_QUALITY'});
 const generated=await imported(home,{origin:'generated'}),g=structuredClone(p);g.assets[g.assets.findIndex(a=>a.id===generated.id)]=generated;const factual=slotFor(g,'violet','violet-image');factual.brief={...factual.brief,role:'product-screenshot',factual:true,sourceId:g.document.sources[0].id};assert.throws(()=>configureSlot(g,'violet','violet-image',factual),{code:'FACTUAL_ASSET'});
 for(const fields of [null,['crops'],['imageSlots']]){const locked=structuredClone(p);if(fields)locked.document.authorOverrides.sceneLocks=[{sceneId:'violet',fields}];else locked.document.authorOverrides.lockedBlockIds=['violet-image'];assert.throws(()=>configureSlot(locked,'violet','violet-image',slot),{code:'AUTHOR_LOCK'});const forged=structuredClone(locked);forged.plan.scenes.find(s=>s.id==='violet').crops[0].x=.35;assert.throws(()=>assertVisualLocks(locked,forged),{code:'AUTHOR_LOCK'});}
}));
test('VIS-007: web derivatives are opt-in by slot; product screenshots/factual evidence retain native PNG',()=>fixture(async home=>{
 const {p,asset}=await bound(home),resources=await visualAssetResources(p,home);assert.equal(resources[asset.id].mime,'image/webp');const out=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:resources});assert.ok(out.body.includes('data:image/webp;base64,'));const scene=compileWebScenes(p.document,p.plan).find(s=>s.id==='violet'),derived=structuredClone(scene);derived.regions.find(r=>r.component==='image').imageSlot.blockId='violet-title';assert.throws(()=>assertWebScene(derived,p.document),{code:'INVALID_WEB_SCENE'});
 const slot=slotFor(p,'violet','violet-image');slot.brief.role='product-screenshot';slot.brief.factual=true;slot.brief.sourceId=p.document.sources[0].id;const factual=configureSlot(p,'violet','violet-image',slot),png=await visualAssetResources(factual,home);assert.equal(png[asset.id].mime,'image/png');
 const tampered=structuredClone(p);tampered.assets.find(a=>a.id===asset.id).derivatives[0].sourceHash='0'.repeat(64);assert.throws(()=>assertVisualProject(tampered));
}));
test('VIS-007: slot directions/originals survive stale-save refusal and history restore; missing generation is honest',()=>fixture(async home=>{
 const store=await new VisualProjectStore(home).init(),p=await store.save(await createCompositionDemo('en',store.home),{create:true}),asset=await imported(store.home);const selected=attachSlotAsset(p,'violet','violet-image',asset);const r2=await store.save(selected,{expectedRevision:p.revision.number});const later=structuredClone(r2);later.document.title='Later draft';await store.save(later,{expectedRevision:r2.revision.number});await assert.rejects(()=>store.save(p,{expectedRevision:p.revision.number}),{code:'REVISION_CONFLICT'});
 const history=await store.historyPage(p.id),snapshot=await store.snapshot(p.id,1),restored=await store.restoreAsCopy(p.id,snapshot.project.revision.number,{snapshotHash:snapshot.sha256,requestId:'asset-restore-request-0001'});assert.notEqual(restored.project.id,p.id);assert.deepEqual(restored.project.assets,p.assets);const mediaSnapshot=await store.snapshot(p.id,r2.revision.number),mediaCopy=await store.restoreAsCopy(p.id,r2.revision.number,{snapshotHash:mediaSnapshot.sha256,requestId:'asset-media-restore-request-0001'});assert.deepEqual(mediaCopy.project.assets,selected.assets);assert.deepEqual(mediaCopy.project.plan.scenes,selected.plan.scenes);assert.ok((await readFile(path.join(store.home,asset.original.path))).equals(await load('png')));
 const capability=imageCapabilities();assert.equal(capability.automaticRequests,false);assert.equal(capability.providers.find(p=>p.id==='host-image-tool').available,false);assert.ok(capability.alternatives.includes('statement-banner'));
}));
