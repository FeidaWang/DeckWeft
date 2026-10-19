# S5 motion and state — evidence, 2026-10-19

S5 of the [kickoff plan](../../plans/design-handoff-kickoff-prompts.md): the motion system aligned with the handoff's state-first model and the EvidenceStage blueprint, without rewriting VIS-009, and the player conflicts from the [S2 vertical sample](../../plans/design-handoff-vertical-sample.md#s5-update-2026-10-19) closed. Started from `232060e`. Nothing was pushed or published; no roadmap status changed.

## Environment

- macOS (Darwin 27.0.0), Node v24.14.0.
- Chrome for Testing 151.0.7922.34 from the Playwright browser cache in the user's Library caches, outside `/Applications`. Playwright 1.61.1 from a local npx cache, loaded through `PLAYWRIGHT_MODULE`; not a project dependency. Every browser context used a Playwright temporary profile. Installed browsers and personal profiles were not touched.
- Studio ran on loopback with a temporary library that the script deletes. Non-loopback requests were blocked and counted: 0 occurred. Page errors: 0.
- Before/after: exports of the same evidence scene made by the S2 player, from a detached worktree of `232060e` in a temporary folder.

## Commands and results

```bash
npm test                                                   # before any S5 change: 362 tests, 361 pass, 1 skipped
node --test tests/motion-state.test.mjs                     # 11 pass (new)
node --test tests/evidence-scene.test.mjs tests/handoff-contracts.test.mjs   # 20 pass
CHROMIUM_PATH=<isolated Chrome for Testing> PLAYWRIGHT_MODULE=<playwright/index.mjs> DECKWEFT_BEFORE="en=<s2-en.html>,zh-CN=<s2-zh.html>" node tests/browser_motion_state.mjs   # ok, 28 captures
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_evidence_scene.mjs   # S2 script on the S5 player: ok, 18 stage records, 20 captures
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_interactions.mjs     # VIS-009 acceptance: ok, 6 cases, 146 captures
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_explanatory_authoring.mjs   # ok (updated for focus vs hide)
npm run verify                                             # 373 tests, 372 pass, 0 fail, 1 skipped; types, check, build, demos
```

- [report.json](report.json) is the receipt of the final `browser_motion_state.mjs` run: gate receipts, the Studio refusal, every keyboard press (one line each), observed animations, fast-paging counts, reduced-motion traces, static views and capture hashes. [s2-rerun-report.json](s2-rerun-report.json) is the receipt of the S2 script on the S5 player.
- `tests/browser_interaction_visual_parity.mjs` fails on 390 px diagram captures (472 differing edge pixels, maximum channel difference 12, over its 0.001 % sparse-edge limit). The unchanged S2 build `232060e` fails the same check on the same scene family in two of two runs, so this is a pre-existing raster tolerance issue with Chrome for Testing 151, not an S5 change. Not fixed here.

## What was verified

