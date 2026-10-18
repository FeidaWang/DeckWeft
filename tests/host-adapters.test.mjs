import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,readdir,symlink,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {temp,unzip} from './helpers.mjs';
import {probeHost} from '../src/hosts/capabilities.mjs';
import {hostProcess} from '../src/hosts/process.mjs';
import {runStructuredHost} from '../src/hosts/run-receipt.mjs';
import {parseCodex} from '../src/hosts/codex.mjs';
import {parseClaude,claudeInvocation} from '../src/hosts/claude-code.mjs';
import {draftWithHost,patchWithHost,reviewWithHost} from '../src/hosts/tasks.mjs';
import {createVisualTask} from '../src/agent/director.mjs';
import {executeVisualTool} from '../src/agent/tools.mjs';
import {contentHash} from '../src/scene/web/compile.mjs';
import {createQualityReceipt} from '../src/quality/visual-review.mjs';
import {buildPlugin} from '../src/plugin/packager.mjs';
const ok=stdout=>({exitCode:0,stdout,stderr:'',elapsedMs:1});
const schema={type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false};
const help='--output-schema --output-last-message --json --sandbox --image --json-schema --output-format --input-format --permission-mode "manual"\n --tools --no-chrome --no-session-persistence';
async function fakeProbe(command,args){return ok(args[0]==='--version'?(command==='codex'?'codex-cli 0.160.0':'2.1.288 (Claude Code)'):help);}
function fakeHost(value,mutate=x=>x){return async(command,args,options)=>{
 if(args.includes('--help')||args.includes('--version'))return fakeProbe(command,args);
 const s=command==='codex'?JSON.parse(await readFile(args[args.indexOf('--output-schema')+1],'utf8')):JSON.parse(args[args.indexOf('--json-schema')+1]);
 const result=mutate({requestId:s.properties.requestId.enum[0],...value});
 if(command==='codex'){assert.equal(args.at(-1),'-');assert.ok(!args.includes(options.input));await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(result));return ok('{"type":"turn.completed","usage":{"input_tokens":10}}\n');}
 return ok(JSON.stringify({type:'result',subtype:'success',is_error:false,structured_output:result,modelUsage:{'claude-test':{}}}));
};}
test('preflight records advertised capabilities without auth probes, inference or raw output',async t=>{
 const cwd=await temp(t),calls=[];
 const r=await probeHost({host:'claude-code',cwd,runner:async(...a)=>{calls.push(a);return fakeProbe(...a);}});
 assert.equal(r.authentication.status,'unknown');assert.equal(r.permissionMode,'manual');assert.equal(r.ready,true);assert.match(r.imageInput,/not-delivery-verified/);assert.match(r.billingRoute,/unknown/);assert.equal(calls.length,2);assert.ok(!JSON.stringify(r).includes(cwd));
});
test('missing or failed help is not treated as a usable host',async t=>{const cwd=await temp(t);let n=0;const r=await probeHost({host:'codex',cwd,runner:async()=>++n===1?ok('codex-cli 0.1.0'):{exitCode:1,stdout:help}});assert.equal(r.ready,false);assert.equal(r.structuredOutput,'unavailable-or-unknown');});
test('explicit auth probe discards secret/account-bearing status text',async t=>{const cwd=await temp(t);const r=await probeHost({host:'codex',cwd,authentication:true,runner:async(c,a)=>a[0]==='login'?ok('private@example.com sk-secret-value'):fakeProbe(c,a)});assert.equal(r.authentication.status,'available');assert.ok(!JSON.stringify(r).includes('private@'));});
test('Codex parser requires completion and reads final schema message separately from JSONL',()=>{
 assert.equal(parseCodex('{"answer":"ok"}','{"type":"turn.completed"}').value.answer,'ok');
 assert.throws(()=>parseCodex('{}','{"type":"turn.failed"}'));
 assert.throws(()=>parseCodex('not json','{"type":"turn.completed"}'));
});
test('Claude extracts structured_output only and rejects errors and denied permissions',()=>{
 assert.deepEqual(parseClaude(JSON.stringify({type:'result',subtype:'success',structured_output:{answer:'yes'},result:'not the output'})).value,{answer:'yes'});
 for(const value of [{answer:'wrong'},{type:'result',subtype:'success',is_error:true,structured_output:{}},{type:'result',subtype:'success',structured_output:{},permission_denials:[{}]}])assert.throws(()=>parseClaude(JSON.stringify(value)));
});
test('both adapter paths validate bound request identity and write only safe receipts',async t=>{
 const cwd=await temp(t);
 for(const host of ['codex','claude-code']){
  const r=await runStructuredHost({host,cwd,prompt:'untrusted $(touch marker); private@example.com',schema,live:true,runner:fakeHost({answer:'ok'})});assert.equal(r.ok,true);assert.equal(r.value.answer,'ok');const text=await readFile(r.receiptFile,'utf8');assert.ok(!text.includes('private@'));assert.ok(!text.includes('touch marker'));assert.equal(r.receipt.actualModel,host==='codex'?null:'claude-test');assert.deepEqual(await readdir(path.dirname(r.receiptFile)),['receipt.json']);
 }
});
test('malformed/stale/extra structured results fail without repair or fallback',async t=>{
 const cwd=await temp(t);
 for(const mutate of [x=>({...x,requestId:'old'}),x=>({...x,extra:true}),x=>({...x,answer:42})]){const r=await runStructuredHost({host:'codex',cwd,prompt:'x',schema,live:true,runner:fakeHost({answer:'x'},mutate)});assert.equal(r.ok,false);assert.equal(r.receipt.error,'HOST_SCHEMA_INVALID');}
});
test('host timeout/nonzero/cancellation/output-limit never parse plausible partial output',async t=>{
 const cwd=await temp(t);
 for(const [field,error] of [['timedOut','HOST_TIMEOUT'],['outputLimited','HOST_OUTPUT_LIMIT'],['cancelled','HOST_CANCELLED'],['exitCode','HOST_PROCESS_FAILED']]){const r=await runStructuredHost({host:'codex',cwd,prompt:'x',schema,live:true,runner:async(c,a,o)=>a.includes('--help')||a.includes('--version')?fakeProbe(c,a):({...ok('{}'),[field]:field==='exitCode'?1:true,stderr:'sk-secret-value private@example.com'})});assert.equal(r.ok,false);assert.equal(r.receipt.error,error);assert.ok(!JSON.stringify(r.receipt).includes('private@'));}
});
test('live opt-in and capability host/workspace bindings are checked before invoking a host',async t=>{
 const cwd=await temp(t),other=await temp(t),capabilities=await probeHost({host:'codex',cwd,runner:fakeProbe});
 await assert.rejects(runStructuredHost({host:'codex',cwd,prompt:'x',schema}),/OPT_IN/);
 await assert.rejects(runStructuredHost({host:'claude-code',cwd,prompt:'x',schema,live:true,capabilities}),/MISMATCH/);
 await assert.rejects(runStructuredHost({host:'codex',cwd:other,prompt:'x',schema,live:true,capabilities}),/MISMATCH/);
});
test('process transports prompt literally on stdin, preserves Unicode, and bounds output/timeout/cancel',async t=>{
 const cwd=await temp(t),input='$(touch marker) 中文 👩‍🔬';
 const r=await hostProcess(process.execPath,['-e','process.stdin.pipe(process.stdout)'],{cwd,input});assert.equal(r.stdout,input);assert.equal(r.exitCode,0);assert.deepEqual(await readdir(cwd),[]);
 const timeout=await hostProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{cwd,timeout:30});assert.equal(timeout.timedOut,true);
 const limited=await hostProcess(process.execPath,['-e','process.stdout.write("x".repeat(100000))'],{cwd,maxBytes:64});assert.equal(limited.outputLimited,true);
 const controller=new AbortController();controller.abort();assert.equal((await hostProcess('does-not-exist',[],{cwd,signal:controller.signal})).cancelled,true);
});
test('image transport binds actual bytes and Claude uses native base64 blocks without bypass/bare',async t=>{
 const cwd=await temp(t),source=await readFile(new URL('../public/assets/visual/subject.png',import.meta.url));await writeFile(path.join(cwd,'image.png'),source);
 const runner=fakeHost({answer:'image seen'}),r=await runStructuredHost({host:'codex',cwd,prompt:'inspect',schema,images:['image.png'],live:true,runner:async(c,a,o)=>{if(a.includes('--output-schema')){const staged=a[a.indexOf('--image')+1];assert.ok(staged.startsWith(path.join(cwd,'.deckweft-host-runs')));assert.deepEqual(await readFile(staged),source);}return runner(c,a,o);}});assert.equal(r.ok,true);assert.equal(r.receipt.images.length,1);
 const invoke=claudeInvocation({schema,prompt:'x',images:[{bytes:source,mime:'image/png'}],permissionMode:'manual'});assert.ok(invoke.args.includes('stream-json'));assert.equal(JSON.parse(invoke.input).message.content[1].source.type,'base64');assert.ok(!invoke.args.some(a=>/bare|bypass|fallback/.test(a)));
});
test('symlinked final output and invalid image bytes are refused without importing their content',async t=>{
 const cwd=await temp(t);await writeFile(path.join(cwd,'bad.png'),'not pixels');const image=await runStructuredHost({host:'codex',cwd,prompt:'x',schema,images:['bad.png'],live:true,runner:fakeHost({answer:'x'})});assert.equal(image.receipt.error,'HOST_IMAGE_FORMAT');
 if(process.platform==='win32')return;
 const target=path.join(cwd,'secret');await writeFile(target,'private');
 const r=await runStructuredHost({host:'codex',cwd,prompt:'x',schema,live:true,runner:async(c,a,o)=>{if(!a.includes('--output-schema'))return fakeProbe(c,a);await symlink(target,a[a.indexOf('--output-last-message')+1]);return ok('{"type":"turn.completed"}');}});assert.equal(r.ok,false);assert.equal(await readFile(target,'utf8'),'private');
});
test('host drafts remain unverified content and revisions pass through shared author locks/scope',async t=>{
 const cwd=await temp(t),options={host:'codex',cwd,live:true,runner:fakeHost({outline:'One\nSupplied fact\n---\nTwo\nKeep source\n---\nThree\nReview'})};
 const draft=await draftWithHost({request:'Supplied fact'},options);assert.equal(draft.ok,true);assert.equal(draft.task.project.plan.scenes.length,3);assert.match(draft.task.hostDraft.factualVerification,/unverified/);
 const task=draft.task,scene=task.project.plan.scenes[0];task.scope=[scene.id];const original=structuredClone(task.project);const patch={kind:'composition',sceneId:scene.id,composition:'statement-banner',datasetId:''};
 const changed=await patchWithHost(task,'Make page 1 a banner',{...options,runner:fakeHost(patch)});assert.equal(changed.ok,true);assert.deepEqual(changed.task.project.document,original.document);assert.deepEqual(changed.task.project.plan.scenes.slice(1),original.plan.scenes.slice(1));
 task.project.document.authorOverrides.sceneLocks=[{sceneId:scene.id,fields:['composition']}];
 const locked=await patchWithHost(task,'Make page 1 a banner',{...options,runner:fakeHost(patch)});assert.equal(locked.ok,false);assert.equal(locked.error.code,'AUTHOR_LOCK');
 const escaped=await patchWithHost(task,'change other',{...options,runner:fakeHost({...patch,sceneId:task.project.plan.scenes[1].id})});assert.equal(escaped.ok,false);assert.equal(escaped.error.code,'TOOL_SCOPE');
});
test('host payload omits legacy private-note archive and unrelated extensions',async t=>{
 const cwd=await temp(t),task=createVisualTask({request:'One\nText\n---\nTwo\nMore'});task.project.document.migration.original.private='DO_NOT_SEND';task.project.extensions.secret='DO_NOT_SEND';
 const host=fakeHost({kind:'composition',sceneId:task.scope[0],composition:'statement-banner',datasetId:''});
 await patchWithHost(task,'Change first composition',{host:'codex',cwd,live:true,runner:async(c,a,o)=>{if(a.includes('--output-schema'))assert.ok(!o.input.includes('DO_NOT_SEND'));return host(c,a,o);}});
});
test('review refuses changed capture bytes and incomplete or fabricated image findings',async t=>{
 const cwd=await temp(t),task=createVisualTask({request:'One\nText\n---\nTwo\nMore'}),capture={file:'shot.png',sha256:'a'.repeat(64),reviewRequired:true};
 await writeFile(path.join(cwd,capture.file),await readFile(new URL('../public/assets/visual/subject.png',import.meta.url)));
 task.observation={};task.receipt=createQualityReceipt(task.project,task.observation,{ok:true,issues:[]},[capture]);
 await assert.rejects(reviewWithHost({task},{host:'codex',cwd,live:true,runner:fakeHost({})}),/HASH_MISMATCH/);
});
test('portable package includes adapters/schema/themes and runs visual-task without source scripts',async t=>{
 const cwd=await temp(t),built=await buildPlugin(cwd),zip=unzip(await readFile(built.archive));
 for(const file of ['runtime/src/hosts/codex.mjs','runtime/src/hosts/claude-code.mjs','runtime/src/hosts/tasks.mjs','runtime/src/hosts/task-cli.mjs','runtime/schemas/host-response.schema.json','runtime/themes/cream-collage/1.0.0.json','runtime/public/studio/app.mjs']){
  if(file.includes('/themes/')||file.includes('/studio/'))continue;assert.ok(zip.has(file),file);
 }
 assert.ok([...zip.keys()].some(k=>k.startsWith('runtime/themes/cream-collage/')));assert.ok([...zip.keys()].some(k=>k.startsWith('runtime/public/studio/')));assert.ok(![...zip.keys()].some(k=>/\.(ttf|otf|woff2?)$/.test(k)));
 const brief=path.join(cwd,'brief.json');await writeFile(brief,JSON.stringify({request:'One\nText\n---\nTwo\nMore'}));
 const run=spawnSync(process.execPath,[path.join(built.directory,'runtime/bin/deckweft.mjs'),'visual-task','--brief',brief,'--out',path.join(cwd,'task')],{cwd,encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(await readFile(path.join(cwd,'task/task.json'),'utf8')).status,'preview-ready');
});

test('capability receipt expires and configuration changes require a fresh probe',async t=>{
 const cwd=await temp(t),capabilities=await probeHost({host:'codex',cwd,runner:fakeProbe});
 await mkdir(path.join(cwd,'.codex'));await writeFile(path.join(cwd,'.codex/config.toml'),'# changed metadata only');
 await assert.rejects(runStructuredHost({host:'codex',cwd,prompt:'x',schema,live:true,capabilities,runner:fakeHost({answer:'x'})}),/MISMATCH/);
 const fresh=await probeHost({host:'codex',cwd,runner:fakeProbe}),{id,...body}=fresh;body.checkedAt='2020-01-01T00:00:00.000Z';
 await assert.rejects(runStructuredHost({host:'codex',cwd,prompt:'x',schema,live:true,capabilities:{...body,id:contentHash(body)},runner:fakeHost({answer:'x'})}),/MISMATCH/);
});
test('captured-image path traversal cannot upload a file outside the task workspace',async t=>{
 const cwd=await temp(t),other=await temp(t),file=path.join(other,'private.png');await writeFile(file,await readFile(new URL('../public/assets/visual/subject.png',import.meta.url)));
 const r=await runStructuredHost({host:'codex',cwd,prompt:'x',schema,images:[file],live:true,runner:fakeHost({answer:'x'})});assert.equal(r.ok,false);assert.equal(r.receipt.error,'HOST_IMAGE_SCOPE');
});
test('schema-valid image review still requires every actual capture hash and current block identity',async t=>{
 const cwd=await temp(t),task=createVisualTask({request:'One\nText\n---\nTwo\nMore'}),bytes=await readFile(new URL('../public/assets/visual/subject.png',import.meta.url)),sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(path.join(cwd,'one.png'),bytes);await writeFile(path.join(cwd,'two.png'),bytes);
 task.observation={};task.receipt=createQualityReceipt(task.project,{}, {ok:true,issues:[]},['one.png','two.png'].map(file=>({file,sha256,reviewRequired:true})));
 const options={host:'codex',cwd,live:true},images=['one.png','two.png'].map(file=>({file,sha256,finding:'Visible fixture pixels, not a real layout review.'}));
 const value={verdict:'pass',judgment:'Synthetic controller test only',images,issues:[]};
 assert.equal((await reviewWithHost({task},{...options,runner:fakeHost({...value,images:[images[0]]})})).error,'HOST_REVIEW_FINDINGS_INVALID');
 assert.equal((await reviewWithHost({task},{...options,runner:fakeHost({...value,issues:[{sceneId:task.scope[0],nodeId:'missing',bounds:{x:0,y:0,width:1,height:1},severity:'error',reason:'fixture',suggestion:'fixture'}]})})).ok,false);
 const complete=await reviewWithHost({task},{...options,runner:fakeHost(value)});assert.equal(complete.ok,true);assert.deepEqual(complete.review.images,['one.png','two.png']);
});

test('host drafting cannot drop or alter explicitly supplied source lines or numbers',async t=>{
 const cwd=await temp(t),brief={request:'Arrange this source.',sourceText:'Exact source\nThe supplied value is 12.50 kg.'},options={host:'codex',cwd,live:true};
 const bad=await draftWithHost(brief,{...options,runner:fakeHost({outline:'Exact source\nThe supplied value is 13 kg.'})});assert.equal(bad.ok,false);assert.equal(bad.error,'HOST_CONTENT_COVERAGE');
 const good=await draftWithHost(brief,{...options,runner:fakeHost({outline:brief.sourceText})});assert.equal(good.ok,true);assert.equal(good.task.sourceInput.text,brief.sourceText);
});
test('public CLI rejects accidental live calls and stale revisions before starting a host',async t=>{
 const cwd=await temp(t),bin=new URL('../bin/deckweft.mjs',import.meta.url).pathname,brief=path.join(cwd,'brief.json'),out=path.join(cwd,'task');await writeFile(brief,JSON.stringify({request:'One\nText\n---\nTwo\nMore'}));
 let r=spawnSync(process.execPath,[bin,'visual-task','--brief',brief,'--out',out,'--host','codex'],{cwd,encoding:'utf8'});assert.notEqual(r.status,0);assert.ok(r.stderr.includes('HOST_LIVE_OPT_IN_REQUIRED'));assert.deepEqual(await readdir(cwd),['brief.json']);
 r=spawnSync(process.execPath,[bin,'visual-task','--brief',brief,'--out',out],{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 const before=await readFile(path.join(out,'task.json'),'utf8');
 r=spawnSync(process.execPath,[bin,'visual-task','--task',path.join(out,'task.json'),'--tool','design.patch','--request','Change first','--host','codex','--live','--expected-sequence','0'],{cwd,encoding:'utf8'});assert.notEqual(r.status,0);assert.ok(r.stderr.includes('REVISION_CONFLICT'));assert.equal(await readFile(path.join(out,'task.json'),'utf8'),before);assert.deepEqual((await readdir(out)).sort(),['preview.html','task.json']);
});

test('CLI cancellation terminates the actual child and releases the checkpoint lock',async t=>{
 if(process.platform==='win32')return;
 const cwd=await temp(t),bin=new URL('../bin/deckweft.mjs',import.meta.url).pathname,tools=path.join(cwd,'tools');await mkdir(tools);
 const fake=path.join(tools,'codex');await writeFile(fake,'#!'+process.execPath+'\n'+`import fs from 'node:fs';
const args=process.argv.slice(2);
if(args.includes('--version')){console.log('codex-cli 0.160.0');process.exit(0);}
if(args.includes('--help')){console.log('--output-schema --output-last-message --json --sandbox --image');process.exit(0);}
fs.writeFileSync('fixture-started',String(process.pid));process.stdin.resume();setInterval(()=>{},1000);
`,{mode:0o755});
 // ESM syntax is selected explicitly for this extensionless disposable fixture.
 await writeFile(path.join(tools,'package.json'),'{"type":"module"}');
 const brief=path.join(cwd,'brief.json'),out=path.join(cwd,'out');await writeFile(brief,JSON.stringify({request:'Supplied source'}));
 const child=spawn(process.execPath,[bin,'visual-task','--brief',brief,'--out',out,'--host','codex','--live'],{cwd,env:{...process.env,PATH:tools+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',c=>stderr+=c);child.stdout.resume();const closed=new Promise(resolve=>child.on('close',code=>resolve(code)));t.after(()=>{child.kill('SIGKILL');});
 let pid;for(let n=0;n<200;n++){try{pid=Number(await readFile(path.join(out,'fixture-started'),'utf8'));break;}catch{await new Promise(r=>setTimeout(r,10));}}
 assert.ok(pid,'fixture started');child.kill('SIGINT');const code=await closed;assert.equal(code,1,stderr);assert.match(stderr,/HOST_CANCELLED/);assert.ok(!(await readdir(out)).includes('task.json.lock'));assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
});
