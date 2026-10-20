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
import {candidateFit,CANDIDATE_HEIGHT} from '../src/design/rhythm.mjs';
import {splitScene} from '../src/design/split.mjs';
import {planAuthorAction,AUTHOR_ACTIONS} from '../src/workbench/author-actions.mjs';

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

// ---- Task 2: CINE-001 PDF pages tall scenes on the PowerPoint bands ----
/** Compiles one paged target from the synthetic layout (unit tests only; real runs measure a browser). */
function paged(p,target,{resources={},layout,paginate}={}){
 const h=html(p,resources),l=layout||syntheticLayout({...p,resources},h);
 return {html:h,layout:l,out:exportDeck(p.document,target,{experimentalWeb:true,plan:p.plan,assetResources:resources,layout:l,rasters:{},...(paginate?{paginate}:{})})};
}
test('CINE-001 PDF: the overflow page becomes two print pages at a scale that keeps 10 pt body text; the heading repeats; the strip stays on the last band',async()=>{
 const p=await cineProject('en',home,{declared:[]}),resources=await visualAssetResources(p,home),{out,layout}=paged(p,'pdf',{resources}),job=out.run.output;
 const pages=job.pages.filter(x=>x.sceneId==='overflow');
 // The synthetic layout stacks every region, so its tall image and chart pages are paged too; a browser measurement is Task 12's.
 assert.ok(pages.length>=2);assert.deepEqual(job.pagination.find(x=>x.sceneId==='overflow'),{sceneId:'overflow',parts:pages.length,reason:'paged'});assert.deepEqual(out.report.pagination,job.pagination);
 assert.deepEqual(pages.map(x=>x.part),pages.map((_,i)=>i+1));for(const x of pages)assert.equal(x.parts,pages.length);
 for(const x of job.pages)assert.ok(x.scale*PT_PER_PX.pdf*20>=10-1e-9,`${x.sceneId} part ${x.part}: scale ${x.scale}`);
 assert.equal(pages[1].clip.y,pages[0].clip.y+pages[0].clip.height);
 assert.equal(job.pages.length,p.plan.scenes.length+job.pagination.reduce((n,x)=>n+x.parts-1,0));assert.equal(out.report.check.status,'pass');assert.equal(out.report.check.pages,job.pages.length);
 // The continuation page repeats the heading in a strip above its band and names the part; the first page has no strip.
 const title=p.document.blocks.find(b=>b.id==='of-title').text,strips=(job.html.match(/<div class="dw-strip"[\s\S]*?<\/section><\/div>/g)||[]).filter(s=>s.includes(title));
 assert.equal(strips.length,pages.length-1);assert.ok(strips.every(s=>/\(\d+\/\d+\)/.test(s)));assert.equal(strips[0].includes('(2/'+pages.length+')'),true);
 assert.equal((job.html.match(/class="dw-page"/g)||[]).length,job.pages.length);
 // The citations (the source strip of CINE-002) end the page, so they lie in the last band.
 const m=layout.scenes[p.plan.scenes.findIndex(s=>s.id==='overflow')],last=pages.at(-1).clip,cites=m.regions.filter(r=>r.blockId.startsWith('of-source'));
 for(const r of cites)for(const t of r.texts)assert.ok(t.box.y+t.box.height/2>=last.y&&t.box.y+t.box.height/2<=last.y+last.height);
 // Every other scene is one page at its whole-scene scale, as before.
 for(const s of p.plan.scenes.filter(s=>!job.pagination.some(x=>x.sceneId===s.id))){const own=job.pages.filter(x=>x.sceneId===s.id);assert.equal(own.length,1);assert.equal(own[0].parts,1);assert.equal(own[0].reason,'fits');assert.equal(own[0].overHeight,false);}
});
test('CINE-001 PDF: a page whose only element is taller than one band is taken whole and reported, not cut',async()=>{
 const p=await cineProject('en',home,{declared:[]}),resources=await visualAssetResources(p,home),h=html(p,resources),layout=syntheticLayout({...p,resources},h);
 // Stretch the first chart plot of the evidence page to 1500 px and move everything below it down.
 const k=p.plan.scenes.findIndex(s=>s.id==='evidence'),m=layout.scenes[k],region=m.regions.find(r=>r.blockId==='ev-chart-a'),plot=region.plot,extra=1200,from=plot.box.y+plot.box.height;
 const shift=o=>{if(o?.box&&o.box.y>=from)o.box.y+=extra;};
 plot.box.height+=extra;
 for(const r of m.regions){for(const list of [r.texts,r.boxes,r.shapes,r.tables||[]])list.forEach(shift);if(r.plot&&r!==region)shift(r.plot);shift(r.image);shift(r.diagram);if(r.bounds.y>=from)r.bounds.y+=extra;else if(r.bounds.y+r.bounds.height>=from)r.bounds.height+=extra;}
 m.bounds.height+=extra;
 const {out}=paged(p,'pdf',{resources,layout}),job=out.run.output,pages=job.pages.filter(x=>x.sceneId==='evidence'),chart={y:plot.box.y,bottom:plot.box.y+plot.box.height};
 for(const x of pages)assert.ok(!(x.clip.y>chart.y+0.5&&x.clip.y<chart.bottom-0.5),`a page clip starts inside the chart at ${x.clip.y}`);
 const whole=pages.find(x=>x.clip.y<=chart.y+0.5&&x.clip.y+x.clip.height>=chart.bottom-0.5);assert.ok(whole,'one page takes the chart whole');
 if(pages.length===1)assert.equal(pages[0].reason,'width-bound');
 else{assert.equal(pages[0].reason,'paged');assert.equal(whole.overHeight,true,'the over-height band is reported');assert.ok(whole.scale<0.667);assert.deepEqual(out.report.check.typography.overHeight.map(o=>[o.sceneId,o.part]),[['evidence',whole.part]]);}
 assert.equal(out.report.check.status,'pass','typography is reported on the PDF, not refused (batch 1)');
});
test('CINE-001 PDF: paginate:"none" keeps one page per scene (today\'s behaviour) and the check names the whole-scene scale',async()=>{
 const p=await cineProject('en',home,{declared:[]}),resources=await visualAssetResources(p,home),{out}=paged(p,'pdf',{resources,paginate:'none'}),job=out.run.output;
 assert.equal(job.pages.length,p.plan.scenes.length);assert.deepEqual(job.pagination,[]);
 for(const x of job.pages){assert.equal(x.part,1);assert.equal(x.parts,1);assert.equal(x.reason,'off');assert.equal(x.clip.height,x.height);}
 const of=job.pages.find(x=>x.sceneId==='overflow');assert.ok(of.scale<810/of.height+1e-6);
 assert.equal(out.report.check.status,'pass');assert.equal((job.html.match(/class="dw-strip"/g)||[]).length,0);
 // The structural check names a page whose scale is off: whole-scene scale.
 const bad=structuredClone(job);bad.pages[0].scale=1.2;const c=(await import('../src/targets/pdf/print.mjs')).checkPrintJob(bad,{plan:p.plan});
 assert.equal(c.status,'fail');assert.ok(c.failures.some(f=>f.check==='whole-scene scale'&&f.sceneId===bad.pages[0].sceneId));
 // Parts out of order are refused too.
 const {out:auto}=paged(p,'pdf',{resources}),gap=structuredClone(auto.run.output);gap.pages=gap.pages.filter(x=>!(x.sceneId==='overflow'&&x.part===1));
 const g=(await import('../src/targets/pdf/print.mjs')).checkPrintJob(gap,{plan:p.plan});assert.equal(g.status,'fail');assert.ok(g.failures.some(f=>f.check==='parts'&&f.sceneId==='overflow'));
});

