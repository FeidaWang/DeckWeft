/** Named static states on the web player. Embedded only in documents that declare one, so every other export keeps its exact runtime bytes. */
export function applyStaticStates(config,semantic){
 const system=matchMedia('(prefers-reduced-motion:reduce)'),zh=config.locale==='zh-CN',scenes=config.scenes.filter(s=>s.staticState),play=semantic.play;
 const reduced=()=>system.matches||document.body.classList.contains('semantic-reduced'),fallback=s=>s.staticState.reducedMotion==='static';
 // Seeking applies the frozen cue boundary on the existing cue clock: replay still starts from the authored opening.
 const freeze=s=>{const now=semantic.snapshot().find(v=>v.sceneId===s.id);if(now&&(now.playing||now.exploring||now.position!==s.staticState.position))semantic.seek(s.id,s.staticState.position);};
 const parts=new Map();
 for(const s of scenes){
  const scene=document.getElementById(s.id);if(!scene)continue;
  // The server-rendered statement of the frozen values is shown only while the scene is at its static state.
  const statement=scene.querySelector('.static-state-note'),timeline=scene.querySelector('.semantic-timeline');
  if(statement){const sync=()=>{const now=semantic.snapshot().find(v=>v.sceneId===s.id);statement.hidden=!now||now.exploring||now.position!==s.staticState.position;};scene.addEventListener('deckweft:interaction',sync);sync();}
  if(timeline){
   const replay=timeline.querySelector('button:not([data-cue-pause]):not([data-cue-next])'),note=document.createElement('span');
   note.className='interaction-status';note.dataset.staticFallback='';note.hidden=true;note.textContent=zh?'已减少动态效果：显示静态状态，不自动播放提示。':'Reduced motion: the static state is shown and cues do not play.';timeline.append(note);
   parts.set(s.id,{replay,note});
  }
  if(s.staticState.position)freeze(s);
 }
 function apply(){
  const on=reduced();
  for(const s of scenes.filter(fallback)){const part=parts.get(s.id);if(part){if(part.replay)part.replay.disabled=on;part.note.hidden=!on;}if(on)freeze(s);}
 }
 semantic.play=sceneId=>{const s=scenes.find(v=>v.id===sceneId);if(s&&fallback(s)&&reduced()){freeze(s);return;}play(sceneId);};
 system.addEventListener('change',apply);document.getElementById('semantic-motion')?.addEventListener('click',apply);apply();
}
