/** Object identities survive scene movement, sorting and composition changes. */
export function annotationTargetExists(target,document){
 const b=document.blocks.find(b=>b.id===target.blockId);if(!b||b.type==='annotation')return false;
 if(target.line!==undefined)return b.type==='code'&&!target.objectId&&!target.seriesId&&target.line<=b.text.split('\n').length;
 if(target.seriesId&&!target.objectId)return false;
 if(target.objectId){
  if(b.type==='diagram')return !target.seriesId&&[...b.nodes,...b.edges.filter(e=>e.id)].some(n=>n.id===target.objectId);
  if(b.type==='chart'){const d=document.datasets.find(d=>d.id===b.datasetId);return !!d.categoryIds?.includes(target.objectId)&&(!target.seriesId||d.series.some(s=>s.id===target.seriesId));}
  return false;
 }
 return true;
}
