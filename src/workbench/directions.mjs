import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {DeckError} from '../core/errors.mjs';
import {contentHash} from '../scene/web/compile.mjs';
import {inferFamily,compositions,families} from '../design/compositions.mjs';
import {visibleBlockIds} from '../design/plan.mjs';
import {themePacks,resolveTheme,DEFAULT_PROFILE} from '../design/theme-registry.mjs';
import {applySceneTheme} from '../design/profile.mjs';
import {pageKind} from '../design/design-profile.mjs';
import {presentationCapabilities} from '../targets/capabilities.mjs';
import {compositionLabel} from './author-actions.mjs';
/** S9a default entry and three directions (DWD-200, handoff page 36). The author answers six questions; DeckWeft draws the same
 * content three substantively different ways (graphics, type, media and motion differ; facts are identical), explains what each
 * changes, and expands the chosen one to the whole deck. Nothing here writes or rewrites text, data or sources. */
export const ENTRY_OPTIONS=Object.freeze({style:['auto','silver-gray-editorial','fresh-report','orange-launch','cream-collage','dark-data','electric-violet'],detail:['brief','standard','detailed'],motion:['off','subtle'],output:['web','pdf','pptx']});
export function entryAnswers(input={}){
 const fail=m=>{throw new DeckError('WORKBENCH_ENTRY',m,422);};
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Answer Topic, Audience, Style, Detail, Motion and Output.');
 const extra=Object.keys(input).filter(k=>!['topic','audience',...Object.keys(ENTRY_OPTIONS)].includes(k));if(extra.length)fail('Unknown entry field: '+extra[0]);
 const out={topic:typeof input.topic==='string'?input.topic:'',audience:typeof input.audience==='string'?input.audience.trim():'',style:input.style||'auto',detail:input.detail||'standard',motion:input.motion||'off',output:input.output||'web'};
 if(out.topic.length>12000)fail('Keep the topic or supplied text under 12,000 characters.');if(out.audience.length>1000)fail('Describe the audience in at most 1,000 characters.');
 for(const [k,v] of Object.entries(ENTRY_OPTIONS))if(!v.includes(out[k]))fail(`Choose a documented ${k}.`);
 return out;
}
/** Three art directions, one per grammar group. Each group has an S8 pack first and its VIS-014 partner second. */
const GROUPS={editorial:['silver-gray-editorial','cream-collage'],report:['fresh-report','dark-data'],stage:['orange-launch','electric-violet']};
const GRAMMAR={
 editorial:{label:['Editorial','编辑叙事'],why:['claim first, asymmetric reading path, generous margins','论点先行、非对称阅读路线、留白充足'],profile:{colorIntensity:'restrained',typographicContrast:'expressive',imageEmphasis:'large'},
  own:{'silver-gray-editorial':{opening:'fieldnotes-cover',chart:'fieldnotes-figure',text:'fieldnotes-thesis',list:'fieldnotes-method',closing:'fieldnotes-closing'},'cream-collage':{metric:'diagonal-cover'}},
  family:{statement:'statement-split',image:'image-left',metric:'metric-left',evidence:'evidence-right',comparison:'comparison-rail',process:'process-rail'}},
 report:{label:['Research report','研究报告'],why:['shared grid, numbered sections, figures take the main area','统一栅格、编号章节、图形占据主区域'],profile:{colorIntensity:'restrained',typographicContrast:'balanced',imageEmphasis:'balanced'},
  own:{'fresh-report':{opening:'atlas-cover',chart:'atlas-figure',table:'atlas-appendix',list:'atlas-appendix',text:'atlas-section',closing:'atlas-closing'},'dark-data':{chart:'chart-with-evidence-rail'}},
  family:{statement:'statement-banner',image:'image-strip',metric:'metric-band',evidence:'evidence-top',comparison:'comparison-matrix',process:'process-line'}},
 stage:{label:['Launch stage','发布舞台'],why:['one large object on a calm stage, few words per page','安静舞台上的单一大物件，每页文字很少'],profile:{colorIntensity:'bold',typographicContrast:'expressive',imageEmphasis:'large'},
  own:{'orange-launch':{opening:'stage-hero',chart:'stage-figure',metric:'stage-metric',closing:'stage-closing'},'electric-violet':{image:'photo-split'}},
  family:{statement:'statement-center',image:'image-right',metric:'metric-right',evidence:'evidence-left',comparison:'comparison-stack',process:'process-stair'}}
};
const kinds=project=>new Set(project.plan.scenes.flatMap(s=>visibleBlockIds(s).map(id=>project.document.blocks.find(b=>b.id===id).type)));
/** Direction order and themes. A chosen style leads with its own group; auto leads with what the content is made of. */
export function directionThemes(project,answers){
 const has=kinds(project),chosen=Object.entries(GROUPS).find(([,v])=>v.includes(answers.style))?.[0];
 const lead=chosen||(has.has('chart')||has.has('table')?'report':has.has('image')?'stage':'editorial');
 return [lead,...Object.keys(GROUPS).filter(g=>g!==lead)].map(group=>({group,theme:group===chosen?answers.style:GROUPS[group][0]}));
}
/** Facts: every word, number, unit, dataset, source and explanation. Design fields are outside it. */
export const factsHash=document=>contentHash({title:document.title,locale:document.locale,blocks:document.blocks,datasets:document.datasets,sources:document.sources,explanations:document.explanations||[]});
const first=stack=>stack.split(',')[0].trim().replace(/^["']|["']$/g,'');
/** Sample pages for the preview: the opening, the first page with evidence or media, and the closing. */
export function samplePages(project){
 const scenes=project.plan.scenes,rich=scenes.find((s,i)=>i>0&&i<scenes.length-1&&visibleBlockIds(s).some(id=>['chart','table','metric','image','diagram'].includes(project.document.blocks.find(b=>b.id===id).type)))||scenes[Math.floor(scenes.length/2)];
 return [...new Set([scenes[0].id,rich.id,scenes.at(-1).id])];
}
/** Apply one direction to the whole deck. Author locks win: a locked theme or composition is kept and reported. */
export function applyDirection(project,answers,index){
 const base=assertVisualProject(project),a=entryAnswers(answers),d=directionThemes(base,a)[index];if(!d)throw new DeckError('WORKBENCH_DIRECTION','Choose direction 1, 2 or 3.',422);
 const g=GRAMMAR[d.group],kept=[];let next=structuredClone(base);
 for(const s of base.plan.scenes){
  const locks=base.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===s.id)?.fields||[];
  if(s.theme!==d.theme){if(locks.includes('theme')){kept.push({sceneId:s.id,reason:'theme-lock'});continue;}try{next=applySceneTheme(next,s.id,d.theme);}catch{kept.push({sceneId:s.id,reason:'composition-lock'});continue;}}
  if(locks.includes('composition'))continue;
  const scene=next.plan.scenes.find(v=>v.id===s.id),kind=pageKind(next.document,next.plan,scene),family=inferFamily(next.document,{...scene,blockIds:visibleBlockIds(scene)});
  for(const c of [g.own[d.theme]?.[kind],g.family[family]].filter(Boolean)){const copy=structuredClone(next);copy.plan.scenes.find(v=>v.id===s.id).composition=c;try{assertVisualProject(copy);next=copy;break;}catch{}}
 }
 // Rhythm: never a third identical composition in a row (handoff page 32). The next variant of the same family, in the
 // direction's own order, replaces it; author-locked pages keep theirs and sequences of one comparison family are allowed.
 const locked=id=>(base.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===id)?.fields||[]).includes('composition');
 for(let i=2;i<next.plan.scenes.length;i++){const [p2,p1,s]=next.plan.scenes.slice(i-2,i+1),family=compositions.find(c=>c.id===s.composition)?.family;
  if(!family||families[family].parallel||locked(s.id)||s.composition!==p1.composition||s.composition!==p2.composition)continue;
  const variants=families[family].variants.map(v=>v[0]),start=Math.max(0,variants.indexOf(g.family[family]));
  for(const c of [...variants.slice(start+1),...variants.slice(0,start+1)].filter(c=>c!==s.composition)){const copy=structuredClone(next);copy.plan.scenes[i].composition=c;try{assertVisualProject(copy);next=copy;break;}catch{}}}
 const detail=a.detail==='detailed'?{density:'compact',typographicContrast:'balanced'}:{density:'comfortable'};
 next.document.visualBrief={audience:a.audience,outputLanguage:next.document.locale,profile:{...DEFAULT_PROFILE,...g.profile,...detail,motionIntensity:a.motion}};
 next.extensions.deckweftDirection={version:1,group:d.group,theme:d.theme,style:a.style,detail:a.detail,motion:a.motion,output:a.output};
 if(factsHash(next.document)!==factsHash(base.document))throw new DeckError('WORKBENCH_DIRECTION','A direction changed a fact; refused.',500);
 assertVisualLocks(base,next);return {project:assertVisualProject(next),direction:{index,group:d.group,theme:d.theme,label:g.label},kept};
}
/** What a direction changes, from the drawn theme and plan, in both languages. */
export function explainDirection(base,result,answers,resources={}){
 const a=entryAnswers(answers),p=result.project,g=GRAMMAR[result.direction.group],pack=themePacks().find(t=>t.id=== result.direction.theme),profile=p.document.visualBrief.profile;
 const theme=resolveTheme(pack.id,pack.version,p.document.locale,{profile}),samples=samplePages(p),scene=id=>p.plan.scenes.find(s=>s.id===id),n=id=>p.plan.scenes.findIndex(s=>s.id===id)+1;
 const changedPages=p.plan.scenes.filter((s,i)=>s.composition!==base.plan.scenes[i].composition).length,hasImage=kinds(p).has('image');
 const levels=a.output==='web'?null:presentationCapabilities(a.output,p.document,resources,p.plan).components.reduce((m,c)=>(m[c.level]=(m[c.level]||0)+1,m),{});
 const m=theme.tokens.motion,motionText=[`${pack.motion.effect} ${pack.motion.durationMs} ms, ${m.distance} px, ${m.easing}; reduced motion: ${m.fallback}`,`${pack.motion.effect==='fade'?'淡入':'无'} ${pack.motion.durationMs} 毫秒、位移 ${m.distance} px、${m.easing}；减少动态时：${m.fallback==='static'?'静态状态':'即时'}`];
 return {
  title:{en:`${g.label[0]} · ${pack.id}`,zh:`${g.label[1]} · ${pack.id}`},
  why:{en:g.why[0],zh:g.why[1]},
  graphics:{en:`${pack.modes.default==='dark'?'Dark':'Light'} surface ${pack.palette.paper}, accent ${pack.palette.accent}. ${samples.map(id=>`Page ${n(id)}: ${compositionLabel(scene(id).composition)[0]}`).join('; ')}. ${changedPages} of ${p.plan.scenes.length} pages change composition.`,zh:`${pack.modes.default==='dark'?'深色':'浅色'}底 ${pack.palette.paper}，强调色 ${pack.palette.accent}。${samples.map(id=>`第 ${n(id)} 页：${compositionLabel(scene(id).composition)[1]}`).join('；')}。${p.plan.scenes.length} 页中有 ${changedPages} 页更换构图。`},
  type:{en:`Display ${first(theme.display)}, body ${first(theme.body)}, numbers ${first(theme.tokens.typography.numeric)}; ${profile.typographicContrast} contrast (display scale ${theme.displayScale}).`,zh:`标题 ${first(theme.display)}，正文 ${first(theme.body)}，数字 ${first(theme.tokens.typography.numeric)}；${profile.typographicContrast==='expressive'?'强烈':'均衡'}对比（标题比例 ${theme.displayScale}）。`},
  media:{en:hasImage?`Images ${pack.imageGrammar.treatment}, ${Math.round(theme.split*100)}% of the width, captions visible.`:`No images in this content. ${pack.id==='orange-launch'?'The stage hero draws one orb in the media area; nothing is invented as content.':'Text and figures take the media area.'}`,zh:hasImage?`图片处理：${pack.imageGrammar.treatment}，占宽度 ${Math.round(theme.split*100)}%，图注可见。`:`本内容没有图片。${pack.id==='orange-launch'?'舞台封面在媒体区绘制一个圆形；不会编造任何内容。':'文字与图形占据媒体区。'}`},
  motion:{en:a.motion==='subtle'?`Plays: ${motionText[0]}.`:`Off, as you chose. With motion on this direction would use ${motionText[0]}.`,zh:a.motion==='subtle'?`播放：${motionText[1]}。`:`按你的选择关闭。开启后此方向使用 ${motionText[1]}。`},
  output:{en:levels?`${a.output==='pptx'?'PowerPoint':'PDF'}: ${Object.entries(levels).map(([k,v])=>`${v} ${k}`).join(', ')} (L1 native or real text, L2 vector with real text, L3 image with a summary).`:'Web presentation: every element is native (L1).',zh:levels?`${a.output==='pptx'?'PowerPoint':'PDF'}：${Object.entries(levels).map(([k,v])=>`${k} ${v} 个`).join('，')}（L1 原生或真实文字，L2 含真实文字的矢量，L3 附摘要的图片）。`:'网页演示：所有元素均为原生（L1）。'},
  facts:{en:`Facts identical in all three: same words, numbers, units and sources (${factsHash(p.document).slice(0,12)}).`,zh:`三个方向事实完全相同：文字、数值、单位与来源一致（${factsHash(p.document).slice(0,12)}）。`},
  kept:result.kept,samples
 };
}
/** The three directions for one deck, with a check that they really differ in graphics, type, media and motion. */
export function planDirections(project,answers,resources={}){
 const base=assertVisualProject(project),a=entryAnswers(answers),out=[0,1,2].map(i=>{const r=applyDirection(base,a,i);return {...r,explanation:explainDirection(base,r,a,resources)};});
 const signature=r=>{const pack=themePacks().find(t=>t.id===r.direction.theme),profile=r.project.document.visualBrief.profile,theme=resolveTheme(pack.id,pack.version,r.project.document.locale,{profile});
  return {graphics:JSON.stringify([pack.palette.paper,r.project.plan.scenes.map(s=>s.composition)]),type:JSON.stringify([first(theme.display),first(theme.body),theme.displayScale]),media:JSON.stringify([pack.imageGrammar.treatment,theme.split]),motion:JSON.stringify([pack.motion.durationMs,theme.tokens.motion.distance,theme.tokens.motion.easing,theme.tokens.motion.fallback])};};
 const sigs=out.map(signature),differences=[];for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)differences.push({pair:[i,j],differs:Object.fromEntries(Object.keys(sigs[i]).map(k=>[k,sigs[i][k]!==sigs[j][k]]))});
 return {factsHash:factsHash(base.document),directions:out,differences};
}
