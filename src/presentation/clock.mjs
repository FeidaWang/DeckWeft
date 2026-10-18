// @ts-check
/** Stable boundaries for accumulated fractional cue times. @param {number} seconds */
export function formatTime(seconds){
 if(!Number.isFinite(seconds))throw new RangeError('Use a finite time.');
 const whole=Math.floor(Math.max(0,seconds)+1e-7);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;
}
/** A monotonic, injectable clock; independent of slide animation duration. */
export class PresentationClock {
 /** @param {()=>number} now */
 constructor(now=()=>performance.now()){this.now=now;this.running=false;this.offset=0;this.started=0;}
 seconds(){return this.offset+(this.running?Math.max(0,this.now()-this.started)/1000:0);}
 start(){if(!this.running){this.started=this.now();this.running=true;}}
 pause(){this.offset=this.seconds();this.running=false;}
 /** @param {number} seconds */
 seek(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Use a non-negative time.');this.offset=seconds;this.started=this.now();}
 reset(){this.offset=0;this.started=this.now();this.running=false;}
}
