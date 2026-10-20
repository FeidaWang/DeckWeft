/**
 * CINE-003 (2026-10-20): the visual intent of a page — what it is for (its purpose) and where the eye enters (left, centre or
 * a composition-specific contextual point). The primary object is the existing `focalBlockId`; the optional focus group names
 * the blocks that belong with it and `emptyRegions` reports deliberate space (batch 1 only reports it). An authored intent
 * wins; without one `inferIntent` reads the page's content and composition. Intent never changes text, data or sources.
 */
import {DeckError} from '../core/errors.mjs';
import {compositions,inferFamily} from './compositions.mjs';
export const VISUAL_PURPOSES=Object.freeze(['explain','show-product','show-detail','compare','evidence','overview','chapter']);
export const ENTRIES=Object.freeze(['left','center','contextual']);
/** Compositions whose entry is the centre of the page. */
export const CENTERED_COMPOSITIONS=Object.freeze(['statement-center','quote-center','closing-focus','small-multiples-center','stage-chapter','violet-chapter','diagonal-cover']);
/** Compositions whose entry is a point of their own (a low headline, a number band, a stage, a stair, a cover). */
export const CONTEXTUAL_COMPOSITIONS=Object.freeze(['chapter-low','chapter-index','chapter-margin','metric-band','stage-hero','process-stair','comparison-stack','atlas-cover','fieldnotes-cover']);
const TEXT_TYPES=new Set(['paragraph','callout','quote','list']);
const familyOf=(document,scene)=>compositions.find(c=>c.id===scene.composition)?.family||inferFamily(document,scene);
/** The purpose and entry a page implies by its content, composition and place in the deck. */
export function inferIntent(document,scene,index,total){
 const blocks=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)).filter(Boolean),has=type=>blocks.some(b=>b.type===type),family=familyOf(document,scene);
 const entry=CENTERED_COMPOSITIONS.includes(scene.composition)?'center':CONTEXTUAL_COMPOSITIONS.includes(scene.composition)?'contextual':'left';
 let purpose='explain';
 if(family==='chapter'||family==='closing'||index===0||index===total-1)purpose='chapter';
 else if(has('table')||family==='before-after')purpose='compare';
 else if(has('chart'))purpose='evidence';
 else if(family==='system-map')purpose='overview';
 else if(has('diagram')||family==='process')purpose='explain';
 else if(has('image'))purpose=blocks.filter(b=>TEXT_TYPES.has(b.type)).length<=1?'show-product':'explain';
 else if(has('metric'))purpose='evidence';
 return {purpose,entry,inferred:true};
}
/** The intent in force for the page at `index`: the author's, else the inferred one. */
export function effectiveIntent(document,plan,index){
 const scene=plan.scenes[index];
 return scene.intent?{purpose:scene.intent.purpose,entry:scene.intent.entry,inferred:false}:inferIntent(document,scene,index,plan.scenes.length);
}
const PREFERRED={
 explain:{process:'process-rail','system-map':'system-map-rail',evidence:'evidence-left',statement:'statement-split',image:'image-left'},
 'show-product':{image:'image-right',metric:'metric-right',statement:'statement-split'},
 'show-detail':{image:'image-left','before-after':'before-after-split'},
 compare:{comparison:'comparison-matrix','before-after':'before-after-split','small-multiples':'small-multiples-row'},
 evidence:{evidence:'evidence-left','small-multiples':'small-multiples-row',metric:'metric-left'},
 overview:{'system-map':'system-map-wide',process:'process-line'},
 chapter:{chapter:'chapter-low',statement:'statement-center',closing:'closing-focus',quote:'quote-center'}
};
/** The variant a purpose prefers within a family, or null when the family has no preference for that purpose. */
export function preferredVariant(intent,family){return PREFERRED[intent?.purpose]?.[family]??null;}
/** The contract beyond the schema: the focus group is a subset of the page that holds the focal block, a citation cannot be the
 * focal block once an intent is declared, and every empty region is a normalized rectangle inside the unit square. */
export function assertIntent(document,scene){
 const fail=message=>{throw new DeckError('INVALID_DESIGN_PLAN',message,422);},it=scene.intent;
 if(it===undefined)return scene;
 if(!it||typeof it!=='object'||!VISUAL_PURPOSES.includes(it.purpose)||!ENTRIES.includes(it.entry))fail(`Choose a visual purpose (${VISUAL_PURPOSES.join(', ')}) and an entry (${ENTRIES.join(', ')}).`);
 const focal=document.blocks.find(b=>b.id===scene.focalBlockId);
 if(focal?.type==='citation')fail('A citation cannot be the focal block of a page with a declared intent; make the claim, the image or the figure the focal block.');
 if(it.focusGroupBlockIds){
  if(!Array.isArray(it.focusGroupBlockIds)||it.focusGroupBlockIds.length>6||it.focusGroupBlockIds.some(id=>!scene.blockIds.includes(id)))fail('The focus group lists at most six blocks of this page.');
  if(!it.focusGroupBlockIds.includes(scene.focalBlockId))fail('The focus group must contain the focal block.');
 }
 if(it.emptyRegions){
  if(!Array.isArray(it.emptyRegions)||it.emptyRegions.length>4)fail('Report at most four empty regions.');
  for(const r of it.emptyRegions){const n=v=>typeof v==='number'&&v>=0&&v<=1;if(!r||!n(r.x)||!n(r.y)||!n(r.width)||!n(r.height)||r.x+r.width>1.000001||r.y+r.height>1.000001)fail('An empty region is a rectangle normalized to the page frame, inside the unit square.');}
 }
 return scene;
}
