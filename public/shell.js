// The workbench shell (single entry): one copy of the top band, the page strip, the first-run form, the Words / Look
// zones with the layout choices, the More drawer, the Take away dialog, the phone drawer and the state square. A deck
// kind plugs in through the adapter below. Like session.js and history-capacity.js it is shared code: it never reads
// schemaVersion and never calls fetch; everything that touches a deck, the network or the store goes through the adapter.
import {DialogManager} from './interaction.js';
import {sessionRecovery,askSaveCopy} from './session.js';
import {historyCapacityNote} from './history-capacity.js';
import {t,applyLanguage} from './i18n.js';
import {mountSlideDial} from './components/slide-dial.js';
import {createDetentAudio} from './components/interaction-audio.js';

/**
 * The adapter interface. `scene` is the id of the active page, the thumbnail marked `active`.
 * @typedef {{id:string,svg:string,eligible:boolean,reason?:string,label?:string,selected?:boolean,explanation?:string,disabled?:boolean,inspect?:boolean}} Candidate
 *   `svg` is the card's picture: an SVG, or an iframe for a kind that draws web pages. It is replaced only when it changes.
 * @typedef {{id:string,svg:string,title:string,mark?:string,active?:boolean}} Thumbnail
 * @typedef {{label:string,note?:string,id?:string,disabled?:boolean,pressed?:boolean,run:()=>unknown}} ExportEntry  `pressed` marks a format chosen in the dialog.
 * @typedef {object} Adapter
 * @property {(scene?:string)=>string} fields  Markup for the Words zone, inserted once on mount; the kind keeps the values current.
 * @property {(scene?:string)=>string} look  Markup for the Look zone below the layout choices, same rule.
 * @property {(scene?:string)=>Candidate[]} candidates  Layout choices for the page; `reason` says why one cannot fit.
 * @property {()=>Thumbnail[]} thumbnails  One per page, in order; `mark` is an optional small label on the thumbnail.
 * @property {()=>Promise<boolean>} save  Resolves true once nothing is left unsaved.
 * @property {()=>Record<string,ExportEntry|null>} exports  {html, pptx, pdf, json, …} in the order the Take away dialog shows
 *   them. `json` is the drawer's backup button; every other key is a format button in the dialog (`id` keeps a kind's own id).
 *   A disabled entry stays visible; null or a missing key is never offered.
 * @property {(fn:()=>void)=>void} onChange  The kind calls fn after it redraws the canvas; the shell then redraws the
 *   page strip, the choices and the export buttons.
 * @property {()=>void} undo
 * @property {()=>void} redo
 * @property {(text:string)=>Promise<string>} firstRun  Starts a deck from the pasted text (CRLF normalized, trimmed).
 *   Resolves to an error message to show under the box, or '' once a deck is open.
 *
 * Also needed by the strip, the first run, the zones, the drawer and the dialog:
 * @property {(shell:Shell)=>void} mount  Wires the kind's own controls; called once the markup exists.
 * @property {()=>Record<string,unknown>} [parts]  The kind's own markup for the shell's slots: `toolbar`, `choiceActions`,
 *   `pageActions`, `inspectorHead`, `inspectorTail`, `canvas`, `exportBefore`, `exportAfter`, and `drawer.{versions, agent,
 *   presenting, language, backup, developer}`. A drawer section left with nothing in it is hidden.
 * @property {(id:string)=>void} select  Open page `id`.
 * @property {(id:string,index:number)=>void} reorder  Move page `id` so it lands before the page now at `index`.
 * @property {()=>void} [add]  The + at the end of the strip; without it the + is hidden.
 * @property {(id:string)=>void} choose  A choice card was pressed.
 * @property {(id:string)=>void} [inspect]  The small "view larger" button of a choice card with `inspect`.
 * @property {(id:string)=>{label:string,disabled?:boolean,run:()=>unknown}[]} [pageMenu]  Right-click / context-menu key
 *   items for page `id`; none keeps the browser's own menu.
 * @property {()=>boolean} editable  False while the kind cannot take an edit (no deck, busy, IME composition).
 * @property {()=>Promise<string>} example  "See an example first"; resolves like firstRun.
 * @property {(field:string,svg:SVGSVGElement)=>({name:string,nodes:SVGGraphicsElement[]}|null)} [blocks]  The canvas
 *   nodes drawn by the Words field `field`; null when the field draws nothing (the whole slide is outlined instead).
 * @property {(token:string)=>void} setToken  Receives the new session token after a reconnect.
 * @property {()=>Promise<boolean>} [assistant]  Whether "Let the assistant write for me" has something to offer; hidden otherwise.
 * @property {()=>string} [locale]  The interface language to start in (default English).
 * @property {(locale:string)=>void} [localize]  Called after the shell has switched its own words, before `deckweft:locale`.
 * @property {()=>boolean} [languageLocked]  True while the interface language must not change.
 * @property {()=>void} [exportOpened]  Take away was opened; the kind resets its own part of the dialog.
 * @property {(file:File)=>boolean} [dropFile]  A file dropped on the stage; true when the kind took it.
 *
 * @typedef {object} Shell
 * @property {DialogManager} dialogs
 * @property {HTMLElement} root  The workspace; `root.isConnected` is false while another kind is on the page.
 * @property {(locale:string)=>void} setLocale  Switch the interface language, as the language button does.
 * @property {(key:string,params?:Record<string,unknown>)=>string} t  The shared dictionary (i18n.js), in the current language.
 * @property {string} locale
 * @property {(message:string)=>void} toast
 * @property {(message:string,tone?:string)=>void} notice  The banner above the stage; '' hides it.
 * @property {(square:{state:'saved'|'unsaved'|'saving'|'attention',label:string,undo:boolean,redo:boolean,save:boolean})=>void} status
 * @property {()=>void} syncExports  Re-reads exports() for the dialog's and the drawer's buttons.
 * @property {()=>void} showFirstRun
 * @property {()=>void} closeFirstRun  The first page replaces the form for good.
 * @property {(()=>Promise<void>)&{offerAgain:()=>void}} reconnect  session.js: ask once, then store the new token.
 * @property {()=>Promise<boolean>} askSaveCopy  session.js: after a revision conflict, keep the draft as a separate copy?
 * @property {(usage:unknown)=>void} capacity  history-capacity.js: the cleanup note from 80% of the suggested size.
 */

