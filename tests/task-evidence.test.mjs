import test from 'node:test';
import assert from 'node:assert/strict';
import {taskEvidence} from '../src/quality/task-evidence.mjs';

const project={id:'deck',plan:{scenes:[{id:'a'},{id:'b'}]}};
const draft={hostAuthoredLines:3,hostAuthored:[{page:0,text:'Added heading'},{page:1,text:'Same words'},{page:1,text:'Same words'}]};
test('F3: task evidence counts added lines per stable page, including repeated text',()=>{
 const task={project,original:project,hostDraft:draft},before=JSON.stringify(task);
 const e=taskEvidence(task,{...project,plan:{scenes:[{id:'b'},{id:'a'}]}});
 assert.equal(e.hostAuthored.total,3);assert.deepEqual(e.hostAuthored.pages.map(p=>[p.sceneId,p.page,p.lines]),[['b',1,['Same words','Same words']],['a',2,['Added heading']]]);
 assert.equal(JSON.stringify(task),before);assert.equal(e.hostAuthored.unlocated,0);
});
test('F3: absent and count-only legacy evidence do not fabricate page locations',()=>{
 assert.equal(taskEvidence(null,project).hostAuthored.total,null);
 assert.equal(taskEvidence({project,hostDraft:{hostAuthoredLines:0}}).hostAuthored.total,0);
 const e=taskEvidence({project,hostDraft:{hostAuthoredLines:4}});
 assert.deepEqual(e.hostAuthored.pages,[]);assert.equal(e.hostAuthored.unlocated,4);
 const removed=taskEvidence({project,original:project,hostDraft:draft},{...project,plan:{scenes:[{id:'a'}]}});
 assert.equal(removed.hostAuthored.unlocated,2);assert.equal(removed.hostAuthored.total,3);
});
test('F5: all four attestations and absent controls stay distinct; control secrets are omitted',()=>{
 for(const attestation of ['author','host-metadata-only','host-pixel-control','unattested']){
  const e=taskEvidence({project,receipt:{review:{attestation,verdict:'fail',controls:{summary:{hits:1,total:2},images:[{expected:{text:'SECRET',bounds:{x:1}}}]}}}});
  assert.deepEqual(e.review,{attestation,verdict:'fail',controls:{hits:1,total:2}});assert.ok(!JSON.stringify(e).includes('SECRET'));
 }
 assert.deepEqual(taskEvidence({project,receipt:{review:{verdict:'pass'}}}).review,{attestation:'unattested',verdict:'pass',controls:null});
 assert.deepEqual(taskEvidence(null,project).review,{attestation:'unattested',verdict:null,controls:null});
});
