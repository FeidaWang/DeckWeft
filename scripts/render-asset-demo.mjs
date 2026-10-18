import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAssetDemo} from '../src/core/asset-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function renderAssetDemo(){const out=path.join(root,'dist/visual-assets/demo'),home=path.join(out,'library');await mkdir(out,{recursive:true});const manifest={format:'deckweft-asset-demo',version:1,artifacts:[]};
 for(const locale of ['en','zh-CN']){const p=await createAssetDemo(locale,home,{id:'asset-demo-'+locale}),resources=await visualAssetResources(p,home),output=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:resources}),file='assets.'+locale+'.html',asset=p.assets.find(a=>a.id===p.document.blocks.find(b=>b.id==='violet-image').assetId),nativeBytes=(await readFile(path.join(home,asset.path))).length,webBytes=Buffer.from(resources[asset.id].dataURL.split(',')[1],'base64').length;await writeFile(path.join(out,file),output.body);manifest.artifacts.push({locale,file,renderHash:output.renderHash,sha256:createHash('sha256').update(output.body).digest('hex'),bytes:Buffer.byteLength(output.body),nativeBytes,webBytes,originalHash:asset.original.hash});}
 await writeFile(path.join(out,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
