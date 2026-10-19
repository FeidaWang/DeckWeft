export function mountImageComparison(root,other,config,emit){
 const zh=config.locale==='zh-CN',tabs=document.createElement('div'),panel=document.createElement('div'),first=root.querySelector('.web-image'),second=other.querySelector('.web-image').cloneNode(true),originalOther=other.querySelector('.web-image'),fallback=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent=zh?'第二张原始图片':'Second original image';fallback.append(summary);originalOther.replaceWith(fallback);fallback.append(originalOther);
 tabs.className='semantic-controls compare-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',zh?'图片比较':'Image comparison');panel.className='compare-panel';panel.id=config.panelId;panel.setAttribute('role','tabpanel');panel.tabIndex=0;
 first.replaceWith(tabs,panel);panel.append(first,second);const buttons=['first','second','both'].map((id,i)=>{const b=document.createElement('button');b.type='button';b.dataset.tabId=id;b.id=config.panelId+'-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);b.textContent=(zh?['第一张','第二张','并列比较']:['First image','Second image','Compare both'])[i];tabs.append(b);return b;});
 function pick(id){emit({event:'tab.select',interactionId:config.spec.id,tabId:id});}
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-tab-id]');if(b)pick(b.dataset.tabId);});
 tabs.addEventListener('keydown',e=>{const i=buttons.indexOf(e.target);if(i<0)return;let j;if(e.key==='ArrowRight')j=(i+1)%3;else if(e.key==='ArrowLeft')j=(i+2)%3;else if(e.key==='Home')j=0;else if(e.key==='End')j=2;else return;e.preventDefault();e.stopPropagation();buttons[j].focus();pick(buttons[j].dataset.tabId);});
 return {panel,targets:target=>target.kind==='panel'?[panel]:[],draw(state){panel.dataset.tab=state.tabId;first.hidden=state.tabId==='second';second.hidden=state.tabId==='first';for(const b of buttons){const active=b.dataset.tabId===state.tabId;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active)panel.setAttribute('aria-labelledby',b.id);}}};
}
export function mountStepExplanation(root,config,emit){
 const {spec,block,locale,anchors}=config,zh=locale==='zh-CN',controls=document.createElement('div'),panel=document.createElement('div');controls.className='semantic-controls step-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label',zh?'分步说明':'Step explanation');panel.className='step-explanation';panel.id=config.panelId;panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
 const buttons=spec.steps.map(step=>{const b=document.createElement('button');b.type='button';b.dataset.stepId=step.id;b.textContent=step.label;controls.append(b);return b;});
 root.append(controls,panel);controls.addEventListener('click',e=>{const b=e.target.closest('[data-step-id]');if(b)emit({event:'step.select',interactionId:spec.id,stepId:b.dataset.stepId});});
 controls.addEventListener('keydown',e=>{const i=buttons.indexOf(e.target);if(i<0)return;let j;if(e.key==='ArrowRight')j=(i+1)%buttons.length;else if(e.key==='ArrowLeft')j=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=buttons.length-1;else return;e.preventDefault();e.stopPropagation();buttons[j].focus();emit({event:'step.select',interactionId:spec.id,stepId:buttons[j].dataset.stepId});});
 return {panel,targets:target=>target.kind==='panel'?[panel]:target.kind==='step-targets'?[...root.querySelectorAll('.semantic-step-target')]:[],draw(state){
  const step=spec.steps.find(s=>s.id===state.stepId);for(const b of buttons){const active=b.dataset.stepId===state.stepId;b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-controls',config.panelId);}root.querySelectorAll('.semantic-step-target').forEach(n=>n.classList.remove('semantic-step-target'));panel.replaceChildren();const heading=document.createElement('strong'),text=document.createElement('p');heading.textContent=step.label;text.textContent=step.text;panel.append(heading,text);
  if(block.type==='code'){const excerpt=document.createElement('pre'),code=document.createElement('code');code.textContent=step.lines.map(n=>block.text.split('\n')[n-1]).join('\n');excerpt.append(code);const location=document.createElement('p');location.className='component-note';location.textContent=(zh?'原文行：':'Source lines: ')+step.lines.join(', ');panel.append(location,excerpt);for(const n of step.lines)root.querySelector('[data-line="'+n+'"]')?.classList.add('semantic-step-target');}
  else {const target=document.getElementById(anchors[step.objectId]);target?.classList.add('semantic-step-target');const edge=block.edges.find(e=>e.id===step.objectId);if(edge)for(const id of [edge.from,edge.to])document.getElementById(anchors[id])?.classList.add('semantic-step-target');const description=document.createElement('p');description.className='component-note';description.textContent=edge?block.nodes.find(n=>n.id===edge.from).label+' → '+block.nodes.find(n=>n.id===edge.to).label+(edge.label?' · '+edge.label:''):block.nodes.find(n=>n.id===step.objectId).label;panel.append(description);}
 }};
}
export function mountImageHotspots(root,config,emit){
 root.classList.add('hotspot-component');
 const {spec,locale,annotations,positions}=config,zh=locale==='zh-CN',frame=root.querySelector('.image-crop'),panel=document.createElement('div');panel.className='hotspot-explanation';panel.setAttribute('aria-live','polite');panel.id=config.panelId;root.append(panel);
 const buttons=spec.hotspots.map((h,i)=>{const b=document.createElement('button');b.type='button';b.className='image-hotspot';b.dataset.hotspotId=h.id;b.style.left=`clamp(22px, ${positions[i].x*100}%, calc(100% - 22px))`;b.style.top=`clamp(22px, ${positions[i].y*100}%, calc(100% - 22px))`;b.textContent=String(i+1);b.setAttribute('aria-label',(zh?'图片热点 ':'Image hotspot ')+(i+1)+': '+annotations[h.annotationId].text);b.setAttribute('aria-controls',panel.id);frame.append(b);b.addEventListener('click',()=>emit({event:'annotation.reveal',interactionId:spec.id,hotspotId:b.getAttribute('aria-expanded')==='true'?null:h.id}));return b;});
 return {panel,targets:target=>target.kind==='panel'?[panel]:[],draw(state){panel.replaceChildren();for(const b of buttons){const active=b.dataset.hotspotId===state.hotspotId;b.setAttribute('aria-expanded',String(active));b.setAttribute('aria-pressed',String(active));}if(!state.hotspotId){panel.textContent=zh?'选择热点查看说明；所有原文注释仍在页面中。':'Select a hotspot for its explanation; all original annotations remain on this page.';return;}const h=spec.hotspots.find(h=>h.id===state.hotspotId),p=document.createElement('p');p.textContent=annotations[h.annotationId].text;const coordinates=document.createElement('p');coordinates.className='component-note';coordinates.textContent=(zh?'原图坐标：':'Original-image coordinates: ')+h.x+', '+h.y;panel.append(p,coordinates);}};
}
/**
 * Blueprint A (S9b): one diagram explained in three stages on one page. The cue clock owns the stage (Explain 0, Diagram 1,
 * Explore 2…); selecting a part, on a button or on the diagram itself, explores it; Show whole returns to Diagram. Every part is
 * a focusable control, so arrow keys, Home/End, Enter and Space change the part and never turn the page (turnsPage).
 */
