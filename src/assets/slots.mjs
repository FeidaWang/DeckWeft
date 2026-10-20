import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {defaultBrief,assertAssetBrief,assertAssetSuitability} from './brief.mjs';
import {safeCrop,cropVariants,isEvidenceBrief} from './crop.mjs';
import {identifier} from '../core/model.mjs';
import {DeckError} from '../core/errors.mjs';
function target(project,sceneId,blockId){const scene=project.plan.scenes.find(s=>s.id===sceneId),block=project.document.blocks.find(b=>b.id===blockId&&b.type==='image');if(!scene||!block||!scene.blockIds.includes(blockId))throw new DeckError('IMAGE_SLOT','Choose an image block bound to this scene.',422);return {scene,block};}
function writable(p,scene,blockId){const locks=p.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===scene.id)?.fields||[];if(p.document.authorOverrides.lockedBlockIds.includes(blockId)||locks.includes('imageSlots')||locks.includes('crops'))throw new DeckError('AUTHOR_LOCK','Unlock this image or its scene crop/slot decisions explicitly before editing.',409);}
export function slotFor(project,sceneId,blockId){const {scene,block}=target(project,sceneId,blockId),asset=project.assets.find(a=>a.id===block.assetId),existing=scene.imageSlots?.find(s=>s.blockId===blockId);if(existing)return structuredClone(existing);const crop=scene.crops?.find(c=>c.blockId===blockId)||{x:0,y:0,width:1,height:1};const evidence=block.factual===true;return {id:'hero',blockId,brief:{...defaultBrief(),...(evidence?{role:'product-screenshot',factual:true,sourceId:block.sourceIds[0]||''}:{}),requiredWidth:Math.max(1,Math.min(320,Math.floor(asset.width*crop.width))),requiredHeight:Math.max(1,Math.min(240,Math.floor(asset.height*crop.height))),safeRegion:{x:crop.x,y:crop.y,width:crop.width,height:crop.height},focalPoint:{x:crop.x+crop.width/2,y:crop.y+crop.height/2}},display:evidence?'contain':'crop',aspect:asset.width*crop.width/(asset.height*crop.height)};}
export function configureSlot(project,sceneId,blockId,slot){
 const copy=structuredClone(assertVisualProject(project)),{scene,block}=target(copy,sceneId,blockId);writable(copy,scene,blockId);if(slot.blockId!==blockId)throw new DeckError('IMAGE_SLOT','Keep the slot bound to its selected block.',422);assertAssetBrief(slot.brief,copy.document);
 // CINE-005: declaring an image as evidence (a factual product screenshot) means it is shown whole: the slot displays the complete original.
 if(isEvidenceBrief(slot.brief))slot={...slot,display:'contain'};
 const shared=copy.plan.scenes.some(s=>s.id!==sceneId&&s.blockIds.includes(blockId));if(shared&&(slot.brief.factual!==!!block.factual||(slot.brief.sourceId&&!block.sourceIds.includes(slot.brief.sourceId))))throw new DeckError('SHARED_IMAGE','This content block is shared. Replace this slot with a dedicated image before changing its factual classification.',409);
 block.factual=slot.brief.factual;if(slot.brief.sourceId&&!block.sourceIds.includes(slot.brief.sourceId))block.sourceIds.push(slot.brief.sourceId);
 scene.imageSlots=(scene.imageSlots||[]).filter(s=>s.blockId!==blockId);scene.imageSlots.push(structuredClone(slot));
 if(slot.display==='contain'){scene.crops=(scene.crops||[]).filter(c=>c.blockId!==blockId);scene.crops.push({blockId,x:0,y:0,width:1,height:1});}
 assertVisualLocks(project,copy);return assertVisualProject(copy);
}
export function slotCandidates(project,sceneId,blockId){assertVisualProject(project);const slot=slotFor(project,sceneId,blockId),block=project.document.blocks.find(b=>b.id===blockId),asset=project.assets.find(a=>a.id===block.assetId);return {slot,asset,variants:cropVariants(asset,slot.brief).map(v=>{try{if(v.ok)assertAssetSuitability(asset,slot.brief,v.crop);return v;}catch(e){return {...v,ok:false,code:e.code,reason:e.message};}})};}
export function applySlotCrop(project,sceneId,blockId,{mode,aspect}){
 const copy=structuredClone(assertVisualProject(project)),{scene,block}=target(copy,sceneId,blockId);writable(copy,scene,blockId);const slot=slotFor(copy,sceneId,blockId),asset=copy.assets.find(a=>a.id===block.assetId);
 if(!['crop','contain'].includes(mode))throw new DeckError('IMAGE_SLOT','Choose crop or contain explicitly.',422);
 const result=mode==='contain'?{ok:true,crop:{x:0,y:0,width:1,height:1}}:safeCrop(asset,{...slot.brief,aspect});if(!result.ok)throw new DeckError(isEvidenceBrief(slot.brief)?'PROTECTED_REGION':'UNSAFE_CROP',result.reason,422);
 slot.display=mode;slot.aspect=aspect;scene.imageSlots=(scene.imageSlots||[]).filter(s=>s.blockId!==blockId);scene.imageSlots.push(slot);scene.crops=(scene.crops||[]).filter(c=>c.blockId!==blockId);scene.crops.push({blockId,...result.crop});assertVisualLocks(project,copy);return assertVisualProject(copy);
}
export function attachSlotAsset(project,sceneId,blockId,asset,{sourceReference}={}){
 const copy=structuredClone(assertVisualProject(project)),{scene,block}=target(copy,sceneId,blockId);writable(copy,scene,blockId);
 if(!asset)throw new DeckError('ASSET_SELECTION','Choose a registered asset.',422);const known=copy.assets.find(a=>a.id===asset.id);if(known&&JSON.stringify(known)!==JSON.stringify(asset))throw new DeckError('ASSET_METADATA_CONFLICT','This hash already has different source or rights metadata. Resolve it explicitly instead of replacing attribution.',409);if(!known)copy.assets.push(structuredClone(asset));
 let slot=slotFor(copy,sceneId,blockId),destination=block;
 if(copy.plan.scenes.some(s=>s.id!==sceneId&&s.blockIds.includes(blockId))){const fields=copy.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===sceneId)?.fields||[];if(fields.includes('blockIds'))throw new DeckError('AUTHOR_LOCK','Unlock shared block bindings before creating a dedicated slot.',409);destination={...structuredClone(block),id:identifier('image')};copy.document.blocks.push(destination);scene.blockIds=scene.blockIds.map(id=>id===blockId?destination.id:id);if(scene.focalBlockId===blockId)scene.focalBlockId=destination.id;for(const c of scene.crops||[])if(c.blockId===blockId)c.blockId=destination.id;for(const s of scene.imageSlots||[])if(s.blockId===blockId)s.blockId=destination.id;slot.blockId=destination.id;}
 destination.assetId=asset.id;destination.alt=asset.alt;destination.factual=slot.brief.factual;
 if(slot.brief.sourceId&&!destination.sourceIds.includes(slot.brief.sourceId))destination.sourceIds.push(slot.brief.sourceId);
 scene.imageSlots=(scene.imageSlots||[]).filter(s=>s.blockId!==destination.id);scene.imageSlots.push(slot);
 copy.extensions.deckweftAssetSelections=[...(copy.extensions.deckweftAssetSelections||[]).slice(-99),{sceneId,slotId:slot.id,blockId:destination.id,assetId:asset.id,assetHash:asset.hash,...(sourceReference?{sourceReference}:{})}];assertVisualLocks(project,copy);return assertVisualProject(copy);
}
export function addSlotAsset(project,sceneId,asset){
 const base=assertVisualProject(project),copy=structuredClone(base),scene=copy.plan.scenes.find(s=>s.id===sceneId);if(!scene)throw new DeckError('IMAGE_SLOT','Select a scene.',422);const fields=copy.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===sceneId)?.fields||[];if(fields.some(f=>['blockIds','crops','imageSlots'].includes(f)))throw new DeckError('AUTHOR_LOCK','Unlock this scene’s image bindings before adding a slot.',409);
 if(!asset)throw new DeckError('ASSET_SELECTION','Choose a registered asset.',422);const known=copy.assets.find(a=>a.id===asset.id);if(known&&JSON.stringify(known)!==JSON.stringify(asset))throw new DeckError('ASSET_METADATA_CONFLICT','Resolve conflicting source or rights metadata explicitly.',409);if(!known)copy.assets.push(structuredClone(asset));
 const block={id:identifier('image'),type:'image',assetId:asset.id,sourceIds:[],alt:asset.alt,factual:false};copy.document.blocks.push(block);scene.blockIds.push(block.id);const slot=slotFor(copy,sceneId,block.id);slot.id='image_'+block.id.slice(-12);scene.imageSlots=[...scene.imageSlots||[],slot];assertVisualLocks(base,copy);return assertVisualProject(copy);
}
