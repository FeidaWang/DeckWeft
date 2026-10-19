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
/** What a review proves (F5): `unattested` (nobody said who looked; the default), `author` (the submitter states a person looked), `host-metadata-only` (a host answered with hash-matching findings) or `host-pixel-control` (every placed pixel tag was read back, so visual information reached the answer). None proves the judgment right. */
export const REVIEW_ATTESTATIONS=['unattested','author','host-metadata-only','host-pixel-control'];
/** The attestations a review submitted as tool arguments may claim. Host attestations come only from reviewWithHost in this process. */
export const CALLER_ATTESTATIONS=['unattested','author'];
export function recordVisualReview(receipt,{receiptId,reviewer,delivery,images,judgment,issues=[],verdict,attestation='unattested',controls}) {
 if(!REVIEW_ATTESTATIONS.includes(attestation))throw Error('Use a known review attestation: '+REVIEW_ATTESTATIONS.join(', ')+'.');
 if(attestation==='host-pixel-control'&&!(controls?.summary?.total>0&&controls.summary.hits===controls.summary.total))throw Error('The host-pixel-control attestation needs a pixel control with every tag read back.');
 if(receiptId!==receipt.id||!reviewer?.trim()||!delivery?.trim()||!judgment?.trim()||!['pass','fail'].includes(verdict))throw Error('Supply the current receipt id, reviewer, actual image-delivery record, judgment and verdict.');
 if(!Array.isArray(images)||!receipt.captures.length||receipt.captures.filter(c=>c.reviewRequired!==false).some(c=>!images.includes(c.file)))throw Error('Actually inspect every receipt image, marked for review, including full stories and representative components.');
 for(const i of issues)if(!i.sceneId||!i.nodeId||!i.bounds||!['error','warning'].includes(i.severity)||!i.reason||!i.suggestion)throw Error('Visual issues require stable scene/node identity, bounds, severity, reason and suggestion.');
 return {...receipt,review:{reviewer,delivery,images,judgment,issues,verdict,attestation,...(controls?{controls}:{})},status:receipt.checks.ok&&verdict==='pass'&&!issues.some(i=>i.severity==='error')?'passed':'failed'};
}
