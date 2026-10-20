// The workbench shell (single entry, step 0): one copy of the top band, the page strip, the first-run form, the
// Words / Look zones, the More drawer and the state square. A deck kind plugs in through the adapter below.
// Like session.js and history-capacity.js it is shared code: it never reads schemaVersion and never calls fetch;
// everything that touches a deck, the network or the store goes through the adapter.
import {DialogManager} from './interaction.js';
import {sessionRecovery,askSaveCopy} from './session.js';
import {historyCapacityNote} from './history-capacity.js';
import {t,applyLanguage} from './i18n.js';

/**
 * The adapter interface. `scene` is the id of the active page, the thumbnail marked `active`.
 * @typedef {{id:string,svg:string,eligible:boolean,reason?:string,label?:string,selected?:boolean,explanation?:string,disabled?:boolean}} Candidate
 * @typedef {{id:string,svg:string,title:string,mark?:string,active?:boolean}} Thumbnail
 * @typedef {object} Adapter
 * @property {(scene?:string)=>string} fields  Markup for the Words zone, inserted once on mount; the kind keeps the values current.
 * @property {(scene?:string)=>string} look  Markup for the Look zone, same rule.
 * @property {(scene?:string)=>Candidate[]} candidates  Layout choices for the page; `reason` says why one cannot fit.
 * @property {()=>Thumbnail[]} thumbnails  One per page, in order; `mark` is an optional small label on the thumbnail.
 * @property {()=>Promise<boolean>} save  Resolves true once nothing is left unsaved.
 * @property {()=>Record<string,(()=>unknown)|null>} exports  {html, pptx, pdf, json, …}: one function per format the kind
 *   offers, null while that format is unavailable. `[data-export]` buttons run them; a missing key is never offered.
 * @property {(fn:()=>void)=>void} onChange  The kind calls fn after it redraws the canvas; the shell then redraws the
 *   page strip and the choices.
 * @property {()=>void} undo
 * @property {()=>void} redo
 * @property {(text:string)=>Promise<string>} firstRun  Starts a deck from the pasted text (CRLF normalized, trimmed).
 *   Resolves to an error message to show under the box, or '' once a deck is open.
 *
 * Also needed by the strip, the first run, the zones and the drawer:
 * @property {(shell:Shell)=>void} mount  Wires the kind's own controls; called once the markup exists.
 * @property {(id:string)=>void} select  Open page `id`.
 * @property {(id:string,index:number)=>void} reorder  Move page `id` so it lands before the page now at `index`.
 * @property {()=>void} add  The + at the end of the strip.
 * @property {(id:string)=>void} choose  A choice card was pressed.
 * @property {()=>boolean} editable  False while the kind cannot take an edit (no deck, busy, IME composition).
 * @property {()=>Promise<string>} example  "See an example first"; resolves like firstRun.
 * @property {(field:string,svg:SVGSVGElement)=>({name:string,nodes:SVGGraphicsElement[]}|null)} blocks  The canvas
 *   nodes drawn by the Words field `field`; null when the field draws nothing (the whole slide is outlined instead).
 * @property {(token:string)=>void} setToken  Receives the new session token after a reconnect.
 * @property {()=>Promise<boolean>} [assistant]  Whether a host agent is connected; the drawer hides that section otherwise.
 * @property {(locale:string)=>void} [localize]  Called after the shell has switched its own words, before `deckweft:locale`.
 * @property {()=>boolean} [languageLocked]  True while the interface language must not change.
 *
 * @typedef {object} Shell
 * @property {DialogManager} dialogs
 * @property {(key:string,params?:Record<string,unknown>)=>string} t  The shared dictionary (i18n.js), in the current language.
 * @property {string} locale
 * @property {(message:string)=>void} toast
 * @property {(message:string,tone?:string)=>void} notice  The banner above the stage; '' hides it.
 * @property {(square:{state:'saved'|'unsaved'|'saving'|'attention',label:string,undo:boolean,redo:boolean,save:boolean})=>void} status
 * @property {()=>void} showFirstRun
 * @property {()=>void} closeFirstRun  The first page replaces the form for good.
 * @property {(()=>Promise<void>)&{offerAgain:()=>void}} reconnect  session.js: ask once, then store the new token.
 * @property {()=>Promise<boolean>} askSaveCopy  session.js: after a revision conflict, keep the draft as a separate copy?
 * @property {(usage:unknown)=>void} capacity  history-capacity.js: the cleanup note from 80% of the suggested size.
 */


