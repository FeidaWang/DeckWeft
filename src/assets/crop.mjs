import { DeckError } from '../core/errors.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function assertRect(r){if(!r||!['x','y','width','height'].every(k=>finite(r[k]))||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1.000001||r.y+r.height>1.000001)throw new DeckError('SAFE_REGION','Use a positive normalized rectangle inside the original image.',422);return r;}
export function contains(c,r){return r.x>=c.x-1e-7&&r.y>=c.y-1e-7&&r.x+r.width<=c.x+c.width+1e-7&&r.y+r.height<=c.y+c.height+1e-7;}
/** Deterministic geometry only. Protected regions are author supplied, never inferred subjects. */
export function safeCrop(asset,{aspect,focalPoint={x:.5,y:.5},safeRegion={x:0,y:0,width:1,height:1}}){
 assertRect(safeRegion);if(!finite(aspect)||aspect<.1||aspect>10||!['x','y'].every(k=>finite(focalPoint[k])&&focalPoint[k]>=0&&focalPoint[k]<=1))throw new DeckError('CROP_INPUT','Use an aspect from 0.1 to 10 and a focal point inside the image.',422);
 const ratio=asset.width/asset.height;let width=1,height=1;if(ratio>aspect)width=aspect/ratio;else height=ratio/aspect;
 if(width+1e-7<safeRegion.width||height+1e-7<safeRegion.height)return {ok:false,code:'PROTECTED_REGION',reason:'The protected subject cannot fit this crop. Use contain to retain the whole image.',mode:'contain',crop:{x:0,y:0,width:1,height:1},aspect};
 const place=(focal,size,start,length)=>Math.max(Math.max(0,start+length-size),Math.min(Math.min(start,1-size),focal-size/2));
 const crop={x:place(focalPoint.x,width,safeRegion.x,safeRegion.width),y:place(focalPoint.y,height,safeRegion.y,safeRegion.height),width,height};
 return {ok:true,mode:'cover',crop,aspect};
}
export function cropVariants(asset,brief){return [{id:'portrait',aspect:3/4},{id:'square',aspect:1},{id:'wide',aspect:16/9}].map(v=>({...v,...safeCrop(asset,{...brief,aspect:v.aspect})}));}
