import { compositionOrder } from '../../design/compositions.mjs';
import { createHash } from 'node:crypto';
import { assertDesignPlan } from '../../design/plan.mjs';
import {sceneDirection} from '../../design/art-direction.mjs';
import { assertWebScene } from './validate.mjs';
// .4 (S4): chart() and its CSS draw new kinds, rows and declarations; every chart's drawing changed, so scene source hashes must not claim the .3 renderer.
export const WEB_RENDERER_VERSION = 'visual-art-direction.4';
export const contentHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function compileWebScenes(document,plan){
 assertDesignPlan(document,plan);
 return plan.scenes.map((s,index)=>{
  const direction=sceneDirection(document,plan,index),theme=direction.theme;
  const regions=compositionOrder(document,s).map(id=>({id:`r${contentHash(s.id+'|'+id).slice(0,20)}`,blockId:id,component:document.blocks.find(b=>b.id===id).type,textRole:({heading:'display',citation:'caption',code:'code',chart:'data',metric:'data',image:'image'})[document.blocks.find(b=>b.id===id).type]||'body',...(document.blocks.find(b=>b.id===id).type==='chart'?{datasetId:document.blocks.find(b=>b.id===id).datasetId}:{}),...(s.imageSlots?.find(slot=>slot.blockId===id)?{imageSlot:s.imageSlots.find(slot=>slot.blockId===id)}:{}),...(s.crops?.find(c=>c.blockId===id)?{crop:s.crops.find(c=>c.blockId===id)}:{})}));
  const graphics=s.graphics||(s.composition==='diagonal-cover'?[{id:'plane',path:'M1130 0H1440V810H845Z',fill:'secondary',rotation:0},{id:'flag',path:'M1080 0H1220L1165 155H1025Z',fill:'accent',rotation:0}]:[]);
  return assertWebScene({format:'deckweft-web-scene',version:1,id:s.id,theme:s.theme,themeVersion:s.themeVersion,composition:s.composition,focalBlockId:s.focalBlockId,regions,readingOrder:regions.map(r=>r.id),groups:[{id:'content',regionIds:regions.map(r=>r.id)}],variants:[{mode:'reading',layout:'stack',readingOrder:regions.map(r=>r.id)},{mode:'presentation',layout:'composition',readingOrder:regions.map(r=>r.id)}],graphics,...(s.interactions?{interactions:s.interactions}:{}),...(s.cues?{cues:s.cues}:{}),...(s.motion?{motion:s.motion}:{}),...(s.takeaway?{takeaway:s.takeaway}:{}),...(s.contentStatus?{contentStatus:s.contentStatus}:{}),...(s.keyStates?{keyStates:s.keyStates}:{}),...(s.staticState?{staticState:s.staticState}:{}),gradients:s.gradients||[],breakpoints:{readingMaxWidth:700,presentationWidth:1440},sourceHash:contentHash({document,scene:s,theme,renderer:WEB_RENDERER_VERSION})},document);
 });
}
