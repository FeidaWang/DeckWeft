import path from 'node:path';
import {readFile,lstat} from 'node:fs/promises';
import {assetHash,registerAsset} from './registry.mjs';
import {inspectImage,imageExtensions,orientedDimensions} from './formats.mjs';
import {rejectSymlinks,writeImmutable} from '../services/io.mjs';
import {DeckError} from '../core/errors.mjs';
export async function uploadImageBlob(home,bytes,mime){const dim=inspectImage(bytes,mime),hash=assetHash(bytes),record={hash,mime,...dim,path:`asset-originals/${hash}.${imageExtensions[mime]}`};await writeImmutable(path.join(home,record.path),bytes);return record;}
export async function readImageBlob(home,record){
 if(!record||!Object.hasOwn(imageExtensions,record.mime)||!/^[a-f0-9]{64}$/.test(record.hash)||record.path!==`asset-originals/${record.hash}.${imageExtensions[record.mime]}`)throw new DeckError('ASSET_PATH','Use the original content-addressed local file.',422);
 const file=path.join(home,record.path);await rejectSymlinks(file);let stat;try{stat=await lstat(file);}catch(e){if(e.code==='ENOENT')throw new DeckError('ASSET_MISSING','Restore the hash-matching local original or derivative file before continuing.',422);throw e;}if(!stat.isFile()||stat.size>4_000_000)throw new DeckError('ASSET_SIZE','The original image exceeds the file budget.',413);const bytes=await readFile(file),dim=inspectImage(bytes,record.mime);
 if(assetHash(bytes)!==record.hash||['width','height','orientation'].some(k=>dim[k]!==record[k]))throw new DeckError('ASSET_HASH','Original or derivative bytes changed. Restore the hash-matching file.',422);return bytes;
}
export async function registerVisualImport(home,{original,native,web,metadata,origin}){
 if(!['original','generated','unknown'].includes(origin))throw new DeckError('ASSET_ORIGIN','Declare original, generated or unknown image origin.',422);
 await readImageBlob(home,original);const png=await readImageBlob(home,native),dimensions=orientedDimensions(original);
 if(native.mime!=='image/png'||native.width!==dimensions.width||native.height!==dimensions.height)throw new DeckError('ASSET_DERIVATIVE','The native PNG must retain all oriented source pixels without resizing.',422);
 if(web){await readImageBlob(home,web);if(!['image/jpeg','image/webp'].includes(web.mime)||web.orientation!==1||web.width!==native.width||web.height!==native.height)throw new DeckError('ASSET_DERIVATIVE','Web derivatives must preserve the full native canvas dimensions.',422);}
 const asset=await registerAsset(home,png,metadata);return {...asset,origin,original:structuredClone(original),derivatives:web?[{...structuredClone(web),sourceHash:original.hash,method:'browser-canvas',lossy:true}]:[]};
}
