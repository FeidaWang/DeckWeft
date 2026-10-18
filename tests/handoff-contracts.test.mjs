import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertPresentation} from '../src/core/blocks.mjs';
import {assertDesignPlan} from '../src/design/plan.mjs';
import {assertVisualLocks,createVisualProject} from '../src/core/visual-project.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {chartSemantics,datasetSemantics,isPercentUnit} from '../src/components/charts/semantics.mjs';
import {staticStatePosition} from '../src/design/scene-semantics.mjs';
import {declareChartSemantics} from '../src/core/adapters/chart-semantics.mjs';
import {compileCues,staticInteractionState} from '../src/motion/cues.mjs';
import {seekInteractionState} from '../src/motion/timeline.mjs';
import {effectiveMotion} from '../src/motion/policies.mjs';
import {compileInteractionRuntime} from '../src/motion/web.mjs';
import {resolveTheme,themePacks,themeTokens,TOKEN_DEFAULTS} from '../src/design/theme-registry.mjs';
import {validateSchema} from '../src/core/schema.mjs';
import {chartModel} from '../src/components/charts/model.mjs';
import {renderBaseline} from './render-baseline.mjs';
import themeSchema from '../schemas/theme-pack.schema.json' with {type:'json'};
const read=name=>readFile(new URL(`fixtures/visual/${name}`,import.meta.url),'utf8').then(JSON.parse);
const legacy=()=>read('wave-a.en.json'),semantic=()=>read('semantic-chart.en.json');
const rejects=(fn,code,pattern)=>assert.throws(fn,error=>{assert.equal(error.code,code);if(pattern)assert.match(error.message+JSON.stringify(error.details||[]),pattern);return true;});
const html=(d,p)=>exportDeck(d,'html',{experimentalWeb:true,plan:p});
const chartOf=d=>d.blocks.find(b=>b.type==='chart'),datasetOf=d=>d.datasets[0];
const sceneOf=p=>p.scenes.find(s=>s.id==='evidence');

