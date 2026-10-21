import {createVisualProject} from '../src/core/visual-project.mjs';
/**
 * DWI-003 (workpacks/wes-instrument/TASKS.md): the six-page vertical-slice fixture the DWI phases regress against. One page per
 * layout family the master plan names: assertion + evidence, paired comparison, evidence chart (small multiples on one scale),
 * workflow, mechanism and reading brief. English and Simplified Chinese share every id, value and source. Every number is
 * synthetic. `DWI_INVARIANTS` lists what no later DWI task may change: values and nulls, units and denominators, source links,
 * locks, the not-to-scale statement and the notes the paged exports must carry.
 */
export const DWI_LOCALES=['en','zh-CN'];
export const DWI_THEME={id:'silver-gray-editorial',version:'1.0.0'};
const T={
 en:{
  title:'Export fidelity review (DWI vertical slice)',audience:'Engineers reviewing the DWI vertical slice',
  sources:{review:'Illustrative review log · synthetic, not a real study',bench:'Illustrative export bench · synthetic',spec:'Illustrative pipeline spec · synthetic',sketch:'Illustrative mechanism sketch · synthetic, not to scale'},
  claim:'Checking each export by its content cut review time by a quarter',claimBody:'Median review minutes per deck, four review rounds.',
  qualifier:'Round 3 was not collected; it is shown as missing, never as zero.',cite:'Review log, synthetic',
  series:{checked:'Content-checked exports',opened:'Opened-file check only'},cats:['Round 1','Round 2','Round 3','Round 4'],
  cmpTitle:'Two export checks on the same four dimensions',cols:['Dimension','Opened-file check','Content check'],
  rows:[['Text kept','Not checked','Every block compared'],['Numbers kept','Not checked','Values and nulls compared'],['Sources kept','Not checked','Every claim link compared'],['Effort','2 min per deck','6 min per deck']],
  cmpConclusion:'The content check costs four more minutes and is the only one that finds a changed number.',cmpCite:'Export bench, synthetic',
  smTitle:'Both teams fall on one fixed scale',smA:'Team A defects per 100 slides',smB:'Team B defects per 100 slides',smNote:'Both panels share the 0–40 scale; neither axis is truncated.',smCite:'Export bench, synthetic',
  flowTitle:'From material to an editable deck in five steps',flow:['Add material','Review story','Make slides','Check exports','Hand off'],flowEdges:['sources kept','outline approved','measured scene','content compared'],
  flowNote:'A failed check returns to Make slides; the reviewed project is never overwritten.',flowCite:'Pipeline spec, synthetic',
  mechTitle:'How one semantic scene reaches every export',mechNote:'Each exporter reads the same measured scene.',mechNodes:['Document','Design plan','Measured scene','HTML','PowerPoint','PDF'],
  mechKey:['Document: facts, values and sources','Design plan: order, composition and locks','Measured scene: one geometry for all outputs'],notToScale:'Schematic, not to scale.',mechCite:'Mechanism sketch, synthetic',
  briefTitle:'What the vertical slice must keep',briefBody:'The slice is accepted only when the six pages export with the same text, numbers and source links they were authored with. Visual polish never excuses a lost qualifier or a changed value.',
  briefList:['Every factual claim keeps its source key','Nulls stay missing, never zero','Locked blocks stay as written','Notes carry sources and full data'],briefCite:'Pipeline spec, synthetic'
 },
 'zh-CN':{
  title:'导出保真度复核（DWI 纵向切片）',audience:'复核 DWI 纵向切片的工程师',
  sources:{review:'示例复核记录 · 合成数据，非真实研究',bench:'示例导出测试台 · 合成数据',spec:'示例流程规格 · 合成数据',sketch:'示例机制草图 · 合成，非比例'},
  claim:'按内容核对每次导出，复核时间缩短四分之一',claimBody:'每套幻灯片的复核时间中位数（分钟），四轮复核。',
  qualifier:'第 3 轮未采集，显示为缺失，绝不显示为零。',cite:'复核记录，合成',
  series:{checked:'按内容核对的导出',opened:'仅检查文件能否打开'},cats:['第 1 轮','第 2 轮','第 3 轮','第 4 轮'],
  cmpTitle:'两种导出检查在相同四个维度上的对比',cols:['维度','仅打开文件','按内容核对'],
  rows:[['文字保留','未检查','逐块比对'],['数字保留','未检查','比对数值与缺失'],['来源保留','未检查','比对每条论点链接'],['耗时','每套 2 分钟','每套 6 分钟']],
  cmpConclusion:'按内容核对多花四分钟，但只有它能发现被改动的数字。',cmpCite:'导出测试台，合成',
  smTitle:'两个团队落在同一固定刻度上',smA:'A 组每 100 页缺陷数',smB:'B 组每 100 页缺陷数',smNote:'两个面板共用 0–40 刻度，坐标轴均未截断。',smCite:'导出测试台，合成',
  flowTitle:'从材料到可编辑幻灯片的五个步骤',flow:['添加材料','审阅故事','生成幻灯片','检查导出','交付'],flowEdges:['保留来源','大纲已批准','已测量场景','内容已比对'],
  flowNote:'检查失败时回到“生成幻灯片”；已审阅的项目不会被覆盖。',flowCite:'流程规格，合成',
  mechTitle:'一个语义场景如何到达每种导出',mechNote:'每个导出器读取同一个已测量场景。',mechNodes:['文档','设计计划','已测量场景','HTML','PowerPoint','PDF'],
  mechKey:['文档：事实、数值与来源','设计计划：顺序、版式与锁定','已测量场景：所有输出共用一套几何'],notToScale:'示意图，非比例。',mechCite:'机制草图，合成',
  briefTitle:'纵向切片必须保留的内容',briefBody:'只有当六页导出后的文字、数字和来源链接与创作时完全一致，切片才算通过。视觉润色绝不能成为丢失限定语或改动数值的理由。',
  briefList:['每条事实论点保留来源键','缺失值保持缺失，绝不为零','锁定块保持原样','备注包含来源与完整数据'],briefCite:'流程规格，合成'
 }
};
const CAT_IDS=['r1','r2','r3','r4'];
export const DWI_VALUES=Object.freeze({checked:[44,37,null,33],opened:[45,44,43,44],teamA:[31,24,18,12],teamB:[28,27,25,22]});
export const DWI_SCENES=['assertion','comparison','chart','workflow','mechanism','brief'];
export function dwiSliceDocument(locale){
 const t=T[locale];if(!t)throw Error(`Unknown locale ${locale}`);
 const series=(id,label,values)=>({id,label,values:[...values]});
 const datasets=[
  {id:'review-time',unit:'min',synthetic:true,categories:[...t.cats],categoryIds:[...CAT_IDS],series:[series('checked',t.series.checked,DWI_VALUES.checked),series('opened',t.series.opened,DWI_VALUES.opened)],sourceIds:['src-review'],version:'dwi-2026-10',definition:{denominator:'decks reviewed per round (12)',sample:'synthetic, 12 decks per round',normalized:false,betterDirection:'lower'},missing:[{seriesId:'checked',categoryId:'r3',reason:'not-collected',note:t.qualifier}]},
  {id:'team-a',unit:'defects per 100 slides',synthetic:true,categories:[...t.cats],categoryIds:[...CAT_IDS],series:[series('team-a-defects',t.smA,DWI_VALUES.teamA)],sourceIds:['src-bench'],version:'dwi-2026-10',definition:{denominator:'100 exported slides',sample:'synthetic',normalized:true,betterDirection:'lower'}},
  {id:'team-b',unit:'defects per 100 slides',synthetic:true,categories:[...t.cats],categoryIds:[...CAT_IDS],series:[series('team-b-defects',t.smB,DWI_VALUES.teamB)],sourceIds:['src-bench'],version:'dwi-2026-10',definition:{denominator:'100 exported slides',sample:'synthetic',normalized:true,betterDirection:'lower'}}
 ];
 const sources=Object.entries(t.sources).map(([k,title])=>({id:`src-${k}`,title,url:`https://example.org/deckweft/dwi/${k}`}));
 const flowIds=['add','review','make','check','handoff'],mechIds=['document','plan','scene','html','pptx','pdf'];
 const blocks=[
  {id:'as-claim',type:'heading',sourceIds:['src-review'],text:t.claim},
  {id:'as-chart',type:'chart',sourceIds:['src-review'],datasetId:'review-time',chartType:'line',axis:{policy:'zero'},labels:'end'},
  {id:'as-body',type:'paragraph',sourceIds:['src-review'],text:t.claimBody},
  {id:'as-qualifier',type:'callout',sourceIds:['src-review'],text:t.qualifier},
  {id:'as-cite',type:'citation',sourceIds:['src-review'],sourceId:'src-review',text:t.cite},
  {id:'cmp-title',type:'heading',sourceIds:['src-bench'],text:t.cmpTitle},
  {id:'cmp-table',type:'table',sourceIds:['src-bench'],columns:[...t.cols],rows:t.rows.map(r=>[...r])},
  {id:'cmp-conclusion',type:'paragraph',sourceIds:['src-bench'],text:t.cmpConclusion},
  {id:'cmp-cite',type:'citation',sourceIds:['src-bench'],sourceId:'src-bench',text:t.cmpCite},
  {id:'sm-title',type:'heading',sourceIds:['src-bench'],text:t.smTitle},
  {id:'sm-a',type:'chart',sourceIds:['src-bench'],datasetId:'team-a',chartType:'line',axis:{policy:'fixed',min:0,max:40}},
  {id:'sm-b',type:'chart',sourceIds:['src-bench'],datasetId:'team-b',chartType:'line',axis:{policy:'fixed',min:0,max:40}},
  {id:'sm-note',type:'paragraph',sourceIds:['src-bench'],text:t.smNote},
  {id:'sm-cite',type:'citation',sourceIds:['src-bench'],sourceId:'src-bench',text:t.smCite},
  {id:'flow-title',type:'heading',sourceIds:['src-spec'],text:t.flowTitle},
  {id:'flow-diagram',type:'diagram',sourceIds:['src-spec'],diagramType:'process',nodes:flowIds.map((id,i)=>({id,label:t.flow[i]})),edges:flowIds.slice(1).map((to,i)=>({id:`e-${flowIds[i]}-${to}`,from:flowIds[i],to,label:t.flowEdges[i]}))},
  {id:'flow-note',type:'paragraph',sourceIds:['src-spec'],text:t.flowNote},
  {id:'flow-cite',type:'citation',sourceIds:['src-spec'],sourceId:'src-spec',text:t.flowCite},
  {id:'mech-title',type:'heading',sourceIds:['src-sketch'],text:t.mechTitle},
  {id:'mech-note',type:'paragraph',sourceIds:['src-sketch'],text:t.mechNote},
  {id:'mech-scale',type:'callout',sourceIds:['src-sketch'],text:t.notToScale},
  {id:'mech-diagram',type:'diagram',sourceIds:['src-sketch'],diagramType:'relationship',nodes:mechIds.map((id,i)=>({id,label:t.mechNodes[i]})),edges:[['document','scene'],['plan','scene'],['scene','html'],['scene','pptx'],['scene','pdf']].map(([from,to])=>({id:`m-${from}-${to}`,from,to}))},
  {id:'mech-key',type:'list',sourceIds:['src-sketch'],items:[...t.mechKey]},
  {id:'mech-cite',type:'citation',sourceIds:['src-sketch'],sourceId:'src-sketch',text:t.mechCite},
  {id:'brief-title',type:'heading',sourceIds:['src-spec'],text:t.briefTitle},
  {id:'brief-body',type:'paragraph',sourceIds:['src-spec'],text:t.briefBody},
  {id:'brief-list',type:'list',sourceIds:['src-spec'],items:[...t.briefList]},
  {id:'brief-cite',type:'citation',sourceIds:['src-spec'],sourceId:'src-spec',text:t.briefCite}
 ];
 return {format:'deckweft-presentation',schemaVersion:3,id:`dwi-slice-${locale.toLowerCase()}`,title:t.title,locale,
  visualBrief:{audience:t.audience,outputLanguage:locale,profile:{colorIntensity:'restrained',typographicContrast:'balanced',density:'comfortable',motionIntensity:'off',imageEmphasis:'large'}},
  blocks,datasets,sources,
  migration:{},authorOverrides:{lockedBlockIds:['as-claim','cmp-table'],sceneLocks:[{sceneId:'mechanism',fields:['composition']}],lockMode:'separate',lockedDatasetIds:['review-time'],lockedSourceIds:['src-review']}};
}
const scene=(id,role,composition,blockIds,focalBlockId,extra={})=>({id,role,theme:DWI_THEME.id,themeVersion:DWI_THEME.version,composition,blockIds,focalBlockId,...extra});
export function dwiSlicePlan(locale){
 return {format:'deckweft-design-plan',version:1,documentId:`dwi-slice-${locale.toLowerCase()}`,scenes:[
  scene('assertion','evidence','evidence-left',['as-claim','as-chart','as-body','as-qualifier','as-cite'],'as-chart',{takeaway:{blockId:'as-claim'},contentStatus:'illustrative'}),
  scene('comparison','evidence','comparison-matrix',['cmp-title','cmp-table','cmp-conclusion','cmp-cite'],'cmp-table',{contentStatus:'illustrative'}),
  scene('chart','evidence','small-multiples-row',['sm-title','sm-a','sm-b','sm-note','sm-cite'],'sm-a',{contentStatus:'illustrative'}),
  scene('workflow','process','process-line',['flow-title','flow-diagram','flow-note','flow-cite'],'flow-diagram',{contentStatus:'illustrative'}),
  scene('mechanism','process','system-map-wide',['mech-title','mech-note','mech-scale','mech-diagram','mech-key','mech-cite'],'mech-diagram',{contentStatus:'illustrative'}),
  scene('brief','closing','reading-flow',['brief-title','brief-body','brief-list','brief-cite'],'brief-title',{contentStatus:'illustrative'})
 ]};
}
export const dwiSliceProject=(locale,options={})=>createVisualProject(dwiSliceDocument(locale),dwiSlicePlan(locale),{assets:[],id:`dwi-slice-${locale.toLowerCase()}`,...options});
/** What every later DWI task must preserve on this fixture, per locale. */
export const DWI_INVARIANTS=Object.freeze({
 lockedBlockIds:['as-claim','cmp-table'],lockedDatasetIds:['review-time'],lockedSourceIds:['src-review'],sceneLocks:[{sceneId:'mechanism',fields:['composition']}],
 nulls:[{datasetId:'review-time',seriesId:'checked',categoryId:'r3'}],
 units:{'review-time':'min','team-a':'defects per 100 slides','team-b':'defects per 100 slides'},
 sharedScale:{blockIds:['sm-a','sm-b'],axis:{policy:'fixed',min:0,max:40}},
 notToScaleBlockId:'mech-scale',
 claimSources:{'as-claim':['src-review'],'cmp-conclusion':['src-bench'],'sm-note':['src-bench'],'flow-note':['src-spec'],'mech-note':['src-sketch'],'brief-body':['src-spec']}
});