// The band and the page's other landmarks sit around <main id="root">, which becomes the workspace.
const band=/*html*/`
<a class="skip" href="#slideTitle">Skip to slide content</a>
<header class="topbar">
  <a class="brand" href="/" aria-label="DeckWeft home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>DeckWeft<small data-i18n="classic.brandNote">Ideas, beautifully arranged.</small></span></a>
  <!-- Design guide §9: brand, Undo, title, state square, Take away. Hold Undo 500 ms to show Redo. Save, Present and the language switch stay hidden until the drawer (M5); their ids remain. -->
  <div class="history-actions"><button id="undo" data-i18n-attr="aria-label:classic.app.undo" title="Undo (⌘/Ctrl Z)" aria-label="Undo"><svg class="line-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 5 4 9l4 4M4 9h12v10H9"/></svg></button><button id="redo" data-i18n-attr="aria-label:classic.app.redo" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo" hidden><svg class="line-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m16 5 4 4-4 4m4-4H8v10h7"/></svg></button></div>
  <div class="deck-heading"><input id="deckTitle" data-i18n-attr="aria-label:classic.app.deckTitle" aria-label="Deck title" maxlength="200"></div>
  <span id="saveState" class="state-square" role="status" data-state="saving" title="Opening local library…"><span class="sr-only">Opening local library…</span></span>
  <nav class="top-actions" aria-label="Deck actions"><button id="save" data-i18n="classic.save" hidden>Save</button><button id="openMore" data-i18n-attr="aria-label:classic.app.more" aria-haspopup="dialog" aria-controls="moreDialog" aria-label="More" title="More"><svg class="line-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><button class="take" id="openExport" data-i18n="classic.export">Take away</button></nav>
</header>
`;
const workspaceMarkup=/*html*/`
  <!-- M2: the outline panel stays in the DOM but hidden; its slide list and Add moved to the page strip. The rest moves to the drawer in M5. -->
  <aside class="story-panel" aria-label="Slide outline" hidden>
    <div class="panel-header"><span class="eyebrow" data-i18n="classic.story">YOUR STORY</span></div>
    <div class="mobile-title"><label for="deckTitleSmall" data-i18n="classic.localTitle">Deck title</label><input id="deckTitleSmall" maxlength="200"></div>
    <p class="privacy-note" hidden><span class="status-dot"></span><span data-i18n="classic.privacy">On your computer. No hidden uploads.</span></p>
  </aside>
  <section class="canvas-column" aria-label="Slide workspace">
    <nav class="page-strip" aria-label="Pages"><div class="slide-list" id="slideList"></div><button id="addSlide" data-i18n-attr="aria-label:classic.app.addASlide" aria-label="Add a slide">+</button></nav>
    <div class="canvas-toolbar"><div><span class="eyebrow" data-i18n="classic.workbench">WORKBENCH</span><span id="pageCount" class="muted"></span></div><div class="toolbar-actions"><button id="toggleStory" aria-expanded="false" aria-controls="drawerDialog" class="compact-only" data-i18n="classic.slides" hidden>Slides</button><label class="sr-only" for="ratio">Slide aspect ratio</label><select id="ratio" data-i18n-attr="aria-label:classic.app.slideAspectRatio"><option>16:9</option><option>4:3</option><option>1:1</option><option>9:16</option></select><button id="toggleInspector" aria-expanded="false" aria-controls="drawerDialog" class="compact-only" data-i18n="classic.edit">Edit</button><button id="exitPresent" data-i18n="classic.exit">Exit presentation</button></div></div>
    <div id="issueBanner" class="issue-banner" role="alert" hidden></div><div class="stage" id="stage"><form id="firstRun" class="first-run-form" hidden><label class="sr-only" for="firstRunText" data-i18n="classic.firstRunLabel">What you want to say</label><textarea id="firstRunText" data-i18n-attr="placeholder:classic.app.pasteWhatYouWantToSay" maxlength="100000" required placeholder="Paste what you want to say here. Leave a blank line between pages."></textarea><p id="firstRunError" class="first-run-error" role="alert"></p><div class="first-run-actions"><button type="submit" data-i18n="classic.firstRunArrange">Arrange</button><button type="button" class="link-button" data-example data-i18n="classic.seeExample">See an example first</button></div></form><div id="canvas" class="slide-canvas" aria-live="off"><p>Opening your deck…</p></div></div>
    <div class="canvas-caption"><span id="layoutCaption" hidden></span><span id="fitStatus" hidden class="fit-status"></span></div>
    <section class="directions" aria-label="Layouts"><div class="directions-heading"><div class="direction-actions"><button id="autoLayout" class="small" data-i18n="classic.auto">Choose for me</button></div></div><div class="candidate-grid" id="candidates"></div></section>
  </section>
  <aside class="inspector" aria-label="Slide inspector">
    <!-- M3: two zones, Words and Look, replace the three tabs. The old tabs, panels and advanced controls keep their ids, hidden until later modules. -->
    <div class="inspector-tabs" role="tablist" aria-label="Inspector" hidden><button role="tab" id="tab-content" tabindex="0" aria-selected="true" aria-controls="contentPanel" data-tab="content" data-i18n="classic.content">Content</button><button role="tab" id="tab-design" tabindex="-1" aria-selected="false" aria-controls="designPanel" data-tab="design" data-i18n="classic.design">Design</button><button role="tab" id="tab-sources" tabindex="-1" aria-selected="false" aria-controls="sourcesPanel" data-tab="sources" data-i18n="classic.sources">Sources</button></div>
    <div class="inspector-scroll"><div id="fieldErrors" role="alert" class="field-errors" hidden></div>
      <section class="zone" data-zone="words" aria-labelledby="zoneWordsLabel"><h2 class="zone-label" id="zoneWordsLabel"><i class="zone-square" aria-hidden="true"></i><span data-i18n="classic.zoneWords">Words</span></h2>
      </section>
      <section class="zone" data-zone="look" aria-labelledby="zoneLookLabel"><h2 class="zone-label" id="zoneLookLabel"><i class="zone-square" aria-hidden="true"></i><span data-i18n="classic.zoneLook">Look</span></h2>
      </section>
      <div class="slide-actions"><button id="duplicate" data-i18n="classic.duplicate">Duplicate</button><button id="moveUp" data-i18n-attr="aria-label:classic.app.moveSlideUp" aria-label="Move slide up">↑</button><button id="moveDown" data-i18n-attr="aria-label:classic.app.moveSlideDown" aria-label="Move slide down">↓</button><button id="deleteSlide" class="danger" data-i18n="classic.delete">Delete</button></div>
      <section class="quality-panel" hidden><div class="quality-header"><h2 data-i18n="classic.preflight">Before you export</h2><span id="qualityCount"></span></div><div id="qualityIssues"></div><p class="hint" id="measurementNote"></p><p class="hint" data-i18n="classic.qualityNote">Other apps may swap fonts. Check the file before presenting.</p></section>
    </div>
  </aside>
`;
const after=/*html*/`
<footer class="statusbar"><span data-i18n="classic.footer">DeckWeft</span><span hidden>Early preview</span></footer>
<dialog id="moreDialog" class="more-drawer" aria-labelledby="moreIntro">
  <div class="more-head"><p id="moreIntro" data-i18n="classic.moreIntro">Most people never need to open this.</p><button data-close="moreDialog" data-i18n="classic.close" aria-label="Close">Close</button></div>
  <div id="moreTop" class="more-top"></div>
  <section class="more-section"><h3 data-i18n="classic.moreVersions">Earlier versions</h3><button id="openHistory" data-i18n="classic.history" data-icon="history" aria-label="Version history" title="Version history">Version history</button></section>
  <section class="more-section" id="moreAgent" hidden><h3 data-i18n="classic.moreAgent">Let the assistant write for me</h3><button id="openAgent" data-icon="sparkles" data-i18n="classic.agentHelp" aria-label="Let the assistant write for me" title="Let the assistant write for me">Let the assistant write for me</button></section>
  <section class="more-section"><h3 data-i18n="classic.morePresenting">Presenting</h3><button id="present" data-i18n="classic.present">Present</button><button id="openRehearsal" data-i18n="classic.rehearse" data-icon="timer" aria-label="Rehearse and time the deck" title="Rehearse and time the deck">Rehearse</button></section>
  <section class="more-section"><h3 data-i18n="classic.moreLanguage">Language</h3><button id="uiLanguage" data-i18n="classic.uiLanguageName" data-i18n-attr="aria-label:classic.app.switchInterfaceLanguage" aria-label="Switch interface language">中文</button><label for="contentLocale" data-i18n="classic.contentLocale">Deck language / font preference</label><select id="contentLocale"><option value="en">English</option><option value="zh-CN">简体中文</option></select><p class="hint" data-i18n="classic.localeNote">This does not translate existing words.</p></section>
  <section class="more-section"><h3 data-i18n="classic.moreBackup">Backup and restore</h3><label for="projectPicker">Local library</label><select id="projectPicker" data-i18n-attr="aria-label:classic.app.localLibrary" class="project-picker"></select><button id="newDeck" data-i18n="classic.new">New deck</button><button id="importButton" data-i18n="classic.import" data-icon="upload" aria-label="Import a deck" title="Import a deck">Import a deck</button><input type="file" id="fileInput" accept=".json,.md,.txt" hidden><button data-export="json" class="more-json"><b>Project JSON</b><small data-i18n="classic.backup">Keep a complete backup</small></button></section>
  <section class="more-section"><h3 data-i18n="classic.moreDeveloper">For developers</h3><button id="openSettings" data-i18n="classic.settings" title="Appearance and accessibility">Settings</button><button id="openStoryboard" data-i18n="classic.planStory" data-icon="workflow" aria-label="Plan narrative and visuals" title="Plan narrative and visuals">Plan story</button><a class="visual-studio-link" href="/visual" data-i18n="classic.app.visualStudioPromptWorkbench">Visual Studio · Prompt workbench</a></section>
</dialog>
`;

