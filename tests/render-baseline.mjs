import {access,mkdtemp,readFile,realpath,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const sha=text=>createHash('sha256').update(text).digest('hex');
/** What a stylesheet or theme-list change must leave alone: the markup without its stylesheet, render hash and scene source hashes, with embedded theme composition lists emptied. Text, values, ids, links and scripts stay in. */
export const contentView=html=>html.replace(/<style>[\s\S]*?<\/style>/,'<style></style>').replace(/ data-source-hash="[a-f0-9]+"/g,'').replace(/(deckweft-render-hash" content="|data-render-hash=")[a-f0-9]+/g,'$1').replace(/"compositions":\[[^\]]*\]/g,'"compositions":[]');
/** Renders every committed v3 fixture and deterministic demo with existing fields only, so a later run proves byte-identical output.
 * `entries` are byte hashes; `content` hashes the content view (HTML) or the resolved theme without its composition list.
 * `root` may name another checkout of this repository, so a re-recording can be compared with the commit before it. */
export async function renderBaseline({root=new URL('../',import.meta.url)}={}){
 const at=p=>new URL(p,root),load=p=>import(at(p).href),exists=p=>access(at(p)).then(()=>true,()=>false);
 const [{createVisualDemo},{createComponentDemo},{createInteractionDemo},{createCompositionDemo},{visualAssetResources},{exportDeck},{resolveTheme,themePacks},{WEB_RENDERER_VERSION},{createVisualProject},{registerAsset}]=await Promise.all(['src/core/visual-demo.mjs','src/core/component-demo.mjs','src/core/interaction-demo.mjs','src/core/composition-demo.mjs','src/assets/visual.mjs','src/render/export.mjs','src/design/theme-registry.mjs','src/scene/web/compile.mjs','src/core/visual-project.mjs','src/assets/registry.mjs'].map(load));
 const entries={},content={},html=(name,body)=>{entries[name]=sha(body);content[name]=sha(contentView(body));};
 for(const locale of ['en','zh-CN']){
  const {document,plan}=JSON.parse(await readFile(at(`tests/fixtures/visual/wave-a.${locale}.json`),'utf8'));
  html(`wave-a.${locale}.html`,exportDeck(document,'html',{experimentalWeb:true,plan}).body);
  entries[`wave-a.${locale}.json`]=content[`wave-a.${locale}.json`]=sha(exportDeck(document,'json',{experimentalWeb:true}).body);
 }
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-baseline-')));
 try{
  for(const [name,create] of [['visual',createVisualDemo],['component',createComponentDemo],['interaction',createInteractionDemo],['composition',createCompositionDemo]])for(const locale of ['en','zh-CN']){
   const project=await create(locale,home,{id:`baseline-${name}-${locale}`}),resources=await visualAssetResources(project,home);
   html(`${name}-demo.${locale}.html`,exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:resources}).body);
  }
  // The S3 six-family sample, where the checkout has it.
  if(await exists('tests/fixtures/visual/families.en.json'))for(const locale of ['en','zh-CN']){
   const {document,plan,assets}=JSON.parse(await readFile(at(`tests/fixtures/visual/families.${locale}.json`),'utf8'));
   await registerAsset(home,await readFile(at('public/assets/visual/workbench.png')),assets[0]);
   const project=createVisualProject(document,plan,{assets,id:`baseline-families-${locale.toLowerCase()}`}),resources=await visualAssetResources(project,home);
   html(`families.${locale}.html`,exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:resources}).body);
  }
 }finally{await rm(home,{recursive:true,force:true});}
 for(const pack of themePacks())for(const locale of ['en','zh-CN'])for(const colorMode of ['default','chapter']){
  const name=`theme.${pack.id}.${locale}.${colorMode}`,theme=resolveTheme(pack.id,pack.version,locale,{colorMode}),{compositions,...rest}=theme;
  entries[name]=sha(JSON.stringify(theme));content[name]=sha(JSON.stringify(rest));
 }
 return {format:'deckweft-render-baseline',renderer:WEB_RENDERER_VERSION,entries,content};
}
