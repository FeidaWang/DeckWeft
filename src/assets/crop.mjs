import { DeckError } from '../core/errors.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const FULL=Object.freeze({x:0,y:0,width:1,height:1});
export function assertRect(r){if(!r||!['x','y','width','height'].every(k=>finite(r[k]))||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1.000001||r.y+r.height>1.000001)throw new DeckError('SAFE_REGION','Use a positive normalized rectangle inside the original image.',422);return r;}
export function contains(c,r){return r.x>=c.x-1e-7&&r.y>=c.y-1e-7&&r.x+r.width<=c.x+c.width+1e-7&&r.y+r.height<=c.y+c.height+1e-7;}
/** The bounding rectangle of several normalized rectangles. */
const tidy=v=>Math.round(v*1e12)/1e12;
export function union(rects){const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));return {x:tidy(x),y:tidy(y),width:tidy(Math.max(...rects.map(r=>r.x+r.width))-x),height:tidy(Math.max(...rects.map(r=>r.y+r.height))-y)};}
/** CINE-005: the crop floor is the safe region together with every authored protected region; the ceiling is the context region (absent = the whole image). */
export const cropFloor=brief=>union([brief.safeRegion||FULL,...(brief.protectedRegions||[])]);
export const cropCeiling=brief=>brief.contextRegion?{...brief.contextRegion}:{...FULL};
/** An evidence screenshot (a factual product screenshot) is shown whole: no crop may change what it shows. */
export const isEvidenceBrief=brief=>brief?.role==='product-screenshot'&&brief?.factual===true;
/** Deterministic geometry only. Protected regions are author supplied, never inferred subjects. */
export function safeCrop(asset,{aspect,focalPoint={x:.5,y:.5},safeRegion={x:0,y:0,width:1,height:1},protectedRegions=[],contextRegion=null,role,factual}){
 assertRect(safeRegion);for(const r of protectedRegions)assertRect(r);if(contextRegion)assertRect(contextRegion);
 if(!finite(aspect)||aspect<.1||aspect>10||!['x','y'].every(k=>finite(focalPoint[k])&&focalPoint[k]>=0&&focalPoint[k]<=1))throw new DeckError('CROP_INPUT','Use an aspect from 0.1 to 10 and a focal point inside the image.',422);
 if(isEvidenceBrief({role,factual}))return {ok:false,code:'PROTECTED_REGION',reason:'Evidence screenshots are shown whole. Use contain to retain the complete original.',mode:'contain',crop:{...FULL},aspect};
 const floor=cropFloor({safeRegion,protectedRegions}),ceiling=cropCeiling({contextRegion});
 // The largest crop of the asked pixel aspect inside the ceiling: normalized width w and height h with (asset.width·w)/(asset.height·h) = aspect.
 const ratio=asset.width/asset.height;let width=ceiling.width,height=width*ratio/aspect;if(height>ceiling.height){height=ceiling.height;width=height*aspect/ratio;}
 if(width+1e-7<floor.width||height+1e-7<floor.height)return {ok:false,code:'PROTECTED_REGION',reason:'The protected subject cannot fit this crop. Use contain to retain the whole image.',mode:'contain',crop:{...FULL},aspect};
 const place=(focal,size,start,length,lo,hi)=>Math.max(Math.max(lo,start+length-size),Math.min(Math.min(start,hi-size),focal-size/2));
 const crop={x:place(focalPoint.x,width,floor.x,floor.width,ceiling.x,ceiling.x+ceiling.width),y:place(focalPoint.y,height,floor.y,floor.height,ceiling.y,ceiling.y+ceiling.height),width,height};
 return {ok:true,mode:'cover',crop,aspect};
}
export function cropVariants(asset,brief){return [{id:'portrait',aspect:3/4},{id:'square',aspect:1},{id:'wide',aspect:16/9}].map(v=>({...v,...safeCrop(asset,{...brief,aspect:v.aspect})}));}
