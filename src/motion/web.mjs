import {x} from '../render/web/components/escape.mjs';
import {compileCues} from './cues.mjs';
import {objectAnchor} from '../components/annotations/identity.mjs';
import {resolveTheme,effectiveProfile} from '../design/theme-registry.mjs';
import {staticStatePosition} from '../design/scene-semantics.mjs';
import {blueprintSpec} from './blueprint.mjs';
export function compileInteractionRuntime(document,plan,resources={}){
 const blocks=new Map(document.blocks.map(b=>[b.id,b]));
 return {version:1,locale:document.locale,scenes:plan.scenes.map(scene=>{
  const compiled=compileCues(document,scene),components={};
  for(const spec of compiled.interactions){
   const b=blocks.get(spec.blockId),panelId=objectAnchor(scene.id,'interaction:'+spec.id,'panel');let detail={block:b,panelId};
   if(spec.kind==='chart-select'){
    const d=document.datasets.find(d=>d.id===b.datasetId),anchors={};for(const id of d.categoryIds)for(const s of ['',...d.series.map(s=>s.id)])anchors[JSON.stringify([id,s])]=objectAnchor(scene.id,b.id,id,s);
    detail={...detail,dataset:d,anchors,theme:resolveTheme(scene.theme,scene.themeVersion,document.locale,{palette:scene.palette,role:scene.role,profile:effectiveProfile(document,scene,plan),colorMode:scene.colorMode||(scene.composition==='violet-chapter'?'chapter':'default')})};
   }else if(spec.kind==='steps')detail.anchors=Object.fromEntries(b.type==='diagram'?[...b.nodes,...b.edges.filter(e=>e.id)].map(v=>[v.id,objectAnchor(scene.id,b.id,v.id)]):[]);
   else if(spec.kind==='image-hotspots'){
    detail.annotations=Object.fromEntries(spec.hotspots.map(h=>[h.annotationId,blocks.get(h.annotationId)]));detail.positions=hotspotPositions(scene,spec,b,resources);
   }
   components[spec.id]=detail;
  }
  // S9a: the page's effective profile (page › chapter › deck), so a chapter or page motion choice reaches the player; the deck switch still wins.
  const theme=resolveTheme(scene.theme,scene.themeVersion,document.locale,{palette:scene.palette,profile:effectiveProfile(document,scene,plan)});
  return {id:scene.id,interactions:compiled.interactions,cues:compiled.cues,motion:document.visualBrief?.profile.motionIntensity==='off'?{policy:'off',durationMs:0}:scene.motion||{policy:theme.motion.durationMs?'subtle':'off',durationMs:theme.motion.durationMs},components,...(scene.staticState?{staticState:{keyStateId:scene.staticState.keyStateId,position:staticStatePosition(scene),reducedMotion:scene.motion?.reducedMotion||theme.tokens?.motion.fallback||'instant'}}:{}),...(blueprintSpec(scene)&&scene.keyStates?{blueprintKeyStates:scene.keyStates.map(k=>({id:k.id,position:k.position}))}:{})};
 })};
}
/** Hotspot positions inside the drawn image frame: crop-relative, or letterboxed for an explicit contain slot. */
export function hotspotPositions(scene,spec,block,resources={}){
 const crop=scene.crops?.find(c=>c.blockId===block.id)||{x:0,y:0,width:1,height:1},slot=scene.imageSlots?.find(s=>s.blockId===block.id),r=resources[block.assetId];
 return spec.hotspots.map(h=>{if(slot?.display==='contain'&&r){const ratio=r.width/r.height,w=Math.min(1,ratio/slot.aspect),height=Math.min(1,slot.aspect/ratio);return {x:(1-w)/2+h.x*w,y:(1-height)/2+h.y*height};}return {x:(h.x-crop.x)/crop.width,y:(h.y-crop.y)/crop.height};});
}
/** Fixed runtime code and inert data are embedded offline; no eval or dynamic module requests. */
export const inertJSON=value=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));

export function interactionTranscript(scene,document){
 if(!scene.interactions?.length&&!scene.cues?.length)return '';
 const zh=document.locale==='zh-CN',labels={'data.filter':zh?'调整图表选择':'Change chart selection','data.focus':zh?'聚焦一个系列':'Focus one series','tab.select':zh?'比较图片':'Compare images','step.next':zh?'下一步说明':'Next explanation','annotation.reveal':zh?'显示注释':'Reveal annotation'};
 return `<details class="interaction-transcript"><summary>${zh?'全部作者说明与提示顺序':'All authored explanations and cue order'}</summary>${(scene.interactions||[]).flatMap(i=>[...(i.blueprint?[{explanationId:i.blueprint.wholeExplanationId}]:[]),...(i.steps||[])]).map(s=>document.explanations.find(n=>n.id===s.explanationId)).map(s=>`<p><strong>${x(s.label)}</strong> · ${x(s.text)}</p>`).join('')}<ol>${(scene.cues||[]).map(c=>`<li>${x(c.label||labels[c.event])}</li>`).join('')}</ol></details>`;
}
