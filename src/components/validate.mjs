import {annotationTargetExists} from './annotations/model.mjs';
import {validateChartSemantics} from './charts/semantics.mjs';
export function validateComponents(document,fail){
 for(const d of document.datasets){
  if(d.categoryIds&&d.categoryIds.length!==d.categories.length)fail('Category identities must match every category.');
  for(const s of d.series)if(s.xValues&&s.xValues.length!==d.categories.length)fail('Scatter x coordinates must match every category.');
  if(d.categoryKind==='datetime'){
   if(!d.timeZone)fail('Datetime data needs an explicit IANA time zone.');
   try{new Intl.DateTimeFormat('en',{timeZone:d.timeZone}).format();}catch{fail('Use a valid IANA time zone.');}
   if(d.categories.some(c=>!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(c)||!Number.isFinite(Date.parse(c))))fail('Datetime categories need explicit offset instants.');
   if(d.categories.some(c=>{const [year,month,day]=c.slice(0,10).split('-').map(Number);return month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate();}))fail('Use real calendar dates; invalid days are never normalized.');
   if(d.categories.some((c,i)=>i&&Date.parse(c)<=Date.parse(d.categories[i-1])))fail('Time instants must increase strictly; no implicit reorder.');
  }else if(d.timeZone)fail('Time zones apply only to datetime categories.');
 }
 for(const b of document.blocks){
  if(b.type==='chart'){
   const d=document.datasets.find(d=>d.id===b.datasetId);if(!d)continue;
   const kind=b.chartType||'line';
   if(kind==='ranked-bar'&&d.series.length!==1)fail('Ranked bars need exactly one series.');
   if(kind==='scatter'&&(!d.xUnit||d.series.some(s=>!s.xValues)))fail('Scatter needs explicit numeric xValues and xUnit.');
   if(kind!=='scatter'&&b.xAxis)fail('xAxis is supported only for numeric scatter.');
   for(const [key,values]of [['axis',d.series.flatMap(s=>s.values)],['xAxis',d.series.flatMap(s=>s.xValues||[])]]){
    const a=b[key];if(!a)continue;
    if(a.policy==='fixed'){
     if(a.min===undefined||a.max===undefined||a.min>=a.max)fail('Fixed axes need increasing min/max.');
     if(values.some(v=>v!==null&&(v<a.min||v>a.max)))fail('Fixed axes cannot hide data outside the range.');
     if(kind==='stacked'&&d.categories.some((_,i)=>d.series.reduce((n,s)=>n+Math.max(0,s.values[i]??0),0)>a.max||d.series.reduce((n,s)=>n+Math.min(0,s.values[i]??0),0)<a.min))fail('Fixed stacked axis must contain signed totals.');
    }else if(a.min!==undefined||a.max!==undefined)fail('Only fixed axes accept min/max.');
    if(['area','ranked-bar','stacked','grouped-bar'].includes(kind)&&key==='axis'&&!b.truncation&&(a.policy==='extent'||a.policy==='fixed'&&(a.min>0||a.max<0)))fail('Filled marks require a zero baseline unless truncation is declared with a note.');
   }
  }
  if(b.type==='diagram'){
   const ids=[...b.nodes.map(n=>n.id),...b.edges.filter(e=>e.id).map(e=>e.id)];if(new Set(ids).size!==ids.length)fail('Diagram object identities must be unique.');
  }
  if(b.type==='code'){
   if(b.emphasizedLines?.some(n=>n>b.text.split('\n').length))fail('Emphasis line is outside the exact code.');
   if(b.sourceAnchor&&(!b.sourceIds.includes(b.sourceAnchor.sourceId)||!document.sources.some(s=>s.id===b.sourceAnchor.sourceId)))fail('Code anchor must link a declared source.');
  }
  if(b.type==='annotation'&&!annotationTargetExists(b.target,document))fail('Annotation target is missing or incompatible. Restore the stable target; do not retarget by position.');
 }
 validateChartSemantics(document,fail);
}
