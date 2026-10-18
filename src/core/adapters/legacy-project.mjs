import { createHash } from 'node:crypto';
import { assertProject } from '../validate.mjs';
import { assertPresentation } from '../blocks.mjs';
import { assertDesignPlan } from '../../design/plan.mjs';
/** Explicit copy adapter. Old numbers are strings: preserve them; never guess chart data. */
export function migrateToPresentation(project) {
  assertProject(project);
  const original = structuredClone(project), blocks = [], scenes = [];
  for (const [index,slide] of project.slides.entries()) {
    const ids = [], add = (suffix,type,fields) => { const id = `b${index}_${suffix}`; ids.push(id); blocks.push({id,type,sourceIds:[...slide.sourceIds],...fields}); };
    add('title','heading',{text:slide.content.title});
    if (slide.content.eyebrow) add('eyebrow','paragraph',{text:slide.content.eyebrow});
    if (slide.content.body) add('body','paragraph',{text:slide.content.body});
    if (slide.content.items.length) add('items','list',{items:[...slide.content.items]});
    slide.content.metrics.forEach((m,i) => add(`metric${i}`,'callout',{text:`${m.value} — ${m.label}`}));
    scenes.push({id:slide.id,role:slide.role,theme:'cream-collage',themeVersion:'1.0.0',composition:'reading-flow',blockIds:ids,focalBlockId:ids[0]});
  }
  const document = assertPresentation({format:'deckweft-presentation',schemaVersion:3,id:project.id,title:project.title,locale:project.locale,blocks,datasets:[],sources:structuredClone(project.sources),authorOverrides:{lockedBlockIds:[]},migration:{sourceHash:createHash('sha256').update(JSON.stringify(original)).digest('hex'),original,limitations:['Legacy metrics stay text. Legacy assets, design, private notes and extensions are archived in original; review before web use.']}});
  const plan = assertDesignPlan(document,{format:'deckweft-design-plan',version:1,documentId:document.id,scenes});
  return {document,plan,warnings:document.migration.limitations};
}
