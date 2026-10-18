import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createVisualTask,planStory,TASK_TOOLS} from '../src/agent/director.mjs';
import {executeVisualTool} from '../src/agent/tools.mjs';
import {parseRevision,applyRevision} from '../src/agent/revision-plan.mjs';
import {designBrief} from '../src/agent/design-brief.mjs';
import {createVisualDemo} from '../src/core/visual-demo.mjs';
import {AgentBridge} from '../src/services/agent-bridge.mjs';
import {createAgentProtocol,agentTools} from '../src/adapters/agent-mcp.mjs';
import {createProject} from '../src/core/model.mjs';
import {temp} from './helpers.mjs';
const request='Local facts\nKeep the supplied facts.\n---\nInspect the original\nPreserve exact values.\n---\nRecover safely\nKeep a checkpoint.';
async function call(task,name,args={},env={}){return executeVisualTool(task,name,{expectedSequence:task.sequence,...args},env);}
async function ready(task){for(const n of ['content.inspect','design.propose','assets.resolve','render.preview']){const r=await call(task,n);assert.equal(r.ok,true,JSON.stringify(r.error));task=r.task;}return task;}
// Explicit synthetic capability; this is a controller test, never browser evidence.
async function syntheticCapture({project,htmlHash}){return {htmlHash,delivery:'synthetic unit fixture; no actual browser',captures:[{file:'mock.png',sha256:'a'.repeat(64)}],observations:[{viewport:{width:1440,height:1000},fontStatus:'loaded',sourceLinks:[],fit:{viewport:{width:1440},checks:[]},scenes:project.plan.scenes.map(s=>({sceneId:s.id,composition:s.composition,bounds:{x:0,y:0,width:1440,height:900},regions:s.blockIds.map(id=>{const b=project.document.blocks.find(b=>b.id===id);return {nodeId:id,blockId:id,bounds:{x:0,y:0,width:100,height:100},text:b.text||'',images:[]};})}))}]};}
test('natural supplied outline produces roles and precompile directions without changing legacy paths',()=>{
 const p=planStory(request);assert.equal(p.plan.scenes.length,3);assert.deepEqual(p.plan.scenes.map(s=>s.role),['opening','context','closing']);assert.equal(p.document.migration.original.schemaVersion,1);
 const b=designBrief(p,request,[p.plan.scenes[1].id]);assert.equal(b.scenes.length,1);assert.equal(b.scenes[0].candidates.length,3);assert.equal(b.storyArc.length,3);assert.ok(b.scenes[0].theme.rules.contrast);assert.equal(b.scenes[0].assets.length,0);
});
test('content inspection retains references but never claims external truth verification',async()=>{
 const t=createVisualTask({request});const r=await call(t,'content.inspect');assert.equal(r.value.externalFactCheck,'not-performed-offline');assert.ok(r.value.diagnostics.length);assert.deepEqual(r.task.project,t.project);
});
test('precise chart revision requires selected original data and preserves all other fields',async t=>{
 const home=await temp(t),p=await createVisualDemo('en',home),scene=p.plan.scenes[0];
 assert.throws(()=>parseRevision(p,'把第 1 页改成图表，保持原文和颜色'),{code:'DATA_REQUIRED'});
 const patch=parseRevision(p,'把第 1 页改成图表，保持原文和颜色',{datasetId:p.document.datasets[0].id}),next=applyRevision(p,patch,[scene.id]);
 assert.deepEqual(next.plan.scenes.slice(1),p.plan.scenes.slice(1));assert.deepEqual(next.document.blocks.slice(0,p.document.blocks.length),p.document.blocks);assert.deepEqual(next.document.datasets,p.document.datasets);assert.deepEqual(next.document.sources,p.document.sources);assert.deepEqual(next.assets,p.assets);assert.equal(next.plan.scenes[0].theme,scene.theme);assert.equal(next.plan.scenes[0].colorMode,scene.colorMode);
 assert.throws(()=>applyRevision(p,patch,[p.plan.scenes[1].id]),{code:'TOOL_SCOPE'});
 const locked=structuredClone(p);locked.document.authorOverrides.sceneLocks.push({sceneId:scene.id,fields:['composition']});assert.throws(()=>applyRevision(locked,patch,[scene.id]),{code:'AUTHOR_LOCK'});
});
test('conflicts, unknown tools, missing datasets retain recoverable original and last valid',async()=>{
 const t=createVisualTask({request});for(const [name,args,code]of [['design.patch',{request:'make slide 2 a chart'},'DATA_REQUIRED'],['unknown',{},'TOOL_SCOPE'],['content.inspect',{expectedSequence:99},'REVISION_CONFLICT']]){const r=await call(t,name,args);assert.equal(r.ok,false);assert.equal(r.error.code,code);assert.deepEqual(r.task.project,t.project);assert.deepEqual(r.task.original,t.original);assert.equal(r.task.events.length,1);const recovery=await call(r.task,'artifact.export',{format:'checkpoint'});assert.equal(recovery.ok,true);assert.ok(JSON.parse(recovery.value.body).diagnostics.length);}
});
test('preview and final HTML require ordered content and actual-review receipt; source change invalidates it',async()=>{
 let t=createVisualTask({request});assert.equal((await call(t,'render.preview')).error.code,'CONTENT_CHECK_REQUIRED');t=await ready(t);
 assert.equal((await call(t,'artifact.export',{format:'html'})).error.code,'STALE_RECEIPT');assert.equal((await call(t,'render.inspect')).error.code,'BROWSER_REQUIRED');
 let r=await call(t,'render.inspect',{}, {capture:syntheticCapture});assert.equal(r.ok,true);t=r.task;assert.equal(t.status,'awaiting-image-review');
 r=await call(t,'render.inspect',{review:{receiptId:t.receipt.id,reviewer:'unit fixture',delivery:'synthetic mock image record',images:['mock.png'],judgment:'Controller fixture only; no real visual acceptance.',verdict:'pass'}});assert.equal(r.ok,true);t=r.task;
 r=await call(t,'artifact.export',{format:'html'});assert.equal(r.ok,true);assert.equal(r.task.status,'exported');assert.ok(r.value.body.includes('Keep the supplied facts.'));
 const changed=structuredClone(t);changed.project.document.blocks[0].text='Changed';assert.equal((await call(changed,'artifact.export',{format:'html'})).error.code,'STALE_RECEIPT');
 const patched=await call(r.task,'design.patch',{patch:{kind:'composition',sceneId:t.scope[0],composition:'statement-center'}});assert.equal(patched.ok,true);assert.equal(patched.task.receipt,null);assert.equal(patched.task.lastValid.htmlHash,r.value.htmlHash);assert.equal(patched.task.history.length,1);
});
test('bounded repair spends cumulative budgets and leaves failed source with diagnostics',async()=>{
 let t=createVisualTask({request,budget:{maxRounds:0}});t.project.plan.scenes.push({...structuredClone(t.project.plan.scenes[0]),id:'fourth'});for(const s of t.project.plan.scenes)s.composition='statement-split';t=await ready(t);
 const r=await call(t,'render.inspect',{repair:true},{capture:syntheticCapture});assert.equal(r.ok,true);assert.equal(r.task.status,'repair-exhausted');assert.equal(r.task.repairSpent.rounds,0);assert.equal(r.task.receipt.status,'failed');assert.ok(r.task.repair.candidate);assert.deepEqual(r.task.project,t.project);
});
test('MCP advertises shared tool surface; bridge enforces grant, lease, conflicts and persisted recovery',async t=>{
 const home=await temp(t),b=new AgentBridge(home),session='visual-test-session-0001';await b.enable(true,true);await b.hello({name:'Unit host',model:'unit model'},session);
 await b.request({project:createProject(),brief:request,workflow:'visual',consent:true,requestId:'visual-test-request-001'});const {job}=await b.next(session);assert.deepEqual(job.grant.tools,TASK_TOOLS);assert.ok(job.visualTask);
 const args={id:job.id,lease:job.lease,tool:'content.inspect',arguments:{expectedSequence:0}};
 await assert.rejects(()=>b.visualTool({...args,lease:'wrong'},session),{code:'AGENT_LEASE'});
 assert.equal((await b.visualTool(args,session)).ok,true);assert.equal((await b.visualTool(args,session)).error.code,'REVISION_CONFLICT');
 assert.equal((await new AgentBridge(home).get(job.id)).visualTask.sequence,2);await b.cancel(job.id);await assert.rejects(()=>b.visualTool(args,session),{code:'AGENT_LEASE'});
 const protocol=createAgentProtocol(home);await protocol({jsonrpc:'2.0',id:1,method:'initialize'});const list=await protocol({jsonrpc:'2.0',id:2,method:'tools/list'});assert.ok(list.result.tools.some(t=>t.name==='deckweft_visual_tool'));assert.equal(agentTools[0].inputSchema.properties.tool.enum.length,7);
});
test('missing local original creates explicit recovery without an automatic network fallback',async t=>{
 const home=await temp(t),p=await createVisualDemo('en',home);const task=createVisualTask({request,project:p});const r=await call(task,'assets.resolve',{}, {home:await temp(t)});assert.equal(r.ok,false);assert.deepEqual(r.task.project,p);assert.ok(r.error.message);assert.equal(r.task.lastValid,null);
});

