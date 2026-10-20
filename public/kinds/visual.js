// The visual deck kind (v3 projects through /api/visual/*): the adapter that plugs Visual Studio into shell.js. The shell
// owns the band, the strip, the first run, the zones, the drawer and the Take away dialog; this file owns the measured web
// preview, the typed Words fields, the Look controls (choices, three buttons, colours, motion, image, directions), saving,
// exports and the visual dialogs (dialogMarkup, below). Single entry step 3 (docs/zh-CN/single-entry.md §3).
import {addExplanatoryInteractions,useInteractionOpening,useStaticState,addBlueprintA} from '../studio/interactions.js';
import {mountWorkbench} from '../studio/workbench.js';
import {mountAuthor} from '../studio/author.js';
import {base64,sourceMime,decodeLocalSource} from '../studio/assets.js';
import {renderAddedLines} from '../studio/evidence.js';
import {keyboardAction} from '../interaction.js';
import {historyCapacityNote} from '../history-capacity.js';
import {t} from '../i18n.js';
import {openDeck,rememberDeck} from '../shell.js';
const $=s=>document.querySelector(s),x=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Read when asked, not once: the page is not reloaded when the loader switches kinds or opens another deck.
const query={get:name=>new URLSearchParams(location.search).get(name)};
const storedUI=(()=>{try{return localStorage.getItem('deckweft.visual.ui');}catch{return null;}})();
const state={token:'',project:null,active:'',dirty:false,counter:0,saving:false,saveIssue:null,previewError:false,firstRun:false,render:null,fit:null,measured:false,ui:['en','zh-CN'].includes(query.get('ui'))?query.get('ui'):storedUI==='zh-CN'?'zh-CN':'en',undo:[],redo:[],drafts:new Map(),snapshot:null,taskEvidence:null,detail:'standard'};
// Labels the server sends as [id, English, Chinese] are data, not interface text: they pick by pair.
const pick=(en,cn)=>state.ui==='zh-CN'?cn:en;
const scene=()=>state.project?.plan.scenes.find(s=>s.id===state.active),profile=()=>state.project.document.visualBrief?.profile||{colorIntensity:'bold',typographicContrast:'expressive',density:'comfortable',motionIntensity:'off',imageEmphasis:'large'};
const THEMES=['cream-collage','electric-violet','dark-data','silver-gray-editorial','fresh-report','orange-launch'];
const changeListeners=[];
let shell,dialogs,workbench,author;
// While the classic kind is on the page this one is out of it: its document-wide listeners sleep.
const live=()=>!!shell?.root.isConnected;
let selectedImage='',assetInspection=null,sourceEntries=[];
let previewTimer,saveTimer,compareTimer,sequence=0,candidateRun=0,candidateState=null,comparing=false,compareFailed=-1,familyOverrides=Object.create(null);

// ---- Markup for the shell's zones and slots ----
const fields=/*html*/`
      <aside id="hostAuthoredLines" class="host-authored-lines" hidden></aside>
      <div id="fields"></div>
      <div id="explanationFields"></div>
      <button id="resetDraft" hidden data-i18n="visual.resetDraft">Discard unapplied field edits</button>
`;
const themeKey=id=>'visual.theme.'+id.replace(/-(\w)/g,(m,c)=>c.toUpperCase());
const swatch=id=>`<button type="button" data-theme="${id}" aria-pressed="false"><span class="swatches visual-${id}"></span><span class="sr-only" data-i18n="${themeKey(id)}"></span></button>`;
const swatches=THEMES.map(swatch).join(''),themeOptions=THEMES.map(v=>'<option value="'+v+'" data-i18n="'+themeKey(v)+'"></option>').join('');
const look=/*html*/`
      <div class="look-buttons" role="group" data-i18n-attr="aria-label:visual.look.buttons">
        <button id="moreSpace" type="button" data-author-action="more-editorial" data-i18n="visual.look.moreSpace">More space</button>
        <button id="largerType" type="button" aria-pressed="false" data-i18n="visual.look.largerType">Larger type</button>
        <button id="keepPage" type="button" aria-pressed="false" data-i18n="visual.look.keepPage">Leave this page</button>
      </div>
      <section id="actionPlan" class="action-plan" hidden aria-live="polite"><h3 id="actionTitle"></h3><p id="actionScope"></p><ul id="actionEffects"></ul><ul id="actionKept" class="kept"></ul></section>
      <p id="themeLabel" class="look-label" data-i18n="visual.look.colours">Colours</p>
      <div class="theme-options" role="group" aria-labelledby="themeLabel">${swatches}</div>
      <div class="motion-row"><span id="motionLabel" class="look-label" data-i18n="visual.look.motion">Let this page move</span><button id="motionSwitch" type="button" role="switch" aria-checked="false" aria-labelledby="motionLabel"><span data-i18n="visual.look.off">Off</span></button></div>
      <div id="motionControls" class="motion-controls" hidden>
        <button id="enableInteractions" type="button" data-i18n="visual.enableInteractions">Add explanations to this page</button>
        <button id="enableBlueprint" type="button" data-i18n="visual.enableBlueprint">Make this page Explain → Diagram → Explore</button>
        <label for="sceneMotion" data-i18n="visual.look.transition">Page transition</label><select id="sceneMotion"><option value="" data-i18n="visual.sceneMotion.1">Follow theme</option><option value="off" data-i18n="visual.sceneMotion.2">Off</option><option value="subtle" data-i18n="visual.sceneMotion.3">Subtle</option></select>
        <button id="useInteractionOpening" type="button" disabled data-i18n="visual.useInteractionOpening">Use current chart / step as opening</button>
        <label for="staticState" data-i18n="visual.look.still">Still picture for print</label><select id="staticState" disabled></select>
        <p id="blueprintStatic" class="hint" role="status" hidden></p>
      </div>
      <section id="imageSlot" class="image-slot" hidden><p class="look-label" data-i18n="visual.look.image">Image</p>
        <div class="image-row"><button id="sourceImport" type="button" data-i18n="visual.look.replaceImage">Replace image</button>
        <details id="imageInfo" class="image-info"><summary data-i18n-attr="aria-label:visual.look.imageDetails;title:visual.look.imageDetails" aria-label="Image details">i</summary>
          <div id="assetFields"></div><div id="cropFields"></div>
          <div class="asset-actions"><button id="sourceScan" type="button" data-i18n="visual.sourceScan">Find images in saved local decks</button></div><div id="sourceCatalog"></div>
          <p class="hint" id="imageCapability" data-i18n="visual.look.noGeneration">No image generation here. Reuse a local original, or choose a text-led layout.</p>
          <button id="imageAlternative" type="button" data-i18n="visual.imageAlternative">Choose text-led alternative</button>
          <button id="imageOpen" type="button" data-i18n="visual.imageOpen">Use a local PNG</button>
        </details></div>
      </section>
      <section id="directionsPanel" class="directions-panel"><p class="look-label" data-i18n="visual.look.directions">Three directions</p>
        <div class="detail-options" role="group" data-i18n-attr="aria-label:visual.look.detail"><button type="button" data-detail="brief" aria-pressed="false" data-i18n="visual.look.less">Less</button><button type="button" data-detail="standard" aria-pressed="true" data-i18n="visual.look.medium">Medium</button><button type="button" data-detail="detailed" aria-pressed="false" data-i18n="visual.look.more">More</button></div>
        <button id="entryDirections" type="button" data-i18n="visual.look.showDirections">Show three directions</button>
        <p id="entryStatus" class="hint" role="status"></p><p id="directionFacts" class="hint" role="status"></p><div id="entryPagePlan" class="page-plan"></div>
        <div id="directionCards" class="candidate-grid direction-cards"></div>
      </section>
`;
const exportOptions=/*html*/`
<div id="exportOptions" hidden><p class="hint" data-i18n="visual.export.checked">Each file is checked again before it downloads. A file that fails its check is not saved.</p>
<div id="exportPaginateField"><label for="exportPaginate" data-i18n="visual.exportPaginateField.1">Pages taller than a slide</label><select id="exportPaginate"><option value="auto" data-i18n="visual.export.split">Split into slides so the text keeps its size</option><option value="none" data-i18n="visual.export.whole">Keep every page whole</option></select><p class="hint" data-i18n="visual.export.wholeNote">A whole tall page is shrunk to fit. Text below 18 pt titles, 10 pt body or 6 pt notes is listed, and the file waits for your yes.</p></div>
<p id="exportStatus" role="status" aria-live="polite" data-status="idle"></p><ul id="exportTypography" hidden></ul><label class="check" id="exportAcceptField" hidden><input id="exportAccept" type="checkbox"><span data-i18n="visual.export.accept">Export with these text sizes anyway. The report keeps your yes and its time; the text-size result stays a failure.</span></label>
<div class="workbench-actions"><button id="exportRun" type="button" data-i18n="visual.exportRun">Export</button></div></div><p id="exportEvidence" class="hint"></p>`;
const agent=/*html*/`
<section id="promptWorkbench" aria-label="Prompt workbench">
<details id="workbenchStart" open><summary data-i18n="visual.agent.write">Write with a prompt</summary><label for="workbenchPrompt" data-i18n="visual.workbenchStart.2">What should this presentation explain?</label><textarea id="workbenchPrompt" maxlength="12000" data-i18n-attr="placeholder:visual.agent.promptPlaceholder"></textarea>
<label for="workbenchSource" data-i18n="visual.workbenchStart.3">Optional local text / Markdown source</label><input id="workbenchSource" type="file" accept=".txt,.md,text/plain,text/markdown">
<label for="audience" data-i18n="visual.designPanel.8">Audience</label><input id="audience" maxlength="1000">
<div class="workbench-options"><label for="workbenchHost" data-i18n="visual.workbenchStart.4">Draft and review with</label><select id="workbenchHost"><option value="local" data-i18n="visual.agent.local">Your own words, arranged here</option><option value="codex">Codex</option></select><p id="workbenchModeHint" class="hint"></p><label class="check" id="workbenchConsentRow" hidden><input id="workbenchConsent" type="checkbox"><span data-i18n="visual.workbenchConsentRow.1">Allow this Codex operation with existing host settings; allowance may be consumed.</span></label></div>
<div class="workbench-actions"><button id="workbenchGenerate" data-i18n="visual.workbenchGenerate">Arrange supplied text</button><button id="workbenchUseSource" data-i18n="visual.workbenchUseSource">Use / resume selected deck</button></div>
</details>
<details id="workbenchPreferences"><summary data-i18n="visual.agent.choices">Design choices for the draft</summary><div class="workbench-profile"><label data-i18n="visual.workbenchPreferences.6" for="workbench-visualStyle">Visual style</label><select id="workbench-visualStyle" data-preference="visualStyle">${themeOptions}</select><label data-i18n="visual.workbenchPreferences.7" for="workbench-colorIntensity">Color intensity</label><select id="workbench-colorIntensity" data-preference="colorIntensity"><option value="restrained" data-i18n="visual.main.restrained">restrained</option><option value="bold" data-i18n="visual.main.bold">bold</option></select><label data-i18n="visual.workbenchPreferences.8" for="workbench-assetEmphasis">Image emphasis</label><select id="workbench-assetEmphasis" data-preference="assetEmphasis"><option value="balanced" data-i18n="visual.main.balanced">balanced</option><option value="large" data-i18n="visual.main.large">large</option></select><label data-i18n="visual.workbenchPreferences.9" for="workbench-updatePreference">Update preference</label><select id="workbench-updatePreference" data-preference="updatePreference"><option value="manual" data-i18n="visual.agent.manual">Ask me</option><option value="review-each-change" data-i18n="visual.agent.eachChange">Show each change</option></select></div><p class="hint" data-i18n="visual.workbenchPreferences.10">Source words stay exact. Language settings do not silently translate supplied sources. Scene choices do not change project defaults.</p><label class="check"><input id="workbenchKeepImage" type="checkbox"><span data-i18n="visual.workbenchPreferences.11">Preserve this page’s image and crop</span></label><label for="workbenchChoiceScope" data-i18n="visual.workbenchPreferences.12">Apply design to</label><select id="workbenchChoiceScope"><option value="page" data-i18n="visual.workbenchChoiceScope.1">Selected page only</option><option value="project" data-i18n="visual.workbenchChoiceScope.2">Entire project</option></select><p id="workbenchChoiceStatement" class="hint scope-statement" aria-live="polite"></p><button id="workbenchChoices" data-i18n="visual.workbenchChoices">Apply scoped choices</button></details>
<div class="workbench-status"><button id="workbenchCancel" data-i18n="visual.workbenchCancel" disabled>Cancel operation</button><output id="workbenchProgress" role="status" aria-live="polite"></output><p id="workbenchDiagnostics"></p><p id="workbenchEvidence" class="hint" role="status"></p><div id="workbenchPagePlan" class="hint" role="status"></div><details class="operation-details"><summary data-i18n="visual.page.4">Operation details</summary><pre id="workbenchEvents"></pre></details></div>
</section>`;
const versions=/*html*/`
<details id="workbenchRevisionPanel"><summary data-i18n="visual.workbenchRevisionPanel.1">Revise the result</summary><label for="workbenchRevision" data-i18n="visual.workbenchRevisionPanel.2">Revise in words</label><textarea id="workbenchRevision" maxlength="12000" data-i18n-attr="placeholder:visual.agent.revisePlaceholder"></textarea><div class="workbench-options"><select id="workbenchScope" data-i18n-attr="aria-label:visual.agent.reviseScope"><option value="page" data-i18n="visual.workbenchScope.1">Selected page only</option><option value="project" data-i18n="visual.workbenchScope.2">Entire project</option></select><select id="workbenchDataset" data-i18n-attr="aria-label:visual.agent.reviseData"><option value=""></option></select></div><p id="workbenchScopeStatement" class="hint scope-statement" aria-live="polite"></p><div class="workbench-actions"><button id="workbenchRevise" data-i18n="visual.workbenchRevise">Revise selected scope</button><button id="workbenchSync" data-i18n="visual.workbenchSync">Sync saved source</button></div></details>
<details id="workbenchRecovery"><summary data-i18n="visual.agent.resume">Resume earlier work</summary><div class="workbench-actions"><button id="workbenchResume" data-i18n="visual.workbenchResume">Resume last task</button><button id="workbenchCheckpoint" data-i18n="visual.agent.saveRecovery">Save a recovery file</button><button id="workbenchRecover" data-i18n="visual.workbenchRecover">Recover interrupted task</button></div></details>`;
const language=/*html*/`<label for="outputLanguage" data-i18n="visual.designPanel.6">Output language / font preference</label><select id="outputLanguage"><option value="en">English</option><option value="zh-CN">简体中文</option></select><p class="hint" data-i18n="visual.designPanel.7">This does not translate your content.</p>`;
const profileChoices={colorIntensity:['restrained','bold'],typographicContrast:['balanced','expressive'],density:['comfortable','compact'],motionIntensity:['off','subtle'],imageEmphasis:['balanced','large']};
const backup=/*html*/`<label for="projectPicker" data-i18n="visual.backup.library">My decks</label><select id="projectPicker" class="project-picker"></select>
<button id="demo" type="button" data-closes-drawer data-i18n="visual.backup.example">See an example</button>
<label class="file-button" for="projectFile" data-i18n="visual.backup.import">Import a deck</label><input id="projectFile" type="file" accept="application/json,.json" hidden>
<button id="workbenchLastValid" type="button" data-i18n="visual.workbenchLastValid" disabled>Last accepted HTML</button>
<details id="saveLook" class="save-look"><summary data-i18n="visual.backup.saveLook">Save this look</summary><div id="profileFields"></div>
<label for="profileName" data-i18n="visual.authorControls.17">Profile name</label><input id="profileName" maxlength="80"><label class="check"><input id="profileAttest" type="checkbox"><span data-i18n="visual.backup.attest">I accept this design as it is</span></label><button id="profileSave" type="button" data-i18n="visual.backup.save">Save this look</button>
<label for="profileList" data-i18n="visual.backup.saved">Saved looks</label><select id="profileList"></select><div class="workbench-actions"><button id="profileApply" type="button" data-i18n="visual.backup.apply">Use on this deck</button><button id="profileExport" type="button" data-i18n="visual.backup.export">Download</button><label class="file-button" for="profileImport" data-i18n="visual.backup.importLook">Import a look</label><input id="profileImport" type="file" accept="application/json,.json" hidden></div><p class="hint" data-i18n="visual.authorControls.22">A profile keeps theme, composition choices, type and motion only. No text, data, sources, images or branding.</p></details>`;
const developer=/*html*/`<p id="composition" class="hint"></p><label for="family" data-i18n="visual.designPanel.2">Composition family</label><select id="family"></select>
<p id="lockSummary" class="hint"></p><p id="candidateStatus" class="hint" role="status"></p><div id="rhythmReport"></div>
<details data-developer><summary data-i18n="visual.developer.data">Data editors</summary><label for="interactionJSON" data-i18n="visual.contentPanel.7">Authored interactions, cue order and motion · JSON</label><textarea id="interactionJSON" class="data-editor"></textarea><label for="explanationJSON" data-i18n="visual.contentPanel.8">Semantic explanation content · JSON</label><textarea id="explanationJSON" class="data-editor"></textarea><label for="sourceJSON" data-i18n="visual.contentPanel.11">Sources and versioned snapshots · JSON</label><textarea id="sourceJSON" class="data-editor"></textarea></details>
<details><summary data-i18n="visual.developer.examples">More examples</summary><button id="interactionDemo" data-closes-drawer data-i18n="visual.interactionDemo">Interactive examples</button><button id="componentDemo" data-closes-drawer data-i18n="visual.componentDemo">Component examples</button><button id="assetDemo" data-closes-drawer data-i18n="visual.assetDemo">New source & crop example</button><button id="compositionDemo" data-closes-drawer data-i18n="visual.compositionDemo">New six-family example</button></details>`;
const parts=()=>({
  choiceActions:/*html*/`<button id="rhythm" class="small" disabled data-i18n="visual.look.wholeDeck">Choose for the whole deck</button>`,
  pageActions:/*html*/`<button id="moveUp" data-i18n-attr="aria-label:visual.moveUp" aria-label="Move up">↑</button><button id="moveDown" data-i18n-attr="aria-label:visual.moveDown" aria-label="Move down">↓</button>`,
  canvas:/*html*/`<h1 id="sceneTitle" class="sr-only"></h1><p id="emptyCanvas" class="hint" hidden data-i18n="visual.emptyCanvas">Add your text in Create, or choose a saved presentation above.</p><div id="frameSpace"><iframe id="preview" data-i18n-attr="title:visual.preview" title="Presentation preview" sandbox="allow-scripts"></iframe></div>`,
  exportAfter:exportOptions,
  drawer:{versions,agent,language,backup,developer}
});

