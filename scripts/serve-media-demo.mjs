import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {startStudio} from '../src/services/server.mjs';
const home=new URL('../dist/mb-11-15/demo/library/',import.meta.url).pathname;
const studio=await startStudio({home,port:Number(process.argv[2]||0)});console.log('Studio: '+studio.url);
const files={'/':'media.html','/media.html':'media.html','/media.pptx':'media.pptx'};
const server=http.createServer(async(req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||req.method!=='GET'||!Object.hasOwn(files,req.url)){res.writeHead(404);return res.end();}try{const file=files[req.url];res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/vnd.openxmlformats-officedocument.presentationml.presentation','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(new URL('../dist/mb-11-15/demo/'+file,import.meta.url)));}catch{res.writeHead(404);res.end();}});
server.listen(Number(process.argv[3]||0),'127.0.0.1',()=>console.log('HTML: http://127.0.0.1:'+server.address().port));
process.on('SIGINT',async()=>{server.close();await studio.close();process.exit();});
