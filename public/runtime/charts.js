/** Chart colours for a focused series: every other series is mixed toward the paper, never below 3:1 against it, so context series stay perceivable and keep their own hue. Without a focus the theme is unchanged. */
export function focusTheme(theme,dataset,state){
 if(!state.focusSeriesId)return theme;
 const hex=c=>/^#[0-9a-f]{6}$/i.test(c)?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):null,paper=hex(theme.paper);if(!paper)return theme;
 const luminance=c=>{const a=c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return a[0]*.2126+a[1]*.7152+a[2]*.0722;},ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const mute=c=>{const rgb=hex(c);if(!rgb)return c;let best=rgb;for(let k=1;k<=12;k++){const m=rgb.map((v,i)=>Math.round(v+(paper[i]-v)*k*.05));if(ratio(m,paper)<3)break;best=m;}return '#'+best.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();};
 const chart=[...theme.chart];dataset.series.forEach((s,j)=>{if(s.id!==state.focusSeriesId)chart[j%chart.length]=mute(theme.chart[j%theme.chart.length]);});
 return {...theme,chart};
}
/**
 * The layered focus rule. The chart block's declared focus (categories or series) is the author's default emphasis and the drawing
 * without JavaScript. A reader's series focus (data.focus, one series) overrides it while it is set; clearing it returns to the
 * declared focus. Kinds that draw a declared series focus draw the reader's focus the same way; other kinds mix the other series
 * toward the paper instead (focusTheme). A frozen static state is a reader focus like any other, so it wins over the declared focus.
 */
