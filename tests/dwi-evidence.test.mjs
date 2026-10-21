import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateEvidence} from '../workpacks/wes-instrument/lib/validation.mjs';
/**
 * Every DWI task evidence record (docs/evidence/dwi/phase-XX/dwi-XXX/evidence.json) satisfies the workpack's evidence schema and
 * semantic validator, names artifacts that exist, and never claims an accepted state without a passing check.
 */
const root=fileURLToPath(new URL('..',import.meta.url)),base=path.join(root,'docs/evidence/dwi');
const schema=JSON.parse(await readFile(path.join(root,'workpacks/wes-instrument/schemas/evidence.schema.json'),'utf8'));
const records=[];
for(const phase of (await readdir(base)).filter(d=>/^phase-0\d$/.test(d)))for(const task of (await readdir(path.join(base,phase))).filter(d=>/^dwi-\d{3}$/.test(d))){
 try{records.push({file:`${phase}/${task}/evidence.json`,phase,task,record:JSON.parse(await readFile(path.join(base,phase,task,'evidence.json'),'utf8'))});}catch(e){if(e.code!=='ENOENT')throw e;}
}

test('evidence records exist and match their folder',()=>{
 assert.ok(records.length>=4);
 for(const {file,phase,task,record} of records){assert.equal(record.taskId,task.toUpperCase(),file);assert.equal(record.phase,Number(phase.slice(-2)),file);}
});

test('each record satisfies the evidence schema and the workpack validator',()=>{
 for(const {file,record} of records){
  // src/core/schema.mjs has no type unions, so the schema's shape is checked by key and the semantics by the workpack validator.
  for(const k of schema.required)assert.ok(k in record,`${file}: ${k}`);
  for(const k of Object.keys(record))assert.ok(k in schema.properties,`${file}: unexpected ${k}`);
  for(const c of record.checks)for(const k of Object.keys(c))assert.ok(k in schema.properties.checks.items.properties,`${file}: unexpected check field ${k}`);
  assert.deepEqual(validateEvidence(record),[],file);
 }
});

test('accepted records have passing checks; every artifact path exists',async()=>{
 for(const {file,record} of records){
  if(record.state==='accepted')assert.ok(record.checks.some(c=>c.status==='pass')&&!record.checks.some(c=>c.status==='fail'),file);
  for(const c of record.checks)for(const p of c.artifactPaths)await access(path.join(root,p)).catch(()=>assert.fail(`${file}: missing ${p}`));
 }
});
