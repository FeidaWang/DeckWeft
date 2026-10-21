const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/** Bounded, local-only JSON Schema subset. No coercion or remote references. */
export function validateSchema(value, schema) {
  const errors = [];
  function issue(path, message) { errors.push({ path, message }); }
  function walk(v, rule, path, depth = 0) {
    if (errors.length >= 60) return;
    if (depth > 30) { issue(path, 'Nesting is too deep.'); return; }
    if (rule.oneOf) {
      const matches = rule.oneOf.filter(branch => validateSchema(v, { ...branch, $defs: schema.$defs }).ok);
      if (matches.length !== 1) {
        issue(path, 'Use exactly one supported block contract.');
        // DWI-023: name the field to repair, from the branch whose `type` constant matches the value's type.
        const branch = v && typeof v === 'object' && rule.oneOf.map(b => b.$ref ? schema.$defs[b.$ref.split('/').at(-1)] : b).find(b => b?.properties?.type?.const !== undefined && b.properties.type.const === v.type);
        if (branch && matches.length === 0) for (const e of validateSchema(v, { ...branch, $defs: schema.$defs }).errors) issue(path + e.path.slice(1), e.message);
      }
      return;
    }
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
  return { ok: errors.length === 0, errors };
}