export function focusedChart(block,theme,dataset,state){
 if(!state.focusSeriesId)return {block,theme};
 const {focus,...rest}=block;
 // Must equal SERIES_FOCUS_KINDS in src/components/charts/semantics.mjs (a test checks it); this file is embedded without imports.
 return ['line','grouped-bar','dot-interval','small-multiples'].includes(block.chartType)?{block:{...rest,focus:{seriesIds:[state.focusSeriesId]}},theme}:{block:rest,theme:focusTheme(theme,dataset,state)};
}
/** The explanation line: the caption subject's category with the value of each caption series (the focused series, or every shown series). */
export function captionText(dataset,state,locale){
 const zh=locale==='zh-CN',i=dataset.categoryIds.indexOf(state.caption.categoryId),missing=zh?'缺失':'Missing';if(i<0)return '';
 return dataset.categories[i]+(zh?'：':': ')+dataset.series.filter(s=>state.caption.seriesIds.includes(s.id)).map(s=>s.label+' '+(s.xValues?'x='+String(s.xValues[i])+' '+(dataset.xUnit||'')+', y=':'')+(s.values[i]===null?missing:String(s.values[i]))+' '+(dataset.unit||'')).join(' · ');
}
export function mountChartSelection(root,config,emit){
 const {spec,block,dataset,locale,theme,sceneId,anchors}=config,zh=locale==='zh-CN',original=root.querySelector('.chart'),view=document.createElement('div'),controls=document.createElement('fieldset'),legend=document.createElement('legend');
 legend.textContent=zh?'图表范围与系列':'Chart range and series';controls.className='semantic-controls chart-controls';controls.append(legend);
 const selects={};for(const [key,label]of [['fromId',zh?'起始类别':'From category'],['toId',zh?'结束类别':'To category']]){const l=document.createElement('label'),select=document.createElement('select');l.append(document.createTextNode(label+' '),select);select.dataset.range=key;for(const [i,id]of dataset.categoryIds.entries()){const o=document.createElement('option');o.value=id;o.textContent=dataset.categories[i];select.append(o);}controls.append(l);selects[key]=select;}
 const group=(className,label,lead)=>{const g=document.createElement('div'),s=document.createElement('span');g.className=className;g.setAttribute('role','group');g.setAttribute('aria-label',label);s.textContent=lead;g.append(s);controls.append(g);return g;};
 // Showing and hiding is a filter: a hidden series leaves the marks, the legend and the selected data.
 const shown=group('chart-series-visibility',zh?'显示或隐藏系列':'Show or hide series',zh?'显示：':'Show:');
 const checkboxes=dataset.series.map(s=>{const l=document.createElement('label'),n=document.createElement('input');n.type='checkbox';n.value=s.id;n.dataset.series=s.id;l.append(n,document.createTextNode(s.label));shown.append(l);return n;});
 // Focus emphasises one shown series and keeps every other shown series as context; it never hides data.
 const presets=group('chart-series-switch',zh?'聚焦一个系列':'Focus one series',zh?'聚焦：':'Focus:');if(spec.chartType==='heatmap')presets.hidden=true;
 // A single-series chart has no series to focus or hide: its emphasis is the declared category focus.
 if(dataset.series.length<2)presets.hidden=shown.hidden=true;
 const status=document.createElement('p');status.className='interaction-status';status.setAttribute('role','status');
 // Clearing the reader's focus returns to the author's declared focus, so the button says which one it returns to.
 const choices=[{id:'',label:block.focus?(zh?'作者设定的重点':'Author\'s focus'):(zh?'不聚焦':'No focus')},...dataset.series];
 const buttons=choices.map(choice=>{const b=document.createElement('button');b.type='button';b.dataset.selectSeries=choice.id;b.textContent=choice.label;presets.append(b);b.addEventListener('click',()=>{try{emit({event:'data.focus',interactionId:spec.id,...(choice.id?{seriesId:choice.id}:{})});}catch(e){draw(current);status.textContent=zh?'聚焦未应用：请先显示该系列。':'Focus not applied: '+e.message;}});return b;});
 controls.append(status);
 const full=original.querySelector('details').cloneNode(true);full.className='full-source-data';full.querySelector('summary').textContent=zh?'完整原始数据（不受筛选影响）':'Full original dataset (unfiltered)';
 original.replaceWith(controls,view,full);view.className='chart-current-view';const explanation=document.createElement('p');explanation.className='chart-selection-explanation component-note';explanation.setAttribute('aria-live','polite');view.after(explanation);let current;
 function change(){try{emit({event:'data.filter',interactionId:spec.id,seriesIds:checkboxes.filter(n=>n.checked).map(n=>n.value),fromId:selects.fromId.value,toId:selects.toId.value});}catch(e){draw(current);status.textContent=zh?'选择未应用：请选择至少一个系列，并保持类别范围顺序。':'Selection not applied: '+e.message;}}
 controls.addEventListener('change',change);
 for(const select of Object.values(selects))select.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;let index=select.selectedIndex;if(e.key==='ArrowDown')index=Math.min(select.options.length-1,index+1);else if(e.key==='ArrowUp')index=Math.max(0,index-1);else if(e.key==='Home')index=0;else if(e.key==='End')index=select.options.length-1;else return;e.preventDefault();e.stopPropagation();select.value=select.options[index].value;change();});
 function draw(state){
  const open=view.querySelector('details')?.open||false;current=state;for(const [key,n]of Object.entries(selects))n.value=state[key];for(const n of checkboxes)n.checked=state.seriesIds.includes(n.value);
  const d=selectedDataset(dataset,state),drawn=focusedChart(block,theme,dataset,state);view.innerHTML=chart(drawn.block,{locale,datasets:[d]},drawn.theme,{sceneId,anchors,paletteIds:dataset.series.map(s=>s.id)});
  const selection=zh?'当前视图':'Current view',focused=dataset.series.find(s=>s.id===state.focusSeriesId);view.querySelector('details').open=open;view.querySelector('summary').textContent=zh?'查看当前筛选数据':'View selected data';status.textContent=selection+(zh?'：':': ')+d.categories[0]+' → '+d.categories.at(-1)+' · '+d.series.map(s=>s.label).join(' / ')+(focused?(zh?' · 聚焦：':' · Focus: ')+focused.label:'');
  explanation.textContent=captionText(dataset,state,locale);
  for(const b of buttons){const id=b.dataset.selectSeries;b.setAttribute('aria-pressed',String(id?state.focusSeriesId===id:state.focusSeriesId===null));b.disabled=!!id&&!state.seriesIds.includes(id);}
  // Removed marks keep their original identity in the complete source table, never another point.
  full.querySelectorAll('[data-excluded-anchor]').forEach(n=>n.remove());
  const rows=[...full.querySelectorAll('tbody tr')];for(const [i,categoryId]of dataset.categoryIds.entries()){
   const excludedCategory=!d.categoryIds.includes(categoryId),row=rows[i];
   if(excludedCategory){const span=document.createElement('span');span.id=anchors[JSON.stringify([categoryId,''])];span.dataset.excludedAnchor='true';span.textContent=zh?'（当前范围外）':' (outside current range)';row.querySelector('th').append(span);}
   for(const [j,series]of dataset.series.entries())if(excludedCategory||!state.seriesIds.includes(series.id)){const span=document.createElement('span');span.id=anchors[JSON.stringify([categoryId,series.id])];span.dataset.excludedAnchor='true';span.textContent=zh?'（当前视图外）':' (outside current view)';row.querySelectorAll('td')[j*(block.chartType==='scatter'?2:1)].append(span);}
  }
 }
 /** Nodes for a motion plan target: marks of one series, the whole current view, or the explanation line. */
 function targets(target){if(target.kind==='series')return [...view.querySelectorAll('g[data-series-id]')].filter(g=>g.dataset.seriesId===target.seriesId);if(target.kind==='explanation')return [explanation];if(target.kind==='view')return [view];return [];}
 return {draw,panel:view,targets,dispose(){controls.removeEventListener('change',change);}};
}
