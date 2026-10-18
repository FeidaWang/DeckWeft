# Existing-work explanatory interaction acceptance — 2026-10-18

**Follow-up:** The cover contrast blocker is closed by the [complete visual regression](../interaction-visual-regression/review.md). The failure below records the earlier run.

The existing Visual Studio now authors chart selection, diagram explanations and scene motion directly on saved work. No new product demo or alternate renderer was added. The new explicit opening action commits chart/step selections to the author plan; preview, reopened source and offline HTML compile the same initial state. Audience exploration remains transient. Other existing worktree changes were retained.

## Verified scope

- `npm run verify`: 334 tests passed, zero failures; types, source checks, reproducible packaging and existing export scripts passed. [Full output](verify.txt).
- `node --test tests/explanatory-interactions.test.mjs tests/motion.test.mjs`: 11 tests passed. Covers immutable source values, bilingual authoring, stable target identities, locks, opening compilation, stale-target rejection, replay, resource cleanup and existing source preservation.
- `tests/browser_explanatory_authoring.mjs`: isolated Chrome for Testing 151.0.7922.34, temporary profiles, real loopback Studio and actual HTML downloads. Both languages passed on an existing six-page source. New controls were used in the editor; existing source blocks, series and page count were independently compared after saves. Keyboard activated controls inside the scaled editor preview; ordinary pointer clicks exercised the unscaled downloaded HTML. Saved opening choices and authored explanation text survived reload and export. Desktop 1440px and 390px offline views, system reduced motion and zero remaining reduced-motion animation resources passed. No observed page errors/external requests. [Receipt](browser.json).
- Actual final English chart, Chinese flow and English editor screenshots were viewed. Earlier mobile/full-story screenshots were also viewed. The flow highlight uses an outline/stroke to preserve source text contrast. [Chart](chart.png) · [Flow](flow.png).

## Failed or limited checks

- The broader existing `tests/browser_interactions.mjs` gallery run stopped on the original non-interactive Cream Collage `collage` cover: its large `12` returned ratio 1 in the DOM/decorative-path contrast audit. This is not a passing gallery regression run; the failure receipt is retained separately in [gallery-regression.json](gallery-regression.json). The current-page integration suite above passes independently. No gallery/release roadmap gate was closed.
- Earlier integration-run failures were corrected: the test initially created assets in the parent rather than the visual store; a scaled-iframe Playwright pointer click hit another chart element, so editor activation uses native keyboard and offline export uses pointer; an assertion selected the last single-series preset instead of All series. These are not counted as passing runs.
- PowerPoint, Keynote and Figma are installed but were not opened/tested. After Effects was not found in `/Applications`. Native v3 compilers, real screen readers, other browser engines and host acceptance were not claimed. Browser app bundles and personal profiles were untouched.

## Reproduce

Use Node 22+ and an already installed isolated test browser outside `/Applications`:

```sh
npm run verify
CHROMIUM_PATH=/isolated/testing/browser PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_explanatory_authoring.mjs
```

The browser script writes inspectable receipts, the actual exported HTML and screenshots under `dist/explanatory-authoring/`. It uses a temporary local library and removes it after completion. Full source/runtime behavior is described in the [English manual](../../en/interactions.md) and [Chinese manual](../../zh-CN/interactions.md).
