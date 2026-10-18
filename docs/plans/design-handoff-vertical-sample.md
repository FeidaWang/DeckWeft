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

## S5 update (2026-10-19)

S5 ([evidence](../evidence/s5-motion-state/review.md)) fixed C4, C5, C8, C14 and C20, decided C6 (one player, version rule, separate baseline hashes) and C7 (keep), and changed the C1 symptom: the ranked-bar series buttons now focus rather than hide, so their pressed state is right, but a category focus is still undecided. The other conflicts are unchanged.

## Conflict list

State: **Open** = listed, not changed in S2; **Fixed** = changed in S2 with tests. Reproductions use Node 22 and the browser command in the [review](../evidence/s2-vertical-sample/review.md).

| ID | Kind | File | State | Reproduction | Next owner |
|---|---|---|---|---|---|
| C1 | Contract / interaction | [validate.mjs](../../src/components/validate.mjs) (ranked bars need exactly one series), [charts.js](../../public/runtime/charts.js) (series focus) | Open — back to the S1 field list (S5 changed the controls) | Since S5 the series buttons focus one series (`data.focus`) and the checkboxes hide series; on the ranked bar the focus button and **No focus** now report the right `aria-pressed`, but focusing the only series changes no mark. A category focus for ranked bars is still undecided. | S1 field list (a declared category focus), then S4 |
| C2 | Chart / export | [styles.mjs](../../src/render/web/styles.mjs) `.chart-plot svg{min-width:600px}`; [render.mjs](../../src/components/charts/render.mjs) value labels at x = 666 / 800; [visual-api.mjs](../../src/services/visual-api.mjs) `measure` ignores component scroll width | Open (high) | View `*-reading-390.png` / `*-nojs-390.png`: the plot scrolls (scrollWidth 600 > clientWidth 342–346), the three bars are clipped to the same visible length and the value labels are off-screen. The fit gate still passes. S2's static statement keeps every value readable as text; the drawing itself can mislead. | S4 (narrow ranked-bar layout) and the gate |
| C3 | Interaction | [charts.js](../../public/runtime/charts.js) range selects; [timeline.mjs](../../src/motion/timeline.mjs) `selectedDataset`; [model.mjs](../../src/components/charts/model.mjs) value order | Open | In a copy of the fixture, reorder `categories`/`categoryIds`/`values` so author order differs from value order, then choose **From**/**To**: the range is an author-order slice, so the visible bars are not adjacent ranks. The sample avoids this by using value order as author order. | S4 / M13 (separate filter from sort) |
| C4 | Interaction copy | [charts.js](../../public/runtime/charts.js) `captionText`, [timeline.mjs](../../src/motion/timeline.mjs) `captionSubject`, [cues.mjs](../../src/motion/cues.mjs) `captionOrder` | Fixed in S5 | The explanation line follows the focus: the top rank of the current range on a ranked bar (“Claim first … 38 %” at every key state), the last category in range on other charts, for the focused series or every shown series. Before/after on the S2 player in the browser: “Data first … 27 %” → “Claim first … 38 %”. [Test](../../tests/motion-state.test.mjs), [S5 evidence](../evidence/s5-motion-state/review.md). | — |
| C5 | Gate | [semantic.js](../../public/runtime/semantic.js) `measureAt`/`showAt`, [runtime.mjs](../../src/render/web/runtime.mjs) `measure()`, [visual-api.mjs](../../src/services/visual-api.mjs) `measure` | Fixed in S5 | The fit receipt has `checks` at the opening and `states` for every declared static state; the server refuses a receipt without a passing entry for each (wrong key state, wrong position, overflow or text outside). Studio measured 5 static states in the demo and 1 in the evidence scene in both languages. [Test](../../tests/motion-state.test.mjs), [S5 evidence](../evidence/s5-motion-state/review.md). | — |
| C6 | Contract / process | [runtime.mjs](../../src/render/web/runtime.mjs) `PLAYER_VERSION`, [render-baseline.mjs](../../tests/render-baseline.mjs), [render-baseline.json](../../tests/fixtures/visual/render-baseline.json) | Fixed in S5 (policy decided) | S5 folded the S2 extension into the one player and re-recorded the baseline in its own commit. Rule: every change to the player bytes bumps `PLAYER_VERSION` and re-records the baseline; `playerHistory` fails when one version names two byte sequences; separate markup/data/script/style hashes show what moved. | S4 follows the same rule for chart renderer changes |
| C7 | Contract | [document.mjs](../../src/render/web/document.mjs), [cues.mjs](../../src/motion/cues.mjs) (`staticInteractionState`: absent = opening) | Decided in S5: keep | Without a declared `staticState` the no-JS view keeps drawing the complete authored data and the player opens at the opening; existing output does not change. Freezing the opening is an explicit author choice (a key state at position 0 as the static state), not a migration. [Test](../../tests/motion-state.test.mjs); recorded in [alignment §11](design-handoff-alignment.md#s5-decisions-on-the-field-list-2026-10-19). | — |
| C8 | Export | [static-state.mjs](../../src/render/web/static-state.mjs), [capabilities.mjs](../../src/targets/capabilities.mjs) | Fixed in S5 | Frozen diagram and code steps, comparison tabs and hotspots are drawn without JavaScript (marked targets, closed original-image disclosure, numbered markers, a statement line each); `STATIC_STATE_UNIMPLEMENTED` is removed. [Test](../../tests/motion-state.test.mjs), [S5 evidence](../evidence/s5-motion-state/review.md). | — |
| C9 | Theme | [profile.mjs](../../src/design/profile.mjs) `applySceneTheme` | Open (low) | dark-data → cream-collage → dark-data writes `colorMode: "default"` that the original scene omitted. Facts and rendering are equal; the scene source hash and render hash change. | S3 |
| C10 | Contract / export | [capabilities.mjs](../../src/targets/capabilities.mjs), [render.mjs](../../src/components/charts/render.mjs) | Open — back to the S1 field list | The fixture's chart `question` and `takeaway`, and the dataset `definition`, `version`, `collectedAt` and `validPeriod`, appear nowhere in the HTML, and HTML capabilities refuse none of them. F05's “units, dates and samples readable” is met here only because the authored caption repeats the definition in prose. | S1 field list (refuse or draw), S4 (draw) |
| C11 | Motion | [web.mjs](../../src/motion/web.mjs) | Fixed | With `visualBrief.profile.motionIntensity: "off"`, the runtime data replace `scene.motion`, which dropped `reducedMotion`. The static-state runtime entry now carries it ([test](../../tests/evidence-scene.test.mjs)). | — |
| C12 | Font | [styles.mjs](../../src/render/web/styles.mjs), [art-direction.mjs](../../src/render/web/art-direction.mjs); theme typography | Open | Chinese takeaway at 1440 px: the line starting with `（19%）` is indented by half an em (no line-start trimming), and `）。` keeps two full widths (no pair compression), in PingFang SC and Songti SC. In cream-collage the line-end `——` extends past the measure. A fix changes every export's CSS. | S3 / S8 theme typography |
| C13 | Font / gate | [runtime.mjs](../../src/render/web/runtime.mjs) `measure()`; [visual-api.mjs](../../src/services/visual-api.mjs) | Open | The gate's `fonts[].loaded` is `document.fonts.check()` over system stacks, which is always true here (0 font faces). It cannot tell which family drew the text; the table above needed Chromium's platform-font report. The document header renders in Arial (plus PingFang SC for Chinese) in every theme. | S3 / S8 |
| C14 | Interaction | [keys.js](../../public/runtime/keys.js) `turnsPage()` | Fixed in S5 | The guard uses `Element.closest()` over controls, links, sliders, tabs, editable fields and every `[tabindex]` element, and ignores modified keys. Keyboard traces at 1440 and 390 px in both languages: 2,864 presses (8 keys on every visible control, disclosure, tab, scrollable code block and chart mark of 7 scenes), 0 page changes; with nothing focused ArrowRight/ArrowLeft still turn the page. Before/after on the S2 player: a focused mark plus ArrowRight went 1 / 2 → 2 / 2; now it stays 1 / 2. [S5 evidence](../evidence/s5-motion-state/review.md). | — |
| C15 | Import | [visual.js](../../public/studio/visual.js) `#projectFile`; [visual-api.mjs](../../src/services/visual-api.mjs) `import` | Open | Studio imports visual-project JSON only. Datasets arrive inside the presentation JSON; there is no CSV or sheet import. | S9 |
| C16 | Studio | [visual.js](../../public/studio/visual.js) interaction JSON editor | Open | Key states cannot be created or edited in Studio; the JSON field accepts `interactions`, `cues` and `motion` only. S2 adds the static-state choice over existing key states. | S9 |
| C17 | Export levels | [capabilities.mjs](../../src/components/capabilities.mjs), [targets/capabilities.mjs](../../src/targets/capabilities.mjs) | Open | No L1/L2/L3 declaration exists; see stage 9. | S7 |
| C18 | Locks | [visual-project.mjs](../../src/core/visual-project.mjs), [interactions.js](../../public/studio/interactions.js) | Fixed | S1 mapped no lock to `staticState`. Cue and motion scene locks now keep the chosen key state and its position; adding an unrelated key state stays allowed ([test](../../tests/evidence-scene.test.mjs)). | S1 lock mapping text |
| C19 | Layout parity | [styles.mjs](../../src/render/web/styles.mjs) `.has-interactions .chart svg{max-height:290px}` | Open (low) | At 1440 px the same frozen chart is 780 × 290 px with JavaScript (smallest label ≈ 10 px) and 780 × 390 px without it. Compare `*-reading-1440.png` with `*-nojs-1440.png`. | S4 |
| C20 | Studio | [interactions.js](../../public/studio/interactions.js) `useInteractionOpening`, [visual.js](../../public/studio/visual.js), [runtime.mjs](../../src/render/web/runtime.mjs) `deckweft:opening` | Fixed in S5 | The reply carries `position`, `exploring` and `staticPosition`; Studio refuses (“The preview shows cue position 1 (the static state), not an explored selection …”) unless the author explored or the preview is at position 0, and changes nothing. Reproduced and verified in the browser in both languages. [Test](../../tests/motion-state.test.mjs), [S5 evidence](../evidence/s5-motion-state/review.md). | — |

## Returned to the S1 field list

No new schema. These items amend S1's field decisions ([alignment §11](design-handoff-alignment.md#11-s1-result--contract-extension-2026-10-19)):

1. C1 — `ranked-bar` with exactly one series cannot carry a legend focus. Decide between a declared category focus and a focus series.
2. C7 — “absent `staticState` means the opening” holds for the player, not for existing no-JS output. Either require an explicit static state for new work or add an explicit migration. **Decided in S5: keep** (no migration; freezing the opening is an explicit static state at position 0).
3. C10 — declared-but-not-drawn chart and dataset fields are silently absent from HTML. Apply the refusal rule to them or draw them.
4. C6 — the embedded runtime needs a versioning rule before S4/S5 change the player. **Decided in S5:** `PLAYER_VERSION` plus a baseline re-recording in its own commit ([§11](design-handoff-alignment.md#s5-decisions-on-the-field-list-2026-10-19)).
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
