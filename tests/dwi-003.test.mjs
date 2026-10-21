import test from 'node:test';
import assert from 'node:assert/strict';
import {exportDeck} from '../src/render/export.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {readZip,auditPPTX,inspectPackage} from '../src/targets/pptx/audit.mjs';
import {compositions,compositionOrder} from '../src/design/compositions.mjs';
import {syntheticLayout} from './export-layout.mjs';
import {DWI_LOCALES,DWI_SCENES,DWI_VALUES,DWI_INVARIANTS,dwiSliceProject,dwiSliceDocument} from './dwi-slice.mjs';
/**
 * DWI-003 (workpacks/wes-instrument/TASKS.md): the six-page vertical slice in both languages, its exports through the current
 * pipelines and the invariants later DWI tasks regress against. Paged exports here use the synthetic layout (unit tests only);
 * the measured browser run is `scripts/export-targets.mjs --dwi` (docs/evidence/dwi/phase-00/dwi-003/).
 */
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const rasters=(p,layout)=>Object.fromEntries(presentationCapabilities('pptx',p.document).components.filter(c=>c.level==='L3').flatMap(c=>layout.scenes.filter(s=>s.regions.some(r=>r.blockId===c.blockId)).map(s=>[`${s.sceneId}/${c.blockId}/plot`,PNG])));
const exportsOf=async locale=>{
 const p=await dwiSliceProject(locale),html=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}}),layout=syntheticLayout({...p,resources:{}},html);
 const paged=target=>exportDeck(p.document,target,{experimentalWeb:true,plan:p.plan,assetResources:{},layout,rasters:rasters(p,layout)});
 return {p,html,layout,pptx:paged('pptx'),pdf:paged('pdf')};
};
const decks=Object.fromEntries(await Promise.all(DWI_LOCALES.map(async l=>[l,await exportsOf(l)])));
/** reading-flow is a theme composition (src/design/profile.mjs), not one of the inferred families. */
const familyOf=id=>compositions.find(c=>c.id===id)?.family??id;

test('six pages, one per named layout family, in both languages with the same ids and values',()=>{
 for(const l of DWI_LOCALES){
  const {p}=decks[l];
  assert.deepEqual(p.plan.scenes.map(s=>s.id),DWI_SCENES);
  assert.deepEqual(p.plan.scenes.map(s=>familyOf(s.composition)),['evidence','comparison','small-multiples','process','system-map','reading-flow']);
 }
 const [en,zh]=DWI_LOCALES.map(l=>decks[l].p.document);
 assert.deepEqual(en.blocks.map(b=>[b.id,b.type,b.sourceIds]),zh.blocks.map(b=>[b.id,b.type,b.sourceIds]));
 assert.deepEqual(en.datasets.map(d=>d.series.map(s=>s.values)),zh.datasets.map(d=>d.series.map(s=>s.values)));
 assert.deepEqual(en.sources.map(s=>[s.id,s.url]),zh.sources.map(s=>[s.id,s.url]));
});

test('values, the null, units, denominators and the shared scale are stated explicitly',()=>{
 for(const l of DWI_LOCALES){
  const doc=decks[l].p.document,ds=Object.fromEntries(doc.datasets.map(d=>[d.id,d]));
  assert.deepEqual(ds['review-time'].series.map(s=>s.values),[DWI_VALUES.checked,DWI_VALUES.opened]);
  for(const n of DWI_INVARIANTS.nulls){const d=ds[n.datasetId],i=d.categoryIds.indexOf(n.categoryId);assert.equal(d.series.find(s=>s.id===n.seriesId).values[i],null);assert.ok(d.missing.some(m=>m.seriesId===n.seriesId&&m.categoryId===n.categoryId&&m.reason==='not-collected'));}
  for(const [id,unit] of Object.entries(DWI_INVARIANTS.units))assert.equal(ds[id].unit,unit);
  for(const d of doc.datasets)assert.ok(d.definition.denominator,d.id);
  for(const id of DWI_INVARIANTS.sharedScale.blockIds)assert.deepEqual(doc.blocks.find(b=>b.id===id).axis,DWI_INVARIANTS.sharedScale.axis);
 }
});

