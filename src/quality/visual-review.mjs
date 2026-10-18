import {contentHash} from '../scene/web/compile.mjs';
import {qualityBasis} from './render-checks.mjs';
export function createQualityReceipt(project,observation,checks,captures) {
 const basis=qualityBasis(project,observation);
 return {format:'deckweft-quality-receipt',version:1,basis,captures,checks,review:null,status:checks.ok?'awaiting-visual-review':'failed',id:contentHash({basis,captures,checks})};
}
export function receiptCurrent(receipt,project,observation,captures=receipt.captures) {
 return receipt.basis===qualityBasis(project,observation)&&receipt.id===contentHash({basis:receipt.basis,captures,checks:receipt.checks});
}
/** A human/model attestation is explicit evidence, never inferred from hashes or DOM. */
export function recordVisualReview(receipt,{receiptId,reviewer,delivery,images,judgment,issues=[],verdict}) {
 if(receiptId!==receipt.id||!reviewer?.trim()||!delivery?.trim()||!judgment?.trim()||!['pass','fail'].includes(verdict))throw Error('Supply the current receipt id, reviewer, actual image-delivery record, judgment and verdict.');
 if(!Array.isArray(images)||!receipt.captures.length||receipt.captures.filter(c=>c.reviewRequired!==false).some(c=>!images.includes(c.file)))throw Error('Actually inspect every receipt image, marked for review, including full stories and representative components.');
 for(const i of issues)if(!i.sceneId||!i.nodeId||!i.bounds||!['error','warning'].includes(i.severity)||!i.reason||!i.suggestion)throw Error('Visual issues require stable scene/node identity, bounds, severity, reason and suggestion.');
 return {...receipt,review:{reviewer,delivery,images,judgment,issues,verdict},status:receipt.checks.ok&&verdict==='pass'&&!issues.some(i=>i.severity==='error')?'passed':'failed'};
}
