# M1 · Top band and autosave — evidence (2026-10-20)

Design guide §9 and §20 M1. Files changed: `public/index.html`, `public/styles.css`, `public/app.js` and the tests that clicked the classic `#save`. Nothing under `src/` changed. No id was removed.

## Screenshots

Isolated Chrome for Testing 151.0.7922.34, temporary studio home, bundled welcome deck, light appearance.

- `m1-topband-1440.png` (1440 × 900): brand, Undo, deck title, green state square, orange Take away.
- `m1-topband-390.png` (390 × 844): brand, Undo, green square, Take away. The title is hidden below 680 px, as before.

Against the §9 diagram: the band holds the logo, Undo, the state square and Take away, plus the title. Save, Present and the language switch are `hidden`, and Redo appears only while Undo is held. Still open for other modules: the 56 px height and the four-colour logo (M0), Present and language in the drawer (M5).

## Test first

`tests/browser_smoke.py` gained an autosave check: type one character and expect `#saveState[data-state="saved"]` within 1.5 s, with the stored revision one higher. Before the change it failed with `Page.wait_for_function: Timeout 1500ms exceeded`. After the change it passed three times in a row at 1.23 s each.

## Autosave and REVISION_CONFLICT, triggered with two tabs

Studio on a temporary home, two tabs of the in-app browser on `deck_welcome` revision 1:

1. Tab A: typed " A" in the headline. The square went `unsaved`, then `saved` without a key or click. The store had revision 2 with "… A".
2. Tab B, still on revision 1: typed " B". Its autosave got `REVISION_CONFLICT`. The square went `attention` (red), the existing banner "Another window saved first…" appeared, no dialog opened, focus stayed in the field and the text kept " B".
3. Tab B: typed "!" and waited 2 s. No new save was made (autosave pauses after a conflict) and the square stayed red.
4. Tab B: pressed ⌘S. The "A newer version was saved elsewhere." dialog opened. "Save as a separate copy" created `deck_a80fe5edd93f46b1` (revision 1, "… B!"). `deck_welcome` stayed at revision 2 with "… A".

The same sequence runs automatically in `tests/browser_acceptance.py` (two pages) and, after a studio restart, in `tests/browser_session_reconnect.mjs`.

## Runs

- `npm run verify`: exit 0; 506 tests, 501 pass, 0 fail, 5 skipped.
- `tests/browser_smoke.py --mode direct`: autosave check plus 19 acceptance checks pass. The run then stops at the narrow-screen drawer step (`#openHistory` sits in the tool rail, outside the open drawer). The unchanged suite at HEAD stops at the same step in fixture mode. The steps after it were run separately: no horizontal overflow at 320, 390, 800, 1024, 1280 and 1600 px; Take away reads 带走 in Chinese. The presenter step's `#pageCount` assertion is stale at HEAD too: presenting keeps its own counter.
- `tests/browser_session_reconnect.mjs`: 6 checks pass. `tests/browser_history_capacity.mjs`: 6 checks pass.
- `tests/browser_media.mjs`: stops at line 32 (standalone HTML 3D layer), before the classic studio steps this change edits. Not verified here.
- Python Playwright 1.60.0 (scratch virtual environment) and Node Playwright 1.61.1 are test tools only. Direct mode needs function predicates such as `"() => …"`, because the studio CSP has no `unsafe-eval`.
