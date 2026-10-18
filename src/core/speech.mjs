// @ts-check
// Shared by the Studio and build scripts. Count spoken notes, never visible UI labels.
/** @param {string} text */
export function spokenWords(text='') {
 return String(text).replace(/\p{Script=Han}/gu,' $& ').match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)||[];
}
/** @param {string} text @param {import('../contracts/presentation.mjs').SpeechOptions} options */
export function speechTiming(text='',{wpm=140,cpm=240,pauseSeconds=0}={}){
 if(!Number.isFinite(wpm)||wpm<60||wpm>220||!Number.isFinite(cpm)||cpm<60||cpm>600||!Number.isFinite(pauseSeconds)||pauseSeconds<0||pauseSeconds>3)throw new RangeError('Use 60–220 words/min, 60–600 Chinese characters/min and 0–3 seconds per pause.');
 const characters=(text.match(/\p{Script=Han}/gu)||[]).length;
 const words=(text.replace(/\p{Script=Han}/gu,' ').match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)||[]).length;
 const pauses=(text.match(/[.!?。！？；;]+|\n+/gu)||[]).length;
 return {words,characters,pauses,seconds:60*(words/wpm+characters/cpm)+pauses*pauseSeconds};
}
/** Exact text ranges allow resizing or pace changes without losing the text anchor.
 * @param {string} text @param {import('../contracts/presentation.mjs').SpeechOptions} options
 * @returns {import('../contracts/presentation.mjs').SpeechCue[]}
 */
export function speechCues(text,options={}){
 /** @type {import('../contracts/presentation.mjs').SpeechCue[]} */
 const cues=[];let from=0,time=0;
 // Bounded phrases, preserving every source character including line breaks.
 const pieces=text.match(/[^.!?。！？\n]{1,70}(?:[.!?。！？\n]+|(?=\s)|$)|[\s\S]{1,70}/gu)||[];
 for(const piece of pieces){const seconds=speechTiming(piece,options).seconds;const end=time+seconds;cues.push({text:piece,from,to:from+piece.length,start:time,end});from+=piece.length;time=end;}
 return cues;
}
/** @param {import('../contracts/presentation.mjs').Project} project @param {{wpm?:number,minutes?:number,cpm?:number}} options */
export function speechStats(project,{wpm=130,minutes=5,cpm=240}={}) {
 if(!Number.isFinite(wpm)||wpm<60||wpm>220||!Number.isFinite(minutes)||minutes<1||minutes>30)throw new RangeError('Choose 60–220 words per minute and 1–30 minutes.');
 const slides=project.slides.map(s=>({id:s.id,words:spokenWords(s.notes).length,characters:speechTiming(s.notes,{wpm,cpm}).characters,spokenSeconds:speechTiming(s.notes,{wpm,cpm}).seconds,seconds:s.motion.duration}));
 const words=slides.reduce((n,s)=>n+s.words,0),seconds=slides.reduce((n,s)=>n+s.seconds,0);
 return {words,wpm,cpm,minutes,spokenSeconds:Math.round(slides.reduce((n,s)=>n+s.spokenSeconds,0)),scheduledSeconds:seconds,targetWords:Math.round(minutes*wpm),slides};
}
/** @param {unknown} value */
export function validatePresentationRequest(value){
 if(!value||Array.isArray(value)||typeof value!=='object')throw new RangeError('Use whole minutes from 1 to 30 and 60–220 words per minute.');
 const v=/** @type {Record<string,unknown>} */(value),minutes=v.minutes,wpm=v.wpm;
 if(Object.keys(v).some(k=>!['minutes','wpm'].includes(k))||typeof minutes!=='number'||!Number.isInteger(minutes)||minutes<1||minutes>30||typeof wpm!=='number'||!Number.isInteger(wpm)||wpm<60||wpm>220)throw new RangeError('Use whole minutes from 1 to 30 and 60–220 words per minute.');
 return {minutes,wpm};
}
