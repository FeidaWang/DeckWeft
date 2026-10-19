import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {registerAsset} from '../src/assets/registry.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
/**
 * VIS-014 release gate content (S6). Gallery option C (alignment §13): the requirements §9 gallery is frozen, four pages per
 * theme, in English and Simplified Chinese with the same ids. The 8-page story is one document drawn by each theme's plan, so
 * a theme changes composition and type roles, never facts.
 *
 * Facts: pages marked `sourced` use real repository records or the W3C WCAG 2.2 text. Every other number is synthetic and
 * says so in its dataset, caption and citation. Images are original generated or code-drawn artwork, never photographs.
 */
export const THEMES=['cream-collage','dark-data','electric-violet'];
export const LOCALES=['en','zh-CN'];
/** The frozen gallery: requirements §9, one row per page. `task` is the requirement's wording. */
export const GALLERY_PAGES=[
 {page:1,id:'cc-cover',theme:'cream-collage',composition:'diagonal-cover',task:'Diagonal cover'},
 {page:2,id:'cc-metrics',theme:'cream-collage',composition:'metric-left',task:'Asymmetric large metrics'},
 {page:3,id:'cc-timeline',theme:'cream-collage',composition:'process-line',task:'Editorial timeline'},
 {page:4,id:'cc-closing',theme:'cream-collage',composition:'closing-steps',task:'Bold closing / action composition'},
 {page:5,id:'ev-photo',theme:'electric-violet',composition:'photo-split',task:'Photography split'},
 {page:6,id:'ev-chapter',theme:'electric-violet',composition:'violet-chapter',task:'Full-violet chapter'},
 {page:7,id:'ev-case',theme:'electric-violet',composition:'image-right',task:'Annotated case / image story'},
 {page:8,id:'ev-evidence',theme:'electric-violet',composition:'evidence-right',task:'Chart-and-image evidence page'},
 {page:9,id:'dd-trend',theme:'dark-data',composition:'chart-with-evidence-rail',task:'Multi-series time plot'},
 {page:10,id:'dd-ranked',theme:'dark-data',composition:'evidence-left',task:'Ranked comparison'},
 {page:11,id:'dd-matrix',theme:'dark-data',composition:'evidence-top',task:'Matrix / heatmap where data justifies it'},
 {page:12,id:'dd-explain',theme:'dark-data',composition:'process-line',task:'Explanatory diagram with data-focused interaction'}
];
/** The 8-page story, one composition per theme. Theme-only compositions open each story; the rest are the twelve families. */
export const STORY_COMPOSITIONS={
 'cream-collage':{'st-open':'diagonal-cover','st-context':'metric-band','st-evidence':'evidence-left','st-compare':'comparison-matrix','st-process':'process-stair','st-pair':'before-after-split','st-quote':'quote-split','st-close':'closing-steps'},
 'dark-data':{'st-open':'statement-banner','st-context':'metric-left','st-evidence':'chart-with-evidence-rail','st-compare':'comparison-rail','st-process':'process-line','st-pair':'before-after-rail','st-quote':'quote-band','st-close':'closing-focus'},
 'electric-violet':{'st-open':'violet-chapter','st-context':'metric-right','st-evidence':'evidence-top','st-compare':'comparison-stack','st-process':'process-rail','st-pair':'before-after-triptych','st-quote':'quote-center','st-close':'closing-split'}
};
const REPO='https://github.com/FeidaWang/DeckWeft';
/** Verbatim text of WCAG 2.2 Success Criterion 1.4.3 (opening clause). The story quotes it and nothing else. */
export const WCAG_143='The visual presentation of text and images of text has a contrast ratio of at least 4.5:1';
const ASSETS={
 workbench:{file:'public/assets/visual/workbench.png',provenance:'Original host-generated decorative artwork, retained from the MB-11–15 build. Not documentary photography or product evidence.',license:'Generated artwork; no third-party rights clearance asserted',allowedUse:'Local DeckWeft demonstration; review rights for your own redistribution',alt:'Blank paper story cards linked by blue thread on a wooden workbench',fallback:'A series of paper cards joined by blue thread; decorative artwork.'},
 cosmos:{file:'public/assets/devday/cosmos.png',provenance:'Original AI-generated starfield backdrop created 2026-10-17 (public/assets/devday/cosmos.provenance.json). Not astrophotography.',license:'Original DeckWeft generated asset',allowedUse:'Local DeckWeft demonstration and release-gate fixtures',alt:'Generated starfield: a dense blue-white star cloud on the right, near-black space on the left',fallback:'A dark starfield with a bright cluster on the right; generated artwork.'},
 subject:{file:'public/assets/visual/subject.png',provenance:'Original code-drawn synthetic subject fixture. Not a documentary photo or historical product screenshot.',license:'MIT; original DeckWeft fixture',allowedUse:'Local demonstrations and tests',alt:'Synthetic test card: an amber rectangle inside a navy frame on a pale background',fallback:'A navy frame with an amber centre; code-drawn test card.'}
};
/** Registers the three images in an asset home and returns their records (hash-bound; the files stay outside project JSON). */
export async function releaseAssets(home){
 const records={};
 for(const [key,{file,...metadata}]of Object.entries(ASSETS))records[key]=await registerAsset(home,await readFile(new URL('../'+file,import.meta.url)),metadata);
 return records;
}
const shell=(locale,id,title,audience)=>({format:'deckweft-presentation',schemaVersion:3,id,title,locale,
 visualBrief:{audience,outputLanguage:locale,profile:{colorIntensity:'bold',typographicContrast:'expressive',density:'comfortable',motionIntensity:'subtle',imageEmphasis:'large'}},
 rules:{misreading:'strict'},blocks:[],datasets:[],sources:[],explanations:[],authorOverrides:{lockedBlockIds:[]},migration:{}});

