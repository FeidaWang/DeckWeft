import {assertSceneInteractions} from '../motion/cues.mjs';
import {assertImageSlots} from '../assets/brief.mjs';
import { assertComposition, sharedScaleMessage } from './compositions.mjs';
import { assertSceneSemantics } from './scene-semantics.mjs';
import schema from '../../schemas/design-plan.schema.json' with { type: 'json' };
import { validateSchema } from '../core/schema.mjs';
import { assertPresentation } from '../core/blocks.mjs';
import { DeckError } from '../core/errors.mjs';
/** S8 theme-only compositions (alignment §16): each belongs to one theme and names the blocks it composes. */
export const THEME_COMPOSITIONS=Object.freeze({
 'fieldnotes-cover':{theme:'editorial-fieldnotes',needs:['heading','paragraph']},'fieldnotes-thesis':{theme:'editorial-fieldnotes',needs:['heading','paragraph']},'fieldnotes-figure':{theme:'editorial-fieldnotes',needs:['heading','chart']},'fieldnotes-method':{theme:'editorial-fieldnotes',needs:['heading',['paragraph','list','diagram','table']]},'fieldnotes-closing':{theme:'editorial-fieldnotes',needs:['heading','list']},
 'atlas-cover':{theme:'research-atlas',needs:['heading']},'atlas-section':{theme:'research-atlas',needs:['heading']},'atlas-figure':{theme:'research-atlas',needs:['heading','chart']},'atlas-panels':{theme:'research-atlas',needs:['heading','chart'],panels:[2,4],sharedScale:true},'atlas-appendix':{theme:'research-atlas',needs:['heading',['table','list']]},'atlas-closing':{theme:'research-atlas',needs:['heading','list']},
 'stage-hero':{theme:'luminous-stage',needs:['heading']},'stage-chapter':{theme:'luminous-stage',needs:['heading']},'stage-figure':{theme:'luminous-stage',needs:['heading','chart']},'stage-metric':{theme:'luminous-stage',needs:['heading','metric']},'stage-closing':{theme:'luminous-stage',needs:['heading','list']}
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
    assertSceneInteractions(document,scene);for(const i of scene.interactions||[])for(const step of i.steps||[])usedExplanations.add(step.explanationId);
    scene.blockIds.forEach(id => used.add(id));
    assertComposition(document,scene);assertImageSlots(document,scene);assertSceneSemantics(document,scene);
    const kinds = scene.blockIds.map(id => blocks.get(id).type);
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
  if (document.blocks.some(b => !used.has(b.id))) fail('Every block must remain visible in at least one scene.');
  if(document.explanations?.some(e=>!usedExplanations.has(e.id)))fail('Every semantic explanation must remain bound to a visible scene.');
  return plan;
}
