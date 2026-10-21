import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reconcileSelection,step,dialText} from '../public/components/slide-dial.js';
/** DWI-041 (workpacks/wes-instrument/TASKS.md): a bounded slide dial that follows stable page ids. The DOM behaviour is checked in tests/browser_dwi_workbench.mjs. */
test('0, 1 and N pages: bounded, no divide by zero, no wrap',()=>{
 assert.deepEqual(reconcileSelection([],null),{id:null,index:-1,count:0});
 assert.deepEqual(step([],null,1),{id:null,index:-1,count:0});
 assert.deepEqual(step(['a'],'a',5),{id:'a',index:0,count:1});
 assert.deepEqual(step(['a','b','c'],'c',1),{id:'c',index:2,count:3},'no wrap past the last page');
 assert.deepEqual(step(['a','b','c'],'a',-1),{id:'a',index:0,count:3},'no wrap before the first');
 assert.deepEqual(step(['a','b','c'],'a',100),{id:'c',index:2,count:3});
 assert.equal(dialText(2,12),'3 / 12');assert.equal(dialText(0,1,'Intro'),'1 / 1 · Intro');assert.equal(dialText(-1,0),'');
});
test('reorder keeps the selected page; deleting it falls back to its neighbour, never to page 1 by surprise',()=>{
 assert.deepEqual(reconcileSelection(['c','a','b'],'b',2),{id:'b',index:2,count:3});
 assert.deepEqual(reconcileSelection(['a','b','d'],'c',2),{id:'d',index:2,count:3});
 assert.deepEqual(reconcileSelection(['a','b'],'c',2),{id:'b',index:1,count:2});
 assert.throws(()=>reconcileSelection(['a','a'],'a'),/unique/);assert.throws(()=>step(['a'],'a',.5),/whole number/);
});
test('the dial reads keys only on itself: no global wheel, arrow or IME handling',async()=>{
 const src=await readFile(new URL('../public/components/slide-dial.js',import.meta.url),'utf8');
 assert.ok(!/addEventListener\('wheel'/.test(src)&&!/document\.addEventListener|window\.addEventListener/.test(src));
 assert.match(src,/<input type="range"/);assert.match(src,/isComposing\|\|e\.keyCode===229/);
 const shell=await readFile(new URL('../public/shell.js',import.meta.url),'utf8');
 assert.match(shell,/mountSlideDial\(\$\('#slideDial'\),\{select:id=>adapter\.select\(id\)/,'selection goes through the kind, so undo and autosave follow');
});
