// Opt-in isolated Chromium over the DevTools protocol, using Node's built-in WebSocket. No runtime package.
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,readFile,realpath,rm} from 'node:fs/promises';
export const delay=ms=>new Promise(r=>setTimeout(r,ms));
export class CDP {
 constructor(socket){this.socket=socket;this.next=0;this.pending=new Map();this.errors=[];this.requests=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.text);if(m.method==='Network.requestWillBeSent')this.requests.push(m.params.request.url);});socket.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CAPTURE_BROWSER_CLOSED'));}this.pending.clear();});}
 send(method,params={},timeout=15000){return new Promise((resolve,reject)=>{const id=++this.next,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CAPTURE_TIMEOUT'));},timeout);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,method,params}));});}
 async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('CAPTURE_EVALUATION_FAILED');return r.result.value;}
 async wait(expression,signal){for(let i=0;i<150;i++){signal?.throwIfAborted();if(await this.evaluate(expression))return;await delay(100);}throw Error('CAPTURE_READY_TIMEOUT');}
}
/** The real browser binary. An installed application bundle is refused: it is not an isolated test browser. */
export async function isolatedBinary(browserPath){
 const binary=await realpath(browserPath);if(/(^|[\\/])Applications([\\/]|$)/i.test(binary)||/(^|[\\/])Applications([\\/]|$)/i.test(browserPath))throw Error('CAPTURE_REQUIRES_ISOLATED_BROWSER');
 return binary;
}
/** Starts the isolated browser in a temporary profile, connects its page target, runs fn(cdp) and always tears both down. */
export async function withIsolatedBrowser(browserPath,{signal,prefix='dw-workbench-capture-'}={},fn){
 const binary=await isolatedBinary(browserPath),profile=await mkdtemp(path.join(os.tmpdir(),prefix));
 let child,socket,launchError;const abort=()=>{socket?.close();child?.kill('SIGTERM');};signal?.addEventListener('abort',abort,{once:true});
 try{
  signal?.throwIfAborted();child=spawn(binary,['--headless=new','--user-data-dir='+profile,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','about:blank'],{stdio:'ignore'});child.on('error',e=>launchError=e);
  let port;for(let i=0;i<100;i++){signal?.throwIfAborted();if(launchError)throw Error('CAPTURE_BROWSER_START_FAILED');try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(100);}}if(!/^\d+$/.test(port||''))throw Error('CAPTURE_BROWSER_START_FAILED');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=targets.find(t=>t.type==='page');socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  return await fn(new CDP(socket));
 }finally{signal?.removeEventListener('abort',abort);socket?.close();if(child){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.exitCode!==null||child.signalCode!==null?r():child.once('exit',r)),delay(2000)]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await Promise.race([new Promise(r=>child.once('exit',r)),delay(1000)]);}}await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}
}
