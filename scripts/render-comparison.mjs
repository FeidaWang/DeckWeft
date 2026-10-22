import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { assertPresentation } from '../src/core/blocks.mjs';
import { assertDesignPlan } from '../src/design/plan.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { contentHash } from '../src/scene/web/compile.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function renderComparison({out,locale='all'}={}) {
  if (!['en','zh-CN','all'].includes(locale)) throw Error('Use --locale en, zh-CN, or all.');
  out??=path.join(root,'dist/comparison');
  await mkdir(out,{recursive:true});
  const manifest={format:'deckweft-comparison-render',version:1,artifacts:[]};
  for (const lang of locale==='all'?['en','zh-CN']:[locale]) {
    const input=JSON.parse(await readFile(path.join(root,`examples/model-comparison.${lang}.json`),'utf8'));
    assertPresentation(input.document);assertDesignPlan(input.document,input.plan);
    const result=exportDeck(input.document,'html',{plan:input.plan,experimentalWeb:true,assetResources:{}});
    const name=`model-comparison.${lang}.html`;await writeFile(path.join(out,name),result.body);
    manifest.artifacts.push({file:name,locale:lang,sourceHash:contentHash(input),outputHash:contentHash(result.body),renderHash:result.renderHash,sceneHashes:result.scenes.map(s=>s.sourceHash)});
  }
  await writeFile(path.join(out,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if (process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {values:a}=parseArgs({options:{out:{type:'string'},locale:{type:'string'},help:{type:'boolean'}}});
  if(a.help)console.log('Usage: npm run comparison:render -- [--locale en|zh-CN|all] [--out dist/comparison]\nWrites standalone offline HTML for the GPT-6 Astra / Claude Opus 5.5 comparison deck, with source/output/render hashes.');
  else console.log(JSON.stringify(await renderComparison({...(a.out?{out:path.resolve(a.out)}:{}),...(a.locale?{locale:a.locale}:{})}),null,2));
}
