# M2 · Page strip — evidence (2026-10-20)

Design guide §8, §9 and §20 M2. Built on the uncommitted M1 work in the same worktree. Files changed: `public/index.html`, `public/styles.css`, `public/app.js`, and the tests listed below. Nothing under `src/` changed. Thumbnails keep their `data-slide`, `aria-label` ("Slide N: title") and `aria-current`; they only gained `draggable="true"`.

## Screenshots

Isolated Chrome for Testing 151.0.7922.34, temporary studio home, bundled welcome deck, light appearance.

- `m2-page-strip-1440.png` (1440 × 900), taken mid-drag. Page 5 is held over the left half of page 2: the dragged tile is dimmed and a 2 px ink line stands between pages 1 and 2. Page 1, the current page, has the 2 px ink border. The strip is 120 px high, and five of the six 180 × 101 thumbnails are fully visible.
- `m2-page-strip-390.png` (390 × 844). The strip stays at the top this round, above the canvas toolbar. One thumbnail is fully visible and part of the next shows, followed by `+`. The row scrolls sideways, and the page itself does not scroll horizontally. M8 moves the strip to the bottom.

## Departures from the M2 prompt, and why

- **Grid file.** The `.workspace` column rules live in `public/styles.css`, not `workspace.css`. They changed there, including every media query. The content area is now `minmax(0,1fr) 320px`; at 1050 px and below the inspector is a drawer, so it is `minmax(0,1fr)`.
- **Tool rail.** It is still a grid column (56, 52 or 44 px) in front of those two columns. It still holds Import, History, Settings, Dot, Plan and Rehearse, which move to the drawer in M5. A strict two-column grid would wrap the rail onto its own row.
- **Six thumbnails in one row at 1440.** They don't fit. Six fixed 180 px thumbnails with 16 px gaps need 1160 px. At 1440 the canvas column leaves about 976 px for the list (1032 px even without the rail). The row scrolls sideways instead.
- **Alt+↑ / Alt+↓.** These did not exist before: `keyboardAction` ignored any key with Alt. They are added in `app.js` and call `slideAction('up'/'down')`. They do nothing inside text fields, where Alt+arrows move the caret, during IME composition or in dialogs.
- **Slides button hidden.** `#toggleStory` ("Slides") opened the outline panel as a drawer. That panel is now hidden, so the button got `hidden` too; the strip replaces it at every width.
- **Not reachable until M5.** The hidden outline panel also holds New deck, the library picker, the Visual Studio link and the mobile title field. None of them can be reached from the classic workbench until the drawer exists. Import, History and Settings remain on the tool rail.

## Test first

`tests/browser_page_strip.py` uses the same harness as `browser_smoke.py`. It failed first because `.page-strip` did not exist. Now it passes:

- The strip is above the canvas toolbar and the outline panel is hidden. `+` has the label "Add a slide". The thumbnails are 180 × 101 in one row.
- Dragging page 5 before page 2 shows the drop line during dragover, and the order becomes 1, 5, 2, 3, 4, 6. The labels renumber, and the new order is autosaved to the store.
- Undo restores the original order, and the store follows.
- Alt+↓ and Alt+↑ on the focused thumbnail move the current page and back.
- At 390 px the strip is above the stage, scrolls sideways, and the page does not overflow.

## Runs

- `npm run verify`: exit 0; 506 tests, 501 pass, 0 fail, 5 skipped.
- `tests/browser_page_strip.py --mode direct`: 5 of 5 checks pass.
- `tests/browser_smoke.py --mode direct`: autosave plus 21 acceptance checks pass. The narrow-screen step now opens history from the tool rail, because the Slides drawer it used is gone. The run stops at the presenter `#pageCount` step, which is stale at HEAD too.
- `tests/browser_session_reconnect.mjs`: 6 checks pass. `tests/browser_history_capacity.mjs`: 6 checks pass. `tests/browser_visual_studio.mjs`: ok, 22 checks; it opens the Visual Studio link through the DOM.
- `tests/browser_media.mjs`: still stops at line 32 (the standalone HTML 3D layer), before its classic studio steps. Not verified.
- Reduced motion: the drop line and the dimmed dragged tile have no animation or transition, so nothing changes under `prefers-reduced-motion`. Drag was driven with Playwright's mouse in Chromium. No touch device or screen reader was tested.
