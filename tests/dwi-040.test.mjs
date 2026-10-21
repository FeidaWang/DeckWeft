import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
/** DWI-040 (workpacks/wes-instrument/TASKS.md): one obvious next action per state, one position gauge, a viewport fit that keeps scene coordinates.
 * The behaviour is driven in tests/browser_dwi_workbench.mjs; this test pins the shell rules and the recorded run. */
const shell=await readFile(new URL('../public/shell.js',import.meta.url),'utf8');
const report=JSON.parse(await readFile(new URL('../docs/evidence/dwi/phase-04/browser/report.json',import.meta.url),'utf8'));
test('Take away waits while there is no deck, so the first run has one next action',()=>{
 assert.match(shell,/\$\('#openExport'\)\.disabled=\(!!firstRun&&!firstRun\.hidden\)\|\|!document\.querySelector\('#slideList \[data-slide\]'\)/);
 assert.deepEqual(report.measurements.emptyNextActions,['Arrange']);
});
test('one position gauge: the page count is hidden while the dial shows the same position',()=>{
 assert.match(shell,/\$\('#pageCount'\)\.hidden=pages\.length>0/);
 assert.ok(report.checks.some(c=>/one position gauge/.test(c)));
});
test('the scene keeps 1440 px coordinates at every recorded viewport, and Take away and Undo stay on screen',()=>{
 for(const name of ['1366x768','1920x1080','200pct-of-1366x768']){const m=report.measurements[name];assert.equal(m.frameLayoutWidth,1440,name);assert.ok(m.frameShownWidth<1440,name);assert.equal(m.takeAway,true,name);assert.equal(m.undo,true,name);}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
});
