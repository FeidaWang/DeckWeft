import { createProject, createSlide, identifier } from './model.mjs';
import { assertProject } from './validate.mjs';
import { DeckError } from './errors.mjs';
/** Explicit import: never normalize a broken current document into a valid-looking one. */
export function importProject(raw) {
  if (raw?.format === 'deckweft') return { project: structuredClone(assertProject(raw)), warnings: [] };
  if (!raw || raw.schemaVersion !== 2 || !Array.isArray(raw.slides) || !raw.slides.length) {
    throw new DeckError('UNSUPPORTED_IMPORT', 'Import a DeckWeft JSON file or a legacy schemaVersion 2 project. PPTD and PPTX import are not supported yet.', 422);
  }
  const mapping = { 'editorial-split': 'editorial', 'cinematic-field': 'spotlight', 'modular-flow': 'timeline', 'data-focus': 'grid' };
  const roles = { cover: 'opening', data: 'evidence', process: 'process', closing: 'closing' };
  const ids = new Set();
  const slides = raw.slides.map((s) => {
    if (!s?.content || typeof s.content.title !== 'string') throw new DeckError('INVALID_LEGACY', 'A legacy slide is missing its title.', 422);
    let id = typeof s.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(s.id) ? s.id : identifier('slide');
    if (ids.has(id)) id = identifier('slide'); ids.add(id);
    const c = s.content;
    return createSlide({ id, role: roles[s.kind] || 'context', content: {
      eyebrow: c.eyebrow || '', title: c.title || 'Untitled',
      body: [c.subtitle, c.body, c.quote, c.attribution].filter(Boolean).join('\n'),
      items: c.bullets || [], metrics: (c.metrics || []).map(m => ({ label: String(m.label), value: String(m.value) }))
    }, notes: s.notes || '', design: { layout: mapping[s.layout?.selectedId] || 'auto' } });
  });
  const project = createProject({ title: raw.title || 'Imported deck', locale: raw.locale || 'en',
    aspectRatio: raw.aspectRatio || '16:9', slides,
    brief: { prompt: raw.source?.prompt || '', audience: raw.source?.audience || '', outcome: raw.source?.goal || '' },
    extensions: { legacy: { format: 'open-deck-astra-v2', original: structuredClone(raw) } }
  });
  assertProject(project);
  return { project, warnings: [
    'Original JSON is kept in extensions.legacy.original. The source file was not changed.',
    'Media, theme overrides, layout locks, custom motion, and old citation formats are archived, not rendered. Review them before exporting.',
    'Legacy layout scores were discarded. DeckWeft recalculates layout choices.'
  ] };
}
