// The classic deck kind (v1 / v2 projects through /api/projects): the adapter that plugs the classic workbench
// into shell.js. The shell owns the band, the strip, the first run, the zones and the drawer; this file owns the
// deck, the measured canvas, the Words and Look fields, saving, exports and the classic dialogs in index.html.
import {mountStoryboard} from '../storyboard.js';
import { BrowserTextMeasurer } from '../text-measurer.js';
import { EditHistory,keyboardAction,validSlideAction } from '../interaction.js';
import {pitchMode,applyPitchMode,projectIsEnglish} from '../pitch-mode.js';
import {mountAgentBridge} from '../agent-bridge.js';
import {mountPreferences,getPreferences} from '../preferences.js';
import {applyActions} from '../actions.js';
import {mountPresenter} from '../presenter.js';
import { mountHistory } from '../history.js';
import {mountStudioTools} from '../studio-tools.js';
const $=selector=>document.querySelector(selector);
const zh={wordsFirst:'先把话说清楚。',wordsNote:'一张幻灯片，讲一个有用的想法。',eyebrow:'小字',headline:'标题',body:'说明',points:'要点',metrics:'数字',notes:'讲者备注',quietDesign:'让想法成为主角。',designNote:'先有清晰结构，再考虑装饰。',theme:'颜色主题',paper:'温暖纸张',midnight:'午夜墨色',ocean:'宁静海洋',role:'这一页的任务',motion:'After Effects 入场方式',duration:'每页时长（秒）',motionNote:'HTML 可播放这些入场；PowerPoint 保持静态，AE 接收动效交接。',evidenceTitle:'告诉读者，依据在哪里。',evidenceNote:'保存一个网址，不等于验证了事实。',sourceTitle:'来源名称',sourceURL:'来源网址',addSource:'添加并关联到本页',newTitle:'你想表达什么？',outlineHelp:'先写标题，再写补充内容。单独一行 --- 表示新的一页。这里仅排列你的文字，不会调用 AI。',outline:'你的大纲',cancel:'取消',arrange:'整理我的大纲',takeDeck:'把你的故事带走。',exportNote:'PowerPoint 保留可编辑文字；备份保留全部内容。',editable:'可编辑文字和形状',offline:'浏览器离线打开',currentOnly:'仅当前页面',importLayers:'使用附带插件导入',aeImport:'使用附带 JSX 导入',handoffNote:'Figma 与 AE 交接为实验功能。这里不会上传到云端。',historyTitle:'找回之前的好想法。',historyHelp:'像翻相册一样查看旧版本。恢复会新建一个副本，不会覆盖原文稿。',loadOlder:'更早的版本',restoreCopy:'恢复为新副本',openCopy:'打开恢复的副本',previousPage:'上一页',nextPage:'下一页',refresh:'重试',leaveTitle:'先保护你的修改。',leaveHelp:'离开前，可以保存当前修改，或继续留在这里。',saveLeave:'保存并继续',discardLeave:'放弃修改并继续',keepEditing:'留在这里',drawerTitle:'编辑工具',includeSpeakerNotes:'包含私密讲者备注和来源说明',publicExport:'私密备注默认不会导出，勾选后才包含；备份保留全部内容。',privatePresenter:'私密讲者界面',backEditor:'返回编辑',openAudience:'打开观众窗口',shareAudience:'只共享观众窗口，或使用扩展屏幕。',currentSlide:'当前页',nextSlide:'下一页',speakerScript:'讲者提词',readingOptions:'阅读设置',englishPace:'英文词 / 分钟',chinesePace:'中文字符 / 分钟',pauseLength:'每句停顿（秒）',scriptFont:'讲稿字号',scriptWidth:'侧栏宽度',dockSide:'侧栏位置',dockRight:'右侧',dockLeft:'左侧',calibrate:'用本页校准语速',resumeFollowing:'继续跟随',restartScript:'重置本页提词',appearanceAccess:'外观与无障碍',editorAppearance:'编辑器外观',system:'跟随系统',light:'浅色',dark:'深色',themeSeparate:'幻灯片保持原有配色。这些设置只改变工作区。',reduceMotion:'减弱动态效果',advancedPlayback:'高级播放设置',motionPolicy:'动画策略',fullMotion:'完整动态',reducedMotion:'减弱动态',noMotion:'关闭动画'};
const labels={en:{editorial:'Editorial split',spotlight:'Statement stage',grid:'Evidence grid',timeline:'Step by step'},'zh-CN':{editorial:'编辑分栏',spotlight:'主张聚焦',grid:'证据网格',timeline:'逐步展开'}};
const state={token:'',project:null,active:'',preview:null,dirty:false,saving:false,operation:false,exporting:false,locale:'en',counter:0,previewState:'idle',composing:false,saveIssue:null,firstRun:false};
const edits=new EditHistory(),textMeasurer=new BrowserTextMeasurer(),changeListeners=[];
let shell,dialogs,previewTimer,previewTicket=0,previewAbort,presenter,saveTimer;
const t=(english,chinese)=>state.locale==='zh-CN'?chinese:english;
const x=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// The two zones' fields. The ids are the classic editor's; renderEditor() keeps their values current.
const fields=/*html*/`
      <div id="contentPanel">
        <div class="section-label" hidden><h2 data-i18n="wordsFirst">Start with the words.</h2><p data-i18n="wordsNote">One slide, one useful idea.</p></div>
        <label for="eyebrow" data-i18n="eyebrow">Small text</label><input id="eyebrow" maxlength="100" placeholder="THE BIG IDEA">
        <label for="slideTitle" data-i18n="headline">Title</label><textarea id="slideTitle" rows="3" maxlength="500"></textarea>
        <label for="body" data-i18n="body">Explanation</label><textarea id="body" rows="3" maxlength="8000"></textarea>
        <label for="items" data-i18n="points">Points</label><textarea id="items" rows="4"></textarea>
        <label for="metrics" data-i18n="metrics">Numbers</label><textarea id="metrics" rows="2" placeholder="4 | Layout choices"></textarea>
        <label for="notes" data-i18n="notes" hidden>Notes for the speaker</label><textarea id="notes" rows="3" hidden></textarea>
      </div>
      <details id="sourcesPanel" class="zone-sources"><summary data-i18n="sources">Sources</summary>
        <div class="section-label" hidden><h2 data-i18n="evidenceTitle">Show where it came from.</h2><p data-i18n="evidenceNote">A saved URL is a reference, not a verified fact.</p></div>
        <div id="sourceList"></div><label for="sourceTitle" data-i18n="sourceTitle">Source name</label><input id="sourceTitle" maxlength="500" placeholder="Product documentation"><label for="sourceURL" data-i18n="sourceURL">Source URL</label><input id="sourceURL" type="url" placeholder="https://…"><button id="addSource" data-i18n="addSource">Add and link to this slide</button>
      </details>
`;
const look=/*html*/`
      <div id="designPanel">
        <div class="section-label" hidden><h2 data-i18n="quietDesign">Let the idea lead.</h2><p data-i18n="designNote">Structure first. Decoration second.</p></div>
        <label id="themeLabel" data-i18n="theme" hidden>Colour theme</label><div class="theme-options" role="group" aria-labelledby="themeLabel"><button data-theme="signal"><span class="swatches signal"></span><span class="sr-only">Signal</span></button><button data-theme="paper"><span class="swatches paper"></span><span class="sr-only" data-i18n="paper">Warm paper</span></button><button data-theme="midnight"><span class="swatches midnight"></span><span class="sr-only" data-i18n="midnight">Midnight ink</span></button><button data-theme="ocean"><span class="swatches ocean"></span><span class="sr-only" data-i18n="ocean">Quiet ocean</span></button></div>
        <div class="look-later" hidden><section id="semanticControls" hidden><h3>Semantic visual plan</h3><label for="semanticFamily">Visual family</label><select id="semanticFamily"><option value="cover">Cover</option><option value="comparison">Comparison</option><option value="process">Process</option><option value="timeline">Timeline</option><option value="metric">Metric</option><option value="image-caption">Image + caption</option></select><label for="spatialRecipe">Spatial illustration</label><select id="spatialRecipe"><option value="none">Static / image</option><option value="orbit">Orbit of ideas · 3D</option><option value="layers">Layers of an idea · 3D</option></select><p class="hint">HTML has keyboard rotation; other exports keep editable static shapes.</p><label for="semanticInteraction">Interaction</label><select id="semanticInteraction"><option value="none">Static</option><option value="steps">Explore steps</option><option value="tabs">Compare tabs</option></select><p class="hint">HTML supports keyboard exploration. Static exports show all content and label the selected state.</p><details><summary>Local image and rights</summary><p id="semanticAssetSummary" class="hint"></p><label for="assetProvenance">Provenance</label><input id="assetProvenance" placeholder="Original work / supplied source"><label for="assetLicense">License</label><input id="assetLicense" placeholder="Your rights to use this image"><label for="assetUse">Allowed use</label><input id="assetUse" placeholder="Presentation / redistribution scope"><label for="assetAlt">Alternative text</label><input id="assetAlt"><label for="assetFallback">Offline text fallback</label><input id="assetFallback"><button id="importAsset">Import local PNG</button><details><summary>Optional image generation</summary><p class="hint">Only the approved prompt goes to your host image tool. Prepare, copy the task, then import its original PNG. Unknown outcomes require review; no automatic retries.</p><label for="imagePrompt">Image prompt</label><textarea id="imagePrompt" maxlength="2000"></textarea><label><input id="imageConsent" type="checkbox">Share this prompt with the host image tool; its usage may apply.</label><button id="imagePrepare">Prepare image request</button><button id="imageCopy" disabled>Copy host task</button><button id="imageCheck" disabled>Check result and attach</button><button id="imageResult" disabled>Import generated PNG</button><button id="imageCancel" disabled>Cancel image request</button><input id="imageFile" type="file" accept="image/png" hidden><p id="imageStatus" role="status"></p></details><input id="assetFile" type="file" accept="image/png" hidden><p id="assetError" class="error" role="alert"></p></details></section><label for="stageStyle">Presentation style</label><select id="stageStyle"><option value="studio">Studio layouts</option><option value="cosmos-dots">Cosmic &amp; Dots · 16:9</option></select><p class="hint">Original star art and supplied event characters. HTML adds interaction; PowerPoint keeps native text and media.</p><label for="role" data-i18n="role">This slide's job</label><select id="role"><option value="opening">Open the story</option><option value="context">Explain the context</option><option value="evidence">Show evidence</option><option value="process">Explain a process</option><option value="decision">Make a decision</option><option value="closing">Close the story</option></select>
                <label for="motion" data-i18n="motion">After Effects entrance</label><select id="motion"><option value="none">None</option><option value="fade">Soft fade</option><option value="rise">Gentle rise</option></select><label for="duration" data-i18n="duration">Slide duration in seconds</label><input type="number" id="duration" min="2" max="60" step="1"><p class="hint" data-i18n="motionNote">HTML replays these entrances. PowerPoint stays static; AE receives a motion handoff.</p></div>
      </div>
`;