/** The frozen 12-page gallery in one locale. Every page carries its designated §9 theme and composition. */
export function releaseGallery(locale,assets){
 const zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en;
 const document=shell(locale,'vis-014-gallery-'+locale.toLowerCase(),t('VIS-014 release gallery — twelve frozen pages','VIS-014 发布画廊——十二张冻结页面'),t('Reviewers approving the first visual release: every page, both languages, weakest page included.','审批首个视觉版本的审阅者：每一页、两种语言，最弱的一页也在内。'));
 const plan={format:'deckweft-design-plan',version:1,documentId:document.id,scenes:[]};
 document.sources.push(
  {id:'requirements',title:t('DeckWeft visual-first requirements, §9 initial fixed gallery','DeckWeft 视觉优先需求文档，第 9 节初始固定画廊'),url:REPO+'/blob/main/DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md'},
  {id:'repository',title:t('DeckWeft repository records: src/design/compositions.mjs, ROADMAP.md and docs/en/verification.md (S1–S6 entries are on the local S6 branch, not yet published)','DeckWeft 仓库记录：src/design/compositions.mjs、ROADMAP.md 与 docs/en/verification.md（S1–S6 条目位于本地 S6 分支，尚未发布）'),url:REPO},
  {id:'synthetic',title:t('DeckWeft VIS-014 gallery sample (synthetic numbers, not measured)','DeckWeft VIS-014 画廊样例（合成数字，非实测）'),url:'https://example.org/deckweft/vis-014-synthetic'},
  {id:'cosmos-file',title:t('Provenance of the generated starfield (cosmos.provenance.json)','生成星空图的来源记录（cosmos.provenance.json）'),url:REPO+'/blob/main/public/assets/devday/cosmos.provenance.json'},
  {id:'workbench-file',title:t('DeckWeft local demonstration artwork (workbench.png)','DeckWeft 本地演示插画（workbench.png）'),url:REPO+'/blob/main/public/assets/visual/workbench.png'},
  {id:'subject-file',title:t('DeckWeft code-drawn test card (subject.png)','DeckWeft 代码绘制测试卡（subject.png）'),url:REPO+'/blob/main/public/assets/visual/subject.png'});
 const add=(id,type,fields,sourceIds=['synthetic'])=>{document.blocks.push({id,type,sourceIds,...fields});return id;};
 const scene=(page,blockIds,fields={})=>{const p=GALLERY_PAGES.find(p=>p.id===page);plan.scenes.push({id:p.id,role:fields.role||'evidence',theme:p.theme,themeVersion:'1.0.0',composition:p.composition,blockIds,focalBlockId:blockIds[0],...fields});};
 const data=(id,fields)=>{document.datasets.push({id,synthetic:true,sourceIds:['synthetic'],version:'vis-014-sample-1',collectedAt:'2026-10-19',...fields});return id;};

 // 1 · Diagonal cover: the long bilingual title and long English words.
 scene('cc-cover',[
  add('cover-title','heading',{text:t('Internationalization without compromise:\na twelve-page release gallery for bilingual decks','国际化而不妥协：\n双语演示文稿的十二页发布画廊')},['requirements']),
  add('cover-body','paragraph',{text:t('Counterintuitively, the incomprehensibilities of a release rarely sit on the hero slide. These twelve pages are frozen in two languages and three themes, so the weakest page is reviewed with the rest.','反直觉的是，一次发布中最难懂的问题很少出在主视觉页。这十二页以两种语言、三个主题冻结下来，最弱的一页也和其他页一起接受审阅。')},['requirements']),
  add('cover-metric','metric',{value:12,unit:t('pages','页'),label:t('Frozen gallery pages per language','每种语言固定的画廊页数')},['requirements']),
  add('cover-note','callout',{text:t('01 / VIS-014 RELEASE GALLERY','01 / VIS-014 发布画廊')},['requirements']),
  add('cover-source','citation',{sourceId:'requirements',text:t('Gallery tasks: requirements §9, frozen 2026-10-19','画廊任务：需求文档第 9 节，2026-10-19 冻结')},['requirements'])
 ],{role:'opening',contentStatus:'sourced'});
 // 2 · Asymmetric large metric: a counted repository fact and a constrained block of multilingual numerals.
 scene('cc-metrics',[
  add('metrics-title','heading',{text:t('Twelve families,\nthirty-six geometries.','十二个构图族，\n三十六种几何结构。')},['repository']),
  add('metrics-number','metric',{value:36,unit:t('geometries','种结构'),label:t('Composition geometries after S3: 12 families × 3','S3 之后的构图几何：12 个构图族 × 3')},['repository']),
  add('metrics-body','paragraph',{text:t('Each family keeps three geometries that change proportion, position and reading path, not colour. The number is counted from the composition registry, not estimated.','每个构图族保留三种几何结构，改变的是比例、位置与阅读路径，而不是颜色。这个数字从构图注册表直接统计，不是估算。')},['repository']),
  add('metrics-numerals','callout',{text:t('Numerals in context: 36 · 三十六 · ٣٦ · ３６ · XXXVI. Widths: 1,440 px · 1 024 px · 390 px.','数字写法：36 · 三十六 · ٣٦ · ３６ · XXXVI。宽度：1,440 px · 1 024 px · 390 px。')},['repository']),
  add('metrics-source','citation',{sourceId:'repository',text:t('Counted in src/design/compositions.mjs, S6 branch','统计自 src/design/compositions.mjs（S6 分支）')},['repository'])
 ],{role:'context',contentStatus:'sourced',takeaway:{blockId:'metrics-number'}});
 // 3 · Editorial timeline: real dates from the roadmap and verification records; CJK proper names of the measured fonts.
 add('timeline-diagram','diagram',{diagramType:'process',nodes:[
  {id:'alpha',label:t('2026-10-16\nalpha.2 verified','2026-10-16\nalpha.2 验证'),note:t('Local results recorded; no host or font promise.','记录本地结果；不承诺宿主或字体。')},
  {id:'plan',label:t('2026-10-17\nModular build plan','2026-10-17\n模块化构建计划'),note:t('Types, visuals, delegation, presenter, appearance.','类型、视觉、委派、演讲者视图与外观。')},
  {id:'publish',label:t('2026-10-18\nVIS-001 published','2026-10-18\nVIS-001 发布'),note:t('338 tests on Node 22 CI for Ubuntu, macOS and Windows; VIS-002–013 implemented locally.','Node 22 CI 在 Ubuntu、macOS、Windows 上通过 338 项测试；VIS-002–013 本地实现。')},
  {id:'handoff',label:t('2026-10-19\nDesign handoff S1–S6','2026-10-19\n设计交接 S1–S6'),note:t('Contracts, families, charts, motion, then this gate.','契约、构图族、图表、动效，然后是本次发布门。')}],
  edges:[{id:'t1',from:'alpha',to:'plan'},{id:'t2',from:'plan',to:'publish'},{id:'t3',from:'publish',to:'handoff'}]},['repository']);
 scene('cc-timeline',[
  add('timeline-title','heading',{text:t('Four days from a verified alpha\nto a release gate.','从已验证的 alpha\n到发布门，用了四天。')},['repository']),
  'timeline-diagram',
  add('timeline-body','paragraph',{text:t('Dates come from the roadmap and verification records. Each step kept the earlier evidence instead of replacing it. Chinese text in these records was measured in 苹方 (PingFang SC) and 宋体 (Songti SC).','日期取自路线图与验证记录。每一步都保留之前的证据，而不是替换它。这些记录中的中文是在苹方（PingFang SC）和宋体（Songti SC）中测量的。')},['repository']),
  add('timeline-source','citation',{sourceId:'repository',text:t('ROADMAP.md and docs/en/verification.md','ROADMAP.md 与 docs/en/verification.md')},['repository'])
 ],{role:'process',contentStatus:'sourced'});
 // 4 · Bold closing: one action.
 scene('cc-closing',[
  add('closing-title','heading',{text:t('Review the weakest page first.','先审最弱的一页。')},['requirements']),
  add('closing-steps','list',{items:[t('Open the contact sheet at 390 px.','打开 390 px 的整稿对照表。'),t('Find the page you would least like to present.','找出你最不想讲的那一页。'),t('Fix it, measure again, then export.','修好它，重新测量，再导出。')]},['requirements']),
  add('closing-ask','callout',{text:t('One action: name the weakest page in the review record.','唯一行动：在审阅记录中写明最弱的一页。')},['requirements']),
  add('closing-body','paragraph',{text:t('A release gate approves the whole story. A hero screenshot proves nothing about page nine.','发布门批准的是整个故事。主视觉截图证明不了第九页。')},['requirements'])
 ],{role:'closing',contentStatus:'sourced'});
 // 5 · Photography split: there is no photograph in this repository; the generated image is labelled as such.
 scene('ev-photo',[
  add('photo-title','heading',{text:t('Generated imagery\nis labelled as such.','生成的图像，\n就标明是生成的。')},['cosmos-file']),
  add('photo-body','paragraph',{text:t('This starfield is original AI-generated artwork, not astrophotography. Its provenance file travels with it, and the caption says so in every theme.','这片星空是原创的 AI 生成作品，不是天文摄影。它的来源记录随文件保存，每个主题中的图注都会说明。')},['cosmos-file']),
  add('photo-image','image',{assetId:assets.cosmos.id,alt:t(assets.cosmos.alt,'生成的星空：右侧是密集的蓝白色星团，左侧是近乎全黑的太空'),factual:false},['cosmos-file']),
  add('photo-caption','citation',{sourceId:'cosmos-file',text:t('Original AI-generated backdrop, 2026-10-17 · not a photograph','原创 AI 生成背景，2026-10-17 · 并非照片')},['cosmos-file'])
 ],{role:'context',contentStatus:'illustrative',crops:[{blockId:'photo-image',x:.46,y:0,width:.5,height:1}]});
 // 6 · Full-violet chapter.
 scene('ev-chapter',[
  add('chapter-title','heading',{text:t('Chapter 2\nEvidence that survives translation','第二章\n经得起翻译的证据')},['requirements']),
  add('chapter-body','paragraph',{text:t('The next six pages keep their numbers, units and sources when the language or the theme changes.','接下来的六页在切换语言或主题时，数字、单位与来源保持不变。')},['requirements'])
 ],{role:'context',colorMode:'chapter',contentStatus:'illustrative'});
 // 7 · Annotated case: image hotspots on the generated storyboard artwork.
 const notes=[
  add('case-note-card','annotation',{text:t('Card three is the evidence page. Its chart states the unit without hover.','第三张卡是证据页，图表在不悬停时也写明单位。'),target:{blockId:'case-image'}},['workbench-file']),
  add('case-note-thread','annotation',{text:t('The thread is the argument. A page that breaks it is the weakest page, however beautiful.','这根线就是论证。打断它的那一页就是最弱的一页，无论它多好看。'),target:{blockId:'case-image'}},['workbench-file']),
  add('case-note-stack','annotation',{text:t('The unused stack: headings are measured after fonts load in 苹方 or 宋体, never guessed.','未用的那一摞：标题在苹方或宋体加载后测量，绝不估算。'),target:{blockId:'case-image'}},['workbench-file'])];
 scene('ev-case',[
  add('case-title','heading',{text:t('An annotated case:\nthe paper-card storyboard','带注释的案例：\n纸卡故事板')},['workbench-file']),
  add('case-body','paragraph',{text:t('Each card is one page; the thread is the argument. Open a marker to read what a reviewer checks there.','每张卡片代表一页，线代表论证。打开标记，查看审阅者在那里检查什么。')},['workbench-file']),
  add('case-image','image',{assetId:assets.workbench.id,alt:t(assets.workbench.alt,'木质工作台上用蓝线连起来的空白纸卡'),factual:false},['workbench-file']),
  ...notes,
  add('case-source','citation',{sourceId:'workbench-file',text:t('Generated decorative artwork · not documentary evidence','生成的装饰插画 · 并非纪实证据')},['workbench-file'])
 ],{role:'context',contentStatus:'illustrative',
  interactions:[{id:'case-spots',kind:'image-hotspots',blockId:'case-image',hotspots:[{id:'card',x:.6,y:.58,annotationId:notes[0]},{id:'thread',x:.66,y:.33,annotationId:notes[1]},{id:'stack',x:.13,y:.62,annotationId:notes[2]}]}],
  cues:[{id:'reveal-card',event:'annotation.reveal',interactionId:'case-spots',hotspotId:'card',label:t('Open the evidence card','打开证据卡')},{id:'reveal-thread',event:'annotation.reveal',interactionId:'case-spots',hotspotId:'thread',label:t('Open the thread','打开那根线')}],
  motion:{policy:'subtle',durationMs:240}});
 // 8 · Chart and image: a grouped bar with a declared category focus beside the synthetic test card.
 scene('ev-evidence',[
  add('unit-title','heading',{text:t('Readers find the unit faster\nwhen it sits on the bar.','单位直接标在条形上，\n读者找得更快。')}),
  add('unit-chart','chart',{datasetId:data('unit-search',{unit:t('seconds','秒'),categories:t(['Unit on the bar','Unit in the legend','Unit in a footnote'],['单位在条形上','单位在图例中','单位在脚注中']),categoryIds:['on-bar','legend','footnote'],
   series:[{id:'en-readers',label:t('English readers','英文读者'),values:[2.1,4.8,7.9]},{id:'zh-readers',label:t('Chinese readers','中文读者'),values:[2.3,5.2,8.6]}],
   definition:{sample:t('n = 24 synthetic readers per language','每种语言 24 名合成读者'),normalized:false,betterDirection:'lower'}}),chartType:'grouped-bar',axis:{policy:'zero'},focus:{categoryIds:['on-bar']},
   question:t('How long does it take to find the unit?','找到单位需要多久？'),takeaway:t('A unit on the bar is found in about 2 seconds in both languages (synthetic).','两种语言中，标在条形上的单位约 2 秒即可找到（合成数据）。')}),
  add('unit-image','image',{assetId:assets.subject.id,alt:t(assets.subject.alt,'合成测试卡：浅色背景上，海军蓝边框中的琥珀色矩形'),factual:false},['subject-file']),
  add('unit-body','paragraph',{text:t('Each reader saw the same synthetic test card with one chart. Numbers are illustrative; no study was run.','每位读者看到同一张合成测试卡和一张图表。数字仅作示意，并未进行研究。')}),
  add('unit-source','citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')}),
  add('unit-image-source','citation',{sourceId:'subject-file',text:t('Code-drawn test card · not a photograph','代码绘制的测试卡 · 并非照片')},['subject-file'])
 ],{role:'evidence',contentStatus:'illustrative'});
 // 9 · Multi-series time plot: three viewports over time in China Standard Time, one value not collected.
 scene('dd-trend',[
  add('trend-title','heading',{text:t('First paint drops once fonts are cached.','字体缓存后，首次绘制时间下降。')}),
  add('trend-chart','chart',{datasetId:data('first-paint',{unit:'ms',categoryKind:'datetime',timeZone:'Asia/Shanghai',
   categories:['2026-10-19T01:00:00Z','2026-10-19T02:00:00Z','2026-10-19T03:00:00Z','2026-10-19T04:00:00Z','2026-10-19T05:00:00Z','2026-10-19T06:00:00Z'],categoryIds:['h09','h10','h11','h12','h13','h14'],
   series:[{id:'w1440',label:'1,440 px',values:[820,640,410,380,372,365]},{id:'w1024',label:'1,024 px',values:[760,600,395,360,351,348]},{id:'w390',label:'390 px',values:[1180,930,null,540,522,515]}],
   missing:[{seriesId:'w390',categoryId:'h11',reason:'not-collected',note:t('The 390 px run at 11:00 was not collected.','11:00 的 390 px 数据未采集。')}],
   definition:{sample:t('n = 30 synthetic loads per point','每个点 30 次合成加载'),normalized:false,betterDirection:'lower'}}),chartType:'line',labels:'end',axis:{policy:'zero'},
   question:t('How fast is the first paint at each width?','各宽度下首次绘制有多快？'),takeaway:t('All three widths settle below 600 ms after 12:00 (synthetic).','12:00 之后三种宽度都稳定在 600 ms 以下（合成数据）。')}),
  add('trend-rail','callout',{text:t('Times are China Standard Time (Asia/Shanghai, UTC+8). 毫秒 = ms.','时间为中国标准时间（Asia/Shanghai，UTC+8）。ms = 毫秒。')}),
  add('trend-body','paragraph',{text:t('The gap is a missing measurement, drawn as a gap and named in the notes; it is never filled in.','空缺是一次缺失的测量：画成空缺并在注释中写明，绝不补值。')}),
  add('trend-source','citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')})
 ],{role:'evidence',contentStatus:'illustrative'});
 // 10 · Ranked comparison with a declared category focus.
 scene('dd-ranked',[
  add('ranked-title','heading',{text:t('Missing glyphs cost the most repair time.','缺字形最耗修复时间。')}),
  add('ranked-chart','chart',{datasetId:data('repair-minutes',{unit:t('minutes','分钟'),categories:t(['Missing glyph','Overlong legend','Clipped title','Missing image','Low contrast','Dead control'],['缺字形','图例过长','标题被裁切','图片缺失','对比度不足','控件失效']),categoryIds:['glyph','legend','title','image','contrast','control'],
   series:[{id:'median',label:t('Median minutes to repair','修复中位时长'),values:[42,27,19,14,9,6]}],definition:{sample:t('n = 120 synthetic repairs','120 次合成修复'),normalized:false,betterDirection:'lower'}}),
   chartType:'ranked-bar',sort:'value-desc',axis:{policy:'zero'},focus:{categoryIds:['glyph']},question:t('Which failure takes longest to repair?','哪类问题修复最久？'),takeaway:t('A missing glyph takes 42 minutes, longest of the six (synthetic).','缺字形需要 42 分钟，是六类中最久的（合成数据）。')}),
  add('ranked-body','paragraph',{text:t('Fonts are the slowest fix because the page must be measured again after the new font loads.','字体问题修得最慢，因为换字体后整页必须重新测量。')}),
  add('ranked-source','citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')})
 ],{role:'evidence',contentStatus:'illustrative'});
 // 11 · Matrix: two categorical dimensions (theme × width) justify a heatmap.
 scene('dd-matrix',[
  add('matrix-title','heading',{text:t('Narrow screens fail more often in every theme.','在每个主题中，窄屏出问题都更多。')}),
  add('matrix-chart','chart',{datasetId:data('fit-failures',{unit:t('per 100 renders','每 100 次渲染'),categories:['1,440 px','1,024 px','390 px'],categoryIds:['w1440','w1024','w390'],
   series:[{id:'cream',label:'Cream Collage',values:[0.4,1.1,3.2]},{id:'dark',label:'Dark Data',values:[0.2,0.9,2.7]},{id:'violet',label:'Electric Violet',values:[0.5,1.4,3.9]}],
   definition:{sample:t('n = 1,000 synthetic renders per cell','每格 1,000 次合成渲染'),normalized:true,denominator:t('100 renders','100 次渲染'),betterDirection:'lower'}}),chartType:'heatmap',axis:{policy:'zero'},
   question:t('Where do text-fit failures cluster?','文字适配失败集中在哪里？'),takeaway:t('390 px has the most failures in all three themes (synthetic).','三个主题中都是 390 px 的失败最多（合成数据）。')}),
  add('matrix-body','paragraph',{text:t('Two categorical dimensions, theme and width, make a matrix the honest form here; a bar chart would hide one of them.','主题与宽度是两个分类维度，因此这里用矩阵才如实；条形图会藏起其中一个。')}),
  add('matrix-source','citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')})
 ],{role:'evidence',contentStatus:'illustrative'});
 // 12 · Explanatory diagram with data-focused interaction: steps on the pipeline, a chart-select on its numbers.
 const explain=(id,label,text)=>{document.explanations.push({id,label,text,sourceIds:['synthetic']});return id;};
 add('pipeline-diagram','diagram',{diagramType:'process',nodes:[{id:'measure',label:t('Measure','测量')},{id:'repair',label:t('Repair','修复')},{id:'review',label:t('Review','审阅')},{id:'export',label:t('Export','导出')}],
  edges:[{id:'p1',from:'measure',to:'repair',label:t('3 pages flagged','3 页被标记')},{id:'p2',from:'repair',to:'review',label:t('1 page left','剩 1 页')},{id:'p3',from:'review',to:'export',label:t('0 pages left','剩 0 页')}]});
 scene('dd-explain',[
  add('pipeline-title','heading',{text:t('Measure, repair, review, export:\nthe numbers at each step.','测量、修复、审阅、导出：\n每一步的数字。')}),
  'pipeline-diagram',
  add('pipeline-chart','chart',{datasetId:data('pipeline-pages',{unit:t('pages','页'),categories:t(['Measure','Repair','Review','Export'],['测量','修复','审阅','导出']),categoryIds:['measure','repair','review','export'],
   series:[{id:'passing',label:t('Pages passing','通过的页数'),values:[9,11,12,12]},{id:'flagged',label:t('Pages flagged','被标记的页数'),values:[3,1,0,0]}],definition:{sample:t('One synthetic 12-page gallery','一份合成的 12 页画廊'),normalized:false,betterDirection:'none'}}),
   chartType:'line',axis:{policy:'zero'},question:t('How many pages pass after each step?','每一步之后有多少页通过？')}),
  add('pipeline-source','citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')})
 ],{role:'process',contentStatus:'illustrative',
  interactions:[{id:'pipeline-steps',kind:'steps',blockId:'pipeline-diagram',steps:[
   {id:'p1',explanationId:explain('why-repair',t('Measure → repair','测量 → 修复'),t('Measurement flags 3 of 12 pages; only those pages are repaired.','测量标记了 12 页中的 3 页，只修复这几页。')),objectId:'p1'},
   {id:'p2',explanationId:explain('why-review',t('Repair → review','修复 → 审阅'),t('After one bounded repair round, 1 page still needs a person to look.','经过一轮有限修复后，仍有 1 页需要人工查看。')),objectId:'p2'},
   {id:'p3',explanationId:explain('why-export',t('Review → export','审阅 → 导出'),t('Export waits until no page is flagged.','直到没有页面被标记才导出。')),objectId:'p3'}]},
   {id:'pipeline-data',kind:'chart-select',blockId:'pipeline-chart'}],
  cues:[{id:'to-review',event:'step.next',interactionId:'pipeline-steps',label:t('Next step','下一步')},{id:'focus-flagged',event:'data.focus',interactionId:'pipeline-data',seriesId:'flagged',label:t('Focus on flagged pages','聚焦被标记的页面')}],
  motion:{policy:'subtle',durationMs:240}});
 return {document,plan};
}

