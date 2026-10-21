import {t} from '../i18n.js';
// DWI-022: Add material → Review story → Make slides. The outline comes from the chosen files through /api/visual/story/propose;
// nothing is composed until "Make slides". Approval saves a new deck; the deck that was open stays in the library unchanged.
const DIRECTION_KEYS={editorial:'visual.story.directionEditorial',report:'visual.story.directionReport',stage:'visual.story.directionStage'};
const STATUS_KEYS={'from-material':'visual.story.statusMaterial','evidence-required':'visual.story.statusEvidence',contradiction:'visual.story.statusContradiction'};
const REFUSALS={INTAKE_PDF:'visual.intake.INTAKE_PDF',INTAKE_PDF_ENCRYPTED:'visual.intake.INTAKE_PDF_ENCRYPTED',INTAKE_OFFICE:'visual.intake.INTAKE_OFFICE',INTAKE_IMAGE:'visual.intake.INTAKE_IMAGE',INTAKE_BINARY:'visual.intake.INTAKE_BINARY',INTAKE_EMPTY:'visual.intake.INTAKE_EMPTY',INTAKE_TOO_LARGE:'visual.intake.INTAKE_TOO_LARGE',INTAKE_TOTAL_TOO_LARGE:'visual.intake.INTAKE_TOTAL_TOO_LARGE',INTAKE_TOO_MANY:'visual.intake.INTAKE_TOO_MANY',INTAKE_SOURCE_LIMIT:'visual.intake.INTAKE_SOURCE_LIMIT'};
const base64=async file=>{const bytes=new Uint8Array(await file.arrayBuffer());let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out);};
export function mountStory({state,json,activate,leave,error,dialogs}){
 const $=s=>document.querySelector(s);let review=null;
 // dataset is a read-only property: copy its entries instead of assigning it.
 const el=(tag,{dataset={},...props}={},...children)=>{const n=Object.assign(document.createElement(tag),props);Object.assign(n.dataset,dataset);n.append(...children);return n;};
 function draw(){
  $('#storyAudience').value=review.audience;$('#storyOutcome').value=review.outcome;
  $('#storyPages').replaceChildren(...review.pages.map(p=>el('li',{className:'story-page',dataset:{page:p.id}},
   el('div',{className:'story-page-head'},el('input',{className:'story-heading',value:p.heading,maxLength:120,dataset:{page:p.id}}),el('span',{className:'story-status '+p.status,textContent:t(STATUS_KEYS[p.status])}),el('label',{className:'check story-keep'},el('input',{type:'checkbox',checked:!p.dropped,dataset:{keepPage:p.id}}),el('span',{textContent:t('visual.story.keepPage')}))),
   el('ul',{className:'story-points'},...p.points.map((x,i)=>el('li',{},el('label',{className:'check'},el('input',{type:'checkbox',checked:!x.dropped,dataset:{page:p.id,point:String(i)}}),el('span',{textContent:x.text})),el('small',{textContent:x.locator+(x.contradicted?' · '+t('visual.story.statusContradiction'):'')})))),
   ...(p.long?[el('p',{className:'hint',textContent:t('visual.story.long')})]:[]))));
  $('#storyRefused').replaceChildren(...review.refused.map(d=>el('li',{textContent:`${d.name}: ${REFUSALS[d.refusal]?t(REFUSALS[d.refusal]):d.recovery}`})));$('#storyRefused').hidden=!review.refused.length;
  const conflicts=review.ledger.contradictions;
  $('#storyConflicts').replaceChildren(...(conflicts.length?[el('p',{textContent:t('visual.story.conflicts',{count:conflicts.length})}),el('ul',{},...conflicts.map(x=>el('li',{textContent:x.claims.map(c=>`${c.values.join(' / ')} (${c.locator})`).join(' ≠ ')})))]:[]));
  $('#storyDirections').replaceChildren(...review.directions.map((d,i)=>el('label',{className:'check'},el('input',{type:'radio',name:'storyDirection',value:String(i),checked:i===0}),el('span',{textContent:t(DIRECTION_KEYS[d.group])}))));
 }
 function edits(){
  return {audience:$('#storyAudience').value,outcome:$('#storyOutcome').value,pages:review.pages.map(p=>({id:p.id,heading:document.querySelector(`.story-heading[data-page="${p.id}"]`).value,dropped:!document.querySelector(`[data-keep-page="${p.id}"]`).checked,dropPoints:p.points.map((_,i)=>i).filter(i=>!document.querySelector(`[data-page="${p.id}"][data-point="${i}"]`).checked)}))};
 }
 $('#storyReview').onclick=async()=>{
  try{const files=[...$('#workbenchSource').files];if(!files.length)throw Error(t('visual.story.addMaterial'));
   const r=await json('/api/visual/story/propose',{documents:await Promise.all(files.map(async f=>({name:f.name,base64:await base64(f)}))),audience:$('#audience').value,outcome:'',locale:state.ui==='zh-CN'?'zh-CN':'en'});
   review=r.review;draw();dialogs.open($('#storyDialog'));}catch(e){error(e);}
 };
 $('#storyClose').onclick=$('#storyCancel').onclick=()=>$('#storyDialog').close();
 $('#storyForm').onsubmit=async e=>{e.preventDefault();
  try{if(!await leave())return;const edited=(await json('/api/visual/story/edit',{review,edits:edits()})).review,direction=Number(new FormData($('#storyForm')).get('storyDirection')||0);
   const {project}=await json('/api/visual/story/approve',{review:edited,direction});$('#storyDialog').close();activate(project);}catch(err){error(err);}
 };
}