// ---- Requests ----
// Calls made while the module mounts wait for the local session token instead of failing with 401.
let sessionReady;const session=new Promise(r=>sessionReady=r);
// A 401 is answered before the request is handled, so one retry after reconnecting cannot repeat a change.
async function api(path,data,method='POST',retry=true){if(!state.token)await session;const response=await fetch(path,{method,headers:{Authorization:'Bearer '+state.token,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});if(response.status===401&&retry){await shell.reconnect();return api(path,data,method,false);}if(!response.ok){const e=(await response.json()).error;throw Object.assign(new Error(e.message),e);}return response;}
async function json(path,data,method){return (await api(path,data,method)).json();}
// Information goes to the toast; a problem goes to the banner above the stage and turns the square red until it clears.
function message(text,isError=false){if(isError){shell.notice(text);shell.toast(text);}else{if(text)shell.toast(text);}}
function error(e){if(e?.name==='AbortError')return;message(e.message||String(e),true);}
function notify(){for(const fn of changeListeners)fn();scaleThumbnails();scaleCandidates();}

// ---- Status: the square, the export buttons, the page buttons ----
function exportBlocked(){const p=state.project;return !p||state.saving||!state.measured||!!state.drafts.size||(!!p?.extensions.deckweftWorkbench&&!workbench?.ready());}
function status(){
  if(!live())return; // answers that arrive while the other kind is on the page draw nothing
  const p=state.project;if(!shell)return;
  const attention=!!state.saveIssue||!!state.drafts.size||state.previewError;
  const square=!p?(state.firstRun?'unsaved':'saving'):state.saving?'saving':attention?'attention':state.dirty?'unsaved':'saved';
  const label=!p?(state.firstRun?t('visual.square.noDeck'):t('visual.square.opening')):state.saving?t('visual.square.saving'):state.drafts.size?t('visual.main.unappliedFieldEditsNeedRepair'):state.saveIssue==='conflict'?t('visual.square.conflict'):attention?(state.dirty?t('visual.square.unsavedLook'):t('visual.square.savedLook')):state.dirty?t('visual.main.unsavedChanges'):t('visual.main.savedOnThisComputer');
  shell.status({state:square,label,save:!!p&&!state.saving&&(state.dirty||state.saveIssue==='conflict')&&!state.drafts.size,undo:!!state.undo.length,redo:!!state.redo.length});
  // The canvas is busy while the preview renders and measures; stale until this exact content was measured.
  $('#canvas').setAttribute('aria-busy',String(!!p&&!state.measured&&!state.drafts.size&&!state.previewError));$('#canvas').classList.toggle('stale',!!p&&!state.measured);
  $('#emptyCanvas').hidden=!!p||state.firstRun;$('#frameSpace').hidden=!p;
  const position=p?p.plan.scenes.findIndex(s=>s.id===state.active):-1;
  $('#moveUp').disabled=!p||position<=0;$('#moveDown').disabled=!p||position===p.plan.scenes.length-1;$('#pageCount').textContent=p?`${position+1} / ${p.plan.scenes.length}`:'';
  $('#resetDraft').hidden=!state.drafts.size;$('#useInteractionOpening').disabled=!state.measured||!!state.drafts.size;
  $('#openHistory').disabled=!p;
  author?.drawControls();shell.syncExports();scheduleCompare();
}
function changed(fn,{fields=false}={}){if(!state.project)return;const before=structuredClone(state.project);fn();if(JSON.stringify(before)===JSON.stringify(state.project))return;invalidateCandidates();state.undo.push(before);if(state.undo.length>60)state.undo.shift();state.redo=[];state.counter++;state.dirty=true;state.measured=false;if(fields)drawEditor();drawScenes();status();schedulePreview();scheduleSave();return true;}
function moveHistory(redo=false){if(!state.project)return;invalidateCandidates();const from=redo?state.redo:state.undo,to=redo?state.undo:state.redo;if(!from.length)return;const rev=state.project.revision;to.push(structuredClone(state.project));state.project=from.pop();state.project.revision=rev;state.active=state.project.plan.scenes.some(s=>s.id===state.active)?state.active:state.project.plan.scenes[0].id;state.counter++;state.dirty=true;draw();schedulePreview();scheduleSave();}

// ---- The library ----
// One list for both kinds, like the classic page: a classic deck opens in the classic workbench; nothing is converted.
async function libraries(){
  const [visual,legacy]=await Promise.all([json('/api/visual/projects',undefined,'GET'),json('/api/projects',undefined,'GET').catch(()=>({projects:[]}))]);
  const items=[...visual.projects.map(p=>({...p,kind:'visual'})),...legacy.projects.filter(p=>!p.unreadable).map(p=>({...p,kind:'classic'}))].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  $('#projectPicker').innerHTML=items.map(p=>`<option value="${p.kind==='classic'?'classic:':''}${x(p.id)}" ${p.unreadable?'disabled':''}>${x(t('visual.backup.pickerItem',{title:p.title,kind:t(p.kind==='visual'?'visual.backup.kindVisual':'visual.backup.kindClassic')}))}</option>`).join('');
  if(state.project)$('#projectPicker').value=state.project.id;return visual.projects;
}
function activate(project){rememberDeck(project.id);invalidateCandidates();familyOverrides=Object.create(null);clearTimeout(previewTimer);clearTimeout(saveTimer);sequence++;shell.closeFirstRun();state.firstRun=false;state.project=project;state.taskEvidence=null;state.saveIssue=null;state.previewError=false;shell.notice('');const requested=query.get('scene');state.active=project.plan.scenes.some(s=>s.id===requested)?requested:project.plan.scenes[0].id;state.dirty=false;state.counter++;state.undo=[];state.redo=[];state.drafts.clear();state.render=null;state.measured=false;draw();schedulePreview();workbench?.selection();}
async function leave(){return !state.dirty&&!state.drafts.size||confirm(t('visual.main.leaveTheseUnsavedEditsExportProject'));}
async function open(loader){if(!await leave())return false;state.measured=false;state.render=null;status();try{activate(await loader());await libraries();return true;}catch(e){error(e);status();return false;}}

// ---- The page strip ----
let thumbnailHeights=new Map();
function drawScenes(){
  if(!state.project)return;
  $('#deckTitle').value=state.project.document.title;$('#deckTitleSmall').value=state.project.document.title;
  $('#sceneTitle').textContent=focalText(scene());notify();
}
const focalText=s=>{const b=state.project.document.blocks.find(b=>b.id===s?.focalBlockId);return b?.text||b?.label||s?.id||'';};
function thumbnails(){
  const p=state.project;if(!p)return [];
  return p.plan.scenes.map(s=>{
    const added=state.taskEvidence?.hostAuthored.pages.find(v=>v.sceneId===s.id),marks=[];
    if(added)marks.push(t('visual.main.hostAdded')+' · '+added.lines.length+' · '+t('visual.main.unverified'));
    if((p.plan.chapters||[]).some(c=>c.startSceneId===s.id))marks.push(t('visual.main.chapter'));
    if(s.contentStatus==='evidence-required')marks.push(t('visual.main.evidenceRequired'));
    const svg=state.render?`<iframe src="${x((state.render.thumbnailUrl||state.render.artifactUrl)+'?thumbnail='+encodeURIComponent(s.id))}" title="${x(t('visual.main.pagePreview')+' '+s.id)}" sandbox="" tabindex="-1" loading="lazy" data-thumbnail="${x(s.id)}"></iframe>`:'';
    return {id:s.id,title:focalText(s),svg,mark:marks.join(' · '),active:s.id===state.active};
  });
}
function scaleThumbnails(){for(const frame of document.querySelectorAll('#slideList iframe[data-thumbnail]')){const holder=frame.parentElement,height=thumbnailHeights.get(frame.dataset.thumbnail)||900,s=Math.min(holder.clientWidth/1440,holder.clientHeight/height)||0.12;frame.style.width='1440px';frame.style.height=height+'px';frame.style.transform=`scale(${s})`;frame.style.left=Math.max(0,(holder.clientWidth-1440*s)/2)+'px';}}
function selectScene(id,{focus=false}={}){if(!state.project?.plan.scenes.some(s=>s.id===id))return;state.active=id;drawScenes();drawEditor();drawCandidates();scale();status();$('#preview').contentWindow?.postMessage({type:'deckweft:select',sceneId:id},'*');if(focus)$('#slideList [aria-current="true"]')?.focus({preventScroll:true});}
async function movePage(offset){const counter=state.counter;state.measured=false;state.render=null;status();try{const {project}=await json('/api/visual/move',{project:state.project,sceneId:state.active,offset});if(counter!==state.counter)throw Error(t('visual.main.editsChangedRetryPageMovement'));changed(()=>state.project=project,{fields:true});}catch(e){error(e);schedulePreview();}}
// A drag moves one page by adjacent steps through the same route, so every lock is checked at each step; one Undo restores it.
async function reorder(id,index){
  const scenes=state.project?.plan.scenes;if(!scenes)return;const from=scenes.findIndex(s=>s.id===id),to=index>from?index-1:index;if(from<0||to===from)return;
  const counter=state.counter;state.measured=false;state.render=null;status();
  try{let project=state.project;for(let i=from;i!==to;i+=Math.sign(to-from))project=(await json('/api/visual/move',{project,sceneId:id,offset:Math.sign(to-from)})).project;if(counter!==state.counter)throw Error(t('visual.main.editsChangedRetryPageMovement'));changed(()=>{state.project=project;state.active=id;},{fields:true});}catch(e){error(e);schedulePreview();}
}

// ---- The canvas ----
function scale(){
  const space=$('#frameSpace'),stage=$('#stage'),style=getComputedStyle(stage);if(!space||!state.project)return;
  const aw=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),ah=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  const height=Math.ceil(state.fit?.checks?.find(c=>c.sceneId===state.active)?.height||900),s=Math.max(.05,Math.min(1,aw/1440,ah/900));
  const frame=$('#preview');frame.style.width='1440px';frame.style.height=height+'px';frame.style.transform=`scale(${s})`;
  for(const n of [$('#canvas'),space]){n.style.width=Math.floor(1440*s)+'px';n.style.height=Math.ceil(height*s)+'px';}
}
function schedulePreview(){clearTimeout(previewTimer);const run=++sequence;state.render=null;state.fit=null;state.measured=false;status();notify();if(state.drafts.size){$('#preview').removeAttribute('src');return;}previewTimer=setTimeout(async()=>{if(!live())return;const counter=state.counter;try{const r=await json('/api/visual/preview',{project:state.project});if(run!==sequence||counter!==state.counter)return;state.render=r;state.previewError=false;thumbnailHeights.clear();$('#preview').src=r.artifactUrl+'#scene='+encodeURIComponent(state.active);scale();notify();status();}catch(e){if(run===sequence){state.previewError=true;error(e);status();}}},200);}
// A save changes only the revision: the page renders the same, so a fresh ticket is measured with the fit already taken instead
// of reloading the frame. Exports and choices need the ticket of these exact bytes, revision included.
async function refreshTicket(){
  const run=++sequence,counter=state.counter,fit=state.fit,hash=state.render?.renderHash;state.measured=false;status();if(state.drafts.size)return;
  try{const r=await json('/api/visual/preview',{project:state.project});if(run!==sequence||counter!==state.counter)return;
   if(fit&&r.renderHash===hash){state.render={...r,thumbnailUrl:state.render?.thumbnailUrl||state.render?.artifactUrl};await json('/api/visual/measure',{ticket:r.ticket,fit});if(run!==sequence||state.render?.ticket!==r.ticket)return;state.measured=true;if(state.previewError){state.previewError=false;shell.notice('');}status();}
   else{state.render=r;thumbnailHeights.clear();$('#preview').src=r.artifactUrl+'#scene='+encodeURIComponent(state.active);scale();notify();status();}
  }catch(e){if(run===sequence){state.previewError=true;error(e);status();}}
}
addEventListener('message',async e=>{
  if(e.source!==$('#preview')?.contentWindow)return;
  if(e.data?.type==='deckweft:scene'&&e.data.renderHash===state.render?.renderHash){if(e.data.sceneId!==state.active)selectScene(e.data.sceneId);return;}
  if(e.data?.type==='deckweft:web-error'&&e.data.renderHash===state.render?.renderHash){state.measured=false;state.previewError=true;status();error(new Error(e.data.message));return;}
  if(e.data?.type!=='deckweft:web-fit'||!state.render||e.data.fit?.renderHash!==state.render.renderHash)return;
  const ticket=state.render.ticket;state.fit=e.data.fit;if(state.fit.viewport.width===1440){for(const c of state.fit.checks)thumbnailHeights.set(c.sceneId,c.height);scaleThumbnails();}scale();
  try{if(!e.data.fit.ok)throw new Error(t('visual.main.someRenderedContentDoesNotFit'));await json('/api/visual/measure',{ticket,fit:e.data.fit});if(state.render?.ticket!==ticket)return;state.measured=true;state.previewError=false;shell.notice('');status();}catch(err){state.previewError=true;error(err);status();}
});

