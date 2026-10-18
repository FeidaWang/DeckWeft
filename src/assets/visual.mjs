import {readImageBlob} from './import.mjs';
import {DeckError} from '../core/errors.mjs';
import { assetResources } from './registry.mjs';
/** Count actual scene bindings so repeated images cannot bypass the export-byte budget. */
export async function visualAssetResources(project,home){
 const blocks=new Map(project.document.blocks.map(b=>[b.id,b]));
 const uses=project.plan.scenes.flatMap(s=>s.blockIds.map(id=>blocks.get(id)).filter(b=>b?.type==='image').map(b=>({intent:{assetIds:[b.assetId]}})));
 const resources=await assetResources({assets:project.assets,slides:uses},home);let sourceBytes=0;
 for(const a of project.assets){if(!resources[a.id]||!a.original)continue;
  sourceBytes+=(await readImageBlob(home,a.original)).length;const derivatives=[];
  for(const d of a.derivatives||[]){const bytes=await readImageBlob(home,d);sourceBytes+=bytes.length;derivatives.push({d,bytes});}
  if(sourceBytes>32_000_000)throw new DeckError('ASSET_BUDGET','Original and derivative resources exceed 32 MB.',413);
  const bindings=project.plan.scenes.flatMap(s=>s.blockIds.filter(id=>blocks.get(id)?.assetId===a.id).map(id=>s.imageSlots?.find(slot=>slot.blockId===id)));
  const chosen=bindings.every(slot=>slot&&slot.brief.role!=='product-screenshot'&&!slot.brief.factual)?derivatives.sort((a,b)=>a.bytes.length-b.bytes.length)[0]:null;
  if(chosen&&chosen.bytes.length<Buffer.from(resources[a.id].dataURL.split(',')[1],'base64').length){const {d,bytes}=chosen;resources[a.id]={width:d.width,height:d.height,mime:d.mime,hash:d.hash,extension:d.mime==='image/jpeg'?'jpg':'webp',dataURL:'data:'+d.mime+';base64,'+bytes.toString('base64')};}
 }
 return resources;
}