test('S1 legacy v3 fixtures load unchanged and existing HTML, JSON and theme output stay byte-identical',async()=>{
 const baseline=await read('render-baseline.json'),current=await renderBaseline();
 assert.equal(current.renderer,baseline.renderer);
 assert.deepEqual(current.entries,baseline.entries);
 for(const locale of ['en','zh-CN']){
  const raw=await readFile(new URL(`fixtures/visual/wave-a.${locale}.json`,import.meta.url),'utf8'),{document,plan}=JSON.parse(raw);
  assert.equal(assertPresentation(document),document);assertDesignPlan(document,plan);
  assert.equal(document.rules,undefined);assert.equal(datasetOf(document).definition,undefined);
  assert.deepEqual(JSON.parse(exportDeck(document,'json',{experimentalWeb:true}).body),JSON.parse(raw).document);
  assert.deepEqual(datasetSemantics(datasetOf(document)),{id:'adoption-quarterly',unit:'%',percent:true,version:null,collectedAt:null,validPeriod:null,definition:{denominator:null,sample:null,normalized:false,betterDirection:'none'},intervalType:null,intervalLevel:null});
  assert.deepEqual(chartSemantics(chartOf(document),datasetOf(document)),{kind:'line',question:null,takeaway:null,scale:{y:'linear',x:'linear'},sort:'author',truncation:null,intervalSeriesIds:[],eventIds:[],missingReasons:0});
 }
});
test('S1 positive fixture carries semantic, chart, motion and static-state fields on stable ids',async()=>{
 const {document:d,plan:p}=await semantic();
 assertPresentation(d);assertDesignPlan(d,p);
 assert.deepEqual(JSON.parse(exportDeck(d,'json',{experimentalWeb:true}).body),d);
 assert.equal(d.rules.misreading,'strict');
 assert.deepEqual(datasetSemantics(datasetOf(d)).definition,{denominator:'Teams active in the quarter (synthetic)',sample:'n = 240 synthetic teams',normalized:false,betterDirection:'higher'});
 assert.deepEqual(chartSemantics(chartOf(d),datasetOf(d)),{kind:'line',question:d.blocks[6].question,takeaway:d.blocks[6].takeaway,scale:{y:'linear',x:'linear'},sort:'author',truncation:null,intervalSeriesIds:['guided','manual'],eventIds:['guided-launch'],missingReasons:1});
 const scene=sceneOf(p),web=compileWebScenes(d,p).find(s=>s.id==='evidence');
 for(const key of ['takeaway','contentStatus','keyStates','staticState','motion'])assert.deepEqual(web[key],scene[key],key);
 assert.equal(staticStatePosition(scene),0);
 assert.deepEqual(staticInteractionState(d,scene),seekInteractionState(compileCues(d,scene).interactions,scene.cues,0));
 // Declared-but-not-drawn chart semantics are refused for HTML rather than dropped from the figure.
 const refused=presentationCapabilities('html',d,{},p);
 assert.equal(refused.ok,false);assert.deepEqual(refused.issues.map(i=>i.code).sort(),['CHART_EVENTS_UNIMPLEMENTED','CHART_INTERVAL_UNIMPLEMENTED']);
 rejects(()=>html(d,p),'TARGET_CAPABILITY');
 assert.equal(presentationCapabilities('json',d,{},p).ok,true);
 const drawable=structuredClone(d);delete datasetOf(drawable).events;for(const s of datasetOf(drawable).series)delete s.interval;
 assert.equal(presentationCapabilities('html',drawable,{},p).ok,true);
 const out=html(drawable,p);assert.ok(out.body.includes('Missing'));assert.equal(out.body.includes('"interval"'),false);
});
test('S1 negative fixture is rejected and the strict opt-in migration never guesses a denominator',async()=>{
 const negative=await read('semantic-chart.negative.json');
 rejects(()=>assertPresentation(negative.document),'INVALID_PRESENTATION',/denominator of percentage dataset "adoption-quarterly"/);
 const {document:old}=await legacy(),before=JSON.stringify(old);
 rejects(()=>declareChartSemantics(old),'MIGRATION_DECLARATION',/No denominator was inferred/);
 rejects(()=>declareChartSemantics(old,{datasets:{absent:{definition:{denominator:'x'}}}}),'MIGRATION_DECLARATION',/does not exist/);
 const migrated=declareChartSemantics(old,{datasets:{'adoption-quarterly':{definition:{denominator:'Teams active in the quarter (synthetic)'},version:'fixture',collectedAt:'2026-09-30',validPeriod:{from:'2025-04-01',to:'2026-09-30'}}}});
 assert.equal(JSON.stringify(old),before);
 assert.deepEqual(migrated.rules,{misreading:'strict'});assert.equal(datasetOf(migrated).definition.denominator,'Teams active in the quarter (synthetic)');assert.equal(datasetOf(migrated).version,'fixture');
 assert.deepEqual(datasetOf(migrated).series,datasetOf(old).series);
 for(const unit of ['%','％','percent','Percentage points','pct','百分比'])assert.equal(isPercentUnit(unit),true,unit);
 for(const unit of ['hours','% of GDP','小时'])assert.equal(isPercentUnit(unit),false,unit);
 const hours=structuredClone(migrated);datasetOf(hours).unit='hours';delete datasetOf(hours).definition;assertPresentation(hours);
 const bad=structuredClone(migrated);datasetOf(bad).validPeriod={from:'2026-09-30',to:'2025-04-01'};rejects(()=>assertPresentation(bad),'INVALID_PRESENTATION',/ordered valid period/);
 const day=structuredClone(migrated);datasetOf(day).collectedAt='2026-02-30';rejects(()=>assertPresentation(day),'INVALID_PRESENTATION',/real calendar days/);
});
test('S1 guard 1: bars start at zero unless truncation is declared with a note',async()=>{
 const {document:d,plan:p}=await legacy();
 const bars=structuredClone(d);datasetOf(bars).series.pop();chartOf(bars).chartType='ranked-bar';chartOf(bars).axis={policy:'fixed',min:10,max:100};
 rejects(()=>assertPresentation(bars),'INVALID_PRESENTATION',/zero baseline unless truncation/);
 const declared=structuredClone(bars);chartOf(declared).truncation={note:'Axis starts at 10 to separate the top quarters; differences are exaggerated.'};
 assertPresentation(declared);assertDesignPlan(declared,p);
 assert.deepEqual(presentationCapabilities('html',declared,{},p).issues.map(i=>i.code),['CHART_TRUNCATION_UNIMPLEMENTED']);
 const empty=structuredClone(declared);chartOf(empty).truncation={note:''};rejects(()=>assertPresentation(empty),'INVALID_PRESENTATION');
 const zero=structuredClone(declared);chartOf(zero).axis={policy:'zero'};rejects(()=>assertPresentation(zero),'INVALID_PRESENTATION',/still starts at zero/);
 const line=structuredClone(d);chartOf(line).truncation={note:'n/a'};chartOf(line).axis={policy:'extent'};rejects(()=>assertPresentation(line),'INVALID_PRESENTATION',/only for bars, stacks and areas/);
 const extent=structuredClone(declared);chartOf(extent).axis={policy:'extent'};assertPresentation(extent);
});
test('S1 guard 2: log axes are declared per chart, never inherited',async()=>{
 const {document:d,plan:p}=await legacy();
 const log=structuredClone(d);chartOf(log).axis={policy:'extent',scale:'log'};
 assertPresentation(log);assert.equal(chartSemantics(chartOf(log),datasetOf(log)).scale.y,'log');
 assert.deepEqual(presentationCapabilities('html',log,{},p).issues.map(i=>i.code),['CHART_SCALE_UNIMPLEMENTED']);
 const shared=structuredClone(log);shared.blocks.push({id:'linear-twin',type:'chart',sourceIds:[],datasetId:'adoption-quarterly',axis:{policy:'zero',scale:'linear'}});const plan=structuredClone(p);plan.scenes[1].blockIds.push('linear-twin');
 assertDesignPlan(shared,plan);assert.deepEqual(shared.blocks.filter(b=>b.type==='chart').map(b=>chartSemantics(b,datasetOf(shared)).scale.y),['log','linear']);
 const inherited=structuredClone(d);datasetOf(inherited).scale='log';rejects(()=>assertPresentation(inherited),'INVALID_PRESENTATION',/Unknown field/);
 const zero=structuredClone(log);chartOf(zero).axis={policy:'zero',scale:'log'};rejects(()=>assertPresentation(zero),'INVALID_PRESENTATION',/cannot include zero/);
 const fixed=structuredClone(log);chartOf(fixed).axis={policy:'fixed',min:0,max:100,scale:'log'};rejects(()=>assertPresentation(fixed),'INVALID_PRESENTATION',/cannot include zero/);
 const area=structuredClone(log);chartOf(area).chartType='area';rejects(()=>assertPresentation(area),'INVALID_PRESENTATION',/zero baseline|log axis/);const bars=structuredClone(log);chartOf(bars).chartType='ranked-bar';datasetOf(bars).series.pop();chartOf(bars).truncation={note:'declared'};rejects(()=>assertPresentation(bars),'INVALID_PRESENTATION',/cannot sit on a log axis/);
 const nonpositive=structuredClone(log);datasetOf(nonpositive).series[0].values[0]=0;rejects(()=>assertPresentation(nonpositive),'INVALID_PRESENTATION',/strictly positive/);
 const sqrt=structuredClone(log);chartOf(sqrt).axis.scale='sqrt';rejects(()=>assertPresentation(sqrt),'INVALID_PRESENTATION');
});
test('S1 guard 3: percentage denominators are declared once rules.misreading is strict',async()=>{
 const {document:d}=await legacy();
 assertPresentation(d);
 const strict=structuredClone(d);strict.rules={misreading:'strict'};rejects(()=>assertPresentation(strict),'INVALID_PRESENTATION',/denominator/);
 datasetOf(strict).definition={denominator:'Teams active in the quarter (synthetic)'};assertPresentation(strict);
 const loose=structuredClone(d);loose.rules={misreading:'lenient'};rejects(()=>assertPresentation(loose),'INVALID_PRESENTATION');
 const blank=structuredClone(strict);datasetOf(blank).definition.denominator='';rejects(()=>assertPresentation(blank),'INVALID_PRESENTATION');
});
test('S1 guard 4: interval types and levels are never mixed in one dataset',async()=>{
 const {document:d}=await semantic();
 assertPresentation(d);
 const mixed=structuredClone(d);datasetOf(mixed).series[1].interval={type:'sd',method:'Synthetic',lower:[15,19,null,29,35,41],upper:[21,25,null,37,43,49]};rejects(()=>assertPresentation(mixed),'INVALID_PRESENTATION',/never mixed/);
 const levels=structuredClone(d);datasetOf(levels).series[1].interval.level=90;rejects(()=>assertPresentation(levels),'INVALID_PRESENTATION',/never mixed/);
 const unlevelled=structuredClone(d);for(const s of datasetOf(unlevelled).series)delete s.interval.level;rejects(()=>assertPresentation(unlevelled),'INVALID_PRESENTATION',/level between 0 and 100/);
 const sd=structuredClone(d);for(const s of datasetOf(sd).series){s.interval.type='sd';delete s.interval.level;}assertPresentation(sd);
 const sdLevel=structuredClone(sd);datasetOf(sdLevel).series[0].interval.level=1;rejects(()=>assertPresentation(sdLevel),'INVALID_PRESENTATION',/carry no level/);
 const outside=structuredClone(d);datasetOf(outside).series[0].interval.lower[0]=19;rejects(()=>assertPresentation(outside),'INVALID_PRESENTATION',/enclose each value/);
 const gap=structuredClone(d);datasetOf(gap).series[1].interval.lower[2]=20;rejects(()=>assertPresentation(gap),'INVALID_PRESENTATION',/stay null where the value is null/);
 const short=structuredClone(d);datasetOf(short).series[0].interval.upper.pop();rejects(()=>assertPresentation(short),'INVALID_PRESENTATION',/one entry per category/);
 const unknown=structuredClone(d);datasetOf(unknown).series[0].interval.type='stderr';rejects(()=>assertPresentation(unknown),'INVALID_PRESENTATION');
});
test('S1 guard 5: missing values keep their null and carry reasons, never zero',async()=>{
 const {document:d}=await semantic(),before=JSON.stringify(d);
 assertPresentation(d);assert.equal(JSON.stringify(d),before);
 assert.equal(datasetOf(d).series[1].values[2],null);
 assert.deepEqual(chartModel(chartOf(d),datasetOf(d)).domain,[0,78]);
 const coerced=structuredClone(d);datasetOf(coerced).series[1].values[2]='0';rejects(()=>assertPresentation(coerced),'INVALID_PRESENTATION');
 const present=structuredClone(d);datasetOf(present).series[1].values[2]=0;rejects(()=>assertPresentation(present),'INVALID_PRESENTATION',/can only explain a null/);
 const duplicate=structuredClone(d);datasetOf(duplicate).missing.push({...datasetOf(duplicate).missing[0]});rejects(()=>assertPresentation(duplicate),'INVALID_PRESENTATION',/one reason/);
 const positional=structuredClone(d);delete datasetOf(positional).categoryIds;delete datasetOf(positional).events;rejects(()=>assertPresentation(positional),'INVALID_PRESENTATION',/stable categoryIds/);
 const stranger=structuredClone(d);datasetOf(stranger).missing[0].seriesId='absent';rejects(()=>assertPresentation(stranger),'INVALID_PRESENTATION',/existing series and category/);
 const reason=structuredClone(d);datasetOf(reason).missing[0].reason='zero';rejects(()=>assertPresentation(reason),'INVALID_PRESENTATION');
});
test('S1 guard 6: event adjacency is never labelled causal',async()=>{
 const {document:d}=await semantic();
 assertPresentation(d);
 const causal=structuredClone(d);datasetOf(causal).events[0].label='The launch caused the adoption jump';rejects(()=>assertPresentation(causal),'INVALID_PRESENTATION',/cannot assert a cause/);
 const zh=structuredClone(d);datasetOf(zh).events[0].label='上线导致采用率上升';rejects(()=>assertPresentation(zh),'INVALID_PRESENTATION',/cannot assert a cause/);
 const unsourced=structuredClone(d);datasetOf(unsourced).events[0]={...datasetOf(unsourced).events[0],relation:'attributed',sourceIds:[]};rejects(()=>assertPresentation(unsourced),'INVALID_PRESENTATION',/adjacency alone is never a cause/);
 const attributed=structuredClone(d);datasetOf(attributed).events[0]={...datasetOf(attributed).events[0],relation:'attributed',label:'Adoption attributed to the launch in the fixture source'};assertPresentation(attributed);
 const missingSource=structuredClone(attributed);datasetOf(missingSource).events[0].sourceIds=['absent'];rejects(()=>assertPresentation(missingSource),'INVALID_PRESENTATION',/source reference is missing/);
 const causes=structuredClone(d);datasetOf(causes).events[0].relation='causes';rejects(()=>assertPresentation(causes),'INVALID_PRESENTATION');
 const orphan=structuredClone(d);datasetOf(orphan).events[0].categoryId='q9';rejects(()=>assertPresentation(orphan),'INVALID_PRESENTATION',/existing category/);
 const twins=structuredClone(d);datasetOf(twins).events.push({...datasetOf(twins).events[0]});rejects(()=>assertPresentation(twins),'INVALID_PRESENTATION',/unique event ids/);
});
test('S1 scene takeaway, content status and key states build on the authored opening',async()=>{
 const {document:d,plan:p}=await semantic();
 const scene=sceneOf(p);
 const foreign=structuredClone(p);sceneOf(foreign).takeaway={blockId:'cover-title'};rejects(()=>assertDesignPlan(d,foreign),'INVALID_DESIGN_PLAN',/same scene/);
 const chart=structuredClone(p);sceneOf(chart).takeaway={blockId:'data-chart'};rejects(()=>assertDesignPlan(d,chart),'INVALID_DESIGN_PLAN',/heading, paragraph, callout, quote or metric/);
 const sourced=structuredClone(p);sceneOf(sourced).contentStatus='sourced';rejects(()=>assertDesignPlan(d,sourced),'INVALID_DESIGN_PLAN',/synthetic or unsourced/);
 const real=structuredClone(d);datasetOf(real).synthetic=false;assertDesignPlan(real,sourced);
 const unsourcedTakeaway=structuredClone(real);unsourcedTakeaway.blocks.find(b=>b.id==='data-callout').sourceIds=[];rejects(()=>assertDesignPlan(unsourcedTakeaway,sourced),'INVALID_DESIGN_PLAN',/sourced takeaway/);
 const required=structuredClone(p);sceneOf(required).contentStatus='evidence-required';assertDesignPlan(d,required);
 const beyond=structuredClone(p);sceneOf(beyond).keyStates[2].position=3;rejects(()=>assertDesignPlan(d,beyond),'INVALID_DESIGN_PLAN',/cue boundary/);
 const dangling=structuredClone(p);sceneOf(dangling).staticState={keyStateId:'absent'};rejects(()=>assertDesignPlan(d,dangling),'INVALID_DESIGN_PLAN',/static state must name/);
 const twins=structuredClone(p);sceneOf(twins).keyStates.push({id:'opening',position:2});rejects(()=>assertDesignPlan(d,twins),'INVALID_DESIGN_PLAN',/unique key state ids/);
 const fallback=structuredClone(p);delete sceneOf(fallback).staticState;sceneOf(fallback).motion.reducedMotion='static';rejects(()=>assertDesignPlan(d,fallback),'INVALID_DESIGN_PLAN',/named static state/);
 // The opening selection is the frozen filter/focus; a later key state is the state after its cues.
 const later=structuredClone(p);sceneOf(later).staticState={keyStateId:'focused'};assertDesignPlan(d,later);
 assert.equal(staticStatePosition(sceneOf(later)),1);
 const frozen=staticInteractionState(d,sceneOf(later));assert.deepEqual(frozen[0].seriesIds,['guided']);assert.equal(frozen[0].fromId,'q4');
 assert.deepEqual(staticInteractionState(d,scene)[0].seriesIds,['guided','manual']);
 const drawable=structuredClone(d);delete datasetOf(drawable).events;for(const s of datasetOf(drawable).series)delete s.interval;
 // S2 applies a frozen chart selection and the static fallback, so neither placeholder refusal remains (tests/evidence-scene.test.mjs).
 assert.deepEqual(presentationCapabilities('html',drawable,{},later).issues.map(i=>i.code),[]);
 const staticFallback=structuredClone(later);sceneOf(staticFallback).motion.reducedMotion='static';assertDesignPlan(d,staticFallback);
 assert.deepEqual(presentationCapabilities('html',drawable,{},staticFallback).issues.map(i=>i.code),[]);
 const {useInteractionOpening}=await import('../public/studio/interactions.js');
 drawable.authorOverrides.lockedBlockIds=[];const project=createVisualProject(drawable,p,{id:'s1-opening'}),spec=compileCues(project.document,sceneOf(project.plan)).interactions[0];
 const opened=useInteractionOpening(project,'evidence',[{id:spec.id,seriesIds:['manual'],fromId:'q2',toId:'q5'}]);
 assert.deepEqual(staticInteractionState(opened.document,sceneOf(opened.plan))[0],{id:spec.id,kind:'chart-select',seriesIds:['manual'],fromId:'q2',toId:'q5'});
 assert.deepEqual(sceneOf(opened.plan).keyStates,scene.keyStates);
});
test('S1 motion declarations stay compatible with effectiveMotion and the runtime config',async()=>{
 const {document:d,plan:p}=await semantic();
 const base={policy:'subtle',durationMs:240},declared=sceneOf(p).motion;
 for(const options of [{},{reduced:true},{visible:false},{active:false}])assert.deepEqual(effectiveMotion({...declared,...options}),effectiveMotion({...base,...options}));
 assert.deepEqual(effectiveMotion(declared),{enabled:true,durationMs:240});
 const runtime=compileInteractionRuntime(d,p).scenes.find(s=>s.id==='evidence');
 assert.deepEqual(runtime.motion,declared);
 for(const change of [m=>m.trigger='scroll',m=>m.clock='media',m=>m.reducedMotion='pause',m=>m.durationMs=401]){const plan=structuredClone(p);change(sceneOf(plan).motion);rejects(()=>assertDesignPlan(d,plan),'INVALID_DESIGN_PLAN');}
});
test('S1 theme token roles default to the current rendering and no packaged theme declares them yet',async()=>{
 const styles=await readFile(new URL('../src/render/web/art-direction.mjs',import.meta.url),'utf8'),resources=await readFile(new URL('../public/runtime/resources.js',import.meta.url),'utf8');
 assert.ok(styles.includes(`margin-top:${TOKEN_DEFAULTS.captionGap}px`));assert.ok(resources.includes(`translateY(${TOKEN_DEFAULTS.motion.distance}px)`));assert.ok(resources.includes(`easing:'${TOKEN_DEFAULTS.motion.easing}'`));
 for(const pack of themePacks())for(const locale of ['en','zh-CN']){
  const tokens=themeTokens(pack.id,locale);
  assert.deepEqual(tokens,{id:pack.id,version:pack.version,typography:{numeric:locale==='zh-CN'?pack.typography.bodyZh:pack.typography.bodyEn},palette:{reference:pack.palette.ink,missing:pack.palette.ink},spacing:{captionGap:14,sectionGap:pack.spacing.gap,safeArea:pack.spacing.page},motion:{distance:4,easing:'ease-out',delay:0,fallback:'instant'},declared:{typography:false,reference:false,missing:false,spacing:[],motion:[]}});
  assert.deepEqual(Object.keys(resolveTheme(pack.id,pack.version,locale)).sort(),['accent','body','chart','code','colorIntensity','compositions','display','displayScale','gap','id','ink','locale','motion','page','paper','rules','secondary','split','version']);
 }
 const declared=structuredClone(themePacks()[0]);Object.assign(declared.typography,{numeric:'"Helvetica Neue", Arial, sans-serif'});Object.assign(declared.palette,{reference:'#888888',missing:'#BBBBBB'});Object.assign(declared.spacing,{captionGap:10,sectionGap:48,safeArea:64});Object.assign(declared.motion,{distance:8,easing:'ease-in-out',delay:40,fallback:'static'});
 assert.equal(validateSchema(declared,themeSchema).ok,true);
 for(const change of [t=>t.motion.easing='cubic-bezier(.2,0,0,1)',t=>t.motion.distance=81,t=>t.palette.missing='gray',t=>t.spacing.safeArea=-1,t=>t.motion.fallback='none']){const pack=structuredClone(declared);change(pack);assert.equal(validateSchema(pack,themeSchema).ok,false);}
 rejects(()=>themeTokens('absent'),'THEME_VERSION');
});
test('S1 lock categories map onto existing block, dataset, source and scene locks',async()=>{
 const {document:d,plan:p}=await semantic();
 delete datasetOf(d).events;for(const s of datasetOf(d).series)delete s.interval;
 d.authorOverrides={lockedBlockIds:['data-chart','data-callout'],sceneLocks:[{sceneId:'evidence',fields:['composition','interactions','cues','motion']}]};
 const project=createVisualProject(d,p,{id:'s1-locks'});
 const changed=mutate=>{const next=structuredClone(project);mutate(next);return next;};
 rejects(()=>assertVisualLocks(project,changed(n=>n.document.blocks.find(b=>b.id==='data-callout').text='Edited takeaway')),'AUTHOR_LOCK');
 rejects(()=>assertVisualLocks(project,changed(n=>n.document.datasets[0].series[0].values[0]=1)),'AUTHOR_LOCK');
 rejects(()=>assertVisualLocks(project,changed(n=>n.document.datasets[0].definition.denominator='Another denominator')),'AUTHOR_LOCK');
 rejects(()=>assertVisualLocks(project,changed(n=>n.document.sources[0].title='Renamed source')),'AUTHOR_LOCK');
 rejects(()=>assertVisualLocks(project,changed(n=>sceneOf(n.plan).composition='reading-flow')),'AUTHOR_LOCK');
 rejects(()=>assertVisualLocks(project,changed(n=>sceneOf(n.plan).motion.reducedMotion='static')),'AUTHOR_LOCK');
 assertVisualLocks(project,changed(n=>n.document.blocks.find(b=>b.id==='data-body').text='Unlocked paragraph edit'));
 assertVisualLocks(project,changed(n=>sceneOf(n.plan).keyStates.push({id:'extra',position:2})));
});
