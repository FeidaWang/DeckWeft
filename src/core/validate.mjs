import currentSchema from '../../schemas/project.schema.json' with { type: 'json' };
import v1Schema from '../../schemas/project-v1.schema.json' with { type: 'json' };
import { DeckError } from './errors.mjs';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/** Small, closed JSON-Schema subset. Unsupported keywords fail in our build check.
 * No coercion, default insertion, executable expressions, or network $ref resolution. */
export function validateProject(value) {
  const schema=value?.schemaVersion===1?v1Schema:currentSchema;
  const errors = [];
  function issue(path, message) { errors.push({ path, message }); }
  function walk(v, rule, path, depth = 0) {
    if (errors.length >= 60) return;
    if (depth > 30) { issue(path, 'Nesting is too deep.'); return; }
    if (rule.$ref) rule = schema.$defs[rule.$ref.split('/').at(-1)];
    if (rule.const !== undefined && v !== rule.const) issue(path, `Expected ${JSON.stringify(rule.const)}.`);
    if (rule.enum && !rule.enum.includes(v)) issue(path, `Choose one of: ${rule.enum.join(', ')}.`);
    const actual = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    const typeOK = rule.type === 'integer' ? Number.isSafeInteger(v) : !rule.type || actual === rule.type;
    if (!typeOK) { issue(path, `Expected ${rule.type}, not ${actual}.`); return; }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) issue(path, 'Use a finite number.');
      if (rule.minimum !== undefined && v < rule.minimum) issue(path, `Minimum is ${rule.minimum}.`);
      if (rule.maximum !== undefined && v > rule.maximum) issue(path, `Maximum is ${rule.maximum}.`);
    }
    if (typeof v === 'string') {
      const n = [...v].length;
      if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(v))issue(path,'Remove unsupported control characters.');
      if(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/u.test(v))issue(path,'Repair the invalid Unicode character.');
      if (rule.minLength !== undefined && n < rule.minLength) issue(path, 'This field cannot be empty.');
      if (rule.maxLength !== undefined && n > rule.maxLength) issue(path, `Use at most ${rule.maxLength} characters.`);
      if (rule.pattern && !new RegExp(rule.pattern, 'u').test(v)) issue(path, 'The value has an unsupported format.');
    }
    if (Array.isArray(v)) {
      if (rule.minItems !== undefined && v.length < rule.minItems) issue(path, `Add at least ${rule.minItems} item(s).`);
      if (rule.maxItems !== undefined && v.length > rule.maxItems) issue(path, `Use at most ${rule.maxItems} items.`);
      if (rule.uniqueItems && new Set(v.map(x => JSON.stringify(x))).size !== v.length) issue(path, 'Remove duplicate items.');
      v.forEach((item, i) => walk(item, rule.items || {}, `${path}[${i}]`, depth + 1));
    } else if (v && typeof v === 'object') {
      for (const k of rule.required || []) if (!own(v, k)) issue(`${path}.${k}`, 'Required field is missing.');
      for (const k of Object.keys(v)) {
        if (['__proto__', 'prototype', 'constructor'].includes(k)) { issue(`${path}.${k}`, 'Reserved key is not allowed.'); continue; }
        if (rule.additionalProperties === false && !own(rule.properties || {}, k)) issue(`${path}.${k}`, 'Unknown field. Use the versioned contract for product features.');
        walk(v[k], (rule.properties || {})[k] || {}, `${path}.${k}`, depth + 1);
      }
    }
  }
  walk(value, schema, '$');
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
