import {objectAnchor} from '../annotations/identity.mjs';
import {x} from '../../render/web/components/escape.mjs';
import {chartModel} from './model.mjs';
export function chart(block,document,theme,{sceneId='scene',anchors,paletteIds}={}){
 const anchor=(objectId,seriesId='')=>anchors?anchors[JSON.stringify([objectId,seriesId])]:objectAnchor(sceneId,block.id,objectId,seriesId);
 const d=document.datasets.find(d=>d.id===block.datasetId),m=chartModel(block,d),zh=document.locale==='zh-CN',missing=zh?'缺失':'Missing',value=v=>v===null?missing:String(v),color=j=>theme.chart[(block.chartType==='heatmap'||!paletteIds?j:paletteIds.indexOf(d.series[j]?.id))%theme.chart.length],compact=['line','area'].includes(m.kind)&&d.categoryKind!=='datetime'&&d.categories.length<=6&&d.categories.every(c=>c.length<=5)&&d.series.length<=2&&d.series.every(s=>s.values.every(v=>v===null||String(v).length<=5))&&Array.from({length:5},(_,i)=>String(Number((m.domain[0]+(m.domain[1]-m.domain[0])*i/4).toPrecision(5)))).every(v=>v.length<=5),W=800,H=400,L=100,R=680,T=compact?50:30,B=compact?270:310;
 const y=v=>B-(v-m.domain[0])/(m.domain[1]-m.domain[0])*(B-T),linearX=i=>d.categories.length===1?(L+R)/2:(compact?L+45:L)+i*(R-L-(compact?45:0))/(d.categories.length-1),px=i=>d.categories.length===1?(L+R)/2:d.categoryKind==='datetime'?L+(Date.parse(d.categories[i])-Date.parse(d.categories[0]))/(Date.parse(d.categories.at(-1))-Date.parse(d.categories[0]))*(R-L):(m.kind==='stacked'?L+60+i*(R-L-120)/(d.categories.length-1):linearX(i));
 const label=i=>d.categoryKind==='datetime'?new Intl.DateTimeFormat(document.locale,{timeZone:d.timeZone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d.categories[i])):d.categories[i];
 const ident=(i,j)=>`id="${anchor(d.categoryIds?.[i]||'category-'+i,d.series[j].id)}" tabindex="-1" data-object-id="${x(d.categoryIds?.[i]||'category-'+i)}" data-series-id="${x(d.series[j].id)}"`;
 const title=(i,j)=>`<title>${x(d.categories[i]+' · '+d.series[j].label+': '+value(d.series[j].values[i])+' '+d.unit)}</title>`;
 const txt=(a,b,t,extra='')=>`<text x="${a}" y="${b}" ${extra}>${x(t)}</text>`;
 let marks='',axes='';
 if(!['heatmap','ranked-bar'].includes(m.kind)){
  axes=Array.from({length:5},(_,i)=>{const v=m.domain[0]+(m.domain[1]-m.domain[0])*i/4;return `<path d="M${L} ${y(v)}H${R}" stroke="currentColor" opacity=".2"/>`+txt(L-12,y(v)+4,Number(v.toPrecision(5)),'text-anchor="end"');}).join('');
  axes+=d.categories.map((_,i)=>m.kind==='scatter'?'':txt(px(i),350,label(i),'text-anchor="middle"')).join('');
 }
 if(['line','area'].includes(m.kind))d.series.forEach((s,j)=>{
  let runs=[],run=[];s.values.forEach((v,i)=>{if(v===null){if(run.length)runs.push(run);run=[];}else run.push([px(i),y(v)]);});if(run.length)runs.push(run);
  marks+=runs.map(r=>`${m.kind==='area'?`<polygon points="${r[0][0]},${y(0)} ${r.map(p=>p.join(',')).join(' ')} ${r.at(-1)[0]},${y(0)}" fill="${color(j)}" opacity=".18"/>`:''}<polyline fill="none" stroke="${color(j)}" stroke-width="3" points="${r.map(p=>p.join(',')).join(' ')}"/>`).join('');
  marks+=s.values.map((v,i)=>v===null?`<g ${ident(i,j)}>${title(i,j)}${j===0?txt(px(i),B-8,missing,'text-anchor="middle"'):''}</g>`:`<g ${ident(i,j)}>${title(i,j)}<circle cx="${px(i)}" cy="${y(v)}" r="5" fill="${color(j)}"/>${txt(px(i),y(v)+(compact&&d.series.some((s,k)=>k!==j&&s.values[i]!==null&&(s.values[i]>v||s.values[i]===v&&k<j))?36:compact?-16:-12),value(v),'text-anchor="middle"')}</g>`).join('');
 });
 if(m.kind==='ranked-bar'){
  const [lo,hi]=m.domain,scale=v=>220+(v-lo)/(hi-lo)*420,zero=scale(0),step=(B-T)/d.categories.length;
  axes=`<path d="M${zero} ${T}V${B}" stroke="currentColor"/>`+txt(220,350,lo)+txt(640,350,hi);
  marks=m.order.map((i,k)=>{const v=d.series[0].values[i],yy=T+k*step;return txt(12,yy+step*.6,d.categories[i])+`<g ${ident(i,0)}>${title(i,0)}${v===null?'':`<rect x="${Math.min(zero,scale(v))}" y="${yy+5}" width="${Math.abs(scale(v)-zero)}" height="${Math.max(1,step-12)}" fill="${color(0)}"/>`}${txt(666,yy+step*.6,value(v))}</g>`;}).join('');
 }
 if(m.kind==='stacked')d.categories.forEach((_,i)=>{
  if(d.series.some(s=>s.values[i]===null)){marks+=d.series.map((s,j)=>`<g ${ident(i,j)}>${title(i,j)}${j===0?txt(px(i),y(0)-12,missing,'text-anchor="middle"'):''}</g>`).join('');return;}
  let pos=0,neg=0;d.series.forEach((s,j)=>{const v=s.values[i],from=v>=0?pos:neg,to=from+v;if(v>=0)pos=to;else neg=to;const width=Math.min(70,(R-L)/d.categories.length*.7);marks+=`<g ${ident(i,j)}>${title(i,j)}<rect x="${px(i)-width/2}" y="${Math.min(y(from),y(to))}" width="${width}" height="${Math.max(1,Math.abs(y(to)-y(from)))}" fill="${color(j)}"/>${txt(px(i)+width/2+6,v===0?y(0)-14:(y(from)+y(to))/2+4,value(v))}</g>`;});
 });
 if(m.kind==='scatter'){
  const sx=v=>L+(v-m.xDomain[0])/(m.xDomain[1]-m.xDomain[0])*(R-L);
  axes+=Array.from({length:5},(_,i)=>{const v=m.xDomain[0]+(m.xDomain[1]-m.xDomain[0])*i/4;return txt(sx(v),350,Number(v.toPrecision(5)),'text-anchor="middle"');}).join('');
  d.series.forEach((s,j)=>s.values.forEach((v,i)=>{if(v===null||s.xValues[i]===null){marks+=`<g ${ident(i,j)}>${title(i,j)}</g>`;return;}marks+=`<g ${ident(i,j)}>${title(i,j)}<circle cx="${sx(s.xValues[i])}" cy="${y(v)}" r="7" fill="${color(j)}"/>${txt(sx(s.xValues[i])+(sx(s.xValues[i])>540?-10:10),y(v)-10,d.categories[i]+': '+s.xValues[i]+', '+v,sx(s.xValues[i])>540?'text-anchor="end"':'')}</g>`;}));
 }
 if(m.kind==='heatmap'){
  const cw=(R-L)/d.categories.length,ch=(B-T)/d.series.length,extent=Math.max(...m.domain.map(Math.abs),Number.MIN_VALUE);
  axes=d.categories.map((_,i)=>txt(L+(i+.5)*cw,350,label(i),'text-anchor="middle"')).join('')+d.series.map((s,j)=>txt(L-10,T+(j+.5)*ch,s.label,'text-anchor="end"')).join('');
  d.series.forEach((s,j)=>s.values.forEach((v,i)=>marks+=`<g ${ident(i,j)}>${title(i,j)}<rect x="${L+i*cw}" y="${T+j*ch}" width="${cw-4}" height="${ch-4}" fill="${v===null?'none':v<0?color(1):color(0)}" fill-opacity="${v===null?0:.1+Math.abs(v)/extent*.35}" stroke="currentColor" stroke-dasharray="${v===null?'4 4':'none'}"/>${txt(L+(i+.5)*cw,T+(j+.5)*ch,value(v),'text-anchor="middle"')}</g>`));
 }
 const policy=block.axis?.policy||'zero',kindLabel=zh?({'line':'折线','area':'面积','ranked-bar':'排序条形','stacked':'堆叠比较','scatter':'散点','heatmap':'热力矩阵'})[m.kind]:m.kind,policyLabel=zh?({zero:'含零',extent:'数据范围',fixed:'固定范围'})[policy]:policy,caption=`${d.unit} · ${kindLabel} · ${policyLabel}${m.kind==='heatmap'?' ['+m.domain.join(', ')+']':''}${d.timeZone?' · '+d.timeZone:''}${d.synthetic?' · '+(zh?'合成演示数据':'Synthetic demonstration data'):''}`;
 const explanation=zh?'缺失值保留为空缺，不插值；堆叠中任一缺失使整组留空；散点需要两个坐标。':'Missing values remain gaps; no interpolation. Stacks with any missing member remain gaps. Scatter points need both coordinates.';
 return `<figure class="chart" data-chart-type="${m.kind}"><figcaption>${x(caption)}</figcaption><div class="chart-plot"><svg ${compact?'data-compact-chart="true"':''} role="img" aria-label="${x(caption)}" viewBox="0 0 ${W} ${H}"><title>${x(d.series.map(s=>s.label).join(' / '))}</title><desc>${x(explanation)}</desc>${axes}${d.categoryIds?.map((id,i)=>`<g id="${anchor(id)}" transform="translate(${px(i)} ${B})"><title>${x(d.categories[i])}</title></g>`).join('')||''}${marks}${txt(L,385,m.kind==='scatter'?d.xUnit:d.timeZone||'')}${txt(12,38,d.unit)}</svg></div><ul class="legend">${m.kind==='heatmap'?[['negative',zh?'负数':'Negative',color(1)],['zero',zh?'零':'Zero','transparent'],['positive',zh?'正数':'Positive',color(0)],['missing',missing,'transparent']].map(([,label,c])=>`<li><span style="background:${c};border:1px solid currentColor"></span>${x(label)}</li>`).join(''):d.series.map((s,j)=>`<li><span style="background:${color(j)}"></span>${x(s.label)}</li>`).join('')}</ul><details><summary>${zh?'查看完整数据':'View all data'}</summary><p class="component-note">${x(explanation)}</p><div class="table-scroll"><table><caption>${x(caption)}</caption><thead><tr><th scope="col">${zh?'原始类别／时间':'Original category / time'}</th>${d.series.map(s=>`${m.kind==='scatter'?`<th scope="col">${x(s.label+' x · '+d.xUnit)}</th>`:''}<th scope="col">${x(s.label+' · '+d.unit)}</th>`).join('')}</tr></thead><tbody>${d.categories.map((c,i)=>`<tr><th scope="row">${x(c)}</th>${d.series.map(s=>`${m.kind==='scatter'?`<td>${x(value(s.xValues[i]))}</td>`:''}<td>${x(value(s.values[i]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></figure>`;
}
