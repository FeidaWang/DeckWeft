import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
/**
 * DWI-000 (workpacks/wes-instrument/TASKS.md): the reuse/conflict map covers the whole queue, points only at files that exist,
 * and the recorded baseline is the inspected commit with its real verify counts.
 */
const root=fileURLToPath(new URL('..',import.meta.url));
const read=rel=>readFile(path.join(root,rel),'utf8');
const map=JSON.parse(await read('docs/evidence/dwi/phase-00/dwi-000/reuse-map.json'));
const queue=JSON.parse(await read('workpacks/wes-instrument/TASKS.json'));

test('every queued task has exactly one disposition, in queue order',()=>{
 assert.deepEqual(map.tasks.map(t=>t.id),queue.tasks.map(t=>t.id));
 for(const t of map.tasks){assert.ok(Object.keys(map.dispositions).includes(t.disposition),t.id);assert.ok(t.plan.length>10,t.id);}
 for(const t of map.tasks.filter(t=>['reuse','extend'].includes(t.disposition)))assert.ok(t.existing.length,`${t.id} names what it reuses`);
});

test('every existing module the map names is in the checkout',async()=>{
 const missing=[];
 for(const t of map.tasks)for(const e of t.existing){const file=e.split(/[#\s]/)[0];try{await access(path.join(root,file));}catch{missing.push(`${t.id}: ${file}`);}}
 assert.deepEqual(missing,[]);
});

test('conflicts name both sides and a resolution',()=>{
 assert.equal(new Set(map.conflicts.map(c=>c.id)).size,map.conflicts.length);
 for(const c of map.conflicts)for(const k of ['workpack','repository','resolution'])assert.ok(c[k],`${c.id}.${k}`);
});

test('the baseline is the inspected commit and its verify run is recorded as it ran',async()=>{
 const inventory=JSON.parse(await read('docs/evidence/dwi/phase-00/inspect-repo.json'));
 assert.equal(inventory.git.head.stdout,map.sourceCommit);
 const log=await read('docs/evidence/dwi/phase-00/verify-baseline.txt');
 assert.match(log,/^EXIT 0$/m);
 const count=k=>Number(log.match(new RegExp(`^ℹ ${k} (\\d+)$`,'m'))[1]);
 assert.deepEqual({tests:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped'),todo:count('todo')},{tests:573,pass:567,fail:0,skipped:5,todo:1});
});
