import { compositions } from './compositions.mjs';
import { assertVisualProject } from '../core/visual-project.mjs';
import { themePacks } from './theme-registry.mjs';
import { DeckError } from '../core/errors.mjs';
import { visibleBlockIds } from './plan.mjs';
import { assertPaletteReference } from './palette-registry.mjs';
/** Theme selection changes scoped design only. Facts, assets, locks and other scenes stay intact.
 * It writes theme, version and composition, never the colour mode: a theme round trip returns the original plan.
 * Violet chapter needs its chapter colour, so a scene whose mode is explicitly default gets reading flow instead. */
/** S8 themes: the composition a page gets when its current one belongs to another theme. Content decides; nothing is removed. */
const has=(blocks,type)=>blocks.some(b=>b.type===type);
const S8_DEFAULTS={
 'silver-gray-editorial':b=>has(b,'chart')?'fieldnotes-figure':has(b,'paragraph')?'fieldnotes-cover':'reading-flow',
 'fresh-report':b=>has(b,'chart')?'atlas-figure':'atlas-cover',
 'orange-launch':b=>has(b,'chart')?'stage-figure':has(b,'metric')?'stage-metric':'stage-hero'
};
export function applySceneTheme(project,sceneId,theme){
 const copy=structuredClone(assertVisualProject(project)),scene=copy.plan.scenes.find(s=>s.id===sceneId),pack=themePacks().find(p=>p.id===theme);
 if(!scene||!pack)throw new DeckError('THEME_SELECTION','Choose an existing scene and theme.');
 const locks=copy.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===sceneId)?.fields||[];
 if(locks.includes('theme'))throw new DeckError('AUTHOR_LOCK','Unlock this scene theme before changing it.',409);
 const blocks=visibleBlockIds(scene).map(id=>copy.document.blocks.find(b=>b.id===id));
 const composition=compositions.some(c=>c.id===scene.composition)?scene.composition:S8_DEFAULTS[theme]?S8_DEFAULTS[theme](blocks):theme==='electric-violet'?(blocks.some(b=>b.type==='image')?'photo-split':scene.colorMode==='default'?'reading-flow':'violet-chapter'):theme==='dark-data'&&blocks.some(b=>b.type==='chart')?'chart-with-evidence-rail':theme==='cream-collage'&&blocks.some(b=>b.type==='metric')?'diagonal-cover':'reading-flow';
 if(locks.includes('composition')&&composition!==scene.composition)throw new DeckError('AUTHOR_LOCK','Unlock composition before applying a theme with different geometry.',409);
 scene.theme=theme;scene.themeVersion=pack.version;scene.composition=composition;
 return assertVisualProject(copy);
}
/**
 * DWI-013: sets or clears one page's source palette. Only `scene.palette` changes: facts, blocks, locks, composition and other
 * pages stay as they were, so a palette round trip returns the original plan. A theme lock also holds the palette.
 */
export function applyScenePalette(project,sceneId,palette){
 const copy=structuredClone(assertVisualProject(project)),scene=copy.plan.scenes.find(s=>s.id===sceneId);
 if(!scene)throw new DeckError('PALETTE_SELECTION','Choose an existing scene.');
 const locks=copy.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===sceneId)?.fields||[];
 if(locks.includes('theme'))throw new DeckError('AUTHOR_LOCK','Unlock this scene’s colours before changing its palette.',409);
 if(palette===null)delete scene.palette;else scene.palette=structuredClone(assertPaletteReference(palette));
 return assertVisualProject(copy);
}