test('one-task director resumes at actual-image boundary and boundedly repairs scoped visual feedback',async()=>{
 const {runVisualTask}=await import('../src/agent/tools.mjs');let reviews=0;const checkpoints=[];
 const result=await runVisualTask(createVisualTask({request}),{capture:syntheticCapture,checkpoint:async t=>checkpoints.push(t.status),review:async({receipt,project})=>({receiptId:receipt.id,reviewer:'synthetic unit fixture',delivery:'mock fixture, not real acceptance',images:receipt.captures.map(c=>c.file),judgment:reviews++===0?'Synthetic visual layout error':'Synthetic repaired controller case',verdict:reviews===1?'fail':'pass',issues:reviews===1?[{sceneId:project.plan.scenes[0].id,nodeId:'mock-node',bounds:{x:0,y:0,width:100,height:100},severity:'error',reason:'Synthetic hierarchy collision',suggestion:'Use an alternate scene composition'}]:[]})});
 assert.equal(result.ok,true);assert.equal(result.task.status,'exported');assert.equal(reviews,2);assert.equal(result.task.repairSpent.rounds,1);assert.deepEqual(result.task.project.document,result.task.original.document);assert.ok(checkpoints.includes('awaiting-image-review'));
 const pending=await runVisualTask(createVisualTask({request}),{capture:syntheticCapture});assert.equal(pending.required,'actual-image-review');assert.equal(pending.task.receipt.status,'awaiting-visual-review');
});
test('tool restrictions cannot be expanded by automatic repair or legacy completion',async t=>{
 const limited=createVisualTask({request,tools:TASK_TOOLS.filter(n=>n!=='design.patch')});let task=await ready(limited);for(const s of task.project.plan.scenes)s.composition='statement-split';task.project.plan.scenes.push({...structuredClone(task.project.plan.scenes[0]),id:'extra'});task=await ready(task);const r=await call(task,'render.inspect',{repair:true},{capture:syntheticCapture});assert.equal(r.error.code,'TOOL_SCOPE');
 const home=await temp(t),b=new AgentBridge(home),session='visual-guard-session-001';await b.enable(true,true);await b.hello({name:'Unit',model:'Unit'},session);await b.request({project:createProject(),brief:request,workflow:'visual',consent:true,requestId:'visual-guard-request-001'});const {job}=await b.next(session);const legacy=structuredClone(job.input.project);legacy.id=job.expectedProjectId;await assert.rejects(()=>b.complete({id:job.id,lease:job.lease,project:legacy},session),{code:'GRANT_SCOPE'});
});


