# DeckWeft modular roadmap

[简体中文](docs/zh-CN/roadmap.md) · [Machine-readable tasks](roadmap.json) · [Verification](docs/en/verification.md)

## VIS-016 — target-specific editable exports (S7), 2026-10-19

VIS-016 is **partial** (implemented locally). Every component declares an output level for web, PDF and PowerPoint (L1 native, L2 vector with real text, L3 image of one element with a summary). The export order is enforced in code. v3 decks compile to:

- PowerPoint: native text, tables, charts with embedded data, shapes, connectors, pictures and notes
- PDF: one page per scene with real, tagged text

Every element PowerPoint does not receive has its own receipt, and no slide is a screenshot. On the frozen VIS-014 corpus each deck gets an export report with four separate results:

- PowerPoint editability and the page check pass on 9 of 9 decks.
- PDF search passes for English and is partial for Chinese (some ideographs are stored as CJK radical code points).
- Accessibility is partial (PDF figure wrappers without alt text).
- Visual fidelity is partial (Quick Look reference renders only).

PowerPoint and Keynote were not run, so application compatibility is not claimed. [Manual](docs/en/compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016) · [Evidence](docs/evidence/vis-016/review.md).

## VIS-014 — first visual release gate (S6), 2026-10-19

VIS-014 is **partial**. The gate runs locally:

- a frozen bilingual 12-page gallery (requirements §9)
- one bilingual 8-page story per theme, with identical facts in every theme
- the VIS-010 pipeline on all eight decks (0 issues, 96 of 96 interaction traces)
- eleven explicit cases, ten of which pass
- the VIS-001 legacy comparison
- standalone exports opened offline outside the repository in Chromium, Firefox and WebKit

A real Codex CLI run drafted a deck from a prompt, reviewed its actual captures, exported it, revised one page and exported it again. The gate found six renderer failures, which were fixed with a deliberate baseline re-recording.

What remains open:

- Claude is deferred, so the both-hosts criterion is unmet.
- Missing glyphs are not detected.
- The 390 px heatmap scrolls, and CJK headings break inside words.
- The advisory scored review is 74–77/100, below the pilot threshold, and needs the author's calibration.

S3, S4 and S5 were merged into this branch first, with a layered chart-focus rule. [Gate manual](docs/visual-acceptance/README.md) · [Scored review](docs/visual-acceptance/review.md) · [Evidence](docs/evidence/vis-014/review.md).

## Verified source publication — 2026-10-18

VIS-001 now has clean-checkout and remote CI acceptance for the recorded source. All 338 tests/types/check/build/export gates passed locally and on GitHub Node 22 for Ubuntu, macOS and Windows. The complete interaction gallery and actual preview/export image comparison passed; wider host/native/accessibility and VIS-014 release gates remain separate. [Evidence](docs/evidence/interaction-visual-regression/review.md).

## VIS-013 — prompt-first workbench, 2026-10-18

VIS-013 is **implemented-local** inside the existing Visual Studio: prompt/source generation, independent languages and typed scoped design choices, actual screenshot/Codex review, distinct selected-page revision and reviewed HTML export. Durable conflicts, locks, private-note boundaries, cancellation, explicit source sync and last-valid recovery remain enforced. Claude stays deferred; broader release acceptance remains VIS-014. [Manual](docs/en/workbench.md) · [Evidence](docs/evidence/vis-013/review.md).

## VIS-012 — coding-host adapters, 2026-10-18

VIS-012 is **implemented locally, partial acceptance**: Codex and Claude Code share strict structured-result parsing, capability probes, bounded stdin processes, image transports, hash-only receipts and the same v3 task tools. Source lines, exact data, scopes, locks and stale sequence checks remain enforced. Real Codex draft/image-feedback and strict, distinct page-4 revision with reviewed before/after HTML exports now pass; Claude only received version/help probes and its login/live task stay deferred. No native desktop or both-host release gate is closed. [Manual](docs/en/hosts.md) · [Failures, actual runs and validation](docs/evidence/vis-012/review.md). VIS-013 is now implemented locally.

