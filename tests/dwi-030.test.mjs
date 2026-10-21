import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {LAYOUT_FAMILIES,DELIVERY_MODES,layoutFamilyOf,readingOrder,readingOrderIssues,diagramOrderIssues,deliveryGate,rankForDelivery,pageUnits} from '../src/design/attention-policy.mjs';
import {candidateProjects,rankCandidates} from '../src/design/rhythm.mjs';
import {dwiSliceProject,dwiSliceDocument} from './dwi-slice.mjs';
/** DWI-030 (workpacks/wes-instrument/TASKS.md): task-aware layout candidates — hard gates first, explicit reading order, two delivery modes. */
const p=await dwiSliceProject('en');
const fit=(ok=true,soft=null,reasons=[])=>({ok,reasons,height:700,soft});

test('six layout families, each with an explicit logical reading order on the vertical slice',()=>{
 assert.deepEqual(Object.keys(LAYOUT_FAMILIES),['assertion-evidence','paired-comparison','evidence-chart','workflow','mechanism','reading-brief']);
 const orders=Object.fromEntries(p.plan.scenes.map(s=>[layoutFamilyOf(p.document,s),readingOrder(p.document,s).map(o=>o.type).join(' > ')]));
 assert.deepEqual(orders,{
  'assertion-evidence':'heading > chart > paragraph > callout > citation',
  'paired-comparison':'heading > table > paragraph > citation',
  'evidence-chart':'heading > chart > chart > paragraph > citation',
  workflow:'heading > diagram > paragraph > citation',
  mechanism:'heading > paragraph > callout > diagram > list > citation',
  'reading-brief':'heading > paragraph > list > citation'});
 for(const s of p.plan.scenes)assert.deepEqual(readingOrderIssues(p.document,s),[],s.id);
});

test('reading order agrees with edge direction; early citations, missing evidence and mixed panel scales are blockers',()=>{
 const flow=p.document.blocks.find(b=>b.id==='flow-diagram');
 assert.deepEqual(diagramOrderIssues(flow),[]);
 const backward={...flow,nodes:[flow.nodes[1],flow.nodes[0],...flow.nodes.slice(2)]};
 assert.deepEqual(diagramOrderIssues(backward).map(i=>i.edge),['e-add-review']);
 const doc=structuredClone(p.document);doc.blocks.find(b=>b.id==='flow-diagram').nodes=backward.nodes;
 assert.ok(readingOrderIssues(doc,p.plan.scenes[3]).some(i=>i.code==='DIAGRAM_BACKWARD_EDGE'));
 const mixed=structuredClone(p.document);mixed.blocks.find(b=>b.id==='sm-b').axis={policy:'zero'};
 assert.ok(readingOrderIssues(mixed,p.plan.scenes[2]).some(i=>i.code==='READING_PANELS_SCALE'));
 const noEvidence={...p.plan.scenes[1],blockIds:['cmp-title','cmp-conclusion','cmp-cite'],focalBlockId:'cmp-title',composition:'comparison-matrix'};
 assert.ok(readingOrderIssues(p.document,noEvidence).some(i=>i.code==='READING_NO_EVIDENCE'));
});

test('self-paced and stage modes differ: the same dense pages pass for reading and fail for the stage',()=>{
 const gate=mode=>Object.fromEntries(p.plan.scenes.map(s=>[s.id,deliveryGate(p.document,s,mode).ok]));
 assert.deepEqual(gate('self-paced'),{assertion:true,comparison:true,chart:true,workflow:true,mechanism:true,brief:true});
 assert.deepEqual(gate('stage'),{assertion:true,comparison:true,chart:true,workflow:true,mechanism:false,brief:false});
 const brief=deliveryGate(p.document,p.plan.scenes[5],'stage');assert.match(brief.reasons[0],/Too much text for stage delivery \(355 units, at most 220\)/);assert.match(brief.reasons[0],/nothing is shrunk/);
 assert.ok(DELIVERY_MODES.stage.labelMinPx>DELIVERY_MODES['self-paced'].labelMinPx);
 assert.match(deliveryGate(p.document,p.plan.scenes[0],'stage',{features:{labelMinPx:14}}).reasons.join(),/Smallest label 14px is below 21px/);
 assert.equal(pageUnits(dwiSliceDocument('zh-CN'),p.plan.scenes[5])>pageUnits(p.document,p.plan.scenes[5])*0.5,true,'CJK glyphs count two units');
});

test('overflow and unreadable type are rejected before aesthetic scoring',()=>{
 const candidates=candidateProjects(p);
 // Candidate 0 is beautiful but overflows; candidate 2 is plain and fits: the fitting one wins every page.
 const soft={focus:{value:1},density:{value:.5}};
 const feasibility=[p.plan.scenes.map(()=>fit(false,soft,['Region overflow'])),p.plan.scenes.map(()=>fit(false,null,['Component requires scrolling or text is below 10px at presentation size'])),p.plan.scenes.map(()=>fit(true,null))];
 for(const row of rankCandidates(p,candidates,feasibility))assert.equal(row.ranked[0].candidate,2,row.sceneId);
 // With every candidate fitting the frame, the stage mode still refuses the dense pages as a hard gate.
 const allFit=[0,1,2].map(()=>p.plan.scenes.map(()=>fit(true,null)));
 const stage=rankForDelivery(p,candidates,allFit,{mode:'stage'}),reading=rankForDelivery(p,candidates,allFit,{mode:'self-paced'});
 assert.ok(stage.find(r=>r.sceneId==='brief').ranked.every(c=>!c.ok&&c.reasons.some(x=>/stage delivery/.test(x))));
 assert.ok(reading.find(r=>r.sceneId==='brief').ranked.some(c=>c.ok));
});

test('no universal F/Z path or golden ratio is encoded in the layout policy',async()=>{
 const files=[...(await readdir(new URL('../src/design/',import.meta.url))).map(f=>`../src/design/${f}`),...(await readdir(new URL('../src/layout/',import.meta.url))).map(f=>`../src/layout/${f}`)];
 for(const f of files){const text=await readFile(new URL(f,import.meta.url),'utf8');const code=text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');assert.ok(!/1\.618|golden[ -]?ratio|\b[FZ][- ]pattern\b|[FZ]-shaped/i.test(code),f);}
});