const x=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** @param {Adapter} adapter @param {HTMLElement} root @returns {Shell} */
export function mountShell(adapter,root){
  const $=selector=>document.querySelector(selector);
  root.className='workspace';root.innerHTML=workspaceMarkup;root.insertAdjacentHTML('beforebegin',band);root.insertAdjacentHTML('afterend',after);
  $('[data-zone=words]').insertAdjacentHTML('beforeend',adapter.fields());$('[data-zone=look]').insertAdjacentHTML('beforeend',adapter.look());
  let locale='en',toastTimer;
  const dialogs=new DialogManager(document),more=$('#moreDialog');
  function toast(message){clearTimeout(toastTimer);$('#toastRegion').textContent=message;$('#toastRegion').classList.add('visible');toastTimer=setTimeout(()=>{$('#toastRegion').textContent='';$('#toastRegion').classList.remove('visible');},6500);}
  function notice(message,tone){$('#issueBanner').hidden=!message;$('#issueBanner').textContent=message||'';$('#issueBanner').classList.toggle('warning',tone==='warning');}

  // The state square: saving, attention (a save failed, a conflict, an invalid field or a layout problem), unsaved, saved.
  function status({state,label,undo,redo,save}){
    const square=$('#saveState'),spoken=square.querySelector('.sr-only');square.dataset.state=state;square.title=label;if(spoken.textContent!==label)spoken.textContent=label;
    $('#save').disabled=!save;$('#undo').disabled=!undo;$('#redo').disabled=!redo;syncRedo();
  }
  // Hold Undo for 500 ms to show Redo; Redo hides 1 s after release while the pointer and focus are elsewhere.
  // When nothing is left to undo but something can be redone, Redo stays out so a mouse can still reach it.
  const redoHold={timer:0,hide:0,held:false,swallow(event){const held=this.held&&event.detail>0;this.held=false;return held;}};
  function hideRedoSoon(){clearTimeout(redoHold.hide);redoHold.hide=setTimeout(()=>{redoHold.hide=0;if($('#redo').matches(':hover,:focus-visible')||($('#undo').disabled&&!$('#redo').disabled))return hideRedoSoon();$('#redo').hidden=true;},1000);}
  function syncRedo(){if($('#undo').disabled&&!$('#redo').disabled){clearTimeout(redoHold.hide);redoHold.hide=0;$('#redo').hidden=false;}else if(!$('#redo').hidden&&!redoHold.hide&&!redoHold.timer)hideRedoSoon();}
  $('#save').onclick=()=>adapter.save();$('#undo').onclick=event=>{if(redoHold.swallow(event))return;adapter.undo();};$('#redo').onclick=()=>adapter.redo();
  $('#undo').addEventListener('pointerdown',event=>{if(event.button!==0)return;redoHold.held=false;clearTimeout(redoHold.timer);redoHold.timer=setTimeout(()=>{redoHold.timer=0;redoHold.held=true;clearTimeout(redoHold.hide);redoHold.hide=0;$('#redo').hidden=false;},500);});
  for(const type of ['pointerup','pointercancel','pointerleave'])$('#undo').addEventListener(type,event=>{clearTimeout(redoHold.timer);redoHold.timer=0;if(type==='pointercancel'||(type==='pointerleave'&&event.buttons))redoHold.held=false;if(!$('#redo').hidden)hideRedoSoon();});
  $('#undo').addEventListener('contextmenu',event=>event.preventDefault());
  for(const type of ['pointerleave','focusout'])$('#redo').addEventListener(type,hideRedoSoon);

  // Phone top band keeps brand, state square, More and Take away: the title and Undo move to the top of the More drawer (moved, never copied).
  const phone=matchMedia('(max-width:680px)');
  const topSlots=['undo','redo','deckTitle'].map(id=>{const el=$('#'+id),marker=document.createComment('top-'+id);el.before(marker);return {el,marker};});
  function placeTopControls(){for(const {el,marker} of topSlots){if(phone.matches)$('#moreTop').append(el);else marker.after(el);}}
  phone.addEventListener('change',placeTopControls);placeTopControls();

  // Page strip and choices, redrawn whenever the kind reports a change. Focus stays on the same page or choice.
  function restoreDynamicFocus(previous){
    if(!previous||previous.isConnected)return;
    for(const key of ['slide','layout']){const value=previous.dataset?.[key];if(value){const target=[...document.querySelectorAll(`[data-${key}]`)].find(b=>b.dataset[key]===value);if(target&&!target.disabled)target.focus({preventScroll:true});}}
  }
  function refresh(){
    const focused=document.activeElement,pages=adapter.thumbnails(),scene=pages.find(p=>p.active)?.id;
    $('#slideList').innerHTML=pages.map((p,i)=>`<button class="thumbnail ${p.active?'active':''}" draggable="true" data-slide="${x(p.id)}" aria-label="${x(t('classic.shell.slide')+' '+(i+1)+': '+p.title)}" aria-current="${p.active?'true':'false'}"><span aria-hidden="true">${p.svg||'<div class="placeholder">…</div>'}</span><span class="thumbnail-meta"><span>${String(i+1).padStart(2,'0')}</span><span>${x(p.title)}</span></span>${p.mark?`<span class="thumbnail-mark">${x(p.mark)}</span>`:''}</button>`).join('');
    $('#candidates').innerHTML=adapter.candidates(scene).map((c,i)=>`<button class="candidate ${c.selected?'selected':''}${c.eligible?'':' unfit'}" data-layout="${x(c.id)}" aria-label="${x(c.label??c.id)}" aria-pressed="${!!c.selected}" title="${x(c.explanation)}"${c.disabled?' disabled':''}>${c.eligible?'':`<span class="unfit-reason">${x(c.reason)}</span>`}<span aria-hidden="true">${c.svg}</span><span class="candidate-label"><span>${i+1} · ${x(c.label??c.id)}</span></span></button>`).join('');
    restoreDynamicFocus(focused);markZone();
  }
  $('#slideList').addEventListener('click',event=>{const button=event.target.closest('button[data-slide]');if(button&&!button.disabled)adapter.select(button.dataset.slide);});
  $('#candidates').addEventListener('click',event=>{const button=event.target.closest('button[data-layout]');if(button&&!button.disabled)adapter.choose(button.dataset.layout);});
  $('#addSlide').onclick=()=>adapter.add();
  // Drag a thumbnail to reorder. A 2 px line marks where it lands; the kind applies the move, so undo and autosave follow.
  // The insert point is before the first thumbnail whose middle lies right of the pointer.
  const dropLine=Object.assign(document.createElement('div'),{className:'drop-line',hidden:true});let dragId=null;
  function dropIndex(event){const thumbs=[...$('#slideList').querySelectorAll('.thumbnail')];const i=thumbs.findIndex(b=>{const r=b.getBoundingClientRect();return event.clientX<r.left+r.width/2;});return i<0?thumbs.length:i;}
  function showDropLine(index){const list=$('#slideList'),thumbs=[...list.querySelectorAll('.thumbnail')],gap=parseFloat(getComputedStyle(list).columnGap)||0,edge=index<thumbs.length?thumbs[index].offsetLeft-gap/2:thumbs.at(-1).offsetLeft+thumbs.at(-1).offsetWidth+gap/2;if(!dropLine.isConnected)list.append(dropLine);dropLine.style.left=`${edge-1}px`;dropLine.hidden=false;}
  function endDrag(){dragId=null;dropLine.hidden=true;$('#slideList').querySelector('.dragging')?.classList.remove('dragging');}
  $('#slideList').addEventListener('dragstart',event=>{const thumb=event.target.closest?.('.thumbnail');if(!thumb||!adapter.editable()){event.preventDefault();return;}dragId=thumb.dataset.slide;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragId);thumb.classList.add('dragging');});
  $('#slideList').addEventListener('dragover',event=>{if(!dragId)return;event.preventDefault();event.dataTransfer.dropEffect='move';showDropLine(dropIndex(event));});
  $('#slideList').addEventListener('dragleave',event=>{if(!$('#slideList').contains(event.relatedTarget))dropLine.hidden=true;});
  $('#slideList').addEventListener('drop',event=>{if(!dragId)return;event.preventDefault();const id=dragId,index=dropIndex(event);endDrag();adapter.reorder(id,index);});
  $('#slideList').addEventListener('dragend',endDrag);

  // Colour matching: focus in Words frames the matching block on the canvas in yellow, or outlines the whole slide when
  // that field draws nothing; focus in Look outlines the slide in blue.
  let zoneFocus=null;
  function markZone(){
    const canvas=$('#canvas'),svg=canvas.querySelector('svg');
    canvas.classList.toggle('zone-words',zoneFocus?.zone==='words');canvas.classList.toggle('zone-look',zoneFocus?.zone==='look');
    svg?.querySelector('.zone-block-frame')?.remove();delete canvas.dataset.block;
    const block=svg&&zoneFocus?.zone==='words'?adapter.blocks(zoneFocus.field,svg):null;if(!block)return;
    const boxes=block.nodes.map(n=>n.getBBox()).filter(b=>b.width&&b.height);
    if(!boxes.length)return;
    const pad=12,left=Math.min(...boxes.map(b=>b.x))-pad,top=Math.min(...boxes.map(b=>b.y))-pad,right=Math.max(...boxes.map(b=>b.x+b.width))+pad,bottom=Math.max(...boxes.map(b=>b.y+b.height))+pad;
    const frame=document.createElementNS('http://www.w3.org/2000/svg','rect');
    for(const [name,value]of Object.entries({class:'zone-block-frame',x:left,y:top,width:right-left,height:bottom-top,'vector-effect':'non-scaling-stroke','aria-hidden':'true'}))frame.setAttribute(name,String(value));
    svg.append(frame);canvas.dataset.block=block.name;
  }
  $('.inspector').addEventListener('focusin',event=>{const zone=event.target.closest('[data-zone]');zoneFocus=zone?{zone:zone.dataset.zone,field:event.target.id}:null;markZone();});
  $('.inspector').addEventListener('focusout',()=>{zoneFocus=null;markZone();});
  $('#toggleStory').onclick=()=>dialogs.openDrawer('story');$('#toggleInspector').onclick=()=>dialogs.openDrawer('inspector');
  window.addEventListener('resize',()=>dialogs.resize(innerWidth));

  // First run (design guide §10): an empty library shows one paste box on the stage instead of an empty workbench.
  function showFirstRun(){document.body.classList.add('first-run');$('#canvas').hidden=true;$('#firstRun').hidden=false;$('#firstRunText').focus();}
  function closeFirstRun(){$('#firstRun')?.remove();$('#canvas').hidden=false;document.body.classList.remove('first-run');}
  const firstRunError=message=>{if(message&&$('#firstRun'))$('#firstRunError').textContent=message;};
  $('#firstRun').onsubmit=async event=>{
    event.preventDefault();const text=$('#firstRunText').value.replace(/\r\n?/g,'\n').trim();if(!text)return;
    $('#firstRunError').textContent='';const button=$('#firstRun [type=submit]');button.disabled=true;
    let message='';try{message=await adapter.firstRun(text);}finally{button.disabled=false;}
    firstRunError(message);
  };
  $('#firstRun [data-example]').onclick=async()=>firstRunError(await adapter.example());

  // The More drawer. The assistant section only appears once a host agent is connected; checked each time the drawer opens.
  async function refreshAssistant(){let connected=false;try{connected=!!await adapter.assistant?.();}catch{}$('#moreAgent').hidden=!connected;}
  // Items that open their own dialog or export dismiss the drawer first, so the drawer behaves like a menu and focus returns to #openMore.
  more.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&(['openHistory','openAgent','openRehearsal','openSettings','openStoryboard','importButton','newDeck'].includes(b.id)||b.dataset.export))more.close();},true);
  $('#openMore').onclick=()=>{refreshAssistant();dialogs.open(more,$('#openMore'));};
  // Take away opens the export dialog; its format buttons, and the drawer's backup, run the kind's exports.
  const formats=()=>{const offered=adapter.exports();document.querySelectorAll('[data-export]').forEach(b=>b.disabled=!offered[b.dataset.export]);return offered;};
  $('#openExport').onclick=()=>{formats();const dialog=document.getElementById('exportDialog');if(dialog)dialogs.open(dialog);};
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.close)document.getElementById(button.dataset.close)?.close();if(button.dataset.export)adapter.exports()[button.dataset.export]?.();
  });

  // Language: the shell switches its own words, then the kind's.
  function setLocale(next){
    locale=next;applyLanguage(document,locale);
    adapter.localize?.(locale);window.dispatchEvent(new Event('deckweft:locale'));
  }
  $('#uiLanguage').onclick=()=>{if(adapter.languageLocked?.())return;setLocale(locale==='en'?'zh-CN':'en');};

  // A 401 is answered before the request is handled, so the kind may retry once after reconnecting.
  const reconnect=sessionRecovery({setToken:token=>adapter.setToken(token)});
  const shell={dialogs,t,get locale(){return locale;},toast,notice,status,showFirstRun,closeFirstRun,reconnect,askSaveCopy:()=>askSaveCopy(),
    // From 80% of the suggested history size the banner explains cleanup; nothing is deleted.
    capacity:usage=>notice(historyCapacityNote(usage),'warning')};
  adapter.onChange(refresh);adapter.mount(shell);
  return shell;
}
