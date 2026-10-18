import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { exportDeck } from '../src/render/export.mjs';
import { resolveScenes } from '../src/layout/engine.mjs';
await mkdir('dist/demo',{recursive:true});
for(const name of ['welcome','welcome.zh-CN']){
  const p=JSON.parse(await readFile(`examples/${name}.deck.json`,'utf8'));
  for(const format of ['html','pptx','figma','motion']){
    const result=exportDeck(p,format);await writeFile(`dist/demo/${name}.${result.extension}`,result.body);
  }
}
console.log('Created English and Simplified Chinese demo exports in dist/demo.');

const {buildDevday}=await import('./devday-demo.mjs');await buildDevday();
const {buildPresenterDemo}=await import('./presenter-demo.mjs');await buildPresenterDemo();

// The preserved original artwork is a source fixture, never regenerated during a build.
await import('./media-demo.mjs');
