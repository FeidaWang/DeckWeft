import {validateComponents} from '../components/validate.mjs';
import schema from '../../schemas/presentation-v3.schema.json' with { type: 'json' };
import { validateSchema } from './schema.mjs';
import { DeckError } from './errors.mjs';
export const PRESENTATION_FORMAT = 'deckweft-presentation';
/** Explicit experimental format. Never pass this to the legacy ProjectStore. */
export function assertPresentation(document) {
  const result = validateSchema(document, schema);
  const fail = (message) => { throw new DeckError('INVALID_PRESENTATION', message, 422, result.errors); };
  if (!result.ok) fail('Use a valid version 3 semantic document.');
  for (const key of ['blocks', 'datasets', 'sources']) {
    if (new Set(document[key].map(item => item.id)).size !== document[key].length) fail(`Use unique ${key} ids.`);
  }
  const sources = new Set(document.sources.map(s => s.id)), blocks = new Map(document.blocks.map(b => [b.id,b]));
  const datasets = new Map(document.datasets.map(d => [d.id,d]));
  const links = ids => { if (ids.some(id => !sources.has(id))) fail('A source reference is missing.'); };
  document.sources.forEach(s => { try { const u = new URL(s.url); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw Error(); } catch { fail('Use HTTP(S) source URLs without credentials.'); } });
  if(new Set((document.explanations||[]).map(e=>e.id)).size!==(document.explanations||[]).length)fail('Use unique explanation identities.');
  for(const e of document.explanations||[])links(e.sourceIds);
  document.datasets.forEach(d => {
    links(d.sourceIds);
    if (new Set(d.series.map(s => s.id)).size !== d.series.length) fail('Use unique series ids.');
    if (d.series.some(s => s.values.length !== d.categories.length)) fail('Every series needs one typed numeric value per category.');
  });
  document.blocks.forEach(b => {
    links(b.sourceIds);
    if (b.type === 'chart' && !datasets.has(b.datasetId)) fail('Chart dataset is missing.');
    if (b.type === 'citation' && (!sources.has(b.sourceId) || !b.sourceIds.includes(b.sourceId))) fail('Citation must link its source.');
    if (b.type === 'table' && b.rows.some(r => r.length !== b.columns.length)) fail('Table rows must match the columns.');
    if (b.type === 'diagram') {
      const ids = new Set(b.nodes.map(n => n.id));
      if (ids.size !== b.nodes.length || b.edges.some(e => !ids.has(e.from) || !ids.has(e.to))) fail('Diagram edges need existing unique nodes.');
    }
  });
  if (document.authorOverrides.lockedBlockIds.some(id => !blocks.has(id))) fail('A locked block is missing.');
  if(document.visualBrief && document.visualBrief.outputLanguage!==document.locale) fail('Visual brief output language must match the document locale; interface language is independent.');
  const snapshots=document.sourceSnapshots||[];
  if(new Set(snapshots.map(s=>s.id)).size!==snapshots.length)fail('Use unique source snapshot ids.');
  for(const s of snapshots){links([s.sourceId]);if(s.anchors.some(a=>!blocks.has(a.blockId)))fail('Source anchors must reference existing semantic blocks.');}
  validateComponents(document,fail);
  return document;
}
