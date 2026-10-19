import {createVisualProject} from '../src/core/visual-project.mjs';
import {releaseAssets,releaseStory,WCAG_143} from './release-gate.mjs';
/**
 * S8 theme-pack content (alignment §16): the T01–T03 acceptance pages, the VIS-014 story drawn by each new theme and the
 * handoff page-42 storyboard. Everything follows tests/release-gate.mjs: one bilingual document per sample, synthetic numbers
 * that say so in dataset, caption and citation, generated artwork labelled as such, and the WCAG 2.2 text as the only quotation.
 */
export const S8_THEMES=['silver-gray-editorial','fresh-report','orange-launch'];
/** The release story drawn by each S8 theme: its own cover, figure and closing, shared families elsewhere, no two alike. */
export const S8_STORY_COMPOSITIONS={
 'silver-gray-editorial':{'st-open':'fieldnotes-cover','st-context':'metric-right','st-evidence':'fieldnotes-figure','st-compare':'comparison-stack','st-process':'process-stair','st-pair':'before-after-triptych','st-quote':'quote-split','st-close':'fieldnotes-closing'},
 'fresh-report':{'st-open':'atlas-cover','st-context':'metric-band','st-evidence':'atlas-figure','st-compare':'comparison-matrix','st-process':'process-line','st-pair':'before-after-split','st-quote':'quote-band','st-close':'atlas-closing'},
 'orange-launch':{'st-open':'stage-hero','st-context':'stage-metric','st-evidence':'stage-figure','st-compare':'comparison-rail','st-process':'process-rail','st-pair':'before-after-rail','st-quote':'quote-center','st-close':'stage-closing'}
};
/** The handoff page-42 storyboard: twelve content tasks, one document, one composition per theme. `missing` names what the repository lacks. */
export const STORYBOARD_TASKS=[
 {page:1,id:'sb-chapter',task:'Chapter (long bilingual title)',family:'chapter',compositions:{'silver-gray-editorial':'chapter-low','fresh-report':'atlas-section','orange-launch':'stage-chapter'}},
 {page:2,id:'sb-thesis',task:'Thesis + SideNote',family:'statement',compositions:{'silver-gray-editorial':'fieldnotes-thesis','fresh-report':'statement-split','orange-launch':'statement-split'}},
 {page:3,id:'sb-sequence',task:'Sequence',family:'process',compositions:{'silver-gray-editorial':'process-stair','fresh-report':'process-line','orange-launch':'process-rail'}},
 {page:4,id:'sb-comparison',task:'Comparison (units in headers, one missing value)',family:'comparison',compositions:{'silver-gray-editorial':'comparison-stack','fresh-report':'comparison-matrix','orange-launch':'comparison-rail'}},
 {page:5,id:'sb-evidence',task:'EvidenceChart (direct values, source status)',family:'evidence',compositions:{'silver-gray-editorial':'fieldnotes-figure','fresh-report':'atlas-figure','orange-launch':'stage-figure'}},
 {page:6,id:'sb-interval',task:'DotInterval (with method)',family:'evidence',compositions:{'silver-gray-editorial':'fieldnotes-figure','fresh-report':'atlas-figure','orange-launch':'stage-figure'}},
 {page:7,id:'sb-anatomy',task:'ObjectAnatomy (image hotspots)',family:'image',compositions:{'silver-gray-editorial':'image-right','fresh-report':'image-right','orange-launch':'image-right'}},
 {page:8,id:'sb-scenario',task:'ScenarioSnapshot',family:'comparison',compositions:{'silver-gray-editorial':'comparison-rail','fresh-report':'comparison-rail','orange-launch':'comparison-rail'},missing:'ScenarioSnapshot family: drawn as a comparison table (P1 static contrast only)'},
 {page:9,id:'sb-pair',task:'BeforeAfter (registered images, permanent labels)',family:'before-after',compositions:{'silver-gray-editorial':'before-after-split','fresh-report':'before-after-triptych','orange-launch':'before-after-rail'}},
 {page:10,id:'sb-reference',task:'Reference (static appendix)',family:'reference',compositions:{'silver-gray-editorial':'fieldnotes-method','fresh-report':'atlas-appendix','orange-launch':'reading-flow'}},
 {page:11,id:'sb-quote',task:'Quote / Documentary (no invented quotation)',family:'quote',compositions:{'silver-gray-editorial':'quote-split','fresh-report':'quote-band','orange-launch':'quote-center'}},
 {page:12,id:'sb-conclusion',task:'Conclusion (one action)',family:'closing',compositions:{'silver-gray-editorial':'fieldnotes-closing','fresh-report':'atlas-closing','orange-launch':'stage-closing'}}
];
const REPO='https://github.com/FeidaWang/DeckWeft';
const shell=(locale,id,title,audience)=>({format:'deckweft-presentation',schemaVersion:3,id,title,locale,
 visualBrief:{audience,outputLanguage:locale,profile:{colorIntensity:'bold',typographicContrast:'expressive',density:'comfortable',motionIntensity:'subtle',imageEmphasis:'large'}},
 rules:{misreading:'strict'},blocks:[],datasets:[],sources:[],explanations:[],authorOverrides:{lockedBlockIds:[]},migration:{}});
