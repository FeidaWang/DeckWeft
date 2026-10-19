import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {DeckError} from '../core/errors.mjs';
import {compositions,families,quoteAttributions} from '../design/compositions.mjs';
import {THEME_COMPOSITIONS} from '../design/plan.mjs';
/** Argument units (design handoff proposal): the page count follows the material the author supplied, by content capacity.
 * Pure and deterministic: inputs are cloned and never mutated; no clock, randomness, model or network.
 * This module reads text and never writes it. It creates no block text, data, quotation or source.
 * Questions and advice are interface strings returned to the caller; they are never written into a project. */
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
const fail=(code,message,status=422)=>{throw new DeckError(code,message,status);};
export const ARGUMENT_UNITS=deepFreeze(['question','background','mechanism','evidence','limits','action']);
export const DETAIL_LEVELS=deepFreeze(['brief','standard','detailed']);
/** Page text capacity per detail level and locale: visible characters (Unicode code points, whitespace excluded) of
 * paragraph, list, callout and quote text on one page. The heading is not counted. `required` lists the units the level expects. */
export const DETAIL_TABLE=deepFreeze({
 brief:{capacity:{en:300,'zh-CN':150},required:['question','evidence','action']},
 standard:{capacity:{en:520,'zh-CN':260},required:['question','background','evidence','limits','action']},
 detailed:{capacity:{en:800,'zh-CN':400},required:[...ARGUMENT_UNITS]}
});
/** Explicit unit labels. A label counts only at the start of the heading (or of the first paragraph), followed by
 * ':' '：' '—' ' -' or the end of the text. English is case-insensitive; singular and plural forms are listed. */
export const UNIT_LABELS=deepFreeze({
 question:{en:['question','questions','why'],zh:['问题','为什么']},
 background:{en:['background','context'],zh:['背景','现状']},
 mechanism:{en:['how it works','mechanism','mechanisms','method','methods'],zh:['机制','原理','方法']},
 evidence:{en:['evidence','data','results','result','findings','finding'],zh:['证据','数据','结果','发现']},
 limits:{en:['limits','limit','limitations','limitation','caveats','caveat','risks','risk'],zh:['局限','限制','风险','注意']},
 action:{en:['next steps','next step','action','actions','recommendation','recommendations','ask'],zh:['行动','下一步','建议']}
});
/** Keyword cues, checked in this unit order on the heading first, then on paragraph, list, callout and quote text in page order.
 * English matches whole words (case-insensitive); Chinese matches substrings. */
