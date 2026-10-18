import {componentCapabilities} from '../components/capabilities.mjs';
import {inspectImage} from '../assets/formats.mjs';
import { DeckError } from '../core/errors.mjs';
import { assetHash } from '../assets/registry.mjs';
export function presentationCapabilities(target,document,resources={}){
 const issues=[];
 if(!['html','json'].includes(target))issues.push({code:'TARGET_UNIMPLEMENTED',message:`Version 3 ${target} export has no native compiler yet.`});
 if(target==='html')for(const b of document.blocks.filter(b=>b.type==='image')){
  const r=resources[b.assetId];
  try{
   if(!r||!r.dataURL?.startsWith('data:'+r.mime+';base64,')||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(r.dataURL)||r.dataURL.length>5_400_000)throw Error();
   const bytes=Buffer.from(r.dataURL.split(',')[1],'base64'),dim=inspectImage(bytes,r.mime);
   if(dim.width!==r.width||dim.height!==r.height||(r.hash&&r.hash!==assetHash(bytes)))throw Error();
  }catch{issues.push({code:'ASSET_UNRESOLVED',blockId:b.id,message:'Restore the hash-matching local image or replace this image. No remote asset fallback is used.'});}
 }
 return {target,ok:issues.length===0,issues,components:document.blocks.map(b=>componentCapabilities(b,target))};
}
export function assertPresentationTarget(target,document,resources={}){
 const result=presentationCapabilities(target,document,resources);
 if(!result.ok)throw new DeckError('TARGET_CAPABILITY','This target cannot represent the requested presentation yet.',422,result.issues);
 return result;
}
