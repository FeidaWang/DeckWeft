import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,readFile,realpath,rm} from 'node:fs/promises';
import {createVisualDemo} from '../src/core/visual-demo.mjs';
import {moveScene} from '../src/design/rhythm.mjs';
import {EditHistory} from '../public/interaction.js';
/** DWI Phase 04 finding 3: “Undo after Move down did not restore the order” in a visual deck. A page move was always an ordinary
 * edit (movePage → changed()); the lost Undo was a lost click. The studio document scrolled because `.sr-only` labels in the
 * inspector escaped its scroll box, a wheel over the page carried the top band off screen, and the press after scrolling Undo
 * back into view went to the out-of-process preview frame. The browser step is in tests/browser_dwi_workbench.mjs. */
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');

test('a page move is an ordinary edit: Undo restores the order and keeps the latest revision, Redo moves the page again',async t=>{
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-move-undo-')));t.after(()=>rm(home,{recursive:true,force:true}));
 const p=await createVisualDemo('en',home),order=p.plan.scenes.map(s=>s.id),h=new EditHistory();
 h.capture(p,order[1]);const moved=moveScene(p,order[1],1);moved.revision={...moved.revision,number:3};
 assert.deepEqual(moved.plan.scenes.map(s=>s.id),[order[0],order[2],order[1],...order.slice(3)]);
 const undo=h.step(moved,order[1]);assert.deepEqual(undo.project.plan.scenes.map(s=>s.id),order);assert.equal(undo.active,order[1]);assert.equal(undo.project.revision.number,3,'the next save is checked against the saved revision');
 const redo=h.step(undo.project,undo.active,true);assert.deepEqual(redo.project.plan.scenes.map(s=>s.id),moved.plan.scenes.map(s=>s.id));
});

test('the visual kind hands every page move to changed(), so Undo, Redo and autosave follow',async()=>{
 const js=await read('public/kinds/visual.js'),body=name=>js.slice(js.indexOf(`function ${name}(`)).split('\n')[0];
 assert.match(body('movePage'),/json\('\/api\/visual\/move'.*changed\(\(\)=>state\.project=project/);
 assert.match(js.slice(js.indexOf('async function reorder(')).split('\n').slice(0,4).join('\n'),/changed\(\(\)=>\{state\.project=project;state\.active=id;\}/);
 assert.match(body('changed'),/state\.undo\.push\(before\).*state\.redo=\[\].*scheduleSave\(\)/);
 assert.match(body('moveHistory'),/state\.project\.revision=rev.*scheduleSave\(\)/);
});

test('the studio does not scroll: the inspector scroll box contains its visually hidden labels',async()=>{
 const css=await read('public/styles.css');
 assert.match(css,/\.sr-only,[^{]*\{position:absolute/,'visually hidden labels are absolutely positioned');
 assert.match(css,/\.inspector-scroll\{position:relative;overflow-y:auto/,'their scroll box is their containing block, so they cannot stretch the page');
});
