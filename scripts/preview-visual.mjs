import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { renderVisual } from './render-visual.mjs';
if(process.argv.includes('--help')){console.log('Usage: npm run visual:preview\nBuilds the two-language Wave A fixture and serves it on a random loopback port. Open the printed URL. Ctrl+C stops it. No uploads or remote calls.');process.exit(0);}
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist/visual/wave-a');
await renderVisual({out});
const files=new Map();for(const name of ['index.html','wave-a.en.html','wave-a.zh-CN.html'])files.set('/'+name,await readFile(path.join(out,name)));
const server=http.createServer((req,res)=>{
 const host=`127.0.0.1:${server.address().port}`;
 const file=req.url==='/'?'/index.html':req.url;
 if(req.method!=='GET'||req.headers.host!==host||!files.has(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(files.get(file));
});
server.listen(0,'127.0.0.1',()=>console.log(`DeckWeft Wave A: http://127.0.0.1:${server.address().port}/\nCtrl+C stops this local preview.`));
process.once('SIGINT',()=>server.close());process.once('SIGTERM',()=>server.close());
