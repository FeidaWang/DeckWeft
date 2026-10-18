import { deflateRawSync } from 'node:zlib';
const CRC_TABLE = Array.from({length:256},(_,n)=>{
  let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; return c>>>0;
});
export function crc32(bytes) {
  let c=0xFFFFFFFF; for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;
}
/** Deterministic ZIP32 writer for application-owned files. Not an archive extractor. */
export function zipFiles(entries) {
  if(entries.length>65535)throw new Error('ZIP32 entry limit exceeded.');
  const names=new Set(), bodies=[], directory=[]; let offset=0;
  for(const [name,contents] of entries){
    if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||names.has(name))throw new Error('Unsafe or duplicate archive path.');
    names.add(name); const filename=Buffer.from(name), raw=Buffer.isBuffer(contents)?contents:Buffer.from(contents);
    const compressed=deflateRawSync(raw), crc=crc32(raw);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(filename.length,26);
    bodies.push(local,filename,compressed);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
    directory.push(central,filename);offset+=local.length+filename.length+compressed.length;
  }
  const dir=Buffer.concat(directory),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...bodies,dir,end]);
}