// ---- Task 3: CINE-001 candidate gate reads the target; fit-page action with a stated split ----
const factsOf=p=>JSON.stringify({document:p.document,assets:p.assets});
/** Region bounds of the overflow page as a browser would report them, measured from the top of the page. */
const OVERFLOW_BOUNDS=[['of-title',0,120],['of-para-1',140,260],['of-para-2',420,280],['of-para-3',720,280],['of-list-1',1020,300],['of-list-2',1340,300],['of-source-1',1660,30],['of-source-2',1700,30],['of-source-3',1740,30],['of-source-4',1780,30]].map(([blockId,y,height])=>({blockId,y,height}));
test('CINE-001 fit-page: with measured bounds the overflow page is split after the last block ending above 754 px (810 − 56); facts, sources and locks unchanged; heading shared',async()=>{
 const p=await cineProject('en',home,{declared:[]}),before=factsOf(p);
 assert.deepEqual(AUTHOR_ACTIONS['fit-page'],{levels:['page'],changes:['page disclosure','page split']});
 const plan=planAuthorAction(p,{action:'fit-page',level:'page',id:'overflow',options:{regionBounds:OVERFLOW_BOUNDS}}),next=plan.project;
 assert.equal(plan.changed,true);assert.equal(next.plan.scenes.length,11);
 const i=next.plan.scenes.findIndex(s=>s.id==='overflow'),a=next.plan.scenes[i],b=next.plan.scenes[i+1];
 assert.equal(b.id,'overflow-2');
 assert.deepEqual(a.blockIds,['of-title','of-para-1','of-para-2','of-source-1','of-source-2','of-source-3','of-source-4']);
 assert.deepEqual(b.blockIds,['of-title','of-para-3','of-list-1','of-list-2','of-source-1','of-source-2'],'moved blocks take the citations of the sources they cite; the heading is shared');
 for(const k of ['theme','themeVersion','composition','role','profile'])assert.equal(b[k],a[k]);assert.equal(b.focalBlockId,'of-title');
 assert.equal(factsOf(next),before,'no text, data, source or asset changes');assert.deepEqual(next.document.authorOverrides,p.document.authorOverrides);
 assert.match(plan.effects[0].en,/2 pages/);assert.match(plan.effects[0].en,/The second paragraph lists/);assert.match(plan.effects[0].zh,/2 页/);
 assert.equal(plan.scopeStatement.en.includes('page split'),true);
});
test('CINE-001 fit-page: without bounds it moves movable supporting text behind the disclosure (reuses the S9a rule) and says that a split needs a measurement',async()=>{
 const p=await cineProject('en',home,{declared:[]}),before=factsOf(p),plan=planAuthorAction(p,{action:'fit-page',level:'page',id:'overflow'});
 assert.equal(plan.project.plan.scenes.length,10,'no split without a measurement');
 const s=plan.project.plan.scenes.find(s=>s.id==='overflow');assert.ok(s.disclosure.blockIds.length>=1);assert.ok(s.disclosure.blockIds.every(id=>['of-para-2','of-para-3','of-list-1','of-list-2'].includes(id)));
 assert.ok(plan.kept.some(k=>/measure/i.test(k.en)&&/测量/.test(k.zh)),'the plan says a split needs a measurement');
 assert.equal(factsOf(plan.project),before);
 // The same page with its text already disclosed and no bounds: nothing more to do, said so.
 const again=planAuthorAction(plan.project,{action:'fit-page',level:'page',id:'overflow'});assert.equal(again.changed,false);assert.ok(again.kept.length>=1);
});
test('CINE-001 fit-page refuses a blockIds-locked page by name and a split that would strip one side to a heading',async()=>{
 const p=await cineProject('en',home,{declared:[]}),locked=structuredClone(p);locked.document.authorOverrides.sceneLocks.push({sceneId:'overflow',fields:['blockIds']});
 assert.throws(()=>planAuthorAction(locked,{action:'fit-page',level:'page',id:'overflow',options:{regionBounds:OVERFLOW_BOUNDS}}),e=>e.code==='AUTHOR_LOCK'&&/overflow/.test(e.message));
 assert.throws(()=>splitScene(locked,'overflow',{afterBlockId:'of-para-2'}),e=>e.code==='AUTHOR_LOCK');
 assert.throws(()=>splitScene(p,'overflow',{afterBlockId:'of-title'}),e=>e.code==='SCENE_SPLIT');
 assert.throws(()=>splitScene(p,'overflow',{afterBlockId:'of-list-2'}),e=>e.code==='SCENE_SPLIT','only citations would move');
 assert.throws(()=>splitScene(p,'overflow',{afterBlockId:'of-source-4'}),e=>e.code==='SCENE_SPLIT');
 assert.throws(()=>splitScene(p,'nowhere',{afterBlockId:'of-para-2'}),e=>e.code==='SCENE_SPLIT');
 // Every block ends inside the page: nothing to split, the action says so instead of inventing a cut.
 const fits=planAuthorAction(p,{action:'fit-page',level:'page',id:'action',options:{regionBounds:[{blockId:'act-title',y:0,height:100},{blockId:'act-list',y:120,height:200},{blockId:'act-callout',y:340,height:80}]}});
 assert.equal(fits.changed,false);assert.ok(fits.kept.some(k=>/fits|inside/i.test(k.en)));
 // The takeaway stays with its claim: a cut that would move it to the continuation is refused.
 const t=structuredClone(p),s=t.plan.scenes.find(s=>s.id==='overflow');s.takeaway={blockId:'of-para-3'};
 assert.throws(()=>splitScene(t,'overflow',{afterBlockId:'of-para-2'}),e=>e.code==='SCENE_SPLIT');
 assert.equal(splitScene(t,'overflow',{afterBlockId:'of-para-3'}).plan.scenes.length,11);
});
test('CINE-001 candidateFit reports labelMinPx and the 21 px label target without changing today\'s ok/reasons',()=>{
 assert.equal(CANDIDATE_HEIGHT,TARGETS.presentation.candidateHeight);
 const good={height:800,overflow:[],clipIssues:[],contrastIssues:[],text:[{inside:true}],fonts:[{loaded:true}],components:[{scrollWidth:10,clientWidth:10,minTextPixels:14},{scrollWidth:10,clientWidth:10,minTextPixels:11}]};
 const r=candidateFit(good,{width:1440});assert.equal(r.ok,true);assert.deepEqual(r.reasons,[]);assert.equal(r.features.labelMinPx,11);assert.equal(r.features.labelTargetPx,21);
 const tall=candidateFit({...good,height:901},{width:1440});assert.equal(tall.ok,false);assert.deepEqual(tall.reasons,['Scene exceeds 900px presentation budget (901px)']);
 const small=candidateFit({...good,components:[{scrollWidth:10,clientWidth:10,minTextPixels:9}]},{width:1440});assert.equal(small.ok,false);assert.match(small.reasons[0],/below 10px/);assert.equal(small.features.labelMinPx,9);
 const none=candidateFit({...good,components:[]},{width:1440});assert.equal(none.features.labelMinPx,null);
 // The visual features of a measured check stay where they were.
 const v=candidateFit({...good,visualFeatures:{focus:.4,density:.5,imageRatio:0}},{width:1440});assert.deepEqual(v.features,{focus:.4,density:.5,imageRatio:0,labelMinPx:11,labelTargetPx:21});
 // A wider budget from another target.
 assert.equal(candidateFit({...good,height:901},{width:1440},{target:{...TARGETS.presentation,candidateHeight:1000}}).ok,true);
});
