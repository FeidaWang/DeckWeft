import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createVisualProject,assertVisualProject} from '../src/core/visual-project.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {compileInteractions,staticInteractionState} from '../src/motion/cues.mjs';
import {initialInteractionState,reduceInteractionState,seekInteractionState} from '../src/motion/timeline.mjs';
import {assertBlueprintStatic,blueprintKeyState,stageAt} from '../src/motion/blueprint.mjs';
import {compileInteractionRuntime} from '../src/motion/web.mjs';
import {freezeViews,revealRequired,staticStates,STATIC_DELIVERY_RULES} from '../src/targets/static-delivery.mjs';
import {addBlueprintA,useInteractionOpening,useStaticState} from '../public/studio/interactions.js';
import {semanticView} from './evidence-scene.mjs';
import {BLUEPRINT_THEMES,blueprintFixture,blueprintProject} from './blueprint-a.mjs';
import schema from '../schemas/design-plan.schema.json' with {type:'json'};

const sceneOf=p=>p.plan.scenes.find(s=>s.id==='pipeline');
const specOf=p=>compileInteractions(p.document,sceneOf(p))[0];
const html=p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan});
const pipelineMarkup=(out)=>out.sceneMarkup[out.scenes.findIndex(s=>s.id==='pipeline')];
const plain=t=>t.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
const rejects=(fn,code,pattern)=>assert.throws(fn,e=>e.code===code&&(!pattern||pattern.test(e.message+JSON.stringify(e.details||[]))),code);

test('S9b contract: the optional blueprint declaration on a steps interaction; both fixtures load, legacy plans are unchanged and every negative case is refused',async()=>{
 const steps=schema.properties.scenes.items.properties.interactions.items.oneOf.find(o=>o.properties.kind.const==='steps');
 assert.deepEqual(steps.properties.blueprint.required,['questionBlockId','answerBlockId','wholeExplanationId']);assert.equal(steps.required.includes('blueprint'),false);
 for(const locale of ['en','zh-CN']){const p=await blueprintProject(locale);assert.equal(sceneOf(p).interactions[0].blueprint.wholeExplanationId,'pipeline-whole');}
 // Nothing to migrate: a steps interaction without the field keeps its exact behaviour (the render baseline proves the bytes).
 const legacy=await blueprintFixture('en'),plain=structuredClone(legacy);delete plain.plan.scenes[1].interactions[0].blueprint;plain.document.explanations=plain.document.explanations.filter(e=>e.id!=='pipeline-whole');
 delete plain.plan.scenes[1].keyStates;delete plain.plan.scenes[1].staticState;plain.plan.scenes[1].cues=plain.plan.scenes[1].cues.slice(0,3);
 const before=createVisualProject(plain.document,plain.plan,{id:'legacy-steps'});assert.deepEqual(initialInteractionState(compileInteractions(before.document,sceneOf(before))),[{id:'pipeline-parts',kind:'steps',stepId:'step-measure'}]);
 const negative=JSON.parse(await readFile(new URL('./fixtures/visual/s9b.negative.json',import.meta.url),'utf8'));assert.ok(negative.cases.length>=12);
 for(const c of negative.cases){const {document,plan}=structuredClone(legacy),p={document,plan};for(const [path,value]of Object.entries(c.set)){const keys=path.split('.');let o=p;for(const k of keys.slice(0,-1))o=o[/^\d+$/.test(k)?Number(k):k];o[keys.at(-1)]=structuredClone(value);}
  assert.throws(()=>createVisualProject(p.document,p.plan,{id:'negative'}),/./,c.why);}
});

