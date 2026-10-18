import {inspectPNG} from './registry.mjs';
import {DeckError} from '../core/errors.mjs';
const fail=message=>{throw new DeckError('ASSET_FORMAT',message,422);};
export const imageExtensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
function exif(bytes){
 const b=bytes.subarray(bytes.subarray(0,6).equals(Buffer.from('Exif\0\0'))?6:0);if(b.length<8)fail('Truncated EXIF metadata.');const le=b.toString('ascii',0,2)==='II';if(!le&&b.toString('ascii',0,2)!=='MM')fail('Invalid EXIF byte order.');
 const u16=o=>{if(o<0||o+2>b.length)fail('EXIF bounds failed.');return le?b.readUInt16LE(o):b.readUInt16BE(o);},u32=o=>{if(o<0||o+4>b.length)fail('EXIF bounds failed.');return le?b.readUInt32LE(o):b.readUInt32BE(o);};
 if(u16(2)!==42)fail('Invalid EXIF header.');const offset=u32(4),count=u16(offset);if(count>500||offset+2+count*12+4>b.length)fail('EXIF directory bounds failed.');let orientation=1;
 for(let i=0;i<count;i++){const p=offset+2+i*12;if(u16(p)===0x112){if(u16(p+2)!==3||u32(p+4)!==1)fail('Invalid EXIF orientation.');orientation=u16(p+8);if(orientation<1||orientation>8)fail('Invalid EXIF orientation.');}}
 return orientation;
}
function jpeg(b){
 if(b.length<20||b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)fail('Use a complete JPEG with one image and a final EOI marker.');let o=2,width,height,orientation=1,sos=false;
 while(o<b.length-2){if(b[o++]!==255)fail('Invalid JPEG marker.');while(b[o]===255)o++;const marker=b[o++];if(marker===0||marker===216||marker===217)fail('Invalid JPEG marker sequence.');if(o+2>b.length)fail('Truncated JPEG.');const length=b.readUInt16BE(o),end=o+length;if(length<2||end>b.length)fail('JPEG segment bounds failed.');
  if(marker===225&&b.toString('ascii',o+2,o+8)==='Exif\0\0')orientation=exif(b.subarray(o+2,end));
  if([192,193,194].includes(marker)){if(width||length<8||b[o+2]!==8||length!==8+3*b[o+7])fail('Unsupported JPEG frame.');height=b.readUInt16BE(o+3);width=b.readUInt16BE(o+5);}
  if(marker===218){sos=true;break;}o=end;
 }
 if(!width||!height||!sos)fail('JPEG lacks a supported frame and scan.');return {width,height,orientation};
}
function webp(b){
 if(b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP'||b.readUInt32LE(4)+8!==b.length)fail('Use a complete, bounded WebP container.');let o=12,frame=null,canvas=null,orientation=1;
 while(o<b.length){if(o+8>b.length)fail('Truncated WebP chunk.');const type=b.toString('ascii',o,o+4),size=b.readUInt32LE(o+4),start=o+8,end=start+size;if(end+(size%2)>b.length)fail('WebP chunk bounds failed.');const c=b.subarray(start,end);
  if(['ANIM','ANMF'].includes(type))fail('Use a static WebP. Animated images require a separate playback contract.');
  if(type==='VP8X'){if(size!==10||canvas||(c[0]&2))fail('Unsupported WebP extended header.');canvas={width:1+c.readUIntLE(4,3),height:1+c.readUIntLE(7,3)};}
  if(type==='EXIF')orientation=exif(c);
  if(type==='VP8 '){if(frame||size<10||!c.subarray(3,6).equals(Buffer.from([157,1,42]))||(c[0]&1))fail('Invalid WebP VP8 frame.');frame={width:c.readUInt16LE(6)&16383,height:c.readUInt16LE(8)&16383};}
  if(type==='VP8L'){if(frame||size<5||c[0]!==47||(c[4]&224))fail('Invalid WebP lossless frame.');const bits=c.readUInt32LE(1);frame={width:(bits&16383)+1,height:((bits>>>14)&16383)+1};}
  o=end+size%2;
 }
 if(!frame||(canvas&&(canvas.width!==frame.width||canvas.height!==frame.height)))fail('WebP frame dimensions do not match its canvas.');return {...frame,orientation};
}
/** Container/dimension validation; decoded pixels are checked separately by the browser. */
export function inspectImage(bytes,mime){
 if(!Buffer.isBuffer(bytes)||bytes.length>4_000_000||!Object.hasOwn(imageExtensions,mime))fail('Use PNG, JPEG or static WebP smaller than 4 MB.');
 const d=mime==='image/png'?{...inspectPNG(bytes),orientation:1}:mime==='image/jpeg'?jpeg(bytes):webp(bytes);
 if(!d.width||!d.height||d.width>8192||d.height>8192||d.width*d.height>24_000_000)fail('Use at most 8192px per side and 24 million pixels.');return d;
}
export const orientedDimensions=d=>d.orientation>=5?{width:d.height,height:d.width}:{width:d.width,height:d.height};
