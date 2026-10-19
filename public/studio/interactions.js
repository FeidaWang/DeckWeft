/** Explicit author action on the open project. No demo material or inferred facts. */
export function addExplanatoryInteractions(project,sceneId,{newId=()=> 'i-'+crypto.randomUUID()}={}){
 const next=structuredClone(project),s=next.plan.scenes.find(s=>s.id===sceneId),d=next.document;
 if(!s)throw Error('Select an existing scene.');
 const locks=d.authorOverrides.sceneLocks?.find(l=>l.sceneId===s.id)?.fields||[];
 if(locks.some(f=>['interactions','cues'].includes(f)))throw Error('Unlock this scene interaction plan first.');
 const targets=d.blocks.filter(b=>s.blockIds.includes(b.id)&&['chart','diagram'].includes(b.type)&&!s.interactions?.some(i=>i.blockId===b.id));
 if(!targets.length)throw Error('This page has no chart or diagram without an interaction.');
 for(const b of targets){
  if(d.authorOverrides.lockedBlockIds.includes(b.id))throw Error('Unlock the affected content first.');
  const id=newId();s.interactions??=[];s.cues??=[];
  if(b.type==='chart'){
   const data=d.datasets.find(v=>v.id===b.datasetId);
   if(!data.categoryIds){
    if(d.blocks.some(v=>v.type==='chart'&&v.datasetId===data.id&&d.authorOverrides.lockedBlockIds.includes(v.id)))throw Error('Unlock charts sharing this dataset before assigning category identities.');
    // Assign new author identities once. Never derive identity from text or position.
    data.categoryIds=data.categories.map(()=>newId());
   }
   s.interactions.push({id,kind:'chart-select',blockId:b.id});
   for(const series of data.series)s.cues.push({id:newId(),event:'data.filter',interactionId:id,seriesIds:[series.id],fromId:data.categoryIds[0],toId:data.categoryIds.at(-1)});
   s.cues.push({id:newId(),event:'data.filter',interactionId:id,seriesIds:data.series.map(v=>v.id),fromId:data.categoryIds[0],toId:data.categoryIds.at(-1)});
  }else{
   const objects=b.edges.length&&b.edges.every(e=>e.id)?b.edges:b.nodes;
   if(objects.length>30)throw Error('Author at most 30 explanation steps explicitly in JSON.');
   d.explanations??=[];
   const steps=objects.map(o=>{
    const edge=Object.hasOwn(o,'from'),path=edge?b.nodes.find(n=>n.id===o.from).label+' → '+b.nodes.find(n=>n.id===o.to).label:o.label;
    const label=edge?(o.label||path):o.label,text=edge?path+(o.label?' · '+o.label:''):(o.note||o.label);
    if(label.length>100||text.length>2000)throw Error('Shorten the step label or author its explanation explicitly in JSON.');
    const explanationId=newId();d.explanations.push({id:explanationId,label,text,sourceIds:[...(b.sourceIds||[])]});return {id:newId(),objectId:o.id,explanationId};
   });
   s.interactions.push({id,kind:'steps',blockId:b.id,steps});
   for(let i=1;i<steps.length;i++)s.cues.push({id:newId(),event:'step.next',interactionId:id});
  }
 }
 return next;
}

/**
 * Commit only explicit opening choices, never the viewer's transient replay/resources. `cue` is where the preview stands: a state
 * reached by playing or seeking to a later cue (for example the static state the preview opens on) is not an author's choice, so it
 * is refused unless the author explored it or the preview is at the opening (position 0).
 */
