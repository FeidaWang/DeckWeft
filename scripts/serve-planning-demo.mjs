// Serve only the two authored audience demo exports on loopback. No filesystem browsing.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const allowed={'/':'browser-measured.html','/planning.html':'browser-measured.html','/planning.pptx':'browser-measured.pptx'};
const server=http.createServer(async(req,res)=>{const host=`127.0.0.1:${server.address().port}`;if(req.headers.host!==host||req.method!=='GET'||!Object.hasOwn(allowed,req.url)){res.writeHead(404);return res.end();}try{const file=allowed[req.url];res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/vnd.openxmlformats-officedocument.presentationml.presentation','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(await readFile(new URL('../dist/mb-06-10/demo/'+file,import.meta.url)));}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1',()=>console.log(`Audience demo: http://127.0.0.1:${server.address().port}/planning.html`));
