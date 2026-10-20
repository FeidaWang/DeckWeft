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
import {candidateFit,CANDIDATE_HEIGHT,moveScene} from '../src/design/rhythm.mjs';
import {splitScene} from '../src/design/split.mjs';
import {planAuthorAction,AUTHOR_ACTIONS} from '../src/workbench/author-actions.mjs';
import {readFile} from 'node:fs/promises';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {REFERENCE_MODES,referenceIndex,sceneReferences,assertReferences} from '../src/references/presentation.mjs';
import {VISUAL_PURPOSES,ENTRIES,CENTERED_COMPOSITIONS,CONTEXTUAL_COMPOSITIONS,inferIntent,effectiveIntent,assertIntent,preferredVariant} from '../src/design/intent.mjs';
import {familyProject} from './families.mjs';
import {evidenceProject} from './evidence-scene.mjs';
import {blueprintProject} from './blueprint-a.mjs';
import {chartKindsProject} from './chart-kinds.mjs';
import {releaseProject} from './release-gate.mjs';
import designPlanSchema from '../schemas/design-plan.schema.json' with {type:'json'};
import presentationSchema from '../schemas/presentation-v3.schema.json' with {type:'json'};
import webSceneSchema from '../schemas/web-scene.schema.json' with {type:'json'};
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {artDirectionCSS} from '../src/render/web/art-direction.mjs';
import {sceneDirection,narrativeCost} from '../src/design/art-direction.mjs';
import {describeCandidate,compositions as allCompositions} from '../src/design/compositions.mjs';
import {checkRender} from '../src/quality/render-checks.mjs';
import {renderBaseline} from './render-baseline.mjs';
/** Markup helpers: a balanced element slice, its text, and the regions of one scene section. */
const element=(markup,open)=>{const at=markup.search(open);if(at<0)return null;const m=markup.slice(at).match(/^<(\w+)/),tag=m[1],re=new RegExp(`<${tag}(\\s[^>]*)?>|</${tag}>`,'g');re.lastIndex=markup.slice(at).indexOf('>')+1;let depth=1,x,rest=markup.slice(at);while(depth&&(x=re.exec(rest)))depth+=x[0][1]==='/'?-1:1;return depth?null:rest.slice(0,re.lastIndex);};
const textOf=html=>html.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const regionsOf=markup=>{const out=[],re=/<div id="(r[a-f0-9]+)" class="region" data-block-id="([^"]+)" data-component="([^"]+)"([^>]*)>/g;let m;while((m=re.exec(markup))){const html=element(markup.slice(m.index),/^<div/);out.push({nodeId:m[1],blockId:m[2],component:m[3],attrs:m[4],html,text:textOf(html),links:[...html.matchAll(/href="([^"]*)"/g)].map(x=>({href:x[1].replace(/&amp;/g,'&')})),images:[...html.matchAll(/<img /g)].map(()=>({ready:true}))});}return out;};
const legacyProjects=async()=>[await familyProject('en',home),await familyProject('zh-CN',home),await evidenceProject('en'),await evidenceProject('zh-CN'),await blueprintProject('en'),await blueprintProject('zh-CN'),chartKindsProject('en'),await releaseProject('gallery','en',home),await releaseProject('gallery','zh-CN',home)];
const applyNegative=(fixture,c)=>{const {document,plan,assets}=structuredClone(fixture),p={document,plan,assets};for(const [path,value]of Object.entries(c.set)){const keys=path.split('.');let o=p;for(const k of keys.slice(0,-1))o=o[/^\d+$/.test(k)?Number(k):k];o[keys.at(-1)]=structuredClone(value);}return p;};
const negativeCases=async tag=>{const n=JSON.parse(await readFile(new URL('./fixtures/visual/cine.negative.json',import.meta.url),'utf8'));return n.cases.filter(c=>c.task===tag);};

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

// ---- Task 4: CINE-002 reference presentation contract and markers ----
const sceneOf=(p,id)=>p.plan.scenes.find(s=>s.id===id);
test('CINE-002 markers: 1, 4 and 12 sources number by first appearance in deck order; the map is keyed by stable source id',async()=>{
 const p=await cineProject('en',home,{declared:['references']}),index=referenceIndex(p.document,p.plan);
 assert.equal(index.get('src-field'),1);assert.equal(index.get('src-product'),2);assert.equal(index.get('src-lab'),3);assert.equal(index.get('src-mechanism'),4);
 for(let i=1;i<=12;i++)assert.equal(index.get(`src-ev-${String(i).padStart(2,'0')}`),4+i);assert.equal(index.get('src-interview'),17);
 assert.equal(index.size,17);assert.deepEqual([...index.values()],[...index.values()].sort((a,b)=>a-b));
 const markers=id=>sceneReferences(p.document,p.plan,sceneOf(p,id)).strip.map(s=>s.marker);
 assert.deepEqual(markers('context'),[1]);assert.deepEqual(markers('overflow'),[1,2,3,4]);assert.deepEqual(markers('evidence'),Array.from({length:12},(_,i)=>5+i));
 const zh=await cineProject('zh-CN',home,{declared:['references']});assert.deepEqual([...referenceIndex(zh.document,zh.plan)],[...index]);
});
test('CINE-002 sceneReferences: compact keeps the quote attribution as a region and sends the other citations to the strip; expanded keeps all; source-is-subject flags subject',async()=>{
 assert.deepEqual(REFERENCE_MODES,['expanded','compact','source-is-subject']);
 const p=await cineProject('en',home,{declared:['references']});
 const q=sceneReferences(p.document,p.plan,sceneOf(p,'quote'));assert.equal(q.mode,'compact');assert.deepEqual(q.strip,[]);assert.deepEqual(q.regions,['q-attrib']);assert.equal(q.subject,false);
 assert.deepEqual(q.claims,[{blockId:'q-title',markers:[17]},{blockId:'q-para',markers:[17]}],'the quotation itself is attributed by its citation, not by a marker');
 const ev=sceneReferences(p.document,p.plan,sceneOf(p,'evidence'));assert.equal(ev.strip.length,12);assert.deepEqual(ev.regions,[]);
 assert.deepEqual(ev.strip[0],{marker:5,blockId:'ev-source-01',sourceId:'src-ev-01',text:'Illustrative source 01',title:p.document.sources.find(s=>s.id==='src-ev-01').title,url:p.document.sources.find(s=>s.id==='src-ev-01').url});
 assert.deepEqual(ev.claims.find(c=>c.blockId==='ev-chart-a'),{blockId:'ev-chart-a',markers:[5]});assert.deepEqual(ev.claims.find(c=>c.blockId==='ev-body'),{blockId:'ev-body',markers:[7]});
 assert.deepEqual(ev.claims.map(c=>c.blockId),['ev-title','ev-chart-a','ev-chart-b','ev-body','ev-qualifier']);
 const ctx=sceneReferences(p.document,p.plan,sceneOf(p,'context'));assert.deepEqual(ctx.claims.map(c=>[c.blockId,c.markers]),[['ctx-title',[1]],['ctx-image',[1]],['ctx-body',[1]]]);
 // A page with several sources on one claim lists them in marker order.
 const pr=sceneReferences(p.document,p.plan,sceneOf(p,'product'));assert.deepEqual(pr.claims.find(c=>c.blockId==='prod-callout').markers,[2,3]);assert.deepEqual(pr.strip.map(s=>s.blockId),['prod-source-1','prod-source-2']);
 const legacy=await cineProject('en',home,{declared:[]}),ex=sceneReferences(legacy.document,legacy.plan,sceneOf(legacy,'evidence'));
 assert.equal(ex.mode,'expanded');assert.deepEqual(ex.strip,[]);assert.equal(ex.regions.length,12);assert.deepEqual(ex.claims,[],'expanded pages carry no markers: today\'s rendering');
 const subject=structuredClone(p);sceneOf(subject,'evidence').references={mode:'source-is-subject'};const sj=sceneReferences(subject.document,subject.plan,sceneOf(subject,'evidence'));
 assert.equal(sj.mode,'source-is-subject');assert.equal(sj.subject,true);assert.deepEqual(sj.strip,[]);assert.equal(sj.regions.length,12);assert.deepEqual(sj.claims,[]);
 for(const s of p.plan.scenes)assertReferences(p.document,s);
});
test('CINE-002 contract: references.mode outside the enum, or a quote page whose attribution would leave the page, is refused with INVALID_DESIGN_PLAN; legacy fixtures validate unchanged',async()=>{
 const refs=designPlanSchema.properties.scenes.items.properties.references;assert.deepEqual(refs.properties.mode.enum,REFERENCE_MODES);assert.deepEqual(refs.required,['mode']);assert.equal(refs.additionalProperties,false);
 const fields=presentationSchema.properties.authorOverrides.properties.sceneLocks.items.properties.fields.items.enum;assert.deepEqual(fields.slice(fields.indexOf('profile')),['profile','references','intent','media']);
 const fixture=JSON.parse(await readFile(new URL('./fixtures/visual/cine.en.json',import.meta.url),'utf8'));
 const bad=applyNegative(fixture,{set:{'plan.scenes.6.references':{mode:'tight'}}});assert.throws(()=>createVisualProject(bad.document,bad.plan,{id:'x',assets:bad.assets}),e=>e.code==='INVALID_DESIGN_PLAN');
 const leave=applyNegative(fixture,{set:{'plan.scenes.8.blockIds':['lh-title','lh-body','lh-source','q-quote'],'plan.scenes.8.references':{mode:'compact'}}});
 assert.throws(()=>createVisualProject(leave.document,leave.plan,{id:'x',assets:leave.assets}),e=>e.code==='INVALID_DESIGN_PLAN'&&/attribut/i.test(e.message));
 const cases=await negativeCases('references');assert.ok(cases.length>=4);
 for(const c of cases){const b=applyNegative(fixture,c);assert.throws(()=>createVisualProject(b.document,b.plan,{id:'negative',assets:b.assets}),e=>e.code===(c.code||'INVALID_DESIGN_PLAN'),c.why);}
 // A references lock is accepted; every legacy fixture validates untouched.
 const locked=structuredClone(fixture);locked.document.authorOverrides.sceneLocks.push({sceneId:'quote',fields:['references']});createVisualProject(locked.document,locked.plan,{id:'locked',assets:locked.assets});
 for(const p of await legacyProjects()){assertReferences(p.document,p.plan.scenes[0]);for(const s of p.plan.scenes)assert.equal('references' in s,false);}
});

// ---- Task 5: CINE-002 compact source strip, reference panel and claim markers in the web renderer ----
const sectionOf=(out,id)=>out.sceneMarkup[out.scenes.findIndex(s=>s.id===id)];
test('CINE-002 web: the evidence page shows 12 markers in a strip under 48 px of CSS height budget, every exact citation text, a panel with 12 full titles and URLs, and no citation region inside .regions',async()=>{
 assert.equal(WEB_RENDERER_VERSION,'visual-art-direction.13');
 const p=await cineProject('en',home,{declared:['references']}),resources=await visualAssetResources(p,home),out=html(p,resources),ev=sectionOf(out,'evidence');
 const regions=element(ev,/<div class="regions">/),strip=element(ev,/<footer class="source-strip"/),panel=element(ev,/<details class="reference-panel"/);
 assert.ok(strip&&panel);assert.match(strip,/^<footer class="source-strip" aria-label="Sources">/);assert.ok(ev.indexOf(regions)<ev.indexOf(strip),'the strip follows the regions');
 assert.equal((regions.match(/data-component="citation"/g)||[]).length,0);
 const items=regionsOf(strip).filter(r=>r.component==='citation');assert.equal(items.length,12);
 for(const [k,r] of items.entries()){assert.ok(r.attrs.includes('data-reference="compact"'));assert.ok(r.attrs.includes('data-text-role="caption"'));assert.equal(r.text,`[${5+k}] Illustrative source ${String(k+1).padStart(2,'0')}`);assert.equal(r.links[0].href,p.document.sources.find(s=>s.id===`src-ev-${String(k+1).padStart(2,'0')}`).url);}
 assert.equal((panel.match(/<li id="evidence-ref-\d+">/g)||[]).length,12);assert.ok(panel.startsWith('<details class="reference-panel"><summary>Sources · 12</summary><ol>'));assert.equal(panel.includes('data-block-id'),false);
 for(const src of p.document.sources.filter(s=>s.id.startsWith('src-ev-'))){assert.ok(panel.includes(src.title),src.id);assert.ok(panel.includes(`<a href="${src.url}" rel="noreferrer">${src.url}</a>`),src.id);}
 const ids=[...ev.matchAll(/<li id="evidence-ref-(\d+)">/g)].map(m=>Number(m[1]));assert.deepEqual(ids,Array.from({length:12},(_,i)=>5+i));
 // Back links from the panel to the claim regions that cite each source.
 const claimRegion=out.scenes.find(s=>s.id==='evidence').regions.find(r=>r.blockId==='ev-chart-a').id;assert.ok(panel.includes(`<a href="#${claimRegion}">↩</a>`));
 // The stylesheet declares the strip (height budget, no grid reflow) and the markers once.
 for(const rule of ['.web-scene .source-strip{--strip-budget:48px;margin-top:auto;display:flex;flex-wrap:wrap;','.web-scene .source-strip .region[data-component=citation]{margin:0;padding:0;border:0;grid-column:auto','.reference-panel{','.web-scene .source-marker{font-size:.6em;vertical-align:super;color:var(--reference,inherit)'])assert.ok(artDirectionCSS.includes(rule),rule);
 assert.equal(artDirectionCSS.includes('text-overflow:ellipsis'),false,'no clipping creates a fit');
 assert.deepEqual(webSceneSchema.properties.regions.items.properties.reference.enum,['compact','expanded','subject']);
 const zh=html(await cineProject('zh-CN',home,{declared:['references']}),resources);assert.ok(sectionOf(zh,'evidence').includes('<footer class="source-strip" aria-label="来源">'));assert.ok(sectionOf(zh,'evidence').includes('<summary>来源 · 12</summary>'));
});
test('CINE-002 web: long URLs do not appear in the strip; the strip region count equals the citations not attributing a quote',async()=>{
 const p=await cineProject('en',home,{declared:['references']}),resources=await visualAssetResources(p,home),out=html(p,resources);
 const strip=element(sectionOf(out,'evidence'),/<footer class="source-strip"/),items=regionsOf(strip);
 for(const src of p.document.sources)assert.equal(items.some(r=>r.text.includes(src.url)),false);
 for(const id of ['context','product','evidence','overflow','quote']){const scene=sceneOf(p,id),refs=sceneReferences(p.document,p.plan,scene),section=sectionOf(out,id),strip=element(section,/<footer class="source-strip"/);
  assert.equal(strip?regionsOf(strip).length:0,refs.strip.length,id);assert.equal((element(section,/<div class="regions">/).match(/data-component="citation"/g)||[]).length,refs.regions.length,id);}
 // Every citation region keeps its block id and exact text, in the strip or in the composition.
 const quote=sectionOf(out,'quote');assert.equal(element(quote,/<footer class="source-strip"/),null,'a page with only an attribution has no strip');
 const regs=regionsOf(sectionOf(out,'overflow'));assert.deepEqual(regs.filter(r=>r.component==='citation').map(r=>r.blockId),['of-source-1','of-source-2','of-source-3','of-source-4']);
});
test('CINE-002 web: claim markers match sceneReferences.claims; the quote page keeps its attribution beside the quote (data-reference absent)',async()=>{
 const p=await cineProject('en',home,{declared:['references']}),resources=await visualAssetResources(p,home),out=html(p,resources);
 for(const id of ['context','product','evidence','overflow','quote','long-heading']){const refs=sceneReferences(p.document,p.plan,sceneOf(p,id)),regs=regionsOf(element(sectionOf(out,id),/<div class="regions">/));
  for(const r of regs){const claim=refs.claims.find(c=>c.blockId===r.blockId),marks=[...r.html.matchAll(/<sup class="source-marker">([^<]*)<\/sup>/g)].map(m=>m[1]);
   if(claim)assert.deepEqual(marks,[claim.markers.map(n=>`[${n}]`).join('')],`${id}/${r.blockId}`);else assert.deepEqual(marks,[],`${id}/${r.blockId}`);}}
 const q=regionsOf(element(sectionOf(out,'quote'),/<div class="regions">/)),attrib=q.find(r=>r.blockId==='q-attrib'),quote=q.find(r=>r.blockId==='q-quote');
 assert.ok(attrib&&!attrib.attrs.includes('data-reference'));assert.equal(q.indexOf(attrib),q.indexOf(quote)+1,'the attribution follows its quotation');assert.equal(attrib.text,'Reviewer, illustrative interview · Illustrative interview · synthetic, not a real person');
 // The chart marker sits in the chart notes line; the image marker in its caption; the heading marker inside the h2.
 const ev=regionsOf(element(sectionOf(out,'evidence'),/<div class="regions">/));assert.match(ev.find(r=>r.blockId==='ev-chart-a').html,/<ul class="chart-notes">[\s\S]*<li class="source-marker-note"><sup class="source-marker">\[5\]<\/sup><\/li><\/ul>/);
 assert.match(ev.find(r=>r.blockId==='ev-title').html,/ <sup class="source-marker">\[5\]<\/sup><\/h2>/);
 const ctx=regionsOf(element(sectionOf(out,'context'),/<div class="regions">/));assert.match(ctx.find(r=>r.blockId==='ctx-image').html,/ <sup class="source-marker">\[1\]<\/sup><\/figcaption>/);
 // Source-is-subject: every citation stays a region, flagged subject, no markers.
 const subject=structuredClone(p);sceneOf(subject,'evidence').references={mode:'source-is-subject'};const sj=regionsOf(element(sectionOf(html(subject,resources),'evidence'),/<div class="regions">/));
 assert.equal(sj.filter(r=>r.component==='citation'&&r.attrs.includes('data-reference="subject"')).length,12);assert.equal(sj.some(r=>r.html.includes('source-marker')),false);
});
test('CINE-002 web: checkRender passes text and source coverage on the compact corpus from a synthetic observation',async()=>{
 for(const locale of ['en','zh-CN']){const p=await cineProject(locale,home,{declared:['references']}),resources=await visualAssetResources(p,home),out=html(p,resources);
  const observation={viewport:{width:1440},fit:{viewport:{width:1440},checks:[]},fontStatus:'loaded',documentOverflow:false,sourceLinks:[...out.body.matchAll(/href="([^"]*)"/g)].map(m=>m[1].replace(/&amp;/g,'&')),dom:'',scenes:out.scenes.map((s,i)=>({sceneId:s.id,composition:s.composition,bounds:{x:0,y:0,width:1440,height:810},regions:regionsOf(out.sceneMarkup[i]),disclosed:[]}))};
  const r=checkRender(p,[observation]);assert.deepEqual(r.issues.filter(i=>['text-coverage','source-coverage','coverage','missing-asset'].includes(i.kind)),[]);assert.equal(r.ok,true);
  assert.equal(r.coverage.filter(c=>c.sources.length).every(c=>c.sources.every(s=>s.present&&s.rendered)),true);}
});
test('CINE-002 web: a legacy deck renders the same markup except the renderer version (tests/render-baseline.mjs parts: markup unchanged)',async()=>{
 const baseline=JSON.parse(await readFile(new URL('./fixtures/visual/render-baseline.json',import.meta.url),'utf8')),current=await renderBaseline();
 assert.equal(current.renderer,'visual-art-direction.13');
 // The content view (markup without the stylesheet, the render hash and the scene source hashes, which carry the renderer version) is byte-identical on every recorded fixture and demo; the runtime data and the player too.
 assert.deepEqual(current.content,baseline.content);
 assert.deepEqual(Object.fromEntries(Object.entries(current.parts).map(([k,v])=>[k,v.data])),Object.fromEntries(Object.entries(baseline.parts).map(([k,v])=>[k,v.data])));
 assert.deepEqual(current.player,baseline.player);
 // The legacy corpus (no references field) has no strip, no panel and no marker in any page.
 const p=await cineProject('en',home,{declared:[]}),out=html(p,await visualAssetResources(p,home));
 for(const m of out.sceneMarkup){assert.equal(m.includes('source-strip'),false);assert.equal(m.includes('reference-panel'),false);assert.equal(m.includes('source-marker'),false);assert.equal(m.includes('data-reference'),false);}
 assert.equal(out.scenes.some(s=>s.regions.some(r=>'reference' in r)),false);
});

// ---- Task 6: CINE-002 markers in PowerPoint notes and the PDF appendix; reorder stability ----
const evSources=p=>p.document.sources.filter(s=>s.id.startsWith('src-ev-'));
test('CINE-002 exports: PowerPoint notes and the PDF appendix of the evidence page list all 12 markers with exact text, title and URL; the PDF page text contains every citation text',async()=>{
 const p=await cineProject('en',home,{declared:['references']}),resources=await visualAssetResources(p,home);
 const pptx=paged(p,'pptx',{resources}).out,pdf=paged(p,'pdf',{resources}).out;
 const reveal=pptx.report.delivery.reveal.find(r=>r.sceneId==='evidence');
 assert.deepEqual(reveal.sources.map(s=>[s.id,s.marker,s.citations]),evSources(p).map((s,i)=>[s.id,5+i,[`Illustrative source ${String(i+1).padStart(2,'0')}`]]));
 const notes=pptx.run.output.slides.filter(s=>s.sceneId==='evidence').flatMap(s=>s.notes);
 for(const [i,src] of evSources(p).entries())assert.ok(notes.includes(`· [${5+i}] Illustrative source ${String(i+1).padStart(2,'0')} — ${src.title} — ${src.url}`),src.id);
 const appendix=element(pdf.run.output.html,/<section class="dw-notes" aria-label="Notes 06 · evidence"/);assert.ok(appendix);
 for(const [i,src] of evSources(p).entries())assert.ok(appendix.includes(`<li>[${5+i}] Illustrative source ${String(i+1).padStart(2,'0')} · ${src.title} — <a href="${src.url}">${src.url}</a></li>`),src.id);
 const pages=[...pdf.run.output.html.matchAll(/<div class="dw-page"[\s\S]*?(?=<div class="dw-page"|<section class="dw-notes")/g)].map(m=>m[0]).filter(h=>h.includes('id="evidence"'));
 assert.ok(pages.length>=1);const text=textOf(pages.join(''));for(let i=1;i<=12;i++)assert.ok(text.includes(`Illustrative source ${String(i).padStart(2,'0')}`));
 assert.equal(pdf.report.check.status,'pass');assert.equal(pptx.report.check.sceneCheck.status,'pass');
 // A legacy deck keeps today's note and appendix lines: no marker words are added to a page without a references field.
 const legacy=await cineProject('en',home,{declared:[]}),lp=paged(legacy,'pptx',{resources}).out,ln=lp.run.output.slides.filter(s=>s.sceneId==='evidence').flatMap(s=>s.notes);
 assert.ok(ln.includes(`· ${evSources(p)[0].title} — ${evSources(p)[0].url}`));assert.equal(ln.some(l=>/^· \[\d+\]/.test(l)),false);
 const la=element(paged(legacy,'pdf',{resources}).out.run.output.html,/<section class="dw-notes" aria-label="Notes 06 · evidence"/);assert.equal(/<li>\[\d+\]/.test(la),false);
 assert.equal(lp.report.delivery.reveal.find(r=>r.sceneId==='evidence').sources[0].marker,5,'the reveal data still carries the marker');
});
test('CINE-002 reorder: after moveScene(evidence ↑) markers renumber by deck order, source ids and claim bindings are unchanged, and a reload of the saved project reproduces the same strip',async()=>{
 const p=await cineProject('en',home,{declared:['references']}),before=sceneReferences(p.document,p.plan,sceneOf(p,'evidence'));
 const moved=moveScene(p,'evidence',-1);assert.deepEqual(moved.plan.scenes.map(s=>s.id).slice(3,6),['detail','evidence','mechanism']);
 const index=referenceIndex(moved.document,moved.plan),after=sceneReferences(moved.document,moved.plan,sceneOf(moved,'evidence'));
 assert.deepEqual(after.strip.map(s=>s.marker),Array.from({length:12},(_,i)=>4+i));assert.equal(index.get('src-mechanism'),16);assert.equal(index.get('src-interview'),17);
 assert.deepEqual(after.strip.map(s=>[s.blockId,s.sourceId,s.text]),before.strip.map(s=>[s.blockId,s.sourceId,s.text]));
 assert.deepEqual(after.claims.map(c=>c.blockId),before.claims.map(c=>c.blockId));assert.deepEqual(after.claims.map(c=>c.markers.map(n=>n+1)),before.claims.map(c=>c.markers),'every marker of the moved page is one lower; bindings are the same');
 assert.deepEqual(moved.document.sources,p.document.sources);assert.deepEqual(moved.document.blocks,p.document.blocks);
 const reloaded=createVisualProject(JSON.parse(JSON.stringify(moved.document)),JSON.parse(JSON.stringify(moved.plan)),{assets:moved.assets,id:moved.id});
 assert.deepEqual(sceneReferences(reloaded.document,reloaded.plan,sceneOf(reloaded,'evidence')),after);
 const resources=await visualAssetResources(moved,home),out=html(moved,resources),strip=element(sectionOf(out,'evidence'),/<footer class="source-strip"/);
 assert.deepEqual(regionsOf(strip).map(r=>r.text),after.strip.map(s=>`[${s.marker}] ${s.text}`));
 const mech=regionsOf(element(sectionOf(out,'mechanism'),/<div class="regions">/));assert.equal(mech.some(r=>r.html.includes('source-marker')),false,'a page without a references field carries no markers after the move');
});
test('CINE-002 review focus: a compact page whose only citation attributes a quotation exports the attribution with the quote, not in the strip',async()=>{
 const p=await cineProject('en',home,{declared:['references']}),resources=await visualAssetResources(p,home),pptx=paged(p,'pptx',{resources}).out,pdf=paged(p,'pdf',{resources}).out;
 const slide=pptx.run.output.slides.find(s=>s.sceneId==='quote'),attrib=slide.elements.filter(e=>e.blockId==='q-attrib'&&e.kind==='text'),quote=slide.elements.find(e=>e.blockId==='q-quote');
 assert.equal(attrib.length,1);assert.equal(attrib[0].text,'Reviewer, illustrative interview');assert.ok(attrib[0].box.y>=quote.box.y+quote.box.height-1,'the attribution sits under its quotation');
 const reveal=pptx.report.delivery.reveal.find(r=>r.sceneId==='quote');assert.deepEqual(reveal.sources.map(s=>[s.id,s.marker,s.citations]),[['src-interview',17,['Reviewer, illustrative interview']]]);
 assert.ok(slide.notes.includes(`· [17] Reviewer, illustrative interview — ${p.document.sources.find(s=>s.id==='src-interview').title} — https://example.org/deckweft/cine/interview`));
 const page=[...pdf.run.output.html.matchAll(/<div class="dw-page"[\s\S]*?(?=<div class="dw-page"|<section class="dw-notes")/g)].map(m=>m[0]).find(h=>h.includes('id="quote"'));
 assert.equal(page.includes('source-strip'),false);const regs=regionsOf(element(page,/<div class="regions">/));assert.equal(regs.findIndex(r=>r.blockId==='q-attrib'),regs.findIndex(r=>r.blockId==='q-quote')+1);
});
test('CINE-001 regression: a paged image-first page whose heading is not in the first band repeats the heading on that band too, so every part has a slide title',async()=>{
 const p=await cineProject('en',home,{declared:[]}),resources=await visualAssetResources(p,home),{out,layout}=paged(p,'pptx',{resources});
 const parts=out.run.output.slides.filter(s=>s.sceneId==='detail');assert.ok(parts.length>=2,'the synthetic image-left page is paged');
 const k=p.plan.scenes.findIndex(s=>s.id==='detail'),title=layout.scenes[k].regions.find(r=>r.blockId==='det-title').texts[0];
 assert.ok(title.box.y>parts[0].elements.filter(e=>e.kind==='picture')[0].box.y,'the heading follows the first image in the measured order');
 for(const part of parts){const titles=part.elements.filter(e=>e.kind==='title');assert.equal(titles.length,1,`part ${part.part} has one title`);assert.ok(titles[0].text.startsWith('Closer: the seam and the latch'));}
 assert.equal(out.report.check.accessibility.status,'pass');
 const pdf=paged(p,'pdf',{resources}).out,pages=pdf.run.output.pages.filter(x=>x.sceneId==='detail');assert.equal(pages.length,parts.length);
 assert.ok(pages[0].strip>0,'the first PDF page reserves the strip because its band lacks the heading');
});

// ---- Task 7: CINE-003 visual intent contract and inference ----
test('CINE-003 inference: every corpus page without an authored intent infers the purpose and entry in this table; every existing fixture infers without throwing',async()=>{
 assert.deepEqual(VISUAL_PURPOSES,['explain','show-product','show-detail','compare','evidence','overview','chapter']);assert.deepEqual(ENTRIES,['left','center','contextual']);
 assert.deepEqual(CENTERED_COMPOSITIONS,['statement-center','quote-center','closing-focus','small-multiples-center','stage-chapter','violet-chapter','diagonal-cover']);
 assert.deepEqual(CONTEXTUAL_COMPOSITIONS,['chapter-low','chapter-index','chapter-margin','metric-band','stage-hero','process-stair','comparison-stack','atlas-cover','fieldnotes-cover']);
 const p=await cineProject('en',home,{declared:[]}),n=p.plan.scenes.length;
 const table={context:['chapter','left'],product:['show-product','left'],'product-center':['show-product','left'],detail:['show-product','left'],mechanism:['overview','left'],evidence:['evidence','left'],quote:['explain','left'],overflow:['explain','left'],'long-heading':['explain','left'],action:['chapter','left']};
 for(const [i,s] of p.plan.scenes.entries()){const it=inferIntent(p.document,s,i,n);assert.deepEqual([it.purpose,it.entry],table[s.id],s.id);assert.equal(it.inferred,true);assert.deepEqual(effectiveIntent(p.document,p.plan,i),it);}
 // Authored wins; an authored intent is reported as not inferred.
 const authored=await cineProject('en',home,{declared:['intent']});
 assert.deepEqual(effectiveIntent(authored.document,authored.plan,0),{purpose:'explain',entry:'left',inferred:false});assert.deepEqual(effectiveIntent(authored.document,authored.plan,2),{purpose:'show-product',entry:'center',inferred:false});
 assert.deepEqual(effectiveIntent(authored.document,authored.plan,9),{purpose:'chapter',entry:'contextual',inferred:false});assert.equal(effectiveIntent(authored.document,authored.plan,6).inferred,true,'the quote page declares no intent');
 // Composition-driven entries and the remaining purpose rules.
 const centred=structuredClone(p);sceneOf(centred,'long-heading').composition='statement-center';assert.equal(inferIntent(centred.document,sceneOf(centred,'long-heading'),8,n).entry,'center');
 const ctx=structuredClone(p);sceneOf(ctx,'action').composition='closing-focus';assert.equal(inferIntent(ctx.document,sceneOf(ctx,'action'),9,n).entry,'center');
 const chapter=structuredClone(p);sceneOf(chapter,'long-heading').composition='chapter-low';sceneOf(chapter,'long-heading').blockIds=['lh-title','lh-body','lh-source'];assert.deepEqual([inferIntent(chapter.document,sceneOf(chapter,'long-heading'),8,n).purpose,inferIntent(chapter.document,sceneOf(chapter,'long-heading'),8,n).entry],['chapter','contextual']);
 for(const q of await legacyProjects())for(const [i,s] of q.plan.scenes.entries()){const it=inferIntent(q.document,s,i,q.plan.scenes.length);assert.ok(VISUAL_PURPOSES.includes(it.purpose)&&ENTRIES.includes(it.entry),`${q.id}/${s.id}`);}
 const g=(await legacyProjects())[7],by=Object.fromEntries(g.plan.scenes.map((s,i)=>[s.id,inferIntent(g.document,s,i,g.plan.scenes.length).purpose]));
 assert.equal(by[g.plan.scenes[0].id],'chapter');assert.equal(by[g.plan.scenes.at(-1).id],'chapter');assert.equal(by['ev-photo'],'show-product');assert.equal(by['dd-trend'],'evidence');assert.equal(by['cc-timeline'],'explain');
 const fam=(await legacyProjects())[0],fb=Object.fromEntries(fam.plan.scenes.map((s,i)=>[s.id,inferIntent(fam.document,s,i,fam.plan.scenes.length)]));assert.deepEqual([fb['before-after'].purpose,fb['system-map'].purpose,fb['chapter'].entry],['compare','overview','contextual']);
});
test('CINE-003 contract: focus group must contain the focal block; a citation focal block with a declared intent is refused; legacy fixtures validate',async()=>{
 const intent=designPlanSchema.properties.scenes.items.properties.intent;assert.deepEqual(intent.required,['purpose','entry']);assert.deepEqual(intent.properties.purpose.enum,VISUAL_PURPOSES);assert.deepEqual(intent.properties.entry.enum,ENTRIES);assert.equal(intent.additionalProperties,false);
 assert.equal(intent.properties.focusGroupBlockIds.maxItems,6);assert.equal(intent.properties.emptyRegions.maxItems,4);
 const fixture=JSON.parse(await readFile(new URL('./fixtures/visual/cine.en.json',import.meta.url),'utf8')),ok=c=>{const b=applyNegative(fixture,c);return createVisualProject(b.document,b.plan,{id:'ok',assets:b.assets});};
 ok({set:{'plan.scenes.1.intent':{purpose:'show-product',entry:'left',focusGroupBlockIds:['prod-title','prod-image'],emptyRegions:[{x:0,y:.7,width:1,height:.3}]}}});
 for(const c of await negativeCases('intent')){const b=applyNegative(fixture,c);assert.throws(()=>createVisualProject(b.document,b.plan,{id:'negative',assets:b.assets}),e=>e.code===(c.code||'INVALID_DESIGN_PLAN'),c.why);}
 assert.ok((await negativeCases('intent')).length>=7);
 const p=await cineProject('en',home,{declared:['intent']});for(const s of p.plan.scenes)assertIntent(p.document,s);
 // The focal block may be a citation only while no intent is declared.
 const cite=structuredClone(fixture);cite.plan.scenes[0].focalBlockId='ctx-source';createVisualProject(cite.document,cite.plan,{id:'cite',assets:cite.assets});
 cite.plan.scenes[0].intent={purpose:'explain',entry:'left'};assert.throws(()=>createVisualProject(cite.document,cite.plan,{id:'cite',assets:cite.assets}),e=>e.code==='INVALID_DESIGN_PLAN'&&/citation/.test(e.message));
 const locked=structuredClone(fixture);locked.document.authorOverrides.sceneLocks.push({sceneId:'product','fields':['intent']});createVisualProject(locked.document,locked.plan,{id:'locked',assets:locked.assets});
 for(const q of await legacyProjects())for(const s of q.plan.scenes){assert.equal('intent' in s,false);assertIntent(q.document,s);}
});
test('CINE-003 preferredVariant returns the mapped variant per purpose and family and null for unlisted families',()=>{
 const t=(purpose,family)=>preferredVariant({purpose,entry:'left'},family);
 assert.equal(t('explain','process'),'process-rail');assert.equal(t('explain','system-map'),'system-map-rail');assert.equal(t('explain','evidence'),'evidence-left');assert.equal(t('explain','statement'),'statement-split');assert.equal(t('explain','image'),'image-left');
 assert.equal(t('show-product','image'),'image-right');assert.equal(t('show-product','metric'),'metric-right');assert.equal(t('show-product','statement'),'statement-split');
 assert.equal(t('show-detail','image'),'image-left');assert.equal(t('show-detail','before-after'),'before-after-split');
 assert.equal(t('compare','comparison'),'comparison-matrix');assert.equal(t('compare','before-after'),'before-after-split');assert.equal(t('compare','small-multiples'),'small-multiples-row');
 assert.equal(t('evidence','evidence'),'evidence-left');assert.equal(t('evidence','small-multiples'),'small-multiples-row');assert.equal(t('evidence','metric'),'metric-left');
 assert.equal(t('overview','system-map'),'system-map-wide');assert.equal(t('overview','process'),'process-line');
 assert.equal(t('chapter','chapter'),'chapter-low');assert.equal(t('chapter','statement'),'statement-center');assert.equal(t('chapter','closing'),'closing-focus');assert.equal(t('chapter','quote'),'quote-center');
 for(const [purpose,family] of [['explain','quote'],['show-product','chart'],['compare','image'],['evidence','chapter'],['overview','image'],['chapter','image'],['show-detail','evidence']])assert.equal(t(purpose,family),null,`${purpose}/${family}`);
 assert.equal(preferredVariant(null,'image'),null);assert.equal(preferredVariant({purpose:'elsewhere',entry:'left'},'image'),null);
});

// ---- Task 8: CINE-003 intent in art direction, markup and rhythm preference ----
test('CINE-003 direction: a six-block text page with a left entry is data-space=structured; the same page with entry center is open; an image page is never open',async()=>{
 const legacy=await cineProject('en',home,{declared:[]}),i=legacy.plan.scenes.findIndex(s=>s.id==='long-heading');
 assert.equal(sceneDirection(legacy.document,legacy.plan,i).sparse,true,'today: a short text page without a declared intent is open');
 assert.deepEqual(sceneDirection(legacy.document,legacy.plan,i).intent,{purpose:'explain',entry:'left',inferred:true});
 const left=structuredClone(legacy);sceneOf(left,'long-heading').intent={purpose:'explain',entry:'left'};assert.equal(sceneDirection(left.document,left.plan,i).sparse,false);
 const centre=structuredClone(legacy);sceneOf(centre,'long-heading').intent={purpose:'explain',entry:'center'};assert.equal(sceneDirection(centre.document,centre.plan,i).sparse,true);
 // Six text blocks: heading, three paragraphs, two lists — structured on the left, open in the centre, in both languages.
 for(const locale of ['en','zh-CN']){const q=await cineProject(locale,home,{declared:[]}),s=sceneOf(q,'overflow');s.blockIds=['of-title','of-para-1','of-para-2','of-para-3','of-list-1','of-list-2'];s.intent={purpose:'explain',entry:'left'};const k=q.plan.scenes.indexOf(s);
  q.plan.scenes.push({...structuredClone(s),id:'overflow-centre',composition:'statement-center',intent:{purpose:'chapter',entry:'center'}});
  assert.equal(sceneDirection(q.document,q.plan,k).sparse,false);assert.equal(sceneDirection(q.document,q.plan,q.plan.scenes.length-1).sparse,true);}
 const image=structuredClone(legacy);sceneOf(image,'context').intent={purpose:'show-product',entry:'center'};assert.equal(sceneDirection(image.document,image.plan,0).sparse,false,'an image page is never open');
 const resources=await visualAssetResources(legacy,home),out=html(centre,resources);assert.ok(sectionOf(out,'long-heading').includes(' data-space="open"'));assert.ok(sectionOf(html(left,resources),'long-heading').includes(' data-space="structured"'));
 assert.ok(artDirectionCSS.includes('.web-scene[data-entry=left] .regions{align-content:start}'));assert.ok(artDirectionCSS.lastIndexOf('.web-scene[data-entry=left] .regions{align-content:start}')>artDirectionCSS.lastIndexOf('.web-scene.closing-focus'),'placed after every composition rule');
 assert.ok(artDirectionCSS.includes('.web-scene[data-space=open] .regions{align-content:center;min-height:500px}'),'[data-space=open] unchanged');
});
test('CINE-003 markup: sections carry data-purpose and data-entry; the corpus has at least one left, one center and one contextual page',async()=>{
 const p=await cineProject('en',home,{declared:['intent']}),resources=await visualAssetResources(p,home),out=html(p,resources);
 const attrs=out.sceneMarkup.map(m=>({purpose:m.match(/ data-purpose="([^"]+)"/)?.[1]??null,entry:m.match(/ data-entry="([^"]+)"/)?.[1]??null}));
 assert.deepEqual(attrs[0],{purpose:'explain',entry:'left'});assert.deepEqual(attrs[2],{purpose:'show-product',entry:'center'});assert.deepEqual(attrs[9],{purpose:'chapter',entry:'contextual'});
 for(const e of ['left','center','contextual'])assert.ok(attrs.some(a=>a.entry===e),e);
 assert.deepEqual(attrs[6],{purpose:null,entry:null},'a page without a declared intent carries no attribute, so legacy markup is unchanged');
 const legacy=html(await cineProject('en',home,{declared:[]}),resources);for(const m of legacy.sceneMarkup)assert.equal(/data-purpose|data-entry/.test(m),false);
});
test('CINE-003 rhythm: with intent show-product the image family prefers image-right (cost 0) and image-left costs 3; without intent the S6 phase table is unchanged for every existing fixture',async()=>{
 const scene={id:'x',role:'context',intent:{purpose:'show-product',entry:'left'}},d=id=>({family:'image',id});
 assert.equal(narrativeCost(scene,d('image-right'),1,10).cost,0);assert.equal(narrativeCost(scene,d('image-right'),1,10).preferred,'image-right');assert.equal(narrativeCost(scene,d('image-left'),1,10).cost,3);
 assert.equal(narrativeCost({...scene,intent:{purpose:'show-detail',entry:'left'}},d('image-left'),1,10).cost,0);
 // A family the purpose has no preference for keeps the S6 phase preference.
 assert.equal(narrativeCost({...scene,intent:{purpose:'show-product',entry:'left'}},{family:'quote',id:'quote-split'},1,10).preferred,'quote-split');
 // The S6 phase table, as it stands, for every scene of every legacy fixture and every variant of its family.
 const S6=(family,phase)=>({statement:phase==='closing'?'statement-center':phase==='opening'?'statement-split':'statement-banner',evidence:'evidence-top',metric:phase==='opening'?'metric-left':'metric-band',image:phase==='closing'?'image-strip':'image-left',comparison:'comparison-matrix',process:phase==='closing'?'process-line':'process-rail',chapter:phase==='opening'?'chapter-index':'chapter-low','before-after':'before-after-split','system-map':'system-map-wide','small-multiples':'small-multiples-row',quote:phase==='opening'||phase==='closing'?'quote-center':'quote-split',closing:phase==='closing'?'closing-focus':'closing-split'})[family];
 for(const q of await legacyProjects())for(const [i,s] of q.plan.scenes.entries()){const n=q.plan.scenes.length,phase=i===0?'opening':i===n-1?'closing':s.role,family=describeCandidate(q.document,s).family;
  for(const v of allCompositions.filter(c=>c.family===family)){const r=narrativeCost(s,{family,id:v.id},i,n);assert.equal(r.phase,phase);assert.equal(r.preferred,S6(family,phase)||v.id);assert.equal(r.cost,S6(family,phase)&&v.id!==S6(family,phase)?3:0,`${q.id}/${s.id}/${v.id}`);}}
});
