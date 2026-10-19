import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import schema from '../schemas/presentation-v3.schema.json' with {type:'json'};
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {zipFiles} from '../src/render/zip.mjs';
import {COMPONENT_LEVELS,LEVEL_FORMATS,documentLevels,presentationCapabilities} from '../src/targets/capabilities.mjs';
import {EXPORT_ORDER,exportRun} from '../src/targets/export-order.mjs';
import {STATIC_DELIVERY_RULES,staticStates,freezeViews,stopMotion,revealRequired} from '../src/targets/static-delivery.mjs';
import {readZip,parseXML,inspectPackage,auditPPTX} from '../src/targets/pptx/audit.mjs';
import {breakRuns,clipPath,blend} from '../src/targets/pptx/compile.mjs';
import {solid,gradFill,paragraph} from '../src/targets/pptx/ooxml.mjs';
import {crc32} from '../src/render/zip.mjs';
import {pptxChartPlan} from '../src/targets/pptx/fallbacks.mjs';
import {closedDisclosures,checkPdfText,checkPdfAccessibility,checkPrintJob} from '../src/targets/pdf/print.mjs';
import {exportReport,reportMarkdown,APPLICATION_CHECKS} from '../src/targets/pptx/compatibility-report.mjs';
import {syntheticLayout} from './export-layout.mjs';
import {evidenceProject} from './evidence-scene.mjs';
import {chartKindsProject} from './chart-kinds.mjs';
import {releaseProject} from './release-gate.mjs';

const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const html=(p,resources={})=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources});
/** Compiles one paged target from the synthetic layout (unit tests only; real runs measure a browser). */
function paged(p,target,{resources={},layout,rasters}={}){
 const h=html(p,resources),l=layout||syntheticLayout({...p,resources},h);
 return {html:h,layout:l,out:exportDeck(p.document,target,{experimentalWeb:true,plan:p.plan,assetResources:resources,layout:l,rasters:rasters||l3Rasters(p,l)})};
}
function l3Rasters(p,layout){return captures(p,layout);}
const captures=(p,layout)=>Object.fromEntries(presentationCapabilities('pptx',p.document).components.filter(c=>c.level==='L3').flatMap(c=>layout.scenes.filter(s=>s.regions.some(r=>r.blockId===c.blockId)).map(s=>[`${s.sceneId}/${c.blockId}/plot`,PNG])));
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s7-')));
test.after(()=>rm(home,{recursive:true,force:true}));

test('S7 levels: every v3 component declares a level in web, PDF and PowerPoint; charts resolve per kind and declaration',()=>{
 const types=Object.values(schema.$defs).map(d=>d.properties?.type?.const).filter(Boolean);
 assert.deepEqual(types.filter(t=>!COMPONENT_LEVELS[t]),[]);
 for(const t of types)for(const f of LEVEL_FORMATS)if(!(t==='chart'&&f==='pptx'))assert.match(COMPONENT_LEVELS[t][f][0],/^L[123]$/,`${t} ${f}`);
 const p=chartKindsProject('en'),levels=Object.fromEntries(documentLevels(p.document).filter(l=>l.component==='chart').map(l=>[l.blockId,l]));
 for(const l of Object.values(levels)){assert.equal(l.html.level,'L1');assert.equal(l.pdf.level,'L2');}
 // No native form, intervals (error bars are not compiled), log axes and missing values (an importer drew them wrongly) are images of the chart.
 for(const id of ['dot-interval-chart','dot-log-chart','small-multiples-chart','trend-chart','log-line-chart','ranked-truncated-chart','grouped-chart'])assert.equal(levels[id].pptx.level,'L3',id);
 for(const id of ['direct-bar-chart','filter-sort-chart','stacked-sorted-chart','area-truncated-chart','benchmark-chart'])assert.equal(levels[id].pptx.level,'L1',id);
 assert.match(levels['benchmark-chart'].pptx.representation,/native table/);
 const area=p.document.blocks.find(b=>b.id==='area-truncated-chart'),d=p.document.datasets.find(d=>d.id===area.datasetId);
 assert.deepEqual(pptxChartPlan(area,d).receipts.map(r=>r.code),['PPTX_CHART_BREAK_MARK']);
 assert.equal(presentationCapabilities('pdf',p.document).ok,true);assert.equal(presentationCapabilities('pptx',p.document).ok,true);
});

test('S7 export order: stages run only in the declared order',()=>{
 assert.deepEqual(EXPORT_ORDER,['ready','static-state','freeze','stop-motion','reveal','render','check']);
 const run=exportRun('pptx'),step=name=>run.stage(name,()=>({value:name,summary:{}}));
 assert.throws(()=>step('freeze'),{code:'EXPORT_ORDER'});
 for(const s of EXPORT_ORDER)assert.equal(step(s),s);
 assert.throws(()=>step('render'),{code:'EXPORT_ORDER'});
 assert.deepEqual(run.receipts.map(r=>r.stage),EXPORT_ORDER);
});

