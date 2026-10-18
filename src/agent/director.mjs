import {fromOutline} from '../core/model.mjs';
import {migrateToPresentation} from '../core/adapters/legacy-project.mjs';
import {createVisualProject,assertVisualProject} from '../core/visual-project.mjs';
import {designBrief} from './design-brief.mjs';
import {repairBudget} from '../quality/repair-plan.mjs';
import {contentHash} from '../scene/web/compile.mjs';
export const TASK_TOOLS=Object.freeze(['content.inspect','design.propose','assets.resolve','render.preview','render.inspect','design.patch','artifact.export']);
/** Supplied text becomes a complete source-preserving story, without model/network calls.
 * A single supplied page stays one page; no duplicated opening or closing is added.
 * A host-authored outline may use --- separators; no source claim is synthesized. */
export function planStory(request,{locale='en'}={}) {
 if(typeof request!=='string'||!request.trim()||request.length>12000)throw Error('Supply a request of 1–12000 characters.');
 const legacy=fromOutline(request,{locale});
 const {document,plan}=migrateToPresentation(legacy);
 plan.scenes.forEach((s,i)=>s.composition=['statement-split','statement-banner','statement-center'][i%3]);
 return createVisualProject(document,plan,{id:document.id});
}
export function createVisualTask({request,project,sceneIds,tools=TASK_TOOLS,budget={},locale}={}) {
 if(typeof request!=='string'||!request.trim()||request.length>12000)throw Error('Supply a bounded task request.');
 const input=project?structuredClone(project.format==='deckweft-visual-project'?assertVisualProject(project):(()=>{const {document,plan}=migrateToPresentation(project);return createVisualProject(document,plan,{id:document.id});})()):planStory(request,{locale});
 const scope=sceneIds??input.plan.scenes.map(s=>s.id);
 if(!Array.isArray(scope)||!scope.length||scope.some(id=>!input.plan.scenes.some(s=>s.id===id))||new Set(scope).size!==scope.length)throw Error('Choose current unique scene ids.');
 if(!Array.isArray(tools)||!tools.length||tools.some(t=>!TASK_TOOLS.includes(t))||new Set(tools).size!==tools.length)throw Error('Choose documented task tools.');
 return {format:'deckweft-visual-task',version:1,sequence:0,request,scope,tools:[...tools],budget:repairBudget(budget),status:'planned',original:structuredClone(input),project:input,brief:designBrief(input,request,scope),history:[],events:[],diagnostics:[],receipt:null,observation:null,previewHash:null,lastValid:null,repairSpent:{rounds:0,candidates:0,sceneChanges:0,milliseconds:0},basis:contentHash(input)};
}
