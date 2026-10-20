import {mountStoryboard} from './storyboard.js';
import { BrowserTextMeasurer } from './text-measurer.js';
import { EditHistory,keyboardAction,validSlideAction,DialogManager } from './interaction.js';
import {pitchMode,applyPitchMode,projectIsEnglish} from './pitch-mode.js';
import {mountAgentBridge} from './agent-bridge.js';
import {mountPreferences,getPreferences} from './preferences.js';
import {applyActions} from './actions.js';
import {mountPresenter} from './presenter.js';
import {sessionRecovery,askSaveCopy} from './session.js';
import {historyCapacityNote} from './history-capacity.js';
import {t,applyLanguage} from './i18n.js';
applyPitchMode(document);
const $=selector=>document.querySelector(selector);
const labels={editorial:'classic.family.editorial',spotlight:'classic.family.spotlight',grid:'classic.family.grid',timeline:'classic.family.timeline'};
const familyLabel=id=>labels[id]?t(labels[id]):id;
const state={token:'',project:null,active:'',preview:null,dirty:false,saving:false,operation:false,exporting:false,locale:'en',counter:0,previewState:'idle',composing:false,saveIssue:null,firstRun:false};
const moreDrawer=$('#moreDialog');
const edits=new EditHistory(),dialogs=new DialogManager(document),textMeasurer=new BrowserTextMeasurer();
let previewTimer,previewTicket=0,previewAbort,toastTimer,presenter,saveTimer;
const pick=(english,chinese)=>state.locale==='zh-CN'?chinese:english;
const x=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reconnect=sessionRecovery({t:pick,setToken:token=>{state.token=token;}});
// A 401 is answered before the request is handled, so one retry after reconnecting cannot repeat a change.
async function api(url,data,method='POST',signal,retry=true){
  const response=await fetch(url,{method,signal,headers:{Authorization:`Bearer ${state.token}`,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(response.status===401&&retry){await reconnect();return api(url,data,method,signal,false);}
  if(!response.ok){let value;try{value=await response.json();}catch{value={error:{message:`HTTP ${response.status}`}};}const error=new Error(value.error.message);Object.assign(error,value.error);throw error;}return response;
}
async function json(url,data,method='POST',signal){return(await api(url,data,method,signal)).json();}
function toast(message){clearTimeout(toastTimer);$('#toastRegion').textContent=message;$('#toastRegion').classList.add('visible');toastTimer=setTimeout(()=>{$('#toastRegion').textContent='';$('#toastRegion').classList.remove('visible');},6500);}
function notice(message,tone){$('#issueBanner').hidden=!message;$('#issueBanner').textContent=message||'';$('#issueBanner').classList.toggle('warning',tone==='warning');}
function onError(error){if(error.name==='AbortError')return;const message=error.code==='AUTH_REQUIRED'?t('classic.app.notConnectedYourEditsRemainIn'):error.message||String(error);notice(message);toast(message);}
function slide(){return state.project?.slides.find(s=>s.id===state.active);}
function ready(){return !!state.project&&!state.operation;}
function updateStatus(){
  const p=state.project,i=p?.slides.findIndex(s=>s.id===state.active)??0,count=p?.slides.length||0;
  // The state square: saving, attention (a save failed, a conflict, an invalid field or a layout problem), unsaved, saved.
  const attention=!!state.saveIssue||state.previewState==='error'||state.preview?.audit.ok===false;
  const saveState=!p&&state.firstRun?'unsaved':!p||state.saving?'saving':attention?'attention':state.dirty?'unsaved':'saved';
  const saveLabel=!p&&state.firstRun?t('classic.app.noDeckYet'):!p?t('classic.app.openingLocalLibrary'):state.saving?t('classic.app.saving'):state.saveIssue==='conflict'?t('classic.app.unsavedChangesAnotherWindowSavedFirst'):attention?(state.dirty?t('classic.app.unsavedChangesNeedsALook'):t('classic.app.savedOnThisComputerNeedsA')):state.dirty?t('classic.app.unsavedChanges'):t('classic.app.savedOnThisComputer');
  const square=$('#saveState'),spoken=square.querySelector('.sr-only');square.dataset.state=saveState;square.title=saveLabel;if(spoken.textContent!==saveLabel)spoken.textContent=saveLabel;
  $('#save').disabled=!ready()||state.saving||!state.dirty||state.composing;
  $('#undo').disabled=!ready()||!edits.past.length||state.composing;$('#redo').disabled=!ready()||!edits.future.length||state.composing;syncRedo();
  for(const id of ['newDeck','importButton','projectPicker','openHistory','openAgent','openStoryboard'])$('#'+id).disabled=!ready()||state.saving;
  for(const [id,kind]of Object.entries({addSlide:'add',duplicate:'duplicate',moveUp:'up',moveDown:'down',deleteSlide:'delete'}))$('#'+id).disabled=!ready()||!validSlideAction(kind,i,count)||state.composing;
  for(const id of ['openExport','present','ratio','autoLayout'])$('#'+id).disabled=!ready()||state.composing;
  $('#present').disabled||=state.previewState!=='ready'||!state.preview?.audit.ok;
  const mediaStyle=state.project?.extensions?.deckweftShowcase?.style==='cosmos-dots'||state.project?.slides.some(s=>s.intent?.assetIds.length);$('#mediaExportNote').hidden=!mediaStyle;
  document.querySelectorAll('[data-export]').forEach(b=>b.disabled=state.exporting||!ready()||(b.dataset.export!=='json'&&(state.previewState!=='ready'||!state.preview?.audit.ok)));
  document.querySelectorAll('[data-layout]').forEach(b=>b.disabled=state.previewState!=='ready'||!ready());
  $('#canvas').setAttribute('aria-busy',String(state.previewState==='pending'));
  $('#canvas').classList.toggle('stale',state.previewState!=='ready');
  $('#candidates').setAttribute('aria-busy',String(state.previewState==='pending'));
}
function changed(mutator,{full=false,group=null}={}){
  if(!ready())return;const before=structuredClone(state.project),previousActive=state.active;mutator();
  if(state.project.schemaVersion===2){for(const s of state.project.slides){s.intent??={claim:s.content.title,audience:state.project.brief.audience,evidence:[],visualFamily:'comparison',assetIds:[],interaction:{kind:'none',initial:0,labels:[]}};if(s.intent.interaction.kind!=='none'){if(s.content.items.length){s.intent.interaction.labels=s.content.items.map((v,i)=>v.slice(0,85)||String(i+1));s.intent.interaction.initial=Math.min(s.intent.interaction.initial,s.content.items.length-1);}else s.intent.interaction={kind:'none',initial:0,labels:[]};}s.intent.evidence=s.intent.evidence.filter(e=>s.sourceIds.includes(e.sourceId));}}
  if(JSON.stringify(before)===JSON.stringify(state.project))return;
  edits.capture(before,previousActive,group);state.dirty=true;state.counter++;updateStatus();if(full)renderEditor();if(!state.composing)schedulePreview();
  scheduleSave();
}
// Hold Undo for 500 ms to show Redo; Redo hides 1 s after release while the pointer and focus are elsewhere.
// When nothing is left to undo but something can be redone, Redo stays out so a mouse can still reach it.
const redoHold={timer:0,hide:0,held:false,swallow(event){const held=this.held&&event.detail>0;this.held=false;return held;}};
function hideRedoSoon(){clearTimeout(redoHold.hide);redoHold.hide=setTimeout(()=>{redoHold.hide=0;if($('#redo').matches(':hover,:focus-visible')||($('#undo').disabled&&!$('#redo').disabled))return hideRedoSoon();$('#redo').hidden=true;},1000);}
function syncRedo(){if($('#undo').disabled&&!$('#redo').disabled){clearTimeout(redoHold.hide);redoHold.hide=0;$('#redo').hidden=false;}else if(!$('#redo').hidden&&!redoHold.hide&&!redoHold.timer)hideRedoSoon();}
function undo(redo=false){
  if(!ready()||state.composing)return;const next=edits.step(state.project,state.active,redo);if(!next)return;
  state.project=next.project;state.active=next.project.slides.some(s=>s.id===next.active)?next.active:next.project.slides[0].id;
  state.dirty=true;state.counter++;renderEditor();schedulePreview();scheduleSave();
}
// Repaints everything the dictionary does not own: the editor and preview, then tells the other modules.
function languageChanged(){
  if(pitchMode)state.locale='en';
  applyLanguage(document,state.locale);
  if(state.project){renderEditor();renderPreview();}window.dispatchEvent(new Event('deckweft:locale'));
}
// The layout engine's messages are English; the two the interface knows how to say in Chinese come from the dictionary.
const qualityKeys={SOURCE_NEEDED:'classic.quality.sourceNeeded',TEXT_OVERFLOW:'classic.quality.textOverflow'};
const qualityMessage=issue=>state.locale==='zh-CN'&&qualityKeys[issue.code]?t(qualityKeys[issue.code]):issue.message;
async function library(){
  let {projects}=await json('/api/projects',undefined,'GET');
  if(pitchMode){const english=[];for(const project of projects){if(project.unreadable)continue;const full=(await json(`/api/projects/${project.id}`,undefined,'GET')).project;if(projectIsEnglish(full))english.push(project);}projects=english;}
  $('#projectPicker').innerHTML=projects.map(p=>`<option value="${x(p.id)}" ${p.unreadable?'disabled':''}>${x(p.title)}${p.unreadable?t('classic.app.needsRepair'):''}</option>`).join('');
  if(state.project)$('#projectPicker').value=state.project.id;return projects;
}
function activate(project){
  if(pitchMode&&!projectIsEnglish(project))throw new Error('Presentation mode opens English projects only. Use the standard Studio to open another language edition.');
  // The first page replaces the first-run form for good.
  $('#firstRun')?.remove();$('#canvas').hidden=false;document.body.classList.remove('first-run');state.firstRun=false;
  cancelPreview();clearTimeout(saveTimer);state.saveIssue=null;state.project=project;state.active=project.slides[0].id;state.dirty=false;edits.reset();state.counter++;state.preview=null;state.previewState='pending';notice('');clearFieldErrors();renderEditor();schedulePreview();
}
function renderEditor(){
  const p=state.project,s=slide();if(!p||!s)return;
  $('#deckTitle').value=p.title;$('#deckTitleSmall').value=p.title;$('#ratio').value=p.aspectRatio;$('#contentLocale').value=p.locale;
  $('#projectPicker').value=p.id;$('#pageCount').textContent=`${p.slides.findIndex(v=>v.id===s.id)+1} / ${p.slides.length}`;
  for(const key of ['eyebrow','body'])$('#'+key).value=s.content[key];$('#slideTitle').value=s.content.title;
  $('#items').value=s.content.items.join('\n');$('#metrics').value=s.content.metrics.map(m=>`${m.value} | ${m.label}`).join('\n');$('#notes').value=s.notes;
  $('#stageStyle').disabled=p.schemaVersion===2;$('#autoLayout').hidden=p.schemaVersion===2;$('#stageStyle').value=p.extensions?.deckweftShowcase?.style==='cosmos-dots'?'cosmos-dots':'studio';$('#role').value=s.role;$('#motion').value=s.motion.preset;$('#duration').value=s.motion.duration;
  document.querySelectorAll('[data-theme]').forEach(el=>{el.classList.toggle('selected',el.dataset.theme===p.theme);el.setAttribute('aria-pressed',String(el.dataset.theme===p.theme));});
  $('#sourceList').innerHTML=p.sources.map(source=>`<label class="source-option"><input type="checkbox" data-source="${x(source.id)}" ${s.sourceIds.includes(source.id)?'checked':''}><span>${x(source.title)}<br><small>${x(source.url)}</small></span></label>`).join('')||`<p class="hint">${t('classic.app.noSourcesYetAddOneBelow')}</p>`;
  updateStatus();renderPreview();
}
function cancelPreview(){clearTimeout(previewTimer);previewTicket++;previewAbort?.abort();}
function schedulePreview(){cancelPreview();state.previewState='pending';updateStatus();const ticket=previewTicket;previewTimer=setTimeout(()=>refreshPreview(ticket),220);}
async function measurePreview(project,active,{signal,onProgress}={}){
  const plan=await json('/api/measure/plan',{project},'POST',signal);
  const shaped=await textMeasurer.resolve(plan,{signal,onProgress});
  return json('/api/measure/resolve',{planId:plan.id,...shaped,slideId:active},'POST',signal);
}
function clearFieldErrors(){document.querySelectorAll('[aria-invalid="true"]').forEach(el=>{el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');});$('#fieldErrors').hidden=true;$('#fieldErrors').replaceChildren();}
function showFieldErrors(error){
  clearFieldErrors();const activeIndex=state.project.slides.findIndex(s=>s.id===state.active);
  const map={title:'deckTitle',body:'body',eyebrow:'eyebrow',items:'items',metrics:'metrics',notes:'notes',duration:'duration'};
  for(const detail of error.details||[]){const path=detail.path||'';const match=path.match(/\.slides\[(\d+)\]/);if(match&&Number(match[1])!==activeIndex)continue;
    const field=path.includes('.content.title')?'slideTitle':Object.keys(map).find(k=>path.includes('.'+k)),id=field==='slideTitle'?field:map[field];
    if(id){$('#'+id).setAttribute('aria-invalid','true');$('#'+id).setAttribute('aria-describedby','fieldErrors');}
    const div=document.createElement('div');div.textContent=`${path}: ${detail.message}`;$('#fieldErrors').append(div);
  }
  $('#fieldErrors').hidden=false;
}
async function refreshPreview(ticket){
  if(!state.project||state.composing)return;const snapshot=structuredClone(state.project),active=state.active,counter=state.counter;
  previewAbort=new AbortController();
  try{
    const data=await measurePreview(snapshot,active,{signal:previewAbort.signal});
    if(ticket!==previewTicket||counter!==state.counter||state.active!==active)return;
    state.preview=data;state.previewState='ready';clearFieldErrors();notice('');renderPreview();
  }catch(error){if(error.name==='AbortError'||ticket!==previewTicket)return;state.previewState='error';if(error.code==='INVALID_PROJECT')showFieldErrors(error);onError(error);updateStatus();}
}
function restoreDynamicFocus(previous){
  if(!previous||previous.isConnected)return;
  for(const key of ['slide','layout']){const value=previous.dataset?.[key];if(value){const target=[...document.querySelectorAll(`[data-${key}]`)].find(b=>b.dataset[key]===value);if(target&&!target.disabled)target.focus({preventScroll:true});}}
}
function renderPreview(){
  const p=state.project;if(!p)return;const focused=document.activeElement;
  $('#slideList').innerHTML=p.slides.map((s,i)=>{const result=state.preview?.slides.find(r=>r.slideId===s.id);return `<button class="thumbnail ${s.id===state.active?'active':''}" draggable="true" data-slide="${x(s.id)}" aria-label="${x(t('classic.app.slide')+' '+(i+1)+': '+s.content.title)}" aria-current="${s.id===state.active?'true':'false'}"><span aria-hidden="true">${result?.svg||'<div class="placeholder">…</div>'}</span><span class="thumbnail-meta"><span>${String(i+1).padStart(2,'0')}</span><span>${x(s.content.title)}</span></span></button>`}).join('');
  const result=state.preview?.slides.find(r=>r.slideId===state.active);
  if(result){
    $('#canvas').innerHTML=result.svg;sizeCanvas();$('#layoutCaption').textContent=(p.schemaVersion===2?slide().intent.visualFamily:familyLabel(result.selected))+' · '+t('classic.app.editableTextShapes');
    const choices=state.preview.choices||[];
    $('#candidates').innerHTML=choices.map((c,i)=>`<button class="candidate ${result.selected===c.id?'selected':''}${c.eligible?'':' unfit'}" data-layout="${c.id}" aria-label="${x(p.schemaVersion===2?c.label:familyLabel(c.id))}" aria-pressed="${result.selected===c.id}" title="${x(c.explanation)}">${c.eligible?'':`<span class="unfit-reason">${t('classic.app.tooMuchTextToFit')}</span>`}<span aria-hidden="true">${c.svg}</span><span class="candidate-label"><span>${i+1} · ${x(p.schemaVersion===2?c.label:familyLabel(c.id))}</span></span></button>`).join('');
    const audit=state.preview.audit,current=audit.issues.filter(i=>!i.slideId||i.slideId===state.active);
    $('#qualityCount').textContent=current.length?String(current.length):t('classic.app.clear');
    $('#qualityIssues').innerHTML=current.length?current.map(i=>`<div class="quality-item ${i.severity}">${i.severity==='error'?'!':'○'} ${x(qualityMessage(i))}</div>`).join(''):`<div class="quality-item good">✓ ${t('classic.app.noLayoutBlockersOnThisSlide')}</div>`;
    const fonts=Object.entries(state.preview.measurement?.fontProbes||{}).filter(([,ok])=>ok).map(([name])=>name);
    $('#measurementNote').textContent=t('classic.app.browserMeasurementLocalFontsDetected')+(fonts.join(', ')||t('classic.app.noneConfirmedBrowserFallbackUsed'));
  }else{$('#canvas').innerHTML=`<p>${t('classic.app.measuringYourSlide')}</p>`;$('#candidates').replaceChildren();}
  updateStatus();restoreDynamicFocus(focused);markZone();window.dispatchEvent(new Event('deckweft:preview'));
}
function sizeCanvas(){const svg=$('#canvas svg');if(!svg)return;const [,,w,h]=svg.getAttribute('viewBox').split(' ').map(Number),stage=$('#stage'),style=getComputedStyle(stage),aw=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),ah=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),scale=Math.min(aw/w,ah/h);$('#canvas').style.width=`${Math.max(1,w*scale)}px`;$('#canvas').style.height=`${Math.max(1,h*scale)}px`;}
document.addEventListener('compositionstart',()=>{if(!state.composing){state.composing=true;cancelPreview();state.previewState='pending';updateStatus();}});
document.addEventListener('compositionend',()=>{if(state.composing){state.composing=false;edits.endGroup();schedulePreview();scheduleSave();}});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{if(state.composing)event.preventDefault();}));
new ResizeObserver(sizeCanvas).observe($('#stage'));window.addEventListener('resize',()=>dialogs.resize(innerWidth));
// After a 409 the author may keep the draft as a new deck through the import-as-copy route; the newer revision stays untouched.
async function saveCopy(){
  if(!await askSaveCopy(pick))return false;
  const draft=structuredClone(state.project),active=state.active;
  const imported=await json('/api/import',{project:draft}),saved=await json('/api/projects',{project:imported.project});
  activate(saved.project);selectSlide(active);await library();toast(t('classic.app.savedAsASeparateCopyThe'));return true;
}
// Autosave 1.2 s after the last edit. It waits out IME composition and invalid fields (the preview already shows those),
// and pauses after a revision conflict: ⌘/Ctrl S then offers the separate copy, so no dialog opens while someone types.
function scheduleSave(){
  clearTimeout(saveTimer);if(!state.dirty||state.composing||state.saveIssue==='conflict')return;
  saveTimer=setTimeout(()=>{if(state.dirty&&!state.composing&&!state.saving&&state.previewState!=='error')save({auto:true});},1200);
}
async function save({auto=false}={}){
  if(!state.project||state.saving||state.composing)return false;if(!state.dirty)return true;
  clearTimeout(saveTimer);if(!auto){reconnect.offerAgain();state.saveIssue=null;}
  state.saving=true;edits.endGroup();updateStatus();const snapshot=structuredClone(state.project),counter=state.counter;
  try{const {project,historyUsage}=await json(`/api/projects/${snapshot.id}`,{project:snapshot,expectedRevision:snapshot.revision.number},'PUT');
    if(state.project.id===snapshot.id){state.project.revision=project.revision;if(counter===state.counter)state.dirty=false;}
    state.saveIssue=null;
    // From 80% of the suggested history size the banner explains cleanup; nothing is deleted.
    await library();notice(historyCapacityNote(historyUsage,pick),'warning');return !state.dirty;
  }catch(error){
    if(error.code==='REVISION_CONFLICT'){state.saveIssue='conflict';if(!auto){try{if(await saveCopy())return true;}catch(copyError){onError(copyError);return false;}}notice(t('classic.app.anotherWindowSavedFirstYourEdits'));}
    else{state.saveIssue='failed';if(auto)notice(error.code==='AUTH_REQUIRED'?t('classic.app.notConnectedYourEditsRemainIn'):error.message||String(error));else onError(error);}
    return false;
  }finally{state.saving=false;updateStatus();if(state.dirty&&!state.saveIssue)scheduleSave();}
}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function exportFile(format){
  if(!ready()||state.exporting)return;const snapshot=structuredClone(state.project);state.exporting=true;updateStatus();
  try{
    // Always allow a raw draft backup, even when a field is temporarily invalid.
    const blob=format==='json'?new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}):await(await api(`/api/export/${format}`,{project:snapshot,slideIndex:snapshot.slides.findIndex(s=>s.id===state.active),renderTicket:state.preview?.renderTicket,requireMeasured:true,includeNotes:$('#exportNotes').checked,motion:getPreferences().motion})).blob();
    const extension={json:'deck.json',motion:'motion.json',figma:'figma.json'}[format]||format;
    download(blob,`${snapshot.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,70)||'deckweft'}.${extension}`);$('#exportDialog').close();toast(format==='json'?t('classic.app.draftBackupCreatedInvalidFieldsStill'):t('classic.app.exportCreatedFromTheMeasuredPreview'));
  }catch(error){if(['STALE_MEASUREMENT','MEASUREMENT_EXPIRED'].includes(error.code)){schedulePreview();$('#exportDialog').close();}onError(error);
  }finally{state.exporting=false;updateStatus();}
}
let leavePromise=null;
async function canLeave(){
  if(state.saving||state.composing)return false;if(!state.dirty)return true;
  if(leavePromise)return leavePromise;
  const dialog=$('#leaveDialog'),keep=dialog.querySelector('[data-close]'),discard=$('#leaveDiscard'),saveButton=$('#leaveSave');
  $('#leaveError').textContent='';dialogs.open(dialog);
  leavePromise=new Promise(resolve=>{
    let settled=false;
    const busy=value=>{dialog.dataset.busy=String(value);keep.disabled=discard.disabled=saveButton.disabled=value;};
    const done=value=>{if(settled)return;settled=true;keep.removeEventListener('click',cancelClick);discard.removeEventListener('click',discardClick);saveButton.removeEventListener('click',saveClick);dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('close',closed);busy(false);leavePromise=null;if(dialog.open)dialog.close();resolve(value);};
    const cancelClick=()=>done(false),discardClick=()=>done(true);
    const closed=()=>{if(!dialog.open)done(false);}; // Ignore a queued close from a previous opening.
    const cancel=event=>{event.preventDefault();if(!state.composing&&!state.saving)done(false);};
    const saveClick=async()=>{busy(true);const ok=await save();busy(false);if(ok)done(true);else $('#leaveError').textContent=t('classic.app.savingDidNotFinishKeepEditing');};
    keep.addEventListener('click',cancelClick);discard.addEventListener('click',discardClick);saveButton.addEventListener('click',saveClick);dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',closed);
  });
  return leavePromise;
}
function selectSlide(id){if(!ready()||state.composing||state.active===id||!state.project.slides.some(s=>s.id===id))return;edits.endGroup();state.active=id;state.previewState='pending';renderEditor();schedulePreview();$('#presentLive').textContent=slide().content.title;}
function present(exit=false){
  if(exit)presenter?.stop();else presenter?.start();
}
function freshSlide(){return {id:'slide_'+crypto.randomUUID().replaceAll('-','').slice(0,16),role:'context',content:{eyebrow:'',title:t('classic.app.aClearIdea'),body:'',items:[],metrics:[]},design:{layout:'auto'},motion:{preset:'none',duration:6},notes:'',sourceIds:[]};}
function slideAction(type){
  if(!ready()||state.composing)return;const i=state.project.slides.findIndex(s=>s.id===state.active);if(!validSlideAction(type,i,state.project.slides.length))return;
  changed(()=>{const p=state.project;
    if(type==='add'){const s=freshSlide();p.slides.splice(i+1,0,s);state.active=s.id;}
    if(type==='duplicate'){const s=structuredClone(slide());s.id=freshSlide().id;p.slides.splice(i+1,0,s);state.active=s.id;}
    if(type==='delete'){p.slides.splice(i,1);state.active=p.slides[Math.min(i,p.slides.length-1)].id;}
    if(type==='up')p.slides.splice(i-1,0,p.slides.splice(i,1)[0]);if(type==='down')p.slides.splice(i+1,0,p.slides.splice(i,1)[0]);
  },{full:true});
}
// M3: the inspector shows the Words and Look zones together, so there is no tab to switch. Kept for existing callers.
function setTab(){}
// Colour matching: focus in Words frames the matching block on the canvas in yellow, or outlines the whole slide when
// that field draws nothing; focus in Look outlines the slide in blue. Renderer node ids are <slide id>_<role>_<n>.
const zoneBlocks={eyebrow:['eyebrow'],slideTitle:['title'],body:['body'],items:['item'],metrics:['metric-value','metric-label']};
let zoneFocus=null;
function markZone(){
  const canvas=$('#canvas'),svg=canvas.querySelector('svg');
  canvas.classList.toggle('zone-words',zoneFocus?.zone==='words');canvas.classList.toggle('zone-look',zoneFocus?.zone==='look');
  svg?.querySelector('.zone-block-frame')?.remove();delete canvas.dataset.block;
  const roles=zoneFocus?.zone==='words'?zoneBlocks[zoneFocus.field]:null;if(!svg||!roles)return;
  const boxes=[...svg.querySelectorAll('[data-node]')].filter(n=>roles.some(r=>n.dataset.node.startsWith(`${state.active}_${r}_`))).map(n=>n.getBBox()).filter(b=>b.width&&b.height);
  if(!boxes.length)return;
  const pad=12,left=Math.min(...boxes.map(b=>b.x))-pad,top=Math.min(...boxes.map(b=>b.y))-pad,right=Math.max(...boxes.map(b=>b.x+b.width))+pad,bottom=Math.max(...boxes.map(b=>b.y+b.height))+pad;
  const frame=document.createElementNS('http://www.w3.org/2000/svg','rect');
  for(const [name,value]of Object.entries({class:'zone-block-frame',x:left,y:top,width:right-left,height:bottom-top,'vector-effect':'non-scaling-stroke','aria-hidden':'true'}))frame.setAttribute(name,String(value));
  svg.append(frame);canvas.dataset.block=roles[0];
}
$('.inspector').addEventListener('focusin',event=>{const zone=event.target.closest('[data-zone]');zoneFocus=zone?{zone:zone.dataset.zone,field:event.target.id}:null;markZone();});
$('.inspector').addEventListener('focusout',()=>{zoneFocus=null;markZone();});
for(const key of ['eyebrow','body','slideTitle','items','metrics','notes','deckTitle','deckTitleSmall']){
  const input=$('#'+key);
  input.addEventListener('compositionstart',()=>{edits.endGroup();state.composing=true;cancelPreview();state.previewState='pending';updateStatus();});
  input.addEventListener('compositionend',()=>{state.composing=false;edits.endGroup();schedulePreview();scheduleSave();});
  input.addEventListener('blur',()=>edits.endGroup());
  input.addEventListener('input',event=>changed(()=>{
    const value=event.target.value,s=slide();
    if(['deckTitle','deckTitleSmall'].includes(key)){state.project.title=value;return;}
    if(key==='slideTitle')s.content.title=value;
    else if(key==='items')s.content.items=value.split('\n').filter(s=>s.trim());
    else if(key==='metrics')s.content.metrics=value.split('\n').filter(s=>s.trim()).map(line=>{const i=line.indexOf('|');return {value:(i<0?line:line.slice(0,i)).trim(),label:i<0?'':line.slice(i+1).trim()};});
    else if(key==='notes')s.notes=value;else s.content[key]=value;
  },{group:`${state.active}:${key}`}));
}
$('#stageStyle').onchange=e=>changed(()=>{if(e.target.value==='cosmos-dots')state.project.extensions.deckweftShowcase={version:1,style:'cosmos-dots'};else delete state.project.extensions.deckweftShowcase;},{full:true});
$('#ratio').onchange=e=>changed(()=>state.project.aspectRatio=e.target.value);$('#contentLocale').onchange=e=>changed(()=>state.project.locale=e.target.value);$('#role').onchange=e=>changed(()=>slide().role=e.target.value);$('#motion').onchange=e=>changed(()=>slide().motion.preset=e.target.value);$('#duration').onchange=e=>changed(()=>slide().motion.duration=Number(e.target.value));
$('#save').onclick=()=>save();$('#undo').onclick=event=>{if(redoHold.swallow(event))return;undo();};$('#redo').onclick=()=>undo(true);$('#present').onclick=()=>{if(!moreDrawer.open)return present();moreDrawer.addEventListener('close',()=>present(),{once:true});moreDrawer.close();}; // start after focus has returned, so the presenter keeps its own focus
$('#exitPresent').onclick=()=>present(true);
$('#openExport').onclick=()=>{updateStatus();dialogs.open($('#exportDialog'));};$('#newDeck').onclick=async()=>{dialogs.closeDrawer();if(await canLeave())dialogs.open($('#outlineDialog'),$('#newDeck'));};
$('#autoLayout').onclick=()=>changed(()=>slide().design.layout='auto');
$('#toggleStory').onclick=()=>dialogs.openDrawer('story');$('#toggleInspector').onclick=()=>dialogs.openDrawer('inspector');
$('#undo').addEventListener('pointerdown',event=>{if(event.button!==0)return;redoHold.held=false;clearTimeout(redoHold.timer);redoHold.timer=setTimeout(()=>{redoHold.timer=0;redoHold.held=true;clearTimeout(redoHold.hide);redoHold.hide=0;$('#redo').hidden=false;},500);});
for(const type of ['pointerup','pointercancel','pointerleave'])$('#undo').addEventListener(type,event=>{clearTimeout(redoHold.timer);redoHold.timer=0;if(type==='pointercancel'||(type==='pointerleave'&&event.buttons))redoHold.held=false;if(!$('#redo').hidden)hideRedoSoon();});
$('#undo').addEventListener('contextmenu',event=>event.preventDefault());
for(const type of ['pointerleave','focusout'])$('#redo').addEventListener(type,hideRedoSoon);
// Phone top band keeps brand, state square, More and Take away: the title and Undo move to the top of the More drawer (moved, never copied).
const phone=matchMedia('(max-width:680px)');
const topSlots=['undo','redo','deckTitle'].map(id=>{const el=$('#'+id),marker=document.createComment('top-'+id);el.before(marker);return {el,marker};});
function placeTopControls(){for(const {el,marker} of topSlots){if(phone.matches)$('#moreTop').append(el);else marker.after(el);}}
phone.addEventListener('change',placeTopControls);placeTopControls();
$('#uiLanguage').onclick=()=>{if(state.composing||pitchMode)return;state.locale=state.locale==='en'?'zh-CN':'en';languageChanged();};
for(const [id,type]of Object.entries({addSlide:'add',duplicate:'duplicate',moveUp:'up',moveDown:'down',deleteSlide:'delete'}))$('#'+id).onclick=()=>slideAction(type);
// Page strip: drag a thumbnail to reorder. A 2 px line marks where it lands; the drop goes through changed(),
// so undo and autosave follow. The insert point is before the first thumbnail whose middle lies right of the pointer.
const dropLine=Object.assign(document.createElement('div'),{className:'drop-line',hidden:true});let dragId=null;
function dropIndex(event){const thumbs=[...$('#slideList').querySelectorAll('.thumbnail')];const i=thumbs.findIndex(b=>{const r=b.getBoundingClientRect();return event.clientX<r.left+r.width/2;});return i<0?thumbs.length:i;}
function showDropLine(index){const list=$('#slideList'),thumbs=[...list.querySelectorAll('.thumbnail')],gap=parseFloat(getComputedStyle(list).columnGap)||0,edge=index<thumbs.length?thumbs[index].offsetLeft-gap/2:thumbs.at(-1).offsetLeft+thumbs.at(-1).offsetWidth+gap/2;if(!dropLine.isConnected)list.append(dropLine);dropLine.style.left=`${edge-1}px`;dropLine.hidden=false;}
function endDrag(){dragId=null;dropLine.hidden=true;$('#slideList').querySelector('.dragging')?.classList.remove('dragging');}
$('#slideList').addEventListener('dragstart',event=>{const thumb=event.target.closest?.('.thumbnail');if(!thumb||!ready()||state.composing){event.preventDefault();return;}dragId=thumb.dataset.slide;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragId);thumb.classList.add('dragging');});
$('#slideList').addEventListener('dragover',event=>{if(!dragId)return;event.preventDefault();event.dataTransfer.dropEffect='move';showDropLine(dropIndex(event));});
$('#slideList').addEventListener('dragleave',event=>{if(!$('#slideList').contains(event.relatedTarget))dropLine.hidden=true;});
$('#slideList').addEventListener('drop',event=>{if(!dragId)return;event.preventDefault();const id=dragId,index=dropIndex(event);endDrag();
  changed(()=>{const slides=state.project.slides,from=slides.findIndex(s=>s.id===id);if(from<0)return;const [moved]=slides.splice(from,1);slides.splice(index>from?index-1:index,0,moved);},{full:true});});