test('S7 ready stage: a measured layout of this render with loaded fonts, real glyphs and decoded images',async()=>{
 const p=await evidenceProject('en',{staticState:'opening'}),h=html(p),ok=syntheticLayout(p,h),go=layout=>exportDeck(p.document,'pptx',{experimentalWeb:true,plan:p.plan,layout});
 assert.throws(()=>go(undefined),{code:'EXPORT_LAYOUT_REQUIRED'});
 assert.throws(()=>go({...ok,renderHash:'0'.repeat(64)}),e=>e.code==='EXPORT_LAYOUT_INVALID'&&e.details.some(d=>d.code==='EXPORT_LAYOUT_STALE'));
 assert.throws(()=>go({...ok,viewport:{width:1024,height:768,dpr:1}}),e=>e.details.some(d=>d.code==='EXPORT_LAYOUT_VIEWPORT'));
 const missing=structuredClone(ok);missing.scenes[0].regions.pop();
 assert.throws(()=>go(missing),e=>e.details.some(d=>d.code==='EXPORT_LAYOUT_REGION'));
 assert.throws(()=>go(syntheticLayout(p,h,{fontStatus:'loading'})),e=>e.code==='EXPORT_NOT_READY'&&e.details.some(d=>d.code==='FONT_NOT_READY'));
 assert.throws(()=>go(syntheticLayout(p,h,{lastResort:true})),e=>e.code==='EXPORT_NOT_READY'&&e.details.some(d=>d.code==='FONT_GLYPH_MISSING'));
 // S8 (C13): the in-page glyph audit refuses the export even when no engine reports a last-resort font.
 assert.throws(()=>go(syntheticLayout(p,h,{missingGlyph:true})),e=>e.code==='EXPORT_NOT_READY'&&e.details.some(d=>d.code==='FONT_GLYPH_MISSING'&&/E000|\uE000/.test(d.message)));
 const out=go(ok);assert.deepEqual(out.report.order.map(r=>r.stage),EXPORT_ORDER);
 const g=await releaseProject('gallery','en',home),resources=await visualAssetResources(g,home);
 assert.throws(()=>exportDeck(g.document,'pdf',{experimentalWeb:true,plan:g.plan,assetResources:resources,layout:syntheticLayout({...g,resources},html(g,resources),{imageReady:false})}),e=>e.details.some(d=>d.code==='IMAGE_NOT_READY'));
});

test('S7 static delivery: author static state, frozen filters, stopped motion, revealed notes',async()=>{
 const p=await evidenceProject('en',{staticState:'opening'}),states=staticStates(p.document,p.plan),frozen=freezeViews(p.document,p.plan,states);
 assert.equal(states[0].declared,true);assert.equal(states[0].keyStateId,'opening');
 const chart=Object.values(frozen[0].charts)[0];assert.equal(chart.frozen,true);assert.ok(chart.state.seriesIds.length);
 assert.ok(frozen[0].interactions.every(i=>i.delivery&&i.rule));
 const motion=stopMotion(p.plan);assert.ok(motion.every(m=>m.durationMs===0&&m.loops===0&&m.random===0));assert.equal(motion[0].cuesNotPlayed,p.plan.scenes[0].cues.length);
 const reveal=revealRequired(p.document,p.plan,frozen),data=reveal[0].notes.find(n=>n.kind==='data'),d=p.document.datasets[0];
 for(const c of d.categories)assert.ok(data.lines.some(l=>l.startsWith(c)),c);
 assert.ok(reveal[0].sources.every(s=>/^https?:/.test(s.url)));
 const ids=STATIC_DELIVERY_RULES.map(r=>r.id);assert.deepEqual(ids,['staged-reveal','hover-fact','filter','legend','comparison','scroll-story','media','shared-element']);
 assert.ok(STATIC_DELIVERY_RULES.filter(r=>!r.v3.length).every(r=>r.absent));
});

