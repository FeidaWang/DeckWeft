import { DeckError } from '../core/errors.mjs';
// Geometry and reading paths are renderer contracts, not palette aliases.
// Variant tuple: [id, English route, Chinese route, focus zone, density, metadata].
// metadata.columns states the primary grid columns at 1440 / 1024 / 390 px; narrow screens always read in compositionOrder().
// metadata.cards marks a heading plus a row of equal cards (the rhythm rule counts consecutive rows).
export const families = {
 statement: {label:['Statement','观点陈述'],required:'heading',variants:[['statement-split','Left thesis → right support','左侧观点 → 右侧论据','left',.45],['statement-banner','Top headline → lower columns','顶部标题 → 下方分栏','top',.65],['statement-center','Centered thesis → supporting stack','居中观点 → 纵向展开','center',.3]]},
 image: {label:['Image narrative','图像叙事'],required:'image',variants:[['image-left','Image left → text right','左图 → 右文','left',.6],['image-strip','Text → image → caption','文字 → 图片 → 图注','bottom',.45],['image-right','Headline → text left / image right','标题 → 左文右图','right',.5]]},
 metric: {label:['Oversized number','超大数值'],required:'metric',variants:[['metric-left','Number left → explanation right','左侧数值 → 右侧解释','left',.35],['metric-band','Headline → number band → support','标题 → 横向数值带 → 说明','center',.5],['metric-right','Thesis left → number right','左侧观点 → 右侧数值','right',.6]]},
 evidence: {label:['Data evidence','数据证据'],required:'chart',variants:[['evidence-left','Plot left → evidence rail right','左侧图表 → 右侧证据栏','left',.7],['evidence-top','Headline → full-width plot → notes','标题 → 通栏图表 → 注释','top',.55],['evidence-right','Evidence left → plot right','左侧证据 → 右侧图表','right',.8]]},
 comparison: {label:['Comparison','比较'],required:'table',parallel:true,variants:[['comparison-matrix','Headline → matrix → conclusion','标题 → 对照矩阵 → 结论','top',.65],['comparison-rail','Question left → matrix right','左侧问题 → 右侧矩阵','right',.7],['comparison-stack','Question → dimension cards with stacked attributes','问题 → 按维度分组的纵向属性卡','center',.5,{cards:'table'}]]},
 process: {label:['Process','流程'],required:'diagram',parallel:true,variants:[['process-line','Headline → horizontal steps → detail','标题 → 横向步骤 → 说明','top',.4],['process-rail','Thesis left → vertical sequence right','左侧观点 → 右侧纵向流程','right',.6],['process-stair','Headline → stepped sequence → detail','标题 → 阶梯流程 → 说明','center',.5]]},
 // S3 families. Chosen by composition id or the Studio family control only; inference keeps the six families above.
 chapter: {label:['Chapter','章节'],required:'heading',explicit:true,variants:[
  ['chapter-low','Open space → headline low left → intro and contents beside it','留白 → 左下标题 → 旁侧导语与目录','bottom',.25,{columns:{1440:2,1024:2,390:1}}],
  ['chapter-index','Headline and intro left → contents index right','左侧标题与导语 → 右侧章节目录','left',.45,{columns:{1440:2,1024:2,390:1}}],
  ['chapter-margin','Contents in a narrow margin → headline and intro wide right','窄边栏目录 → 右侧大标题与导语','right',.35,{columns:{1440:2,1024:2,390:1}}]]},
 'before-after': {label:['Before / after','前后对比'],required:'image',explicit:true,parallel:true,pair:{baseline:'first image in block order',changed:'second image',label:'visible caption marker, no interaction'},variants:[
  ['before-after-split','Headline → baseline left | after right → notes','标题 → 左基线 | 右变化后 → 说明','top',.65,{columns:{1440:2,1024:2,390:1}}],
  ['before-after-rail','Headline and notes left → baseline above after right','左侧标题与说明 → 右侧上基线下变化后','right',.55,{columns:{1440:2,1024:2,390:1}}],
  ['before-after-triptych','Headline → baseline | what changed | after','标题 → 基线 | 变化说明 | 变化后','center',.6,{columns:{1440:3,1024:3,390:1}}]]},
 'system-map': {label:['System map','系统关系图'],required:'diagram',explicit:true,variants:[
  ['system-map-wide','Headline and note → full-width map → key row','标题与说明 → 通栏关系图 → 图例行','top',.6,{columns:{1440:2,1024:2,390:1}}],
  ['system-map-rail','Map left → headline, notes and key right','左侧关系图 → 右侧标题、说明与图例','left',.65,{columns:{1440:2,1024:1,390:1}}],
  ['system-map-key','Headline → key and notes left → map right','标题 → 左侧图例与说明 → 右侧关系图','right',.6,{columns:{1440:2,1024:1,390:1}}]]},
 'small-multiples': {label:['Small multiples','小倍数图'],required:'chart',explicit:true,parallel:true,sharedScale:['chartType','unit','axis','categories'],panels:{min:2,perPage:2},variants:[
  ['small-multiples-row','Headline → equal panels side by side → notes','标题 → 等大并列面板 → 说明','top',.7,{columns:{1440:2,1024:1,390:1}}],
  ['small-multiples-lead','Headline left | reading note right → equal panels','左标题 | 右读图说明 → 等大面板','left',.7,{columns:{1440:2,1024:1,390:1}}],
  ['small-multiples-center','Centered headline → note | key on a centre line → equal panels','居中标题 → 中轴两侧的说明与要点 → 等大面板','center',.65,{columns:{1440:2,1024:1,390:1}}]]},
 quote: {label:['Quotation','引语'],required:'quote',explicit:true,layers:{verbatim:'quote',attribution:'citation',paraphrase:'paragraph'},variants:[
  ['quote-center','Kicker → centered verbatim quote → attribution → paraphrase','引题 → 居中原话 → 出处 → 转述','center',.3,{columns:{1440:1,1024:1,390:1}}],
  ['quote-split','Headline and paraphrase left → verbatim quote and attribution right','左侧标题与转述 → 右侧原话与出处','right',.5,{columns:{1440:2,1024:2,390:1}}],
  ['quote-band','Headline → full-width quote band → attribution | paraphrase','标题 → 通栏原话 → 出处 | 转述','top',.45,{columns:{1440:2,1024:2,390:1}}]]},
 closing: {label:['Conclusion / next step','结论与下一步'],required:'list',explicit:true,variants:[
  ['closing-split','Conclusion left → numbered next steps right','左侧结论 → 右侧下一步','left',.5,{columns:{1440:2,1024:2,390:1}}],
  ['closing-steps','Conclusion → next steps in one row → ask','结论 → 一行下一步 → 请求','top',.55,{columns:{1440:2,1024:2,390:1},cards:'list'}],
  ['closing-focus','Centered conclusion → the ask → steps and summary','居中结论 → 请求 → 步骤与摘要','center',.35,{columns:{1440:2,1024:2,390:1}}]]}
};
export const compositions = Object.entries(families).flatMap(([family,f])=>f.variants.map(([id,en,zh,focus,density,meta],index)=>({id,family,label:[en,zh],focus,density,index,...meta})));
export function inferFamily(document,scene){const known=compositions.find(c=>c.id===scene.composition);if(known)return known.family;const types=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)?.type);return ['evidence','image','metric','comparison','process'].find(f=>types.includes(families[f].required))||'statement';}
const sceneBlocks=(document,scene)=>scene.blockIds.map(id=>document.blocks.find(b=>b.id===id));
const same=values=>values.every(v=>JSON.stringify(v)===JSON.stringify(values[0]));
/** The citation that attributes each verbatim quotation: the first unused citation in block order whose source the quote cites. */
export function quoteAttributions(document,scene){
 const blocks=sceneBlocks(document,scene),used=new Set(),pairs=new Map();
 for(const q of blocks.filter(b=>b.type==='quote')){const c=blocks.find(b=>b.type==='citation'&&!used.has(b.id)&&q.sourceIds.includes(b.sourceId));if(c){used.add(c.id);pairs.set(q.id,c.id);}}
 return pairs;
}
const NOT_IN_CHAPTER=['chart','table','diagram','image','metric','code','annotation'];
// Content contracts beyond the required block. Each returns a refusal message; nothing is repaired or dropped.
const familyRules={
 chapter:blocks=>blocks.some(b=>NOT_IN_CHAPTER.includes(b.type))?'A chapter page opens a section with a heading, an intro and its contents; move evidence to the pages of that section.':null,
 'before-after':(blocks,scene)=>{
  const images=blocks.filter(b=>b.type==='image');
  if(images.length!==2)return 'A before/after page compares exactly two images of the same object: the baseline first, then the changed state.';
  if(!!images[0].factual!==!!images[1].factual)return 'Both states must be the same kind of image: two factual photographs or two illustrations.';
  const compare=scene.interactions?.find(i=>i.kind==='image-compare');
  if(compare&&(compare.blockId!==images[0].id||compare.otherBlockId!==images[1].id))return 'A comparison control on this page must pair the baseline (the first image) with the changed state.';
  if(compare?.initialTab==='second')return 'The baseline must stay visible without interaction; open the comparison on both images or on the baseline.';
  return null;
 },
 'system-map':blocks=>{
  const diagrams=blocks.filter(b=>b.type==='diagram');
  if(diagrams.some(d=>(d.diagramType||'relationship')!=='relationship'))return 'A system map draws relationships; sequence and process diagrams belong to the process family.';
  const branching=d=>d.edges.length>=d.nodes.length||d.nodes.some(n=>d.edges.filter(e=>e.from===n.id||e.to===n.id).length>=3);
  return diagrams.some(branching)?null:'A system map shows branching or looping relationships; a single chain is a process.';
 },
 'small-multiples':(blocks,scene,document)=>{
  const charts=blocks.filter(b=>b.type==='chart');
  if(charts.length<families['small-multiples'].panels.min)return 'Small multiples need at least two chart panels.';
  const data=charts.map(c=>document.datasets.find(d=>d.id===c.datasetId)),kind=charts.map(c=>c.chartType||'line');
  if(!same(kind)||!same(data.map(d=>d.unit)))return 'Every panel needs the same chart type and unit so the panels can be read on one scale.';
  if(charts.some(c=>c.axis?.policy!=='fixed')||!same(charts.map(c=>[c.axis.min,c.axis.max,c.axis.scale||'linear'])))return 'Declare the shared scale: give every panel a fixed value axis with the same range and scale.';
  if(kind[0]==='scatter'&&(charts.some(c=>c.xAxis?.policy!=='fixed')||!same(charts.map(c=>[c.xAxis.min,c.xAxis.max,c.xAxis.scale||'linear']))||!same(data.map(d=>d.xUnit))))return 'Scatter panels also share one fixed horizontal axis and unit.';
  if(['line','area','stacked','heatmap'].includes(kind[0])&&!same(data.map(d=>[d.categoryKind||'category',d.categories])))return 'Panels that share a category axis need the same categories in the same order.';
  return null;
 },
 quote:(blocks,scene,document)=>{
  const quotes=blocks.filter(b=>b.type==='quote'),pairs=quoteAttributions(document,scene);
  return quotes.every(q=>pairs.has(q.id))?null:'Attribute every verbatim quotation: add a citation in this page whose source is one of the quote’s sources. Paraphrase belongs in a paragraph, not a quote block.';
 }
};
export function assertComposition(document,scene){const c=compositions.find(c=>c.id===scene.composition);if(!c)return;const types=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)?.type);if(!types.includes('heading')||!types.includes(families[c.family].required))throw new DeckError('COMPOSITION_CONTENT',`The ${c.family} family needs a heading and ${families[c.family].required}; keep all existing content.`,422);const message=familyRules[c.family]?.(sceneBlocks(document,scene),scene,document);if(message)throw new DeckError('COMPOSITION_CONTENT',message,422);}
/** Families whose content contract this scene already meets. Used for rhythm advice; it never changes a page. */
export function eligibleFamilies(document,scene){return Object.keys(families).filter(family=>{try{assertComposition(document,{...scene,composition:families[family].variants[0][0]});return true;}catch{return false;}});}
/** Asset-level contract: both before/after states are shown at the same aspect ratio, so the same framing is compared. */
export function assertCompositionAssets(document,scene,assets){
 if(compositions.find(c=>c.id===scene.composition)?.family!=='before-after')return;
 const aspect=b=>{const slot=scene.imageSlots?.find(s=>s.blockId===b.id);if(slot?.display==='contain')return slot.aspect;const a=assets.find(a=>a.id===b.assetId),c=scene.crops?.find(c=>c.blockId===b.id)||{width:1,height:1};return a?(a.width*c.width)/(a.height*c.height):NaN;};
 const [first,second]=sceneBlocks(document,scene).filter(b=>b.type==='image').map(aspect);
 if(!(Math.abs(first/second-1)<=.02))throw new DeckError('COMPOSITION_CONTENT','Show both states at the same aspect ratio; crop them to the same framing explicitly.',422);
}
const cardItems=(document,scene,kind)=>Math.max(0,...sceneBlocks(document,scene).filter(b=>b.type===kind).map(b=>kind==='table'?b.rows.length:b.items.length));
/** A heading plus a row of three or more equal cards. */
export function cardRow(document,scene){const c=compositions.find(c=>c.id===scene.composition);return !!c?.cards&&cardItems(document,scene,c.cards)>=3;}
export function describeCandidate(document,scene){const c=compositions.find(c=>c.id===scene.composition);return {id:scene.composition,family:c?.family||inferFamily(document,scene),focus:c?.focus||'center',density:c?.density||.5,colorMode:scene.colorMode||'default',theme:scene.theme,imageRatio:c?.family==='image'?[.6,.3,.5][c.index]:c?.family==='before-after'?[.45,.35,.4][c.index]:0,cards:cardRow(document,scene)};}
// Reading order per S3 variant; types not listed keep author order after the listed ones, citations close the page.
const S3_ORDER={
 'chapter-low':['heading','paragraph','list','callout','quote'],'chapter-index':['heading','paragraph','callout','list'],'chapter-margin':['heading','paragraph','callout','list'],
 'before-after-split':['heading','image','paragraph','callout'],'before-after-rail':['heading','paragraph','callout','image'],'before-after-triptych':['heading','baseline','paragraph','callout','changed'],
 'system-map-wide':['heading','paragraph','callout','diagram','list'],'system-map-rail':['heading','paragraph','callout','diagram','list'],'system-map-key':['heading','list','paragraph','callout','diagram'],
 'small-multiples-row':['heading','chart','annotation','paragraph','callout','list'],'small-multiples-lead':['heading','paragraph','callout','list','chart','annotation'],'small-multiples-center':['heading','paragraph','callout','list','chart','annotation'],
 'quote-center':['heading','quote','paragraph','callout','list'],'quote-split':['heading','paragraph','callout','quote','list'],'quote-band':['heading','quote','paragraph','callout','list'],
 'closing-split':['heading','paragraph','list','callout'],'closing-steps':['heading','list','callout','paragraph'],'closing-focus':['heading','callout','list','paragraph']
};
export function compositionOrder(document,scene){
 const c=compositions.find(c=>c.id===scene.composition);if(!c)return scene.blockIds;
 if(S3_ORDER[c.id]){
  const order=S3_ORDER[c.id],type=id=>document.blocks.find(b=>b.id===id).type,images=scene.blockIds.filter(id=>type(id)==='image'),attributed=new Map([...quoteAttributions(document,scene)].map(([q,cite])=>[cite,q]));
  const key=id=>c.id==='before-after-triptych'&&type(id)==='image'?(id===images[0]?'baseline':'changed'):type(id);
  const rank=id=>type(id)==='citation'?order.length+2:order.includes(key(id))?order.indexOf(key(id)):order.length+1;
  // Each attribution follows its own quotation; other citations stay last.
  const sorted=scene.blockIds.filter(id=>!attributed.has(id)).sort((a,b)=>rank(a)-rank(b));
  return sorted.flatMap(id=>[id,...[...attributed].filter(([,q])=>q===id).map(([cite])=>cite)]);
 }
 const first=({'image-left':'image','metric-left':'metric','evidence-left':'heading','comparison-stack':'heading'})[c.id];
 const rank=id=>{const type=document.blocks.find(b=>b.id===id).type;if(c.id==='metric-band')return type==='citation'?9:type==='heading'?0:type==='metric'?1:2;return type==='citation'?9:type===first?0:type==='heading'?1:((c.id==='evidence-right'&&type==='chart')||(c.id==='comparison-stack'&&type==='table')||(c.id==='process-rail'&&type==='diagram'))?8:2;};
 return [...scene.blockIds].sort((a,b)=>rank(a)-rank(b));
}
