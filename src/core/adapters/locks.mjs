import {assertVisualProject,assertVisualLocks,impliedLocks} from '../visual-project.mjs';
/** S9a explicit migration: combined (S1) locks → separate text, data and source locks. Nothing is released: every dataset and
 * source a locked object implied is locked on its own, so the same content stays protected. Returns a copy; the input is unchanged. */
export function separateLocks(project){
 const before=assertVisualProject(project);if(before.document.authorOverrides.lockMode==='separate')return structuredClone(before);
 const next=structuredClone(before),o=next.document.authorOverrides,data=new Set(o.lockedDatasetIds||[]),sources=new Set(o.lockedSourceIds||[]);
 for(const id of o.lockedBlockIds){const implied=impliedLocks(before,id);implied.datasetIds.forEach(d=>data.add(d));implied.sourceIds.forEach(s=>sources.add(s));}
 o.lockMode='separate';o.lockedDatasetIds=[...data];o.lockedSourceIds=[...sources];
 assertVisualProject(next);assertVisualLocks(before,next);return next;
}
