import {t} from './i18n.js';
import {defaultPreferences,parsePreferences,effectivePreferences} from '/shared/preferences.mjs';
const dark=matchMedia('(prefers-color-scheme:dark)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
let preferences={...defaultPreferences};
try{const saved=localStorage.getItem('deckweft.preferences.v1');if(saved)preferences=parsePreferences(JSON.parse(saved));}catch{}
export function getPreferences(){return effectivePreferences(preferences,{dark:dark.matches,reduced:reduced.matches});}
function apply(){
 const effective=getPreferences();document.documentElement.dataset.appearance=effective.appearance;document.documentElement.dataset.motion=effective.motion;document.documentElement.style.colorScheme=effective.appearance;
 if(effective.motion!=='full'){document.getAnimations?.().forEach(a=>a.cancel());document.querySelectorAll('.scene').forEach(el=>el.style.transform='');}
 window.dispatchEvent(new CustomEvent('deckweft:preferences',{detail:effective}));
}
function save(){try{localStorage.setItem('deckweft.preferences.v1',JSON.stringify(preferences));}catch{}apply();}
dark.addEventListener('change',apply);reduced.addEventListener('change',apply);
window.addEventListener('storage',e=>{if(e.key==='deckweft.preferences.v1'){try{preferences=e.newValue?parsePreferences(JSON.parse(e.newValue)):{...defaultPreferences};apply();}catch{}}});
apply();
export function mountPreferences({dialogs,$}){
 function sync(){
  const effective=getPreferences();
  for(const button of document.querySelectorAll('button[data-appearance]'))button.setAttribute('aria-pressed',String(preferences.appearance===button.dataset.appearance));
  $('#playbackMotion').value=preferences.motion;$('#reduceMotion').checked=effective.motion!=='full';$('#reduceMotion').disabled=reduced.matches;
  $('#systemMotionNote').textContent=reduced.matches?t('classic.preferences.yourSystemRequestsReducedMotionIt'):t('classic.preferences.appliesToPreviewsPresentationAndAudience');
 }
 $('#openSettings').onclick=()=>{sync();dialogs.open($('#settingsDialog'),document.body.classList.contains('presenting')?$('#presenterSettings'):$('#openSettings'));};
 for(const button of document.querySelectorAll('button[data-appearance]'))button.onclick=()=>{preferences.appearance=button.dataset.appearance;save();sync();};
 $('#reduceMotion').onchange=e=>{preferences.motion=e.target.checked?'reduced':'system';save();sync();};
 $('#playbackMotion').onchange=e=>{preferences.motion=e.target.value;save();sync();};
 window.addEventListener('deckweft:preferences',sync);window.addEventListener('deckweft:locale',sync);sync();
}
