import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
/** DWI-043 (workpacks/wes-instrument/TASKS.md): whole-task keyboard and recovery flows, from the recorded isolated-browser run.
 * Screen reader and touch results are recorded separately in docs/evidence/dwi/phase-04/report.md (not run). */
const report=JSON.parse(await readFile(new URL('../docs/evidence/dwi/phase-04/browser/report.json',import.meta.url),'utf8'));
const has=re=>assert.ok(report.checks.some(c=>re.test(c)),String(re));
test('keyboard: the dial by keys alone, typing never turns a page, focus returns after dialogs',()=>{
 has(/dial by keyboard: ArrowRight, End \(no wrap\), Home; focus stays on the dial/);has(/arrow keys while editing a field move the caret, not the page/);
 has(/focus returns to Take away and to More after Escape/);has(/focus returns to More/);
});
test('recovery: restore as copy leaves the source deck unchanged; page deletion lands on a neighbour',()=>{
 has(/restore as copy opens a new deck, the source deck is unchanged/);has(/deleting the open page lands on its neighbour/);
 assert.ok([1,2].includes(report.measurements.historyOpenAttempts),'at most one bounded retry of the drawer click');
 assert.ok([1,2].includes(report.measurements.snapshotOpenAttempts),'at most one bounded retry of the version key press');
});
