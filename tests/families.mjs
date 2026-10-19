import {readFile} from 'node:fs/promises';
import {registerAsset} from '../src/assets/registry.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
/** The S3 sample: one page per new composition family, English and Simplified Chinese with the same ids. Illustrative content only. */
export const familyFixture=async locale=>JSON.parse(await readFile(new URL(`fixtures/visual/families.${locale}.json`,import.meta.url),'utf8'));
export const S3_FAMILIES=['chapter','before-after','system-map','small-multiples','quote','closing'];
export async function familyProject(locale,home,options={}){
 const {document,plan,assets}=await familyFixture(locale);
 await registerAsset(home,await readFile(new URL('../public/assets/visual/workbench.png',import.meta.url)),assets[0]);
 return createVisualProject(document,plan,{assets,id:`s3-families-${locale.toLowerCase()}`,...options});
}
