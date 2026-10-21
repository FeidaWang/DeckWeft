import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
/** DWI-051 and DWI-053 (workpacks/wes-instrument/TASKS.md): the Kimi route stays an isolated, unrun option; the coverage audit is a protocol, not a claim. */
const read=f=>readFile(new URL(f,import.meta.url),'utf8');
test('no Kimi code or remote writer is in the repository or its default export path',async()=>{
 assert.deepEqual((await readdir(new URL('../integrations/',import.meta.url))).sort(),['after-effects','figma']);
 for(const f of ['../src/targets/pptx/compile.mjs','../src/targets/pptx/package.mjs','../src/render/export.mjs','../package.json'])assert.ok(!/kimi|pyyaml|pip install/i.test(await read(f)),f);
 const record=await read('../docs/evidence/dwi/phase-05/dwi-051/feasibility.md');
 for(const s of ['not run','Network access','pip install','proprietary writer','DeckWeft keeps its own native export'])assert.ok(record.includes(s),s);
});
test('the coverage audit is recorded as a protocol that keeps outcomes apart and claims nothing exhaustive',async()=>{
 const p=await read('../docs/evidence/dwi/phase-05/dwi-053/protocol.md');
 for(const s of ['**attention**','**comprehension**','**preference**','**persuasion**','No exhaustive survey','State: **planned**'])assert.ok(p.includes(s),s);
 const coverage=JSON.parse(await read('../workpacks/wes-instrument/data/coverage.json'));assert.equal(coverage.scopeComplete,false);
});
