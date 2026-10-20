import {assertSceneInteractions} from '../motion/cues.mjs';
import {assertImageSlots} from '../assets/brief.mjs';
import { assertComposition, sharedScaleMessage } from './compositions.mjs';
import { assertSceneSemantics } from './scene-semantics.mjs';
import schema from '../../schemas/design-plan.schema.json' with { type: 'json' };
import { validateSchema } from '../core/schema.mjs';
import { assertPresentation } from '../core/blocks.mjs';
import { DeckError } from '../core/errors.mjs';
import { assertChapters } from './chapters.mjs';
import { assertReferences } from '../references/presentation.mjs';
/** S9a: blocks behind a page disclosure stay in the scene and the document, but outside the composition. */
export const visibleBlockIds=scene=>scene.disclosure?scene.blockIds.filter(id=>!scene.disclosure.blockIds.includes(id)):scene.blockIds;
export const visibleScene=scene=>scene.disclosure?{...scene,blockIds:visibleBlockIds(scene)}:scene;
export const DISCLOSURE_TYPES=Object.freeze(['paragraph','list','callout']);
/** S8 theme-only compositions (alignment §16): each belongs to one theme and names the blocks it composes. */
export const THEME_COMPOSITIONS=Object.freeze({
 'fieldnotes-cover':{theme:'silver-gray-editorial',needs:['heading','paragraph']},'fieldnotes-thesis':{theme:'silver-gray-editorial',needs:['heading','paragraph']},'fieldnotes-figure':{theme:'silver-gray-editorial',needs:['heading','chart']},'fieldnotes-method':{theme:'silver-gray-editorial',needs:['heading',['paragraph','list','diagram','table']]},'fieldnotes-closing':{theme:'silver-gray-editorial',needs:['heading','list']},
 'atlas-cover':{theme:'fresh-report',needs:['heading']},'atlas-section':{theme:'fresh-report',needs:['heading']},'atlas-figure':{theme:'fresh-report',needs:['heading','chart']},'atlas-panels':{theme:'fresh-report',needs:['heading','chart'],panels:[2,4],sharedScale:true},'atlas-appendix':{theme:'fresh-report',needs:['heading',['table','list']]},'atlas-closing':{theme:'fresh-report',needs:['heading','list']},
 'stage-hero':{theme:'orange-launch',needs:['heading']},'stage-chapter':{theme:'orange-launch',needs:['heading']},'stage-figure':{theme:'orange-launch',needs:['heading','chart']},'stage-metric':{theme:'orange-launch',needs:['heading','metric']},'stage-closing':{theme:'orange-launch',needs:['heading','list']}
});
export function assertDesignPlan(document, plan) {
  assertPresentation(document);
  const result = validateSchema(plan, schema);
  const fail = message => { throw new DeckError('INVALID_DESIGN_PLAN', message, 422, result.errors); };
  if (!result.ok) fail('Use the versioned design-plan contract.');
  if (plan.documentId !== document.id) fail('The design plan belongs to another document.');
  if (new Set(plan.scenes.map(s => s.id)).size !== plan.scenes.length) fail('Use stable unique scene ids.');
  const blocks = new Map(document.blocks.map(b => [b.id,b]));
  const used = new Set(),usedExplanations=new Set();
  for (const scene of plan.scenes) {
    if((['present','previous','next','page','status','dw-runtime-data','semantic-motion'].includes(scene.id)||scene.id.startsWith('dw-object-')))fail('Choose a scene id outside the player control namespace.');
    if (scene.blockIds.some(id => !blocks.has(id)) || !scene.blockIds.includes(scene.focalBlockId)) fail('Scene bindings and focal point must reference existing blocks.');
    for(const id of scene.blockIds){const b=blocks.get(id);if(b.type==='annotation'&&!scene.blockIds.includes(b.target.blockId))fail('Annotations must share a scene with their stable target.');}
    assertSceneInteractions(document,scene);for(const i of scene.interactions||[]){for(const step of i.steps||[])usedExplanations.add(step.explanationId);if(i.blueprint)usedExplanations.add(i.blueprint.wholeExplanationId);}
    scene.blockIds.forEach(id => used.add(id));
    if(scene.disclosure){const hidden=new Set(scene.disclosure.blockIds),targets=new Set([...(scene.interactions||[]).flatMap(i=>[i.blockId,i.otherBlockId,...(i.hotspots||[]).map(h=>h.annotationId)]),...scene.blockIds.map(id=>blocks.get(id)).filter(b=>b.type==='annotation').map(b=>b.target.blockId)]);
     if(scene.disclosure.blockIds.some(id=>!scene.blockIds.includes(id)||!DISCLOSURE_TYPES.includes(blocks.get(id)?.type)))fail('A page disclosure holds paragraph, list or callout blocks of the same page.');
     if(hidden.has(scene.focalBlockId)||hidden.has(scene.takeaway?.blockId)||[...hidden].some(id=>targets.has(id)))fail('The focal block, the takeaway and interaction or annotation targets stay on the page.');}
    assertComposition(document,visibleScene(scene));assertImageSlots(document,scene);assertSceneSemantics(document,scene);assertReferences(document,visibleScene(scene));
    const kinds = visibleBlockIds(scene).map(id => blocks.get(id).type);
    if (scene.composition === 'diagonal-cover' && (scene.theme !== 'cream-collage' || !kinds.includes('heading') || !kinds.includes('metric'))) fail('Diagonal cover needs Cream Collage, a heading and a metric.');
    if (scene.composition === 'chart-with-evidence-rail' && (scene.theme !== 'dark-data' || !kinds.includes('chart') || !kinds.includes('heading'))) fail('Chart evidence needs Dark Data, a heading and a chart.');
    if(scene.crops){
      if(new Set(scene.crops.map(c=>c.blockId)).size!==scene.crops.length)fail('Use one crop per image block in a scene.');
      for(const c of scene.crops)if(!scene.blockIds.includes(c.blockId)||blocks.get(c.blockId)?.type!=='image'||c.x+c.width>1.000001||c.y+c.height>1.000001)fail('Crops must stay inside a bound image.');
    }
    if(scene.composition==='photo-split'&&(scene.theme!=='electric-violet'||!kinds.includes('image')||!kinds.includes('heading')))fail('Photo split needs Electric Violet, a heading and a local image.');
    if(scene.composition==='violet-chapter'&&(scene.theme!=='electric-violet'||!kinds.includes('heading')))fail('Violet chapter needs Electric Violet and a heading.');
    const own=THEME_COMPOSITIONS[scene.composition];
    if(own){if(scene.theme!==own.theme)fail(`${scene.composition} belongs to the ${own.theme} theme.`);for(const need of own.needs)if(!(Array.isArray(need)?need.some(k=>kinds.includes(k)):kinds.includes(need)))fail(`${scene.composition} needs ${Array.isArray(need)?need.join(' or '):need}; keep all existing content.`);if(own.panels&&kinds.filter(k=>k==='chart').length<own.panels[0])fail(`${scene.composition} needs at least ${own.panels[0]} chart panels.`);if(own.panels&&kinds.filter(k=>k==='chart').length>own.panels[1])fail(`${scene.composition} shows at most ${own.panels[1]} chart panels per page.`);if(own.sharedScale){const message=sharedScaleMessage(document,scene);if(message)fail(message);}}
  }
  for(const lock of document.authorOverrides.sceneLocks||[])if(!plan.scenes.some(s=>s.id===lock.sceneId))fail('A locked scene is missing.');
  assertChapters(plan);
  if (document.blocks.some(b => !used.has(b.id))) fail('Every block must remain visible in at least one scene.');
  if(document.explanations?.some(e=>!usedExplanations.has(e.id)))fail('Every semantic explanation must remain bound to a visible scene.');
  return plan;
}
