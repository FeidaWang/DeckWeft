# Design handoff vertical sample (S2)

Checked 2026-10-19 on the S1 commit `7810149` plus the uncommitted S2 changes. This is step S2 of the [kickoff plan](design-handoff-kickoff-prompts.md). State words follow the [alignment](design-handoff-alignment.md#how-to-read-the-tables). It changes no roadmap status.

One evidence scene ran through the whole local pipeline in English and Simplified Chinese, in a real isolated browser. The aim was to expose conflicts before template work. Only conflicts that blocked the path were fixed; the rest are listed below with a file, a state and a reproduction.

## The sample

- [English fixture](../../tests/fixtures/visual/evidence-scene.en.json) and [Chinese fixture](../../tests/fixtures/visual/evidence-scene.zh-CN.json). Same ids in both.
- One claim (heading + takeaway callout), one `ranked-bar` chart, one source, one chart selection. The data are labelled illustrative: `synthetic: true`, scene `contentStatus: "illustrative"`, and the chart caption and source say so.
- Long titles with mixed punctuation: an em dash, colon, question mark and parentheses in English; `——`, `：`, `？`, `（2026 年）` and half-width digits in Chinese.
- S1 fields used: `rules.misreading: "strict"`, dataset `version`, `collectedAt`, `validPeriod`, `definition`; chart `question`, `takeaway`, `axis.scale: "linear"`, `sort: "value-desc"`; scene `takeaway`, `contentStatus`, `keyStates`, `staticState`, `motion.trigger/clock/reducedMotion: "static"`. No intervals, events, log scale or truncation (S4).
- Key states: `opening` (0, all six habits) → `structure-first` (1, three habits) → `complete` (2, all six again). The author chooses `structure-first` as the static state in Studio.
- A short closing page follows, so that page navigation can be tested.

## Stage results

Driven by [tests/browser_evidence_scene.mjs](../../tests/browser_evidence_scene.mjs) in Chrome for Testing 151.0.7922.34 (isolated binary outside `/Applications`, Playwright temporary profile per context). Receipt: [report.json](../evidence/s2-vertical-sample/report.json). Review: [evidence](../evidence/s2-vertical-sample/review.md).

| # | Stage | Result, both languages |
|---|---|---|
| 1 | Import data | Studio **Import visual JSON** → `POST /api/visual/import`. The copy gets a new local id; blocks, datasets and scenes are deep-equal to the file. No tabular data import exists (C15). |
| 2 | Choose theme | Studio theme control: dark-data → cream-collage → dark-data, saved each time. The semantic view (whole presentation document plus each scene's ids, blocks, takeaway, status, interactions, cues, key states, static state and motion) is deep-equal before and after. Composition changes `chart-with-evidence-rail` ↔ `reading-flow`; display type changes. Fit passes for both themes. The round trip adds `colorMode: "default"` (C9). |
| 3 | Fonts after `document.fonts.ready` | `document.fonts.status` is `loaded` with 0 font faces; every gate font row reports `loaded: true`. Actual platform fonts (Chromium CSS domain): see the table below. |
| 4 | Legend focus, mouse and keyboard | Presentation view on page 1 / 2. Pointer: series button and **To category**. Keyboard: ArrowDown/Right/Left on the select, Enter/Tab/Space/ArrowRight on the series buttons. The page stays 1 / 2 after every input. The series (legend) focus is degenerate on a ranked bar (C1); the range focus works. |
| 5 | Pause and seek | Replay: 1 pending cue timer. Pause at cue 1: 0 timers. Keyboard seek to 2 equals `seekInteractionState(…, 2)`; Home returns to 0. Six rapid Next/Previous pairs, then replay, Next cue, seek back, replay and Next: 0 pending page timers (counted by an init-script probe), 0 scene timers, animations and registrations. |
| 6 | Freeze the static state | New Studio control **Static state for export and reduced motion** next to **Use current chart / step as opening** → `structure-first` (position 1). With **Lock this scene interaction plan** on, the control is disabled and a direct `PUT` with a changed static state returns 409 `AUTHOR_LOCK`. |
| 7 | Export HTML through the review gate | Measured preview ticket → `/api/visual/measure` → **Export HTML**. The download is byte-identical to the measured preview and carries the static-state runtime. |
| 8 | Exported file | Reading view (JS) and presentation view start at cue 1 / 2 with three bars; replay goes 0 → 2 and leaves 0 timers. No-JS view shows the three frozen bars, a text statement of every shown value, and the complete six-row table. OS reduced motion: Replay disabled, notice shown, `play()` keeps cue 1. The page **Reduce motion** control stops playback and returns to cue 1. 1440 px and 390 px. |
| 9 | Declared PPTX / PDF level | No component declares L1, L2 or L3. Both targets answer `TARGET_UNIMPLEMENTED`; every component reports `supported: false`, `representation: "unimplemented"` (C17). No export code was added. |

### Fonts actually drawn

| Role | en · dark-data | en · cream-collage | zh-CN · dark-data | zh-CN · cream-collage |
|---|---|---|---|---|
| Document header | Arial | Arial | Arial + PingFang SC | Arial + PingFang SC |
| Scene title | Helvetica Neue | Iowan Old Style | PingFang SC | Songti SC |
| Takeaway | Avenir Next Demi Bold | Avenir Next Demi Bold | PingFang SC | PingFang SC |
| Caption, chart caption, legend, source, chart labels | Avenir Next | Avenir Next | PingFang SC | PingFang SC |

### Declared levels per component

| Component | PPTX | PDF |
|---|---|---|
| heading, ranked-bar chart, callout, paragraph, citation (both pages) | none declared — refused, `TARGET_UNIMPLEMENTED` | none declared — refused, `TARGET_UNIMPLEMENTED` |

## Fixed in S2 because it blocked the path

- **Static export applies `staticState`.** A declared static state freezes the chart selection from `staticInteractionState()` in the no-JS view; the reading and presentation views start at the same cue boundary and replay from the opening. `STATIC_STATE_UNIMPLEMENTED` now fires only when the static state changes a step, comparison or hotspot selection (C8). Details: [architecture](../en/architecture.md#static-state-in-web-output-s2-2026-10-19), [interactions](../en/interactions.md#freeze-a-static-state).
- **`reducedMotion: "static"`.** Under OS or page reduction the scene shows its static state and does not play cues. `REDUCED_MOTION_FALLBACK_UNIMPLEMENTED` is removed.
- **Byte identity.** The runtime, chart renderer and CSS are embedded verbatim in every export (C6), so the static-state player code is appended only to documents that declare a static state. All 24 S1 baseline hashes still match.
- **Global motion off dropped the fallback** (C11). Fixed: the runtime static-state entry carries `reducedMotion` itself.
- **Locks did not cover the static state** (C18). Fixed: cue and motion scene locks now keep the chosen key state and its position, in Studio and on save.

## Conflict list

State: **Open** = listed, not changed; **Fixed** = changed in S2 with tests; **Fixed in S4** / **Decided in S4** = changed or decided by the S4 chart renderer, with tests and browser evidence. Reproductions use Node 22 and the browser command in the [review](../evidence/s2-vertical-sample/review.md).

| ID | Kind | File | State | Reproduction | Next owner |
|---|---|---|---|---|---|
| C1 | Contract / interaction | [validate.mjs](../../src/components/validate.mjs) (ranked bars need exactly one series), [charts.js](../../public/runtime/charts.js) (series switch) | Fixed in S4 for the contract and the drawing; interaction open — declared category focus `focus {categoryIds}` (a single-series chart cannot focus a series), drawn solid against outlined bars with a two-key legend; the evidence fixture now declares `claim-first`. The runtime series switch still reports both buttons pressed ([alignment §11](design-handoff-alignment.md#s4-field-list-decisions-2026-10-19), [S4 evidence](../evidence/s4-chart-renderer/review.md)) | Open either export in presentation view; click **Drop in review hours (illustrative)** or **All series**: the state does not change and both buttons report `aria-pressed="true"`. A legend (single-series) focus cannot exist on a ranked bar; only the category range focuses it. | S5 (chart-select `focusIds`; no series switch on single-series charts) |
| C2 | Chart / export | [styles.mjs](../../src/render/web/styles.mjs) `.chart-plot svg{min-width:600px}`; [render.mjs](../../src/components/charts/render.mjs) value labels at x = 666 / 800; [visual-api.mjs](../../src/services/visual-api.mjs) `measure` ignores component scroll width | Fixed in S4 — ranked, grouped and dot-interval charts are HTML rows with percentage marks: no scroller, the value at each bar end, labels above bars at ≤ 700 px. Labels marked `data-conclusion-label` fail the fit audit and the `/api/visual/measure` gate (`VISUAL_FIT`) when hidden, clipped, scroll-only, off-screen or overlapping; the browser runs inject the old 600 px scroller and see the gate refuse it ([S4 evidence](../evidence/s4-chart-renderer/review.md)) | View `*-reading-390.png` / `*-nojs-390.png`: the plot scrolls (scrollWidth 600 > clientWidth 342–346), the three bars are clipped to the same visible length and the value labels are off-screen. The fit gate still passes. S2's static statement keeps every value readable as text; the drawing itself can mislead. | Legacy point-labelled line/area/stacked/scatter/heatmap still scroll at 390 px (S4 follow-up) |
| C3 | Interaction | [charts.js](../../public/runtime/charts.js) range selects; [timeline.mjs](../../src/motion/timeline.mjs) `selectedDataset`; [model.mjs](../../src/components/charts/model.mjs) value order | Fixed in S4 for the contract and the static drawing — `sort` orders, a range filter selects in author order; the static statement states the filter (n of N) and the ranks among all categories separately. The interactive range selects still list author order without ranks | In a copy of the fixture, reorder `categories`/`categoryIds`/`values` so author order differs from value order, then choose **From**/**To**: the range is an author-order slice, so the visible bars are not adjacent ranks. The sample avoids this by using value order as author order. | S5 (rank filter as its own field; announce order changes) |
| C4 | Interaction copy | [charts.js](../../public/runtime/charts.js) `chart-selection-explanation` | Open | Every view states the last author-order category (“Data first: … 27 %”, “No set habit: … 9 %”) in an `aria-live` line, not the focus or the top rank. | S5 |
| C5 | Gate | [semantic.js](../../public/runtime/semantic.js) `measureInitial()`; [runtime.mjs](../../src/render/web/runtime.mjs) `measure()` | Open | The measurement temporarily resets every scene to position 0. The fit receipt the gate accepts therefore covers the opening, not the applied static state. S2 checks the static state with its own visibility checks and captures. | S5 (needs a player change, see C6) |
| C6 | Contract / process | [interaction-bundle.mjs](../../src/render/web/interaction-bundle.mjs), [document.mjs](../../src/render/web/document.mjs), [render-baseline.json](../../tests/fixtures/visual/render-baseline.json) | Decided in S4 — deliberate re-recording plus `WEB_RENDERER_VERSION` → `visual-art-direction.4` instead of a second, conditional chart renderer; every changed entry is listed with a text/value/anchor diff ([S4 evidence](../evidence/s4-chart-renderer/review.md)) | Change any embedded function (for example `chart()`): every baseline HTML hash changes. S2 added [static-state.mjs](../../src/render/web/static-state.mjs) beside the runtime instead. S4/S5 player changes need a decision: a conditional extension like S2's, or a deliberate baseline re-recording. | — (S5 applies the same rule to player changes) |
| C7 | Contract | [blocks.mjs](../../src/render/web/components/blocks.mjs) (static chart draws the full dataset); [cues.mjs](../../src/motion/cues.mjs) (`staticInteractionState`: absent = opening) | Open — back to the S1 field list | Without a declared `staticState`, set `initialToId` to an earlier category: the no-JS view still draws every category, while the JS view starts at the subset. S2 applies the selection only when a static state is declared (any position, including 0), to keep existing output byte-identical. | S1 field list: require an explicit static state, or migrate |
| C8 | Export | [capabilities.mjs](../../src/targets/capabilities.mjs) | Open | A static state that changes a diagram/code step, comparison tab or hotspot answers `STATIC_STATE_UNIMPLEMENTED` ([test](../../tests/evidence-scene.test.mjs)). The no-JS view draws frozen chart selections only. | S5 |
| C9 | Theme | [profile.mjs](../../src/design/profile.mjs) `applySceneTheme` | Fixed in S3 | dark-data → cream-collage → dark-data wrote `colorMode: "default"` that the original scene omitted, changing the scene source hash and render hash. S3: theme selection never writes the colour mode; the round trip returns the original plan and render hash ([test](../../tests/composition-families.test.mjs), [S3 review](../evidence/s3-composition-families/review.md)). | — |
| C10 | Contract / export | [capabilities.mjs](../../src/targets/capabilities.mjs), [render.mjs](../../src/components/charts/render.mjs) | Fixed in S4 — question, takeaway, denominator, sample, normalization, better direction, version, collected date and valid period are drawn as visible text in both views; nothing refused or dropped ([S4 evidence](../evidence/s4-chart-renderer/review.md)) | The fixture's chart `question` and `takeaway`, and the dataset `definition`, `version`, `collectedAt` and `validPeriod`, appear nowhere in the HTML, and HTML capabilities refuse none of them. F05's “units, dates and samples readable” is met here only because the authored caption repeats the definition in prose. | — |
| C11 | Motion | [web.mjs](../../src/motion/web.mjs) | Fixed | With `visualBrief.profile.motionIntensity: "off"`, the runtime data replace `scene.motion`, which dropped `reducedMotion`. The static-state runtime entry now carries it ([test](../../tests/evidence-scene.test.mjs)). | — |
| C12 | Font | [styles.mjs](../../src/render/web/styles.mjs), [art-direction.mjs](../../src/render/web/art-direction.mjs); theme typography | Open | Chinese takeaway at 1440 px: the line starting with `（19%）` is indented by half an em (no line-start trimming), and `）。` keeps two full widths (no pair compression), in PingFang SC and Songti SC. In cream-collage the line-end `——` extends past the measure. A fix changes every export's CSS. S3 adds a reproduction: the Chinese small-multiples source line ends in `）` at 390 px; Chrome trims it when breaking but the fit gate measures the full glyph (3.38 px overflow, [S3 receipt](../evidence/s3-composition-families/report.json)). | S8 theme typography |
| C13 | Font / gate | [runtime.mjs](../../src/render/web/runtime.mjs) `measure()`; [visual-api.mjs](../../src/services/visual-api.mjs) | Open | The gate's `fonts[].loaded` is `document.fonts.check()` over system stacks, which is always true here (0 font faces). It cannot tell which family drew the text; the table above needed Chromium's platform-font report. The document header renders in Arial (plus PingFang SC for Chinese) in every theme. | S3 / S8 |
| C14 | Interaction | [runtime.mjs](../../src/render/web/runtime.mjs) key guard `/INPUT|TEXTAREA|BUTTON|SUMMARY|SELECT|A/` | Open (low) | In presentation view focus a chart mark (`g[tabindex]`, reachable by annotation anchors) and press ArrowRight: the page changes 1 / 2 → 2 / 2. A focused `<summary>` is guarded. The regex is unanchored and case-sensitive, so lowercase SVG tags pass and any tag containing “A” is treated as a control. | S5 (player change, see C6) |
| C15 | Import | [visual.js](../../public/studio/visual.js) `#projectFile`; [visual-api.mjs](../../src/services/visual-api.mjs) `import` | Open | Studio imports visual-project JSON only. Datasets arrive inside the presentation JSON; there is no CSV or sheet import. | S9 |
| C16 | Studio | [visual.js](../../public/studio/visual.js) interaction JSON editor | Open | Key states cannot be created or edited in Studio; the JSON field accepts `interactions`, `cues` and `motion` only. S2 adds the static-state choice over existing key states. | S9 |
| C17 | Export levels | [capabilities.mjs](../../src/components/capabilities.mjs), [targets/capabilities.mjs](../../src/targets/capabilities.mjs) | Open | No L1/L2/L3 declaration exists; see stage 9. | S7 |
| C18 | Locks | [visual-project.mjs](../../src/core/visual-project.mjs), [interactions.js](../../public/studio/interactions.js) | Fixed | S1 mapped no lock to `staticState`. Cue and motion scene locks now keep the chosen key state and its position; adding an unrelated key state stays allowed ([test](../../tests/evidence-scene.test.mjs)). | S1 lock mapping text |
| C19 | Layout parity | [styles.mjs](../../src/render/web/styles.mjs) `.has-interactions .chart svg{max-height:290px}` | Fixed in S4 — the 290 px cap is gone; at 1440 px both views draw 942 × 125 px, at 390 px the same height. The width still differs by 4 px at 390 px because art direction gives `.has-interactions` scenes 22 px instead of 24 px side padding | At 1440 px the same frozen chart is 780 × 290 px with JavaScript (smallest label ≈ 10 px) and 780 × 390 px without it. Compare `*-reading-1440.png` with `*-nojs-1440.png`. | S3 (scene padding rule keyed on a JavaScript-only class) |
| C20 | Studio | [visual.js](../../public/studio/visual.js) **Use current chart / step as opening**; [runtime.mjs](../../src/render/web/runtime.mjs) `deckweft:request-opening` replies with the current state only | Open (found by reading the code; not reproduced in the browser run) | With a later static state the preview opens at that state. Pressing **Use current chart / step as opening** without exploring copies the static selection into the opening (`initialSeriesIds`, range, step), so position 0 changes. The reply carries no cue position, so Studio cannot tell. | S2 follow-up or S9 (player change, see C6) |

## Changed in S4

Re-run on 2026-10-19 with the S4 chart renderer ([evidence](../evidence/s4-chart-renderer/review.md)): `tests/browser_evidence_scene.mjs` now asserts the C2 fix (every category and value label visible at 1440 and 390 px, with and without JavaScript, no scroller), C19 (same chart size in both views) and the gate (an injected 600 px scroller fails with a conclusion-label issue). The evidence fixture gained `focus {categoryIds: ["claim-first"]}`; no other fixture field changed. The S2 captures in this folder are left as the S2 record; the S4 rerun captures are under the S4 evidence.

## Returned to the S1 field list

No new schema. These items amend S1's field decisions ([alignment §11](design-handoff-alignment.md#11-s1-result--contract-extension-2026-10-19)):

1. C1 — `ranked-bar` with exactly one series cannot carry a legend focus. Decide between a declared category focus and a focus series.
2. C7 — “absent `staticState` means the opening” holds for the player, not for existing no-JS output. Either require an explicit static state for new work or add an explicit migration.
3. C10 — declared-but-not-drawn chart and dataset fields are silently absent from HTML. Apply the refusal rule to them or draw them.
4. C6 — the embedded runtime needs a versioning rule before S4/S5 change the player.
5. C18 — the lock mapping now includes `staticState` under `cues` and `motion` (done in S2).

## Commands run for S2

```bash
git merge --ff-only claude/design-handoff-v3-contracts-21024a   # start from S1
npm test                                                          # before changes: 355 tests, 354 pass, 1 skipped
node --test tests/evidence-scene.test.mjs tests/handoff-contracts.test.mjs   # 20 pass
CHROMIUM_PATH=<isolated Chrome for Testing 151> PLAYWRIGHT_MODULE=<playwright 1.61.1 index.mjs> node tests/browser_evidence_scene.mjs
npm run verify
```

Final counts are in the [review](../evidence/s2-vertical-sample/review.md).
