/**
 * Static delivery (S7): what a paged, non-interactive target shows for every interaction and motion of a scene.
 * It is the same state the no-JavaScript web view draws (S2, S5): the author's static state when one is declared, otherwise
 * the authored opening with the complete data. These functions only describe that state; they never change the document.
 */
import {staticInteractionState,compileInteractions} from '../motion/cues.mjs';
import {selectedDataset} from '../motion/timeline.mjs';
import {staticStatePosition} from '../design/scene-semantics.mjs';
import {SERIES_FOCUS_KINDS} from '../components/charts/semantics.mjs';
import {chartFacts,chartText} from '../components/charts/model.mjs';
import {referenceIndex} from '../references/presentation.mjs';

/** The handoff's static delivery rules and where each applies in the v3 vocabulary. */
export const STATIC_DELIVERY_RULES=[
 {id:'staged-reveal',rule:'Masks and staged reveals export the complete final state, or the author’s static state.',v3:['steps','cues','blueprint A (Explain → Diagram → Explore)']},
 {id:'hover-fact',rule:'Hover and click facts become visible annotations.',v3:['image-hotspots','chart point titles']},
 {id:'filter',rule:'Filters export the selected result with its state written out.',v3:['chart-select']},
 {id:'legend',rule:'Legends keep series identity, scale and intervals.',v3:['chart']},
 {id:'comparison',rule:'Both compared states stay visible, each labelled.',v3:['image-compare']},
 {id:'scroll-story',rule:'Scroll stories become stepped pages.',v3:[],absent:'The v3 schema has no scroll trigger (alignment §11: trigger kinds beyond manual are open).'},
 {id:'media',rule:'Video, canvas and shader scenes export a cover, key frame, summary and optional link.',v3:[],absent:'The v3 schema has no video, canvas or shader component.'},
 {id:'shared-element',rule:'Shared-element transitions export both full layouts.',v3:[],absent:'The v3 schema has no shared-element transition.'}
];

/** The frozen chart a static page draws: the static state's filter and reader focus (layered rule, alignment §13), or the declared chart. */
export function frozenChart(document,scene,block,state=null){
 const dataset=document.datasets.find(d=>d.id===block.datasetId);
 if(!state)return {block,dataset,view:dataset,frozen:false};
 const view=selectedDataset(dataset,state),{focus,...rest}=block;
 const drawn=!state.focusSeriesId?block:SERIES_FOCUS_KINDS.includes(block.chartType)?{...rest,focus:{seriesIds:[state.focusSeriesId]}}:rest;
 return {block:drawn,dataset,view,frozen:true,state};
}

/** Step 2 of the export order: the key state every scene is frozen at, and the interaction state there. */
export function staticStates(document,plan){
 return plan.scenes.map(scene=>{
  const position=staticStatePosition(scene),states=scene.staticState?staticInteractionState(document,scene):[];
  return {sceneId:scene.id,keyStateId:scene.staticState?.keyStateId||null,position,declared:!!scene.staticState,states};
 });
}

/** Step 3: filters, sort, focus and parameters per chart, plus the frozen selection of every other interaction. */
export function freezeViews(document,plan,states){
 const blocks=new Map(document.blocks.map(b=>[b.id,b]));
 return plan.scenes.map((scene,i)=>{
  const s=states[i],specs=compileInteractions(document,scene),charts={},interactions=[];
  for(const id of scene.blockIds){const b=blocks.get(id);if(b.type!=='chart')continue;
   const spec=specs.find(v=>v.kind==='chart-select'&&v.blockId===id),state=s.declared&&spec?s.states.find(v=>v.id===spec.id):null,f=frozenChart(document,scene,b,state),facts=chartFacts(f.block,f.view,document.locale);
   charts[id]={frozen:f.frozen,categoryIds:facts.model.order.map(k=>f.view.categoryIds?.[k]??String(k)),seriesIds:f.view.series.map(s=>s.id),sort:facts.model.sort,scale:facts.model.scale,domain:facts.model.domain,focus:f.block.focus||null,state:state?{seriesIds:state.seriesIds,fromId:state.fromId,toId:state.toId,focusSeriesId:state.focusSeriesId}:null};
  }
  for(const spec of specs){
   const state=s.declared?s.states.find(v=>v.id===spec.id):null;
   const delivery=spec.kind==='chart-select'?(state?'The selected result, with the filter, sort and focus written out in the static-state note.':'The complete authored data (no static state is declared).')
    :spec.kind==='steps'&&spec.blueprint?`Blueprint A at ${state?.stage||'its opening'}: the whole object with every part numbered and every explanation as text on the page${state?.stepId?`; part ${state.stepId} is marked`:''}.`
    :spec.kind==='steps'?(state?`The static state’s step (${state.stepId}) is marked; every node and relationship is drawn.`:'The complete final state: every node and relationship is drawn.')
    :spec.kind==='image-compare'?(state&&state.tabId!=='both'?`Only the ${state.tabId} image is on the page; the other is in a closed disclosure and is listed in the notes.`:'Both images side by side, each labelled.')
    :(state?.hotspotId?'Numbered markers at the authored positions; the open annotation is in the static-state note; every annotation is on the page.':'Every annotation is visible text on the page.');
   interactions.push({id:spec.id,kind:spec.kind,blockId:spec.blockId,state:state||null,delivery,rule:{'chart-select':'filter','steps':'staged-reveal','image-compare':'comparison','image-hotspots':'hover-fact'}[spec.kind]});
  }
  return {sceneId:scene.id,charts,interactions};
 });
}