// ---- Saving: automatic 1.2 s after the last edit; a conflict waits for ⌘/Ctrl S, which offers the separate copy ----
function scheduleSave(){clearTimeout(saveTimer);if(!state.dirty||state.drafts.size||state.saveIssue==='conflict')return;saveTimer=setTimeout(()=>{if(state.dirty&&!state.saving&&!state.drafts.size)save({auto:true});},1200);}
async function save({auto=false}={}){
  if(!state.project||state.saving||state.drafts.size)return false;clearTimeout(saveTimer);if(!auto){shell.reconnect.offerAgain();state.saveIssue=null;}
  state.saving=true;status();const snapshot=structuredClone(state.project),counter=state.counter;
  try{const {project,historyUsage}=await json('/api/visual/projects/'+snapshot.id,{project:snapshot,expectedRevision:snapshot.revision.number},'PUT');
    if(state.project.id===snapshot.id){state.project.revision=project.revision;if(counter===state.counter)state.dirty=false;invalidateCandidates();refreshTicket();}
    state.saveIssue=null;await libraries();shell.capacity(historyUsage);return !state.dirty;
  }catch(e){
    if(e.code==='REVISION_CONFLICT'){state.saveIssue='conflict';if(!auto){try{if(await saveCopy())return true;}catch(copyError){error(copyError);return false;}}message(t('visual.main.newerCopy'),true);}
    else{state.saveIssue='failed';error(e);}return false;
  }finally{state.saving=false;status();if(state.dirty&&!state.saveIssue)scheduleSave();}
}
// After a 409 the author may keep the draft as a new document through the import-as-copy route; the newer revision stays untouched.
async function saveCopy(){if(!await shell.askSaveCopy())return false;const active=state.active,{project}=await json('/api/visual/import',{project:structuredClone(state.project)});activate(project);selectScene(active);await libraries();message(t('visual.main.savedAsASeparateCopyThe'));return true;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

// ---- Take away: present, HTML, PowerPoint, PDF; json is the drawer's backup ----
async function exportHTML(){try{if(state.project?.extensions.deckweftWorkbench){await workbench.exportHTML();return;}const r=await api('/api/visual/export',{project:state.project,format:'html',ticket:state.render?.ticket});download(await r.blob(),'deckweft-visual.html');$('#exportDialog').close();message(t('visual.main.standaloneHtmlExportedWithEmbeddedLocal'));}catch(e){error(e);schedulePreview();}}
function backupProject(){const value=state.drafts.size?{format:'deckweft-visual-draft',version:1,project:state.project,unappliedFields:Object.fromEntries(state.drafts)}:state.project;download(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),'deckweft.visual.json');}
function exports(){
  const blocked=exportBlocked(),capture=author?.captureAvailable()??false,format=author?.format();
  return {
    present:{id:'workbenchWatch',label:t('visual.take.present'),note:t('visual.take.presentNote'),disabled:!state.render||!state.measured,run:()=>{if(state.render?.artifactUrl)window.open(state.render.artifactUrl,'_blank','noopener');}},
    html:{id:'exportHTML',label:'HTML',note:t('visual.take.html'),disabled:blocked,run:exportHTML},
    pptx:{id:'exportPPTX',label:'PowerPoint',note:t(capture?'visual.take.pptx':'visual.take.needsBrowser'),disabled:blocked||!capture,pressed:format==='pptx',run:()=>author.selectFormat('pptx')},
    pdf:{id:'exportPDF',label:'PDF',note:t(capture?'visual.take.pdf':'visual.take.needsBrowser'),disabled:blocked||!capture,pressed:format==='pdf',run:()=>author.selectFormat('pdf')},
    json:{label:'Project JSON',disabled:!state.project,run:backupProject}
  };
}

