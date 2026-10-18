import {assertImageSlots} from '../assets/brief.mjs';
import {imageExtensions,orientedDimensions} from '../assets/formats.mjs';
import schema from '../../schemas/visual-project.schema.json' with { type: 'json' };
import { validateSchema } from './schema.mjs';
import { assertPresentation } from './blocks.mjs';
import { assertDesignPlan } from '../design/plan.mjs';
import { identifier } from './model.mjs';
import { DeckError } from './errors.mjs';
export function assertVisualProject(project) {
 const result=validateSchema(project,schema),fail=message=>{throw new DeckError('INVALID_VISUAL_PROJECT',message,422,result.errors);};
 if(!result.ok)fail('Use a valid visual project envelope.');
 assertPresentation(project.document);assertDesignPlan(project.document,project.plan);
 if(project.id!==project.document.id)fail('Project and semantic document identities must match.');
 if(new Set(project.assets.map(a=>a.id)).size!==project.assets.length)fail('Asset ids must be unique.');
 for(const a of project.assets)if(a.path!==`assets/${a.hash}.png`)fail('Asset paths must match their content hashes.');
 for(const a of project.assets){
  if(a.original){const dim=orientedDimensions(a.original);if(a.original.path!==`asset-originals/${a.original.hash}.${imageExtensions[a.original.mime]}`||a.width!==dim.width||a.height!==dim.height)fail('Original source dimensions/path must bind the native PNG.');}
  if(a.derivatives?.length&&!a.original)fail('Derivatives need an original source.');
  if(new Set((a.derivatives||[]).map(d=>d.mime)).size!==(a.derivatives||[]).length)fail('Use one derivative per web encoding.');
  for(const d of a.derivatives||[])if(!['image/jpeg','image/webp'].includes(d.mime)||d.orientation!==1||d.path!==`asset-originals/${d.hash}.${imageExtensions[d.mime]}`||d.sourceHash!==a.original?.hash||d.width!==a.width||d.height!==a.height)fail('Web derivatives must bind the complete source canvas and hash.');
 }
 for(const s of project.plan.scenes)assertImageSlots(project.document,s,project.assets);
 for(const b of project.document.blocks)if(b.type==='image'&&!project.assets.some(a=>a.id===b.assetId))fail('An image references a missing asset manifest.');
 for(const key of ['createdAt','updatedAt'])if(!Number.isFinite(Date.parse(project.revision[key])))fail('Revision timestamps must be valid ISO dates.');
 return project;
}
export function createVisualProject(document,plan,{assets=[],id=identifier('visual')}={}) {
 const copy=structuredClone(document),design=structuredClone(plan),now=new Date().toISOString();copy.id=id;design.documentId=id;
 return assertVisualProject({format:'deckweft-visual-project',version:1,id,document:copy,plan:design,assets:structuredClone(assets),revision:{number:0,createdAt:now,updatedAt:now},extensions:{}});
}
export function assertVisualLocks(previous,next) {
 const old=previous.document,doc=next.document;
 const fail=()=>{throw new DeckError('AUTHOR_LOCK','Unlock the affected content or scene explicitly before changing it.',409);};
 for(const id of old.authorOverrides.lockedBlockIds)if(doc.authorOverrides.lockedBlockIds.includes(id)){
   if(JSON.stringify(old.blocks.find(b=>b.id===id))!==JSON.stringify(doc.blocks.find(b=>b.id===id)))fail();
   const b=old.blocks.find(b=>b.id===id);
   for(const scene of previous.plan.scenes){const after=next.plan.scenes.find(s=>s.id===scene.id),touches=s=>(s?.interactions||[]).filter(i=>i.blockId===id||i.otherBlockId===id||i.hotspots?.some(h=>h.annotationId===id));if(JSON.stringify(touches(scene))!==JSON.stringify(touches(after)))fail();const bound=new Set(touches(scene).map(i=>i.id));if(JSON.stringify((scene.cues||[]).filter(c=>bound.has(c.interactionId)))!==JSON.stringify((after?.cues||[]).filter(c=>bound.has(c.interactionId))))fail();}

   const notes=new Set(previous.plan.scenes.flatMap(s=>(s.interactions||[]).filter(i=>i.blockId===id||i.otherBlockId===id).flatMap(i=>(i.steps||[]).map(step=>step.explanationId))));
   for(const noteId of notes)if(JSON.stringify(old.explanations?.find(e=>e.id===noteId))!==JSON.stringify(doc.explanations?.find(e=>e.id===noteId)))fail();
   const linked=new Set([...(b?.sourceIds||[]),...(old.explanations||[]).filter(e=>notes.has(e.id)).flatMap(e=>e.sourceIds)]);for(const sourceId of linked)if(JSON.stringify(old.sources.find(s=>s.id===sourceId))!==JSON.stringify(doc.sources.find(s=>s.id===sourceId)))fail();
   if(b?.type==='image'){
   if(JSON.stringify(previous.assets.find(a=>a.id===b.assetId))!==JSON.stringify(next.assets.find(a=>a.id===b.assetId)))fail();
   for(const s of previous.plan.scenes){const after=next.plan.scenes.find(v=>v.id===s.id);for(const key of ['crops','imageSlots'])if(JSON.stringify((s[key]||[]).filter(v=>v.blockId===id))!==JSON.stringify((after?.[key]||[]).filter(v=>v.blockId===id)))fail();}
  }
   if(b?.type==='chart'&&JSON.stringify(old.datasets.find(d=>d.id===b.datasetId))!==JSON.stringify(doc.datasets.find(d=>d.id===b.datasetId)))fail();
 }
 for(const lock of old.authorOverrides.sceneLocks||[]){const retained=doc.authorOverrides.sceneLocks?.find(l=>l.sceneId===lock.sceneId),a=previous.plan.scenes.find(s=>s.id===lock.sceneId),b=next.plan.scenes.find(s=>s.id===lock.sceneId);
  for(const key of lock.fields)if(retained?.fields.includes(key)&&JSON.stringify(a?.[key])!==JSON.stringify(b?.[key]))fail();
  if(lock.fields.includes('imageSlots')&&retained?.fields.includes('imageSlots')&&JSON.stringify(a?.crops)!==JSON.stringify(b?.crops))fail();
  // A static state names a cue boundary: cue and motion locks keep both the chosen key state and its position.
  const frozen=s=>s?.staticState?[s.staticState.keyStateId,s.keyStates?.find(k=>k.id===s.staticState.keyStateId)?.position]:null;
  if(['cues','motion'].some(f=>lock.fields.includes(f)&&retained?.fields.includes(f))&&JSON.stringify(frozen(a))!==JSON.stringify(frozen(b)))fail();
 }
}
