import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sceneDirection,narrativeCost} from '../src/design/art-direction.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {planStory} from '../src/agent/director.mjs';
import {resolveTheme,DEFAULT_PROFILE} from '../src/design/theme-registry.mjs';
import {candidateProjects,chooseRhythm} from '../src/design/rhythm.mjs';
const example=async()=>JSON.parse(await readFile(new URL('../examples/visual-demo.en.json',import.meta.url)));
const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('existing scenes gain distinct typography and spacing without changing source, geometry, crops or locks',async()=>{
 const {document,plan}=await example(),before=structuredClone({document,plan});
 const directions=plan.scenes.map((_,i)=>sceneDirection(document,plan,i));
 assert.ok(directions[0].headline>directions[1].headline);
 assert.equal(directions[0].beat,'opening');assert.equal(directions.at(-1).beat,'closing');
 assert.equal(directions[0].headlineWeight,400);assert.equal(directions[2].headlineWeight,750);
 assert.deepEqual({document,plan},before);
 const balanced=structuredClone(document);balanced.visualBrief.profile.typographicContrast='balanced';assert.ok(sceneDirection(balanced,plan,0).headline<directions[0].headline);
 const compact=structuredClone(document);compact.visualBrief.profile.density='compact';assert.ok(sceneDirection(compact,plan,0).gutter<directions[0].gutter);
});
test('all three visual voices keep legible text and chart colors on their actual surface, including restrained chapters',()=>{
 for(const id of ['cream-collage','electric-violet','dark-data'])for(const mode of ['default','chapter'])for(const intensity of ['bold','restrained']){
  const t=resolveTheme(id,'1.0.0','en',{colorMode:mode,profile:{...DEFAULT_PROFILE,colorIntensity:intensity}});
  assert.ok(contrast(t.paper,t.ink)>=7,id+mode+intensity);
  assert.ok(contrast(t.paper,t.accent)>=3,id+mode+intensity);
  assert.ok(contrast(t.paper,t.chart[0])>=3,id+mode+intensity+' plot');
 }
});
test('audience HTML uses the same derived type tiers, native content and source-bound scenes as previews',async()=>{
 const {document,plan}=JSON.parse(await readFile(new URL('./fixtures/visual/wave-a.en.json',import.meta.url)));
 const a=exportDeck(document,'html',{experimentalWeb:true,plan}),b=exportDeck(document,'html',{experimentalWeb:true,plan,preview:true});
 assert.deepEqual(a.sceneMarkup,b.sceneMarkup);assert.equal(a.sceneMarkup.length,plan.scenes.length);assert.ok(a.body.includes('--headline:'));assert.ok(a.body.includes('data-beat="opening"'));assert.ok(!a.body.includes('line-clamp'));
 const original=compileWebScenes(document,plan),reordered=structuredClone(plan);reordered.scenes.reverse();assert.deepEqual(compileWebScenes(document,reordered),original.toReversed());assert.notEqual(exportDeck(document,'html',{experimentalWeb:true,plan:reordered}).renderHash,a.renderHash);
});
test('measured rhythm includes narrative suitability and preserves the exact supplied story',()=>{
 const project=planStory('Start here\nKeep 81.25%.\n---\nExplain this\nRetain every word.\n---\nLeave a thought\nKeep the original source.'),before=structuredClone(project),candidates=candidateProjects(project),fit=candidates.map(p=>p.plan.scenes.map(()=>({ok:true})));
 const result=chooseRhythm(project,candidates,fit);
 assert.deepEqual(result.project.plan.scenes.map(s=>s.composition),['statement-split','statement-banner','statement-center']);
 assert.deepEqual(result.project.document,project.document);assert.deepEqual(project,before);
 assert.equal(result.report.scenes.at(-1).narrative.phase,'closing');
 fit[2][2]={ok:false};const fallback=chooseRhythm(project,candidates,fit);assert.notEqual(fallback.project.plan.scenes.at(-1).composition,'statement-center');
 assert.ok(narrativeCost(project.plan.scenes.at(-1),{family:'statement',id:'statement-center'},2,3).cost<narrativeCost(project.plan.scenes.at(-1),{family:'statement',id:'statement-banner'},2,3).cost);
});

test('CJK metric headlines have a column-sized type tier while authored breaks and exact values stay intact',async()=>{
 const {document,plan}=JSON.parse(await readFile(new URL('../examples/visual-demo.zh-CN.json',import.meta.url))),before=structuredClone({document,plan});
 const direction=sceneDirection(document,plan,0);
 assert.equal(direction.headline,76);assert.equal(direction.readingHeadline,36);assert.deepEqual({document,plan},before);
 assert.equal(sceneDirection(document,plan,3).readingHeadline,48);
 assert.equal(document.blocks.find(b=>b.id==='cover-title').text,'让大胆的想法\n拥有自己的舞台。');
});
