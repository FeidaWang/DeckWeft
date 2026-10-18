import {access,mkdtemp,readFile,realpath,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const sha=text=>createHash('sha256').update(text).digest('hex');
const FILE=new URL('fixtures/visual/render-baseline.json',import.meta.url);
/** What a stylesheet or theme-list change must leave alone: the markup without its stylesheet, render hash and scene source hashes, with embedded theme composition lists emptied. Text, values, ids, links and scripts stay in. */
export const contentView=html=>html.replace(/<style>[\s\S]*?<\/style>/,'<style></style>').replace(/ data-source-hash="[a-f0-9]+"/g,'').replace(/(deckweft-render-hash" content="|data-render-hash=")[a-f0-9]+/g,'$1').replace(/"compositions":\[[^\]]*\]/g,'"compositions":[]');
/**
 * One HTML export split into what changes for different reasons. `markup` is everything a reader without JavaScript gets
 * (text, values, anchors, structure) with the CSS, scripts and their derived hashes removed; `data` is the inert runtime JSON;
 * `script` is the embedded player; `style` is the embedded CSS.
 */
export function htmlParts(body){
 const one=(pattern,name)=>{const m=body.match(pattern);if(!m)throw Error('The export has no '+name+'.');return m[1];};
 const data=one(/<script type="application\/json" id="dw-runtime-data">([\s\S]*?)<\/script>/,'runtime data'),script=one(/<script>([\s\S]*?)<\/script>/,'player script'),style=one(/<style>([\s\S]*?)<\/style>/,'style');
 const markup=body.replace(/<style>[\s\S]*?<\/style>/,'<style></style>').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'<script></script>').replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/,'').replace(/(deckweft-render-hash" content=")[^"]+/,'$1').replace(/(data-render-hash=")[^"]+/,'$1');
 return {markup:sha(markup),data:sha(data),script:sha(script),style:sha(style)};
}
/** Renders every committed v3 fixture and deterministic demo with existing fields only, so a later run proves byte-identical output.
 * `entries` are byte hashes; `content` hashes the content view (HTML) or the resolved theme without its composition list; `parts` splits each HTML entry (see htmlParts).
 * `root` may name another checkout of this repository, so a re-recording can be compared with the commit before it. */
export async function renderBaseline({root=new URL('../',import.meta.url)}={}){
 const at=p=>new URL(p,root),load=p=>import(at(p).href),exists=p=>access(at(p)).then(()=>true,()=>false);
 const [{createVisualDemo},{createComponentDemo},{createInteractionDemo},{createCompositionDemo},{visualAssetResources},{exportDeck},{resolveTheme,themePacks},{WEB_RENDERER_VERSION},{createVisualProject},{registerAsset},{runtime,PLAYER_VERSION}]=await Promise.all(['src/core/visual-demo.mjs','src/core/component-demo.mjs','src/core/interaction-demo.mjs','src/core/composition-demo.mjs','src/assets/visual.mjs','src/render/export.mjs','src/design/theme-registry.mjs','src/scene/web/compile.mjs','src/core/visual-project.mjs','src/assets/registry.mjs','src/render/web/runtime.mjs'].map(load));
 const entries={},content={},parts={},html=(name,body)=>{entries[name]=sha(body);content[name]=sha(contentView(body));parts[name]=htmlParts(body);};
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
 // Checkouts before S5 have no PLAYER_VERSION; they still render for a comparison.
 return {format:'deckweft-render-baseline',renderer:WEB_RENDERER_VERSION,...(PLAYER_VERSION?{player:{version:PLAYER_VERSION,sha256:sha(runtime)}}:{}),entries,content,parts};
}
export const readRenderBaseline=async()=>JSON.parse(await readFile(FILE,'utf8'));
/**
 * The embedded-player versioning rule (conflict C6): every distinct player byte sequence that was ever recorded keeps its own
 * version. Changing the player without bumping PLAYER_VERSION therefore fails even after a re-recording.
 */
export function playerHistory(previous,current){
 const history=[...(previous?.playerHistory||[])];
 if(!history.some(h=>h.version===current.player.version&&h.sha256===current.player.sha256))history.push(current.player);
 return history;
}
export function playerHistoryIssues(history){
 const issues=[];
 for(const [i,a] of history.entries())for(const b of history.slice(i+1)){
  if(a.version===b.version&&a.sha256!==b.sha256)issues.push(`Player version ${a.version} names two different player byte sequences; bump PLAYER_VERSION in src/render/web/runtime.mjs.`);
  if(a.sha256===b.sha256&&a.version!==b.version)issues.push(`One player byte sequence is recorded under ${a.version} and ${b.version}.`);
 }
 return issues;
}
// Deliberate re-recording only: `node tests/render-baseline.mjs --write [--recorded-at D --source-commit C --note N]`, in its own commit, with the reason in docs/en/verification.md.
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])&&process.argv.includes('--write')){
 const previous=await readRenderBaseline().catch(()=>null),current=await renderBaseline(),history=playerHistory(previous,current),issues=playerHistoryIssues(history);
 if(issues.length)throw Error(issues.join('\n'));
 const option=name=>{const i=process.argv.indexOf('--'+name);return i>0?process.argv[i+1]:undefined;};
 const meta=Object.fromEntries(['recordedAt','sourceCommit','note'].map(k=>[k,option(k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()))??previous?.[k]]).filter(([,v])=>v!==undefined));
 await writeFile(FILE,JSON.stringify({...current,playerHistory:history,...meta},null,2)+'\n');
 const changed=Object.keys(current.entries).filter(k=>previous?.entries?.[k]!==current.entries[k]);
 console.log(JSON.stringify({written:fileURLToPath(FILE),changedEntries:changed,changedParts:Object.fromEntries(Object.entries(current.parts).map(([k,v])=>[k,Object.keys(v).filter(p=>previous?.parts?.[k]?.[p]!==v[p])]).filter(([,v])=>v.length))},null,2));
}
