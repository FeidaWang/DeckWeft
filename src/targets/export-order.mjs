/**
 * The export order for paged targets (S7, DWD-130), enforced in code: each stage runs only after the one before it.
 *
 *   ready → static-state → freeze → stop-motion → reveal → render → check
 *
 * ready: assets hash-match and the measured layout of this exact static render has loaded fonts, real glyphs and decoded images.
 * static-state: the author's static state per scene. freeze: filters, sort, focus and parameters. stop-motion: no cue, timing
 * or transition is compiled. reveal: what must be readable without interaction. render: PowerPoint package or PDF print job.
 * check: the output is read back and compared with the derived scene.
 */
import {DeckError} from '../core/errors.mjs';
import {presentationCapabilities,documentLevels} from './capabilities.mjs';
import {assertExportLayout} from './layout.mjs';
import {staticStates,freezeViews,stopMotion,revealRequired} from './static-delivery.mjs';
import {compileWebScenes} from '../scene/web/compile.mjs';
import {compilePPTX} from './pptx/compile.mjs';
import {auditPPTX} from './pptx/audit.mjs';
import {pdfPrintJob,checkPrintJob} from './pdf/print.mjs';

export const EXPORT_ORDER=['ready','static-state','freeze','stop-motion','reveal','render','check'];
export const PAGED_TARGETS=['pptx','pdf'];

/** A run that accepts the stages only in EXPORT_ORDER. Each stage leaves a receipt with its name and summary. */
export function exportRun(target){
 const done=[],receipts=[];
 return {target,receipts,get done(){return [...done];},
  stage(name,fn){
   const expected=EXPORT_ORDER[done.length];
   if(name!==expected)throw new DeckError('EXPORT_ORDER',`Export stage “${name}” cannot run now; the next stage is “${expected||'none'}”.`,500,[{stage:name,done:[...done],next:expected||null}]);
   const {value,summary}=fn();done.push(name);receipts.push({stage:name,...summary});return value;
  }};
}

/** Stage 1. Fonts and images are confirmed by the browser measurement of this render; assets by their hashes. */
export function readiness(document,plan,target,{resources={},layout,html}){
 const issues=presentationCapabilities(target,document,resources,plan).issues;
 if(issues.length)throw new DeckError('TARGET_CAPABILITY','This target cannot represent the requested presentation yet.',422,issues);
 if(!layout)throw new DeckError('EXPORT_LAYOUT_REQUIRED','Measure the static export in a browser after fonts and images are ready (scripts/export-targets.mjs), then export again.',422,[{target}]);
 assertExportLayout(layout,{renderHash:html.renderHash,plan});
 const problems=[];
 if(layout.fontStatus!=='loaded')problems.push({code:'FONT_NOT_READY',message:`Font loading status is ${layout.fontStatus}.`});
 for(const f of layout.fontFaces||[])if(f.status!=='loaded')problems.push({code:'FONT_NOT_READY',message:`${f.family} is ${f.status}.`});
 if(layout.images.some(i=>!i.ready))problems.push({code:'IMAGE_NOT_READY',message:'An image was not decoded when the layout was measured.'});
 const platform=layout.platformFonts||null,families=new Set();
 if(platform)for(const [id,fonts]of Object.entries(platform)){for(const f of fonts)if(f.glyphCount>0)families.add(f.familyName);if(fonts.some(f=>/LastResort/i.test(f.familyName)||/LastResort/i.test(f.postScriptName||'')))problems.push({code:'FONT_GLYPH_MISSING',message:'A measured text part was drawn with the last-resort font (a missing glyph).',measureId:id});}
 if(problems.length)throw new DeckError('EXPORT_NOT_READY','Fonts or images were not ready when the layout was measured.',422,problems);
 const assets=document.blocks.filter(b=>b.type==='image').map(b=>({blockId:b.id,assetId:b.assetId,mime:resources[b.assetId]?.mime||null,hash:resources[b.assetId]?.hash||null}));
 return {assets,fonts:[...families].sort(),platformFontsMeasured:!!platform,images:layout.images.length,renderHash:layout.renderHash};
}

/**
 * Runs every stage for one paged target. `html` is the static web export (exportPresentation with format html), `layout` its
 * browser measurement (measureExportLayout plus CDP platform fonts), `rasters` element captures for L3 fallbacks.
 */
export function runExport(document,plan,target,{resources={},layout,rasters={},html}){
 if(!PAGED_TARGETS.includes(target))throw new DeckError('EXPORT_FORMAT','The export order applies to pptx and pdf.',400);
 const run=exportRun(target);
 const ready=run.stage('ready',()=>{const r=readiness(document,plan,target,{resources,layout,html});return {value:r,summary:{assets:r.assets.length,fonts:r.fonts,images:r.images}};});
 const states=run.stage('static-state',()=>{const v=staticStates(document,plan);return {value:v,summary:{declared:v.filter(s=>s.declared).map(s=>({sceneId:s.sceneId,keyStateId:s.keyStateId,position:s.position}))}};});
 const frozen=run.stage('freeze',()=>{const v=freezeViews(document,plan,states);return {value:v,summary:{charts:v.reduce((n,s)=>n+Object.keys(s.charts).length,0),frozenCharts:v.flatMap(s=>Object.entries(s.charts).filter(([,c])=>c.frozen).map(([id])=>id)),interactions:v.reduce((n,s)=>n+s.interactions.length,0)}};});
 const motion=run.stage('stop-motion',()=>{const v=stopMotion(plan);return {value:v,summary:{scenesWithMotion:v.filter(m=>m.policy!=='none'||m.cuesNotPlayed).length,cuesNotPlayed:v.reduce((n,m)=>n+m.cuesNotPlayed,0)}};});
 const reveal=run.stage('reveal',()=>{const v=revealRequired(document,plan,frozen);return {value:v,summary:{sources:v.reduce((n,s)=>n+s.sources.length,0),notes:v.reduce((n,s)=>n+s.notes.length,0)}};});
 const delivery={states,frozen,motion,reveal},scenes=compileWebScenes(document,plan);
 const output=run.stage('render',()=>{
  if(target==='pptx'){const c=compilePPTX({document,plan,scenes,layout,delivery,resources,rasters});return {value:c,summary:{bytes:c.bytes.length,slides:c.slides.length,charts:c.charts.length,media:c.media,receipts:c.receipts.length}};}
  const job=pdfPrintJob({document,plan,html,layout,delivery});return {value:job,summary:{pages:job.pages.length,appendixPages:job.appendix.length,bytes:Buffer.byteLength(job.html)}};
 });
 const levels=documentLevels(document);
 const check=run.stage('check',()=>{
  if(target==='pptx'){const a=auditPPTX({bytes:output.bytes,document,plan,scenes,compiled:output,levels});return {value:a,summary:{editability:a.editability.status,sceneCheck:a.sceneCheck.status,accessibility:a.accessibility.status}};}
  const c=checkPrintJob(output,{document,plan});return {value:c,summary:{status:c.status}};
 });
 const body=target==='pptx'?output.bytes:output.html;
 return {target,ready,delivery,levels,output,check,order:run.receipts,
  file:target==='pptx'?{body,mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',extension:'pptx'}:{body,mime:'text/html; charset=utf-8',extension:'print.html',print:output.page}};
}