// The band and the page's other landmarks sit around <main id="root">, which becomes the workspace.
const band=/*html*/`
<a class="skip" href="#root">Skip to slide content</a>
<header class="topbar">
  <a class="brand" href="/" aria-label="DeckWeft home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>DeckWeft<small data-i18n="shell.brandNote">Ideas, beautifully arranged.</small></span></a>
  <!-- Design guide §9: brand, Undo, title, state square, Take away. Hold Undo 500 ms to show Redo. Save stays hidden for the keyboard shortcut. -->
  <div class="history-actions"><button id="undo" data-i18n-attr="aria-label:shell.undo" title="Undo (⌘/Ctrl Z)" aria-label="Undo"><svg class="line-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 5 4 9l4 4M4 9h12v10H9"/></svg></button><button id="redo" data-i18n-attr="aria-label:shell.redo" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo" hidden><svg class="line-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m16 5 4 4-4 4m4-4H8v10h7"/></svg></button></div>
  <div class="deck-heading"><input id="deckTitle" data-i18n-attr="aria-label:shell.deckTitle" aria-label="Deck title" maxlength="200"></div>
  <span id="saveState" class="state-square" role="status" data-state="saving" title="Opening local library…"><span class="sr-only">Opening local library…</span></span>
  <nav class="top-actions" aria-label="Deck actions"><button id="save" data-i18n="shell.save" hidden>Save</button><button id="openMore" data-i18n-attr="aria-label:shell.more" aria-haspopup="dialog" aria-controls="moreDialog" aria-label="More" title="More"><svg class="line-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><button class="take" id="openExport" data-i18n="shell.export">Take away</button></nav>
</header>
`;
const workspaceMarkup=/*html*/`
  <!-- M2: the outline panel stays in the DOM but hidden; its slide list and Add moved to the page strip. -->
  <aside class="story-panel" aria-label="Slide outline" hidden>
    <div class="panel-header"><span class="eyebrow" data-i18n="shell.story">YOUR STORY</span></div>
    <div class="mobile-title"><label for="deckTitleSmall" data-i18n="shell.localTitle">Deck title</label><input id="deckTitleSmall" maxlength="200"></div>
    <p class="privacy-note" hidden><span class="status-dot"></span><span data-i18n="shell.privacy">On your computer. No hidden uploads.</span></p>
  </aside>
  <section class="canvas-column" aria-label="Slide workspace">
    <nav class="page-strip" aria-label="Pages"><div class="slide-list" id="slideList"></div><button id="addSlide" data-i18n-attr="aria-label:shell.addASlide" aria-label="Add a slide">+</button></nav>
    <div class="canvas-toolbar"><div><span class="eyebrow" data-i18n="shell.workbench">WORKBENCH</span><span id="pageCount" class="muted"></span><div id="slideDial" hidden></div><label class="dial-sound" hidden><input type="checkbox" id="dialSound"><span data-i18n="shell.dialSound">Tick</span></label></div><div class="toolbar-actions"><button id="toggleStory" aria-expanded="false" aria-controls="drawerDialog" class="compact-only" data-i18n="shell.slides" hidden>Slides</button><span data-slot="toolbar"></span><button id="toggleInspector" aria-expanded="false" aria-controls="drawerDialog" class="compact-only" data-i18n="shell.edit">Edit</button><span data-slot="toolbarEnd"></span></div></div>
    <div id="issueBanner" class="issue-banner" role="alert" hidden></div><div class="stage" id="stage"><form id="firstRun" class="first-run-form" hidden><label class="sr-only" for="firstRunText" data-i18n="shell.firstRunLabel">What you want to say</label><textarea id="firstRunText" data-i18n-attr="placeholder:shell.pasteWhatYouWantToSay" maxlength="100000" required placeholder="Paste what you want to say here. Leave a blank line between pages."></textarea><p id="firstRunError" class="first-run-error" role="alert"></p><div class="first-run-actions"><button type="submit" data-i18n="shell.firstRunArrange">Arrange</button><button type="button" class="link-button" data-example data-i18n="shell.seeExample">See an example first</button></div></form><div id="canvas" class="slide-canvas" aria-live="off"><span data-slot="canvas"></span></div></div>
    <div class="canvas-caption"><span id="layoutCaption" hidden></span><span id="fitStatus" hidden class="fit-status"></span></div>
  </section>
  <aside class="inspector" aria-label="Slide inspector">
    <span data-slot="inspectorHead"></span>
    <div class="inspector-scroll"><div id="fieldErrors" role="alert" class="field-errors" hidden></div>
      <section class="zone" data-zone="words" aria-labelledby="zoneWordsLabel"><h2 class="zone-label" id="zoneWordsLabel"><i class="zone-square" aria-hidden="true"></i><span data-i18n="shell.zoneWords">Words</span></h2>
      </section>
      <section class="zone" data-zone="look" aria-labelledby="zoneLookLabel"><h2 class="zone-label" id="zoneLookLabel"><i class="zone-square" aria-hidden="true"></i><span data-i18n="shell.zoneLook">Look</span></h2>
      <section class="directions" aria-label="Layouts"><div class="directions-heading"><div class="direction-actions"><span data-slot="choiceActions"></span></div></div><div class="candidate-grid" id="candidates"></div></section>
      </section>
      <div class="slide-actions"><span data-slot="pageActions"></span></div>
      <span data-slot="inspectorTail"></span>
    </div>
  </aside>
`;
const after=/*html*/`
<footer class="statusbar"><span data-i18n="shell.footer">DeckWeft</span><span hidden>Early preview</span></footer>
<dialog id="moreDialog" class="more-drawer" aria-labelledby="moreIntro">
  <div class="more-head"><p id="moreIntro" data-i18n="shell.moreIntro">Most people never need to open this.</p><button data-close="moreDialog" data-i18n="shell.close" aria-label="Close">Close</button></div>
  <div id="moreTop" class="more-top"></div>
  <section class="more-section" data-section="versions"><h3 data-i18n="shell.moreVersions">Earlier versions</h3><button id="openHistory" data-i18n="shell.history" data-icon="history" aria-label="Version history" title="Version history">Version history</button><span data-slot="drawer.versions"></span></section>
  <section class="more-section" id="moreAgent" data-section="agent" hidden><h3 data-i18n="shell.moreAgent">Let the assistant write for me</h3><span data-slot="drawer.agent"></span></section>
  <section class="more-section" data-section="presenting"><h3 data-i18n="shell.morePresenting">Presenting</h3><span data-slot="drawer.presenting"></span></section>
  <section class="more-section" data-section="language"><h3 data-i18n="shell.moreLanguage">Language</h3><button id="uiLanguage" data-i18n="shell.uiLanguageName" data-i18n-attr="aria-label:shell.switchInterfaceLanguage" aria-label="Switch interface language">中文</button><span data-slot="drawer.language"></span></section>
  <section class="more-section" data-section="backup"><h3 data-i18n="shell.moreBackup">Backup and restore</h3><span data-slot="drawer.backup"></span><button data-export="json" class="more-json"><b>Project JSON</b><small data-i18n="shell.backup">Keep a complete backup</small></button></section>
  <section class="more-section" data-section="developer"><h3 data-i18n="shell.moreDeveloper">For developers</h3><span data-slot="drawer.developer"></span></section>
</dialog>
<dialog id="exportDialog" class="take-away" aria-labelledby="exportTitle"><div class="dialog-heading"><h2 id="exportTitle" data-i18n="shell.takeDeck">Take your story with you.</h2><button id="exportClose" type="button" data-close="exportDialog" data-i18n-attr="aria-label:shell.closeDialog" aria-label="Close dialog">×</button></div><span data-slot="exportBefore"></span><div class="export-options" id="exportFormats"></div><span data-slot="exportAfter"></span></dialog>
<dialog id="drawerDialog" class="drawer-shell" aria-labelledby="drawerTitle"><div class="drawer-heading"><h2 id="drawerTitle" data-i18n="shell.drawerTitle">Editing tools</h2><button data-close="drawerDialog" data-i18n="shell.close">Close</button></div><div id="drawerContent"></div></dialog>
<div id="pageMenu" class="page-menu" role="menu" hidden></div>
<div class="toast-region" id="toastRegion" aria-live="polite" aria-atomic="true"></div>
`;

