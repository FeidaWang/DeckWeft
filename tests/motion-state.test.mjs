import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createInteractionDemo} from '../src/core/interaction-demo.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {assertDesignPlan} from '../src/design/plan.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {blockHTML} from '../src/render/web/components/blocks.mjs';
import {staticChartHTML} from '../src/render/web/static-state.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {compileCues,assertSceneInteractions,SEMANTIC_EVENTS,staticInteractionState} from '../src/motion/cues.mjs';
import {initialInteractionState,reduceInteractionState,seekInteractionState} from '../src/motion/timeline.mjs';
import {createCueClock} from '../src/motion/clock.mjs';
import {MOTION_PRIMITIVES,REDUCED_MOTION_RESULTS,motionPlan} from '../src/motion/primitives.mjs';
import {resolveTheme,themePacks} from '../src/design/theme-registry.mjs';
import {objectAnchor} from '../src/components/annotations/identity.mjs';
import {createSceneResources} from '../public/runtime/resources.js';
import {focusTheme,captionText} from '../public/runtime/charts.js';
import {turnsPage} from '../public/runtime/keys.js';
import {useInteractionOpening} from '../public/studio/interactions.js';
import {startStudio} from '../src/services/server.mjs';
import {evidenceProject} from './evidence-scene.mjs';
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s5-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const demo=async(locale='en')=>{const p=await createInteractionDemo(locale,home);return {p,resources:await visualAssetResources(p,home)};};
const sceneOf=(p,id)=>p.plan.scenes.find(s=>s.id===id);
const section=(body,id)=>body.slice(body.indexOf(`<section id="${id}"`),body.indexOf('</section>',body.indexOf(`<section id="${id}"`)));
const html=(p,resources)=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources});
const changed=(a,b)=>Object.keys(b).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).sort();
const ratio=(a,b)=>{const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),l=c=>{const v=rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('S5 EvidenceStage keeps dataset, metric, shown series, focus, range, order, scale and caption as separate state',async()=>{
 const {p}=await demo(),scene=sceneOf(p,'component-line'),{interactions:specs}=compileCues(p.document,scene),spec=specs[0],at=e=>reduceInteractionState(specs,state,{interactionId:spec.id,...e})[0];
 let state=initialInteractionState(specs);const opening=state[0];
 assert.deepEqual(Object.keys(opening),['id','kind','datasetId','metricId','seriesIds','focusSeriesId','fromId','toId','sortKey','scale','caption']);
 assert.deepEqual({datasetId:opening.datasetId,metricId:opening.metricId,sortKey:opening.sortKey,scale:opening.scale,focusSeriesId:opening.focusSeriesId},{datasetId:p.document.blocks.find(b=>b.id==='component-line').datasetId,metricId:null,sortKey:'author',scale:{y:'linear',x:'linear'},focusSeriesId:null});
 // Focus one series: only the focus and the caption subject change; nothing is hidden.
 const focused=at({event:'data.focus',seriesId:'reviewed'});assert.deepEqual(changed(opening,focused),['caption','focusSeriesId']);assert.deepEqual(focused.seriesIds,['local','reviewed']);assert.deepEqual(focused.caption,{categoryId:'delta',seriesIds:['reviewed']});
 // Hide one series: the shown series change; the focus is kept while its series stays shown.
 state=[focused];const hidden=at({event:'data.filter',seriesIds:['reviewed'],fromId:'alpha',toId:'delta'});assert.deepEqual(changed(focused,hidden),['seriesIds']);assert.equal(hidden.focusSeriesId,'reviewed');
 // Hiding the focused series ends the focus; it never moves to another series.
 const gone=at({event:'data.filter',seriesIds:['local'],fromId:'alpha',toId:'delta'});assert.equal(gone.focusSeriesId,null);assert.deepEqual(gone.seriesIds,['local']);assert.deepEqual(gone.caption,{categoryId:'delta',seriesIds:['local']});
 state=[gone];assert.throws(()=>at({event:'data.focus',seriesId:'reviewed'}),/Show a series before focusing it/);assert.throws(()=>at({event:'data.focus',seriesId:'absent'}),/Show a series/);
 const range=at({event:'data.filter',seriesIds:['local'],fromId:'beta',toId:'gamma'});assert.deepEqual(changed(gone,range),['caption','fromId','toId']);assert.equal(range.caption.categoryId,'gamma');
 const cleared=reduceInteractionState(specs,[focused],{interactionId:spec.id,event:'data.focus'})[0];assert.deepEqual(cleared,opening,'clearing the focus returns exactly to the opening');
 // No event changes the declarations; metric switch, interactive sort and scale shift are not drawn yet.
 for(const event of ['data.sort','data.metric','data.scale'])assert.throws(()=>at({event,sortKey:'value-asc'}),/does not apply/);
 const heat=compileCues(p.document,sceneOf(p,'component-heatmap')).interactions;assert.throws(()=>reduceInteractionState(heat,initialInteractionState(heat),{event:'data.focus',interactionId:heat[0].id,seriesId:'local'}),/not drawn on heatmaps/);
 for(const s of p.plan.scenes.filter(s=>s.interactions?.length)){const c=compileCues(p.document,s);for(let i=0;i<=c.cues.length;i++)for(const v of seekInteractionState(c.interactions,c.cues,i).filter(v=>v.kind==='chart-select')){const o=initialInteractionState(c.interactions).find(x=>x.id===v.id);assert.deepEqual([v.datasetId,v.metricId,v.sortKey,v.scale],[o.datasetId,o.metricId,o.sortKey,o.scale]);}}
});

test('S5 data.focus cues and an authored opening focus are validated by schema and reducer; legacy plans load unchanged',async()=>{
 const {p}=await demo();assertVisualProject(p);
 const with_=structuredClone(p),scene=sceneOf(with_,'component-line');scene.cues.splice(1,0,{id:'focus-local',event:'data.focus',interactionId:'select-line',seriesId:'local',label:'Focus on Local'});scene.interactions[0].initialFocusSeriesId='reviewed';
 assertVisualProject(with_);assertDesignPlan(with_.document,with_.plan);
 const s=compileCues(with_.document,scene);assert.equal(seekInteractionState(s.interactions,s.cues,0)[0].focusSeriesId,'reviewed');assert.equal(seekInteractionState(s.interactions,s.cues,1)[0].focusSeriesId,null,'cue 1 hides the focused series');assert.equal(seekInteractionState(s.interactions,s.cues,2)[0].focusSeriesId,'local');
 const bad=structuredClone(with_);sceneOf(bad,'component-line').interactions[0].initialSeriesIds=['local'];assert.throws(()=>assertSceneInteractions(bad.document,sceneOf(bad,'component-line')),/Show a series before focusing it/);
 const hiddenFocus=structuredClone(p);sceneOf(hiddenFocus,'component-line').cues.splice(1,0,{id:'focus-hidden',event:'data.focus',interactionId:'select-line',seriesId:'reviewed'});assert.throws(()=>assertSceneInteractions(hiddenFocus.document,sceneOf(hiddenFocus,'component-line')),/Show a series before focusing it/);
 for(const change of [c=>c.seriesId=7,c=>c.seriesIds=['local'],c=>c.event='data.focused']){const q=structuredClone(with_);change(sceneOf(q,'component-line').cues[1]);assert.throws(()=>assertDesignPlan(q.document,q.plan));}
 assert.ok(SEMANTIC_EVENTS.includes('data.focus'));
});

test('S5 focus and hide are drawn differently, and static output freezes the author focus',async()=>{
 const {p,resources}=await demo(),block=p.document.blocks.find(b=>b.id==='component-line'),d=p.document.datasets.find(v=>v.id===block.datasetId),scene=sceneOf(p,'component-line');
 const theme=resolveTheme(scene.theme,scene.themeVersion,'en',{profile:p.document.visualBrief.profile}),specs=compileCues(p.document,scene).interactions,state=initialInteractionState(specs)[0],keyState={id:'k',label:'Key'};
 const focus={...state,focusSeriesId:'reviewed'},hide={...state,seriesIds:['reviewed']},legend=m=>[...m.matchAll(/<li(?: data-muted="true")?><svg class="legend-key"[^>]*><path d="[^"]*" stroke="([^"]+)"[\s\S]*?<\/svg>([^<]+)<\/li>/g)].map(x=>[x[2],x[1]]);
 const focused=staticChartHTML(block,p.document,theme,{sceneId:scene.id,state:focus,keyState}),filtered=staticChartHTML(block,p.document,theme,{sceneId:scene.id,state:hide,keyState});
 // Focus keeps both series (legend, marks and values). A line draws the reader's focus as a declared series focus (layered rule): the legend names the focus, the other series is lighter and keeps its colour.
 assert.deepEqual(legend(focused).map(([l])=>l),['Local','Reviewed · Focus']);assert.deepEqual(legend(focused).map(([,c])=>c),theme.chart.slice(0,2));assert.match(focused,/<li data-muted="true"><svg class="legend-key"[^>]*>[\s\S]*?<\/svg>Local<\/li>/);
 assert.equal((focused.match(/data-series-id="local"/g)||[]).length,4);assert.match(focused,/Static view · Key: [^<]*\. Focus: Reviewed\. Complete data below\./);
 // A missing value is named without a unit (the S2 statement said "Missing hours").
 const nullAt=d.series[0].values.indexOf(null);assert.ok(nullAt>=0);assert.ok(focused.includes(`${d.categories[nullAt]} (Local Missing; `));assert.equal(focused.includes('Missing\u00a0'),false);assert.equal((focused.match(/data-excluded-anchor/g)||[]).length,0);
 // Hide removes the series from legend and marks; its values keep their anchors in the complete table.
 assert.deepEqual(legend(filtered).map(([l])=>l),['Reviewed']);assert.equal(legend(filtered)[0][1],theme.chart[1],'a hidden series never takes another palette slot');
 const plot=filtered.slice(0,filtered.indexOf('<details>'));assert.equal(plot.includes('data-series-id="local"'),false);for(const id of d.categoryIds)assert.ok(filtered.includes(`id="${objectAnchor(scene.id,block.id,id,'local')}" data-excluded-anchor="true"`));
 assert.equal(focusTheme(theme,d,state),theme,'no focus, no change');
 for(const pack of themePacks()){const t=resolveTheme(pack.id,pack.version,'en'),muted=focusTheme(t,d,{focusSeriesId:'reviewed'});assert.equal(muted.chart[1],t.chart[1]);assert.ok(ratio(muted.chart[0],t.paper)>=3-1e-9,pack.id);assert.deepEqual(muted.chart.slice(2),t.chart.slice(2));}
 // An authored key state with a focus is frozen in the exported file and in the runtime data.
 const q=structuredClone(p),s=sceneOf(q,'component-line');s.cues.splice(1,1,{id:'focus-reviewed',event:'data.focus',interactionId:'select-line',seriesId:'reviewed',label:'Focus on Reviewed'});s.cues.splice(0,1);
 s.keyStates=[{id:'opening',position:0},{id:'focus',position:1,label:'Reviewed in focus'}];s.staticState={keyStateId:'focus'};assertVisualProject(q);
 assert.equal(staticInteractionState(q.document,s)[0].focusSeriesId,'reviewed');const out=html(q,resources),markup=section(out.body,'component-line');
 assert.match(markup,/<p class="component-note static-state-note" data-static-state="focus">Static view · Reviewed in focus: [^<]*\. Focus: Reviewed\. Complete data below\.<\/p>/);assert.deepEqual(legend(markup.slice(0,markup.indexOf('<details>'))).map(([l])=>l),['Local','Reviewed · Focus']);
 assert.deepEqual(presentationCapabilities('html',q.document,resources,q.plan).issues,[]);
});

test('S5 C4 the chart explanation line follows the focus, not the last author-order category',async()=>{
 for(const locale of ['en','zh-CN']){
  const project=await evidenceProject(locale,{staticState:'structure-first'}),scene=project.plan.scenes[0],d=project.document.datasets[0],{interactions:specs,cues}=compileCues(project.document,scene);
  const lines=[0,1,2].map(i=>captionText(d,seekInteractionState(specs,cues,i)[0],locale)),colon=locale==='zh-CN'?'：':': ',top=d.categories[0];
  // Ranked bar: the top rank of the current view at every key state (the S2 build said "No set habit 9 %" here).
  for(const line of lines){assert.ok(line.startsWith(top+colon),line);assert.ok(line.includes('38 %'),line);assert.equal(line.includes(d.categories.at(-1)),false);}
  const tail=reduceInteractionState(specs,initialInteractionState(specs),{event:'data.filter',interactionId:specs[0].id,seriesIds:['reduction'],fromId:'data-first',toId:'no-habit'});assert.ok(captionText(d,tail[0],locale).startsWith(d.categories[2]+colon));
 }
 const {p}=await demo(),scene=sceneOf(p,'component-line'),specs=compileCues(p.document,scene).interactions,d=p.document.datasets.find(v=>v.id===specs[0].datasetId),state=initialInteractionState(specs);
 // Other kinds keep the last category in view (the latest, for time); a focus narrows the line to the focused series.
 assert.equal(captionText(d,state[0],'en'),`${d.categories.at(-1)}: Local ${d.series[0].values.at(-1)} hours · Reviewed ${d.series[1].values.at(-1)} hours`);
 assert.equal(captionText(d,reduceInteractionState(specs,state,{event:'data.focus',interactionId:specs[0].id,seriesId:'reviewed'})[0],'en'),`${d.categories.at(-1)}: Reviewed ${d.series[1].values.at(-1)} hours`);
});

test('S5 six motion primitives sit on existing cues, each with a declared reduced-motion result and a deterministic plan',async()=>{
 assert.deepEqual(Object.keys(MOTION_PRIMITIVES),['FadeIn','SlideSmall','Crossfade','RevealMask','SeriesReveal','AnnotationReveal']);
 for(const [name,p] of Object.entries(MOTION_PRIMITIVES)){
  assert.ok(Object.hasOwn(REDUCED_MOTION_RESULTS,p.reducedMotion),name);assert.ok(p.maxMs<=400,name);assert.ok(p.cues.length,name);
  for(const cue of p.cues)assert.ok([...SEMANTIC_EVENTS,'step.select'].includes(cue),name+' '+cue);
  assert.equal(p.frames.length,2);assert.ok(['1','none','inset(0 0 0 0)'].includes(String(Object.values(p.frames[1])[0])),name+': the final frame is the element’s own state');
 }
 assert.deepEqual(Object.fromEntries(Object.entries(MOTION_PRIMITIVES).map(([k,v])=>[k,v.reducedMotion])),{FadeIn:'content-visible',SlideSmall:'content-visible',Crossfade:'target-layout',RevealMask:'full-graphic',SeriesReveal:'full-graphic',AnnotationReveal:'full-graphic'});
 for(const event of SEMANTIC_EVENTS.filter(e=>e!=='scene.exit'))assert.ok(Object.values(MOTION_PRIMITIVES).some(p=>p.cues.includes(event)),event);
 // The same cue sequence always gives the same plan, whether reached by play, seek or replay.
 const {p}=await demo(),plans=()=>p.plan.scenes.filter(s=>s.cues?.length).map(s=>{const c=compileCues(p.document,s);return c.cues.map((cue,i)=>motionPlan(c.interactions.find(v=>v.id===cue.interactionId),seekInteractionState(c.interactions,c.cues,i).find(v=>v.id===cue.interactionId),seekInteractionState(c.interactions,c.cues,i+1).find(v=>v.id===cue.interactionId),cue));});
 const first=plans();assert.deepEqual(plans(),first);
 const used=new Set(first.flat(2).map(step=>step.primitive));for(const name of ['SlideSmall','SeriesReveal','RevealMask','FadeIn','Crossfade','AnnotationReveal'])assert.ok(used.has(name)||name==='SlideSmall',name);
 const line=compileCues(p.document,sceneOf(p,'component-line')),all=initialInteractionState(line.interactions)[0],one={...all,seriesIds:[]};
 assert.deepEqual(motionPlan(line.interactions[0],one,all,{event:'data.filter'}).map(s=>[s.primitive,s.target.seriesId??s.target.kind,s.delay]),[['SeriesReveal','local',0],['SeriesReveal','reviewed',60],['SlideSmall','explanation',0]]);
 assert.deepEqual(motionPlan(null,null,null,{event:'scene.enter'}),[{primitive:'SlideSmall',target:{kind:'regions'},delay:0}]);
 // Reduced, hidden or inactive scenes animate nothing: the content is already in its final state. Enabled motion uses the named frames within the cap.
 const calls=[],node={animate:(frames,options)=>{calls.push({frames,options});return {finished:Promise.resolve(),cancel(){}};}},r=createSceneResources();
 for(const name of Object.keys(MOTION_PRIMITIVES))r.animate(node,{enabled:false,durationMs:0},name);assert.equal(calls.length,0);
 r.animate(node,{enabled:true,durationMs:400},'FadeIn');r.animate(node,{enabled:true,durationMs:400},'SeriesReveal',60);r.animate(node,{enabled:true,durationMs:240},'RevealMask');
 assert.deepEqual(calls.map(c=>[c.options.id,c.frames,c.options.duration,c.options.delay,c.options.fill]),[['FadeIn',MOTION_PRIMITIVES.FadeIn.frames,220,0,'none'],['SeriesReveal',MOTION_PRIMITIVES.SeriesReveal.frames,340,60,'backwards'],['RevealMask',MOTION_PRIMITIVES.RevealMask.frames,240,0,'none']]);
 r.dispose();assert.deepEqual(r.snapshot(),{animations:0,timers:0,registered:0});
});

test('S5 one clock: play, pause, seek, next, previous, restart and reduced motion share one position and one timer',()=>{
 const run=script=>{
  const timers=[],log=[];let now=0;const schedule=(fn,ms)=>{const t={fn,at:now+ms,live:true};timers.push(t);return ()=>{t.live=false;};},pending=()=>timers.filter(t=>t.live).length,advance=ms=>{now+=ms;for(const t of timers.filter(t=>t.live&&t.at<=now)){t.live=false;t.fn();}};
  const clock=createCueClock({count:3,schedule,apply:(position,reason)=>log.push(reason+':'+position),staticState:{keyStateId:'k',position:2,reducedMotion:'static'}});
  for(const step of script){const [name,arg]=step.split(' ');if(name==='wait')advance(Number(arg));else clock[name](arg===undefined?undefined:name==='setReduced'?arg==='true':Number(arg));log.push(`[${clock.position}${clock.playing?' playing':''}${clock.exploring?' exploring':''} timers=${pending()}]`);assert.ok(pending()<=1,'never more than one pending cue timer');}
  return log;
 };
 const script=['restart','wait 1000','pause','wait 5000','play','wait 1000','wait 1000','play','previous','next','seek 1','explore','play','pause','setReduced true','play','restart','next','setReduced false','restart','wait 500','next','pause'];
 const log=run(script);assert.deepEqual(run(script),log,'the same commands give the same states');
 assert.deepEqual(log,['restart:0','[0 playing timers=1]','play:1','[1 playing timers=1]','[1 timers=0]','[1 timers=0]','[1 playing timers=1]','play:2','[2 playing timers=1]','play:3','[3 timers=0]','restart:0','[0 playing timers=1]','previous:0','[0 timers=0]','next:1','[1 timers=0]','seek:1','[1 timers=0]','[1 exploring timers=0]','restart:0','[0 playing timers=1]','[0 timers=0]','static:2','[2 timers=0]','[2 timers=0]','[2 timers=0]','next:3','[3 timers=0]','[3 timers=0]','restart:0','[0 playing timers=1]','[0 playing timers=1]','next:1','[1 timers=0]','[1 timers=0]']);
 // Fast paging: every command cancels the previous scene's timer before anything else runs, so nothing is left behind.
 const r=createSceneResources(),clock=createCueClock({count:4,schedule:(fn,ms)=>r.schedule(fn,ms),apply(){}});
 for(let i=0;i<20;i++){clock.restart();clock.next();clock.play();assert.equal(r.snapshot().timers,1);clock.pause();r.dispose();}
 assert.deepEqual(r.snapshot(),{animations:0,timers:0,registered:0});assert.equal(clock.pending,0);
});

test('S5 C14 page keys never apply while a control, link, slider, tab or focusable chart mark has focus',()=>{
 // A small element model with the same closest() semantics for the guard's selector list (tag names and attribute tests).
 const el=(tag,attrs={},parent=null)=>({nodeType:1,tag,attrs,parentElement:parent,closest(list){for(let n=this;n;n=n.parentElement)if(list.split(',').some(sel=>match(n,sel.trim())))return n;return null;}});
 const match=(n,sel)=>{const m=sel.match(/^([a-z]*)((?:\[[^\]]+\]|:not\(\[[^\]]+\]\))*)$/);if(!m)throw Error(sel);if(m[1]&&m[1]!==n.tag)return false;for(const [,neg,name,value] of m[2].matchAll(/(:not\()?\[([a-z-]+)(?:="([^"]*)")?\]\)?/g)){const ok=Object.hasOwn(n.attrs,name)&&(value===undefined||n.attrs[name]===value);if(neg?ok:!ok)return false;}return true;};
 const body=el('body'),scene=el('section',{},body),region=el('div',{},scene),svg=el('svg',{role:'img'},region),mark=el('g',{tabindex:'-1'},svg),rect=el('rect',{},mark),label=el('text',{},svg);
 const key=(target,extra={})=>turnsPage({key:'ArrowRight',target,...extra});
 for(const target of [mark,rect,el('input',{type:'range'},region),el('select',{},region),el('button',{},region),el('summary',{},region),el('a',{href:'#x'},region),el('div',{role:'tab'},region),el('div',{tabindex:'0',role:'tabpanel'},region),el('p',{contenteditable:'true'},region)])assert.equal(key(target),false,target.tag+JSON.stringify(target.attrs));
 // The old pattern matched any tag containing "A" (SPAN, MAIN, TABLE) and missed lowercase SVG tags; both are fixed.
 for(const target of [body,scene,region,label,el('span',{},region),el('main',{},body),el('table',{},region),el('p',{contenteditable:'false'},region)])assert.equal(key(target),true,target.tag);
 for(const extra of [{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{defaultPrevented:true}])assert.equal(key(region,extra),false,JSON.stringify(extra));
 assert.equal(turnsPage({key:'ArrowRight',target:{nodeType:3,parentElement:mark}}),false,'a text node inside a mark');
});

test('S5 C20 Studio refuses to copy the state the preview opened on unless the author explored it or is at the opening',async()=>{
 const project=await evidenceProject('en',{staticState:'structure-first'}),scene=project.plan.scenes[0],{interactions:specs,cues}=compileCues(project.document,scene),atStatic=seekInteractionState(specs,cues,1);
 assert.throws(()=>useInteractionOpening(project,'evidence',atStatic,{position:1,exploring:false,staticPosition:1}),/cue position 1 \(the static state\), not an explored selection/);
 assert.throws(()=>useInteractionOpening(project,'evidence',atStatic,{position:2,exploring:false,staticPosition:1}),/cue position 2, not an explored/);
 assert.throws(()=>useInteractionOpening(project,'evidence',atStatic),/Refresh the current preview/);
 const explored=useInteractionOpening(project,'evidence',atStatic,{position:1,exploring:true,staticPosition:1});assert.equal(explored.plan.scenes[0].interactions[0].initialToId,'data-first');
 const opening=useInteractionOpening(project,'evidence',seekInteractionState(specs,cues,0),{position:0,exploring:false,staticPosition:1});assert.deepEqual(staticInteractionState(opening.document,{...opening.plan.scenes[0],staticState:{keyStateId:'opening'}}),seekInteractionState(specs,cues,0),'position 0 keeps the opening');
 const {p}=await demo(),line=compileCues(p.document,sceneOf(p,'component-line')).interactions,focused=reduceInteractionState(line,initialInteractionState(line),{event:'data.focus',interactionId:'select-line',seriesId:'reviewed'});
 const kept=useInteractionOpening(p,'component-line',focused,{position:0,exploring:true});assert.equal(sceneOf(kept,'component-line').interactions[0].initialFocusSeriesId,'reviewed');assertVisualProject(kept);
 assert.equal(sceneOf(useInteractionOpening(kept,'component-line',initialInteractionState(line),{position:0,exploring:true}),'component-line').interactions[0].initialFocusSeriesId,undefined);
});

test('S5 C8 frozen steps, comparison tabs and hotspots are drawn without JavaScript; scenes without a static state keep their markup',async()=>{
 for(const locale of ['en','zh-CN']){
  const {p,resources}=await demo(locale),before=html(p,resources),zh=locale==='zh-CN',q=structuredClone(p);
  const freeze=(id,position)=>{const s=sceneOf(q,id);s.keyStates=[{id:'opening',position:0},{id:'frozen',position,label:zh?'冻结':'Frozen'}];s.staticState={keyStateId:'frozen'};};
  freeze('component-process',1);freeze('component-code',1);freeze('image-comparison',2);freeze('violet',1);assertVisualProject(q);
  assert.deepEqual(presentationCapabilities('html',q.document,resources,q.plan).issues,[]);
  const out=html(q,resources),note=id=>section(out.body,id).match(/<p class="component-note static-state-note" data-static-state="frozen">([^<]+)<\/p>/)?.[1];
  // Diagram: the second step's relationship and both ends are marked, and the statement gives its label and text.
  const process=section(out.body,'component-process'),flow=q.plan.scenes.find(s=>s.id==='component-process').interactions[0],step=flow.steps[1],text=q.document.explanations.find(e=>e.id===step.explanationId),block=q.document.blocks.find(b=>b.id==='component-process'),edge=block.edges.find(e=>e.id===step.objectId);
  for(const id of [edge.id,edge.from,edge.to])assert.ok(process.includes(`<g id="${objectAnchor('component-process',block.id,id)}" class="semantic-step-target"`),id);
  assert.ok(note('component-process').includes(text.label)&&note('component-process').includes(text.text.replaceAll("'",'&#39;')));
  // Code: the referenced source lines are marked; the exact source stays intact.
  const code=section(out.body,'component-code');assert.match(code,/data-line="3" class="code-emphasis semantic-step-target"/);assert.ok(note('component-code').includes(zh?'原文行：3':'source lines 3'));
  // Comparison at "second": the second image stays; the first moves into a closed original-image disclosure.
  const compare=section(out.body,'image-comparison');assert.match(compare,new RegExp(`<details data-static-wrapper><summary>${zh?'第一张原始图片':'First original image'}</summary><figure class="web-image"`));assert.equal((compare.match(/data-static-wrapper/g)||[]).length,1);assert.ok(note('image-comparison'));
  // Hotspots at "paper": numbered markers at the authored positions, the open one marked, its annotation in the statement.
  const violet=section(out.body,'violet'),spots=sceneOf(q,'violet').interactions[0].hotspots;assert.equal((violet.match(/class="image-hotspot static-hotspot" data-static-only aria-hidden="true"/g)||[]).length,spots.length);assert.equal((violet.match(/data-active="true"/g)||[]).length,1);
  assert.ok(note('violet').includes(q.document.blocks.find(b=>b.id===spots[0].annotationId).text)&&note('violet').includes(`${spots[0].x}, ${spots[0].y}`));
  // Scenes without a static state are unchanged; the opening state at position 0 is drawn as well when it is declared.
  for(const id of ['component-line','component-relationship','collage'])assert.equal(section(out.body,id),section(before.body,id));
  freeze('component-process',0);const zero=section(html(q,resources).body,'component-process');assert.ok(zero.includes(`class="semantic-step-target"`));
 }
});

test('S5 C7 decision: without a static state the no-JavaScript view draws the complete authored data; an explicit opening static state freezes it',async()=>{
 const project=await evidenceProject('en'),scene=project.plan.scenes[0];delete scene.staticState;scene.motion.reducedMotion='instant';scene.interactions[0].initialToId='data-first';assertVisualProject(project);
 const bars=p=>{const m=section(exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan}).body,'evidence');const plot=m.slice(m.indexOf('<figure class="chart"'),m.indexOf('<details>',m.indexOf('<figure class="chart"')));return (plot.match(/<li class="chart-row"/g)||[]).length;};
 assert.equal(bars(project),6,'absent staticState: the complete dataset, never a silent subset');
 const explicit=structuredClone(project);explicit.plan.scenes[0].staticState={keyStateId:'opening'};assert.equal(bars(explicit),3,'a declared opening static state freezes the authored opening');
});

test('S5 C5 the review gate needs a passing measurement of every declared static state besides the opening',async t=>{
 const studioHome=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s5-gate-'))),app=await startStudio({home:studioHome,port:0,seed:false});t.after(async()=>{await app.close();await rm(studioHome,{recursive:true,force:true});});
 const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},call=(route,data)=>fetch(app.url+route,{method:'POST',headers,body:JSON.stringify(data)});
 const project=await evidenceProject('en',{staticState:'structure-first'}),preview=await(await call('/api/visual/preview',{project})).json(),local=exportDeck(project.document,'html',{plan:project.plan,experimentalWeb:true});
 assert.equal(local.renderHash,preview.renderHash);assert.deepEqual(local.staticStates,[{sceneId:'evidence',keyStateId:'structure-first',position:1}]);
 const pass=scene=>({sceneId:scene.id,sourceHash:scene.sourceHash,contrastIssues:[],clipIssues:[],overflow:[],fonts:scene.regions.map(r=>({regionId:r.id,loaded:true,probeWidth:10})),text:scene.regions.map(r=>({regionId:r.id,inside:true}))});
 const checks=local.scenes.map(pass),state={keyStateId:'structure-first',position:1,...pass(local.scenes[0])},fit=extra=>({ok:true,renderHash:preview.renderHash,checks,...extra});
 for(const bad of [fit({}),fit({states:[]}),fit({states:[{...state,position:0}]}),fit({states:[{...state,keyStateId:'complete'}]}),fit({states:[{...state,overflow:['region-x']}]}),fit({states:[{...state,text:[{regionId:'x',inside:false}]}]})])assert.equal((await call('/api/visual/measure',{ticket:preview.ticket,fit:bad})).status,422);
 assert.equal((await call('/api/visual/measure',{ticket:preview.ticket,fit:fit({states:[state]})})).status,200);
 const plain=structuredClone(project);plain.plan.scenes[0].motion.reducedMotion='instant';delete plain.plan.scenes[0].staticState;
 const p2=await(await call('/api/visual/preview',{project:plain})).json(),o2=exportDeck(plain.document,'html',{plan:plain.plan,experimentalWeb:true});assert.deepEqual(o2.staticStates,[]);
 assert.equal((await call('/api/visual/measure',{ticket:p2.ticket,fit:{ok:true,renderHash:p2.renderHash,checks:o2.scenes.map(pass),states:[]}})).status,200);
});
