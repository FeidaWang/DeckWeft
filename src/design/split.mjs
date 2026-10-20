/**
 * CINE-001 (2026-10-20): a stated page split. A scene that does not fit the presentation target is never shrunk; the author
 * cuts it after a block they name (the fit-page action names it from a browser measurement) and the blocks after the cut move
 * to a continuation page that shares the heading, the theme, the composition and the profile. Citations stay where they are
 * and are shared into the continuation when a moved block cites their source. Nothing in the semantic document changes.
 */
import {DeckError} from '../core/errors.mjs';
import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {assertComposition,inferFamily,families} from './compositions.mjs';
const fail=message=>{throw new DeckError('SCENE_SPLIT',message,422);};
/** The sources a block cites directly or through its dataset. */
const citedSources=(document,b)=>new Set([...(b.sourceIds||[]),...(b.sourceId?[b.sourceId]:[]),...(b.datasetId?document.datasets.find(d=>d.id===b.datasetId)?.sourceIds||[]:[])]);
export function splitScene(project,sceneId,{afterBlockId}={}){
 const copy=structuredClone(assertVisualProject(project)),scenes=copy.plan.scenes,index=scenes.findIndex(s=>s.id===sceneId),scene=scenes[index];
 if(!scene)fail('Choose a page in this deck.');
 if(copy.document.authorOverrides.sceneLocks?.some(l=>l.sceneId===sceneId&&l.fields.includes('blockIds')))throw new DeckError('AUTHOR_LOCK',`Page ${index+1} (${sceneId}) has its blocks locked; unlock it before splitting it.`,409);
 if(scene.interactions?.length||scene.cues?.length||scene.keyStates)fail('Interactions, cues and key states belong to one page; split this page by hand.');
 const blocks=scene.blockIds.map(id=>copy.document.blocks.find(b=>b.id===id)),at=scene.blockIds.indexOf(afterBlockId);
 if(at<0)fail('Name a block of this page to cut after.');
 const heading=blocks.find(b=>b.type==='heading');if(!heading)fail('A split page needs a heading to share.');
 const content=b=>!['heading','citation'].includes(b.type);
 const first=blocks.slice(0,at+1),rest=blocks.slice(at+1),moved=rest.filter(content),kept=first.filter(content);
 if(!moved.length||!kept.length)fail('A split leaves a heading and at least one other block on each page; cut elsewhere.');
 if(scene.takeaway&&moved.some(b=>b.id===scene.takeaway.blockId))fail('The takeaway stays on the page with its claim; cut after it.');
 if(moved.some(b=>b.type==='annotation'&&!moved.some(t=>t.id===b.target.blockId))||kept.some(b=>b.type==='annotation'&&!kept.some(t=>t.id===b.target.blockId)))fail('An annotation stays on the page of its target; cut elsewhere.');
 const citations=blocks.filter(b=>b.type==='citation'),movedSources=new Set(moved.flatMap(b=>[...citedSources(copy.document,b)]));
 const shared=citations.filter(c=>movedSources.has(c.sourceId)).map(c=>c.id);
 // The continuation id keeps the 64-character limit by trimming the base, never the suffix, so a long id cannot repeat itself.
 const ids=new Set(scenes.map(s=>s.id));let n=2,nextId;do{const suffix=`-${n++}`;nextId=sceneId.slice(0,64-suffix.length)+suffix;if(n>1000)fail('No free continuation id is left for this page; rename it.');}while(ids.has(nextId));
 const keep=list=>list.filter(id=>!moved.some(b=>b.id===id));
 const page={...structuredClone(scene),id:nextId,blockIds:[heading.id,...moved.map(b=>b.id),...shared],focalBlockId:heading.id};
 delete page.takeaway;
 for(const key of ['crops','imageSlots','media'])if(page[key])page[key]=page[key].filter(v=>page.blockIds.includes(v.blockId));
 if(page.intent){delete page.intent.focusGroupBlockIds;delete page.intent.emptyRegions;}
 if(page.disclosure){page.disclosure={blockIds:page.disclosure.blockIds.filter(id=>page.blockIds.includes(id))};if(!page.disclosure.blockIds.length)delete page.disclosure;}
 scene.blockIds=scene.blockIds.filter(id=>!moved.some(b=>b.id===id));
 for(const key of ['crops','imageSlots','media'])if(scene[key])scene[key]=scene[key].filter(v=>scene.blockIds.includes(v.blockId));
 if(scene.intent?.focusGroupBlockIds){scene.intent.focusGroupBlockIds=keep(scene.intent.focusGroupBlockIds);if(!scene.intent.focusGroupBlockIds.length)delete scene.intent.focusGroupBlockIds;}
 if(scene.disclosure){scene.disclosure={blockIds:keep(scene.disclosure.blockIds)};if(!scene.disclosure.blockIds.length)delete scene.disclosure;}
 // A side that loses its family's required block (the image of an image page, the chart of an evidence page) takes the first
 // variant of the family its remaining content implies; a side that still meets its family contract keeps the composition.
 for(const side of [scene,page]){try{assertComposition(copy.document,side);}catch{const family=inferFamily(copy.document,{...side,composition:''});side.composition=families[family].variants[0][0];}}
 scenes.splice(index+1,0,page);
 assertVisualLocks(project,copy);
 if(JSON.stringify(copy.document)!==JSON.stringify(project.document))fail('Splitting a page never changes the semantic document.');
 return assertVisualProject(copy);
}
