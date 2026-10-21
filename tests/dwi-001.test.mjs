import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {probeHost} from '../src/hosts/capabilities.mjs';
/**
 * DWI-001 (workpacks/wes-instrument/TASKS.md): the recorded host inventory keeps installation, skill installation, authentication,
 * invocation and export as separate states, matches the recorded probe output, and names no Slides capability.
 */
const root=fileURLToPath(new URL('..',import.meta.url)),dir='docs/evidence/dwi/phase-00/dwi-001';
const read=rel=>readFile(path.join(root,dir,rel),'utf8');
const inventory=JSON.parse(await read('host-capabilities.json'));
const doctor=JSON.parse(await read('doctor-host-both.json'));

test('each host keeps its states separate and claims no invocation without a receipt',()=>{
 for(const h of inventory.hosts){
  for(const s of ['installed','skillInstalled','invokedForDwi','exportedForDwi'])assert.equal(typeof h[s],'boolean',`${h.hostName}.${s}`);
  assert.ok(['not-probed','in-use','available','unavailable-or-unproven'].includes(h.authenticated),h.hostName);
  if(h.exportedForDwi)assert.equal(h.invokedForDwi,true,h.hostName);
  if(h.invokedForDwi)assert.ok(h.evidencePaths.some(p=>/receipt|report/.test(p)),`${h.hostName} needs a run receipt`);
  assert.ok(['not-detected','documented-adapter','experiment-only'].includes(h.slides),h.hostName);
 }
});

test('the recorded versions are the ones the existing probe returned',()=>{
 const byHost=Object.fromEntries(doctor.hosts.map(h=>[h.host,h]));
 const cli=Object.fromEntries(inventory.hosts.map(h=>[h.hostName,h]));
 assert.equal(cli['codex-cli'].checkedVersion,byHost.codex.cliVersion);
 assert.equal(cli['claude-code-cli'].checkedVersion,byHost['claude-code'].cliVersion);
 for(const h of doctor.hosts)assert.deepEqual(h.authentication,{status:'unknown',evidence:'not-probed'});
});

test('no Slides command is documented by either CLI, so none is recorded',async()=>{
 for(const file of ['codex-help.txt','claude-help.txt']){
  const commands=(await read(file)).split('\n').filter(l=>/^\s{2}[a-z][\w-]+\s{2,}/.test(l)).map(l=>l.trim().split(/\s+/)[0]);
  assert.ok(!commands.some(c=>/slide/i.test(c)),file);
 }
 assert.ok(inventory.hosts.every(h=>h.slides==='not-detected'));
});

test('an unavailable host is reported as unavailable, not simulated',async()=>{
 const runner=async()=>({exitCode:127,stdout:'',stderr:'not found',timedOut:false,outputLimited:false,cancelled:false});
 const r=await probeHost({host:'codex',cwd:root,runner});
 assert.equal(r.available,false);assert.equal(r.cliVersion,null);assert.equal(r.ready,false);
});

test('the model routing departure is recorded with an unobserved effort',()=>{
 assert.equal(inventory.modelRouting.observedEffort,null);
 assert.match(inventory.modelRouting.departure,/no Sol model/);
});