test('S9b stages: Explain → Diagram → Explore follow the cue clock; selecting a part explores it and Show whole returns to Diagram',async()=>{
 const p=await blueprintProject('en'),spec=specOf(p),cues=sceneOf(p).cues,specs=[spec];
 assert.deepEqual(spec.blueprint.whole,{label:'DeckWeft export pipeline',text:p.document.explanations.find(e=>e.id==='pipeline-whole').text});
 const at=n=>seekInteractionState(specs,cues,n)[0];
 assert.deepEqual(at(0),{id:'pipeline-parts',kind:'steps',stage:'explain',stepId:null});
 assert.deepEqual([1,2,3,4,5].map(n=>[at(n).stage,at(n).stepId]),[['diagram',null],['explore','step-measure'],['explore','step-repair'],['explore','step-review'],['explore','step-export']]);
 assert.deepEqual([0,1,2,5].map(stageAt),['explain','diagram','explore','explore']);
 assert.deepEqual(blueprintKeyState(sceneOf(p),3),{stage:'explore',stepId:'step-repair'});
 const pick=(state,stepId)=>reduceInteractionState(specs,state,{event:'step.select',interactionId:spec.id,stepId})[0];
 // From Explain a reader can jump straight to a part, and Show whole returns to the Diagram stage, never to Explain.
 assert.deepEqual(pick([at(0)],'step-review'),{id:'pipeline-parts',kind:'steps',stage:'explore',stepId:'step-review'});
 assert.deepEqual(pick([at(4)],null),{id:'pipeline-parts',kind:'steps',stage:'diagram',stepId:null});
 assert.throws(()=>pick([at(1)],'no-such-part'),/Unknown stable step identity/);
 // The last part stays on Next; without the blueprint field step.select null keeps being refused.
 assert.equal(reduceInteractionState(specs,[at(5)],{event:'step.next',interactionId:spec.id})[0].stepId,'step-export');
 const legacy={...structuredClone(spec)};delete legacy.blueprint;assert.throws(()=>reduceInteractionState([legacy],initialInteractionState([legacy]),{event:'step.select',interactionId:spec.id,stepId:null}),/Unknown stable step identity/);
});

test('S9b static output: every blueprint page carries the whole object, numbered parts and every explanation; the static state adds its statement and part',async()=>{
 for(const locale of ['en','zh-CN'])for(const [keyStateId,stage] of [[null,null],['diagram','diagram'],['explore-measure','explore']]){
  const p=await blueprintProject(locale,{staticState:keyStateId}),out=html(p),markup=pipelineMarkup(out),text=plain(markup),notes=p.document.explanations;
  for(const n of notes)assert.ok(text.includes(n.text),`${locale} ${keyStateId}: ${n.id}`);
  assert.equal((markup.match(/class="blueprint-number"/g)||[]).length,4);assert.match(markup,/<ol class="blueprint-parts">/);assert.match(markup,/data-static-only/);
  assert.equal(markup.includes('static-state-note'),!!stage,keyStateId);
  assert.equal((markup.match(/data-selected="true"/g)||[]).length,stage==='explore'?1:0);
  if(stage==='explore')assert.match(markup,locale==='en'?/Measure, part 1 of 4, against the whole: DeckWeft export pipeline/:/测量（第 1 部分，共 4 部分），对照整体：DeckWeft 导出流程/);
  // The review gate measures the opening plus every blueprint key state (and the static state once).
  assert.deepEqual(out.staticStates.map(s=>s.keyStateId),keyStateId?[keyStateId,...['explain','diagram','explore-measure'].filter(k=>k!==keyStateId)]:['explain','diagram','explore-measure']);
 }
 const config=compileInteractionRuntime((await blueprintProject('en')).document,(await blueprintProject('en')).plan).scenes.find(s=>s.id==='pipeline');
 assert.deepEqual(config.blueprintKeyStates,[{id:'explain',position:0},{id:'diagram',position:1},{id:'explore-measure',position:2}]);
 assert.equal(config.staticState.position,1);
});

