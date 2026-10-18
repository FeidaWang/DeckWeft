/** Chart and dataset semantics from the design handoff (S1). Declarations only: nothing here changes a stored number or draws a mark. */
export const PERCENT_UNITS=/^(%|％|percent(?:age)?(?: points?)?|pct|百分比|百分点)$/i;
export const CAUSAL_WORDS=/\b(because|caused?|causes|causing|due to|led to|leads? to|results?(?:ed)? (?:in|from)|owing to|thanks to|triggered)\b|导致|因为|由于|引起|造成|致使|使得|促成|归因/i;
export const FILLED_KINDS=['area','ranked-bar','stacked'];
export const isPercentUnit=unit=>PERCENT_UNITS.test(String(unit).trim());
const excludesZero=(axis,values)=>axis?.policy==='fixed'?axis.min>0||axis.max<0:axis?.policy==='extent'?values.every(v=>v>0)||values.every(v=>v<0):false;
/** Resolved per-chart declarations with the documented defaults applied. */
export function chartSemantics(block,dataset){
 const kind=block.chartType||'line';
 return {kind,question:block.question||null,takeaway:block.takeaway||null,scale:{y:block.axis?.scale||'linear',x:block.xAxis?.scale||'linear'},sort:block.sort||(kind==='ranked-bar'?'value-desc':'author'),truncation:block.truncation||null,intervalSeriesIds:dataset.series.filter(s=>s.interval).map(s=>s.id),eventIds:(dataset.events||[]).map(e=>e.id),missingReasons:(dataset.missing||[]).length};
}
/** Resolved per-dataset declarations with the documented defaults applied. */
export function datasetSemantics(dataset){
 const interval=dataset.series.find(s=>s.interval)?.interval;
 return {id:dataset.id,unit:dataset.unit,percent:isPercentUnit(dataset.unit),version:dataset.version||null,collectedAt:dataset.collectedAt||null,validPeriod:dataset.validPeriod||null,definition:{denominator:null,sample:null,normalized:false,betterDirection:'none',...dataset.definition},intervalType:interval?.type||null,intervalLevel:interval?.level??null};
}
/** The six misreading guards. Five apply whenever their fields exist; the percent-denominator guard needs rules.misreading = strict because existing documents omit denominators. */
export function validateChartSemantics(document,fail){
 const strict=document.rules?.misreading==='strict',sources=new Set(document.sources.map(s=>s.id)),day=v=>{if(v===undefined)return true;const [year,month,dayOfMonth]=v.split('-').map(Number);return month>=1&&month<=12&&dayOfMonth>=1&&dayOfMonth<=new Date(Date.UTC(year,month,0)).getUTCDate();};
 for(const d of document.datasets){
  const categoryIds=d.categoryIds||[],index=id=>categoryIds.indexOf(id);
  if(!day(d.collectedAt)||(d.validPeriod&&(!day(d.validPeriod.from)||!day(d.validPeriod.to)||d.validPeriod.from>d.validPeriod.to)))fail('Dataset dates need real calendar days and an ordered valid period.');
  if(strict&&isPercentUnit(d.unit)&&!d.definition?.denominator)fail(`Declare the denominator of percentage dataset "${d.id}" (rules.misreading is strict).`);
  if(d.missing?.length){
   if(!d.categoryIds)fail('Missing-value reasons need stable categoryIds; never bind reasons to label positions.');
   const seen=new Set();
   for(const m of d.missing){
    const s=d.series.find(s=>s.id===m.seriesId),i=index(m.categoryId),key=m.seriesId+'\u0000'+m.categoryId;
    if(!s||i<0)fail('A missing-value reason must name an existing series and category.');
    if(seen.has(key))fail('Give each missing value one reason.');seen.add(key);
    if(s.values[i]!==null)fail('A missing-value reason can only explain a null; the value stays null and is never replaced by zero.');
   }
  }
  const declared=d.series.filter(s=>s.interval);
  if(declared.length){
   const first=declared[0].interval;
   for(const s of declared){
    const v=s.interval;
    if(v.type!==first.type||(v.level??null)!==(first.level??null))fail('One dataset carries one interval type and level; confidence intervals, standard deviations and quantile ranges are never mixed.');
    if(v.type==='ci'?!(v.level>0&&v.level<100):v.level!==undefined)fail('Confidence intervals need a level between 0 and 100; other interval types carry no level.');
    if(v.lower.length!==s.values.length||v.upper.length!==s.values.length)fail('Interval bounds need one entry per category.');
    s.values.forEach((value,i)=>{const lo=v.lower[i],hi=v.upper[i];if(value===null?lo!==null||hi!==null:lo===null||hi===null||lo>value||value>hi)fail('Interval bounds must enclose each value and stay null where the value is null.');});
   }
  }
  if(d.events?.length){
   if(!d.categoryIds)fail('Events need stable categoryIds to bind their position.');
   if(new Set(d.events.map(e=>e.id)).size!==d.events.length)fail('Use unique event ids.');
   for(const e of d.events){
    if(index(e.categoryId)<0)fail('An event must bind an existing category.');
    if(e.sourceIds.some(id=>!sources.has(id)))fail('An event source reference is missing.');
    if(e.relation==='attributed'&&!e.sourceIds.length)fail('An attributed event needs at least one source; adjacency alone is never a cause.');
    if(e.relation==='temporal'&&CAUSAL_WORDS.test(e.label))fail('A temporal event label cannot assert a cause; use relation "attributed" with a source instead.');
   }
  }
 }
 for(const b of document.blocks){
  if(b.type!=='chart')continue;
  const d=document.datasets.find(d=>d.id===b.datasetId);if(!d)continue;
  const kind=b.chartType||'line',values=d.series.flatMap(s=>s.values).filter(v=>v!==null),xValues=d.series.flatMap(s=>s.xValues||[]).filter(v=>v!==null);
  for(const [key,data] of [['axis',values],['xAxis',xValues]]){
   const a=b[key];if(a?.scale!=='log')continue;
   if(FILLED_KINDS.includes(kind))fail('Filled marks cannot sit on a log axis; there is no zero baseline to fill from.');
   if(a.policy==='zero'||a.policy==='fixed'&&a.min<=0)fail('A log axis is declared per chart and cannot include zero; use extent or a positive fixed range.');
   if(data.some(v=>v<=0))fail('A log axis needs strictly positive values.');
  }
  if(b.truncation){
   if(!FILLED_KINDS.includes(kind))fail('Truncation is declared only for bars, stacks and areas.');
   if(!excludesZero(b.axis,values))fail('Truncation is declared but the axis still starts at zero; remove the flag or the non-zero range.');
  }
  if(b.sort&&b.sort!=='author'){
   if(!['ranked-bar','stacked'].includes(kind))fail('Value sorting applies to ranked bars and stacks only.');
   if(d.categoryKind==='datetime')fail('Time categories keep their order; sort by value is not allowed.');
  }
 }
}
