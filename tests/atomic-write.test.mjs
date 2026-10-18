import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {rename,writeFile,readFile,readdir} from 'node:fs/promises';
import {atomicWrite,renameWrittenFile,readJSON} from '../src/services/io.mjs';
import {temp} from './helpers.mjs';

test('transient Windows replacement failures keep the old JSON intact until atomic success',async t=>{
 const home=await temp(t),file=path.join(home,'checkpoint.json'),pending=path.join(home,'pending.json');await writeFile(file,'{"revision":1}');await writeFile(pending,'{"revision":2}');
 const failures=['EPERM','EACCES','EBUSY'];let calls=0,waits=0;
 await renameWrittenFile(pending,file,{platform:'win32',renameFile:async(...args)=>{const code=failures[calls++];if(code)throw Object.assign(Error('transient replacement contention'),{code});await rename(...args);},wait:async()=>{waits++;assert.deepEqual(await readJSON(file),{revision:1});assert.deepEqual(await readJSON(pending),{revision:2});}});
 assert.equal(waits,3);assert.deepEqual(await readJSON(file),{revision:2});assert.deepEqual(await readdir(home),['checkpoint.json']);
});
test('persistent Windows permission failures stay bounded and retain both original and completed candidate',async t=>{
 const home=await temp(t),file=path.join(home,'checkpoint.json'),pending=path.join(home,'pending.json');await writeFile(file,'original');await writeFile(pending,'candidate');let calls=0,totalWait=0;const denied=Object.assign(Error('access remains denied'),{code:'EPERM'});
 await assert.rejects(renameWrittenFile(pending,file,{platform:'win32',renameFile:async()=>{calls++;throw denied;},wait:async ms=>{totalWait+=ms;}}),e=>e===denied);
 assert.ok(calls>1&&calls<=10);assert.ok(totalWait>0&&totalWait<=1000);assert.equal(await readFile(file,'utf8'),'original');assert.equal(await readFile(pending,'utf8'),'candidate');
});
test('non-Windows permission errors and unrelated Windows errors fail immediately',async t=>{
 const home=await temp(t),file=path.join(home,'checkpoint.json'),pending=path.join(home,'pending.json');await writeFile(file,'original');await writeFile(pending,'candidate');
 for(const [platform,code]of [['darwin','EPERM'],['linux','EACCES'],['win32','ENOENT'],['win32','EISDIR']]){let calls=0;const failure=Object.assign(Error('cannot replace'),{code});await assert.rejects(renameWrittenFile(pending,file,{platform,renameFile:async()=>{calls++;throw failure;},wait:async()=>assert.fail('Unexpected retry')}),e=>e===failure);assert.equal(calls,1);assert.equal(await readFile(file,'utf8'),'original');}
});
test('durable atomic writes remain complete under concurrent checkpoint readers',{timeout:30000},async t=>{
 const home=await temp(t),file=path.join(home,'checkpoint.json');await atomicWrite(file,JSON.stringify({revision:0,payload:'x'.repeat(8192)}));let writing=true,reads=0;
 const writer=(async()=>{try{for(let revision=1;revision<=30;revision++)await atomicWrite(file,JSON.stringify({revision,payload:'x'.repeat(8192)}));}finally{writing=false;}})();
 const reader=(async()=>{do{const current=await readJSON(file);assert.ok(Number.isInteger(current.revision)&&current.revision>=0&&current.revision<=30);assert.equal(current.payload,'x'.repeat(8192));reads++;await new Promise(r=>setTimeout(r,1));}while(writing);})();
 await Promise.all([writer,reader]);assert.equal((await readJSON(file)).revision,30);assert.ok(reads>1);assert.deepEqual(await readdir(home),['checkpoint.json']);
});
