import {componentCapabilities} from '../components/capabilities.mjs';
import {inspectImage} from '../assets/formats.mjs';
import { DeckError } from '../core/errors.mjs';
import { assetHash } from '../assets/registry.mjs';
import {chartSemantics,HTML_CHART_DRAWS} from '../components/charts/semantics.mjs';
import {pptxChartPlan,PPTX_IMAGE_TYPES} from './pptx/fallbacks.mjs';
const {log:LOG_KINDS,intervals:INTERVAL_KINDS,events:EVENT_KINDS}=HTML_CHART_DRAWS;

/**
 * Output levels (S7, DWD-130). A level says what a reader of that format can do with a component, not how good it looks.
 * L1: native editable text, shapes, tables and supported charts (in PDF: real, searchable text and vector shapes).
 * L2: an embedded vector drawing whose title, caption and source stay real text next to it.
 * L3: a high-resolution image of that one element plus a semantic summary (alt text and notes). Never a whole slide.
 */
export const OUTPUT_LEVELS={L1:'native editable text, shapes, tables and supported charts',L2:'embedded vector drawing; title, caption and source kept as real text',L3:'high-resolution image of the element plus a semantic summary'};
/** The formats with declared levels. `html` is the web format. */
export const LEVEL_FORMATS=['html','pdf','pptx'];
/** F1 (2026-10-19): minimum presentable text size per role after the scene is fitted to the slide, in points. Calibrated to the web
 * minimums at the width fit of a 1440 px page (1 px = 0.667 pt): 28 px headings → 18 pt, 16 px body → 10 pt, and the compiler's own
 * 6 pt floor for native chart labels. A package that passes every structural check but falls below these is editable, not presentable.
 * There is no switch to lower them; a tall scene is paged (compilePPTX paginate) instead. Measured on 2026-10-19 across the demo,
 * chart-kinds and blueprint decks: only scenes taller than the slide fail. */
export const TYPOGRAPHY_MINIMUM_PT={title:18,body:10,annotation:6};
const text=(pptx='native text box')=>({html:['L1','DOM text'],pdf:['L1','real, searchable text'],pptx:['L1',pptx]});
/** The declaration, per component and format. Charts are resolved per kind and declaration by `outputLevel`. */
export const COMPONENT_LEVELS={
 heading:text('native text box (slide title placeholder for the scene title)'),
 paragraph:text(),quote:text(),callout:text(),annotation:text(),
 list:text('native text box with list bullets'),
 metric:text('native text box: value, unit and label as separate runs'),
 citation:text('native text with a hyperlink to the source'),
 code:{html:['L1','exact source text'],pdf:['L1','real monospaced text, whitespace kept'],pptx:['L1','native monospaced text box, whitespace kept']},
 table:{html:['L1','DOM table'],pdf:['L1','real-text table'],pptx:['L1','native table']},
 image:{html:['L1','image with alt text'],pdf:['L1','embedded image with alt text in the tagged PDF'],pptx:['L1','native picture with crop and alt text']},
 diagram:{html:['L1','SVG with text labels and a text list of relationships'],pdf:['L2','vector drawing with real-text labels'],pptx:['L1','native shapes, connectors and text']},
 chart:{html:['L1','semantic SVG or HTML rows with the complete data table'],pdf:['L2','vector drawing with real-text labels and values'],pptx:null}
};

/** The declared level of one component in one format. Charts resolve their PowerPoint level from kind and declarations. */
export function outputLevel(block,document,target,view){
 const declared=COMPONENT_LEVELS[block.type];
 if(!declared)return {level:null,representation:'undeclared',receipts:[{code:'COMPONENT_LEVEL_UNDECLARED',target,blockId:block.id,element:block.type,reason:'No output level is declared for this component.',delivered:'Refused.'}]};
 if(block.type==='chart'&&target==='pptx'){const d=document.datasets.find(d=>d.id===block.datasetId);const p=pptxChartPlan(block,d,view||d,document.locale);return {level:p.level,representation:p.representation,receipts:p.receipts};}
 const [level,representation]=declared[target]||[null,'undeclared'];
 return {level,representation,receipts:[]};
}

/** Levels in every format for every block, as the export report lists them. */
export function documentLevels(document,{views={}}={}){
 return document.blocks.map(b=>({blockId:b.id,component:b.type,variant:b.chartType||b.diagramType||b.type,...Object.fromEntries(LEVEL_FORMATS.map(f=>{const l=outputLevel(b,document,f,views[b.id]);return [f,{level:l.level,representation:l.representation,receipts:l.receipts.length}];}))}));
}