// ---- Words: the page's typed blocks ----
const familyLabels={statement:'visual.main.statement',image:'visual.main.imageNarrative',metric:'visual.main.oversizedNumber',evidence:'visual.main.dataEvidence',comparison:'visual.main.comparison',process:'visual.main.process',chapter:'visual.main.chapter','before-after':'visual.main.beforeAfter','system-map':'visual.main.systemMap','small-multiples':'visual.main.smallMultiples',quote:'visual.main.quotation',closing:'visual.main.conclusionNextStep'};
const familyRequires={statement:'heading',image:'image',metric:'metric',evidence:'chart',comparison:'table',process:'diagram',chapter:'heading','before-after':'image','system-map':'diagram','small-multiples':'chart',quote:'quote',closing:'list'};
const compositionLabels={'diagonal-cover':'visual.main.diagonalCover','chart-with-evidence-rail':'visual.main.chartWithEvidenceRail','reading-flow':'visual.main.readingFlow','photo-split':'visual.main.imageLedSplit','violet-chapter':'visual.main.violetChapter'};
const choiceLabels={restrained:'visual.main.restrained',bold:'visual.main.bold',balanced:'visual.main.balanced',expressive:'visual.main.expressive',comfortable:'visual.main.comfortable',compact:'visual.main.compact',off:'visual.main.off',subtle:'visual.main.subtle',large:'visual.main.large'};
const profileLabels={colorIntensity:'visual.main.colorIntensity',typographicContrast:'visual.main.typeContrast',density:'visual.main.density3',motionIntensity:'visual.main.motion',imageEmphasis:'visual.main.imageEmphasis'};
function activeFamily(){const s=scene();if(familyOverrides[s.id])return familyOverrides[s.id];const prefix=Object.keys(familyLabels).find(f=>s.composition.startsWith(f+'-'));if(prefix)return prefix;const types=s.blockIds.map(id=>state.project.document.blocks.find(b=>b.id===id).type);return ['chart','image','metric','table','diagram'].map((k,i)=>types.includes(k)?['evidence','image','metric','comparison','process'][i]:null).find(Boolean)||'statement';}
const sceneLock=s=>state.project.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===s.id)?.fields||[];
function drawEditor(){
  const p=state.project,s=scene();if(!p||!s)return;const locks=sceneLock(s);
  renderAddedLines($('#hostAuthoredLines'),state.taskEvidence?.hostAuthored.pages.find(v=>v.sceneId===s.id));drawAssetFields();drawLook();
  $('#family').innerHTML=Object.entries(familyLabels).map(([key,label])=>`<option value="${key}" ${key===activeFamily()?'selected':''} ${!s.blockIds.some(id=>p.document.blocks.find(b=>b.id===id)?.type===familyRequires[key])?'disabled':''}>${x(t(label))}</option>`).join('');$('#family').disabled=locks.includes('composition');
  $('#composition').textContent=t('visual.main.composition')+t(compositionLabels[s.composition]||s.composition);
  $('#outputLanguage').value=p.document.locale;$('#audience').value=p.document.visualBrief?.audience||'';
  const noteIds=new Set((s.interactions||[]).flatMap(i=>[...(i.steps||[]).map(step=>step.explanationId),...(i.blueprint?[i.blueprint.wholeExplanationId]:[])]));
  $('#explanationJSON').value=state.drafts.get('_explanations')||JSON.stringify((p.document.explanations||[]).filter(n=>noteIds.has(n.id)),null,2);$('#explanationJSON').disabled=p.plan.scenes.some(sc=>(sc.interactions||[]).some(i=>p.document.authorOverrides.lockedBlockIds.includes(i.blockId)&&((i.steps||[]).some(step=>noteIds.has(step.explanationId))||(i.blueprint&&noteIds.has(i.blueprint.wholeExplanationId)))));
  $('#interactionJSON').value=state.drafts.get('_interactions')||JSON.stringify({interactions:s.interactions||[],cues:s.cues||[],...(s.motion?{motion:s.motion}:{})},null,2);$('#interactionJSON').disabled=locks.some(f=>['interactions','cues','motion'].includes(f));
  $('#sourceJSON').value=state.drafts.get('_sources')||JSON.stringify({sources:p.document.sources,sourceSnapshots:p.document.sourceSnapshots||[]},null,2);
  drawInteractionFields();
  $('#profileFields').innerHTML=Object.entries(profileChoices).map(([key,options])=>`<label for="profile-${key}">${x(t(profileLabels[key]))}</label><select id="profile-${key}" data-profile="${key}">${options.map(v=>`<option value="${v}" ${profile()[key]===v?'selected':''}>${x(t(choiceLabels[v]))}</option>`).join('')}</select>`).join('');
  $('#fields').innerHTML=s.blockIds.map(id=>{const b=p.document.blocks.find(b=>b.id===id),locked=p.document.authorOverrides.lockedBlockIds.includes(id),disabled=locked?'disabled':'',key='field-'+id;let field='';
   if(['heading','paragraph','quote','callout','citation'].includes(b.type))field=`<label for="${key}">${x(t('visual.words.'+b.type))}</label><textarea id="${key}" data-text="${id}" ${disabled}>${x(b.text)}</textarea>`;
   else if(b.type==='code'){const {text,...metadata}=b,mixed=/\r(?!\n)/.test(text)||text.includes('\r\n')&&text.replaceAll('\r\n','').includes('\n');field=`<label for="${key}">${x(t('visual.main.exactCodeWhitespaceRetained')+(text.includes('\r\n')?' · CRLF':' · LF'))}</label><textarea id="${key}" data-text="${id}" spellcheck="false" ${disabled} ${mixed?'disabled':''}>${x(b.text)}</textarea>${mixed?`<p class="hint">${x(t('visual.main.mixedLineSeparatorsEditEscapedJson'))}</p>`:''}<details class="field-more"><summary>${x(t('visual.words.codeDetails'))}</summary><textarea class="data-editor" ${mixed?'data-block':'data-code-meta'}="${id}" ${disabled} aria-label="${x(t('visual.main.languageEmphasizedlinesAndSourceanchorJson'))}">${x(state.drafts.get(id)||JSON.stringify(mixed?b:metadata,null,2))}</textarea></details>`;}
   else if(b.type==='list')field=`<label for="${key}">${x(t('visual.words.list'))}</label><textarea id="${key}" data-list="${id}" ${disabled}>${x(b.items.join('\n'))}</textarea>`;
   else if(b.type==='metric')field=`<label for="${key}">${x(t('visual.words.number'))}</label><input id="${key}" type="number" step="any" value="${b.value}" data-metric="${id}" ${disabled}><label>${x(t('visual.main.unit'))}<input value="${x(b.unit)}" data-unit="${id}" ${disabled}></label><label>${x(t('visual.main.label'))}<input value="${x(b.label)}" data-label="${id}" ${disabled}></label>`;
   else if(b.type==='chart'){const d=p.document.datasets.find(d=>d.id===b.datasetId);field=`<label for="${key}">${x(t('visual.words.chartData'))}</label><textarea id="${key}" class="data-editor ${state.drafts.has(id)?'invalid':''}" data-dataset="${id}" ${disabled}>${x(state.drafts.get(id)||JSON.stringify(d,null,2))}</textarea><details class="field-more"><summary>${x(t('visual.words.chartDetails'))}</summary><textarea data-block="${id}" class="data-editor" ${disabled} aria-label="${x(t('visual.main.chartSettingsStableIdentityTypeAnd'))}">${x(JSON.stringify(b,null,2))}</textarea></details>`;}
   else if(b.type==='image')field=`<label>${x(t('visual.main.alternativeText'))}<textarea data-alt="${id}" ${disabled}>${x(b.alt)}</textarea></label>`;
   else field=`<label for="${key}">${x(t('visual.words.other'))}</label><textarea id="${key}" class="data-editor" data-block="${id}" ${disabled}>${x(state.drafts.get(id)||JSON.stringify(b,null,2))}</textarea>`;
   return `<section class="field-card" data-field-kind="${x(b.type)}">${field}</section>`;
  }).join('');
}
function draw(){drawScenes();drawEditor();status();}
// ---- Look: the three buttons, colours, motion and image ----
function pageKept(s=scene()){const f=sceneLock(s);return f.includes('composition')&&f.includes('theme');}
function drawLook(){
  const p=state.project,s=scene(),locks=sceneLock(s);
  for(const b of document.querySelectorAll('[data-zone=look] [data-theme]')){b.classList.toggle('selected',b.dataset.theme===s.theme);b.setAttribute('aria-pressed',String(b.dataset.theme===s.theme));b.disabled=locks.includes('theme');}
  $('#largerType').setAttribute('aria-pressed',String(profile().typographicContrast==='expressive'));
  $('#keepPage').setAttribute('aria-pressed',String(pageKept(s)));$('#moreSpace').disabled=locks.includes('composition');
  const moving=!!(s.interactions?.length||s.motion?.policy==='subtle'),interactionLocked=locks.some(f=>['interactions','cues','motion'].includes(f)),on=moving||motionOpened.has(s.id);
  const sw=$('#motionSwitch');sw.setAttribute('aria-checked',String(on));sw.disabled=interactionLocked;sw.querySelector('span').dataset.i18n=on?'visual.look.on':'visual.look.off';sw.querySelector('span').textContent=t(sw.querySelector('span').dataset.i18n);
  $('#motionControls').hidden=!on;
  // The image slot is on every page: replace this page's image, or add one / choose a text-led layout where it has none.
  const hasImage=p.document.blocks.some(b=>s.blockIds.includes(b.id)&&b.type==='image'),slot=$('#sourceImport');$('#imageSlot').hidden=false;slot.dataset.i18n=hasImage?'visual.look.replaceImage':'visual.look.addImage';slot.textContent=t(slot.dataset.i18n);
  for(const b of document.querySelectorAll('[data-detail]'))b.setAttribute('aria-pressed',String(b.dataset.detail===state.detail));
}
const motionOpened=new Set();

