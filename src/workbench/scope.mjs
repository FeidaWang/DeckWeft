import {DeckError} from '../core/errors.mjs';
import {chapterRuns} from '../design/chapters.mjs';
/** S9a four-level scope: deck, chapter, page, object. Most specific wins (object › page › chapter › deck). Every author operation
 * resolves its scope here first, so the Studio can state which pages and objects it may touch before anything is applied. */
export const SCOPE_LEVELS=Object.freeze(['deck','chapter','page','object']);
const fail=message=>{throw new DeckError('TOOL_SCOPE',message,409);};
/** Page numbers as a reader sees them: "3", "3–5", "2, 4 and 7". */
export function pageList(plan,sceneIds,zh=false){
 const n=sceneIds.map(id=>plan.scenes.findIndex(s=>s.id===id)+1).sort((a,b)=>a-b),runs=[];
 for(const v of n){const last=runs.at(-1);if(last&&v===last[1]+1)last[1]=v;else runs.push([v,v]);}
 const parts=runs.map(([a,b])=>a===b?String(a):`${a}–${b}`);
 return zh?parts.join('、'):parts.length>1?parts.slice(0,-1).join(', ')+' and '+parts.at(-1):parts[0];
}
export function resolveScope(project,{level,id}={}){
 const {plan,document}=project;
 if(!SCOPE_LEVELS.includes(level))fail('Choose deck, chapter, page or object.');
 if(level==='deck')return {level,id:null,sceneIds:plan.scenes.map(s=>s.id),blockIds:null,label:{en:'Whole deck',zh:'整套演示'}};
 if(level==='chapter'){const c=chapterRuns(plan).find(c=>c.id===id);if(!c)fail('Choose an existing chapter. Start one from a page first.');const first=plan.scenes.findIndex(s=>s.id===c.startSceneId)+1;return {level,id,sceneIds:c.sceneIds,blockIds:null,label:{en:`Chapter from page ${first} (pages ${pageList(plan,c.sceneIds)})`,zh:`从第 ${first} 页开始的章节（第 ${pageList(plan,c.sceneIds,true)} 页）`}};}
 if(level==='page'){const i=plan.scenes.findIndex(s=>s.id===id);if(i<0)fail('Choose an existing page.');return {level,id,sceneIds:[id],blockIds:null,label:{en:`Page ${i+1}`,zh:`第 ${i+1} 页`}};}
 const b=document.blocks.find(b=>b.id===id);if(!b)fail('Choose an existing object.');
 const scenes=plan.scenes.filter(s=>s.blockIds.includes(id)).map(s=>s.id);
 return {level,id,sceneIds:scenes,blockIds:[id],label:{en:`${b.type} ${id} on page ${pageList(plan,scenes)}`,zh:`第 ${pageList(plan,scenes,true)} 页的 ${b.type} ${id}`}};
}
/** Locks that bind inside a scope, by kind. Text, data, sources and composition are reported separately. */
export function scopeLocks(project,scope){
 const o=project.document.authorOverrides,blocks=new Set((scope.blockIds||project.plan.scenes.filter(s=>scope.sceneIds.includes(s.id)).flatMap(s=>s.blockIds))),docBlocks=project.document.blocks.filter(b=>blocks.has(b.id));
 const datasets=new Set(docBlocks.filter(b=>b.type==='chart').map(b=>b.datasetId)),sources=new Set(docBlocks.flatMap(b=>[...b.sourceIds,...(b.sourceId?[b.sourceId]:[])]));
 return {text:o.lockedBlockIds.filter(id=>blocks.has(id)),data:(o.lockedDatasetIds||[]).filter(id=>datasets.has(id)),sources:(o.lockedSourceIds||[]).filter(id=>sources.has(id)),composition:(o.sceneLocks||[]).filter(l=>scope.sceneIds.includes(l.sceneId)&&l.fields.includes('composition')).map(l=>l.sceneId),mode:o.lockMode||'combined'};
}
/** The sentence shown before a partial operation: what it may change, what is locked, what never changes. */
export function describeScope(project,scope,{changes=[]}={}){
 const locks=scopeLocks(project,scope),zh=[],en=[],pages=pageList(project.plan,scope.sceneIds),pagesZh=pageList(project.plan,scope.sceneIds,true);
 en.push(`Scope: ${scope.label.en}. It may change ${changes.length?changes.join(', '):'nothing'} on page${scope.sceneIds.length>1?'s':''} ${pages}; no other page changes.`);
 zh.push(`范围：${scope.label.zh}。可能修改第 ${pagesZh} 页的${changes.length?changes.join('、'):'（无）'}；其他页面不变。`);
 const held=[locks.text.length&&[`${locks.text.length} text lock${locks.text.length>1?'s':''}`,`${locks.text.length} 项文字锁定`],locks.data.length&&[`${locks.data.length} data lock${locks.data.length>1?'s':''}`,`${locks.data.length} 项数据锁定`],locks.sources.length&&[`${locks.sources.length} source lock${locks.sources.length>1?'s':''}`,`${locks.sources.length} 项来源锁定`],locks.composition.length&&[`composition locked on page ${pageList(project.plan,locks.composition)}`,`第 ${pageList(project.plan,locks.composition,true)} 页构图已锁定`]].filter(Boolean);
 if(held.length){en.push(`Kept by author locks: ${held.map(h=>h[0]).join('; ')}.`);zh.push(`作者锁定保持不变：${held.map(h=>h[1]).join('；')}。`);}
 en.push('Facts, numbers, units and sources are never rewritten.');zh.push('事实、数值、单位与来源不会被改写。');
 return {en:en.join(' '),zh:zh.join(''),locks};
}