test('S9b export order: a blueprint page needs an author-chosen Diagram or Explore static state, measured complete; anything else is refused by name',async()=>{
 const layoutFor=(p,{drop}={})=>{const s=sceneOf(p),b=p.document.blocks.find(b=>b.id==='pipeline-diagram'),notes=p.document.explanations.filter(e=>e.id!==drop);
  return {scenes:[{sceneId:'pipeline',regions:[{blockId:'pipeline-diagram',texts:notes.map(e=>({runs:[{text:e.label+' — '+e.text}]})),diagram:{nodes:b.nodes.map(n=>({texts:[{lines:[{text:n.label}]}]}))}}]}],plan:s};};
 const none=await blueprintProject('en',{staticState:null});
 rejects(()=>assertBlueprintStatic(none.document,none.plan,layoutFor(none)),'BLUEPRINT_STATIC_REQUIRED',/Choose the static state/);
 const explain=await blueprintProject('en',{staticState:'explain'});
 rejects(()=>assertBlueprintStatic(explain.document,explain.plan,layoutFor(explain)),'BLUEPRINT_STATIC_INCOMPLETE',/Explain stage does not show the object/);
 const diagram=await blueprintProject('en');
 rejects(()=>assertBlueprintStatic(diagram.document,diagram.plan,layoutFor(diagram,{drop:'part-review'})),'BLUEPRINT_STATIC_INCOMPLETE',/part-review/);
 rejects(()=>assertBlueprintStatic(diagram.document,diagram.plan,{scenes:[]}),'BLUEPRINT_STATIC_INCOMPLETE',/region/);
 assert.deepEqual(assertBlueprintStatic(diagram.document,diagram.plan,layoutFor(diagram)),[{sceneId:'pipeline',keyStateId:'diagram',stage:'diagram',stepId:null,parts:4,explanations:5}]);
 const explore=await blueprintProject('zh-CN',{staticState:'explore-measure'});
 assert.equal(assertBlueprintStatic(explore.document,explore.plan,layoutFor(explore))[0].stepId,'step-measure');
 // The paged export runs the check in its static-state stage; the HTML web export is not refused (its no-JS view is complete).
 const source=await readFile(new URL('../src/targets/export-order.mjs',import.meta.url),'utf8');assert.match(source,/run\.stage\('static-state',\(\)=>\{const blueprints=assertBlueprintStatic\(document,plan,layout\)/);
 assert.ok(html(none).body.includes('blueprint-parts'));
 // Delivery records name the stage; the notes carry the whole object and every part.
 const states=staticStates(explore.document,explore.plan),frozen=freezeViews(explore.document,explore.plan,states),notes=revealRequired(explore.document,explore.plan,frozen).find(s=>s.sceneId==='pipeline').notes.find(n=>n.kind==='explanations');
 assert.match(frozen.find(s=>s.sceneId==='pipeline').interactions[0].delivery,/Blueprint A at explore: .*part step-measure is marked/);
 assert.equal(notes.lines.length,5);assert.match(notes.lines[0],/^DeckWeft 导出流程——/);
 assert.ok(STATIC_DELIVERY_RULES.find(r=>r.id==='staged-reveal').v3.some(v=>/blueprint A/.test(v)));
});

test('S9b facts stay identical in all six themes and match across languages',async()=>{
 const shape=p=>({blocks:p.document.blocks.map(b=>[b.id,b.type]),explanations:p.document.explanations.map(e=>e.id),scene:{...sceneOf(p),theme:null,themeVersion:null,composition:null,keyStates:sceneOf(p).keyStates.map(k=>[k.id,k.position]),cues:sceneOf(p).cues.map(c=>[c.id,c.event])}});
 for(const locale of ['en','zh-CN']){
  const base=semanticView(await blueprintProject(locale,{id:'facts'}));
  for(const theme of BLUEPRINT_THEMES){const p=await blueprintProject(locale,{theme,id:'facts'});assert.deepEqual(semanticView(p),base,`${theme} ${locale}`);const text=plain(pipelineMarkup(html(p)));for(const e of p.document.explanations)assert.ok(text.includes(e.text),`${theme} ${locale} ${e.id}`);}
 }
 const en=shape(await blueprintProject('en')),zh=shape(await blueprintProject('zh-CN'));
 for(const v of [en,zh])for(const k of ['keyStates','cues'])v.scene[k]=v.scene[k].map(([id,x])=>[id,x]);
 assert.deepEqual(en.blocks,zh.blocks);assert.deepEqual(en.explanations,zh.explanations);assert.deepEqual(en.scene.keyStates,zh.scene.keyStates);assert.deepEqual(en.scene.cues,zh.scene.cues);
});

test('S9b Studio: Make this page Explain → Diagram → Explore uses the page’s own content, keeps existing node steps, honours locks; the opening action refuses and the static state is chosen',async()=>{
 const legacy=await blueprintFixture('en');delete legacy.plan.scenes[1].interactions;delete legacy.plan.scenes[1].cues;delete legacy.plan.scenes[1].keyStates;delete legacy.plan.scenes[1].staticState;legacy.document.explanations=[];
 const base=createVisualProject(legacy.document,legacy.plan,{id:'studio-blueprint'});let n=0;const newId=()=>'id-'+(++n);
 const made=assertVisualProject(addBlueprintA(base,'pipeline',{newId})),s=sceneOf(made),spec=s.interactions[0];
 assert.equal(spec.kind,'steps');assert.deepEqual(spec.blueprint.questionBlockId,'pipeline-question');assert.equal(spec.blueprint.answerBlockId,'pipeline-answer');
 assert.deepEqual(spec.steps.map(v=>v.objectId),['measure','repair','review','export']);assert.equal(s.cues.length,5);assert.deepEqual(s.keyStates.map(k=>[k.position,k.label]),[[0,'Explain'],[1,'Diagram · the whole'],[2,'Explore · Measure']]);
 assert.equal(s.staticState,undefined,'the author chooses the static state');
 const whole=made.document.explanations.find(e=>e.id===spec.blueprint.wholeExplanationId);assert.deepEqual([whole.label,whole.text],['Measure → Repair → Review → Export','4 parts in reading order: Measure, Repair, Review, Export.']);
 assert.deepEqual(made.document.blocks,base.document.blocks,'no block changes');
 // Choosing the static state is the S2 path; the opening action refuses on a blueprint page.
 const chosen=assertVisualProject(useStaticState(made,'pipeline',s.keyStates[1].id));assert.equal(sceneOf(chosen).staticState.keyStateId,s.keyStates[1].id);
 assert.throws(()=>useInteractionOpening(chosen,'pipeline',[{id:spec.id,kind:'steps',stage:'explore',stepId:spec.steps[1].id}],{position:0,exploring:true}),/always opens on Explain/);
 assert.throws(()=>addBlueprintA(made,'pipeline'),/already Explain → Diagram → Explore/);
 // Locks: the scene interaction plan and the diagram block.
 const locked=structuredClone(base);locked.document.authorOverrides.sceneLocks=[{sceneId:'pipeline',fields:['interactions','cues','motion']}];assert.throws(()=>addBlueprintA(locked,'pipeline'),/Unlock this scene interaction plan/);
 const lockedBlock=structuredClone(base);lockedBlock.document.authorOverrides.lockedBlockIds=['pipeline-diagram'];assert.throws(()=>addBlueprintA(lockedBlock,'pipeline'),/Unlock the diagram/);
 assert.throws(()=>addBlueprintA(base,'intro'),/exactly one diagram/);
 // An existing explanation of the nodes is kept (ids and words); one on relationships is refused.
 const prior=await blueprintFixture('zh-CN');delete prior.plan.scenes[1].interactions[0].blueprint;prior.document.explanations=prior.document.explanations.filter(e=>e.id!=='pipeline-whole');delete prior.plan.scenes[1].keyStates;delete prior.plan.scenes[1].staticState;prior.plan.scenes[1].cues=prior.plan.scenes[1].cues.slice(0,3);
 const kept=assertVisualProject(addBlueprintA(createVisualProject(prior.document,prior.plan,{id:'keep'}),'pipeline',{newId}));
 assert.deepEqual(sceneOf(kept).interactions[0].steps.map(v=>v.explanationId),['part-measure','part-repair','part-review','part-export']);assert.equal(kept.document.explanations.find(e=>e.id==='part-review').text,prior.document.explanations.find(e=>e.id==='part-review').text);
 assert.match(sceneOf(kept).cues[1].label,/^查看“测量”$/);
});
