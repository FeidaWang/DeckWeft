import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {DeckError} from '../core/errors.mjs';
const fail=(code,message)=>{throw new DeckError(code,message,409);};
/** Deliberately narrow local grammar. Hosts can supply structured actions for other requests. */
export function parseRevision(project,request,{sceneId,datasetId}={}) {
 const match=request.match(/(?:第\s*(\d+)\s*页|(?:scene|slide|page)\s*(\d+))/i),number=Number(match?.[1]||match?.[2]);
 const scene=sceneId?project.plan.scenes.find(s=>s.id===sceneId):project.plan.scenes[number-1];
 if(!scene||!/(图表|chart)/i.test(request))fail('REVISION_UNSUPPORTED','Specify an existing page and a chart revision, or supply a scoped composition patch.');
 const existing=scene.blockIds.map(id=>project.document.blocks.find(b=>b.id===id)).find(b=>b.type==='chart');
 // No guessing from prose, table strings or metrics; unrelated datasets need explicit selection.
 const selected=datasetId||existing?.datasetId;
 if(!selected||!project.document.datasets.some(d=>d.id===selected))fail('DATA_REQUIRED','No original dataset is bound/selected for this page. Supply exact original data; the source is retained.');
 return {kind:'chart',sceneId:scene.id,datasetId:selected};
}
export function applyRevision(project,patch,scope) {
 assertVisualProject(project);
 if(!patch||!scope.includes(patch.sceneId))fail('TOOL_SCOPE','Patch is outside the authorized scene scope.');
 const copy=structuredClone(project),scene=copy.plan.scenes.find(s=>s.id===patch.sceneId);
 if(!scene)fail('TOOL_SCOPE','Choose a current scene.');
 if(patch.kind==='composition'){
  if(Object.keys(patch).some(k=>!['kind','sceneId','composition'].includes(k))||typeof patch.composition!=='string')fail('PATCH_FIELDS','Only the declared composition may change.');
  scene.composition=patch.composition;
 }else if(patch.kind==='chart'){
  if(Object.keys(patch).some(k=>!['kind','sceneId','datasetId'].includes(k)))fail('PATCH_FIELDS','Chart revisions retain original words and colors.');
  const data=copy.document.datasets.find(d=>d.id===patch.datasetId);if(!data)fail('DATA_REQUIRED','Supply an existing exact dataset.');
  const chart=scene.blockIds.map(id=>copy.document.blocks.find(b=>b.id===id)).find(b=>b.type==='chart');
  if(chart&&chart.datasetId!==data.id)fail('REVISION_DATA_CONFLICT','This page already binds different data. Keep its original dataset.');
  if(!chart){const id=(scene.id.slice(0,50)+'_chart');if(copy.document.blocks.some(b=>b.id===id))fail('OBJECT_CONFLICT','Chart identity already exists.');copy.document.blocks.push({id,type:'chart',sourceIds:[...data.sourceIds],datasetId:data.id,chartType:data.series.length===1?'ranked-bar':'line',axis:{policy:'zero'}});scene.blockIds.push(id);}
  for(const [index,sourceId] of data.sourceIds.entries())if(!scene.blockIds.some(id=>copy.document.blocks.find(b=>b.id===id)?.sourceId===sourceId)){
   const id=scene.id.slice(0,45)+'_chart_source_'+index;if(copy.document.blocks.some(b=>b.id===id))fail('OBJECT_CONFLICT','Citation identity already exists.');
   const source=copy.document.sources.find(s=>s.id===sourceId);copy.document.blocks.push({id,type:'citation',sourceIds:[sourceId],sourceId,text:source.title});scene.blockIds.push(id);
  }
  scene.composition='evidence-left';
 }else fail('PATCH_FIELDS','Use a composition or exact-data chart patch.');
 // Never permit unlocking as part of an automatic revision.
 assertVisualLocks(project,copy);return assertVisualProject(copy);
}