## Current requirements reconciliation — 2026-10-18

The [updated visual-first requirements](DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md) now distinguish the old committed audit from the current visual implementation. VIS-001 baseline/CI acceptance is recorded; VIS-002–011 are implemented locally with the evidence below. `roadmap.json` includes every remaining VIS/SRC/DOC/EXP task and its dependencies. Historical batch orders and authorization records are retained; `nextExecutionOrder` is planning only.

VIS-012 adapters are implemented locally with deferred Claude acceptance. VIS-013 is implemented locally. VIS-014 and VIS-016 are partial (see above); the design-handoff plan continues with S8 (T01–T03 themes, VIS-015). Prepare the six additional families and frozen bilingual gallery/stories for VIS-014. Keep actual host image delivery, accessibility and standalone packaging as explicit acceptance gates. Native v3 exports follow under VIS-016; local synchronization and cloud connectors remain later opt-in scope. Existing bridge mocks, deterministic outline planning and representative QA stories do not close those gates.

[Reconciliation and current validation](docs/evidence/roadmap-reconciliation/review.md) · [Next-task handoff](docs/en/handoff.md).

## VIS-011 — one local task, 2026-10-18

VIS-011 is **implemented-local**: seven shared tools connect task-specific story/design planning, local assets, real browser checks, actual image review, scoped exact-data revisions, cumulative two-round repair and reviewed HTML/recovery exports. Real 1440/390px stories, page-4-only chart revision and failed rerun after accepted export passed. Local protocol/mock evidence stays separate from host acceptance. [Manual](docs/en/task-loop.md) · [Evidence](docs/evidence/vis-011/review.md). Offline claims are not externally verified; richer host drafting, native v3 exports, VIS-012 adapters and VIS-013 workbench remain open.

## VIS-010 — browser quality and bounded correction, 2026-10-18

VIS-010 is **implemented-local**: complete-story sheets/native captures, platform fonts/resource/console diagnostics, exact text/source coverage, 234 real action traces and actual-image reviews share source/layout/state-bound receipts. Six bilingual three-theme stories pass three responsive widths; five injected failures are detected. Each ordinary repair changes one affected scene; a locked two-round failure preserves the last valid HTML and incomplete candidate. [Try it](docs/en/visual-quality.md) · [Visual judgments and evidence](docs/evidence/vis-010/review.md). Fine label spacing, exhaustive states, other engines/accessibility and wider native/host/release gates remain open.

## VIS-009 — semantic motion and real audience state, 2026-10-18

VIS-009 is **implemented-local**: chart range/series selection, actual image comparison/hotspots, diagram/code explanation steps and deterministic finite cue replay/seek now share typed stable identities, semantic explanation content, derived scenes and Visual Studio authoring. Six bilingual three-theme 15-page stories have 270 measured candidates (264 pass; at least two per page), native keyboard/touch/reduced-motion checks, a real background-tab resource probe, and lock/history/editor regressions. [Try it](docs/en/interactions.md) · [Observed failures, screenshots and evidence](docs/evidence/vis-009/review.md). Other engines/accessibility, exhaustive state coverage, native v3 compilers and broader release/host gates remain open.

## VIS-008 — semantic charts, diagrams, code and annotations, 2026-10-18

VIS-008 is **implemented-local**: six exact-data chart variants, directed relationship/sequence/process diagrams, whitespace-preserving code and stable object annotations now share typed content, theme tokens, derived scenes and Visual Studio editing. Six bilingual three-theme stories have real browser measurements, data-mutation/static-reading checks and measured candidates/rhythm; revision conflicts, source/asset/author locks and history stay covered. [Try it](docs/en/components.md) · [Failures, repairs and evidence](docs/evidence/vis-008/review.md). Native v3 compilers and broader release/host/accessibility gates remain open.

