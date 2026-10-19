import {DeckError} from '../core/errors.mjs';
/**
 * Blueprint A (S9b, DWD-210): Explain → Diagram → Explore on one page. It is a `steps` interaction over a diagram with a
 * `blueprint` declaration; nothing else is new. The stage follows from the cue position:
 *
 *   0 Explain   the question, the short answer and the object's name (the diagram is not drawn yet)
 *   1 Diagram   the whole object, every part label and the reading order; no part is selected
 *   2…n+1       Explore: one part, in reading order, against the whole
 *
 * Selecting a part explores it; “Show whole” returns to Diagram. The static state must be Diagram or Explore, so a static
 * reader always gets the whole object with every part and its explanation; the export order refuses anything else.
 */
export const BLUEPRINT_STAGES=Object.freeze(['explain','diagram','explore']);
export const stageAt=position=>position===0?'explain':position===1?'diagram':'explore';
export const blueprintSpec=scene=>(scene.interactions||[]).find(i=>i.kind==='steps'&&i.blueprint)||null;
const fail=message=>{throw new DeckError('INVALID_INTERACTION',message,422);};
const BLUEPRINT_ANSWER_TYPES=['paragraph','callout'];

/** Contract rules beyond the schema. Called from assertSceneInteractions with the scene's other checks. */
export function assertBlueprint(document,scene){
 const specs=(scene.interactions||[]).filter(i=>i.kind==='steps'&&i.blueprint);if(!specs.length)return;
 if(specs.length>1||(scene.interactions||[]).length>1)fail('A blueprint A page has one explanation sequence; move other interactions to another page.');
 const spec=specs[0],blocks=new Map(document.blocks.map(b=>[b.id,b])),b=blocks.get(spec.blockId),{questionBlockId,answerBlockId,wholeExplanationId}=spec.blueprint;
 if(b?.type!=='diagram')fail('Blueprint A explains a diagram: its parts are the diagram nodes.');
 if(blocks.get(questionBlockId)?.type!=='heading'||!scene.blockIds.includes(questionBlockId))fail('The blueprint question is a heading block on the same page.');
 if(!BLUEPRINT_ANSWER_TYPES.includes(blocks.get(answerBlockId)?.type)||!scene.blockIds.includes(answerBlockId))fail('The blueprint short answer is a paragraph or callout block on the same page.');
 if(spec.initialStepId)fail('A blueprint A page always opens on Explain; remove initialStepId.');
 if(spec.steps.some(s=>!b.nodes.some(n=>n.id===s.objectId)))fail('Blueprint A parts are diagram nodes; every step names a node id.');
 if(new Set(spec.steps.map(s=>s.objectId)).size!==spec.steps.length)fail('Explain each blueprint part once.');
 if(!document.explanations?.some(e=>e.id===wholeExplanationId))fail('The whole object needs its own explanation (wholeExplanationId).');
 if(spec.steps.some(s=>s.explanationId===wholeExplanationId))fail('The whole object and a part cannot share one explanation.');
 if(scene.disclosure?.blockIds.some(id=>[spec.blockId,questionBlockId,answerBlockId].includes(id)))fail('The question, the answer and the diagram of a blueprint page stay on the page, not behind a disclosure.');
 const cues=scene.cues||[];
 if(!cues.length||cues.length>spec.steps.length+1||cues.some(c=>c.event!=='step.next'||c.interactionId!==spec.id))fail(`A blueprint page’s cues are its stages: 1 to ${spec.steps.length+1} step.next cues on ${spec.id} (Diagram, then each part).`);
}

/** The stage and part a key state shows; `position` is a cue boundary of a blueprint scene. */
export function blueprintKeyState(scene,position){
 const spec=blueprintSpec(scene),stage=stageAt(position);
 return {stage,stepId:stage==='explore'?spec.steps[position-2].id:null};
}

/**
 * Export order, stage 2 (static-state): a blueprint scene needs an author-chosen static state at Diagram or Explore, and the
 * measured static page must show the whole object, every part label and every explanation as visible text (not only in notes
 * or a closed disclosure). Returns one receipt per blueprint scene.
 */
export function assertBlueprintStatic(document,plan,layout){
 const problems=[],receipts=[];
 for(const scene of plan.scenes){
  const spec=blueprintSpec(scene);if(!spec)continue;
  if(!scene.staticState){problems.push({code:'BLUEPRINT_STATIC_REQUIRED',sceneId:scene.id,message:'Choose the static state of this Explain → Diagram → Explore page (Diagram or an Explore state) before a paged export.'});continue;}
  const position=scene.keyStates.find(k=>k.id===scene.staticState.keyStateId).position,{stage,stepId}=blueprintKeyState(scene,position);
  if(stage==='explain'){problems.push({code:'BLUEPRINT_STATIC_INCOMPLETE',sceneId:scene.id,keyStateId:scene.staticState.keyStateId,message:'The Explain stage does not show the object or its parts; choose Diagram or an Explore state as the static state.'});continue;}
  const block=document.blocks.find(b=>b.id===spec.blockId),notes=new Map((document.explanations||[]).map(e=>[e.id,e]));
  const region=layout?.scenes.find(s=>s.sceneId===scene.id)?.regions.find(r=>r.blockId===spec.blockId);
  const norm=t=>t.replace(/\s+/gu,'');
  const drawn=region?norm([...region.texts.map(p=>p.runs.map(r=>r.text).join('')),...(region.diagram?.nodes||[]).flatMap(n=>n.texts.flatMap(t=>t.lines.map(l=>l.text)))].join('\n')):'';
  const nodeText=region?norm((region.diagram?.nodes||[]).flatMap(n=>n.texts.flatMap(t=>t.lines.map(l=>l.text))).join('')):'';
  const missing=[
   ...block.nodes.filter(n=>!nodeText.includes(norm(n.label))).map(n=>({part:n.id,missing:'label'})),
   ...[spec.blueprint.wholeExplanationId,...spec.steps.map(s=>s.explanationId)].map(id=>notes.get(id)).filter(e=>!drawn.includes(norm(e.text))).map(e=>({explanationId:e.id,missing:'explanation'}))
  ];
  if(!region||missing.length){problems.push({code:'BLUEPRINT_STATIC_INCOMPLETE',sceneId:scene.id,keyStateId:scene.staticState.keyStateId,message:'The measured static page does not show the whole object with every part and its explanation.',missing:region?missing:[{blockId:spec.blockId,missing:'region'}]});continue;}
  receipts.push({sceneId:scene.id,keyStateId:scene.staticState.keyStateId,stage,stepId,parts:block.nodes.length,explanations:spec.steps.length+1});
 }
 if(problems.length)throw new DeckError(problems.every(p=>p.code==='BLUEPRINT_STATIC_REQUIRED')?'BLUEPRINT_STATIC_REQUIRED':'BLUEPRINT_STATIC_INCOMPLETE','An Explain → Diagram → Explore page would export without its complete explanation.',422,problems);
 return receipts;
}
