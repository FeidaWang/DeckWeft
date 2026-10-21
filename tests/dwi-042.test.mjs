import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {shouldTick,createDetentAudio,TICK,PREFERENCE_KEY} from '../public/components/interaction-audio.js';
/** DWI-042 (workpacks/wes-instrument/TASKS.md): a quiet, original, opt-in detent tick. */
class FakeContext{constructor(){this.state='suspended';this.currentTime=0;this.made=0;this.destination={};}resume(){this.state='running';}close(){this.state='closed';}
 createOscillator(){this.made++;return {type:'',frequency:{setValueAtTime(){}},connect:g=>g,start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:d=>d};}}
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};};
test('off by default, and silent until a visible preference and a gesture unlock audio',()=>{
 let t=0;const a=createDetentAudio({AudioContextClass:FakeContext,now:()=>t,storage:memory(),isVisible:()=>true,isPresenting:()=>false,isAutomated:()=>false});
 assert.equal(a.enabled,false);assert.equal(a.unlock(),false);assert.equal(a.tick(),false,'off by default');
 a.setEnabled(true);assert.equal(a.tick(),false,'no gesture yet');
 assert.equal(a.unlock(),true);t=100;assert.equal(a.tick(),true);assert.equal(a.played.length,1);
});
test('rapid scrubbing drops ticks instead of queueing them',()=>{
 let t=0;const a=createDetentAudio({AudioContextClass:FakeContext,now:()=>t,storage:memory(),isVisible:()=>true,isPresenting:()=>false,isAutomated:()=>false});a.setEnabled(true);a.unlock();
 for(let i=0;i<100;i++){t=i*5;a.tick();}
 assert.equal(a.played.length,Math.ceil(495/TICK.minIntervalMs),'one tick per 50 ms of a 100-step, 500 ms scrub');
 assert.ok(a.played.every((v,i)=>i===0||v-a.played[i-1]>=TICK.minIntervalMs));
});
test('hidden tabs, presenting and automated sessions stay silent; the preference persists and turning it off releases audio',()=>{
 for(const quiet of [{isVisible:()=>false},{isPresenting:()=>true},{isAutomated:()=>true}]){let t=0;const a=createDetentAudio({AudioContextClass:FakeContext,now:()=>t+=100,storage:memory(),isVisible:()=>true,isPresenting:()=>false,isAutomated:()=>false,...quiet});a.setEnabled(true);a.unlock();assert.equal(a.tick(),false);}
 const s=memory(),a=createDetentAudio({AudioContextClass:FakeContext,storage:s});a.setEnabled(true);assert.equal(s.m.get(PREFERENCE_KEY),'on');
 assert.equal(createDetentAudio({AudioContextClass:FakeContext,storage:s}).enabled,true);a.unlock();a.setEnabled(false);assert.equal(a.unlocked,false);
 assert.equal(createDetentAudio({AudioContextClass:FakeContext,storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}}).enabled,false,'blocked storage reads as off');
 assert.throws(()=>shouldTick({nowMs:-1}),/monotonic/);
});
test('no sound file is shipped: the tick is synthesized',async()=>{
 const walk=async dir=>(await readdir(new URL(dir,import.meta.url),{withFileTypes:true})).flatMap(d=>d.isDirectory()?[]:[d.name]);
 for(const dir of ['../public/','../public/components/','../public/assets/'])for(const f of await walk(dir).catch(()=>[]))assert.ok(!/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f),f);
 assert.match(await readFile(new URL('../public/components/interaction-audio.js',import.meta.url),'utf8'),/createOscillator/);
});