/** One bilingual document with the release-gate helpers. `sourceIds` picks the sources a sample cites. */
function start(locale,id,[titleEn,titleZh],[audienceEn,audienceZh],sourceIds,sample){
 const zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en;
 const document=shell(locale,id+'-'+locale.toLowerCase(),t(titleEn,titleZh),t(audienceEn,audienceZh));
 const plan={format:'deckweft-design-plan',version:1,documentId:document.id,scenes:[]};
 const sources={
  synthetic:{id:'synthetic',title:t(`DeckWeft S8 ${sample} sample (synthetic numbers, not measured)`,`DeckWeft S8 ${sample} 样例（合成数字，非实测）`),url:'https://example.org/deckweft/s8-'+sample},
  wcag22:{id:'wcag22',title:'W3C, Web Content Accessibility Guidelines (WCAG) 2.2 — Success Criterion 1.4.3 Contrast (Minimum)',url:'https://www.w3.org/TR/WCAG22/#contrast-minimum'},
  'cosmos-file':{id:'cosmos-file',title:t('Provenance of the generated starfield (cosmos.provenance.json)','生成星空图的来源记录（cosmos.provenance.json）'),url:REPO+'/blob/main/public/assets/devday/cosmos.provenance.json'},
  'workbench-file':{id:'workbench-file',title:t('DeckWeft local demonstration artwork (workbench.png)','DeckWeft 本地演示插画（workbench.png）'),url:REPO+'/blob/main/public/assets/visual/workbench.png'},
  'subject-file':{id:'subject-file',title:t('DeckWeft code-drawn test card (subject.png)','DeckWeft 代码绘制测试卡（subject.png）'),url:REPO+'/blob/main/public/assets/visual/subject.png'}
 };
 document.sources.push(...sourceIds.map(id=>sources[id]));
 const add=(id,type,fields,sourceIds=['synthetic'])=>{document.blocks.push({id,type,sourceIds,...fields});return id;};
 const data=(id,fields)=>{document.datasets.push({id,synthetic:true,sourceIds:['synthetic'],version:'s8-'+sample+'-1',collectedAt:'2026-10-19',...fields});return id;};
 const synthetic=id=>add(id,'citation',{sourceId:'synthetic',text:t('Synthetic sample · not measured','合成样例 · 非实测')});
 const wcag=id=>add(id,'citation',{sourceId:'wcag22',text:'W3C, WCAG 2.2, Success Criterion 1.4.3'},['wcag22']);
 const scene=(id,role,theme,composition,blockIds,fields={})=>plan.scenes.push({id,role,theme,themeVersion:'1.0.0',composition,blockIds,focalBlockId:blockIds[0],contentStatus:'illustrative',...fields});
 return {t,document,plan,add,data,synthetic,wcag,scene};
}

/** The release story drawn by an S8 theme: releaseStory's document untouched, each scene re-pointed at S8_STORY_COMPOSITIONS. */
export function s8Story(locale,theme,assets){
 const compositions=S8_STORY_COMPOSITIONS[theme];if(!compositions)throw Error('Unknown S8 story theme '+theme);
 const {document,plan}=releaseStory(locale,'dark-data',assets);
 for(const scene of plan.scenes){scene.theme=theme;scene.composition=compositions[scene.id];delete scene.colorMode;}
 return {document,plan};
}

/** T01 Editorial Fieldnotes acceptance pages: cover, two-column thesis, chart evidence, method with margin note, quotation, conclusion. */
export function fieldnotesSample(locale){
 const theme='silver-gray-editorial';
 const {t,document,plan,add,data,synthetic,wcag,scene}=start(locale,'s8-fieldnotes',
  ['Reading a research brief: how long titles, margins and sources survive a translation','阅读一份研究简报：长标题、页边注与来源如何经受翻译'],
  ['Editors reviewing a bilingual brief before it goes to a second reader.','在简报交给第二位读者之前进行双语审校的编辑。'],['synthetic','wcag22'],'fieldnotes');
 // 1 · Cover: kicker, long title, one number, the opening paragraph in the margin column.
 scene('fn-cover','opening',theme,'fieldnotes-cover',[
  add('fn-cover-title','heading',{text:t('Reading a research brief:\nhow long titles, margins and sources survive a translation','阅读一份研究简报：\n长标题、页边注与来源如何经受翻译')}),
  add('fn-cover-body','paragraph',{text:t('Six pages follow one brief through DeckWeft\'s bilingual review: the title is measured after the fonts load, every margin note stays beside the paragraph it annotates, and each number keeps its source in both languages.','六页跟随一份简报走完 DeckWeft 的双语审校：标题在字体加载之后再测量，每条页边注都留在它所注解的段落旁边，每个数字在两种语言里都保留来源。')}),
  add('fn-cover-kicker','callout',{text:t('FIELD NOTES · 01 / A BILINGUAL REVIEW','田野笔记 · 01 / 一次双语审校')}),
  add('fn-cover-metric','metric',{value:6,unit:t('pages','页'),label:t('One brief, two languages, six review pages','一份简报、两种语言、六页审校记录')}),
  synthetic('fn-cover-source')]);
 // 2 · Thesis: main column with the paragraph; the callout and list become margin notes.
 scene('fn-thesis','context',theme,'fieldnotes-thesis',[
  add('fn-thesis-title','heading',{text:t('A translation changes the length of everything except the facts.','翻译会改变每一行文字的长度，唯独改变不了其中的事实。')}),
  add('fn-thesis-body','paragraph',{text:t('An English heading that fits on two lines often needs one line in Chinese, and a Chinese margin note usually runs shorter than the sentence it explains. The review therefore measures each page in both languages instead of trusting the layout of the first.','一个在英文里占两行的标题，到了中文往往只需一行；一条中文页边注通常也比它解释的那句话更短。因此审校会在两种语言里分别测量每一页，而不是沿用第一种语言的版式。')}),
  add('fn-thesis-note','callout',{text:t('Margin note: measure after 苹方 (PingFang SC) or 宋体 (Songti SC) has loaded, never before.','页边注：要在苹方（PingFang SC）或宋体（Songti SC）加载完成之后测量，绝不能在之前。')}),
  add('fn-thesis-list','list',{items:t(['Title: measured at 1,440, 1,024 and 390 px','Margin: stays beside its paragraph','Sources: one link per claim, in both languages'],['标题：在 1,440、1,024 和 390 px 下测量','页边注：留在所属段落旁边','来源：每个论断一个链接，两种语言都有'])}),
  synthetic('fn-thesis-source')]);
 // 3 · Chart evidence: a ranked bar with its question and takeaway; the paragraph and callout read on the left.
 scene('fn-figure','evidence',theme,'fieldnotes-figure',[
  add('fn-figure-title','heading',{text:t('Titles that wrap to a third line\nare where translated briefs lose readers.','标题一旦折到第三行，\n翻译后的简报就开始丢失读者。')}),
  add('fn-figure-chart','chart',{datasetId:data('fn-faults',{unit:t('per 100 pages','每 100 页'),categories:t(['Title wraps to a third line','Margin note moved below the text','Source link truncated','Unit left in the source language','Figure caption clipped'],['标题折到第三行','页边注被挤到正文下方','来源链接被截断','单位仍是原文语言','图注被裁切']),categoryIds:['title','margin','link','unit','caption'],
   series:[{id:'flagged',label:t('Pages flagged by the second reader','第二位读者标记的页面'),values:[34,22,15,11,6]}],definition:{sample:t('n = 200 synthetic translated pages','200 页合成译文'),normalized:true,denominator:t('100 translated pages','100 页译文'),betterDirection:'lower'}}),
   chartType:'ranked-bar',sort:'value-desc',axis:{policy:'zero'},focus:{categoryIds:['title']},question:t('Which translation faults does the second reader flag most?','第二位读者最常标记哪类翻译问题？'),takeaway:t('A title on a third line is flagged on 34 of 100 pages (synthetic).','每 100 页中有 34 页因标题折到第三行而被标记（合成数据）。')}),
  add('fn-figure-body','paragraph',{text:t('The chart reads left to right in both languages; the unit sits on the axis, not in a footnote.','图表在两种语言中都从左向右阅读；单位标在坐标轴上，而不是脚注里。')}),
  add('fn-figure-note','callout',{text:t('Fix the title first; the other four faults follow from the space it takes.','先修标题；其余四类问题都源于它占去的空间。')}),
  synthetic('fn-figure-source')],{takeaway:{blockId:'fn-figure-note'}});
 // 4 · Method: paragraph and steps in the main column, the callout as the margin note.
 scene('fn-method','process',theme,'fieldnotes-method',[
  add('fn-method-title','heading',{text:t('The method: four passes, one language at a time.','方法：四轮审校，每次只看一种语言。')}),
  add('fn-method-body','paragraph',{text:t('Each pass reads the whole brief in one language before the other is opened. A note written in the margin stays with the paragraph it belongs to, so the second reader sees the same page the first one saw.','每一轮都先用一种语言读完整份简报，再打开另一种。写在页边的注释始终跟着它所属的段落，这样第二位读者看到的页面和第一位完全相同。')}),
  add('fn-method-steps','list',{items:t(['Measure every title after the fonts load.','Read the English brief end to end; mark the margin.','Read the Chinese brief end to end; compare the marks.','Resolve each mark against its source, then export.'],['字体加载后测量每一个标题。','通读英文简报，在页边做标记。','通读中文简报，对照两份标记。','逐条核对来源后再导出。'])}),
  add('fn-method-note','callout',{text:t('Margin note: a mark without a source is a question, not a correction.','页边注：没有来源的标记只是一个疑问，不是一处修改。')}),
  synthetic('fn-method-source')]);
 // 5 · Quotation: the verbatim WCAG text on the right, the paraphrase on the left.
 scene('fn-quote','context',theme,'quote-split',[
  add('fn-quote-title','heading',{text:t('Margins may change; the contrast rule does not.','页边可以变，对比度规则不能变。')},['wcag22']),
  add('fn-quote-paraphrase','paragraph',{text:t('In plain words: on warm paper as on white, body text keeps at least 4.5:1 against its background.','换句话说：无论在米色纸面还是白底上，正文与背景的对比度都至少要达到 4.5:1。')},['wcag22']),
  add('fn-quote-words','quote',{text:WCAG_143},['wcag22']),
  wcag('fn-quote-attribution')],{contentStatus:'sourced'});
 // 6 · Conclusion: steps and the ask.
 scene('fn-close','closing',theme,'fieldnotes-closing',[
  add('fn-close-title','heading',{text:t('Send the brief with its margins,\nnot without them.','把页边注连同简报一起交出去，\n而不是把它们删掉。')}),
  add('fn-close-steps','list',{items:t(['Measure both languages at 390 px.','Keep every margin note beside its paragraph.','Export only after the second reader signs the margin.'],['在 390 px 下测量两种语言。','让每条页边注留在所属段落旁边。','第二位读者在页边签字之后再导出。'])}),
  add('fn-close-ask','callout',{text:t('One action: send the second reader the measured pages, not the draft.','唯一行动：把测量过的页面交给第二位读者，而不是草稿。')}),
  add('fn-close-body','paragraph',{text:t('Everything in these six pages exists to make that handover safe.','这六页的全部内容，都是为了让这次交接可靠。')}),
  synthetic('fn-close-source')]);
 return {document,plan};
}

