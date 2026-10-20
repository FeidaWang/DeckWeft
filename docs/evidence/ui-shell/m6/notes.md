# M6 · First run: paste and start — evidence (2026-10-20)

Design guide §10 and §20 M6. Built on the uncommitted M1–M3 work in the same worktree. Files changed: `public/index.html`, `public/styles.css`, `public/app.js`, the new `tests/browser_first_run.mjs`, and one `src/` change approved by the author (below).

## Decisions taken with the author

- **Example deck route (`src/services/server.mjs`).** The studio serves only whitelisted static files, and the welcome decks were not on the list. The author approved two whitelist entries, `/examples/welcome.deck.json` and `/examples/welcome.zh-CN.deck.json`, written like the existing `/showcase.deck.json`. No other server logic changed. They are meant to go in a commit of their own.
- **Seeding stays as it is.** `deckweft studio` still seeds the welcome deck into an empty home. So a fresh install opens the welcome deck, and the paste box appears only when the library is really empty. The browser test therefore starts the studio with `startStudio({seed:false})` on an empty temporary home. A plain `deckweft studio --home <empty folder>` will not show it.

## What the first screen does

- `boot()` with no readable deck calls `showFirstRun()` and no longer creates "My first deck". The stage then shows `<form id="firstRun">` with three parts:
  - a canvas-sized textarea with the placeholder "Paste what you want to say here. Leave a blank line between pages." (把你要讲的话贴在这里。每一页之间空一行。);
  - Arrange (排好);
  - See an example first (先看个例子).
- The page strip, the canvas toolbar and caption, the layout choices and the inspector are hidden. The state square is hollow ("No deck yet"), and Undo and Take away are disabled. The tool rail stays until the drawer (M5).
- **Arrange** reuses the outline dialog's handler. It writes the text into `#outline` and awaits `#outlineForm.onsubmit`; no parsing code was copied. `fromOutline` splits pages on `---` lines only, so blank lines are turned into `\n---\n` first. Within a page, the first line becomes the title and the rest the explanation. Errors from the handler are shown under the paste box. The handler now uses the interface language for the new deck when no deck is open; before, it always used `en`.
- **See an example first** is a button styled as a link, because it acts rather than navigates. It fetches `/examples/welcome.deck.json`, or `/examples/welcome.zh-CN.deck.json` for the Chinese interface. It then imports and saves the deck through `/api/import` and `/api/projects`, the same route the feature tour uses.
- **Dropping a file.** A `.json`, `.md` or `.txt` file dropped on `#stage` goes to `#fileInput` through a `DataTransfer` and a `change` event, so the existing Import handler does the work. When a deck is open, `canLeave()` runs first. While a file is dragged over, the stage shows a 2 px dashed `var(--words)` line, with no animation. Other file types get a short message.
- When the first deck is activated, `#firstRun` is removed and the canvas comes back.

## Screenshots

Isolated Chrome for Testing 151.0.7922.34, empty temporary library, light appearance.

- `m6-first-run-1440.png`: the first screen. One paste box, Arrange and See an example first; the square is hollow.
- `m6-arranged-1440.png`: after pasting three paragraphs and pressing Arrange. Three pages in the strip, four measured layout choices, and the square green (autosaved).

## Test first

`tests/browser_first_run.mjs` failed first (no `#firstRun`). It now passes 4 of 4:

- Empty library: only the paste box, Arrange and the example link; no thumbnails; the canvas is hidden.
- Three paragraphs separated by blank lines become 3 pages, with the title taken from the first line. The run took 0.36 s from the click until the measured preview was ready; §10 asks for under 3 s. The form is removed.
- Chinese interface: 排好 and the Chinese placeholder. 先看个例子 loads the Chinese welcome deck (6 pages).
- A dropped `.md` file shows the dashed yellow line during dragover, then becomes a two-page deck through the Import handler.

## Runs

- `npm run verify`: exit 0; 506 tests, 501 pass, 0 fail, 5 skipped.
- `tests/browser_first_run.mjs`: 4 of 4 pass. `tests/browser_page_strip.py` and `tests/browser_inspector_zones.py`: 5 of 5 each.
- `tests/browser_smoke.py --mode direct`: autosave plus 21 acceptance checks pass, then the presenter `#pageCount` step fails, as it does at HEAD.
- `tests/browser_history_capacity.mjs`: 6 checks pass. `tests/browser_visual_studio.mjs`: ok.
- `tests/browser_session_reconnect.mjs`: one run in a batch printed no result; its log was not kept. Three separate runs after it passed (6 checks each).
