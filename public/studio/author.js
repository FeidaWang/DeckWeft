import {renderEvidence} from './evidence.js';
import {t,tFor} from '../i18n.js';
// Author controls for the visual kind: three directions, the Look buttons (more space, leave this page), chapters from the
// page menu, saved looks and the PowerPoint / PDF part of Take away. Every change is planned on the server and applied
// through the Studio's single edit path at once, so Undo, autosave, conflicts and History work unchanged; the plan's own
// statement of what changed and what a lock kept is shown after it.
export function mountAuthor({state,json,api,apply,download,error,message,x,workbench,save,dialogs,pageKept,sceneLock,status}){
 const $=s=>document.querySelector(s),pick=(en,zh)=>state.ui==='zh-CN'?zh:en,say=v=>v?pick(v.en,v.zh):'';
 let directions=null,captureAvailable=false,exportFormat=null;
 const unitWords={question:'visual.author.question',background:'visual.author.background',mechanism:'visual.author.mechanism',evidence:'visual.author.evidence',limits:'visual.author.limits',action:'visual.author.action'};
 function planHTML(p){if(!p)return '';const units=Object.keys(unitWords).map(u=>`<li class="${p.present.includes(u)?'present':p.missing.includes(u)?'missing':''}">${x(t(unitWords[u]))}${p.present.includes(u)?' ✓':p.missing.includes(u)?' · '+x(t('visual.author.missing')):''}</li>`).join('');
  return `<p>${x(t('visual.author.argumentUnits',{detail:t('visual.author.detail.'+p.detail),proposedPages:p.proposedPages,suppliedPages:p.suppliedPages}))}</p><ul class="units">${units}</ul>${p.questions.length?`<ol class="plan-questions">${p.questions.map(q=>`<li>${x(say(q))}</li>`).join('')}</ol>`:''}<p class="hint">${x(t('visual.author.deckweftNeverInventsDataOrQuotations'))}</p>`;}
 // ---- Three directions for the open deck, at the chosen detail; the same card as the layout choices ----
 async function showDirections(){
  if(!state.project)throw Error(t('visual.author.openADeckFirst'));
  if((state.dirty||state.drafts.size)&&!await save())return;
  $('#entryDirections').disabled=true;$('#entryStatus').textContent=t('visual.author.drawingTheSameContentThreeWays');
  const counter=state.counter,answers={topic:'',audience:state.project.document.visualBrief?.audience||'',detail:state.detail};
  try{
   const r=await json('/api/visual/directions',{answers,project:state.project});if(counter!==state.counter)return;
   directions={...r,counter};
   $('#directionFacts').textContent=t('visual.author.factsIdentical',{hash:r.factsHash.slice(0,12),action:t('visual.author.applyToThisDeck')});
   $('#entryPagePlan').innerHTML=planHTML(r.pagePlan);
   $('#directionCards').innerHTML=r.sets.map((s,k)=>{const e=s.explanation;return `<div class="candidate-cell direction-card" data-direction="${k}"><button type="button" class="candidate" data-use-direction="${k}" disabled title="${x(say(e.why))}"><span class="candidate-picture" aria-hidden="true"><iframe title="${x(t('visual.author.direction')+(k+1))}" sandbox="allow-scripts" tabindex="-1" src="${x(s.artifactUrl)}#scene=${encodeURIComponent(e.samples[0])}"></iframe></span><span class="candidate-label"><span>${k+1} · ${x(say(e.title))}</span></span></button><p class="candidate-fit" role="status">${x(t('visual.author.measuringFontsAndLayout'))}</p><details class="direction-explain"><summary>${x(t('visual.author.why'))}</summary><p class="direction-why">${x(say(e.why))}</p><dl>${['graphics','type','media','motion','output'].map(k2=>`<dt>${x(t('visual.author.explain.'+k2))}</dt><dd>${x(say(e[k2]))}</dd>`).join('')}</dl></details></div>`;}).join('');
   dispatchEvent(new Event('resize'));$('#entryStatus').textContent=t('visual.author.threeDirectionsAreOnTheStage');
  }finally{$('#entryDirections').disabled=false;}
 }
 function drawDirectionFit(k){const s=directions.sets[k],card=$(`[data-direction="${k}"]`),fits=s.fits;if(!card||!fits)return;
  const hard=fits.map((f,i)=>({i,r:f.reasons.filter(r=>!/presentation budget/.test(r))})).filter(v=>v.r.length),tall=fits.map((f,i)=>({i,h:Math.ceil(f.height)})).filter(v=>v.h>900);
  card.querySelector('.candidate-fit').textContent=hard.length?t('visual.author.doesNotFit')+hard.map(v=>t('visual.author.page2')+(v.i+1)+t('visual.author.text')+' — '+v.r.join(', ')).join('; '):t('visual.author.fitsAllPagesAt1440Px',{fitsCount:fits.length})+(tall.length?t('visual.author.tallerThanThe900PxCandidate',{tall:tall.map(v=>v.i+1).join(', '),tall2:tall.map(v=>v.i+1).join('、')}):'');
  const b=card.querySelector('[data-use-direction]');b.disabled=!!hard.length;b.classList.toggle('unfit',!!hard.length);}
 addEventListener('message',async e=>{const current=directions;if(!current)return;const k=[...document.querySelectorAll('.direction-card iframe')].findIndex(f=>f.contentWindow===e.source);if(k<0||e.data?.type!=='deckweft:web-fit'||e.data.fit?.renderHash!==current.sets[k].renderHash)return;
  try{const r=await json('/api/visual/candidate-measure',{ticket:current.sets[k].ticket,fit:e.data.fit});if(current!==directions)return;current.sets[k].fits=r.fits;drawDirectionFit(k);}catch(err){error(err);}});
 $('#directionCards').addEventListener('click',async e=>{
  const use=e.target.closest('[data-use-direction]');if(!use||use.disabled||!directions)return;const k=Number(use.dataset.useDirection);
  try{if(state.counter!==directions.counter)throw Error(t('visual.author.theDeckChangedShowTheDirections'));const r=await json('/api/visual/select-direction',{project:state.project,tickets:directions.sets.map(s=>s.ticket),index:k});apply(r.project);message(t('visual.author.directionAppliedToEveryPageUndo',{k:k+1})+(r.overBudget.length?t('visual.author.pageSAreTallerThanThe',{rCount:r.overBudget.length}):''));clearDirections();}
  catch(err){error(err);}
 });
 function clearDirections(){directions=null;$('#directionCards').replaceChildren();$('#directionFacts').textContent='';$('#entryPagePlan').replaceChildren();$('#entryStatus').textContent='';}
 $('#entryDirections').onclick=()=>showDirections().catch(err=>{error(err);$('#entryStatus').textContent=err.message;});
 // ---- Planned author actions, applied at once ----
 const page=()=>state.project?.plan.scenes.find(s=>s.id===state.active);
 const chapterOf=id=>{const p=state.project.plan,starts=new Set((p.chapters||[]).map(c=>c.startSceneId));let current=null;for(const s of p.scenes){if(starts.has(s.id))current=p.chapters.find(c=>c.startSceneId===s.id);if(s.id===id)return current;}return null;};
 function showPlan(title,{scopeStatement,effects,kept}){
  $('#actionTitle').textContent=title;$('#actionScope').textContent=say(scopeStatement);
  $('#actionEffects').innerHTML=effects.map(v=>`<li>${x(say(v))}</li>`).join('')||`<li>${x(t('visual.author.noChange'))}</li>`;
  $('#actionKept').innerHTML=kept.map(v=>`<li>${x(say(v))}</li>`).join('');$('#actionPlan').hidden=false;
 }
 async function act(action,{level,id,options={}},title){
  if(!state.project)throw Error(t('visual.author.openADeckFirst'));if(state.drafts.size)throw Error(t('visual.author.repairUnappliedFieldEditsFirst'));
  $('#actionPlan').hidden=true;const counter=state.counter,plan=await json('/api/visual/author-action',{project:state.project,action,level,id,options});
  if(counter!==state.counter)throw Error(t('visual.author.theDeckChangedAfterThisPlan'));
  if(plan.changed)apply(plan.project);showPlan(title,plan);return plan;
 }
 $('#moreSpace').onclick=()=>act('more-editorial',{level:'page',id:state.active},$('#moreSpace').textContent).catch(error);
 // CINE-004: the primary image or diagram gets the layout that draws it largest, its role stated, supporting text behind the disclosure.
 $('#visualSpace').onclick=()=>act('visual-space',{level:'page',id:state.active},$('#visualSpace').textContent).catch(error);
 // CINE-003: Page purpose and Entry post one planned set-intent; Automatic clears the declaration so the page is inferred again.
 const setIntent=()=>{const purpose=$('#pagePurpose').value||null,entry=$('#pageEntry').value||undefined;return act('set-intent',{level:'page',id:state.active,options:purpose?{purpose,...(entry?{entry}:{})}:{purpose:null}},t('visual.look.purpose')).catch(err=>{error(err);drawControls();});};
 $('#pagePurpose').onchange=setIntent;$('#pageEntry').onchange=()=>{if($('#pagePurpose').value)setIntent();};
 // Lock this page: the four author locks (data, sources, text, composition) through the same planned action, plus the page's
 // theme and motion, so nothing on it changes until it is released. Pressed again, the same five come off.
 async function keepPage(){
  if(!state.project)return;if(state.drafts.size)throw Error(t('visual.author.repairUnappliedFieldEditsFirst'));
  $('#actionPlan').hidden=true;const s=page(),on=!pageKept(s),counter=state.counter,effects=[],kept=[];let project=state.project,scopeStatement=null;
  // Data and sources first: in combined mode a text lock would already cover them and the separate data lock would never be stated.
  for(const kind of ['data','sources','text','composition']){const plan=await json('/api/visual/author-action',{project,action:on?'lock':'unlock',level:'page',id:s.id,options:{kind}});if(plan.changed)project=plan.project;effects.push(...plan.effects);kept.push(...plan.kept);scopeStatement??=plan.scopeStatement;}
  if(counter!==state.counter)throw Error(t('visual.author.theDeckChangedAfterThisPlan'));
  project=structuredClone(project);const o=project.document.authorOverrides,held=['theme','interactions','cues','motion'];o.sceneLocks??=[];let lock=o.sceneLocks.find(l=>l.sceneId===s.id);
  if(on){if(!lock){lock={sceneId:s.id,fields:[]};o.sceneLocks.push(lock);}for(const f of held)if(!lock.fields.includes(f))lock.fields.push(f);}
  else if(lock){lock.fields=lock.fields.filter(f=>!held.includes(f));o.sceneLocks=o.sceneLocks.filter(l=>l.fields.length);}
  const key=on?'visual.look.holdsColours':'visual.look.releasesColours';effects.push({en:tFor('en')(key),zh:tFor('zh-CN')(key)});
  apply(project);showPlan($('#keepPage').textContent,{scopeStatement,effects,kept});
 }
 $('#keepPage').onclick=()=>keepPage().catch(error);
 // Chapters live on the page strip's menu.
 function pageMenu(id){
  if(!state.project)return [];const starts=(state.project.plan.chapters||[]).some(c=>c.startSceneId===id),chapter=chapterOf(id);
  const run=(action,scope)=>async()=>{if(state.active!==id)document.querySelector(`#slideList [data-slide="${CSS.escape(id)}"]`)?.click();try{await act(action,scope,t(action==='start-chapter'?'visual.authorControls.10':'visual.authorControls.11'));}catch(err){error(err);}};
  return [{label:t('visual.authorControls.10'),disabled:starts||!!sceneLock(state.project.plan.scenes.find(s=>s.id===id)).includes('composition'),run:run('start-chapter',{level:'page',id})},{label:t('visual.authorControls.11'),disabled:!chapter,run:run('remove-chapter',{level:'chapter',id:chapter?.id})}];
 }
 const excerpt=b=>{const v=b.text||b.label||b.alt||(b.items||[]).join(' · ')||b.chartType||'';return [...v].length>34?[...v].slice(0,33).join('')+'…':v;};
 function drawControls(){
  workbench.scopeStatement?.();
  const p=state.project,s=page();if(!p||!s)return;
  $('#visualSpace').disabled=!s.blockIds.some(id=>['image','diagram'].includes(p.document.blocks.find(b=>b.id===id)?.type));
  $('#pagePurpose').value=s.intent?.purpose||'';$('#pageEntry').value=s.intent?.entry||'';$('#pageEntry').disabled=!s.intent;for(const el of [$('#pagePurpose'),$('#pageEntry')])el.toggleAttribute('data-locked',sceneLock(s).includes('intent'));const ch=chapterOf(s.id),objects=s.blockIds.map(id=>p.document.blocks.find(b=>b.id===id));
  const o=p.document.authorOverrides,locks=[[o.lockedBlockIds.filter(id=>s.blockIds.includes(id)).length,'text'],[(o.lockedDatasetIds||[]).filter(d=>objects.some(b=>b.datasetId===d)).length,'data'],[(o.lockedSourceIds||[]).filter(v=>objects.some(b=>b.sourceIds.includes(v))).length,'sources'],[sceneLock(s).includes('composition')?1:0,'composition']];
  $('#lockSummary').textContent=t('visual.author.thisPageLocks',{locks:locks.map(l=>t('visual.author.lockItem',{count:l[0],word:t('visual.author.lock.'+l[1])})).join(t('visual.author.listJoiner')),mode:t(o.lockMode==='separate'?'visual.author.lockMode.separate':'visual.author.lockMode.combined'),chapter:ch?t('visual.author.chapterId',{id:ch.id}):''})+(objects.length?' · '+objects.map(b=>b.type+' '+excerpt(b)).join(' · '):'');
 }
 // ---- Saved looks (design profiles) ----
 async function profiles(){const r=await json('/api/visual/profiles',undefined,'GET'),keep=$('#profileList').value;$('#profileList').replaceChildren(...r.profiles.map(p=>new Option(`${p.name} · ${p.theme}`,p.id)));if(r.profiles.some(p=>p.id===keep))$('#profileList').value=keep;$('#profileApply').disabled=!r.profiles.length;return r.profiles;}
 $('#profileSave').onclick=async()=>{try{if(!state.project)throw Error(t('visual.author.openADeckFirst'));if((state.dirty||state.drafts.size)&&!await save())return;const r=await json('/api/visual/profiles',{project:state.project,name:$('#profileName').value,attest:$('#profileAttest').checked});await profiles();$('#profileList').value=r.profile.id;message(t('visual.author.profileSaved',{name:r.profile.name,origin:t(r.profile.acceptance.kind==='workbench-review'?'visual.author.profileOrigin.review':'visual.author.profileOrigin.accepted'),count:r.profile.compositions.length}));}catch(err){error(err);}};
 $('#profileApply').onclick=async()=>{try{const profileId=$('#profileList').value;if(!profileId)throw Error(t('visual.author.saveOrImportAProfileFirst'));const plan=await act('apply-profile',{level:'deck',id:null,options:{profileId}},$('#profileApply').textContent);message(plan.effects.map(say).join(' ')||t('visual.author.noChange'));}catch(err){error(err);}};
 $('#profileExport').onclick=async()=>{try{const id=$('#profileList').value;if(!id)throw Error(t('visual.author.chooseAProfile'));download(await(await api('/api/visual/profiles/'+id,undefined,'GET')).blob(),id+'.design-profile.json');}catch(err){error(err);}};
 $('#profileImport').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>200000)throw Error(t('visual.author.chooseAProfileSmallerThan200'));const r=await json('/api/visual/profiles/import',{profile:JSON.parse(await file.text())});await profiles();$('#profileList').value=r.profile.id;message(t(r.copied?'visual.author.profileImportedCopy':'visual.author.profileImported'));}catch(err){error(err);}finally{e.target.value='';}};
 // The session token arrives after mount, so the list loads when the author opens these controls.
 $('#saveLook').addEventListener('toggle',()=>{if($('#saveLook').open)profiles().catch(error);});
 // ---- Take away, PowerPoint and PDF (F1): the paging option, the typography result in yellow with every failure when the
 // file is refused for text size, and the author's explicit acceptance. An accepted export is recorded with its time and
 // stays yellow: acceptance never turns the result green. HTML and Present need no options and run at once.
 const roleWord={title:'visual.author.title',body:'visual.author.body',annotation:'visual.author.annotation'};
 function exportStatus(value,text,{acceptedAt}={}){const s=$('#exportStatus');s.dataset.status=value;s.textContent=text;if(acceptedAt)s.dataset.acceptedAt=acceptedAt;else delete s.dataset.acceptedAt;}
 function typographyList(failures){const ul=$('#exportTypography'),shown=failures.slice(0,40);
  ul.innerHTML=shown.map(f=>`<li>${x(t('visual.author.pagePtNeedsPt',{page:f.sceneId,role:f.role in roleWord?t(roleWord[f.role]):f.role,actualPt:f.actualPt,requiredPt:f.requiredPt,name:f.name}))}</li>`).join('')+(failures.length>shown.length?`<li>${x(t('visual.author.andMore',{failuresCount:failures.length-shown.length}))}</li>`:'');
  ul.hidden=!failures.length;}
 function reset(){exportStatus('idle','');typographyList([]);$('#exportAcceptField').hidden=true;$('#exportAccept').checked=false;$('#exportRun').disabled=false;}
 function exportOpened(){exportFormat=null;$('#exportOptions').hidden=true;reset();renderEvidence($('#exportEvidence'),state.taskEvidence);status();}
 function selectFormat(format){exportFormat=format;$('#exportOptions').hidden=false;$('#exportPaginateField').hidden=format!=='pptx';reset();status();$('#exportRun').focus();}
 async function runExport(){
  const format=exportFormat;if(!format)return;const paginate=$('#exportPaginate').value,accept=!$('#exportAcceptField').hidden&&$('#exportAccept').checked,name=format==='pptx'?'PowerPoint':'PDF';
  $('#exportRun').disabled=true;exportStatus('running',t('visual.author.measuringTheStaticSceneAndCompiling'));
  try{
   const r=await api('/api/visual/export',{project:state.project,format,ticket:state.render?.ticket,paginate,...(accept?{acceptTypography:true}:{})});
   download(await r.blob(),'deckweft-visual.'+format);
   const ty=JSON.parse(r.headers.get('X-DeckWeft-Typography')||'null'),summary=t('visual.author.exportedThrough',{name,order:r.headers.get('X-DeckWeft-Export-Order'),levels:r.headers.get('X-DeckWeft-Levels'),receipts:r.headers.get('X-DeckWeft-Receipts')});
   $('#exportAcceptField').hidden=true;
   if(ty?.acceptedBy)exportStatus('accepted',t('visual.author.exportedWithTextSizeSBelow',{ty:ty.failures,ty2:ty.acceptedAt,summary}),{acceptedAt:ty.acceptedAt});
   else{typographyList([]);exportStatus('pass',summary+(ty?.pagination?t('visual.author.tallPageSWereSplitInto',{ty:ty.pagination}):''));}
  }catch(e){
   const typography=e.code==='EXPORT_CHECK_FAILED'&&Array.isArray(e.details)&&e.details.length&&e.details.every(d=>d.check==='typography')?e.details[0].failures:null;
   if(typography){typographyList(typography);$('#exportAcceptField').hidden=false;$('#exportAccept').checked=false;
    exportStatus('fail',t('visual.author.textSizesBelowMinimum',{count:typography.length,advice:t(paginate==='none'?'visual.author.sizeAdvice.split':'visual.author.sizeAdvice.shorten')}));}
   else{typographyList([]);$('#exportAcceptField').hidden=true;exportStatus('error',e.code==='EXPORT_CHECK_FAILED'&&Array.isArray(e.details)?`${e.message} (${e.details.map(d=>d.check).join(', ')})`:e.message);error(e);}
  }finally{$('#exportRun').disabled=false;}
 }
 $('#exportRun').onclick=()=>runExport();
 json('/api/visual/workbench-capabilities',undefined,'GET').then(c=>{captureAvailable=c.captureAvailable;status();}).catch(error);
 function localize(){if(directions)for(const k of directions.sets.keys())drawDirectionFit(k);drawControls();}
 return {drawControls,profiles,showDirections,pageMenu,exportOpened,selectFormat,localize,captureAvailable:()=>captureAvailable,format:()=>exportFormat};
}
