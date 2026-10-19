import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {temp} from './helpers.mjs';
import {parseVerifyLog,liveFields,compareCurrent,checkStatus} from '../scripts/status-summary.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const stages=['verify','types','test','check','build','demo'].map(s=>`> deckweft@0.1.0-alpha.2 ${s}`).join('\n');
const log=(counts='ℹ tests 12\nℹ suites 0\nℹ pass 10\nℹ fail 0\nℹ cancelled 0\nℹ skipped 2\nℹ todo 0')=>`${stages}\n${counts}\nChecked 9 source files: …\n`;

test('F4: a verify log yields its counts only when every stage ran and nothing failed',()=>{
 assert.deepEqual(parseVerifyLog(log()),{total:12,passed:10,failed:0,skipped:2});
 assert.throws(()=>parseVerifyLog(log().replace('> deckweft@0.1.0-alpha.2 demo','')),/stage demo/,'a run that stopped before demo is not a verify pass');
 assert.throws(()=>parseVerifyLog(log('ℹ tests 12\nℹ pass 11\nℹ fail 1\nℹ skipped 0')),/failed/);
 assert.throws(()=>parseVerifyLog(log('ℹ tests 12\nℹ pass 10\nℹ fail 0')),/skipped/);
 assert.throws(()=>parseVerifyLog(log('ℹ tests 12\nℹ pass 9\nℹ fail 0\nℹ skipped 2')),/add up/);
 assert.throws(()=>parseVerifyLog(log()+log()),/one test summary/,'two runs in one log are ambiguous');
});

test('F4: live fields come from the tree, not from hand-written status',async()=>{
 const live=await liveFields(root),pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')),roadmap=JSON.parse(await readFile(path.join(root,'roadmap.json'),'utf8'));
 assert.equal(live.version,pkg.version);assert.equal(live.playerVersion,PLAYER_VERSION);assert.equal(live.rendererVersion,WEB_RENDERER_VERSION);
 assert.deepEqual(live.openAcceptanceGates,roadmap.openAcceptanceGates);
});

test('F4: every disagreement between the generated summary, the tree and PROJECT_STATUS.json is named by field',()=>{
 const current={version:'1',playerVersion:'p.1',rendererVersion:'r.1',browserVersion:'149',openAcceptanceGates:['a'],automatedTests:{command:'npm run verify',commit:'c',worktreeClean:true,log:'l',total:2,passed:2,failed:0,skipped:0}};
 const status={version:'1',playerVersion:'p.1',rendererVersion:'r.1',openAcceptanceGates:['a'],automatedTests:{...current.automatedTests,browserVersion:'149'}};
 const live={version:'1',playerVersion:'p.1',rendererVersion:'r.1',openAcceptanceGates:['a']};
 assert.deepEqual(compareCurrent({current,live,status,counts:{total:2,passed:2,failed:0,skipped:0}}),[]);
 const wrong=compareCurrent({current,live:{...live,playerVersion:'p.2'},status:{...status,automatedTests:{...status.automatedTests,total:3}},counts:{total:2,passed:1,failed:0,skipped:1}});
 assert.ok(wrong.some(f=>f.includes('playerVersion')),'a stale generated file is refused');
 assert.ok(wrong.some(f=>f.includes('PROJECT_STATUS.json automatedTests.total')),'a hand-edited count is refused');
 assert.ok(wrong.some(f=>f.includes('automatedTests.passed')&&f.includes(' log ')),'a summary that no longer matches its log is refused');
});

test('F4: the repository agrees with itself: docs/current-status.json, its verify log, the tree and PROJECT_STATUS.json',async()=>{
 assert.deepEqual(await checkStatus(root),[]);
 const status=JSON.parse(await readFile(path.join(root,'PROJECT_STATUS.json'),'utf8'));
 assert.ok(Array.isArray(status.history)&&status.history.length>=2);
 for(const h of status.history){assert.match(h.commit,/^[0-9a-f]{40}$/);assert.match(h.date,/^\d{4}-\d{2}-\d{2}$/);assert.ok(h.supersededBy);await readFile(path.join(root,h.log));}
 assert.ok(status.historicalPublicationAutomatedTests,'historical evidence records are kept');
});

test('F4: checkStatus refuses a missing generated summary',async t=>{
 const dir=await temp(t);
 for(const file of ['package.json','roadmap.json','PROJECT_STATUS.json'])await writeFile(path.join(dir,file),await readFile(path.join(root,file)));
 const failures=await checkStatus(dir);
 assert.ok(failures.some(f=>f.includes('docs/current-status.json')));
});