export const UNIT_KEYWORDS=deepFreeze({
 limits:{en:['limit','limits','limitation','limitations','caveat','caveats','risk','risks','not yet','unknown'],zh:['局限','风险','尚未','未知']},
 mechanism:{en:['because','works by','how','mechanism'],zh:['因为','通过','机制']},
 background:{en:['today','context','history','currently'],zh:['目前','背景','过去']},
 action:{en:['next','should','recommend','decide'],zh:['下一步','建议','决定']}
});
/** A numeric claim is a number with a unit: a percent sign, a currency symbol before it, k/m/bn/x attached to it, or one of these units after it. */
export const NUMBER_UNITS=deepFreeze({
 en:['percent','per cent','percentage points','pp','points','times','million','billion','thousand','ms','sec','seconds','second','minutes','minute','min','hours','hour','days','day','weeks','week','months','month','years','year','kg','km','cm','mm','kb','mb','gb','tb'],
 zh:['个百分点','万','亿','元','美元','倍','人','次','小时','分钟','秒','公里','千克','名','家','项']
});
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+'),longest=list=>[...list].sort((a,b)=>b.length-a.length||(a<b?-1:1));
const ALL_LABELS=Object.entries(UNIT_LABELS).flatMap(([unit,l])=>[...l.en,...l.zh].map(label=>[label,unit])),LABEL_UNIT=new Map(ALL_LABELS);
const LABEL=new RegExp(`^\\s*(${longest(ALL_LABELS.map(([l])=>l)).map(escape).join('|')})(?=\\s*[:：—]|\\s+-|\\s*$)`,'iu');
const KEYWORD_ORDER=['limits','mechanism','background','action'];
const KEYWORD=Object.fromEntries(KEYWORD_ORDER.map(u=>[u,new RegExp(`(?<![\\p{L}\\p{N}])(?:${longest(UNIT_KEYWORDS[u].en).map(escape).join('|')})(?![\\p{L}\\p{N}])`,'iu')]));
const NUM='\\d+(?:[.,]\\d+)*',NUMERIC=new RegExp(`[$€£¥￥]\\s?\\d|(?<![A-Za-z0-9_第])${NUM}(?:\\s?[%％]|(?:k|m|bn|x|×)(?![A-Za-z0-9])|\\s?(?:${longest(NUMBER_UNITS.en).map(escape).join('|')})(?![A-Za-z0-9])|\\s?(?:${longest(NUMBER_UNITS.zh).join('|')}))`,'iu');
const PAGE_TEXT=['paragraph','list','callout','quote'],MOVABLE=['paragraph','list','callout'],SOURCED_TYPES=['metric','table','quote','callout','paragraph'];
const visibleChars=text=>[...String(text).replace(/\s+/gu,'')].length;
const textOf=b=>b.type==='list'?b.items.join('\n'):b.type==='table'?[...b.columns,...b.rows.flat()].join('\n'):['heading','paragraph','callout','quote','annotation'].includes(b.type)?b.text:'';
const unique=list=>[...new Set(list)];
const sceneBlocks=(document,scene)=>{const byId=new Map(document.blocks.map(b=>[b.id,b]));return scene.blockIds.map(id=>byId.get(id));};
/** The earliest keyword of one unit in a text, exactly as written, or null. */
function keywordIn(unit,text){
 const found=[],m=KEYWORD[unit].exec(text);if(m)found.push([m.index,m[0]]);
 for(const k of UNIT_KEYWORDS[unit].zh){const i=text.indexOf(k);if(i>=0)found.push([i,k]);}
 return found.sort((a,b)=>a[0]-b[0])[0]?.[1]??null;
}
function classifyScene(document,scene,index,count,overrides){
 const result=(unit,basis,cue)=>({sceneId:scene.id,unit,basis,cue});
 if(Object.hasOwn(overrides,scene.id))return result(overrides[scene.id],'author','author');
 const blocks=sceneBlocks(document,scene),heading=blocks.find(b=>b.type==='heading'),paragraph=blocks.find(b=>b.type==='paragraph');
 for(const b of [heading,paragraph]){const m=b&&LABEL.exec(b.text);if(m)return result(LABEL_UNIT.get(m[1].toLowerCase().replace(/\s+/gu,' ')),'label',m[1]);}
 const attributed=quoteAttributions(document,scene);
 for(const b of blocks){
  if(['chart','table','metric'].includes(b.type))return result('evidence','structure',b.type);
  if(b.type==='quote'&&attributed.has(b.id))return result('evidence','structure','quote-citation');
  if(b.type==='callout'&&NUMERIC.test(b.text))return result('evidence','structure','callout-number');
 }
 if(heading&&/[?？]\s*$/u.test(heading.text))return result('question','structure','question-mark');
 if(index===count-1&&blocks.some(b=>b.type==='list'))return result('action','structure','closing-list');
 for(const b of [heading,...blocks.filter(b=>b!==heading&&PAGE_TEXT.includes(b.type))].filter(Boolean))for(const unit of KEYWORD_ORDER){const cue=keywordIn(unit,textOf(b));if(cue)return result(unit,'keyword',cue);}
 return index===0?result('question','position','first-scene'):index===count-1?result('action','position','last-scene'):result('background','position','middle-scene');
}
function classifyAll(project,overrides={}){
 if(overrides==null)overrides={};
 if(typeof overrides!=='object'||Array.isArray(overrides))fail('ARGUMENT_UNIT','Map scene ids to argument units.');
 for(const [id,unit] of Object.entries(overrides))if(!project.plan.scenes.some(s=>s.id===id)||!ARGUMENT_UNITS.includes(unit))fail('ARGUMENT_UNIT','Choose a page in this deck and one of: '+ARGUMENT_UNITS.join(', ')+'.');
 const scenes=project.plan.scenes;
 return scenes.map((s,i)=>classifyScene(project.document,s,i,scenes.length,overrides));
}
/** Per scene: why each page is the argument unit it is. Rules in order: author, label, structure, keyword, position. */
export function classifyScenes(project,{units}={}){
 const copy=structuredClone(project);assertVisualProject(copy);
 return classifyAll(copy,units);
}
function evidenceOf(document,scene){
 const blocks=sceneBlocks(document,scene),support=[],issues=[];
 for(const b of blocks){
  if(b.type==='chart'){const d=document.datasets.find(d=>d.id===b.datasetId);if(d.synthetic)issues.push('synthetic-dataset');else if(d.sourceIds.length||b.sourceIds.length)support.push('sourced-chart');else issues.push('unsourced-chart');}
  else if(b.type==='citation')support.push('citation');
  else if(SOURCED_TYPES.includes(b.type)&&b.sourceIds.length)support.push('sourced-'+b.type);
 }
 if(support.length)return {supported:true,reasons:unique(support)};
 if(blocks.some(b=>b.type==='metric'||NUMERIC.test(textOf(b))))issues.push('number-without-source');
 return {supported:false,reasons:issues.length?unique(issues):['no-evidence']};
}
/** Whether a page carries its own evidence: a non-synthetic sourced chart, a sourced metric, table, quote, callout or paragraph, or a citation.
 * Reasons when supported: sourced-chart, sourced-<type>, citation. Otherwise: synthetic-dataset, unsourced-chart, number-without-source, or no-evidence. */
