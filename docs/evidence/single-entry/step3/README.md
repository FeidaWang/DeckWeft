# Step 3: Visual Studio on the shared shell

`/visual` now mounts the same shell as the classic workbench (`public/shell.js`) with the visual deck kind (`public/kinds/visual.js`, `public/kinds/visual.css`). `public/studio/visual.html` keeps `<main id="root">` and its four dialogs (larger layout, earlier versions, image import, local PNG). The classic export dialog and the F1 export dialog are one Take away dialog, owned by the shell; its format buttons come from each kind's `exports()`. Captured 2026-10-20, Chrome for Testing 151 (chromium-1234), headless, on the six-family example deck (`createCompositionDemo('en')`, page 4).

- `step3-visual-1440.png`: 1440 × 900. Band (brand, Undo, title, state square, More, Take away), page strip with real thumbnails, the page, Words above Look. Same structure as design guide §9.
- `step3-visual-1440-look.png`: the Look zone: three measured choices (one marked "Does not fit"), Choose for the whole deck, More space / Larger type / Lock this page, six colours, Let this page move, Image with its "i", Three directions with Less / Medium / More.
- `step3-visual-1440-more.png`, `step3-visual-1440-take-away.png`: the drawer and the Take away dialog (Present, HTML, PowerPoint, PDF; PowerPoint and PDF need the isolated checking browser, so they are disabled here).
- `step3-visual-390.png`, `step3-visual-390-sheet.png`: 390 × 844 (2×). Strip on top, the page, one Edit bar; Edit opens Words and Look as a sheet. No horizontal page scroll (measured 0 px).
- `step3-classic-1440.png`: the classic workbench on the same shell. Its layout choices now lead the Look zone too (author's decision below).

## Decisions

Asked and answered on 2026-10-20:

1. The three choices go to the top of Look for both kinds, not only for visual. The classic choices moved out from under the canvas; `browser_inspector_zones.py` now expects Choose for me and the four layouts between Sources and the colours in the Tab order.
2. "Let the assistant write for me" (`#moreAgent`) is always shown for visual decks: the local workbench needs no host. Codex stays an option inside it, with its own consent.
3. "Detail: less / medium / more" in Look drives the three directions: a change asks for three new directions of the open deck; nothing is applied until one is chosen.
4. The per-field lock checkboxes (`[data-lock]`) are gone; "Lock this page" is the one lock.

From the prompt: one lock; the review panel leaves the browser; the six questions, the preview width, the prompt language and the tone are deleted.

Calls made while building, each visible in the code:

- **Arrange** (the first-run paste box) makes a plain v3 deck through `POST /api/visual/directions` (no project: the supplied text arranged, no model) and saves it with `POST /api/visual/import`, then shows the three directions. It does not go through the workbench: the server refuses every browser export of a workbench deck until its image review passes (`WORKBENCH_REVIEW_REQUIRED`), and that review has left the browser. Drafts started from "Let the assistant write for me" are workbench tasks as before.
- **Autosave**: visual decks now save 1.2 s after the last edit like classic. A conflict turns the square red with a banner and waits for ⌘/Ctrl S, which offers the separate copy. After a save the page is measured again without reloading the frame (the export ticket is bound to the exact project, revision included).
- **More space** and **Lock this page** apply at once (design guide §11: no Apply / Cancel); the plan's own statement of what changed and what a lock kept is shown under the buttons afterwards. Lock this page runs the server's four author locks in the order data, sources, text, composition (in combined mode a text lock already covers data, and the separate data lock would never be stated) and also holds the page's theme, interactions, cues and motion. Pressed again, the same come off.
- **Larger type** toggles the deck's type contrast (balanced ↔ expressive). The default profile is expressive, so it starts pressed.
- **Let this page move**: On opens the ways a page can move (explanations, Explain → Diagram → Explore, transition, the still picture for print); the page moves once one is chosen. Off makes the page still by removing its interactions, cues and transition; Undo brings them back.
- **Choices** are compared automatically 0.6 s after the page is measured, and again after each edit or save. Each comparison renders three complete decks.
- **Chapters** are on the page strip's menu (right-click a thumbnail, or the context-menu key / Shift F10).

## Where each control group went, and which runner proves it

| Control group (old container) | Now | Runner |
|---|---|---|
| Six questions (`#entryFields`) | Deleted. The first-run paste box starts a deck; Detail → Look · Three directions (`[data-detail]`) | author_controls (asserts the fields are gone; detail → three measured directions) |
| Prompt and source, Codex drafting (`#promptWorkbench`, `#workbenchStart`, `#workbenchPreferences`) | More · Let the assistant write for me | prompt_generation, workbench |
| Three directions (`#directionsPanel`, `#directionCards`) | Look · Three directions, same card as the choices; applied to the open deck | author_controls |
| Compare compositions, rhythm (`.candidate-panel`, `#compare`, `#rhythm`, `#rhythmReport`) | Look: choices always shown (`#candidates`); `#rhythm` = Choose for the whole deck; report and status → More · For developers. `#compare` deleted | compositions, families |
| Author controls (`#authorControls`) | Look · More space (`#moreSpace`), Larger type (`#largerType`), Lock this page (`#keepPage`); chapters → page strip menu | author_controls, visual_studio |
| Separate locks (`#lockScene`, `#lockInteractions`, `#lockKind`, `[data-lock]`) | Look · Lock this page; lock state read-only in More · For developers (`#lockSummary`) | visual_studio, author_controls, assets, evidence_scene, interactions, blueprint_studio |
| Design profiles (`#profileFields`, save / apply / export / import) | More · Backup and restore · Save this look (`#saveLook`) | visual_studio, author_controls |
| Export group (`#exportHTML`, `#exportPPTX`, `#exportPDF`, `#exportJSON`, `#backup`, `#workbenchLastValid`, `#workbenchWatch`) | Take away: Present (`#workbenchWatch`), HTML, PowerPoint, PDF (F1 paging, yellow typography result, acceptance); Project JSON and Last accepted HTML → More · Backup and restore | visual_studio, author_controls, blueprint_studio, prompt_generation, explanatory_authoring, motion_state, evidence_scene |
| Review and export (`#reviewPanel`, capture, gallery, judgment, report, reviewed export) | Deleted from the browser | workbench, prompt_generation (assert the controls are gone; run capture, review and report through the API) |
| Content fields (`#fields`, `#explanationFields`, `#title`) | Words; the deck title → the band (`#deckTitle`); code metadata and chart settings under a "settings" disclosure in their card | visual_studio, components, explanatory_authoring |
| JSON editors (`#interactionJSON`, `#explanationJSON`, `#sourceJSON`) | More · For developers, folded | interactions |
| Interactions, motion, blueprint, still state (`#enableInteractions`, `#useInteractionOpening`, `#enableBlueprint`, `#staticState`, `#sceneMotion`) | Look · Let this page move (`#motionSwitch`) | explanatory_authoring, motion_state, evidence_scene, blueprint_studio |
| Asset workbench (`.asset-workbench`, `#sourceDialog`, `#imageDialog`, crop) | Look · Image: Replace / Add an image (`#sourceImport`) and "i" (`#imageInfo`: rights, slot, crop, catalog, text-led layout, local PNG); an image dropped on the canvas opens the import | assets, visual_studio |
| Revisions and recovery (`#workbenchRevisionPanel`, `#workbenchRecovery`) | More · Earlier versions, with `#openHistory` | visual_studio (history), workbench (revision, live mode only) |
| Host evidence (F3 / F5, `#exportEvidence`) | Thumbnail mark on the strip; Words `#hostAuthoredLines`; drawer `#workbenchEvidence`; Take away `#exportEvidence` | workbench, prompt_generation |
| Preview width (`#viewport`) | Deleted; the stage scales the 1440 px page | visual_studio |
| Library and examples (`#library`, `.library-tools`, five examples, `#legacy`, `#migrate`, `#projectFile`) | More · Backup and restore: `#projectPicker` (both kinds), See an example, Import a deck (`#projectFile`); four more examples under For developers; `#legacy` / `#migrate` → the classic "Make a new-version copy" (step 2) | visual_studio, single_picker, evidence_scene |
| Interface / prompt / output language, tone | The shell's one language switch (`#uiLanguage`); More · Language · `#outputLanguage`; prompt language and tone deleted (drafts send the output language and a neutral tone) | workbench, assets, visual_studio |
| Old band and stage (`#save`, `#undo`, `#redo`, `#history`, `#message`, `#fit`, `#deckName`, story controls, panel toggles) | `#save` hidden (⌘/Ctrl S) with autosave and the state square; Undo / Redo in the band; `#openHistory`; banner (`#issueBanner`) for problems and toast for information; `#canvas` busy / stale for measuring; `#pageCount`; arrow keys on the strip; `#moveUp` / `#moveDown` under Look; Words and Look always shown, Edit bar on a phone | every runner above |

Removed from the browser, still available: `POST /api/visual/author-action` (reduce text, chart space, quieter, keep layout, replace visual, per-kind lock and unlock, chapters, apply profile), `POST /api/visual/page-plan` and `/page-plan/apply`, `POST /api/visual/workbench/:id/action` with `inspect` (capture) and `review`, `GET /api/visual/workbench/:id/report`, `POST /api/visual/workbench/:id/export`, `POST /api/visual/migrate`, `POST /api/visual/directions` with a topic. author_controls and workbench call each of these and keep the assertions the browser steps used to make.

## Tests

| Runner | HEAD `a9755e3` (steps 0–2) | After |
|---|---|---|
| `npm run verify` | fails only "Visual Studio page wording" (handed to this step) | pass: 512 pass, 0 fail, 1 todo, 1 skipped |
| visual_studio, author_controls (1440 / 1024 / 390), workbench, prompt_generation, compositions, families, assets, evidence_scene, motion_state, explanatory_authoring, interactions, blueprint_studio, history_capacity, session_reconnect | pass | pass |
| components | fails: fills a field in the hidden inspector panel | pass |
| single_picker (step 2) | pass | pass |
| first_run, page_strip (fixture) | pass | pass |
| inspector_zones (fixture) | pass | pass, with the Look Tab order updated for decision 1 |
| browser_media | stops at line 32 (`.three-scene-layer`) | same |
| browser_smoke, browser_acceptance (fixture) | stop at `browser_acceptance.py` line 39 | same |
| capture_studio (fixture) | times out clicking `#openHistory` | same |

`browser_workbench.mjs` reuses the library under `dist/workbench-acceptance` when one exists (for its `--review` mode), so a second run in the same tree waits on the first run's task; it was run from a clean directory, as on HEAD.

The author_controls timeout at 1024 px recorded on main (waiting for `#actionLevel`) did not reproduce: HEAD `a9755e3` passed 1024 px in the full run and in three more runs of `--widths 1024`, with no "author controls not visible" record. `#actionLevel` no longer exists. Below 1050 px Look is a sheet over the page, so the runner closes it before pressing Undo in the band; on a phone Undo and Redo sit at the top of More.

Two test-side findings while migrating:

- The live preview and the choices are sandboxed frames without same-origin, which Chromium runs out of process. For the first frame after a modal dialog opens, a click at that point can still reach the frame underneath; `studio-controls.mjs` waits two animation frames after opening a dialog. A person cannot click that fast.
- Autosave lands 1.2 s after an edit, so runners that read the saved deck poll the store for the change instead of checking the square once.

`tests/wording.test.mjs`: the Visual Studio page is now the shell templates, the visual kind's templates and `visual.html`; its default text has no engineering words (0 hits; 10 on HEAD). The shell's own words moved to `shell.*` keys (the classic page uses `classic.*` and `shell.*`, Visual Studio `visual.*` and `shell.*`); 224 dictionary keys of removed controls were deleted. The recorded runtime-wording test stays a todo: 18 classic and 48 visual runtime strings (71 visual on HEAD) still name engineering words (for example "candidate", "measured", "JSON" in messages and in the developer drawer).

## Not done here

- The user manuals (`docs/en/visual-studio.md`, `workbench.md`, `interactions.md`, the README and their Chinese pages) still describe the old Visual Studio controls.
- Both pages still have their own address; step 4 serves Visual Studio from `/`.
- The commits follow the prompt's six items; only the final state is verified as a whole.
