import {REVIEW_ATTESTATIONS} from './visual-review.mjs';

/** Display evidence only. Page indices in hostDraft are zero-based; report pages are one-based.
 * Resolve legacy indices against the original draft, never against a reordered current deck.
 * Pixel-control answers and private task/source data are deliberately excluded. */
export function taskEvidence(task,project=task?.project){
 const draft=task?.hostDraft,lines=draft?.hostAuthored||[],scenes=project?.plan?.scenes||[],original=task?.original?.plan?.scenes||task?.project?.plan?.scenes||[];
 const located=lines.map(l=>({...l,sceneId:l.sceneId||original[l.page]?.id}));
 const pages=scenes.flatMap((s,i)=>{const added=located.filter(l=>l.sceneId===s.id).map(l=>l.text);return added.length?[{sceneId:s.id,page:i+1,lines:added}]:[];});
 const total=draft?Math.max(draft.hostAuthoredLines??lines.length,lines.length):null;
 const review=task?.receipt?.review;
 return {hostAuthored:{total,pages,unlocated:total===null?0:total-pages.reduce((n,p)=>n+p.lines.length,0)},review:{attestation:REVIEW_ATTESTATIONS.includes(review?.attestation)?review.attestation:'unattested',verdict:review?.verdict||null,controls:review?.controls?.summary?{hits:review.controls.summary.hits,total:review.controls.summary.total}:null}};
}

const cell=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','\\|').replaceAll('`','&#96;').replace(/[\r\n]/g,' ');
/** A summary accompanies an export; it does not turn a declaration into visual acceptance. */
export function evidenceMarkdown(e){
 const {hostAuthored:h,review:r}=e;
 return ['## Source and review evidence','',`| Host-added lines | ${h.total??'not recorded'} |`,'|---|---|',
  ...h.pages.map(p=>`| Page ${p.page} (${cell(p.sceneId)}) | ${p.lines.length} |`),...(h.unlocated?[`| Page location unavailable | ${h.unlocated} |`]:[]),
  `| Review attestation | ${r.attestation} |`,`| Review verdict | ${r.verdict??'not reviewed'} |`,`| Pixel controls (hits/total) | ${r.controls?`${r.controls.hits}/${r.controls.total}`:'not run'} |`,'',
  'Host-added lines are unverified; the author must check them. Attestation describes the review evidence, not whether its judgment is correct.',''].join('\n');
}
