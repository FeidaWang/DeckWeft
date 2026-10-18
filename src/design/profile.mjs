import { compositions } from './compositions.mjs';
import { assertVisualProject } from '../core/visual-project.mjs';
import { themePacks } from './theme-registry.mjs';
import { DeckError } from '../core/errors.mjs';
/** Theme selection changes scoped design only. Facts, assets, locks and other scenes stay intact. */
export function applySceneTheme(project,sceneId,theme){
 const copy=structuredClone(assertVisualProject(project)),scene=copy.plan.scenes.find(s=>s.id===sceneId),pack=themePacks().find(p=>p.id===theme);
 if(!scene||!pack)throw new DeckError('THEME_SELECTION','Choose an existing scene and theme.');
 const locks=copy.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===sceneId)?.fields||[];
 if(locks.includes('theme'))throw new DeckError('AUTHOR_LOCK','Unlock this scene theme before changing it.',409);
 const blocks=scene.blockIds.map(id=>copy.document.blocks.find(b=>b.id===id));
 const composition=compositions.some(c=>c.id===scene.composition)?scene.composition:theme==='electric-violet'?(blocks.some(b=>b.type==='image')?'photo-split':'violet-chapter'):theme==='dark-data'&&blocks.some(b=>b.type==='chart')?'chart-with-evidence-rail':theme==='cream-collage'&&blocks.some(b=>b.type==='metric')?'diagonal-cover':'reading-flow';
 if(locks.includes('composition')&&composition!==scene.composition)throw new DeckError('AUTHOR_LOCK','Unlock composition before applying a theme with different geometry.',409);
 scene.theme=theme;scene.themeVersion=pack.version;scene.composition=composition;scene.colorMode=composition==='violet-chapter'?'chapter':'default';
 return assertVisualProject(copy);
}
