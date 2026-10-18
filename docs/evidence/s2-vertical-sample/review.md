# S2 vertical sample — evidence, 2026-10-19

One illustrative evidence scene ran through import, theme choice, font measurement, legend focus, pause/seek, static-state choice, gated HTML export and the exported views, in English and Simplified Chinese. The plan record and the full conflict list are in [design-handoff-vertical-sample.md](../../plans/design-handoff-vertical-sample.md). Nothing was committed or published; no roadmap status changed.

## Environment

- macOS (Darwin 27.0.0), Node v24.14.0.
- Chrome for Testing 151.0.7922.34 from the Playwright browser cache in the user's Library caches, outside `/Applications`. Playwright 1.61.1 from a local npx cache, loaded through `PLAYWRIGHT_MODULE`; it is not a project dependency. Every browser context used a Playwright temporary profile. Installed browsers and personal profiles were not touched.
- Studio ran on loopback with a temporary library that the script deletes. All non-loopback requests were blocked and counted: 0 occurred. Page errors: 0.

## Commands and results

```bash
npm test                                          # before S2 changes: 355 tests, 354 pass, 1 skipped
node --test tests/evidence-scene.test.mjs tests/handoff-contracts.test.mjs   # 20 tests, 20 pass
CHROMIUM_PATH=<isolated Chrome for Testing> PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/browser_evidence_scene.mjs   # ok: 18 stage records, 20 captures
npm run verify                                    # 362 tests, 361 pass, 0 fail, 1 skipped; types, check (1,113 files), build, demos
```

- [report.json](report.json) is the receipt of the final browser run: every stage result, measured fonts, timer counts, visibility checks, the declared PPTX/PDF levels and the capture hashes.
- `tests/handoff-contracts.test.mjs` still passes, including the byte-identical comparison of 12 HTML/JSON outputs and 12 resolved themes with [render-baseline.json](../../../tests/fixtures/visual/render-baseline.json). The baseline was not re-recorded. Two S1 assertions that expected the removed placeholder refusals now expect none, as S2 required.
- New unit tests ([evidence-scene.test.mjs](../../../tests/evidence-scene.test.mjs), 7 tests): fixture contract, theme switch equality, frozen no-JS markup and anchors, the remaining step/comparison refusal, Studio choice and locks, the runtime extension with a stubbed DOM, and the declared PPTX/PDF levels.

## Viewed images

All 20 captures of the final run were opened and looked at. The final run changed only the two Chinese 390 px JavaScript views relative to the previous run (a no-break space between value and unit); the other 18 are byte-identical to images viewed after the last layout change. Hashes are in the receipt.

| Capture | What was checked |
|---|---|
| [en-reading-1440](en-reading-1440.png), [zh-CN-reading-1440](zh-CN-reading-1440.png) | Reading view opens at cue 1 / 2 with three bars, the static value line, legend, chart caption, takeaway, caption and source. |
| [en-nojs-1440](en-nojs-1440.png), [zh-CN-nojs-1440](zh-CN-nojs-1440.png) | No JavaScript: the same three bars and value line, **View all data**, no controls. |
| [en-present-1440](en-present-1440.png), [zh-CN-present-1440](zh-CN-present-1440.png) | Presentation view on page 1 / 2 starts at cue 1 / 2. |
| [en-reduced-1440](en-reduced-1440.png), [zh-CN-reduced-1440](zh-CN-reduced-1440.png) | OS reduced motion: Replay disabled and the notice is visible beside the cue position. |
| [en-reading-390](en-reading-390.png), [zh-CN-reading-390](zh-CN-reading-390.png), [en-nojs-390](en-nojs-390.png), [zh-CN-nojs-390](zh-CN-nojs-390.png) | 390 px: value line readable; the plot scrolls, the three bars are clipped to the same visible length and the SVG values are off-screen (conflict C2). No page-level horizontal scroll. |
| [en-present-390](en-present-390.png), [zh-CN-present-390](zh-CN-present-390.png) | 390 px presentation view starts at cue 1 / 2; header controls wrap to two rows. |
| [en-studio-static-state](en-studio-static-state.png), [zh-CN-studio-static-state](zh-CN-studio-static-state.png) | The new **Static state for export and reduced motion** control next to **Use current chart / step as opening**, set to key state 1; the preview and the page thumbnail show the frozen selection. |
| [en-theme-dark-data-1440](en-theme-dark-data-1440.png), [en-theme-cream-collage-1440](en-theme-cream-collage-1440.png), [zh-CN-theme-dark-data-1440](zh-CN-theme-dark-data-1440.png), [zh-CN-theme-cream-collage-1440](zh-CN-theme-cream-collage-1440.png) | Same facts in both themes (opening state, all six bars); composition and display type differ. Chinese takeaway shows the untrimmed line-start `（` and the wide `）。` pair (conflict C12). |

Two crops were also inspected to judge headline tracking (no glyph collisions) and the Chinese line-start bracket.

## Not available or not run

- PowerPoint, Keynote and Figma are installed but were not opened: v3 has no PPTX/PDF/Figma compiler, and S2 added none. After Effects and LibreOffice were not found in `/Applications`.
- No Firefox or WebKit run, no screen reader, no IME, no 200 % zoom or print check, no authenticated host. Claude remains deferred.
- Remote CI did not run this change.

## Open issues

Twenty conflicts are recorded with file, state and reproduction in the [conflict list](../../plans/design-handoff-vertical-sample.md#conflict-list). Fixed in S2: C11 (global motion off dropped the fallback) and C18 (locks did not cover the static state); C6 is resolved for S2 by a conditional runtime extension and stays open as policy. The most visible open items: C1 (no legend focus on a single-series ranked bar), C2 (narrow ranked bars clip and hide values), C5 (the gate measures the opening, not the static state), C10 (declared chart/dataset fields are not drawn and not refused), C12–C13 (CJK punctuation and font proof).

## Reproduce

Use Node 22+ and an already installed isolated test browser outside `/Applications`:

```sh
npm run verify
CHROMIUM_PATH=/isolated/testing/browser PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_evidence_scene.mjs
```

The script writes the receipt, the imported project files, both exported HTML files and the captures under `dist/evidence-scene/` (set `DECKWEFT_EVIDENCE_OUT` to change it). Copy the captures and `report.json` here only after viewing them.
