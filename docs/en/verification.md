# Verification — 0.1.0-alpha.2

[中文](../zh-CN/verification.md) · [Release changes](alpha-2.md) · [Host instructions](host-acceptance.md)

Prepared 2026-10-16. These are observed local results, not a promise that every host, font or browser works. Raw timestamps retain the environment clock. The alpha.1 evidence is archived separately under `docs/evidence/alpha.1/`.

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