$('#slideList').addEventListener('dragend',endDrag);
async function switchProject(id){
  if(!ready()||state.saving)return false;if(!await canLeave()){$('#projectPicker').value=state.project.id;return false;}
  state.operation=true;updateStatus();
  try{activate((await json(`/api/projects/${id}`,undefined,'GET')).project);return true;}catch(error){$('#projectPicker').value=state.project.id;onError(error);return false;}finally{state.operation=false;updateStatus();}
}
$('#projectPicker').onchange=e=>switchProject(e.target.value);
$('#outlineForm').onsubmit=async event=>{event.preventDefault();if(state.operation)return;state.operation=true;$('#arrangeOutline').disabled=true;updateStatus();try{const imported=await json('/api/import',{outline:$('#outline').value,locale:state.project?.locale||(state.locale==='zh-CN'?'zh-CN':'en')});const saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();$('#outlineDialog').close();}catch(error){$('#outlineError').textContent=error.message;}finally{state.operation=false;$('#arrangeOutline').disabled=false;updateStatus();}};
$('#importButton').onclick=async()=>{dialogs.closeDrawer();if(await canLeave())$('#fileInput').click();};
$('#fileInput').onchange=async event=>{
  const file=event.target.files[0];if(!file||state.operation)return;state.operation=true;updateStatus();
  try{if(file.size>1_900_000)throw new Error(t('classic.app.useAFileSmallerThan1'));const text=await file.text(),data=file.name.toLowerCase().endsWith('.json')?{project:JSON.parse(text)}:{outline:text};const imported=await json('/api/import',data),saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();if(imported.warnings.length)toast(imported.warnings.join(' '));}catch(error){onError(error);}finally{event.target.value='';state.operation=false;updateStatus();}
};
$('#addSource').onclick=()=>{try{const title=$('#sourceTitle').value.trim(),url=$('#sourceURL').value.trim(),parsed=new URL(url);if(!title||!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error(t('classic.app.addANameAndANormal'));changed(()=>{const id='src_'+crypto.randomUUID().replaceAll('-','').slice(0,16);state.project.sources.push({id,title,url});slide().sourceIds.push(id);},{full:true});$('#sourceTitle').value='';$('#sourceURL').value='';}catch(error){onError(error);}};
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.slide)selectSlide(button.dataset.slide);if(button.dataset.layout&&state.previewState==='ready')changed(()=>slide().design.layout=button.dataset.layout);
  if(button.dataset.theme)changed(()=>state.project.theme=button.dataset.theme,{full:true});if(button.dataset.close)$('#'+button.dataset.close).close();if(button.dataset.export)exportFile(button.dataset.export);if(button.dataset.tab)setTab(button.dataset.tab);
});
document.addEventListener('change',event=>{if(event.target.dataset.source){const id=event.target.dataset.source;changed(()=>{const s=slide();s.sourceIds=event.target.checked?[...new Set([...s.sourceIds,id])]:s.sourceIds.filter(v=>v!==id);});}});
document.addEventListener('keydown',event=>{
  if(document.body.classList.contains('presenting'))return;
  // Alt+Up / Alt+Down move the current page, outside text fields (where Alt+arrows move the caret) and dialogs.
  if(event.altKey&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&['ArrowUp','ArrowDown'].includes(event.key)&&!event.isComposing&&!state.composing&&!event.target.closest('input,textarea,select,[contenteditable="true"]')&&!document.querySelector('dialog[open]')){event.preventDefault();slideAction(event.key==='ArrowUp'?'up':'down');return;}
  if(event.target.matches('[role="tab"]')&&!event.isComposing){const tabs=[...document.querySelectorAll('[role="tab"]')],i=tabs.indexOf(event.target);let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();setTab(tabs[next].dataset.tab,true);return;}}
  const action=keyboardAction(event,{editing:!!event.target.closest('input,textarea,select,[contenteditable="true"]'),modal:!!document.querySelector('dialog[open]'),composing:state.composing,presenting:document.body.classList.contains('presenting')});
  if(!action||!state.project)return;event.preventDefault();
  if(action==='save')save();else if(action==='undo')undo();else if(action==='redo')undo(true);else if(action==='escape')present(true);
  else if(action.startsWith('layout-')&&state.previewState==='ready'){const choice=state.preview.choices[Number(action.at(-1))-1];if(choice)changed(()=>slide().design.layout=choice.id);}
  else{const i=state.project.slides.findIndex(s=>s.id===state.active),next=action==='first'?0:action==='last'?state.project.slides.length-1:i+(action==='next'?1:-1);if(state.project.slides[next])selectSlide(state.project.slides[next].id);}
});
window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});
document.fonts.addEventListener?.('loadingdone',()=>{if(state.project&&!state.composing)schedulePreview();});
// First run (design guide §10): an empty library shows one paste box on the stage instead of an empty workbench.
function showFirstRun(){state.firstRun=true;document.body.classList.add('first-run');$('#canvas').hidden=true;$('#firstRun').hidden=false;updateStatus();$('#firstRunText').focus();}
// Arrange reuses the outline dialog's submit handler. That parser splits pages on --- lines only, so blank lines become ---.
$('#firstRun').onsubmit=async event=>{
  event.preventDefault();const text=$('#firstRunText').value.replace(/\r\n?/g,'\n').trim();if(!text||state.operation)return;
  $('#outline').value=text.replace(/\n[ \t]*\n\s*/g,'\n---\n');$('#outlineError').textContent=$('#firstRunError').textContent='';
  const button=$('#firstRun [type=submit]');button.disabled=true;
  try{await $('#outlineForm').onsubmit(new SubmitEvent('submit',{cancelable:true}));}finally{button.disabled=false;}
  if($('#outlineError').textContent&&$('#firstRun'))$('#firstRunError').textContent=$('#outlineError').textContent;
};
$('#firstRun [data-example]').onclick=async()=>{
  if(state.operation)return;state.operation=true;updateStatus();
  try{const example=await(await fetch(`/examples/welcome${state.locale==='zh-CN'?'.zh-CN':''}.deck.json`)).json();const imported=await json('/api/import',{project:example}),saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();}
  catch(error){$('#firstRunError').textContent=error.message;}finally{state.operation=false;updateStatus();}
};
// Files dropped on the stage go through the Import handler of #fileInput. A dashed yellow line shows where to drop.
const droppable=event=>[...(event.dataTransfer?.types||[])].includes('Files');
$('#stage').addEventListener('dragover',event=>{if(!droppable(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';$('#stage').classList.add('drop-ready');});
$('#stage').addEventListener('dragleave',event=>{if(!$('#stage').contains(event.relatedTarget))$('#stage').classList.remove('drop-ready');});
$('#stage').addEventListener('drop',async event=>{
  if(!droppable(event))return;event.preventDefault();$('#stage').classList.remove('drop-ready');
  const file=event.dataTransfer.files[0];if(!file||state.operation)return;
  if(!/\.(json|md|txt)$/i.test(file.name)){toast(t('classic.app.dropAJsonMdOrTxt'));return;}
  if(state.project&&!await canLeave())return;
  const files=new DataTransfer();files.items.add(file);$('#fileInput').files=files.files;$('#fileInput').dispatchEvent(new Event('change'));
});
async function boot(){updateStatus();state.token=(await(await fetch('/api/session')).json()).token;const projects=await library(),first=projects.find(p=>!p.unreadable);if(first)activate((await json(`/api/projects/${first.id}`,undefined,'GET')).project);else showFirstRun();}
setTab('content');boot().catch(onError);
// History UI is a separate, read-only workflow until an explicit restore-as-copy.
import { mountHistory } from './history.js';
mountHistory({state,$,t:pick,x,json,dialogs,toast,onError,measurePreview,library,switchProject,activate,updateStatus});
mountAgentBridge({state,$,json,dialogs,onError,canLeave,activate,library,pitchMode});
import {mountStudioTools} from './studio-tools.js';
mountStudioTools({state,$,dialogs,json,canLeave,activate,library});
applyActions(document);
mountPreferences({dialogs,$,locale:()=>state.locale});
presenter=mountPresenter({state,$,json,dialogs,onError:error=>{if(['STALE_MEASUREMENT','MEASUREMENT_EXPIRED','MEASUREMENT_REQUIRED'].includes(error.code))schedulePreview();onError(error);}});
try{localStorage.removeItem('deckweft.layouts.collapsed');}catch{} // the previews are always open now

mountStoryboard({state,$,json,dialogs,canLeave,activate,library,changed});
// The assistant group only appears once a host agent is connected; checked each time the drawer opens (a startup call would race the session token).
async function refreshAssistant(){try{const status=await json('/api/agent/status',undefined,'GET');$('#moreAgent').hidden=!status.connected;}catch{$('#moreAgent').hidden=true;}}
// Items that open their own dialog or export dismiss the drawer first, so the drawer behaves like a menu and focus returns to #openMore.
moreDrawer.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&(['openHistory','openAgent','openRehearsal','openSettings','openStoryboard','importButton','newDeck'].includes(b.id)||b.dataset.export))moreDrawer.close();},true);
$('#openMore').onclick=()=>{refreshAssistant();dialogs.open(moreDrawer,$('#openMore'));};
