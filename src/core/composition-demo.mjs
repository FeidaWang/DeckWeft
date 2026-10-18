import { createVisualDemo } from './visual-demo.mjs';
import { assertVisualProject } from './visual-project.mjs';
import { inferFamily, compositions } from '../design/compositions.mjs';
/** Original bilingual representative content; all numbers are explicitly synthetic. */
export async function createCompositionDemo(locale,home,options={}){
 const p=await createVisualDemo(locale,home,options),zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en,sourceIds=['synthetic-source'];
 p.document.title=t('Six ways to tell one complete story','六种构图，完整讲述');
 const add=(id,type,fields)=>{p.document.blocks.push({id,type,sourceIds,...fields});return id;};
 const comparison=[add('comparison-title','heading',{text:t('Compare the choices.\nKeep the tradeoffs.','并列选择，\n保留取舍。')}),add('comparison-table','table',{columns:[t('Dimension','维度'),t('Local draft','本地草稿'),t('Reviewed deck','审阅文稿')],rows:[[t('Revision','修订'),'1','3'],[t('Exact value','精确数值'),'81.25%','81.25%'],[t('Sources','来源'),t('Retained','保留'),t('Retained','保留')]]}),add('comparison-body','paragraph',{text:t('A synthetic comparison. Both paths keep the original evidence and local assets.','此为虚构对照，两条路径均保留原始证据与本地素材。')}),add('comparison-source','citation',{sourceId:sourceIds[0],text:t('Synthetic comparison · not measured outcomes','虚构对照，并非实测结果')})];
 const process=[add('process-title','heading',{text:t('From a thought\nto a considered choice.','从一个想法，\n到审慎的选择。')}),add('process-diagram','diagram',{nodes:[{id:'draft',label:t('Draft','起草')},{id:'compare',label:t('Compare','比较')},{id:'review',label:t('Review','审阅')}],edges:[{from:'draft',to:'compare'},{from:'compare',to:'review'}]}),add('process-body','paragraph',{text:t('Read every candidate. Check the whole story. Save a revision that can be recovered.','阅读每个候选，检查整份文稿，保存可恢复的修订。')}),add('process-source','citation',{sourceId:sourceIds[0],text:t('Illustrative local workflow','示意性本地流程')})];
 const s=p.plan.scenes;
 s.push({id:'comparison',role:'decision',theme:'cream-collage',themeVersion:'1.0.0',composition:'comparison-matrix',blockIds:comparison,focalBlockId:comparison[0]}, {id:'process',role:'process',theme:'electric-violet',themeVersion:'1.0.0',composition:'process-line',blockIds:process,focalBlockId:process[0]});
 // Keep all original pages, content, crops and source anchors. Only choose their new geometry.
 p.plan.scenes=[s[3],s[2],s[0],s[1],s[4],s[5]];
 for(const scene of p.plan.scenes)scene.composition=compositions.find(c=>c.family===inferFamily(p.document,scene)).id;
 return assertVisualProject(p);
}
