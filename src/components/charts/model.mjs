/** Geometry is derived only; original numeric arrays and category order stay untouched. */
export function domain(values,axis={policy:'zero'}){
 const v=values.filter(v=>v!==null);let low=Math.min(...v),high=Math.max(...v);
 if(!v.length){low=0;high=1;}
 if(axis.policy==='fixed')return [axis.min,axis.max];
 if(axis.policy==='zero'){low=Math.min(0,low);high=Math.max(0,high);}
 if(low===high){const pad=Math.abs(low)*.1||1;low-=pad;high+=pad;}
 return [low,high];
}
export function chartModel(b,d){
 const kind=b.chartType||'line',order=d.categories.map((_,i)=>i);
 if(kind==='ranked-bar')order.sort((a,c)=>d.series[0].values[a]===null?d.series[0].values[c]===null?a-c:1:d.series[0].values[c]===null?-1:d.series[0].values[c]-d.series[0].values[a]||a-c);
 const values=kind==='stacked'?d.categories.flatMap((_,i)=>d.series.some(s=>s.values[i]===null)?[]:[d.series.reduce((v,s)=>v+Math.min(0,s.values[i]),0),d.series.reduce((v,s)=>v+Math.max(0,s.values[i]),0)]):d.series.flatMap(s=>s.values);
 return {kind,order,domain:domain(values,b.axis),xDomain:kind==='scatter'?domain(d.series.flatMap(s=>s.xValues),b.xAxis||{policy:'extent'}):null};
}
