import {speechTiming,speechCues} from '/shared/speech.mjs';
import {PresentationClock,formatTime as format} from '/shared/clock.mjs';
import {getPreferences} from './preferences.js';
import {t} from './i18n.js';

export function mountPresenter({state,$,json,dialogs,onError}){
 let session=null,snapshot=null,index=0,cues=[],timer=null,statusTimer=null,follow=true,origin=null,starting=false,generation=0,command=0;
 let positions={},activeCue=-1,calibration=null,previewSlides=[],readingPace={wpm:140,cpm:240,pauseSeconds:0.5};
 const clock=new PresentationClock(),totalClock=new PresentationClock();
 const scroller=$('#scriptScroller');
 const options=()=>({...readingPace});
 const paceInputs=()=>({wpm:Number($('#scriptWpm').value),cpm:Number($('#scriptCpm').value),pauseSeconds:Number($('#scriptPause').value)});
 const storageKey=()=>snapshot?'deckweft.presenter.'+snapshot.id:'';
 const current=()=>snapshot.slides[index];
 function saveReading(){
  if(!session||!snapshot)return;positions[current().id]=clock.seconds();
  try{localStorage.setItem(storageKey(),JSON.stringify({snapshotHash:session.snapshotHash,positions,width:Number($('#scriptWidth').value),font:Number($('#scriptFont').value),dock:$('#scriptDock').value,...options()}));}catch{}
 }
 function restoreReading(){
  positions={};try{
   const saved=JSON.parse(localStorage.getItem(storageKey())||'null');if(!saved)return;
   if(saved.snapshotHash===session.snapshotHash&&saved.positions&&typeof saved.positions==='object')for(const [id,s]of Object.entries(saved.positions))if(snapshot.slides.some(slide=>slide.id===id)&&Number.isFinite(s)&&s>=0)positions[id]=s;
   for(const [key,id,min,max]of [['width','scriptWidth',260,600],['font','scriptFont',18,40],['wpm','scriptWpm',60,220],['cpm','scriptCpm',60,600],['pauseSeconds','scriptPause',0,3]])if(Number.isFinite(saved[key])&&saved[key]>=min&&saved[key]<=max)$('#'+id).value=saved[key];
   if(['left','right'].includes(saved.dock))$('#scriptDock').value=saved.dock;
  }catch{}readingPace=paceInputs();
 }
 function geometry(){
  const visible=[...$('#scriptText').children].find(node=>node.offsetTop+node.offsetHeight>scroller.scrollTop);
  const fraction=visible?(scroller.scrollTop-visible.offsetTop)/(visible.offsetHeight||1):0;
  const width=Math.max(260,Math.min(600,Number($('#scriptWidth').value)||380));
  $('#presenterGrid').style.setProperty('--script-width',width+'px');$('#scriptPanel').style.setProperty('--script-font',($('#scriptFont').value||25)+'px');
  $('#presenterGrid').dataset.dock=$('#scriptDock').value;$('#scriptDivider').setAttribute('aria-valuenow',String(width));
  if(visible){scroller.scrollTop=visible.offsetTop+fraction*visible.offsetHeight;}
 }
 function phraseAt(seconds){return Math.max(0,cues.findIndex(c=>seconds<c.end));}
 function anchor(){if(!cues.length)return 0;const seconds=clock.seconds(),cue=cues[seconds>=cues.at(-1).end?cues.length-1:phraseAt(seconds)];return cue.from+(cue.to-cue.from)*Math.min(1,Math.max(0,(seconds-cue.start)/(cue.end-cue.start||1)));}
 function timeAt(position){const cue=cues.find(c=>position<=c.to)||cues.at(-1);return cue?cue.start+(cue.end-cue.start)*Math.max(0,Math.min(1,(position-cue.from)/(cue.to-cue.from||1))):0;}
 function buildScript(position=null){
  cues=speechCues(current().notes,options());activeCue=-1;
  $('#scriptText').replaceChildren(...cues.map(c=>{const p=document.createElement('p');p.textContent=c.text;return p;}));
  if(!cues.length){const p=document.createElement('p');p.className='empty-script';p.textContent=t('classic.presenter.noSpeakerNotesOnThisSlide');$('#scriptText').append(p);}
  if(position!==null)clock.seek(timeAt(position));
 }
 function setFollow(value){follow=value;$('#scriptFollow').setAttribute('aria-pressed',String(value));$('#scriptFollow').textContent=value?t('classic.presenter.followingScript'):t('classic.presenter.resumeFollowing');}
 function tick(){
  if(!session)return;
  const duration=cues.at(-1)?.end||0,seconds=Math.min(clock.seconds(),duration),policy=getPreferences().motion;
  if(clock.running&&clock.seconds()>=duration){clock.pause();clock.seek(duration);$('#scriptPlay').textContent=t('classic.presenter.resumeScript');}
  $('#scriptClock').textContent=`${format(seconds)} / ${format(duration)}`;
  $('#presenterElapsed').textContent=t('classic.presenter.talkTime')+format(totalClock.seconds());
  const i=cues.length?(seconds>=duration?cues.length-1:phraseAt(seconds)):-1;
  if(activeCue!==i){[...$('#scriptText').children].forEach((p,n)=>p.classList.toggle('current-phrase',n===i));activeCue=i;}
  $('#scriptModeHint').textContent=policy==='full'?t('classic.presenter.scrollManuallyToPauseFollowingSlides'):t('classic.presenter.reducedMotionManualReadingTimedHighlighting');
  if(follow&&policy==='full'&&clock.running&&i>=0){
   const node=$('#scriptText').children[i],next=node.nextElementSibling;
   const fraction=Math.min(1,(seconds-cues[i].start)/(cues[i].end-cues[i].start||1));
   const base=node.offsetTop-$('#scriptText').offsetTop,advance=next?next.offsetTop-node.offsetTop:node.offsetHeight;
   const top=Math.max(0,base+advance*fraction-scroller.clientHeight*.30);
   if(Math.abs(scroller.scrollTop-top)>1){scroller.scrollTop=top;}
  }
 }
 async function publish(){
  if(!session)return;const id=session.id;
  try{await json('/api/presentations/'+id,{index,motion:getPreferences().motion,command:++command});}
  catch(e){if(session?.id===id){$('#presenterConnection').textContent=t('classic.presenter.audienceSyncPaused')+e.message;}}
 }
 function render(){
  const slide=current(),next=snapshot.slides[index+1];
  $('#presenterTitle').textContent=snapshot.title;$('#presenterPage').textContent=`${index+1} / ${snapshot.slides.length}`;
  $('#presenterCanvas').innerHTML=previewSlides.find(s=>s.slideId===slide.id).svg;
  $('#presenterNextCanvas').innerHTML=next?previewSlides.find(s=>s.slideId===next.id).svg:'';
  $('#presenterNextTitle').textContent=next?next.content.title:t('classic.presenter.endOfDeck');
  const timing=speechTiming(slide.notes,options());
  $('#presenterTiming').textContent=t('classic.presenter.wordsChineseCharactersEstimated',{words:timing.words,characters:timing.characters})+format(timing.seconds);
  $('#presenterPrevious').disabled=index===0;$('#presenterNext').disabled=index===snapshot.slides.length-1;
  clock.seek(positions[slide.id]||0);buildScript();setFollow(true);scroller.scrollTop=0;geometry();tick();
 }
 function move(next){
  if(!session||next<0||next>=snapshot.slides.length||next===index)return;
  saveReading();index=next;calibration=null;$('#calibrationStatus').textContent='';$('#calibratePace').textContent=t('classic.presenter.calibrateWithThisSlide');render();publish();
 }
 async function connection(){
  if(!session)return;const id=session.id;
  try{const status=await json('/api/presentations/'+id+'/status',undefined,'GET');if(session?.id!==id)return;$('#presenterConnection').textContent=status.connected?t('classic.presenter.audienceConnectedPublicSlideOnly'):t('classic.presenter.waitingForAudienceUseTheLink');}
  catch(e){if(session?.id===id)$('#presenterConnection').textContent=e.message;}
 }
 async function start(){
  if(starting||session||!state.project||state.previewState!=='ready'||!state.preview?.audit.ok)return;
  starting=true;const attempt=++generation;
  // Open during the click gesture. A visible link remains available if blocked.
  const popup=window.open('about:blank','_blank','popup,width=1280,height=800');if(popup)popup.opener=null;
  try{
   snapshot=structuredClone(state.project);previewSlides=structuredClone(state.preview.slides);index=snapshot.slides.findIndex(s=>s.id===state.active);const counter=state.counter;
   const result=await json('/api/presentations',{project:snapshot,renderTicket:state.preview.renderTicket,index,motion:getPreferences().motion});
   if(counter!==state.counter){popup?.close();await json('/api/presentations/'+result.id+'/close',{});throw Error(t('classic.presenter.theDeckChangedWhileOpeningStart'));}
   if(attempt!==generation){popup?.close();await json('/api/presentations/'+result.id+'/close',{});return;}
   session=result;command=0;origin=document.activeElement;restoreReading();dialogs.closeDrawer();
   $('#audienceLink').href=result.audienceUrl;$('#presenterShell').hidden=false;document.body.classList.add('presenting');
   document.querySelector('.skip').href='#presenterTitle';$('#presenterTitle').tabIndex=-1;window.dispatchEvent(new Event('deckweft:preview'));
   totalClock.reset();clock.reset();$('#scriptPlay').textContent=t('classic.presenter.startScript');render();$('#presenterExit').focus();
   if(popup){try{popup.location.replace(result.audienceUrl);}catch{}} // link is the recovery path
   timer=setInterval(tick,80);statusTimer=setInterval(connection,1500);connection();
  }catch(e){popup?.close();snapshot=null;onError(e);}finally{starting=false;}
 }
 function stop(){
  generation++;if(!session)return;saveReading();clock.pause();totalClock.pause();clearInterval(timer);clearInterval(statusTimer);
  const id=session.id;session=null;snapshot=null;$('#presenterShell').hidden=true;document.body.classList.remove('presenting');$('#presenterCanvas').replaceChildren();$('#scriptText').replaceChildren();$('#audienceLink').removeAttribute('href');
  document.querySelector('.skip').href='#slideTitle';json('/api/presentations/'+id+'/close',{}).catch(onError);origin?.focus({preventScroll:true});window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('deckweft:preview'));
 }
 $('#presenterPrevious').onclick=()=>move(index-1);$('#presenterNext').onclick=()=>move(index+1);$('#presenterExit').onclick=stop;
 $('#presenterSettings').onclick=()=>$('#openSettings').click();
 $('#scriptOptions').onclick=()=>{const show=$('#scriptControls').hidden;$('#scriptControls').hidden=!show;$('#scriptOptions').setAttribute('aria-expanded',String(show));};
 $('#scriptPlay').onclick=()=>{if(!session)return;if(clock.running){clock.pause();totalClock.pause();$('#scriptPlay').textContent=t('classic.presenter.resumeScript');}else{if(clock.seconds()>=(cues.at(-1)?.end||0))clock.seek(0);clock.start();totalClock.start();$('#scriptPlay').textContent=t('classic.presenter.pauseScript');}tick();saveReading();};
 $('#scriptReset').onclick=()=>{clock.seek(0);setFollow(true);scroller.scrollTop=0;tick();saveReading();};
 $('#scriptFollow').onclick=()=>{setFollow(!follow);tick();};
 for(const id of ['scriptWpm','scriptCpm','scriptPause']){
  const update=()=>{
   if(!session)return;const position=anchor();
   try{const proposed=paceInputs();speechTiming(current().notes,proposed);readingPace=proposed;$('#'+id).removeAttribute('aria-invalid');buildScript(position);renderTiming();tick();saveReading();}
   catch(e){$('#'+id).setAttribute('aria-invalid','true');$('#scriptModeHint').textContent=e.message;}
  };
  $('#'+id).oninput=update;$('#'+id).onchange=update;
  $('#'+id).onblur=()=>{if($('#'+id).getAttribute('aria-invalid')==='true'){$('#'+id).value=readingPace[{scriptWpm:'wpm',scriptCpm:'cpm',scriptPause:'pauseSeconds'}[id]];$('#'+id).removeAttribute('aria-invalid');}};
 }
 function renderTiming(){const stats=speechTiming(current().notes,options());$('#presenterTiming').textContent=t('classic.presenter.estimatedSpeech')+format(stats.seconds);}
 for(const id of ['scriptWidth','scriptFont','scriptDock'])$('#'+id).oninput=()=>{geometry();tick();saveReading();};
 $('#calibratePace').onclick=()=>{
  if(!session)return;
  if(calibration===null){calibration=performance.now();$('#calibratePace').textContent=t('classic.presenter.finishCalibration');$('#calibrationStatus').textContent=t('classic.presenter.readThisSlideSScriptAloud');return;}
  const elapsed=(performance.now()-calibration)/1000,stats=speechTiming(current().notes,{pauseSeconds:0});
  if(elapsed<10||stats.words+stats.characters===0){$('#calibrationStatus').textContent=t('classic.presenter.readForAtLeast10Seconds');return;}
  const factor=stats.seconds/elapsed;$('#scriptWpm').value=Math.round(Math.max(60,Math.min(220,140*factor)));$('#scriptCpm').value=Math.round(Math.max(60,Math.min(600,240*factor)));
  calibration=null;$('#calibratePace').textContent=t('classic.presenter.calibrateWithThisSlide');$('#calibrationStatus').textContent=t('classic.presenter.paceCalibratedFromYourTimedReading');const position=anchor();readingPace=paceInputs();buildScript(position);renderTiming();saveReading();
 };
 for(const event of ['wheel','touchstart','pointerdown'])scroller.addEventListener(event,()=>setFollow(false),{passive:true});
 scroller.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))setFollow(false);});
 // Pause only on user intent; layout/focus/programmatic scroll events also fire here.
 const divider=$('#scriptDivider');let dragging=false;
 divider.onpointerdown=e=>{dragging=true;divider.setPointerCapture(e.pointerId);};
 divider.onpointermove=e=>{if(!dragging)return;const rect=$('#presenterGrid').getBoundingClientRect();$('#scriptWidth').value=Math.max(260,Math.min(600,$('#scriptDock').value==='right'?rect.right-e.clientX:e.clientX-rect.left));geometry();};
 divider.onpointerup=()=>{dragging=false;saveReading();};divider.onpointercancel=()=>{dragging=false;};
 divider.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();$('#scriptWidth').value=Number($('#scriptWidth').value)+(e.key==='ArrowRight'?1:-1)*($('#scriptDock').value==='left'?24:-24);geometry();saveReading();}};
 window.addEventListener('deckweft:preferences',()=>{if(!session)return;scroller.scrollTo({top:scroller.scrollTop,behavior:'instant'});publish();tick();});
 document.addEventListener('keydown',e=>{
  if(!session||document.querySelector('dialog[open]')||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,select,textarea,[contenteditable=true]'))return;
  if(e.key==='Escape'){e.preventDefault();stop();return;}
  if(e.target.closest('#scriptScroller')||e.target===divider)return;
  if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key)){e.preventDefault();move(e.key==='Home'?0:e.key==='End'?snapshot.slides.length-1:index+(['ArrowRight','PageDown'].includes(e.key)?1:-1));}
  if(e.key===' '&&!e.target.closest('button,a')){e.preventDefault();$('#scriptPlay').click();}
 });
 window.addEventListener('pagehide',()=>{if(!session)return;saveReading();fetch('/api/presentations/'+session.id+'/close',{method:'POST',keepalive:true,headers:{Authorization:'Bearer '+state.token,'Content-Type':'application/json'},body:'{}'}).catch(()=>{});});
 return {start,stop};
}
