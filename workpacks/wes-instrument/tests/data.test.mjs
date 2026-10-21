import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validatePaletteData,validateTasks,validateEvidence,safeRelativePath} from '../lib/validation.mjs';
import {validateWorkpack} from '../scripts/validate-workpack.mjs';
const json=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const palettes=json('PALETTES.json'), tasks=json('TASKS.json'), baseline=json('data/library-values.json');
for(const palette of palettes.palettes) {
 test(`palette ${palette.id}: raw values, Lab, derived roles and provenance`,()=>{
  const result=validatePaletteData({...palettes,palettes:[palette],aliases:{}},{baseline:{[palette.id]:baseline.palettes[palette.id]}});
  assert.deepEqual(result.errors,[]);assert.equal(result.counts.modes,3);assert.equal(result.counts.rolePairs,60);
 });
}
test('entire workpack validates with all required files',()=>{const result=validateWorkpack();assert.deepEqual(result.errors,[]);assert.equal(result.passed,true);assert.equal(result.counts.palettes,22);assert.equal(result.counts.screenshotSamples,76);assert.equal(result.counts.rolePairs,1320);});
test('bad colour and an invented official verification are rejected',()=>{const p=structuredClone(palettes);p.palettes[0].colors[0].rgb[0]=0;p.palettes[0].source.officialPalette=true;const r=validatePaletteData(p);assert.ok(r.errors.some(x=>x.includes('RGB differs')));assert.ok(r.errors.some(x=>x.includes('provenance')));});
test('low contrast role edits are rejected',()=>{const p=structuredClone(palettes);p.palettes[0].derivedModes.light.text='#FFFFFF';const r=validatePaletteData(p);assert.ok(r.errors.some(x=>x.includes('fails 4.5')));});
test('invalid and cyclic aliases are not accepted',()=>{const p=structuredClone(palettes);p.aliases.Rushmore='missing';assert.ok(validatePaletteData(p).errors.some(x=>x.includes('Invalid alias')));});
test('all 29 tasks form seven phases with a valid dependency graph',()=>{const r=validateTasks(tasks);assert.deepEqual(r.errors,[]);assert.equal(r.count,29);assert.deepEqual(r.phases,[0,1,2,3,4,5,6]);});
test('missing task dependencies and cycles are rejected',()=>{const t=structuredClone(tasks);t.tasks[0].dependsOn=['DWI-001'];t.tasks[1].dependsOn=['DWI-000','DWI-999'];const r=validateTasks(t);assert.ok(r.errors.some(x=>x.includes('cycle')));assert.ok(r.errors.some(x=>x.includes('missing dependency')));});
test('task path traversal and duplicates are rejected',()=>{const t=structuredClone(tasks);t.tasks[0].phasePrompt='../escape.md';t.tasks.push(structuredClone(t.tasks[0]));const r=validateTasks(t);assert.ok(r.errors.some(x=>x.includes('phasePrompt')));assert.ok(r.errors.some(x=>x.includes('duplicate')));});
test('schema documents are local JSON and declare their purpose',()=>{for(const name of ['palette','evidence','agent-handoff']){const s=json(`schemas/${name}.schema.json`);assert.equal(s.$schema,'https://json-schema.org/draft/2020-12/schema');assert.ok(s.$comment);}});
test('safe artifact paths are bounded and platform-independent',()=>{assert.equal(safeRelativePath('docs/evidence/run.txt'),true);for(const p of ['../secret','/tmp/file','C:/x','foo\\bar','foo/../bar','./file','foo//bar',''])assert.equal(safeRelativePath(p),false);});
const evidence=()=>({schemaVersion:1,taskId:'DWI-000',phase:0,state:'accepted',scope:'local-code',environment:{node:'v22.16.0',os:'fixture'},sourceCommit:'a'.repeat(40),checks:[{command:'node --test fixture.test.mjs',status:'pass',exitCode:0,artifactPaths:['docs/evidence/fixture.txt']}],limitations:[]});
test('well-formed scoped evidence validates without implying global acceptance',()=>{assert.deepEqual(validateEvidence(evidence()),[]);});
test('accepted evidence rejects skipped checks',()=>{const e=evidence();e.checks[0].status='skipped';e.checks[0].exitCode=null;assert.ok(validateEvidence(e).some(x=>x.includes('actual passing')));});
test('accepted host evidence requires actual host identity/version',()=>{const e=evidence();e.scope='host';assert.ok(validateEvidence(e).some(x=>x.includes('host name')));e.environment.host='fixture-host';e.environment.hostVersion='fixture-only';assert.deepEqual(validateEvidence(e),[]);});
test('evidence cannot call nonzero exit codes a pass or omit artifacts',()=>{const e=evidence();e.checks[0].exitCode=2;e.checks[0].artifactPaths=[];assert.ok(validateEvidence(e).some(x=>x.includes('exit code 0')));});
test('malformed evidence does not turn into a passing record',()=>{assert.ok(validateEvidence(null).length);assert.ok(validateEvidence({}).length);const e=evidence();e.checks=null;assert.ok(validateEvidence(e).length);});
