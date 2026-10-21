# DWI Phase 04 — novice workbench and instrument control

Date: 2026-10-22. Model: as in [Phase 00](../phase-00/report.md#model-and-effort). No renderer or player change.

## What changed

- **DWI-040.** With no deck (the first run showing), **Take away** is disabled, so **Arrange** is the one next action; with a deck, **Take away** is the one primary control. The page count is hidden while the dial shows the same position, so there is one position gauge. Fit-to-window keeps scaling the 1440 px scene; nothing inside it moves.
- **DWI-041.** [`public/components/slide-dial.js`](../../../../public/components/slide-dial.js) in the shared shell toolbar (both deck kinds): a native range input, one detent per page, bounded, no wrap, **‹ ›** buttons as the non-gesture route, selection by stable page id through the kind's `select` (undo and autosave follow). It listens to keys only on itself; there is no wheel handling and an IME composition key is ignored. A quiet static metal treatment in CSS, no animation beyond a 120 ms press, none with reduced motion.
- **DWI-042.** [`public/components/interaction-audio.js`](../../../../public/components/interaction-audio.js): a synthesized 14 ms sine tick (no sound file), off by default, one visible **Tick** preference stored in the browser, audio unlocked only from a click or key on the dial, at most one tick per 50 ms (dropped, never queued), silent in hidden tabs, while presenting and under automation.
- **DWI-043.** Whole-task checks in the isolated browser, below.
- Manuals: [en](../../../en/workbench.md#the-page-dial-and-its-tick-dwi-040-to-dwi-043), [zh-CN](../../../zh-CN/workbench.md#页面旋钮与提示音dwi-040-至-dwi-043).

## Results

| Check | Exit | Result |
|---|---|---|
| `node --test tests/dwi-040…043.test.mjs` | 0 | unit and recorded-run checks pass |
| `node tests/browser_dwi_workbench.mjs` (isolated Chrome for Testing 151), three consecutive runs | 0 | 15 of 15 steps each time; one bounded retry in runs 1 and 3 — [report, screenshots and the three runs](browser/) |
| `node tests/browser_session_reconnect.mjs` | 0 | 6 checks — [log](dwi-043/browser_session_reconnect.log) |
| `node tests/browser_history_capacity.mjs` | 0 | 6 checks — [log](dwi-043/browser_history_capacity.log) |
| `node tests/browser_task_recovery.mjs` | 1 | **not a result**: it needs `dist/visual-task/after.task.json` from a prior `npm run deck:verify`, which was not run — [log](dwi-043/browser_task_recovery.log) |

The 15 steps: empty library with one next action; open deck with one next action, one gauge, no meters, no duplicate ids; dial by ArrowRight/End/Home with focus kept; ‹ › buttons; a pointer drag; no wheel paging; reorder keeps the selection; typing never turns pages; the tick off by default, persisted, and silent for 20 rapid detents under automation; focus back to **Take away** and **More** after Escape; restore as copy with the source deck unchanged and focus back to **More**; classic page deletion lands on a neighbour; a one-page deck disables movement; 1366×768, 1920×1080 and 200 % zoom keep the 1440 px scene with **Take away** and **Undo** on screen; no page errors or external requests.

## Findings

1. **Fixed:** **Take away** was enabled in the empty first run, giving two primary actions.
2. **Open — export dialog:** **Present** and **HTML** are offered with equal weight and no recommended choice, and the dialog shows an engineering line (“Host-added lines … Review attestation: unattested · verdict …”) a novice cannot act on. Which format to recommend is a product decision; not changed.
3. **Open — undo of page moves:** in a visual deck, **Undo** after **Move down** did not restore the order in this run; the dial followed the actual order. Moving back up works. Not changed here.
4. **Flaky input after a dialog opens over the preview:** about one run in three, the first click or key press right after the drawer or the history dialog opens is lost (the preview is an out-of-process frame; recorded earlier in single-entry step 3). The runner retries those two actions once and records the attempts; an author would simply press again, but the loss itself is real.
5. The tick was not heard: automated sessions are silent by design. Its rate limiting and gating are unit-tested with a fake audio context.

## Not run

Screen reader, touch devices, forced colours, Firefox and WebKit. These are separate from the unit and browser results above and are not claimed.

## Next

Phase 05 (DWI-050 needs DWI-023 and DWI-034: met).