export function useInteractionOpening(project,sceneId,states,cue){
 const next=structuredClone(project),scene=next.plan.scenes.find(s=>s.id===sceneId),d=next.document;
 if(!scene||!Array.isArray(states))throw Error('Missing current scene state.');
 if(!cue||!Number.isSafeInteger(cue.position)||typeof cue.exploring!=='boolean')throw Error('Refresh the current preview.');
 if(cue.position!==0&&!cue.exploring)throw Error(`The preview shows cue position ${cue.position}${cue.position===cue.staticPosition?' (the static state)':''}, not an explored selection. Change the chart or step in the preview first, or move Cue position to 0; the opening is unchanged.`);
 if(d.authorOverrides.sceneLocks?.some(l=>l.sceneId===sceneId&&l.fields.includes('interactions')))throw Error('Unlock this scene interaction plan first.');
 if(scene.interactions?.some(i=>i.blueprint))throw Error('An Explain → Diagram → Explore page always opens on Explain. Choose its static state instead.');
 for(const spec of scene.interactions||[]){
  if(!['chart-select','steps'].includes(spec.kind))continue;
  if(d.authorOverrides.lockedBlockIds.includes(spec.blockId))throw Error('Unlock the affected content first.');
  const value=states.find(s=>s.id===spec.id);if(!value)throw Error('Refresh the current preview.');
  if(spec.kind==='chart-select'){
   const block=d.blocks.find(b=>b.id===spec.blockId),dataset=d.datasets.find(v=>v.id===block.datasetId),from=dataset.categoryIds.indexOf(value.fromId),to=dataset.categoryIds.indexOf(value.toId);
   if(from<0||to<from||!Array.isArray(value.seriesIds)||!value.seriesIds.length||new Set(value.seriesIds).size!==value.seriesIds.length||value.seriesIds.some(id=>!dataset.series.some(s=>s.id===id)))throw Error('Invalid chart opening.');
   if(value.focusSeriesId!=null&&!value.seriesIds.includes(value.focusSeriesId))throw Error('Invalid chart opening.');
   spec.initialSeriesIds=dataset.series.filter(s=>value.seriesIds.includes(s.id)).map(s=>s.id);spec.initialFromId=value.fromId;spec.initialToId=value.toId;
   if(value.focusSeriesId)spec.initialFocusSeriesId=value.focusSeriesId;else delete spec.initialFocusSeriesId;
  }else{
   if(!spec.steps.some(s=>s.id===value.stepId))throw Error('Invalid step opening.');spec.initialStepId=value.stepId;
  }
 }
 return next;
}

/** Choose which key state static output and the static reduced-motion fallback freeze. Cue and motion locks keep it. */
export function useStaticState(project,sceneId,keyStateId){
 const next=structuredClone(project),scene=next.plan.scenes.find(s=>s.id===sceneId),d=next.document;
 if(!scene)throw Error('Select an existing scene.');
 if(d.authorOverrides.sceneLocks?.some(l=>l.sceneId===sceneId&&l.fields.some(f=>['cues','motion'].includes(f))))throw Error('Unlock this scene cue order and motion first.');
 if(keyStateId===null){if(scene.motion?.reducedMotion==='static')throw Error('The static reduced-motion fallback needs a static state. Choose a key state, or set reducedMotion to instant first.');delete scene.staticState;return next;}
 if(!scene.keyStates?.some(k=>k.id===keyStateId))throw Error('Choose an existing key state of this scene.');
 scene.staticState={keyStateId};return next;
}

/**
 * S9b: make this page Explain → Diagram → Explore (blueprint A). The page's own diagram nodes become the parts, its heading the
 * question and its first paragraph or callout the short answer. No text is invented: each part's explanation starts from its node
 * label and note, and the whole object's from the part labels; edit them under Step explanations. Cues and key states are the
 * stages. The static state is left for the author to choose; paged exports refuse the page until it is Diagram or Explore.
 */
