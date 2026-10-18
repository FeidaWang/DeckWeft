import {mkdtemp,readFile,realpath,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {createVisualDemo} from '../src/core/visual-demo.mjs';
import {createComponentDemo} from '../src/core/component-demo.mjs';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {resolveTheme,themePacks} from '../src/design/theme-registry.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
const sha=text=>createHash('sha256').update(text).digest('hex');
/** Renders every committed v3 fixture and deterministic demo with existing fields only, so a later run proves byte-identical output. */
export async function renderBaseline(){
 const entries={};
 for(const locale of ['en','zh-CN']){
  const {document,plan}=JSON.parse(await readFile(new URL(`fixtures/visual/wave-a.${locale}.json`,import.meta.url),'utf8'));
  entries[`wave-a.${locale}.html`]=sha(exportDeck(document,'html',{experimentalWeb:true,plan}).body);
  entries[`wave-a.${locale}.json`]=sha(exportDeck(document,'json',{experimentalWeb:true}).body);
 }
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-baseline-')));
 try{
  for(const [name,create] of [['visual',createVisualDemo],['component',createComponentDemo],['interaction',createInteractionDemo],['composition',createCompositionDemo]])for(const locale of ['en','zh-CN']){
   const project=await create(locale,home,{id:`baseline-${name}-${locale}`}),resources=await visualAssetResources(project,home);
   entries[`${name}-demo.${locale}.html`]=sha(exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:resources}).body);
  }
 }finally{await rm(home,{recursive:true,force:true});}
 for(const pack of themePacks())for(const locale of ['en','zh-CN'])for(const colorMode of ['default','chapter'])entries[`theme.${pack.id}.${locale}.${colorMode}`]=sha(JSON.stringify(resolveTheme(pack.id,pack.version,locale,{colorMode})));
 return {format:'deckweft-render-baseline',renderer:WEB_RENDERER_VERSION,entries};
}
