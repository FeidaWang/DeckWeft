# M3 · Words and Look, with colour matching — evidence (2026-10-20)

Design guide §5, §9, §11, §14 (right panel) and §20 M3. Built on the uncommitted M1 and M2 work in the same worktree. Files changed: `public/index.html` (only inside `<aside class="inspector">`), `public/styles.css`, `public/app.js`, `tests/browser_acceptance.py`, plus the new `tests/browser_inspector_zones.py`. Nothing under `src/` changed and no render baseline was re-recorded. No id was removed; `themeLabel`, `zoneWordsLabel` and `zoneLookLabel` were added.

## Screenshots

Isolated Chrome for Testing 151.0.7922.34, temporary studio home, bundled welcome deck, light appearance.

- `m3-title-focus-1440.png` (1440 × 900): the cursor is in Title. A 3 px yellow frame surrounds the title block on the canvas. The panel shows WORDS (yellow square) with Small text, Title, Explanation, Points, Numbers and a closed Sources section. Below it is LOOK (blue square) with four swatches, the current one framed in ink. The page actions (Duplicate, ↑, ↓, Delete) follow at the end.
- `m3-zones-drawer-390.png` (390 × 844): below 1050 px the panel is the Edit drawer, shown open with Title focused. It has the same two zones.

## Block-level highlighting: done without touching the renderer

The renderer already marks every text group with `data-node="<slide id>_<role>_<n>"` (`src/layout/scene.mjs`, emitted by `src/render/svg.mjs`). The roles are `eyebrow`, `title`, `body`, `item`, `metric-value` and `metric-label`. So no `data-block` attribute was needed.

- Focus in Small text, Title, Explanation, Points or Numbers adds a rectangle to the preview SVG around the matching groups of the current slide. The rectangle is `.zone-block-frame`: 3 px of `var(--words)`, with a non-scaling stroke and 12 viewBox units of padding.
- When the field draws nothing (for example empty Points), and on Sources, the whole slide gets the 3 px yellow outline instead.
- Focus in Look outlines the whole slide in `var(--look)`. A theme applies to the whole slide.
- `#canvas` carries `zone-words` or `zone-look` while focus is in that zone, and loses it on blur. The frame is drawn again after each preview render. It exists only in the editor preview; exports never see it.

## What is hidden, and how

- The three tabs (`.inspector-tabs`), the panel intro headings, `#notes` and its label, the colour-theme label, and `.quality-panel` each have `hidden`. The swatch group is named by the hidden label through `aria-labelledby`.
- `#semanticControls`, `#stageStyle`, `#role`, `#contentLocale`, `#motion`, `#duration` and their labels and hints are inside one `hidden` wrapper, `.look-later`. A wrapper is used because `storyboard.js` sets `#semanticControls.hidden` itself for planned slides, which would undo an attribute on the element.
- `setTab()` is now an empty function, kept for its existing callers.
- The page actions moved from the middle of the content panel to the end of the inspector. Otherwise they would sit between Numbers and Sources in the Tab order.
- Until a later module puts these back (drawer, Present), the classic workbench has no way to reach: speaker notes, the slide's job, deck language, motion and duration, presentation style, the semantic visual plan, local image import and rights, image generation, and the "Before you export" list. `tests/browser_media.mjs` drives several of these. It was not adapted; it still stops earlier, at line 32.

## How the Tab order was checked

`tests/browser_inspector_zones.py` focuses Small text (`#eyebrow`) and presses the real Tab key nine times. After each press it reads `document.activeElement`. The recorded order is:

Small text → Title → Explanation → Points → Numbers → Sources (`summary`) → Signal → Warm paper → Midnight ink → Quiet ocean.

Hidden controls are skipped because `hidden` removes them from the Tab order. The page actions come after the swatches; the test does not assert them. No screen reader was run. The accessible names come from the visible labels and the swatches' `.sr-only` text.

## Test first

`tests/browser_inspector_zones.py` failed first: there were no `[data-zone]` sections. It now passes 5 of 5:

- Zone structure, square colours, hidden controls, renamed labels, and swatch-only buttons.
- The title frame in yellow; empty Points outlines the slide; blur clears it.
- A swatch changes the theme and outlines the slide in blue.
- The Tab order above.
- Chinese labels: 词 / 样子; 小字 / 标题 / 说明 / 要点 / 数字; 来源.

## Runs

- `npm run verify`: exit 0; 506 tests, 501 pass, 0 fail, 5 skipped.
- `tests/browser_inspector_zones.py`: 5 of 5 pass. `tests/browser_page_strip.py`: 5 of 5 pass.
- `tests/browser_smoke.py --mode direct`: autosave plus 21 acceptance checks pass. The tab keyboard step became a zone check. The run stops at the presenter `#pageCount` step, which is stale at HEAD too.
- `tests/browser_session_reconnect.mjs`: 6 checks pass. `tests/browser_history_capacity.mjs`: 6 checks pass.
