import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
/** DWI-062 (workpacks/wes-instrument/TASKS.md): the recorded offline release candidate (scripts/release-candidate.mjs). */
const dir='../docs/evidence/dwi/phase-06/dwi-062/';
const manifest=JSON.parse(await readFile(new URL(dir+'manifest.json',import.meta.url),'utf8'));
test('built twice from a committed source with identical bytes; nothing published',async()=>{
 assert.equal(manifest.format,'deckweft-release-candidate');assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);assert.equal(manifest.worktreeClean,true);
 assert.equal(manifest.reproducible,true);assert.equal(manifest.published,false);
 assert.equal((await readFile(new URL(dir+'SHA256SUMS',import.meta.url),'utf8')).trim(),`${manifest.archive.sha256}  ${manifest.archive.name}`);
});
test('no inputs, secrets, fonts, sounds or home paths in the archive',()=>{assert.deepEqual(manifest.leakScan.findings,[]);assert.ok(manifest.leakScan.entries>100);});
test('a fresh unpack creates, checks and exports with the network denied',()=>{
 assert.equal(manifest.offline.passed,true);assert.match(manifest.offline.networkDenied,/deny network/);
 assert.deepEqual(manifest.offline.steps.map(s=>[s.argv.split(' ')[0],s.status]),[['new',0],['check',0],['export',0],['export',0],['doctor',0]]);
 for(const v of Object.values(manifest.offline.outputs))assert.match(v,/^[a-f0-9]{64}$/);
});
test('the capability matrix keeps installed, run and verified apart',async()=>{
 const m=JSON.parse(await readFile(new URL(dir+'capability-matrix.json',import.meta.url),'utf8'));
 for(const row of m.rows){assert.ok(['verified','implemented','blocked','not-run','disabled'].includes(row.state),row.capability);assert.ok(row.evidence||row.state!=='verified',row.capability);}
 assert.equal(m.rows.find(r=>r.capability==='PowerPoint application check').state,'blocked');
 assert.equal(m.rows.find(r=>r.capability==='PDF and DOCX intake').state,'disabled');
});
