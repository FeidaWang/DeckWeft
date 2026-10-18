# S4 chart renderer — evidence, 2026-10-19

The chart renderer now draws every S1 chart declaration it can, closes the chart conflicts C1, C2, C3, C10 and C19 from the [S2 vertical sample](../../plans/design-handoff-vertical-sample.md#conflict-list), and adds the six P1 kinds in the requested order. Decisions are recorded in the [alignment §11 field list](../../plans/design-handoff-alignment.md#s4-field-list-decisions-2026-10-19); expected results and recovery steps are in [components](../../en/components.md#chart-kinds-and-declarations-s4-2026-10-19) ([中文](../../zh-CN/components.md#图表类型与声明s42026-10-19)). State: **LocalVerified** (real local browser, viewed images). Nothing was pushed or published; no roadmap status changed.

## Environment

- macOS (Darwin 27.0.0), Node v24.14.0.
- Chrome for Testing 151.0.7922.34 from the Playwright browser cache in the user's Library caches, outside `/Applications`; Playwright 1.61.1 from a local npx cache through `PLAYWRIGHT_MODULE` (not a project dependency). Every browser context used a Playwright temporary profile. All non-loopback, non-file requests were blocked and counted: 0 occurred. Page errors: 0.
- Black-and-white captures use Chromium's own `achromatopsia` vision-deficiency emulation (CDP `Emulation.setEmulatedVisionDeficiency`), not a CSS filter.

## What changed

| Item | Result | Proof |
|---|---|---|
| C1 legend focus on a single-series ranked bar | Declared category focus (`focus {categoryIds}`); series focus only with two or more series. Focused bars solid, others lighter and outlined; legend **Focus: …** / **Other categories**. The S2 fixture declares `claim-first`. | [unit](../../../tests/chart-renderer.test.mjs) C1 test; S2 rerun stage "switch legend focus" |
| C2 narrow ranked bars | HTML rows with percentage marks: no scroller, values at the bar end, labels above bars at ≤ 700 px. `data-conclusion-label` marks every label the conclusion needs; the fit audit and the `/api/visual/measure` gate fail when one is hidden, clipped, scroll-only, off-screen or overlapping. | [report](report.json) `views` (119 labels per view, 0 hidden, 0 scrollers) and `gate` (200 clean, 422 `VISUAL_FIT` with an injected 640 px scroller); S2 rerun stage "conclusion-label gate" |
| C3 filter versus sort | The static statement states the author-order filter (n of N) and, for value-sorted charts, the sort and each shown category's rank among all. | unit C3 test (exact sentences, both languages); [filter-sort captures](en-1440-sheet.png) |
| C10 undrawn declarations | Question, takeaway, denominator, sample, normalization, better direction, version, collected date and valid period are visible text in both views. | unit C10 test; S2 rerun `views.*.content.question/chartTakeaway/definition` |
| C19 view parity | The JavaScript-only 290 px cap is gone. Interactive scenes keep the 900 px presentation budget through the same cap keyed on server-rendered markup (`:has(>.interaction-transcript)`), so both views draw the same size. The bundled runtime `chart()` returns the same bytes as the exported one for every kind. | unit C19 test; [report](report.json) `parity`; S2 rerun 1440 px sizes equal |
| S1 declarations | Drawn: log axes (line, scatter, dot-interval, small multiples), truncation with break mark and note (all filled kinds), author / ascending / descending sort (ranked bars, stacks by net total), intervals (line whiskers, dot-interval), events (numbered rules or row marks with relation notes), missing reasons (labels, notes, table). `CHART_TRUNCATION_UNIMPLEMENTED` and `CHART_SORT_UNIMPLEMENTED` are removed; `CHART_SCALE_`, `CHART_INTERVAL_` and `CHART_EVENTS_UNIMPLEMENTED` remain only for kinds without that drawing. | unit "declarations drawn" and "refusal codes" tests |
| P1 kinds, in order | C01 direct-labelled bar (`ranked-bar` + `sort: author`), C02 `grouped-bar`, C09 `dot-interval`, C13 `line` + `labels: end`, C17 `small-multiples`, C05 `benchmark-table` with dataset `qualifiers`. All six done. | [sample](../../../tests/chart-kinds.mjs), unit and browser tests |
| One data object | `chartFacts()` feeds marks, labels, notes, the text statement and the table; the JSON export is the dataset itself. A one-value change reaches the graphic, labels, statement, table and JSON export and nothing else (12 kinds × 2 languages). The table is byte-identical in all three themes. | unit "exact-data mutation", "theme switch" and "one data object" tests |
| Black and white | Series keep a distinct dash-and-shape pair (8 pairs), grouped bars name the series on every bar line, trend ends are labelled, focus uses outline as well as colour, **best** is a boxed word. | unit black-and-white test; [en](en-grayscale-sheet.png) / [zh-CN](zh-CN-grayscale-sheet.png) grayscale sheets |

## Commands and results

```bash
npm test                                       # before S4: 362 tests, 361 pass, 1 skipped
node --test tests/chart-renderer.test.mjs      # 13 pass (new)
node --test tests/evidence-scene.test.mjs tests/handoff-contracts.test.mjs   # 20 tests; 19 pass until the baseline is re-recorded, then 20
npm test                                       # 375 tests; see verification.md for the final count
CHROMIUM_PATH=<isolated Chrome for Testing 151> PLAYWRIGHT_MODULE=<playwright 1.61.1 index.mjs> node tests/browser_chart_kinds.mjs      # ok: 12 views, 132 captures + 10 sheets
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_evidence_scene.mjs      # ok: 20 captures (S2 sample rerun with S4 assertions)
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_interactions.mjs        # ok: 6 cases, 146 captures (existing suite)
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_components.mjs          # fails at the Studio dataset editor step, identically on base commit 232060e (pre-existing; see open issues)
```

- Four demos (component, interaction, visual, composition) in both languages were also loaded at 1440, 1024 and 390 px: fit `ok` everywhere, no page errors, no page-level horizontal scroll.
- Two existing suite assertions were adjusted for intended changes: `browser_interactions.mjs` now compares the plot (`.chart-plot svg,.chart-rows`), because legend keys are SVG too; the S1/S2 unit tests now expect the drawn declarations instead of the placeholder refusals, and the interval bounds in the line domain.

## Viewed images

Every image in this folder was opened and looked at, plus each per-scene capture behind the sheets during iteration.

| Image | What was checked |
|---|---|
| [en-1440-sheet](en-1440-sheet.png), [zh-CN-1440-sheet](zh-CN-1440-sheet.png), [en-1024-sheet](en-1024-sheet.png), [zh-CN-1024-sheet](zh-CN-1024-sheet.png) | All twelve scenes: question, caption, plot, legend, notes, takeaway and definition line; focus contrast; truncation break mark; log decades; event numbers; benchmark best boxes and qualifier marks. |
| [en-390-sheet](en-390-sheet.png), [zh-CN-390-sheet](zh-CN-390-sheet.png), [en-390-nojs-sheet](en-390-nojs-sheet.png), [zh-CN-390-nojs-sheet](zh-CN-390-nojs-sheet.png) | Row kinds stack labels above bars with values at bar ends; dot-interval text above its interval; benchmark rows become labelled cards; trends and small multiples fit; no page scroll. Legacy log-line, stacked and area plots still scroll inside the figure (open). |
| [en-grayscale-sheet](en-grayscale-sheet.png), [zh-CN-grayscale-sheet](zh-CN-grayscale-sheet.png), [en-grayscale-trend](en-grayscale-trend.png) | In grayscale the trend series differ by dash, marker and end label; grouped bars by their per-line year label; dot-interval by circle versus square; focus by outline. |
| [en-1440-direct-bar](en-1440-direct-bar.png), [en-1440-trend](en-1440-trend.png), [en-1440-benchmark](en-1440-benchmark.png), [en-1440-dot-interval](en-1440-dot-interval.png), [zh-CN-1440-trend](zh-CN-1440-trend.png), [zh-CN-1440-benchmark](zh-CN-1440-benchmark.png) | Full-size reads of the new kinds; Chinese notes use full-width parentheses and commas. |
| [en-390-direct-bar](en-390-direct-bar.png), [en-390-dot-interval](en-390-dot-interval.png), [zh-CN-390-grouped](zh-CN-390-grouped.png), [zh-CN-390-small-multiples](zh-CN-390-small-multiples.png) | Full-size narrow reads. |
| [s2-rerun/en-reading-1440](s2-rerun/en-reading-1440.png), [s2-rerun/en-nojs-1440](s2-rerun/en-nojs-1440.png) | The S2 sample at its static state with and without JavaScript: same three bars, same size, filter and rank statement, focus on Claim first. |
| [s2-rerun/en-reading-390](s2-rerun/en-reading-390.png), [s2-rerun/en-nojs-390](s2-rerun/en-nojs-390.png), [s2-rerun/zh-CN-reading-390](s2-rerun/zh-CN-reading-390.png), [s2-rerun/zh-CN-nojs-390](s2-rerun/zh-CN-nojs-390.png) | C2 fixed: every bar and value visible at 390 px, nothing scrolls. |

## Byte identity

`chart()` is embedded in every export, so this change re-records the render baseline deliberately in a separate, final commit, with `WEB_RENDERER_VERSION` raised to `visual-art-direction.4`. The per-entry diff that keeps text, values and anchors is recorded with that commit (see below once it lands).

## Not available or not run

- PowerPoint, Keynote and Figma are installed but were not opened: v3 has no PPTX/Keynote/Figma compiler and S4 added none. After Effects and LibreOffice were not found in `/Applications`.
- No Firefox, Safari or WebKit run; no screen reader, IME, 200 % zoom or print preview. Print colour is requested with `print-color-adjust: exact` on chart marks and legend keys but was not printed.
- No authenticated host run; Claude remains deferred. Remote CI did not run this change.

## Open issues

- Legacy point-labelled `line`, `area`, `stacked`, `scatter` and `heatmap` plots still use the 600 px minimum width and scroll inside the figure below 700 px; their labels are not marked as conclusion labels. At ≤ 700 px their in-plot unit label also overlaps a long top tick label ("KB" over "100000" on the log line, "%" over "99.6" on the truncated area). A narrow layout for them is S4 follow-up work.
- At 390 px the scene padding differs by 2 px per side between the JavaScript and no-JavaScript views (art direction keys it on `.has-interactions`), so the frozen chart is 4 px narrower without JavaScript; height and marks are equal (S3).
- The runtime still offers a degenerate series switch on single-series charts and lists range options in author order without ranks (C1, C3 interaction state: S5). Its selection explanation still names the last author-order category (C4, S5).
- C04 sortable ranking matrix, C06 connected cost–performance frontier (the log axis is done), C23 dated milestone axis and C22 slider are not started.
- `tests/browser_components.mjs` cannot fill the Studio dataset editor (element not visible) on both this branch and base commit 232060e; its export, fit and mutation stages pass before that step.
- The narrow dot-interval layout leaves the interval about one line below its value text; it reads correctly but is loose.