test('VIS-016 PowerPoint: native text, tables, charts with embedded data, shapes, connectors, pictures and notes',async()=>{
 const g=await releaseProject('gallery','en',home),resources=await visualAssetResources(g,home),{out}=paged(g,'pptx',{resources}),a=out.report.check;
 assert.equal(out.extension,'pptx');assert.equal(out.mime,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
 assert.deepEqual([a.editability.status,a.sceneCheck.status,a.accessibility.status],['pass','pass','pass'],JSON.stringify([a.editability.failures,a.sceneCheck.failures,a.accessibility.failures]).slice(0,2000));
 // F1 (2026-10-19): the gallery's evidence page is 1292 px tall; at the whole-scene fit its body would be 8.4 pt, so it is paged into two slides.
 const pkg=inspectPackage(out.body);assert.deepEqual(pkg.errors,[]);assert.equal(pkg.slides.length,13);assert.deepEqual(out.run.output.pagination,[{sceneId:'ev-evidence',parts:2,reason:'paged'}]);
 assert.equal(Object.keys(pkg.charts).length,3);assert.ok(Object.values(pkg.charts).every(c=>c.workbook?.length));
 const shapes=pkg.slides.flatMap(s=>s.shapes),pictures=shapes.filter(s=>s.kind==='picture');
 assert.equal(pictures.filter(s=>s.name.endsWith('/image')).length,3);assert.deepEqual(pictures.filter(s=>!s.name.endsWith('/image')).map(s=>s.name),['trend-chart/chart-image'],'the trend has a missing value');assert.ok(pictures.every(s=>s.descr));
 assert.ok(shapes.some(s=>s.kind==='table'),'heatmap as a native table');assert.ok(shapes.filter(s=>s.kind==='connector').length>=6,'diagram connectors');
 assert.ok(pkg.slides.every(s=>!s.timing&&!s.transition&&s.shapes.some(x=>x.title)));
 const notes=pkg.slides.map(s=>s.notes).join('\n');assert.ok(notes.includes('https://example.org/deckweft/vis-014-synthetic'));assert.ok(notes.includes('2026-10-19T01:00:00Z'),'complete data with original time categories');
 const codes=new Set(out.report.receipts.map(r=>r.code));for(const c of ['PPTX_DISCLOSURE','PPTX_INTERACTION_STATIC','PPTX_MOTION_NOT_COMPILED','PPTX_CHART_IMAGE'])assert.ok(codes.has(c),c);
 assert.ok(out.report.receipts.every(r=>r.element&&r.reason&&r.delivered));
 // Same input, same bytes.
 assert.equal(paged(g,'pptx',{resources}).out.body.equals(out.body),true);
});

test('VIS-016 fallbacks: an L3 chart is an image of that chart with a summary; a missing capture fails the check',()=>{
 const p=chartKindsProject('en'),h=html(p),layout=syntheticLayout(p,h);
 const ok=exportDeck(p.document,'pptx',{experimentalWeb:true,plan:p.plan,layout,rasters:l3Rasters(p,layout)}),a=ok.report.check;
 assert.equal(a.editability.status,'pass',JSON.stringify(a.editability.failures));assert.equal(a.sceneCheck.status,'pass',JSON.stringify(a.sceneCheck.failures));
 const pics=inspectPackage(ok.body).slides.flatMap(s=>s.shapes.filter(x=>x.kind==='picture'));
 assert.equal(pics.length,7);assert.ok(pics.every(x=>x.name.endsWith('/chart-image')&&x.descr.length>20));
 assert.equal(ok.report.receipts.filter(r=>r.code==='PPTX_CHART_IMAGE').length,7);
 // A file that fails its own check is refused; the evidence run may keep it on purpose, with the failure in its report.
 assert.throws(()=>exportDeck(p.document,'pptx',{experimentalWeb:true,plan:p.plan,layout}),e=>e.code==='EXPORT_CHECK_FAILED'&&e.details.some(d=>d.check==='editability'));
 const bad=exportDeck(p.document,'pptx',{experimentalWeb:true,plan:p.plan,layout,allowFailedCheck:true});
 assert.equal(bad.report.check.editability.status,'fail');assert.ok(bad.report.receipts.some(r=>r.code==='PPTX_RASTER_MISSING'&&r.error));
});

test('VIS-016 check reads the bytes back: lost text, a slide-sized picture and motion are caught',async()=>{
 const g=await releaseProject('gallery','en',home),resources=await visualAssetResources(g,home),{out}=paged(g,'pptx',{resources}),files=readZip(out.body);
 const audit=bytes=>auditPPTX({bytes,document:g.document,plan:g.plan,scenes:compileWebScenes(g.document,g.plan),compiled:out.run.output,levels:out.run.levels});
 const tamper=(name,fn)=>zipFiles([...files].map(([n,b])=>[n,n===name?Buffer.from(fn(b.toString('utf8'))):b]));
 const lost=audit(tamper('ppt/slides/slide2.xml',x=>x.replace(/Twelve families,/g,'Eleven families,')));
 assert.ok(lost.sceneCheck.failures.some(f=>f.check==='text coverage'&&f.blockId==='metrics-title'));
 const pic=audit(tamper('ppt/slides/slide5.xml',x=>x.replace(/name="photo-image\/image"([\s\S]*?)<a:off x="\d+" y="\d+"\/><a:ext cx="\d+" cy="\d+"\/>/,'name="slide/screenshot"$1<a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/>')));
 assert.ok(pic.editability.failures.some(f=>f.check==='picture belongs to an element'));assert.ok(pic.editability.failures.some(f=>f.check==='no whole-slide picture'));
 const timed=audit(tamper('ppt/slides/slide1.xml',x=>x.replace('</p:sld>','<p:timing/></p:sld>')));
 assert.ok(timed.sceneCheck.failures.some(f=>f.check==='motion stopped'));
 assert.equal(audit(out.body).sceneCheck.status,'pass');
 assert.throws(()=>parseXML('<a><b></a></b>'),/Mismatched/);assert.throws(()=>parseXML('<a>'),/Unclosed/);
});

test('S7 PDF: one measured page per scene, disclosures kept closed, searchability and accessibility checks',()=>{
 const p=chartKindsProject('en'),{out}=paged(p,'pdf'),job=out.run.output;
 assert.equal(out.extension,'print.html');assert.equal(job.pages.length,p.plan.scenes.length);assert.equal(checkPrintJob(job,{plan:p.plan}).status,'pass');
 assert.equal(/<script\b/i.test(out.body),false);assert.ok(job.pages.every(pg=>pg.scale>0&&pg.scale<=1.05));assert.ok(out.body.includes('@page{size:1440px 810px'));
 assert.equal(closedDisclosures('<details><summary>View all data</summary><table></table></details><details open><summary>a</summary><p>b</p></details>'),'<details><summary>View all data</summary></details><details open><summary>a</summary><p>b</p></details>');
 assert.ok(job.appendix.length>0&&out.body.includes('dw-notes'));
 const expected=[{sceneId:'a',strings:['Widths: 1,440 px','٣٦ items','那一页。']}];
 assert.equal(checkPdfText(expected,{pages:[{text:'Widths: 1,440 px ٦٣ items 那一页。'}]}).status,'pass','right-to-left runs in visual order count');
 const radical=checkPdfText(expected,{pages:[{text:'Widths: 1,440 px ٣٦ items 那一⻚。'}]});
 assert.equal(radical.status,'partial');assert.equal(radical.radicalCodePoints.strings,1);
 assert.equal(checkPdfText(expected,{pages:[{text:'Widths: 1,440 px'}]}).status,'fail');
 const facts={tagged:true,marked:true,lang:'en',title:'T',figures:2,figuresWithAlt:2,groupingFiguresWithoutAlt:0};
 assert.equal(checkPdfAccessibility(facts,{locale:'en'}).status,'pass');
 assert.equal(checkPdfAccessibility({...facts,groupingFiguresWithoutAlt:3},{locale:'en'}).status,'partial');
 assert.equal(checkPdfAccessibility({...facts,figuresWithAlt:1},{locale:'en'}).status,'fail');
 assert.equal(checkPdfAccessibility({...facts,lang:'zh-CN'},{locale:'en'}).status,'fail');
});

test('S7 export report: levels, every receipt and five separate results (typography added by F1); applications only from runs',async()=>{
 const g=await releaseProject('gallery','en',home),resources=await visualAssetResources(g,home),pptx=paged(g,'pptx',{resources}).out,pdf=paged(g,'pdf',{resources}).out;
 const applications={powerpoint:{state:'installed, not run'},keynote:{state:'installed, not run'},libreoffice:{state:'not installed'},quickLook:{state:'not run'}};
 const r=exportReport({deck:'gallery-en',document:g.document,plan:g.plan,pptx:{run:pptx.run,inspection:null},pdf:{run:pdf.run,inspection:null,searchability:{status:'not-run'},accessibility:null},fidelity:null,environment:{},applications});
 assert.deepEqual(Object.keys(r.results),['pptxEditability','pdfSearchability','accessibility','visualFidelity','typography']);assert.ok(['pass','fail'].includes(r.results.typography.status));assert.match(reportMarkdown(r),/Typography \(presentable text size by role\)/);
 assert.equal(r.results.pdfSearchability.status,'not-run');assert.equal(r.results.visualFidelity.status,'not-run');assert.equal(r.results.accessibility.status,'partial');
 assert.equal(r.levels.length,g.document.blocks.length);assert.deepEqual(r.levelCounts.web,{L1:g.document.blocks.length,L2:0,L3:0});
 assert.equal(r.receipts.reduce((n,x)=>n+x.count,0),pptx.report.receipts.length);
 assert.equal(r.applicationChecks,APPLICATION_CHECKS);assert.equal(r.applications.powerpoint.state,'installed, not run');
 assert.equal(JSON.stringify(r).includes('ExportVerified'),false);
 const md=reportMarkdown(r);for(const s of ['PowerPoint editability','PDF searchability','Accessibility','Visual fidelity','| L1 |'])assert.ok(md.includes(s),s);
});

test('S7 compiler helpers: measured line breaks, clipped decoration, blended translucent paint',()=>{
 assert.deepEqual(breakRuns([{text:'Ship the whole story,\nnot the hero slide.'}],['Ship the whole','story,','not the hero slide.']).map(r=>r.text),['Ship the whole\nstory,\nnot the hero slide.']);
 assert.deepEqual(breakRuns([{text:'交付完整'},{text:'的故事'}],['交付完','整的故事']).map(r=>r.text),['交付完\n整','的故事']);
 assert.deepEqual(breakRuns([{text:'abc'}],['xyz','w']).map(r=>r.text),['abc'],'unknown lines leave the text alone');
 const square=[{c:'M',p:[[0,0]]},{c:'L',p:[[10,0]]},{c:'L',p:[[10,10]]},{c:'L',p:[[0,10]]},{c:'Z'}],half=clipPath(square,[[0,0],[5,0],[5,10],[0,10]]);
 assert.equal(half.at(-1).c,'Z');assert.ok(half.flatMap(c=>c.p||[]).every(([x])=>x<=5.0001));
 assert.deepEqual(blend({hex:'5114F6',alpha:.28},{hex:'FAF9F5',alpha:1}),{hex:'CBB9F5',alpha:1});
 assert.deepEqual(blend({hex:'5114F6',alpha:1},{hex:'FAF9F5',alpha:1}),{hex:'5114F6',alpha:1});
});

test('S7 review hardening: invalid paint, spans, unsupported paths, archives, prototype keys, nesting, numbering, workbook alignment, layout values',async()=>{
 // Paint: only six hex digits become a colour; a gradient stroke or a one-stop gradient never writes an invalid value.
 assert.equal(solid({gradient:{stops:[]},alpha:1}),'<a:noFill/>');assert.equal(solid({hex:'undefined',alpha:1}),'<a:noFill/>');
 assert.equal(gradFill({stops:[{offset:0,color:{hex:'112233',alpha:1}},{offset:1,color:null}],from:[0,0],to:[1,0]}),'<a:solidFill><a:srgbClr val="112233"></a:srgbClr></a:solidFill>');
 // Numbering follows the list style; a start below 1 is clamped.
 const f={pt:v=>v*.75,len:v=>v},style={fontFamily:'Arial',fontSize:20,fontWeight:400,color:{hex:'111111',alpha:1}},para=bullet=>paragraph([{text:'x',style}],{f,lang:'en-US',fonts:()=>null,bullet});
 assert.match(para({ordered:true,type:'lower-roman',index:0,indent:10}),/type="romanLcPeriod" startAt="1"/);assert.match(para({ordered:true,type:'upper-alpha',index:3,indent:10}),/alphaUcPeriod" startAt="3"/);
 // A link whose name is an Object.prototype key is not a relationship.
 assert.doesNotMatch(paragraph([{text:'x',style,href:'constructor'}],{f,lang:'en-US',fonts:()=>null,links:Object.create(null)}),/hlinkClick/);
 assert.throws(()=>parseXML('<a b="&constructor;"/>'),/Unknown XML entity/);
 // Nested disclosures: every closed one keeps only its summary, open ones keep their content.
 assert.equal(closedDisclosures('<details open><summary>A</summary><p>a</p><details><summary>B</summary><p>b</p></details></details>'),'<details open><summary>A</summary><p>a</p><details><summary>B</summary></details></details>');
 assert.equal(closedDisclosures('<details><summary>A</summary><details open><summary>B</summary></details><p>tail</p></details><p>after</p>'),'<details><summary>A</summary></details><p>after</p>');
 // Archives: inflated size, CRC and duplicate names are checked.
 const good=zipFiles([['a.txt','hello']]);assert.equal(readZip(good).get('a.txt').toString(),'hello');
 const lie=Buffer.from(good),cd=lie.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));lie.writeUInt32LE(2,cd+24);assert.throws(()=>readZip(lie),/Length or CRC|maxOutputLength|buffer|exceed/i);
 const crc=Buffer.from(good);crc.writeUInt32LE((crc32(Buffer.from('hello'))^1)>>>0,crc.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]))+16);assert.throws(()=>readZip(crc),/CRC/);
 assert.throws(()=>readZip(good,{maxBytes:2}),/beyond the limit/);
 // Row spans keep every table row on the full grid; an unsupported region path gets a receipt; a misaligned workbook fails.
 const st=await releaseProject('story','en',home,'cream-collage'),resources=await visualAssetResources(st,home),h=html(st,resources),layout=syntheticLayout({...st,resources},h);
 const region=layout.scenes.flatMap(s=>s.regions).find(r=>r.tables),[,r1,r2]=region.tables[0].rows;r1.cells[0].rowspan=2;r2.cells.shift();
 const chartRegion=layout.scenes.flatMap(s=>s.regions).find(r=>r.plot);chartRegion.shapes.push({kind:'path',box:{x:0,y:0,width:1,height:1},fill:{hex:'111111',alpha:1},stroke:null,strokeWidth:0,dash:null,commands:[{c:'M',p:[[0,0]]}],unsupported:true});
 // The removed cell's text is still in the document, so the check must report it: the file is kept only on purpose.
 const rasters=l3Rasters(st,layout);
 assert.throws(()=>exportDeck(st.document,'pptx',{experimentalWeb:true,plan:st.plan,assetResources:resources,layout,rasters}),{code:'EXPORT_CHECK_FAILED'});
 const out=exportDeck(st.document,'pptx',{experimentalWeb:true,plan:st.plan,assetResources:resources,layout,rasters,allowFailedCheck:true});
 assert.ok(out.report.check.sceneCheck.failures.some(x=>x.check==='text coverage'&&x.blockId===region.blockId));
 assert.ok(out.report.receipts.some(r=>r.code==='PPTX_SHAPE_PATH'&&r.blockId===chartRegion.blockId));
 const files=readZip(out.body),slide=[...files.keys()].find(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)&&files.get(n).toString().includes('<a:tbl>')),tbl=files.get(slide).toString();
 const grid=(tbl.match(/<a:gridCol /g)||[]).length,rows=tbl.split('<a:tr ').slice(1).map(r=>(r.match(/<a:tc[ >]/g)||[]).length);
 assert.ok(rows.every(n=>n===grid),JSON.stringify({grid,rows}));assert.match(tbl,/rowSpan="2"/);assert.match(tbl,/vMerge="1"/);
 const book=[...files.keys()].find(n=>n.endsWith('.xlsx')),wb=readZip(files.get(book)),sheet=wb.get('xl/worksheets/sheet1.xml').toString().replace(/<c r="B2"><v>[^<]*<\/v>/,'<c r="B2"><v>999</v>');
 const tampered=zipFiles([...files].map(([n,b])=>[n,n===book?zipFiles([...wb].map(([k,v])=>[k,k==='xl/worksheets/sheet1.xml'?sheet:v])):b]));
 const audit=auditPPTX({bytes:tampered,document:st.document,plan:st.plan,scenes:compileWebScenes(st.document,st.plan),compiled:out.run.output,levels:out.run.levels});
 assert.ok(audit.editability.failures.some(x=>x.check==='workbook equals chart cache'));
 // Measured values that would reach XML or CSS are validated.
 const nan=structuredClone(layout);nan.scenes[0].bounds.width=null;
 assert.throws(()=>exportDeck(st.document,'pptx',{experimentalWeb:true,plan:st.plan,assetResources:resources,layout:nan}),e=>e.details.some(d=>d.code==='EXPORT_LAYOUT_VALUES'));
 const hex=structuredClone(layout);hex.scenes[0].background={hex:'"/><x',alpha:1};
 assert.throws(()=>exportDeck(st.document,'pdf',{experimentalWeb:true,plan:st.plan,assetResources:resources,layout:hex}),e=>e.details.some(d=>d.code==='EXPORT_LAYOUT_VALUES'));
});

