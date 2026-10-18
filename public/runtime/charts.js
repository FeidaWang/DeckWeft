export function mountChartSelection(root,config,emit){
 const {spec,block,dataset,locale,theme,sceneId,anchors}=config,zh=locale==='zh-CN',original=root.querySelector('.chart'),view=document.createElement('div'),controls=document.createElement('fieldset'),legend=document.createElement('legend');
 legend.textContent=zh?'图表范围与系列':'Chart range and series';controls.className='semantic-controls chart-controls';controls.append(legend);
 const selects={};for(const [key,label]of [['fromId',zh?'起始类别':'From category'],['toId',zh?'结束类别':'To category']]){const l=document.createElement('label'),select=document.createElement('select');l.append(document.createTextNode(label+' '),select);select.dataset.range=key;for(const [i,id]of dataset.categoryIds.entries()){const o=document.createElement('option');o.value=id;o.textContent=dataset.categories[i];select.append(o);}controls.append(l);selects[key]=select;}
 const checkboxes=dataset.series.map(s=>{const l=document.createElement('label'),n=document.createElement('input');n.type='checkbox';n.value=s.id;n.dataset.series=s.id;l.append(n,document.createTextNode(s.label));controls.append(l);return n;});
 const presets=document.createElement('div');presets.className='chart-series-switch';presets.setAttribute('role','group');presets.setAttribute('aria-label',zh?'切换系列':'Switch series');
 const choices=[{id:'',label:zh?'全部系列':'All series'},...dataset.series];
 const buttons=choices.map(choice=>{const b=document.createElement('button');b.type='button';b.dataset.selectSeries=choice.id;b.textContent=choice.label;presets.append(b);b.addEventListener('click',()=>emit({event:'data.filter',interactionId:spec.id,seriesIds:choice.id?[choice.id]:dataset.series.map(s=>s.id),fromId:current.fromId,toId:current.toId}));return b;});controls.append(presets);
 const status=document.createElement('p');status.className='interaction-status';status.setAttribute('role','status');controls.append(status);
 const full=original.querySelector('details').cloneNode(true);full.className='full-source-data';full.querySelector('summary').textContent=zh?'完整原始数据（不受筛选影响）':'Full original dataset (unfiltered)';
 original.replaceWith(controls,view,full);view.className='chart-current-view';const explanation=document.createElement('p');explanation.className='chart-selection-explanation component-note';explanation.setAttribute('aria-live','polite');view.after(explanation);let current;
 function change(){try{emit({event:'data.filter',interactionId:spec.id,seriesIds:checkboxes.filter(n=>n.checked).map(n=>n.value),fromId:selects.fromId.value,toId:selects.toId.value});}catch(e){draw(current);status.textContent=zh?'选择未应用：请选择至少一个系列，并保持类别范围顺序。':'Selection not applied: '+e.message;}}
 controls.addEventListener('change',change);
 for(const select of Object.values(selects))select.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;let index=select.selectedIndex;if(e.key==='ArrowDown')index=Math.min(select.options.length-1,index+1);else if(e.key==='ArrowUp')index=Math.max(0,index-1);else if(e.key==='Home')index=0;else if(e.key==='End')index=select.options.length-1;else return;e.preventDefault();e.stopPropagation();select.value=select.options[index].value;change();});
 function draw(state){
  const open=view.querySelector('details')?.open||false;current=state;for(const [key,n]of Object.entries(selects))n.value=state[key];for(const n of checkboxes)n.checked=state.seriesIds.includes(n.value);
  const d=selectedDataset(dataset,state);view.innerHTML=chart(block,{locale,datasets:[d]},theme,{sceneId,anchors,paletteIds:dataset.series.map(s=>s.id)});
  const selection=zh?'当前视图':'Current view';view.querySelector('details').open=open;view.querySelector('summary').textContent=zh?'查看当前筛选数据':'View selected data';status.textContent=selection+': '+d.categories[0]+' → '+d.categories.at(-1)+' · '+d.series.map(s=>s.label).join(' / ');
  const last=d.categories.length-1,missing=zh?'缺失':'Missing';
  explanation.textContent=d.categories[last]+': '+d.series.map(s=>s.label+' '+(s.xValues?'x='+String(s.xValues[last])+' '+(d.xUnit||'')+', y=':'')+(s.values[last]===null?missing:String(s.values[last]))+' '+(d.unit||'')).join(' · ');
  for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.selectSeries?state.seriesIds.length===1&&state.seriesIds[0]===b.dataset.selectSeries:state.seriesIds.length===dataset.series.length));
  // Removed marks keep their original identity in the complete source table, never another point.
  full.querySelectorAll('[data-excluded-anchor]').forEach(n=>n.remove());
  const rows=[...full.querySelectorAll('tbody tr')];for(const [i,categoryId]of dataset.categoryIds.entries()){
   const excludedCategory=!d.categoryIds.includes(categoryId),row=rows[i];
   if(excludedCategory){const span=document.createElement('span');span.id=anchors[JSON.stringify([categoryId,''])];span.dataset.excludedAnchor='true';span.textContent=zh?'（当前范围外）':' (outside current range)';row.querySelector('th').append(span);}
   for(const [j,series]of dataset.series.entries())if(excludedCategory||!state.seriesIds.includes(series.id)){const span=document.createElement('span');span.id=anchors[JSON.stringify([categoryId,series.id])];span.dataset.excludedAnchor='true';span.textContent=zh?'（当前视图外）':' (outside current view)';row.querySelectorAll('td')[j*(block.chartType==='scatter'?2:1)].append(span);}
  }
 }
 return {draw,panel:view,get motionTargets(){return [view,explanation];},dispose(){controls.removeEventListener('change',change);}};
}