// ---- Choices: three complete candidate decks, measured; always shown once the page is measured ----
function invalidateCandidates(){candidateRun++;candidateState=null;clearTimeout(compareTimer);if($('#candidateDialog')?.open)$('#candidateDialog').close();$('#largeCandidate')?.removeAttribute('src');if($('#rhythm'))$('#rhythm').disabled=true;$('#rhythmReport')?.replaceChildren();if($('#candidateStatus'))$('#candidateStatus').textContent='';}
function scheduleCompare(){clearTimeout(compareTimer);if(!state.project||!state.measured||state.drafts.size||candidateState||comparing||compareFailed===state.counter)return;compareTimer=setTimeout(compare,600);}
async function compare(){
  if(!live()||!state.project||state.drafts.size||candidateState||comparing)return;const run=++candidateRun,counter=state.counter;comparing=true;$('#candidateStatus').textContent=t('visual.main.preparingThreeCompleteCandidateDecks');
  try{const result=await json('/api/visual/candidates',{project:state.project,families:familyOverrides});if(run!==candidateRun||counter!==state.counter)return;result.active=state.active;candidateState=result;notify();drawCandidates();}
  catch(e){if(run===candidateRun){compareFailed=counter;$('#candidateStatus').textContent=e.message;}}finally{comparing=false;}
}
function candidates(){
  const current=candidateState,p=state.project;if(!current||!p)return [];const i=p.plan.scenes.findIndex(s=>s.id===state.active);
  return current.sets.map((set,k)=>{const d=set.scenes[i],label=current.families?.[d.family]?.variants.find(v=>v[0]===d.id),fit=set.fits?.[i];
    return {id:String(k),svg:`<iframe title="${x(t('visual.main.compositionCandidate')+(k+1))}" sandbox="allow-scripts" tabindex="-1" src="${x(set.artifactUrl)}#scene=${encodeURIComponent(current.active)}"></iframe>`,label:label?pick(label[1],label[2]):d.id,eligible:!fit||fit.ok,reason:fit&&!fit.ok?t('visual.choice.doesNotFit'):'',explanation:fit&&!fit.ok?fit.reasons.join(' · '):'',selected:scene().composition===d.id,disabled:!fit?.ok,inspect:true};});
}
function drawCandidates(){if(!candidateState)return;for(const frame of document.querySelectorAll('#candidates iframe'))frame.contentWindow?.postMessage({type:'deckweft:select',sceneId:state.active},'*');$('#rhythm').disabled=!candidateState.sets.every(s=>s.fits);scaleCandidates();}
function scaleCandidates(){for(const n of document.querySelectorAll('.candidate-picture,.candidate-window')){const f=n.querySelector('iframe');if(!f)continue;const s=n.clientWidth/1440;f.style.transform=`scale(${s})`;n.style.height=Math.max(40,900*s)+'px';}}
addEventListener('resize',scaleCandidates);
addEventListener('message',async e=>{const current=candidateState;if(!current)return;const k=[...document.querySelectorAll('#candidates iframe')].findIndex(f=>f.contentWindow===e.source);if(k>=0&&e.data?.type==='deckweft:web-error'){$('#candidateStatus').textContent=e.data.message;return;}if(k<0||e.data?.type!=='deckweft:web-fit'||e.data.fit?.renderHash!==current.sets[k].renderHash)return;try{const r=await json('/api/visual/candidate-measure',{ticket:current.sets[k].ticket,fit:e.data.fit});if(current!==candidateState)return;current.sets[k].fits=r.fits;notify();drawCandidates();if(current.sets.every(s=>s.fits))$('#candidateStatus').textContent=t('visual.main.threeFullDecksMeasuredAt1440px');}catch(err){if(current===candidateState)$('#candidateStatus').textContent=err.message;}});
async function selectComposition(index){const current=candidateState,counter=state.counter;if(!current)return;state.measured=false;state.render=null;status();try{const r=await json(index===undefined?'/api/visual/rhythm':'/api/visual/select-candidate',{project:state.project,tickets:current.sets.map(s=>s.ticket),...(index===undefined?{}:{sceneId:state.active,index})});if(counter!==state.counter||current!==candidateState)throw Error(t('visual.main.editsChangedCompareAgain'));const report=r.report;const modified=changed(()=>state.project=r.project,{fields:true});if(!modified)schedulePreview();if(report)drawRhythmReport(report);message(t(index===undefined?'visual.choice.wholeDeckApplied':'visual.choice.applied'));}catch(e){error(e);schedulePreview();}}
function drawRhythmReport(report){$('#rhythmReport').innerHTML=`<p>${x(t('visual.main.storyRhythmCost')+report.cost)}</p><ol>${report.scenes.map(s=>`<li>${x(s.sceneId+' · '+s.id)}<small>${x(t('visual.main.beat')+(s.narrative?.phase||'context')+' · '+t('visual.main.focus')+s.focus+' · '+t('visual.main.density2')+Math.round(s.density*100)+'% · '+t('visual.main.image2')+Math.round(s.imageRatio*100)+'% · '+s.theme+' / '+s.colorMode)}</small>${s.transition?`<small>${x(t('visual.main.repeatedWithPreviousPage')+Object.entries(s.transition.parts).filter(([,v])=>v>0).map(([k])=>t(({geometry:'visual.main.composition2',focus:'visual.main.focus2',density:'visual.main.density4',color:'visual.main.colorMode',imageRatio:'visual.main.imageRatio'})[k])).join(', '))}</small>`:''}</li>`).join('')}</ol>${(report.rules?.issues||[]).map(i=>`<p class="rhythm-rule">${x(t(({repeat:'visual.main.sameCompositionThreeTimesInA','card-run':'visual.main.threeHeadingPlusCardsPagesIn',variety:'visual.main.fewerThanFourFamiliesInA'})[i.rule])+(i.sceneIds||i.families).join(', ')+(i.author?t('visual.main.keptAuthorLock'):''))}</p>`).join('')}`;}
function inspect(id){const set=candidateState?.sets[Number(id)];if(!set)return;$('#candidateTitle').textContent=t('visual.main.candidate')+(set.index+1);$('#largeCandidate').src=set.artifactUrl+'#scene='+encodeURIComponent(state.active);dialogs.open($('#candidateDialog'));for(const n of document.querySelectorAll('#candidateDialog .candidate-window'))n.style.height='';requestAnimationFrame(scaleCandidates);}

// ---- Images ----
function currentImage(){return state.project?.document.blocks.find(b=>b.id===selectedImage&&scene()?.blockIds.includes(b.id)&&b.type==='image');}
function imageLocked(blockId=currentImage()?.id){const b=state.project?.document.blocks.find(b=>b.id===blockId),fields=state.project?sceneLock(scene()):[];return fields.some(f=>['crops','imageSlots'].includes(f))||!!(b&&state.project.document.authorOverrides.lockedBlockIds.includes(b.id));}
function localSlot(){const b=currentImage(),s=scene(),asset=state.project.assets.find(a=>a.id===b.assetId),existing=s.imageSlots?.find(v=>v.blockId===b.id);if(existing)return structuredClone(existing);const c=s.crops?.find(v=>v.blockId===b.id)||{x:0,y:0,width:1,height:1};return {id:'hero',blockId:b.id,brief:{role:'illustration',requiredWidth:Math.max(1,Math.min(320,Math.floor(asset.width*c.width))),requiredHeight:Math.max(1,Math.min(240,Math.floor(asset.height*c.height))),focalPoint:{x:c.x+c.width/2,y:c.y+c.height/2},safeRegion:{x:c.x,y:c.y,width:c.width,height:c.height},factual:!!b.factual,sourceId:b.factual?b.sourceIds[0]||'':'',backend:'none'},display:'crop',aspect:asset.width*c.width/(asset.height*c.height)};}
function drawAssetFields(){const p=state.project,s=scene(),images=p.document.blocks.filter(b=>s.blockIds.includes(b.id)&&b.type==='image');if(!images.some(b=>b.id===selectedImage))selectedImage=images[0]?.id||'';assetInspection=null;$('#sourceCatalog').replaceChildren();sourceEntries=[];const locked=imageLocked();$('#sourceImport').disabled=locked;$('#imageAlternative').disabled=sceneLock(s).includes('composition');
 const lock=sceneLock(s),image=images[0],crop=s.crops?.find(c=>c.blockId===image?.id)||{x:0,y:0,width:1,height:1};
 $('#cropFields').innerHTML=image?`<p class="look-label">${x(t('visual.main.imageCrop'))}</p><div class="crop-grid">${['x','y','width','height'].map(k=>`<label>${k}<input type="number" min="0" max="1" step="0.01" value="${crop[k]}" data-crop="${k}" data-image="${image.id}" ${imageLocked(image.id)?'disabled':''}></label>`).join('')}</div>`:'';
 $('#imageOpen').disabled=!!(image&&(p.document.authorOverrides.lockedBlockIds.includes(image.id)||s.imageSlots?.length||lock.some(f=>['crops','imageSlots','blockIds'].includes(f))));
 if(!images.length){$('#assetFields').innerHTML=`<p class="hint">${x(t('visual.main.importOrExtractAnImageTo'))}</p>`;return;}
 const slot=localSlot(),b=currentImage(),asset=p.assets.find(a=>a.id===b.assetId),d=locked?'disabled':'';
 const number=(id,label,value,min=0,max=1,step=.01)=>`<label>${x(label)}<input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" ${d}></label>`;
 $('#assetFields').innerHTML=`<p class="hint" id="assetIdentity">${x(asset.license+' · '+asset.provenance)}</p><label for="slotImage">${x(t('visual.main.imageBinding'))}</label><select id="slotImage">${images.map(v=>`<option value="${v.id}" ${v.id===b.id?'selected':''}>${x(v.alt)}</option>`).join('')}</select><label for="slotName">${x(t('visual.main.namedSlot'))}</label><input id="slotName" value="${x(slot.id)}" maxlength="64" ${d}><label for="slotRole">${x(t('visual.main.role'))}</label><select id="slotRole" ${d}>${Object.entries({photo:'visual.main.photo','product-screenshot':'visual.main.productScreenshot',illustration:'visual.main.illustrationConcept',background:'visual.main.background'}).map(([k,l])=>`<option value="${k}" ${k===slot.brief.role?'selected':''}>${x(t(l))}</option>`).join('')}</select><div class="crop-grid">${number('slotW',t('visual.main.minimumWidthPixels'),slot.brief.requiredWidth,1,8192,1)}${number('slotH',t('visual.main.minimumHeightPixels'),slot.brief.requiredHeight,1,8192,1)}</div><label class="check"><input id="slotFactual" type="checkbox" ${slot.brief.factual?'checked':''} ${d}>${x(t('visual.main.factualSourceEvidence'))}</label><label for="slotSource">${x(t('visual.main.documentSourceReference'))}</label><select id="slotSource" ${d}><option value="">${x(t('visual.main.noFactualReference'))}</option>${p.document.sources.map(source=>`<option value="${source.id}" ${source.id===slot.brief.sourceId?'selected':''}>${x(source.title)}</option>`).join('')}</select><p class="look-label">${x(t('visual.main.focalPointProtectedRegion01'))}</p><p class="hint">${x(t('visual.main.markTheSubjectYourselfTheseAre'))}</p><div class="crop-grid">${number('focalX',t('visual.main.focusX'),slot.brief.focalPoint.x)}${number('focalY',t('visual.main.focusY'),slot.brief.focalPoint.y)}${['x','y','width','height'].map(k=>number('safe-'+k,t('visual.main.safe.'+k),slot.brief.safeRegion[k])).join('')}</div><label for="slotDisplay">${x(t('visual.main.displayMode'))}</label><select id="slotDisplay" ${d}><option value="crop" ${slot.display==='crop'?'selected':''}>${x(t('visual.main.keepCurrentCrop'))}</option><option value="contain" ${slot.display==='contain'?'selected':''}>${x(t('visual.main.containCompleteOriginal'))}</option></select><button id="slotApply" ${d}>${x(t('visual.main.applyDirection'))}</button><button id="downloadOriginal">${x(t('visual.main.downloadUnchangedOriginal'))}</button><button id="slotInspect">${x(t('visual.main.inspectOriginalCropCandidates'))}</button><canvas id="subjectCanvas" width="520" height="360" hidden aria-label="${x(t('visual.look.protectedRegion'))}"></canvas><p class="hint">${x(t('visual.main.nativeHash')+asset.hash)}<br>${x(asset.original?t('visual.main.original')+asset.original.hash:t('visual.main.legacyOriginalPngRetained'))}</p><div id="cropVariants"></div><label for="reuseAsset">${x(t('visual.main.reuseAnExistingAsset'))}</label><select id="reuseAsset">${p.assets.map(a=>`<option value="${a.id}">${x(a.alt)}</option>`).join('')}</select><button id="reuseApply" ${d}>${x(t('visual.main.attachSelectedAsset'))}</button>`;
}
async function mutateAsset(route,data){const counter=state.counter,sceneId=state.active,project=state.project;state.measured=false;state.render=null;status();try{const r=await json('/api/visual/'+route,{project,sceneId,blockId:currentImage()?.id,...data});if(counter!==state.counter||sceneId!==state.active)throw Error(t('visual.main.thePageOrEditsChangedRetry'));if(!changed(()=>state.project=r.project,{fields:true}))schedulePreview();return true;}catch(e){error(e);schedulePreview();return false;}}
// An image dropped on the canvas goes to the import dialog for this page's image; a deck file is imported as a copy.
function dropFile(file){
  // A text or Markdown file starts a new deck, like pasted words (the first-run box and the classic page do the same).
  if(/\.(md|txt)$/i.test(file.name)){
    if(file.size>1_900_000){message(t('classic.app.useAFileSmallerThan1'),true);return true;}
    leave().then(ok=>ok&&file.text()).then(text=>text&&firstRun(text.replace(/\r\n?/g,'\n').trim())).then(failed=>{if(failed)message(failed,true);});return true;
  }
  if(/\.json$/i.test(file.name)){const files=new DataTransfer();files.items.add(file);$('#projectFile').files=files.files;$('#projectFile').dispatchEvent(new Event('change'));return true;}
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)||!state.project)return false;
  if($('#sourceImport').disabled){message(t('visual.look.noImageSlot'),true);return true;}
  const files=new DataTransfer();files.items.add(file);$('#sourceFile').files=files.files;dialogs.open($('#sourceDialog'));return true;
}

