import { DeckError } from '../core/errors.mjs';
// Geometry and reading paths are renderer contracts, not palette aliases.
export const families = {
 statement: {label:['Statement','观点陈述'],required:'heading',variants:[['statement-split','Left thesis → right support','左侧观点 → 右侧论据','left',.45],['statement-banner','Top headline → lower columns','顶部标题 → 下方分栏','top',.65],['statement-center','Centered thesis → supporting stack','居中观点 → 纵向展开','center',.3]]},
 image: {label:['Image narrative','图像叙事'],required:'image',variants:[['image-left','Image left → text right','左图 → 右文','left',.6],['image-strip','Text → image → caption','文字 → 图片 → 图注','bottom',.45],['image-right','Headline → text left / image right','标题 → 左文右图','right',.5]]},
 metric: {label:['Oversized number','超大数值'],required:'metric',variants:[['metric-left','Number left → explanation right','左侧数值 → 右侧解释','left',.35],['metric-band','Headline → number band → support','标题 → 横向数值带 → 说明','center',.5],['metric-right','Thesis left → number right','左侧观点 → 右侧数值','right',.6]]},
 evidence: {label:['Data evidence','数据证据'],required:'chart',variants:[['evidence-left','Plot left → evidence rail right','左侧图表 → 右侧证据栏','left',.7],['evidence-top','Headline → full-width plot → notes','标题 → 通栏图表 → 注释','top',.55],['evidence-right','Evidence left → plot right','左侧证据 → 右侧图表','right',.8]]},
 comparison: {label:['Comparison','比较'],required:'table',variants:[['comparison-matrix','Headline → matrix → conclusion','标题 → 对照矩阵 → 结论','top',.65],['comparison-rail','Question left → matrix right','左侧问题 → 右侧矩阵','right',.7],['comparison-stack','Question → dimension cards with stacked attributes','问题 → 按维度分组的纵向属性卡','center',.5]]},
 process: {label:['Process','流程'],required:'diagram',variants:[['process-line','Headline → horizontal steps → detail','标题 → 横向步骤 → 说明','top',.4],['process-rail','Thesis left → vertical sequence right','左侧观点 → 右侧纵向流程','right',.6],['process-stair','Headline → stepped sequence → detail','标题 → 阶梯流程 → 说明','center',.5]]}
};
export const compositions = Object.entries(families).flatMap(([family,f])=>f.variants.map(([id,en,zh,focus,density],index)=>({id,family,label:[en,zh],focus,density,index})));
export function inferFamily(document,scene){const known=compositions.find(c=>c.id===scene.composition);if(known)return known.family;const types=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)?.type);return ['evidence','image','metric','comparison','process'].find(f=>types.includes(families[f].required))||'statement';}
export function assertComposition(document,scene){const c=compositions.find(c=>c.id===scene.composition);if(!c)return;const types=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)?.type);if(!types.includes('heading')||!types.includes(families[c.family].required))throw new DeckError('COMPOSITION_CONTENT',`The ${c.family} family needs a heading and ${families[c.family].required}; keep all existing content.`,422);}
export function describeCandidate(document,scene){const c=compositions.find(c=>c.id===scene.composition);return {id:scene.composition,family:c?.family||inferFamily(document,scene),focus:c?.focus||'center',density:c?.density||.5,colorMode:scene.colorMode||'default',theme:scene.theme,imageRatio:c?.family==='image'?[.6,.3,.5][c.index]:0};}
export function compositionOrder(document,scene){
 const c=compositions.find(c=>c.id===scene.composition);if(!c)return scene.blockIds;
 const first=({'image-left':'image','metric-left':'metric','evidence-left':'heading','comparison-stack':'heading'})[c.id];
 const rank=id=>{const type=document.blocks.find(b=>b.id===id).type;if(c.id==='metric-band')return type==='citation'?9:type==='heading'?0:type==='metric'?1:2;return type==='citation'?9:type===first?0:type==='heading'?1:((c.id==='evidence-right'&&type==='chart')||(c.id==='comparison-stack'&&type==='table')||(c.id==='process-rail'&&type==='diagram'))?8:2;};
 return [...scene.blockIds].sort((a,b)=>rank(a)-rank(b));
}
