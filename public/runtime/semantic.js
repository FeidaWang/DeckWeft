export function mountSemanticInteractions(config){
 const system=matchMedia('(prefers-reduced-motion:reduce)'),controllers=new Map(),events=[];let userReduced=false,suspended=false,measurementDepth=0,serial=0,measurementSaved=null,measurementFocus=null;
 const language=config.locale==='zh-CN',t=(en,zh)=>language?zh:en;
 for(const data of config.scenes){
  const scene=document.getElementById(data.id);if(!scene)continue;
  const state={value:initialInteractionState(data.interactions),position:0,active:false,playing:false,exploring:false},resources=createSceneResources(),parts=new Map();
  function options(){return effectiveMotion({...(data.motion||{policy:'off',durationMs:0}),reduced:system.matches||userReduced,visible:!document.hidden&&!suspended,active:state.active&&!measurementDepth});}
  function draw(){for(const s of state.value)parts.get(s.id)?.draw(s);if(timeline){timeline.querySelector('[data-cue-position]').value=state.position;timeline.querySelector('[data-cue-count]').textContent=(state.exploring?t('Exploring · ','探索中 · '):'')+state.position+' / '+data.cues.length;timeline.querySelector('[data-cue-next]').disabled=state.position===data.cues.length;timeline.querySelector('[data-cue-pause]').disabled=!state.playing;}}
  function signal(event){events.push({...event,sceneId:data.id,sequence:++serial});if(events.length>200)events.shift();}
  function emit(event){
   const next=reduceInteractionState(data.interactions,state.value,event);resources.dispose();state.playing=false;state.exploring=true;state.value=next;draw();const part=parts.get(event.interactionId);for(const target of part?.motionTargets||[part?.panel])resources.animate(target,options());signal(event);
   scene.dispatchEvent(new CustomEvent('deckweft:interaction',{bubbles:true,detail:{sceneId:data.id,event:event.event}}));
  }
  let timeline=null;
  for(const spec of data.interactions){
   const root=[...scene.querySelectorAll('.region')].find(r=>r.dataset.blockId===spec.blockId),detail=data.components[spec.id],cfg={...detail,spec,sceneId:data.id,locale:config.locale};let part;
   if(spec.kind==='chart-select')part=mountChartSelection(root,cfg,emit);
   else if(spec.kind==='steps')part=mountStepExplanation(root,cfg,emit);
   else if(spec.kind==='image-hotspots')part=mountImageHotspots(root,cfg,emit);
   else if(spec.kind==='image-compare')part=mountImageComparison(root,[...scene.querySelectorAll('.region')].find(r=>r.dataset.blockId===spec.otherBlockId),cfg,emit);
   if(part)parts.set(spec.id,part);
  }
  if(data.interactions.length||data.cues.length){
   scene.classList.add('has-interactions');timeline=document.createElement('nav');timeline.className='semantic-timeline';timeline.setAttribute('aria-label',t('Scene replay and cue seek','页面重播与步骤定位'));
   const replay=document.createElement('button'),next=document.createElement('button'),label=document.createElement('label'),seek=document.createElement('input'),count=document.createElement('output');replay.textContent=t('Replay cue sequence','重播提示序列');const pause=document.createElement('button');pause.textContent=t('Pause cues','暂停提示');pause.dataset.cuePause='';pause.disabled=true;next.textContent=t('Next cue','下一提示');next.dataset.cueNext='';seek.type='range';seek.min=0;seek.max=data.cues.length;seek.step=1;seek.dataset.cuePosition='';count.dataset.cueCount='';label.append(document.createTextNode(t('Cue position ','提示位置 ')),seek);timeline.append(replay,pause,next,label,count);scene.querySelector('.folio').after(timeline);
   replay.addEventListener('click',()=>api.play());pause.addEventListener('click',()=>api.pause());next.addEventListener('click',()=>api.seek(Math.min(data.cues.length,state.position+1)));seek.addEventListener('input',()=>api.seek(Number(seek.value)));
   const fallback=document.createElement('details');fallback.className='interaction-transcript';const summary=document.createElement('summary');summary.textContent=t('All authored explanations and cue order','全部作者说明与提示顺序');fallback.append(summary);for(const spec of data.interactions){if(spec.kind==='steps')for(const step of spec.steps){const p=document.createElement('p');p.textContent=step.label+': '+step.text;fallback.append(p);}}const list=document.createElement('ol');for(const cue of data.cues){const li=document.createElement('li');li.textContent=cue.label||({ 'data.filter':t('Change chart selection','调整图表选择'),'tab.select':t('Compare images','比较图片'),'step.next':t('Next explanation','下一步说明'),'annotation.reveal':t('Reveal annotation','显示注释')})[cue.event];list.append(li);}fallback.append(list);if(!scene.querySelector('.interaction-transcript'))scene.append(fallback);
  }
  const api={
   dispatch:emit,
   seek(position){const value=seekInteractionState(data.interactions,data.cues,position);resources.dispose();state.playing=false;state.exploring=false;state.position=position;state.value=value;draw();const part=parts.get(data.cues[position-1]?.interactionId);for(const target of part?.motionTargets||[part?.panel])resources.animate(target,options());signal({event:'timeline.seek',position});scene.dispatchEvent(new CustomEvent('deckweft:interaction',{bubbles:true}));},
   replay(){resources.dispose();state.playing=false;state.exploring=false;state.position=0;state.value=initialInteractionState(data.interactions);draw();signal({event:'scene.enter',reason:'replay'});resources.animate(scene.querySelector('.regions'),options());scene.dispatchEvent(new CustomEvent('deckweft:interaction',{bubbles:true}));},
   play(){if(!state.active||document.hidden)throw Error('Enter this scene before playing cues.');api.replay();state.playing=!!data.cues.length;draw();function advance(){if(!state.playing||!state.active||document.hidden||suspended)return;state.position++;state.value=seekInteractionState(data.interactions,data.cues,state.position);state.playing=state.position<data.cues.length;draw();const cue=data.cues[state.position-1];signal(cue);const part=parts.get(cue.interactionId);for(const target of part?.motionTargets||[part?.panel])resources.animate(target,options());scene.dispatchEvent(new CustomEvent('deckweft:interaction',{bubbles:true}));if(state.playing)resources.schedule(advance,1000);}if(state.playing)resources.schedule(advance,1000);},
   pause(){resources.dispose();state.playing=false;draw();},
   activate(value){if(state.active===value)return;state.active=value;if(!value){resources.dispose();state.playing=false;if(timeline)timeline.querySelector('[data-cue-pause]').disabled=true;for(const media of scene.querySelectorAll('audio,video'))media.pause();scene.getAnimations({subtree:true}).forEach(a=>a.cancel());signal({event:'scene.exit'});}else{signal({event:'scene.enter'});resources.animate(scene.querySelector('.regions'),options());}},
   snapshot(){return {sceneId:data.id,active:state.active,position:state.position,playing:state.playing,exploring:state.exploring,state:structuredClone(state.value),resources:resources.snapshot()};},
   measureInitial(){const live=[...scene.querySelectorAll('[aria-live],[role=status]')].map(n=>({node:n,value:n.getAttribute('aria-live')}));for(const {node}of live)node.setAttribute('aria-live','off');const saved={value:state.value,position:state.position,exploring:state.exploring,live};state.exploring=false;state.value=initialInteractionState(data.interactions);state.position=0;draw();return saved;},restoreMeasurement(saved){state.value=saved.value;state.position=saved.position;state.exploring=saved.exploring;draw();for(const {node,value}of saved.live){if(value===null)node.removeAttribute('aria-live');else node.setAttribute('aria-live',value);}},
   reduceMotion(){resources.cancelAnimations();},stop(){resources.dispose();state.playing=false;},register(release){if(typeof release!=='function')throw Error('Resource cleanup must be a function.');if(!state.active||document.hidden||suspended){release();return ()=>{};}return resources.register(release);}
  };
  controllers.set(data.id,api);draw();
 }
 const motion=document.createElement('button');motion.type='button';motion.id='semantic-motion';motion.textContent=t('Reduce motion','减少动态效果');document.querySelector('header nav').append(motion);
 function applyReduction(){const reduced=system.matches||userReduced;document.body.classList.toggle('semantic-reduced',reduced);motion.setAttribute('aria-pressed',String(reduced));motion.disabled=system.matches;if(reduced)for(const c of controllers.values())c.reduceMotion();}
 motion.addEventListener('click',()=>{userReduced=!userReduced;applyReduction();});system.addEventListener('change',applyReduction);applyReduction();
 document.addEventListener('click',e=>{const a=e.target.closest('.semantic-annotation a');if(!a?.hash)return;const target=document.getElementById(decodeURIComponent(a.hash.slice(1)));if(target?.closest('.full-source-data'))target.closest('details').open=true;});
 const api={
  updateVisibility(presenting,sceneId){if(measurementDepth)return;for(const [id,c]of controllers)c.activate(!document.hidden&&!suspended&&(presenting?id===sceneId:(()=>{const r=document.getElementById(id).getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;})()));},
  replay(sceneId){const c=controllers.get(sceneId);if(!c)throw Error('Unknown scene identity.');c.replay();},
  play(sceneId){const c=controllers.get(sceneId);if(!c)throw Error('Unknown scene identity.');c.play();},
  pause(sceneId){const c=controllers.get(sceneId);if(!c)throw Error('Unknown scene identity.');c.pause();},
  seek(sceneId,position){const c=controllers.get(sceneId);if(!c)throw Error('Unknown scene identity.');c.seek(position);},
  dispatch(sceneId,event){const c=controllers.get(sceneId);if(!c)throw Error('Unknown scene identity.');c.dispatch(event);},
  snapshot(){return [...controllers.values()].map(c=>c.snapshot());},
  events(){return structuredClone(events);},
  registerResource(sceneId,release){const c=controllers.get(sceneId);if(!c)throw Error('Unknown scene identity.');return c.register(release);},
  beginMeasurement(){if(!measurementDepth){const n=document.activeElement;measurementFocus={node:n,id:n?.id,chartRegion:n?.matches('.chart-current-view summary')?n.closest('.region'):null};measurementSaved=new Map([...controllers].map(([id,c])=>[id,c.measureInitial()]));}measurementDepth++;},endMeasurement(){measurementDepth=Math.max(0,measurementDepth-1);if(!measurementDepth&&measurementSaved){for(const [id,s]of measurementSaved)controllers.get(id).restoreMeasurement(s);measurementSaved=null;if(measurementFocus?.node&&!measurementFocus.node.isConnected){const n=measurementFocus.id?document.getElementById(measurementFocus.id):measurementFocus.chartRegion?.querySelector('.chart-current-view summary');n?.focus({preventScroll:true});}measurementFocus=null;}},
  dispose(){suspended=true;for(const c of controllers.values()){c.activate(false);c.stop();}}
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const c of controllers.values()){c.activate(false);c.stop();}});
 addEventListener('pagehide',()=>{suspended=true;for(const c of controllers.values()){c.activate(false);c.stop();}});addEventListener('pageshow',()=>{suspended=false;document.dispatchEvent(new Event('deckweft:resume'));});
 window.deckweftInteractions=api;return api;
}
