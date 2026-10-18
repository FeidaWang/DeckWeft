import {DeckError} from '../core/errors.mjs';
export const TAKEAWAY_BLOCK_TYPES=['heading','paragraph','callout','quote','metric'];
/** Scene-level handoff fields: a typed takeaway, a content status and named key states built on the authored opening. */
export function assertSceneSemantics(document,scene){
 const fail=message=>{throw new DeckError('INVALID_DESIGN_PLAN',message,422);},blocks=new Map(document.blocks.map(b=>[b.id,b])),cues=scene.cues||[];
 if(scene.takeaway){
  const b=blocks.get(scene.takeaway.blockId);
  if(!b||!scene.blockIds.includes(b.id)||!TAKEAWAY_BLOCK_TYPES.includes(b.type))fail('A takeaway references a heading, paragraph, callout, quote or metric block in the same scene.');
 }
 if(scene.contentStatus==='sourced'){
  for(const id of scene.blockIds){
   const b=blocks.get(id);
   if(b.type==='chart'){const d=document.datasets.find(d=>d.id===b.datasetId);if(d.synthetic||!(d.sourceIds.length||b.sourceIds.length))fail('A sourced scene cannot show synthetic or unsourced datasets; mark it illustrative or evidence-required.');}
   if(b.type==='metric'&&!b.sourceIds.length)fail('A sourced scene needs a source on every metric.');
  }
  if(scene.takeaway&&!blocks.get(scene.takeaway.blockId).sourceIds.length)fail('A sourced takeaway needs at least one source.');
 }
 if(scene.keyStates){
  if(new Set(scene.keyStates.map(k=>k.id)).size!==scene.keyStates.length)fail('Use unique key state ids.');
  for(const k of scene.keyStates)if(k.position>cues.length)fail('A key state names a cue boundary of this scene; the opening is position 0.');
 }
 if(scene.staticState&&!scene.keyStates?.some(k=>k.id===scene.staticState.keyStateId))fail('The static state must name one of the scene key states.');
 if(scene.motion?.reducedMotion==='static'&&!scene.staticState)fail('A static reduced-motion fallback needs a named static state.');
 return scene;
}
/** Position of the named static state: 0 (the authored opening) unless the author chose a later cue boundary. */
export const staticStatePosition=scene=>scene.staticState?scene.keyStates.find(k=>k.id===scene.staticState.keyStateId).position:0;