export function addBlueprintA(project,sceneId,{newId=()=> 'i-'+crypto.randomUUID()}={}){
 const next=structuredClone(project),s=next.plan.scenes.find(s=>s.id===sceneId),d=next.document;
 if(!s)throw Error('Select an existing scene.');
 const zh=d.locale==='zh-CN',t=(en,cn)=>zh?cn:en,locks=d.authorOverrides.sceneLocks?.find(l=>l.sceneId===s.id)?.fields||[];
 if(locks.some(f=>['interactions','cues','motion'].includes(f)))throw Error(t('Unlock this scene interaction plan first.','请先解锁本页的交互计划。'));
 const blocks=s.blockIds.filter(id=>!s.disclosure?.blockIds.includes(id)).map(id=>d.blocks.find(b=>b.id===id)),diagrams=blocks.filter(b=>b.type==='diagram');
 if(diagrams.length!==1)throw Error(t('This page needs exactly one diagram on the page: its nodes become the parts.','本页需要恰好一张显示在页面上的图：它的节点就是各个部分。'));
 const b=diagrams[0],question=blocks.find(v=>v.type==='heading'),answer=blocks.find(v=>['paragraph','callout'].includes(v.type));
 if(!question||!answer)throw Error(t('Add a heading (the question) and a paragraph or callout (the short answer) to this page first.','请先为本页添加标题（问题）和段落或提示框（简短回答）。'));
 if(d.authorOverrides.lockedBlockIds.includes(b.id))throw Error(t('Unlock the diagram first.','请先解锁这张图。'));
 if(s.interactions?.some(i=>i.blockId!==b.id||i.kind!=='steps'))throw Error(t('An Explain → Diagram → Explore page has one explanation sequence. Move the other interactions on this page first.','“讲解 → 图解 → 探索”页面只有一个讲解序列。请先移走本页的其他交互。'));
 if(s.interactions?.some(i=>i.blueprint))throw Error(t('This page is already Explain → Diagram → Explore.','本页已经是“讲解 → 图解 → 探索”。'));
 if(b.nodes.length>30)throw Error(t('Author at most 30 parts explicitly in JSON.','最多 30 个部分，请在 JSON 中明确编写。'));
 d.explanations??=[];
 // An existing explanation of this diagram is kept when its steps already name the nodes; steps on relationships cannot be parts.
 const old=s.interactions?.find(i=>i.blockId===b.id);
 if(old&&old.steps.some(step=>!b.nodes.some(n=>n.id===step.objectId)))throw Error(t('This diagram’s steps explain relationships; parts are nodes. Remove that interaction in JSON first.','这张图的步骤讲解的是连线；部分必须是节点。请先在 JSON 中移除该交互。'));
 const steps=old?old.steps.map(step=>({id:step.id,objectId:step.objectId,explanationId:step.explanationId})):b.nodes.map(n=>{
  if(n.label.length>100||(n.note||n.label).length>2000)throw Error(t('Shorten the part label or author its explanation explicitly in JSON.','请缩短部分标题，或在 JSON 中明确编写说明。'));
  const explanationId=newId();d.explanations.push({id:explanationId,label:n.label,text:n.note||n.label,sourceIds:[...(b.sourceIds||[])]});return {id:newId(),objectId:n.id,explanationId};
 });
 const labels=steps.map(step=>b.nodes.find(n=>n.id===step.objectId).label.replace(/\n/g,' ')),name=labels.join(' → ');
 if(name.length>100)throw Error(t('Name the whole object explicitly in JSON; the part labels are too long to name it.','部分标题过长，无法组成整体名称；请在 JSON 中明确命名整体。'));
 const wholeExplanationId=newId(),id=old?.id||newId();
 d.explanations.push({id:wholeExplanationId,label:name,text:t(`${labels.length} parts in reading order: ${labels.join(', ')}.`,`按阅读顺序共 ${labels.length} 个部分：${labels.join('、')}。`),sourceIds:[...(b.sourceIds||[])]});
 s.interactions=[{id,kind:'steps',blockId:b.id,steps,blueprint:{questionBlockId:question.id,answerBlockId:answer.id,wholeExplanationId}}];
 s.cues=[{id:newId(),event:'step.next',interactionId:id,label:t('Show the whole','显示整体')},...labels.map(label=>({id:newId(),event:'step.next',interactionId:id,label:t(`Explore ${label}`,`查看“${label}”`).slice(0,200)}))];
 s.keyStates=[{id:newId(),position:0,label:t('Explain','讲解')},{id:newId(),position:1,label:t('Diagram · the whole','图解 · 整体')},{id:newId(),position:2,label:t(`Explore · ${labels[0]}`,`探索 · ${labels[0]}`).slice(0,100)}];
 // The author chooses the static state. A static reduced-motion fallback cannot wait, so it gets the whole (Diagram) until then.
 if(s.motion?.reducedMotion==='static')s.staticState={keyStateId:s.keyStates[1].id};else delete s.staticState;
 return next;
}
