import {compileInteractionRuntime,inertJSON,interactionTranscript} from '../../motion/web.mjs';
import { createHash } from 'node:crypto';
import { assertPresentation } from '../../core/blocks.mjs';
import { assertPresentationTarget } from '../../targets/capabilities.mjs';
import { compileWebScenes, contentHash, WEB_RENDERER_VERSION } from '../../scene/web/compile.mjs';
import {sceneDirection} from '../../design/art-direction.mjs';
import { DeckError } from '../../core/errors.mjs';
import { graphicsHTML } from './components/graphics.mjs';
import { x } from './components/escape.mjs';
import { blockHTML } from './components/blocks.mjs';
import { css as baseCSS,componentCSS,interactionCSS } from './styles.mjs';
import { artDirectionCSS } from './art-direction.mjs';
import { compositionCSS } from './compositions.mjs';
const css=baseCSS+compositionCSS+componentCSS+interactionCSS+artDirectionCSS;
import { runtime } from './runtime.mjs';
import { staticChartHTML,staticStepsHTML,staticCompareHTML,staticHotspotsHTML } from './static-state.mjs';
import { staticInteractionState } from '../../motion/cues.mjs';
const effectiveDensity=(document,scene)=>scene.profile?.density||document.visualBrief?.profile?.density||'comfortable';
const sha = text => createHash('sha256').update(text).digest('base64');
export function exportPresentation(document, format, {plan,experimentalWeb=false,assetResources={},preview=false}={}) {
  if (!experimentalWeb) throw new DeckError('EXPERIMENTAL_WEB_REQUIRED','Explicitly enable experimentalWeb for the version 3 presentation path.');
  assertPresentation(document);
  assertPresentationTarget(format,document,assetResources,plan);
  if (format === 'json') return {body:JSON.stringify(document,null,2)+'\n',mime:'application/json',extension:'presentation.json'};
  const scenes = compileWebScenes(document,plan), zh=document.locale==='zh-CN';
  // A declared static state freezes every selection for readers without JavaScript; scenes without one render exactly as before.
  const region=(scene,b,theme,sceneId,markup)=>{
   if(!scene.staticState)return markup();
   const spec=scene.interactions?.find(i=>i.blockId===b.id||(i.kind==='image-compare'&&i.otherBlockId===b.id));if(!spec)return markup();
   const state=staticInteractionState(document,scene).find(v=>v.id===spec.id),keyState=scene.keyStates.find(k=>k.id===scene.staticState.keyStateId);
   if(spec.kind==='chart-select')return staticChartHTML(b,document,theme,{sceneId,state,keyState});
   if(spec.kind==='steps')return staticStepsHTML(markup(),b,document,{sceneId,spec,state,keyState});
   if(spec.kind==='image-compare')return staticCompareHTML(markup(),document,{role:spec.blockId===b.id?'first':'second',state,keyState});
   return staticHotspotsHTML(markup(),b,document,{scene,spec,state,keyState,resources:assetResources});
  };
  const sceneMarkup=scenes.map((s,i)=>{const direction=sceneDirection(document,plan,i),theme=direction.theme, blocks=new Map(document.blocks.map(b=>[b.id,b]));
    const style=`--paper:${theme.paper};--ink:${theme.ink};--accent:${theme.accent};--secondary:${theme.secondary};--display:${theme.display};--body:${theme.body};--code:${theme.code};--page:${theme.page}px;--gap:${theme.gap}px;--display-scale:${theme.displayScale};--image-split:${theme.split*100}%;--motion-ms:${theme.motion.durationMs}ms;--headline:${direction.headline}px;--reading-headline:${direction.readingHeadline}px;--headline-weight:${direction.headlineWeight};--headline-leading:${direction.headlineLeading};--headline-tracking:${direction.headlineTracking};--body-size:${direction.body}px;--lead-size:${direction.lead}px;--story-gutter:${direction.gutter}px;--text-measure:${direction.measure}ch`;
    return `<section id="${x(s.id)}" class="web-scene ${s.composition}" style="${x(style)}" data-theme="${s.theme}" data-beat="${direction.beat}" data-space="${direction.sparse?'open':'structured'}" data-profile="${effectiveDensity(document,plan.scenes[i])}" data-source-hash="${s.sourceHash}" data-focal-block="${x(s.focalBlockId)}" data-motion="${theme.motion.durationMs?'subtle':'off'}" aria-labelledby="${x(s.regions.find(r=>r.blockId===s.focalBlockId).id)}"><div class="folio"><span>DeckWeft / ${x(s.theme.replaceAll('-',' '))}</span><span>${String(i+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')}</span></div>${graphicsHTML(s,theme)}<div class="regions">${s.readingOrder.map(id=>s.regions.find(r=>r.id===id)).map(r=>`<div id="${x(r.id)}" class="region" data-block-id="${x(r.blockId)}" data-component="${r.component}"${s.interactions?.some(i=>i.kind==='image-compare'&&i.otherBlockId===r.blockId)?' data-comparison-secondary="true"':''} data-text-role="${r.textRole}">${region(plan.scenes[i],blocks.get(r.blockId),theme,s.id,()=>blockHTML(blocks.get(r.blockId),document,theme,{resources:assetResources,crop:r.crop,slot:r.imageSlot,sceneId:s.id}))}</div>`).join('')}</div>${interactionTranscript(plan.scenes[i],document)}</section>`;
  });
  const sections=sceneMarkup.join('');
  const interactionConfig=compileInteractionRuntime(document,plan,assetResources);
  const script=runtime;
  const renderHash=contentHash({document,plan,scenes,sections,interactionConfig,renderer:WEB_RENDERER_VERSION,preview,css,runtime:script});
  // No external requests, executable source blocks, inline event handlers, or arbitrary assets.
  const csp=`default-src 'none'; script-src 'sha256-${sha(script)}'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'`;
  const body=`<!doctype html><html lang="${document.locale}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${x(csp)}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="deckweft-render-hash" content="${renderHash}"><title>${x(document.title)}</title><style>${css}</style></head><body data-render-hash="${renderHash}"${preview?' class="preview"':''}><header><h1>${x(document.title)}</h1><nav aria-label="${zh?'演示控件':'Presentation controls'}"><button id="present" hidden>${zh?'演示视图':'Present'}</button><button id="previous" hidden>${zh?'上一页':'Previous'}</button><output id="page" hidden></output><button id="next" hidden>${zh?'下一页':'Next'}</button></nav></header><main>${sections}</main><p id="status" class="status" role="status">${zh?'阅读视图无需 JavaScript。':'Reading view works without JavaScript.'}</p><script type="application/json" id="dw-runtime-data">${inertJSON(interactionConfig)}</script><script>${script}</script></body></html>`;
  // The review gate requires a measurement of each of these besides the opening.
  const staticStates=interactionConfig.scenes.filter(s=>s.staticState).map(s=>({sceneId:s.id,keyStateId:s.staticState.keyStateId,position:s.staticState.position}));
  return {body,mime:'text/html; charset=utf-8',extension:'html',renderHash,scenes,csp,sceneMarkup,staticStates};
}

/** A non-interactive view of one derived scene. No editor DOM or task metadata. */
export function sceneThumbnail(output,sceneId) {
  const index=output.scenes.findIndex(scene=>scene.id===sceneId);
  if(index<0)throw new DeckError('SCENE_NOT_FOUND','Choose a scene in this rendered presentation.',404);
  return output.body.replace(`<main>${output.sceneMarkup.join('')}</main>`,`<main>${output.sceneMarkup[index]}</main>`)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
    .replace(/<body[^>]*>/,'<body class="preview">');
}
