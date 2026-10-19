import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createComponentDemo} from '../src/core/component-demo.mjs';
import {assertPresentation} from '../src/core/blocks.mjs';
import {assertDesignPlan} from '../src/design/plan.mjs';
import {chartModel,domain} from '../src/components/charts/model.mjs';
import {blockHTML} from '../src/render/web/components/blocks.mjs';
import {resolveTheme} from '../src/design/theme-registry.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {candidateProjects,moveScene} from '../src/design/rhythm.mjs';
import {assertVisualLocks} from '../src/core/visual-project.mjs';
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-components-')));
const p=await createComponentDemo('en',home),theme=resolveTheme('dark-data','1.0.0','en');
const html=(b,doc=p.document)=>blockHTML(b,doc,theme,{sceneId:'test'});
const block=kind=>p.document.blocks.find(b=>b.id==='component-'+kind);
test.after(()=>rm(home,{recursive:true,force:true}));
test('VIS-008 bilingual strict contract, themes, candidates and stable movement',async()=>{
 for(const locale of ['en','zh-CN']){const p=await createComponentDemo(locale,home);assert.equal(compileWebScenes(p.document,p.plan).length,14);for(const c of candidateProjects(p))assert.deepEqual(c.document,p.document);assert.deepEqual(moveScene(p,'component-code',-1).document,p.document);}
});
test('VIS-008 signed domains, null gaps, all missing and stable ranking without source mutation',()=>{
 assert.deepEqual(domain([null,null]),[0,1]);assert.deepEqual(domain([0,0]),[-1,1]);
 const b=block('ranked-bar'),d=p.document.datasets.find(d=>d.id===b.datasetId),before=structuredClone(d);assert.deepEqual(chartModel(b,d).order,[3,1,0,2]);assert.deepEqual(d,before);
 const line=html(block('line'));assert.match(line,/Missing values remain gaps/);assert.equal((line.match(/<polyline /g)||[]).length,3);assert.match(line,/-3.125/);assert.doesNotMatch(line,/NaN|Infinity/);
});
test('VIS-008 exact changes update marks, labels, series legends and accessible table',()=>{
 for(const kind of ['line','area','ranked-bar','stacked','scatter','heatmap']){const b=block(kind),copy=structuredClone(p.document),d=copy.datasets.find(d=>d.id===b.datasetId),before=html(b);d.series[0].values[0]=-7.8125;d.series[0].label='Updated legend';d.categories[0]=kind==='area'?'2026-10-03T14:00:00Z':'Updated category';const after=html(b,copy);assert.notEqual(after,before);assert.match(after,/-7.8125/);assert.match(after,/Updated legend/);assert.match(after,/<td>-7.8125<\/td>/);assert.doesNotMatch(after,/NaN|Infinity/);}
});
test('VIS-008 reject misleading axes, invalid time zones, ambiguous times and malformed coordinates',()=>{
 for(const edit of [d=>d.blocks.find(b=>b.id==='component-area').axis={policy:'extent'},d=>d.blocks.find(b=>b.id==='component-line').axis={policy:'fixed',min:0,max:1},d=>d.datasets.find(d=>d.id==='data-area').categories[0]='2026-02-30T15:00:00Z',d=>d.datasets.find(d=>d.id==='data-area').timeZone='Invalid/Zone',d=>d.datasets.find(d=>d.id==='data-area').categories[0]='2026-10-04T02:00:00',d=>d.datasets.find(d=>d.id==='data-scatter').series[0].xValues.pop(),d=>d.datasets[0].series[0].values[0]='3',d=>d.datasets.find(d=>d.id==='data-line').categoryIds.pop()]){const copy=structuredClone(p.document);edit(copy);assert.throws(()=>assertPresentation(copy));}
});
test('VIS-008 supplied directed edges, self-loops, sequence order and stable annotations',()=>{
 const b=structuredClone(block('sequence'));b.edges.push({id:'self',from:'writer',to:'writer',label:'Retry'});const output=html(b);assert.match(output,/writer → writer: Retry/);assert.ok(output.indexOf('Submit')<output.indexOf('Revise'));assert.match(output,/data-object-id="revise"/);
 const copy=structuredClone(p.document);copy.blocks.find(b=>b.id==='component-process').edges.pop();assertPresentation(copy);copy.blocks.find(b=>b.id==='component-process').edges=[];assert.throws(()=>assertPresentation(copy),/Annotation target/);
 const plan=structuredClone(p.plan);plan.scenes.find(s=>s.id==='component-line').blockIds=plan.scenes.find(s=>s.id==='component-line').blockIds.filter(id=>id!=='component-line');assert.throws(()=>assertDesignPlan(p.document,plan));
});
test('VIS-008 code exact whitespace, escaped markup, emphasis and source anchor',()=>{
 const b={...block('code'),text:'<script>\r\n\tvalue  \r\n',emphasizedLines:[2]};const output=html(b);assert.match(output,/&lt;script&gt;&#13;/);assert.match(output,/\tvalue  &#13;/);assert.match(output,/code-emphasis/);assert.match(output,/example.mjs#L1-L5/);const copy=structuredClone(p.document);copy.blocks.find(b=>b.id==='component-code').emphasizedLines=[99];assert.throws(()=>assertPresentation(copy));
});
test('VIS-008 locks bind chart datasets and exact code; truthful per-component capabilities',()=>{
 for(const kind of ['line','code']){const base=structuredClone(p),next=structuredClone(p),id='component-'+kind;base.document.authorOverrides.lockedBlockIds.push(id);next.document.authorOverrides.lockedBlockIds.push(id);if(kind==='line')next.document.datasets.find(d=>d.id==='data-line').series[0].values[0]=123;else next.document.blocks.find(b=>b.id===id).text+=' ';assert.throws(()=>assertVisualLocks(base,next));}
 // S7: every component declares a PowerPoint level; nothing is animated or interactive there. Figma still has no v3 compiler.
 assert.equal(presentationCapabilities('pptx',p.document).components.every(c=>c.supported&&['L1','L3'].includes(c.level)&&!c.animation&&!c.interactionSupport.length),true);assert.deepEqual(presentationCapabilities('figma',p.document).issues.map(i=>i.code),['TARGET_UNIMPLEMENTED']);assert.equal(presentationCapabilities('json',p.document).components.every(c=>c.supported&&!c.animation),true);
});
test('VIS-008 exact components persist through conflicts, immutable history and restore-as-copy',async()=>{
 const {VisualProjectStore}=await import('../src/services/visual-store.mjs'),store=await new VisualProjectStore(path.join(home,'store')).init();
 const first=await store.save(p,{create:true}),next=structuredClone(first);next.document.datasets.find(d=>d.id==='data-line').series[0].values[0]=-9.0625;next.document.blocks.find(b=>b.id==='component-code').text+='\n// saved whitespace  \t';const saved=await store.save(next,{expectedRevision:1});
 await assert.rejects(store.save(first,{expectedRevision:1}),{code:'REVISION_CONFLICT'});
 const snapshot=await store.snapshot(first.id,1),copy=await store.restoreAsCopy(first.id,1,{snapshotHash:snapshot.sha256,requestId:'component-restore-000001'});
 assert.deepEqual(copy.project.document.blocks,p.document.blocks);assert.deepEqual(copy.project.document.datasets,p.document.datasets);assert.deepEqual((await store.get(first.id)).document,saved.document);
});
