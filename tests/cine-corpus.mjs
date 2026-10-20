import {readFile} from 'node:fs/promises';
import {registerAsset} from '../src/assets/registry.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
/**
 * The CINE batch 1 corpus (docs/plans/cinematic-composition-build-map.md §3): ten pages in English and Simplified Chinese with
 * the same ids, sources and datasets. Illustrative content only; every number is synthetic. The JSON fixtures carry a legacy
 * plan without the batch 1 fields; `CINE_SCENES` holds the declarations and `cineProject` merges the ones a test asks for.
 */
export const cineFixture=async locale=>JSON.parse(await readFile(new URL(`fixtures/visual/cine.${locale}.json`,import.meta.url),'utf8'));
export const CINE_ASSET_FILES=['cine-context.png','cine-product.png','cine-tall.png'];
/** Declared batch 1 fields per page, as the plan's corpus table states them. */
export const CINE_SCENES=Object.freeze({
 'context':{intent:{purpose:'explain',entry:'left'},media:[{blockId:'ctx-image',role:'context'}],references:{mode:'compact'}},
 'product':{intent:{purpose:'show-product',entry:'left'},media:[{blockId:'prod-image',role:'hero'}],references:{mode:'compact'}},
 'product-center':{intent:{purpose:'show-product',entry:'center'}},
 'detail':{intent:{purpose:'show-detail',entry:'left'},media:[{blockId:'det-hero',role:'hero'},{blockId:'det-locator',role:'supporting'}]},
 'mechanism':{intent:{purpose:'explain',entry:'left'},media:[{blockId:'mech-diagram',role:'mechanism'}]},
 'evidence':{intent:{purpose:'evidence',entry:'left'},references:{mode:'compact'}},
 'quote':{references:{mode:'compact'}},
 'overflow':{references:{mode:'compact'}},
 'long-heading':{intent:{purpose:'explain',entry:'left'}},
 'action':{intent:{purpose:'chapter',entry:'contextual'}}
});
export const CINE_FIELDS=['references','intent','media'];
/**
 * The corpus as a visual project with its three assets registered under `home`. `declared` lists which of the batch 1 fields
 * to merge from CINE_SCENES (default: all three); `[]` gives the legacy project the JSON holds.
 */
export async function cineProject(locale,home,{declared=CINE_FIELDS,...options}={}){
 const {document,plan,assets}=await cineFixture(locale);
 for(const [i,file] of CINE_ASSET_FILES.entries())await registerAsset(home,await readFile(new URL(`fixtures/visual/assets/${file}`,import.meta.url)),assets[i]);
 for(const scene of plan.scenes)for(const field of declared){const value=CINE_SCENES[scene.id]?.[field];if(value)scene[field]=structuredClone(value);}
 return createVisualProject(document,plan,{assets,id:`cine-${locale.toLowerCase()}`,...options});
}
