import {spawn} from 'node:child_process';
/** Bounded stdio transport. Raw output is transient and must never enter receipts. */
export function hostProcess(command,args,{cwd,input='',timeout=120000,maxBytes=2_000_000,signal,env=process.env}={}){
 if(!Number.isSafeInteger(timeout)||timeout<1||timeout>600000)throw Error('Invalid host timeout.');
 return new Promise(resolve=>{
  const started=Date.now();let stdout='',stderr='',bytes=0,done=false,timedOut=false,outputLimited=false,cancelled=!!signal?.aborted,timer,killTimer,child;
  const stop=()=>{if(!child?.pid)return;try{if(process.platform!=='win32')process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch{}killTimer=setTimeout(()=>{try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}},500);killTimer.unref();};
  const abort=()=>{cancelled=true;stop();};
  const finish=(exitCode,error)=>{if(done)return;done=true;clearTimeout(timer);if(!timedOut&&!outputLimited&&!cancelled)clearTimeout(killTimer);signal?.removeEventListener('abort',abort);resolve({exitCode,error,stdout,stderr,timedOut,outputLimited,cancelled,elapsedMs:Date.now()-started});};
  if(cancelled){finish(null,'CANCELLED');return;}
  try{child=spawn(command,args,{cwd,env,shell:false,detached:process.platform!=='win32',windowsHide:true,stdio:['pipe','pipe','pipe']});}catch{finish(null,'SPAWN_FAILED');return;}
  signal?.addEventListener('abort',abort,{once:true});
  const append=key=>chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>maxBytes){outputLimited=true;stop();return;}if(key==='stdout')stdout+=chunk.toString();else stderr+=chunk.toString();};
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',append('stdout'));child.stderr.on('data',append('stderr'));child.stdin.on('error',()=>{});
  child.once('error',()=>finish(null,'SPAWN_FAILED'));child.once('close',code=>finish(code));
  timer=setTimeout(()=>{timedOut=true;stop();},timeout);child.stdin.end(input);
 });
}
