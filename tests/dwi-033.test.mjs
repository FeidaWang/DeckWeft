import test from 'node:test';
import assert from 'node:assert/strict';
import {exportDeck} from '../src/render/export.mjs';
import {diagram,SCALE} from '../src/components/diagrams/render.mjs';
import {resolveTheme} from '../src/design/theme-registry.mjs';
import {mechanismIssues,diagramOrderIssues} from '../src/design/attention-policy.mjs';
import {inspectPackage,readZip} from '../src/targets/pptx/audit.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {staticStates} from '../src/targets/static-delivery.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {syntheticLayout} from './export-layout.mjs';
import {blueprintProject} from './blueprint-a.mjs';
import {dwiSliceProject,dwiSliceDocument,dwiSlicePlan} from './dwi-slice.mjs';
/** DWI-033 (workpacks/wes-instrument/TASKS.md): workflows and mechanisms keep part ids, attached labels, directed edges, an honest scale and a complete static state. */
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const paged=(p,target)=>{const h=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}}),layout=syntheticLayout({...p,resources:{}},h),rasters=Object.fromEntries(presentationCapabilities('pptx',p.document).components.filter(c=>c.level==='L3').flatMap(c=>layout.scenes.filter(s=>s.regions.some(r=>r.blockId===c.blockId)).map(s=>[`${s.sceneId}/${c.blockId}/plot`,PNG])));return exportDeck(p.document,target,{experimentalWeb:true,plan:p.plan,assetResources:{},layout,rasters});};

test('every part and edge keeps its id in the web drawing and in PowerPoint; edges are directed connectors',async()=>{
 const p=await dwiSliceProject('en'),pkg=inspectPackage(paged(p,'pptx').body),xml=[...readZip(paged(p,'pptx').body).entries()].filter(([n])=>/slides\/slide\d+\.xml$/.test(n)).map(([,b])=>b.toString()).join('');
 for(const id of ['flow-diagram','mech-diagram']){
  const b=p.document.blocks.find(x=>x.id===id),shapes=pkg.slides.flatMap(s=>s.shapes).filter(s=>s.name.startsWith(id+'/'));
  for(const n of b.nodes)assert.ok(shapes.some(s=>s.name===`${id}/node-${n.id}`),`${id} node ${n.id}`);
  for(const e of b.edges)assert.ok(shapes.some(s=>s.kind==='connector'&&s.name===`${id}/edge-${e.id}`),`${id} edge ${e.id}`);
  const svg=diagram(b,p.document,resolveTheme('silver-gray-editorial','1.0.0','en'),{sceneId:'s'});
  for(const n of b.nodes)assert.match(svg,new RegExp(`data-object-id="${n.id}"`));for(const e of b.edges)assert.match(svg,new RegExp(`data-object-id="${e.id}"`));
  assert.equal((svg.match(/marker-end=/g)||[]).length,b.edges.length);
 }
 assert.equal((xml.match(/<p:cxnSp>/g)||[]).length,9);assert.equal((xml.match(/(head|tail)End type="triangle"/g)||[]).length,9,'one arrowhead per edge');
 const flow=pkg.slides.find(s=>s.shapes.some(x=>x.name.startsWith('flow-diagram/')));
 for(const l of p.document.blocks.find(b=>b.id==='flow-diagram').edges.map(e=>e.label))assert.ok(flow.shapes.some(s=>s.kind==='text'&&s.name.startsWith('flow-diagram/')&&s.texts?.join?.(' ').includes(l))||JSON.stringify(flow).includes(l),`edge label “${l}” is slide text`);
 assert.deepEqual(diagramOrderIssues(p.document.blocks.find(b=>b.id==='flow-diagram')),[]);
});

test('a mechanism states its scale as page text in every language and export; a missing statement is a warning',async()=>{
 for(const l of ['en','zh-CN']){
  const p=await dwiSliceProject(l),html=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}}).body.toString();
  assert.match(html,new RegExp(`<p class="diagram-scale" data-scale="not-to-scale">${SCALE['not-to-scale'][l==='zh-CN'?1:0]}</p>`));
  assert.deepEqual(mechanismIssues(p.document,p.plan.scenes[4]),[]);
 }
 const doc=dwiSliceDocument('en');delete doc.blocks.find(b=>b.id==='mech-diagram').scale;
 const plain=createVisualProject(doc,dwiSlicePlan('en'),{assets:[],id:'x'});
 assert.deepEqual(mechanismIssues(plain.document,plain.plan.scenes[4]).map(i=>[i.code,i.severity]),[['MECHANISM_SCALE_UNDECLARED','warning']]);
 assert.ok(!exportDeck(plain.document,'html',{experimentalWeb:true,plan:plain.plan,assetResources:{}}).body.toString().includes('diagram-scale'),'undeclared: nothing is guessed');
 for(const scale of ['unverified','to-scale']){const d=dwiSliceDocument('zh-CN');d.blocks.find(b=>b.id==='mech-diagram').scale=scale;const v=createVisualProject(d,dwiSlicePlan('zh-CN'),{assets:[],id:'y'});assert.ok(exportDeck(v.document,'html',{experimentalWeb:true,plan:v.plan,assetResources:{}}).body.toString().includes(SCALE[scale][1]));}
 const bad=dwiSliceDocument('en');bad.blocks.find(b=>b.id==='mech-diagram').scale='approximately';
 assert.throws(()=>createVisualProject(bad,dwiSlicePlan('en'),{assets:[],id:'z'}),e=>JSON.stringify(e.details).includes('scale'));
});

test('a step reveal never exports an incomplete static state: without the whole object measured, the export is refused',async()=>{
 const p=await blueprintProject('en'),states=staticStates(p.document,p.plan);
 assert.ok(states.length>=1,'the reveal declares a static state');
 // The synthetic layout carries no measured diagram text, so the export order must refuse rather than ship a partial slide.
 assert.throws(()=>paged(p,'pptx'),e=>e.code==='BLUEPRINT_STATIC_INCOMPLETE'&&/whole object with every part and its explanation/.test(e.message));
 assert.throws(()=>paged(p,'pdf'),e=>e.code==='BLUEPRINT_STATIC_INCOMPLETE');
 // The measured run (scripts/export-targets.mjs --s9, docs/evidence/dwi/phase-03/dwi-033/) exports it with every part and explanation.
});
