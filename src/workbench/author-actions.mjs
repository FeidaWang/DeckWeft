import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {DeckError} from '../core/errors.mjs';
import {contentHash} from '../scene/web/compile.mjs';
import {compositions,inferFamily} from '../design/compositions.mjs';
import {THEME_COMPOSITIONS,visibleBlockIds,DISCLOSURE_TYPES} from '../design/plan.mjs';
import {themePacks,effectiveProfile,DEFAULT_PROFILE} from '../design/theme-registry.mjs';
import {applySceneTheme} from '../design/profile.mjs';
import {splitSmallMultiples} from '../design/rhythm.mjs';
import {startChapter,removeChapter,setChapterProfile,chapterOf,chapterRuns} from '../design/chapters.mjs';
import {pageKind,tokenDrift,assertDesignProfile} from '../design/design-profile.mjs';
import {separateLocks} from '../core/adapters/locks.mjs';
import {resolveScope,describeScope,pageList} from './scope.mjs';
/** S9a author actions. Each one is planned first: the plan states its scope, every effect and every item an author lock kept,
 * and carries the resulting project. Nothing is applied here; the Studio applies an accepted plan through its normal edit path,
 * so Undo, Save, revision conflicts and History work unchanged. No action writes, deletes or rewrites text, data or sources. */
export const AUTHOR_ACTIONS=Object.freeze({
 'more-editorial':{levels:['deck','chapter','page'],changes:['composition','type contrast','density']},
 'chart-space':{levels:['deck','chapter','page','object'],changes:['composition','page split','page disclosure']},
 'quieter':{levels:['deck','chapter','page'],changes:['motion']},
 'keep-layout':{levels:['deck','chapter','page'],changes:['composition lock']},
 'replace-visual':{levels:['object'],changes:['image','alternative text']},
 'reduce-text':{levels:['deck','chapter','page','object'],changes:['page disclosure']},
 'apply-profile':{levels:['deck','chapter','page'],changes:['theme','composition','profile']},
 'start-chapter':{levels:['page'],changes:['chapters']},
 'remove-chapter':{levels:['chapter'],changes:['chapters']},
 'lock':{levels:['deck','chapter','page','object'],changes:['locks']},
 'unlock':{levels:['deck','chapter','page','object'],changes:['locks']}
});
const fail=(message,code='AUTHOR_ACTION',status=422)=>{throw new DeckError(code,message,status);};
const THEME_LABELS={'diagonal-cover':['Diagonal cover with a large number','斜切封面与大数字'],'chart-with-evidence-rail':['Chart with an evidence rail','图表与证据栏'],'reading-flow':['Reading flow','阅读流'],'photo-split':['Large photo split','大幅图片分栏'],'violet-chapter':['Full-colour chapter','满版色章节页'],'fieldnotes-cover':['Fieldnotes cover','田野笔记封面'],'fieldnotes-thesis':['Two-column thesis with margin notes','双栏论点与边注'],'fieldnotes-figure':['Narrow reading column, wide figure','窄正文、宽图'],'fieldnotes-method':['Method text with a margin note','方法说明与边注'],'fieldnotes-closing':['Fieldnotes closing','田野笔记结尾'],'atlas-cover':['Kicker, headline and contents index','引题、标题与目录'],'atlas-section':['Numbered section opener','编号章节页'],'atlas-figure':['Single-chart conclusion','单图结论'],'atlas-panels':['Two to four panels on one scale','同一尺度的 2–4 个面板'],'atlas-appendix':['Table, limits and sources','表格、局限与来源'],'atlas-closing':['Atlas closing','研究图集结尾'],'stage-hero':['One large object, title in the calm area','单一大物件与安静区标题'],'stage-chapter':['Stage chapter','舞台章节页'],'stage-figure':['Chart on a panel','面板上的图表'],'stage-metric':['Large number on the stage','舞台大数字'],'stage-closing':['Stage closing','舞台结尾']};
export const compositionLabel=id=>compositions.find(c=>c.id===id)?.label||THEME_LABELS[id]||[id,id];
const PROFILE_WORDS={colorIntensity:['colour intensity','色彩强度'],typographicContrast:['type contrast','字体对比'],density:['density','密度'],motionIntensity:['motion','动效'],imageEmphasis:['image emphasis','图片比重'],restrained:['restrained','克制'],bold:['bold','鲜明'],balanced:['balanced','均衡'],expressive:['expressive','强烈'],comfortable:['comfortable','宽松'],compact:['compact','紧凑'],off:['off','关闭'],subtle:['subtle','轻微'],large:['large','大']};
/** Editorial grammar: asymmetric reading paths with the claim first and generous margins (handoff F01/F03), per family. */
const EDITORIAL={statement:'statement-split',image:'image-left',metric:'metric-left',evidence:'evidence-right',comparison:'comparison-rail',process:'process-rail',chapter:'chapter-low',closing:'closing-split',quote:'quote-split','before-after':'before-after-rail','system-map':'system-map-rail','small-multiples':'small-multiples-lead'};
const FIELDNOTES={opening:'fieldnotes-cover',chart:'fieldnotes-figure',text:'fieldnotes-thesis',closing:'fieldnotes-closing'};
/** The single-chart layout that draws the plot largest in each theme, measured at 1440 px in isolated Chromium (S9a evidence,
 * chart-space-measurements.json): the full-width evidence-top caps the plot height (700 × 350 px), the side layouts draw it at
 * 780 × 390, atlas-figure at 865 × 433 and fieldnotes-figure at 834 × 417; stage-figure (774 × 387) is not larger than a side layout. */
