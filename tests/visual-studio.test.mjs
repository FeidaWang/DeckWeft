import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { temp } from './helpers.mjs';
import { createVisualDemo } from '../src/core/visual-demo.mjs';
import { assertVisualProject,assertVisualLocks } from '../src/core/visual-project.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { applySceneTheme } from '../src/design/profile.mjs';
import { resolveScopedRules } from '../src/design/rules.mjs';
import { themePacks,resolveTheme } from '../src/design/theme-registry.mjs';
import { compileWebScenes } from '../src/scene/web/compile.mjs';
import { visualAssetResources } from '../src/assets/visual.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { startStudio } from '../src/services/server.mjs';
import { createProject } from '../src/core/model.mjs';
const demo=async t=>{const home=await temp(t),store=await new VisualProjectStore(home).init(),p=await createVisualDemo('en',store.home);return {home,store,p};};
test('VIS-002: visual library preserves revisions, immutable snapshots and idempotent restore-as-copy',async t=>{
 const {store,p}=await demo(t),first=await store.save(p,{create:true}),next=structuredClone(first);next.document.title='Changed title';const saved=await store.save(next,{expectedRevision:1});
 await assert.rejects(store.save(first,{expectedRevision:1}),{code:'REVISION_CONFLICT'});assert.equal((await store.historyPage(p.id)).snapshots[0].title,p.document.title);
 const snapshot=await store.snapshot(p.id,1),opts={snapshotHash:snapshot.sha256,requestId:'visual-restore-test-00001'},copy=await store.restoreAsCopy(p.id,1,opts),again=await store.restoreAsCopy(p.id,1,opts);
 assert.notEqual(copy.project.id,p.id);assert.equal(copy.project.document.id,copy.project.plan.documentId);assert.equal(copy.project.document.title,p.document.title+' (restored r1)');assert.ok(again.replayed);assert.equal(again.project.id,copy.project.id);assert.equal((await store.get(p.id)).document.title,saved.document.title);
});
test('VIS-002: locks protect chart data, semantic blocks and scoped scene decisions',async t=>{
 const {store,p}=await demo(t);p.document.authorOverrides.lockedBlockIds=['data-chart'];p.document.authorOverrides.sceneLocks=[{sceneId:'violet',fields:['theme','composition','crops']}];const saved=await store.save(p,{create:true});
 for(const change of [p=>p.document.datasets[0].series[0].values[0]++,p=>p.document.sources[0].url='https://example.org/changed',p=>p.plan.scenes[2].crops[0].x=.2]){const next=structuredClone(saved);change(next);assert.throws(()=>assertVisualLocks(saved,next),{code:'AUTHOR_LOCK'});await assert.rejects(store.save(next,{expectedRevision:1}),{code:'AUTHOR_LOCK'});}
 assert.throws(()=>applySceneTheme(saved,'violet','cream-collage'),{code:'AUTHOR_LOCK'});
 const unlocked=structuredClone(saved);unlocked.document.authorOverrides.lockedBlockIds=[];unlocked.document.datasets[0].series[0].values[0]++;assert.equal((await store.save(unlocked,{expectedRevision:1})).revision.number,2);
});
test('VIS-002/003: source anchors, image crop bounds and region IDs are strictly validated',async t=>{
 const {p}=await demo(t);const scenes=compileWebScenes(p.document,p.plan),before=scenes[2].regions.find(r=>r.blockId==='violet-image').id;
 const copy=structuredClone(p);copy.plan.scenes[2].blockIds.reverse();assert.equal(compileWebScenes(copy.document,copy.plan)[2].regions.find(r=>r.blockId==='violet-image').id,before);
 for(const change of [p=>p.document.sourceSnapshots[0].anchors[0].blockId='absent',p=>p.plan.scenes[2].crops[0].width=2,p=>p.document.visualBrief.outputLanguage='zh-CN',p=>p.document.blocks.find(b=>b.type==='image').assetId='absent',p=>p.assets[0].path='../../secret.png']){const copy=structuredClone(p);change(copy);assert.throws(()=>assertVisualProject(copy));}
});
test('VIS-004: local images are embedded with a normalized crop and hashes bind actual bytes',async t=>{
 const {p,store}=await demo(t),resources=await visualAssetResources(p,store.home),out=exportDeck(p.document,'html',{plan:p.plan,assetResources:resources,experimentalWeb:true});
 assert.ok(out.body.includes('data:image/png;base64,'));assert.ok(out.body.includes('image-crop'));assert.ok(out.body.includes('Generated decorative workbench'));assert.equal(out.scenes[2].regions.find(r=>r.blockId==='violet-image').crop.width,.53);
 const file=path.join(store.home,p.assets[0].path),bytes=await readFile(file);bytes[bytes.length-1]^=1;await writeFile(file,bytes);await assert.rejects(visualAssetResources(p,store.home),{code:'ASSET_TYPE'});
});
test('VIS-005: all three executable packs carry grammar, scoped rules and validated system font fallbacks',async t=>{
 const {p}=await demo(t);assert.deepEqual(themePacks().slice(0,3).map(v=>v.id),['cream-collage','dark-data','electric-violet']);assert.equal(themePacks().length,6);for(const pack of themePacks()){assert.ok(pack.typography.displayZh);assert.ok(pack.imageGrammar);assert.ok(pack.motion);assert.ok(pack.rules.every(r=>r.sceneRole&&r.severity&&r.rationale));}
 const violet=applySceneTheme(p,'collage','electric-violet');assert.equal(violet.plan.scenes[0].composition,'violet-chapter');assert.deepEqual(violet.document,p.document);assert.deepEqual(violet.plan.scenes[1],p.plan.scenes[1]);
 const a=resolveTheme('electric-violet','1.0.0','en',{colorMode:'chapter'}),b=resolveTheme('electric-violet','1.0.0','zh-CN',{profile:{...p.document.visualBrief.profile,colorIntensity:'restrained'},colorMode:'chapter'});assert.notEqual(a.paper,b.paper);assert.notEqual(a.display,b.display);
});
test('VIS Studio API: token/origin boundaries, explicit migration, native refusal and stale export gate',async t=>{
 const home=await temp(t),app=await startStudio({home,port:0,seed:false});t.after(()=>app.close());const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},call=(path,data,method=data?'POST':'GET')=>fetch(app.url+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})});
 assert.equal((await fetch(app.url+'/api/visual/projects')).status,401);assert.equal((await fetch(app.url+'/api/visual/projects',{headers:{...headers,Origin:'https://external.example'}})).status,403);assert.equal((await fetch(app.url+'/')).status,200);
 const original=await app.store.save(createProject({title:'Legacy original'}),{create:true}),migrated=await(await call('/api/visual/migrate',{projectId:original.id})).json();assert.deepEqual(migrated.project.document.migration.original,original);assert.deepEqual(await app.store.get(original.id),original);
 const response=await call('/api/visual/demo',{locale:'en'});assert.equal(response.status,201);const {project}=await response.json(),preview=await(await call('/api/visual/preview',{project})).json();assert.ok(preview.ticket);const artifact=await fetch(app.url+preview.artifactUrl);assert.equal(artifact.status,200);assert.ok(artifact.headers.get('content-security-policy').includes("script-src 'sha256-"));assert.ok(artifact.headers.get('content-security-policy').includes("frame-ancestors 'self'"));
 const thumbnail=await fetch(app.url+preview.artifactUrl+'?thumbnail='+project.plan.scenes[2].id),thumbnailHTML=await thumbnail.text();assert.equal(thumbnail.status,200);assert.equal((thumbnailHTML.match(/class="web-scene /g)||[]).length,1);assert.ok(thumbnailHTML.includes('data:image/png;base64,'));assert.ok(!/<script\b/i.test(thumbnailHTML));assert.equal((await fetch(app.url+preview.artifactUrl+'?thumbnail=unknown')).status,404);
 assert.equal((await call('/api/visual/export',{project,format:'html',ticket:preview.ticket})).status,409);assert.equal((await call('/api/visual/export',{project,format:'pptx'})).status,422);
 const invalid=structuredClone(project);invalid.id='../../unsafe';assert.equal((await call('/api/visual/import',{project:invalid})).status,422);const imported=await(await call('/api/visual/import',{project})).json();assert.notEqual(imported.project.id,project.id);assert.equal(imported.project.document.id,imported.project.id);assert.ok(imported.project.extensions.deckweftImport.sourceHash);
 assert.equal((await call('/api/visual/measure',{ticket:preview.ticket,fit:{ok:true,renderHash:preview.renderHash,checks:[]}})).status,422);
 const next=structuredClone(project);next.document.title='Updated';assert.equal((await call('/api/visual/projects/'+project.id,{project:next,expectedRevision:1},'PUT')).status,200);assert.equal((await call('/api/visual/projects/'+project.id,{project:next,expectedRevision:1},'PUT')).status,409);
});

test('VIS-005: scoped rule conflicts resolve by role/mode without leaking between packs',()=>{
 const pack=themePacks()[0];pack.rules.push({sceneRole:'evidence',mode:'default',property:'composition',value:'reading-flow',severity:'prefer',rationale:'Evidence reading takes priority.'});
 assert.equal(resolveScopedRules(pack,{role:'evidence'}).composition.value,'reading-flow');assert.equal(resolveScopedRules(pack,{role:'opening'}).composition.value,'diagonal-cover');assert.equal(resolveScopedRules(themePacks()[2],{role:'opening'}).composition.value,'photo-split');assert.equal(resolveScopedRules(pack).contrast.severity,'require');
});

test('VIS-003: local gradients, clipping, transforms, groups and breakpoint bindings render without executable source',async t=>{
 const {p,store}=await demo(t),s=p.plan.scenes[3];s.gradients=[{id:'wash',type:'linear',from:'paper',to:'secondary',x1:0,y1:0,x2:1,y2:1}];s.graphics=[{id:'wash-plane',path:'M1200 0H1440V810H1200Z',fill:'gradient',gradientId:'wash',rotation:0,transform:{translateX:0,translateY:0,scaleX:1,scaleY:1,rotate:0},clip:{x:1200,y:0,width:240,height:810}}];
 const scenes=compileWebScenes(p.document,p.plan);assert.equal(scenes[3].variants.length,2);assert.ok(scenes[3].groups[0].regionIds.length);const out=exportDeck(p.document,'html',{plan:p.plan,assetResources:await visualAssetResources(p,store.home),experimentalWeb:true});assert.ok(out.body.includes('<linearGradient'));assert.ok(out.body.includes('<clipPath'));assert.ok(out.body.includes('data-text-role="display"'));const malformed=structuredClone(p);malformed.plan.scenes[3].graphics[0].path='M0 0 L';assert.throws(()=>compileWebScenes(malformed.document,malformed.plan),{code:'INVALID_WEB_SCENE'});s.graphics[0].gradientId='missing';assert.throws(()=>compileWebScenes(p.document,p.plan),{code:'INVALID_WEB_SCENE'});
});

test('VIS-004: repeated image bindings are included in the local output resource budget',async t=>{
 const {p,store}=await demo(t),image=p.document.blocks.find(b=>b.type==='image');
 for(let i=0;i<12;i++){const copy={...image,id:'repeat-'+i};p.document.blocks.push(copy);p.plan.scenes[2].blockIds.push(copy.id);}
 assertVisualProject(p);await assert.rejects(visualAssetResources(p,store.home),{code:'ASSET_BUDGET'});
});
