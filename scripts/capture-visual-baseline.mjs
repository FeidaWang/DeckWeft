import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { exportDeck } from '../src/render/export.mjs';
import { contentHash } from '../src/scene/web/compile.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function renderBaseline({out=path.join(root,'dist/visual/baseline')}={}) {
  await mkdir(out,{recursive:true});
  const manifest={format:'deckweft-visual-baseline',version:1,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),measurement:'estimated legacy CLI; screenshot capture is separate',artifacts:[]};
  for(const name of ['product-en','strategy-zh-CN','technical-en']) {
    const bytes=await readFile(path.join(root,`tests/fixtures/visual/${name}.baseline.json`),'utf8');
    const result=exportDeck(JSON.parse(bytes),'html');
    await writeFile(path.join(out,name+'.html'),result.body);
    manifest.artifacts.push({file:name+'.html',sourceHash:contentHash(JSON.parse(bytes)),outputHash:contentHash(result.body)});
  }
  await writeFile(path.join(out,'render-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {values:a}=parseArgs({options:{out:{type:'string'},help:{type:'boolean'}}});
  if(a.help)console.log('Usage: npm run visual:baseline -- [--out dist/visual/baseline]\nRenders three fixed legacy decks. Capture screenshots with npm run visual:capture. Does not certify remote CI.');
  else console.log(JSON.stringify(await renderBaseline(a.out?{out:path.resolve(a.out)}:{}),null,2));
}
