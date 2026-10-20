/**
 * F1 (2026-10-19): paging a measured scene that is taller than the slide. The compiler fits a whole scene to the slide with one
 * uniform scale, so a tall page becomes tiny text that passes every structural check. Here a scene whose text would fall below
 * the typography minimums is cut into horizontal bands at lines no element crosses; each band becomes one slide at a scale that
 * meets the minimums, with the heading repeated on continuation slides. Nothing is shrunk, removed or rasterized. A scene whose
 * text is already too small at the width fit cannot be helped by paging and is left whole (the typography result names it).
 */
import {SLIDE} from './ooxml.mjs';
import {TYPOGRAPHY_MINIMUM_PT} from '../capabilities.mjs';
import {clipPath} from './compile.mjs';
const EMU_PER_PT=12700;
const ANNOTATION=new Set(['citation','chart','table','diagram','image']);
/** The typography role of a text run by the block it belongs to: the slide title, an annotation, or body text. */
export const textRoleOf=(blockType,{title=false}={})=>title?'title':ANNOTATION.has(blockType)?'annotation':'body';
const centre=b=>b.y+b.height/2;
/** Every measured element of a scene with its box and, for text, its font size in page pixels. Decor is background and is clipped per band instead. */
export function sceneElements(m){
 const out=[];
 for(const r of m.regions){
  for(const t of r.texts)out.push({box:t.box,fontSize:t.style.fontSize,blockId:r.blockId,kind:'text'});
  for(const b of r.boxes)out.push({box:b.box,blockId:r.blockId,kind:'box'});
  for(const s of r.shapes)out.push({box:s.box,blockId:r.blockId,kind:'shape'});
  if(r.image)out.push({box:r.image.box,blockId:r.blockId,kind:'image'});
  for(const t of r.tables||[])out.push({box:t.box,blockId:r.blockId,kind:'table'});
  if(r.plot)out.push({box:r.plot.box,blockId:r.blockId,kind:'plot'});
  if(r.diagram){out.push({box:r.diagram.box,blockId:r.blockId,kind:'diagram'});const s=r.diagram.scale||1;for(const n of r.diagram.nodes||[]){for(const tx of n.texts||[])out.push({box:tx.box,fontSize:tx.style.fontSize*s,blockId:r.blockId,kind:'diagram-text'});for(const tx of n.number?.texts||[])out.push({box:tx.box,fontSize:tx.style.fontSize*s,blockId:r.blockId,kind:'diagram-number'});}for(const e of r.diagram.edges||[])for(const tx of e.texts||[])out.push({box:tx.box,fontSize:tx.style.fontSize*s,blockId:r.blockId,kind:'diagram-text'});}
 }
 for(const t of m.chrome.texts)out.push({box:t.box,fontSize:t.style.fontSize,kind:'chrome-text',chrome:true});
 for(const b of m.chrome.boxes)out.push({box:b.box,kind:'chrome-box',chrome:true});
 return out.filter(e=>e.box&&Number.isFinite(e.box.y)&&Number.isFinite(e.box.height));
}
/**
 * The bands a scene is cut into, or null when it is left whole. `strip` is the height reserved above a continuation band for the
 * repeated heading. `frame` is the page in output units and `unitsPerPt` the output unit per point: the PowerPoint slide in EMU by
 * default; the PDF passes its 1440 × 810 px page with 4/3 px per point (CINE-001), so both targets cut at the same lines. Returns {bands, reason}: reason is 'fits' (no text below the minimum at the whole-scene fit), 'width-bound'
 * (too small even at the width fit, so paging cannot help), 'trimmed' (one band without trailing empty space) or 'paged'.
 */