/** The 8-page story: one bilingual document; `theme` picks the plan. Synthetic numbers except the verbatim WCAG quotation. */
export function releaseStory(locale,theme,assets){
 const zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en;
 const document=shell(locale,'vis-014-story-'+locale.toLowerCase(),t('Ship the whole story — an eight-page release review','交付完整的故事——八页发布审阅'),t('Team leads deciding how to review a bilingual deck before release.','决定发布前如何审阅双语演示文稿的团队负责人。'));
 const plan={format:'deckweft-design-plan',version:1,documentId:document.id,scenes:[]};
 document.sources.push(
  {id:'synthetic',title:t('DeckWeft VIS-014 story sample (synthetic numbers, not measured)','DeckWeft VIS-014 故事样例（合成数字，非实测）'),url:'https://example.org/deckweft/vis-014-story'},
  {id:'wcag22',title:'W3C, Web Content Accessibility Guidelines (WCAG) 2.2 — Success Criterion 1.4.3 Contrast (Minimum)',url:'https://www.w3.org/TR/WCAG22/#contrast-minimum'},
  {id:'workbench-file',title:t('DeckWeft local demonstration artwork (workbench.png)','DeckWeft 本地演示插画（workbench.png）'),url:REPO+'/blob/main/public/assets/visual/workbench.png'});
 const add=(id,type,fields,sourceIds=['synthetic'])=>{document.blocks.push({id,type,sourceIds,...fields});return id;};
 const compositions=STORY_COMPOSITIONS[theme];if(!compositions)throw Error('Unknown story theme '+theme);
 const scene=(id,role,blockIds,fields={})=>plan.scenes.push({id,role,theme,themeVersion:'1.0.0',composition:compositions[id],blockIds,focalBlockId:blockIds[0],...(compositions[id]==='violet-chapter'?{colorMode:'chapter'}:{}),...fields});
 const synthetic=id=>add(id,'citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')});
 scene('st-open','opening',[
  add('open-title','heading',{text:t('Ship the whole story,\nnot the hero slide.','交付完整的故事，\n而不只是主视觉页。')}),
  add('open-body','paragraph',{text:t('An eight-page review of one bilingual release: where the hours went, what the gate checks, and the single action that follows.','用八页回顾一次双语发布：时间花在哪里、发布门检查什么，以及随后唯一的行动。')}),
  add('open-kicker','callout',{text:t('A BILINGUAL RELEASE IN EIGHT PAGES','八页讲完一次双语发布')}),
  add('open-metric','metric',{value:8,unit:t('pages','页'),label:t('One release, two languages, every page reviewed','一次发布、两种语言、每页都审阅')}),
  synthetic('open-source')],{contentStatus:'illustrative'});
 scene('st-context','context',[
  add('context-title','heading',{text:t('Most review time goes to pages\nnobody presents first.','大部分审阅时间，\n花在没人先讲的页面上。')}),
  add('context-metric','metric',{value:41,unit:'%',label:t('of review hours went to layout fixes after the cover (synthetic)','的审阅时间花在封面之后的版式修复上（合成数据）')}),
  add('context-body','paragraph',{text:t('The cover is checked first and most often. The evidence and method pages carry the argument and are checked last.','封面最先被检查，也被检查得最多。承载论证的证据页和方法页却最后才被检查。')}),
  synthetic('context-source')],{contentStatus:'illustrative',takeaway:{blockId:'context-metric'}});
 document.datasets.push({id:'review-hours',synthetic:true,sourceIds:['synthetic'],unit:t('hours','小时'),version:'vis-014-story-1',collectedAt:'2026-10-19',
  categories:t(['Cover','Agenda','Evidence','Method','Appendix','Closing'],['封面','议程','证据','方法','附录','结尾']),categoryIds:['cover','agenda','evidence','method','appendix','closing'],
  series:[{id:'hours',label:t('Review hours per page type','每类页面的审阅时长'),values:[1.5,0.5,6.5,4,3.5,1]}],definition:{sample:t('One synthetic 8-page release','一次合成的 8 页发布'),normalized:false,betterDirection:'lower'}});
 scene('st-evidence','evidence',[
  add('evidence-title','heading',{text:t('Evidence pages take four times\nthe review of the cover.','证据页的审阅时间\n是封面的四倍。')}),
  add('evidence-chart','chart',{datasetId:'review-hours',chartType:'ranked-bar',sort:'value-desc',axis:{policy:'zero'},focus:{categoryIds:['evidence']},
   question:t('Which pages take the most review time?','哪些页面最耗审阅时间？'),takeaway:t('Evidence pages take 6.5 hours, the cover 1.5 (synthetic).','证据页需要 6.5 小时，封面只需 1.5 小时（合成数据）。')}),
  add('evidence-takeaway','callout',{text:t('Review the argument pages first; the cover can wait.','先审论证页，封面可以晚一点。')}),
  synthetic('evidence-source')],
  {contentStatus:'illustrative',takeaway:{blockId:'evidence-takeaway'},
   interactions:[{id:'hours-range',kind:'chart-select',blockId:'evidence-chart'}],
   cues:[{id:'argument-pages',event:'data.filter',interactionId:'hours-range',seriesIds:['hours'],fromId:'evidence',toId:'appendix',label:t('Argument pages only (evidence → appendix)','只看论证页（证据 → 附录）')},{id:'all-pages',event:'data.filter',interactionId:'hours-range',seriesIds:['hours'],fromId:'cover',toId:'closing',label:t('All six page types','全部六类页面')}],
   keyStates:[{id:'opening',position:0,label:t('All six page types','全部六类页面')},{id:'argument',position:1,label:t('Argument pages (3 of 6)','论证页（6 类中的 3 类）')}],staticState:{keyStateId:'opening'},
   motion:{policy:'subtle',durationMs:240,trigger:'manual',clock:'cues',reducedMotion:'static'}});
 scene('st-compare','decision',[
  add('compare-title','heading',{text:t('What the gate adds to a review.','发布门给审阅增加了什么。')}),
  add('compare-table','table',{columns:[t('Check','检查项'),t('Before the gate','设门之前'),t('With the gate','设门之后')],rows:[
   [t('Pages reviewed','审阅页数'),t('Cover and two more','封面再加两页'),t('All 8','全部 8 页')],
   [t('Widths','宽度'),'1,440 px','1,440 · 1,024 · 390 px'],
   [t('Languages','语言'),t('English','英文'),t('English + 简体中文','英文 + 简体中文')],
   [t('Weakest page','最弱的一页'),t('Unknown','未知'),t('Named in the review','写在审阅记录中')]]}),
  add('compare-body','paragraph',{text:t('Nothing here is a new tool. The gate changes which pages a person looks at, and when.','这里没有新工具。发布门改变的是人看哪些页面、在什么时候看。')}),
  synthetic('compare-source')],{contentStatus:'illustrative'});
 const explain=(id,label,text)=>{document.explanations.push({id,label,text,sourceIds:['synthetic']});return id;};
 add('process-diagram','diagram',{diagramType:'process',nodes:[{id:'measure',label:t('Measure','测量'),note:t('After fonts and images are ready','字体与图片就绪之后')},{id:'repair',label:t('Repair','修复'),note:t('One affected page at a time','每次只改受影响的一页')},{id:'review',label:t('Review','审阅'),note:t('Every page, weakest named','逐页审阅，写明最弱的一页')},{id:'export',label:t('Export','导出'),note:t('Only a reviewed render','只导出已审阅的渲染')}],
  edges:[{id:'e1',from:'measure',to:'repair'},{id:'e2',from:'repair',to:'review'},{id:'e3',from:'review',to:'export'}]});
 scene('st-process','process',[
  add('process-title','heading',{text:t('Four steps, in this order.','四个步骤，按这个顺序。')}),
  'process-diagram',
  add('process-body','paragraph',{text:t('Step through the arrows: each one says what must be true before the next step starts.','逐一查看箭头：每个箭头都说明进入下一步之前必须满足什么。')}),
  synthetic('process-source')],{contentStatus:'illustrative',
  interactions:[{id:'process-steps',kind:'steps',blockId:'process-diagram',steps:[
   {id:'e1',explanationId:explain('to-repair',t('Measure → repair','测量 → 修复'),t('Repair starts only from a measured failure, never from a guess.','修复只从测量到的失败开始，绝不凭猜测。')),objectId:'e1'},
   {id:'e2',explanationId:explain('to-review',t('Repair → review','修复 → 审阅'),t('A person reviews the whole story, including the page just repaired.','由人审阅整个故事，包括刚修好的那一页。')),objectId:'e2'},
   {id:'e3',explanationId:explain('to-export',t('Review → export','审阅 → 导出'),t('Export uses the reviewed render; a changed page needs a new review.','导出使用已审阅的渲染；改过的页面需要重新审阅。')),objectId:'e3'}]}],
  cues:[{id:'process-next',event:'step.next',interactionId:'process-steps',label:t('Next step','下一步')}],motion:{policy:'subtle',durationMs:240}});
 scene('st-pair','evidence',[
  add('pair-title','heading',{text:t('Same artwork, two framings:\nthe crop is an author choice.','同一幅插画，两种取景：\n裁切是作者的选择。')},['workbench-file']),
  add('pair-before','image',{assetId:assets.workbench.id,alt:t('Baseline framing: the left half of the paper-card workbench artwork','基线取景：纸卡工作台插画的左半部分'),factual:false},['workbench-file']),
  add('pair-after','image',{assetId:assets.workbench.id,alt:t('Changed framing: the evidence card and thread, same artwork','变化后的取景：证据卡与线，同一幅插画'),factual:false},['workbench-file']),
  add('pair-body','paragraph',{text:t('Both panels show the same generated artwork at the same aspect ratio. Only the framing changed; the labels stay visible without interaction.','两个画面是同一幅生成插画，宽高比相同。改变的只有取景；标签无需交互即可看到。')},['workbench-file']),
  add('pair-note','callout',{text:t('Baseline: original framing · After: the evidence card','基线：原始取景 · 变化后：证据卡')},['workbench-file']),
  add('pair-source','citation',{sourceId:'workbench-file',text:t('Generated decorative artwork · not documentary evidence','生成的装饰插画 · 并非纪实证据')},['workbench-file'])],
  {contentStatus:'illustrative',crops:[{blockId:'pair-before',x:0,y:.2,width:.5,height:.75},{blockId:'pair-after',x:.4,y:.25,width:.5,height:.75}],
   interactions:[{id:'pair-compare',kind:'image-compare',blockId:'pair-before',otherBlockId:'pair-after',initialTab:'both'}],
   cues:[{id:'show-after',event:'tab.select',interactionId:'pair-compare',tabId:'second',label:t('Show the changed framing','显示变化后的取景')}],motion:{policy:'subtle',durationMs:240}});
 scene('st-quote','context',[
  add('quote-title','heading',{text:t('The contrast rule is not ours.','对比度规则不是我们定的。')},['wcag22']),
  add('quote-words','quote',{text:WCAG_143},['wcag22']),
  add('quote-attribution','citation',{sourceId:'wcag22',text:'W3C, WCAG 2.2, Success Criterion 1.4.3'},['wcag22']),
  add('quote-paraphrase','paragraph',{text:t('In plain words: body text needs at least 4.5:1 against its background, in every theme.','换句话说：在每个主题中，正文与背景的对比度至少为 4.5:1。')},['wcag22'])],{contentStatus:'sourced'});
 scene('st-close','closing',[
  add('close-title','heading',{text:t('Name the weakest page,\nthen ship.','写明最弱的一页，\n然后发布。')}),
  add('close-steps','list',{items:[t('Review all eight pages at 390 px.','在 390 px 下审阅全部八页。'),t('Write down the weakest page and why.','写下最弱的一页及原因。'),t('Export only the reviewed render.','只导出已审阅的渲染。')]}),
  add('close-ask','callout',{text:t('One action: add the weakest page to this week\'s review.','唯一行动：把最弱的一页加入本周审阅。')}),
  add('close-body','paragraph',{text:t('Everything else in this story is a consequence of that one habit.','这个故事里的其他一切，都源于这一个习惯。')}),
  synthetic('close-source')],{contentStatus:'illustrative'});
 return {document,plan};
}
/** Visual projects with registered assets. `kind` is `gallery` or `story`. */
export async function releaseProject(kind,locale,home,theme='cream-collage'){
 const assets=await releaseAssets(home),{document,plan}=kind==='gallery'?releaseGallery(locale,assets):releaseStory(locale,theme,assets);
 return createVisualProject(document,plan,{assets:Object.values(assets),id:kind==='gallery'?`vis-014-gallery-${locale.toLowerCase()}`:`vis-014-story-${theme}-${locale.toLowerCase()}`});
}
/**
 * The frozen gallery record: per page its §9 task, theme, composition and, per language, a hash of everything a reader is told
 * (blocks, datasets, sources, explanations it uses, interactions and cues). docs/visual-acceptance/gallery-manifest.json
 * must equal this; a content change therefore fails until the manifest is deliberately rewritten.
 */
