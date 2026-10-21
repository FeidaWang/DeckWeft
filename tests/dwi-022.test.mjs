import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {intakeDocuments} from '../src/services/document-intake.mjs';
import {proposeStoryReview,editStoryReview,approveStoryReview,reviewOutline} from '../src/planning/story-review.mjs';
import {assertClaimLedger} from '../src/planning/claims.mjs';
import {startStudio} from '../src/services/server.mjs';
import {temp} from './helpers.mjs';
/** DWI-022 (workpacks/wes-instrument/TASKS.md): review audience, outcome and outline before composing; approval keeps the prior deck. */
const doc=(name,text)=>({name,bytes:Buffer.from(text,'utf8')});
const intake=()=>intakeDocuments([doc('review.md','# Results\nMedian review time fell from 44 to 33 minutes.\nTeams found the check useful.\n# Next steps\nShip the checker\n'),doc('bench.txt','Bench notes\nMedian review time fell from 44 to 31 minutes.\n')]);

test('the proposal is a concise outline with locators, statuses, the contradiction and three named directions',()=>{
 const r=proposeStoryReview(intake(),{audience:'Engineers',outcome:'Approve the checker'});
 assert.equal(r.state,'outline-review');assert.equal(r.audience,'Engineers');assert.equal(r.outcome,'Approve the checker');
 assert.deepEqual(r.pages.map(p=>[p.heading,p.status,p.points.map(x=>x.text)]),[
  ['Results','contradiction',['Median review time fell from 44 to 33 minutes.','Teams found the check useful.']],
  ['Next steps','from-material',['Ship the checker']],
  ['Bench notes','contradiction',['Median review time fell from 44 to 31 minutes.']]]);
 assert.equal(r.pages[0].points[0].locator,'review.md, line 2');assert.deepEqual(r.pages[2].headingFrom,{documentId:'doc-2',line:1});
 assert.equal(r.directions.length,3);assert.deepEqual(new Set(r.directions.map(d=>d.group)),new Set(['editorial','report','stage']));
 assertClaimLedger(r.ledger);assert.equal(r.ledger.contradictions.length,1);
});

test('author edits rename and drop without rewriting kept material; an approved outline cannot be edited again',()=>{
 const r=proposeStoryReview(intake()),e=editStoryReview(r,{audience:'Leads',pages:[{id:'page-1',heading:'What changed',dropPoints:[1]},{id:'page-2',dropped:true}]});
 assert.equal(reviewOutline(e),'What changed\nMedian review time fell from 44 to 33 minutes.\n---\nBench notes\nMedian review time fell from 44 to 31 minutes.');
 assert.equal(e.pages[0].points[0].locator,'review.md, line 2');
 assert.throws(()=>editStoryReview(r,{pages:[{id:'page-1',heading:'  '}]}),e=>e.code==='STORY_PAGE');
 assert.throws(()=>editStoryReview(r,{pages:r.pages.map(p=>({id:p.id,dropped:true}))}),/at least one page/);
 assert.throws(()=>editStoryReview({...r,state:'approved'},{}),e=>e.code==='STORY_STATE');
 assert.deepEqual(r,proposeStoryReview(intake()),'editing returns a copy');
});

test('approval builds a new deck from the reviewed outline: numbers need a source, the ledger travels, the direction applies',()=>{
 const r=editStoryReview(proposeStoryReview(intake(),{audience:'Engineers',outcome:'Approve'}),{pages:[{id:'page-2',dropped:true}]});
 const previous={id:'open-deck',untouched:true},a=approveStoryReview(r,{direction:1,previous});
 assert.equal(a.previousKept,true);assert.deepEqual(previous,{id:'open-deck',untouched:true});
 const p=a.project;assert.equal(p.plan.scenes.length,2);assert.equal(p.document.visualBrief.audience,'Engineers');
 assert.ok(p.plan.scenes.every(s=>s.contentStatus==='evidence-required'),'local files are not URL sources');
 assert.equal(p.plan.scenes[0].theme,r.directions[1].theme);
 assert.deepEqual(p.extensions.deckweftIntake.ledger,r.ledger);assert.equal(p.extensions.deckweftIntake.outcome,'Approve');
 const texts=p.document.blocks.map(b=>b.text??'').join('\n');
 assert.ok(texts.includes('44 to 33 minutes')&&texts.includes('44 to 31 minutes'),'both contradictory values reach the deck');
 assert.ok(!texts.includes('Ship the checker'),'the dropped page is not composed');
 assert.equal(a.review.state,'approved');assert.throws(()=>approveStoryReview(a.review),e=>e.code==='STORY_STATE');
 assert.throws(()=>approveStoryReview(r,{direction:3}),e=>e.code==='STORY_DIRECTION');
});

test('no prompt syntax is needed: the only inputs are files, audience, outcome, page choices and one of three directions',async()=>{
 const js=await readFile(new URL('../public/studio/story.js',import.meta.url),'utf8'),visual=await readFile(new URL('../public/kinds/visual.js',import.meta.url),'utf8');
 const inputs=[...visual.matchAll(/<input id="story(\w+)"/g)].map(m=>m[1]);assert.deepEqual(inputs,['Audience','Outcome']);
 assert.ok(!/<textarea[^>]*id="story/.test(visual),'no free prompt box in the review');
 assert.match(js,/type:'radio',name:'storyDirection'/);assert.match(visual,/id="storyReview"/);
});

test('the studio proposes, edits and approves through its API; the open deck stays in the library unchanged',async t=>{
 const app=await startStudio({home:await temp(t),port:0,seed:false});t.after(()=>app.close());
 const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},call=async(path,data,method='POST')=>{const r=await fetch(app.url+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,body:await r.json()};};
 const open=(await call('/api/visual/demo',{locale:'en'})).body.project,before=(await call('/api/visual/projects/'+open.id,null,'GET')).body.project;
 const documents=[{name:'review.md',base64:Buffer.from('# Results\nMedian review time fell from 44 to 33 minutes.\n').toString('base64')}];
 const {review}=(await call('/api/visual/story/propose',{documents,audience:'Engineers',locale:'en'})).body;
 const edited=(await call('/api/visual/story/edit',{review,edits:{outcome:'Approve the checker'}})).body.review;
 const approved=await call('/api/visual/story/approve',{review:edited,direction:0});
 assert.equal(approved.status,201);assert.notEqual(approved.body.project.id,open.id);
 assert.deepEqual((await call('/api/visual/projects/'+open.id,null,'GET')).body.project,before);
 const list=(await call('/api/visual/projects',null,'GET')).body.projects.map(p=>p.id);assert.ok(list.includes(open.id)&&list.includes(approved.body.project.id));
 assert.equal((await call('/api/visual/story/propose',{documents:[{name:'a.pdf',base64:Buffer.from('%PDF-1.7').toString('base64')}]})).status,422);
});

test('a refused file is listed in the review with its recovery; the readable ones are reviewed',()=>{
 const r=proposeStoryReview(intakeDocuments([doc('review.md','# Results\nOne line'),{name:'scan.pdf',bytes:Buffer.from('%PDF-1.7')}]));
 assert.deepEqual(r.refused.map(d=>[d.name,d.refusal]),[['scan.pdf','INTAKE_PDF']]);assert.match(r.refused[0].recovery,/not enabled/);
 assert.equal(r.pages.length,1);
 assert.throws(()=>proposeStoryReview(intakeDocuments([{name:'scan.pdf',bytes:Buffer.from('%PDF-1.7')}])),e=>e.code==='STORY_EMPTY');
});
