# Step 5: clean-up

Captured 2026-10-20, Chrome for Testing 151, headless, 1440 × 900.

- `step5-developer-drawer-json-1440.png`: More → For developers → Data editors, opened. It holds *Authored interactions, cue order and motion · JSON* (shown), *Semantic explanation content · JSON* and *Sources and versioned snapshots · JSON* below it. The disclosure is folded when the drawer opens (`browser_visual_studio.mjs` asserts both).

## What was already done, what this step did

The three JSON editors were put in the developer drawer's folded `<details data-developer>` in step 3 (`public/kinds/visual.js`, the `developer` slot), so item 3 needed a check, not a move. By step 3 the studio scripts no longer touched the review panel, the six questions or the preview width either, so item 2 found little.

## Deleted files

| File | Why |
|---|---|
| `public/studio/visual.html` | The page is `/` since step 4; `/visual` redirects. Its four dialogs live in `kinds/visual.js` (`dialogMarkup`). |
| `public/studio/visual.css` | Not linked by any page since step 3 (`kinds/visual.css` is the one in use). Its only rules for `#reviewPanel` and `.candidate-panel` styled controls that are gone. |
| `public/studio/visual.js` | The old entry of `/visual` (mounted the shell with the visual kind); `app.js` does that now. |
| `tests/workbench_view.mjs` | A VIS-013 capture helper driven by `#viewport` (preview width) and `#fit`, both deleted; nothing referenced it. |

Static table (`src/services/server.mjs`): `/studio/visual.js` and `/studio/visual.css` removed (`/studio/visual.html` was only reachable through `/visual`). `scripts/check.mjs` no longer lists `visual.html` as an active surface. No API route was touched.

## Deleted code in `public/studio/*.js`

| Where | What | Why |
|---|---|---|
| `workbench.js` | `captureAvailable` and its `GET /api/visual/workbench-capabilities` call | It only fed the returned `capture()` that nothing called; `author.js` reads the same route for the Take away dialog. |
| `workbench.js` | `generate` and `capture` from the returned object | No caller outside the file (the button still calls `generate` inside). |
| `prompt.js` | `capture:` in `hostChoice()` | Read the `#workbenchCapture` checkbox of the deleted review panel, always false; the server treats an absent `capture` as false (`data.capture===true`). |

Kept on purpose: `renderProgress`'s status labels for `browser-capture`, `actual-image-review` and `review-required` and `renderEvidence`'s attestation line: a workbench task still reports those through the API, and the drawer shows them.

## Deleted assertions

Each was `for(const gone of [...])assert.equal(await page.locator(gone).count(),0,gone)`: it asserted that a control of the old Visual Studio page is absent. With `visual.html` and its CSS deleted there is no markup that could carry those ids, so they can no longer fail for a reason that matters; the shell's real structure is covered by the positive assertions next to them.

| Runner | Ids no longer asserted absent |
|---|---|
| `browser_author_controls.mjs` | `#entryFields`, `#entryAudience`, `#entryOutput`, `#entryBasis`, `#entryStyle`, `#entryMotion`, `#closeDirection`, `#workbench-uiLanguage`, `-promptLanguage`, `-contentTone` (the six questions and the draft's language/tone selects); and `#authorControls`, `#actionLevel`, `#actionObject`, `#lockKind`, `#actionApply`, `#actionCancel`, `#replaceFields`, `#plan*`, `#pagePlan` and the seven `[data-author-action=…]` buttons (the author-controls panel) |
| `browser_workbench.mjs` | `#reviewPanel`, `#workbenchCapture`, `#workbenchInspect`, `#workbenchReview`, `#workbenchImages`, `#workbenchJudgment`, `#workbenchVerdict`, `#workbenchAttest`, `#workbenchHumanReview`, `#workbenchReport`, `#workbenchExport`, `#workbench-*`, `#fit` (the review panel) |
| `browser_prompt_generation.mjs` | `#workbenchCapture`, `#workbenchImages`, `#workbenchExport`, `#workbenchReport`, `#reviewPanel`, `#viewport`, `#workbench-uiLanguage`, `#fit` |
| `browser_visual_studio.mjs` | `#library`, `#designTab`, `#contentTab`, `#lockScene`, `#theme`, `#viewport`, `#history`, `#backup`, `#legacy`, `#migrate`, `[data-lock]`, `#message` |
| `browser_compositions.mjs`, `browser_families.mjs` | `#compare`, `#designTab`, `#contentTab`, `.candidate-card`, `[data-select-candidate]` (the Compare button and its cards) |
| `browser_blueprint_studio.mjs`, `browser_interactions.mjs`, `browser_evidence_scene.mjs`, `browser_assets.mjs` | `#contentTab`, `#designTab`, `#lockInteractions`, `#lockScene`, `#nextScene`, `#fit`, `#message`, `#history`, `#library`, `#deckName`, `#theme`, `#backup`, `[data-lock]` (old tabs, per-field locks, toolbar) |

Added: `browser_visual_studio.mjs` asserts that `#interactionJSON`, `#explanationJSON` and `#sourceJSON` are inside the developer drawer's `<details data-developer>` and that it starts folded.

## Checks

- `git diff main -- src/render public/runtime` is empty; no baseline was re-recorded.
- `docs/evidence/` history was not touched, except this folder.
