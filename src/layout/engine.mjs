import { LAYOUTS } from '../core/model.mjs';
import { assertProject } from '../core/validate.mjs';
import { compileSlide, LAYOUT_INFO, PALETTES } from './scene.mjs';
import { contrastRatio } from './text.mjs';
export function candidates(project, slide, { previousLayout,measurer,assetResources } = {}) {
  const layouts=project.schemaVersion===2?[slide.design.layout==='auto'?'editorial':slide.design.layout]:LAYOUTS;
  return layouts.map((id, index)=>{
    const scene=compileSlide(project,slide,id,{measurer,assetResources}), info=LAYOUT_INFO[id];
    const overflow=scene.issues.filter(i=>i.severity==='error').length;
    const textNodes=scene.nodes.filter(n=>n.type==='text'&&!['footer','eyebrow','source-note','step-number'].includes(n.role));
    const readable=textNodes.filter(n=>n.fontSize>=24).length/Math.max(1,textNodes.length);
    const semantic=info.roles.includes(slide.role)?26:16;
    const components={semantic,fit:Math.max(0,40-overflow*20),readability:Math.round(readable*20),variety:previousLayout===id?4:10};
    if(id==='grid'&&slide.content.metrics.length) components.semantic+=4;
    if(id==='timeline'&&slide.content.items.length>=2) components.semantic+=4;
    const score=Math.max(0,Math.min(100,Object.values(components).reduce((a,b)=>a+b,0)));
    return {id,label:project.schemaVersion===2?slide.intent.visualFamily:info.label,explanation:project.schemaVersion===2?'Structure follows the reviewed visual intent. Static outputs preserve every item.':info.explanation,score,components,issues:scene.issues,eligible:overflow===0,index};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score||a.index-b.index);
}
export function resolveScenes(project,{measurer,assetResources}={}) {
  assertProject(project);
  let previousLayout;
  return project.slides.map(slide=>{
    const ranked=candidates(project,slide,{previousLayout,measurer,assetResources});
    const selected=slide.design.layout==='auto'?ranked[0].id:slide.design.layout;
    previousLayout=selected;
    return {slideId:slide.id,selected,candidates:ranked,scene:compileSlide(project,slide,selected,{measurer,assetResources})};
  });
}
export function auditProject(project, resolved=resolveScenes(project)) {
  const issues=[];
  for(const result of resolved){
    const slide=project.slides.find(s=>s.id===result.slideId);
    issues.push(...result.scene.issues.map(i=>({...i,slideId:slide.id})));
    if(slide.content.metrics.length&&!slide.sourceIds.length) issues.push({code:'SOURCE_NEEDED',severity:'warning',slideId:slide.id,message:'These numbers have no linked source. Add one, or label them as your own example in the notes.'});
    if(slide.content.title.trim().length<3) issues.push({code:'WEAK_TITLE',severity:'warning',slideId:slide.id,message:'Use a title that tells the reader the main idea.'});
  }
  const p=PALETTES[project.theme], contrast=contrastRatio(p.ink,p.background);
  if(contrast<4.5) issues.push({code:'LOW_CONTRAST',severity:'error',message:'Text and background are too similar.'});
  return { ok:!issues.some(i=>i.severity==='error'),errors:issues.filter(i=>i.severity==='error').length,
    warnings:issues.filter(i=>i.severity==='warning').length,issues,
    checks:{primaryTextContrast:Number(contrast.toFixed(2)),layoutScoring:'deterministic heuristic',textMeasurement:resolved.every(r=>r.scene.measurement==='browser-canvas')?'browser-canvas':'offline estimate'},
    notice:'Layout fit is not a fact check. Fonts may wrap differently in PowerPoint, Figma, and After Effects.' };
}
