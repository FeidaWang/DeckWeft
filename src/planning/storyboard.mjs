import {createHash} from 'node:crypto';
import {assertProject} from '../core/validate.mjs';
import {createSlide,identifier} from '../core/model.mjs';
import {DeckError} from '../core/errors.mjs';
export const VISUAL_FAMILIES=['cover','comparison','process','timeline','metric','image-caption'];
export const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function inferFamily(slide,index=1){
 if(slide.content.metrics.length)return 'metric';
 if(slide.role==='opening'||slide.role==='closing'||index===0)return 'cover';
 if(slide.role==='process')return 'process';
 if(/timeline|schedule|roadmap|时间|路线|阶段/i.test(slide.content.title))return 'timeline';
 if(/compar|versus|\bvs\b|比较|对比/i.test(slide.content.title))return 'comparison';
 return 'comparison';
}
export function intentFor(slide,project,index){return {claim:slide.content.title,audience:project.brief.audience,evidence:slide.sourceIds.map(sourceId=>({sourceId,support:slide.content.body||slide.content.title})),visualFamily:inferFamily(slide,index),assetIds:[],interaction:{kind:'none',initial:0,labels:[]}};}
/** Explicit v1 -> v2 copy. Callers must retain original; reading/importing v1 never upgrades. */
export function migrateToPlanning(original,{id=identifier()}={}){
 assertProject(original);if(original.schemaVersion!==1)throw new DeckError('MIGRATION_VERSION','Choose a version 1 project to migrate as a separate copy.',422);
 const project=structuredClone(original);project.id=id;project.schemaVersion=2;project.revision={...project.revision,number:0};
 project.assets=[];project.planning={brief:project.brief.prompt||project.title,inputHash:hash(original),reviewed:false};
 project.slides.forEach((s,i)=>s.intent=intentFor(s,project,i));
 project.extensions.deckweftMigration={fromVersion:1,sourceId:original.id,sourceHash:hash(original)};
 return {project:assertProject(project),original:structuredClone(original),warnings:['Version 1 remains unchanged. Review the proposed intent, evidence and scripts before saving this version 2 copy.']};
}
/** Deterministic proposal based only on supplied text. No research, invented evidence or implicit model call. */
export function proposeStoryboard(original,brief){
 assertProject(original);if(typeof brief!=='string'||!brief.trim()||brief.length>12000)throw new DeckError('STORY_BRIEF','Write a brief of 1–12000 characters.',422);
 const project=original.schemaVersion===1?migrateToPlanning(original).project:structuredClone(original);
 if(original.schemaVersion===2){project.id=identifier();project.revision.number=0;}
 project.brief.prompt=brief;project.planning={brief,inputHash:hash({original,brief}),reviewed:false};
 // Each separated paragraph is a proposed claim. Otherwise keep the supplied slide claims.
 const paragraphs=brief.split(/\n\s*\n|\n---\n/u).map(s=>s.trim()).filter(Boolean);
 if(paragraphs.length>1){if(paragraphs.length>100)throw new DeckError('STORY_COUNT','Use at most 100 story paragraphs.',422);project.slides=paragraphs.map((p,i)=>{const [title,...body]=p.split('\n');return createSlide({role:i===0?'opening':i===paragraphs.length-1?'closing':'context',content:{title,body:body.join('\n')}});});}
 if(paragraphs.length>1)project.title=project.slides[0].content.title;
 project.slides.forEach((s,i)=>{s.intent??=intentFor(s,project,i);if(!s.notes)s.notes=[s.content.title,s.content.body,...s.content.items].filter(Boolean).join('\n\n');});
 assertProject(project);return {project,notice:'Reviewable proposal from supplied content. Sources are references to inspect; claims have not been fact-checked.'};
}

// VIS-011 explicit semantic planning. Legacy proposals/migration remain unchanged.
export {planStory as proposeVisualStoryboard} from '../agent/director.mjs';
