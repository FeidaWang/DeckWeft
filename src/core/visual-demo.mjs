import { readFile } from 'node:fs/promises';
import { registerAsset } from '../assets/registry.mjs';
import { createVisualProject } from './visual-project.mjs';
import { DeckError } from './errors.mjs';
export async function createVisualDemo(locale,home,{id}={}){
 if(!['en','zh-CN'].includes(locale))throw new DeckError('LOCALE','Use en or zh-CN.');
 const fixture=JSON.parse(await readFile(new URL(`../../examples/visual-demo.${locale}.json`,import.meta.url),'utf8'));
 await registerAsset(home,await readFile(new URL('../../public/assets/visual/workbench.png',import.meta.url)),fixture.assets[0]);
 return createVisualProject(fixture.document,fixture.plan,{assets:fixture.assets,...(id?{id}:{})});
}
