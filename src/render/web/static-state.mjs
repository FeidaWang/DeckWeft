import {runtime} from './runtime.mjs';
import {chart} from './components/chart.mjs';
import {x} from './components/escape.mjs';
import {chartModel} from '../../components/charts/model.mjs';
import {objectAnchor} from '../../components/annotations/identity.mjs';
import {selectedDataset} from '../../motion/timeline.mjs';
import {applyStaticStates} from '../../../public/runtime/static-state.js';
// The runtime, chart renderer and CSS are embedded verbatim in every export. Static states are added beside them, never by editing them, so documents without a static state keep byte-identical output.
const mount="const semantic=mountSemanticInteractions(JSON.parse(document.getElementById('dw-runtime-data').textContent));";
if(runtime.split(mount).length!==2)throw Error('The static-state runtime needs exactly one semantic mount point.');
export const staticStateRuntime=runtime.replace(mount,()=>`${mount}\n const ${applyStaticStates.name} = ${applyStaticStates.toString()};\n ${applyStaticStates.name}(JSON.parse(document.getElementById('dw-runtime-data').textContent),semantic);`);

/** The frozen chart selection without JavaScript: a text statement of every shown value, the selected marks, and the complete unfiltered table. The statement sits outside the figure so the player keeps it while the static state is shown. */
export function staticChartHTML(block,document,theme,{sceneId,state,keyState}){
 const d=document.datasets.find(v=>v.id===block.datasetId),zh=document.locale==='zh-CN',shown=selectedDataset(d,state),missing=zh?'缺失':'Missing';
 const frozen=chart(block,{locale:document.locale,datasets:[shown]},theme,{sceneId,paletteIds:d.series.map(s=>s.id)}),full=chart(block,document,theme,{sceneId});
 const value=v=>(v===null?missing:String(v))+(d.unit?'\u00a0'+d.unit:''),order=chartModel(block,shown).order;
 const facts=order.map(i=>shown.series.length===1?`${shown.categories[i]} ${value(shown.series[0].values[i])}`:`${shown.categories[i]} (${shown.series.map(s=>`${s.label} ${s.xValues?'x='+s.xValues[i]+', y=':''}${value(s.values[i])}`).join(zh?'；':'; ')})`);
 const note=`<p class="component-note static-state-note" data-static-state="${x(keyState.id)}">${x(zh?`静态视图 · ${keyState.label||keyState.id}：${facts.join('，')}。完整数据见下方。`:`Static view · ${keyState.label||keyState.id}: ${facts.join(', ')}. Complete data below.`)}</p>`;
 // Marks outside the frozen selection keep their anchors in the complete table, as the interactive view does.
 const start=full.indexOf('<details>'),bodyStart=full.indexOf('<tbody>',start)+7,bodyEnd=full.indexOf('</tbody>',bodyStart),cells=block.chartType==='scatter'?2:1;
 const span=(id,text)=>`<span id="${id}" data-excluded-anchor="true">${x(text)}</span>`;
 const rows=full.slice(bodyStart,bodyEnd).split('</tr>').slice(0,-1).map((row,i)=>{
  const categoryId=d.categoryIds[i],outside=!shown.categoryIds.includes(categoryId),[head,...data]=row.split('</td>');
  const th=outside?head.replace('</th>',span(objectAnchor(sceneId,block.id,categoryId,''),zh?'（当前范围外）':' (outside current range)')+'</th>'):head,marks=[th,...data];
  for(const [j,series]of d.series.entries())if(outside||!state.seriesIds.includes(series.id)){const k=j*cells;marks[k]+=span(objectAnchor(sceneId,block.id,categoryId,series.id),zh?'（当前视图外）':' (outside current view)');}
  return marks.join('</td>')+'</tr>';
 });
 const table=full.slice(start,bodyStart)+rows.join('')+full.slice(bodyEnd);
 return note+frozen.slice(0,frozen.indexOf('<details>'))+table;
}
