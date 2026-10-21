import {compileInteractionRuntime,inertJSON,interactionTranscript} from '../../motion/web.mjs';
import { createHash } from 'node:crypto';
import { assertPresentation } from '../../core/blocks.mjs';
import { assertPresentationTarget } from '../../targets/capabilities.mjs';
import { runExport } from '../../targets/export-order.mjs';
import { compileWebScenes, contentHash, WEB_RENDERER_VERSION } from '../../scene/web/compile.mjs';
import {sceneDirection} from '../../design/art-direction.mjs';
import { effectiveProfile } from '../../design/theme-registry.mjs';
import { DeckError } from '../../core/errors.mjs';
import { graphicsHTML } from './components/graphics.mjs';
import { x } from './components/escape.mjs';
import { blockHTML,withMarkers } from './components/blocks.mjs';
import { sceneReferences } from '../../references/presentation.mjs';
import { css as baseCSS,componentCSS,interactionCSS } from './styles.mjs';
import { artDirectionCSS } from './art-direction.mjs';
import { compositionCSS } from './compositions.mjs';
import { themeCSS } from './themes.mjs';
const css=baseCSS+compositionCSS+componentCSS+interactionCSS+artDirectionCSS+themeCSS;
import { runtime } from './runtime.mjs';
import { staticChartHTML,staticStepsHTML,staticCompareHTML,staticHotspotsHTML,blueprintHTML } from './static-state.mjs';
import { staticInteractionState } from '../../motion/cues.mjs';
/** S8: only the roles a pack declares reach the page; CSS fallbacks hold the previous literal values. */
const tokenStyle=theme=>{const t=theme.tokens,d=t.declared,out=[];if(d.typography)out.push(`--numeric:${t.typography.numeric}`);if(d.reference)out.push(`--reference:${t.palette.reference}`);if(d.missing)out.push(`--missing:${t.palette.missing}`);for(const k of d.spacing)out.push(`--${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}:${t.spacing[k]}px`);if(d.motion.includes('distance'))out.push(`--motion-distance:${t.motion.distance}px`);if(d.motion.includes('easing'))out.push(`--motion-easing:${t.motion.easing}`);if(d.motion.includes('delay'))out.push(`--motion-delay:${t.motion.delay}ms`);return out.length?';'+out.join(';'):'';};
const effectiveDensity=(document,scene,plan)=>effectiveProfile(document,scene,plan).density;
const sha = text => createHash('sha256').update(text).digest('base64');
/** S9a Reduce text: supporting blocks behind one closed disclosure after the composition, in author order. Nothing is deleted:
 * the words stay in this page, in the PowerPoint notes and in the PDF appendix. Scenes without a disclosure render as before. */
