// §5 history capacity: report how many snapshots a deck keeps and how many bytes they use, warn as either
// approaches the suggested limit, say how to clean up, and never delete a snapshot automatically.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir,writeFile,symlink } from 'node:fs/promises';
import { createProject } from '../src/core/model.mjs';
import { ProjectStore,HISTORY_LIMITS } from '../src/services/store.mjs';
import { VisualProjectStore } from '../src/services/visual-store.mjs';
import { createVisualDemo } from '../src/core/visual-demo.mjs';
import { startStudio } from '../src/services/server.mjs';
import { historyCapacityNote } from '../public/history-capacity.js';
import { tFor } from '../public/i18n.js';
import { temp } from './helpers.mjs';
async function saves(s,n){let p=await s.save(createProject({title:'Version 1'}),{create:true});for(let i=2;i<=n;i++)p=await s.save({...p,title:`Version ${i}`},{expectedRevision:p.revision.number});return p;}
const t=tFor('en'),tz=tFor('zh-CN');

test('§5 history: the suggested limits default to 500 snapshots or 200 MB',()=>{
 assert.deepEqual(HISTORY_LIMITS,{snapshots:500,bytes:200_000_000});
 assert.deepEqual(new ProjectStore('/tmp/deckweft-unused').historyLimits,HISTORY_LIMITS);
});

test('§5 history: usage counts snapshot files and bytes and warns at 80% of either limit',async t=>{
 const dir=await temp(t),s=await new ProjectStore(dir,{historyLimits:{snapshots:5,bytes:1_000_000_000}}).init();
 const p=await saves(s,4),usage=await s.historyUsage(p.id),files=(await readdir(path.dirname(s.snapshotFile(p.id,1))));
 assert.equal(usage.snapshots,3);assert.equal(usage.level,'ok');assert.equal(usage.directory,path.join(dir,'history',p.id));
 const bytes=(await Promise.all(files.map(async f=>(await s.snapshot(p.id,Number(f.slice(0,-5)))).bytes))).reduce((a,b)=>a+b,0);
 assert.equal(usage.bytes,bytes);assert.deepEqual(usage.limits,{snapshots:5,bytes:1_000_000_000});
 const near=await s.save({...p,title:'Version 5'},{expectedRevision:p.revision.number});
 assert.equal((await s.historyUsage(p.id)).level,'near');
 const over=await s.save({...near,title:'Version 6'},{expectedRevision:near.revision.number});
 assert.equal((await s.historyUsage(p.id)).level,'over');
 await s.save({...over,title:'Version 7'},{expectedRevision:over.revision.number});
 const after=await s.historyUsage(p.id);assert.equal(after.snapshots,6,'Nothing is deleted past the limit');assert.equal(after.level,'over');
 assert.deepEqual((await s.history(p.id)).length,6);
});

test('§5 history: the byte limit warns on its own and the page carries the usage',async t=>{
 const dir=await temp(t),probe=await new ProjectStore(dir).init(),p=await saves(probe,3),{bytes}=await probe.historyUsage(p.id);
 const s=new ProjectStore(dir,{historyLimits:{snapshots:500,bytes:Math.ceil(bytes/0.85)}});
 const page=await s.historyPage(p.id);assert.equal(page.usage.level,'near');assert.equal(page.usage.snapshots,2);assert.equal(page.retention,'Nothing is pruned automatically.');
 assert.equal((await new ProjectStore(dir,{historyLimits:{snapshots:500,bytes}}).historyUsage(p.id)).level,'over');
});

test('§5 history: a deck without snapshots reports zero and other files are not counted',async t=>{
 const dir=await temp(t),s=await new ProjectStore(dir).init(),p=await saves(s,1);
 assert.deepEqual(await s.historyUsage(p.id),{snapshots:0,bytes:0,limits:HISTORY_LIMITS,level:'ok',directory:path.join(dir,'history',p.id)});
 const q=await s.save({...p,title:'Two'},{expectedRevision:1}),folder=path.dirname(s.snapshotFile(p.id,1));
 await writeFile(path.join(folder,'notes.txt'),'x'.repeat(5000));
 if(process.platform!=='win32')await symlink(path.join(folder,'1.json'),path.join(folder,'9.json'));
 const usage=await s.historyUsage(q.id);assert.equal(usage.snapshots,1);assert.equal(usage.bytes,(await s.snapshot(p.id,1)).bytes);
});

test('§5 history: limits must be positive whole numbers',()=>{
 for(const historyLimits of [{snapshots:0,bytes:1},{snapshots:1,bytes:-1},{snapshots:1.5,bytes:1},{snapshots:1}])assert.throws(()=>new ProjectStore('/tmp/deckweft-unused',{historyLimits}),{code:'HISTORY_LIMITS'});
});

test('§5 history: both studios return the usage with each save and history page',async t=>{
 const home=await temp(t),s=await startStudio({port:0,home,seed:false,historyLimits:{snapshots:2,bytes:1_000_000_000}});t.after(()=>s.close());
 const {token}=await(await fetch(s.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const call=async(route,data,method=data?'POST':'GET')=>{const r=await fetch(s.url+route,{method,headers,...(data?{body:JSON.stringify(data)}:{})});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;};
 let {project:p}=await call('/api/projects',{project:createProject()});
 let saved=await call('/api/projects/'+p.id,{project:p,expectedRevision:1},'PUT');assert.equal(saved.historyUsage.snapshots,1);assert.equal(saved.historyUsage.level,'ok');
 saved=await call('/api/projects/'+p.id,{project:saved.project,expectedRevision:2},'PUT');assert.equal(saved.historyUsage.level,'over');
 assert.equal((await call(`/api/projects/${p.id}/history`)).usage.snapshots,2);
 const visual=await new VisualProjectStore(home).init(),demo=await createVisualDemo('en',visual.home);
 let {project:v}=await call('/api/visual/projects',{project:demo});
 const vs=await call('/api/visual/projects/'+v.id,{project:v,expectedRevision:1},'PUT');assert.equal(vs.historyUsage.snapshots,1);assert.equal(vs.historyUsage.level,'ok');
 const vs2=await call('/api/visual/projects/'+v.id,{project:vs.project,expectedRevision:2},'PUT');assert.equal(vs2.historyUsage.level,'over');
 assert.equal((await call(`/api/visual/projects/${v.id}/history`)).usage.snapshots,2);
});

test('§5 history: the note is empty below the warning and explains cleanup in both languages',()=>{
 const usage={snapshots:420,bytes:12_500_000,limits:HISTORY_LIMITS,level:'near',directory:'/home/a/.deckweft/history/deck_1'};
 assert.equal(historyCapacityNote({...usage,level:'ok'},t),'');assert.equal(historyCapacityNote(undefined,t),'');
 const en=historyCapacityNote(usage,t);
 for(const part of ['420 earlier versions','12.5 MB','500 versions or 200 MB','never deletes','restore any version you still want as a new copy','/home/a/.deckweft/history/deck_1'])assert.ok(en.includes(part),part);
 assert.match(historyCapacityNote({...usage,level:'over'},t),/over the suggested limit/);
 assert.match(historyCapacityNote({...usage,bytes:4200},t),/\(4 KB\)/,'Small histories are not shown as 0.0 MB');
 const zh=historyCapacityNote(usage,tz);for(const part of ['420 个历史版本','12.5 MB','500 个版本或 200 MB','不会自动删除','/home/a/.deckweft/history/deck_1'])assert.ok(zh.includes(part),part);
});
