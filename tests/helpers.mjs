import {mkdtemp,rm,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {crc32} from '../src/render/zip.mjs';
export async function temp(t){const dir=await mkdtemp(path.join(os.tmpdir(),'deckweft-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return await realpath(dir);}
export function unzip(buffer){
  const files=new Map();let offset=0;
  while(buffer.readUInt32LE(offset)===0x04034b50){
    const crc=buffer.readUInt32LE(offset+14),size=buffer.readUInt32LE(offset+18),n=buffer.readUInt16LE(offset+26),extra=buffer.readUInt16LE(offset+28),start=offset+30+n+extra;
    const name=buffer.subarray(offset+30,offset+30+n).toString(),bytes=inflateRawSync(buffer.subarray(start,start+size));
    if(crc32(bytes)!==crc)throw Error('CRC mismatch');files.set(name,bytes);offset=start+size;
  }
  return files;
}