test('F1: the typography result refuses text fitted below its role minimum and names scene, shape, role and sizes; the thresholds come from capabilities',async()=>{
 const {typographyCheck,textRole}=await import('../src/targets/pptx/audit.mjs'),{TYPOGRAPHY_MINIMUM_PT}=await import('../src/targets/capabilities.mjs');
 const blocks=new Map([['h1',{type:'heading'}],['p1',{type:'paragraph'}],['c1',{type:'citation'}],['ch1',{type:'chart'}]]);
 const shape=(name,pt,extra={})=>({name,sizes:[Math.round(pt*100)],decorative:false,title:false,...extra});
 assert.deepEqual(TYPOGRAPHY_MINIMUM_PT,{title:18,body:10,annotation:6});
 assert.equal(textRole(shape('h1/text',20,{title:true}),blocks),'title');assert.equal(textRole(shape('p1/text',12),blocks),'body');assert.equal(textRole(shape('c1/text',9),blocks),'annotation');assert.equal(textRole(shape('ch1/axis',9),blocks),'annotation');
 const plan={scenes:[{id:'explain'}]};
 const pass=typographyCheck({slides:[{name:'slide1.xml',shapes:[shape('h1/text',18,{title:true}),shape('p1/text',10),shape('c1/text',6),shape('decor/x',3,{decorative:true})]}]},blocks,plan);
 assert.equal(pass.status,'pass');assert.deepEqual(pass.failures,[]);
 const fail=typographyCheck({slides:[{name:'slide1.xml',shapes:[shape('h1/text',18,{title:true}),shape('p1/text',7.48),shape('p1/number',5.18),shape('c1/text',6)]}]},blocks,plan);
 assert.equal(fail.status,'fail');assert.deepEqual(fail.failures,[{sceneId:'explain',name:'p1/text',role:'body',actualPt:7.48,requiredPt:10},{sceneId:'explain',name:'p1/number',role:'body',actualPt:5.18,requiredPt:10}]);
 assert.match(fail.scope,/not adjustable/);
});

