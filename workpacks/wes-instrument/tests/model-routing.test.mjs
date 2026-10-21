import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateModelRouting,taskProfile,EFFORT_LABELS} from '../lib/model-routing.mjs';
import {printProfile} from '../scripts/task-profile.mjs';
import {validateWorkpack} from '../scripts/validate-workpack.mjs';
const json=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const policy=json('MODEL_POLICY.json'), queue=json('TASKS.json');
const copies=()=>[structuredClone(policy),structuredClone(queue)];
for(const task of queue.tasks) {
  test(`routing ${task.id}: explicit build/review/ceiling and concrete task prompt`,()=>{
    const route=taskProfile(policy,queue,task.id);
    assert.equal(route.taskId,task.id);
    assert.equal(route.kind,'recommendation-only');
    assert.equal(route.modelInvocationPerformed,false);
    assert.equal(route.hostSettingsChanged,false);
    assert.equal(route.actualModelId,null);
    assert.equal(route.actualEffort,null);
    assert.equal(route.permissionToSpendGranted,false);
    assert.equal(route.taskState,'planned');
    const prompt=readFileSync(new URL('../'+route.taskPrompt,import.meta.url),'utf8');
    assert.ok(prompt.includes(task.id));
    assert.ok(prompt.includes(route.reason));
    assert.ok(prompt.includes(route.escalationTrigger));
    assert.ok(prompt.includes(`**${EFFORT_LABELS[route.buildEffort]}** (\`${route.buildEffort}\`)`));
    assert.ok(prompt.includes('Do not claim that this prompt changes the selected model.'));
  });
}
test('all 29 routes have bounded medium/high defaults and only one low closing task',()=>{
  const r=validateModelRouting(policy,queue);assert.deepEqual(r.errors,[]);
  assert.equal(r.count,29);assert.deepEqual(r.buildEffortCounts,{low:1,medium:10,high:18,xhigh:0});
});
test('missing routes and unknown profiles fail validation',()=>{
  const [p,q]=copies();delete q.tasks[0].modelRouting;q.tasks[1].modelRouting.profileId='unapproved';
  const e=validateModelRouting(p,q).errors;assert.ok(e.some(x=>x.includes('missing modelRouting')));assert.ok(e.some(x=>x.includes('unknown model profile')));
});
test('default Extra High, Max and Ultra are not silently accepted',()=>{
  for(const effort of ['xhigh','max','ultra']){const [p,q]=copies();q.tasks[0].modelRouting.buildEffort=effort;assert.ok(validateModelRouting(p,q).errors.length);}
});
test('automatic model switching, paid fallback and extra-agent policies are rejected',()=>{
  for(const field of ['automaticModelInvocation','automaticModelSwitch','automaticEffortChange','paidApiFallbackAllowed','parallelAgentsAllowed','permissionToSpendGrantedByThisFile']){
    const [p,q]=copies();p[field]=true;assert.ok(validateModelRouting(p,q).errors.some(x=>x.includes(field)));
  }
});
test('actual host model cannot be fabricated in the shipped policy',()=>{
  const [p,q]=copies();p.profiles[0].actualModelId='claimed-model';p.profiles[0].hostBindingVerified=true;
  assert.ok(validateModelRouting(p,q).errors.some(x=>x.includes('unverified')));
});
test('protected Astra substitution is not permitted',()=>{
  const [p,q]=copies();p.profiles[0].modelFamily='Astra';p.profiles[0].automaticSubstitution=true;
  const e=validateModelRouting(p,q).errors;assert.ok(e.some(x=>x.includes('unapproved model family')));assert.ok(e.some(x=>x.includes('automatic substitution')));
});
test('review and escalation cannot silently drop below build effort',()=>{
  const [p,q]=copies();q.tasks[0].modelRouting.reviewEffort='low';q.tasks[0].modelRouting.escalationEffort='medium';
  const e=validateModelRouting(p,q).errors;assert.ok(e.some(x=>x.includes('review is below')));assert.ok(e.some(x=>x.includes('ceiling is below')));
});
test('automatic per-task escalation and unbounded attempts fail',()=>{
  const [p,q]=copies();q.tasks[0].modelRouting.automaticEffortChange=true;q.tasks[0].modelRouting.maxTargetedRepairAttemptsBeforeCheckpoint=100;
  const e=validateModelRouting(p,q).errors;assert.ok(e.some(x=>x.includes('automatic switching')));assert.ok(e.some(x=>x.includes('bounded at two')));
});
test('task prompt path traversal and mismatched IDs fail',()=>{
  for(const path of ['../secret','/tmp/file','prompts/tasks/DWI-999.md']){const [p,q]=copies();q.tasks[0].modelRouting.taskPrompt=path;assert.ok(validateModelRouting(p,q).errors.some(x=>x.includes('task prompt path')));}
});
test('task-specific reasons and escalation triggers cannot be omitted',()=>{
  const [p,q]=copies();q.tasks[0].modelRouting.reason=' ';q.tasks[1].modelRouting.escalationTrigger='';
  const e=validateModelRouting(p,q).errors;assert.ok(e.some(x=>x.includes('missing reason')));assert.ok(e.some(x=>x.includes('missing escalationTrigger')));
});
test('separate review cannot be mislabelled independent or automatic',()=>{
  const [p,q]=copies();p.reviewPolicy.independentReviewClaimAllowed=true;q.tasks[0].modelRouting.reviewMode='independent-agent';
  const e=validateModelRouting(p,q).errors;assert.ok(e.some(x=>x.includes('Invalid review policy')));assert.ok(e.some(x=>x.includes('independent review')));
});
test('invalid IDs and absent tasks never silently select another route',()=>{
  assert.throws(()=>taskProfile(policy,queue,'DWI-999'),/Unknown task/);
  assert.throws(()=>taskProfile(policy,queue,'../../secret'),/Expected a task ID/);
});
test('print-only profile command returns explicit non-execution and no host changes',()=>{
  const writes=[];const result=printProfile(['DWI-034'],text=>writes.push(text));
  assert.equal(writes.length,1);assert.equal(JSON.parse(writes[0]).modelInvocationPerformed,false);
  assert.equal(result.buildEffort,'high');assert.equal(result.escalationEffort,'xhigh');
  assert.throws(()=>printProfile([],()=>{}),/Usage/);
  assert.throws(()=>printProfile(['DWI-034','--execute'],()=>{}),/Usage/);
});
test('route output is a defensive copy',()=>{
  const r=taskProfile(policy,queue,'DWI-034');r.profile.recommendedModelLabel='changed';
  assert.equal(policy.profiles[0].recommendedModelLabel,'GPT-6.1 Sol');
});
test('malformed policies/queues are errors rather than exceptions or success',()=>{
  for(const p of [null,{},[],{schemaVersion:1,kind:'advisory-only'}])assert.ok(validateModelRouting(p,queue).errors.length);
  for(const q of [null,{},[],{tasks:[null]}])assert.ok(validateModelRouting(policy,q).errors.length);
});
test('phase prompt mismatch is detected in a temporary copy',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'deckweft-routing-'));
  try{
    cpSync(fileURLToPath(new URL('..',import.meta.url)),tmp,{recursive:true});
    const p=join(tmp,'prompts/PHASE_00.md');
    writeFileSync(p,readFileSync(p,'utf8').replace('| DWI-000 | High | High | Extra High |','| DWI-000 | Low | High | Extra High |'));
    assert.ok(validateWorkpack(tmp).errors.some(x=>x.includes('phase model table mismatch')));
  }finally{rmSync(tmp,{recursive:true,force:true});}
});
