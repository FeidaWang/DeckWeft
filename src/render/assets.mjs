// Closed, local-only asset registry. Project JSON can name an asset, never a path or URL.
import {readFileSync} from 'node:fs';
const files={cosmos:'cosmos.png',studio:'studio.png',mobile:'mobile.png','dot-blue':'mesh/dot-blue.png','dot-orange':'mesh/dot-orange.png','dot-purple':'mesh/dot-purple.png','dot-green':'mesh/dot-green.png','dot-grey':'mesh/dot-grey.png'};
const cache=new Map();
export function sceneAsset(id,resource){
 if(resource){if(resource.mime!=="image/png"||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(resource.dataURL))throw Error("Unsupported scene resource");return {...resource,bytes:Buffer.from(resource.dataURL.split(",")[1],"base64")};}
 if(!Object.hasOwn(files,id))throw new Error('Unknown bundled scene asset: '+String(id));
 if(!cache.has(id)){const bytes=readFileSync(new URL('../../public/assets/devday/'+files[id],import.meta.url));if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Bundled scene asset must contain PNG bytes: '+id);const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);cache.set(id,{bytes,width,height,mime:'image/png',extension:'png',dataURL:'data:image/png;base64,'+bytes.toString('base64')});}
 return cache.get(id);
}