export function evidenceStatus(project,sceneId){
 const copy=structuredClone(project);assertVisualProject(copy);
 const scene=copy.plan.scenes.find(s=>s.id===sceneId);if(!scene)fail('PAGE_PLAN_SCENE','Choose a page in this deck.',404);
 return evidenceOf(copy.document,scene);
}
/** Blocks the page composition needs that only a movable block provides (for example the list of a closing page): they stay on the page. */
function compositionPins(scene,blocks){
 const c=compositions.find(c=>c.id===scene.composition),needs=[...(c?[families[c.family].required]:[]),...(THEME_COMPOSITIONS[scene.composition]?.needs||[])].map(n=>[n].flat()),pins=new Set();
 for(const need of needs){
  if(!need.some(t=>MOVABLE.includes(t))||blocks.some(b=>need.includes(b.type)&&!MOVABLE.includes(b.type)))continue;
  const keep=blocks.find(b=>need.includes(b.type));if(keep)pins.add(keep.id);
 }
 return pins;
}
/** Visible text and the movable run of one page. Blocks behind a disclosure are not on the page: not counted, never moved.
 * Movable blocks are paragraphs, lists and callouts that are not the focal block, the takeaway, an annotation or interaction
 * target, or a block the composition needs, and that come after every block that must stay (citations excepted), so reading order holds. */
