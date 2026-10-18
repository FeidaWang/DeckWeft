import path from 'node:path';
import {readFile,lstat} from 'node:fs/promises';
import {assetHash,inspectPNG} from './registry.mjs';
import {readImageBlob} from './import.mjs';
import {writeImmutable,rejectSymlinks} from '../services/io.mjs';
import {DeckError} from '../core/errors.mjs';
export async function copySourceAsset(asset,fromHome,toHome){
 if(!asset||asset.path!==`assets/${asset.hash}.png`||!/^[a-f0-9]{64}$/.test(asset.hash))throw new DeckError('ASSET_PATH','Choose a registered source image.',422);
 const file=path.join(fromHome,asset.path);await rejectSymlinks(file);let stat;try{stat=await lstat(file);}catch(e){if(e.code==='ENOENT')throw new DeckError('ASSET_MISSING','Restore the hash-matching image in the source document before extraction.',422);throw e;}if(!stat.isFile()||stat.size>4_000_000)throw new DeckError('ASSET_SIZE','Source native image exceeds the file budget.',413);const bytes=await readFile(file),dim=inspectPNG(bytes);if(assetHash(bytes)!==asset.hash||dim.width!==asset.width||dim.height!==asset.height)throw new DeckError('ASSET_HASH','The source image changed; extraction stopped.',422);
 const blobs=[];let total=bytes.length;for(const b of [asset.original,...asset.derivatives||[]].filter(Boolean)){const data=await readImageBlob(fromHome,b);total+=data.length;if(total>16_000_000)throw new DeckError('ASSET_BUDGET','Source extraction exceeds 16 MB.',413);blobs.push([b.path,data]);}
 await writeImmutable(path.join(toHome,asset.path),bytes);for(const [file,data]of blobs)await writeImmutable(path.join(toHome,file),data);
 return structuredClone(asset);
}
