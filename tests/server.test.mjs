import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {startStudio} from '../src/services/server.mjs';
import {createProject} from '../src/core/model.mjs';
import {temp} from './helpers.mjs';
async function server(t){const s=await startStudio({port:0,home:await temp(t),seed:false});t.after(()=>s.close());const {token}=await(await fetch(s.url+'/api/session')).json();return {...s,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}};}
test('loopback session, headers, and static allowlist',async t=>{const s=await server(t);assert.equal(s.server.address().address,'127.0.0.1');const r=await fetch(s.url);assert.ok((await r.text()).includes('DeckWeft'));assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'none'"));assert.equal((await fetch(s.url+'/not-found')).status,404);assert.equal((await fetch(s.url+'/src/core/model.mjs')).status,404);});
test('API requires a token except safe health/session bootstrap',async t=>{const s=await server(t);assert.equal((await fetch(s.url+'/api/projects')).status,401);assert.equal((await fetch(s.url+'/api/projects',{headers:s.headers})).status,200);assert.equal((await fetch(s.url+'/api/health')).status,200);});
test('cross-site, malformed origin, and forged Host requests fail',async t=>{const s=await server(t);for(const headers of [{Origin:'https://evil.example'},{Origin:'null'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await fetch(s.url+'/api/session',{headers})).status,403);const status=await new Promise((resolve,reject)=>{const req=request(s.url+'/api/session',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end();});assert.equal(status,403);});
test('invalid JSON, non-object input, and content type have specific errors',async t=>{const s=await server(t);for(const body of ['{oops','null','[]','1'])assert.equal((await fetch(s.url+'/api/projects',{method:'POST',headers:s.headers,body})).status,400);assert.equal((await fetch(s.url+'/api/projects',{method:'POST',headers:{Authorization:s.headers.Authorization},body:'{}'})).status,415);});
test('create / reopen / stale save / export API works end to end',async t=>{const s=await server(t);const created=await fetch(s.url+'/api/projects',{method:'POST',headers:s.headers,body:JSON.stringify({project:createProject()})});assert.equal(created.status,201);const {project}=await created.json();assert.equal((await fetch(s.url+'/api/projects/'+project.id,{headers:s.headers})).status,200);const save=()=>fetch(s.url+'/api/projects/'+project.id,{method:'PUT',headers:s.headers,body:JSON.stringify({project,expectedRevision:1})});assert.equal((await save()).status,200);assert.equal((await save()).status,409);const exp=await fetch(s.url+'/api/export/pptx',{method:'POST',headers:s.headers,body:JSON.stringify({project})});assert.equal(exp.status,200);assert.equal(Buffer.from(await exp.arrayBuffer()).subarray(0,2).toString(),'PK');});
test('preview gives four layouts and imports create a distinct id',async t=>{const s=await server(t),project=createProject();const r=await(await fetch(s.url+'/api/preview',{method:'POST',headers:s.headers,body:JSON.stringify({project})})).json();assert.equal(r.choices.length,4);const imported=await(await fetch(s.url+'/api/import',{method:'POST',headers:s.headers,body:JSON.stringify({project})})).json();assert.notEqual(imported.project.id,project.id);});
test('oversized JSON is rejected with an explicit 413 response',async t=>{const s=await server(t);const response=await fetch(s.url+'/api/projects',{method:'POST',headers:s.headers,body:JSON.stringify({padding:'x'.repeat(2_000_001)})});assert.equal(response.status,413);assert.equal((await response.json()).error.code,'BODY_TOO_LARGE');});

test('DW-130: measurement API binds export to the exact measured content',async t=>{
  const {fitText}=await import('../src/layout/text.mjs'),s=await server(t),p=createProject();
  const post=(route,data)=>fetch(s.url+route,{method:'POST',headers:s.headers,body:JSON.stringify(data)});
  const plan=await(await post('/api/measure/plan',{project:p})).json();
  const results=plan.requests.map(r=>{const f=fitText(r.text,r.box,r.style);return {id:r.id,fontSize:f.fontSize,ranges:f.ranges,widths:f.widths,ascent:f.ascent,descent:f.descent,fontFamily:r.style.families[0]};});
  const resolved=await post('/api/measure/resolve',{planId:plan.id,results});assert.equal(resolved.status,200);const preview=await resolved.json();assert.equal(preview.measurement.method,'browser-canvas');assert.equal(preview.choices.length,4);
  // Deterministic metrics fixture validates protocol only. Actual Canvas has a separate browser suite.
  const exported=await post('/api/export/svg',{project:p,renderTicket:preview.renderTicket,requireMeasured:true});assert.equal(exported.status,200);assert.equal(exported.headers.get('x-deckweft-text-measurement'),'browser-canvas');assert.match(await exported.text(),/Georgia/);
  const q=structuredClone(p);q.slides[0].content.title='Changed after measurement';const stale=await post('/api/export/pptx',{project:q,renderTicket:preview.renderTicket,requireMeasured:true});assert.equal(stale.status,409);assert.equal((await stale.json()).error.code,'STALE_MEASUREMENT');
  assert.equal((await post('/api/export/pptx',{project:p,requireMeasured:true})).status,409);
  assert.equal((await post('/api/measure/resolve',{planId:plan.id,results})).status,409);
});
test('DW-110: history HTTP read, pagination, restore and forbidden overwrite',async t=>{
  const s=await server(t),call=(route,data,method=data?'POST':'GET')=>fetch(s.url+route,{method,headers:s.headers,...(data?{body:JSON.stringify(data)}:{})});
  let p=(await(await call('/api/projects',{project:createProject()})).json()).project;
  p=(await(await call(`/api/projects/${p.id}`,{project:{...p,title:'Current title'},expectedRevision:1},'PUT')).json()).project;
  const base=`/api/projects/${p.id}/history`,page=await(await call(base+'?limit=1')).json();assert.deepEqual(page.revisions,[1]);
  const snapshot=await(await call(base+'/1')).json(),options={mode:'copy',snapshotHash:snapshot.sha256,requestId:'restore-http-test-000001'};
  const restored=await call(base+'/1/restore',options);assert.equal(restored.status,201);const first=await restored.json();assert.notEqual(first.project.id,p.id);
  const second=await(await call(base+'/1/restore',options)).json();assert.equal(first.project.id,second.project.id);assert.ok(second.replayed);
  assert.equal((await(await call(`/api/projects/${p.id}`)).json()).project.title,'Current title');
  for(const suffix of ['/0','/-1','/01','/1.5','?limit=0','?limit=51','?before=0','?before=NaN'])assert.equal((await call(base+suffix)).status,400,suffix);
  assert.equal((await call(base+'/1/restore',{...options,mode:'overwrite'})).status,400);
  assert.equal((await call(base+'/1',{},'DELETE')).status,405);
  assert.equal((await fetch(s.url+base)).status,401);
});
test('DW-130: shared text and interaction modules are the only added static routes',async t=>{const s=await server(t);for(const route of ['/shared/text.mjs','/text-measurer.js','/interaction.js','/history.js'])assert.equal((await fetch(s.url+route)).status,200);assert.equal((await fetch(s.url+'/shared/model.mjs')).status,404);});
