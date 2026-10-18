/** Every scene owns and releases its finite animation and optional host resources. */
export function createSceneResources(){
 const animations=new Set(),releases=new Set(),timers=new Set();
 return {
  animate(node,options){if(!options.enabled||!node?.animate)return;const a=node.animate(node.namespaceURI==='http://www.w3.org/2000/svg'?[{opacity:.35},{opacity:1}]:[{opacity:.65,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:options.durationMs,easing:'ease-out'});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));},
  schedule(callback,delay){const timer=setTimeout(()=>{timers.delete(timer);callback();},delay);timers.add(timer);return ()=>{clearTimeout(timer);timers.delete(timer);};},
  cancelAnimations(){for(const a of animations)a.cancel();animations.clear();},
  register(release){if(typeof release!=='function')throw Error('Resource cleanup must be a function.');releases.add(release);return ()=>{if(releases.delete(release))release();};},
  dispose(){for(const timer of timers)clearTimeout(timer);timers.clear();for(const a of animations)a.cancel();animations.clear();for(const release of releases){try{release();}catch{/* Other resources must still be released. */}}releases.clear();},
  snapshot(){return {animations:animations.size,timers:timers.size,registered:releases.size};}
 };
}
