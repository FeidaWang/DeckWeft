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

const {renderVisual}=await import('./render-visual.mjs');
await renderVisual({caseName:'studio'});console.log('Created both language editions of the three-theme Visual Studio example in dist/visual/studio.');
const {renderAssetDemo}=await import('./render-asset-demo.mjs');await renderAssetDemo();console.log('Created bilingual source-preserving asset/crop examples in dist/visual-assets/demo.');
const {renderComponentDemo}=await import('./render-component-demo.mjs');await renderComponentDemo();console.log('Created six bilingual three-theme semantic component stories in dist/visual-components/demo.');
const {renderInteractionDemo}=await import('./render-interaction-demo.mjs');await renderInteractionDemo();console.log('Created six offline bilingual semantic interaction stories in dist/visual-interactions/demo.');
