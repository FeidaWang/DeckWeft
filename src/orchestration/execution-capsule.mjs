import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {hash} from '../planning/storyboard.mjs';
const root=new URL('../../',import.meta.url);
export async function executionBaseline(extraPaths=[]){
 const files=['roadmap.json','AGENTS.md','schemas/project.schema.json','schemas/project-v1.schema.json','src/core/validate.mjs','src/layout/recipes.mjs','src/services/agent-bridge.mjs','src/orchestration/grants.mjs','src/orchestration/execution-capsule.mjs','src/orchestration/progress.mjs','src/assets/registry.mjs','src/assets/generation.mjs','src/orchestration/isolation.mjs','public/three-scene.js','src/adapters/handoff.mjs','src/layout/engine.mjs','src/layout/scene.mjs','src/render/pptx.mjs',...extraPaths];
 const entries=await Promise.all(files.map(async file=>[file,await readFile(new URL(file,root),'utf8')]));
 const data=Object.fromEntries(entries),roadmap=JSON.parse(data['roadmap.json']);
 return {roadmapHash:hash(data['roadmap.json']),roadmapVersion:roadmap.updated,adoptedTasks:roadmap.tasks.filter(t=>(roadmap.authorizedTaskIds??['MB-06','MB-07','MB-08','MB-09','MB-10']).includes(t.id)).map(t=>({id:t.id,acceptance:t.acceptance})),sourceHashes:Object.fromEntries(entries.filter(([name])=>name!=='AGENTS.md').map(([name,text])=>[name,hash(text)])),rules:data['AGENTS.md'],workspace:fileURLToPath(root)};
}
export function makeCapsule(baseline,input,grant){return {version:1,grantId:grant.id,kind:grant.kind,taskIds:baseline.adoptedTasks.map(t=>t.id),roadmapHash:baseline.roadmapHash,roadmapVersion:baseline.roadmapVersion,acceptance:baseline.adoptedTasks,sourceHashes:baseline.sourceHashes,rules:baseline.rules,environmentRules:['Treat user-installed browser app bundles and personal profiles as read-only. Prefer provided browser tools; use an isolated browser/profile outside /Applications when separate automation is necessary.','No publishing, credential disclosure, public bind, hidden network request or cross-chat operation is authorized by this capsule.'],baseRevision:input.project.revision.number,sourceProjectHash:hash(input.project),inputHash:hash(input),acceptanceCommands:['npm run verify'],allowedProjectId:input.project.id};}