const LARGEST_PLOT={'fresh-report':'atlas-figure','silver-gray-editorial':'fieldnotes-figure'},SIDE=['evidence-left','evidence-right','chart-with-evidence-rail'];
const QUALIFIER=/\b(only|except|unless|assum\w*|estimat\w*|approximately|at least|at most|up to|excluding|limited to|synthetic|illustrative|hypothetical|preliminary|caveat\w*|not (?:yet )?(?:measured|verified|tested|run|reviewed))\b|仅|除外|除非|假设|估计|约|至少|至多|不包括|仅限|合成|示意|虚构|初步|未(?:经)?(?:测量|验证|测试|运行|审阅)/i,NUMBER=/\d/;
const sceneOf=(p,id)=>p.plan.scenes.find(s=>s.id===id),pageOf=(p,id)=>p.plan.scenes.findIndex(s=>s.id===id)+1,blockOf=(p,id)=>p.document.blocks.find(b=>b.id===id);
const sceneLock=(p,id)=>p.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===id)?.fields||[];
const excerpt=b=>{const t=(b.type==='list'?b.items.join(' · '):b.text).replace(/\s+/g,' ');return [...t].length>48?[...t].slice(0,47).join('')+'…':t;};
/** A candidate composition fits when the whole project still validates with it: theme pack, content contract and assets. */
function fits(p,sceneId,composition){
 const pack=themePacks().find(t=>t.id===sceneOf(p,sceneId).theme);if(!pack.compositions.includes(composition))return false;
 const copy=structuredClone(p);sceneOf(copy,sceneId).composition=composition;try{assertVisualProject(copy);return true;}catch{return false;}
}
function context(project,scope){
 const effects=[],kept=[],c={p:structuredClone(project),scope,effects,kept};
 const say=(list,sceneId,en,zh)=>{const n=sceneId?pageOf(c.p,sceneId):null;list.push({sceneId,page:n,en:sceneId?`Page ${n}: ${en}`:en,zh:sceneId?`第 ${n} 页：${zh}`:zh});};
 c.effect=(id,en,zh)=>say(effects,id,en,zh);c.keep=(id,en,zh)=>say(kept,id,en,zh);return c;
}
/** “Page 3 has” or “Pages 3 and 5 have”. */
const pages=(plan,ids,one,many)=>`${ids.length>1?'Pages':'Page'} ${pageList(plan,ids)} ${ids.length>1?many:one}`;
const diffWords=(before,after)=>Object.keys(after).filter(k=>before[k]!==after[k]).map(k=>[`${PROFILE_WORDS[k][0]} ${PROFILE_WORDS[before[k]][0]} → ${PROFILE_WORDS[after[k]][0]}`,`${PROFILE_WORDS[k][1]}：${PROFILE_WORDS[before[k]][1]} → ${PROFILE_WORDS[after[k]][1]}`]);
/** Write profile choices at the scope's own level: deck brief, chapter profile, or each page. A more specific choice is kept and reported. */
function profileAt(c,changes){
 const {p,scope}=c,deck={...DEFAULT_PROFILE,...p.document.visualBrief?.profile};
 const ownPages=ids=>ids.filter(id=>sceneOf(p,id).profile),chapterPages=ids=>ids.filter(id=>!sceneOf(p,id).profile&&chapterOf(p.plan,id)?.profile);
 if(scope.level==='deck'){
  const after={...deck,...changes},words=diffWords(deck,after);if(!words.length)return;
  p.document.visualBrief={...(p.document.visualBrief||{audience:'',outputLanguage:p.document.locale}),profile:after};
  c.effect(null,`Deck profile: ${words.map(w=>w[0]).join('; ')}.`,`整套配置：${words.map(w=>w[1]).join('；')}。`);
  const own=ownPages(scope.sceneIds),chapter=chapterPages(scope.sceneIds);followLocked(c,scope.sceneIds.filter(id=>!sceneOf(p,id).profile&&!chapterOf(p.plan,id)?.profile));
  if(own.length)c.keep(null,`${pages(p.plan,own,'keeps its','keep their')} own page profile (a page choice beats the deck).`,`第 ${pageList(p.plan,own,true)} 页保留各自的页面配置（页面选择优先于整套）。`);
  if(chapter.length)c.keep(null,`${pages(p.plan,chapter,'follows its','follow their')} chapter profile (a chapter choice beats the deck).`,`第 ${pageList(p.plan,chapter,true)} 页沿用章节配置（章节选择优先于整套）。`);
 }else if(scope.level==='chapter'){
  const ch=chapterRuns(p.plan).find(x=>x.id===scope.id),before=ch.profile||deck,after={...before,...changes},words=diffWords(before,after);if(!words.length)return;
  p.plan=setChapterProfile(p.plan,scope.id,after);
  c.effect(null,`Chapter profile: ${words.map(w=>w[0]).join('; ')}.`,`章节配置：${words.map(w=>w[1]).join('；')}。`);
  const own=ownPages(scope.sceneIds);if(own.length)c.keep(null,`${pages(p.plan,own,'keeps its','keep their')} own page profile.`,`第 ${pageList(p.plan,own,true)} 页保留各自的页面配置。`);followLocked(c,scope.sceneIds.filter(id=>!sceneOf(p,id).profile));
 }else for(const id of scope.sceneIds){
  const s=sceneOf(p,id);if(sceneLock(p,id).includes('profile')){c.keep(id,'profile locked; kept.','页面配置已锁定，保持不变。');continue;}
  const before=effectiveProfile(p.document,s,p.plan),after={...before,...changes},words=diffWords(before,after);if(!words.length)continue;
  s.profile=after;c.effect(id,words.map(w=>w[0]).join('; ')+'.',words.map(w=>w[1]).join('；')+'。');
 }
}
function followLocked(c,ids){
 const locked=ids.filter(id=>sceneLock(c.p,id).includes('profile'));
 if(locked.length)c.keep(null,`${pages(c.p.plan,locked,'has','have')} a profile lock but no page profile of its own, so it follows this change. To hold the look, give the page a profile, then lock it.`,`第 ${pageList(c.p.plan,locked,true)} 页有配置锁定但没有自己的页面配置，因此会随此修改变化。若要保持外观，请先为其设置页面配置再锁定。`);
}
function setComposition(c,id,target,why){
 const {p}=c,s=sceneOf(p,id);if(!target||target===s.composition)return false;
 if(sceneLock(p,id).includes('composition')){c.keep(id,`composition locked (${compositionLabel(s.composition)[0]}); kept.`,`构图已锁定（${compositionLabel(s.composition)[1]}），保持不变。`);return false;}
 if(!fits(p,id,target)){c.keep(id,`${compositionLabel(target)[0]} does not fit this page's content or theme; kept ${compositionLabel(s.composition)[0]}.`,`${compositionLabel(target)[1]} 不适合本页内容或主题；保留 ${compositionLabel(s.composition)[1]}。`);return false;}
 const from=compositionLabel(s.composition);s.composition=target;const to=compositionLabel(target);
 c.effect(id,`composition ${from[0]} → ${to[0]}${why?` (${why[0]})`:''}.`,`构图 ${from[1]} → ${to[1]}${why?`（${why[1]}）`:''}。`);return true;
}
/** Text that can move behind the page disclosure: supporting paragraphs and lists that are not the claim, the takeaway, an
 * interaction or annotation target, or a qualification or number the claim depends on. Callouts carry emphasis or credits, so
 * they move only when the author chooses that object. */
