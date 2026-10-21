# Phase 04 finding 3: Undo after a page move

2026-10-22. Isolated Chrome for Testing 151.0.7922.34, Node 24.14.0, built on `claude/read-work-package-00-06-256b3e` at `50f2d33`.

## What was observed

In a visual deck, select page 2, press **Move down**, then press **Undo**. The order stayed `collage, violet, evidence, chapter` and the dial still read 3 / 4.

## Cause

Page moves were never left out of the edit history. `movePage` and the strip's `reorder` in [`public/kinds/visual.js`](../../../../../public/kinds/visual.js) post to `/api/visual/move`, which runs `moveScene` in `src/design/rhythm.mjs`. The returned project then goes through `changed()`, which records the previous project for Undo, clears Redo and schedules the autosave. `moveHistory` (Undo and Redo) keeps the latest saved revision, so the next save is still checked against it. When **Undo** is pressed right after **Move down**, the order comes back, both before and after the autosave.

The click on **Undo** never reached the page:

1. Visually hidden `.sr-only` labels (the theme swatch names) sit inside the inspector's scroll box. They are `position:absolute` and the scroll box was not positioned, so they escaped its `overflow:auto`. The studio document was 1290–1337 px tall in a 900 px window.
2. The runner's "no wheel paging" step turns the mouse wheel over the page. That scrolled the whole studio up by 390–437 px, carrying the top band (**Undo**, the deck title) off screen. Any author using a wheel or trackpad over the page sees the same thing.
3. Playwright scrolled **Undo** back into view and clicked it. Before the scroll, that spot had been covered by the out-of-process preview frame, and the press went to the frame. The page recorded a `pointerleave` and no `pointerdown` or `click`.

**Move up** worked because those buttons were still on screen.

## Change

- [`public/styles.css`](../../../../../public/styles.css): `.inspector-scroll` gets `position:relative`, so it is the containing block for its hidden labels. The studio document is now exactly the window height and does not scroll. The scroll box is shared by both deck kinds.
- [`tests/browser_dwi_workbench.mjs`](../../../../../tests/browser_dwi_workbench.mjs):
  - The wheel step also checks that the document does not scroll and that nothing overflows the window.
  - A new step 8 checks the history of a page move:
    - **Move down**, then **Undo**: the original order returns, page 2 stays selected and the dial reads 2 / N.
    - ⌘/Ctrl Shift Z (Redo): the page moves down again.
    - **Undo** once more, then the autosave stores the restored order.
- [`tests/page-move-undo.test.mjs`](../../../../../tests/page-move-undo.test.mjs) checks three things:
  - Undo after `moveScene` restores the order and keeps the latest revision; Redo moves the page again.
  - Both move routes hand their result to `changed()`.
  - The scroll box stays positioned.
- [`tests/dwi-043.test.mjs`](../../../../../tests/dwi-043.test.mjs) checks the new steps in [report.json](report.json).

## Runs

See [runs.txt](runs.txt).

- The Undo step passed in every run that reached it: 12 of 12.
- Six of those 12 runs passed all 16 steps. [report.json](report.json) is one of them (tally-2: no page errors, no external requests, no retries). Its screenshots were not kept.
- The other six runs stopped at later steps that this change does not touch:
  - one at the history-dialog click, where both tries were lost (finding 4);
  - one at **More**;
  - four at the tick step (below).

### The tick-step hang

This is Phase 04 finding 6, open. The tick step turns the dial 20 times quickly, alternating ArrowRight and ArrowLeft. Then the click on the **Tick** checkbox can time out after 30 s, because the page's main thread is busy: a bare `page.evaluate(()=>1)` took 1.8–2.6 s.

A CPU profile taken during the hang shows a loop:

1. The preview sends `deckweft:scene` from `src/render/web/runtime.mjs`.
2. The message handler in `visual.js` calls `selectScene`.
3. `selectScene` redraws the editor, fetches the scope statement and posts `deckweft:select` back to the preview.
4. The runtime publishes every page change it makes, including the ones the studio asked for. So when a report arrives stale, the studio reselects the page it names, and the two sides keep chasing each other's replies.

The unchanged runner on `50f2d33` failed this way three times out of three, right after batch B. The recorded Phase 04 runs did not hit it. It depends on timing and is not changed here.

## Verify

`npm run verify` exits 0: 694 tests, 688 pass, 0 fail, 5 skipped, 1 todo (the existing wording todo).

On a fresh checkout of this branch, `tests/dwi-evidence.test.mjs` fails before any of this change. The DWI evidence records name four `.log` files (`phase-00/dwi-003/export-targets-run.log` and three in `phase-04/dwi-043/`), and `.gitignore` (`*.log`) keeps them out of git. For this run they were copied, still ignored, from the worktree that built the workpack.
