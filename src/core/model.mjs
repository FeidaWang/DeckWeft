import { randomUUID } from 'node:crypto';
import { DeckError } from './errors.mjs';
export const VERSION = '0.1.0-alpha.2';
export const RATIOS = ['16:9', '4:3', '1:1', '9:16'];
export const LOCALES = ['en', 'zh-CN'];
export const THEMES = ['paper', 'midnight', 'ocean', 'signal'];
export const LAYOUTS = ['editorial', 'spotlight', 'grid', 'timeline'];
export const ROLES = ['opening', 'context', 'evidence', 'process', 'decision', 'closing'];
export const identifier = (prefix = 'deck') => `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
export function createSlide(input = {}) {
  return {
    id: identifier('slide'), role: 'context',
    content: { eyebrow: '', title: 'A clear idea', body: '', items: [], metrics: [], ...input.content },
    design: { layout: 'auto', ...input.design },
    motion: { preset: 'none', duration: 6, ...input.motion },
    notes: input.notes || '', sourceIds: input.sourceIds || [],
    ...(input.id ? { id: input.id } : {}), ...(input.role ? { role: input.role } : {})
  };
}
export function createProject(input = {}) {
  const now = new Date().toISOString();
  return {
    format: 'deckweft', schemaVersion: 1, id: input.id || identifier(),
    title: input.title || 'My first deck', locale: input.locale || 'en',
    aspectRatio: input.aspectRatio || '16:9', theme: input.theme || 'paper',
    brief: { prompt: '', audience: '', outcome: '', ...input.brief },
    slides: input.slides ? input.slides.map(createSlide) : [createSlide({ role: 'opening' })],
    sources: input.sources || [],
    revision: { number: 0, createdAt: now, updatedAt: now },
    extensions: input.extensions || {}
  };
}
/** Markdown is an outline, never executable HTML or an instruction to a shell. */
export function fromOutline(markdown, options = {}) {
  if (typeof markdown !== 'string' || markdown.length > 100_000) {
    throw new DeckError('OUTLINE_SIZE', 'Use an outline shorter than 100,000 characters.');
  }
  const chunks = markdown.trim().split(/^\s*---\s*$/m).filter(s => s.trim());
  if (!chunks.length || chunks.length > 100) throw new DeckError('SLIDE_COUNT', 'Use between 1 and 100 slides. Separate slides with --- on its own line.');
  const slides = chunks.map((chunk, index) => {
    const lines = chunk.trim().split(/\r?\n/);
    const title = lines.shift().replace(/^#{1,6}\s*/, '').trim();
    const items = [], body = [];
    for (const line of lines) {
      if (/^\s*[-*]\s+/.test(line)) items.push(line.replace(/^\s*[-*]\s+/, ''));
      else if (line.trim()) body.push(line.trim());
    }
    return createSlide({ role: index === 0 ? 'opening' : index === chunks.length - 1 ? 'closing' : 'context', content: { title, body: body.join('\n'), items } });
  });
  return createProject({ ...options, title: options.title || slides[0].content.title, slides });
}
export function editSlides(project, action) {
  const next = structuredClone(project), index = next.slides.findIndex(s => s.id === action.slideId);
  if (action.type === 'add') next.slides.push(createSlide(action.slide || {}));
  else {
    if (index < 0) throw new DeckError('SLIDE_NOT_FOUND', 'Choose a slide that is in this deck.', 404);
    if (action.type === 'duplicate') {
      const copy = structuredClone(next.slides[index]); copy.id = identifier('slide');
      next.slides.splice(index + 1, 0, copy);
    } else if (action.type === 'remove') {
      if (next.slides.length === 1) throw new DeckError('LAST_SLIDE', 'Keep one slide, or create a new deck instead.');
      next.slides.splice(index, 1);
    } else if (action.type === 'move') {
      if (!Number.isInteger(action.to) || action.to < 0 || action.to >= next.slides.length) throw new DeckError('MOVE_RANGE', 'Choose a position inside this deck.');
      next.slides.splice(action.to, 0, next.slides.splice(index, 1)[0]);
    } else throw new DeckError('UNKNOWN_ACTION', 'That slide action is not supported.');
  }
  return next;
}
