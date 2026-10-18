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