const x=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const element=html=>{const template=document.createElement('template');template.innerHTML=html.trim();return template.content.firstElementChild;};
// Keep keyed children in order without moving the ones already in place: moving an iframe reloads it.
function place(container,nodes){
  for(const [i,node] of nodes.entries()){const at=[...container.children].filter(n=>n.dataset.key)[i];if(at!==node)container.insertBefore(node,at||null);}
  for(const stale of [...container.children].filter(n=>n.dataset.key&&!nodes.includes(n)))stale.remove();
}

/**
 * Asks the page loader (app.js) to open a deck of another kind in this same page: the current kind is taken out of the
 * page, the other one is put in, and nothing reloads. Resolves true once the deck is open, false when it could not be.
 * @param {'classic'|'visual'} kind @param {string} [id]
 */
export function openDeck(kind,id){
  return new Promise(resolve=>{
    const request=new CustomEvent('deckweft:switch-deck',{cancelable:true,detail:{kind,id,done:resolve}});
    if(window.dispatchEvent(request))resolve(false);
  });
}

/** Keeps the address on the deck that is on screen (`?project=<id>`, other parameters stay), so a reload or a shared link opens the same deck. */
export function rememberDeck(id){
  const url=new URL(location.href);if(url.searchParams.get('project')===id)return;
  url.searchParams.set('project',id);history.replaceState(null,'',url);
}

