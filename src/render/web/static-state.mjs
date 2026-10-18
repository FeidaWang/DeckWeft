import {chart} from './components/chart.mjs';
import {x} from './components/escape.mjs';
import {chartModel} from '../../components/charts/model.mjs';
import {objectAnchor} from '../../components/annotations/identity.mjs';
import {selectedDataset} from '../../motion/timeline.mjs';
import {hotspotPositions} from '../../motion/web.mjs';
import {focusTheme} from '../../../public/runtime/charts.js';
// Static markup for readers without JavaScript. Only scenes that declare a static state get it, so every other export keeps its
// exact markup. The player removes [data-static-only] elements and unwraps details[data-static-wrapper] before it mounts, then draws
// the same state itself; the .static-state-note statement stays and is shown only while the scene is at its static state.
const label=keyState=>keyState.label||keyState.id;
const statement=(locale,keyState,text)=>`<p class="component-note static-state-note" data-static-state="${x(keyState.id)}">${x(locale==='zh-CN'?`静态视图 · ${label(keyState)}：${text}`:`Static view · ${label(keyState)}: ${text}`)}</p>`;

/** The frozen chart selection: a text statement of every shown value (and the focus), the selected marks, and the complete unfiltered table. The statement sits outside the figure so the player keeps it while the static state is shown. */
export function staticChartHTML(block,document,theme,{sceneId,state,keyState}){
 const d=document.datasets.find(v=>v.id===block.datasetId),zh=document.locale==='zh-CN',shown=selectedDataset(d,state),missing=zh?'缺失':'Missing';
 // A focus mixes every other shown series toward the paper; it hides nothing, so the legend and the marks keep every shown series.
 const frozen=chart(block,{locale:document.locale,datasets:[shown]},focusTheme(theme,d,state),{sceneId,paletteIds:d.series.map(s=>s.id)}),full=chart(block,document,theme,{sceneId});
 // A missing value is named and never given a unit; a value never wraps away from its unit.
 const value=v=>v===null?missing:String(v)+(d.unit?'\u00a0'+d.unit:''),order=chartModel(block,shown).order,focus=d.series.find(s=>s.id===state.focusSeriesId);
 const facts=order.map(i=>{if(shown.series.length===1)return `${shown.categories[i]} ${value(shown.series[0].values[i])}`;const all=shown.series.map(s=>`${s.label} ${s.xValues?'x='+s.xValues[i]+', y=':''}${value(s.values[i])}`);return zh?`${shown.categories[i]}（${all.join('；')}）`:`${shown.categories[i]} (${all.join('; ')})`;});
 const lead=focus?(zh?`聚焦${focus.label}；`:`focus on ${focus.label}; `):'';
 const note=statement(document.locale,keyState,zh?`${lead}${facts.join('，')}。完整数据见下方。`:`${lead}${facts.join(', ')}. Complete data below.`);
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

/** A frozen explanation step: the step's node, relationship (with both ends) or source lines are marked as the player marks them, and the statement gives the step's label and text. */
export function staticStepsHTML(markup,block,document,{sceneId,spec,state,keyState}){
 const zh=document.locale==='zh-CN',step=spec.steps.find(s=>s.id===state.stepId),note=document.explanations.find(e=>e.id===step.explanationId);let out=markup,where;
 if(block.type==='diagram'){
  const edge=block.edges.find(e=>e.id===step.objectId),node=id=>block.nodes.find(n=>n.id===id).label;
  for(const id of [step.objectId,...(edge?[edge.from,edge.to]:[])]){const open=`<g id="${objectAnchor(sceneId,block.id,id)}"`;out=out.replace(open,`${open} class="semantic-step-target"`);}
  where=edge?`${node(edge.from)} → ${node(edge.to)}${edge.label?' · '+edge.label:''}`:node(step.objectId);
 }else{
  for(const n of step.lines)out=out.replace(new RegExp(`data-line="${n}"(?: class="([^"]*)")?>`),(_,c)=>`data-line="${n}" class="${c?c+' ':''}semantic-step-target">`);
  where=(zh?'原文行：':'source lines ')+step.lines.join(', ');
 }
 return statement(document.locale,keyState,zh?`${note.label}——${note.text}（${where}）`:`${note.label} — ${note.text} (${where})`)+out;
}

/** A frozen comparison tab: the chosen image stays in place; the other one moves into a closed "original image" disclosure, so it is still one action away without JavaScript. */
export function staticCompareHTML(markup,document,{role,state,keyState}){
 const zh=document.locale==='zh-CN',tab=state.tabId;
 const wrap=m=>{const at=m.indexOf('<figure class="web-image"'),end=m.indexOf('</figure>',at)+9;return m.slice(0,at)+`<details data-static-wrapper><summary>${role==='first'?(zh?'第一张原始图片':'First original image'):(zh?'第二张原始图片':'Second original image')}</summary>`+m.slice(at,end)+'</details>'+m.slice(end);};
 const out=tab!=='both'&&tab!==role?wrap(markup):markup;if(role!=='first')return out;
 const text=tab==='both'?(zh?'并列显示两张图片。':'both images side by side.'):tab==='first'?(zh?'显示第一张图片；第二张在“第二张原始图片”中。':'the first image; the second is under Second original image.'):(zh?'显示第二张图片；第一张在“第一张原始图片”中。':'the second image; the first is under First original image.');
 return statement(document.locale,keyState,text)+out;
}

/** Frozen hotspots: numbered, non-interactive markers at the authored positions (the open one outlined) and the open annotation in the statement. Every annotation block stays on the page. */
export function staticHotspotsHTML(markup,block,document,{scene,spec,state,keyState,resources}){
 const zh=document.locale==='zh-CN',positions=hotspotPositions(scene,spec,block,resources),open=spec.hotspots.findIndex(h=>h.id===state.hotspotId);
 const markers=spec.hotspots.map((h,i)=>`<span class="image-hotspot static-hotspot" data-static-only aria-hidden="true"${i===open?' data-active="true"':''} style="left:clamp(22px, ${positions[i].x*100}%, calc(100% - 22px));top:clamp(22px, ${positions[i].y*100}%, calc(100% - 22px))">${i+1}</span>`).join('');
 const crop=markup.indexOf('<div class="image-crop"'),close=markup.indexOf('</div>',crop),out=markup.slice(0,close)+markers+markup.slice(close);
 const h=spec.hotspots[open],annotation=h&&document.blocks.find(b=>b.id===h.annotationId).text;
 const text=open<0?(zh?'未展开热点；所有注释都在本页。':'no hotspot is open; every annotation is on this page.'):zh?`热点 ${open+1}——${annotation}（原图坐标：${h.x}, ${h.y}）`:`hotspot ${open+1} — ${annotation} (original-image coordinates ${h.x}, ${h.y})`;
 return statement(document.locale,keyState,text)+out;
}
