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
applyPitchMode(document);
const $=selector=>document.querySelector(selector);
const en=Object.fromEntries([...document.querySelectorAll('[data-i18n]')].map(el=>[el.dataset.i18n,el.textContent]));
const zh={brandNote:'把想法，排成清晰的故事。',save:'保存',present:'演示',export:'带走',story:'你的故事',new:'新建',add:'+ 添加一页',import:'导入文稿',privacy:'保存在你的电脑，不会暗中上传。',workbench:'工作台',slides:'页面',edit:'编辑',exit:'退出演示',auto:'帮我选',content:'内容',design:'设计',sources:'来源',wordsFirst:'先把话说清楚。',wordsNote:'一张幻灯片，讲一个有用的想法。',eyebrow:'小标签',headline:'大标题',body:'补充说明',points:'要点',metrics:'数字',notes:'讲者备注',duplicate:'复制',delete:'删除',quietDesign:'让想法成为主角。',designNote:'先有清晰结构，再考虑装饰。',theme:'颜色主题',paper:'温暖纸张',midnight:'午夜墨色',ocean:'宁静海洋',role:'这一页的任务',contentLocale:'文稿语言 / 字体偏好',localeNote:'切换这里不会翻译现有文字。',motion:'After Effects 入场方式',duration:'每页时长（秒）',motionNote:'HTML 可播放这些入场；PowerPoint 保持静态，AE 接收动效交接。',evidenceTitle:'告诉读者，依据在哪里。',evidenceNote:'保存一个网址，不等于验证了事实。',sourceTitle:'来源名称',sourceURL:'来源网址',addSource:'添加并关联到本页',preflight:'导出前检查',qualityNote:'演示软件可能替换字体，请先检查文件。',footer:'DeckWeft',newTitle:'你想表达什么？',outlineHelp:'先写标题，再写补充内容。单独一行 --- 表示新的一页。这里仅排列你的文字，不会调用 AI。',outline:'你的大纲',cancel:'取消',arrange:'整理我的大纲',takeDeck:'把你的故事带走。',exportNote:'PowerPoint 保留可编辑文字；备份保留全部内容。',editable:'可编辑文字和形状',offline:'浏览器离线打开',backup:'保存完整备份',currentOnly:'仅当前页面',importLayers:'使用附带插件导入',aeImport:'使用附带 JSX 导入',handoffNote:'Figma 与 AE 交接为实验功能。这里不会上传到云端。'};
Object.assign(zh,{history:'历史版本',historyTitle:'找回之前的好想法。',historyHelp:'像翻相册一样查看旧版本。恢复会新建一个副本，不会覆盖原文稿。',loadOlder:'更早的版本',restoreCopy:'恢复为新副本',openCopy:'打开恢复的副本',close:'关闭',previousPage:'上一页',nextPage:'下一页',refresh:'重试',leaveTitle:'先保护你的修改。',leaveHelp:'离开前，可以保存当前修改，或继续留在这里。',saveLeave:'保存并继续',discardLeave:'放弃修改并继续',keepEditing:'留在这里',drawerTitle:'编辑工具',localTitle:'文稿名称'});
Object.assign(zh,{includeSpeakerNotes:'包含私密讲者备注和来源说明',publicExport:'私密备注默认不会导出，勾选后才包含；备份保留全部内容。',settings:'设置',privatePresenter:'私密讲者界面',backEditor:'返回编辑',openAudience:'打开观众窗口',shareAudience:'只共享观众窗口，或使用扩展屏幕。',currentSlide:'当前页',nextSlide:'下一页',speakerScript:'讲者提词',readingOptions:'阅读设置',englishPace:'英文词 / 分钟',chinesePace:'中文字符 / 分钟',pauseLength:'每句停顿（秒）',scriptFont:'讲稿字号',scriptWidth:'侧栏宽度',dockSide:'侧栏位置',dockRight:'右侧',dockLeft:'左侧',calibrate:'用本页校准语速',resumeFollowing:'继续跟随',restartScript:'重置本页提词',appearanceAccess:'外观与无障碍',editorAppearance:'编辑器外观',system:'跟随系统',light:'浅色',dark:'深色',themeSeparate:'幻灯片保持原有配色。这些设置只改变工作区。',reduceMotion:'减弱动态效果',advancedPlayback:'高级播放设置',motionPolicy:'动画策略',fullMotion:'完整动态',reducedMotion:'减弱动态',noMotion:'关闭动画'});
Object.assign(zh,{moreIntro:'大多数人不需要打开这里。',zoneWords:'词',zoneLook:'样子',moreVersions:'之前的版本',moreAgent:'让助手帮我写',agentHelp:'让助手帮我写',morePresenting:'放映设置',moreLanguage:'语言',moreBackup:'备份与还原',moreDeveloper:'给开发者',planStory:'规划故事',rehearse:'排练'});
const labels={en:{editorial:'Editorial split',spotlight:'Statement stage',grid:'Evidence grid',timeline:'Step by step'},'zh-CN':{editorial:'编辑分栏',spotlight:'主张聚焦',grid:'证据网格',timeline:'逐步展开'}};
const state={token:'',project:null,active:'',preview:null,dirty:false,saving:false,operation:false,exporting:false,locale:'en',counter:0,previewState:'idle',composing:false,saveFailed:false,autoSaveBlocked:false};
const moreDrawer=$('#moreDialog');
const edits=new EditHistory(),dialogs=new DialogManager(document),textMeasurer=new BrowserTextMeasurer();
let previewTimer,previewTicket=0,previewAbort,toastTimer,presenter;
const t=(english,chinese)=>state.locale==='zh-CN'?chinese:english;
const x=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reconnect=sessionRecovery({t,setToken:token=>{state.token=token;}});
// A 401 is answered before the request is handled, so one retry after reconnecting cannot repeat a change.
async function api(url,data,method='POST',signal,retry=true){
  const response=await fetch(url,{method,signal,headers:{Authorization:`Bearer ${state.token}`,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(response.status===401&&retry){await reconnect();return api(url,data,method,signal,false);}
  if(!response.ok){let value;try{value=await response.json();}catch{value={error:{message:`HTTP ${response.status}`}};}const error=new Error(value.error.message);Object.assign(error,value.error);throw error;}return response;
}
async function json(url,data,method='POST',signal){return(await api(url,data,method,signal)).json();}
function toast(message){clearTimeout(toastTimer);$('#toastRegion').textContent=message;$('#toastRegion').classList.add('visible');toastTimer=setTimeout(()=>{$('#toastRegion').textContent='';$('#toastRegion').classList.remove('visible');},6500);}
function notice(message,tone){$('#issueBanner').hidden=!message;$('#issueBanner').textContent=message||'';$('#issueBanner').classList.toggle('warning',tone==='warning');}
function onError(error){if(error.name==='AbortError')return;notice(error.message||String(error));toast(error.message||String(error));}
function slide(){return state.project?.slides.find(s=>s.id===state.active);}
function ready(){return !!state.project&&!state.operation;}
function updateStatus(){
  const p=state.project,i=p?.slides.findIndex(s=>s.id===state.active)??0,count=p?.slides.length||0;
  const attention=state.saveFailed||state.previewState==='error'||(state.previewState==='ready'&&state.preview?.audit.ok===false);
  const square=!p?'saving':attention?'attention':state.saving?'saving':state.dirty?'unsaved':'saved';
  const words=!p?t('Opening local library…','正在打开本地文稿…'):state.saveFailed?t('Not saved — see the notice above','未能保存 — 请看上方提示'):state.previewState==='error'?t('Preview not updated — fix the fields','预览未更新，请修复字段'):attention?t('Layout needs attention','需要调整排版'):state.saving?t('Saving…','正在保存…'):state.dirty?t('Unsaved changes · ⌘/Ctrl S','尚未保存 · ⌘/Ctrl S'):t('Saved on this computer','已保存在本机');
  $('#saveState').dataset.state=square;$('#saveState').title=words;$('#saveState .sr-only').textContent=words;
  $('#save').disabled=!ready()||state.saving||!state.dirty||state.composing;
  $('#undo').disabled=!ready()||!edits.past.length||state.composing;$('#redo').disabled=!ready()||!edits.future.length||state.composing;
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
  edits.capture(before,previousActive,group);state.dirty=true;state.counter++;updateStatus();if(full)renderEditor();if(!state.composing)schedulePreview();scheduleSave();
}
function undo(redo=false){
  if(!ready()||state.composing)return;const next=edits.step(state.project,state.active,redo);if(!next)return;
  state.project=next.project;state.active=next.project.slides.some(s=>s.id===next.active)?next.active:next.project.slides[0].id;
  state.dirty=true;state.counter++;renderEditor();schedulePreview();scheduleSave();
}
// Redo stays out of the way: holding Undo for 500 ms shows it, and it hides again 1 s after release. The release that ends a hold is not an Undo.
let undoHeld=false,holdTimer=0,hideTimer=0;
function showRedo(){clearTimeout(hideTimer);$('#redo').hidden=false;undoHeld=true;}
function armRedoHide(){clearTimeout(holdTimer);clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if($('#redo').matches(':hover')||$('#undo').matches(':hover'))return armRedoHide();$('#redo').hidden=true;undoHeld=false;},1000);}
$('#undo').addEventListener('pointerdown',()=>{undoHeld=false;clearTimeout(holdTimer);holdTimer=setTimeout(showRedo,500);});
for(const type of ['pointerup','pointercancel','pointerleave'])$('#undo').addEventListener(type,()=>{clearTimeout(holdTimer);if(!$('#redo').hidden)armRedoHide();});
for(const type of ['pointerup','pointerleave','click'])$('#redo').addEventListener(type,()=>armRedoHide());
function localize(){
  const workbenchLink=document.querySelector('.visual-studio-link');if(workbenchLink)workbenchLink.textContent=t('Visual Studio · Prompt workbench','Visual Studio · 提示词工作台');
  if(pitchMode)state.locale='en';
  document.documentElement.lang=state.locale;document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;el.textContent=state.locale==='zh-CN'?(zh[key]||en[key]):en[key];});
  $('#uiLanguage').textContent=state.locale==='zh-CN'?'English':'中文';
  const accessible={undo:['Undo','撤销'],redo:['Redo','重做'],deckTitle:['Deck title','文稿名称'],moveUp:['Move slide up','上移一页'],moveDown:['Move slide down','下移一页'],uiLanguage:['Switch interface language','切换界面语言'],openMore:['More','更多'],ratio:['Slide aspect ratio','页面比例'],projectPicker:['Local library','本地文稿库']};
  for(const [id,[english,chinese]]of Object.entries(accessible))$('#'+id).setAttribute('aria-label',t(english,chinese));
  const jobs=state.locale==='zh-CN'?['开启故事','解释背景','展示证据','解释过程','促成决策','结束故事']:['Open the story','Explain the context','Show evidence','Explain a process','Make a decision','Close the story'];
  [...$('#role').options].forEach((option,i)=>option.textContent=jobs[i]);
  const motionLabels=state.locale==='zh-CN'?['无','柔和淡入','轻微上移']:['None','Soft fade','Gentle rise'];[...$('#motion').options].forEach((option,i)=>option.textContent=motionLabels[i]);
  if(state.project){renderEditor();renderPreview();}window.dispatchEvent(new Event('deckweft:locale'));
}
async function library(){
  let {projects}=await json('/api/projects',undefined,'GET');
  if(pitchMode){const english=[];for(const project of projects){if(project.unreadable)continue;const full=(await json(`/api/projects/${project.id}`,undefined,'GET')).project;if(projectIsEnglish(full))english.push(project);}projects=english;}
  $('#projectPicker').innerHTML=projects.map(p=>`<option value="${x(p.id)}" ${p.unreadable?'disabled':''}>${x(p.title)}${p.unreadable?t(' · needs repair',' · 需要修复'):''}</option>`).join('');
  if(state.project)$('#projectPicker').value=state.project.id;return projects;
}
function activate(project){
  if(pitchMode&&!projectIsEnglish(project))throw new Error('Presentation mode opens English projects only. Use the standard Studio to open another language edition.');
  cancelPreview();clearTimeout(saveTimer);state.saveFailed=false;state.autoSaveBlocked=false;state.project=project;state.active=project.slides[0].id;state.dirty=false;edits.reset();state.counter++;state.preview=null;state.previewState='pending';notice('');clearFieldErrors();renderEditor();schedulePreview();
}
function renderEditor(){
  const p=state.project,s=slide();if(!p||!s)return;
  $('#deckTitle').value=p.title;$('#deckTitleSmall').value=p.title;$('#ratio').value=p.aspectRatio;$('#contentLocale').value=p.locale;
  $('#projectPicker').value=p.id;$('#pageCount').textContent=`${p.slides.findIndex(v=>v.id===s.id)+1} / ${p.slides.length}`;
  for(const key of ['eyebrow','body'])$('#'+key).value=s.content[key];$('#slideTitle').value=s.content.title;
  $('#items').value=s.content.items.join('\n');$('#metrics').value=s.content.metrics.map(m=>`${m.value} | ${m.label}`).join('\n');$('#notes').value=s.notes;
  $('#stageStyle').disabled=p.schemaVersion===2;$('#autoLayout').hidden=p.schemaVersion===2;$('#stageStyle').value=p.extensions?.deckweftShowcase?.style==='cosmos-dots'?'cosmos-dots':'studio';$('#role').value=s.role;$('#motion').value=s.motion.preset;$('#duration').value=s.motion.duration;
  document.querySelectorAll('[data-theme]').forEach(el=>{el.classList.toggle('selected',el.dataset.theme===p.theme);el.setAttribute('aria-pressed',String(el.dataset.theme===p.theme));});
  $('#sourceList').innerHTML=p.sources.map(source=>`<label class="source-option"><input type="checkbox" data-source="${x(source.id)}" ${s.sourceIds.includes(source.id)?'checked':''}><span>${x(source.title)}<br><small>${x(source.url)}</small></span></label>`).join('')||`<p class="hint">${t('No sources yet. Add one below.','还没有来源，在下方添加。')}</p>`;
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
  $('#slideList').innerHTML=p.slides.map((s,i)=>{const result=state.preview?.slides.find(r=>r.slideId===s.id);return `<button class="thumbnail ${s.id===state.active?'active':''}" data-slide="${x(s.id)}" aria-label="${x(t('Slide','页面')+' '+(i+1)+': '+s.content.title)}" aria-current="${s.id===state.active?'true':'false'}"><span aria-hidden="true">${result?.svg||'<div class="placeholder">…</div>'}</span><span class="thumbnail-meta"><span>${String(i+1).padStart(2,'0')}</span><span>${x(s.content.title)}</span></span></button>`}).join('');
  const result=state.preview?.slides.find(r=>r.slideId===state.active);
  if(result){
    $('#canvas').innerHTML=result.svg;sizeCanvas();$('#layoutCaption').textContent=(p.schemaVersion===2?slide().intent.visualFamily:(labels[state.locale][result.selected]||result.selected))+' · '+t('editable text + shapes','可编辑文字和形状');
    const choices=state.preview.choices||[];
    $('#candidates').innerHTML=choices.map((c,i)=>`<button class="candidate ${result.selected===c.id?'selected':''}${c.eligible?'':' unfit'}" data-layout="${c.id}" aria-label="${x(p.schemaVersion===2?c.label:(labels[state.locale][c.id]||c.id))}" aria-pressed="${result.selected===c.id}" title="${x(c.explanation)}">${c.eligible?'':`<span class="unfit-reason">${t('Too much text to fit','文字太多，放不下')}</span>`}<span aria-hidden="true">${c.svg}</span><span class="candidate-label"><span>${i+1} · ${x(p.schemaVersion===2?c.label:(labels[state.locale][c.id]||c.id))}</span></span></button>`).join('');
    const audit=state.preview.audit,current=audit.issues.filter(i=>!i.slideId||i.slideId===state.active);
    $('#qualityCount').textContent=current.length?String(current.length):t('Clear','通过');
    $('#qualityIssues').innerHTML=current.length?current.map(i=>`<div class="quality-item ${i.severity}">${i.severity==='error'?'!':'○'} ${x(state.locale==='zh-CN'?(i.code==='SOURCE_NEEDED'?'这些数字尚未关联来源，请补充或在备注中说明是示例。':i.code==='TEXT_OVERFLOW'?'有文字超出边界，请缩短文字或换一种布局。':i.message):i.message)}</div>`).join(''):`<div class="quality-item good">✓ ${t('No layout blockers on this slide.','本页未发现排版阻塞。')}</div>`;
    const fonts=Object.entries(state.preview.measurement?.fontProbes||{}).filter(([,ok])=>ok).map(([name])=>name);
    $('#measurementNote').textContent=t('Browser measurement. Local fonts detected: ','浏览器实测。检测到的本地字体：')+(fonts.join(', ')||t('none confirmed; browser fallback used.','未确认，使用浏览器后备字体。'));
  }else{$('#canvas').innerHTML=`<p>${t('Measuring your slide…','正在测量页面…')}</p>`;$('#candidates').replaceChildren();}
  updateStatus();restoreDynamicFocus(focused);window.dispatchEvent(new Event('deckweft:preview'));
}
function sizeCanvas(){const svg=$('#canvas svg');if(!svg)return;const [,,w,h]=svg.getAttribute('viewBox').split(' ').map(Number),stage=$('#stage'),style=getComputedStyle(stage),aw=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),ah=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),scale=Math.min(aw/w,ah/h);$('#canvas').style.width=`${Math.max(1,w*scale)}px`;$('#canvas').style.height=`${Math.max(1,h*scale)}px`;}
document.addEventListener('compositionstart',()=>{if(!state.composing){state.composing=true;cancelPreview();state.previewState='pending';updateStatus();}});
document.addEventListener('compositionend',()=>{if(state.composing){state.composing=false;edits.endGroup();schedulePreview();scheduleSave();}});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{if(state.composing)event.preventDefault();}));
new ResizeObserver(sizeCanvas).observe($('#stage'));window.addEventListener('resize',()=>dialogs.resize(innerWidth));
// After a 409 the author may keep the draft as a new deck through the import-as-copy route; the newer revision stays untouched.
async function saveCopy(){
  if(!await askSaveCopy(t))return false;
  const draft=structuredClone(state.project),active=state.active;
  const imported=await json('/api/import',{project:draft}),saved=await json('/api/projects',{project:imported.project});
  activate(saved.project);selectSlide(active);await library();toast(t('Saved as a separate copy. The newer version was not changed.','已另存为独立副本，较新版本未改动。'));return true;
}
// Autosave: 1200 ms after the last edit. A conflict never opens the copy dialog on its own; it stops autosave and the square turns red until a manual save or reopen.
let saveTimer=0;
function scheduleSave(){clearTimeout(saveTimer);if(state.composing||state.autoSaveBlocked||!state.dirty)return;saveTimer=setTimeout(()=>{if(!state.composing)save({auto:true});},1200);}
async function save({auto=false}={}){
  if(!state.project||state.saving||state.composing)return false;if(!state.dirty)return true;
  clearTimeout(saveTimer);reconnect.offerAgain();state.saving=true;edits.endGroup();updateStatus();const snapshot=structuredClone(state.project),counter=state.counter;let failed=false;
  try{const {project,historyUsage}=await json(`/api/projects/${snapshot.id}`,{project:snapshot,expectedRevision:snapshot.revision.number},'PUT');
    if(state.project.id===snapshot.id){state.project.revision=project.revision;if(counter===state.counter)state.dirty=false;}
    state.saveFailed=false;state.autoSaveBlocked=false;
    // From 80% of the suggested history size the banner explains cleanup; nothing is deleted.
    await library();notice(historyCapacityNote(historyUsage,t),'warning');return !state.dirty;
  }catch(error){failed=true;
    if(error.code==='REVISION_CONFLICT'){
      if(!auto){try{if(await saveCopy())return true;}catch(copyError){state.saveFailed=true;onError(copyError);return false;}}
      state.saveFailed=true;state.autoSaveBlocked=true;notice(t('Another window saved first. Your edits are still here. Export Project JSON to keep a draft, then reopen or import it as a new copy.','另一窗口先保存了。你的修改仍在这里。先导出项目 JSON 保留草稿，再重新打开或导入为新副本。'));
    }else{state.saveFailed=true;onError(error);}
    return false;
  }finally{state.saving=false;updateStatus();if(!failed)scheduleSave();}
}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function exportFile(format){
  if(!ready()||state.exporting)return;const snapshot=structuredClone(state.project);state.exporting=true;updateStatus();
  try{
    // Always allow a raw draft backup, even when a field is temporarily invalid.
    const blob=format==='json'?new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}):await(await api(`/api/export/${format}`,{project:snapshot,slideIndex:snapshot.slides.findIndex(s=>s.id===state.active),renderTicket:state.preview?.renderTicket,requireMeasured:true,includeNotes:$('#exportNotes').checked,motion:getPreferences().motion})).blob();
    const extension={json:'deck.json',motion:'motion.json',figma:'figma.json'}[format]||format;
    download(blob,`${snapshot.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,70)||'deckweft'}.${extension}`);$('#exportDialog').close();toast(format==='json'?t('Draft backup created. Invalid fields still need repair before re-import.','已备份草稿。无效字段仍需修复后才能重新导入。'):t('Export created from the measured preview. Check it in your presentation app.','已按实测预览导出。请在演示软件中检查文件。'));
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
    const saveClick=async()=>{busy(true);const ok=await save();busy(false);if(ok)done(true);else $('#leaveError').textContent=t('Saving did not finish. Keep editing or export a draft backup.','保存未完成。请继续编辑或导出草稿备份。');};
    keep.addEventListener('click',cancelClick);discard.addEventListener('click',discardClick);saveButton.addEventListener('click',saveClick);dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',closed);
  });
  return leavePromise;
}
function selectSlide(id){if(!ready()||state.composing||state.active===id||!state.project.slides.some(s=>s.id===id))return;edits.endGroup();state.active=id;state.previewState='pending';renderEditor();schedulePreview();$('#presentLive').textContent=slide().content.title;}
function present(exit=false){
  if(exit)presenter?.stop();else presenter?.start();
}
function freshSlide(){return {id:'slide_'+crypto.randomUUID().replaceAll('-','').slice(0,16),role:'context',content:{eyebrow:'',title:t('A clear idea','一个清晰的想法'),body:'',items:[],metrics:[]},design:{layout:'auto'},motion:{preset:'none',duration:6},notes:'',sourceIds:[]};}
function slideAction(type){
  if(!ready()||state.composing)return;const i=state.project.slides.findIndex(s=>s.id===state.active);if(!validSlideAction(type,i,state.project.slides.length))return;
  changed(()=>{const p=state.project;
    if(type==='add'){const s=freshSlide();p.slides.splice(i+1,0,s);state.active=s.id;}
    if(type==='duplicate'){const s=structuredClone(slide());s.id=freshSlide().id;p.slides.splice(i+1,0,s);state.active=s.id;}
    if(type==='delete'){p.slides.splice(i,1);state.active=p.slides[Math.min(i,p.slides.length-1)].id;}
    if(type==='up')p.slides.splice(i-1,0,p.slides.splice(i,1)[0]);if(type==='down')p.slides.splice(i+1,0,p.slides.splice(i,1)[0]);
  },{full:true});
}
function setTab(name,focus=false){
  document.querySelectorAll('[data-tab]').forEach(b=>{const chosen=b.dataset.tab===name;b.setAttribute('aria-selected',String(chosen));b.tabIndex=chosen?0:-1;if(chosen&&focus)b.focus();});
  for(const id of ['content','design','sources'])$('#'+id+'Panel').hidden=id!==name;
}
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
$('#save').onclick=()=>save();$('#undo').onclick=event=>{if(undoHeld){undoHeld=false;event.preventDefault();return;}undo();};$('#redo').onclick=()=>undo(true);$('#present').onclick=()=>{if(!moreDrawer.open)return present();moreDrawer.addEventListener('close',()=>present(),{once:true});moreDrawer.close();}; // start after focus has returned, so the presenter keeps its own focus
$('#exitPresent').onclick=()=>present(true);
$('#openExport').onclick=()=>{updateStatus();dialogs.open($('#exportDialog'));};$('#newDeck').onclick=async()=>{dialogs.closeDrawer();if(await canLeave())dialogs.open($('#outlineDialog'),$('#newDeck'));};
$('#autoLayout').onclick=()=>changed(()=>slide().design.layout='auto');
// On phones the page list is a fixed strip, and the two zone buttons open the one sheet on the Words or the Look section.
const phone=matchMedia('(max-width:680px)');
$('#toggleStory').onclick=()=>{if(phone.matches){setTab('content');dialogs.openDrawer('inspector',$('#toggleStory'));}else dialogs.openDrawer('story');};
$('#toggleInspector').onclick=()=>{if(phone.matches)setTab('design');dialogs.openDrawer('inspector');};
// Phone top band keeps brand, state square, More and Take away: the title and Undo move to the top of the More drawer (moved, never copied).
const topSlots=['undo','redo','deckTitle'].map(id=>{const el=$('#'+id),marker=document.createComment('top-'+id);el.before(marker);return {el,marker};});
function placeTopControls(){for(const {el,marker} of topSlots){if(phone.matches)$('#moreTop').append(el);else marker.after(el);}}
function labelZones(){$('#toggleStory').setAttribute('aria-label',phone.matches?t('Words','词'):t('Slides','页面'));$('#toggleInspector').setAttribute('aria-label',phone.matches?t('Look','样子'):t('Edit','编辑'));}
phone.addEventListener('change',()=>{placeTopControls();labelZones();});window.addEventListener('deckweft:locale',labelZones);placeTopControls();labelZones();
$('#uiLanguage').onclick=()=>{if(state.composing||pitchMode)return;state.locale=state.locale==='en'?'zh-CN':'en';localize();};
for(const [id,type]of Object.entries({addSlide:'add',duplicate:'duplicate',moveUp:'up',moveDown:'down',deleteSlide:'delete'}))$('#'+id).onclick=()=>slideAction(type);
async function switchProject(id){
  if(!ready()||state.saving)return false;if(!await canLeave()){$('#projectPicker').value=state.project.id;return false;}
  state.operation=true;updateStatus();
  try{activate((await json(`/api/projects/${id}`,undefined,'GET')).project);return true;}catch(error){$('#projectPicker').value=state.project.id;onError(error);return false;}finally{state.operation=false;updateStatus();}
}
$('#projectPicker').onchange=e=>switchProject(e.target.value);
$('#outlineForm').onsubmit=async event=>{event.preventDefault();if(state.operation)return;state.operation=true;$('#arrangeOutline').disabled=true;updateStatus();try{const imported=await json('/api/import',{outline:$('#outline').value,locale:state.project?.locale||'en'});const saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();$('#outlineDialog').close();}catch(error){$('#outlineError').textContent=error.message;}finally{state.operation=false;$('#arrangeOutline').disabled=false;updateStatus();}};
$('#importButton').onclick=async()=>{dialogs.closeDrawer();if(await canLeave())$('#fileInput').click();};
$('#fileInput').onchange=async event=>{
  const file=event.target.files[0];if(!file||state.operation)return;state.operation=true;updateStatus();
  try{if(file.size>1_900_000)throw new Error(t('Use a file smaller than 1.9 MB.','请选择小于 1.9 MB 的文件。'));const text=await file.text(),data=file.name.toLowerCase().endsWith('.json')?{project:JSON.parse(text)}:{outline:text};const imported=await json('/api/import',data),saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();if(imported.warnings.length)toast(imported.warnings.join(' '));}catch(error){onError(error);}finally{event.target.value='';state.operation=false;updateStatus();}
};
$('#addSource').onclick=()=>{try{const title=$('#sourceTitle').value.trim(),url=$('#sourceURL').value.trim(),parsed=new URL(url);if(!title||!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error(t('Add a name and a normal HTTP(S) URL.','请填写来源名称和正常的 HTTP(S) 网址。'));changed(()=>{const id='src_'+crypto.randomUUID().replaceAll('-','').slice(0,16);state.project.sources.push({id,title,url});slide().sourceIds.push(id);},{full:true});$('#sourceTitle').value='';$('#sourceURL').value='';}catch(error){onError(error);}};
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.slide)selectSlide(button.dataset.slide);if(button.dataset.layout&&state.previewState==='ready')changed(()=>slide().design.layout=button.dataset.layout);
  if(button.dataset.theme)changed(()=>state.project.theme=button.dataset.theme,{full:true});if(button.dataset.close)$('#'+button.dataset.close).close();if(button.dataset.export)exportFile(button.dataset.export);if(button.dataset.tab)setTab(button.dataset.tab);
});
document.addEventListener('change',event=>{if(event.target.dataset.source){const id=event.target.dataset.source;changed(()=>{const s=slide();s.sourceIds=event.target.checked?[...new Set([...s.sourceIds,id])]:s.sourceIds.filter(v=>v!==id);});}});
document.addEventListener('keydown',event=>{
  if(document.body.classList.contains('presenting'))return;
  if(event.target.matches('[role="tab"]')&&!event.isComposing){const tabs=[...document.querySelectorAll('[role="tab"]')],i=tabs.indexOf(event.target);let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();setTab(tabs[next].dataset.tab,true);return;}}
  const action=keyboardAction(event,{editing:!!event.target.closest('input,textarea,select,[contenteditable="true"]'),modal:!!document.querySelector('dialog[open]'),composing:state.composing,presenting:document.body.classList.contains('presenting')});
  if(!action||!state.project)return;event.preventDefault();
  if(action==='save')save();else if(action==='undo')undo();else if(action==='redo')undo(true);else if(action==='escape')present(true);
  else if(action.startsWith('layout-')&&state.previewState==='ready'){const choice=state.preview.choices[Number(action.at(-1))-1];if(choice)changed(()=>slide().design.layout=choice.id);}
  else{const i=state.project.slides.findIndex(s=>s.id===state.active),next=action==='first'?0:action==='last'?state.project.slides.length-1:i+(action==='next'?1:-1);if(state.project.slides[next])selectSlide(state.project.slides[next].id);}
});
window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});
document.fonts.addEventListener?.('loadingdone',()=>{if(state.project&&!state.composing)schedulePreview();});
async function boot(){updateStatus();state.token=(await(await fetch('/api/session')).json()).token;const projects=await library(),first=projects.find(p=>!p.unreadable);if(first)activate((await json(`/api/projects/${first.id}`,undefined,'GET')).project);else{const created=await json('/api/projects',{options:{title:'My first deck'}});activate(created.project);await library();}}
setTab('content');boot().catch(onError);
// History UI is a separate, read-only workflow until an explicit restore-as-copy.
import { mountHistory } from './history.js';
mountHistory({state,$,t,x,json,dialogs,toast,onError,measurePreview,library,switchProject,activate,updateStatus});
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
