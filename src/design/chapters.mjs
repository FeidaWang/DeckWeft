import {DeckError} from '../core/errors.mjs';
/** S9a chapters. A chapter starts at one scene and runs, in plan order, to the scene before the next start.
 * Membership follows page order, so moving or splitting pages never leaves a chapter with a gap. */
const fail=(message,code='INVALID_DESIGN_PLAN',status=422)=>{throw new DeckError(code,message,status);};
export function chapterRuns(plan){
 const starts=new Map((plan.chapters||[]).map(c=>[c.startSceneId,c])),runs=[];let current=null;
 for(const s of plan.scenes){const c=starts.get(s.id);if(c){current={...structuredClone(c),sceneIds:[]};runs.push(current);}if(current)current.sceneIds.push(s.id);}
 return runs;
}
export const chapterOf=(plan,sceneId)=>chapterRuns(plan).find(c=>c.sceneIds.includes(sceneId))||null;
export function assertChapters(plan){
 const chapters=plan.chapters||[];
 if(new Set(chapters.map(c=>c.id)).size!==chapters.length)fail('Use unique chapter ids.');
 if(new Set(chapters.map(c=>c.startSceneId)).size!==chapters.length)fail('Start at most one chapter on a page.');
 for(const c of chapters)if(!plan.scenes.some(s=>s.id===c.startSceneId))fail('A chapter starts on a missing page.');
 if(chapters.some(c=>plan.scenes.some(s=>s.id===c.id)))fail('Chapter ids must differ from page ids.');
 return plan;
}
/** Starts a chapter at a page. The new chapter takes the profile of the chapter it splits, so nothing renders differently. */
export function startChapter(plan,sceneId,{id='ch-'+sceneId}={}){
 const next=structuredClone(plan);
 if(!next.scenes.some(s=>s.id===sceneId))fail('Choose an existing page.','TOOL_SCOPE',409);
 if((next.chapters||[]).some(c=>c.startSceneId===sceneId))fail('A chapter already starts on this page.','CHAPTER_EXISTS',409);
 if((next.chapters||[]).some(c=>c.id===id))fail('Choose an unused chapter id.','CHAPTER_EXISTS',409);
 const parent=chapterOf(next,sceneId);
 next.chapters=[...(next.chapters||[]),{id,startSceneId:sceneId,...(parent?.profile?{profile:structuredClone(parent.profile)}:{})}];
 next.chapters.sort((a,b)=>next.scenes.findIndex(s=>s.id===a.startSceneId)-next.scenes.findIndex(s=>s.id===b.startSceneId));
 return assertChapters(next);
}
/** Removes a chapter: its pages join the chapter before it, or no chapter. Its profile is not kept. */
export function removeChapter(plan,chapterId){
 const next=structuredClone(plan);
 if(!(next.chapters||[]).some(c=>c.id===chapterId))fail('Choose an existing chapter.','TOOL_SCOPE',409);
 next.chapters=next.chapters.filter(c=>c.id!==chapterId);if(!next.chapters.length)delete next.chapters;
 return assertChapters(next);
}
export function setChapterProfile(plan,chapterId,profile){
 const next=structuredClone(plan),c=(next.chapters||[]).find(c=>c.id===chapterId);
 if(!c)fail('Choose an existing chapter.','TOOL_SCOPE',409);
 if(profile)c.profile=structuredClone(profile);else delete c.profile;
 return assertChapters(next);
}
