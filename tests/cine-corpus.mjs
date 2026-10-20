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
const SUBJECT={x:.3,y:.3,width:.4,height:.4},SEAM={x:.1,y:.35,width:.8,height:.3};
const brief=(o)=>({role:'illustration',requiredWidth:240,requiredHeight:240,focalPoint:{x:.5,y:.5},safeRegion:{...SUBJECT},factual:false,sourceId:'',backend:'none',...o});
/** CINE-005 (batch 2): the authored subject annotations. The product hero names its subject, a protected region and a context region and is cropped
 * to the context at aspect 1; the tall detail names the seam as its subject and points at the locator; the locator shows the whole product;
 * product-center is the evidence screenshot that must not be cropped (spec §8). Captions are visible text separate from the alt. */
export const CINE_SLOTS=Object.freeze({
 en:{product:'The product in its field; the drawing is synthetic',detail:'Seam and latch',locator:'Where the detail sits on the whole product'},
 'zh-CN':{product:'产品与其空白场地；绘图为合成',detail:'接缝与锁扣',locator:'细节在整体产品上的位置'}
});
const slotsOf=locale=>({
 product:[{id:'hero',blockId:'prod-image',brief:brief({subjectBounds:{...SUBJECT},protectedRegions:[{x:.28,y:.28,width:.44,height:.44}],contextRegion:{x:.1,y:.1,width:.8,height:.8},visibleCaption:CINE_SLOTS[locale].product}),display:'crop',aspect:1}],
 detail:[{id:'hero',blockId:'det-hero',brief:brief({requiredWidth:200,requiredHeight:200,safeRegion:{...SEAM},focalPoint:{x:.5,y:.5},subjectBounds:{...SEAM},protectedRegions:[{...SEAM}],visibleCaption:CINE_SLOTS[locale].detail,detailLocator:{blockId:'det-locator',region:{...SUBJECT}}}),display:'crop',aspect:1},
  {id:'locator',blockId:'det-locator',brief:brief({safeRegion:{x:0,y:0,width:1,height:1},subjectBounds:{...SUBJECT},visibleCaption:CINE_SLOTS[locale].locator}),display:'contain',aspect:4/3}],
 'product-center':[{id:'evidence',blockId:'pc-image',brief:brief({role:'product-screenshot',factual:true,sourceId:'src-product',safeRegion:{x:0,y:0,width:1,height:1}}),display:'contain',aspect:4/3}]
});
const CROPS={product:[{blockId:'prod-image',x:.2,y:.1,width:.6,height:.8}],detail:[{blockId:'det-hero',x:0,y:.25,width:1,height:.5},{blockId:'det-locator',x:0,y:0,width:1,height:1}],'product-center':[{blockId:'pc-image',x:0,y:0,width:1,height:1}]};
export const CINE_SCENES=Object.freeze({
 'context':{intent:{purpose:'explain',entry:'left'},media:[{blockId:'ctx-image',role:'context'}],references:{mode:'compact'}},
 'product':{intent:{purpose:'show-product',entry:'left'},media:[{blockId:'prod-image',role:'hero'}],references:{mode:'compact'},imageSlots:slotsOf('en').product,crops:CROPS.product},
 'product-center':{intent:{purpose:'show-product',entry:'center'},imageSlots:slotsOf('en')['product-center'],crops:CROPS['product-center']},
 'detail':{intent:{purpose:'show-detail',entry:'left'},media:[{blockId:'det-hero',role:'hero'},{blockId:'det-locator',role:'supporting'}],imageSlots:slotsOf('en').detail,crops:CROPS.detail},
 'mechanism':{intent:{purpose:'explain',entry:'left'},media:[{blockId:'mech-diagram',role:'mechanism'}]},
 'evidence':{intent:{purpose:'evidence',entry:'left'},references:{mode:'compact'}},
 'quote':{references:{mode:'compact'}},
 'overflow':{references:{mode:'compact'}},
 'long-heading':{intent:{purpose:'explain',entry:'left'}},
 'action':{intent:{purpose:'chapter',entry:'contextual'}}
});
export const CINE_FIELDS=['references','intent','media','imageSlots','crops'];
/** The per-locale declarations: slots carry a visible caption in the page's language. */
export const cineScenes=locale=>{const out=structuredClone(CINE_SCENES);for(const [id,slots]of Object.entries(slotsOf(locale)))out[id].imageSlots=slots;return out;};
/**
 * The corpus as a visual project with its three assets registered under `home`. `declared` lists which of the batch 1 fields
 * to merge from CINE_SCENES (default: all three); `[]` gives the legacy project the JSON holds.
 */
export async function cineProject(locale,home,{declared=CINE_FIELDS,...options}={}){
 const {document,plan,assets}=await cineFixture(locale);
 for(const [i,file] of CINE_ASSET_FILES.entries())await registerAsset(home,await readFile(new URL(`fixtures/visual/assets/${file}`,import.meta.url)),assets[i]);
 const declaredScenes=cineScenes(locale);for(const scene of plan.scenes)for(const field of declared){const value=declaredScenes[scene.id]?.[field];if(value)scene[field]=structuredClone(value);}
 return createVisualProject(document,plan,{assets,id:`cine-${locale.toLowerCase()}`,...options});
}
