import { compositions, compositionOrder, inferFamily } from './compositions.mjs';
import { visibleBlockIds } from './plan.mjs';
import { rankCandidates } from './rhythm.mjs';
import { TARGETS, PT_PER_PX } from '../targets/target-budget.mjs';
/**
 * DWI-030: the workpack's six layout families mapped onto DeckWeft's composition families, an explicit logical reading order for
 * each, and two delivery modes. The order is a designed intent read from the composition (compositionOrder), not an eye path: no
 * F or Z pattern and no golden ratio is imposed. Delivery gates run before any aesthetic score: a page that cannot be read in its
 * mode is not a candidate, however good it looks. Thresholds are product defaults to review, not laws of vision.
 */
export const LAYOUT_FAMILIES=Object.freeze({
 'assertion-evidence':{families:['evidence'],evidence:['chart','table','image','metric'],guard:'The claim comes first; its evidence and qualifier follow on the same page.'},
 'paired-comparison':{families:['comparison','before-after'],evidence:['table','image'],guard:'Both sides share one table or one pair, on the same scale.'},
 'evidence-chart':{families:['small-multiples'],evidence:['chart'],guard:'Panels read left to right on one shared scale.'},
 workflow:{families:['process'],evidence:['diagram'],guard:'Steps read in the direction of their edges.'},
 mechanism:{families:['system-map'],evidence:['diagram'],guard:'The scale statement and the note are read before the map.'},
 'reading-brief':{families:['statement','chapter','closing','quote'],evidence:[],guard:'A self-paced page of prose and a list; reflowed, not shrunk.'}
});
const THEME_ONLY_BRIEF=/^(reading-flow|fieldnotes-(cover|thesis|method|closing)|atlas-(cover|section|closing|appendix)|stage-(hero|chapter|closing))$/;
/** Which of the six families a page belongs to, or null for families outside the six (image, metric pages). */
export function layoutFamilyOf(document,scene){
 const family=compositions.find(c=>c.id===scene.composition)?.family??(THEME_ONLY_BRIEF.test(scene.composition)?'statement':inferFamily(document,{...scene,blockIds:visibleBlockIds(scene)}));
 return Object.entries(LAYOUT_FAMILIES).find(([,v])=>v.families.includes(family))?.[0]??null;
}
/** The page's logical reading order as block ids and types, independent of z-order and of where the eye may land first. */
export function readingOrder(document,scene){
 const blocks=new Map(document.blocks.map(b=>[b.id,b])),visible=new Set(visibleBlockIds(scene));
 return compositionOrder(document,scene).filter(id=>visible.has(id)).map(id=>({blockId:id,type:blocks.get(id).type}));
}
/** Topological check of a process or relationship diagram: every edge goes from an earlier node to a later one in reading order. */
export function diagramOrderIssues(block){
 const at=new Map(block.nodes.map((n,i)=>[n.id,i]));
 return block.edges.filter(e=>at.get(e.from)>=at.get(e.to)).map(e=>({code:'DIAGRAM_BACKWARD_EDGE',blockId:block.id,edge:e.id??`${e.from}->${e.to}`,explanation:`Step “${e.from}” comes after “${e.to}” in reading order but points to it; reorder the steps or mark the loop.`}));
}
/** Reading-order invariants of the six families. Empty means the page reads as its family intends. */
export function readingOrderIssues(document,scene){
 const family=layoutFamilyOf(document,scene);if(!family)return [];
 const order=readingOrder(document,scene),types=order.map(o=>o.type),issues=[],at=t=>types.indexOf(t),blocks=new Map(document.blocks.map(b=>[b.id,b]));
 const issue=(code,explanation)=>issues.push({code,severity:'blocker',slideId:scene.id,elementIds:order.map(o=>o.blockId),explanation,proposedFix:null});
 if(types.includes('heading')&&at('heading')!==0&&!['image','metric'].includes(types[0]))issue('READING_HEADING_NOT_FIRST',`The heading of a ${family} page is read first.`);
 const lastNonCitation=types.map((t,i)=>t==='citation'?-1:i).reduce((a,b)=>Math.max(a,b),-1);
 if(types.some((t,i)=>t==='citation'&&i<lastNonCitation)&&!scene.blockIds.some(id=>blocks.get(id).type==='quote'))issue('READING_CITATION_EARLY','Citations close the page.');
 const evidence=LAYOUT_FAMILIES[family].evidence;
 if(evidence.length&&!types.some(t=>evidence.includes(t)))issue('READING_NO_EVIDENCE',`A ${family} page needs its evidence object (${evidence.join(' or ')}).`);
 if(family==='mechanism'){const d=at('diagram');for(const t of ['callout','paragraph'])if(at(t)>d)issue('READING_MECHANISM_NOTE_AFTER_MAP','The scale statement and the note are read before the map.');}
 if(family==='workflow'||family==='mechanism')for(const o of order.filter(o=>o.type==='diagram'))if(family==='workflow')issues.push(...diagramOrderIssues(blocks.get(o.blockId)).map(i=>({...i,severity:'blocker',slideId:scene.id,elementIds:[o.blockId],proposedFix:null})));
 if(family==='evidence-chart'){const charts=order.filter(o=>o.type==='chart').map(o=>blocks.get(o.blockId));if(new Set(charts.map(c=>JSON.stringify(c.axis??null))).size>1)issue('READING_PANELS_SCALE','Panels share one axis policy.');}
 return issues;
}
const TEXT=new Set(['heading','paragraph','list','callout','quote']);
const units=text=>[...text].reduce((n,ch)=>n+(/[⺀-鿿豈-﫿＀-￯]/.test(ch)?2:1),0);
/** Body text of a page in measure units (a CJK glyph counts two, as in art-direction.mjs). */
export const pageUnits=(document,scene)=>visibleBlockIds(scene).map(id=>document.blocks.find(b=>b.id===id)).filter(b=>TEXT.has(b.type)).reduce((n,b)=>n+units(b.type==='list'?b.items.join(' '):b.text||''),0);
/**
 * Delivery modes. Self-paced reading allows denser pages read at arm's length; a stage page is read from a distance in seconds, so it
 * holds less text and larger labels. Both keep the presentation target's hard type minima; neither shrinks text to fit.
 */
