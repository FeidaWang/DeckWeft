export function mountSemanticInteractions(config){
 const system=matchMedia('(prefers-reduced-motion:reduce)'),controllers=new Map(),events=[];let suspended=false,measurementDepth=0,serial=0,measurementSaved=null,measurementFocus=null;
 const language=config.locale==='zh-CN',t=(en,zh)=>language?zh:en,reduced=()=>system.matches;
 // The key states the review gate measures besides the opening: the static state, and every key state of a blueprint A page.
 const measuredStates=scene=>{const out=scene.staticState?[{sceneId:scene.id,keyStateId:scene.staticState.keyStateId,position:scene.staticState.position}]:[];for(const k of scene.blueprintKeyStates||[])if(!out.some(o=>o.keyStateId===k.id))out.push({sceneId:scene.id,keyStateId:k.id,position:k.position});return out;};
 for(const data of config.scenes){
  const scene=document.getElementById(data.id);if(!scene)continue;
  // Markup that only readers without JavaScript need: the player draws the same frozen state itself.
  for(const n of scene.querySelectorAll('[data-static-only]'))n.remove();
  for(const d of scene.querySelectorAll('details[data-static-wrapper]')){d.querySelector(':scope > summary')?.remove();d.replaceWith(...d.childNodes);}
  const fixed=data.staticState||null,statements=[...scene.querySelectorAll('.static-state-note')],blueprint=data.interactions.find(s=>s.kind==='steps'&&s.blueprint)||null;
  const skipTo=fixed?fixed.position:1,state={value:initialInteractionState(data.interactions),position:0,active:false,exploring:false},resources=createSceneResources(),parts=new Map();let timeline=null;
  function options(){return effectiveMotion({...(data.motion||{policy:'off',durationMs:0}),reduced:reduced(),visible:!document.hidden&&!suspended,active:state.active&&!measurementDepth});}
  /** Every state change animates through the same deterministic plan, whether it came from play, seek or exploration. */
  function animate(event,before,after){
   const spec=data.interactions.find(s=>s.id===event.interactionId),part=spec&&parts.get(spec.id),o=options();
   for(const step of motionPlan(spec,spec&&before.find(s=>s.id===spec.id),spec&&after.find(s=>s.id===spec.id),event))for(const node of step.target.kind==='regions'?[scene.querySelector('.regions')]:part?.targets(step.target)||[])resources.animate(node,o,step.primitive,step.delay);
  }
  function draw(){
   for(const s of state.value)parts.get(s.id)?.draw(s);
   // The server-rendered statement of frozen values is true only at the static state.
   for(const n of statements)n.hidden=!fixed||state.exploring||state.position!==fixed.position;
   if(!timeline)return;const q=s=>timeline.querySelector(s),count=data.cues.length,frozen=clock.frozen,toggle=q('[data-cue-pause]');
   q('[data-cue-position]').value=state.position;q('[data-cue-count]').textContent=(state.exploring?t('Exploring · ','探索中 · '):'')+(blueprint?{explain:t('Explain','讲解'),diagram:t('Diagram','图解'),explore:t('Explore','探索')}[state.value.find(s=>s.id===blueprint.id).stage]+' · ':'')+state.position+' / '+count;
   if(blueprint){const stage=state.value.find(s=>s.id===blueprint.id).stage;for(const li of timeline.querySelectorAll('.blueprint-stages li'))if(li.dataset.stage===stage)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');const skip=q('[data-cue-skip]');skip.disabled=!state.exploring&&state.position===skipTo;}
   q('[data-cue-next]').disabled=state.position===count;q('[data-cue-previous]').disabled=state.position===0&&!state.exploring;
   toggle.textContent=clock.playing?t('Pause cues','暂停提示'):t('Play cues','播放提示');toggle.disabled=!count||(!clock.playing&&frozen);q('[data-cue-replay]').disabled=frozen;
   const notice=q('[data-static-fallback]');if(notice)notice.hidden=!frozen;
  }
  function signal(event){events.push({...event,sceneId:data.id,sequence:++serial});if(events.length>200)events.shift();}
  // The one clock: play, pause, seek, next, previous, restart and the reduced-motion fallback all arrive here.
  const clock=createCueClock({count:data.cues.length,staticState:fixed,schedule:(fn,ms)=>resources.schedule(fn,ms),apply(position,reason){
   state.value=seekInteractionState(data.interactions,data.cues,position);state.position=position;state.exploring=false;draw();
   if(reason==='restart'||reason==='replay'){animate({event:'scene.enter'},state.value,state.value);signal({event:'scene.enter',reason:'replay'});}
   else{const cue=data.cues[position-1];if(cue&&reason!=='static')animate(cue,seekInteractionState(data.interactions,data.cues,position-1),state.value);signal(reason==='play'?cue:{event:'timeline.seek',position,reason});}
   scene.dispatchEvent(new CustomEvent('deckweft:interaction',{bubbles:true,detail:{sceneId:data.id,event:'timeline.'+reason,position}}));
  }});
  // Cancels this scene's pending cue timer, finite animations and registered resources together.
  function reset(){clock.pause();resources.dispose();}
  function emit(event){
   const before=state.value,next=reduceInteractionState(data.interactions,state.value,event);reset();clock.explore();state.exploring=true;state.value=next;draw();animate(event,before,next);signal(event);
   scene.dispatchEvent(new CustomEvent('deckweft:interaction',{bubbles:true,detail:{sceneId:data.id,event:event.event}}));
  }
  for(const spec of data.interactions){
   const root=[...scene.querySelectorAll('.region')].find(r=>r.dataset.blockId===spec.blockId),detail=data.components[spec.id],cfg={...detail,spec,sceneId:data.id,locale:config.locale};let part;
   if(spec.kind==='chart-select')part=mountChartSelection(root,cfg,emit);
   else if(spec.kind==='steps')part=spec.blueprint?mountBlueprint(root,cfg,emit):mountStepExplanation(root,cfg,emit);
   else if(spec.kind==='image-hotspots')part=mountImageHotspots(root,cfg,emit);
   else if(spec.kind==='image-compare')part=mountImageComparison(root,[...scene.querySelectorAll('.region')].find(r=>r.dataset.blockId===spec.otherBlockId),cfg,emit);
   if(part)parts.set(spec.id,part);
  }
  if(data.interactions.length||data.cues.length){
   scene.classList.add('has-interactions');timeline=document.createElement('nav');timeline.className='semantic-timeline';timeline.setAttribute('aria-label',t('Scene replay and cue seek','页面重播与步骤定位'));
   const button=(text,key,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset[key]='';b.addEventListener('click',action);timeline.append(b);return b;};
   // Blueprint A: the cue clock is the stage clock, so Previous / Next move between stages and Skip jumps to the complete explanation.
   if(blueprint){const stages=document.createElement('ol');stages.className='blueprint-stages';stages.setAttribute('aria-label',t('Stages','阶段'));for(const [id,label]of [['explain',t('Explain','讲解')],['diagram',t('Diagram','图解')],['explore',t('Explore','探索')]]){const li=document.createElement('li');li.dataset.stage=id;li.textContent=label;stages.append(li);}timeline.append(stages);}
   button(blueprint?t('Replay from Explain','从“讲解”重播'):t('Replay cue sequence','重播提示序列'),'cueReplay',()=>api.restart());button(t('Pause cues','暂停提示'),'cuePause',()=>clock.playing?api.pause():api.play());button(blueprint?t('Previous stage','上一阶段'):t('Previous cue','上一提示'),'cuePrevious',()=>api.previous());button(blueprint?t('Next stage','下一阶段'):t('Next cue','下一提示'),'cueNext',()=>api.next());
   if(blueprint)button(t('Skip to the complete explanation','跳到完整说明'),'cueSkip',()=>api.skip());
   const label=document.createElement('label'),seek=document.createElement('input'),count=document.createElement('output');seek.type='range';seek.min=0;seek.max=data.cues.length;seek.step=1;seek.dataset.cuePosition='';count.dataset.cueCount='';label.append(document.createTextNode(t('Cue position ','提示位置 ')),seek);timeline.append(label,count);seek.addEventListener('input',()=>api.seek(Number(seek.value)));
   if(fixed?.reducedMotion==='static'){const note=document.createElement('span');note.className='interaction-status';note.dataset.staticFallback='';note.hidden=true;note.textContent=t('Reduced motion: the static state is shown and cues do not play.','已减少动态效果：显示静态状态，不自动播放提示。');timeline.append(note);}
   // Chart selection alone has no cue to replay or seek: the timeline stays in the page (its state hooks) but is not shown.
   if(!data.cues.length)timeline.hidden=true;
   scene.querySelector('.folio').after(timeline);
   const fallback=document.createElement('details');fallback.className='interaction-transcript';const summary=document.createElement('summary');summary.textContent=t('All authored explanations and cue order','全部作者说明与提示顺序');fallback.append(summary);for(const spec of data.interactions){if(spec.kind==='steps')for(const step of spec.steps){const p=document.createElement('p');p.textContent=step.label+': '+step.text;fallback.append(p);}}const list=document.createElement('ol');for(const cue of data.cues){const li=document.createElement('li');li.textContent=cue.label||({'data.filter':t('Change chart selection','调整图表选择'),'data.focus':t('Focus one series','聚焦一个系列'),'tab.select':t('Compare images','比较图片'),'step.next':t('Next explanation','下一步说明'),'annotation.reveal':t('Reveal annotation','显示注释')})[cue.event];list.append(li);}fallback.append(list);if(!scene.querySelector('.interaction-transcript')&&(data.cues.length||data.interactions.some(spec=>spec.kind==='steps')))scene.append(fallback);
  }
  const live=()=>{if(!state.active||document.hidden)throw Error('Enter this scene before playing cues.');};
  const atBoundary=position=>{if(!Number.isSafeInteger(position)||position<0||position>data.cues.length)throw Error('Seek to an existing cue boundary.');return position;};
  function show(position){state.exploring=false;state.value=seekInteractionState(data.interactions,data.cues,position);state.position=position;draw();}
  const api={
   dispatch:emit,
   /** Blueprint A: the author's static state (the complete explanation), or Diagram when none is declared. */
   skip(){reset();clock.seek(skipTo,'skip');},
   seek(position){atBoundary(position);reset();clock.seek(position);},
   next(){reset();clock.next();},
   previous(){reset();clock.previous();},
   /** The authored opening, without playing. */
   replay(){reset();clock.seek(0,'replay');},
   /** From the authored opening, playing every cue. */
   restart(){live();reset();clock.restart();draw();},
   /** From the current cue boundary; from the end or after exploring, from the opening. */
   play(){live();clock.play();draw();},
   pause(){reset();draw();},
   activate(value){if(state.active===value)return;state.active=value;if(!value){reset();for(const media of scene.querySelectorAll('audio,video'))media.pause();scene.getAnimations({subtree:true}).forEach(a=>a.cancel());signal({event:'scene.exit'});draw();}else{signal({event:'scene.enter'});animate({event:'scene.enter'},state.value,state.value);}},
   snapshot(){return {sceneId:data.id,active:state.active,position:state.position,playing:clock.playing,exploring:state.exploring,staticPosition:fixed?fixed.position:null,frozen:clock.frozen,state:structuredClone(state.value),resources:resources.snapshot()};},
   measureAt(position){const live=[...scene.querySelectorAll('[aria-live],[role=status]')].map(n=>({node:n,value:n.getAttribute('aria-live')}));for(const {node}of live)node.setAttribute('aria-live','off');const saved={value:state.value,position:state.position,exploring:state.exploring,live};show(position);return saved;},
   showAt:show,
   restoreMeasurement(saved){state.value=saved.value;state.position=saved.position;state.exploring=saved.exploring;draw();for(const {node,value}of saved.live){if(value===null)node.removeAttribute('aria-live');else node.setAttribute('aria-live',value);}},
   reduceMotion(){resources.cancelAnimations();clock.setReduced(reduced());draw();},stop(){reset();},register(release){if(typeof release!=='function')throw Error('Resource cleanup must be a function.');if(!state.active||document.hidden||suspended){release();return ()=>{};}return resources.register(release);}
  };
  controllers.set(data.id,api);
  // The player opens on the author's static state; Replay still starts from the opening. A blueprint A page opens on Explain:
  // its static state is for readers without JavaScript, paged exports and the static reduced-motion fallback.
  if(fixed?.position&&!blueprint)clock.seek(fixed.position,'static');
  draw();
 }
 // Reduced motion follows the reader's system setting; the page carries no separate toggle.
 function applyReduction(){const r=reduced();document.body.classList.toggle('semantic-reduced',r);for(const c of controllers.values())c.reduceMotion();}
 system.addEventListener('change',applyReduction);applyReduction();
 document.addEventListener('click',e=>{const a=e.target.closest('.semantic-annotation a');if(!a?.hash)return;const target=document.getElementById(decodeURIComponent(a.hash.slice(1)));if(target?.closest('.full-source-data'))target.closest('details').open=true;});
 const controller=id=>{const c=controllers.get(id);if(!c)throw Error('Unknown scene identity.');return c;};
 const api={
  updateVisibility(presenting,sceneId){if(measurementDepth)return;for(const [id,c]of controllers)c.activate(!document.hidden&&!suspended&&(presenting?id===sceneId:(()=>{const r=document.getElementById(id).getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;})()));},
  replay(sceneId){controller(sceneId).replay();},
  restart(sceneId){controller(sceneId).restart();},
  play(sceneId){controller(sceneId).play();},
  pause(sceneId){controller(sceneId).pause();},
  seek(sceneId,position){controller(sceneId).seek(position);},
  next(sceneId){controller(sceneId).next();},
  previous(sceneId){controller(sceneId).previous();},
  dispatch(sceneId,event){controller(sceneId).dispatch(event);},
  snapshot(){return [...controllers.values()].map(c=>c.snapshot());},
  events(){return structuredClone(events);},
  registerResource(sceneId,release){return controller(sceneId).register(release);},
  /** Declared static states the review gate measures besides the opening. */
  staticStates(){return config.scenes.filter(s=>controllers.has(s.id)).flatMap(measuredStates);},
  beginMeasurement(){if(!measurementDepth){const n=document.activeElement;measurementFocus={node:n,id:n?.id,chartRegion:n?.matches('.chart-current-view summary')?n.closest('.region'):null};measurementSaved=new Map([...controllers].map(([id,c])=>[id,c.measureAt(0)]));}measurementDepth++;},
  /** Inside a measurement only: draw one scene at a cue boundary; endMeasurement restores every explored view. */
  showMeasurement(sceneId,position){if(!measurementDepth)throw Error('Begin a measurement first.');controller(sceneId).showAt(position);},
  endMeasurement(){measurementDepth=Math.max(0,measurementDepth-1);if(!measurementDepth&&measurementSaved){for(const [id,s]of measurementSaved)controllers.get(id).restoreMeasurement(s);measurementSaved=null;if(measurementFocus?.node&&!measurementFocus.node.isConnected){const n=measurementFocus.id?document.getElementById(measurementFocus.id):measurementFocus.chartRegion?.querySelector('.chart-current-view summary');n?.focus({preventScroll:true});}measurementFocus=null;}},
  dispose(){suspended=true;for(const c of controllers.values()){c.activate(false);c.stop();}}
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const c of controllers.values()){c.activate(false);c.stop();}});
 addEventListener('pagehide',()=>{suspended=true;for(const c of controllers.values()){c.activate(false);c.stop();}});addEventListener('pageshow',()=>{suspended=false;document.dispatchEvent(new Event('deckweft:resume'));});
 window.deckweftInteractions=api;return api;
}
