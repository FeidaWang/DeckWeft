# Interaction visual regression closure — 2026-10-18

The cover metric now has an explicit blue DOM surface behind the complete number and description. The enlarged cream text no longer crosses onto the cream portion of the decorative diagonal. The original values, text, source references and editable components remain intact; no slide was flattened and no contrast threshold was weakened.

Actual mobile image review also exposed overlapping Submit/Revise labels on opposite edges. The responsive diagram renderer now assigns separate arrow tracks and label rows for repeated/reverse adjacent-node edges, with enough vertical spacing for their label lines. The gallery regression independently checks edge-label rectangle intersections. Renderer identity advanced to `visual-art-direction.3` to invalidate earlier scene receipts.

## Final validation

- `npm run verify`: **338 tests passed**, zero failed/skipped, plus types, source checks, reproducible packaging and existing exports. [Log](verify.txt).
- `tests/browser_interactions.mjs`: **6 complete 15-page stories, 146 captures, 16 check groups**, covering both languages and all three themes. Actual 1440/1024/390px rendering, six chart families, exact source data/code, image comparisons/hotspots, diagram/code explanations, keyboard/touch, reduced motion, finite replay, pause/seek, native scene/pagehide/background-tab cleanup, saved author configuration, independent locks, conflicts and history restore/reorder all pass. No observed page errors or external requests. Three complete composition candidates per story produced **219/270** passing candidates, with at least two feasible choices for every page; this is the current measured count, not the older 264/270 receipt. [Full gallery receipt](gallery.json) · [Native background visibility](native-visibility.json).
- `tests/browser_explanatory_authoring.mjs`: English and Chinese existing-work authoring/save/reload/actual HTML downloads pass; original blocks, values and page count remain unchanged. Saved chart/step openings survive preview, reopen and offline export. Desktop and 390px reduced-motion checks pass. [Receipt](authoring.json).
- `tests/browser_interaction_visual_parity.mjs`: **216 preview/export image pairs** pass across six stories, all 15 pages at 1440/390px, plus selected chart/process/image-comparison states. Actual loopback preview HTML and measured downloadable HTML match byte for byte. Scene markup and selected semantic state are checked separately. PNGs are decoded and compared; one-level channel rounding is allowed, with sparse SVG edge differences capped at 16 channel levels on at most 10 pixels per million. Geometry/content changes and larger differences fail. This is a documented raster tolerance, not a claim of byte-identical PNGs. [Detailed pixel receipt](parity.json).

The browser was isolated Chrome for Testing 151.0.7922.34, outside `/Applications`, with temporary profiles. No installed browser or personal profile was modified. QA packages are external test tools; no runtime dependency was added.

## Source publication and clean-checkout acceptance

The source was pushed to [GitHub main](https://github.com/FeidaWang/DeckWeft). Source commit `5427aa9b10e07aea5ea0734562be6d01d4a1a92e` passed the complete Node 22 pipeline on Ubuntu, macOS and Windows, including locked dependency installation and artifact upload. A fresh local archive of that exact committed source also passed `npm ci` and all 338 tests/types/check/build/export gates. [Remote run](https://github.com/FeidaWang/DeckWeft/actions/runs/39125595637) · [Structured proof and earlier CI failures](publication.json) · [Clean installation](clean-checkout-install.txt) · [Clean verify](clean-checkout-verify.txt).

The initial Windows run exposed a test URL/filesystem-path error. Subsequent runs revealed intermittent `EPERM` on atomic checkpoint replacement while readers were active. The final writer retries only the same rename on Windows `EPERM`/`EACCES`/`EBUSY`, staggered and bounded by 50 attempts / 5 seconds. It never deletes the destination or changes permissions. Four new tests cover transient contention with old JSON preserved, persistent failure without data loss, immediate nonmatching errors and actual concurrent checkpoint readers. All functional assertions remain enforced; the workbench polling helper uses a wall-clock deadline and reports background write errors.

## Actual image review

The primary agent viewed all six complete-story contact sheets and all six selected-interaction sheets, plus native desktop/mobile covers, corrected English/Chinese mobile process views, preview/export process pairs and actual English/Chinese editor captures. Tall story sheets were downscaled, so native component screenshots were also inspected. The inspected scope shows no new content clipping, missing source values or explanation/selection mismatch after the two documented rendering repairs.

[Desktop cover](cover-desktop.png) · [Mobile cover](cover-mobile.png) · [Corrected mobile flow](flow-mobile.png) · [English editor](en-editor.png) · [Chinese editor](zh-CN-editor.png).

Contact sheets are retained beside this review as `LANG-THEME-story-contact.png` and `LANG-THEME-interaction-contact.png`. All native images and actual downloadable HTML remain reproducible under `dist/visual-interactions/acceptance`, `dist/interaction-visual-regression` and `dist/explanatory-authoring`; build output is not committed.

## Earlier failures and boundaries

The prior [cover contrast failure](../explanatory-authoring/gallery-regression.json) remains as historical evidence; this run supersedes its open blocker. One later gallery attempt used a closed editor inspector; the harness now opens **Edit page** and the Content tab using the real UI, without force clicks or hidden-node overrides. A later native-pointer history activation did not deliver a snapshot request; the final harness uses native Enter activation and requires the actual history response before inspecting/restoring it. [Retained attempt](history-activation-attempt.txt). Native image review found the mobile edge-label overlap after the initial machine pass, leading to the new independent overlap assertion and another complete passing run.

The initial pixel comparison demanded identical PNG hashes and found one pixel with a one-level channel difference. A later run found three SVG-outline edge pixels differing by 12 levels; the bounded raster tolerance above records such compositor noise while exact HTML/markup/state comparisons remain required. [Retained attempt](parity-attempt.txt).

PowerPoint, Keynote and Figma are installed but were not opened/tested for this batch. After Effects was not found in `/Applications`. Other browser engines, real screen readers/IME/200% zoom, projection and native v3 compilers remain outside this acceptance. No broader host or VIS-014 release gate is closed by this regression run.

## Reproduce

Use Node 22+ and an already installed isolated browser outside `/Applications`:

```sh
npm run verify
CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_interactions.mjs
CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_explanatory_authoring.mjs
CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/absolute/playwright/index.mjs node tests/browser_interaction_visual_parity.mjs
```

Each browser runner uses an independent temporary local library. The gallery also opens a separate isolated headed browser for native background-tab acceptance.
