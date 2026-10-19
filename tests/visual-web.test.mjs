import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { assertPresentation } from '../src/core/blocks.mjs';
import { assertProject } from '../src/core/validate.mjs';
import { migrateToPresentation } from '../src/core/adapters/legacy-project.mjs';
import { assertDesignPlan } from '../src/design/plan.mjs';
import { compileWebScenes } from '../src/scene/web/compile.mjs';
import { assertWebScene } from '../src/scene/web/validate.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { presentationCapabilities } from '../src/targets/capabilities.mjs';
import { migrateToPlanning } from '../src/planning/storyboard.mjs';
import { ProjectStore } from '../src/services/store.mjs';
const read = name=>readFile(new URL(`fixtures/visual/${name}`,import.meta.url),'utf8').then(JSON.parse);
const fixture=()=>read('wave-a.en.json');
test('v3 numeric charts, CJK headings, code and citations survive JSON round trip',async()=>{
 const {document:d,plan:p}=await read('wave-a.zh-CN.json');
 const code={id:'example-code',type:'code',language:'js',text:'const x = "<script>";\nawait client.save({expectedRevision: 3});',sourceIds:[]};
 d.blocks.push(code);p.scenes[1].blockIds.push(code.id);d.datasets[0].series[0].values[0]=18.125;
 const out=exportDeck(d,'json',{experimentalWeb:true});assert.deepEqual(assertPresentation(JSON.parse(out.body)),d);
 const html=exportDeck(d,'html',{experimentalWeb:true,plan:p}).body;assert.ok(html.includes('18.125'));assert.ok(html.includes('const x = &quot;&lt;script&gt;&quot;'));assert.ok(html.includes('让大胆的想法'));assert.ok(html.includes('https://example.org/deckweft/synthetic'));
});
test('v3 rejects coercion, nonfinite numbers, broken references and unknown executable fields',async()=>{
 const {document:d}=await fixture();
 for(const change of [d=>d.datasets[0].series[0].values[0]='18',d=>d.datasets[0].series[0].values[0]=Infinity,d=>d.datasets[0].series[0].values.pop(),d=>d.blocks[6].datasetId='absent',d=>d.blocks[0].html='<script>',d=>d.blocks[0].sourceIds=['absent'],d=>d.sources[0].url='javascript:alert(1)',d=>d.authorOverrides.lockedBlockIds=['missing'],d=>d.blocks.push(d.blocks[0])]) {const copy=structuredClone(d);change(copy);assert.throws(()=>assertPresentation(copy),{code:'INVALID_PRESENTATION'});}
});
test('closed contracts cover all initial semantic block types',async()=>{
 const {document:d,plan:p}=await fixture();
 const extras=[['list',{items:['A','B']}],['quote',{text:'A quoted statement'}],['table',{columns:['API','Result'],rows:[['GET','200']]}],['diagram',{nodes:[{id:'a',label:'Start'},{id:'b',label:'Done'}],edges:[{from:'a',to:'b'}]}],['code',{language:'js',text:'await save();'}],['image',{assetId:'original-image',alt:'Original source image'}]];
 for(const [type,fields] of extras){const id='extra-'+type;d.blocks.push({id,type,sourceIds:[],...fields});p.scenes[1].blockIds.push(id);}
 assertPresentation(d);assertDesignPlan(d,p);
 assert.equal(presentationCapabilities('html',d).ok,false);assert.equal(presentationCapabilities('json',d).ok,true);
 d.blocks.pop();p.scenes[1].blockIds.pop();const out=exportDeck(d,'html',{plan:p,experimentalWeb:true});assert.ok(out.body.includes('<code'));assert.ok(out.body.includes('<table'));assert.ok(out.body.includes('Start → Done'));
});
test('legacy adaptation is an explicit nonmutating copy and never guesses numbers',async()=>{
 for(const name of ['product-en.baseline.json','strategy-zh-CN.baseline.json','technical-en.baseline.json']){
  const old=await read(name);old.extensions.custom={preserved:true};old.slides[0].notes='PRIVATE_SENTINEL';old.slides[0].content.metrics=[{label:'Rate',value:'12.4%'}];const before=JSON.stringify(old);
  const {document,plan}=migrateToPresentation(old);assert.equal(JSON.stringify(old),before);assert.deepEqual(document.migration.original,old);assert.equal(document.datasets.length,0);assert.ok(document.blocks.some(b=>b.text==='12.4% — Rate'));assert.equal(document.migration.sourceHash.length,64);
  const html=exportDeck(document,'html',{plan,experimentalWeb:true}).body;assert.equal(html.includes('PRIVATE_SENTINEL'),false);assert.ok(exportDeck(assertProject(old),'html').body.includes('<svg'));
 }
 const broken=await read('product-en.baseline.json');broken.slides[0].content.title=42;assert.throws(()=>migrateToPresentation(broken),{code:'INVALID_PROJECT'});
 const source=await read('strategy-zh-CN.baseline.json');const planning=migrateToPlanning(source).project;const adapted=migrateToPresentation(planning);assert.deepEqual(adapted.document.migration.original,planning);assert.ok(exportDeck(planning,'html').body.includes('<svg'));
 const v2=JSON.parse(await readFile(new URL('../examples/welcome.deck.json',import.meta.url),'utf8'));v2.schemaVersion=99;assert.throws(()=>migrateToPresentation(v2));
});
test('legacy revision conflicts and read-only source preservation remain enforced',async()=>{
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-wave-a-')));
 try{const store=await new ProjectStore(home).init(),project=await read('product-en.baseline.json');const saved=await store.save(project,{create:true});migrateToPresentation(saved);assert.deepEqual(await store.get(saved.id),saved);await store.save(saved,{expectedRevision:1});await assert.rejects(store.save(saved,{expectedRevision:1}),{code:'REVISION_CONFLICT'});assert.equal((await store.snapshot(saved.id,1)).project.revision.number,1);}
 finally{await rm(home,{recursive:true,force:true});}
});
test('paged and unsupported native exports do not block valid web output',async()=>{
 const {document,plan}=await fixture();assert.throws(()=>exportDeck(document,'html',{plan}),{code:'EXPERIMENTAL_WEB_REQUIRED'});
 // S7: PowerPoint and PDF compile from a browser-measured static scene; without that measurement they refuse with a named code.
 for(const target of ['pptx','pdf'])assert.throws(()=>exportDeck(document,target,{plan,experimentalWeb:true}),{code:'EXPORT_LAYOUT_REQUIRED'});
 assert.throws(()=>exportDeck(document,'figma',{plan,experimentalWeb:true}),{code:'TARGET_CAPABILITY'});
 const out=exportDeck(document,'html',{plan,experimentalWeb:true});assert.equal(out.mime,'text/html; charset=utf-8');assert.ok(out.body.includes('<h2>'));assert.ok(out.body.includes('<polyline'));assert.ok(out.body.includes('<table>'));assert.equal(out.body.includes('<foreignObject'),false);
});
test('design plans never omit facts, point at absent blocks, or masquerade themes',async()=>{
 const {document,plan}=await fixture();
 for(const change of [p=>p.scenes[0].blockIds.pop(),p=>p.scenes[0].focalBlockId='missing',p=>p.documentId='another',p=>p.scenes[1].theme='cream-collage',p=>p.scenes.push(p.scenes[0])]){const p=structuredClone(plan);change(p);assert.throws(()=>assertDesignPlan(document,p),{code:'INVALID_DESIGN_PLAN'});}
});
test('WebScene is derived, closed, stable across reordering, and requires exact reading order',async()=>{
 const {document,plan}=await fixture(),[a,b]=compileWebScenes(document,plan);const reversed=structuredClone(plan);reversed.scenes.reverse();assert.deepEqual(compileWebScenes(document,reversed),[b,a]);assert.notEqual(a.composition,b.composition);
 for(const change of [s=>s.regions[0].component='execute',s=>s.readingOrder[0]=s.readingOrder[1],s=>s.regions[0].blockId='absent',s=>s.regions[0].html='<div>']){const copy=structuredClone(a);change(copy);assert.throws(()=>assertWebScene(copy,document),{code:'INVALID_WEB_SCENE'});}
});
test('render hashes are deterministic, source-bound and private metadata stays out of HTML',async()=>{
 const {document,plan}=await fixture();document.migration.private='PRIVATE_SENTINEL';
 const a=exportDeck(document,'html',{plan,experimentalWeb:true}),b=exportDeck(document,'html',{plan,experimentalWeb:true});assert.equal(a.body,b.body);assert.equal(a.body.includes('PRIVATE_SENTINEL'),false);
 document.datasets[0].series[0].values[0]=19;const c=exportDeck(document,'html',{plan,experimentalWeb:true});assert.notEqual(a.renderHash,c.renderHash);
 document.blocks[0].text='</h2><script>alert(1)</script>';const html=exportDeck(document,'html',{plan,experimentalWeb:true}).body;assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert.ok(html.includes("connect-src &#39;none&#39;"));
});

test('filmstrip renders the selected derived scene with source assets and no scripts or other pages',async()=>{
 const {sceneThumbnail}=await import('../src/render/web/document.mjs');
 const {document,plan}=await fixture(),output=exportDeck(document,'html',{experimentalWeb:true,plan});
 for(const [i,scene]of plan.scenes.entries()){
  const html=sceneThumbnail(output,scene.id);
  assert.ok(html.includes(output.sceneMarkup[i]));
  assert.equal((html.match(/class="web-scene /g)||[]).length,1);
  assert.ok(!/<script\b/i.test(html));
  assert.ok(html.includes('class="preview"'));
 }
 assert.throws(()=>sceneThumbnail(output,'unknown-scene'),{code:'SCENE_NOT_FOUND'});
});
