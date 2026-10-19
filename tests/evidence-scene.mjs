import {readFile} from 'node:fs/promises';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
/** The S2 vertical sample: one illustrative evidence scene (plus a closing page for page navigation) in English and Simplified Chinese. */
export const evidenceScene=async locale=>JSON.parse(await readFile(new URL(`fixtures/visual/evidence-scene.${locale}.json`,import.meta.url),'utf8'));
export async function evidenceProject(locale,{staticState,...options}={}){
 const {document,plan}=await evidenceScene(locale);
 if(staticState)plan.scenes[0].staticState={keyStateId:staticState};
 return createVisualProject(document,plan,{id:`s2-evidence-${locale}`,...options});
}
export const SEMANTIC_SCENE_FIELDS=['id','role','blockIds','focalBlockId','takeaway','contentStatus','interactions','cues','keyStates','staticState','motion'];
/** Everything a theme may not change: the whole semantic document plus each scene's content, interaction, motion and static-state fields. */
export const semanticView=project=>structuredClone({document:project.document,scenes:project.plan.scenes.map(s=>Object.fromEntries(SEMANTIC_SCENE_FIELDS.filter(k=>k in s).map(k=>[k,s[k]])))});
/** Reports what the target contract declares for each component. No L1/L2/L3 level is invented where none is declared. */
export function declaredExportLevels(document,plan){
 return Object.fromEntries(['pptx','pdf'].map(target=>{const r=presentationCapabilities(target,document,{},plan);return [target,{refused:r.issues.map(i=>i.code),components:r.components.map(c=>({blockId:c.blockId,component:c.variant,level:c.level??null,supported:c.supported,representation:c.representation}))}];}));
}
