import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdir,mkdtemp,readdir,realpath,rm,stat,writeFile} from 'node:fs/promises';
import {studioTargetExport} from '../src/targets/studio-export.mjs';
import {localCapture} from '../src/workbench/capture.mjs';
import {createVisualDemo} from '../src/core/visual-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {EXPORT_ORDER} from '../src/targets/export-order.mjs';
import {readZip} from '../src/targets/pptx/audit.mjs';
import {chartKindsProject} from './chart-kinds.mjs';

const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s7-studio-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const demo=async()=>{const p=await createVisualDemo('en',home);return {p,resources:await visualAssetResources(p,home)};};
const profiles=async()=>(await readdir(os.tmpdir())).filter(n=>n.startsWith('dw-studio-export-'));

test('Studio export refuses PowerPoint and PDF before any browser starts',async()=>{
 const {p,resources}=await demo();
 for(const format of ['pptx','pdf'])await assert.rejects(studioTargetExport({project:p,resources,format}),e=>e.code==='TARGET_BROWSER_REQUIRED'&&e.status===422&&e.message.includes('--capture-browser /absolute/isolated/chromium'));
 await assert.rejects(studioTargetExport({browserPath:'/x',project:p,resources,format:'html'}),{code:'EXPORT_FORMAT',status:400});
 await assert.rejects(studioTargetExport({browserPath:path.join(home,'missing-chromium'),project:p,resources,format:'pdf'}),{code:'TARGET_BROWSER_REQUIRED',status:422});
 // An unresolved image is refused by the static web export the browser would have measured.
 await assert.rejects(studioTargetExport({browserPath:path.join(home,'missing-chromium'),project:p,resources:{},format:'pptx'}),e=>e.code==='TARGET_CAPABILITY'&&e.details.some(d=>d.code==='ASSET_UNRESOLVED'));
 // An installed application bundle is never driven, by the Studio export or by the workbench capture (checked before its home is made).
 const bundle=path.join(home,'Applications','Fake.app','chromium');await mkdir(path.dirname(bundle),{recursive:true});await writeFile(bundle,'');
 await assert.rejects(studioTargetExport({browserPath:bundle,project:p,resources,format:'pdf'}),{code:'CAPTURE_REQUIRES_ISOLATED_BROWSER',status:422});
 const captureHome=path.join(home,'capture-home');await assert.rejects(localCapture(bundle)({project:p,html:'',htmlHash:'',home:captureHome}),{message:'CAPTURE_REQUIRES_ISOLATED_BROWSER'});
 await assert.rejects(stat(captureHome),{code:'ENOENT'});
 assert.equal(localCapture(),null);assert.equal(localCapture(''),null);assert.equal(typeof localCapture('/isolated/chromium'),'function');
});

