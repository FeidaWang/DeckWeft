import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {createComponentDemo} from '../src/core/component-demo.mjs';
import { createAssetDemo } from '../src/core/asset-demo.mjs';
import { createCompositionDemo } from '../src/core/composition-demo.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStudio } from '../src/services/server.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { createVisualDemo } from '../src/core/visual-demo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.argv.includes('--help')){console.log('Usage: npm run studio:visual-demo\nStarts Studio on loopback with an isolated demo library in dist/visual-studio/library. Seeds English/Chinese examples only when that visual library is empty. Ctrl+C stops both Studio and its audience server.');process.exit(0);}
const interactions=process.argv.includes('--interactions');
const components=process.argv.includes('--components');
const composition=process.argv.includes('--compositions'),assets=process.argv.includes('--assets');
const home=path.join(root,interactions?'dist/visual-interactions/library':components?'dist/visual-components/library':assets?'dist/visual-assets/library':composition?'dist/visual-compositions/library':'dist/visual-studio/library'),store=await new VisualProjectStore(home).init();
if(!(await store.list()).length)for(const locale of ['en','zh-CN'])await store.save(await (interactions?createInteractionDemo:components?createComponentDemo:assets?createAssetDemo:composition?createCompositionDemo:createVisualDemo)(locale,store.home),{create:true});
const app=await startStudio({home,port:0});console.log(`DeckWeft Visual Studio: ${app.url}/visual${assets?'?scene=violet':''}\nClassic Studio: ${app.url}\nDemo library: ${home}\nCtrl+C stops this local preview.`);
process.once('SIGINT',()=>app.close());process.once('SIGTERM',()=>app.close());
