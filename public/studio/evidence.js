import {t} from '../i18n.js';
/** Render task evidence as text, including host-authored content. Never interpret it as HTML. */
export function renderEvidence(box,evidence){
 const h=evidence?.hostAuthored,r=evidence?.review||{attestation:'unattested',verdict:null,controls:null};
 const count=h?.total??t('visual.evidence.notRecorded'),pages=(h?.pages||[]).map(p=>t('visual.evidence.pageLines',{page:p.page,sceneId:p.sceneId,lines:p.lines.length}));
 box.textContent=t('visual.evidence.hostAddedLines',{count,pages:pages.length?' · '+pages.join(t('visual.evidence.pageJoiner')):'',unlocated:h?.unlocated?t('visual.evidence.unlocated',{count:h.unlocated}):'',attestation:r.attestation,verdict:r.verdict||t('visual.evidence.notReviewed'),controls:r.controls?`${r.controls.hits}/${r.controls.total}`:t('visual.evidence.notRun')});
}
export function renderAddedLines(box,page){
 box.replaceChildren();box.hidden=!page?.lines.length;if(box.hidden)return;
 const label=document.createElement('p'),list=document.createElement('ul');label.textContent=t('visual.evidence.addedLinesLabel',{count:page.lines.length});
 for(const text of page.lines){const li=document.createElement('li');li.dataset.hostAuthoredLine='';li.textContent=text;list.append(li);}box.append(label,list);
}
