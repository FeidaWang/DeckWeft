// Opt-in isolated Chromium capture using Node's built-in WebSocket. No runtime package.
import http from 'node:http';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inspectRenderedPage} from '../quality/render-checks.mjs';
import {rejectSymlinks} from '../services/io.mjs';
import {isolatedBinary,withIsolatedBrowser} from './cdp.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function localCapture(browserPath){
 if(!browserPath)return null;
 return async function capture({project,html,htmlHash,signal,home}){
  const binary=await isolatedBinary(browserPath);
  await rejectSymlinks(home);await mkdir(home,{recursive:true});
  const server=http.createServer((req,res)=>{if(req.method!=='GET'||req.url!=='/artifact'||req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  try{return await withIsolatedBrowser(binary,{signal},async cdp=>{
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
  });}finally{await new Promise(r=>server.close(r));}
 };
}