/** Step 4: motion and cues are not played. Paged targets carry no timing, transition, loop or random variation. */
export function stopMotion(plan){
 return plan.scenes.map(scene=>({sceneId:scene.id,policy:scene.motion?.policy||'none',cuesNotPlayed:(scene.cues||[]).length,durationMs:0,loops:0,random:0,reducedMotion:scene.motion?.reducedMotion||null}));
}

/**
 * Step 5: what must be readable without interaction. Labels, sources and method notes the static page draws are checked
 * against the measured page in the check step; content only reachable through a disclosure goes to notes (PowerPoint) or the
 * appendix (PDF), with its text here.
 */
export function revealRequired(document,plan,frozen){
 const blocks=new Map(document.blocks.map(b=>[b.id,b])),zh=document.locale==='zh-CN',t=chartText(document.locale),markers=referenceIndex(document,plan);
 return plan.scenes.map((scene,i)=>{
  const sourceIds=new Set(),notes=[];
  for(const id of scene.blockIds){const b=blocks.get(id);for(const s of [...(b.sourceIds||[]),...(b.sourceId?[b.sourceId]:[])])sourceIds.add(s);
   if(b.type==='chart'){const d=document.datasets.find(d=>d.id===b.datasetId);d.sourceIds.forEach(s=>sourceIds.add(s));
    // The complete data in author order, as the web's data table has it: original categories, exact values, missing reasons.
    const facts=chartFacts(b,d,document.locale),view=frozen[i].charts[id],sep=zh?'；':'; ';
    const rows=d.categories.map((c,k)=>`${c}${facts.display(k)!==c?` (${facts.display(k)})`:''}${zh?'：':': '}${d.series.map((s,j)=>`${s.label} ${facts.withUnit(facts.cell(j,k))}${s.xValues?` (x ${s.xValues[k]===null?t.missing:s.xValues[k]})`:''}`).join(sep)}`);
    notes.push({blockId:id,kind:'data',title:`${b.question||t.viewAll} — ${t.viewAll}`,lines:[...rows,...(view.frozen?[`${zh?'静态视图筛选':'Static view filter'}: ${view.categoryIds.join(', ')} · ${view.seriesIds.join(', ')}`]:[])]});}
   if(b.type==='diagram')notes.push({blockId:id,kind:'relationships',title:zh?'关系与节点说明':'Relationships and node notes',lines:[...b.nodes.map(n=>n.label.replace(/\n/g,' ')+(n.note?(zh?'：':': ')+n.note:'')),...b.edges.map(e=>`${b.nodes.find(n=>n.id===e.from).label.replace(/\n/g,' ')} → ${b.nodes.find(n=>n.id===e.to).label.replace(/\n/g,' ')}${e.label?' · '+e.label:''}`)]});
  }
  const steps=(scene.interactions||[]).filter(s=>s.kind==='steps').flatMap(s=>[...(s.blueprint?[s.blueprint.wholeExplanationId]:[]),...s.steps.map(step=>step.explanationId)].map(id=>{const e=document.explanations.find(e=>e.id===id);return `${e.label}${zh?'——':' — '}${e.text}`;}));
  if(scene.disclosure)notes.push({kind:'disclosure',title:zh?'更多细节（网页中折叠）':'More detail (closed on the web page)',lines:scene.blockIds.filter(id=>scene.disclosure.blockIds.includes(id)).map(id=>blocks.get(id)).flatMap(b=>b.type==='list'?b.items:b.text.split('\n'))});
  if(steps.length)notes.push({kind:'explanations',title:zh?'全部讲解（按提示顺序）':'All authored explanations, in cue order',lines:steps});
  for(const it of frozen[i].interactions)if(it.kind==='image-compare'&&it.state&&it.state.tabId!=='both'){const hidden=blocks.get(it.state.tabId==='first'?(scene.interactions.find(s=>s.id===it.id).otherBlockId):it.blockId);notes.push({blockId:hidden.id,kind:'hidden-image',title:zh?'未在页面上的原始图片':'Original image not on the page',lines:[hidden.alt]});}
  // CINE-002: the display marker of each source (deck order of first appearance) and the exact citation texts of this page that cite it.
  const sources=[...sourceIds].map(id=>document.sources.find(s=>s.id===id)).filter(Boolean).map(s=>({id:s.id,title:s.title,url:s.url,marker:markers.get(s.id)??null,citations:scene.blockIds.map(id=>blocks.get(id)).filter(b=>b.type==='citation'&&b.sourceId===s.id).map(b=>b.text)}));
  return {sceneId:scene.id,sources,notes};
 });
}
