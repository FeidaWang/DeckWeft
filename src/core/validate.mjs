import currentSchema from '../../schemas/project.schema.json' with { type: 'json' };
import v1Schema from '../../schemas/project-v1.schema.json' with { type: 'json' };
import { DeckError } from './errors.mjs';
import { validateSchema } from './schema.mjs';
/** Small, closed JSON-Schema subset. Unsupported keywords fail in our build check.
 * No coercion, default insertion, executable expressions, or network $ref resolution. */
export function validateProject(value) {
  const schema=value?.schemaVersion===1?v1Schema:currentSchema;
  const { errors } = validateSchema(value, schema);
  function issue(path, message) { errors.push({ path, message }); }
  if (errors.length === 0) {
    for (const field of ['slides', 'sources']) {
      const ids = value[field].map(x => x.id);
      if (new Set(ids).size !== ids.length) issue(`$.${field}`, 'Every item needs a unique id.');
    }
    const sourceIds = new Set(value.sources.map(s => s.id));
    value.slides.forEach((slide, i) => slide.sourceIds.forEach(id => {
      if (!sourceIds.has(id)) issue(`$.slides[${i}].sourceIds`, `Source ${id} does not exist.`);
    }));
    for (const [i, source] of value.sources.entries()) {
      try { const u = new URL(source.url); if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Error(); }
      catch { issue(`$.sources[${i}].url`, 'Use an HTTP(S) URL without embedded passwords.'); }
    }
    if(value.schemaVersion===1&&Object.keys(value.extensions).some(k=>['planning','assets','intent','storyboard','interaction'].includes(k)))issue('$.extensions','Planning features require explicit version 2 migration.');
    if(value.schemaVersion===2){
      const assets=new Map(value.assets.map(a=>[a.id,a]));
      if(assets.size!==value.assets.length)issue('$.assets','Use unique asset ids.');
      value.assets.forEach((a,i)=>{if(a.path!==`assets/${a.hash}.png`)issue(`$.assets[${i}].path`,'Asset path must match its content hash.');});
      value.slides.forEach((s,i)=>{
        const at=`$.slides[${i}].intent`;
        s.intent.evidence.forEach(e=>{if(!sourceIds.has(e.sourceId)||!s.sourceIds.includes(e.sourceId))issue(at+'.evidence','Evidence must reference a source linked to this slide.');});
        s.intent.assetIds.forEach(id=>{if(!assets.has(id))issue(at+'.assetIds','Referenced asset is missing.');});
        if(s.intent.spatialRecipe&&s.intent.spatialRecipe!=='none'&&s.intent.visualFamily!=='image-caption')issue(at+'.spatialRecipe','Spatial recipes need the image-caption visual family.');
        const a=s.intent.interaction;
        if(a.kind!=='none'&&['cover','image-caption'].includes(s.intent.visualFamily))issue(at+'.interaction','Choose a comparison, process, timeline or metric family for item exploration.');
        if(a.kind==='none'&&(a.labels.length||a.initial!==0))issue(at+'.interaction','No interaction needs empty labels and initial 0.');
        if(a.kind!=='none'&&(a.labels.length!==s.content.items.length||!a.labels.length||a.initial>=a.labels.length))issue(at+'.interaction','Interaction labels must match all items and initial must select an existing item.');
      });
    }
    for (const key of ['createdAt', 'updatedAt']) if (!Number.isFinite(Date.parse(value.revision[key]))) issue(`$.revision.${key}`, 'Use an ISO timestamp.');
  }
  return { ok: errors.length === 0, errors };
}
export function assertProject(value) {
  const result = validateProject(value);
  if (!result.ok) throw new DeckError('INVALID_PROJECT', 'This deck needs a small repair. See the field-level errors.', 422, result.errors);
  return value;
}
