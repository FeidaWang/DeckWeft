/**
 * One cue clock per scene. play, pause, seek, next, previous, restart and the reduced-motion fallback all move this one position
 * and share one pending timer; no other code schedules cue work. `schedule(fn, ms)` returns a cancel function (the scene's resource
 * owner counts it), and `apply(position, reason)` draws the state at a cue boundary. Browser-compatible and free of DOM access.
 */
export function createCueClock({count,schedule,apply,interval=1000,staticState=null}){
 let position=0,playing=false,exploring=false,reduced=false,cancel=null;
 // Reduced motion with a static fallback shows the author's static state and never plays cues; next, previous and seek still apply state.
 const frozen=()=>!!staticState&&staticState.reducedMotion==='static'&&reduced;
 function halt(){if(cancel){const stop=cancel;cancel=null;stop();}playing=false;}
 function go(next,reason){if(!Number.isSafeInteger(next)||next<0||next>count)throw Error('Seek to an existing cue boundary.');position=next;exploring=false;apply(position,reason);}
 function tick(){cancel=null;if(!playing)return;playing=position+1<count;go(position+1,'play');if(playing)cancel=schedule(tick,interval);}
 function start(){playing=true;cancel=schedule(tick,interval);}
 const clock={
  get position(){return position;},get playing(){return playing;},get exploring(){return exploring;},get frozen(){return frozen();},get pending(){return cancel?1:0;},
  seek(next,reason='seek'){halt();go(next,reason);},
  next(){clock.seek(Math.min(count,position+1),'next');},
  previous(){clock.seek(Math.max(0,position-1),'previous');},
  /** Continue from the current boundary; from the end, start again at the authored opening. */
  play(){if(frozen()){clock.toStatic();return false;}halt();if(!count)return false;if(position>=count||exploring){playing=true;go(0,'restart');cancel=schedule(tick,interval);return true;}start();return true;},
  /** Always from the authored opening (position 0). */
  restart(){if(frozen()){clock.toStatic();return false;}halt();playing=count>0;go(0,'restart');if(playing)cancel=schedule(tick,interval);return playing;},
  pause(){halt();},
  /** Manual exploration leaves the cue boundary; the position is kept so next and previous continue from it. */
  explore(){halt();exploring=true;},
  setReduced(value){reduced=!!value;if(frozen())clock.toStatic();},
  toStatic(){halt();if(staticState&&(exploring||position!==staticState.position))go(staticState.position,'static');}
 };
 return clock;
}
