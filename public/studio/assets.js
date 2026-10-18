// Local browser codec. No image provider, fetch, external library or hidden resampling.
export function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
const encode=(canvas,mime,quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('The browser cannot encode '+mime)),mime,quality));
export function sourceMime(bytes){if(bytes[0]===137&&bytes[1]===80)return 'image/png';if(bytes[0]===255&&bytes[1]===216)return 'image/jpeg';if(String.fromCharCode(...bytes.subarray(0,4))==='RIFF')return 'image/webp';throw Error('Choose PNG, JPEG or static WebP.');}
export async function decodeLocalSource(file,original,webType){
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});try{
 const expected=original.orientation>=5?{width:original.height,height:original.width}:original;
 if(bitmap.width!==expected.width||bitmap.height!==expected.height||bitmap.width*bitmap.height>24_000_000)throw Error('Decoded source dimensions differ from the validated original. No conversion was accepted.');
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
 const native=original.mime==='image/png'?file:await encode(canvas,'image/png');let web=null;
 if(webType!=='none'){
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  if(webType==='image/jpeg'&&pixels.some((v,i)=>i%4===3&&v!==255))throw Error('JPEG would remove transparency. Choose PNG or WebP.');
  web=await encode(canvas,webType,.92);if(web.type!==webType)throw Error('This browser does not support the selected encoder.');
  const decoded=await createImageBitmap(web),probe=document.createElement('canvas');probe.width=canvas.width;probe.height=canvas.height;const p=probe.getContext('2d',{willReadFrequently:true});p.drawImage(decoded,0,0);decoded.close();const actual=p.getImageData(0,0,probe.width,probe.height).data;let diff=0,count=0;for(let i=0;i<pixels.length;i++){diff+=Math.abs(pixels[i]-actual[i]);count++;}if(diff/count>12)throw Error('The lossy derivative differs too much from the source. Keep PNG fidelity.');
 }
 for(const b of [native,web].filter(Boolean))if(b.size>1300000)throw Error('An encoded image exceeds 1.3 MB. Use a smaller source or keep a simpler PNG; the original is retained.');
 return {native,web,width:canvas.width,height:canvas.height};
 }finally{bitmap.close();}
}
