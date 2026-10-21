import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
/** DWI-063 (workpacks/wes-instrument/TASKS.md): the handoff states each task truthfully, with evidence or a named blocker. */
const read=f=>readFile(new URL(f,import.meta.url),'utf8');
const queue=JSON.parse(await read('../workpacks/wes-instrument/TASKS.json'));
const report=await read('../docs/evidence/dwi/phase-06/report.md');
test('every one of the 29 tasks has a row with a state and a link or a blocker',()=>{
 const rows=report.split('\n').filter(l=>/^\| DWI-\d{3} /.test(l));
 assert.deepEqual(rows.map(l=>l.slice(2,9)),queue.tasks.map(t=>t.id));
 for(const row of rows){const state=row.split('|')[3].trim();assert.ok(['accepted','implemented','blocked','planned'].includes(state.replace(/\*/g,'')),row);assert.ok(/\]\(|blocked|planned/.test(row),row);}
});
test('nothing claims the whole original scope; optional work stays partial',async()=>{
 assert.match(report,/not a claim that the workpack's whole scope is complete/);
 for(const f of ['../docs/en/handoff.md','../docs/zh-CN/handoff.md','../ROADMAP.md'])assert.match(await read(f),/DWI/);
 assert.ok(!/all (films|colours|products) (are|were) (covered|verified)/i.test(report));
});