// ---- Motion: one switch; the page's explanation, blueprint, transition and still picture sit behind it ----
function drawInteractionFields(){
 const p=state.project,s=scene(),locks=sceneLock(s);
 $('#enableInteractions').disabled=!!state.drafts.size||locks.some(f=>['interactions','cues'].includes(f));
 $('#sceneMotion').value=s.motion?.policy||'';$('#sceneMotion').disabled=locks.includes('motion');
 const keyStates=s.keyStates||[];$('#staticState').innerHTML=`<option value="">${x(t('visual.main.authoredOpeningDefault'))}</option>`+keyStates.map(k=>`<option value="${x(k.id)}">${x(k.position+' · '+(k.label||k.id))}</option>`).join('');$('#staticState').value=s.staticState?.keyStateId||'';$('#staticState').disabled=!keyStates.length||!!state.drafts.size||locks.some(f=>['cues','motion'].includes(f));
 const blueprint=(s.interactions||[]).find(i=>i.blueprint),hint=$('#blueprintStatic');$('#enableBlueprint').disabled=!!state.drafts.size||locks.some(f=>['interactions','cues','motion'].includes(f))||!!blueprint;hint.hidden=!blueprint;
 if(blueprint){const k=s.staticState&&keyStates.find(v=>v.id===s.staticState.keyStateId);hint.textContent=!k?t('visual.main.powerpointAndPdfExportsRefuseThis'):k.position===0?t('visual.main.explainShowsNeitherTheObjectNor'):t('visual.main.staticStateReadersWithoutJavascriptPowerpoint',{k:k.label||k.id});}
 const notes=new Map((p.document.explanations||[]).map(n=>[n.id,n]));
 $('#explanationFields').innerHTML=(s.interactions||[]).filter(i=>i.kind==='steps').map(i=>`<fieldset class="field-card"><legend>${x(t('visual.main.stepExplanations'))}</legend>${i.blueprint?(()=>{const n=notes.get(i.blueprint.wholeExplanationId),locked=p.document.authorOverrides.lockedBlockIds.includes(i.blockId);return `<label>${x(t('visual.main.theWholeObjectName'))}<input maxlength="100" data-explanation="${x(n.id)}" data-note-field="label" value="${x(n.label)}" ${locked?'disabled':''}></label><label>${x(t('visual.main.theWholeObjectExplanation'))}<textarea maxlength="2000" data-explanation="${x(n.id)}" data-note-field="text" ${locked?'disabled':''}>${x(n.text)}</textarea></label>`;})():''}${i.steps.map((step,k)=>{const n=notes.get(step.explanationId),locked=p.plan.scenes.some(sc=>(sc.interactions||[]).some(v=>p.document.authorOverrides.lockedBlockIds.includes(v.blockId)&&v.steps?.some(st=>st.explanationId===step.explanationId)));return `<label>${k+1} · ${x(t('visual.main.label2'))}<input maxlength="100" data-explanation="${x(n.id)}" data-note-field="label" value="${x(n.label)}" ${locked?'disabled':''}></label><label>${x(t('visual.main.explanation'))}<textarea maxlength="2000" data-explanation="${x(n.id)}" data-note-field="text" ${locked?'disabled':''}>${x(n.text)}</textarea></label>`;}).join('')}</fieldset>`).join('');
}
// On opens the ways this page can move (explanations, Explain → Diagram → Explore, transition, the still picture for print);
// the page moves once one is chosen. Off makes the page still: its interactions, cues and transition go (Undo brings them back).
function toggleMotion(){
  const s=scene(),on=$('#motionSwitch').getAttribute('aria-checked')==='true',moving=!!(s.interactions?.length||s.motion);
  motionOpened[on?'delete':'add'](s.id);
  if(on&&moving){changed(()=>{const v=scene();v.interactions=[];v.cues=[];delete v.motion;delete v.staticState;},{fields:true});message(t('visual.look.stillNow'));return;}
  drawLook();if(!on)$('#enableInteractions').focus();
}

// ---- The first run: pasted words become a deck here, without a model; the three directions follow ----
// A blank line starts a new page, as the paste box says; the arranger itself splits pages on --- lines.
const pagesOf=text=>text.replace(/\n[ \t]*\n\s*/g,'\n---\n');
async function firstRun(text){
  try{const r=await json('/api/visual/directions',{answers:{topic:pagesOf(text),detail:state.detail},locale:state.ui});const {project}=await json('/api/visual/import',{project:r.base});activate(project);await libraries();author.showDirections().catch(()=>{});return '';}
  catch(e){return e.message;}
}
async function example(){try{activate((await json('/api/visual/demo',{locale:state.ui})).project);await libraries();return '';}catch(e){return e.message;}}