/** T02 Research Atlas acceptance pages: single-chart conclusion, metric table, four panels, method flow, uncertain conclusion, appendix. */
export function atlasSample(locale){
 const theme='fresh-report';
 const {t,document,plan,add,data,synthetic,wcag,scene}=start(locale,'s8-atlas',
  ['What a release gate measures: synthetic numbers for three widths and two languages','发布门衡量什么：三种宽度、两种语言的合成数字'],
  ['Reviewers reading the gate report as a numbered atlas rather than a slide deck.','把发布门报告当作带编号的图集而不是幻灯片来读的审阅者。'],['synthetic','wcag22'],'atlas');
 const runs=t(['Run 1','Run 2','Run 3','Run 4','Run 5','Run 6'],['第 1 次','第 2 次','第 3 次','第 4 次','第 5 次','第 6 次']),runIds=['r1','r2','r3','r4','r5','r6'];
 // 1 · Single-chart conclusion: a line with end labels and the sentence it supports.
 scene('at-figure','evidence',theme,'atlas-figure',[
  add('at-figure-title','heading',{text:t('First paint settles below 600 ms by the fourth gate run at every width and in both languages.','到第四次发布门运行时，每种宽度、两种语言的首次绘制都稳定在 600 ms 以下。')}),
  add('at-figure-chart','chart',{datasetId:data('at-first-paint',{unit:'ms',categories:runs,categoryIds:runIds,
   series:[{id:'w1440',label:'1,440 px',values:[810,650,520,430,410,402]},{id:'w1024',label:'1,024 px',values:[770,615,498,415,398,390]},{id:'w390',label:'390 px',values:[1160,920,705,560,540,531]}],
   definition:{sample:t('n = 30 synthetic loads per point, both languages pooled','每个点 30 次合成加载，两种语言合并'),normalized:false,betterDirection:'lower'}}),chartType:'line',labels:'end',axis:{policy:'zero'},
   question:t('How fast is the first paint at each width?','各宽度下首次绘制有多快？'),takeaway:t('All three widths are below 600 ms from run 4 on (synthetic).','从第 4 次起三种宽度都低于 600 ms（合成数据）。')}),
  add('at-figure-note','callout',{text:t('Takeaway: the narrow width improves most and is still the slowest.','要点：窄屏改善最大，但仍然最慢。')}),
  synthetic('at-figure-source')],{takeaway:{blockId:'at-figure-note'}});
 // 2 · Multi-metric table: units in the headers, one value not collected and shown as missing.
 scene('at-table','decision',theme,'comparison-matrix',[
  add('at-table-title','heading',{text:t('Three measures per width and language, one of them not collected.','每种宽度与语言各三项指标，其中一项未采集。')}),
  add('at-table-grid','table',{columns:[t('Width · language','宽度 · 语言'),t('First paint (ms)','首次绘制（ms）'),t('Fit failures (per 100 renders)','适配失败（每 100 次渲染）'),t('Review time (min)','审阅时长（分钟）')],rows:[
   [t('1,440 px · English','1,440 px · 英文'),'402','0.4','38'],[t('1,440 px · 简体中文','1,440 px · 简体中文'),'409','0.6','44'],
   [t('1,024 px · English','1,024 px · 英文'),'390','1.1','41'],[t('1,024 px · 简体中文','1,024 px · 简体中文'),'396','1.3','47'],
   [t('390 px · English','390 px · 英文'),'531','3.2',t('Missing','缺失')],[t('390 px · 简体中文','390 px · 简体中文'),'538','3.6','63']]}),
  add('at-table-body','paragraph',{text:t('The missing cell is a review that was not timed; it stays empty instead of being averaged in.','空缺的那一格是一次没有计时的审阅：它保持空白，而不是被均值填平。')}),
  synthetic('at-table-source')]);
 // 3 · Four panels on one fixed 0–100 scale: the same four faults at two widths and two languages.
 const faults=t(['Long title','Overlong legend','Missing glyph','Missing image'],['长标题','图例过长','缺字形','图片缺失']),faultIds=['title','legend','glyph','image'];
 const panel=(id,label,values)=>add('at-panel-'+id,'chart',{datasetId:data('at-fit-'+id,{unit:t('per 100 renders','每 100 次渲染'),categories:faults,categoryIds:faultIds,series:[{id:'failures',label,values}],
  definition:{sample:t('n = 1,000 synthetic renders per fault','每类问题 1,000 次合成渲染'),normalized:true,denominator:t('100 renders','100 次渲染'),betterDirection:'lower'}}),
  chartType:'ranked-bar',axis:{policy:'fixed',min:0,max:100},question:t('Which fault fails most often here?','这里哪类问题最常失败？')});
 scene('at-panels','evidence',theme,'atlas-panels',[
  add('at-panels-title','heading',{text:t('Four panels, one scale: fit failures by fault at two widths and two languages.','四个面板、同一刻度：两种宽度、两种语言下按问题类型统计的适配失败。')}),
  panel('1440-en',t('1,440 px · English','1,440 px · 英文'),[12,8,3,5]),panel('1440-zh',t('1,440 px · 简体中文','1,440 px · 简体中文'),[9,11,14,5]),
  panel('390-en',t('390 px · English','390 px · 英文'),[41,27,6,18]),panel('390-zh',t('390 px · 简体中文','390 px · 简体中文'),[36,33,29,18]),
  add('at-panels-note','callout',{text:t('Read across, not within: the same four faults on the same 0–100 scale.','横向对比而不是只看单个面板：同样四类问题，同样的 0–100 刻度。')}),
  synthetic('at-panels-source')]);
 // 4 · Method flow: four steps in a line.
 add('at-flow-diagram','diagram',{diagramType:'process',nodes:[
  {id:'measure',label:t('Measure','测量'),note:t('Three widths, two languages, fonts loaded','三种宽度、两种语言，字体已加载')},{id:'repair',label:t('Repair','修复'),note:t('Only the flagged pages','只改被标记的页面')},
  {id:'review',label:t('Review','审阅'),note:t('Every page, the weakest named','逐页审阅，写明最弱的一页')},{id:'export',label:t('Export','导出'),note:t('The reviewed render only','只导出已审阅的渲染')}],
  edges:[{id:'f1',from:'measure',to:'repair'},{id:'f2',from:'repair',to:'review'},{id:'f3',from:'review',to:'export'}]});
 scene('at-flow','process',theme,'process-line',[
  add('at-flow-title','heading',{text:t('How a gate run proceeds.','一次发布门运行的流程。')}),'at-flow-diagram',
  add('at-flow-body','paragraph',{text:t('Each step hands the next one a record, not an impression: measured values, a list of repaired pages, a signed review.','每一步交给下一步的是记录而不是印象：测得的数值、修复过的页面清单、签过字的审阅。')}),
  synthetic('at-flow-source')]);
 // 5 · Uncertain conclusion: dots with 95% intervals that overlap.
 scene('at-interval','evidence',theme,'atlas-figure',[
  add('at-interval-title','heading',{text:t('Review time per page type, with 95% confidence intervals that overlap.','每类页面的审阅时长，以及彼此重叠的 95% 置信区间。')}),
  add('at-interval-chart','chart',{datasetId:data('at-review-minutes',{unit:t('minutes','分钟'),categories:t(['Cover','Evidence','Method','Appendix'],['封面','证据','方法','附录']),categoryIds:['cover','evidence','method','appendix'],series:[
   {id:'en',label:t('English pages','英文页面'),values:[9,38,27,21],interval:{type:'ci',level:95,method:t('Synthetic bootstrap, 2,000 resamples','合成自助法，2,000 次重抽样'),lower:[7,31,22,17],upper:[12,46,33,26]}},
   {id:'zh',label:t('Chinese pages','中文页面'),values:[11,44,31,24],interval:{type:'ci',level:95,method:t('Synthetic bootstrap, 2,000 resamples','合成自助法，2,000 次重抽样'),lower:[8,36,25,19],upper:[14,53,38,30]}}],
   definition:{sample:t('n = 40 synthetic reviews per language','每种语言 40 次合成审阅'),normalized:false,betterDirection:'lower'}}),chartType:'dot-interval',axis:{policy:'zero'},focus:{categoryIds:['evidence']},
   question:t('Which page type takes longest to review?','哪类页面审阅最久？'),takeaway:t('Evidence pages take longest in both languages; the two intervals overlap (synthetic).','两种语言中证据页都最耗时；两个区间互有重叠（合成数据）。')}),
  add('at-interval-note','callout',{text:t('Uncertain conclusion: the language gap is smaller than the interval width.','不确定的结论：语言之间的差距小于区间本身的宽度。')}),
  synthetic('at-interval-source')],{takeaway:{blockId:'at-interval-note'}});
 // 6 · Evidence appendix: definitions table, limits, citations.
 scene('at-appendix','closing',theme,'atlas-appendix',[
  add('at-appendix-title','heading',{text:t('Appendix: definitions, sources and limits.','附录：定义、来源与限制。')}),
  add('at-appendix-table','table',{columns:[t('Term','术语'),t('Definition','定义'),t('Source','来源')],rows:[
   [t('First paint','首次绘制'),t('Milliseconds from navigation to the first rendered frame','从导航到首帧渲染的毫秒数'),t('Synthetic gate log','合成发布门日志')],
   [t('Fit failure','适配失败'),t('A page whose text is clipped or overflows at the given width','在给定宽度下文字被裁切或溢出的页面'),t('Synthetic gate log','合成发布门日志')],
   [t('Review time','审阅时长'),t('Minutes from opening a page to signing its review','从打开页面到签署审阅的分钟数'),t('Synthetic timing sheet','合成计时表')],
   [t('Contrast ratio','对比度'),t('Defined by WCAG 2.2, Success Criterion 1.4.3','由 WCAG 2.2 成功标准 1.4.3 定义'),'W3C']]}),
  add('at-appendix-limits','list',{items:t(['Every number in this atlas is synthetic and was not measured.','Widths are three fixed viewports, not device classes.','Review time depends on the reviewer; no study was run.'],['本图集中的每个数字都是合成的，并未实测。','宽度是三个固定视口，不代表设备类别。','审阅时长因人而异；并未进行研究。'])}),
  synthetic('at-appendix-source'),wcag('at-appendix-wcag')]);
 return {document,plan};
}

