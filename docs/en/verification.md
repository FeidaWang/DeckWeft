# Verification — 0.1.0-alpha.2

[中文](../zh-CN/verification.md) · [Release changes](alpha-2.md) · [Host instructions](host-acceptance.md)

Prepared 2026-10-16. These are observed local results, not a promise that every host, font or browser works. Raw timestamps retain the environment clock. The alpha.1 evidence is archived separately under `docs/evidence/alpha.1/`.

## S5 motion state and player conflicts — 2026-10-19

The S2 static-state extension is folded into one embedded player (`PLAYER_VERSION` `semantic-player.2`) with one cue clock (play, pause, seek, next, previous, restart, reduced motion), six named motion primitives with declared reduced-motion results, separate EvidenceStage chart state (focus is not hiding), a key guard that never turns the page from a focused control or chart mark, a gate that also measures every declared static state, a Studio opening action that refuses to copy the static state, and frozen steps, comparison tabs and hotspots without JavaScript. Absent `staticState` output is unchanged (C7). `render-baseline.json` was re-recorded deliberately in its own commit: the 10 HTML entries changed only in player script and CSS (plus added fields in the interaction demo's runtime data); reader-visible markup, both JSON entries and all 12 themes are unchanged. `npm run verify` passed **373 tests** (372 pass, 1 environment-gated skip), plus types, source/link checks, packaging and demos. `tests/browser_motion_state.mjs` passed in isolated Chrome for Testing 151 with temporary profiles: 2,864 keyboard presses at 1440 and 390 px in both languages changed no page; all 28 captures were viewed. The S2 script, VIS-009 acceptance and explanatory-authoring browser tests pass on the new player; the preview/export parity test fails on 390 px diagram edge pixels on both the S2 commit and this build. PowerPoint, Keynote and Figma were installed but not run; After Effects and LibreOffice were not found. [Evidence](../evidence/s5-motion-state/review.md) · [Conflicts](../plans/design-handoff-vertical-sample.md#s5-update-2026-10-19) · [Interactions](interactions.md#cue-clock-motion-and-keyboard).

## S2 design-handoff vertical sample — 2026-10-19

One illustrative evidence scene (claim, ranked bar, source, focus) ran through Studio import, two theme packs, font measurement, mouse and keyboard focus, pause/seek, the new static-state choice, the existing measured-export gate and the exported views, in English and Simplified Chinese. Static output now applies a declared `staticState` to chart selections, and `reducedMotion: "static"` shows it instead of playing cues; existing output stays byte-identical. `npm run verify` passed **362 tests** (361 pass, 1 environment-gated skip), plus types, source/link checks, packaging and demos. `tests/browser_evidence_scene.mjs` passed in isolated Chrome for Testing 151 with temporary profiles; all 20 captures at 1440 and 390 px were viewed. Keyboard focus never changed the page and rapid navigation left 0 pending timers. PowerPoint, Keynote and Figma were installed but not run (no v3 compiler); After Effects and LibreOffice were not found. Twenty conflicts are listed with reproductions. [Evidence](../evidence/s2-vertical-sample/review.md) · [Conflict list](../plans/design-handoff-vertical-sample.md).

## S1 design-handoff contract extension — 2026-10-19

Contract-only change, state **Implemented**. The four v3 schemas gained optional handoff fields (scene takeaway, content status, key states and static state; dataset identity, definitions, missing reasons, intervals and events; per-chart scale, sort and truncation; motion trigger/clock/reduced-motion; theme token roles). `npm run verify` passed **355 tests** (354 pass, 1 environment-gated skip), regenerated types, source/link checks over 1,083 files, reproducible packaging and demos. Thirteen new tests cover the six misreading guards with a passing and a failing case each, the legacy and negative fixtures, the explicit `declareChartSemantics()` migration, lock mapping and theme defaults; one test proves that 12 existing HTML/JSON outputs and 12 resolved themes match the hashes recorded before the change. No browser, host, PowerPoint, Keynote, Figma or After Effects run; nothing was visually inspected. Declarations without a renderer are refused for HTML with a named code. [Fields and recovery](architecture.md#version-3-handoff-fields-s1-2026-10-19) · [Plan record](../plans/design-handoff-alignment.md#11-s1-result--contract-extension-2026-10-19).

## Interaction visual regression closure — 2026-10-18

The cover number now has an explicit contrasting surface; mobile reverse-edge labels use separate rows/tracks. `npm run verify` passed **338 tests**. The complete interaction gallery passed **6 stories / 146 captures** at 1440/1024/390px, including native touch/background cleanup, locks and history. Existing-work authoring passed in both languages. **216 actual preview/downloaded-HTML image pairs** passed with exact HTML/scene/state checks and documented raster rounding tolerance. All six story and interaction contact sheets plus native cover/flow/editor images were viewed. No observed page errors/external requests. PowerPoint/Keynote/Figma were not run; After Effects was not found. [Full evidence, repairs and limits](../evidence/interaction-visual-regression/review.md). This supersedes the older open cover-contrast blocker below.

The committed runtime source also passed a fresh local `npm ci`/verify and all three GitHub Node 22 jobs. Windows CLI test paths and transient atomic replacement contention were repaired with retained assertions and four new persistence tests. [Remote CI and publication receipt](../evidence/interaction-visual-regression/publication.json).

## Existing-work explanatory interactions — 2026-10-18

`npm run verify` passed 334 tests plus types, source, reproducible packaging and existing exports. The existing Studio authoring/save/reload/measured-HTML path passed in English and Chinese, with offline pointer interaction at 1440/390px, reduced-motion state and zero observed page errors/external requests. Actual chart, flow and editor screenshots were inspected. The older interaction gallery run stopped at the non-interactive cover number contrast check; it is not recorded as passing. PowerPoint/Keynote/Figma were not tested; After Effects was not found. [Evidence and limitations](../evidence/explanatory-authoring/review.md).

## Visual expression in existing work — 2026-10-18

The shared v3 renderer now derives display/body/caption hierarchy, bounded reading widths, open versus structured spacing and coordinated Cream Collage / Electric Violet / Dark Data palettes for existing projects. Chinese metric and reading headings have separate type tiers. Tall images scale within their authored aspect/crop. Measured rhythm includes narrative suitability as well as adjacent repetition; failed candidates remain excluded. Renderer identity and source-byte review checks invalidate older receipts. No new production demo, runtime dependency, bundled font, provider or upload was added.

`npm run verify` passed **331 tests**, types, source/link checks, reproducible packaging and examples. Current in-app browser work checked the existing English/Chinese six-page projects at 1440/1024/390px, with actual desktop and mobile image inspection. Thirty-six current composition candidates yielded **32 passes**, at least two choices for every page. Overheight variants remain explicit failures. Earlier image/data height failures and fragmented Chinese titles were observed and repaired; no clipping or source omission was used to pass. The original semantic document, assets, crops and author fields were checked equal after applying/saving measured rhythm. An actual UI HTML download matched the shared renderer byte for byte and retained 81.25%, six native headings and embedded local imagery without editor DOM or font files.

Local screenshots, source comparisons, candidate results and the verify log are in `dist/art-direction-review/`; contact sheets are crops of those actual screenshots. These observations do not add a live coding-host, bound image-review export, remote CI, other-engine, screen-reader or native application acceptance. PowerPoint, Keynote, Figma and After Effects were not opened or probed for availability in this pass. Roadmap acceptance states remain unchanged.

## Existing workbench refinement — 2026-10-18

The `/visual` workbench now opens with the presentation canvas and a derived-scene filmstrip. Creation and page editing use separate collapsible sidebars; composition exploration, image review, file/history and recovery use disclosures. Local mode labels its exact-text behavior and no longer duplicates a single supplied page. Page/project design scope is independent from revision scope. Audience export still uses the scene renderer and existing review gate.

`npm run verify` passed **326 tests**, types, source/link checks, reproducible packaging and demos. Added regression checks cover single-page preservation, another supplied topic/private-brief exclusion, and script-free one-scene thumbnails including embedded images and an invalid-scene 404. Current in-app browser checks covered two local input topics, exact 81.25% retention, one-page results, unreviewed export blocking, sidebar edit retention, thumbnail/previous-next/keyboard navigation, enlargement, conditional Codex permission and English/Chinese responsive UI. Desktop and 390px reading screenshots were saved and actually inspected in `dist/workspace-review/`. The optional external-browser scripts were updated for the new disclosures but were not rerun. No live Codex/Claude operation, bound image-review export, remote CI or native application acceptance is added. PowerPoint, Keynote, Figma and After Effects were not opened; their availability was not probed in this pass. Roadmap acceptance states remain unchanged.

## VIS-013 — prompt-first workbench, 2026-10-18

`npm run verify` passed **323 tests**, types, source/link checks, reproducible packaging and demos. The real UI covers prompt/local-source generation without manual layout edits, actual isolated-browser PNG capture, explicit review boundaries, and an actual Codex distinct page-4 revision followed by required-image findings and changed reviewed HTML. Author locks, source/data/assets, private-note exclusion, stale sequences and last accepted HTML remain checked. The existing 22-check Visual Studio browser regression passes. Desktop/mobile UI and native story/component screenshots were actually viewed. Claude login/live stays deferred; PowerPoint/Keynote/Figma were not opened, AE was unavailable. VIS-013 is implemented-local; broader VIS-014 release/engine/accessibility/native gates stay open. [Manual](workbench.md) · [Evidence](../evidence/vis-013/review.md).

## VIS-012 — coding-host adapters, 2026-10-18

`npm run verify` passed **312 tests**, types, source/link checks, reproducible build and demos. Actual Codex structured drafting, required captured-image findings and a distinct page-4-only revision now complete the strict loop through two reviewed HTML exports with different hashes; source/data/assets and other scenes stay equal. Earlier no-op exports and exhausted repair attempts remain historical failures. The responsive closure adds 14 bilingual resize cases plus the existing component/interaction browser regressions. Claude only received version/help probes; login/live tasks stay deferred. Desktop/mobile stories and native chart/diagram captures were actually viewed; see the closure evidence for exact files. PowerPoint/Keynote/Figma were not opened; AE was not found under `/Applications`. VIS-012 is implemented locally with **partial acceptance**. [Evidence, failures and limits](../evidence/vis-012/review.md) · [Manual](hosts.md).

## Requirements reconciliation — 2026-10-18

The updated visual-first requirements, task dependencies and next-work handoff have been aligned with the current uncommitted implementation. This documentation pass reran `npm run verify`: **290 tests passed**, types, source/link checks, reproducible build and demos. It adds no browser/image, host, native-application or remote CI acceptance. [Scope and validation](../evidence/roadmap-reconciliation/review.md).

## VIS-011 — local task orchestration, 2026-10-18

`npm run verify` passed **290 tests**, types, source checks, reproducible build and demos. Real isolated Chromium 153.0.8010.12 covered a complete supplied story, page-4-only exact-data revision, bounded repair and author-locked failure at 1440/390px. Thirteen final screenshot paths were actually viewed, three outputs received bound image judgments and final HTML validation, and an actual failed rerun retained the accepted source/HTML bytes. The 22-check bilingual Studio regression also passed. Eleven controller tests use explicitly synthetic capabilities; no authenticated host/model execution is claimed. PowerPoint/Keynote/Figma were not run; AE was unavailable. External fact verification, native v3 exports, wider accessibility/engine checks, VIS-012 and VIS-013 remain open. [Manual](task-loop.md) · [Evidence](../evidence/vis-011/review.md) · [Log](../evidence/vis-011/verify.txt).

## VIS-010 — browser quality and actual image review, 2026-10-18

`npm run verify` passes **279 tests**, types, source, reproducible build and demos. The final isolated Chromium run passes six 15-scene stories at 390/1024/1440px: 234 real action traces and 1,872 region coverage records. Five injected fault classes fail their appropriate checks. Actual pixel delivery and recorded judgments complete the source/layout/state-bound receipts; 48 image outputs were inspected. Every ordinary repair changes one scene in one round; a separate locked two-round browser failure retains byte-identical last-valid HTML and the incomplete candidate. The 22-check Studio browser regression passes. Nonblocking missing-marker spacing and mobile scrolling remain documented. [Manual](visual-quality.md) · [Evidence and limits](../evidence/vis-010/review.md) · [Full verification](../evidence/vis-010/verify.txt). PowerPoint/Keynote/Figma were not run; AE was unavailable. Wider release/host/native/other-engine/accessibility gates remain open.

## VIS-009 — semantic state and finite scene lifecycle, 2026-10-18

`npm run verify` passed **271 tests**, types, source checks, reproducible packaging and bilingual offline demos. Six three-theme/bilingual 15-page stories passed actual Chromium mouse/keyboard/native-touch/reduced-motion, exact chart filters/tables, image views/hotspots, source-code/diagram steps, deterministic finite replay/pause/seek, editor/independent locks/conflicts/history and stable-id reorder checks. Of 270 measured candidates, 264 pass with at least two per page. An independent native Chrome driver/profile with no focus overrides confirmed genuine background-tab visibility, zero remaining cue timers/animations/registered resources, and preserved information on return. Six story and interaction contact-sheet pairs, full-deck screenshots and representative/editor captures were actually viewed; clipping/budget, keyboard, focus/disclosure and scene-hash faults were repaired. Component/Studio/composition/asset browser regressions also passed. Zero observed page errors/external requests. PowerPoint/Keynote/Figma were not run; AE was not found. Native v3, other-engine/accessibility and wider release gates remain open. [Manual](interactions.md) · [Evidence and repairs](../evidence/vis-009/review.md) · [Log](../evidence/vis-009/verify.txt).

## VIS-008 — exact data, supplied relationships and original code, 2026-10-18

`npm run verify` passed **263 tests** plus types, source checks, reproducible packaging and bilingual demos. Real isolated Chromium checked six three-theme/bilingual 14-page stories at 390/1024/1440px, all six chart mutations, exact whitespace, stable annotation/page identity, no-JavaScript reading and local editor persistence. Of 252 measured candidates, 240 pass, with at least two per page. The six component and complete-story contact sheets, full-deck screenshots and representative/editor pages were actually viewed; observed clipping, arrow occlusion, stacked-label spacing, process height and heatmap palette failures were repaired. Existing 22-check Studio, 108-candidate composition and 36-case asset browser suites passed. No observed page errors/external requests. PowerPoint/Keynote/Figma were not run; AE was not found. VIS-009 animation, native v3 compilers, accessibility/other engines and wider release gates remain open. [Manual](components.md) · [Failures and evidence](../evidence/vis-008/review.md) · [Log](../evidence/vis-008/verify.txt).

## VIS-007 — sources, native pixels and protected crops, 2026-10-18

`npm run verify` passed **255 tests** plus types, source, reproducible packaging and demos. Real isolated Chromium ran 36 bilingual/theme crop cases, JPEG/WebP/EXIF imports, exact original downloads, duplicate reuse, saved v2/v3 source extraction, lock/quality/factual safeguards and explicit unavailable-generation alternatives. Three source/native PNG pixel probes had maximum RGBA difference 0. Actual crop contact sheets, six complete decks and editor screenshots were viewed; final asset browser receipts report zero page errors/external requests. Existing Studio and VIS-006 browser regressions were also rerun. PowerPoint/Keynote/Figma were not run; AE was not found. [Manual](assets.md) · [Failures, limits and evidence](../evidence/vis-007/review.md) · [Log](../evidence/vis-007/verify.txt).

## VIS-006 — measured compositions and deck rhythm, 2026-10-18

`npm run verify` passed **247 tests** plus type/source/reproducible build/demo gates. Isolated Chromium measured 108 candidate scenes across six families, three geometries, three themes and two languages: 96 meet the presentation budget, with at least two passing candidates per representative scene. All six selected decks were checked at 390/1024/1440px. Six candidate contact sheets, six complete-deck screenshots and editor/large-candidate views were actually inspected. The existing 22-entry Visual Studio regression also passed; both browser reports observed zero page errors/external requests. Facts, exact decimals, sources, assets, locks, theme identity after reorder, v1/v2 migration, conflicts and history remain covered. PowerPoint/Keynote/Figma were not run; AE was not found. [Manual](visual-studio.md) · [Failures, repairs and evidence](../evidence/vis-006/review.md) · [Final log](../evidence/vis-006/verify.txt).

## Visual Studio and Electric Violet — 2026-10-18

`npm run verify` passed **240 tests** plus type, source, reproducible packaging and language demos. Real direct-loopback browser work covers v3 editing/save/reopen, locks, scoped themes, numeric chart/table updates, in-flight and stale-window saves, history/restore, local PNG replacement, explicit legacy migration and measured HTML download. Both language editions run at 390/1024/1440 widths with actual fonts and image readiness; 31 screenshots include the three-theme contact sheet. Inserted white-on-white and clipped headings fail the appropriate checks. Zero page errors and external requests were observed. PowerPoint/Keynote/Figma were not run; AE was not found. Remote CI and wider release gates remain open. [Manual](visual-studio.md) · [Evidence](../evidence/visual-studio/review.md) · [Final log](../evidence/visual-studio/verify.txt).

## Visual-first Wave A — 2026-10-18

`npm run verify` passed **231 tests** plus schema-derived types, negative fixtures, source checks, reproducible packaging and existing demos. The experimental semantic web path has English/Chinese collage and numeric-chart scenes. Isolated Chromium direct-loopback capture covered 390/1024/1440 widths, actual font/DOM measurements, exact data tables, keyboard disclosure, navigation and no-JS reading with zero observed page errors or external requests. Three frozen old-renderer decks match a pristine archive byte for byte. Actual screenshots were inspected and a metric contrast defect corrected. VIS-001–005 remain partial; remote CI and host/native gates are open. PowerPoint/Keynote/Figma were not run; AE was not found. [Guide](visual-first.md) · [Review](../evidence/visual-wave-a/review.md) · [Final log](../evidence/visual-wave-a/verify.txt).

## MB-11–15 local media/worker build — 2026-10-18

`npm run verify` passed **222 tests**, schema-derived types/negative fixtures/emitted smoke, source checks, reproducible packaging and all language/presenter/media demos. [Final log](../evidence/mb-11-15/verify.txt).

Direct loopback checks used the provided browser and an isolated cached Chrome for Testing 151.0.7922.34 with ephemeral profiles. Four English/Chinese-mixed scenes, generated artwork, orbit/layers, actual WebGL context loss, reduced-motion keyboard rotation, print/static fallbacks, 390/1024/1440 widths, local save/reopen and measured media exports were inspected. No uncaught page errors were observed. Independent PPTX checks found **23 native text shapes and one picture** in four measured slides, with original PNG hash, source text, XML and relationships preserved.

One actual built-in image-tool call produced the artwork; subsequent journal checks supplied its original returned PNG. The journal is not claimed to have dispatched or cancelled that earlier host operation. Two real concurrent CLI turns later passed and integrated separate results, overlapping for 12.547 seconds. The initial pair failed validation on a returned source URL and is retained as a failure; there was no output coercion. Reported models and cost limits remain explicit.

MB-11/13 are implemented locally. MB-12 retains Dot desktop acceptance. Figma desktop was opened but no assigned-plugin import or real layer review completed; AE was absent. MB-14/15 remain partial. PowerPoint and Keynote were not opened in this batch. Wider host/accessibility/projection gates are unchanged. [Guide](media-workers.md) · [Evidence](../evidence/mb-11-15/review.md).

## MB-06–10 local planning build — 2026-10-17

`npm run verify` passed **207 tests**, v1/v2 schema-derived type contracts, negative fixtures, emitted-runtime smoke, source checks, reproducible plugin packaging and all existing language/presenter demos. [Final log](../evidence/mb-06-10/verify.txt).

The [planning workflow](planning.md) and [actual Astra medium/high pilot](astra-evaluation.md) have direct local evidence. Seven English pages and one Chinese/mixed page were browser-measured and visually inspected. The final seven-slide PowerPoint opened without repair; comparison/image pages and the sorter were inspected. Native package checks found 49 text shapes and one independent picture. Actual HTML mouse/keyboard exploration and browser save-as-copy passed. Confirmed widths were 390, 1024 and 1440 CSS pixels.

Four actual CLI turns produced 24 task results, all passing the current automatic gates with no repairs. Medium averaged 31.271 seconds per six-task batch; high 36.567 seconds. Cost and independent server model confirmation remain unknown. A separate actual CLI queue task reached review and browser application. **Dot desktop remains unavailable, so MB-08 is partial.** Keynote/Figma were installed but not run; AE was unavailable. Existing screen-reader/zoom/projection and host gates stay open. [Review](../evidence/mb-06-10/review.md) · [Machine evidence](../evidence/mb-06-10/review.json).

## MB-01–05 local presenter build — 2026-10-17

`npm run verify` passed **187 tests**, the schema-derived type/negative-fixture gate, emitted-module smoke, source checks, reproducible plugin build and English/Chinese examples. Direct provided-browser checks covered semantic actions, light/dark settings, cross-tab motion shutdown of an active Three.js layer, slide-following scripts, live English/Chinese timing, resize/dock, pause/resume, four responsive sizes, separate-origin audience sync, refresh and ended-state clearing. Active presenter/audience error logs were empty. Visual exports omit private notes by default; explicit presenter copies and complete Project JSON are checked separately.

The type work is a bounded pilot, not a whole-repository migration. Actual conferencing/extended-display, 200% zoom, screen-reader and other-engine checks remain. PowerPoint, Keynote and Figma were not run for this batch; AE was unavailable. No Dot/Astra host acceptance was performed. [Instructions](presenting.md) · [Review and screenshots](../evidence/mb-01-05/review.md) · [Final log](../evidence/mb-01-05/verify.txt).

## Stage and local agent bridge — 2026-10-17

`npm run verify` passed **165 tests**, source checks, plugin build and both language demos. The local agent bridge has real MCP and CLI subprocess coverage plus a direct-browser fixture-worker review/save-as-copy flow. A lock-contention issue observed during heartbeat/status polling was fixed and covered. Signal is a checked additive theme. English pitch mode was exercised without Chinese visible content. The live demo sequence edited a headline, selected Evidence grid, saved and created a browser-measured PPTX export. This was an agent-driven walkthrough, not a timed human rehearsal.

The separate authored stage example has eight visually inspected pages, 47 native PPTX text shapes and six images. Eight Figma design frames and native timelines were actually authored. Early, middle and settled frames from the closing MP4 were inspected. Three.js WebGL, Dot interaction and reduced-motion fallback ran in the provided browser. The MIT renderer adds about 538 KiB, 137 KiB gzip, to the standalone HTML. The core runtime still has no external package dependency.

The earlier authenticated CLI evidence applies to its recorded bundle hashes. It was not rerun for the new bridge/theme bundle.

**Boundaries remain:** actual Dot host/model acceptance, core Figma importer acceptance and AE execution have not passed. AE was unavailable. PowerPoint/Keynote were not tested for this revision. No measured model-quality or compatibility gain is claimed. [Evidence](../evidence/dot-stage/review.json) · [Full verification log](../evidence/dot-stage/verify.txt) · [Agent guide](agent-bridge.md).

## DW-020 update — 2026-10-17, macOS

The current Mac has Codex CLI 0.160.0 and Claude Code 2.1.288. The authenticated Codex standalone project skill completed a real three-slide task. The reviewed trace shows skill discovery/read and successful bundled `doctor`, `new`, `check`, `layouts`, HTML and PPTX commands. Independent bundled re-exports matched both host files byte for byte. PPTX parsing found 24 native text shapes, no pictures, valid XML/relationships and all source text. All three slides were rendered with LibreOfficeDev 26.8.0.0.alpha0 and visually inspected without clipping, overlap or missing text.

**The complete gate remains blocked:** Claude authentication is unavailable and sign-in was deferred by the user; Codex native desktop activation and remote CI were not run. Browser policy refused local HTML navigation during the initial attempt. PowerPoint and Keynote were not opened. The runner still reports manual review required; the separate review records the inspected scope without converting CLI success into desktop certification.

The runner now selects Claude's advertised ordinary permission mode, removes the prompt's fallback skill path, verifies artifact bytes and unchanged bundle files, checks installation success, refuses nonempty evidence directories and accepts a bounded task timeout. `npm run verify` passed all 149 tests (including seven new regressions), source checks, the reproducible bundle build and both language demos. [Current review](../evidence/dw-020/review.json) · [Codex discovery trace](../evidence/dw-020/2026-10-17-codex-discovery/report.json) · [Mac verification log](../evidence/dw-020/verify.txt).

## Original alpha.2 results — Linux, 2026-10-16

| Check | Observed result | Limit |
| --- | --- | --- |
| Node tests | **142 passed, 0 failed, 0 skipped**; Node 22.16.0, Linux | Not an external security review |
| Source checks and plugin build | Syntax, document links, schemas, examples, dependency ordering, identity/version and font exclusions passed | Remote GitHub CI not run |
| Actual Codex / Claude command probes | Both `--version` calls return `ENOENT`; host gate **blocked** | No authenticated task or desktop/plugin activation passed |
| Self-contained plugin runtime | Actual isolated CLI check passed | Packaging proof, not proof of skill invocation |
| Chromium interaction tests | **22 passed**, no uncaught page errors | Offline page fixture connected to a real isolated local API |
| Actual font tests | **28 content/ratio cases; 112 candidate layouts; 448 measured boxes** | Selected accepted scenes also checked using SVG glyph bounds |
| Full English and Chinese example decks | Both six-page decks pass actual browser measurement; **304 more candidate text boxes**, 82 selected text nodes inspected | Same Chromium/Linux font environment, not all client fonts |
| Independent PPTX package inspection | English and Chinese: six slides and 41 native text shapes each; CRC/XML/internal relationships passed | Microsoft PowerPoint and Keynote not run |
| LibreOffice rendering | Two CLI examples plus one browser-measured example: **18 pages** rendered and visually inspected | Font substitution by other renderers can change appearance |
| Figma / After Effects | Existing handoff generation and importer mock/static tests retained | No actual application acceptance for this source release |

The font fixture compares real shaping with the offline fallback; 121 of the 448 isolated-case fits differ in font size or line ranges. This is evidence that the real measurement path is used, not a quality benchmark. Input includes CJK punctuation, mixed scripts, combining marks, emoji clusters, hard breaks, tabs, long URLs and dense overflow. Source text and grapheme ranges must remain intact; pages that do not fit block visual export instead of dropping text. The bundled Chinese metric cards exposed insufficient label height, which was fixed and added to regression tests.

## Interaction cases actually exercised

Tests cover keyboard tabs and slide limits, grouped undo/redo, no-op edits, dialog Escape/focus return, synthetic composition events, edits during an in-flight save, two-window stale revision rejection, invalid-field backup, measurement failures, stale preview races, measured PPTX, read-only history, restore-as-copy, response locking, cancelled project switches and responsive drawers. A queued close event that broke a quickly reopened leave-confirmation dialog was reproduced and fixed. Explicit Tab cycling fixes focus escaping the drawer in the tested browser.

Six viewport sizes span 320×740 to 1600×1000. The test finds no document-wide horizontal overflow at those sizes; it is not a claim that every control is simultaneously visible without scrolling. Real operating-system IME, a screen reader and 200% browser zoom remain manual checks.

## The browser boundary is explicit

Managed Chromium **144.0.7559.96** rejected direct loopback navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. No policy was changed. Fixture mode loads the actual source HTML/CSS/JS and forwards its requests to a real local server; it supplies a fixture-only UUID helper and does not enforce production CSP. Node API tests separately check Host/Origin/token/body limits and security headers. They do not substitute for direct browser/CSP acceptance.

`host-check` executed real commands and recorded the block. Registry access also failed with DNS error 6. No host version was fabricated or installed from an unofficial source. Neither a successful bundled CLI nor a future generated deck alone closes DW-020: inspect the actual host trace, all slides and native activation route.

## Evidence

[Node log](../test-results.txt) · [Host report](../evidence/alpha.2/host/report.json) · [Registry reachability](../evidence/alpha.2/host/registry-reachability.txt) · [Browser report](../browser-evidence.json) · [Font report](../font-evidence.json) · [PPTX report](../pptx-evidence.json) · [Office render report](../office-evidence.json)

[English studio](../assets/studio-desktop.png) · [Chinese studio](../assets/studio-chinese.png) · [History](../assets/history-chinese.png) · [History on a narrow screen](../assets/history-mobile-loaded.png)

[English CLI render](../assets/welcome-contact.png) · [Chinese CLI render](../assets/welcome.zh-CN-contact.png) · [Browser-measured render](../assets/browser-measured-contact.png)

All screenshots are actual running source or exported-document renderings, not design mockups. PDFs used for checking are not distributed. No font binaries are shipped. Example number cards carry an intentional missing-source warning; the numbers describe the fictional demo, not a cited study.

## Reproduce

Core checks need only Node 22+:

```bash
npm run verify
node bin/deckweft.mjs host-check --target both --out host-evidence-preflight
```

Host-check exit **2** means that the whole host release gate remains unpassed. See the host guide before explicitly enabling `--live`; it can consume the host's plan/API allowance.

Optional QA needs Python Playwright with a Chromium binary; PPTX inspection needs python-pptx/lxml. These are test tools, not runtime dependencies:

```bash
python tests/browser_acceptance.py --mode direct
python tests/browser_fonts.py --mode direct
python tests/inspect_pptx.py
```

Only to reproduce this managed environment's limited test, explicitly pass `--mode fixture`. Never relabel that result as direct-browser acceptance. LibreOffice conversion is an additional renderer check. Do not claim authenticated host loading, every-browser compatibility, complete accessibility or security certification from these results.

## DevDay five-minute and Three.js revision — 2026-10-17

The current follow-up adds a compact icon rail, explicit English/duration/speaking targets, speech-note statistics and rehearsal, a real-scene feature tour, a 14-slide English deck, and the selectable Cosmic & Dots style. Its script has 644 spoken words; 140 wpm gives approximately 276 seconds of speech within a 300-second schedule.

All 14 HTML pages were opened and visually inspected in the provided in-app browser. Geometry-only Three.js canvases reported zero character textures; the five individual transparent renders were actually downloaded. The browser review exercised layout comparison, timers, drawers, reduced motion and UI PowerPoint export. Six widths from 320 to 1920 retained five tool-rail entries and four layout choices without horizontal document overflow. These are direct loopback tool observations, not a new claim that the older Python harness or every browser engine passed.

PowerPoint actually opened the final 14-slide media deck without repair. Cover, sorter and workbench pages were inspected. This exposed and fixed two defects missed by earlier package tests: shared slide/notes theme ownership and screenshot bytes whose file extension did not match their encoding. Native text/shapes remain editable; only individual artwork and screenshot media are raster assets. After Effects was not installed. Keynote was present but not tested in this revision.

Actual Dot/Astra generation remains **pending**: the bridge was enabled but had no connected real agent or job. The current tools cannot control ChatGPT itself and exposed no Dot browser surface. A copyable task and exact local connection configuration are prepared; this does not certify host/model execution. No release gate was marked complete.

[Review and hashes](../evidence/devday-redesign/review.json) · [Verification log](../evidence/devday-redesign/verify.txt) · [Current demo guide](devday-demo.md) · [Visual comparison](../evidence/devday-redesign/style-comparison.png) · [PowerPoint screenshot repair](../evidence/devday-redesign/powerpoint-workbench-fixed.png).
