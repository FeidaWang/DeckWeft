/** Pure, browser-compatible state. Numeric source arrays are never mutated. */
/** The category and series that the chart explanation line describes: the focused series if any, else every shown series, at the first category of the caption order inside the current range. */
export function captionSubject(spec,state){
 const from=spec.categoryIds.indexOf(state.fromId),to=spec.categoryIds.indexOf(state.toId),categoryId=spec.captionOrder.find(id=>{const i=spec.categoryIds.indexOf(id);return i>=from&&i<=to;});
 return {categoryId,seriesIds:state.focusSeriesId?[state.focusSeriesId]:[...state.seriesIds]};
}
/**
 * EvidenceStage state: a chart keeps its dataset, metric, shown series, focused series, range, order, scale and caption subject as separate fields, never one index.
 * Shown series (seriesIds) hide or show whole series; focusSeriesId emphasises one shown series and hides nothing. datasetId, metricId, sortKey and scale
 * are the chart's declarations; no event changes them until a metric switch, an interactive sort or a scale shift is drawn.
 */
export function initialInteractionState(specs){
 return specs.map(s=>{
  if(s.kind!=='chart-select')return {id:s.id,kind:s.kind,...(s.kind==='image-compare'?{tabId:s.initialTab||'both'}:s.kind==='steps'?(s.blueprint?{stage:'explain',stepId:null}:{stepId:s.initialStepId||s.steps[0].id}):{hotspotId:null})};
  const view={seriesIds:[...s.initialSeriesIds],focusSeriesId:s.initialFocusSeriesId??null,fromId:s.initialFromId,toId:s.initialToId};
  return {id:s.id,kind:s.kind,datasetId:s.datasetId,metricId:null,...view,sortKey:s.sortKey,scale:{...s.scale},caption:captionSubject(s,view)};
 });
}
export function reduceInteractionState(specs,state,event){
 const spec=specs.find(s=>s.id===event.interactionId),old=state.find(s=>s.id===event.interactionId);if(!spec||!old)throw Error('Unknown stable interaction identity.');
 const next={...old};
 if(event.event==='data.filter'&&spec.kind==='chart-select'){
  if(!Array.isArray(event.seriesIds)||!event.seriesIds.length||new Set(event.seriesIds).size!==event.seriesIds.length||event.seriesIds.some(id=>!spec.seriesIds.includes(id)))throw Error('Select at least one existing series.');
  const from=spec.categoryIds.indexOf(event.fromId),to=spec.categoryIds.indexOf(event.toId);if(from<0||to<from)throw Error('Select an ordered range of existing categories.');
  next.seriesIds=spec.seriesIds.filter(id=>event.seriesIds.includes(id));next.fromId=event.fromId;next.toId=event.toId;
  // Hiding the focused series ends the focus; the focus never moves to another series.
  if(next.focusSeriesId&&!next.seriesIds.includes(next.focusSeriesId))next.focusSeriesId=null;
  next.caption=captionSubject(spec,next);
 }else if(event.event==='data.focus'&&spec.kind==='chart-select'){
  const seriesId=event.seriesId??null;
  if(seriesId!==null&&spec.chartType==='heatmap')throw Error('Series focus is not drawn on heatmaps; show or hide rows instead.');
  if(seriesId!==null&&spec.seriesIds.length<2)throw Error('A single-series chart cannot focus a series; declare a category focus on the chart instead.');
  if(seriesId!==null&&!old.seriesIds.includes(seriesId))throw Error('Show a series before focusing it; focus never reveals a hidden series.');
  next.focusSeriesId=seriesId;next.caption=captionSubject(spec,next);
 }else if(event.event==='tab.select'&&spec.kind==='image-compare'){
  if(!['first','second','both'].includes(event.tabId))throw Error('Unknown comparison tab.');next.tabId=event.tabId;
 }else if(event.event==='step.next'&&spec.kind==='steps'){
  // Blueprint A (S9b): Explain → Diagram (the whole, no part) → Explore each part in reading order; the last part stays.
  if(spec.blueprint&&old.stage==='explain'){next.stage='diagram';next.stepId=null;}
  else{next.stepId=spec.steps[Math.min(spec.steps.length-1,spec.steps.findIndex(s=>s.id===old.stepId)+1)].id;if(spec.blueprint)next.stage='explore';}
 }else if(event.event==='step.select'&&spec.kind==='steps'){
  // A blueprint's “Show whole” is step.select without a part: back to the Diagram stage.
  if(spec.blueprint&&event.stepId===null){next.stage='diagram';next.stepId=null;}
  else{if(!spec.steps.some(s=>s.id===event.stepId))throw Error('Unknown stable step identity.');next.stepId=event.stepId;if(spec.blueprint)next.stage='explore';}
 }else if(event.event==='annotation.reveal'&&spec.kind==='image-hotspots'){
  if(event.hotspotId!==null&&!spec.hotspots.some(h=>h.id===event.hotspotId))throw Error('Unknown stable hotspot identity.');next.hotspotId=event.hotspotId;
 }else throw Error('This semantic event does not apply to this component.');
 return state.map(s=>s.id===next.id?next:s);
}
export function seekInteractionState(specs,cues,position){
 if(!Number.isSafeInteger(position)||position<0||position>cues.length)throw Error('Seek to an existing cue boundary.');
 return cues.slice(0,position).reduce((state,event)=>reduceInteractionState(specs,state,event),initialInteractionState(specs));
}
export function selectedDataset(dataset,state){
 const from=dataset.categoryIds.indexOf(state.fromId),to=dataset.categoryIds.indexOf(state.toId),indices=dataset.categories.map((_,i)=>i).filter(i=>i>=from&&i<=to);
 return {...dataset,categories:indices.map(i=>dataset.categories[i]),categoryIds:indices.map(i=>dataset.categoryIds[i]),series:dataset.series.filter(s=>state.seriesIds.includes(s.id)).map(s=>({...s,values:indices.map(i=>s.values[i]),...(s.xValues?{xValues:indices.map(i=>s.xValues[i])}:{})}))};
}