const imageIssue=(b,resources)=>{
 const r=resources[b.assetId];
 try{
  if(!r||!r.dataURL?.startsWith('data:'+r.mime+';base64,')||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(r.dataURL)||r.dataURL.length>5_400_000)throw Error();
  const bytes=Buffer.from(r.dataURL.split(',')[1],'base64'),dim=inspectImage(bytes,r.mime);
  if(dim.width!==r.width||dim.height!==r.height||(r.hash&&r.hash!==assetHash(bytes)))throw Error();
 }catch{return {code:'ASSET_UNRESOLVED',blockId:b.id,message:'Restore the hash-matching local image or replace this image. No remote asset fallback is used.'};}
 return null;
};

export function presentationCapabilities(target,document,resources={},plan=null){
 const issues=[];
 // Declared semantics that no compiler draws yet are refused, never silently dropped from the figure. S4 draws every truncation and sort; the rest per kind.
 if(target==='html')for(const b of document.blocks.filter(b=>b.type==='chart')){
  const d=document.datasets.find(d=>d.id===b.datasetId);if(!d)continue;const s=chartSemantics(b,d),kind=s.kind;
  if((s.scale.y==='log'&&!LOG_KINDS.includes(kind))||(s.scale.x==='log'&&kind!=='scatter'))issues.push({code:'CHART_SCALE_UNIMPLEMENTED',blockId:b.id,message:`A log axis is drawn for ${LOG_KINDS.join(', ')} only. Use a linear scale or one of those kinds.`});
  if(s.intervalSeriesIds.length&&!INTERVAL_KINDS.includes(kind))issues.push({code:'CHART_INTERVAL_UNIMPLEMENTED',blockId:b.id,message:`Interval bounds are drawn for ${INTERVAL_KINDS.join(', ')} only; uncertainty is never dropped silently. Use a dot-and-interval chart or a line.`});
  if(s.eventIds.length&&!EVENT_KINDS.includes(kind))issues.push({code:'CHART_EVENTS_UNIMPLEMENTED',blockId:b.id,message:'Dataset events are drawn on category axes and rows; a scatter or heatmap has neither. Use a line, area, bar or table kind.'});
 }
 // PDF and PowerPoint are compiled from the static web scene (S7): every HTML refusal above applies to them too.
 if(['pdf','pptx'].includes(target))issues.push(...presentationCapabilities('html',document,resources,plan).issues.filter(i=>i.code!=='ASSET_UNRESOLVED'));
 if(!['html','json','pdf','pptx'].includes(target))issues.push({code:'TARGET_UNIMPLEMENTED',message:`Version 3 ${target} export has no native compiler yet.`});
 if(['html','pdf','pptx'].includes(target))for(const b of document.blocks.filter(b=>b.type==='image')){const issue=imageIssue(b,resources);if(issue)issues.push(issue);}
 for(const b of document.blocks)if(LEVEL_FORMATS.includes(target)&&!COMPONENT_LEVELS[b.type])issues.push({code:'COMPONENT_LEVEL_UNDECLARED',blockId:b.id,message:'Declare an output level for this component before exporting it.'});
 const components=document.blocks.map(b=>{
  const base=componentCapabilities(b,target);if(!['pdf','pptx'].includes(target))return {...base,...(target==='html'?{level:'L1'}:{})};
  const l=outputLevel(b,document,target);
  return {...base,supported:!!l.level,editable:target==='pptx'&&l.level==='L1',representation:l.representation,level:l.level,staticFallback:true,animation:false,interactionSupport:[],lifecycle:'static',measurement:'browser layout of the static web scene after fonts and images are ready',receipts:l.receipts};
 });
 return {target,ok:issues.length===0,issues,components};
}
export function assertPresentationTarget(target,document,resources={},plan=null){
 const result=presentationCapabilities(target,document,resources,plan);
 if(!result.ok)throw new DeckError('TARGET_CAPABILITY','This target cannot represent the requested presentation yet.',422,result.issues);
 return result;
}
/** Whether an image resource can be embedded natively in PowerPoint (PNG and JPEG). Others are captured from the page. */
export const pptxImageNative=resource=>!!PPTX_IMAGE_TYPES[resource?.mime];
