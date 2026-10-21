import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectRepo} from '../scripts/inspect-repo.mjs';
test('inspector reads a synthetic checkout without running its scripts',()=>{
 const root=mkdtempSync(join(tmpdir(),'deckweft-workpack-test-'));
 try {
  const run=args=>{const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
  run(['init','--quiet']);
  const pkg=JSON.stringify({name:'synthetic-fixture',scripts:{test:'DO NOT EXECUTE THIS FIXTURE STRING'}});
  writeFileSync(join(root,'package.json'),pkg);
  run(['add','package.json']);run(['-c','user.name=Workpack test fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Synthetic fixture']);
  writeFileSync(join(root,'untracked-note.txt'),'Fixture only');
  const result=inspectRepo(root);
  assert.equal(result.package.name,'synthetic-fixture');assert.match(result.git.head.stdout,/^[a-f0-9]{40}$/);
  assert.match(result.git.status.stdout,/untracked-note/);assert.equal(result.applicationTestsRun,false);
  assert.equal(result.networkUsed,false);assert.equal(result.filesWritten,false);
  assert.equal(readFileSync(join(root,'package.json'),'utf8'),pkg);
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('inspector reports unavailable git/package metadata without simulated success',()=>{
 const root=mkdtempSync(join(tmpdir(),'deckweft-not-repo-'));
 try {const r=inspectRepo(root);assert.equal(r.package,null);assert.notEqual(r.git.head.exitCode,0);assert.ok(r.packageError);}finally{rmSync(root,{recursive:true,force:true});}
});
test('inspector rejects an absent path',()=>{assert.throws(()=>inspectRepo(join(tmpdir(),'absent-deckweft-workpack-0000000000')));});