export const DELIVERY_MODES=Object.freeze({
 'self-paced':Object.freeze({maxUnits:600,maxTextBlocks:6,labelMinPx:10,splitTo:'reading-flow',why:'Read at the reader’s pace; long text reflows into a reading page.'}),
 stage:Object.freeze({maxUnits:220,maxTextBlocks:3,labelMinPx:Math.round(TARGETS.presentation.typography.target.label/PT_PER_PX.pptx),splitTo:null,why:'Seen from a distance while someone speaks; one idea, few words, large labels.'})
});
/** Hard delivery gates for one page in one mode. `fit` is a measured candidateFit result when available (labels in page px). */
export function deliveryGate(document,scene,mode,fit=null){
 const m=DELIVERY_MODES[mode];if(!m)throw Error('Delivery mode is self-paced or stage.');
 const reasons=[],u=pageUnits(document,scene),blocks=visibleBlockIds(scene).map(id=>document.blocks.find(b=>b.id===id)).filter(b=>TEXT.has(b.type)&&b.type!=='heading');
 if(u>m.maxUnits)reasons.push(`Too much text for ${mode} delivery (${u} units, at most ${m.maxUnits}): split the page${m.splitTo?' or make it a reading page':''}; nothing is shrunk.`);
 if(blocks.length>m.maxTextBlocks)reasons.push(`${blocks.length} text blocks for ${mode} delivery (at most ${m.maxTextBlocks}).`);
 const label=fit?.features?.labelMinPx;if(Number.isFinite(label)&&label<m.labelMinPx)reasons.push(`Smallest label ${label}px is below ${m.labelMinPx}px for ${mode} delivery.`);
 for(const i of readingOrderIssues(document,scene))reasons.push(i.explanation);
 return {mode,ok:!reasons.length,reasons,units:u};
}
/** CINE-007 ranking with the delivery gates applied first: a candidate failing its mode is a failed hard gate, never a low score. */
export function rankForDelivery(project,candidates,feasibility,{mode='self-paced'}={}){
 const gated=feasibility.map((fits,k)=>fits.map((fit,i)=>{const scene=candidates[k].plan.scenes[i],g=deliveryGate(candidates[k].document,scene,mode,fit);return g.ok?fit:{...fit,ok:false,reasons:[...(fit?.reasons||[]),...g.reasons]};}));
 return rankCandidates(project,candidates,gated);
}
const EVIDENCE=new Set(['chart','table','image','diagram','metric','code']);
/** Figure-led families: the page exists to show its evidence object. */
export const FIGURE_LED=Object.freeze(['assertion-evidence','evidence-chart','workflow','mechanism']);
/** Target band for dominant evidence on figure-led pages (DESIGN_SYSTEM.md: roughly 45–65 % of the useful area); a default to review. */
export const EVIDENCE_SHARE=Object.freeze({min:.45,max:.65});
/**
 * DWI-032: the share of a measured scene's useful area (the bounding box of its content regions) that its evidence objects take.
 * `layoutScene` is one scene of measureExportLayout(); areas are page px.
 */
export function evidenceShare(layoutScene){
 const regions=layoutScene.regions.filter(r=>r.bounds&&r.bounds.width>0&&r.bounds.height>0);if(!regions.length)return {share:0,evidenceArea:0,usefulArea:0,blocks:[]};
 const x0=Math.min(...regions.map(r=>r.bounds.x)),y0=Math.min(...regions.map(r=>r.bounds.y)),x1=Math.max(...regions.map(r=>r.bounds.x+r.bounds.width)),y1=Math.max(...regions.map(r=>r.bounds.y+r.bounds.height));
 const ev=regions.filter(r=>EVIDENCE.has(r.component)),evidenceArea=ev.reduce((n,r)=>n+r.bounds.width*r.bounds.height,0),usefulArea=(x1-x0)*(y1-y0);
 return {share:usefulArea?evidenceArea/usefulArea:0,evidenceArea:Math.round(evidenceArea),usefulArea:Math.round(usefulArea),blocks:ev.map(r=>r.blockId)};
}
/** DWI-033: a mechanism page whose diagram does not say whether it is to scale. A warning: the author states it, nothing guesses it. */
export function mechanismIssues(document,scene){
 if(layoutFamilyOf(document,scene)!=='mechanism')return [];
 return visibleBlockIds(scene).map(id=>document.blocks.find(b=>b.id===id)).filter(b=>b.type==='diagram'&&!b.scale).map(b=>({code:'MECHANISM_SCALE_UNDECLARED',severity:'warning',slideId:scene.id,elementIds:[b.id],explanation:'Say whether this mechanism is to scale: set the diagram scale to not-to-scale, unverified or to-scale.',proposedFix:null}));
}
