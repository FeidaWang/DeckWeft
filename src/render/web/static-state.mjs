import {chart} from './components/chart.mjs';
import {x} from './components/escape.mjs';
import {chartStatement} from '../../components/charts/statement.mjs';
import {objectAnchor} from '../../components/annotations/identity.mjs';
import {selectedDataset} from '../../motion/timeline.mjs';
import {hotspotPositions} from '../../motion/web.mjs';
import {focusedChart} from '../../../public/runtime/charts.js';
// Static markup for readers without JavaScript. Only scenes that declare a static state get it, so every other export keeps its
// exact markup. The player removes [data-static-only] elements and unwraps details[data-static-wrapper] before it mounts, then draws
// the same state itself; the .static-state-note statement stays and is shown only while the scene is at its static state.
const label=keyState=>keyState.label||keyState.id;
const statement=(locale,keyState,text)=>`<p class="component-note static-state-note" data-static-state="${x(keyState.id)}">${x(locale==='zh-CN'?`静态视图 · ${label(keyState)}：${text}`:`Static view · ${label(keyState)}: ${text}`)}</p>`;

/** The frozen chart selection: a text statement of every shown value (with the filter, sort and focus stated separately), the selected marks, and the complete unfiltered table. The statement sits outside the figure so the player keeps it while the static state is shown. */
export function staticChartHTML(block,document,theme,{sceneId,state,keyState}){
 const d=document.datasets.find(v=>v.id===block.datasetId),zh=document.locale==='zh-CN',shown=selectedDataset(d,state);
 // A frozen reader focus wins over the declared focus (layered rule); it hides nothing, so the legend and the marks keep every shown series.
 const drawn=focusedChart(block,theme,d,state),frozen=chart(drawn.block,{locale:document.locale,datasets:[shown]},drawn.theme,{sceneId,paletteIds:d.series.map(s=>s.id)}),full=chart(block,document,theme,{sceneId});
 const note=`<p class="component-note static-state-note" data-static-state="${x(keyState.id)}">${x(chartStatement(block,d,shown,keyState,document.locale,d.series.find(s=>s.id===state.focusSeriesId)))}</p>`;
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

/** Blueprint A (S9b): a reading-order number on each part of the diagram. Nested in the part's group, so it moves with the part on narrow screens and is not one of the part's own text runs. */
export function numberBlueprintParts(markup,block,spec,sceneId){
 let out=markup;
 for(const [i,step]of spec.steps.entries()){
  const open=`<g id="${objectAnchor(sceneId,block.id,step.objectId)}"`,at=out.indexOf(open),rect=out.indexOf('<rect ',at),end=out.indexOf('/>',rect)+2;if(at<0||rect<0)continue;
  const tag=out.slice(rect,end),num=name=>+tag.match(new RegExp(` ${name}="(-?[\\d.]+)"`))[1],cx=num('x')+18,cy=num('y')+18;
  out=out.slice(0,end)+`<g class="blueprint-number" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="12"/><text x="${cx}" y="${cy+5}" text-anchor="middle">${i+1}</text></g>`+out.slice(end);
 }
 return out;
}

/**
 * Blueprint A for readers without JavaScript and for paged exports: the whole object with numbered parts, the whole object's
 * explanation and every part's explanation in reading order. Drawn for every blueprint page, so no static reader ever gets
 * disassembled parts; the player removes the list ([data-static-only]) and draws the stage it is at. With a static state, the
 * statement names the stage, and an Explore state marks its part.
 */
export function blueprintHTML(markup,block,document,{sceneId,spec,state,keyState}){
 const zh=document.locale==='zh-CN',notes=new Map(document.explanations.map(e=>[e.id,e])),whole=notes.get(spec.blueprint.wholeExplanationId),parts=spec.steps.map(s=>({...s,note:notes.get(s.explanationId)}));
 let out=numberBlueprintParts(markup,block,spec,sceneId);const selected=state?.stage==='explore'?state.stepId:null;
 if(selected){const open=`<g id="${objectAnchor(sceneId,block.id,spec.steps.find(s=>s.id===selected).objectId)}"`;out=out.replace(open,`${open} class="semantic-step-target"`);}
 const order=parts.map(p=>p.note.label).join(' → '),n=parts.length,k=parts.findIndex(p=>p.id===selected)+1;
 const list=`<div class="blueprint-complete" data-static-only><p class="blueprint-whole"><strong>${x(whole.label)}</strong>${zh?'——':' — '}${x(whole.text)}</p><ol class="blueprint-parts">${parts.map(p=>`<li data-part-id="${x(p.objectId)}"${p.id===selected?' data-selected="true"':''}><strong>${x(p.note.label)}</strong>${zh?'——':' — '}${x(p.note.text)}</li>`).join('')}</ol></div>`;
 const text=!keyState?null:selected?(zh?`${parts[k-1].note.label}（第 ${k} 部分，共 ${n} 部分），对照整体：${whole.label}（${order}）。`:`${parts[k-1].note.label}, part ${k} of ${n}, against the whole: ${whole.label} (${order}).`):(zh?`${whole.label}——按阅读顺序共 ${n} 个部分：${order}。`:`${whole.label} — ${n} parts in reading order: ${order}.`);
 return (text?statement(document.locale,keyState,text):'')+out+list;
}
