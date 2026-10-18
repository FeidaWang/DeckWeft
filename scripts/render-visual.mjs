import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createVisualDemo } from '../src/core/visual-demo.mjs';
import { visualAssetResources } from '../src/assets/visual.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { contentHash } from '../src/scene/web/compile.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function renderVisual({out,locale='all',caseName='wave-a'}={}) {
  if (!['wave-a','studio'].includes(caseName)||!['en','zh-CN','all'].includes(locale)) throw Error('Use --case wave-a|studio and --locale en, zh-CN, or all. The release gallery is not implemented yet.');
  out??=path.join(root,'dist/visual',caseName);
  await mkdir(out,{recursive:true});
  const manifest={format:'deckweft-visual-render',version:1,case:caseName,artifacts:[]};
  for (const lang of locale==='all'?['en','zh-CN']:[locale]) {
    const example=caseName==='studio'?await createVisualDemo(lang,path.join(out,'library'),{id:'visual-studio-demo-'+lang}):null;
    const input=example?{document:example.document,plan:example.plan,assets:example.assets}:JSON.parse(await readFile(path.join(root,`tests/fixtures/visual/wave-a.${lang}.json`),'utf8'));
    const resources=example?await visualAssetResources(example,path.join(out,'library')):{};
    const result=exportDeck(input.document,'html',{plan:input.plan,experimentalWeb:true,assetResources:resources});
    const name=`${caseName}.${lang}.html`;await writeFile(path.join(out,name),result.body);
    manifest.artifacts.push({file:name,locale:lang,sourceHash:contentHash(input),outputHash:contentHash(result.body),renderHash:result.renderHash,sceneHashes:result.scenes.map(s=>s.sourceHash)});
  }
  const links=manifest.artifacts.map(a=>`<li><a href="${a.file}">${a.locale}</a></li>`).join('');
  await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DeckWeft Wave A</title><h1>DeckWeft — Wave A</h1><p>Experimental semantic web renderer. Versioned visual systems; synthetic data and explicitly decorative local artwork. Edit these examples in Visual Studio.</p><ul>${links}</ul></html>`);
  await writeFile(path.join(out,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if (process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {values:a}=parseArgs({options:{out:{type:'string'},locale:{type:'string'},case:{type:'string'},help:{type:'boolean'}}});
  if(a.help)console.log('Usage: npm run visual:render -- [--case wave-a|studio] [--locale en|zh-CN|all] [--out dist/visual/wave-a]\nWrites standalone offline HTML and source/output/render hashes. Use visual:capture for optional browser evidence.');
  else console.log(JSON.stringify(await renderVisual({...(a.out?{out:path.resolve(a.out)}:{}),...(a.locale?{locale:a.locale}:{}),...(a.case?{caseName:a.case}:{})}),null,2));
}