function movable(p,s,{explicit=null}={}){
 const visible=visibleBlockIds(s),targets=new Set([...(s.interactions||[]).flatMap(i=>[i.blockId,i.otherBlockId]),...visible.map(id=>blockOf(p,id)).filter(b=>b.type==='annotation').map(b=>b.target.blockId)]);
 const locked=new Set(p.document.authorOverrides.lockedBlockIds);
 return visible.filter(id=>(!explicit||explicit.includes(id))).map(id=>blockOf(p,id)).filter(b=>(explicit?DISCLOSURE_TYPES:['paragraph','list']).includes(b.type)&&b.id!==s.focalBlockId&&b.id!==s.takeaway?.blockId&&!targets.has(b.id)&&!locked.has(b.id)&&(explicit||!QUALIFIER.test(b.type==='list'?b.items.join(' '):b.text)&&!NUMBER.test(b.type==='list'?b.items.join(' '):b.text)));
}
function disclose(c,id,blocks){
 const {p}=c,s=sceneOf(p,id);if(!blocks.length)return 0;
 if(sceneLock(p,id).some(f=>['composition','blockIds'].includes(f))){c.keep(id,'page layout locked; text stays where it is.','页面版式已锁定；文字保持原位。');return 0;}
 let moved=0;
 for(const b of blocks){const copy=structuredClone(p),t=sceneOf(copy,id);t.disclosure={blockIds:[...(t.disclosure?.blockIds||[]),b.id]};try{assertVisualProject(copy);}catch{c.keep(id,`“${excerpt(b)}” stays: the layout needs it.`,`“${excerpt(b)}” 保留：版式需要它。`);continue;}
  s.disclosure={blockIds:[...(s.disclosure?.blockIds||[]),b.id]};moved++;
  c.effect(id,`moves “${excerpt(b)}” (${b.type}) behind “More detail”. The words stay on this page behind the disclosure, in the PowerPoint notes and in the PDF appendix.`,`将“${excerpt(b)}”（${b.type}）移入“更多细节”。文字仍在本页的折叠内容、PowerPoint 备注与 PDF 附录中。`);}
 return moved;
}
const ACT={
 'more-editorial'(c){
  profileAt(c,{typographicContrast:'expressive',density:'comfortable'});
  for(const id of c.scope.sceneIds){const s=sceneOf(c.p,id),kind=pageKind(c.p.document,c.p.plan,s),family=EDITORIAL[inferFamily(c.p.document,{...s,blockIds:visibleBlockIds(s)})];
   // Editorial Fieldnotes pages take the theme's own editorial geometry when the content fits it, otherwise the family's editorial variant.
   const targets=[...(s.theme==='silver-gray-editorial'&&FIELDNOTES[kind]?[FIELDNOTES[kind]]:[]),family];
   if(targets.includes(s.composition))continue;
   setComposition(c,id,targets.find(t=>fits(c.p,id,t))||targets[0],['claim first, asymmetric reading path','先陈述论点，非对称阅读路线']);}
 },
 'chart-space'(c){
  for(const id of c.scope.sceneIds){
   const s=sceneOf(c.p,id),charts=visibleBlockIds(s).filter(b=>blockOf(c.p,b).type==='chart');if(!charts.length)continue;
   if(c.scope.level==='object'&&!s.blockIds.includes(c.scope.id))continue;
   const family=compositions.find(v=>v.id===s.composition)?.family;
   if(charts.length>2&&(family==='small-multiples'||s.composition==='atlas-panels')){
    if(sceneLock(c.p,id).some(f=>['composition','blockIds'].includes(f))){c.keep(id,'page layout locked; panels stay on one page.','页面版式已锁定；面板保留在同一页。');continue;}
    if(family!=='small-multiples'&&!setComposition(c,id,'small-multiples-row',['shared-scale panels','共享尺度面板']))continue;
    try{const before=c.p.plan.scenes.length;c.p=splitSmallMultiples(c.p,id,2);c.effect(id,`splits ${charts.length} panels over ${c.p.plan.scenes.length-before+1} pages of two, on one stated scale; the heading and sources repeat on each page.`,`将 ${charts.length} 个面板拆为 ${c.p.plan.scenes.length-before+1} 页、每页两个，同一尺度；标题与来源在每页重复。`);}catch(e){c.keep(id,`panels stay: ${e.message}`,`面板保持不变：${e.message}`);}
    continue;}
   if(charts.length===1){
    const target=LARGEST_PLOT[s.theme]||(SIDE.includes(s.composition)?s.composition:'evidence-left');
    if(target!==s.composition&&setComposition(c,id,target,LARGEST_PLOT[s.theme]?['this theme’s figure layout draws the plot largest at 1440 px','此主题的图形版式在 1440 px 下绘制的图表最大']:['a side layout draws the plot larger than the full-width layout, which caps its height','侧栏版式绘制的图表比限高的通栏版式更大']))continue;
    // The chart already has its largest layout: give it the page by moving supporting text behind the disclosure.
    if(!disclose(c,id,movable(c.p,s)))c.keep(id,'the chart already has this theme’s largest layout and no supporting text can move.','图表已采用此主题中最大的版式，也没有可移走的辅助文字。');continue;}
   if(charts.length===2)c.keep(id,'two panels already share the full width at 1440 px.','两个面板已在 1440 px 下平分通栏。');
  }
 },
 'quieter'(c){
  const {p,scope}=c,cues=ids=>ids.reduce((n,id)=>n+(sceneOf(p,id).cues||[]).length,0),deck={...DEFAULT_PROFILE,...p.document.visualBrief?.profile};
  if(scope.level==='deck'){
   if(deck.motionIntensity==='subtle'){p.document.visualBrief={...(p.document.visualBrief||{audience:'',outputLanguage:p.document.locale}),profile:{...deck,motionIntensity:'off'}};c.effect(null,`Motion subtle → off for the whole deck. ${cues(scope.sceneIds)} cue(s) apply instantly; every key state and the reading order stay reachable with Next and Previous.`,`整套动效：轻微 → 关闭。${cues(scope.sceneIds)} 个提示即时生效；每个关键状态与阅读顺序仍可用“下一步/上一步”到达。`);}
  }else for(const id of scope.sceneIds){const s=sceneOf(p,id);
   // The deck switch wins at runtime: with deck motion off every page is already still.
   if(deck.motionIntensity==='off'||s.motion?.policy==='off')continue;
   if(sceneLock(p,id).includes('motion')){c.keep(id,'motion locked; kept.','动效已锁定，保持不变。');continue;}
   s.motion={...(s.motion||{}),policy:'off',durationMs:0};c.effect(id,`motion → off. ${(s.cues||[]).length} cue(s) apply instantly; every key state stays reachable.`,`动效 → 关闭。${(s.cues||[]).length} 个提示即时生效；每个关键状态仍可到达。`);}
  if(!c.effects.length)c.keep(null,'Already quiet: motion is off here. DeckWeft output has no loops or autoplay to stop.','已经安静：这里的动效已关闭。DeckWeft 输出没有循环或自动播放。');
 },
 'keep-layout'(c){
  const o=c.p.document.authorOverrides;o.sceneLocks??=[];
  for(const id of c.scope.sceneIds){let l=o.sceneLocks.find(l=>l.sceneId===id);if(l?.fields.includes('composition'))continue;if(l&&l.fields.length>=8){c.keep(id,'this page already has eight locked fields; unlock one first.','本页已有八项锁定；请先解除其中一项。');continue;}
   if(!l){l={sceneId:id,fields:[]};o.sceneLocks.push(l);}l.fields.push('composition');const s=sceneOf(c.p,id),label=compositionLabel(s.composition);
   c.effect(id,`locks composition ${label[0]}. A theme change keeps this geometry; ${THEME_COMPOSITIONS[s.composition]?'because it is this theme\'s own composition, a theme change is refused and names it':'it is a shared composition, so every theme keeps it'}. Rhythm reports it as “kept: author lock”.`,`锁定构图 ${label[1]}。更换主题时保留此几何结构；${THEME_COMPOSITIONS[s.composition]?'它是本主题专属构图，因此更换主题会被拒绝并给出名称':'它是共享构图，所有主题都会保留'}。节奏报告标为“作者锁定保留”。`);}
  if(!c.effects.length&&!c.kept.length)c.keep(null,'The layout is already locked here.','这里的版式已锁定。');
 },
 'replace-visual'(c,options){
  const {p,scope}=c,b=blockOf(p,scope.id),id=scope.sceneIds[0];
  if(b.type!=='image')fail('Choose an image to replace.');
  if(p.document.authorOverrides.lockedBlockIds.includes(b.id))fail('This image is locked. Unlock it before replacing it.','AUTHOR_LOCK',409);
  const asset=p.assets.find(a=>a.id===options?.assetId);if(!asset)fail('Choose an image already added to this project.');if(asset.id===b.assetId)fail('Choose a different image.');
  const alt=typeof options.alt==='string'?options.alt.trim():'';if(!alt)fail('Describe the new image: alternative text is required.');
  const target=p.document.blocks.find(v=>v.id===b.id),before=target.alt;target.assetId=asset.id;target.alt=alt;if(typeof options.factual==='boolean')target.factual=options.factual;
  c.effect(id,`replaces only image ${b.id} with ${asset.id}: alternative text “${before}” → “${alt}”. Composition, crop and every other block stay.`,`仅将图片 ${b.id} 替换为 ${asset.id}：替代文字“${before}” → “${alt}”。构图、裁切与其他内容不变。`);
  for(const sid of scope.sceneIds){const s=sceneOf(p,sid);if(s.crops?.some(v=>v.blockId===b.id))c.keep(sid,'the crop is kept: check the framing of the new image.','裁切保持不变：请检查新图片的取景。');
   for(const cite of s.blockIds.map(x=>blockOf(p,x)).filter(x=>x.type==='citation'))c.keep(sid,`check that citation “${excerpt(cite)}” describes the new image.`,`请确认引用“${excerpt(cite)}”与新图片相符。`);}
 },
 'reduce-text'(c){
  for(const id of c.scope.sceneIds){const s=sceneOf(c.p,id),explicit=c.scope.level==='object'?[c.scope.id]:null,found=movable(c.p,s,{explicit});
   if(explicit&&!found.length){c.keep(id,'this object stays: only supporting paragraphs, lists and callouts that are not the claim, the takeaway or a locked object can move.','此对象保留：只有非论点、非要点且未锁定的段落、列表与标注可以移入。');continue;}
   // The first supporting block stays as the page's explanation; one long block is the author's to shorten, never cut here.
   const list=explicit?found:found.slice(1);
   if(!explicit&&found.length===1&&[...(found[0].type==='list'?found[0].items.join(''):found[0].text)].length>(c.p.document.locale==='zh-CN'?160:320))c.keep(id,`“${excerpt(found[0])}” is one long block: shorten it yourself, or choose it as the object to move it behind the disclosure.`,`“${excerpt(found[0])}” 是一整段长文字：请自行精简，或将其选为对象后移入折叠内容。`);
   disclose(c,id,list);
   const held=visibleBlockIds(sceneOf(c.p,id)).map(x=>blockOf(c.p,x)).filter(b=>!explicit&&DISCLOSURE_TYPES.includes(b.type)&&(QUALIFIER.test(b.type==='list'?b.items.join(' '):b.text)||NUMBER.test(b.type==='list'?b.items.join(' '):b.text)));
   if(held.length)c.keep(id,`${held.length} block(s) with a number or a qualification stay on the page with the claim.`,`${held.length} 项含数值或限定条件的内容与论点一同保留在页面上。`);}
  if(!c.effects.length&&!c.kept.length)c.keep(null,'Nothing to move: every remaining block is the claim, a qualification or needed by the layout.','没有可移走的内容：剩余内容都是论点、限定条件或版式所需。');
 },
 'apply-profile'(c,options){
  const profile=assertDesignProfile(options?.profile||fail('Choose a saved design profile.'));
  for(const id of c.scope.sceneIds){const s=sceneOf(c.p,id);if(s.theme===profile.theme.id)continue;
   try{c.p=applySceneTheme(c.p,id,profile.theme.id);c.effect(id,`theme ${s.theme} → ${profile.theme.id}.`,`主题 ${s.theme} → ${profile.theme.id}。`);}catch(e){c.keep(id,`theme kept (${e.message})`,`主题保持不变（${e.message}）`);}}
  profileAt(c,profile.profile);
  for(const id of c.scope.sceneIds){const s=sceneOf(c.p,id);if(s.theme!==profile.theme.id)continue;const want=profile.compositions.find(x=>x.kind===pageKind(c.p.document,c.p.plan,s));if(want)setComposition(c,id,want.composition,['recorded in the profile','配置中记录的选择']);}
  const drift=tokenDrift(profile);if(drift.length)c.keep(null,`The theme draws differently from when “${profile.name}” was saved: ${drift.join(', ')}.`,`主题的绘制方式与保存“${profile.name}”时不同：${drift.join('、')}。`);
 },
 'start-chapter'(c){const before=chapterOf(c.p.plan,c.scope.id);c.p.plan=startChapter(c.p.plan,c.scope.id);const after=chapterOf(c.p.plan,c.scope.id);
  c.effect(c.scope.id,`starts a chapter: pages ${pageList(c.p.plan,after.sceneIds)}${before?`, split from the chapter that started on page ${pageOf(c.p,before.startSceneId)}, keeping its profile so nothing renders differently`:''}.`,`开始新章节：第 ${pageList(c.p.plan,after.sceneIds,true)} 页${before?`，从第 ${pageOf(c.p,before.startSceneId)} 页开始的章节拆出，并沿用其配置，画面不变`:''}。`);},
 'remove-chapter'(c){const ch=chapterRuns(c.p.plan).find(x=>x.id===c.scope.id);c.p.plan=removeChapter(c.p.plan,c.scope.id);const prev=chapterOf(c.p.plan,ch.startSceneId);if(ch.profile)followLocked(c,ch.sceneIds.filter(id=>!sceneOf(c.p,id).profile));
  c.effect(null,`Removes the chapter on pages ${pageList(c.p.plan,ch.sceneIds)}${ch.profile?'; its chapter profile is dropped':''}. ${prev?`They join the chapter that starts on page ${pageOf(c.p,prev.startSceneId)}.`:'They belong to no chapter and follow the deck.'}`,`移除第 ${pageList(c.p.plan,ch.sceneIds,true)} 页的章节${ch.profile?'，其章节配置一并移除':''}。${prev?`这些页面并入从第 ${pageOf(c.p,prev.startSceneId)} 页开始的章节。`:'这些页面不再属于任何章节，沿用整套配置。'}`);},
 'lock'(c,options){lockAction(c,options,true);},
 'unlock'(c,options){lockAction(c,options,false);}
};
const LOCK_WORDS={text:['text','文字'],data:['data','数据'],sources:['sources','来源'],composition:['composition','构图']};
function lockAction(c,options,on){
 const kind=options?.kind;if(!LOCK_WORDS[kind])fail('Choose a text, data, sources or composition lock.');
 if(kind==='composition'&&c.scope.level==='object')fail('Composition belongs to a page; choose Page, Chapter or Deck.');
 if(['data','sources'].includes(kind)&&c.p.document.authorOverrides.lockMode!=='separate'){c.p=separateLocks(c.p);c.migrated=structuredClone(c.p);c.effect(null,'Separates text, data and source locks first (explicit migration); every existing lock stays.','先将文字、数据与来源锁定分开（显式迁移）；现有锁定全部保留。');}
 const o=c.p.document.authorOverrides,blocks=c.scope.blockIds||[...new Set(c.p.plan.scenes.filter(s=>c.scope.sceneIds.includes(s.id)).flatMap(s=>s.blockIds))];
 const ids=kind==='text'?blocks:kind==='data'?[...new Set(blocks.map(id=>blockOf(c.p,id)).filter(b=>b.type==='chart').map(b=>b.datasetId))]:kind==='sources'?[...new Set(blocks.map(id=>blockOf(c.p,id)).flatMap(b=>[...b.sourceIds,...(b.sourceId?[b.sourceId]:[]),...(b.type==='chart'?c.p.document.datasets.find(d=>d.id===b.datasetId).sourceIds:[])]))]:c.scope.sceneIds;
 if(!ids.length)return c.keep(null,`Nothing to ${on?'lock':'unlock'}: this scope has no ${LOCK_WORDS[kind][0]}.`,`没有可${on?'锁定':'解锁'}的${LOCK_WORDS[kind][1]}。`);
 if(kind==='composition'){o.sceneLocks??=[];for(const id of ids){let l=o.sceneLocks.find(l=>l.sceneId===id);if(on){if(l?.fields.includes('composition'))continue;if(l&&l.fields.length>=8){c.keep(id,'eight fields already locked.','已有八项锁定。');continue;}if(!l){l={sceneId:id,fields:[]};o.sceneLocks.push(l);}l.fields.push('composition');c.effect(id,'composition locked.','构图已锁定。');}else if(l?.fields.includes('composition')){l.fields=l.fields.filter(f=>f!=='composition');c.effect(id,'composition unlocked: rhythm and theme changes may now change it.','构图已解锁：节奏与主题更换此后可以改变它。');}}o.sceneLocks=o.sceneLocks.filter(l=>l.fields.length);if(!o.sceneLocks.length)delete o.sceneLocks;return;}
 const key=kind==='text'?'lockedBlockIds':kind==='data'?'lockedDatasetIds':'lockedSourceIds',list=new Set(o[key]||[]),changed=ids.filter(id=>on!==list.has(id));
 for(const id of changed)on?list.add(id):list.delete(id);o[key]=[...list];
 if(changed.length)c.effect(null,`${on?'Locks':'Unlocks'} ${LOCK_WORDS[kind][0]}: ${changed.join(', ')}.${!on&&kind==='text'&&o.lockMode!=='separate'?' In combined mode this also releases the linked datasets and sources.':''}`,`${on?'锁定':'解锁'}${LOCK_WORDS[kind][1]}：${changed.join('、')}。${!on&&kind==='text'&&o.lockMode!=='separate'?'在合并模式下，这也会释放相关的数据集与来源。':''}`);
 else c.keep(null,`Already ${on?'locked':'unlocked'}.`,`已${on?'锁定':'解锁'}。`);
}
/** Plan one author action. The returned project is validated and every lock the input held is still honoured. */
export function planAuthorAction(project,{action,level,id,options}={}){
 const input=assertVisualProject(project),spec=AUTHOR_ACTIONS[action];if(!spec)fail('Choose a documented author action.');
 if(!spec.levels.includes(level))fail(`${action} applies at ${spec.levels.join(', ')}.`,'TOOL_SCOPE',409);
 const scope=resolveScope(input,{level,id}),c=context(input,scope);
 if(action==='chart-space'&&level==='object'&&blockOf(input,id).type!=='chart')fail('Choose a chart.');
 if(action==='reduce-text'&&level==='object'&&!DISCLOSURE_TYPES.includes(blockOf(input,id).type))fail('Choose a paragraph, list or callout.');
 ACT[action](c,options);
 // An unlock after the stated separation is checked against the separated deck: the migration released nothing, the unlock is explicit.
 const next=assertVisualProject(c.p);assertVisualLocks(c.migrated||input,next);
 const changed=contentHash(next)!==contentHash(input);
 return {format:'deckweft-author-action',version:1,action,scope:{level:scope.level,id:scope.id,sceneIds:scope.sceneIds,blockIds:scope.blockIds,label:scope.label},basis:contentHash(input),scopeStatement:describeScope(input,scope,{changes:spec.changes}),effects:c.effects,kept:c.kept,changed,project:changed?next:null};
}
