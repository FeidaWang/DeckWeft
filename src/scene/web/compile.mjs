import { compositionOrder } from '../../design/compositions.mjs';
import { createHash } from 'node:crypto';
import { assertDesignPlan, visibleScene } from '../../design/plan.mjs';
import {sceneDirection} from '../../design/art-direction.mjs';
import {sceneReferences} from '../../references/presentation.mjs';
import {mediaRoles} from '../../design/media.mjs';
import { assertWebScene } from './validate.mjs';
// .14 (CINE batch 2): the locator frame and visible caption (CINE-005), the type-role custom properties and one border per citation run (CINE-006); pages without declared fields render the same markup.
// .13 (CINE-002): the compact source strip, the reference panel and claim markers; pages without a references field render the same markup.
// .11 (S9a): one stylesheet rule for the page disclosure (Reduce text); scenes without a disclosure or chapter render the same words, values and anchors.
// .10 (S8, decision 2 = Merge): the three S8 packs are renamed, so their stylesheet selectors changed.
// .9 (S8): the S8 theme stylesheet has no text-transform at all after the export run showed transformed PDF text (.8 missed one table header).
// .7 (S8): three theme packs, token-role custom properties, zh-CN phrase breaks and full-width punctuation advances, reference and missing marks; every HTML stylesheet changed.
// .4 (S4): chart() and its CSS draw new kinds, rows and declarations; every chart's drawing changed, so scene source hashes must not claim the .3 renderer.
// .15 (DWI-011): a scene may declare a source palette; its derived role colours replace the theme pack's and the section names the palette. Pages without one render the same markup.
// .16 (DWI-033): a diagram may declare its scale; the statement is page text inside its figure. Diagrams without it render the same markup.
// .17: a metric's value is capped to its own width by character count (a long figure no longer leaves its panel); an acyclic diagram that is not a
// single chain is drawn in layers with connectors that never cross a node; a dataset series may declare its identity colour; the transcript
// disclosure is omitted when a page has no authored explanation or cue; the page chrome is an instrument bar (title key, page readout, monospaced
// status) and the header no longer carries Previous / Next or a motion toggle.
export const WEB_RENDERER_VERSION = 'visual-art-direction.17';
export const contentHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function compileWebScenes(document,plan){
 assertDesignPlan(document,plan);
 return plan.scenes.map((s,index)=>{
  const direction=sceneDirection(document,plan,index),theme=direction.theme;
  // CINE-002: where a citation is drawn (strip, composition, or as the page's subject); absent when the page declares no mode.
  const refs=s.references?sceneReferences(document,plan,s):null,reference=id=>!refs||document.blocks.find(b=>b.id===id).type!=='citation'?{}:refs.subject?{reference:'subject'}:refs.mode==='expanded'?{reference:'expanded'}:refs.strip.some(v=>v.blockId===id)?{reference:'compact'}:{};
  // CINE-004: the role of each image and diagram, present only when the page declares media roles (legacy markup unchanged).
  const roles=s.media?mediaRoles(document,s):null,mediaRole=id=>roles?.has(id)?{mediaRole:roles.get(id)}:{};
  // CINE-005: an image another slot of this page points at as its locator carries the detail's block id and rect.
  const locator=id=>{const owner=s.imageSlots?.find(slot=>slot.brief.detailLocator?.blockId===id);return owner?{locator:{forBlockId:owner.blockId,region:{...owner.brief.detailLocator.region}}}:{};};
  const regions=compositionOrder(document,visibleScene(s)).map(id=>({id:`r${contentHash(s.id+'|'+id).slice(0,20)}`,blockId:id,component:document.blocks.find(b=>b.id===id).type,...reference(id),...mediaRole(id),...locator(id),textRole:({heading:'display',citation:'caption',code:'code',chart:'data',metric:'data',image:'image'})[document.blocks.find(b=>b.id===id).type]||'body',...(document.blocks.find(b=>b.id===id).type==='chart'?{datasetId:document.blocks.find(b=>b.id===id).datasetId}:{}),...(s.imageSlots?.find(slot=>slot.blockId===id)?{imageSlot:s.imageSlots.find(slot=>slot.blockId===id)}:{}),...(s.crops?.find(c=>c.blockId===id)?{crop:s.crops.find(c=>c.blockId===id)}:{})}));
  // The stage hero without an image keeps one large object: a drawn orb in the secondary colour, in the media area, never under body text.
  const graphics=s.graphics||(s.composition==='diagonal-cover'?[{id:'plane',path:'M1130 0H1440V810H845Z',fill:'secondary',rotation:0},{id:'flag',path:'M1080 0H1220L1165 155H1025Z',fill:'accent',rotation:0}]:s.composition==='stage-hero'&&!s.blockIds.some(id=>['image','metric','chart','diagram','table'].includes(document.blocks.find(b=>b.id===id).type))?[{id:'orb',path:'M890 405C890 261 1006 145 1150 145C1294 145 1410 261 1410 405C1410 549 1294 665 1150 665C1006 665 890 549 890 405Z',fill:'secondary',rotation:0}]:[]);
  return assertWebScene({format:'deckweft-web-scene',version:1,id:s.id,theme:s.theme,themeVersion:s.themeVersion,composition:s.composition,focalBlockId:s.focalBlockId,regions,readingOrder:regions.map(r=>r.id),groups:[{id:'content',regionIds:regions.map(r=>r.id)}],variants:[{mode:'reading',layout:'stack',readingOrder:regions.map(r=>r.id)},{mode:'presentation',layout:'composition',readingOrder:regions.map(r=>r.id)}],graphics,...(s.interactions?{interactions:s.interactions}:{}),...(s.cues?{cues:s.cues}:{}),...(s.motion?{motion:s.motion}:{}),...(s.takeaway?{takeaway:s.takeaway}:{}),...(s.contentStatus?{contentStatus:s.contentStatus}:{}),...(s.keyStates?{keyStates:s.keyStates}:{}),...(s.staticState?{staticState:s.staticState}:{}),gradients:s.gradients||[],breakpoints:{readingMaxWidth:700,presentationWidth:1440},sourceHash:contentHash({document,scene:s,theme,renderer:WEB_RENDERER_VERSION})},document);
 });
}