| Item | Result, both languages |
| --- | --- |
| C14 page keys | 28 keyboard traces (7 scenes × 1440/390 px × en/zh-CN) in presentation view: ArrowRight, ArrowLeft, ArrowDown, ArrowUp, Home, End, Space and Enter on every visible control, slider, select, checkbox, button, link, disclosure, tab, scrollable code block and chart mark — 2,864 presses, 584 of them changed a parameter, 0 changed the page, 0 skipped. Each press starts from the scene's starting cue boundary. With nothing focused, ArrowRight/ArrowLeft still turn the page. |
| C14/C4 before/after | Same evidence scene, a focused chart mark, ArrowRight. S2 player: page 1 / 2 → 2 / 2; explanation line “Data first … 27 %”. S5: page stays 1 / 2; “Claim first … 38 %” (zh-CN: “先看数据: … 27 %” → “先写结论：… 38 %”). |
| C5 gate | Studio's measured preview receipt has `states` for every declared static state: 5 in the demo, 1 in the evidence scene, all with 0 overflow, clipping and contrast issues; Export HTML downloaded exactly the measured preview. The exported files measure `states` again at 1440 and 390 px (`fit.ok`). |
| C20 Studio opening | The evidence preview opens at cue 1 / 2 (static state). **Use current chart / step as opening** answers “The preview shows cue position 1 (the static state), not an explored selection …” (zh-CN: “预览停在提示位置 1（静态状态）…”); Save stays disabled. After choosing a different **To category** in the preview, the same action is accepted. |
| C8 static drawings | Without JavaScript, at 1440 and 390 px: the focused line chart (both series in the legend, Local muted, statement “focus on Reviewed”); the process diagram's “Revise” relationship and both ends marked; code line 3 marked; the comparison at “second” with the first image under **First original image**; hotspots 1 (open, outlined) and 2 with the open annotation and its coordinates. No page-level horizontal scroll. |
| Static state with JavaScript | Each of the 5 demo static scenes opens at its position with its statement visible and the state equal to `seekInteractionState()` at that position. |
| Focus vs hide | **Focus: Reviewed** keeps Local drawn in a lighter version of its colour with its values and legend entry; **Show: Local** unchecked removes Local from marks and legend and disables its focus button. Captured at 1440 px. |
| Motion primitives | With motion on: focus → FadeIn on the focused marks + SlideSmall; hide → SlideSmall; show again → SeriesReveal on the shown series' marks; step → RevealMask + FadeIn; tab → Crossfade; hotspot → AnnotationReveal; replay → SlideSmall. Every animation's browser-reported keyframes matched the registry and lasted at most 400 ms (220 ms for FadeIn/SlideSmall). The per-series stagger (0, 60 ms …) is covered by the unit test; this run showed one series at a time. |
| Fast paging | Replay on the line chart, a registered resource, then 30 rapid Next/Previous clicks and a replay on the code page: after 400 ms, 0 pending page timers (init-script probe), 0 animations, the resource released once, no scene playing or holding timers, animations or registrations. |
| Reduced motion (OS) | 1440 and 390 px: the line chart opens frozen at its static state (focus on Reviewed), Replay and Play are disabled and the notice is visible; Next, Previous, slider End, a focus change, a refused `play()`, a step and a tab change all ran with 0 animations; `play()` returns to the static state. |
| S2 script | `tests/browser_evidence_scene.mjs` passes on the S5 player with two updated expectations: the series buttons now focus (`aria-pressed` false/true instead of true/true, C1) and the start state is compared with `seekInteractionState()`. |

## Byte identity

The S2 static-state extension is folded into the one embedded player (`PLAYER_VERSION` `semantic-player.2`). `render-baseline.json` was re-recorded in its own commit. Changed: the 10 HTML entries (player script and CSS in all; runtime data in the two interaction-demo entries). Unchanged: the reader-visible markup hash of all 10 HTML entries, both JSON entries and all 12 theme entries. The interaction demo's runtime data differ from `232060e` only by six added fields on each of its six compiled chart selections (`datasetId`, `chartType`, `sortKey`, `scale`, `captionOrder`, `initialFocusSeriesId`); datasets, anchors, hotspot positions, annotations, cues and the `<main>` markup are identical.

## Viewed images

All 28 captures of the final run were opened and looked at. Hashes are in the receipt.