/** T03 Luminous Stage acceptance pages: hero with image, hero without image, chapter, figure, big number, closing. */
export function stageSample(locale,assets){
 const theme='orange-launch';
 const {t,document,plan,add,data,synthetic,scene}=start(locale,'s8-stage',
  ['DeckWeft v3 web output — a sample launch deck','DeckWeft v3 网页输出——示例发布演示'],
  ['A launch rehearsal audience; every figure is synthetic and no product claim is made.','发布彩排的观众；所有数字均为合成，不构成任何产品承诺。'],['synthetic','cosmos-file'],'stage');
 // 1 · Hero with the generated starfield, cropped to its bright half.
 scene('ls-hero','opening',theme,'stage-hero',[
  add('ls-hero-title','heading',{text:t('One page at a time:\nthe v3 web output on a dark stage','一次只讲一页：\n深色舞台上的 v3 网页输出')},['cosmos-file']),
  add('ls-hero-kicker','callout',{text:t('SAMPLE LAUNCH · SYNTHETIC FIGURES','示例发布 · 合成数字')},['cosmos-file']),
  add('ls-hero-body','paragraph',{text:t('A rehearsal deck for a web export that puts one object on each page. Nothing here is a release promise.','一份用于彩排的演示：网页导出的每一页只放一个对象。这里没有任何发布承诺。')},['cosmos-file']),
  add('ls-hero-image','image',{assetId:assets.cosmos.id,alt:t(assets.cosmos.alt,'生成的星空：右侧是密集的蓝白色星团，左侧是近乎全黑的太空'),factual:false},['cosmos-file']),
  add('ls-hero-source','citation',{sourceId:'cosmos-file',text:t('Original AI-generated backdrop, 2026-10-17 · not a photograph','原创 AI 生成背景，2026-10-17 · 并非照片')},['cosmos-file'])],
  {crops:[{blockId:'ls-hero-image',x:.46,y:0,width:.5,height:1}]});
 // 2 · The media-failure cover: the same composition with no image bound.
 scene('ls-cover-text','context',theme,'stage-hero',[
  add('ls-cover-title','heading',{text:t('When the artwork fails to load, the page still opens with its words.','当插画没有加载出来时，这一页仍然用文字把场开起来。')}),
  add('ls-cover-kicker','callout',{text:t('MEDIA-FAILURE COVER · NO IMAGE BOUND','媒体失败封面 · 未绑定图片')}),
  add('ls-cover-body','paragraph',{text:t('This is the same hero composition with no image bound: the heading, the kicker and one paragraph carry the page alone.','这是同一个主视觉构图，只是没有绑定图片：标题、引题和一段文字独自撑起整页。')}),
  synthetic('ls-cover-source')]);
 // 3 · Chapter.
 scene('ls-chapter','context',theme,'stage-chapter',[
  add('ls-chapter-title','heading',{text:t('Chapter 1\nWhat the export contains','第一章\n导出里有什么')}),
  add('ls-chapter-body','paragraph',{text:t('Three pages follow: a trend, a single number and the ask.','接下来三页：一条趋势、一个数字和一个请求。')}),
  synthetic('ls-chapter-source')]);
 // 4 · Figure: one line, end-labelled.
 scene('ls-figure','evidence',theme,'stage-figure',[
  add('ls-figure-title','heading',{text:t('Pages exported per minute rose across six synthetic builds.','在六次合成构建中，每分钟导出的页数一次比一次多。')}),
  add('ls-figure-chart','chart',{datasetId:data('ls-throughput',{unit:t('pages per minute','页/分钟'),categories:t(['Build 1','Build 2','Build 3','Build 4','Build 5','Build 6'],['构建 1','构建 2','构建 3','构建 4','构建 5','构建 6']),categoryIds:['b1','b2','b3','b4','b5','b6'],
   series:[{id:'throughput',label:t('Pages exported per minute','每分钟导出页数'),values:[18,22,27,31,36,40]}],definition:{sample:t('n = 10 synthetic export runs per build','每次构建 10 次合成导出'),normalized:false,betterDirection:'higher'}}),
   chartType:'line',labels:'end',axis:{policy:'zero'},question:t('How many pages does one minute export?','一分钟能导出多少页？'),takeaway:t('Build 6 exports 40 pages per minute, up from 18 (synthetic).','第 6 次构建每分钟导出 40 页，起点是 18 页（合成数据）。')}),
  synthetic('ls-figure-source')]);
 // 5 · Big number.
 scene('ls-metric','evidence',theme,'stage-metric',[
  add('ls-metric-title','heading',{text:t('One number for the whole stage.','整个舞台只留一个数字。')}),
  add('ls-metric-number','metric',{value:40,unit:t('pages / min','页/分钟'),label:t('Export throughput in the sixth synthetic build','第六次合成构建的导出吞吐量')}),
  add('ls-metric-body','paragraph',{text:t('The number is synthetic. It is here to show how a single metric is set on a dark surface.','这个数字是合成的，放在这里是为了展示单个指标在深色表面上如何排布。')}),
  synthetic('ls-metric-source')],{takeaway:{blockId:'ls-metric-number'}});
 // 6 · Closing.
 scene('ls-close','closing',theme,'stage-closing',[
  add('ls-close-title','heading',{text:t('Rehearse the whole deck, then launch.','把整套演示排练一遍，再发布。')}),
  add('ls-close-steps','list',{items:t(['Open every page at 390 px on the dark surface.','Check the media-failure cover without its image.','Export the reviewed render and run it offline.'],['在深色表面上以 390 px 打开每一页。','检查没有图片时的媒体失败封面。','导出已审阅的渲染并离线运行。'])}),
  add('ls-close-ask','callout',{text:t('One action: rehearse page two with the image removed.','唯一行动：把图片移除后排练第二页。')}),
  synthetic('ls-close-source')]);
 return {document,plan};
}