function mount(s){
  shell=s;dialogs=s.dialogs;document.body.classList.add('kind-visual');
  new ResizeObserver(()=>{if(!live())return;scale();scaleThumbnails();scaleCandidates();}).observe($('#stage'));
  // Words
  $('#fields').addEventListener('input',e=>{const n=e.target,b=state.project.document.blocks.find(b=>b.id===Object.values(n.dataset)[0]);if(!b||b.id!==Object.values(n.dataset)[0])return;
   if(n.dataset.dataset||n.dataset.block||n.dataset.codeMeta){try{const parsed=JSON.parse(n.value);if(n.dataset.codeMeta){if(Object.hasOwn(parsed,'text'))throw Error('Edit exact code in the code text field.');parsed.text=b.text;}if(n.dataset.dataset&&(parsed.id!==b.datasetId||!Array.isArray(parsed.series)||parsed.series.some(s=>!Array.isArray(s.values)||s.values.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v))))))throw Error('Use finite numeric series or explicit null gaps; keep the dataset id.');if((n.dataset.block||n.dataset.codeMeta)&&(parsed.id!==b.id||parsed.type!==b.type))throw Error('Keep the semantic block id and type.');state.drafts.delete(b.id);n.classList.remove('invalid');changed(()=>{if(n.dataset.dataset)state.project.document.datasets[state.project.document.datasets.findIndex(d=>d.id===b.datasetId)]=parsed;else state.project.document.blocks[state.project.document.blocks.findIndex(v=>v.id===b.id)]=parsed;});status();}catch(err){state.drafts.set(b.id,n.value);sequence++;clearTimeout(previewTimer);clearTimeout(saveTimer);state.render=null;state.measured=false;n.classList.add('invalid');status();error(err);}return;}
   changed(()=>{if(n.dataset.text)b.text=b.type==='code'&&b.text.includes('\r\n')?n.value.replaceAll('\r\n','\n').replaceAll('\n','\r\n'):n.value;if(n.dataset.list)b.items=n.value.split('\n');if(n.dataset.metric)b.value=n.value===''?null:Number(n.value);if(n.dataset.unit)b.unit=n.value;if(n.dataset.label)b.label=n.value;if(n.dataset.alt)b.alt=n.value;});
  });
  $('#resetDraft').onclick=()=>{state.drafts.clear();shell.notice('');drawEditor();schedulePreview();scheduleSave();message(t('visual.main.unappliedFieldsDiscardedValidContentRetained'));};
  for(const id of ['deckTitle','deckTitleSmall'])$('#'+id).addEventListener('input',e=>changed(()=>state.project.document.title=e.target.value));
  $('#explanationFields').addEventListener('change',e=>{const n=e.target;if(!n.dataset.explanation)return;if(!n.value.trim()){error(new Error(t('visual.main.anExplanationCannotBeEmpty')));drawInteractionFields();return;}changed(()=>{state.project.document.explanations.find(v=>v.id===n.dataset.explanation)[n.dataset.noteField]=n.value;},{fields:true});});
  // Look
  document.querySelector('[data-zone=look] .theme-options').addEventListener('click',async e=>{const b=e.target.closest('[data-theme]');if(!b||b.disabled||!state.project)return;const counter=state.counter;state.measured=false;state.render=null;status();try{const {project}=await json('/api/visual/theme',{project:state.project,sceneId:state.active,theme:b.dataset.theme});if(counter!==state.counter)throw new Error(t('visual.main.editsChangedWhileTheThemeWas'));changed(()=>state.project=project,{fields:true});}catch(err){error(err);drawEditor();schedulePreview();}});
  $('#largerType').onclick=()=>changed(()=>{const d=state.project.document;d.visualBrief??={audience:'',outputLanguage:d.locale,profile:profile()};d.visualBrief.profile.typographicContrast=profile().typographicContrast==='expressive'?'balanced':'expressive';},{fields:true});
  $('#motionSwitch').onclick=toggleMotion;
  $('#enableInteractions').onclick=()=>{try{if(state.drafts.size)throw Error(t('visual.main.repairUnappliedEditsFirst'));const next=addExplanatoryInteractions(state.project,state.active);changed(()=>{state.project=next;},{fields:true});}catch(e){error(e);}};
  $('#enableBlueprint').onclick=()=>{try{if(state.drafts.size)throw Error(t('visual.main.repairUnappliedEditsFirst'));const next=addBlueprintA(state.project,state.active);changed(()=>{state.project=next;},{fields:true});message(t('visual.main.thisPageIsNowExplainDiagram'));}catch(e){error(e);}};
  $('#staticState').onchange=e=>{try{const next=useStaticState(state.project,state.active,e.target.value||null);changed(()=>{state.project=next;},{fields:true});message(t('visual.main.staticStateAppliedSaveAndExport'));}catch(err){error(err);drawInteractionFields();}};
  $('#sceneMotion').onchange=e=>changed(()=>{if(e.target.value)scene().motion={...(scene().motion||{}),policy:e.target.value,durationMs:e.target.value==='off'?0:240};else delete scene().motion;},{fields:true});
  $('#useInteractionOpening').onclick=()=>{if(!state.measured||state.drafts.size||!state.render)return;openingRequest={id:crypto.randomUUID(),counter:state.counter,sceneId:state.active,renderHash:state.render.renderHash};$('#preview').contentWindow.postMessage({type:'deckweft:request-opening',...openingRequest},'*');};
  $('#rhythm').onclick=()=>selectComposition();
  $('#moveUp').onclick=()=>movePage(-1);$('#moveDown').onclick=()=>movePage(1);
  $('#candidateClose').onclick=()=>$('#candidateDialog').close();
  for(const b of document.querySelectorAll('[data-detail]'))b.onclick=()=>{state.detail=b.dataset.detail;drawLook();if(state.project)author.showDirections().catch(error);};
  // Image
  $('#assetFields').onchange=e=>{if(e.target.id==='slotImage'){selectedImage=e.target.value;drawAssetFields();}};
  $('#assetFields').onclick=async e=>{const id=e.target.id;if(id==='slotApply'){const slot=localSlot(),num=id=>$('#'+id).value===''?null:Number($('#'+id).value);slot.id=$('#slotName').value;slot.brief={role:$('#slotRole').value,requiredWidth:num('slotW'),requiredHeight:num('slotH'),focalPoint:{x:num('focalX'),y:num('focalY')},safeRegion:Object.fromEntries(['x','y','width','height'].map(k=>[k,num('safe-'+k)])),factual:$('#slotFactual').checked,sourceId:$('#slotSource').value,backend:'none'};slot.display=$('#slotDisplay').value;await mutateAsset('image-slot',{action:'configure',slot});}
   if(id==='downloadOriginal'){try{const r=await api('/api/visual/asset-original',{project:state.project,assetId:currentImage().assetId});const disposition=r.headers.get('Content-Disposition')||'',name=disposition.match(/filename="([^"]+)"/)?.[1]||'deckweft-original.png';download(await r.blob(),name);}catch(err){error(err);}}
   if(id==='slotInspect'){const counter=state.counter,active=state.active,b=currentImage();try{const [inspection,original]=await Promise.all([json('/api/visual/image-slot',{project:state.project,sceneId:active,blockId:b.id,action:'inspect'}),json('/api/visual/asset-inspection',{project:state.project,assetId:b.assetId})]);if(counter!==state.counter||active!==state.active||b.id!==currentImage()?.id)return;assetInspection=inspection;const image=new Image();image.src=original.native;await image.decode();if(counter!==state.counter||active!==state.active||b.id!==currentImage()?.id)return;const canvas=$('#subjectCanvas'),ctx=canvas.getContext('2d'),s=Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight),w=image.naturalWidth*s,h=image.naturalHeight*s,ox=(canvas.width-w)/2,oy=(canvas.height-h)/2;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,ox,oy,w,h);const safe=inspection.slot.brief.safeRegion,f=inspection.slot.brief.focalPoint;ctx.strokeStyle='#e7512f';ctx.lineWidth=4;ctx.strokeRect(ox+safe.x*w,oy+safe.y*h,safe.width*w,safe.height*h);ctx.beginPath();ctx.arc(ox+f.x*w,oy+f.y*h,7,0,Math.PI*2);ctx.stroke();canvas.hidden=false;const locked=imageLocked();$('#cropVariants').innerHTML=`<p>${x(t('visual.main.orangeProtectedSubjectCircleFocalPoint'))}</p>`+inspection.variants.map(v=>`<div class="crop-choice"><b>${x(t(({portrait:'visual.main.portrait34',square:'visual.main.square11',wide:'visual.main.wide169'})[v.id]))}</b><p>${x(v.ok?t('visual.main.protectedRegionFits'):v.code==='PROTECTED_REGION'?t('visual.main.protectedSubjectCannotFitChooseContain'):v.code==='ASSET_QUALITY'?t('visual.main.notEnoughVisibleSourcePixelsFor'):v.reason)}</p><button data-safe-aspect="${v.aspect}" ${!v.ok||locked?'disabled':''}>${x(t('visual.main.useSafeCrop'))}</button></div>`).join('')+`<button data-contain="true" ${locked?'disabled':''}>${x(t('visual.main.containCompleteImageIn169'))}</button>`;}catch(err){error(err);}}
   if(e.target.dataset.safeAspect)await mutateAsset('image-slot',{action:'crop',mode:'crop',aspect:Number(e.target.dataset.safeAspect)});
   if(e.target.dataset.contain)await mutateAsset('image-slot',{action:'crop',mode:'contain',aspect:16/9});
   if(id==='reuseApply')await mutateAsset('image-slot',{action:'reuse',assetId:$('#reuseAsset').value});
  };
  $('#cropFields').onchange=e=>{if(!e.target.dataset.crop)return;changed(()=>{const s=scene(),id=e.target.dataset.image;s.crops??=[];let c=s.crops.find(c=>c.blockId===id);if(!c){c={blockId:id,x:0,y:0,width:1,height:1};s.crops.push(c);}c[e.target.dataset.crop]=e.target.value===''?null:Number(e.target.value);});};
  $('#sourceImport').onclick=()=>dialogs.open($('#sourceDialog'));$('#sourceClose').onclick=()=>$('#sourceDialog').close();
  $('#sourceForm').onsubmit=async e=>{e.preventDefault();const counter=state.counter,active=state.active,blockId=currentImage()?.id;$('#sourceSubmit').disabled=true;try{const file=$('#sourceFile').files[0];if(!file||file.size>1300000)throw Error(t('visual.main.chooseASourceSmallerThan1'));const raw=new Uint8Array(await file.arrayBuffer()),mime=sourceMime(raw),original=(await json('/api/visual/asset-upload',{mime,base64:base64(raw)})).blob;const converted=await decodeLocalSource(file,original,$('#webEncoding').value);const upload=async(blob,mime)=>(await json('/api/visual/asset-upload',{mime,base64:base64(new Uint8Array(await blob.arrayBuffer()))})).blob;const native=original.mime==='image/png'?original:await upload(converted.native,'image/png'),web=converted.web?await upload(converted.web,converted.web.type):undefined,metadata={provenance:$('#sourceProvenance').value,license:$('#sourceLicense').value,allowedUse:$('#sourceUse').value,alt:$('#sourceAlt').value,fallback:$('#sourceFallback').value};const {asset}=await json('/api/visual/asset-import',{original,native,web,metadata,origin:$('#sourceOrigin').value});if(counter!==state.counter||active!==state.active||blockId!==currentImage()?.id)throw Error(t('visual.main.thePageChangedDuringImportOriginal'));if(await mutateAsset('image-slot',{action:'attach',asset}))$('#sourceDialog').close();}catch(err){error(err);}finally{$('#sourceSubmit').disabled=false;}};
  $('#sourceScan').onclick=async()=>{const counter=state.counter,active=state.active;try{const {entries}=await json('/api/visual/asset-catalog',{});if(counter!==state.counter||active!==state.active)return;sourceEntries=entries;$('#sourceCatalog').innerHTML=entries.length?`<label for="sourceChoice">${x(t('visual.main.savedSourceImage'))}</label><select id="sourceChoice">${entries.map((r,i)=>`<option value="${i}">${x(r.title+' · '+r.asset.alt+' · '+r.kind)}</option>`).join('')}</select><button id="extractSource" ${imageLocked()?'disabled':''}>${x(t('visual.main.extractAndAttachPreserveSource'))}</button>`:x(t('visual.main.noRegisteredSourceImagesInThis'));}catch(e){error(e);}};
  $('#sourceCatalog').onclick=async e=>{if(e.target.id!=='extractSource')return;const entry=sourceEntries[Number($('#sourceChoice').value)];if(entry)await mutateAsset('asset-extract',{kind:entry.kind,sourceProjectId:entry.projectId,assetId:entry.asset.id});};
  $('#imageAlternative').onclick=()=>mutateAsset('asset-alternative',{});
  $('#imageOpen').onclick=()=>dialogs.open($('#imageDialog'));$('#imageClose').onclick=()=>$('#imageDialog').close();
  $('#imageForm').onsubmit=async e=>{e.preventDefault();try{const file=$('#imageFile').files[0];if(!file||file.size>1300000)throw new Error(t('visual.main.chooseAPngSmallerThan1'));const bytes=new Uint8Array(await file.arrayBuffer());let str='';for(const b of bytes)str+=String.fromCharCode(b);const metadata={provenance:$('#imageProvenance').value,license:$('#imageLicense').value,allowedUse:$('#imageUse').value,alt:$('#imageAlt').value,fallback:$('#imageFallback').value};const {asset}=await json('/api/visual/assets',{base64:btoa(str),metadata});const prior=state.project.assets.find(a=>a.id===asset.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(asset))throw Error(t('visual.main.thisImageHashAlreadyHasDifferent'));changed(()=>{const p=state.project,s=scene();if(!p.assets.some(a=>a.id===asset.id))p.assets.push(asset);let image=p.document.blocks.find(b=>s.blockIds.includes(b.id)&&b.type==='image');if(image){image.assetId=asset.id;image.alt=metadata.alt;}else{image={id:'image_'+crypto.randomUUID().replaceAll('-','').slice(0,16),type:'image',sourceIds:[],assetId:asset.id,alt:metadata.alt,factual:false};p.document.blocks.push(image);s.blockIds.push(image.id);}},{fields:true});$('#imageDialog').close();}catch(err){error(err);}};
  // Drawer: language, library, examples, developer
  $('#outputLanguage').onchange=e=>changed(()=>{state.project.document.locale=e.target.value;const d=state.project.document;d.visualBrief??={audience:'',outputLanguage:d.locale,profile:profile()};d.visualBrief.outputLanguage=e.target.value;});
  $('#audience').oninput=e=>changed(()=>{const d=state.project.document;d.visualBrief??={audience:'',outputLanguage:d.locale,profile:profile()};d.visualBrief.audience=e.target.value;});
  $('#profileFields').onchange=e=>{if(e.target.dataset.profile)changed(()=>{const d=state.project.document;d.visualBrief??={audience:'',outputLanguage:d.locale,profile:profile()};d.visualBrief.profile[e.target.dataset.profile]=e.target.value;});};
  $('#projectPicker').onchange=async e=>{const value=e.target.value;if(value.startsWith('classic:')){if(!await leave()||!await openDeck('classic',value.slice(8)))e.target.value=state.project?.id||'';return;}const counter=state.counter;if(!await leave()){e.target.value=state.project.id;return;}try{state.measured=false;state.render=null;status();const result=await json('/api/visual/projects/'+value,undefined,'GET');if(counter!==state.counter){e.target.value=state.project.id;schedulePreview();throw new Error(t('visual.main.yourEditsChangedWhileOpeningAnother'));}activate(result.project);}catch(err){error(err);}};
  $('#demo').onclick=()=>open(async()=>(await json('/api/visual/demo',{locale:state.ui})).project);
  $('#compositionDemo').onclick=()=>open(async()=>(await json('/api/visual/composition-demo',{locale:state.ui})).project);
  for(const [id,route,first] of [['assetDemo','asset-demo','violet'],['componentDemo','component-demo','component-line'],['interactionDemo','interaction-demo','component-line']])$('#'+id).onclick=async()=>{if(await open(async()=>(await json('/api/visual/'+route,{locale:state.ui})).project))selectScene(first);};
  $('#projectFile').onchange=async e=>{try{if(!await leave())return;const file=e.target.files[0];if(!file)return;if(file.size>1900000)throw new Error(t('visual.main.useJsonSmallerThan19'));const project=JSON.parse(await file.text());if(project.format!=='deckweft-visual-project')throw new Error(t('visual.main.importAVisualProjectEnvelopeDraft'));await open(async()=>(await json('/api/visual/import',{project})).project);}catch(err){error(err);}finally{e.target.value='';}};
  $('#family').onchange=e=>{familyOverrides[state.active]=e.target.value;invalidateCandidates();notify();scheduleCompare();};
  $('#sourceJSON').oninput=e=>{try{const v=JSON.parse(e.target.value);if(!Array.isArray(v.sources)||!Array.isArray(v.sourceSnapshots)||Object.keys(v).some(k=>!['sources','sourceSnapshots'].includes(k)))throw new Error(t('visual.main.supplySourcesAndSourcesnapshotsArraysOnly'));state.drafts.delete('_sources');changed(()=>{state.project.document.sources=v.sources;state.project.document.sourceSnapshots=v.sourceSnapshots;});status();}catch(err){state.drafts.set('_sources',e.target.value);sequence++;clearTimeout(previewTimer);state.render=null;state.measured=false;status();error(err);}};
  $('#interactionJSON').oninput=e=>{try{const value=JSON.parse(e.target.value);if(!Array.isArray(value.interactions)||!Array.isArray(value.cues)||Object.keys(value).some(k=>!['interactions','cues','motion'].includes(k)))throw Error(t('visual.main.supplyInteractionsCuesAndOptionalMotion'));state.drafts.delete('_interactions');changed(()=>{const s=scene();s.interactions=value.interactions;s.cues=value.cues;if(value.motion)s.motion=value.motion;else delete s.motion;});status();}catch(err){state.drafts.set('_interactions',e.target.value);sequence++;clearTimeout(previewTimer);state.render=null;state.measured=false;status();error(err);}};
  $('#explanationJSON').oninput=e=>{try{const notes=JSON.parse(e.target.value),ids=new Set((scene().interactions||[]).flatMap(i=>[...(i.steps||[]).map(step=>step.explanationId),...(i.blueprint?[i.blueprint.wholeExplanationId]:[])]));if(!Array.isArray(notes)||notes.some(n=>!n||!ids.has(n.id))||new Set(notes.map(n=>n.id)).size!==notes.length)throw Error(t('visual.main.editUniquelyIdentifiedExplanationContentReferenced'));state.drafts.delete('_explanations');changed(()=>{const old=state.project.document.explanations||[],incoming=new Map(notes.map(n=>[n.id,n]));state.project.document.explanations=[...old.map(n=>ids.has(n.id)?incoming.get(n.id):n).filter(Boolean),...notes.filter(n=>!old.some(v=>v.id===n.id))];});status();}catch(err){state.drafts.set('_explanations',e.target.value);sequence++;clearTimeout(previewTimer);state.render=null;state.measured=false;status();error(err);}};
  // History: read-only snapshots; restore makes a separate copy.
  $('#openHistory').onclick=async()=>{if(!state.project)return;try{const r=await json('/api/visual/projects/'+state.project.id+'/history',undefined,'GET');$('#historyList').innerHTML=r.snapshots.length?r.snapshots.map(s=>`<button class="history-item" data-revision="${s.revision}" ${s.unreadable?'disabled':''}>${x(t('visual.history.item',{revision:s.revision,title:s.title,savedAt:s.savedAt}))}</button>`).join(''):x(t('visual.main.noEarlierVersionsEditAndSave'));const note=historyCapacityNote(r.usage);$('#historyCapacity').textContent=note;$('#historyCapacity').hidden=!note;$('#snapshot').hidden=$('#restore').hidden=true;state.snapshot=null;dialogs.open($('#historyDialog'),$('#openMore'));}catch(e){error(e);}};
  $('#historyClose').onclick=()=>$('#historyDialog').close();
  $('#historyList').onclick=async e=>{const b=e.target.closest('[data-revision]');if(!b)return;try{state.snapshot=await json('/api/visual/projects/'+state.project.id+'/history/'+b.dataset.revision,undefined,'GET');$('#snapshot').value=JSON.stringify(state.snapshot.project,null,2);$('#snapshot').hidden=$('#restore').hidden=false;}catch(err){error(err);}};
  $('#restore').onclick=async()=>{if(!state.snapshot)return;if(await open(async()=>(await json('/api/visual/projects/'+state.project.id+'/history/'+state.snapshot.project.revision.number+'/restore',{mode:'copy',snapshotHash:state.snapshot.sha256,requestId:crypto.randomUUID().replaceAll('-','')})).project))$('#historyDialog').close();};
  // Keyboard: ⌘/Ctrl S saves (and offers the copy after a conflict), ⌘/Ctrl Z undoes outside text fields; arrows walk the strip.
  addEventListener('keydown',e=>{
    if(!live())return;
    if(e.target.closest?.('#slideList')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)&&state.project){const scenes=state.project.plan.scenes,i=scenes.findIndex(s=>s.id===state.active),next=e.key==='Home'?0:e.key==='End'?scenes.length-1:Math.max(0,Math.min(scenes.length-1,i+(e.key==='ArrowRight'?1:-1)));e.preventDefault();selectScene(scenes[next].id,{focus:true});return;}
    const action=keyboardAction(e,{editing:!!e.target.closest?.('input,textarea,select,[contenteditable="true"]'),modal:!!document.querySelector('dialog[open]')});
    if(!action||!state.project)return;if(action==='save'){e.preventDefault();save();}else if(action==='undo'){e.preventDefault();moveHistory();}else if(action==='redo'){e.preventDefault();moveHistory(true);}
  });
  addEventListener('beforeunload',e=>{if(live()&&(state.dirty||state.drafts.size)){e.preventDefault();e.returnValue='';}});
  // A finished draft opens on the stage: the drawer steps aside, as the old Create panel did.
  document.addEventListener('deckweft:work-ready',()=>{if(live()&&$('#moreDialog').open)$('#moreDialog').close();});
  workbench=mountWorkbench({state,json,api,activate,libraries,save,leave,download,error,setEvidence:evidence=>{if(JSON.stringify(state.taskEvidence)===JSON.stringify(evidence))return;state.taskEvidence=evidence;drawScenes();drawEditor();}});
  // A plan's project carries the revision it was planned on; the editor keeps its current revision so the next save does not conflict.
  author=mountAuthor({state,json,api,apply:project=>changed(()=>{const revision=state.project.revision;state.project=project;state.project.revision=revision;},{fields:true}),download,error,message,x,workbench,save,dialogs,pageKept,sceneLock,status});
}
let openingRequest=null;
addEventListener('message',e=>{
 const r=openingRequest;if(!r||e.source!==$('#preview')?.contentWindow||e.data?.type!=='deckweft:opening'||e.data.id!==r.id)return;
 openingRequest=null;if(state.counter!==r.counter||state.active!==r.sceneId||state.render?.renderHash!==r.renderHash||e.data.renderHash!==r.renderHash||e.data.sceneId!==r.sceneId)return;
 const at=e.data.position,fixed=at===e.data.staticPosition;if(Number.isSafeInteger(at)&&at!==0&&e.data.exploring===false){error(new Error(t('visual.main.cuePositionNotExplored',{at,state:fixed?t('visual.main.staticStateNote'):''})));return;}
 try{const next=useInteractionOpening(state.project,r.sceneId,e.data.state,{position:e.data.position,exploring:e.data.exploring,staticPosition:e.data.staticPosition});changed(()=>{state.project=next;},{fields:true});message(t('visual.main.openingViewAppliedSaveAndExport'));}catch(err){error(err);}
});