test('locks and claim source links are declared and resolvable',()=>{
 for(const l of DWI_LOCALES){
  const doc=decks[l].p.document,o=doc.authorOverrides,sources=new Set(doc.sources.map(s=>s.id));
  assert.deepEqual(o.lockedBlockIds,DWI_INVARIANTS.lockedBlockIds);assert.deepEqual(o.lockedDatasetIds,DWI_INVARIANTS.lockedDatasetIds);
  assert.deepEqual(o.lockedSourceIds,DWI_INVARIANTS.lockedSourceIds);assert.deepEqual(o.sceneLocks,DWI_INVARIANTS.sceneLocks);assert.equal(o.lockMode,'separate');
  for(const [blockId,ids] of Object.entries(DWI_INVARIANTS.claimSources))assert.deepEqual(doc.blocks.find(b=>b.id===blockId).sourceIds,ids);
  for(const b of doc.blocks){assert.ok(b.sourceIds.length,b.id);for(const id of b.sourceIds)assert.ok(sources.has(id),`${b.id}: ${id}`);}
 }
});

test('HTML keeps every block’s text, the missing value and the not-to-scale statement',()=>{
 for(const l of DWI_LOCALES){
  const {html,p}=decks[l],body=html.body.toString().replace(/<wbr>/g,''); // CJK headings carry <wbr> break hints
  assert.equal(html.scenes.length,6);
  const plain=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  for(const b of p.document.blocks){
   const texts=b.type==='list'?b.items:b.type==='table'?[...b.columns,...b.rows.flat()]:b.type==='diagram'?b.nodes.map(n=>n.label):'text' in b?[b.text]:[];
   for(const t of texts)assert.ok(body.includes(plain(t))||body.includes(t),`${l} ${b.id}: ${t}`);
  }
  assert.ok(body.includes(plain(dwiSliceDocument(l).blocks.find(b=>b.id===DWI_INVARIANTS.notToScaleBlockId).text)));
 }
});

test('reading order follows the composition, the same order in HTML and PowerPoint',()=>{
 for(const l of DWI_LOCALES){
  const {p,pptx}=decks[l],scenes=compileWebScenes(p.document,p.plan);
  for(const [i,s] of p.plan.scenes.entries())assert.deepEqual(scenes[i].readingOrder.map(r=>scenes[i].regions.find(x=>x.id===r).blockId),compositionOrder(p.document,s));
  const audit=auditPPTX({bytes:pptx.body,document:p.document,plan:p.plan,scenes,compiled:pptx.run.output,levels:pptx.run.levels});
  assert.equal(audit.sceneCheck.status,'pass',JSON.stringify(audit.sceneCheck.failures));
  assert.equal(audit.editability.status,'pass',JSON.stringify(audit.editability.failures));
 }
});

test('PowerPoint is native per element, no whole-slide picture, and notes carry the sources',()=>{
 for(const l of DWI_LOCALES){
  const {p,pptx}=decks[l],pkg=inspectPackage(pptx.body);
  assert.equal(pkg.slides.length,6);
  assert.ok(pkg.slides.every(s=>s.shapes.filter(x=>x.kind==='picture').every(x=>x.name.includes('/'))),'pictures belong to elements');
  assert.ok(pkg.slides[1].shapes.some(x=>x.kind==='table'),'comparison is a native table');
  const notes=pkg.slides.map(s=>s.notes).join('\n');
  for(const s of p.document.sources)assert.ok(notes.includes(s.url),`${l}: ${s.id} in notes`);
  assert.ok(readZip(pptx.body).has('ppt/presentation.xml'));
 }
});

test('PDF pages every scene and passes its own structural check',()=>{
 for(const l of DWI_LOCALES){const {pdf}=decks[l];assert.equal(pdf.report.check.status,'pass');assert.equal(pdf.report.check.pages,6);}
});

test('the line chart with a null is an element image in PowerPoint, declared rather than hidden',()=>{
 for(const l of DWI_LOCALES){
  const {p,pptx}=decks[l],levels=presentationCapabilities('pptx',p.document).components,chart=levels.find(c=>c.blockId==='as-chart');
  assert.equal(chart.level,'L3');
  assert.ok(pptx.report.receipts.some(r=>r.blockId==='as-chart'&&!r.error),'a receipt names the chart image');
 }
});