export function mountBlueprint(root,config,emit){
 const {spec,locale,anchors}=config,zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en,scene=root.closest('.web-scene'),whole=spec.blueprint.whole,n=spec.steps.length,sep=zh?'——':' — ';
 root.classList.add('blueprint');
 const controls=document.createElement('div'),panel=document.createElement('div');controls.className='semantic-controls step-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label',t('Parts of ','部分：')+whole.label);
 panel.className='step-explanation blueprint-panel';panel.id=config.panelId;panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
 const select=stepId=>emit({event:'step.select',interactionId:spec.id,stepId});
 const all=document.createElement('button');all.type='button';all.dataset.showWhole='';all.textContent=t('Show whole','显示整体');all.setAttribute('aria-controls',panel.id);all.addEventListener('click',()=>select(null));controls.append(all);
 const buttons=spec.steps.map((step,i)=>{const b=document.createElement('button');b.type='button';b.dataset.stepId=step.id;b.textContent=(i+1)+' · '+step.label;b.setAttribute('aria-controls',panel.id);controls.append(b);return b;});
 const parts=spec.steps.map((step,i)=>{const g=document.getElementById(anchors[step.objectId]);if(!g)return null;g.dataset.part=step.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',t(`Part ${i+1} of ${n}: `,`第 ${i+1} 部分，共 ${n} 部分：`)+step.label);g.setAttribute('aria-controls',panel.id);return g;});
 root.append(controls,panel);
 controls.addEventListener('click',e=>{const b=e.target.closest('[data-step-id]');if(b)select(b.dataset.stepId);});
 // Arrow keys move along the reading order on the part buttons and on the diagram's parts alike.
 const move=(list,e)=>{const i=list.indexOf(e.target.closest('[data-step-id],[data-part]'));if(i<0)return;let j;if(e.key==='ArrowRight'||e.key==='ArrowDown')j=Math.min(n-1,i+1);else if(e.key==='ArrowLeft'||e.key==='ArrowUp')j=Math.max(0,i-1);else if(e.key==='Home')j=0;else if(e.key==='End')j=n-1;else if(list===parts&&(e.key==='Enter'||e.key===' '))j=i;else return;e.preventDefault();e.stopPropagation();list[j]?.focus();select(spec.steps[j].id);};
 controls.addEventListener('keydown',e=>move(buttons,e));
 for(const g of parts)if(g){g.addEventListener('click',()=>select(g.dataset.part));g.addEventListener('keydown',e=>move(parts,e));}
 const line=(cls,text)=>{const p=document.createElement('p');if(cls)p.className=cls;p.textContent=text;return p;};
 return {panel,targets:target=>target.kind==='panel'?[panel]:target.kind==='step-targets'?[...root.querySelectorAll('.semantic-step-target')]:[],draw(state){
  scene.dataset.blueprintStage=state.stage;root.querySelectorAll('.semantic-step-target').forEach(g=>g.classList.remove('semantic-step-target'));
  const k=spec.steps.findIndex(s=>s.id===state.stepId);
  all.setAttribute('aria-pressed',String(state.stage==='diagram'));for(const [i,b]of buttons.entries())b.setAttribute('aria-pressed',String(i===k));for(const [i,g]of parts.entries())g?.setAttribute('aria-pressed',String(i===k));
  panel.classList.toggle('blueprint-explain',state.stage==='explain');panel.replaceChildren();const head=document.createElement('strong');panel.append(head);
  const order=spec.steps.map((s,i)=>(i+1)+' '+s.label).join(' → ');
  if(state.stage==='explain'){head.textContent=t('Object · ','对象 · ')+whole.label;panel.append(line('component-note',t('Next stage shows the whole object and its parts.','下一阶段显示完整对象及其各个部分。')));return;}
  if(state.stage==='diagram'){head.textContent=whole.label+' · '+t(`${n} parts`,`${n} 个部分`);panel.append(line('',whole.text),line('component-note',t('Reading order: ','阅读顺序：')+order+t('. Select a part to explore it against the whole.','。选择一个部分，把它与整体对照查看。')));return;}
  const step=spec.steps[k];parts[k]?.classList.add('semantic-step-target');
  head.textContent=t(`Part ${k+1} of ${n} · `,`第 ${k+1} 部分，共 ${n} 部分 · `)+step.label;
  panel.append(line('',step.text),line('component-note',t('Against the whole · ','对照整体 · ')+whole.label+sep+whole.text),line('component-note',t('Before it: ','前一部分：')+(k?spec.steps[k-1].label:t('none, this is the first part','无，这是第一部分'))+t(' · After it: ','；后一部分：')+(k<n-1?spec.steps[k+1].label:t('none, this is the last part','无，这是最后一部分'))));
 }};
}