test('F1: a scene taller than the slide is paged into slides that keep every block, repeat the heading and meet the typography minimums; paginate none keeps it whole and fails typography',async()=>{
 const g=await releaseProject('gallery','en',home),resources=await visualAssetResources(g,home),h=html(g,resources),layout=syntheticLayout({...g,resources},h),rasters=l3Rasters(g,layout),sceneId='ev-evidence';
 const go=paginate=>exportDeck(g.document,'pptx',{experimentalWeb:true,plan:g.plan,assetResources:resources,layout,rasters,paginate,allowFailedCheck:true});
 const whole=go('none'),a=whole.report.check;
 assert.equal(whole.run.output.slides.length,g.plan.scenes.length);assert.deepEqual(whole.run.output.pagination,[]);
 assert.equal(a.typography.status,'fail');assert.ok(a.typography.failures.some(f=>f.sceneId===sceneId&&f.role==='body'),JSON.stringify(a.typography.failures).slice(0,500));
 const paged=go('auto'),b=paged.report.check,parts=paged.run.output.slides.filter(s=>s.sceneId===sceneId);
 assert.equal(parts.length,2,'the tall scene became two slides');assert.deepEqual(parts.map(s=>[s.part,s.parts]),[[1,2],[2,2]]);
 assert.deepEqual(paged.run.output.pagination,[{sceneId,parts:2,reason:'paged'}]);assert.deepEqual(paged.report.pagination,paged.run.output.pagination);assert.deepEqual(b.typography.pagination,paged.run.output.pagination);
 assert.equal(paged.run.output.slides.length,g.plan.scenes.length+1,'other scenes stay one slide each');
 assert.equal(b.typography.status,'pass',JSON.stringify(b.typography.failures).slice(0,800));
 for(const k of ['editability','sceneCheck','accessibility'])assert.equal(b[k].status,'pass',k+' '+JSON.stringify(b[k].failures).slice(0,800));
 // Every slide of the scene has a title; the continuation slide carries the heading with its part number in the title placeholder, and its own notes.
 const pkg=inspectPackage(paged.body),first=paged.run.output.slides.findIndex(s=>s.sceneId===sceneId),slides=pkg.slides.slice(first,first+2);
 const heading=g.document.blocks.find(x=>g.plan.scenes.find(s=>s.id===sceneId).blockIds.includes(x.id)&&x.type==='heading').text.replace(/\n/g,' ');
 const squash=v=>v.replace(/\s+/g,'');
 slides.forEach((s,i)=>{const t=s.shapes.find(x=>x.title);assert.ok(t,'title on part '+(i+1));assert.ok(squash(t.text).includes(squash(heading)),t.text);if(i)assert.ok(t.text.endsWith('(2/2)'),t.text);assert.ok(s.notes.includes(i?'(2/2)':'(1/2)'),s.notes.split('\n')[0]);});
 // Nothing is lost or drawn outside a slide; every block of the scene is on one of its two slides, and no block is on both unless it was cut.
 assert.ok(!b.sceneCheck.failures.some(f=>f.check==='text coverage'||f.check==='inside the slide'||f.check==='block present'));
 const owners=slides.map(s=>new Set(s.shapes.filter(x=>!x.decorative&&x.name.includes('/')).map(x=>x.name.split('/')[0])));assert.ok(owners[1].size>=1&&owners[0].size>=1);
 // Same input, same bytes; and a scene-level receipt is not repeated per part.
 assert.equal(go('auto').body.equals(paged.body),true);
 const perScene=paged.run.output.receipts.filter(r=>r.sceneId===sceneId&&['PPTX_INTERACTION_STATIC','PPTX_MOTION_NOT_COMPILED','PPTX_DISCLOSURE'].includes(r.code)),wholeScene=whole.run.output.receipts.filter(r=>r.sceneId===sceneId&&['PPTX_INTERACTION_STATIC','PPTX_MOTION_NOT_COMPILED','PPTX_DISCLOSURE'].includes(r.code));
 assert.equal(perScene.length,wholeScene.length);
});

