// Opt-in isolated Chromium capture using Node's built-in WebSocket. No runtime package.
import {spawn} from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,mkdir,readFile,writeFile,realpath,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inspectRenderedPage} from '../quality/render-checks.mjs';
import {rejectSymlinks} from '../services/io.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms)),sha=b=>createHash('sha256').update(b).digest('hex');
class CDP {
 constructor(socket){this.socket=socket;this.next=0;this.pending=new Map();this.errors=[];this.requests=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.text);if(m.method==='Network.requestWillBeSent')this.requests.push(m.params.request.url);});socket.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CAPTURE_BROWSER_CLOSED'));}this.pending.clear();});}
 send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.next,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CAPTURE_TIMEOUT'));},15000);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,method,params}));});}
 async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('CAPTURE_EVALUATION_FAILED');return r.result.value;}
 async wait(expression,signal){for(let i=0;i<150;i++){signal?.throwIfAborted();if(await this.evaluate(expression))return;await delay(100);}throw Error('CAPTURE_READY_TIMEOUT');}
}
export function localCapture(browserPath){
 if(!browserPath)return null;
 return async function capture({project,html,htmlHash,signal,home}){
  const binary=await realpath(browserPath);if(/(^|[\\/])Applications([\\/]|$)/i.test(binary)||/(^|[\\/])Applications([\\/]|$)/i.test(browserPath))throw Error('CAPTURE_REQUIRES_ISOLATED_BROWSER');
  await rejectSymlinks(home);await mkdir(home,{recursive:true});const profile=await mkdtemp(path.join(os.tmpdir(),'dw-workbench-capture-'));
  const server=http.createServer((req,res)=>{if(req.method!=='GET'||req.url!=='/artifact'||req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  let child,cdp,socket,launchError;const abort=()=>{socket?.close();child?.kill('SIGTERM');};signal?.addEventListener('abort',abort,{once:true});
  try{
   signal?.throwIfAborted();child=spawn(binary,['--headless=new','--user-data-dir='+profile,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','about:blank'],{stdio:'ignore'});child.on('error',e=>launchError=e);
   let port;for(let i=0;i<100;i++){signal?.throwIfAborted();if(launchError)throw Error('CAPTURE_BROWSER_START_FAILED');try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(100);}}if(!/^\d+$/.test(port||''))throw Error('CAPTURE_BROWSER_START_FAILED');
   const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json(),target=targets.find(t=>t.type==='page');socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});cdp=new CDP(socket);
   await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Network.enable');await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:origin+'/artifact'});await cdp.wait("document.body?.dataset.ready==='true'",signal);
   const captures=[],observations=[],stamp='capture-'+Date.now();
   async function png(file,clip){signal?.throwIfAborted();const result=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,...(clip?{clip}:{} )});const bytes=Buffer.from(result.data,'base64');await writeFile(path.join(home,file),bytes,{flag:'wx',mode:0o600});captures.push({file,sha256:sha(bytes),reviewRequired:true});}
   for(const width of [1440,390]){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await cdp.wait(`window.deckweftFit?.viewport.width===${width}`,signal);observations.push(await cdp.evaluate('('+inspectRenderedPage.toString()+')()'));
    const dimensions=await cdp.send('Page.getLayoutMetrics');await png(stamp+'-'+width+'.png',{x:0,y:0,width:dimensions.cssContentSize.width,height:dimensions.cssContentSize.height,scale:1});
    // Native component captures complement downscaled tall story sheets (maximum 20 images).
    for(const scene of project.plan.scenes.filter(s=>s.blockIds.some(id=>['chart','diagram','image'].includes(project.document.blocks.find(b=>b.id===id)?.type))).slice(0,8)){
     const clip=await cdp.evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(scene.id)}),b=e.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height,scale:1};})()`);await png(stamp+'-'+width+'-'+scene.id+'.png',clip);
    }
   }
   const browser=await cdp.send('Browser.getVersion');return {htmlHash,browser:browser.product,delivery:'Actual opt-in isolated Chromium screenshot bytes and font-ready DOM; explicit image review still required',captures,observations,diagnostics:{errors:cdp.errors,externalRequests:cdp.requests.filter(u=>!u.startsWith(origin+'/')&&!u.startsWith('data:'))},traces:[]};
  }finally{signal?.removeEventListener('abort',abort);socket?.close();if(child){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.exitCode!==null||child.signalCode!==null?r():child.once('exit',r)),delay(2000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}
 };
}
