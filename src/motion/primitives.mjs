/**
 * The handoff's six motion primitives mapped onto the existing cue events. Every primitive animates from a nearly final state to the
 * final state, so a cancelled animation, reduced motion or a missing Web Animations API all leave the final content visible.
 * `added` says what S5 introduced; the rest reuses the VIS-009 keyframes. Durations stay inside the VIS-009 limit of 400 ms
 * (effectiveMotion); the handoff's 450–800 ms proposal for mask, series and annotation reveals is not adopted.
 */
export const MOTION_PRIMITIVES={
 FadeIn:{cues:['data.focus','step.next','step.select'],targets:'marks of the focused series; the highlighted diagram node, edge or code line',reducedMotion:'content-visible',maxMs:220,added:null,frames:[{opacity:.35},{opacity:1}]},
 SlideSmall:{cues:['scene.enter','data.filter','data.focus'],targets:'scene regions on entry and replay; the current chart view after a range change; the chart explanation line',reducedMotion:'content-visible',maxMs:220,added:null,frames:[{opacity:.65,transform:'translateY(4px)'},{opacity:1,transform:'none'}]},
 Crossfade:{cues:['tab.select'],targets:'the comparison panel, already in its new layout',reducedMotion:'target-layout',maxMs:400,added:'keyframes',frames:[{opacity:.4},{opacity:1}]},
 RevealMask:{cues:['step.next','step.select'],targets:'the step explanation panel, revealed from its reading edge',reducedMotion:'full-graphic',maxMs:400,added:'keyframes',frames:[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}]},
 SeriesReveal:{cues:['data.filter'],targets:'marks of each newly shown series, one series after another; axes, units and baseline stay still',reducedMotion:'full-graphic',maxMs:400,added:'targets and stagger',stagger:60,frames:[{opacity:0},{opacity:1}]},
 AnnotationReveal:{cues:['annotation.reveal'],targets:'the hotspot explanation panel',reducedMotion:'full-graphic',maxMs:400,added:'name only (VIS-009 panel motion)',frames:[{opacity:.65,transform:'translateY(4px)'},{opacity:1,transform:'none'}]}
};
/** What the reader sees when motion is reduced, off, cancelled or unavailable. */
export const REDUCED_MOTION_RESULTS={'content-visible':'The content is directly visible.','target-layout':'The target layout is entered directly.','full-graphic':'The complete graphic and its conclusion are shown.'};
/**
 * Deterministic motion plan for one state change: which primitive animates which semantic target. The same event and states
 * always give the same plan, so replay and seek animate identically. Targets are stable identities, resolved to nodes by the view.
 */
export function motionPlan(spec,before,after,event){
 const step=(primitive,target,delay=0)=>({primitive,target,delay});
 if(event.event==='scene.enter')return [step('SlideSmall',{kind:'regions'})];
 if(!spec)return [];
 if(spec.kind==='chart-select'){
  if(event.event==='data.focus')return [...(after.focusSeriesId?[step('FadeIn',{kind:'series',seriesId:after.focusSeriesId})]:[]),step('SlideSmall',{kind:'explanation'})];
  const shown=after.seriesIds.filter(id=>!before.seriesIds.includes(id));
  return shown.length?[...shown.map((seriesId,k)=>step('SeriesReveal',{kind:'series',seriesId},k*MOTION_PRIMITIVES.SeriesReveal.stagger)),step('SlideSmall',{kind:'explanation'})]:[step('SlideSmall',{kind:'view'}),step('SlideSmall',{kind:'explanation'})];
 }
 if(spec.kind==='steps')return [step('RevealMask',{kind:'panel'}),step('FadeIn',{kind:'step-targets',stepId:after.stepId})];
 if(spec.kind==='image-compare')return [step('Crossfade',{kind:'panel'})];
 if(spec.kind==='image-hotspots')return [step('AnnotationReveal',{kind:'panel'})];
 return [];
}
