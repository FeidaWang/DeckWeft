// Compares the render-baseline HTML outputs of an older source tree with this one: which entries changed, and whether each keeps its text, values, data tables and anchors.
// node tests/render-baseline-diff.mjs /path/to/older/checkout [report.json] [label for the older tree]
import {mkdtemp,realpath,rm,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const sha=text=>createHash('sha256').update(text).digest('hex');
/** The HTML outputs that render-baseline.mjs hashes, rendered by the source tree at root (the S3 family sample only where that tree has it). */
export async function baselineBodies(root){
 const load=file=>import(pathToFileURL(path.join(root,file)).href);
 const [{createVisualDemo},{createComponentDemo},{createInteractionDemo},{createCompositionDemo},{visualAssetResources},{exportDeck},{createVisualProject},{registerAsset}]=await Promise.all(['src/core/visual-demo.mjs','src/core/component-demo.mjs','src/core/interaction-demo.mjs','src/core/composition-demo.mjs','src/assets/visual.mjs','src/render/export.mjs','src/core/visual-project.mjs','src/assets/registry.mjs'].map(load));
 const bodies={};
 for(const locale of ['en','zh-CN']){const {document,plan}=JSON.parse(await readFile(path.join(root,`tests/fixtures/visual/wave-a.${locale}.json`),'utf8'));bodies[`wave-a.${locale}.html`]=exportDeck(document,'html',{experimentalWeb:true,plan}).body;}
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-baseline-diff-')));
 try{for(const [name,create] of [['visual',createVisualDemo],['component',createComponentDemo],['interaction',createInteractionDemo],['composition',createCompositionDemo]])for(const locale of ['en','zh-CN']){const project=await create(locale,home,{id:`baseline-${name}-${locale}`});bodies[`${name}-demo.${locale}.html`]=exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:await visualAssetResources(project,home)}).body;}
  if(await readFile(path.join(root,'tests/fixtures/visual/families.en.json')).then(()=>true,()=>false))for(const locale of ['en','zh-CN']){const {document,plan,assets}=JSON.parse(await readFile(path.join(root,`tests/fixtures/visual/families.${locale}.json`),'utf8'));await registerAsset(home,await readFile(path.join(root,'public/assets/visual/workbench.png')),assets[0]);const project=createVisualProject(document,plan,{assets,id:`baseline-families-${locale.toLowerCase()}`});bodies[`families.${locale}.html`]=exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan,assetResources:await visualAssetResources(project,home)}).body;}}
 finally{await rm(home,{recursive:true,force:true});}
 return bodies;
}
const main=body=>body.slice(body.indexOf('<main>'),body.indexOf('</main>'));
const anchors=body=>[...new Set(body.match(/id="dw-object-[0-9a-f]{32}"/g)||[])].sort();
const tables=body=>(main(body).match(/<tbody>[\s\S]*?<\/tbody>/g)||[]);
// Visible text: no scripts or styles, no hover-only SVG titles, no table captions (they repeat the chart caption).
// <wbr> (S8, C12) has no text content: it is removed, not replaced by a space, so a phrase break never looks like a changed word.
const visible=body=>main(body).replace(/<wbr>/g,'').replace(/<title>[\s\S]*?<\/title>/g,' ').replace(/<caption>[\s\S]*?<\/caption>/g,' ').replace(/<[^>]+>/g,' ').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const words=text=>text.split(/[\s·]+/).filter(Boolean);
const numbers=text=>(text.match(/-?\d+(?:\.\d+)?/g)||[]).sort();
const minus=(a,b)=>{const left=new Map();for(const v of b)left.set(v,(left.get(v)||0)+1);return a.filter(v=>{const n=left.get(v);if(n){left.set(v,n-1);return false;}return true;});};
const hoverTitles=body=>(main(body).match(/<title>[\s\S]*?<\/title>/g)||[]).map(t=>t.slice(7,-8));
/** Per-entry receipt: hashes, anchors, data tables, visible values and the exact words that changed. */
export function compareBodies(before,after){
 return Object.keys(before).filter(name=>name in after).map(name=>{
  const a=before[name],b=after[name],ta=visible(a),tb=visible(b),wa=words(ta),wb=words(tb);
  return {entry:name,changed:sha(a)!==sha(b),before:sha(a),after:sha(b),anchors:{before:anchors(a).length,after:anchors(b).length,equal:JSON.stringify(anchors(a))===JSON.stringify(anchors(b))},dataTables:{count:tables(a).length,equal:JSON.stringify(tables(a))===JSON.stringify(tables(b))},
   visibleValues:{before:numbers(ta).length,after:numbers(tb).length,removed:minus(numbers(ta),numbers(tb)),added:minus(numbers(tb),numbers(ta))},
   visibleWords:{removed:[...new Set(minus(wa,wb))],added:[...new Set(minus(wb,wa))]},
   hoverOnlyTitles:{before:hoverTitles(a).length,after:hoverTitles(b).length,valuesNotVisibleAfter:[...new Set(numbers(hoverTitles(a).join(' ')))].filter(v=>!numbers(tb).includes(v))},
   documentTitle:a.match(/<title>[^<]*<\/title>/)[0]===b.match(/<title>[^<]*<\/title>/)[0]};
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const older=await realpath(process.argv[2]),here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const report={format:'deckweft-render-baseline-diff',older:process.argv[4]||older,entries:compareBodies(await baselineBodies(older),await baselineBodies(here))};
 const out=JSON.stringify(report,null,2)+'\n';if(process.argv[3])await writeFile(process.argv[3],out);else process.stdout.write(out);
}
