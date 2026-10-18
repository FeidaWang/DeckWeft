import {componentCapabilities} from '../components/capabilities.mjs';
import {inspectImage} from '../assets/formats.mjs';
import { DeckError } from '../core/errors.mjs';
import { assetHash } from '../assets/registry.mjs';
import {chartSemantics,HTML_CHART_DRAWS} from '../components/charts/semantics.mjs';
const {log:LOG_KINDS,intervals:INTERVAL_KINDS,events:EVENT_KINDS}=HTML_CHART_DRAWS;
export function presentationCapabilities(target,document,resources={},plan=null){
 const issues=[];
 // Declared semantics that no compiler draws yet are refused, never silently dropped from the figure. S4 draws every truncation and sort; the rest per kind.
 if(target==='html')for(const b of document.blocks.filter(b=>b.type==='chart')){
  const d=document.datasets.find(d=>d.id===b.datasetId);if(!d)continue;const s=chartSemantics(b,d),kind=s.kind;
  if((s.scale.y==='log'&&!LOG_KINDS.includes(kind))||(s.scale.x==='log'&&kind!=='scatter'))issues.push({code:'CHART_SCALE_UNIMPLEMENTED',blockId:b.id,message:`A log axis is drawn for ${LOG_KINDS.join(', ')} only. Use a linear scale or one of those kinds.`});
  if(s.intervalSeriesIds.length&&!INTERVAL_KINDS.includes(kind))issues.push({code:'CHART_INTERVAL_UNIMPLEMENTED',blockId:b.id,message:`Interval bounds are drawn for ${INTERVAL_KINDS.join(', ')} only; uncertainty is never dropped silently. Use a dot-and-interval chart or a line.`});
  if(s.eventIds.length&&!EVENT_KINDS.includes(kind))issues.push({code:'CHART_EVENTS_UNIMPLEMENTED',blockId:b.id,message:'Dataset events are drawn on category axes and rows; a scatter or heatmap has neither. Use a line, area, bar or table kind.'});
 }
 if(!['html','json'].includes(target))issues.push({code:'TARGET_UNIMPLEMENTED',message:`Version 3 ${target} export has no native compiler yet.`});
 if(target==='html')for(const b of document.blocks.filter(b=>b.type==='image')){
  const r=resources[b.assetId];
  try{
   if(!r||!r.dataURL?.startsWith('data:'+r.mime+';base64,')||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(r.dataURL)||r.dataURL.length>5_400_000)throw Error();
   const bytes=Buffer.from(r.dataURL.split(',')[1],'base64'),dim=inspectImage(bytes,r.mime);
   if(dim.width!==r.width||dim.height!==r.height||(r.hash&&r.hash!==assetHash(bytes)))throw Error();
  }catch{issues.push({code:'ASSET_UNRESOLVED',blockId:b.id,message:'Restore the hash-matching local image or replace this image. No remote asset fallback is used.'});}
 }
 return {target,ok:issues.length===0,issues,components:document.blocks.map(b=>componentCapabilities(b,target))};
}
export function assertPresentationTarget(target,document,resources={},plan=null){
 const result=presentationCapabilities(target,document,resources,plan);
 if(!result.ok)throw new DeckError('TARGET_CAPABILITY','This target cannot represent the requested presentation yet.',422,result.issues);
 return result;
}
