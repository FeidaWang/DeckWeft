// Continue a genuinely reviewed browser run; no synthetic receipt or model call.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {startStudio} from '../src/services/server.mjs';
const out=path.resolve(process.argv[2]||'dist/vis013-live-final'),run=JSON.parse(await readFile(path.join(out,'report.json'),'utf8'));assert.equal(run.ok,true);const app=await startStudio({home:run.home,port:0});
try{const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,Origin:app.url,'Content-Type':'application/json'},base=app.url+'/api/visual/workbench/'+run.id,call=async(endpoint,data)=>{const r=await fetch(base+endpoint,{method:data===undefined?'GET':'POST',headers,...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,value:r.headers.get('Content-Type').startsWith('application/json')?await r.json():await r.text()};};
 const before=(await call('')).value;assert.ok(before.canExport||before.hasLastValid);const html=(await call('/export',before.canExport?{}:{lastValid:true})).value;assert.equal(html,await readFile(path.join(out,'after.html'),'utf8'));
 if(before.canExport)await call('/action',{expectedSequence:before.sequence,action:'revise',host:'local',request:'Use statement-center',sceneIds:['chapter']});let failed;for(let i=0;i<100;i++){failed=(await call('')).value;if(!failed.running)break;await new Promise(r=>setTimeout(r,50));}assert.equal(failed.canExport,false);assert.equal(failed.hasLastValid,true);assert.equal(failed.error.code,'AUTHOR_LOCK');assert.equal((await call('/export',{})).status,409);assert.equal((await call('/export',{lastValid:true})).value,html);
 const restored=await call('/recover',{});assert.equal(restored.value.status,'interrupted');assert.equal(restored.value.hasLastValid,true);await writeFile(path.join(out,'recovery.json'),JSON.stringify({ok:true,sourceRetained:true,currentCandidateBlocked:true,lastAcceptedHtmlByteExact:true,authorLockRetained:true,after:restored.value},null,2));console.log('Actual failed locked revision retained accepted HTML and checkpoint.');
}finally{await app.close();}
