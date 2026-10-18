import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {checkRender,qualityBasis} from '../src/quality/render-checks.mjs';
import {createQualityReceipt,receiptCurrent,recordVisualReview} from '../src/quality/visual-review.mjs';
import {applyScopedRepair,boundedRepair,repairBudget} from '../src/quality/repair-plan.mjs';
const fixture=async()=>{const {document,plan}=JSON.parse(await readFile(new URL('fixtures/visual/wave-a.en.json',import.meta.url),'utf8'));return createVisualProject(document,plan);};
const error={id:'issue',sceneId:'collage',nodeId:'region',blockId:'title',bounds:{x:1,y:2,width:3,height:4},severity:'error',reason:'Clipped',suggestion:'Change layout',kind:'clipping'};
test('quality receipt invalidates content, exact values, sources, assets, layout, state, viewport, renderer and screenshot changes',async()=>{
 const p=await fixture(),o={renderHash:'renderer-one',state:{step:0},viewport:{width:1440,height:1000},domHash:'dom-one'},captures=[{file:'full.png',sha256:'abc'}],r=createQualityReceipt(p,o,{ok:true,issues:[]},captures);
 assert.equal(r.status,'awaiting-visual-review');assert.ok(receiptCurrent(r,p,o));
 for(const change of [p=>p.document.title+='!',p=>p.document.datasets[0].series[0].values[0]=18.125,p=>p.document.sources[0].title+='!',p=>p.assets.push({id:'new'}),p=>p.plan.scenes[0].composition='statement-center']){const q=structuredClone(p);change(q);assert.equal(receiptCurrent(r,q,o),false);}
 for(const change of [o=>o.state.step++,o=>o.viewport.width=390,o=>o.renderHash+='!',o=>o.domHash+='!']){const q=structuredClone(o);change(q);assert.equal(receiptCurrent(r,p,q),false);}
 assert.equal(receiptCurrent(r,p,o,[{file:'full.png',sha256:'changed'}]),false);assert.equal(qualityBasis(p,o).length,64);
});
test('visual review requires actual delivery attestation and every image; hashes never grant review',async()=>{
 const p=await fixture(),r=createQualityReceipt(p,{}, {ok:true,issues:[]},[{file:'scene.png'},{file:'contact.png'}]);
 assert.throws(()=>recordVisualReview(r,{}));
 const review={receiptId:r.id,reviewer:'test reviewer',delivery:'Images delivered to reviewer',images:['scene.png','contact.png'],judgment:'All text and source labels readable',verdict:'pass'};
 assert.throws(()=>recordVisualReview(r,{...review,images:['contact.png']}));assert.throws(()=>recordVisualReview(r,{...review,receiptId:'old'}));assert.equal(recordVisualReview(r,review).status,'passed');assert.equal(recordVisualReview(r,{...review,issues:[error]}).status,'failed');
 assert.equal(recordVisualReview({...r,checks:{ok:false}},review).status,'failed');
});
test('scoped composition repair preserves exact semantic document/assets/identity; affected scope and locks are enforced',async()=>{
 const p=await fixture(),id=p.plan.scenes[0].id,issues=[{...error,sceneId:id}],q=applyScopedRepair(p,{sceneId:id,composition:'statement-center'},issues);
 assert.deepEqual(q.document,p.document);assert.deepEqual(q.assets,p.assets);assert.deepEqual(q.plan.scenes.slice(1),p.plan.scenes.slice(1));assert.equal(q.plan.scenes[0].id,id);
 assert.throws(()=>applyScopedRepair(p,{sceneId:p.plan.scenes[1].id,composition:'reading-flow'},issues));assert.throws(()=>applyScopedRepair(p,{sceneId:id,composition:'reading-flow',text:'remove facts'},issues));
 p.document.authorOverrides.sceneLocks=[{sceneId:id,fields:['composition']}];assert.throws(()=>applyScopedRepair(p,{sceneId:id,composition:'statement-center'},issues),{code:'AUTHOR_LOCK'});
});
test('bounded repair halts at candidate/change/round/time budgets and retains last valid artifact on failure',async()=>{
 const p=await fixture(),id=p.plan.scenes[0].id,initial={ok:false,issues:[{...error,sceneId:id}]},before=structuredClone(p),lastValid={project:p,artifact:'last-good.html'};let calls=0;
 const options={project:p,initial,lastValid,propose:async()=>[{sceneId:id,composition:'statement-center'},{sceneId:id,composition:'statement-split'}],evaluate:async()=>{calls++;return initial;}};
 const result=await boundedRepair({...options,budget:{maxCandidates:1}});assert.equal(calls,1);assert.equal(result.ok,false);assert.equal(result.artifact,'last-good.html');assert.ok(result.candidate);assert.deepEqual(result.project,p);assert.deepEqual(p,before);
 calls=0;const zero=await boundedRepair({...options,budget:{maxRounds:0}});assert.equal(calls,0);assert.equal(zero.spent.rounds,0);
 const pass=await boundedRepair({...options,evaluate:async()=>({ok:true,issues:[],artifact:'new.html'})});assert.equal(pass.ok,true);assert.equal(pass.artifact,'new.html');assert.equal(pass.spent.sceneChanges,1);assert.equal(pass.status,'machine-passed-review-required');
 let time=0;const expired=await boundedRepair({...options,now:()=>time++,budget:{maxMilliseconds:1}});assert.equal(expired.spent.candidates,0);
 assert.throws(()=>repairBudget({maxRounds:3}));assert.throws(()=>repairBudget({maxCandidates:NaN}));assert.throws(()=>repairBudget({unknown:1}));
});
test('coverage and missing-scene failures have structured diagnostics',async()=>{
 const p=await fixture(),r=checkRender(p,[{viewport:{width:390},scenes:[],dom:''}]);assert.equal(r.ok,false);assert.ok(r.issues.some(i=>i.kind==='coverage'));assert.equal(checkRender(p,[]).ok,false);assert.ok(r.issues[0].reason);assert.ok(r.issues[0].suggestion);
});
test('slow/throwing/incomplete evaluators cannot replace the last valid output',async()=>{
 const p=await fixture(),sceneId=p.plan.scenes[0].id,initial={ok:false,issues:[{...error,sceneId}]},base={project:p,initial,lastValid:{project:p,artifact:'good.html'},propose:async()=>[{sceneId,composition:'statement-center'}]};
 for(const evaluate of [async()=>{throw Error('Browser stopped');},async()=>null,async()=>new Promise(()=>{})]){const r=await boundedRepair({...base,evaluate,budget:{maxMilliseconds:20,maxCandidates:1}});assert.equal(r.ok,false);assert.equal(r.artifact,'good.html');assert.ok(r.candidate.result.failure);}
});
test('last valid bytes/source survive repeated failed reruns; altered bytes and unsafe filenames are refused',async t=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),path=await import('node:path'),{createHash}=await import('node:crypto'),{preserveValidArtifacts}=await import('../src/quality/artifacts.mjs');
 const out=await mkdtemp(path.join(tmpdir(),'quality-archive-'));t.after(()=>rm(out,{recursive:true,force:true}));const p=await fixture(),body='Original exact output',png=Buffer.from('test-only pixel fixture'),hash=v=>createHash('sha256').update(v).digest('hex'),captures=[{file:'scene.png',sha256:hash(png)}],observation={viewport:1440};await writeFile(path.join(out,'story.html'),body);await writeFile(path.join(out,'scene.png'),png);
 const receipt={...createQualityReceipt(p,observation,{ok:true,issues:[]},captures),status:'passed'},c={name:'story',project:p,observation,htmlHash:hash(body),receipt};const first=await preserveValidArtifacts(out,{cases:[c]}),saved=first.get('story');assert.ok(saved.artifact.startsWith('accepted/'));
 await writeFile(path.join(out,'story.html'),'Failed new candidate');const failed={name:'story',receipt:{status:'failed'},repair:{artifact:saved.artifact}};
 for(let i=0;i<2;i++){const retained=await preserveValidArtifacts(out,{cases:[failed]});assert.deepEqual(retained.get('story').project,p);assert.equal(retained.get('story').htmlHash,hash(body));}
 const pending={name:'story',receipt:{status:'awaiting-visual-review'},repair:{artifact:'unreviewed.html'},lastValid:saved};assert.equal((await preserveValidArtifacts(out,{cases:[pending]})).get('story').artifact,saved.artifact);
 await assert.rejects(preserveValidArtifacts(out,{cases:[c]}),/bytes changed/);await assert.rejects(preserveValidArtifacts(out,{cases:[{...c,name:'../outside'}]}),/invalid/);
});

test('source coverage checks decoded actual links including query ampersands, not source JSON text',async()=>{
 const p=await fixture(),url='https://example.org/evidence?a=1&b=2';p.document.sources[0].url=url;
 const observation={viewport:{width:390},fit:{viewport:{width:390},checks:[]},sourceLinks:[url],dom:'href="https://example.org/evidence?a=1&amp;b=2"',scenes:p.plan.scenes.map(s=>({sceneId:s.id,bounds:{x:0,y:0,width:390,height:1000},regions:s.blockIds.map(id=>({nodeId:'r-'+id,blockId:id,bounds:{x:0,y:0,width:100,height:20},text:'',images:[]}))}))};
 assert.ok(checkRender(p,[observation]).issues.every(i=>i.kind!=='source-coverage'));
 observation.sourceLinks=[];observation.dom=JSON.stringify(p.document.sources);assert.ok(checkRender(p,[observation]).issues.some(i=>i.kind==='source-coverage'));
});