## VIS-007 — original sources and protected image slots, 2026-10-18

VIS-007 is **implemented-local** for typed asset direction, local PNG/JPEG/WebP original retention and hash-bound derivatives, explicit saved-document image extraction, named-slot replacement and author-protected crops. Source/rights/locks/original files stay intact. Three-theme bilingual direct-browser work includes actual codec/EXIF/original-download and source-reuse checks. [Try it](docs/en/assets.md) · [Evidence and limits](docs/evidence/vis-007/review.md). V3 generation transport, automatic subject detection, arbitrary PPTX/PDF parsing, native exports and wider release gates remain open.

## VIS-006 — composition candidates and deck rhythm, 2026-10-18

VIS-006 is **implemented-local**: six families each have three distinct geometries and reading paths; Visual Studio compares measured previews, selects individual pages or whole-deck rhythm, and reorders stable scene identities. Three themes and both languages have 108 candidate captures, with at least two feasible choices per representative scene. Facts, exact values, citations, assets, locks, v1/v2 paths, revision conflicts and history recovery remain covered. [Try it](docs/en/visual-studio.md) · [Failures, visual review and evidence](docs/evidence/vis-006/review.md). VIS-001 remote CI and VIS-014 broader release/native/host gates remain open.

## Visual Studio integration — 2026-10-18

VIS-002–005 now have local contract/editor/storage/theme implementation and direct-browser evidence. Visual Studio edits and saves v3 projects in the same loopback application; three executable themes include Electric Violet image and chapter pages. The build retains strict migration, author locks, history, exact-data rendering and current-artifact export. VIS-001 remote CI and the wider release/host/native gates remain open. VIS-006 implementation and evidence are recorded above. [Manual](docs/en/visual-studio.md) · [Review](docs/evidence/visual-studio/review.md).

## Visual-first rebuild — Wave A, 2026-10-18

Historical Wave A snapshot (superseded by the local integration above): VIS-001–005 were **partial**: CI now installs locked tools, three legacy baselines and bilingual collage/chart examples have local evidence, and v1/v2 storage stays unchanged. Remote CI, complete contracts/theme packs, host generation and the release gallery remain open. [Guide](docs/en/visual-first.md) · [Review](docs/evidence/visual-wave-a/review.md).

## Current local build — MB-11 through MB-15

The user authorized this third batch on 2026-10-18. Local source adds an opt-in host-image journal/cache, two independently scoped workers and isolated code copies, two general Three.js recipes with editable static fallbacks, and media/font/source-map and temporal/rollback importer improvements. [Guide](docs/en/media-workers.md) · [Evidence](docs/evidence/mb-11-15/review.md).

MB-11 and MB-13 are `implemented-local`. MB-12 is `partial`: a real two-worker Codex CLI pair passed with 12.547 seconds of overlap, after an initial invalid-source result was rejected; Dot desktop remains unverified. MB-14 is `partial`: Figma desktop was opened but plugin registration/import was not completed. MB-15 is `partial`: AE is not installed, so native import/render/cancel acceptance could not run. No application gate is closed by local mocks or exported JSON.

## Earlier local build — MB-06 through MB-10

The user authorized the second batch. The local implementation adds a typed v2 storyboard/asset contract with explicit copy migration, six semantic recipes, allowlisted HTML exploration and static fallbacks, separate deck/code proposal grants, pinned execution capsules, durable events/checkpoints and validated-work progress. A real Codex CLI task and a four-turn medium/high pilot produced actual artifacts. [Guide](docs/en/planning.md) · [Evaluation](docs/en/astra-evaluation.md) · [Evidence](docs/evidence/mb-06-10/review.md).

MB-08 retains a partial acceptance state until a real Dot host negotiates and executes the required operations. CLI evidence does not close Dot desktop, DW-020, Figma/AE or wider accessibility gates. The later MB-11–15 authorization is recorded above.

