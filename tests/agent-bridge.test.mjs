import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {AgentBridge} from '../src/services/agent-bridge.mjs';
import {createProject} from '../src/core/model.mjs';
import {projectIsEnglish} from '../src/core/presentation.mjs';
import {startStudio} from '../src/services/server.mjs';
import {temp} from './helpers.mjs';
const session='test-session-000000001',requestId='test-request-000000001';
async function fixture(t,options={}){const home=await temp(t),bridge=new AgentBridge(home,options);await bridge.enable(true,true);await bridge.hello({name:'Test agent',model:'Test model'},session);return {home,bridge};}
const input=(changes={})=>({project:createProject(),brief:'Explain one useful local workflow.',consent:true,requestId,englishOnly:true,...changes});
function result(job){const p=structuredClone(job.input.project);p.id=job.expectedProjectId;p.revision.number=0;return p;}

test('agent bridge fails closed without user opt-in and live heartbeat',async t=>{
 const home=await temp(t),b=new AgentBridge(home);assert.equal((await b.status()).enabled,false);
 await assert.rejects(()=>b.hello({name:'Dot',model:'GPT-6 Astra'},session),{code:'AGENT_OFF'});
 await assert.rejects(()=>b.enable(true,false),{code:'AGENT_CONSENT'});
 await b.enable(true,true);await assert.rejects(()=>b.request(input()),{code:'AGENT_DISCONNECTED'});
});
test('agent jobs are idempotent and bind the exact selected input',async t=>{
 const {bridge:b}=await fixture(t),value=input(),first=await b.request(value),second=await b.request(value);
 assert.equal(first.id,second.id);assert.equal(second.replayed,true);
 await assert.rejects(()=>b.request({...value,brief:'A different brief'}),{code:'AGENT_REQUEST_CONFLICT'});
 const {job}=await b.next(session);assert.deepEqual(job.input.project,value.project);assert.match(job.inputHash,/^[a-f0-9]{64}$/);
});
test('agent draft validates and cannot overwrite the input project',async t=>{
 const {bridge:b}=await fixture(t),value=input();await b.request(value);const {job}=await b.next(session),p=result(job);
 await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:value.project},session),{code:'AGENT_RESULT_ID'});
 await assert.rejects(()=>b.complete({id:job.id,lease:'wrong',project:p},session),{code:'AGENT_LEASE'});
 await b.complete({id:job.id,lease:job.lease,project:p},session);
 assert.equal((await b.get(job.id)).status,'needs-review');assert.equal(value.project.revision.number,0);
 assert.equal((await b.complete({id:job.id,lease:job.lease,project:p},session)).replayed,true);
 const changed=structuredClone(p);changed.title='Different';await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:changed},session),{code:'AGENT_RESULT_CONFLICT'});
});
test('English requests reject Chinese content even under an English locale',async t=>{
 const {bridge:b}=await fixture(t);await b.request(input());const {job}=await b.next(session),p=result(job);p.slides[0].content.title='中文';
 await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:p},session),{code:'AGENT_LANGUAGE'});
 assert.equal(projectIsEnglish(p),false);p.slides[0].content.title='Local generation';assert.equal(projectIsEnglish(p),true);
});
test('cancel and disconnect invalidate an in-flight lease',async t=>{
 const {bridge:b}=await fixture(t);await b.request(input());const {job}=await b.next(session);await b.cancel(job.id);
 await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:result(job)},session),{code:'AGENT_LEASE'});
 await b.request(input({requestId:'another-request-000001'}));await b.enable(false,false);
 assert.ok((await b.status()).jobs.every(j=>j.status==='cancelled'));assert.equal((await b.status()).connected,false);
});
test('stale connections and generation leases expire without silent retry',async t=>{
 let now=1000;const {bridge:b}=await fixture(t,{now:()=>now});await b.request(input());const {job}=await b.next(session);
 now+=91_000;assert.equal((await b.status()).connected,false);await assert.rejects(()=>b.request(input({requestId:'expired-request-00001'})),{code:'AGENT_DISCONNECTED'});
 // A long, owned model turn can complete within its ten-minute lease.
 await b.complete({id:job.id,lease:job.lease,project:result(job)},session);
 await b.request(input({requestId:'next-lease-test-00001'}));const next=(await b.next(session)).job;now+=601_000;
 await assert.rejects(()=>b.complete({id:next.id,lease:next.lease,project:result(next)},session),{code:'AGENT_EXPIRED'});
});
test('second worker cannot replace the first identity and a third is refused',async t=>{const {bridge:b}=await fixture(t);await b.hello({name:'Other',model:'Other'},'another-session-00001');const status=await b.status();assert.equal(status.workers.length,2);assert.equal(status.agent.name,'Test agent');await assert.rejects(()=>b.hello({name:'Third',model:'Other'},'third-session-000001'),{code:'AGENT_CONNECTED'});});
test('UI status polling and worker polling tolerate ordinary lock contention',async t=>{
 const {bridge:b}=await fixture(t);const requests=Array.from({length:20},(_,i)=>i%2?b.status():b.next(session));const results=await Promise.all(requests);assert.equal(results.length,20);assert.equal((await b.status()).connected,true);
});
test('agent result with content overflow is refused',async t=>{const {bridge:b}=await fixture(t);await b.request(input());const {job}=await b.next(session),p=result(job);p.slides[0].content.items=Array(24).fill('A very long line '.repeat(50));await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:p},session),{code:'AGENT_LAYOUT'});});
test('credential fields remain outside both queued input and generated projects',async t=>{
 const {bridge:b}=await fixture(t),p=createProject();p.extensions.apiKey='test-placeholder';await assert.rejects(()=>b.request(input({project:p})),{code:'AGENT_SECRETS'});
 await b.request(input());const {job}=await b.next(session),draft=result(job);draft.extensions.password='test-placeholder';await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:draft},session),{code:'AGENT_SECRETS'});
});
test('connected-computer CLI persists a lease across worker processes',async t=>{
 const home=await temp(t),bridge=new AgentBridge(home);await bridge.enable(true,true);
 const run=promisify(execFile),worker=['bin/deckweft-worker.mjs'];
 const legacyDirectory=path.join(home,'agent-bridge','worker'),legacySession='legacy-worker-session-0001';await mkdir(legacyDirectory,{recursive:true});await writeFile(path.join(legacyDirectory,'identity.json'),JSON.stringify({name:'Test worker',model:'Test model',session:legacySession}));
 const waiting=JSON.parse((await run(process.execPath,[...worker,'wait','--home',home,'--name','Test worker','--model','Test model','--timeout-ms','1000'])).stdout);assert.equal(waiting.status,'waiting');
 const request=await bridge.request(input());
 const claimed=JSON.parse((await run(process.execPath,[...worker,'wait','--home',home,'--name','Test worker','--model','Test model','--timeout-ms','1000'])).stdout);
 assert.equal(claimed.id,request.id);const envelope=JSON.parse(await readFile(claimed.jobPath,'utf8')),draft=result(envelope),file=path.join(home,'generated.json');await writeFile(file,JSON.stringify(draft));
 assert.equal(envelope.session,legacySession);
 const completed=JSON.parse((await run(process.execPath,[...worker,'complete','--home',home,'--job',claimed.id,'--draft',file])).stdout);assert.equal(completed.status,'needs-review');assert.equal((await bridge.get(claimed.id)).result.id,draft.id);
});

