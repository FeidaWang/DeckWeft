/**
 * CINE-002 (2026-10-20): how a page presents its references. The canonical sources, citation texts and claim bindings never
 * change here; only where a citation is drawn. `expanded` (absent) is today's rendering: every citation is a full-width
 * region. `compact` moves every citation region to a source strip at the foot of the page and marks each claim with the
 * display numbers of its sources; a citation that attributes a verbatim quotation stays beside the quotation.
 * `source-is-subject` keeps every citation as a region and flags the page so the renderer can give it the subject's room.
 * Display numbers are recomputed on every render in deck order; the stable key is the source id.
 */
import {DeckError} from '../core/errors.mjs';
import {quoteAttributions} from '../design/compositions.mjs';
export const REFERENCE_MODES=Object.freeze(['expanded','compact','source-is-subject']);
/** Blocks whose sources are marked on the page (a quotation is attributed by its citation, a citation by itself). */
export const CLAIM_TYPES=Object.freeze(['heading','paragraph','callout','metric','chart','image','table','list','code','diagram']);
/** The sources a block cites, in author order: its own list, its single source, its dataset's sources and its source anchor. */
export function blockSources(document,b){
 const out=[];const add=id=>{if(id&&!out.includes(id))out.push(id);};
 for(const id of b.sourceIds||[])add(id);add(b.sourceId);
 if(b.datasetId)for(const id of document.datasets.find(d=>d.id===b.datasetId)?.sourceIds||[])add(id);
 add(b.sourceAnchor?.sourceId);
 return out;
}
/** Display number per source id: the order of first appearance walking the plan's scenes and each scene's blocks in author order. */
export function referenceIndex(document,plan){
 const blocks=new Map(document.blocks.map(b=>[b.id,b])),known=new Set(document.sources.map(s=>s.id)),index=new Map();
 for(const scene of plan.scenes)for(const id of scene.blockIds){const b=blocks.get(id);if(!b)continue;for(const sid of blockSources(document,b))if(known.has(sid)&&!index.has(sid))index.set(sid,index.size+1);}
 return index;
}
export const referenceMode=scene=>scene.references?.mode||'expanded';
/** Where each citation of a scene is drawn and which markers each claim carries. */
export function sceneReferences(document,plan,scene){
 const mode=referenceMode(scene),blocks=new Map(document.blocks.map(b=>[b.id,b])),index=referenceIndex(document,plan);
 const own=scene.blockIds.map(id=>blocks.get(id)).filter(Boolean),citations=own.filter(b=>b.type==='citation');
 const attributions=new Set([...quoteAttributions(document,scene).values()]);
 const strip=[],regions=[];
 for(const c of citations){
  if(mode==='compact'&&!attributions.has(c.id)){const source=document.sources.find(s=>s.id===c.sourceId);strip.push({marker:index.get(c.sourceId)??null,blockId:c.id,sourceId:c.sourceId,text:c.text,title:source?.title??'',url:source?.url??''});}
  else regions.push(c.id);
 }
 const claims=mode==='compact'?own.filter(b=>CLAIM_TYPES.includes(b.type)).map(b=>({blockId:b.id,markers:blockSources(document,b).map(id=>index.get(id)).filter(n=>n!==undefined).sort((a,b)=>a-b)})).filter(c=>c.markers.length):[];
 return {mode,subject:mode==='source-is-subject',strip,regions,claims};
}
/** The contract: a known mode, and in compact mode every verbatim quotation keeps an attributing citation on the page. */
export function assertReferences(document,scene){
 const fail=message=>{throw new DeckError('INVALID_DESIGN_PLAN',message,422);};
 if(scene.references===undefined)return scene;
 if(!scene.references||typeof scene.references!=='object'||!REFERENCE_MODES.includes(scene.references.mode))fail(`Choose a reference mode: ${REFERENCE_MODES.join(', ')}.`);
 if(scene.references.mode==='compact'){
  const blocks=new Map(document.blocks.map(b=>[b.id,b])),quotes=scene.blockIds.map(id=>blocks.get(id)).filter(b=>b?.type==='quote'),pairs=quoteAttributions(document,scene);
  for(const q of quotes)if(!pairs.has(q.id))fail(`Quotation ${q.id} needs an attributing citation on this page; in compact mode its attribution may not leave the page for the strip.`);
 }
 return scene;
}
/**
 * DWI-031: a compact page moves citations into its source strip, never qualifiers. Every callout and every dataset note about missing
 * values, intervals or qualifiers stays in the page's regions at a reading role (not caption or reference size), before the strip.
 * `sceneMarkup` is the exported section of the scene. Returns the misplaced items; empty means none.
 */
export function qualifierPlacement(document,scene,sceneMarkup){
 const issues=[],blocks=new Map(document.blocks.map(b=>[b.id,b])),stripAt=sceneMarkup.indexOf('<footer class="source-strip"'),body=stripAt<0?sceneMarkup:sceneMarkup.slice(0,stripAt),strip=stripAt<0?'':sceneMarkup.slice(stripAt);
 const plain=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 for(const b of scene.blockIds.map(id=>blocks.get(id)).filter(b=>b?.type==='callout')){
  const region=body.match(new RegExp(`<div[^>]*data-block-id="${b.id}"[^>]*>`))?.[0];
  if(!region)issues.push({code:'QUALIFIER_NOT_ON_PAGE',blockId:b.id});
  else if(/data-text-role="(caption|reference)"/.test(region))issues.push({code:'QUALIFIER_AS_FOOTNOTE',blockId:b.id});
  if(strip.includes(plain(b.text)))issues.push({code:'QUALIFIER_IN_SOURCE_STRIP',blockId:b.id});
 }
 for(const b of scene.blockIds.map(id=>blocks.get(id)).filter(b=>b?.type==='chart')){
  const d=document.datasets.find(d=>d.id===b.datasetId);
  for(const note of [...(d?.missing||[]),...(d?.qualifiers||[])].map(n=>n.note).filter(Boolean))if(!body.includes(plain(note))||strip.includes(plain(note)))issues.push({code:'QUALIFIER_NOTE_HIDDEN',blockId:b.id,note});
 }
 return issues;
}
