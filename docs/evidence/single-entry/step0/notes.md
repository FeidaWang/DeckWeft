# Single entry, step 0: shell extraction

The classic workbench now runs through `public/shell.js` (+ `shell.css`) with the classic kind in `public/kinds/classic.js`. `public/index.html` keeps `<main id="root">` and the dialogs. Captured 2026-10-20 in Chrome for Testing (chromium-1234), headless.

- `step0-desktop-1440.png`: 1440 × 900, welcome deck. Top band, page strip, canvas, choices and the Words / Look zones come from the shell; `main#root` becomes `.workspace` with the band before it and the status bar and More drawer after it.
- `step0-phone-390-more.png`: 390 × 844 (2×), More drawer open. Undo, Redo (hidden) and the deck title sit in `#moreTop`, moved by the shell. The faded Undo square is the disabled state, the same as `docs/evidence/ui-shell/merged/merged-phone-more.png`.

## Tests, same before and after

| Runner | Before (HEAD `6f0adbb`) | After |
|---|---|---|
| `npm run verify` | pass | pass (509 pass, 0 fail, 1 todo with `CHROMIUM_PATH` set) |
| `browser_first_run.mjs` | 4 checks pass | 4 checks pass |
| `browser_media.mjs` | times out at line 32 (`.three-scene-layer`) | same |
| `browser_page_strip.py --mode fixture` | pass | pass |
| `browser_inspector_zones.py --mode fixture` | pass | pass |
| `browser_page_strip.py`, `browser_inspector_zones.py` (direct) | CSP refuses the string predicate (`unsafe-eval`) at the first `wait_for_function` | same |
| `browser_smoke.py`, `browser_acceptance.py --mode fixture` | stop at `browser_acceptance.py` line 39 (Tab from `#undo`) | same |
| `browser_history_capacity.mjs`, `browser_session_reconnect.mjs` | not run | 6 checks pass each |

`browser_media.mjs` never reaches the workbench here. A scratch copy without the WebGL block stops on both trees at the retired Design tab (original line 48), so a separate scratch script checked Take away → HTML, the drawer's Project JSON, the assistant section, holding Undo, Chinese and a choice card. Its output was identical on both trees. Python: Playwright 1.60 in a scratch venv.