export function galleryManifest(assets){
 const pages=GALLERY_PAGES.map(p=>({...p,hashes:{}}));
 for(const locale of LOCALES){
  const {document,plan}=releaseGallery(locale,assets);
  for(const page of pages){
   const scene=plan.scenes.find(s=>s.id===page.id),blocks=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)),datasetIds=new Set(blocks.map(b=>b.datasetId).filter(Boolean));
   const sourceIds=new Set([...blocks.flatMap(b=>[...b.sourceIds,...(b.sourceId?[b.sourceId]:[])]),...document.datasets.filter(d=>datasetIds.has(d.id)).flatMap(d=>d.sourceIds)]);
   const explanationIds=new Set((scene.interactions||[]).flatMap(i=>(i.steps||[]).map(s=>s.explanationId)));
   const content={blocks,datasets:document.datasets.filter(d=>datasetIds.has(d.id)),sources:document.sources.filter(s=>sourceIds.has(s.id)),explanations:(document.explanations||[]).filter(e=>explanationIds.has(e.id)),interactions:scene.interactions||[],cues:scene.cues||[],contentStatus:scene.contentStatus};
   page.contentStatus=scene.contentStatus;page.interactions=(scene.interactions||[]).map(i=>i.kind);page.hashes[locale]=createHash('sha256').update(JSON.stringify(content)).digest('hex');
  }
 }
 return {format:'deckweft-vis-014-gallery',version:1,decision:'docs/plans/design-handoff-alignment.md#13-s6-decisions-2026-10-19 (option C: requirements §9 gallery)',frozenAt:'2026-10-19',locales:LOCALES,themes:THEMES,pages};
}
