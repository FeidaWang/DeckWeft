// Every function here is also embedded verbatim in the offline web runtime (src/render/web/interaction-bundle.mjs): no module-level constants or imports.
/** Geometry is derived only; original numeric arrays and category order stay untouched. */
export function domain(values,axis={policy:'zero'}){
 const v=values.filter(v=>v!==null);let low=Math.min(...v),high=Math.max(...v);
 if(!v.length){low=0;high=1;}
 if(axis.policy==='fixed')return [axis.min,axis.max];
 // A log axis spans whole decades around the positive data; the misreading guards reject zero and negative values before this runs.
 if(axis.scale==='log'){if(!v.length)return [1,10];low=10**Math.floor(Math.log10(low));high=10**Math.ceil(Math.log10(high));return [low,high===low?high*10:high];}
 if(axis.policy==='zero'){low=Math.min(0,low);high=Math.max(0,high);}
 if(low===high){const pad=Math.abs(low)*.1||1;low-=pad;high+=pad;}
 return [low,high];
}
/** Draw order, scales and domains. Sorting orders a derived view: stable ties, missing entries last, the dataset keeps its author order. */
export function chartModel(b,d){
 const kind=b.chartType||'line',sort=b.sort||(kind==='ranked-bar'?'value-desc':'author'),order=d.categories.map((_,i)=>i);
 const key=kind==='stacked'?i=>d.series.some(s=>s.values[i]===null)?null:d.series.reduce((v,s)=>v+s.values[i],0):i=>d.series[0].values[i];
 if(sort!=='author'&&['ranked-bar','stacked'].includes(kind))order.sort((a,c)=>{const p=key(a),q=key(c);return p===null?q===null?a-c:1:q===null?-1:(sort==='value-asc'?p-q:q-p)||a-c;});
 // Interval bounds belong to the plotted range wherever the renderer draws them.
 const bounds=['line','dot-interval'].includes(kind)?d.series.flatMap(s=>s.interval?[...s.interval.lower,...s.interval.upper]:[]):[];
 const values=kind==='stacked'?d.categories.flatMap((_,i)=>d.series.some(s=>s.values[i]===null)?[]:[d.series.reduce((v,s)=>v+Math.min(0,s.values[i]),0),d.series.reduce((v,s)=>v+Math.max(0,s.values[i]),0)]):[...d.series.flatMap(s=>s.values),...bounds];
 return {kind,sort,order,scale:{y:b.axis?.scale||'linear',x:b.xAxis?.scale||'linear'},domain:domain(values,b.axis),xDomain:kind==='scatter'?domain(d.series.flatMap(s=>s.xValues),b.xAxis||{policy:'extent'}):null};
}
/** Share of the plotted range (0–1) on a linear or log scale. */
export function chartShare(v,[low,high],scale='linear'){
 return scale==='log'?(Math.log10(v)-Math.log10(low))/(Math.log10(high)-Math.log10(low)):(v-low)/(high-low);
}
/** Axis ticks: five even steps on a linear scale, whole decades on a log scale. Tick text may be rounded; it never replaces data. */
export function chartTicks([low,high],scale='linear',count=5){
 if(scale==='log'){const ticks=[];for(let e=Math.round(Math.log10(low));e<=Math.round(Math.log10(high));e++)ticks.push(Number((10**e).toPrecision(5)));return ticks;}
 return Array.from({length:count},(_,i)=>low+(high-low)*i/(count-1));
}
/** Every chart string, so both languages draw the same facts in the same places. */
export function chartText(locale){
 return locale==='zh-CN'?{
  missing:'缺失',reasons:{'not-collected':'未收集','not-applicable':'不适用',suppressed:'已隐去','not-comparable':'不可比','unknown':'原因未知'},
  kinds:{line:'折线',trend:'末端标注趋势',area:'面积','ranked-bar':'排序条形','direct-bar':'直接标注条形',stacked:'堆叠比较',scatter:'散点',heatmap:'热力矩阵','grouped-bar':'分组条形','dot-interval':'点与区间','small-multiples':'小多图','benchmark-table':'带限定说明的基准表'},
  policies:{zero:'含零',extent:'数据范围',fixed:'固定范围'},log:'对数刻度',truncated:'截断坐标轴',
  sorts:{author:'作者顺序','value-desc':'按数值从高到低','value-asc':'按数值从低到高'},
  synthetic:'合成演示数据',viewAll:'查看完整数据',category:'原始类别／时间',events:'事件',interval:'区间',
  explanation:'缺失值保留为空缺，不插值；堆叠中任一缺失使整组留空；散点需要两个坐标。',
  takeaway:'结论',question:'问题',definition:{denominator:'分母',sample:'样本',normalized:'已归一化',raw:'未归一化',version:'版本',collectedAt:'采集日期',validPeriod:'有效期'},
  better:{higher:'数值越高越好',lower:'数值越低越好',none:'无优劣方向'},
  intervalTypes:{ci:level=>`${level}% 置信区间`,sd:()=>'标准差',iqr:()=>'四分位距',range:()=>'范围'},method:'方法',
  relations:{temporal:'时间相邻，不表示因果',attributed:'归因见所引来源'},
  focus:'重点',other:'其他类别',otherSeries:'其他系列',best:'最佳',qualifier:'限定说明：编号见下方注释',
  truncation:low=>`坐标轴从 ${low} 开始，而不是 0`,logNote:'对数刻度：相同间距代表相同倍数。',shared:(low,high,unit)=>`所有小图共用同一刻度：${low}–${high} ${unit}`,
  bestRule:better=>`每列${better==='lower'?'最低':'最高'}的未限定数值标为“最佳”`,
  missingNote:'缺失值',paren:v=>`（${v}）`,dash:'——',separator:'，',listEnd:'。',colon:'：',rank:'排名',of:(n,total)=>`${total} 个中的 ${n} 个`,
  filter:(from,to,n,total)=>`筛选：按作者顺序 ${from} → ${to}（${total} 个类别中的 ${n} 个）`,seriesFilter:(names,n,total)=>`显示系列：${names}（${total} 个中的 ${n} 个）`,
  ranks:(ranks,total)=>`在全部 ${total} 个类别中的排名：${ranks}`,staticView:'静态视图',completeBelow:'完整数据见下方。'
 }:{
  missing:'Missing',reasons:{'not-collected':'not collected','not-applicable':'not applicable',suppressed:'suppressed','not-comparable':'not comparable','unknown':'reason unknown'},
  kinds:{line:'line',trend:'trend with end labels',area:'area','ranked-bar':'ranked bar','direct-bar':'direct-labelled bar',stacked:'stacked',scatter:'scatter',heatmap:'heatmap','grouped-bar':'grouped bar','dot-interval':'dot and interval','small-multiples':'small multiples','benchmark-table':'qualified benchmark table'},
  policies:{zero:'zero',extent:'extent',fixed:'fixed'},log:'log scale',truncated:'truncated axis',
  sorts:{author:'author order','value-desc':'sorted by value, highest first','value-asc':'sorted by value, lowest first'},
  synthetic:'Synthetic demonstration data',viewAll:'View all data',category:'Original category / time',events:'Events',interval:'interval',
  explanation:'Missing values remain gaps; no interpolation. Stacks with any missing member remain gaps. Scatter points need both coordinates.',
  takeaway:'Takeaway',question:'Question',definition:{denominator:'Denominator',sample:'Sample',normalized:'Normalized',raw:'Not normalized',version:'Version',collectedAt:'Collected',validPeriod:'Valid'},
  better:{higher:'Higher is better',lower:'Lower is better',none:'No better direction'},
  intervalTypes:{ci:level=>`${level}% confidence interval`,sd:()=>'standard deviation',iqr:()=>'interquartile range',range:()=>'range'},method:'method',
  relations:{temporal:'adjacent in time; not a cause',attributed:'attributed in a cited source'},
  focus:'Focus',other:'Other categories',otherSeries:'Other series',best:'best',qualifier:'Qualifier: numbered note below',
  truncation:low=>`Axis starts at ${low}, not zero`,logNote:'Log scale: equal steps are equal ratios.',shared:(low,high,unit)=>`All panels share one scale: ${low}–${high} ${unit}`,
  bestRule:better=>`“best” marks the ${better==='lower'?'lowest':'highest'} unqualified value in each column`,
  missingNote:'Missing',paren:v=>` (${v})`,dash:' — ',separator:', ',listEnd:'.',colon:': ',rank:'rank',of:(n,total)=>`${n} of ${total}`,
  filter:(from,to,n,total)=>`Filter: author order, ${from} → ${to} (${n} of ${total} categories)`,seriesFilter:(names,n,total)=>`Series shown: ${names} (${n} of ${total})`,
  ranks:(ranks,total)=>`ranks among all ${total}: ${ranks}`,staticView:'Static view',completeBelow:'Complete data below.'
 };
}
/** The one data object behind every view of a chart: marks, labels, notes, the text statement and the accessible table all read their numbers and words from here. */
export function chartFacts(block,d,locale){
 const t=chartText(locale),model=chartModel(block,d),kind=model.kind,ids=d.categoryIds||d.categories.map((_,i)=>'category-'+i),index=new Map(ids.map((id,i)=>[id,i])),seriesIndex=new Map(d.series.map((s,j)=>[s.id,j]));
 const display=i=>d.categoryKind==='datetime'?new Intl.DateTimeFormat(locale,{timeZone:d.timeZone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d.categories[i])):d.categories[i];
 // Only reasons, qualifiers and events bound to what this view shows are drawn; the complete table always carries the rest. Qualifier numbers follow the dataset's own order, so a filtered view and the complete table share them.
 const missing=(d.missing||[]).filter(m=>index.has(m.categoryId)&&seriesIndex.has(m.seriesId)).map(m=>({...m,i:index.get(m.categoryId),j:seriesIndex.get(m.seriesId)}));
 const qualifiers=(d.qualifiers||[]).filter(q=>index.has(q.categoryId)&&seriesIndex.has(q.seriesId)).map(q=>({...q,i:index.get(q.categoryId),j:seriesIndex.get(q.seriesId)})).sort((a,b)=>a.i-b.i||a.j-b.j);
 const marks=[...new Set((d.qualifiers||[]).map(q=>q.label))],qualifierAt=(j,i)=>qualifiers.find(q=>q.i===i&&q.j===j)||null,missingAt=(j,i)=>missing.find(m=>m.i===i&&m.j===j)||null;
 const events=(d.events||[]).map((e,n)=>({...e,n:n+1})).filter(e=>index.has(e.categoryId)).map(e=>({...e,i:index.get(e.categoryId)}));
 const interval=d.series.find(s=>s.interval)?.interval||null;
 const text=(j,i)=>{const v=d.series[j].values[i];return v===null?t.missing:String(v);};
 const sup=n=>String(n).replace(/\d/g,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[c]),cell=(j,i)=>{const m=missingAt(j,i),q=qualifierAt(j,i);return text(j,i)+(m?' · '+t.reasons[m.reason]:'')+(q?sup(marks.indexOf(q.label)+1):'');};
 const better=d.definition?.betterDirection||'none';
 // Best per column only among unqualified values; ties are all marked.
 const best=d.series.map((s,j)=>{if(better==='none')return new Set();const v=s.values.map((v,i)=>v===null||qualifierAt(j,i)?null:v),pick=better==='higher'?Math.max(...v.filter(v=>v!==null)):Math.min(...v.filter(v=>v!==null));return new Set(v.flatMap((v,i)=>v!==null&&v===pick?[i]:[]));});
 const focus=block.focus?.categoryIds?{categories:new Set(block.focus.categoryIds.filter(id=>index.has(id))),series:null}:block.focus?.seriesIds?{categories:null,series:new Set(block.focus.seriesIds)}:{categories:null,series:null};
 return {kind,model,t,locale,unit:d.unit,ids,display,categories:d.categories,series:d.series,text,cell,missing,missingAt,qualifiers,qualifierAt,marks,events,interval,better,best,focus,
  withUnit:value=>value+(d.unit?' '+d.unit:''),
  sortLabel:['ranked-bar','stacked'].includes(kind)&&(kind==='ranked-bar'||model.sort!=='author')?t.sorts[model.sort]:null,
  intervalText:(j,i)=>{const s=d.series[j];return s.interval&&s.values[i]!==null?`${s.interval.lower[i]}–${s.interval.upper[i]}`:'';}};
}
/** The plain-text statement of every shown value, in drawing order. */
export function chartSummary(f){
 return f.model.order.map(i=>f.series.length===1?`${f.display(i)} ${f.withUnit(f.text(0,i))}`:`${f.display(i)} (${f.series.map((s,j)=>`${s.label} ${s.xValues?'x='+s.xValues[i]+', y=':''}${f.withUnit(f.text(j,i))}`).join(f.locale==='zh-CN'?'；':'; ')})`);
}
