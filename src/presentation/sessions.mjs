import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {DeckError} from '../core/errors.mjs';
import {sceneToSVG} from '../render/svg.mjs';
import {renderFingerprint} from '../services/measurements.mjs';

const publicRoot=fileURLToPath(new URL('../../public/',import.meta.url));
const fail=(code,message,status=400)=>{throw new DeckError(code,message,status);};
const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const policy=value=>{if(!['full','reduced','off'].includes(value))fail('PRESENTATION_MOTION','Choose full, reduced or off.');return value;};

/** Owns only public derived scenes. Notes/brief/source records never enter this store. */
export class PresentationSessions {
 constructor({now=()=>Date.now(),ttl=4*60*60_000,limit=4}={}){this.now=now;this.ttl=ttl;this.limit=limit;this.entries=new Map();this.bytes=0;}
 prune(){for(const [id,s]of this.entries)if(s.expires<=this.now()){this.bytes-=s.bytes;this.entries.delete(id);}}
 create(project,resolved,{index=0,motion='full'}={}){
  this.prune();policy(motion);
  if(this.entries.size>=this.limit)fail('PRESENTATION_LIMIT','Close an earlier presentation before opening another.',409);
  if(!Number.isInteger(index)||index<0||index>=project.slides.length)fail('PRESENTATION_INDEX','Choose an existing slide.');
  const slides=project.slides.map((slide,i)=>({id:slide.id,title:slide.content.title,motion:slide.motion.preset,svg:sceneToSVG(resolved[i].scene,{title:slide.content.title})}));
  const bytes=Buffer.byteLength(JSON.stringify(slides));
  if(bytes>24_000_000||this.bytes+bytes>64_000_000)fail('PRESENTATION_BUDGET','Use a smaller deck for this presentation.',413);
  const id=randomBytes(16).toString('hex'),key=randomBytes(32).toString('hex');
  this.entries.set(id,{id,key,title:project.title,locale:project.locale,slides,index,motion,sequence:1,command:0,expires:this.now()+this.ttl,lastSeen:null,bytes});this.bytes+=bytes;
  return {id,key,snapshotHash:renderFingerprint(project)};
 }
 get(id){this.prune();const entry=this.entries.get(id);if(!entry)fail('PRESENTATION_ENDED','This presentation ended. Open a new audience window from the presenter.',410);return entry;}
 update(id,value){
  const s=this.get(id);
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['index','motion','command'].includes(k)))fail('PRESENTATION_UPDATE','Use only a slide index, motion policy and command sequence.');
  if(!Number.isInteger(value.index)||value.index<0||value.index>=s.slides.length)fail('PRESENTATION_INDEX','Choose an existing slide.');
  policy(value.motion);
  if(!Number.isSafeInteger(value.command)||value.command<1)fail('PRESENTATION_COMMAND','Use a positive command sequence.');
  if(value.command<s.command)return {sequence:s.sequence,stale:true};
  if(value.command===s.command){if(value.index!==s.index||value.motion!==s.motion)fail('PRESENTATION_CONFLICT','A different command already used this sequence.',409);return {sequence:s.sequence,replayed:true};}
  s.command=value.command;s.index=value.index;s.motion=value.motion;s.sequence++;return {sequence:s.sequence};
 }
 status(id){const s=this.get(id);return {connected:s.lastSeen!==null&&this.now()-s.lastSeen<5000,index:s.index,sequence:s.sequence};}
 revoke(id){const s=this.entries.get(id);if(s){this.bytes-=s.bytes;this.entries.delete(id);}return {ended:true};}
 read(id,authorization){
  const s=this.get(id);
  if(!equal(String(authorization||''),'Bearer '+s.key))fail('AUDIENCE_AUTH','Open the audience link from the presenter.',401);
  s.lastSeen=this.now();
  return {version:1,sequence:s.sequence,title:s.title,locale:s.locale,index:s.index,total:s.slides.length,slide:s.slides[s.index],motion:s.motion};
 }
}

/** A separate origin: no editor session, project API, generic static files or CORS. */
export async function startAudienceServer(sessions){
 let port=0;
 const files={'/':['audience.html','text/html; charset=utf-8'],'/audience.js':['audience.js','text/javascript; charset=utf-8'],'/audience.css':['audience.css','text/css; charset=utf-8']};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  try{
   const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
   if(!hosts.has(req.headers.host)||req.headers['sec-fetch-site']==='cross-site')fail('AUDIENCE_ORIGIN','Use the audience link from the presenter.',403);
   if(req.headers.origin&&!([`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)))fail('AUDIENCE_ORIGIN','This origin cannot access the audience surface.',403);
   const url=new URL(req.url,`http://127.0.0.1:${port}`);
   if(req.method!=='GET')fail('AUDIENCE_READ_ONLY','The audience surface is read-only.',405);
   const match=url.pathname.match(/^\/api\/view\/([a-f0-9]{32})$/);
   if(match)return send(res,200,sessions.read(match[1],req.headers.authorization));
   if(!files[url.pathname])fail('NOT_FOUND','This audience page does not exist.',404);
   const [file,mime]=files[url.pathname];res.writeHead(200,{'Content-Type':mime});res.end(await readFile(path.join(publicRoot,file)));
  }catch(e){send(res,e.status||500,{error:{code:e.code||'AUDIENCE_ERROR',message:e.status?e.message:'The audience view could not refresh.'}});}
 });
 server.requestTimeout=10_000;server.headersTimeout=8000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});port=server.address().port;
 return {server,url:`http://127.0.0.1:${port}`,close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