test('F1: a typography failure refuses the file unless the author accepts it; the acceptance is recorded with its time and the result stays a failure',async()=>{
 const g=await releaseProject('gallery','en',home),resources=await visualAssetResources(g,home),h=html(g,resources),layout=syntheticLayout({...g,resources},h),rasters=l3Rasters(g,layout),sceneId='ev-evidence';
 const go=(paginate,o={})=>exportDeck(g.document,'pptx',{experimentalWeb:true,plan:g.plan,assetResources:resources,layout,rasters,paginate,...o});
 // Whole, the tall scene's body text is too small: the file is refused by name, like any other failed check.
 assert.throws(()=>go('none'),e=>e.code==='EXPORT_CHECK_FAILED'&&e.status===422&&e.details.some(d=>d.check==='typography'&&d.failures.some(f=>f.sceneId===sceneId&&f.role==='body'&&f.actualPt<f.requiredPt)));
 // The author accepts the sizes: the file is exported, the report records who accepted and when, and the result is still 'fail'.
 const at='2026-10-19T12:00:00.000Z',accepted=go('none',{acceptTypography:{by:'author',at}}),t=accepted.report.check.typography;
 assert.equal(accepted.extension,'pptx');assert.equal(t.status,'fail');assert.equal(t.acceptedBy,'author');assert.equal(t.acceptedAt,at);assert.ok(t.failures.length);
 assert.ok(accepted.run.order.find(o=>o.stage==='check').typographyAcceptedBy==='author');
 assert.equal(accepted.body.equals(go('none',{allowFailedCheck:true}).body),true,'acceptance changes the record, not the bytes');
 // The export report and its Markdown carry the acceptance next to the failed result, never as a pass.
 const applications={powerpoint:{state:'installed, not run'},keynote:{state:'installed, not run'},libreoffice:{state:'not installed'},quickLook:{state:'not run'}};
 const r=exportReport({deck:'gallery-en',document:g.document,plan:g.plan,pptx:{run:accepted.run,inspection:null},pdf:{run:null,inspection:null,searchability:{status:'not-run'},accessibility:null},fidelity:null,environment:{},applications});
 assert.equal(r.results.typography.status,'fail');assert.equal(r.results.typography.acceptedBy,'author');assert.equal(r.results.typography.acceptedAt,at);
 assert.match(reportMarkdown(r),/Typography \(presentable text size by role\) \| fail · accepted by author at 2026-10-19T12:00:00\.000Z/);
 // Only the author can accept, and only with a time; a passing result records no acceptance.
 assert.throws(()=>go('none',{acceptTypography:{by:'host',at}}),{code:'EXPORT_ACCEPTANCE',status:422});
 assert.throws(()=>go('none',{acceptTypography:{by:'author'}}),{code:'EXPORT_ACCEPTANCE',status:422});
 assert.throws(()=>go('none',{acceptTypography:true}),{code:'EXPORT_ACCEPTANCE',status:422});
 const paged=go('auto',{acceptTypography:{by:'author',at}});assert.equal(paged.report.check.typography.status,'pass');assert.equal('acceptedBy' in paged.report.check.typography,false);assert.equal('acceptedAt' in paged.report.check.typography,false);
 // The evidence run still records the failure without any acceptance.
 const recorded=go('none',{allowFailedCheck:true}).report.check.typography;assert.equal(recorded.status,'fail');assert.equal('acceptedBy' in recorded,false);
});

