import {DeckError} from '../core/errors.mjs';
import {initialInteractionState,reduceInteractionState,seekInteractionState} from './timeline.mjs';
import {staticStatePosition} from '../design/scene-semantics.mjs';
export const SEMANTIC_EVENTS=['scene.enter','scene.exit','step.next','tab.select','data.filter','annotation.reveal'];
export function compileInteractions(document,scene){
 return (scene.interactions||[]).map(spec=>{
  if(spec.kind==='steps')return {...structuredClone(spec),steps:spec.steps.map(step=>{const note=document.explanations.find(n=>n.id===step.explanationId);return {...structuredClone(step),label:note.label,text:note.text};})};
  if(spec.kind!=='chart-select')return structuredClone(spec);
  const b=document.blocks.find(b=>b.id===spec.blockId),d=document.datasets.find(d=>d.id===b.datasetId);
  return {...structuredClone(spec),seriesIds:d.series.map(s=>s.id),categoryIds:[...d.categoryIds],initialSeriesIds:spec.initialSeriesIds||d.series.map(s=>s.id),initialFromId:spec.initialFromId||d.categoryIds[0],initialToId:spec.initialToId||d.categoryIds.at(-1)};
 });
}
export function assertSceneInteractions(document,scene){
 const fail=message=>{throw new DeckError('INVALID_INTERACTION',message,422);},specs=scene.interactions||[],blocks=new Map(document.blocks.map(b=>[b.id,b]));
 if(new Set(specs.map(s=>s.id)).size!==specs.length)fail('Use stable unique interaction ids within each scene.');
 if(new Set(specs.map(s=>s.blockId)).size!==specs.length)fail('Use one interaction per primary component.');
 for(const s of specs){
  const b=blocks.get(s.blockId);if(!b||!scene.blockIds.includes(s.blockId))fail('Interaction targets must remain in their scene.');
  if(s.kind==='chart-select'){
   if(b.type!=='chart')fail('Chart selection needs a chart block.');const d=document.datasets.find(d=>d.id===b.datasetId);if(!d.categoryIds)fail('Interactive charts need stable categoryIds; never infer identities from label positions.');
   if((s.initialFromId&&!d.categoryIds.includes(s.initialFromId))||(s.initialToId&&!d.categoryIds.includes(s.initialToId)))fail('Initial range targets are missing.');
  }else if(s.kind==='image-compare'){
   if(b.type!=='image'||s.otherBlockId===b.id||blocks.get(s.otherBlockId)?.type!=='image'||!scene.blockIds.includes(s.otherBlockId))fail('Comparison needs two existing image blocks in this scene.');
   if(specs.some(v=>v.blockId===s.otherBlockId)||specs.some(v=>v!==s&&v.otherBlockId===s.otherBlockId))fail('Comparison images cannot be shared by competing interactions.');
  }else if(s.kind==='image-hotspots'){
   if(b.type!=='image')fail('Hotspots need an image block.');if(new Set(s.hotspots.map(h=>h.id)).size!==s.hotspots.length)fail('Use unique stable hotspot identities.');
   const crop=scene.crops?.find(c=>c.blockId===b.id)||{x:0,y:0,width:1,height:1},contain=scene.imageSlots?.some(slot=>slot.blockId===b.id&&slot.display==='contain');
   for(const h of s.hotspots){const a=blocks.get(h.annotationId);if(a?.type!=='annotation'||a.target.blockId!==b.id||!scene.blockIds.includes(a.id))fail('Every hotspot needs an existing same-scene annotation bound to this image.');if(!contain&&(h.x<crop.x||h.x>crop.x+crop.width||h.y<crop.y||h.y>crop.y+crop.height))fail('A hotspot is outside the authored crop; revise its coordinates or crop explicitly.');}
  }else if(s.kind==='steps'){
   if(!['diagram','code'].includes(b.type))fail('Step explanations need a diagram or exact code block.');if(new Set(s.steps.map(v=>v.id)).size!==s.steps.length)fail('Use stable unique step ids.');
   if(s.initialStepId&&!s.steps.some(v=>v.id===s.initialStepId))fail('Initial explanation step is missing.');
   for(const step of s.steps){if(!document.explanations?.some(e=>e.id===step.explanationId))fail('Explanation content is missing; bind an existing semantic explanation identity.');if(b.type==='diagram'){if(step.lines||![...b.nodes,...b.edges.filter(e=>e.id)].some(v=>v.id===step.objectId))fail('Diagram steps must target supplied stable node/edge ids.');}else if(step.objectId||!step.lines||step.lines.some(n=>n>b.text.split('\n').length))fail('Code steps must reference existing exact source lines.');}
  }
 }
 try{
  const compiled=compileInteractions(document,scene);let state=initialInteractionState(compiled);
  for(const spec of compiled.filter(s=>s.kind==='chart-select'))state=reduceInteractionState(compiled,state,{event:'data.filter',interactionId:spec.id,seriesIds:spec.initialSeriesIds,fromId:spec.initialFromId,toId:spec.initialToId});
  const cues=scene.cues||[];if(new Set(cues.map(c=>c.id)).size!==cues.length)fail('Use unique stable cue ids.');
  for(const cue of cues)state=reduceInteractionState(compiled,state,cue);
 }catch(error){fail(error.message);}
 return scene;
}
export function compileCues(document,scene){
 const lifecycle=[{id:scene.id+'-enter',event:'scene.enter',sceneId:scene.id},...(scene.cues||[]).map(c=>({...c,sceneId:scene.id})),{id:scene.id+'-exit',event:'scene.exit',sceneId:scene.id}];
 return {sceneId:scene.id,interactions:compileInteractions(document,scene),cues:structuredClone(scene.cues||[]),lifecycle};
}
/** The frozen filter/focus selection for static output: the authored opening, or the named static state's cue boundary. */
export function staticInteractionState(document,scene){
 return seekInteractionState(compileInteractions(document,scene),scene.cues||[],staticStatePosition(scene));
}
