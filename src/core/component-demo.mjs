import {createVisualDemo} from './visual-demo.mjs';
import {assertVisualProject} from './visual-project.mjs';
/** Original synthetic values demonstrate lossless gaps, signed values and stable anchors. */
export async function createComponentDemo(locale,home,options={}){
 const p=await createVisualDemo(locale,home,options),zh=locale==='zh-CN',t=(a,b)=>zh?b:a;
 p.document.title=t('Evidence, relationships and exact code','证据、关系与精确代码');
 // Retain the original four-page story, sources, artwork, locks and snapshots.
 const add=(id,type,fields)=>{p.document.blocks.push({id,type,sourceIds:['synthetic-source'],...fields});return id;};
 const themes=['cream-collage','electric-violet','dark-data'];
 for(const [k,kind]of ['line','area','ranked-bar','stacked','scatter','heatmap'].entries()){
  const id='component-'+kind,ds={id:'data-'+kind,unit:t('hours','小时'),synthetic:true,categoryIds:['alpha','beta','gamma','delta'],categories:zh?['起草','审阅','修订','交付']:['Draft','Review','Revise','Deliver'],series:[{id:'local',label:t('Local','本地'),values:[-3.125,0,null,8.25]},{id:'reviewed',label:t('Reviewed','已审阅'),values:[2.5,-1,4,6]}],sourceIds:['synthetic-source']};
  if(kind==='ranked-bar')ds.series.length=1;
  if(kind==='scatter'){ds.xUnit=t('iterations','轮次');ds.series.forEach((s,j)=>s.xValues=[1+j,3+j,5+j,8+j]);}
  if(kind==='area'){ds.categoryKind='datetime';ds.timeZone='Australia/Melbourne';ds.categories=['2026-10-03T15:00:00Z','2026-10-03T16:00:00Z','2026-10-03T17:00:00Z','2026-10-03T18:00:00Z'];}
  p.document.datasets.push(ds);
  const ids=[add(id+'-title','heading',{text:t(({line:'Keep the gap visible.',area:'Time has a zone.', 'ranked-bar':'Rank without rewriting.',stacked:'Compare signed contributions.',scatter:'Every point has two values.',heatmap:'A matrix retains every value.'})[kind],({line:'缺失，明确留空。',area:'时间，明确时区。','ranked-bar':'排序，不改原始数据。',stacked:'比较正负贡献。',scatter:'每个点都有两个数值。',heatmap:'矩阵保留每个数值。'})[kind])}),add(id,'chart',{datasetId:ds.id,chartType:kind,axis:{policy:'zero'}}),add(id+'-note','annotation',{text:t('Synthetic evidence: negative, zero and missing are different.','合成演示：负数、零和缺失各有含义。'),target:{blockId:id,objectId:'alpha',seriesId:'local'}})];
  p.plan.scenes.push({id,role:'evidence',theme:themes[k%3],themeVersion:'1.0.0',composition:'evidence-top',blockIds:ids,focalBlockId:ids[0]});
 }
 for(const [k,kind]of ['relationship','sequence','process'].entries()){
  const id='component-'+kind,ids=[add(id+'-title','heading',{text:t({relationship:'Only the supplied relationships.',sequence:'Read messages in supplied order.',process:'Keep the review loop.'}[kind],{relationship:'忠实呈现给定关系。',sequence:'按给定顺序阅读消息。',process:'保留审阅回路。'}[kind])}),add(id,'diagram',{diagramType:kind,nodes:[{id:'writer',label:t('Writer','作者')},{id:'reviewer',label:t('Reviewer','审阅者'),note:t('Request changes before saving.','保存前提出修订。')},{id:'archive',label:t('Archive','归档')}],edges:[{id:'submit',from:'writer',to:'reviewer',label:t('Submit','提交')},{id:'revise',from:'reviewer',to:'writer',label:t('Revise','修订')},{id:'save',from:'reviewer',to:'archive',label:t('Save','保存')}]}),add(id+'-note','annotation',{text:t('Review returns to the writer; it is not a linear approval chain.','审阅返回作者，不能改成线性批准链。'),target:{blockId:id,objectId:'revise'}})];
  p.plan.scenes.push({id,role:'process',theme:themes[k],themeVersion:'1.0.0',composition:'process-line',blockIds:ids,focalBlockId:ids[0]});
 }
 const ids=[add('component-code-title','heading',{text:t('The original code stays intact.','完整原文，原样保留。')}),add('component-code','code',{language:'javascript',text:'// Exact source · 精确保留\nexport function delta(before, after) {\n\treturn after - before;  // keep spaces\n}\n',emphasizedLines:[2,3],sourceAnchor:{sourceId:'synthetic-source',anchor:'example.mjs#L1-L5'}}),add('component-code-note','annotation',{text:t('Emphasis points to line 3 by block identity.','通过内容块身份绑定第 3 行。'),target:{blockId:'component-code',line:3}})];
 p.plan.scenes.push({id:'component-code',role:'evidence',theme:'dark-data',themeVersion:'1.0.0',composition:'reading-flow',blockIds:ids,focalBlockId:ids[0]});
 return assertVisualProject(p);
}
