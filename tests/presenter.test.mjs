import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createProject} from '../src/core/model.mjs';
import {resolveScenes} from '../src/layout/engine.mjs';
import {fitText} from '../src/layout/text.mjs';
import {speechTiming,speechCues,spokenWords} from '../src/core/speech.mjs';
import {parsePreferences,effectivePreferences} from '../src/core/preferences.mjs';
import {PresentationClock,formatTime} from '../src/presentation/clock.mjs';
import {PresentationSessions} from '../src/presentation/sessions.mjs';
import {startStudio} from '../src/services/server.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {temp,unzip} from './helpers.mjs';

test('speech uses independent English/Chinese rates and explicit pauses',()=>{
 const t=speechTiming('你好 DeckWeft world。',{wpm:120,cpm:240,pauseSeconds:.5});
 assert.deepEqual(t,{words:2,characters:2,pauses:1,seconds:2});
 assert.equal(spokenWords('你好 world').length,3);
 assert.equal(speechTiming('讲'.repeat(800)).seconds,200);
 for(const options of [{wpm:'140'},{cpm:0},{pauseSeconds:-1},{wpm:NaN}])assert.throws(()=>speechTiming('x',options));
});
test('speech cues preserve exact text, Unicode and contiguous time/character anchors',()=>{
 const text='你好，今天解释 DeckWeft。\n'+('A builder’s editable pitch 👩🏽‍💻 stays local. '.repeat(10))+'最后一页。';
 const cues=speechCues(text,{pauseSeconds:.5});assert.equal(cues.map(c=>c.text).join(''),text);
 let offset=0,time=0;for(const cue of cues){assert.equal(cue.from,offset);assert.equal(cue.start,time);assert.equal(text.slice(cue.from,cue.to),cue.text);assert.ok(cue.end>=cue.start);offset=cue.to;time=cue.end;}
 assert.ok(time>0);assert.deepEqual(speechCues(''),[]);
});
test('monotonic script clock pauses, resumes and seeks without animation-duration limits',()=>{
 assert.equal(formatTime(63.99999999999999),'1:04');assert.equal(formatTime(14.4),'0:14');assert.throws(()=>formatTime(Infinity));
 let now=0;const clock=new PresentationClock(()=>now);clock.start();now=10_000;assert.equal(clock.seconds(),10);clock.start();now=20_000;clock.pause();assert.equal(clock.seconds(),20);now=100_000;assert.equal(clock.seconds(),20);clock.start();now=105_000;assert.equal(clock.seconds(),25);clock.seek(180);assert.equal(clock.seconds(),180);clock.reset();assert.equal(clock.seconds(),0);assert.equal(clock.running,false);assert.throws(()=>clock.seek(NaN));
});
test('local preferences are strict and OS reduction outranks full authored playback',()=>{
 assert.deepEqual(parsePreferences({appearance:'dark',motion:'off'}),{appearance:'dark',motion:'off'});
 for(const value of [null,[],{appearance:'midnight',motion:'off'},{appearance:'dark',motion:'full',theme:'ocean'},{appearance:[],motion:'full'}])assert.throws(()=>parsePreferences(value));
 assert.deepEqual(effectivePreferences({appearance:'system',motion:'full'},{dark:true,reduced:true}),{appearance:'dark',motion:'reduced'});
 assert.equal(effectivePreferences({appearance:'light',motion:'off'},{dark:true,reduced:true}).motion,'off');
});
function privateProject(){const p=createProject();p.slides[0].notes='PRIVATE_SCRIPT_SENTINEL';p.brief.prompt='PRIVATE_BRIEF_SENTINEL';p.sources=[{id:'private_source',title:'PRIVATE_SOURCE_SENTINEL',url:'https://private.invalid/annotation'}];p.slides[0].sourceIds=['private_source'];return p;}
test('public projection holds only allowlisted scene data and scoped read-only authority',()=>{
 const p=privateProject(),store=new PresentationSessions(),session=store.create(p,resolveScenes(p));
 const view=store.read(session.id,'Bearer '+session.key),serialized=JSON.stringify(view);
 assert.deepEqual(Object.keys(view).sort(),['index','locale','motion','sequence','slide','title','total','version']);
 assert.deepEqual(Object.keys(view.slide).sort(),['id','motion','svg','title']);
 assert.ok(!serialized.includes('PRIVATE_'));assert.ok(!serialized.includes('private.invalid'));assert.ok(!serialized.includes(session.key));
 assert.throws(()=>store.read(session.id,'Bearer wrong'),{code:'AUDIENCE_AUTH'});
 assert.throws(()=>store.update(session.id,{index:'0',motion:'full'}));assert.throws(()=>store.update(session.id,{index:0,motion:'full',notes:'x'}));
 store.update(session.id,{index:0,motion:'off',command:1});assert.equal(store.read(session.id,'Bearer '+session.key).motion,'off');store.revoke(session.id);assert.throws(()=>store.read(session.id,'Bearer '+session.key),{code:'PRESENTATION_ENDED'});
});
test('presentation expiry and memory/count budgets release capabilities',()=>{
 let now=0;const p=createProject(),s=new PresentationSessions({now:()=>now,ttl:10,limit:1});const session=s.create(p,resolveScenes(p));assert.throws(()=>s.create(p,resolveScenes(p)),{code:'PRESENTATION_LIMIT'});now=10;assert.throws(()=>s.read(session.id,'Bearer '+session.key),{code:'PRESENTATION_ENDED'});assert.equal(s.bytes,0);s.create(p,resolveScenes(p));
});
test('audience HTML/PPTX/handoffs omit notes; explicit presenter exports and JSON retain them',()=>{
 const p=privateProject();for(const format of ['html','pptx','figma','motion']){
  const exported=exportDeck(p,format).body,contents=format==='pptx'?[...unzip(exported).values()].map(b=>b.toString()).join(''):String(exported);
  assert.ok(!contents.includes('PRIVATE_'),format);assert.ok(!contents.includes('private.invalid'),format);
  const privateOutput=exportDeck(p,format,{includeNotes:true}).body,privateText=format==='pptx'?[...unzip(privateOutput).values()].map(b=>b.toString()).join(''):String(privateOutput);
  if(format!=='figma')assert.ok(privateText.includes('PRIVATE_SCRIPT_SENTINEL'),format);
 }
 assert.ok(exportDeck(p,'json').body.includes('PRIVATE_SCRIPT_SENTINEL'));
 assert.ok(exportDeck(p,'html',{motion:'off'}).body.includes('data-motion-policy="off"'));
 assert.throws(()=>exportDeck(p,'html',{includeNotes:'yes'}),{code:'EXPORT_OPTIONS'});
});
async function setup(t){const studio=await startStudio({home:await temp(t),port:0,seed:false});t.after(()=>studio.close());const {token}=await(await fetch(studio.url+'/api/session')).json();const headers={'Content-Type':'application/json',Authorization:'Bearer '+token};const post=(route,data)=>fetch(studio.url+route,{method:'POST',headers,body:JSON.stringify(data)});const project=privateProject();const plan=await(await post('/api/measure/plan',{project})).json();const results=plan.requests.map(r=>{const f=fitText(r.text,r.box,r.style);return {id:r.id,fontSize:f.fontSize,ranges:f.ranges,widths:f.widths,ascent:f.ascent,descent:f.descent,fontFamily:r.style.families[0]};});const preview=await(await post('/api/measure/resolve',{planId:plan.id,results})).json();return {...studio,headers,post,project,preview};}
test('separate audience origin exposes no editor bootstrap/storage APIs or mutations',async t=>{
 const s=await setup(t);const response=await s.post('/api/presentations',{project:s.project,renderTicket:s.preview.renderTicket,index:0,motion:'full'});assert.equal(response.status,201);const session=await response.json(),url=new URL(session.audienceUrl),params=new URLSearchParams(url.hash.slice(1)),authorization='Bearer '+params.get('key');
 assert.notEqual(url.origin,s.url);assert.equal((await fetch(url.origin)).status,200);
 for(const route of ['/api/session','/api/projects','/app.js','/shared/speech.mjs','/src/core/model.mjs'])assert.equal((await fetch(url.origin+route)).status,404,route);
 const viewUrl=url.origin+'/api/view/'+session.id;
 assert.equal((await fetch(viewUrl)).status,401);assert.equal((await fetch(viewUrl,{headers:{Authorization:s.headers.Authorization}})).status,401);
 const view=await fetch(viewUrl,{headers:{Authorization:authorization}});assert.equal(view.status,200);assert.ok(!(await view.text()).includes('PRIVATE_'));assert.equal(view.headers.get('access-control-allow-origin'),null);
 assert.equal((await fetch(viewUrl,{headers:{Authorization:authorization,Origin:s.url}})).status,403);
 assert.equal((await fetch(s.url+'/api/session',{headers:{Origin:url.origin}})).status,403);
 assert.equal((await fetch(viewUrl,{method:'POST',headers:{Authorization:authorization}})).status,405);
 const hostStatus=await new Promise((resolve,reject)=>{const req=request(viewUrl,{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end();});assert.equal(hostStatus,403);
 assert.equal((await(await fetch(s.url+'/api/presentations/'+session.id+'/status',{headers:s.headers})).json()).connected,true);
 await s.post('/api/presentations/'+session.id,{index:0,motion:'off',command:1});assert.equal((await(await fetch(viewUrl,{headers:{Authorization:authorization}})).json()).motion,'off');
 await s.post('/api/presentations/'+session.id+'/close',{});assert.equal((await fetch(viewUrl,{headers:{Authorization:authorization}})).status,410);
});
test('out-of-order presenter commands cannot restore a stale slide or motion policy',()=>{
 const p=createProject(),store=new PresentationSessions(),s=store.create(p,resolveScenes(p));
 store.update(s.id,{index:0,motion:'off',command:3});
 assert.ok(store.update(s.id,{index:0,motion:'full',command:2}).stale);
 assert.equal(store.read(s.id,'Bearer '+s.key).motion,'off');
 assert.ok(store.update(s.id,{index:0,motion:'off',command:3}).replayed);
 assert.throws(()=>store.update(s.id,{index:0,motion:'full',command:3}),{code:'PRESENTATION_CONFLICT'});
});
test('presentations require exact measured snapshots and authenticated control',async t=>{
 const s=await setup(t);assert.equal((await s.post('/api/presentations',{project:s.project})).status,409);
 const changed=structuredClone(s.project);changed.slides[0].notes+=' changed';assert.equal((await s.post('/api/presentations',{project:changed,renderTicket:s.preview.renderTicket})).status,409);
 assert.equal((await fetch(s.url+'/api/presentations',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 for(const route of ['/preferences.js','/actions.js','/presenter.js','/workspace.css','/shared/preferences.mjs','/shared/clock.mjs'])assert.equal((await fetch(s.url+route)).status,200,route);
});
