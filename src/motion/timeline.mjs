/** Pure, browser-compatible state. Numeric source arrays are never mutated. */
export function initialInteractionState(specs){
 return specs.map(s=>({id:s.id,kind:s.kind,...(s.kind==='chart-select'?{seriesIds:[...s.initialSeriesIds],fromId:s.initialFromId,toId:s.initialToId}:s.kind==='image-compare'?{tabId:s.initialTab||'both'}:s.kind==='steps'?{stepId:s.initialStepId||s.steps[0].id}:{hotspotId:null})}));
}
export function reduceInteractionState(specs,state,event){
 const spec=specs.find(s=>s.id===event.interactionId),old=state.find(s=>s.id===event.interactionId);if(!spec||!old)throw Error('Unknown stable interaction identity.');
 const next={...old};
 if(event.event==='data.filter'&&spec.kind==='chart-select'){
  if(!Array.isArray(event.seriesIds)||!event.seriesIds.length||new Set(event.seriesIds).size!==event.seriesIds.length||event.seriesIds.some(id=>!spec.seriesIds.includes(id)))throw Error('Select at least one existing series.');
  const from=spec.categoryIds.indexOf(event.fromId),to=spec.categoryIds.indexOf(event.toId);if(from<0||to<from)throw Error('Select an ordered range of existing categories.');
  next.seriesIds=spec.seriesIds.filter(id=>event.seriesIds.includes(id));next.fromId=event.fromId;next.toId=event.toId;
 }else if(event.event==='tab.select'&&spec.kind==='image-compare'){
  if(!['first','second','both'].includes(event.tabId))throw Error('Unknown comparison tab.');next.tabId=event.tabId;
 }else if(event.event==='step.next'&&spec.kind==='steps'){
  next.stepId=spec.steps[Math.min(spec.steps.length-1,spec.steps.findIndex(s=>s.id===old.stepId)+1)].id;
 }else if(event.event==='step.select'&&spec.kind==='steps'){
  if(!spec.steps.some(s=>s.id===event.stepId))throw Error('Unknown stable step identity.');next.stepId=event.stepId;
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