test('F1: a callout that a composition draws as the image caption (image-left, photo-split, atlas-cover) is an annotation for the typography minimum; elsewhere it is body text',async()=>{
 const {typographyCheck,textRole,CAPTION_CALLOUT_COMPOSITIONS}=await import('../src/targets/pptx/audit.mjs');
 assert.deepEqual([...CAPTION_CALLOUT_COMPOSITIONS].sort(),['atlas-cover','image-left','photo-split']);
 const blocks=new Map([['violet-caption',{type:'callout'}],['p1',{type:'paragraph'}]]),shape=(name,pt)=>({name,sizes:[Math.round(pt*100)],decorative:false,title:false});
 assert.equal(textRole(shape('violet-caption/text-11',8.67),blocks,'photo-split'),'annotation');assert.equal(textRole(shape('violet-caption/text-11',8.67),blocks,'image-left'),'annotation');
 assert.equal(textRole(shape('violet-caption/text-11',8.67),blocks,'hero-statement'),'body');assert.equal(textRole(shape('violet-caption/text-11',8.67),blocks),'body');assert.equal(textRole(shape('p1/text',8.67),blocks,'photo-split'),'body');
 // The measured Studio demo: the photo-split caption fits at 8.67 pt, which is an annotation at or above 6 pt, not body text under 10 pt.
 const plan={scenes:[{id:'violet',composition:'photo-split'},{id:'other',composition:'hero-statement'}]},pkg={slides:[{name:'slide1.xml',shapes:[shape('violet-caption/text-11',8.67)]},{name:'slide2.xml',shapes:[shape('violet-caption/text-11',8.67)]}]};
 const r=typographyCheck(pkg,blocks,plan);assert.equal(r.status,'fail');assert.deepEqual(r.failures,[{sceneId:'other',name:'violet-caption/text-11',role:'body',actualPt:8.67,requiredPt:10}]);
});
