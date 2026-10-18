import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createComponentDemo} from '../src/core/component-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
export async function renderComponentDemo(){
 const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/visual-components/demo'),home=path.join(out,'library');await mkdir(out,{recursive:true});
 const manifest={format:'deckweft-component-demo',version:1,artifacts:[]};
 for(const locale of ['en','zh-CN']){
  const p=await createComponentDemo(locale,home,{id:'component-demo-'+locale}),resources=await visualAssetResources(p,home);
  for(const theme of ['cream-collage','electric-violet','dark-data']){
   const copy=structuredClone(p);for(const s of copy.plan.scenes)if(s.id.startsWith('component-'))s.theme=theme;
   const output=exportDeck(copy.document,'html',{plan:copy.plan,experimentalWeb:true,assetResources:resources}),file=`components.${locale}.${theme}.html`;await writeFile(path.join(out,file),output.body);
   manifest.artifacts.push({locale,componentTheme:theme,file,scenes:output.scenes.length,renderHash:output.renderHash,sha256:createHash('sha256').update(output.body).digest('hex')});
  }
 }
 await writeFile(path.join(out,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