test('v3 bridge requests and progress retain visual page count with completed comparable history',async t=>{
 const home=await temp(t),b=new AgentBridge(home),session='v3-progress-session-001',p=planStory(request);await b.enable(true,true);await b.hello({name:'Unit host',model:'Unit'},session);
 await b.request({project:p,brief:request,workflow:'visual',consent:true,requestId:'v3-progress-request-001'});const {job}=await b.next(session);assert.equal(job.visualTask.project.id,p.id);
 // Persisted comparable prior-run metadata exercises the ETA reader, not a fabricated host pass.
 await b.transact(s=>{const current=s.jobs[0],old=structuredClone(current);old.id='old-v3-progress-000001';old.completedTasks=['planning','draft','validation'];old.completedAt=old.startedAt+1000;s.jobs.push(old);});
 const state=await b.get(job.id);assert.equal(state.progress.eta.sampleCount,1);assert.equal(state.progress.eta.state,'insufficient-history');assert.equal((await b.status()).jobs.length,2);
});

test('one supplied page stays one page instead of duplicating content to fill a story',()=>{
 const supplied='Coffee roasting\nKeep the original 81.25% and its uncertainty.';
 const project=planStory(supplied);
 assert.equal(project.plan.scenes.length,1);
 assert.equal(project.document.blocks.filter(b=>b.type==='heading').length,1);
 assert.equal(project.document.blocks.filter(b=>b.text?.includes('81.25%')).length,1);
 assert.equal(project.document.migration.original.slides.length,1);
});