## Earlier local build — MB-01 through MB-05

The first batch is implemented locally: schema-derived type contracts and emitted-module checks, semantic actions, light/dark/system appearance, shared motion preferences, a separate read-only audience origin and a slide-following private teleprompter. [Instructions](docs/en/presenting.md) · [Evidence](docs/evidence/mb-01-05/review.md).

MB-01, MB-03 and MB-05 are `implemented-local`. MB-02 and MB-04 retain `partial` acceptance states: their code and local browser flows work, while 200% zoom/screen-reader and actual conferencing/extended-display checks remain. No real host gate is closed by these local results. That first batch was limited to MB-01–05. The newly authorized second batch is recorded above.

## Modular build plan — 2026-10-17

The [modular construction plan](docs/en/modular-build-roadmap.md) addresses TypeScript, automatic visuals, scoped Dot delegation/progress, action controls, a private presenter and appearance/accessibility settings. It includes priorities, dependencies, module boundaries and acceptance gates, with separate [task data](docs/plans/modular-build-2026-10-17.json). The first five tasks formed the earlier batch; the user subsequently authorized MB-06–10 and MB-11–15. Existing release tasks and their evidence remain unchanged.

## Earlier alpha.2 execution order

`DW-020 → DW-130 → DW-120 → DW-110 recovery UI`.

DW-020 remains blocked overall. On 2026-10-17, the authenticated Codex CLI project skill completed a real task and its three-slide output passed trace, export and LibreOffice visual review. Claude sign-in was deferred by the user; Codex desktop native activation and remote CI remain untested. See the [current host evidence](docs/evidence/dw-020/review.json). Earlier work proceeded on independent local modules. DW-130 now has real Canvas measurements; DW-120 has tested interaction fixes but real-device/accessibility checks remain; DW-110 has read-only history and restore-as-copy, not the entire project-management roadmap.

| Task | Priority | Module | Current state |
| --- | --- | --- | --- |
| DW-001 | P0 | New identity and English-first documentation | implemented-local |
| DW-010 | P0 | Strict schema, explicit migration, and security boundary | implemented-local |
| DW-020 | P0 | Reproducible bundle and real-host release checks | blocked overall; Codex CLI reviewed |
| DW-100 | P1 | Studio editing and durable project storage | implemented-local |
| DW-110 | P1 | History recovery and project management | partial |
| DW-120 | P1 | Interaction and accessibility hardening | partial |
| DW-130 | P2 | Measured multilingual text and adversarial layout corpus | implemented-local |
| DW-140 | P2 | Native editable output fidelity | partial |
| DW-150 | P2 | Semantic slide-family expansion | partial |
| DW-200 | P3 | Evidence-bearing story planner | partial |
| DW-210 | P3 | Safe host-agent jobs and resumable checkpoints | partial |
| DW-220 | P3 | Optional explicit provider and translation adapters | planned |
| DW-300 | P4 | Figma editable import acceptance | partial |
| DW-310 | P4 | After Effects editable import acceptance | partial |
| DW-320 | P4 | Rights-aware media and animation library | partial |
| DW-400 | P5 | Template SDK and reviewed community contributions | planned |
| DW-410 | P5 | Optional collaboration service | planned |
| DW-420 | P5 | Optional commercial hosting and team controls | planned |

## Next gates

Run the [real-host guide](docs/en/host-acceptance.md) on an authenticated machine. Then run browser acceptance in **direct** mode, test real Chinese input methods, 200% zoom and screen readers, and inspect both measurement paths in PowerPoint/Keynote. The authorized local planning batch proceeds independently; the wider host, retention and application gates remain open. No hosted service, database replacement or paid provider has been added to make these checks look complete.

Task acceptance lists and dependencies in `roadmap.json` remain authoritative. `implemented-local` means the named local scope is implemented and tested; it never means every application, host or security property has been certified.
