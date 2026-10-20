import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {TYPOGRAPHY_MINIMUM_PT,TYPOGRAPHY_TARGET_PT} from '../src/targets/capabilities.mjs';
import {TARGETS,PT_PER_PX,typographyRole,typographyReport,targetFit} from '../src/targets/target-budget.mjs';
import {sceneBands} from '../src/targets/pptx/paginate.mjs';
import {syntheticLayout} from './export-layout.mjs';
import {cineProject,CINE_SCENES} from './cine-corpus.mjs';

const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-cine-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const html=(p,resources={})=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources});
const blocksOf=p=>new Map(p.document.blocks.map(b=>[b.id,b]));

// ---- Task 1: CINE-001 target budget contract and typography report ----
test('CINE-001 corpus: ten pages with the same ids, sources and datasets in both languages; the legacy project validates without the new fields',async()=>{
 const en=await cineProject('en',home,{declared:[]}),zh=await cineProject('zh-CN',home,{declared:[]});
 assert.equal(en.plan.scenes.length,10);assert.deepEqual(en.plan.scenes.map(s=>s.id),Object.keys(CINE_SCENES));
 assert.deepEqual(zh.plan.scenes.map(s=>s.id),en.plan.scenes.map(s=>s.id));
 assert.deepEqual(zh.document.sources,en.document.sources);assert.deepEqual(zh.document.datasets.map(d=>({id:d.id,categories:d.categories,values:d.series.map(s=>s.values)})),en.document.datasets.map(d=>({id:d.id,categories:d.categories,values:d.series.map(s=>s.values)})));
 assert.deepEqual(zh.document.blocks.map(b=>[b.id,b.type]),en.document.blocks.map(b=>[b.id,b.type]));
 assert.equal(en.plan.scenes.find(s=>s.id==='evidence').blockIds.filter(id=>blocksOf(en).get(id).type==='citation').length,12);
 assert.deepEqual(en.document.authorOverrides.sceneLocks,[{sceneId:'product-center',fields:['composition']}]);
 for(const s of en.plan.scenes)assert.equal('intent' in s||'media' in s||'references' in s,false);
});
test('CINE-001 target budget: one declared presentation target with hard minima and reported targets',()=>{
 assert.deepEqual(TARGETS.presentation.frame,{width:1440,height:810});
 assert.deepEqual(TARGETS.presentation.safeArea,{x:64,y:56});assert.deepEqual(TARGETS.presentation.grid,{columns:12,gutter:32});
 assert.deepEqual(TARGETS.presentation.typography.minimum,TYPOGRAPHY_MINIMUM_PT);
 assert.deepEqual(TARGETS.presentation.typography.target,{title:24,body:18,label:14,reference:10});assert.deepEqual(TYPOGRAPHY_TARGET_PT,TARGETS.presentation.typography.target);
 assert.equal(TARGETS.presentation.candidateHeight,900);assert.equal(TARGETS.presentation.overflow,'reflow-then-split');
 assert.deepEqual(TARGETS.reading.frame,{width:1440,height:null});assert.equal(TARGETS.reading.overflow,'flow');
 assert.ok(Math.abs(PT_PER_PX.pptx-2/3)<1e-9);assert.equal(PT_PER_PX.pdf,.75);
 assert.equal(typographyRole('heading','text',{title:true}),'title');assert.equal(typographyRole('heading','text',{title:false}),'body');
 assert.equal(typographyRole('paragraph','text'),'body');assert.equal(typographyRole('diagram','diagram-text'),'label');assert.equal(typographyRole('chart','text'),'label');
 assert.equal(typographyRole('citation','text'),'reference');assert.equal(typographyRole('image','text'),'reference');assert.equal(typographyRole(null,'chrome-text'),'reference');
});
test('CINE-001 typography report: 20 px body at full width is 13.3 pt in PowerPoint (above the 10 pt minimum, below the 18 pt target)',()=>{
 const r=typographyReport([{box:{x:0,y:0,width:100,height:20},fontSize:20,blockId:'p1',kind:'text'}],new Map([['p1',{type:'paragraph'}]]),{titleBlockId:null,ptPerPx:PT_PER_PX.pptx,scale:1});
 assert.equal(r.minimum.status,'pass');assert.deepEqual(r.minimum.failures,[]);
 assert.equal(r.target.status,'below');assert.equal(r.target.below.length,1);assert.equal(r.target.below[0].role,'body');assert.equal(r.target.below[0].blockId,'p1');assert.equal(r.target.below[0].target,18);
 assert.ok(Math.abs(r.target.below[0].pt-13.33)<.01);
 // A 12 px citation at a 0.6 scale is 4.8 pt: below the 6 pt annotation minimum (reference maps to annotation for the minimum) and below the 10 pt reference target.
 const f=typographyReport([{box:{x:0,y:0,width:100,height:12},fontSize:12,blockId:'c1',kind:'text'}],new Map([['c1',{type:'citation'}]]),{titleBlockId:null,ptPerPx:PT_PER_PX.pptx,scale:.6});
 assert.equal(f.minimum.status,'fail');assert.deepEqual(f.minimum.failures.map(x=>[x.blockId,x.role,x.minimum]),[['c1','reference',6]]);assert.ok(Math.abs(f.minimum.failures[0].pt-4.8)<.01);
 assert.equal(f.target.status,'below');assert.equal(f.target.below[0].target,10);
 // Above every target: met.
 const m=typographyReport([{box:{x:0,y:0,width:100,height:30},fontSize:30,blockId:'p1',kind:'text'}],new Map([['p1',{type:'paragraph'}]]),{titleBlockId:null,ptPerPx:PT_PER_PX.pptx,scale:1});
 assert.equal(m.target.status,'met');assert.deepEqual(m.target.below,[]);
});
test('CINE-001 targetFit on the synthetic overflow page: PowerPoint pages it, PDF pages it at the same cuts, a short page fits',async()=>{
 const p=await cineProject('en',home,{declared:[]}),resources=await visualAssetResources(p,home),h=html(p,resources),layout=syntheticLayout({...p,resources},h),blocks=blocksOf(p);
 const at=id=>({scene:p.plan.scenes.find(s=>s.id===id),m:layout.scenes[p.plan.scenes.findIndex(s=>s.id===id)]});
 const of=at('overflow'),pptx=targetFit(of.m,blocks,{format:'pptx',titleBlockId:'of-title',strip:60}),pdf=targetFit(of.m,blocks,{format:'pdf',titleBlockId:'of-title',strip:60});
 assert.equal(pptx.status,'paged');assert.ok(pptx.bands.length>=2);assert.equal(pdf.status,'paged');assert.equal(pdf.bands.length,pptx.bands.length);
 assert.deepEqual(pdf.bands.map(b=>Math.round(b.y)),pptx.bands.map(b=>Math.round(b.y)),'the PDF bands start where the PowerPoint bands start');
 assert.ok(pptx.scale>0&&pptx.scale<=1);assert.equal(pptx.typography.length,pptx.bands.length);for(const t of pptx.typography)assert.equal(t.minimum.status,'pass');
 // The bands are the ones sceneBands reports with the PDF frame and unit.
 const direct=sceneBands(of.m,blocks,{titleBlockId:'of-title',strip:60,frame:{width:1440,height:810},unitsPerPt:4/3});
 assert.equal(direct.reason,'paged');assert.deepEqual(direct.bands,pdf.bands);
 const act=at('action'),fit=targetFit(act.m,blocks,{format:'pptx',titleBlockId:'act-title',strip:60});
 assert.equal(fit.status,'fits');assert.equal(fit.bands,null);assert.equal(fit.typography.length,1);assert.ok(fit.scale>0&&fit.scale<=1);
 // The default sceneBands call is unchanged: no frame or unit given means the PowerPoint slide in EMU.
 assert.deepEqual(sceneBands(of.m,blocks,{titleBlockId:'of-title',strip:60}),sceneBands(of.m,blocks,{titleBlockId:'of-title',strip:60,frame:{width:12192000,height:6858000},unitsPerPt:12700}));
});
