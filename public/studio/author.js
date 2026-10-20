import {renderEvidence} from './evidence.js';
import {t} from '../i18n.js';
// S9a author controls: the six-question entry and three directions, planned author actions, page planning from the argument,
// design profiles, and the PowerPoint / PDF / JSON export buttons. Every change is planned on the server, stated here, and
// applied through the Studio's single edit path, so Undo, Save, conflicts and History work unchanged.
export function mountAuthor({state,json,api,apply,download,error,message,x,workbench,save}){
 const $=s=>document.querySelector(s),pick=(en,zh)=>state.ui==='zh-CN'?zh:en,say=v=>v?pick(v.en,v.zh):'';
 let directions=null,plan=null,planCounter=-1,pagePlan=null,captureAvailable=false;
 // Direction previews are scaled to their card; the cards change width when panels open or close, not only on window resize.
 const cardsResized=new ResizeObserver(()=>dispatchEvent(new Event('resize')));cardsResized.observe($('#directionCards'));
 const answers=()=>({topic:$('#workbenchPrompt').value,audience:$('#entryAudience').value,style:$('#entryStyle').value,detail:$('#entryDetail').value,motion:$('#entryMotion').value,output:$('#entryOutput').value});
 const unitWords={question:'visual.author.question',background:'visual.author.background',mechanism:'visual.author.mechanism',evidence:'visual.author.evidence',limits:'visual.author.limits',action:'visual.author.action'};
 function planHTML(p){if(!p)return '';const units=Object.keys(unitWords).map(u=>`<li class="${p.present.includes(u)?'present':p.missing.includes(u)?'missing':''}">${x(t(unitWords[u]))}${p.present.includes(u)?' ✓':p.missing.includes(u)?' · '+x(t('visual.author.missing')):''}</li>`).join('');
  return `<p>${x(t('visual.author.argumentUnits',{detail:t('visual.author.detail.'+p.detail),proposedPages:p.proposedPages,suppliedPages:p.suppliedPages}))}</p><ul class="units">${units}</ul>${p.questions.length?`<ol class="plan-questions">${p.questions.map(q=>`<li>${x(say(q))}</li>`).join('')}</ol>`:''}<p class="hint">${x(t('visual.author.deckweftNeverInventsDataOrQuotations'))}</p>`;}
 // ---- Three directions ----
 async function showDirections(){
  const a=answers(),deck=$('#entryBasis').value==='deck';
  if(deck&&!state.project)throw Error(t('visual.author.openADeckFirstOrChoose'));
  if(deck&&(state.dirty||state.drafts.size)&&!await save())return;
  if(!deck&&!a.topic.trim())throw Error(t('visual.author.enterTheTopicOrTheText'));
  $('#entryDirections').disabled=true;$('#entryStatus').textContent=t('visual.author.drawingTheSameContentThreeWays');
  const counter=state.counter;
  try{
   const r=await json('/api/visual/directions',{answers:a,...(deck?{project:state.project}:{locale:document.querySelector('[data-preference="outputLanguage"]').value})});
   directions={...r,deck,answers:a,counter};
   $('#directionFacts').textContent=t('visual.author.factsIdentical',{hash:r.factsHash.slice(0,12),action:t(deck?'visual.author.applyToThisDeck':'visual.author.buildTheDeck')});
   $('#entryPagePlan').innerHTML=planHTML(r.pagePlan);
   $('#directionCards').innerHTML=r.sets.map((s,k)=>{const e=s.explanation;return `<article class="direction-card" data-direction="${k}"><h3>${k+1} · ${x(say(e.title))}</h3><p class="direction-why">${x(say(e.why))}</p><div class="candidate-window"><iframe title="${x(t('visual.author.direction')+(k+1))}" sandbox="allow-scripts" src="${s.artifactUrl}#scene=${encodeURIComponent(e.samples[0])}"></iframe></div><div class="sample-pages">${e.samples.map(id=>`<button type="button" data-sample="${x(id)}">${x(t('visual.author.page')+(s.scenes.findIndex(v=>v.sceneId===id)+1)+t('visual.author.text'))}</button>`).join('')}</div><dl class="direction-explain">${[['graphics','Graphics','图形'],['type','Type','字体'],['media','Media','媒体'],['motion','Motion','动效'],['output','Output','输出']].map(([k2])=>`<dt>${x(t('visual.author.explain.'+k2))}</dt><dd>${x(say(e[k2]))}</dd>`).join('')}</dl>${e.kept.length?`<p class="hint">${x(t('visual.author.pageSKeepAnAuthorLocked',{eCount:e.kept.length}))}</p>`:''}<p class="candidate-fit" role="status">${x(t('visual.author.measuringFontsAndLayout'))}</p><button type="button" data-use-direction="${k}" disabled>${x(t('visual.author.useThisDirection'))}</button></article>`;}).join('');
   $('#directionsPanel').open=true;dispatchEvent(new Event('resize'));$('#entryStatus').textContent=t('visual.author.threeDirectionsAreOnTheStage');
  }finally{$('#entryDirections').disabled=false;}
 }
 function drawDirectionFit(k){const s=directions.sets[k],card=$(`[data-direction="${k}"]`),fits=s.fits;if(!card||!fits)return;
  const hard=fits.map((f,i)=>({i,r:f.reasons.filter(r=>!/presentation budget/.test(r))})).filter(v=>v.r.length),tall=fits.map((f,i)=>({i,h:Math.ceil(f.height)})).filter(v=>v.h>900);
  card.querySelector('.candidate-fit').textContent=hard.length?t('visual.author.doesNotFit')+hard.map(v=>t('visual.author.page2')+(v.i+1)+t('visual.author.text')+' — '+v.r.join(', ')).join('; '):t('visual.author.fitsAllPagesAt1440Px',{fitsCount:fits.length})+(tall.length?t('visual.author.tallerThanThe900PxCandidate',{tall:tall.map(v=>v.i+1).join(', '),tall2:tall.map(v=>v.i+1).join('、')}):'');
  card.querySelector('[data-use-direction]').disabled=!!hard.length;}
 addEventListener('message',async e=>{const current=directions;if(!current)return;const k=[...document.querySelectorAll('.direction-card iframe')].findIndex(f=>f.contentWindow===e.source);if(k<0||e.data?.type!=='deckweft:web-fit'||e.data.fit?.renderHash!==current.sets[k].renderHash)return;
  try{const r=await json('/api/visual/candidate-measure',{ticket:current.sets[k].ticket,fit:e.data.fit});if(current!==directions)return;current.sets[k].fits=r.fits;drawDirectionFit(k);}catch(err){error(err);}});
 document.addEventListener('click',async e=>{
  const sample=e.target.closest('[data-sample]');if(sample){sample.closest('.direction-card').querySelector('iframe').contentWindow?.postMessage({type:'deckweft:select',sceneId:sample.dataset.sample},'*');return;}
  const use=e.target.closest('[data-use-direction]');if(!use||!directions)return;const k=Number(use.dataset.useDirection);
  try{
   if(directions.deck){if(state.counter!==directions.counter)throw Error(t('visual.author.theDeckChangedShowTheDirections'));const r=await json('/api/visual/select-direction',{project:state.project,tickets:directions.sets.map(s=>s.ticket),index:k});apply(r.project);message(t('visual.author.directionAppliedToEveryPageUndo',{k:k+1})+(r.overBudget.length?t('visual.author.pageSAreTallerThanThe',{rCount:r.overBudget.length}):''));}
   else await workbench.generate({direction:{answers:directions.answers,index:k}});
  }catch(err){error(err);}
 });
 $('#entryDirections').onclick=()=>showDirections().catch(err=>{error(err);$('#entryStatus').textContent=err.message;});
 // ---- Author actions ----
 const page=()=>state.project?.plan.scenes.find(s=>s.id===state.active);
 const chapterOf=id=>{const p=state.project.plan,starts=new Set((p.chapters||[]).map(c=>c.startSceneId));let current=null;for(const s of p.scenes){if(starts.has(s.id))current=p.chapters.find(c=>c.startSceneId===s.id);if(s.id===id)return current;}return null;};
 const excerpt=b=>{const v=b.text||b.label||b.alt||(b.items||[]).join(' · ')||b.chartType||'';return [...v].length>34?[...v].slice(0,33).join('')+'…':v;};
 function drawControls(){
  workbench.scopeStatement?.();
  const p=state.project,s=page();if(!p||!s)return;const level=$('#actionLevel').value,ch=chapterOf(s.id);
  $('#actionLevel').querySelector('[value="chapter"]').disabled=!ch;if(level==='chapter'&&!ch)$('#actionLevel').value='page';
  const objects=s.blockIds.map(id=>p.document.blocks.find(b=>b.id===id)),keep=$('#actionObject').value;
  $('#actionObject').hidden=$('#actionLevel').value!=='object';$('#actionObject').replaceChildren(...objects.map(b=>new Option(`${b.type} · ${excerpt(b)}`,b.id)));if(objects.some(b=>b.id===keep))$('#actionObject').value=keep;
  const o=p.document.authorOverrides,locks=[[o.lockedBlockIds.filter(id=>s.blockIds.includes(id)).length,'text'],[(o.lockedDatasetIds||[]).filter(d=>objects.some(b=>b.datasetId===d)).length,'data'],[(o.lockedSourceIds||[]).filter(v=>objects.some(b=>b.sourceIds.includes(v))).length,'sources'],[o.sceneLocks?.find(l=>l.sceneId===s.id)?.fields.includes('composition')?1:0,'composition']];
  $('#lockSummary').textContent=t('visual.author.thisPageLocks',{locks:locks.map(l=>t('visual.author.lockItem',{count:l[0],word:t('visual.author.lock.'+l[1])})).join(t('visual.author.listJoiner')),mode:t(o.lockMode==='separate'?'visual.author.lockMode.separate':'visual.author.lockMode.combined'),chapter:ch?t('visual.author.chapterId',{id:ch.id}):''});
  const asset=$('#replaceAsset').value;$('#replaceAsset').replaceChildren(...p.assets.map(a=>new Option(`${a.id} · ${a.alt}`,a.id)));if(p.assets.some(a=>a.id===asset))$('#replaceAsset').value=asset;
 }
 function scopeOf(action){const level=['start-chapter'].includes(action)?'page':action==='remove-chapter'?'chapter':action==='replace-visual'?'object':$('#actionLevel').value,s=page();
  // Replace the visual acts on one image: the chosen object when it is an image, otherwise this page's first image.
  const image=id=>state.project.document.blocks.find(b=>b.id===id)?.type==='image';
  if(action==='replace-visual')return {level,id:$('#actionLevel').value==='object'&&image($('#actionObject').value)?$('#actionObject').value:s.blockIds.find(image)||null};
  return {level,id:level==='deck'?null:level==='chapter'?chapterOf(s.id)?.id:level==='page'?s.id:$('#actionObject').value};}
 async function planAction(button){
  const action=button.dataset.authorAction,p=state.project;if(!p)throw Error(t('visual.author.openADeckFirst'));
  if(state.drafts.size)throw Error(t('visual.author.repairUnappliedFieldEditsFirst'));
  const options={};if(action==='replace-visual'){if($('#replaceFields').hidden){$('#replaceFields').hidden=false;throw Error(t('visual.author.chooseTheNewImageAndDescribe'));}options.assetId=$('#replaceAsset').value;options.alt=$('#replaceAlt').value;}
  if(['lock','unlock'].includes(action))options.kind=$('#lockKind').value;
  if(action==='apply-profile'){options.profileId=$('#profileList').value;if(!options.profileId)throw Error(t('visual.author.saveOrImportAProfileFirst'));}
  const scope=scopeOf(action);if(scope.level!=='deck'&&!scope.id)throw Error(action==='replace-visual'?t('visual.author.thisPageHasNoImageTo'):t('visual.author.chooseTheChapterOrObjectFirst'));
  const counter=state.counter;plan=await json('/api/visual/author-action',{project:p,action,...scope,options});planCounter=counter;
  $('#actionTitle').textContent=button.textContent;$('#actionScope').textContent=say(plan.scopeStatement);
  $('#actionEffects').innerHTML=plan.effects.map(v=>`<li>${x(say(v))}</li>`).join('')||`<li>${x(t('visual.author.noChange'))}</li>`;
  $('#actionKept').innerHTML=plan.kept.map(v=>`<li>${x(say(v))}</li>`).join('');
  $('#actionApply').disabled=!plan.changed;$('#actionPlan').hidden=false;$('#actionPlan').scrollIntoView({block:'nearest'});
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-author-action]');if(b)planAction(b).catch(error);});
 $('#actionApply').onclick=()=>{try{if(!plan?.changed)return;if(planCounter!==state.counter)throw Error(t('visual.author.theDeckChangedAfterThisPlan'));apply(plan.project);message(t('visual.author.appliedAsStatedUndoRestoresThe'));plan=null;$('#actionPlan').hidden=true;$('#replaceFields').hidden=true;}catch(err){error(err);}};
 $('#actionCancel').onclick=()=>{plan=null;$('#actionPlan').hidden=true;$('#replaceFields').hidden=true;};
 $('#actionLevel').onchange=drawControls;
 // ---- Pages from the argument ----
 $('#planPages').onclick=async()=>{try{if(!state.project)throw Error(t('visual.author.openADeckFirst'));const target=Number($('#planTarget').value)||undefined,counter=state.counter;pagePlan=await json('/api/visual/page-plan',{project:state.project,detail:$('#planDetail').value,...(target?{targetPages:target}:{})});pagePlan.counter=counter;
  const n=id=>state.project.plan.scenes.findIndex(s=>s.id===id)+1;
  $('#pagePlan').innerHTML=planHTML(pagePlan)+`<table><thead><tr><th>${x(t('visual.author.page3'))}</th><th>${x(t('visual.author.unit'))}</th><th>${x(t('visual.author.why'))}</th><th>${x(t('visual.author.pages'))}</th></tr></thead><tbody>${pagePlan.scenes.map(s=>`<tr><td>${n(s.sceneId)}</td><td>${x(t(unitWords[s.unit]))}</td><td>${x(s.basis+' · '+s.cue)}</td><td>${s.pages}${s.advice?' · '+x(t('visual.author.reduceText')):''}</td></tr>`).join('')}</tbody></table>${pagePlan.evidenceRequired.length?`<p>${x(t('visual.author.markMarksPageEvidenceRequiredFinal',{pagePlan:pagePlan.evidenceRequired.map(n).join(', '),pagePlan2:pagePlan.evidenceRequired.map(n).join('、')}))}</p>`:''}${pagePlan.scenes.some(s=>s.splitAt)?`<p>${x(t('visual.author.splitMovesWholeBlocksToContinuation',{pagePlan:pagePlan.scenes.filter(s=>s.splitAt).map(s=>n(s.sceneId)).join(', '),pagePlan2:pagePlan.scenes.filter(s=>s.splitAt).map(s=>n(s.sceneId)).join('、')}))}</p>`:''}`;
  $('#pagePlan').hidden=false;$('#planMark').disabled=!pagePlan.evidenceRequired.length;$('#planSplit').disabled=!pagePlan.scenes.some(s=>s.splitAt);}catch(err){error(err);}};
 async function applyPlan(kind){if(!pagePlan||pagePlan.counter!==state.counter)throw Error(t('visual.author.planThePagesAgainTheDeck'));const {counter,...plain}=pagePlan,r=await json('/api/visual/page-plan/apply',{project:state.project,plan:plain,[kind]:true});apply(r.project);message(t('visual.author.changesApplied',{count:r.changes.length,skipped:r.skipped.length?t('visual.author.skippedCount',{count:r.skipped.length}):''}));pagePlan=null;$('#planMark').disabled=$('#planSplit').disabled=true;}
 $('#planMark').onclick=()=>applyPlan('mark').catch(error);$('#planSplit').onclick=()=>applyPlan('split').catch(error);
 // ---- Design profiles ----
 async function profiles(){const r=await json('/api/visual/profiles',undefined,'GET'),keep=$('#profileList').value;$('#profileList').replaceChildren(...r.profiles.map(p=>new Option(`${p.name} · ${p.theme}`,p.id)));if(r.profiles.some(p=>p.id===keep))$('#profileList').value=keep;return r.profiles;}
 $('#profileSave').onclick=async()=>{try{if(!state.project)throw Error(t('visual.author.openADeckFirst'));if((state.dirty||state.drafts.size)&&!await save())return;const r=await json('/api/visual/profiles',{project:state.project,name:$('#profileName').value,attest:$('#profileAttest').checked});await profiles();$('#profileList').value=r.profile.id;message(t('visual.author.profileSaved',{name:r.profile.name,origin:t(r.profile.acceptance.kind==='workbench-review'?'visual.author.profileOrigin.review':'visual.author.profileOrigin.accepted'),count:r.profile.compositions.length}));}catch(err){error(err);}};
 $('#profileExport').onclick=async()=>{try{const id=$('#profileList').value;if(!id)throw Error(t('visual.author.chooseAProfile'));download(await(await api('/api/visual/profiles/'+id,undefined,'GET')).blob(),id+'.design-profile.json');}catch(err){error(err);}};
 $('#profileImport').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>200000)throw Error(t('visual.author.chooseAProfileSmallerThan200'));const r=await json('/api/visual/profiles/import',{profile:JSON.parse(await file.text())});await profiles();$('#profileList').value=r.profile.id;message(t(r.copied?'visual.author.profileImportedCopy':'visual.author.profileImported'));}catch(err){error(err);}finally{e.target.value='';}};
 // ---- Export menu (S9a, F1): PowerPoint and PDF through the export order from the export dialog, JSON as the complete project ----
 // The dialog offers the paging option (auto splits a tall page so its text keeps its size; none keeps the page whole), shows the
 // typography result in yellow with every failure when the file is refused for text size, and takes the author's explicit
 // acceptance. An accepted export is recorded with its time and stays yellow: acceptance never turns the result green.
 let exportFormat='pptx';
 const roleWord={title:'visual.author.title',body:'visual.author.body',annotation:'visual.author.annotation'};
 function exportStatus(status,text,{acceptedAt}={}){const s=$('#exportStatus');s.dataset.status=status;s.textContent=text;if(acceptedAt)s.dataset.acceptedAt=acceptedAt;else delete s.dataset.acceptedAt;}
 function typographyList(failures){const ul=$('#exportTypography'),shown=failures.slice(0,40);
  ul.innerHTML=shown.map(f=>`<li>${x(t('visual.author.pagePtNeedsPt',{page:f.sceneId,role:f.role in roleWord?t(roleWord[f.role]):f.role,actualPt:f.actualPt,requiredPt:f.requiredPt,name:f.name}))}</li>`).join('')+(failures.length>shown.length?`<li>${x(t('visual.author.andMore',{failuresCount:failures.length-shown.length}))}</li>`:'');
  ul.hidden=!failures.length;}
 function openExport(format){renderEvidence($('#exportEvidence'),state.taskEvidence,pick);exportFormat=format;$('#exportTitle').textContent=format==='pptx'?t('visual.author.exportPowerpoint'):t('visual.author.exportPdf');$('#exportPaginateField').hidden=format!=='pptx';exportStatus('idle','');typographyList([]);$('#exportAcceptField').hidden=true;$('#exportAccept').checked=false;$('#exportRun').disabled=false;$('#exportDialog').showModal();}
 async function runExport(){
  const format=exportFormat,paginate=$('#exportPaginate').value,accept=!$('#exportAcceptField').hidden&&$('#exportAccept').checked,name=format==='pptx'?'PowerPoint':'PDF';
  $('#exportRun').disabled=true;exportStatus('running',t('visual.author.measuringTheStaticSceneAndCompiling'));
  try{
   const r=await api('/api/visual/export',{project:state.project,format,ticket:state.render?.ticket,paginate,...(accept?{acceptTypography:true}:{})});
   download(await r.blob(),'deckweft-visual.'+format);
   const ty=JSON.parse(r.headers.get('X-DeckWeft-Typography')||'null'),summary=t('visual.author.exportedThrough',{name,order:r.headers.get('X-DeckWeft-Export-Order'),levels:r.headers.get('X-DeckWeft-Levels'),receipts:r.headers.get('X-DeckWeft-Receipts')});
   $('#exportAcceptField').hidden=true;
   if(ty?.acceptedBy)exportStatus('accepted',t('visual.author.exportedWithTextSizeSBelow',{ty:ty.failures,ty2:ty.acceptedAt,summary}),{acceptedAt:ty.acceptedAt});
   else{typographyList([]);exportStatus('pass',summary+(ty?.pagination?t('visual.author.tallPageSWereSplitInto',{ty:ty.pagination}):''));}
   message(summary);
  }catch(e){
   const typography=e.code==='EXPORT_CHECK_FAILED'&&Array.isArray(e.details)&&e.details.length&&e.details.every(d=>d.check==='typography')?e.details[0].failures:null;
   if(typography){typographyList(typography);$('#exportAcceptField').hidden=false;$('#exportAccept').checked=false;
    exportStatus('fail',t('visual.author.textSizesBelowMinimum',{count:typography.length,advice:t(paginate==='none'?'visual.author.sizeAdvice.split':'visual.author.sizeAdvice.shorten')}));}
   else{typographyList([]);$('#exportAcceptField').hidden=true;exportStatus('error',e.code==='EXPORT_CHECK_FAILED'&&Array.isArray(e.details)?`${e.message} (${e.details.map(d=>d.check).join(', ')})`:e.message);error(e);}
  }finally{$('#exportRun').disabled=false;}
 }
 $('#exportPPTX').onclick=()=>openExport('pptx');$('#exportPDF').onclick=()=>openExport('pdf');$('#exportRun').onclick=()=>runExport();$('#exportClose').onclick=()=>$('#exportDialog').close();$('#exportJSON').onclick=()=>$('#backup').click();
 json('/api/visual/workbench-capabilities',undefined,'GET').then(c=>{captureAvailable=c.captureAvailable;status();}).catch(error);
 function status(){const html=$('#exportHTML'),blocked=!captureAvailable;for(const id of ['#exportPPTX','#exportPDF']){$(id).disabled=html.disabled||blocked;$(id).title=blocked?t('visual.author.startTheStudioWithCaptureBrowser'):'';}$('#exportJSON').disabled=!state.project;}
 // The session token arrives after mount, so the list loads when the author opens these controls.
 $('#authorControls').addEventListener('toggle',()=>{if($('#authorControls').open)profiles().catch(error);});
 return {status,drawControls,profiles};
}
