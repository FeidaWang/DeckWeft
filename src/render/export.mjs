import { assertProject } from '../core/validate.mjs';
import { resolveScenes,auditProject } from '../layout/engine.mjs';
import { DeckError } from '../core/errors.mjs';
import { renderPPTX } from './pptx.mjs';
import { sceneToSVG } from './svg.mjs';
import { renderHTML } from './html.mjs';
import { figmaHandoff,motionHandoff } from '../adapters/handoff.mjs';
import { exportPresentation } from './web/document.mjs';
const json=value=>JSON.stringify(value,null,2)+'\n';
export function exportDeck(project,format,{slideIndex=0,resolved:provided,includeNotes=false,motion='system',assetResources={},experimentalWeb=false,plan,preview=false,layout,rasters,allowFailedCheck,paginate,acceptTypography}={}){
  if(project?.format==='deckweft-presentation')return exportPresentation(project,format,{plan,experimentalWeb,assetResources,preview,layout,rasters,allowFailedCheck,paginate,acceptTypography});
  assertProject(project);
  if(typeof includeNotes!=='boolean'||!['system','full','reduced','off'].includes(motion))throw new DeckError('EXPORT_OPTIONS','Use a boolean includeNotes and a supported motion policy.');
  if(format==='json')return {body:json(project),mime:'application/json',extension:'deck.json'};
  const resolved=provided||resolveScenes(project,{assetResources}),audit=auditProject(project,resolved);
  if(!audit.ok)throw new DeckError('EXPORT_BLOCKED','Some text does not fit. Choose another layout or shorten the marked fields before exporting.',422,audit.issues);
  if(format==='pptx')return {body:renderPPTX(project,resolved,{includeNotes}),mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',extension:'pptx'};
  if(format==='html')return {body:renderHTML(project,resolved,{includeNotes,motion}),mime:'text/html; charset=utf-8',extension:'html'};
  if(format==='svg'){
    if(!Number.isInteger(slideIndex)||!resolved[slideIndex])throw new DeckError('SLIDE_RANGE','Choose an existing slide number.');
    return {body:sceneToSVG(resolved[slideIndex].scene,{title:project.slides[slideIndex].content.title}),mime:'image/svg+xml',extension:'svg'};
  }
  const handoffProject=includeNotes?project:{...project,sources:[],slides:project.slides.map(s=>({...s,notes:'',sourceIds:[]}))};
  if(format==='figma')return {body:json(figmaHandoff(handoffProject,resolved)),mime:'application/json',extension:'figma.json'};
  if(format==='motion')return {body:json(motionHandoff(handoffProject,resolved)),mime:'application/json',extension:'motion.json'};
  throw new DeckError('EXPORT_FORMAT','Choose json, pptx, html, svg, figma, or motion.');
}
