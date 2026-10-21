// DWI-042: an optional, original detent tick for the slide dial, synthesized with Web Audio (no recorded or vendor sound). Off by
// default; one visible preference turns it on, and it sounds only after a user gesture has unlocked audio. Ticks are dropped,
// never queued, when they come faster than the minimum interval; a hidden tab, presenting and an automated session stay silent.
// The tick only confirms a change the dial already shows; reduced motion is a separate preference and does not mute it.
export const TICK=Object.freeze({minIntervalMs:50,frequency:1760,durationMs:14,gain:.035});
export const PREFERENCE_KEY='deckweft.dialTick';
/** Whether a tick may sound now. A null `lastTickMs` means no earlier audible tick. */
export function shouldTick({enabled=false,unlocked=false,visible=true,presenting=false,automated=false,changed=false,nowMs,lastTickMs=null,minIntervalMs=TICK.minIntervalMs}={}){
 if(!Number.isFinite(nowMs)||nowMs<0||(lastTickMs!==null&&(!Number.isFinite(lastTickMs)||lastTickMs<0)))throw TypeError('Use monotonic clock values.');
 return enabled===true&&unlocked===true&&visible===true&&presenting===false&&automated===false&&changed===true&&(lastTickMs===null||nowMs-lastTickMs>=minIntervalMs);
}
const readPreference=storage=>{try{return storage?.getItem(PREFERENCE_KEY)==='on';}catch{return false;}};
/**
 * The tick player. Every dependency can be replaced for tests: `AudioContextClass`, `now`, `storage`, `isVisible`, `isPresenting`,
 * `isAutomated`. No AudioContext exists until the first gesture with the preference on.
 */
export function createDetentAudio({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,now=()=>performance.now(),storage=globalThis.localStorage,isVisible=()=>globalThis.document?.visibilityState!=='hidden',isPresenting=()=>!!globalThis.document?.body?.classList.contains('presenting'),isAutomated=()=>!!globalThis.navigator?.webdriver}={}){
 let enabled=readPreference(storage),context=null,lastTickMs=null;const played=[];
 return {
  get enabled(){return enabled;},get unlocked(){return context?.state==='running';},played,
  setEnabled(value){enabled=!!value;try{storage?.setItem(PREFERENCE_KEY,enabled?'on':'off');}catch{}if(!enabled&&context){context.close?.();context=null;}},
  /** Call from a click or key handler: creating or resuming an AudioContext needs a user gesture. */
  unlock(){if(!enabled||!AudioContextClass)return false;context??=new AudioContextClass();if(context.state==='suspended')context.resume?.();return true;},
  tick(){
   const t=now();
   if(!shouldTick({enabled,unlocked:context?.state==='running',visible:isVisible(),presenting:isPresenting(),automated:isAutomated(),changed:true,nowMs:t,lastTickMs}))return false;
   lastTickMs=t;const start=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(TICK.frequency,start);gain.gain.setValueAtTime(TICK.gain,start);gain.gain.exponentialRampToValueAtTime(.0001,start+TICK.durationMs/1000);
   osc.connect(gain).connect(context.destination);osc.start(start);osc.stop(start+TICK.durationMs/1000);played.push(t);if(played.length>100)played.shift();return true;
  }
 };
}