// A 401 is answered before the request is handled, so one retry after reconnecting cannot repeat a change.
async function api(url,data,method='POST',signal,retry=true){
  const response=await fetch(url,{method,signal,headers:{Authorization:`Bearer ${state.token}`,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(response.status===401&&retry){await shell.reconnect();return api(url,data,method,signal,false);}
  if(!response.ok){let value;try{value=await response.json();}catch{value={error:{message:`HTTP ${response.status}`}};}const error=new Error(value.error.message);Object.assign(error,value.error);throw error;}return response;
}
async function json(url,data,method='POST',signal){return(await api(url,data,method,signal)).json();}
const toast=message=>shell.toast(message),notice=(message,tone)=>shell.notice(message,tone);
function onError(error){if(error.name==='AbortError')return;const message=error.code==='AUTH_REQUIRED'?t('Not connected. Your edits remain in this window; press ⌘/Ctrl S to reconnect.','尚未连接。修改仍保留在此窗口；按 ⌘/Ctrl S 即可重新连接。'):error.message||String(error);notice(message);toast(message);}
function slide(){return state.project?.slides.find(s=>s.id===state.active);}
function ready(){return !!state.project&&!state.operation;}
function updateStatus(){
  const p=state.project,i=p?.slides.findIndex(s=>s.id===state.active)??0,count=p?.slides.length||0;
  const attention=!!state.saveIssue||state.previewState==='error'||state.preview?.audit.ok===false;
  const saveState=!p&&state.firstRun?'unsaved':!p||state.saving?'saving':attention?'attention':state.dirty?'unsaved':'saved';
  const saveLabel=!p&&state.firstRun?t('No deck yet','还没有文稿'):!p?t('Opening local library…','正在打开本地文稿…'):state.saving?t('Saving…','正在保存…'):state.saveIssue==='conflict'?t('Unsaved changes · another window saved first','尚未保存 · 另一窗口先保存了'):attention?(state.dirty?t('Unsaved changes · needs a look','尚未保存 · 要看一眼'):t('Saved on this computer · needs a look','已保存在本机 · 要看一眼')):state.dirty?t('Unsaved changes','尚未保存'):t('Saved on this computer','已保存在本机');
  shell.status({state:saveState,label:saveLabel,save:ready()&&!state.saving&&state.dirty&&!state.composing,undo:ready()&&!!edits.past.length&&!state.composing,redo:ready()&&!!edits.future.length&&!state.composing});
  for(const id of ['newDeck','importButton','projectPicker','openHistory','openAgent','openStoryboard'])$('#'+id).disabled=!ready()||state.saving;
  for(const [id,kind]of Object.entries({addSlide:'add',duplicate:'duplicate',moveUp:'up',moveDown:'down',deleteSlide:'delete'}))$('#'+id).disabled=!ready()||!validSlideAction(kind,i,count)||state.composing;
  for(const id of ['openExport','present','ratio','autoLayout'])$('#'+id).disabled=!ready()||state.composing;
  $('#present').disabled||=state.previewState!=='ready'||!state.preview?.audit.ok;
  const mediaStyle=state.project?.extensions?.deckweftShowcase?.style==='cosmos-dots'||state.project?.slides.some(s=>s.intent?.assetIds.length);$('#mediaExportNote').hidden=!mediaStyle;
  document.querySelectorAll('[data-export]').forEach(b=>b.disabled=!exportable(b.dataset.export));
  document.querySelectorAll('[data-layout]').forEach(b=>b.disabled=!choosable());
  $('#canvas').setAttribute('aria-busy',String(state.previewState==='pending'));
  $('#canvas').classList.toggle('stale',state.previewState!=='ready');
  $('#candidates').setAttribute('aria-busy',String(state.previewState==='pending'));
}
const exportable=format=>!state.exporting&&ready()&&(format==='json'||state.previewState==='ready'&&!!state.preview?.audit.ok);
const choosable=()=>state.previewState==='ready'&&ready();
function changed(mutator,{full=false,group=null}={}){
  if(!ready())return;const before=structuredClone(state.project),previousActive=state.active;mutator();
  if(state.project.schemaVersion===2){for(const s of state.project.slides){s.intent??={claim:s.content.title,audience:state.project.brief.audience,evidence:[],visualFamily:'comparison',assetIds:[],interaction:{kind:'none',initial:0,labels:[]}};if(s.intent.interaction.kind!=='none'){if(s.content.items.length){s.intent.interaction.labels=s.content.items.map((v,i)=>v.slice(0,85)||String(i+1));s.intent.interaction.initial=Math.min(s.intent.interaction.initial,s.content.items.length-1);}else s.intent.interaction={kind:'none',initial:0,labels:[]};}s.intent.evidence=s.intent.evidence.filter(e=>s.sourceIds.includes(e.sourceId));}}
  if(JSON.stringify(before)===JSON.stringify(state.project))return;
  edits.capture(before,previousActive,group);state.dirty=true;state.counter++;updateStatus();if(full)renderEditor();if(!state.composing)schedulePreview();
  scheduleSave();
}
function undo(redo=false){
  if(!ready()||state.composing)return;const next=edits.step(state.project,state.active,redo);if(!next)return;
  state.project=next.project;state.active=next.project.slides.some(s=>s.id===next.active)?next.active:next.project.slides[0].id;
  state.dirty=true;state.counter++;renderEditor();schedulePreview();scheduleSave();
}
// The shell has switched its own words; these are the classic ones.
function localize(locale){
  state.locale=pitchMode?'en':locale;
  const jobs=state.locale==='zh-CN'?['开启故事','解释背景','展示证据','解释过程','促成决策','结束故事']:['Open the story','Explain the context','Show evidence','Explain a process','Make a decision','Close the story'];
  [...$('#role').options].forEach((option,i)=>option.textContent=jobs[i]);
  const motionLabels=state.locale==='zh-CN'?['无','柔和淡入','轻微上移']:['None','Soft fade','Gentle rise'];[...$('#motion').options].forEach((option,i)=>option.textContent=motionLabels[i]);
  if(state.project){renderEditor();renderPreview();}
}
async function library(){
  let {projects}=await json('/api/projects',undefined,'GET');
  if(pitchMode){const english=[];for(const project of projects){if(project.unreadable)continue;const full=(await json(`/api/projects/${project.id}`,undefined,'GET')).project;if(projectIsEnglish(full))english.push(project);}projects=english;}
  $('#projectPicker').innerHTML=projects.map(p=>`<option value="${x(p.id)}" ${p.unreadable?'disabled':''}>${x(p.title)}${p.unreadable?t(' · needs repair',' · 需要修复'):''}</option>`).join('');
  if(state.project)$('#projectPicker').value=state.project.id;return projects;
}
function activate(project){
  if(pitchMode&&!projectIsEnglish(project))throw new Error('Presentation mode opens English projects only. Use the standard Studio to open another language edition.');
  // The first page replaces the first-run form for good.
  shell.closeFirstRun();state.firstRun=false;
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
// The canvas, caption and quality notes; then the shell redraws the strip and the choices from thumbnails() and candidates().
function renderPreview(){
  const p=state.project;if(!p)return;
  const result=state.preview?.slides.find(r=>r.slideId===state.active);
  if(result){
    $('#canvas').innerHTML=result.svg;sizeCanvas();$('#layoutCaption').textContent=(p.schemaVersion===2?slide().intent.visualFamily:(labels[state.locale][result.selected]||result.selected))+' · '+t('editable text + shapes','可编辑文字和形状');
    const audit=state.preview.audit,current=audit.issues.filter(i=>!i.slideId||i.slideId===state.active);
    $('#qualityCount').textContent=current.length?String(current.length):t('Clear','通过');
    $('#qualityIssues').innerHTML=current.length?current.map(i=>`<div class="quality-item ${i.severity}">${i.severity==='error'?'!':'○'} ${x(state.locale==='zh-CN'?(i.code==='SOURCE_NEEDED'?'这些数字尚未关联来源，请补充或在备注中说明是示例。':i.code==='TEXT_OVERFLOW'?'有文字超出边界，请缩短文字或换一种布局。':i.message):i.message)}</div>`).join(''):`<div class="quality-item good">✓ ${t('No layout blockers on this slide.','本页未发现排版阻塞。')}</div>`;
    const fonts=Object.entries(state.preview.measurement?.fontProbes||{}).filter(([,ok])=>ok).map(([name])=>name);
    $('#measurementNote').textContent=t('Browser measurement. Local fonts detected: ','浏览器实测。检测到的本地字体：')+(fonts.join(', ')||t('none confirmed; browser fallback used.','未确认，使用浏览器后备字体。'));
  }else $('#canvas').innerHTML=`<p>${t('Measuring your slide…','正在测量页面…')}</p>`;
  updateStatus();for(const fn of changeListeners)fn();window.dispatchEvent(new Event('deckweft:preview'));
}
function thumbnails(){
  const p=state.project;if(!p)return [];
  return p.slides.map(s=>({id:s.id,title:s.content.title,svg:state.preview?.slides.find(r=>r.slideId===s.id)?.svg||'',active:s.id===state.active}));
}
function candidates(){
  const p=state.project,result=state.preview?.slides.find(r=>r.slideId===state.active);if(!p||!result)return [];
  const label=c=>p.schemaVersion===2?c.label:(labels[state.locale][c.id]||c.id),disabled=!choosable();
  return (state.preview.choices||[]).map(c=>({id:c.id,svg:c.svg,eligible:c.eligible,reason:c.eligible?'':t('Too much text to fit','文字太多，放不下'),label:label(c),selected:result.selected===c.id,explanation:c.explanation,disabled}));
}
function sizeCanvas(){const svg=$('#canvas svg');if(!svg)return;const [,,w,h]=svg.getAttribute('viewBox').split(' ').map(Number),stage=$('#stage'),style=getComputedStyle(stage),aw=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),ah=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),scale=Math.min(aw/w,ah/h);$('#canvas').style.width=`${Math.max(1,w*scale)}px`;$('#canvas').style.height=`${Math.max(1,h*scale)}px`;}
// After a 409 the author may keep the draft as a new deck through the import-as-copy route; the newer revision stays untouched.
async function saveCopy(){
  if(!await shell.askSaveCopy())return false;
  const draft=structuredClone(state.project),active=state.active;
  const imported=await json('/api/import',{project:draft}),saved=await json('/api/projects',{project:imported.project});
  activate(saved.project);selectSlide(active);await library();toast(t('Saved as a separate copy. The newer version was not changed.','已另存为独立副本，较新版本未改动。'));return true;
}
// Autosave 1.2 s after the last edit. It waits out IME composition and invalid fields (the preview already shows those),
// and pauses after a revision conflict: ⌘/Ctrl S then offers the separate copy, so no dialog opens while someone types.
function scheduleSave(){
  clearTimeout(saveTimer);if(!state.dirty||state.composing||state.saveIssue==='conflict')return;
  saveTimer=setTimeout(()=>{if(state.dirty&&!state.composing&&!state.saving&&state.previewState!=='error')save({auto:true});},1200);
}
async function save({auto=false}={}){
  if(!state.project||state.saving||state.composing)return false;if(!state.dirty)return true;
  clearTimeout(saveTimer);if(!auto){shell.reconnect.offerAgain();state.saveIssue=null;}
  state.saving=true;edits.endGroup();updateStatus();const snapshot=structuredClone(state.project),counter=state.counter;
  try{const {project,historyUsage}=await json(`/api/projects/${snapshot.id}`,{project:snapshot,expectedRevision:snapshot.revision.number},'PUT');
    if(state.project.id===snapshot.id){state.project.revision=project.revision;if(counter===state.counter)state.dirty=false;}
    state.saveIssue=null;
    await library();shell.capacity(historyUsage);return !state.dirty;
  }catch(error){
    if(error.code==='REVISION_CONFLICT'){state.saveIssue='conflict';if(!auto){try{if(await saveCopy())return true;}catch(copyError){onError(copyError);return false;}}notice(t('Another window saved first. Your edits are still here. Export Project JSON to keep a draft, then reopen or import it as a new copy.','另一窗口先保存了。你的修改仍在这里。先导出项目 JSON 保留草稿，再重新打开或导入为新副本。'));}
    else{state.saveIssue='failed';if(auto)notice(error.code==='AUTH_REQUIRED'?t('Not connected. Your edits remain in this window; press ⌘/Ctrl S to reconnect.','尚未连接。修改仍保留在此窗口；按 ⌘/Ctrl S 即可重新连接。'):error.message||String(error));else onError(error);}
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
    download(blob,`${snapshot.title.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,70)||'deckweft'}.${extension}`);$('#exportDialog').close();toast(format==='json'?t('Draft backup created. Invalid fields still need repair before re-import.','已备份草稿。无效字段仍需修复后才能重新导入。'):t('Export created from the measured preview. Check it in your presentation app.','已按实测预览导出。请在演示软件中检查文件。'));
  }catch(error){if(['STALE_MEASUREMENT','MEASUREMENT_EXPIRED'].includes(error.code)){schedulePreview();$('#exportDialog').close();}onError(error);
  }finally{state.exporting=false;updateStatus();}
}
// Classic has no PDF: Take away offers the formats of the classic export dialog and the drawer's backup.
function exports(){updateStatus();return Object.fromEntries(['html','pptx','svg','json','motion','figma'].map(format=>[format,exportable(format)?()=>exportFile(format):null]));}
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
// The page strip's drop: the shell computed the insert point; the move goes through changed(), so undo and autosave follow.
function reorder(id,index){changed(()=>{const slides=state.project.slides,from=slides.findIndex(s=>s.id===id);if(from<0)return;const [moved]=slides.splice(from,1);slides.splice(index>from?index-1:index,0,moved);},{full:true});}
// M3: the inspector shows the Words and Look zones together, so there is no tab to switch. Kept for existing callers.
function setTab(){}
// Words fields and the canvas blocks they draw. Renderer node ids are <slide id>_<role>_<n>.
const zoneBlocks={eyebrow:['eyebrow'],slideTitle:['title'],body:['body'],items:['item'],metrics:['metric-value','metric-label']};
function blocks(field,svg){const roles=zoneBlocks[field];if(!roles)return null;return {name:roles[0],nodes:[...svg.querySelectorAll('[data-node]')].filter(n=>roles.some(r=>n.dataset.node.startsWith(`${state.active}_${r}_`)))};}
async function switchProject(id){
  if(!ready()||state.saving)return false;if(!await canLeave()){$('#projectPicker').value=state.project.id;return false;}
  state.operation=true;updateStatus();
  try{activate((await json(`/api/projects/${id}`,undefined,'GET')).project);return true;}catch(error){$('#projectPicker').value=state.project.id;onError(error);return false;}finally{state.operation=false;updateStatus();}
}
// First run: Arrange reuses the outline dialog's submit handler. That parser splits pages on --- lines only, so blank lines become ---.
async function firstRun(text){
  if(state.operation)return '';
  $('#outline').value=text.replace(/\n[ \t]*\n\s*/g,'\n---\n');$('#outlineError').textContent='';
  await $('#outlineForm').onsubmit(new SubmitEvent('submit',{cancelable:true}));
  return $('#outlineError').textContent;
}
async function example(){
  if(state.operation)return '';state.operation=true;updateStatus();
  try{const example=await(await fetch(`/examples/welcome${state.locale==='zh-CN'?'.zh-CN':''}.deck.json`)).json();const imported=await json('/api/import',{project:example}),saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();return '';}
  catch(error){return error.message;}finally{state.operation=false;updateStatus();}
}
function showFirstRun(){state.firstRun=true;updateStatus();shell.showFirstRun();}

// Everything below needs the shell's markup, so it runs from mount().
function mount(s){
  shell=s;dialogs=s.dialogs;
  applyPitchMode(document);
  document.addEventListener('compositionstart',()=>{if(!state.composing){state.composing=true;cancelPreview();state.previewState='pending';updateStatus();}});
  document.addEventListener('compositionend',()=>{if(state.composing){state.composing=false;edits.endGroup();schedulePreview();scheduleSave();}});
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{if(state.composing)event.preventDefault();}));
  new ResizeObserver(sizeCanvas).observe($('#stage'));
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
  const moreDrawer=$('#moreDialog');
  $('#present').onclick=()=>{if(!moreDrawer.open)return present();moreDrawer.addEventListener('close',()=>present(),{once:true});moreDrawer.close();}; // start after focus has returned, so the presenter keeps its own focus
  $('#exitPresent').onclick=()=>present(true);
  $('#newDeck').onclick=async()=>{dialogs.closeDrawer();if(await canLeave())dialogs.open($('#outlineDialog'),$('#newDeck'));};
  $('#autoLayout').onclick=()=>changed(()=>slide().design.layout='auto');
  for(const [id,type]of Object.entries({duplicate:'duplicate',moveUp:'up',moveDown:'down',deleteSlide:'delete'}))$('#'+id).onclick=()=>slideAction(type);
  $('#projectPicker').onchange=e=>switchProject(e.target.value);
  $('#outlineForm').onsubmit=async event=>{event.preventDefault();if(state.operation)return;state.operation=true;$('#arrangeOutline').disabled=true;updateStatus();try{const imported=await json('/api/import',{outline:$('#outline').value,locale:state.project?.locale||(state.locale==='zh-CN'?'zh-CN':'en')});const saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();$('#outlineDialog').close();}catch(error){$('#outlineError').textContent=error.message;}finally{state.operation=false;$('#arrangeOutline').disabled=false;updateStatus();}};
  $('#importButton').onclick=async()=>{dialogs.closeDrawer();if(await canLeave())$('#fileInput').click();};
  $('#fileInput').onchange=async event=>{
    const file=event.target.files[0];if(!file||state.operation)return;state.operation=true;updateStatus();
    try{if(file.size>1_900_000)throw new Error(t('Use a file smaller than 1.9 MB.','请选择小于 1.9 MB 的文件。'));const text=await file.text(),data=file.name.toLowerCase().endsWith('.json')?{project:JSON.parse(text)}:{outline:text};const imported=await json('/api/import',data),saved=await json('/api/projects',{project:imported.project});activate(saved.project);await library();if(imported.warnings.length)toast(imported.warnings.join(' '));}catch(error){onError(error);}finally{event.target.value='';state.operation=false;updateStatus();}
  };
  $('#addSource').onclick=()=>{try{const title=$('#sourceTitle').value.trim(),url=$('#sourceURL').value.trim(),parsed=new URL(url);if(!title||!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error(t('Add a name and a normal HTTP(S) URL.','请填写来源名称和正常的 HTTP(S) 网址。'));changed(()=>{const id='src_'+crypto.randomUUID().replaceAll('-','').slice(0,16);state.project.sources.push({id,title,url});slide().sourceIds.push(id);},{full:true});$('#sourceTitle').value='';$('#sourceURL').value='';}catch(error){onError(error);}};
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.theme)changed(()=>state.project.theme=button.dataset.theme,{full:true});if(button.dataset.tab)setTab(button.dataset.tab);
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
  // Files dropped on the stage go through the Import handler of #fileInput. A dashed yellow line shows where to drop.
  const droppable=event=>[...(event.dataTransfer?.types||[])].includes('Files');
  $('#stage').addEventListener('dragover',event=>{if(!droppable(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';$('#stage').classList.add('drop-ready');});
  $('#stage').addEventListener('dragleave',event=>{if(!$('#stage').contains(event.relatedTarget))$('#stage').classList.remove('drop-ready');});
  $('#stage').addEventListener('drop',async event=>{
    if(!droppable(event))return;event.preventDefault();$('#stage').classList.remove('drop-ready');
    const file=event.dataTransfer.files[0];if(!file||state.operation)return;
    if(!/\.(json|md|txt)$/i.test(file.name)){toast(t('Drop a .json, .md or .txt file.','请拖入 .json、.md 或 .txt 文件。'));return;}
    if(state.project&&!await canLeave())return;
    const files=new DataTransfer();files.items.add(file);$('#fileInput').files=files.files;$('#fileInput').dispatchEvent(new Event('change'));
  });
  setTab('content');
  // History UI is a separate, read-only workflow until an explicit restore-as-copy.
  mountHistory({state,$,t,x,json,dialogs,toast,onError,measurePreview,library,switchProject,activate,updateStatus});
  mountAgentBridge({state,$,json,dialogs,onError,canLeave,activate,library,pitchMode});
  mountStudioTools({state,$,dialogs,json,canLeave,activate,library});
  applyActions(document);
  mountPreferences({dialogs,$,locale:()=>state.locale});
  presenter=mountPresenter({state,$,json,dialogs,onError:error=>{if(['STALE_MEASUREMENT','MEASUREMENT_EXPIRED','MEASUREMENT_REQUIRED'].includes(error.code))schedulePreview();onError(error);}});
  try{localStorage.removeItem('deckweft.layouts.collapsed');}catch{} // the previews are always open now
  mountStoryboard({state,$,json,dialogs,canLeave,activate,library,changed});
}

/** @type {import('../shell.js').Adapter & {open:()=>Promise<void>}} */
export const classicAdapter={
  fields:()=>fields,look:()=>look,candidates,thumbnails,save:()=>save(),exports,onChange:fn=>{changeListeners.push(fn);},
  undo:()=>undo(),redo:()=>undo(true),firstRun,
  mount,select:selectSlide,reorder,add:()=>slideAction('add'),choose:id=>{if(state.previewState==='ready')changed(()=>slide().design.layout=id);},
  editable:()=>ready()&&!state.composing,example,blocks,setToken:token=>{state.token=token;},
  // The assistant section only appears once a host agent is connected (a startup call would race the session token).
  assistant:async()=>(await json('/api/agent/status',undefined,'GET')).connected,
  localize,languageLocked:()=>state.composing||pitchMode,dictionary:{zh},
  // Opens the first readable deck in the library, or the first-run form when there is none.
  async open(){
    try{updateStatus();state.token=(await(await fetch('/api/session')).json()).token;const projects=await library(),first=projects.find(p=>!p.unreadable);if(first)activate((await json(`/api/projects/${first.id}`,undefined,'GET')).project);else showFirstRun();}
    catch(error){onError(error);}
  }
};
