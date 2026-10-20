/**
 * CINE-004 (2026-10-20): the role of each image and diagram on a page. A hero is the primary media area, a mechanism is a
 * diagram the page explains, context sets the scene and a supporting image (a locator, a detail beside a hero) stays small.
 * Authored entries win; the defaults read the composition. Roles never change assets, crops, alt text or sources.
 */
import {DeckError} from '../core/errors.mjs';
import {compositions} from './compositions.mjs';
export const MEDIA_ROLES=Object.freeze(['hero','mechanism','context','supporting']);
/** Compositions whose first image is the hero by default. */
const HERO_FIRST=new Set(['photo-split','stage-hero','fieldnotes-figure','atlas-cover']);
const MEDIA_TYPES=new Set(['image','diagram']);
/** Map of block id → role for the images and diagrams of a scene. */
export function mediaRoles(document,scene){
 const blocks=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)).filter(b=>b&&MEDIA_TYPES.has(b.type)),family=compositions.find(c=>c.id===scene.composition)?.family;
 const images=blocks.filter(b=>b.type==='image'),roles=new Map();
 for(const b of blocks){
  if(b.type==='diagram'){roles.set(b.id,'mechanism');continue;}
  const first=images[0]===b,hero=family==='before-after'||(first&&(family==='image'||HERO_FIRST.has(scene.composition)));
  roles.set(b.id,hero?'hero':'supporting');
 }
 for(const m of scene.media||[])if(roles.has(m.blockId))roles.set(m.blockId,m.role);
 return roles;
}
/** The contract: every authored entry names an image or diagram of this page, once, with a known role. */
export function assertMedia(document,scene){
 const fail=message=>{throw new DeckError('INVALID_DESIGN_PLAN',message,422);};
 if(scene.media===undefined)return scene;
 if(!Array.isArray(scene.media)||scene.media.length>20)fail('Declare at most twenty media roles per page.');
 const seen=new Set();
 for(const m of scene.media){
  if(!m||typeof m!=='object'||!MEDIA_ROLES.includes(m.role))fail(`Choose a media role: ${MEDIA_ROLES.join(', ')}.`);
  const b=scene.blockIds.includes(m.blockId)?document.blocks.find(b=>b.id===m.blockId):null;
  if(!b||!MEDIA_TYPES.has(b.type))fail(`A media role names an image or diagram of this page; ${m.blockId} is not one.`);
  if(seen.has(m.blockId))fail(`Give ${m.blockId} one media role.`);seen.add(m.blockId);
 }
 return scene;
}
/**
 * How much of a page an image's subject takes (CINE-004, spec §1.4): the container fraction is the image box over the page
 * and the subject fraction multiplies it by the protected (safe) region's share of the image. Without a subject annotation
 * the subject is the whole image and the report says so; a bounding-box proxy is never called eye tracking.
 */
export function subjectFraction({pageWidth,pageHeight,imageBox,safeRegion=null}={}){
 if(!(pageWidth>0&&pageHeight>0))throw new DeckError('MEDIA_MEASURE','Give the page width and height in px.',422);
 if(!imageBox||!(imageBox.width>=0&&imageBox.height>=0))throw new DeckError('MEDIA_MEASURE','Give the measured image box.',422);
 const clamp=v=>Math.min(1,Math.max(0,v));
 const containerFraction=clamp((imageBox.width*imageBox.height)/(pageWidth*pageHeight));
 const r=safeRegion&&['x','y','width','height'].every(k=>Number.isFinite(safeRegion[k]))?{x:clamp(safeRegion.x),y:clamp(safeRegion.y),width:clamp(safeRegion.width),height:clamp(safeRegion.height)}:null;
 const annotated=!!r&&!(r.x===0&&r.y===0&&r.width===1&&r.height===1);
 const share=annotated?clamp(Math.min(r.width,1-r.x))*clamp(Math.min(r.height,1-r.y)):1;
 return {containerFraction,subjectFraction:annotated?containerFraction*share:containerFraction,annotated,...(annotated?{}:{note:'no subject annotation'})};
}