test('actual MCP subprocess claims an opt-in HTTP job and returns a reviewable copy',async t=>{
 const home=await temp(t),server=await startStudio({home,seed:false,port:0});t.after(()=>server.close());
 const token=(await(await fetch(server.url+'/api/session')).json()).token,headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const call=(route,body,method=body?'POST':'GET')=>fetch(server.url+route,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await fetch(server.url+'/api/agent/status')).status,401);
 const source=(await(await call('/api/projects',{project:createProject({title:'Original'})})).json()).project;
 await call('/api/agent/enable',{enabled:true,consent:true});
 const child=spawn(process.execPath,['bin/deckweft-agent.mjs','--home',home],{stdio:['pipe','pipe','pipe']});t.after(()=>child.kill());
 const lines=createInterface({input:child.stdout}),pending=new Map();let nextId=0,stderr='';child.stderr.on('data',b=>stderr+=b);
 lines.on('line',line=>{const response=JSON.parse(line);pending.get(response.id)?.(response);pending.delete(response.id);});
 const rpc=(method,params)=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP response timeout'));},5000);pending.set(id,r=>{clearTimeout(timer);resolve(r)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 assert.equal((await rpc('initialize',{protocolVersion:'2025-06-18'})).result.protocolVersion,'2025-06-18');
 assert.equal((await rpc('tools/list',{})).result.tools.length,6);
 const tool=async(name,args={})=>(await rpc('tools/call',{name,arguments:args})).result;
 assert.equal((await tool('deckweft_connect',{name:'Test agent',model:'Test model'})).isError,undefined);
 assert.equal((await(await call('/api/agent/status')).json()).agent.reportedModel,'Test model');
 assert.equal((await call('/api/agent/jobs',{...input({project:source}),consent:false})).status,400);
 const created=await(await call('/api/agent/jobs',input({project:source}))).json(),job=(await tool('deckweft_next_job')).structuredContent.job;
 assert.equal(job.id,created.id);const p=result(job);p.title='Generated draft';
 assert.equal((await tool('deckweft_complete_job',{id:job.id,lease:job.lease,project:p})).structuredContent.status,'needs-review');
 assert.equal((await call(`/api/agent/jobs/${job.id}/apply`,{confirm:false})).status,400);
 const applied=await(await call(`/api/agent/jobs/${job.id}/apply`,{confirm:true})).json();assert.equal(applied.project.title,'Generated draft');assert.notEqual(applied.project.id,source.id);
 assert.equal((await(await call(`/api/projects/${source.id}`)).json()).project.title,'Original');
 assert.equal((await(await call(`/api/agent/jobs/${job.id}/apply`,{confirm:true})).json()).replayed,true);
 child.stdin.end();await once(child,'exit');assert.equal(stderr,'');
});
test('presentation targets travel with the immutable job and reject invalid timing',async t=>{
 const {bridge:b}=await fixture(t),value=input({presentation:{minutes:5,wpm:140}});await b.request(value);
 await assert.rejects(()=>b.request({...value,presentation:{minutes:4,wpm:140}}),{code:'AGENT_REQUEST_CONFLICT'});
 const {job}=await b.next(session);assert.deepEqual(job.input.presentation,{minutes:5,wpm:140});assert.match(job.instructions,/700 words/);assert.match(job.instructions,/300 seconds/);
 await assert.rejects(()=>b.request(input({requestId:'invalid-timing-00001',presentation:{minutes:'5',wpm:140}})),{code:'AGENT_PRESENTATION'});
});
test('Studio serves local icons, the actual demo project and an authenticated Dot task',async t=>{
 const home=await temp(t),studio=await startStudio({port:0,home});t.after(()=>studio.close());const url=studio.url;
 const sessionResponse=await fetch(url+'/api/session');const {token}=await sessionResponse.json();
 const config=await(await fetch(url+'/api/agent/config',{headers:{Authorization:`Bearer ${token}`}})).json();assert.match(config.dotTask,/actual selected host model/);assert.ok(!config.dotTask.includes(token));assert.equal(config.connectedComputer.home,home);
 for(const route of ['/icons/sparkles.svg','/studio-tools.js','/shared/speech.mjs','/showcase.deck.json'])assert.equal((await fetch(url+route)).status,200,route);
 const p=await(await fetch(url+'/showcase.deck.json')).json();assert.equal(p.locale,'en');assert.equal(p.slides.length,14);assert.equal((await fetch(url+'/icons/../../package.json')).status,404);
});
