import test from 'node:test';
import assert from 'node:assert/strict';
import {exportDeck} from '../src/render/export.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {readZip,inspectPackage,auditPPTX} from '../src/targets/pptx/audit.mjs';
import {syntheticLayout} from './export-layout.mjs';
import {dwiSliceProject,DWI_VALUES,DWI_LOCALES} from './dwi-slice.mjs';
/** DWI-034 (workpacks/wes-instrument/TASKS.md): the six-page slice exported natively, compared by content counts and values, not by "the zip opens". */
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
async function run(locale,{palettes=false}={}){
 const p=await dwiSliceProject(locale,{palettes}),before=structuredClone(p),html=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}}),layout=syntheticLayout({...p,resources:{}},html);
 const rasters=Object.fromEntries(presentationCapabilities('pptx',p.document).components.filter(c=>c.level==='L3').flatMap(c=>layout.scenes.filter(s=>s.regions.some(r=>r.blockId===c.blockId)).map(s=>[`${s.sceneId}/${c.blockId}/plot`,PNG])));
 const pptx=exportDeck(p.document,'pptx',{experimentalWeb:true,plan:p.plan,assetResources:{},layout,rasters}),pdf=exportDeck(p.document,'pdf',{experimentalWeb:true,plan:p.plan,assetResources:{},layout,rasters});
 return {p,before,html,layout,pptx,pdf,files:readZip(pptx.body),pkg:inspectPackage(pptx.body)};
}
const runs=Object.fromEntries(await Promise.all(DWI_LOCALES.flatMap(l=>[[l,false],[l,true]]).map(async([l,palettes])=>[`${l}${palettes?'-palette':''}`,await run(l,{palettes})])));

test('preview and export share one semantic scene: the layout carries the preview render hash and a stale layout is refused',async()=>{
 for(const r of Object.values(runs)){
  assert.equal(r.layout.renderHash,r.html.renderHash);
  assert.deepEqual(r.html.scenes.map(s=>s.readingOrder),compileWebScenes(r.p.document,r.p.plan).map(s=>s.readingOrder));
 }
 const r=runs.en,stale={...r.layout,renderHash:'0'.repeat(64)};
 assert.throws(()=>exportDeck(r.p.document,'pptx',{experimentalWeb:true,plan:r.p.plan,assetResources:{},layout:stale}),e=>/render|layout|stale|measure/i.test(e.message+e.code));
});

test('content counts and values match the document: table cells, chart points, diagram parts and edges, every source',()=>{
 for(const [name,r] of Object.entries(runs)){
  const shapes=r.pkg.slides.flatMap(s=>s.shapes),doc=r.p.document;
  const table=doc.blocks.find(b=>b.id==='cmp-table'),tableXml=[...r.files.entries()].filter(([n])=>/slides\/slide\d+\.xml$/.test(n)).map(([,b])=>b.toString()).find(x=>x.includes('cmp-table/'));
  assert.equal((tableXml.match(/<a:tc>/g)||[]).length,(table.rows.length+1)*table.columns.length,`${name} table cells`);
  for(const cell of [...table.columns,...table.rows.flat()])assert.ok(tableXml.includes(cell.replace(/&/g,'&amp;')),`${name} cell ${cell}`);
  const charts=[...r.files.entries()].filter(([n])=>/charts\/chart\d+\.xml$/.test(n)).map(([,b])=>b.toString());
  assert.equal(charts.length,2,`${name}: both small-multiple panels are native charts`);
  const values=charts.map(x=>(x.match(/<c:val>[\s\S]*?<\/c:val>/)[0].match(/<c:v>([^<]*)<\/c:v>/g)||[]).map(v=>Number(v.slice(5,-6))));
  assert.deepEqual(values,[DWI_VALUES.teamA,DWI_VALUES.teamB],`${name} chart values`);
  for(const id of ['flow-diagram','mech-diagram']){const b=doc.blocks.find(x=>x.id===id);assert.equal(shapes.filter(s=>s.name.startsWith(`${id}/node-`)).length,b.nodes.length);assert.equal(shapes.filter(s=>s.kind==='connector'&&s.name.startsWith(`${id}/edge-`)).length,b.edges.length);}
  const notes=r.pkg.slides.map(s=>s.notes).join('\n');for(const s of doc.sources)assert.ok(notes.includes(s.url),`${name} ${s.id}`);
  const audit=auditPPTX({bytes:r.pptx.body,document:doc,plan:r.p.plan,scenes:compileWebScenes(doc,r.p.plan),compiled:r.pptx.run.output,levels:r.pptx.run.levels});
  assert.equal(audit.editability.status,'pass');assert.equal(audit.sceneCheck.status,'pass');assert.ok(!audit.editability.failures.some(f=>f.check==='no whole-slide picture'));
 }
});

test('what PowerPoint cannot hold natively is disclosed per element, with every value kept as text',()=>{
 for(const [name,r] of Object.entries(runs)){
  const image=r.pptx.report.receipts.find(x=>x.code==='PPTX_CHART_IMAGE'&&x.blockId==='as-chart');
  assert.ok(image&&/missing value/i.test(image.reason)&&/every value/.test(image.delivered),name);
  const notes=r.pkg.slides.map(s=>s.notes).join('\n');for(const v of DWI_VALUES.checked.filter(v=>v!==null))assert.ok(notes.includes(String(v)),`${name} value ${v} in notes`);
  assert.ok(r.pptx.report.receipts.every(x=>x.reason&&x.delivered),`${name}: every receipt says why and what was delivered`);
  assert.equal(r.pdf.report.check.status,'pass');
 }
});

test('the source project is unchanged by every export, so the saved deck stays the recoverable original',()=>{
 for(const r of Object.values(runs))assert.deepEqual(r.p,r.before);
});
