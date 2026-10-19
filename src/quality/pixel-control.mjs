/**
 * F5 (2026-10-19): pixel controls for host image review. A hash-matching finding proves that a host received the bytes of an
 * image and answered about that file; it does not prove that any pixel was looked at. A pixel control places a small numbered
 * colour tag on a copy of each capture at a position only the local control record knows (never the prompt, the file name, the
 * alt text or the scene JSON) and asks the host to read the digits and their position back. A host that reads them earns the
 * attestation `host-pixel-control`; one that cannot stays `host-metadata-only`. The control proves that visual information
 * reached the answer, nothing more: not that every pixel was inspected, nor that the judgment is right.
 *
 * The PNG codec here is deliberately small: 8-bit RGB/RGBA, non-interlaced, which is what the capture browser writes. No dependency.
 */
import {inflateSync,deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {crc32} from '../render/zip.mjs';

const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
/** The tag colour, exact, so a detector can find it without tolerance. */
export const CONTROL_FILL=[255,43,214];
/** 3 × 5 digit glyphs, one string per row, 1 = ink. */
export const DIGIT_GLYPHS={
 0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],
 5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','001','001','001'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};

const fail=m=>{throw Error('PNG: '+m);};
/** Decodes an 8-bit RGB or RGBA non-interlaced PNG into RGBA pixels. Anything else is refused by name. */
export function decodePNG(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<33||!bytes.subarray(0,8).equals(SIGNATURE))fail('not a PNG');
 let offset=8,header=null;const idat=[];
 while(offset+8<=bytes.length){
  const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),end=offset+12+length;
  if(end>bytes.length)fail('truncated chunk');
  if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))fail('chunk CRC failed');
  const data=bytes.subarray(offset+8,end-4);
  if(type==='IHDR'){if(header||length!==13)fail('invalid header');header={width:data.readUInt32BE(0),height:data.readUInt32BE(4),bitDepth:data[8],colorType:data[9],compression:data[10],filter:data[11],interlace:data[12]};}
  else if(type==='IDAT')idat.push(data);
  else if(type==='IEND')break;
  offset=end;
 }
 if(!header||!idat.length)fail('no image data');
 const {width,height,bitDepth,colorType,compression,filter,interlace}=header;
 if(bitDepth!==8||![2,6].includes(colorType)||compression!==0||filter!==0||interlace!==0)fail(`unsupported format (bit depth ${bitDepth}, colour type ${colorType}, interlace ${interlace}); only 8-bit RGB/RGBA non-interlaced is decoded`);
 if(width<1||height<1||width*height>50_000_000)fail('unsupported size');
 const bpp=colorType===6?4:3,stride=width*bpp,raw=inflateSync(Buffer.concat(idat));
 if(raw.length!==(stride+1)*height)fail('wrong data length');
 const out=Buffer.alloc(width*height*4);let prev=Buffer.alloc(stride);
 for(let y=0;y<height;y++){
  const f=raw[y*(stride+1)],row=Buffer.from(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
  for(let i=0;i<stride;i++){
   const a=i>=bpp?row[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0;let v=row[i];
   if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}else if(f!==0)fail('unknown filter');
   row[i]=v&255;
  }
  for(let x=0;x<width;x++){const s=x*bpp,d=(y*width+x)*4;out[d]=row[s];out[d+1]=row[s+1];out[d+2]=row[s+2];out[d+3]=bpp===4?row[s+3]:255;}
  prev=row;
 }
 return {width,height,data:out};
}
const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const body=Buffer.concat([Buffer.from(type,'ascii'),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body)>>>0);return Buffer.concat([len,body,crc]);};
/** Encodes RGBA pixels as an 8-bit RGBA non-interlaced PNG (filter 0 on every row). */
export function encodePNG({width,height,data}){
 if(!Buffer.isBuffer(data)||data.length!==width*height*4)fail('encode needs width*height*4 RGBA bytes');
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++){raw[y*(width*4+1)]=0;data.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);}
 return Buffer.concat([SIGNATURE,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const sha=b=>createHash('sha256').update(b).digest('hex');
/** The tag's geometry for an image: cell scale s, a 12s × 7s block (s padding, three 3s × 5s glyphs with s gaps). */
const geometry=(width,height)=>{const s=Math.max(2,Math.round(Math.min(width,height)/200));return {s,width:12*s,height:7*s};};
/**
 * Places the tag on a copy of `bytes` (an 8-bit RGB/RGBA PNG) at a position drawn from `random` (0 ≤ r < 1), at least 8 px inside
 * the edges. Returns the tagged PNG, its digits, its pixel bounds and its hash. The original bytes are not changed.
 */
export function placePixelControl(bytes,{random=Math.random}={}){
 const img=decodePNG(bytes),{s,width:bw,height:bh}=geometry(img.width,img.height);
 if(img.width<bw+16||img.height<bh+16)fail('image too small for a control');
 const text=String(Math.floor(random()*1000)%1000).padStart(3,'0');
 const x0=8+Math.floor(random()*(img.width-16-bw+1)),y0=8+Math.floor(random()*(img.height-16-bh+1));
 const data=Buffer.from(img.data),put=(x,y,[r,g,b])=>{const i=(y*img.width+x)*4;data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;};
 for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)put(x0+x,y0+y,CONTROL_FILL);
 [...text].forEach((d,k)=>{const g=DIGIT_GLYPHS[d],gx=x0+s+k*4*s,gy=y0+s;for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(g[r][c]==='1')for(let yy=0;yy<s;yy++)for(let xx=0;xx<s;xx++)put(gx+c*s+xx,gy+r*s+yy,[0,0,0]);});
 const out=encodePNG({width:img.width,height:img.height,data});
 return {bytes:out,text,bounds:{x:x0,y:y0,width:bw,height:bh},sha256:sha(out)};
}
/** Reads a placed tag back from pixels alone: the exact fill colour's bounding box, then each glyph cell. `text` is null without a tag; an unreadable digit is `?`. */
export function detectPixelControl(bytes){
 const img=decodePNG(bytes),[R,G,B]=CONTROL_FILL;let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
 for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const i=(y*img.width+x)*4;if(img.data[i]===R&&img.data[i+1]===G&&img.data[i+2]===B){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}
 if(maxX<0)return {text:null,bounds:null};
 const bounds={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},s=Math.max(1,Math.round(bounds.height/7));
 const ink=(x,y)=>{if(x<0||y<0||x>=img.width||y>=img.height)return false;const i=(y*img.width+x)*4;return img.data[i]<40&&img.data[i+1]<40&&img.data[i+2]<40;};
 const text=[0,1,2].map(k=>{const gx=bounds.x+s+k*4*s,gy=bounds.y+s,rows=Array.from({length:5},(_,r)=>Array.from({length:3},(_,c)=>ink(gx+c*s+(s>>1),gy+r*s+(s>>1))?'1':'0').join(''));
  const match=Object.entries(DIGIT_GLYPHS).find(([,g])=>g.every((row,r)=>row===rows[r]));return match?match[0]:'?';}).join('');
 return {text,bounds};
}
/** How much of the placed tag a reported box covers (0–1). */
export function controlOverlap(reported,placed){
 if(!reported||!placed)return 0;const x=Math.max(reported.x,placed.x),y=Math.max(reported.y,placed.y),r=Math.min(reported.x+reported.width,placed.x+placed.width),b=Math.min(reported.y+reported.height,placed.y+placed.height);
 return r<=x||b<=y?0:((r-x)*(b-y))/(placed.width*placed.height);
}
