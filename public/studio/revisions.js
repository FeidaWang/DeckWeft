import {renderEvidence} from './evidence.js';
import {t,getLocale} from '../i18n.js';
export function revisionScope(project,active,scope){if(!project)throw Error('Generate or choose a saved source first.');return scope==='page'?[active]:project.plan.scenes.map(s=>s.id);}
export function renderProgress(root,record){
 const output=root.querySelector('#workbenchProgress');output.dataset.status=record.status;
 const labels={running:'visual.revisions.status.running',planned:'visual.revisions.status.planned','browser-capture':'visual.revisions.status.browserCapture','actual-image-review':'visual.revisions.status.actualImageReview',exported:'visual.revisions.status.exported',blocked:'visual.revisions.status.blocked',cancelled:'visual.revisions.status.cancelled','quality-repair':'visual.revisions.status.qualityRepair','review-required':'visual.revisions.status.reviewRequired'};
 output.textContent=t(labels[record.running?'running':record.status]||'visual.revisions.status.other');
 root.querySelector('#workbenchDiagnostics').textContent=record.error?.message||record.diagnostics?.at(-1)?.message||record.receipt?.review?.judgment||'';
 renderEvidence(root.querySelector('#workbenchEvidence'),record.evidence);
 root.querySelector('#workbenchLastValid').disabled=!record.hasLastValid;root.querySelector('#workbenchCancel').disabled=!record.running;
 // S9b: the page plan of the drafted deck, the same for the local and the Codex path; DeckWeft asks instead of padding.
 const plan=record.pagePlan,box=root.querySelector('#workbenchPagePlan');box.replaceChildren();
 if(plan){const head=document.createElement('p');head.textContent=t('visual.revisions.pagePlan',{detail:t('visual.author.detail.'+plan.detail),draftedPages:plan.draftedPages,proposedPages:plan.proposedPages,target:plan.targetPages?t('visual.revisions.pagePlanTarget',{targetPages:plan.targetPages}):''});box.append(head);if(plan.questions.length){const list=document.createElement('ol');for(const q of plan.questions){const li=document.createElement('li');li.textContent=getLocale()==='zh-CN'?q.zh:q.en;list.append(li);}box.append(list);}}
 root.querySelector('#workbenchEvents').textContent=(record.events||[]).slice(-8).map(e=>e.tool+' · '+e.status).join('\n');
}