function layoutScene(document,scene){
 const hidden=new Set(scene.disclosure?.blockIds||[]),blocks=sceneBlocks(document,scene).filter(b=>!hidden.has(b.id)),heading=blocks.find(b=>b.type==='heading');
 const targets=new Set([...blocks.filter(b=>b.type==='annotation').map(b=>b.target.blockId),...(scene.interactions||[]).flatMap(i=>[i.blockId,i.otherBlockId,...(i.hotspots||[]).map(h=>h.annotationId)])]),pins=compositionPins(scene,blocks);
 const movable=b=>MOVABLE.includes(b.type)&&b.id!==scene.focalBlockId&&b.id!==scene.takeaway?.blockId&&!targets.has(b.id)&&!pins.has(b.id);
 const run=[];for(let i=blocks.length-1;i>=0;i--){if(blocks[i].type==='citation')continue;if(!movable(blocks[i]))break;run.unshift(blocks[i]);}
 const size=b=>PAGE_TEXT.includes(b.type)?visibleChars(textOf(b)):0,chars=blocks.reduce((n,b)=>n+size(b),0);
 return {heading,run,chars,base:chars-run.reduce((n,b)=>n+size(b),0),size};
}
/** Greedy split at block boundaries: a new page starts at a movable block that would overfill a page that already holds text. */
function pagesFor({heading,run,chars,base,size},capacity){
 if(chars<=capacity)return {pages:1};
 let loads=[chars];const splitAt=[];
 if(heading&&run.length>=2){loads=[base];for(const b of run){const n=size(b),last=loads.length-1;if(loads[last]>0&&loads[last]+n>capacity){splitAt.push(b.id);loads.push(n);}else loads[last]+=n;}}
 return {pages:loads.length,...(splitAt.length?{splitAt}:{}),...(loads.some(n=>n>capacity)?{advice:'reduce-text'}:{})};
}
const MISSING=deepFreeze({
 question:{en:'What question or problem does this deck answer? Add a page that states it.',zh:'这份文稿回答什么问题？请添加一页说明。'},
 background:{en:'What does the audience need to know first — what is true today? Add it in your own words.',zh:'听众首先需要了解什么背景？目前的情况如何？请用你自己的话补充。'},
 mechanism:{en:'How does it work? Which mechanism or method explains the result?',zh:'它是如何运作的？哪种机制或方法解释了这一结果？'},
 evidence:{en:'Which data, source or quotation supports the main claim? DeckWeft will not invent one.',zh:'主要论点由哪些数据、来源或引语支持？DeckWeft 不会编造。'},
 limits:{en:'What are the limits, risks or open questions? Name them so the deck does not overclaim.',zh:'有哪些局限、风险或未解决的问题？请写明，避免文稿过度断言。'},
 action:{en:'What should the audience do or decide next?',zh:'听众下一步应该做什么，或决定什么？'}
});
const pages=n=>`${n} page${n===1?'':'s'}`;
/** Page plan from argument units and content capacity. Proposes splits of over-full pages only; never adds, pads or merges pages. */
export function planPages(project,{detail='standard',units,targetPages}={}){
 const copy=structuredClone(project);assertVisualProject(copy);
 if(!DETAIL_LEVELS.includes(detail))fail('PAGE_PLAN_DETAIL','Choose brief, standard or detailed.');
 const target=targetPages??null;
 if(target!==null&&(!Number.isInteger(target)||target<1||target>1000))fail('PAGE_PLAN_TARGET','Choose a target of 1–1000 pages, or leave it empty.');
 const {document,plan}=copy,locale=document.locale==='zh-CN'?'zh-CN':'en',capacity=DETAIL_TABLE[detail].capacity[locale],classes=classifyAll(copy,units);
 const scenes=plan.scenes.map((s,i)=>{const layout=layoutScene(document,s);return {...classes[i],chars:layout.chars,...pagesFor(layout,capacity)};});
 const present=ARGUMENT_UNITS.filter(u=>classes.some(c=>c.unit===u)),missing=DETAIL_TABLE[detail].required.filter(u=>!present.includes(u));
 const evidenceRequired=classes.filter((c,i)=>c.unit==='evidence'&&!evidenceOf(document,plan.scenes[i]).supported).map(c=>c.sceneId);
 const proposedPages=scenes.reduce((n,s)=>n+s.pages,0),suppliedPages=plan.scenes.length,short=target!==null&&target>proposedPages,over=target!==null&&target<proposedPages;
 const questions=[
  ...missing.map(unit=>({kind:'missing-unit',unit,...MISSING[unit]})),
  ...evidenceRequired.map(sceneId=>{const n=plan.scenes.findIndex(s=>s.id===sceneId)+1;return {kind:'unsupported-evidence',unit:'evidence',sceneId,en:`Which data, source or quotation supports the claim on page ${n}? DeckWeft will not invent one.`,zh:`第 ${n} 页的论点由哪些数据、来源或引语支持？DeckWeft 不会编造。`};}),
  ...(short?[{kind:'page-count',unit:null,en:`The material supports ${pages(proposedPages)}; the target is ${target}. Add material for the other ${pages(target-proposedPages)}, or lower the target. DeckWeft will not pad the deck.`,zh:`现有材料可支撑 ${proposedPages} 页，目标为 ${target} 页。请为其余 ${target-proposedPages} 页补充材料，或降低目标页数。DeckWeft 不会填充内容。`}]:[])
 ];
 const advice=over?[{kind:'over-target',en:`The material needs ${pages(proposedPages)}; the target is ${target}. Reduce the text or merge pages yourself. DeckWeft never merges pages automatically.`,zh:`现有材料需要 ${proposedPages} 页，目标为 ${target} 页。请精简文字或自行合并页面。DeckWeft 不会自动合并页面。`}]:[];
 return {detail,locale,capacity,scenes,present,missing,questions,evidenceRequired,proposedPages,suppliedPages,targetPages:target,status:missing.length||short?'needs-material':over?'over-target':'fits',advice};
}
/** Continuation pages use reading-flow: every theme pack lists it and it has no theme or block contract, so a heading plus text is always valid. */
export const CONTINUATION_COMPOSITION='reading-flow';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
/** Applies a current page plan. `split` moves whole blocks to continuation pages; `mark` sets evidence-required on unsupported
 * evidence pages that have no content status yet. The semantic document never changes. Returns {project, changes, skipped}. */