export function sceneBands(m,blocks,{titleBlockId=null,strip=0,minimums=TYPOGRAPHY_MINIMUM_PT,frame=SLIDE,unitsPerPt=EMU_PER_PT}={}){
 const els=sceneElements(m),b=m.bounds;
 if(!els.length)return {bands:null,reason:'fits'};
 const need=Math.max(0,...els.filter(e=>e.fontSize>0).map(e=>{const type=blocks.get(e.blockId)?.type;const role=e.chrome?'annotation':textRoleOf(type,{title:e.blockId===titleBlockId&&type==='heading'});return minimums[role]*unitsPerPt/e.fontSize;}));
 const widthScale=frame.width/b.width,fullScale=Math.min(widthScale,frame.height/b.height);
 if(!need||fullScale>=need-1e-9)return {bands:null,reason:'fits'};
 if(widthScale<need)return {bands:null,reason:'width-bound'};
 const H=frame.height/need,top=b.y,bottom=b.y+b.height;
 const firstTop=Math.min(...els.map(e=>e.box.y)),lastEnd=Math.max(...els.map(e=>e.box.y+e.box.height)),pad=Math.max(0,firstTop-top);
 const crosses=c=>els.some(e=>e.box.y<c-0.5&&e.box.y+e.box.height>c+0.5);
 const ends=[...new Set(els.map(e=>Math.round(e.box.y+e.box.height)))].sort((p,q)=>p-q);
 // Bands follow the content: each starts just above the next unplaced element. The cut is the line no element crosses that
 // keeps the remaining bands even, preferring a line between blocks over one inside a block.
 const spansBlock=c=>els.some(e=>e.blockId&&e.box.y+e.box.height<=c+0.5&&els.some(o=>o.blockId===e.blockId&&o.box.y>=c-0.5));
 const bands=[];let cursor=top;
 for(let guard=0;guard<200;guard++){
  const pending=els.filter(e=>e.box.y+e.box.height>cursor+0.5);if(!pending.length)break;
  const start=Math.max(cursor,Math.min(...pending.map(e=>e.box.y))-pad),room=bands.length?H-strip:H,limit=start+room;
  if(lastEnd+pad<=limit+0.5){bands.push({y:start,height:Math.min(bottom,lastEnd+pad)-start});break;}
  const remaining=lastEnd+pad-start,target=start+remaining/Math.ceil(remaining/room);
  const valid=ends.filter(c=>c>start+1&&c<=limit&&!crosses(c)),nearest=list=>list.length?list.reduce((a,c)=>Math.abs(c-target)<Math.abs(a-target)?c:a):null;
  let cut=nearest(valid.filter(c=>!spansBlock(c)))??nearest(valid);
  // An element taller than a band is taken whole; that band stays over the minimum and the typography result says so.
  if(cut===null)cut=ends.find(c=>c>start+1&&!crosses(c))??bottom;
  bands.push({y:start,height:cut-start});cursor=cut;
 }
 if(bands.length>1)return {bands,reason:'paged'};
 if(bands.length===1&&bands[0].height<b.height-1)return {bands,reason:'trimmed'};
 return {bands:null,reason:'fits'};
}
/** The measured layout of one band: the same scene with only the elements whose centre lies in the band, decor clipped to it. */
export function bandLayout(m,band,{strip=0,first=true}={}){
 const y0=band.y-strip,y1=band.y+band.height,inside=e=>!!e&&centre(e.box)>=band.y-0.5&&centre(e.box)<y1+0.5;
 const clipBox=bb=>({x:bb.x,y:Math.max(bb.y,y0),width:bb.width,height:Math.max(0,Math.min(bb.y+bb.height,y1)-Math.max(bb.y,y0))});
 const quad=[[m.bounds.x,y0],[m.bounds.x+m.bounds.width,y0],[m.bounds.x+m.bounds.width,y1],[m.bounds.x,y1]];
 return {...m,bounds:{x:m.bounds.x,y:y0,width:m.bounds.width,height:y1-y0},
  regions:m.regions.map(r=>({...r,texts:r.texts.filter(inside),boxes:r.boxes.filter(inside),shapes:r.shapes.filter(inside),image:inside(r.image)?r.image:undefined,tables:(r.tables||[]).filter(inside),plot:inside(r.plot)?r.plot:undefined,diagram:inside(r.diagram)?r.diagram:undefined,bounds:clipBox(r.bounds),disclosures:first?r.disclosures:[],cardTables:first?r.cardTables:false})),
  chrome:{texts:m.chrome.texts.filter(inside),boxes:m.chrome.boxes.filter(inside)},
  disclosures:first?m.disclosures:[],
  decor:m.decor.flatMap(d=>{if(d.unsupported)return first?[d]:[];const bb=d.box;if(!bb||bb.y+bb.height<=y0||bb.y>=y1)return [];if(bb.y>=y0&&bb.y+bb.height<=y1)return [d];const commands=d.clip?clipPath(d.commands,d.clip):d.commands;return [{...d,commands,clip:quad,box:clipBox(bb)}];})};
}
