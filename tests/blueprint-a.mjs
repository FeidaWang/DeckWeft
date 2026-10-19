import {readFile} from 'node:fs/promises';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
/** S9b blueprint A sample: an opening page, the Explain → Diagram → Explore page (DeckWeft's own export pipeline) and a closing page. */
export const BLUEPRINT_THEMES=['cream-collage','dark-data','electric-violet','silver-gray-editorial','fresh-report','orange-launch'];
export const blueprintFixture=async locale=>JSON.parse(await readFile(new URL(`fixtures/visual/blueprint-a.${locale}.json`,import.meta.url),'utf8'));
/** The fixture in one theme (every page), optionally with another static state (`null` removes it). */
export async function blueprintProject(locale,{theme='cream-collage',staticState,id=`s9b-blueprint-${theme}-${locale}`}={}){
 const {document,plan}=await blueprintFixture(locale),scene=plan.scenes.find(s=>s.id==='pipeline');
 if(staticState===null)delete scene.staticState;else if(staticState)scene.staticState={keyStateId:staticState};
 let p=createVisualProject(document,plan,{id});
 for(const s of p.plan.scenes)p=applySceneTheme(p,s.id,theme);
 return p;
}