const disclosureHTML=(scene,document,theme,blocks)=>{
 if(!scene.disclosure)return '';const ids=scene.blockIds.filter(id=>scene.disclosure.blockIds.includes(id)),n=ids.length,zh=document.locale==='zh-CN';
 return `<details class="scene-disclosure" data-disclosure="${x(scene.id)}"><summary>${zh?`更多细节 · ${n} 项`:`More detail · ${n} item${n===1?'':'s'}`}</summary>${ids.map(id=>`<div class="disclosed" data-disclosed-block-id="${x(id)}">${blockHTML(blocks.get(id),document,theme,{sceneId:scene.id})}</div>`).join('')}</details>`;
};
export function exportPresentation(document, format, {plan,experimentalWeb=false,assetResources={},preview=false,layout,rasters={},allowFailedCheck=false,paginate='auto',acceptTypography=null}={}) {
  if (!experimentalWeb) throw new DeckError('EXPERIMENTAL_WEB_REQUIRED','Explicitly enable experimentalWeb for the version 3 presentation path.');
  assertPresentation(document);
  assertPresentationTarget(format,document,assetResources,plan);
  if (format === 'json') return {body:JSON.stringify(document,null,2)+'\n',mime:'application/json',extension:'presentation.json'};
  // Paged targets compile from the static web scene through the export order (S7); the rich web output stays as it is.
  if (format === 'pptx' || format === 'pdf') {
    const html=exportPresentation(document,'html',{plan,experimentalWeb,assetResources});
    const run=runExport(document,plan,format,{resources:assetResources,layout,rasters,html,allowFailedCheck,paginate,acceptTypography});
    return {...run.file,report:{order:run.order,levels:run.levels,delivery:run.delivery,check:run.check,receipts:run.output.receipts||[],pagination:run.output.pagination||[]},run};
  }
  const scenes = compileWebScenes(document,plan), zh=document.locale==='zh-CN';
  // A declared static state freezes every selection for readers without JavaScript; scenes without one render exactly as before.
  const region=(scene,b,theme,sceneId,markup)=>{
   // Blueprint A pages always carry their complete explanation (S9b); a declared static state adds its statement and part.
   const blueprint=scene.interactions?.find(i=>i.blockId===b.id&&i.blueprint);
   if(blueprint){const keyState=scene.staticState&&scene.keyStates.find(k=>k.id===scene.staticState.keyStateId),state=keyState?staticInteractionState(document,scene).find(v=>v.id===blueprint.id):null;return blueprintHTML(markup(),b,document,{sceneId,spec:blueprint,state,keyState});}
   if(!scene.staticState)return markup();
   const spec=scene.interactions?.find(i=>i.blockId===b.id||(i.kind==='image-compare'&&i.otherBlockId===b.id));if(!spec)return markup();
   const state=staticInteractionState(document,scene).find(v=>v.id===spec.id),keyState=scene.keyStates.find(k=>k.id===scene.staticState.keyStateId);
   if(spec.kind==='chart-select')return staticChartHTML(b,document,theme,{sceneId,state,keyState});
   if(spec.kind==='steps')return staticStepsHTML(markup(),b,document,{sceneId,spec,state,keyState});
   if(spec.kind==='image-compare')return staticCompareHTML(markup(),document,{role:spec.blockId===b.id?'first':'second',state,keyState});
   return staticHotspotsHTML(markup(),b,document,{scene,spec,state,keyState,resources:assetResources});
  };
  /** CINE-002: the compact source strip and reference panel of one page. Each strip item is a citation region with its block id and
   * exact text behind a display marker; the panel lists every source in full with a link back to each claim that cites it. */
  const stripHTML=(s,refs)=>{
   if(!refs.strip.length)return '';
   const n=refs.strip.length,claimsOf=sourceId=>refs.claims.filter(c=>c.markers.includes(refs.strip.find(v=>v.sourceId===sourceId).marker)).map(c=>s.regions.find(r=>r.blockId===c.blockId)?.id).filter(Boolean);
   const items=refs.strip.map(v=>{const r=s.regions.find(r=>r.blockId===v.blockId);return `<div id="${x(r.id)}" class="region" data-block-id="${x(v.blockId)}" data-component="citation" data-text-role="caption" data-reference="compact"><p class="citation"><a href="${x(v.url)}" rel="noreferrer">[${v.marker}] ${x(v.text)}</a></p></div>`;}).join('');
   const panel=refs.strip.map(v=>`<li id="${x(s.id)}-ref-${v.marker}">[${v.marker}] ${x(v.text)} · ${x(v.title)} — <a href="${x(v.url)}" rel="noreferrer">${x(v.url)}</a>${claimsOf(v.sourceId).map(id=>` · <a href="#${x(id)}">↩</a>`).join('')}</li>`).join('');
   return `<footer class="source-strip" aria-label="${zh?'来源':'Sources'}">${items}<details class="reference-panel"><summary>${zh?'来源':'Sources'} · ${n}</summary><ol>${panel}</ol></details></footer>`;
  };
  const sceneMarkup=scenes.map((s,i)=>{const direction=sceneDirection(document,plan,i),theme=direction.theme, blocks=new Map(document.blocks.map(b=>[b.id,b]));
    const refs=plan.scenes[i].references?sceneReferences(document,plan,plan.scenes[i]):null,inStrip=new Set(refs?.strip.map(v=>v.blockId)),markersOf=id=>refs?.claims.find(c=>c.blockId===id)?.markers;
    const style=`--paper:${theme.paper};--ink:${theme.ink};--accent:${theme.accent};--secondary:${theme.secondary};--display:${theme.display};--body:${theme.body};--code:${theme.code};--page:${theme.page}px;--gap:${theme.gap}px;--display-scale:${theme.displayScale};--image-split:${theme.split*100}%;--motion-ms:${theme.motion.durationMs}ms;--headline:${direction.headline}px;--reading-headline:${direction.readingHeadline}px;--headline-weight:${direction.headlineWeight};--headline-leading:${direction.headlineLeading};--headline-tracking:${direction.headlineTracking};--body-size:${direction.body}px;--lead-size:${direction.lead}px;--story-gutter:${direction.gutter}px;--text-measure:${direction.measure}ch${direction.declared?`;--label-size:${direction.label}px;--reference-size:${direction.reference}px`:''}${tokenStyle(theme)}`;
    return `<section id="${x(s.id)}" class="web-scene ${s.composition}" style="${x(style)}" data-theme="${s.theme}"${theme.palette?` data-palette="${x(theme.palette.id)}" data-palette-mode="${theme.palette.mode}"`:''} data-beat="${direction.beat}" data-space="${direction.sparse?'open':'structured'}"${plan.scenes[i].intent?` data-purpose="${x(direction.intent.purpose)}" data-entry="${x(direction.intent.entry)}"`:''} data-profile="${effectiveDensity(document,plan.scenes[i],plan)}" data-source-hash="${s.sourceHash}" data-focal-block="${x(s.focalBlockId)}" data-motion="${theme.motion.durationMs?'subtle':'off'}"${theme.tokens.declared.motion.includes('fallback')?` data-motion-fallback="${theme.tokens.motion.fallback}"`:''} aria-labelledby="${x(s.regions.find(r=>r.blockId===s.focalBlockId).id)}"><div class="folio"><span>DeckWeft / ${x(s.theme.replaceAll('-',' '))}</span><span>${String(i+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')}</span></div>${graphicsHTML(s,theme)}<div class="regions">${s.readingOrder.map(id=>s.regions.find(r=>r.id===id)).filter(r=>!inStrip.has(r.blockId)).map(r=>`<div id="${x(r.id)}" class="region" data-block-id="${x(r.blockId)}" data-component="${r.component}"${s.interactions?.some(i=>i.kind==='image-compare'&&i.otherBlockId===r.blockId)?' data-comparison-secondary="true"':''} data-text-role="${r.textRole}"${r.reference?` data-reference="${r.reference}"`:''}${r.mediaRole?` data-media-role="${r.mediaRole}"`:''}>${withMarkers(region(plan.scenes[i],blocks.get(r.blockId),theme,s.id,()=>blockHTML(blocks.get(r.blockId),document,theme,{resources:assetResources,crop:r.crop,slot:r.imageSlot,locator:r.locator,sceneId:s.id})),r.component,markersOf(r.blockId))}</div>`).join('')}</div>${refs?stripHTML(s,refs):''}${disclosureHTML(plan.scenes[i],document,theme,blocks)}${interactionTranscript(plan.scenes[i],document)}</section>`;
  });
  const sections=sceneMarkup.join('');
  const interactionConfig=compileInteractionRuntime(document,plan,assetResources);
  const script=runtime;
  const renderHash=contentHash({document,plan,scenes,sections,interactionConfig,renderer:WEB_RENDERER_VERSION,preview,css,runtime:script});
  // No external requests, executable source blocks, inline event handlers, or arbitrary assets.
  const csp=`default-src 'none'; script-src 'sha256-${sha(script)}'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'`;
  const body=`<!doctype html><html lang="${document.locale}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${x(csp)}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="deckweft-render-hash" content="${renderHash}"><title>${x(document.title)}</title><style>${css}</style></head><body data-render-hash="${renderHash}"${preview?' class="preview"':''}><header><h1>${x(document.title)}</h1><nav aria-label="${zh?'演示控件':'Presentation controls'}"><button id="present" hidden>${zh?'演示视图':'Present'}</button><button id="previous" hidden>${zh?'上一页':'Previous'}</button><output id="page" hidden></output><button id="next" hidden>${zh?'下一页':'Next'}</button></nav></header><main>${sections}</main><p id="status" class="status" role="status">${zh?'阅读视图无需 JavaScript。':'Reading view works without JavaScript.'}</p><script type="application/json" id="dw-runtime-data">${inertJSON(interactionConfig)}</script><script>${script}</script></body></html>`;
  // The review gate requires a measurement of each of these besides the opening.
  // The static state, and every key state of a blueprint A page (S9b), in the order the player measures them.
  const staticStates=interactionConfig.scenes.flatMap(s=>{const out=s.staticState?[{sceneId:s.id,keyStateId:s.staticState.keyStateId,position:s.staticState.position}]:[];for(const k of s.blueprintKeyStates||[])if(!out.some(o=>o.keyStateId===k.id))out.push({sceneId:s.id,keyStateId:k.id,position:k.position});return out;});
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
