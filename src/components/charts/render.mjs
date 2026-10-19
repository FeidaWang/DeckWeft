import {objectAnchor} from '../annotations/identity.mjs';
import {x} from '../../render/web/components/escape.mjs';
import {chartFacts,chartShare,chartTicks} from './model.mjs';
// Every function here is also embedded verbatim in the offline web runtime (src/render/web/interaction-bundle.mjs): no module-level constants.
/** One figure per chart: question and caption, the plot, legend, notes, takeaway, data definition and the complete table, all drawn from one chartFacts() object. */
export function chart(block,document,theme,{sceneId='scene',anchors,paletteIds}={}){
 const anchor=(objectId,seriesId='')=>anchors?anchors[JSON.stringify([objectId,seriesId])]:objectAnchor(sceneId,block.id,objectId,seriesId);
 const d=document.datasets.find(d=>d.id===block.datasetId),f=chartFacts(block,d,document.locale),t=f.t,m=f.model,kind=m.kind;
 const color=j=>theme.chart[(kind==='heatmap'||!paletteIds?j:paletteIds.indexOf(d.series[j]?.id))%theme.chart.length];
 const name=kind==='ranked-bar'&&m.sort==='author'?'direct-bar':kind==='line'&&block.labels==='end'?'trend':kind,policy=block.axis?.policy||'zero';
 const caption=`${d.unit} · ${t.kinds[name]} · ${t.policies[policy]}${m.scale.y==='log'||m.scale.x==='log'?' · '+t.log:''}${block.truncation?' · '+t.truncated:''}${kind==='heatmap'?' ['+m.domain.join(', ')+']':''}${f.sortLabel?' · '+f.sortLabel:''}${d.timeZone?' · '+d.timeZone:''}${d.synthetic?' · '+t.synthetic:''}`;
 const view={block,d,f,t,theme,color,anchor,caption,ident:(i,j)=>`id="${anchor(f.ids[i],d.series[j].id)}" tabindex="-1" data-object-id="${x(f.ids[i])}" data-series-id="${x(d.series[j].id)}"`};
 const plot=['ranked-bar','grouped-bar','dot-interval'].includes(kind)?rowPlot(view):kind==='small-multiples'?facetPlot(view):kind==='benchmark-table'?benchmarkPlot(view):name==='trend'?trendPlot(view):svgPlot(view);
 // Legend keys are inline SVG so they print and keep the series shape and dash; a black-and-white copy still tells series apart.
 const key=(j,c,shape)=>`<svg class="legend-key" viewBox="0 0 28 12" aria-hidden="true">${shape==='line'?`<path d="M1 6H27" stroke="${c}" stroke-width="2.5" stroke-dasharray="${chartDash(j)}"/>${chartShape(j,14,6,4.5,c)}`:shape==='point'?chartShape(j,14,6,4.5,c):shape==='muted'?`<rect x="2" y="2" width="24" height="8" fill="${c}" fill-opacity=".28" stroke="${c}" stroke-width="1.5"/>`:shape==='outline'?`<rect x="2" y="2" width="24" height="8" fill="${c}" stroke="currentColor"/>`:`<rect x="2" y="2" width="24" height="8" fill="${c}"/>`}</svg>`;
 const item=(k,label,muted=false)=>`<li${muted?' data-muted="true"':''}>${k}${x(label)}</li>`,inFocus=s=>f.focus.series&&f.focus.series.has(s.id)?' · '+t.focus:'';
 const legend=`<ul class="legend">${kind==='benchmark-table'?(f.better==='none'?'':item(`<svg class="legend-key" viewBox="0 0 28 12" aria-hidden="true"><rect x="1" y="1" width="26" height="10" fill="none" stroke="currentColor"/></svg>`,`${t.better[f.better]}${t.separator}${t.bestRule(f.better)}`))+(f.marks.length?item(`<svg class="legend-key" viewBox="0 0 28 12" aria-hidden="true"><path d="M8 10V2l-3 2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,t.qualifier):''):kind==='heatmap'?[[f.locale==='zh-CN'?'负数':'Negative',color(1)],[f.locale==='zh-CN'?'零':'Zero','transparent'],[f.locale==='zh-CN'?'正数':'Positive',color(0)],[t.missing,'transparent']].map(([label,c])=>item(key(0,c,'outline'),label)).join(''):f.focus.categories?item(key(0,color(0),'bar'),t.focus+t.colon+[...f.focus.categories].map(id=>f.display(f.ids.indexOf(id))).join(t.separator))+item(key(0,color(0),'muted'),t.other):d.series.map((s,j)=>item(key(j,color(j),['line','small-multiples'].includes(kind)?'line':['scatter','dot-interval'].includes(kind)?'point':'bar'),s.label+inFocus(s),f.focus.series&&!f.focus.series.has(s.id))).join('')}</ul>`;
 const def=d.definition||{},definition=[def.denominator&&t.definition.denominator+t.colon+def.denominator,def.sample&&t.definition.sample+t.colon+def.sample,def.normalized!==undefined&&(def.normalized?t.definition.normalized:t.definition.raw),def.betterDirection&&t.better[def.betterDirection],d.version&&t.definition.version+t.colon+d.version,d.collectedAt&&t.definition.collectedAt+t.colon+d.collectedAt,d.validPeriod&&t.definition.validPeriod+t.colon+d.validPeriod.from+' – '+d.validPeriod.to].filter(Boolean);
 return `<figure class="chart" data-chart-type="${kind}"${name!==kind?` data-chart-variant="${name}"`:''}><figcaption>${block.question?`<span class="chart-question">${x(block.question)}</span>`:''}<span class="chart-caption">${x(caption)}</span></figcaption>${plot}${legend}${chartNotes(view)}${block.takeaway?`<p class="chart-takeaway"><strong>${x(t.takeaway)}</strong>${x(t.colon+block.takeaway)}</p>`:''}${definition.length?`<p class="chart-definition">${x(definition.join(' · '))}</p>`:''}${chartTable(view)}</figure>`;
}
/** Series identity without colour: a dash pattern and a marker shape per series, so a black-and-white copy still tells series apart. */
export function chartDash(j){return ['none','9 5','2 4','10 4 2 4'][j%4];}
export function chartShape(j,cx,cy,r,fill){
 // Shapes cycle against the four dashes, so up to eight series keep a distinct dash-and-shape pair.
 const k=(j+Math.floor(j/4))%4,paint=k>=2?`fill="none" stroke="${fill}" stroke-width="2"`:`fill="${fill}"`;
 return k%2?`<rect x="${cx}" y="${cy}" width="${r*1.8}" height="${r*1.8}" transform="translate(${-r*.9} ${-r*.9})" ${paint}/>`:`<circle cx="${cx}" cy="${cy}" r="${r}" ${paint}/>`;
}
/** Visible notes for everything the plot alone cannot say: truncation, scale, intervals, events, missing reasons and qualifiers. Focus and comparison rules are in the legend. */
export function chartNotes({block,d,f,t}){
 const m=f.model,kind=m.kind,notes=[];
 if(block.truncation)notes.push(t.truncation(m.domain[0])+t.colon+block.truncation.note);
 if(m.scale.y==='log'||m.scale.x==='log')notes.push(t.logNote);
 if(kind==='small-multiples')notes.push(t.shared(m.domain[0],m.domain[1],d.unit));
 if(f.interval&&['line','dot-interval'].includes(kind))notes.push(`${t.interval[0].toUpperCase()+t.interval.slice(1)}${t.colon}${t.intervalTypes[f.interval.type](f.interval.level)} · ${t.method} ${f.interval.method}`);
 for(const e of f.events)notes.push(`${e.n} · ${f.display(e.i)} · ${e.label}${t.paren(t.relations[e.relation])}`);
 const missingAt=new Set();
 for(const r of f.missing)notes.push(missingAt.add(notes.length)&&`${t.missingNote} · ${d.series[r.j].label}${t.separator}${f.display(r.i)}${t.colon}${t.reasons[r.reason]}${r.note?t.dash+r.note:''}`);
 f.marks.forEach((label,n)=>{const cells=f.qualifiers.filter(q=>q.label===label);if(cells.length)notes.push(`${n+1} ${label}${[...new Set(cells.flatMap(q=>q.note?[q.note]:[]))].map(v=>t.dash+v).join('')}`);});
 return notes.length?`<ul class="chart-notes">${notes.map((n,i)=>`<li${missingAt.has(i)?' data-missing="true"':''}>${x(n)}</li>`).join('')}</ul>`:'';
}
/** The complete data in author order: original categories, exact values, missing reasons, qualifier marks, interval bounds and events. Theme-independent by construction. */
export function chartTable({d,f,t,caption}){
 const kind=f.model.kind,intervals=d.series.filter(s=>s.interval);
 return `<details><summary>${x(t.viewAll)}</summary><p class="component-note">${x(t.explanation)}</p><div class="table-scroll"><table><caption>${x(caption)}</caption><thead><tr><th scope="col">${x(t.category)}</th>${d.series.map(s=>`${kind==='scatter'?`<th scope="col">${x(s.label+' x · '+d.xUnit)}</th>`:''}<th scope="col">${x(s.label+' · '+d.unit)}</th>`).join('')}${intervals.map(s=>`<th scope="col">${x(s.label+' · '+t.intervalTypes[s.interval.type](s.interval.level))}</th>`).join('')}${f.events.length?`<th scope="col">${x(t.events)}</th>`:''}</tr></thead><tbody>${d.categories.map((c,i)=>`<tr><th scope="row">${x(c)}</th>${d.series.map((s,j)=>`${kind==='scatter'?`<td>${x(s.xValues[i]===null?t.missing:String(s.xValues[i]))}</td>`:''}<td>${x(f.cell(j,i))}</td>`).join('')}${intervals.map(s=>`<td>${x(f.intervalText(d.series.indexOf(s),i))}</td>`).join('')}${f.events.length?`<td>${x(f.events.filter(e=>e.i===i).map(e=>`${e.n} ${e.label}${t.paren(t.relations[e.relation])}`).join(t.separator))}</td>`:''}</tr>`).join('')}</tbody></table></div></details>`;
}
/** Line, area, stacked, scatter and heatmap on one fixed SVG frame. Wide plots scroll on narrow screens; their point labels are not conclusion labels. */
export function svgPlot({block,d,f,t,color,anchor,ident,caption}){
 const m=f.model,kind=m.kind,missing=t.missing,value=v=>v===null?missing:String(v),tick=v=>Number(v.toPrecision(5)),hasIntervals=kind==='line'&&d.series.some(s=>s.interval);
 // A heatmap's row labels sit left of the cells; the margin grows with the longest label (CJK counts as a full em), up to a third of the frame.
 const rowLabel=kind==='heatmap'?Math.max(0,...d.series.map(s=>[...s.label].reduce((w,c)=>w+(/[⺀-鿿＀-￯]/.test(c)?18:10.5),0))):0;
 const compact=['line','area'].includes(kind)&&!hasIntervals&&!f.events.length&&m.scale.y==='linear'&&d.categoryKind!=='datetime'&&d.categories.length<=6&&d.categories.every(c=>c.length<=5)&&d.series.length<=2&&d.series.every(s=>s.values.every(v=>v===null||String(v).length<=5))&&chartTicks(m.domain).every(v=>String(tick(v)).length<=5),W=800,H=400,L=Math.min(260,Math.max(100,Math.ceil(rowLabel+16))),R=680,T=compact?50:30,B=compact?270:310;
 const share=v=>Math.max(0,Math.min(1,chartShare(v,m.domain,m.scale.y))),y=v=>B-share(v)*(B-T),linearX=i=>d.categories.length===1?(L+R)/2:(compact?L+45:L)+i*(R-L-(compact?45:0))/(d.categories.length-1),px=i=>d.categories.length===1?(L+R)/2:d.categoryKind==='datetime'?L+(Date.parse(d.categories[i])-Date.parse(d.categories[0]))/(Date.parse(d.categories.at(-1))-Date.parse(d.categories[0]))*(R-L):(kind==='stacked'?L+60+i*(R-L-120)/(d.categories.length-1):linearX(i));
 // Stacks follow the declared sort; every other kind keeps author (or time) order.
 const at=i=>px(kind==='stacked'?m.order.indexOf(i):i),title=(i,j)=>`<title>${x(d.categories[i]+' · '+d.series[j].label+': '+value(d.series[j].values[i])+' '+d.unit)}</title>`;
 const txt=(a,b,s,extra='')=>`<text x="${a}" y="${b}" ${extra}>${x(s)}</text>`,muted=j=>f.focus.series&&!f.focus.series.has(d.series[j].id);
 let marks='',axes='';
 if(kind!=='heatmap'){
  axes=chartTicks(m.domain,m.scale.y).map(v=>`<path d="M${L} ${y(v)}H${R}" stroke="currentColor" opacity=".2"/>`+txt(L-12,y(v)+4,tick(v),'text-anchor="end"')).join('');
  axes+=d.categories.map((_,i)=>kind==='scatter'?'':txt(at(i),350,f.display(i),'text-anchor="middle"')).join('');
  if(block.truncation)axes+=`<path d="M${L-6} ${B-4}l6 -5 6 5 6 -5" fill="none" stroke="currentColor" stroke-width="2"/>`;
 }
 for(const e of kind==='scatter'||kind==='heatmap'?[]:f.events)axes+=`<g data-event-id="${x(e.id)}"><path d="M${at(e.i)} ${T}V${B}" stroke="currentColor" stroke-dasharray="3 5" opacity=".7"/><circle cx="${at(e.i)}" cy="${T-14}" r="10" fill="none" stroke="currentColor"/>${txt(at(e.i),T-9,e.n,'text-anchor="middle"')}</g>`;
 if(['line','area'].includes(kind))d.series.forEach((s,j)=>{
  let runs=[],run=[];s.values.forEach((v,i)=>{if(v===null){if(run.length)runs.push(run);run=[];}else run.push([px(i),y(v)]);});if(run.length)runs.push(run);
  const base=y(Math.max(m.domain[0],Math.min(m.domain[1],0))),stroke=muted(j)?`stroke="${color(j)}" stroke-width="2" opacity=".45"`:`stroke="${color(j)}" stroke-width="3"`;
  marks+=runs.map(r=>`${kind==='area'?`<polygon points="${r[0][0]},${base} ${r.map(p=>p.join(',')).join(' ')} ${r.at(-1)[0]},${base}" fill="${color(j)}" opacity=".18"/>`:''}<polyline fill="none" ${stroke}${j?` stroke-dasharray="${chartDash(j)}"`:''} points="${r.map(p=>p.join(',')).join(' ')}"/>`).join('');
  marks+=s.values.map((v,i)=>v===null?`<g ${ident(i,j)}>${title(i,j)}${j===0?txt(px(i),B-8,missing,'text-anchor="middle"'):''}</g>`:`<g ${ident(i,j)}>${title(i,j)}${s.interval?`<path d="M${px(i)} ${y(s.interval.lower[i])}V${y(s.interval.upper[i])}M${px(i)-5} ${y(s.interval.lower[i])}h10M${px(i)-5} ${y(s.interval.upper[i])}h10" stroke="${color(j)}" stroke-width="1.5"/>`:''}${chartShape(j,px(i),y(v),5,color(j))}${txt(px(i)+(s.interval?10:0),y(v)+(compact&&d.series.some((s,k)=>k!==j&&s.values[i]!==null&&(s.values[i]>v||s.values[i]===v&&k<j))?36:compact?-16:-12),value(v),s.interval?'text-anchor="start"':'text-anchor="middle"')}</g>`).join('');
 });
 if(kind==='stacked')d.categories.forEach((_,i)=>{
  if(d.series.some(s=>s.values[i]===null)){marks+=d.series.map((s,j)=>`<g ${ident(i,j)}>${title(i,j)}${j===0?txt(at(i),y(Math.max(m.domain[0],0))-12,missing,'text-anchor="middle"'):''}</g>`).join('');return;}
  let pos=0,neg=0;d.series.forEach((s,j)=>{const v=s.values[i],from=v>=0?pos:neg,to=from+v;if(v>=0)pos=to;else neg=to;const width=Math.min(70,(R-L)/d.categories.length*.7);marks+=`<g ${ident(i,j)}>${title(i,j)}<rect x="${at(i)-width/2}" y="${Math.min(y(from),y(to))}" width="${width}" height="${Math.max(1,Math.abs(y(to)-y(from)))}" fill="${color(j)}"/>${txt(at(i)+width/2+6,v===0?y(0)-14:(y(from)+y(to))/2+4,value(v))}</g>`;});
 });
 if(kind==='scatter'){
  const sx=v=>L+chartShare(v,m.xDomain,m.scale.x)*(R-L);
  axes+=chartTicks(m.xDomain,m.scale.x).map(v=>txt(sx(v),350,tick(v),'text-anchor="middle"')).join('');
  d.series.forEach((s,j)=>s.values.forEach((v,i)=>{if(v===null||s.xValues[i]===null){marks+=`<g ${ident(i,j)}>${title(i,j)}</g>`;return;}marks+=`<g ${ident(i,j)}>${title(i,j)}${chartShape(j,sx(s.xValues[i]),y(v),7,color(j))}${txt(sx(s.xValues[i])+(sx(s.xValues[i])>540?-10:10),y(v)-10,d.categories[i]+': '+s.xValues[i]+', '+v,sx(s.xValues[i])>540?'text-anchor="end"':'')}</g>`;}));
 }
 if(kind==='heatmap'){
  const cw=(R-L)/d.categories.length,ch=(B-T)/d.series.length,extent=Math.max(...m.domain.map(Math.abs),Number.MIN_VALUE);
  axes=d.categories.map((_,i)=>txt(L+(i+.5)*cw,350,f.display(i),'text-anchor="middle"')).join('')+d.series.map((s,j)=>txt(L-10,T+(j+.5)*ch,s.label,'text-anchor="end"')).join('');
  d.series.forEach((s,j)=>s.values.forEach((v,i)=>marks+=`<g ${ident(i,j)}>${title(i,j)}<rect x="${L+i*cw}" y="${T+j*ch}" width="${cw-4}" height="${ch-4}" fill="${v===null?'none':v<0?color(1):color(0)}" fill-opacity="${v===null?0:.1+Math.abs(v)/extent*.35}" stroke="currentColor" stroke-dasharray="${v===null?'4 4':'none'}"/>${txt(L+(i+.5)*cw,T+(j+.5)*ch,value(v),'text-anchor="middle"')}</g>`));
 }
 return `<div class="chart-plot"><svg ${compact?'data-compact-chart="true"':''} role="img" aria-label="${x(caption)}" viewBox="0 0 ${W} ${H}"><title>${x(d.series.map(s=>s.label).join(' / '))}</title><desc>${x(t.explanation)}</desc>${axes}${d.categoryIds?.map((id,i)=>`<g id="${anchor(id)}" transform="translate(${at(i)} ${B})"><title>${x(d.categories[i])}</title></g>`).join('')||''}${marks}${txt(L,385,kind==='scatter'?d.xUnit:d.timeZone||'')}${txt(12,38,d.unit)}</svg></div>`;
}
/** Ranked, direct-labelled, grouped and dot-interval charts as HTML rows: real text that wraps, percentage marks that reflow, value labels at the mark end and never inside a scroller. */
export function rowPlot({d,f,t,theme,color,anchor,ident,caption}){
 const m=f.model,kind=m.kind,[low,high]=m.domain,log=m.scale.y==='log',share=v=>Math.max(0,Math.min(1,chartShare(v,m.domain,m.scale.y))),pct=v=>Number((v*100).toFixed(3))+'%',multi=d.series.length>1;
 const zero=log?null:share(Math.max(low,Math.min(high,0))),width=s=>[...String(s)].reduce((w,c)=>w+(/[⺀-鿿＀-￯]/.test(c)?2:1),0);
 const label=(j,i)=>kind==='dot-interval'&&d.series[j].values[i]!==null?`${f.cell(j,i)} [${f.intervalText(j,i)}]`:f.cell(j,i);
 const value=(j,i)=>{const q=f.qualifierAt(j,i),m=f.missingAt(j,i),base=f.text(j,i)+(m?' · '+t.reasons[m.reason]:'')+(kind==='dot-interval'&&d.series[j].values[i]!==null?` [${f.intervalText(j,i)}]`:'');return x(base)+(q?`<sup class="chart-qualifier">${f.marks.indexOf(q.label)+1}</sup>`:'');};
 // Room for the widest value label keeps every label inside the figure at any width.
 const space=Math.max(4,...d.series.flatMap((s,j)=>s.values.flatMap((v,i)=>v===null?[]:[width(label(j,i))])))+1,labelWidth=Math.min(28,Math.max(6,...d.categories.map((_,i)=>width(f.display(i))))),seriesWidth=Math.min(24,Math.max(4,...d.series.map(s=>width(s.label))));
 const focused=i=>f.focus.categories?f.focus.categories.has(f.ids[i]):null,muted=(i,j)=>focused(i)===false||(f.focus.series?!f.focus.series.has(d.series[j].id):false);
 const reference=zero===null||(kind==='dot-interval'&&!(low<0&&high>0))?'':`<line data-reference="true" x1="${pct(zero)}" x2="${pct(zero)}" y1="-4" y2="22" stroke="currentColor" stroke-width="1"${kind==='dot-interval'?' stroke-dasharray="2 3"':''}/>`;
 const cut=f.model.kind!=='dot-interval'&&low>0?'<path d="M-1 -4l7 5-7 5 7 5-7 5" fill="none" stroke="currentColor" stroke-width="2"/>':'';
 const mark=(i,j)=>{
  const v=d.series[j].values[i],c=color(kind==='ranked-bar'?0:j),dim=muted(i,j);
  if(v===null)return `<span class="chart-mark" data-missing="true" ${ident(i,j)}><span class="chart-value" data-conclusion-label="true">${value(j,i)}</span></span>`;
  let end,graphic;
  if(kind==='dot-interval'){const s=d.series[j],lo=share(s.interval.lower[i]),hi=share(s.interval.upper[i]),at=share(v),stroke=`stroke="${c}"${dim?' stroke-opacity=".45"':''}`;end=Math.max(hi,at);graphic=`<line x1="${pct(lo)}" x2="${pct(hi)}" y1="9" y2="9" ${stroke} stroke-width="2.5"${j>=4?' stroke-dasharray="5 3"':''}/><line x1="${pct(lo)}" x2="${pct(lo)}" y1="3" y2="15" ${stroke} stroke-width="2"/><line x1="${pct(hi)}" x2="${pct(hi)}" y1="3" y2="15" ${stroke} stroke-width="2"/>${chartShape(j,pct(at),9,6,c)}`;}
  else{const a=Math.min(zero,share(v)),b=Math.max(zero,share(v));end=b;graphic=`<rect x="${pct(a)}" y="0" width="${pct(b-a)}" height="18" ${dim?`fill="${c}" fill-opacity=".28" stroke="${c}" stroke-width="1.5"`:`fill="${c}"`}/>`;}
  return `<span class="chart-mark" ${ident(i,j)}><span class="chart-track" style="--end:${Number(end.toFixed(5))}"><svg aria-hidden="true" focusable="false">${reference}${cut}${graphic}</svg><span class="chart-value" data-conclusion-label="true">${value(j,i)}</span></span></span>`;
 };
 const refs=i=>f.events.filter(e=>e.i===i).map(e=>` <span class="chart-event-ref">${e.n}</span>`).join('');
 const ticks=log?chartTicks(m.domain,'log'):[low,...(low<0&&high>0?[0]:[]),high],track=`<span class="chart-axis-track">${ticks.map(v=>{const s=share(v);return `<span style="left:${Number((s*100).toFixed(3))}%${s===0?'':s===1?';transform:translateX(-100%)':';transform:translateX(-50%)'}">${x(String(Number(v.toPrecision(5))))}</span>`;}).join('')}</span>`;
 const rows=m.order.map(i=>`<li class="chart-row"${d.categoryIds?` id="${anchor(f.ids[i])}"`:''} data-category-id="${x(f.ids[i])}"${focused(i)===null?'':` data-focus="${focused(i)}"`}><span class="chart-row-label"><span data-conclusion-label="true">${x(f.display(i))}</span>${refs(i)}</span><span class="chart-row-marks">${multi?d.series.map((s,j)=>`<span class="chart-line"${f.focus.series&&!f.focus.series.has(s.id)?' data-muted="true"':''}><span class="chart-series-name" data-conclusion-label="true">${x(s.label)}</span>${mark(i,j)}</span>`).join(''):mark(i,0)}</span></li>`).join('');
 return `<ol class="chart-rows" data-kind="${kind}" aria-label="${x(caption)}" style="--value-space:${theme.tokens?.declared?.typography?Math.ceil(space*1.3):space}ch;--label-width:${labelWidth}ch;--series-width:${seriesWidth}ch">${rows}<li class="chart-axis" aria-hidden="true"><span></span>${multi?`<span class="chart-line"><span></span>${track}</span>`:track}</li></ol>`;
}
/** A line trend labelled at its ends: no per-point labels, series names and last values beside the lines, muted background series under a series focus. */
export function trendPlot({block,d,f,t,color,anchor,ident,caption}){
 const m=f.model,F=22,W=600,T=50,B=286,H=356,width=s=>[...String(s)].reduce((w,c)=>w+(/[⺀-鿿＀-￯]/.test(c)?1:.62),0)*F,tick=v=>String(Number(v.toPrecision(5)));
 const ticks=chartTicks(m.domain,m.scale.y),L=Math.ceil(16+Math.max(...ticks.map(v=>width(tick(v))))),share=v=>Math.max(0,Math.min(1,chartShare(v,m.domain,m.scale.y))),y=v=>B-share(v)*(B-T),muted=j=>f.focus.series&&!f.focus.series.has(d.series[j].id);
 // End labels name each series and its last shown value; a label that does not fit one line takes two.
 const ends=d.series.flatMap((s,j)=>{let i=s.values.length-1;while(i>=0&&s.values[i]===null)i--;if(i<0)return [];const value=f.text(j,i)+(i<d.categories.length-1?` (${f.display(i)})`:''),one=`${s.label} ${value}`;return [{j,i,lines:width(one)<=W*.34?[one]:[s.label,value]}];});
 const R=Math.floor(W-22-Math.min(W*.42,Math.max(0,...ends.flatMap(e=>e.lines.map(width))))),txt=(a,b,s,extra='')=>`<text x="${a}" y="${b}" ${extra}>${x(s)}</text>`;
 const px=i=>d.categories.length===1?(L+R)/2:d.categoryKind==='datetime'?L+(Date.parse(d.categories[i])-Date.parse(d.categories[0]))/(Date.parse(d.categories.at(-1))-Date.parse(d.categories[0]))*(R-L):L+i*(R-L)/(d.categories.length-1);
 // Labels keep their value order and are pushed apart, then back inside the frame.
 const placed=ends.map(e=>({...e,want:y(d.series[e.j].values[e.i]),h:e.lines.length*F*1.2})).sort((a,b)=>a.want-b.want||a.j-b.j);
 placed.forEach((p,k)=>{p.at=Math.max(p.want,k?placed[k-1].at+placed[k-1].h/2+p.h/2+4:p.h/2+4);});
 for(let k=placed.length-1;k>=0;k--){const p=placed[k],next=placed[k+1];p.at=Math.min(p.at,next?next.at-next.h/2-p.h/2-4:H-4-p.h/2);}
 let marks=chartTicks(m.domain,m.scale.y).map(v=>`<path d="M${L} ${y(v)}H${R}" stroke="currentColor" opacity=".18"/>`+txt(L-10,y(v)+F*.35,tick(v),'text-anchor="end"')).join('');
 for(const e of f.events)marks+=`<g data-event-id="${x(e.id)}"><path d="M${px(e.i)} ${T}V${B}" stroke="currentColor" stroke-dasharray="3 5" opacity=".7"/><circle cx="${px(e.i)}" cy="${T-22}" r="${F*.6}" fill="none" stroke="currentColor"/>${txt(px(e.i),T-22+F*.35,e.n,'text-anchor="middle"')}</g>`;
 d.series.forEach((s,j)=>{
  let runs=[],run=[];s.values.forEach((v,i)=>{if(v===null){if(run.length)runs.push(run);run=[];}else run.push([px(i),y(v)]);});if(run.length)runs.push(run);
  marks+=runs.map(r=>`<polyline fill="none" stroke="${color(j)}" stroke-width="${muted(j)?2:3.5}"${muted(j)?' opacity=".45"':''} stroke-dasharray="${chartDash(j)}" points="${r.map(p=>p.join(',')).join(' ')}"/>`).join('');
  marks+=s.values.map((v,i)=>`<g ${ident(i,j)}><title>${x(d.categories[i]+' · '+s.label+': '+f.text(j,i)+' '+d.unit)}</title>${v===null?'':`${s.interval?`<path d="M${px(i)} ${y(s.interval.lower[i])}V${y(s.interval.upper[i])}M${px(i)-5} ${y(s.interval.lower[i])}h10M${px(i)-5} ${y(s.interval.upper[i])}h10" stroke="${color(j)}" stroke-width="1.5"/>`:''}${chartShape(j,px(i),y(v),ends.some(e=>e.j===j&&e.i===i)?6:3.5,color(j))}`}</g>`).join('');
 });
 for(const p of placed){const top=p.at-p.h/2,leader=Math.abs(p.at-p.want)>3?`<path d="M${px(p.i)+8} ${p.want}L${R+10} ${p.at}" stroke="${color(p.j)}" stroke-width="1"/>`:'';marks+=leader+p.lines.map((line,k)=>txt(R+14,top+F*(.95+k*1.2),line,`data-conclusion-label="true"${muted(p.j)?'':' font-weight="700"'}`)).join('');}
 const first=f.display(0),lastLabel=f.display(d.categories.length-1),stacked=d.categories.length>1&&width(first)+width(lastLabel)+F>R-L,height=H+(stacked?Math.ceil(F*1.45):0);
 // Long first and last labels (dates with times) would collide; the last one then takes its own line.
 marks+=d.categories.length===1?txt(px(0),B+F+14,first,'text-anchor="middle" data-conclusion-label="true"'):txt(L,B+F+14,first,'data-conclusion-label="true"')+txt(R,B+F+14+(stacked?F*1.45:0),lastLabel,'text-anchor="end" data-conclusion-label="true"');
 return `<div class="chart-plot"><svg data-type-scale="true" role="img" aria-label="${x(caption)}" viewBox="0 0 ${W} ${height}"><title>${x(d.series.map(s=>s.label).join(' / '))}</title><desc>${x(t.explanation)}</desc>${txt(0,F,d.unit)}${d.categoryIds?.map((id,i)=>`<g id="${anchor(id)}" transform="translate(${px(i)} ${B})"><title>${x(d.categories[i])}</title></g>`).join('')||''}${marks}</svg></div>`;
}
/** One small panel per series on one shared scale; the other series stay as faint context, and each panel names its series and last value in text. */
export function facetPlot({d,f,t,color,ident}){
 const m=f.model,W=260,H=158,F=13,T=20,B=H-30,tick=v=>String(Number(v.toPrecision(5))),width=s=>[...String(s)].reduce((w,c)=>w+(/[⺀-鿿＀-￯]/.test(c)?1:.62),0)*F;
 const L=Math.ceil(10+Math.max(width(tick(m.domain[0])),width(tick(m.domain[1])))),R=W-10,share=v=>Math.max(0,Math.min(1,chartShare(v,m.domain,m.scale.y))),y=v=>B-share(v)*(B-T),px=i=>d.categories.length===1?(L+R)/2:L+i*(R-L)/(d.categories.length-1);
 const txt=(a,b,s,extra='')=>`<text x="${a}" y="${b}" ${extra}>${x(s)}</text>`,line=(s,attrs)=>{let runs=[],run=[];s.values.forEach((v,i)=>{if(v===null){if(run.length)runs.push(run);run=[];}else run.push([px(i),y(v)]);});if(run.length)runs.push(run);return runs.map(r=>`<polyline fill="none" ${attrs} points="${r.map(p=>p.join(',')).join(' ')}"/>`).join('');};
 return `<div class="chart-facets">${d.series.map((s,j)=>{
  let i=s.values.length-1;while(i>=0&&s.values[i]===null)i--;
  const last=i<0?t.missing:f.withUnit(f.text(j,i))+(i<d.categories.length-1?` (${f.display(i)})`:` · ${f.display(i)}`),muted=f.focus.series&&!f.focus.series.has(s.id);
  return `<div class="chart-facet" data-series-id="${x(s.id)}"${muted?' data-muted="true"':''}><p class="chart-facet-title"><span class="chart-facet-name" data-conclusion-label="true">${x(s.label)}</span> <span class="chart-facet-value" data-conclusion-label="true">${x(last)}</span></p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${x(s.label+' · '+last)}">${[m.domain[0],m.domain[1]].map(v=>`<path d="M${L} ${y(v)}H${R}" stroke="currentColor" opacity=".2"/>`+txt(L-6,y(v)+F*.35,tick(v),'text-anchor="end"')).join('')}${f.events.map(e=>`<g data-event-id="${x(e.id)}"><path d="M${px(e.i)} ${T}V${B}" stroke="currentColor" stroke-dasharray="2 4" opacity=".6"/>${txt(px(e.i)+4,T-4,e.n)}</g>`).join('')}${d.series.map((o,k)=>k===j?'':line(o,'stroke="currentColor" stroke-width="1" opacity=".22"')).join('')}${line(s,`stroke="${color(j)}" stroke-width="${muted?2:3}"${muted?' opacity=".5"':''} stroke-dasharray="${chartDash(j)}"`)}${s.values.map((v,k)=>`<g ${ident(k,j)}><title>${x(d.categories[k]+' · '+s.label+': '+f.text(j,k)+' '+d.unit)}</title>${v===null?'':chartShape(j,px(k),y(v),k===i?4.5:2.5,color(j))}</g>`).join('')}${txt(L,H-8,f.display(0))}${d.categories.length>1?txt(R,H-8,f.display(d.categories.length-1),'text-anchor="end"'):''}</svg></div>`;
 }).join('')}</div>`;
}
/** A benchmark table that keeps its qualifiers: exact values, units, missing reasons, qualifier marks and the best value per column under the declared better direction. */
export function benchmarkPlot({d,f,t,anchor,ident}){
 const refs=i=>f.events.filter(e=>e.i===i).map(e=>` <span class="chart-event-ref">${e.n}</span>`).join('');
 return `<div class="chart-benchmark"><table class="benchmark-table" role="table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">${x(t.category)}</th>${d.series.map(s=>`<th scope="col" role="columnheader">${x(s.label+' · '+d.unit)}</th>`).join('')}</tr></thead><tbody role="rowgroup">${f.model.order.map(i=>`<tr role="row"${d.categoryIds?` id="${anchor(f.ids[i])}"`:''}${f.focus.categories?` data-focus="${f.focus.categories.has(f.ids[i])}"`:''}><th scope="row" role="rowheader"><span data-conclusion-label="true">${x(f.display(i))}</span>${refs(i)}</th>${d.series.map((s,j)=>{const best=f.best[j].has(i),m=f.missingAt(j,i),q=f.qualifierAt(j,i),value=x(f.text(j,i)+(m?' · '+t.reasons[m.reason]:''));return `<td role="cell" ${ident(i,j)} data-column="${x(s.label+' · '+d.unit)}"${best?' data-best="true"':''}><span data-conclusion-label="true">${best?`<strong>${value}</strong>`:value}${q?`<sup class="chart-qualifier">${f.marks.indexOf(q.label)+1}</sup>`:''}${best?` <span class="chart-best">${x(t.best)}</span>`:''}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
