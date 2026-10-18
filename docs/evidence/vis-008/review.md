# VIS-008 local component review — 2026-10-18

[Manual](../../en/components.md) · [简体中文说明](../../zh-CN/components.md) · [Machine review](review.json) · [Verification log](verify.txt) · [Browser log](browser-log.txt)

This is local semantic web/JSON implementation evidence. It does not certify native version 3 exports, authenticated generation hosts or a release. Source changes extend the existing VIS-002–007 working tree; no earlier work was discarded.

## Implemented scope

- Independent charts, diagrams, code and annotation modules; closed schema-derived contracts; source-bound derived scenes; per-component capability receipts; Visual Studio editing, local save/history and reproducible demonstration exports.
- Line/area, ranked bar, signed stacked comparison, numeric scatter and matrix/heatmap. Exact tables, units, explicit axis policies, null gaps and declared time zones share the original typed data. Ranking never rewrites source order; incomplete stacks never become partial apparent totals.
- Supplied node/edge directions, ordered sequence messages, annotated processes and stable block/node/edge/category/series anchors. JSON validation rejects deleted targets rather than guessing replacements. Scene movement and compositions preserve identities.
- Escaped exact code with tabs, CRLF/LF, final newlines and trailing spaces, authored emphasis and source anchors. Raw editing preserves uniform newline style; mixed separators use escaped JSON. No executable source blocks.

## Real browser and visual review

An isolated cached Chrome for Testing binary outside `/Applications` used ephemeral contexts and a temporary real loopback Studio library. No installed browser bundle or personal profile was modified. The component harness exercised English and Chinese in Cream Collage, Electric Violet and Dark Data at 390/1024/1440px, exact table disclosure by keyboard, no-JavaScript reading, all six data mutations with changed geometry/text/table, exact CRLF/tab text, local save/reload and code edits, page reorder and stable annotations. All 14 pages remain in each story, including the original four-page material. Three complete candidates per story are actually measured before rhythm selection.

Measurements include loaded browser fonts, DOM boxes, SVG text bounds against viewBoxes, effective rendered text sizes and internal scroll dimensions. Candidate selection rejects presentation components needing scrolling or text below 10px. Reading mode deliberately permits local horizontal scroll for charts, large diagrams and long exact code. Oversized labels are rejected with complete source retained. These measurements are bounded checks; they do not constitute exhaustive collision detection or optimal routing for arbitrary complex graphs.

Six component contact sheets, six complete-story contact sheets/full screenshots, representative graph/stack/scatter/matrix/code pages and actual editor captures were delivered as image input and inspected. Final review checks readable signs/values, missing-cell distinctions, arrow direction/return paths, code emphasis/source text, source artwork, chapter rhythm and theme/language continuity. The machine review lists exact files and hashes. The full raw screenshot and HTML set is reproducible under `dist/visual-components/acceptance/`; selected evidence is retained here.

Existing Visual Studio, composition and asset browser suites were rerun. They retain their independent scope: 22 Studio checks, 108 original candidate pages and 36 asset/crop cases. No external request or uncaught page error was observed by these runs.

## Failures and repairs

1. Initial SVG text-range unions included non-rendered title nodes and produced false scene-bound failures. Graphics use measured region bounds while every visible SVG text box is separately checked against its viewBox. [Original failure](initial-browser-failure.json).
2. The initial stack endpoint and scatter labels exceeded the SVG; fixed plot insets and inward endpoint anchors retain the full literal values. Narrow Chinese font metrics exposed a unit label above the viewBox; its baseline now leaves room. [Narrow failure](narrow-cjk-failure.json).
3. Actual screenshot inspection found arrows hidden by node rectangles and crowded zero/negative stack labels. Directed ports and separate return lanes now make direction visible; stacked plot insets and zero-label spacing prevent the observed overlap. [Before: arrows](initial-arrow-obscured.png) · [Before: stacks](initial-stack-labels.png).
4. The first legacy composition regression left only one feasible process candidate (1034px and 925px failures). Bounding graph width to 800px restores useful font scale and at least two feasible original candidates without deleting nodes, edges or explanation. Long sequences retain their natural width in a local scroll area; presentation candidates with scrolling fail.
5. A negative layout fixture originally exceeded the category schema's 100-character bound and was rejected before rendering. The fixture now stays within the contract and genuinely exercises browser label-overflow detection.
6. Inspection found Electric Violet's accent and secondary tokens are identical, so they could not distinguish heatmap signs. Heatmaps now use distinct chart-series tokens, literal signed values and sign/missing legends. Matrix row labels continue to carry series identities. Cream now has eight distinct series tokens, and violet chapter mode uses the legible dark-data chart palette.
7. Code editor review identified textarea newline normalization and potential stale full-block metadata overwrites. Metadata edits now retain the current raw text, uniform CRLF edits preserve their delimiters, and mixed separators require exact JSON editing.

8. Final verification caught the earlier authorization fixture still excluding VIS-008. The user explicitly authorized VIS-008 in this task; the capsule test now includes it and continues to exclude VIS-009. [Failed run](authorization-fixture-failure.txt).

## Boundaries and reproduction

Run `npm run verify`, then use an independently available Playwright QA module and an isolated `CHROMIUM_PATH` outside Applications:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_PATH=/isolated/testing/browser node tests/browser_components.mjs
npm run studio:components
```

The live Studio has no new runtime dependency, remote service, image generation/fetch or telemetry. Core data/code/labels remain DOM/SVG and typed project content; no slide is flattened to a screenshot. Source and generated output remain separate; demonstrations are written under `dist`. There was no publish, push or release action.

PowerPoint, Keynote and Figma are installed but were not used for this revision; v3 native compilers remain explicitly unsupported. After Effects is not installed in `/Applications`. Other browser engines, actual screen-reader/IME/200% zoom acceptance, remote CI and broader VIS-014 release gates remain open. Interactive animation stays with VIS-009. Code line anchors are authored line numbers, not automatic semantic tracking through source-line insertions; update those references explicitly when editing code.