/** The handoff page-42 storyboard: one document per locale, twelve pages, the plan per theme from STORYBOARD_TASKS. */
export function storyboard(locale,theme,assets){
 if(!S8_THEMES.includes(theme))throw Error('Unknown S8 storyboard theme '+theme);
 const {t,document,plan,add,data,synthetic,wcag,scene:raw}=start(locale,'s8-storyboard',
  ['Turning source material into an evidenced visual story','把原始材料变成有据可查的视觉故事'],
  ['Reviewers running the same twelve pages in three themes and expecting identical facts.','在三个主题中运行同样十二页、并期望事实完全一致的审阅者。'],['synthetic','wcag22','workbench-file','subject-file'],'storyboard');
 const scene=(id,role,blockIds,fields={})=>raw(id,role,theme,STORYBOARD_TASKS.find(p=>p.id===id).compositions[theme],blockIds,fields);
 const explain=(id,label,text)=>{document.explanations.push({id,label,text,sourceIds:['synthetic']});return id;};
 // 01 · Chapter: the long bilingual title, an intro, a kicker and the contents.
 scene('sb-chapter','opening',[
  add('sb-chapter-title','heading',{text:t('Part one: turning source material into an evidenced visual story, in two languages and three themes','第一部分：用两种语言、三个主题，把原始材料变成有据可查的视觉故事')}),
  add('sb-chapter-body','paragraph',{text:t('Twelve pages take one body of source material through the steps a reviewer checks: the claim, the sequence, the comparison, the evidence and the sources that stay attached to all of them.','十二页带着同一批原始材料走过审阅者要核对的每一步：论断、流程、比较、证据，以及始终附着在它们之上的来源。')}),
  add('sb-chapter-kicker','callout',{text:t('01 / FROM SOURCE TO STORY','01 / 从材料到故事')}),
  add('sb-chapter-contents','list',{items:t(['Thesis and side note','Sequence and comparison','Evidence, intervals and anatomy','Scenarios, before/after and references','Quotation and conclusion'],['观点与旁注','流程与比较','证据、区间与结构','情景、前后对比与参考','引语与结论'])}),
  synthetic('sb-chapter-source')]);
 // 02 · Thesis with a side note.
 scene('sb-thesis','context',[
  add('sb-thesis-title','heading',{text:t('Every page states one claim; the side note says where it came from.','每一页只讲一个论断，页边的旁注说明这个论断从哪里来。')}),
  add('sb-thesis-body','paragraph',{text:t('A claim without its source is an opinion in a nice typeface. The storyboard keeps the source beside the claim on every page, so a change of theme or language can move the note but never drop it.','没有来源的论断，只是排得好看的个人看法。故事板在每一页都把来源放在论断旁边，因此切换主题或语言可以移动旁注，却不能丢掉它。')}),
  add('sb-thesis-note','callout',{text:t('Side note: the source of this page is a synthetic sample; the page says so in its citation.','旁注：本页的来源是合成样例，页面的引注里写明了这一点。')}),
  synthetic('sb-thesis-source')]);
 // 03 · Sequence: four steps with notes and a step interaction.
 add('sb-sequence-diagram','diagram',{diagramType:'process',nodes:[
  {id:'collect',label:t('Collect','收集'),note:t('Every source with a link or a snapshot','每个来源都有链接或快照')},{id:'verify',label:t('Verify','核对'),note:t('Each number against its source','逐个数字核对来源')},
  {id:'compose',label:t('Compose','编排'),note:t('One claim per page, source attached','每页一个论断，附上来源')},{id:'review',label:t('Review','审阅'),note:t('Both languages, every theme','两种语言，每个主题')}],
  edges:[{id:'s1',from:'collect',to:'verify'},{id:'s2',from:'verify',to:'compose'},{id:'s3',from:'compose',to:'review'}]});
 scene('sb-sequence','process',[
  add('sb-sequence-title','heading',{text:t('From source to story in four steps.','从材料到故事的四个步骤。')}),'sb-sequence-diagram',
  add('sb-sequence-body','paragraph',{text:t('Each arrow names what must be true before the next step starts; nothing is composed before it is verified.','每个箭头都写明进入下一步之前必须满足的条件；任何内容在核对之前都不会被编排。')}),
  synthetic('sb-sequence-source')],{
  interactions:[{id:'sb-steps',kind:'steps',blockId:'sb-sequence-diagram',steps:[
   {id:'s1',explanationId:explain('sb-why-verify',t('Collect → verify','收集 → 核对'),t('A collected source is checked before any number from it is used.','收集到的来源在其中任何数字被使用之前先经过核对。')),objectId:'s1'},
   {id:'s2',explanationId:explain('sb-why-compose',t('Verify → compose','核对 → 编排'),t('Only verified facts reach a page, each with its citation.','只有核对过的事实才会进入页面，并各自带着引注。')),objectId:'s2'},
   {id:'s3',explanationId:explain('sb-why-review',t('Compose → review','编排 → 审阅'),t('The review reads every page in both languages and all three themes.','审阅会在两种语言、三个主题中读完每一页。')),objectId:'s3'}]}],
  cues:[{id:'sb-next-step',event:'step.next',interactionId:'sb-steps',label:t('Next step','下一步')}],motion:{policy:'subtle',durationMs:240}});
 // 04 · Comparison: units in the headers, one missing value.
 scene('sb-comparison','decision',[
  add('sb-comparison-title','heading',{text:t('Three ways to keep a source, compared on the same units.','保存来源的三种方式，用同样的单位比较。')}),
  add('sb-comparison-table','table',{columns:[t('Method','方式'),t('Time to verify (min)','核对耗时（分钟）'),t('Facts lost per 100','每 100 条事实的丢失数'),t('Storage (KB per page)','存储（KB/页）')],rows:[
   [t('Link only','只留链接'),'4','12','2'],[t('Link + snapshot','链接 + 快照'),'2','3','48'],[t('Snapshot only','只留快照'),'3','5',t('Missing','缺失')]]}),
  add('sb-comparison-body','paragraph',{text:t('The missing storage figure was not collected for the snapshot-only run; the cell says so rather than showing a zero.','只留快照的那次运行没有采集存储数据；这一格如实标明，而不是显示为零。')}),
  synthetic('sb-comparison-source')]);
 // 05 · Evidence chart: direct values, a category focus, the source status in the citation.
 scene('sb-evidence','evidence',[
  add('sb-evidence-title','heading',{text:t('Keeping a snapshot beside the link cuts the facts lost in review by three quarters.','在链接旁保留一份快照，能把审阅中丢失的事实减少四分之三。')}),
  add('sb-evidence-chart','chart',{datasetId:data('sb-facts-lost',{unit:t('per 100 facts','每 100 条事实'),categories:t(['Link only','Snapshot only','Link + snapshot'],['只留链接','只留快照','链接 + 快照']),categoryIds:['link','snapshot','both'],
   series:[{id:'lost',label:t('Facts lost in review','审阅中丢失的事实'),values:[12,5,3]}],definition:{sample:t('n = 600 synthetic facts per method','每种方式 600 条合成事实'),normalized:true,denominator:t('100 facts','100 条事实'),betterDirection:'lower'}}),
   chartType:'ranked-bar',sort:'value-desc',axis:{policy:'zero'},focus:{categoryIds:['both']},question:t('Which way of keeping a source loses the fewest facts?','哪种保存来源的方式丢失的事实最少？'),takeaway:t('Link + snapshot loses 3 facts per 100, link only 12 (synthetic).','链接加快照每 100 条丢失 3 条，只留链接丢失 12 条（合成数据）。')}),
  add('sb-evidence-note','callout',{text:t('Values are printed on the bars; the source status is in the citation below.','数值直接标在条形上；来源状态写在下方的引注里。')}),
  synthetic('sb-evidence-source')],{takeaway:{blockId:'sb-evidence-note'}});
 // 06 · Dot and interval with its method.
 scene('sb-interval','evidence',[
  add('sb-interval-title','heading',{text:t('Verification time with 95% intervals: the three methods overlap more than they differ.','核对耗时及其 95% 置信区间：三种方式的重叠多于差异。')}),
  add('sb-interval-chart','chart',{datasetId:data('sb-verify-minutes',{unit:t('minutes','分钟'),categories:t(['Link only','Snapshot only','Link + snapshot'],['只留链接','只留快照','链接 + 快照']),categoryIds:['link','snapshot','both'],series:[
   {id:'novice',label:t('New reviewers','新手审阅者'),values:[6.5,4.8,3.9],interval:{type:'ci',level:95,method:t('Synthetic bootstrap, 2,000 resamples','合成自助法，2,000 次重抽样'),lower:[5.1,3.7,2.9],upper:[8.2,6.1,5.0]}},
   {id:'expert',label:t('Experienced reviewers','熟练审阅者'),values:[4.1,3.2,2.4],interval:{type:'ci',level:95,method:t('Synthetic bootstrap, 2,000 resamples','合成自助法，2,000 次重抽样'),lower:[3.2,2.5,1.8],upper:[5.3,4.1,3.2]}}],
   definition:{sample:t('n = 60 synthetic reviewers','60 名合成审阅者'),normalized:false,betterDirection:'lower'}}),chartType:'dot-interval',axis:{policy:'zero'},focus:{categoryIds:['both']},
   question:t('How long does verification take with each method?','每种方式核对一条事实需要多久？'),takeaway:t('Link + snapshot is fastest for both groups; the intervals overlap with snapshot only (synthetic).','链接加快照对两组人都最快；它与只留快照的区间有重叠（合成数据）。')}),
  add('sb-interval-note','callout',{text:t('Method: synthetic bootstrap, 2,000 resamples; no study was run.','方法：合成自助法，2,000 次重抽样；并未进行研究。')}),
  synthetic('sb-interval-source')]);
 // 07 · Object anatomy: hotspots on the workbench artwork, as release-gate page 7.
 const notes=[
  add('sb-anatomy-note-card','annotation',{text:t('The card is the claim: one sentence, its number and its unit, readable without hover.','卡片就是论断：一句话、它的数字和单位，不悬停也能读。'),target:{blockId:'sb-anatomy-image'}},['workbench-file']),
  add('sb-anatomy-note-thread','annotation',{text:t('The thread is the source link. Cut it and the card becomes an opinion.','这根线就是来源链接。剪断它，卡片就只剩个人看法。'),target:{blockId:'sb-anatomy-image'}},['workbench-file']),
  add('sb-anatomy-note-stack','annotation',{text:t('The stack is material that was collected but never verified; it stays off the page.','那一摞是收集了却从未核对的材料，它不会进入页面。'),target:{blockId:'sb-anatomy-image'}},['workbench-file'])];
 scene('sb-anatomy','context',[
  add('sb-anatomy-title','heading',{text:t('The anatomy of an evidenced page:\ncard, thread and the unused stack','有据可查的一页由什么构成：\n卡片、线和没用上的那一摞')},['workbench-file']),
  add('sb-anatomy-body','paragraph',{text:t('Open a marker to read what each part of the artwork stands for. The image is generated artwork, not a photograph of a real desk.','打开标记，查看插画的每个部分代表什么。这张图是生成的插画，不是真实书桌的照片。')},['workbench-file']),
  add('sb-anatomy-image','image',{assetId:assets.workbench.id,alt:t(assets.workbench.alt,'木质工作台上用蓝线连起来的空白纸卡'),factual:false},['workbench-file']),
  ...notes,
  add('sb-anatomy-source','citation',{sourceId:'workbench-file',text:t('Generated decorative artwork · not documentary evidence','生成的装饰插画 · 并非纪实证据')},['workbench-file'])],{
  interactions:[{id:'sb-spots',kind:'image-hotspots',blockId:'sb-anatomy-image',hotspots:[{id:'card',x:.6,y:.58,annotationId:notes[0]},{id:'thread',x:.66,y:.33,annotationId:notes[1]},{id:'stack',x:.13,y:.62,annotationId:notes[2]}]}],
  cues:[{id:'sb-reveal-card',event:'annotation.reveal',interactionId:'sb-spots',hotspotId:'card',label:t('Open the card','打开卡片')},{id:'sb-reveal-thread',event:'annotation.reveal',interactionId:'sb-spots',hotspotId:'thread',label:t('Open the thread','打开那根线')}],
  motion:{policy:'subtle',durationMs:240}});
 // 08 · Scenario snapshot: there is no scenario family; three named scenarios read side by side as a comparison table.
 scene('sb-scenario','decision',[
  add('sb-scenario-title','heading',{text:t('Three scenarios for the same source material, side by side.','同一批原始材料的三种情景，并排呈现。')}),
  add('sb-scenario-table','table',{columns:[t('Scenario','情景'),t('Sources kept','保留的来源数'),t('Pages','页数'),t('Review time (min)','审阅时长（分钟）')],rows:[
   [t('Minimal: links only','最简：只留链接'),'1','6','24'],[t('Standard: links and snapshots','标准：链接加快照'),'3','8','31'],[t('Archival: snapshots, links and notes','归档：快照、链接加笔记'),'5','12','52']]}),
  add('sb-scenario-body','paragraph',{text:t('A static contrast only: the three scenarios are read side by side, and no control switches between them.','仅为静态对照：三种情景并排阅读，没有在它们之间切换的控件。')}),
  synthetic('sb-scenario-source')]);
 // 09 · Before / after: the same code-drawn test card twice, identical crops, permanent labels.
 scene('sb-pair','evidence',[
  add('sb-pair-title','heading',{text:t('Before and after: the same test card, the same framing, one colour checked.','前后对比：同一张测试卡、同样的取景，核对一处颜色。')},['subject-file']),
  add('sb-pair-before','image',{assetId:assets.subject.id,alt:t('Baseline: the synthetic test card before the contrast check','基线：对比度核对之前的合成测试卡'),factual:false},['subject-file']),
  add('sb-pair-after','image',{assetId:assets.subject.id,alt:t('After: the same synthetic test card after the contrast check','变化后：对比度核对之后的同一张合成测试卡'),factual:false},['subject-file']),
  add('sb-pair-body','paragraph',{text:t('Both panels show the same code-drawn card at the same aspect ratio; the labels stay visible without interaction.','两个画面是同一张代码绘制的测试卡，宽高比相同；标签无需交互即可看到。')},['subject-file']),
  add('sb-pair-note','callout',{text:t('Baseline: before the check · After: the checked card','基线：核对之前 · 变化后：核对过的卡片')},['subject-file']),
  add('sb-pair-source','citation',{sourceId:'subject-file',text:t('Code-drawn test card · not a photograph','代码绘制的测试卡 · 并非照片')},['subject-file'])],
  {crops:[{blockId:'sb-pair-before',x:.1,y:.1,width:.8,height:.8},{blockId:'sb-pair-after',x:.1,y:.1,width:.8,height:.8}],
   interactions:[{id:'sb-compare',kind:'image-compare',blockId:'sb-pair-before',otherBlockId:'sb-pair-after',initialTab:'both'}],
   cues:[{id:'sb-show-after',event:'tab.select',interactionId:'sb-compare',tabId:'second',label:t('Show the checked card','显示核对过的卡片')}],motion:{policy:'subtle',durationMs:240}});
 // 10 · Reference: sources behind the pages, their limits, the citations.
 scene('sb-reference','context',[
  add('sb-reference-title','heading',{text:t('Reference: the sources behind these pages and their limits.','参考：这些页面背后的来源与它们的限制。')}),
  add('sb-reference-table','table',{columns:[t('Source','来源'),t('What it provides','提供什么'),t('Status','状态')],rows:[
   [t('Synthetic sample','合成样例'),t('All numbers on pages 4–8','第 4–8 页的全部数字'),t('Synthetic, not measured','合成，非实测')],
   ['W3C WCAG 2.2',t('The quoted contrast criterion on page 11','第 11 页引用的对比度标准'),t('Verbatim, sourced','逐字引用，有来源')],
   [t('Workbench and test-card artwork','工作台与测试卡插画'),t('Pages 7 and 9','第 7 页与第 9 页'),t('Generated artwork, not evidence','生成插画，非证据')]]}),
  add('sb-reference-limits','list',{items:t(['No study was run; every number is illustrative.','The artwork shows no real product or desk.','Review times depend on the reviewer and the material.'],['并未进行研究；每个数字都只是示意。','插画不展示任何真实产品或书桌。','审阅时长取决于审阅者和材料本身。'])}),
  synthetic('sb-reference-source'),wcag('sb-reference-wcag'),
  add('sb-reference-art','citation',{sourceId:'workbench-file',text:t('Generated decorative artwork · not documentary evidence','生成的装饰插画 · 并非纪实证据')},['workbench-file'])]);
 // 11 · Quotation: the verbatim WCAG text, attributed, with a paraphrase.
 scene('sb-quote','context',[
  add('sb-quote-title','heading',{text:t('The contrast rule is quoted, not rewritten into a claim of ours.','对比度规则是原文引用，而不是改写成我们自己的论断。')},['wcag22']),
  add('sb-quote-words','quote',{text:WCAG_143},['wcag22']),
  wcag('sb-quote-attribution'),
  add('sb-quote-paraphrase','paragraph',{text:t('In plain words: body text keeps at least 4.5:1 against its background, in every theme and both languages.','换句话说：在每个主题、两种语言中，正文与背景的对比度都至少为 4.5:1。')},['wcag22'])],{contentStatus:'sourced'});
 // 12 · Conclusion: one action.
 scene('sb-conclusion','closing',[
  add('sb-conclusion-title','heading',{text:t('Keep the source with the story.','让来源始终跟着故事走。')}),
  add('sb-conclusion-steps','list',{items:t(['Verify every number before it is composed.','Keep a link and a snapshot for each source.','Review the twelve pages in both languages and all three themes.'],['每个数字在编排之前先核对。','为每个来源同时保留链接和快照。','在两种语言、三个主题中审阅这十二页。'])}),
  add('sb-conclusion-ask','callout',{text:t('One action: add the snapshot to every source before the next review.','唯一行动：在下次审阅之前，为每个来源补上快照。')}),
  add('sb-conclusion-body','paragraph',{text:t('A theme changes how these pages look; it never changes what they say.','主题改变的是这些页面的样子，而不是它们所说的内容。')}),
  synthetic('sb-conclusion-source')]);
 return {document,plan};
}

/** Visual projects with registered assets. `kind` is `story`, `fieldnotes`, `atlas`, `stage` or `storyboard`. */
export async function s8Project(kind,locale,home,theme='silver-gray-editorial'){
 const assets=await releaseAssets(home),suffix=locale.toLowerCase();
 const built={story:()=>[s8Story(locale,theme,assets),`s8-story-${theme}-${suffix}`],fieldnotes:()=>[fieldnotesSample(locale,assets),`s8-fieldnotes-${suffix}`],atlas:()=>[atlasSample(locale,assets),`s8-atlas-${suffix}`],
  stage:()=>[stageSample(locale,assets),`s8-stage-${suffix}`],storyboard:()=>[storyboard(locale,theme,assets),`s8-storyboard-${theme}-${suffix}`]}[kind];
 if(!built)throw Error('Unknown S8 project kind '+kind);
 const [{document,plan},id]=built();
 return createVisualProject(document,plan,{assets:Object.values(assets),id});
}