/** @param {Adapter} adapter @param {HTMLElement} root @returns {Shell} */
export function mountShell(adapter,root){
  const $=selector=>document.querySelector(selector);
  // Another kind can take this shell out of the page and put it back. While it is out, its document-wide listeners sleep.
  const alive=()=>root.isConnected;
  const parts=adapter.parts?.()||{};
  root.className='workspace';root.innerHTML=workspaceMarkup;root.insertAdjacentHTML('beforebegin',band);root.insertAdjacentHTML('afterend',after);
  for(const slot of document.querySelectorAll('[data-slot]')){const markup=slot.dataset.slot.split('.').reduce((o,k)=>o?.[k],parts);if(markup)slot.insertAdjacentHTML('beforebegin',markup);slot.remove();}
  $('[data-zone=words]').insertAdjacentHTML('beforeend',adapter.fields());$('[data-zone=look]').insertAdjacentHTML('beforeend',adapter.look());
  $('.slide-actions').hidden=!$('.slide-actions').children.length;$('#addSlide').hidden=!adapter.add;
  // A drawer section holds its heading and whatever the shell or the kind put in it; an empty one is not shown.
  for(const section of document.querySelectorAll('#moreDialog .more-section'))if(section.children.length<2)section.hidden=true;
  let locale=adapter.locale?.()||'en',toastTimer;
  applyLanguage(document,locale);
  const dialogs=new DialogManager(document,alive),more=$('#moreDialog');
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
  phone.addEventListener('change',()=>{if(alive())placeTopControls();});placeTopControls();

  // Page strip and choices, redrawn whenever the kind reports a change. Cards stay in place, so focus stays where it was and
  // a picture is replaced only when it changed.
  function thumbnail(p,i,old){
    const b=old||element(`<button class="thumbnail" draggable="true" data-slide="${x(p.id)}" data-key="${x(p.id)}"><span aria-hidden="true"></span><span class="thumbnail-meta"><span></span><span></span></span><span class="thumbnail-mark" hidden></span></button>`);
    if(b._media!==p.svg){b._media=p.svg;b.firstElementChild.innerHTML=p.svg||'<div class="placeholder">…</div>';}
    b.classList.toggle('active',!!p.active);b.setAttribute('aria-current',String(!!p.active));b.setAttribute('aria-label',t('shell.slide')+' '+(i+1)+': '+p.title+(p.mark?' · '+p.mark:''));
    const [number,title]=b.querySelectorAll('.thumbnail-meta span');number.textContent=String(i+1).padStart(2,'0');title.textContent=p.title;
    const mark=b.querySelector('.thumbnail-mark');mark.hidden=!p.mark;mark.textContent=p.mark||'';return b;
  }
  function card(c,i,old){
    const cell=old||element(`<div class="candidate-cell" data-key="${x(c.id)}"><button class="candidate" data-layout="${x(c.id)}"><span class="unfit-reason" hidden></span><span class="candidate-picture" aria-hidden="true"></span><span class="candidate-label"><span></span></span></button><button class="candidate-inspect" data-inspect-layout="${x(c.id)}" hidden>⤢</button></div>`),b=cell.firstElementChild;
    if(cell._media!==c.svg){cell._media=c.svg;b.querySelector('.candidate-picture').innerHTML=c.svg;}
    const label=c.label??c.id;b.classList.toggle('selected',!!c.selected);b.classList.toggle('unfit',!c.eligible);b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(!!c.selected));b.title=c.explanation||'';b.disabled=!!c.disabled;
    const reason=b.querySelector('.unfit-reason');reason.hidden=!!c.eligible;reason.textContent=c.eligible?'':c.reason||'';b.querySelector('.candidate-label span').textContent=`${i+1} · ${label}`;
    const inspect=cell.lastElementChild;inspect.hidden=!c.inspect;inspect.setAttribute('aria-label',t('shell.viewLarger')+' · '+label);inspect.title=t('shell.viewLarger');return cell;
  }
  function refresh(){
    const pages=adapter.thumbnails(),scene=pages.find(p=>p.active)?.id,list=$('#slideList'),grid=$('#candidates');
    dropLine.remove();
    const shown=new Map([...list.children].filter(n=>n.dataset.key).map(n=>[n.dataset.key,n]));
    place(list,pages.map((p,i)=>thumbnail(p,i,shown.get(p.id))));
    const cards=new Map([...grid.children].filter(n=>n.dataset.key).map(n=>[n.dataset.key,n]));
    place(grid,adapter.candidates(scene).map((c,i)=>card(c,i,cards.get(String(c.id)))));
    syncExports();markZone();
    // DWI-041: the dial shows the same position as the page count, so the count is hidden while the dial is shown (one gauge).
    dial.update(pages);$('#pageCount').hidden=pages.length>0;root.querySelector('.dial-sound').hidden=pages.length<2;
  }
  // DWI-041/042: the dial selects through the kind; its optional tick needs the visible preference and a gesture to unlock audio.
  const audio=createDetentAudio(),sound=$('#dialSound');sound.checked=audio.enabled;
  const dial=mountSlideDial($('#slideDial'),{select:id=>adapter.select(id),onStep:()=>audio.tick(),label:()=>t('shell.dialLabel'),previous:()=>t('shell.dialPrevious'),next:()=>t('shell.dialNext')});
  sound.addEventListener('change',()=>{audio.setEnabled(sound.checked);if(sound.checked)audio.unlock();});
  for(const type of ['pointerdown','keydown'])$('#slideDial').addEventListener(type,()=>audio.unlock());
  $('#slideList').addEventListener('click',event=>{const button=event.target.closest('button[data-slide]');if(button&&!button.disabled)adapter.select(button.dataset.slide);});
  $('#candidates').addEventListener('click',event=>{
    const inspect=event.target.closest('button[data-inspect-layout]');if(inspect){adapter.inspect?.(inspect.dataset.inspectLayout);return;}
    const button=event.target.closest('button[data-layout]');if(button&&!button.disabled)adapter.choose(button.dataset.layout);
  });
  if(adapter.add)$('#addSlide').onclick=()=>adapter.add();
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

  // The page menu: right-click or the context-menu key on a thumbnail, when the kind offers page actions (chapters).
  const menu=$('#pageMenu');
  function closeMenu(){if(menu.hidden)return;menu.hidden=true;menu.replaceChildren();menu._origin?.focus({preventScroll:true});menu._origin=null;}
  function openMenu(thumb,x0,y0){
    const items=adapter.pageMenu?.(thumb.dataset.slide)||[];if(!items.length)return false;
    menu.replaceChildren(...items.map(item=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=item.label;b.disabled=!!item.disabled;b.onclick=()=>{closeMenu();item.run();};return b;}));
    menu._origin=thumb;menu.hidden=false;const r=menu.getBoundingClientRect();
    menu.style.left=`${Math.max(8,Math.min(x0,innerWidth-r.width-8))}px`;menu.style.top=`${Math.max(8,Math.min(y0,innerHeight-r.height-8))}px`;
    menu.querySelector('button:not(:disabled)')?.focus();return true;
  }
  $('#slideList').addEventListener('contextmenu',event=>{const thumb=event.target.closest('.thumbnail');if(thumb&&openMenu(thumb,event.clientX,event.clientY))event.preventDefault();});
  $('#slideList').addEventListener('keydown',event=>{const thumb=event.target.closest('.thumbnail');if(!thumb||!(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')))return;const r=thumb.getBoundingClientRect();if(openMenu(thumb,r.left,r.bottom))event.preventDefault();});
  menu.addEventListener('keydown',event=>{
    const items=[...menu.querySelectorAll('button:not(:disabled)')],i=items.indexOf(document.activeElement);
    if(event.key==='Escape'){event.preventDefault();closeMenu();}
    else if(['ArrowDown','ArrowUp'].includes(event.key)&&items.length){event.preventDefault();items[(i+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus();}
    else if(event.key==='Tab')closeMenu();
  });
  document.addEventListener('pointerdown',event=>{if(alive()&&!menu.hidden&&!menu.contains(event.target))closeMenu();});

  // Colour matching: focus in Words frames the matching block on the canvas in yellow, or outlines the whole slide when
  // that field draws nothing; focus in Look outlines the slide in blue.
  let zoneFocus=null;
  function markZone(){
    const canvas=$('#canvas'),svg=canvas.querySelector('svg');
    canvas.classList.toggle('zone-words',zoneFocus?.zone==='words');canvas.classList.toggle('zone-look',zoneFocus?.zone==='look');
    svg?.querySelector('.zone-block-frame')?.remove();delete canvas.dataset.block;
    const block=svg&&zoneFocus?.zone==='words'?adapter.blocks?.(zoneFocus.field,svg):null;if(!block)return;
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
  window.addEventListener('resize',()=>{if(alive())dialogs.resize(innerWidth);});

  // First run (design guide §10): an empty library shows one paste box on the stage instead of an empty workbench.
  function showFirstRun(){document.body.classList.add('first-run');$('#canvas').hidden=true;$('#firstRun').hidden=false;$('#firstRunText').focus();syncExports();}
  function closeFirstRun(){$('#firstRun')?.remove();$('#canvas').hidden=false;document.body.classList.remove('first-run');syncExports();}
  const firstRunError=message=>{if(message&&$('#firstRun'))$('#firstRunError').textContent=message;};
  $('#firstRun').onsubmit=async event=>{
    event.preventDefault();const text=$('#firstRunText').value.replace(/\r\n?/g,'\n').trim();if(!text)return;
    $('#firstRunError').textContent='';const button=$('#firstRun [type=submit]');button.disabled=true;
    let message='';try{message=await adapter.firstRun(text);}finally{button.disabled=false;}
    firstRunError(message);
  };
  $('#firstRun [data-example]').onclick=async()=>firstRunError(await adapter.example());
  // Files dropped on the stage: the kind decides (a deck to import, an image for the page). A dashed yellow line shows where.
  const droppable=event=>!!adapter.dropFile&&[...(event.dataTransfer?.types||[])].includes('Files');
  $('#stage').addEventListener('dragover',event=>{if(!droppable(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';$('#stage').classList.add('drop-ready');});
  $('#stage').addEventListener('dragleave',event=>{if(!$('#stage').contains(event.relatedTarget))$('#stage').classList.remove('drop-ready');});
  $('#stage').addEventListener('drop',event=>{if(!droppable(event))return;event.preventDefault();$('#stage').classList.remove('drop-ready');const file=event.dataTransfer.files[0];if(file)adapter.dropFile(file);});

  // The More drawer. The assistant section only appears when the kind has something to offer; checked each time it opens.
  async function refreshAssistant(){let connected=false;try{connected=!!await adapter.assistant?.();}catch{}$('#moreAgent').hidden=!connected;}
  // Items that open their own dialog or export dismiss the drawer first, so the drawer behaves like a menu and focus returns to #openMore.
  more.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&(['openHistory','openAgent','openRehearsal','openSettings','openStoryboard','importButton','newDeck'].includes(b.id)||b.dataset.export||b.dataset.closesDrawer!==undefined))more.close();},true);
  $('#openMore').onclick=()=>{refreshAssistant();dialogs.open(more,$('#openMore'));};

  // Take away: the format buttons come from exports(), in its order; json is the drawer's backup button.
  function syncExports(){
    const offered=adapter.exports(),box=$('#exportFormats');
    for(const [key,entry] of Object.entries(offered)){
      if(key==='json'||!entry)continue;
      let b=box.querySelector(`[data-export="${CSS.escape(key)}"]`);
      if(!b){b=element(`<button type="button" data-export="${x(key)}"${entry.id?` id="${x(entry.id)}"`:''}><b></b><small></small></button>`);box.append(b);}
      b.querySelector('b').textContent=entry.label;b.querySelector('small').textContent=entry.note||'';b.querySelector('small').hidden=!entry.note;
      if('pressed' in entry)b.setAttribute('aria-pressed',String(!!entry.pressed));
    }
    for(const b of document.querySelectorAll('[data-export]')){const entry=offered[b.dataset.export];if(!entry&&b.closest('#exportFormats'))b.remove();else b.disabled=!entry||!!entry.disabled;}
    // DWI-040: with no deck (the first run showing) Take away waits, so Arrange is the one next action; with a deck, the dialog says which formats are ready.
    const firstRun=$('#firstRun');$('#openExport').disabled=(!!firstRun&&!firstRun.hidden)||!document.querySelector('#slideList [data-slide]');
  }
  $('#openExport').onclick=()=>{syncExports();adapter.exportOpened?.();dialogs.open($('#exportDialog'));};
  document.addEventListener('click',event=>{
    if(!alive())return;
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.close)document.getElementById(button.dataset.close)?.close();
    if(button.dataset.export){const entry=adapter.exports()[button.dataset.export];if(entry&&!entry.disabled)entry.run();}
  });

  // Language: the shell switches every [data-i18n] word, then the kind redraws what it wrote itself.
  function setLocale(next){
    locale=next;applyLanguage(document,locale);syncExports();
    adapter.localize?.(locale);window.dispatchEvent(new Event('deckweft:locale'));
  }
  $('#uiLanguage').onclick=()=>{if(adapter.languageLocked?.())return;setLocale(locale==='en'?'zh-CN':'en');};

  // A 401 is answered before the request is handled, so the kind may retry once after reconnecting.
  const reconnect=sessionRecovery({setToken:token=>adapter.setToken(token)});
  const shell={dialogs,t,get locale(){return locale;},get root(){return root;},setLocale:next=>{if(next!==locale)setLocale(next);},toast,notice,status,syncExports,showFirstRun,closeFirstRun,reconnect,askSaveCopy:()=>askSaveCopy(),
    // From 80% of the suggested history size the banner explains cleanup; nothing is deleted.
    capacity:usage=>notice(historyCapacityNote(usage),'warning')};
  adapter.onChange(refresh);adapter.mount(shell);syncExports();
  return shell;
}