// Set CHROMIUM_PATH to an isolated test browser outside /Applications to run the real export.
const browserPath=process.env.CHROMIUM_PATH,skip=!browserPath&&'CHROMIUM_PATH is not set';
test('Studio export compiles PowerPoint and PDF through the export order in the isolated browser',{skip},async()=>{
 const {p,resources}=await demo(),before=await profiles();
 for(const format of ['pptx','pdf']){
  const task={project:p,original:p,hostDraft:{hostAuthoredLines:1,hostAuthored:[{page:0,text:'Offline report fixture'}]},receipt:{review:{attestation:'host-metadata-only',verdict:'pass',controls:{summary:{hits:0,total:2}}}}};
  const r=await studioTargetExport({browserPath,project:p,resources,format,task});
  assert.equal(r.report.evidence.hostAuthored.total,1);assert.equal(r.report.evidence.hostAuthored.pages[0].sceneId,p.plan.scenes[0].id);assert.deepEqual(r.report.evidence.review,{attestation:'host-metadata-only',verdict:'pass',controls:{hits:0,total:2}});
  assert.equal(r.extension,format);assert.deepEqual(r.report.order.map(o=>o.stage),EXPORT_ORDER);assert.deepEqual(JSON.parse(JSON.stringify(r.report)),r.report);
  assert.equal(r.report.order[0].images,1);assert.ok(r.report.order[0].fonts.length);
  for(const scene of p.plan.scenes)for(const id of scene.blockIds)assert.match(r.report.levels.find(l=>l.blockId===id)?.[format]?.level||'',/^L[123]$/,`${scene.id}/${id}`);
  if(format==='pptx'){
   assert.equal(r.mime,'application/vnd.openxmlformats-officedocument.presentationml.presentation');assert.equal(r.body.subarray(0,2).toString('latin1'),'PK');
   const files=readZip(r.body);assert.ok(files.has('ppt/slides/slide1.xml'));assert.equal([...files.keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length,p.plan.scenes.length);
   assert.equal(r.report.check.editability.status,'pass');assert.equal(r.report.check.sceneCheck.status,'pass');
  }else{
   assert.equal(r.mime,'application/pdf');assert.equal(r.body.subarray(0,5).toString('latin1'),'%PDF-');assert.equal(r.report.check.status,'pass');
   const pdf=r.body.toString('latin1');assert.ok(pdf.match(/\/Type \/Page\b(?!s)/g).length>=r.report.check.pages+r.report.check.appendixPages);assert.match(pdf,/\/StructTreeRoot/);
  }
 }
 assert.deepEqual(await profiles(),before);
});

test('Studio export captures the elements PowerPoint delivers as images',{skip},async()=>{
 const p=chartKindsProject('en'),r=await studioTargetExport({browserPath,project:p,resources:{},format:'pptx'}),l3=r.report.levels.filter(l=>l.component==='chart'&&l.pptx.level==='L3');
 assert.ok(l3.length);assert.equal(r.report.check.editability.counts.l3Picture,l3.length);
 assert.ok(!r.report.receipts.some(x=>x.code==='PPTX_RASTER_MISSING'));
 const media=[...readZip(r.body)].filter(([n])=>n.startsWith('ppt/media/')&&n.endsWith('.png'));assert.ok(media.length>=l3.length);
 for(const [,png] of media)assert.equal(png.subarray(1,4).toString('latin1'),'PNG');
});

test('Studio export refuses what the export order refuses, and stops when cancelled',{skip},async()=>{
 const {p,resources}=await demo();p.document.blocks.find(b=>b.type==='heading').text+=' ';
 for(const format of ['pptx','pdf'])await assert.rejects(studioTargetExport({browserPath,project:p,resources,format}),e=>e.code==='EXPORT_NOT_READY'&&e.status===422&&e.details.some(d=>d.code==='FONT_GLYPH_MISSING'));
 const {p:q}=await demo(),controller=new AbortController();setTimeout(()=>controller.abort(),300);
 await assert.rejects(studioTargetExport({browserPath,project:q,resources,format:'pdf',signal:controller.signal}),{name:'AbortError'});
 assert.deepEqual(await profiles(),[]);
});

test('F1: Studio export whole (paginate none) refuses a tall page by its text sizes; the author’s acceptance exports it, recorded with its time, still as a failed result',{skip},async()=>{
 const {blueprintProject}=await import('./blueprint-a.mjs'),p=await blueprintProject('en',{theme:'silver-gray-editorial'}),slides=r=>[...readZip(r.body).keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
 await assert.rejects(studioTargetExport({browserPath,project:p,resources:{},format:'pptx',paginate:'none'}),e=>e.code==='EXPORT_CHECK_FAILED'&&e.status===422&&e.details.some(d=>d.check==='typography'&&d.failures.some(f=>f.sceneId==='pipeline'&&f.actualPt<f.requiredPt)));
 await assert.rejects(studioTargetExport({browserPath,project:p,resources:{},format:'pptx',paginate:'none',acceptTypography:{by:'host',at:new Date().toISOString()}}),{code:'EXPORT_ACCEPTANCE'});
 const at=new Date().toISOString(),whole=await studioTargetExport({browserPath,project:p,resources:{},format:'pptx',paginate:'none',acceptTypography:{by:'author',at}}),t=whole.report.check.typography;
 assert.equal(whole.extension,'pptx');assert.equal(t.status,'fail');assert.equal(t.acceptedBy,'author');assert.equal(t.acceptedAt,at);assert.ok(t.failures.length);assert.deepEqual(whole.report.pagination,[]);
 const paged=await studioTargetExport({browserPath,project:p,resources:{},format:'pptx'}),u=paged.report.check.typography;
 assert.equal(u.status,'pass',JSON.stringify(u.failures).slice(0,400));assert.equal('acceptedBy' in u,false);assert.equal(paged.report.pagination[0]?.sceneId,'pipeline');assert.ok(slides(paged)>slides(whole));
});
