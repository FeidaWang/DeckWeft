import test from 'node:test';
import assert from 'node:assert/strict';
import {exportDeck} from '../src/render/export.mjs';
import {sceneReferences,referenceIndex,qualifierPlacement} from '../src/references/presentation.mjs';
import {inspectPackage} from '../src/targets/pptx/audit.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {syntheticLayout} from './export-layout.mjs';
import {dwiSliceProject} from './dwi-slice.mjs';
/** DWI-031 (workpacks/wes-instrument/TASKS.md): compact source keys near claims, full metadata in a source view, qualifiers never footnotes. */
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
async function compact(locale='en'){const p=await dwiSliceProject(locale);for(const s of p.plan.scenes)s.references={mode:'compact'};return p;}
const html=p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}});
const paged=(p,target)=>{const h=html(p),layout=syntheticLayout({...p,resources:{}},h),rasters=Object.fromEntries(presentationCapabilities('pptx',p.document).components.filter(c=>c.level==='L3').flatMap(c=>layout.scenes.filter(s=>s.regions.some(r=>r.blockId===c.blockId)).map(s=>[`${s.sceneId}/${c.blockId}/plot`,PNG])));return exportDeck(p.document,target,{experimentalWeb:true,plan:p.plan,assetResources:{},layout,rasters});};

test('each claim carries a readable key next to it; the strip holds only citations',async()=>{
 for(const locale of ['en','zh-CN']){
  const p=await compact(locale),out=html(p),index=referenceIndex(p.document,p.plan);
  for(const [i,s] of p.plan.scenes.entries()){
   const refs=sceneReferences(p.document,p.plan,s),markup=out.sceneMarkup[i];
   assert.ok(refs.strip.length>=1&&refs.strip.every(v=>p.document.blocks.find(b=>b.id===v.blockId).type==='citation'),s.id);
   for(const c of refs.claims){const at=markup.indexOf(`data-block-id="${c.blockId}"`),next=markup.indexOf('<div id="r',at+1),region=at<0?'':markup.slice(at,next<0?markup.indexOf('<footer',at):next);assert.ok(c.markers.every(n=>region.includes(`[${n}]`)),`${locale} ${s.id} ${c.blockId} shows [${c.markers}]`);}
  }
  assert.deepEqual([...index.keys()],['src-review','src-bench','src-spec','src-sketch']);
 }
});

test('the full source metadata is in the source view, the PowerPoint notes and the PDF appendix',async()=>{
 const p=await compact(),out=html(p);
 for(const [i,s] of p.plan.scenes.entries()){const panel=out.sceneMarkup[i].match(/<details class="reference-panel">[\s\S]*?<\/details>/)[0];for(const v of sceneReferences(p.document,p.plan,s).strip){assert.ok(panel.includes(v.url));assert.ok(panel.includes(v.title.replace(/&/g,'&amp;')));}}
 const notes=inspectPackage(paged(p,'pptx').body).slides.map(s=>s.notes).join('\n');
 for(const src of p.document.sources){assert.ok(notes.includes(src.url),src.id);assert.match(notes,new RegExp(`\\[\\d\\][^\\n]*${src.title.slice(0,20).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));}
 const pdf=paged(p,'pdf');assert.equal(pdf.report.check.status,'pass');assert.ok(pdf.report.check.appendixPages>=1);
 const print=String(pdf.body);for(const src of p.document.sources)assert.ok(print.includes(src.url),`${src.id} in the PDF print document`);
});

test('qualifiers and missing-value notes stay on the page at a reading role, never in the strip',async()=>{
 for(const locale of ['en','zh-CN']){
  const p=await compact(locale),out=html(p);
  for(const [i,s] of p.plan.scenes.entries())assert.deepEqual(qualifierPlacement(p.document,s,out.sceneMarkup[i]),[],`${locale} ${s.id}`);
 }
 const p=await compact(),out=html(p),s=p.plan.scenes[0],q=p.document.blocks.find(b=>b.id==='as-qualifier');
 const moved=out.sceneMarkup[0].replace(/<div[^>]*data-block-id="as-qualifier"[\s\S]*?<\/div>/,'').replace('<footer class="source-strip"',`<footer class="source-strip"><p>${q.text}</p>`);
 assert.deepEqual(qualifierPlacement(p.document,s,moved).map(i=>i.code).sort(),['QUALIFIER_IN_SOURCE_STRIP','QUALIFIER_NOTE_HIDDEN','QUALIFIER_NOT_ON_PAGE'],'the moved sentence is also the missing-value note');
 const tiny=out.sceneMarkup[0].replace(/(data-block-id="as-qualifier" data-component="callout" data-text-role=")body/,'$1caption');
 assert.deepEqual(qualifierPlacement(p.document,s,tiny).map(i=>i.code),['QUALIFIER_AS_FOOTNOTE']);
 const hidden=out.sceneMarkup[0].replace(/<ul class="chart-notes">[\s\S]*?<\/ul>/,'');
 assert.ok(qualifierPlacement(p.document,s,hidden.replace(/<div[^>]*data-block-id="as-qualifier"[\s\S]*?<\/div>/,'')).some(i=>i.code==='QUALIFIER_NOTE_HIDDEN'));
});

test('reordering pages renumbers keys by first appearance while every claim keeps its source',async()=>{
 const p=await compact(),before=Object.fromEntries(p.plan.scenes.flatMap(s=>sceneReferences(p.document,p.plan,s).claims.map(c=>[c.blockId,c.markers.map(n=>[...referenceIndex(p.document,p.plan)].find(([,v])=>v===n)[0])])));
 p.plan.scenes.reverse();const after=Object.fromEntries(p.plan.scenes.flatMap(s=>sceneReferences(p.document,p.plan,s).claims.map(c=>[c.blockId,c.markers.map(n=>[...referenceIndex(p.document,p.plan)].find(([,v])=>v===n)[0])])));
 assert.deepEqual(after,before);assert.deepEqual([...referenceIndex(p.document,p.plan).keys()][0],'src-spec');
});
