import {DeckError} from '../core/errors.mjs';
import {sceneAsset} from '../render/assets.mjs';
const portableScene=scene=>({...scene,nodes:scene.nodes.map(n=>n.type==='image'?{...n,resource:((a)=>({mime:a.mime,width:a.width,height:a.height,dataURL:a.dataURL}))(sceneAsset(n.asset,n.resource))}:n)});
/** Both handoffs use the exact scene that drives SVG and PPTX. */
export function figmaHandoff(project,resolved){
  for(const r of resolved)for(const n of r.scene.nodes)if(n.type==='image'){const a=sceneAsset(n.asset,n.resource);if(a.width>4096||a.height>4096)throw new DeckError('FIGMA_IMAGE_SIZE','Figma needs PNG dimensions no larger than 4096. Replace this image with a smaller approved copy.',422);}
  return {format:'deckweft-figma',version:1,title:project.title,locale:project.locale,
    scenes:resolved.map(r=>portableScene(r.scene)),warnings:['Import creates editable text and shape layers, not reusable auto-layout components.','Fonts must be installed. Font substitution can alter wrapping.']};
}
export function motionHandoff(project,resolved){
  return {format:'deckweft-motion',version:1,title:project.title,locale:project.locale,frameRate:30,
    compositions:resolved.map((r,i)=>({ ...portableScene(r.scene),duration:project.slides[i].motion.duration,
      motion:project.slides[i].motion.preset,notes:project.slides[i].notes,temporal:r.scene.nodes.filter(n=>n.type==='text'&&!['footer','source-note'].includes(n.role)&&project.slides[i].motion.preset!=='none').map(n=>({nodeId:n.id,start:n.role==='title'?.08:.20,end:(n.role==='title'?.08:.20)+.44,easing:'ease-out-65',rise:project.slides[i].motion.preset==='rise'?18:0})) })),
    warnings:['After Effects desktop import is not verified by JSON generation.','Native PowerPoint animation is not included in PPTX export.','Live 3D and interactions use declared static scene fallbacks.','Embedded PNG media are individual layers; the importer asks for a local media folder.']};
}
