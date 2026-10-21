import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {paletteIds} from '../src/design/palette-registry.mjs';
/** DWI-060 (workpacks/wes-instrument/TASKS.md): every seed palette and mode render-checked; the novice study is a fixed protocol, not a result. */
const read=f=>readFile(new URL(f,import.meta.url),'utf8');
test('all 22 palettes in light, dark and stage (and Chinese light) render with no coverage, fit, contrast or glyph issue',async()=>{
 const r=JSON.parse(await read('../docs/evidence/dwi/phase-06/dwi-060/palette-render-report.json'));
 const key=d=>`${d.palette}/${d.mode}/${d.locale}`,seen=new Set(r.decks.map(key));
 for(const id of paletteIds()){for(const m of ['light','dark','stage'])assert.ok(seen.has(`${id}/${m}/en`),`${id}/${m}`);assert.ok(seen.has(`${id}/light/zh-CN`),id);}
 assert.equal(r.decks.length,88);assert.deepEqual(r.decks.filter(d=>d.issues),[]);assert.deepEqual(r.errors,[]);assert.deepEqual(r.external,[]);
});
test('the novice study fixes tasks and outcomes in advance and reports no invented result',async()=>{
 const p=await read('../docs/evidence/dwi/phase-06/dwi-060/novice-study-protocol.md');
 assert.match(p,/State: \*\*blocked — needs participants\*\*/);assert.match(p,/No session was held and no result is reported/);
 for(const s of ['**Comprehension**','**Preference**','Completion and failure causes'])assert.ok(p.includes(s),s);
});
