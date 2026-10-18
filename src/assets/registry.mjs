import {crc32} from '../render/zip.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mkdir,readFile,lstat} from 'node:fs/promises';
import {atomicWrite,rejectSymlinks} from '../services/io.mjs';
import {DeckError} from '../core/errors.mjs';
export const assetHash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function inspectPNG(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<33||bytes.length>4_000_000||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')throw new DeckError('ASSET_TYPE','Use a local PNG smaller than 4 MB.',422);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(!width||!height||width>8192||height>8192||width*height>24_000_000)throw new DeckError('ASSET_DIMENSIONS','Use PNG dimensions up to 8192 and 24 million pixels.',422);
 let offset=8,idat=false,ended=false,header=false;
 while(offset<bytes.length){
  if(offset+12>bytes.length)throw new DeckError('ASSET_TYPE','PNG is truncated. Restore the original image.',422);
  const length=bytes.readUInt32BE(offset),end=offset+12+length,type=bytes.toString('ascii',offset+4,offset+8);
  if(end>bytes.length||length>4_000_000||crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))throw new DeckError('ASSET_TYPE','PNG chunk integrity failed. Restore the original image.',422);
  if(['acTL','fcTL','fdAT'].includes(type))throw new DeckError('ASSET_TYPE','Use a static PNG; animated PNG bypasses playback preferences.',422);
  if(type==='IHDR'){if(header||offset!==8||length!==13)throw new DeckError('ASSET_TYPE','Invalid PNG header.',422);header=true;}
  if(type==='IDAT')idat=true;
  if(type==='IEND'){if(length!==0||end!==bytes.length)throw new DeckError('ASSET_TYPE','Invalid PNG ending.',422);ended=true;}
  offset=end;
 }
 if(!header||!idat||!ended)throw new DeckError('ASSET_TYPE','PNG lacks required image chunks.',422);
 return {width,height};
}
export async function registerAsset(home,bytes,metadata){
 const dimensions=inspectPNG(bytes),hash=assetHash(bytes);
 for(const key of ['provenance','license','allowedUse','alt','fallback'])if(typeof metadata?.[key]!=='string'||!metadata[key].trim()||[...metadata[key]].length>({provenance:2000,license:500,allowedUse:500,alt:1000,fallback:1000}[key]))throw new DeckError('ASSET_METADATA','Supply provenance, rights, allowed use, alt text and a text fallback.',422);
 const record={id:'asset_'+hash.slice(0,24),hash,mime:'image/png',...dimensions,path:`assets/${hash}.png`,...Object.fromEntries(['provenance','license','allowedUse','alt','fallback'].map(k=>[k,metadata[k]]))};
 const file=path.join(home,record.path);await rejectSymlinks(file);await mkdir(path.dirname(file),{recursive:true,mode:0o700});await atomicWrite(file,bytes);return record;
}
export async function assetResources(project,home){
 const resources=Object.create(null);if(!home)return resources;let bytesTotal=0,pixelsTotal=0,projectedBytes=0;
 for(const a of project.assets||[]){
  const uses=project.slides.filter(s=>s.intent?.assetIds.includes(a.id)).length;if(!uses)continue;
  const file=path.join(home,a.path);await rejectSymlinks(file);
  let bytes;try{const stat=await lstat(file);if(!stat.isFile()||stat.size>4_000_000)throw new DeckError('ASSET_SIZE','Use a PNG file smaller than 4 MB.',413);bytes=await readFile(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  const dimensions=inspectPNG(bytes);if(assetHash(bytes)!==a.hash||dimensions.width!==a.width||dimensions.height!==a.height)throw new DeckError('ASSET_HASH','An asset changed. Restore the hash-matching file or replace its reference.',422);
  bytesTotal+=bytes.length;pixelsTotal+=a.width*a.height;projectedBytes+=bytes.length*(uses+1);if(bytesTotal>16_000_000||pixelsTotal>48_000_000||projectedBytes>24_000_000)throw new DeckError('ASSET_BUDGET','Split this deck or use smaller images. The local preview asset budget was exceeded.',413);
  resources[a.id]={width:a.width,height:a.height,mime:a.mime,extension:'png',dataURL:'data:image/png;base64,'+bytes.toString('base64')};
 }
 return resources;
}
