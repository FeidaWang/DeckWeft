import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile,readFile,symlink } from 'node:fs/promises';
import { sanitizeOutput,commandProbe,claudePermissionMode,verifyHostArtifacts,hostAcceptance } from '../src/qa/hosts.mjs';
import { fromOutline } from '../src/core/model.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { ROOT } from '../src/plugin/packager.mjs';
import { temp } from './helpers.mjs';
test('DW-020: evidence redacts known tokens, email and supplied local paths',()=>{const text='\u001b[31m/Users/example/file name@example.org sk-123456789012345678 Bearer secret\u001b[0m';const clean=sanitizeOutput(text,['/Users/example']);assert.doesNotMatch(clean,/name@example|sk-123|Bearer secret|\/Users\/example|\u001b/);});
test('DW-020: a truly absent executable is blocked, never a simulated host pass',async()=>{const r=await commandProbe('deckweft-nonexistent-host-81a7293',[]);assert.equal(r.exitCode,null);assert.equal(r.error,'ENOENT');});
test('DW-020: subprocess probes capture a real executable version, not generated evidence',async()=>{const r=await commandProbe(process.execPath,['--version']);assert.equal(r.exitCode,0);assert.equal(r.stdout.trim(),process.version);});
test('DW-020: a hanging subprocess is terminated with a timeout flag',async()=>{const r=await commandProbe(process.execPath,['-e','setTimeout(()=>{},10000)'],{timeout:80});assert.equal(r.timedOut,true);assert.notEqual(r.exitCode,0);});
test('DW-020: Claude normal permission mode follows the installed help and fails closed',()=>{
  assert.equal(claudePermissionMode('--permission-mode <mode>\n (choices: "acceptEdits", "manual", "plan")\n  --plugin-dir <path>'),'manual');
  assert.equal(claudePermissionMode('--permission-mode <mode>\n (choices: "default", "bypassPermissions")\n  --plugin-dir <path>'),'default');
  assert.equal(claudePermissionMode('--permission-mode <mode>\n (choices: "auto", "bypassPermissions")\n  --other "manual"'),null);
  assert.equal(claudePermissionMode('unsupported --help'),null);
});
test('DW-020: invalid timeout is rejected before a workspace or evidence is created',async()=>{
  for(const timeout of [NaN,0,999,600001,1200.5,'120000'])await assert.rejects(hostAcceptance({timeout}),/Task timeout/);
});
test('DW-020: interrupted evidence without a report cannot be overwritten',async t=>{
  const out=await temp(t),file=path.join(out,'codex-task.txt');await writeFile(file,'keep this previous attempt');
  await assert.rejects(hostAcceptance({out}),/Evidence folder is not empty/);
  assert.equal(await readFile(file,'utf8'),'keep this previous attempt');
});
async function artifactFixture(t){
  const work=await temp(t),nonce='fixture-nonce';
  const project=fromOutline('# Fictional club\nFold together.\n---\n# Workshop\nTry a wing.\n---\n# Next flight\nBring paper.',{title:nonce,locale:'en'});
  await writeFile(path.join(work,'host-result.deck.json'),JSON.stringify(project));
  for(const format of ['html','pptx'])await writeFile(path.join(work,`host-result.${format}`),exportDeck(project,format).body);
  return {work,runtime:path.join(ROOT,'bin/deckweft.mjs'),nonce};
}
test('DW-020: artifact verification reruns the real bundled CLI and compares both exports',async t=>{
  const result=await verifyHostArtifacts(await artifactFixture(t));assert.equal(result.files.length,3);assert.equal(result.probes.length,3);assert.ok(result.probes.every(p=>p.exitCode===0));
});
test('DW-020: nonempty fake HTML or PowerPoint cannot satisfy artifact verification',async t=>{
  for(const format of ['html','pptx']){
    const fixture=await artifactFixture(t);await writeFile(path.join(fixture.work,`host-result.${format}`),'not a DeckWeft export');
    await assert.rejects(verifyHostArtifacts(fixture),new RegExp(`Host ${format} does not match`));
  }
});
test('DW-020: an unrelated valid deck cannot satisfy the task nonce check',async t=>{
  const fixture=await artifactFixture(t);await assert.rejects(verifyHostArtifacts({...fixture,nonce:'different-task'}),/task nonce/);
});
test('DW-020: symlinked artifacts are rejected before copying local files into evidence',async t=>{
  if(process.platform==='win32')return;
  const fixture=await artifactFixture(t),other=await temp(t);
  await writeFile(path.join(other,'host-result.deck.json'),'{}');
  await symlink(path.join(fixture.work,'host-result.html'),path.join(other,'host-result.html'));
  await assert.rejects(verifyHostArtifacts({...fixture,work:other}),{code:'SYMLINK_PATH'});
});
test('hardening: evidence redacts JWT, AWS, generic key/password/token shapes and the home directory (best effort, not a guarantee)',()=>{
 const home=process.env.HOME||'/Users/example';
 const text=`token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEFghiJKLmnoPQRstuVWXyz123456 key AKIAIOSFODNN7EXAMPLE api_key=abcdef0123456789 password: hunter2secret token=0123456789abcdef path ${home}/private/deck.json and ~/private/other.json`;
 const clean=sanitizeOutput(text);
 assert.doesNotMatch(clean,/eyJhbGci|AKIAIOSFODNN7EXAMPLE|abcdef0123456789|hunter2secret|0123456789abcdef|~\/private/);assert.ok(!clean.includes(home));
 assert.match(clean,/<redacted>/);assert.match(clean,/<local-path>/);
});
test('F7: a timed-out QA probe also stops the grandchild it spawned (POSIX process group)',{skip:process.platform==='win32'&&'Windows stops the direct child only; tree behaviour is recorded as unverified'},async()=>{
 const script="const {spawn}=require('child_process');const g=spawn(process.execPath,['-e','setTimeout(()=>{},30000)'],{stdio:'ignore'});process.stdout.write(String(g.pid)+'\\n');setTimeout(()=>{},30000);";
 const r=await commandProbe(process.execPath,['-e',script],{timeout:400});
 assert.equal(r.timedOut,true);const gpid=Number(r.stdout.trim());assert.ok(gpid>0,'grandchild pid was printed');
 await new Promise(res=>setTimeout(res,300));
 assert.throws(()=>process.kill(gpid,0),{code:'ESRCH'},'grandchild should be gone');
});
