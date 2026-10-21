import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,cp} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {buildPlugin} from '../src/plugin/packager.mjs';
import {temp} from './helpers.mjs';
/** DWI-050 (workpacks/wes-instrument/TASKS.md): only documented host routes; the packaged runtime keeps the handoff and story review offline. */
test('the packaged skill documents the content handoff route and no Slides or Spaces API',async t=>{
 const built=await buildPlugin(await temp(t)),skill=await readFile(path.join(built.directory,'runtime/skills/deck/SKILL.md'),'utf8');
 assert.match(skill,/POST \/api\/visual\/story\/handoff/);assert.match(skill,/There is no Slides\s+or Spaces API behind this route/);
 assert.ok(!/openai slides|slides_api|spaces\.create/i.test(skill));
 for(const f of ['schemas/agent-handoff.schema.json','src/adapters/agent-handoff.mjs','src/planning/story-review.mjs','themes/palettes/wesanderson.json'])await readFile(path.join(built.directory,'runtime',f));
});
test('a copied runtime reviews a handoff offline, with no host research capability',async t=>{
 const built=await buildPlugin(await temp(t)),isolated=path.join(await temp(t),'standalone');await cp(path.join(built.directory,'runtime'),isolated,{recursive:true});
 const {startStudio}=await import(pathToFileURL(path.join(isolated,'src/services/server.mjs'))),app=await startStudio({port:0,home:await temp(t),seed:false});t.after(()=>app.close());
 const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const handoff={format:'deckweft-content-handoff',version:1,agent:{name:'test'},documents:[{id:'notes',title:'Notes',mime:'text/plain',sha256:'0'.repeat(64)}],blocks:[{id:'b1',text:'One claim with 3 numbers',sourceId:'notes',contentStatus:'evidence-required'}],warnings:[]};
 const r=await fetch(app.url+'/api/visual/story/handoff',{method:'POST',headers,body:JSON.stringify({handoff})});assert.equal(r.status,200);
 const files=[{name:'notes.md',base64:Buffer.from('# Local\nNo host needed for 1 outline').toString('base64')}],p=await fetch(app.url+'/api/visual/story/propose',{method:'POST',headers,body:JSON.stringify({documents:files})});assert.equal(p.status,200);
 assert.equal((await fetch(app.url+'/components/slide-dial.js')).status,200);assert.equal((await fetch(app.url+'/studio/story.js')).status,200);
});