| Capture | What was checked |
| --- | --- |
| [en-keyboard-mark-1440](en-keyboard-mark-1440.png), [zh-CN-keyboard-mark-1440](zh-CN-keyboard-mark-1440.png), [en-keyboard-mark-390](en-keyboard-mark-390.png), [zh-CN-keyboard-mark-390](zh-CN-keyboard-mark-390.png) | A chart mark focused (blue ring) after ArrowRight; page label still 1 / 2; the new Play/Previous cue controls; the explanation line names the top rank. At 390 px the sticky header covers the top of the chart controls when the mark scrolls into view (pre-existing layout). |
| [en-focus-1440](en-focus-1440.png), [zh-CN-focus-1440](zh-CN-focus-1440.png), [en-hide-1440](en-hide-1440.png), [zh-CN-hide-1440](zh-CN-hide-1440.png) | Focus keeps Local as a muted context line with its labels; hide removes Local and disables its focus button; status line and explanation line match. |
| [en-nojs-component-line-1440](en-nojs-component-line-1440.png), [zh-CN-nojs-component-line-1440](zh-CN-nojs-component-line-1440.png) | No JavaScript: the frozen focus, both legend entries, the statement with “Local Missing” (no unit after a missing value) and full-width punctuation in Chinese. |
| [en-nojs-component-process-1440](en-nojs-component-process-1440.png), [zh-CN-nojs-component-process-1440](zh-CN-nojs-component-process-1440.png), [en-nojs-component-process-390](en-nojs-component-process-390.png), [zh-CN-nojs-component-process-390](zh-CN-nojs-component-process-390.png) | The frozen step: relationship and both ends outlined, the statement with label, text and path. |
| [en-nojs-image-comparison-1440](en-nojs-image-comparison-1440.png), [zh-CN-nojs-image-comparison-1440](zh-CN-nojs-image-comparison-1440.png), [en-nojs-image-comparison-390](en-nojs-image-comparison-390.png), [zh-CN-nojs-image-comparison-390](zh-CN-nojs-image-comparison-390.png) | The second image in place, the first under a closed disclosure, the statement above. |
| [en-nojs-violet-1440](en-nojs-violet-1440.png), [zh-CN-nojs-violet-1440](zh-CN-nojs-violet-1440.png), [en-nojs-violet-390](en-nojs-violet-390.png), [zh-CN-nojs-violet-390](zh-CN-nojs-violet-390.png) | Hotspot markers 1 (outlined) and 2 at the authored positions, the open annotation and coordinates in the statement; all annotation blocks still on the page. |
| [en-reduced-1440](en-reduced-1440.png), [zh-CN-reduced-1440](zh-CN-reduced-1440.png), [en-reduced-390](en-reduced-390.png), [zh-CN-reduced-390](zh-CN-reduced-390.png) | OS reduced motion: Replay and Play disabled, the notice beside the cue position, the static state with its statement; the page's Reduce motion control is disabled because the system setting wins. |
| [en-studio-opening-refused](en-studio-opening-refused.png), [zh-CN-studio-opening-refused](zh-CN-studio-opening-refused.png) | The refusal message in the Studio message bar; the preview at cue 1 / 2; Save disabled. |

Of the S2 re-run's 20 captures only `en-present-1440` was viewed (the new timeline controls and the static line on the S2 scene); they were not copied here.

## Not available or not run

- PowerPoint, Keynote and Figma are installed but were not opened: S5 changes no export target. After Effects and LibreOffice were not found in `/Applications` (Adobe Creative Cloud is installed without After Effects).
- No Firefox, WebKit or Safari run, no screen reader, no IME, no 200 % zoom or print check, no authenticated host. Claude remains deferred.
- Remote CI did not run this change.

## Open issues

- C1: a single-series ranked bar can be focused but nothing in the drawing changes; a category focus is S4's / the S1 field list's decision.
- Not done in S5: trigger kinds beyond `manual`, the scroll-story advancement mode, a media clock (M16), interactive sort (M13), metric switch (M14), scale shift (M12), chart annotation reveal (M19). `metricId` stays `null`; `sortKey` and `scale` are read-only declarations.
- The 390 px presentation header covers content when focus scrolls a mark under it (observed, unchanged).
- `tests/browser_interaction_visual_parity.mjs` fails on 390 px diagram edge pixels on both `232060e` and this build.
- The remaining S2 conflicts (C2, C3, C9, C10, C12, C13, C15–C17, C19) are unchanged.

## Reproduce

Use Node 22+ and an already installed isolated test browser outside `/Applications`:

```sh
npm run verify
CHROMIUM_PATH=/isolated/testing/browser PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_motion_state.mjs
```

The script writes the receipt, both exported HTML files per language and the captures under `dist/motion-state/` (set `DECKWEFT_EVIDENCE_OUT` to change it). For the before/after rows, export the evidence scene with `staticState: "structure-first"` from a checkout of `232060e` and pass both files in `DECKWEFT_BEFORE`. Copy the captures and `report.json` here only after viewing them.
