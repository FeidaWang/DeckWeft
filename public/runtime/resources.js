import {MOTION_PRIMITIVES} from '../../src/motion/primitives.mjs';
/** Every scene owns and releases its finite animation and optional host resources. */
export function createSceneResources(){
 const animations=new Set(),releases=new Set(),timers=new Set();
 return {
  /** One named motion primitive; the final state is the element's own state, so a cancelled or skipped animation leaves it visible. */
  animate(node,options,primitive,delay=0){
   if(!options.enabled||!node?.animate)return;const name=primitive||(node.namespaceURI==='http://www.w3.org/2000/svg'?'FadeIn':'SlideSmall'),p=MOTION_PRIMITIVES[name],duration=Math.min(options.durationMs,p.maxMs)-delay;if(duration<=0)return;
   // S8: a theme's declared motion tokens (distance, easing, delay) shape the primitive; undeclared packs keep 4px, ease-out and no delay.
   const style=node.closest?.('.web-scene')&&getComputedStyle(node.closest('.web-scene')),distance=parseFloat(style?.getPropertyValue('--motion-distance'))||(style?.getPropertyValue('--motion-distance').trim()==='0px'?0:4),easing=style?.getPropertyValue('--motion-easing').trim()||'ease-out',themeDelay=parseFloat(style?.getPropertyValue('--motion-delay'))||0;
   const frames=p.frames.map(f=>f.transform==='translateY(4px)'?{...f,transform:`translateY(${distance}px)`}:f),total=delay+themeDelay;if(duration-themeDelay<=0)return;
   const a=node.animate(frames,{id:name,duration:duration-themeDelay,delay:total,easing,fill:total?'backwards':'none'});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));
  },
  schedule(callback,delay){const timer=setTimeout(()=>{timers.delete(timer);callback();},delay);timers.add(timer);return ()=>{clearTimeout(timer);timers.delete(timer);};},
  cancelAnimations(){for(const a of animations)a.cancel();animations.clear();},
  register(release){if(typeof release!=='function')throw Error('Resource cleanup must be a function.');releases.add(release);return ()=>{if(releases.delete(release))release();};},
  dispose(){for(const timer of timers)clearTimeout(timer);timers.clear();for(const a of animations)a.cancel();animations.clear();for(const release of releases){try{release();}catch{/* Other resources must still be released. */}}releases.clear();},
  snapshot(){return {animations:animations.size,timers:timers.size,registered:releases.size};}
 };
}