export function applyPagePlan(project,plan,{split=false,mark=false}={}){
 const original=structuredClone(project);assertVisualProject(original);
 if(typeof split!=='boolean'||typeof mark!=='boolean')fail('PAGE_PLAN_OPTIONS','Pass split and mark as true or false.');
 if(!split&&!mark)fail('PAGE_PLAN_EMPTY','Choose split, mark or both; nothing else is applied.');
 if(!plan||typeof plan!=='object'||!Array.isArray(plan.scenes)||!Array.isArray(plan.evidenceRequired))fail('PAGE_PLAN_INVALID','Pass a page plan from planPages.');
 const copy=structuredClone(original),scenes=copy.plan.scenes,stale=()=>fail('PAGE_PLAN_STALE','This page plan describes another version of the deck; plan the pages again.',409);
 if(JSON.stringify(plan.scenes.map(s=>s?.sceneId))!==JSON.stringify(scenes.map(s=>s.id))||plan.evidenceRequired.some(id=>!scenes.some(s=>s.id===id)))stale();
 const changes=[],skipped=[];
 // Mark first, so continuation pages carry the status of the page they continue.
 if(mark)for(const sceneId of unique(plan.evidenceRequired)){
  const scene=scenes.find(s=>s.id===sceneId);
  if(scene.contentStatus){skipped.push({sceneId,kind:'mark',reason:scene.contentStatus==='evidence-required'?'already-marked':scene.contentStatus});continue;}
  scene.contentStatus='evidence-required';changes.push({sceneId,kind:'mark',contentStatus:'evidence-required'});
 }
 if(split)for(const entry of plan.scenes){
  if(entry.splitAt===undefined)continue;
  const {sceneId,splitAt}=entry,index=scenes.findIndex(s=>s.id===sceneId),scene=scenes[index];
  if(!Array.isArray(splitAt)||!splitAt.length)stale();
  if(copy.document.authorOverrides.sceneLocks?.some(l=>l.sceneId===sceneId&&l.fields.some(f=>['blockIds','composition'].includes(f))))fail('AUTHOR_LOCK','Unlock the blocks and composition of this page before splitting it.',409);
  if(scene.interactions?.length||scene.cues?.length||scene.keyStates)fail('AUTHOR_LOCK','Interactions, cues and key states belong to one page; split this page by hand.',409);
  const {heading,run}=layoutScene(copy.document,scene),at=splitAt.map(id=>run.findIndex(b=>b.id===id));
  if(!heading||at.some((k,i)=>k<0||(i&&k<=at[i-1])))stale();
  const groups=at.map((k,i)=>run.slice(k,at[i+1]??run.length).map(b=>b.id)),moved=groups.flat();
  if(moved.some(id=>copy.document.authorOverrides.lockedBlockIds.includes(id)))fail('AUTHOR_LOCK','Unlock the blocks that would move before splitting this page.',409);
  const taken=new Set([...scenes.map(s=>s.id),...(copy.plan.chapters||[]).map(c=>c.id)]),ids=groups.map((_,k)=>`${sceneId}-${k+2}`);
  for(const id of ids){if(!ID.test(id))fail('PAGE_PLAN_ID',`A continuation page id would exceed 64 characters (${id}); shorten the page id first.`);if(taken.has(id))fail('PAGE_PLAN_ID',`Page id ${id} is already used; rename that page before splitting.`,409);}
  const closing=scene.role==='closing',keep=['colorMode','profile','contentStatus'].filter(k=>scene[k]!==undefined);
  const parts=groups.map((blockIds,k)=>({id:ids[k],role:closing&&k===groups.length-1?'closing':'context',theme:scene.theme,themeVersion:scene.themeVersion,composition:CONTINUATION_COMPOSITION,blockIds:[heading.id,...blockIds],focalBlockId:heading.id,...Object.fromEntries(keep.map(k=>[k,structuredClone(scene[k])]))}));
  scene.blockIds=scene.blockIds.filter(id=>!moved.includes(id));if(closing)scene.role='context';
  scenes.splice(index+1,0,...parts);
  changes.push({sceneId,kind:'split',sceneIds:ids,movedBlockIds:groups.map(g=>[...g])});
 }
 if(JSON.stringify(copy.document)!==JSON.stringify(original.document))fail('PAGE_PLAN_DOCUMENT','Page planning never changes the semantic document.',500);
 assertVisualLocks(original,copy);
 return {project:assertVisualProject(copy),changes,skipped};
}