/** @type {import('../shell.js').Adapter & {open:()=>Promise<void>}} */
// The dialogs only this kind uses (larger layout, earlier versions, image import, local PNG). The loader puts them beside
// <main id="root"> before this kind is mounted, and takes them out again when the classic kind is on the page.
export const dialogMarkup=/*html*/`
<dialog id="candidateDialog"><div class="dialog-head"><h2 id="candidateTitle"></h2><button id="candidateClose" data-i18n-attr="aria-label:shell.close" aria-label="Close">×</button></div><div class="candidate-window"><iframe id="largeCandidate" data-i18n-attr="title:visual.candidateLarge" title="Layout, larger" sandbox="allow-scripts"></iframe></div></dialog>
<dialog id="historyDialog"><div class="dialog-head"><h2 data-i18n="visual.historyDialog.1">Earlier versions</h2><button id="historyClose" data-i18n-attr="aria-label:shell.close" aria-label="Close">×</button></div><p data-i18n="visual.historyDialog.2">Inspect a read-only snapshot. Restore creates a separate copy.</p><p id="historyCapacity" class="history-capacity" role="status" hidden></p><div id="historyList"></div><textarea id="snapshot" readonly data-i18n-attr="aria-label:visual.historySnapshot" aria-label="Earlier version, read only" hidden></textarea><button id="restore" hidden data-i18n="visual.restore">Restore as a new copy</button></dialog>
<dialog id="sourceDialog"><form id="sourceForm"><div class="dialog-head"><h2 data-i18n="visual.sourceForm.1">Import an original image</h2><button id="sourceClose" type="button" data-i18n-attr="aria-label:shell.close" aria-label="Close">×</button></div><p data-i18n="visual.sourceForm.2">Original bytes stay local and unchanged. Browser conversion retains full dimensions. Each source/encoded file must be ≤1.3 MB.</p><label for="sourceFile">PNG / JPEG / WebP</label><input id="sourceFile" type="file" accept="image/png,image/jpeg,image/webp" required><label for="sourceOrigin" data-i18n="visual.sourceForm.3">Declared origin</label><select id="sourceOrigin"><option value="unknown" data-i18n="visual.sourceOrigin.1">Unclassified — cannot serve as factual evidence</option><option value="original" data-i18n="visual.sourceOrigin.2">Original photo / product screenshot</option><option value="generated" data-i18n="visual.sourceOrigin.3">Generated concept — decorative only</option></select><label for="webEncoding" data-i18n="visual.sourceForm.4">Optional local web derivative</label><select id="webEncoding"><option value="none" data-i18n="visual.webEncoding.1">PNG, original quality</option><option value="image/webp" data-i18n="visual.webEncoding.2">WebP, smaller file</option><option value="image/jpeg" data-i18n="visual.webEncoding.3">JPEG, smaller file</option></select><p class="hint" data-i18n="visual.sourceForm.5">Factual images and product screenshot slots use the native PNG. No automatic provider or remote fetch.</p><label for="sourceAlt" data-i18n="visual.sourceForm.6">Alternative text</label><input id="sourceAlt" required maxlength="1000"><label for="sourceProvenance" data-i18n="visual.sourceForm.7">Source / provenance</label><input id="sourceProvenance" required maxlength="2000"><label for="sourceLicense" data-i18n="visual.sourceForm.8">License</label><input id="sourceLicense" required maxlength="500"><label for="sourceUse" data-i18n="visual.sourceForm.9">Allowed use</label><input id="sourceUse" required maxlength="500"><label for="sourceFallback" data-i18n="visual.sourceForm.10">Fallback description</label><input id="sourceFallback" required maxlength="1000"><button id="sourceSubmit" type="submit" data-i18n="visual.sourceSubmit">Preserve and attach to this slot</button></form></dialog>
<dialog id="imageDialog"><form id="imageForm"><div class="dialog-head"><h2 data-i18n="visual.imageForm.1">Local image</h2><button id="imageClose" type="button" data-i18n-attr="aria-label:shell.close" aria-label="Close">×</button></div><label for="imageFile">PNG · ≤ 1.3 MB</label><input id="imageFile" type="file" accept="image/png" required><label for="imageAlt" data-i18n="visual.imageForm.2">Alternative text</label><input id="imageAlt" required maxlength="1000"><label for="imageProvenance" data-i18n="visual.imageForm.3">Provenance</label><input id="imageProvenance" required maxlength="2000"><label for="imageLicense" data-i18n="visual.imageForm.4">License</label><input id="imageLicense" required maxlength="500"><label for="imageUse" data-i18n="visual.imageForm.5">Allowed use</label><input id="imageUse" required maxlength="500"><label for="imageFallback" data-i18n="visual.imageForm.6">Text fallback</label><input id="imageFallback" required maxlength="1000"><button type="submit" data-i18n="visual.imageForm.7">Attach to this scene</button></form></dialog>
`;

export const visualAdapter={
  fields:()=>fields,look:()=>look,parts,candidates,thumbnails,save:()=>save(),exports,onChange:fn=>{changeListeners.push(fn);},
  undo:()=>moveHistory(),redo:()=>moveHistory(true),firstRun,example,mount,
  select:id=>selectScene(id),reorder,choose:id=>selectComposition(Number(id)),inspect,
  pageMenu:id=>author?.pageMenu(id)||[],
  editable:()=>!!state.project&&!state.saving&&!state.drafts.size,setToken:token=>{state.token=token;},
  // The local workbench needs no host: arranging, revising and syncing always work; Codex stays an opt-in inside it.
  assistant:async()=>true,
  locale:()=>state.ui,
  localize:locale=>{state.ui=locale;try{localStorage.setItem('deckweft.visual.ui',locale);}catch{}if(state.project)draw();workbench?.mode();author?.localize();},
  exportOpened:()=>author?.exportOpened(),dropFile,
  // Opens `id` (the loader's choice), else ?project=<id>, else the newest readable deck, else the first-run form.
  async open(requested){
    try{status();state.token=(await(await fetch('/api/session')).json()).token;sessionReady();const projects=await libraries(),id=requested||query.get('project')||projects.find(p=>!p.unreadable)?.id;if(id)activate((await json('/api/visual/projects/'+id,undefined,'GET')).project);else{state.firstRun=true;shell.showFirstRun();status();}}
    catch(e){error(e);}
  }
};
