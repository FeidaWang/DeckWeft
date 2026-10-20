/**
 * The export order for paged targets (S7, DWD-130), enforced in code: each stage runs only after the one before it.
 *
 *   ready → static-state → freeze → stop-motion → reveal → render → check
 *
 * ready: assets hash-match and the measured layout of this exact static render has loaded fonts, real glyphs and decoded images.
 * static-state: the author's static state per scene (a blueprint A page needs one at Diagram or Explore, measured complete). freeze: filters, sort, focus and parameters. stop-motion: no cue, timing
 * or transition is compiled. reveal: what must be readable without interaction. render: PowerPoint package or PDF print job.
 * check: the output is read back and compared with the derived scene.
 */
import {DeckError} from '../core/errors.mjs';
import {presentationCapabilities,documentLevels} from './capabilities.mjs';
import {assertExportLayout} from './layout.mjs';
import {assertEvidenceSupplied} from '../design/scene-semantics.mjs';
import {staticStates,freezeViews,stopMotion,revealRequired} from './static-delivery.mjs';
import {assertBlueprintStatic} from '../motion/blueprint.mjs';
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
 assertEvidenceSupplied(plan);
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
 // S8 (C13): the in-page audit (canvas pixels against the font's own .notdef) catches what no engine reports as a last-resort font.
 for(const g of layout.missingGlyphs||[])problems.push({code:'FONT_GLYPH_MISSING',message:`No installed font draws ${JSON.stringify(g.missing)} (drawn as the .notdef box of ${g.font}).`,regionId:g.regionId});
 if(problems.length)throw new DeckError('EXPORT_NOT_READY','Fonts or images were not ready when the layout was measured.',422,problems);
 const assets=document.blocks.filter(b=>b.type==='image').map(b=>({blockId:b.id,assetId:b.assetId,mime:resources[b.assetId]?.mime||null,hash:resources[b.assetId]?.hash||null}));
 return {assets,fonts:[...families].sort(),platformFontsMeasured:!!platform,glyphsAudited:Array.isArray(layout.missingGlyphs),images:layout.images.length,renderHash:layout.renderHash};
}

/** F1: the only acceptance the export order takes is the author's, with the time it was given (an ISO 8601 instant). */
export function typographyAcceptance(value){
 if(value===null||value===undefined||value===false)return null;
 const ok=value&&typeof value==='object'&&value.by==='author'&&typeof value.at==='string'&&!Number.isNaN(Date.parse(value.at));
 if(!ok)throw new DeckError('EXPORT_ACCEPTANCE','Text below the presentable minimum can be accepted only by the author, with the time of the acceptance ({by: "author", at: ISO 8601}).',422,[{received:value===true?true:value&&typeof value==='object'?{by:value.by??null,at:value.at??null}:typeof value}]);
 return {by:'author',at:new Date(value.at).toISOString()};
}

/**
 * Runs every stage for one paged target. `html` is the static web export (exportPresentation with format html), `layout` its
 * browser measurement (measureExportLayout plus CDP platform fonts), `rasters` element captures for L3 fallbacks.
 */
export function runExport(document,plan,target,{resources={},layout,rasters={},html,allowFailedCheck=false,paginate='auto',acceptTypography=null}){
 if(!PAGED_TARGETS.includes(target))throw new DeckError('EXPORT_FORMAT','The export order applies to pptx and pdf.',400);
 const acceptance=typographyAcceptance(acceptTypography);
 const run=exportRun(target);
 const ready=run.stage('ready',()=>{const r=readiness(document,plan,target,{resources,layout,html});return {value:r,summary:{assets:r.assets.length,fonts:r.fonts,images:r.images}};});
 // S9b: a blueprint A page exports only its complete explanation (an author-chosen Diagram or Explore state, measured whole).
 const states=run.stage('static-state',()=>{const blueprints=assertBlueprintStatic(document,plan,layout),v=staticStates(document,plan);return {value:v,summary:{declared:v.filter(s=>s.declared).map(s=>({sceneId:s.sceneId,keyStateId:s.keyStateId,position:s.position})),...(blueprints.length?{blueprints}:{})}};});
 const frozen=run.stage('freeze',()=>{const v=freezeViews(document,plan,states);return {value:v,summary:{charts:v.reduce((n,s)=>n+Object.keys(s.charts).length,0),frozenCharts:v.flatMap(s=>Object.entries(s.charts).filter(([,c])=>c.frozen).map(([id])=>id)),interactions:v.reduce((n,s)=>n+s.interactions.length,0)}};});
 const motion=run.stage('stop-motion',()=>{const v=stopMotion(plan);return {value:v,summary:{scenesWithMotion:v.filter(m=>m.policy!=='none'||m.cuesNotPlayed).length,cuesNotPlayed:v.reduce((n,m)=>n+m.cuesNotPlayed,0)}};});
 const reveal=run.stage('reveal',()=>{const v=revealRequired(document,plan,frozen);return {value:v,summary:{sources:v.reduce((n,s)=>n+s.sources.length,0),notes:v.reduce((n,s)=>n+s.notes.length,0)}};});
 const delivery={states,frozen,motion,reveal},scenes=compileWebScenes(document,plan);
 const output=run.stage('render',()=>{
  if(target==='pptx'){const c=compilePPTX({document,plan,scenes,layout,delivery,resources,rasters,paginate});return {value:c,summary:{bytes:c.bytes.length,slides:c.slides.length,paged:c.pagination.length,charts:c.charts.length,media:c.media,receipts:c.receipts.length}};}
  const job=pdfPrintJob({document,plan,html,layout,delivery,paginate});return {value:job,summary:{pages:job.pages.length,paged:job.pagination.length,appendixPages:job.appendix.length,bytes:Buffer.byteLength(job.html)}};
 });
 const levels=documentLevels(document);
 const check=run.stage('check',()=>{
  if(target==='pptx'){const a=auditPPTX({bytes:output.bytes,document,plan,scenes,compiled:output,levels});
   // F1: the author may accept text below the presentable minimum. The acceptance is recorded with its time; the result stays a failure.
   if(a.typography.status==='fail'&&acceptance){a.typography.acceptedBy=acceptance.by;a.typography.acceptedAt=acceptance.at;}
   return {value:a,summary:{editability:a.editability.status,sceneCheck:a.sceneCheck.status,accessibility:a.accessibility.status,typography:a.typography.status,...(a.typography.acceptedBy?{typographyAcceptedBy:a.typography.acceptedBy}:{})}};}
  const c=checkPrintJob(output,{document,plan});return {value:c,summary:{status:c.status}};
 });
 // A failed check refuses the file unless the caller records failures on purpose (the evidence run does). A typography failure
 // is refused too, unless the author accepted it (recorded above); paging the scene (paginate 'auto') is the other way out.
 const failed=target==='pptx'?['editability','sceneCheck','accessibility','typography'].filter(k=>check[k].status==='fail'&&!(k==='typography'&&check[k].acceptedBy)):check.status==='fail'?['print']:[];
 if(failed.length&&!allowFailedCheck)throw new DeckError('EXPORT_CHECK_FAILED','The exported file failed its own check; see the details.',422,failed.map(k=>({check:k,failures:target==='pptx'?check[k].failures:check.failures})));
 const body=target==='pptx'?output.bytes:output.html;
 return {target,ready,delivery,levels,output,check,order:run.receipts,
  file:target==='pptx'?{body,mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',extension:'pptx'}:{body,mime:'text/html; charset=utf-8',extension:'print.html',print:output.page}};
}
