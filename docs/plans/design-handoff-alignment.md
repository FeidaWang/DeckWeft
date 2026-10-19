# Design handoff alignment

Checked 2026-10-19 against commit `058b939`. This is step S0 of the [kickoff plan](design-handoff-kickoff-prompts.md). It is a plan and evidence index, not an authorization record. It changes no runtime code and no roadmap status.

The handoff package (`DeckWeft_Design_Handoff/`, research date 2026-10-18) states that it did not inspect this repository. Every DWD item, pattern, theme, duration and acceptance target in it is treated here as **Proposed** until a repository file shows otherwise.

## How to read the tables

**Status** compares the handoff item with the repository: `exists`, `partial` or `missing`.

**State** uses one word for the DeckWeft implementation:

| Word | Meaning here |
|---|---|
| Proposed | Only the handoff describes it. |
| Implemented | Source exists and unit tests run, but no browser/image evidence covers this scope. |
| LocalVerified | A real local browser run with viewed images covers it (the evidence behind `implemented-local`). |
| HostVerified | An actual authenticated host produced and revised it. Only Codex CLI has such evidence. |
| ExportVerified | The exported file was opened and inspected in the target application. |

`roadmap.json` states (`implemented-local`, `partial`, `planned`, `blocked`) are unchanged and quoted where useful.

**Marks** are the handoff's own evidence marks, copied without change: V = observed on the reference site, S = source-code declaration, D = page text or caption, P = DeckWeft proposal. In chart records the handoff uses levels: live = V, source = S, text = D.

Two separate questions are recorded for every pattern:

- `referenceVerified` asks whether the handoff observed the reference behaviour. It is `true` only for V marks. Patterns with only S, D or P marks are never verified references.
- `repositoryState` asks whether DeckWeft's own implementation is verified. A pattern can be `LocalVerified` here while its reference is unverified (for example C03 stacked bars: S+D marks, but VIS-008 renders and checks stacked charts in a real browser).

Evidence links point to files in this repository. Sources: [AGENTS.md](../../AGENTS.md), [roadmap.json](../../roadmap.json), [handoff](../en/handoff.md), [verification](../en/verification.md), [requirements](../../DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md).

## 1. Imported registers

| File | Records | Added per record |
|---|---|---|
| [pattern-register.json](../design/pattern-register.json) | 56 patterns (12 F, 20 M, 24 C) | `evidenceMarks`, `referenceVerified`, `repositoryStatus`, `repositoryState`, `implementedBy`, `verifiedBy`, `checkedAt`, `repositoryNote`; C records also `chartClass` |
| [source-register.json](../design/source-register.json) | 62 content sources, 1 supplement, 19 technical sources | `referenceVerified`, `repositoryStatus`, `implementedBy`, `verifiedBy`, `checkedAt`, `repositoryNote` |

Location: `docs/design/`. These files are design evidence, not runtime contracts, so they stay out of `schemas/` and `src/`. They sit beside `docs/evidence/`, which they cite. See the [register guide](../design/README.md).

Every original field and top-level key is kept byte-for-byte. Each file records the SHA-256 of the delivered JSON in `import.sourceSha256`. Content sources always have empty `verifiedBy`: this repository has not re-opened those pages.

[`tests/design-registers.test.mjs`](../../tests/design-registers.test.mjs) runs with `npm test`. It checks:

- the complete F/M/C id set;
- marks recomputed from the untouched `evidence` field;
- `referenceVerified` only with V;
- state words from the list above;
- `missing` → `Proposed` with no implementer;
- any *Verified state cites an existing `docs/` evidence file, and no other state does;
- task ids exist in `roadmap.json` and module paths exist;
- every cited source id is registered.

With `DECKWEFT_HANDOFF_DIR` set to the delivered package, a fourth test proves the originals are unchanged and the hashes match.

Pattern summary: F 5 exist / 6 partial / 1 missing; M 2 / 10 / 8; C 5 / 9 / 10. 18 of 56 patterns have a V mark.

## 2. DWD work items

| DWD | Handoff deliverable | Repository counterpart | Status | State | Proof | Remaining gap |
|---|---|---|---|---|---|---|
| 001 | Evidence register | New in this alignment (uncommitted) | exists | Implemented | [pattern register](../design/pattern-register.json), [test](../../tests/design-registers.test.mjs) | Pattern version and deprecation fields (DWD-310) |
| 010 | Host baseline (DW-020) | DW-020 `blocked`; VIS-012 `partial` | partial | HostVerified (Codex CLI only) | [vis-012](../evidence/vis-012/review.md), [dw-020](../evidence/dw-020/review.json) | Claude live run deferred; Codex desktop activation; host window resize and recovery not recorded |
| 020 | SceneSpec and tokens | VIS-002/003/005: `presentation-v3`, `design-plan`, `web-scene`, `theme-pack` schemas | exists (criterion met) | LocalVerified | [visual-studio](../evidence/visual-studio/review.md), [design-plan schema](../../schemas/design-plan.schema.json) | No typed takeaway, `contentStatus`, `keyStates`/`staticState`; token roles `numeric`, `missing`, `reference`, motion `fallback` absent (S1) |
| 030 | Fonts and layout (DW-130) | DW-130 `implemented-local`; VIS-004/010 | exists | LocalVerified | [font evidence](../font-evidence.json), [vis-010](../evidence/vis-010/review.md) | Other browser engines |
| 040 | Interaction and static state (DW-120) | VIS-009 `implemented-local`; DW-120 `partial` | partial | LocalVerified | [vis-009](../evidence/vis-009/review.md), [browser evidence](../browser-evidence.json) | No named `staticState` (authored opening selection is closest); real IME, 200% zoom, screen reader |
| 100 | Three core themes T01–T03 | VIS-005 has three *other* themes; VIS-015 `planned` | partial | LocalVerified (existing themes) | [visual-studio](../evidence/visual-studio/review.md), [themes](../../themes/cream-collage/theme.json) | T01–T03 absent; "eight families" needs VIS-014 additions. See decision 2 |
| 110 | Semantic chart core | VIS-008 six variants + table + diagrams | partial | LocalVerified | [vis-008](../evidence/vis-008/review.md) | Grouped bar, dot-interval, small multiples, end labels (section 5) |
| 120 | Unified timeline | VIS-009 cues, replay, pause, seek slider, reduced motion | partial | LocalVerified | [vis-009](../evidence/vis-009/review.md), [interactions manual](../en/interactions.md) | RevealMask, Crossfade and stagger primitives; chart annotation reveal |
| 125 | Controlled comparison | VIS-009 `image-compare`, `image-hotspots`, `chart-select` | partial | LocalVerified | [vis-009](../evidence/vis-009/review.md) | Generic tab stage; interactive rank sort; slider compare |
| 130 | Output adaptation | S7: L1/L2/L3 levels in `src/targets/capabilities.mjs`, export order, v3 PowerPoint and PDF compilers with per-element receipts; DW-140 `partial`; VIS-016 `partial` | partial | LocalVerified (v3 package checks); ExportVerified (v1/v2 PPTX only) | [vis-016](../evidence/vis-016/review.md), [devday PowerPoint](../evidence/devday-redesign/review.json) | PowerPoint and Keynote runs; Chinese PDF search; PDF figure wrappers; small text on tall scenes ([§15](#15-s7-result--output-levels-and-vis-016-2026-10-19)) |
| 200 | Author preferences and rhythm | VIS-005 profile, VIS-006 rhythm, VIS-013 scopes and locks; S9a deck/chapter/page/object scope, separate locks, planned author actions, page planning, reusable profiles ([§17](#17-s9a-decisions-and-result--author-controls-2026-10-19)) | exists | LocalVerified | [s9a](../evidence/s9a-author-controls/review.md), [vis-013](../evidence/vis-013/review.md) | Codex draft path has no page-count plan; object-level profile choices are locks and per-object actions only |
| 210 | Explanation and exploration scenes | VIS-009 steps and no-JS reading view; S9b blueprint A: Explain → Diagram → Explore on one page with an author-chosen complete static state ([§18](#18-s9b-decisions-and-result--blueprint-a-2026-10-19)) | partial | LocalVerified | [s9b](../evidence/s9b-blueprint-a/review.md), [vis-009](../evidence/vis-009/review.md) | Scroll advancement (no scroll trigger in v3); parameter panel and scale shift not planned (§17, answer 5) |
| 215 | Analytical chart extension | Relationship diagram only | partial | LocalVerified (network only) | [vis-008](../evidence/vis-008/review.md) | Map, bubble, box, waterfall, concentration |
| 220 | Theme and bilingual extension | VIS-004 bilingual layout; VIS-015 `planned` | partial | LocalVerified (bilingual) | [interaction regression](../evidence/interaction-visual-regression/review.md) | T04/T05; composition switch after translation growth |
| 230 | History recovery and compare | DW-110 `partial`; Visual Studio history; VIS-013 last-valid recovery | partial | LocalVerified | [visual-studio](../evidence/visual-studio/review.md), [vis-013](../evidence/vis-013/review.md) | Version diff; style-only restore |
| 300 | Advanced hero visuals | MB-13 `implemented-local` (v1/v2 only); EXP-001 `planned` | partial | LocalVerified (legacy only) | [mb-11-15](../evidence/mb-11-15/review.md) | No v3 spatial component; no device budget |
| 305 | Audio-visual process explanation | None | missing | Proposed | — | All |
| 310 | Pattern library maintenance | None; these registers are the seed | partial | Implemented | [register guide](../design/README.md) | Re-review cadence, `version`/`deprecatedBy` fields |

The handoff's own DW mapping (010 → DW-020, 030 → DW-130, 040 → DW-120) matches the current task meanings.

## 3. Pattern mapping

### Composition patterns F01–F12

| ID | Pattern | P | Marks | Status | State | Implemented by | Evidence | Repository note |
|---|---|---|---|---|---|---|---|---|
| F01 | Editorial asymmetric hero | P0 | V | exists | LocalVerified | VIS-006, [`compositions.mjs`](../../src/design/compositions.mjs), [`cream-collage/theme.json`](../../themes/cream-collage/theme.json) | [vis-006](../../docs/evidence/vis-006/review.md) | statement-split, image-right and the Cream Collage diagonal-cover give an asymmetric thesis/support hero. |
| F02 | Large headline, restrained chapter page | P1 | V | partial | LocalVerified | VIS-005, VIS-006, [`electric-violet/theme.json`](../../themes/electric-violet/theme.json) | [visual-studio](../../docs/evidence/visual-studio/review.md) | Only Electric Violet has a chapter composition (violet-chapter); no cross-theme chapter family. |
| F03 | Narrow text, wide evidence rhythm | P0 | V | exists | LocalVerified | VIS-006, [`art-direction.mjs`](../../src/design/art-direction.mjs), [`art-direction.mjs`](../../src/render/web/art-direction.mjs) | [vis-006](../../docs/evidence/vis-006/review.md), [interaction-visual-regression](../../docs/evidence/interaction-visual-regression/review.md) | Bounded reading widths with evidence-top full-width plots; text and evidence use different widths. |
| F04 | Chapter index and progress marker | P0 | D+V | partial | LocalVerified | VIS-009, [`document.mjs`](../../src/render/web/document.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | Previous/next and a page counter exist; no chapter table of contents or section progress marker. |
| F05 | Takeaway, graphic, caption, source layers | P0 | D+S | exists | LocalVerified | VIS-006, VIS-008, [`compositions.mjs`](../../src/design/compositions.mjs), [`render.mjs`](../../src/components/charts/render.mjs) | [vis-008](../../docs/evidence/vis-008/review.md) | Heading, chart, notes and citation blocks share one scene; takeaway and method note are blocks, not typed fields (S1 gap). |
| F06 | Attribute-aligned comparison | P0 | S+V | exists | LocalVerified | VIS-006, [`compositions.mjs`](../../src/design/compositions.mjs) | [vis-006](../../docs/evidence/vis-006/review.md) | comparison-matrix, comparison-rail and comparison-stack align a table on shared dimensions. |
| F07 | Text catalogue and media-density toggle | P0 | D+S | missing | Proposed | — | — | No catalog/search/sort or media-density toggle inside slides; the Studio library is a project list, not this pattern. |
| F08 | Progressive disclosure and method appendix | P0 | D | partial | LocalVerified | VIS-009, [`interaction-bundle.mjs`](../../src/render/web/interaction-bundle.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | No-JavaScript reading view and expandable explanations/data tables exist; no method-appendix composition. |
| F09 | Portrait photography and editorial crop | P1 | D | exists | LocalVerified | VIS-007, [`crop.mjs`](../../src/assets/crop.mjs), [`electric-violet/theme.json`](../../themes/electric-violet/theme.json) | [vis-007](../../docs/evidence/vis-007/review.md) | Image family, author-protected crops and photo-split; subject detection is not implemented. |
| F10 | Quote with layered attribution | P1 | D | partial | Implemented | VIS-002, [`blocks.mjs`](../../src/render/web/components/blocks.mjs) | — | A quote block renders as blockquote; no quote composition, no speaker/organisation fields and no browser evidence. |
| F11 | Numbered sequence and milestone narrative | P1 | D+S | partial | LocalVerified | VIS-006, VIS-008, [`render.mjs`](../../src/components/diagrams/render.mjs) | [vis-006](../../docs/evidence/vis-006/review.md), [vis-008](../../docs/evidence/vis-008/review.md) | Process family and sequence/process diagrams exist; no dated milestone timeline in v3 (legacy MB-07 timeline recipe only). |
| F12 | Media stage with explicit viewing controls | P1 | D+S+V | partial | LocalVerified | VIS-007, VIS-009 | [vis-009](../../docs/evidence/vis-009/review.md) | Image stage with comparison/hotspot controls exists; v3 has no video or screen-recording block or player. |

### Motion and interaction patterns M01–M20

| ID | Pattern | P | Marks | Status | State | Implemented by | Evidence | Repository note |
|---|---|---|---|---|---|---|---|---|
| M01 | Skippable launch intro | P1 | D+V | missing | Proposed | — | — | No intro sequence; v3 deliberately has no unsolicited autoplay. |
| M02 | Micro-feedback and copy state | P0 | D+S | partial | Implemented | DW-100, [`document.mjs`](../../src/render/web/document.mjs) | — | role=status announcements exist; no copy-to-clipboard or checklist micro-feedback component. |
| M03 | Light media-card change | P1 | S | missing | Proposed | — | — | No hover transforms on media cards. |
| M04 | Chapter position and reading state | P0 | V | partial | LocalVerified | VIS-009, [`document.mjs`](../../src/render/web/document.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | Page position changes with previous/next; no chapter-level reading state. |
| M05 | Benchmark chart and sample tabs | P1 | D+S+V | partial | LocalVerified | VIS-009, [`timeline.mjs`](../../src/motion/timeline.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | Image-compare tabs and chart series selection exist; no generic tab stage switching between charts or samples. |
| M06 | Quote and gallery carousel | P1 | D+S | missing | Proposed | — | — | No quote or gallery carousel. |
| M07 | Task/solution two-layer comparison | P1 | D+S | partial | LocalVerified | VIS-006, VIS-009 | [vis-009](../../docs/evidence/vis-009/review.md) | Comparison family plus image-compare tabs; no paired task/solution layer component. |
| M08 | Before/after slider and revision sequence | P1 | S | partial | LocalVerified | VIS-009, [`timeline.mjs`](../../src/motion/timeline.mjs) | [vis-009](../../docs/evidence/vis-009/review.md), [interaction-visual-regression](../../docs/evidence/interaction-visual-regression/review.md) | image-compare offers first/second/both tabs; no 0–100 slider or revision sequence. |
| M09 | Text → image → interface stages | P2 | S+V | partial | LocalVerified | VIS-009, [`cues.mjs`](../../src/motion/cues.mjs), [`blueprint.mjs`](../../src/motion/blueprint.mjs) | [vis-009](../../docs/evidence/vis-009/review.md), [s9b](../../docs/evidence/s9b-blueprint-a/review.md) | S9b: Explain → Diagram → Explore on one page; Next/Previous reach every stage; static state is an author-chosen complete explanation. No scroll advancement; the middle stage is a code-drawn diagram. |
| M10 | Part dissection, focus and linked note | P1 | V | exists | LocalVerified | VIS-009, [`cues.mjs`](../../src/motion/cues.mjs), [`blueprint.mjs`](../../src/motion/blueprint.mjs) | [vis-009](../../docs/evidence/vis-009/review.md), [s9b](../../docs/evidence/s9b-blueprint-a/review.md) | image-hotspots bind stable annotations to image regions with annotation.reveal; S9b adds labelled, focusable SVG parts with exported explanations. No part groups. |
| M11 | Parameter-driven result and checklist | P2 | D+S | missing | Proposed | — | — | No parameter inputs or computed results. |
| M12 | Object-to-population scale shift | P2 | D+V | missing | Proposed | — | — | No object-to-population scale transition. |
| M13 | Legend focus, filter and sort | P1 | S+V | partial | LocalVerified | VIS-009, [`timeline.mjs`](../../src/motion/timeline.mjs) | [vis-009](../../docs/evidence/vis-009/review.md), [explanatory-authoring](../../docs/evidence/explanatory-authoring/review.md) | chart-select provides series focus and category range; interactive sort is missing (ranked-bar sort is static). |
| M14 | Parameter changes the chart question | P2 | S | missing | Proposed | — | — | No parameter that switches the chart dimension. |
| M15 | Process edge and current-stage emphasis | P1 | D+S | exists | LocalVerified | VIS-009, [`cues.mjs`](../../src/motion/cues.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | steps target stable diagram node/edge ids; stroke-drawing animation is not used. |
| M16 | Audio, process and text on one clock | P3 | S | missing | Proposed | — | — | v3 has no audio/media clock. |
| M17 | Pointer-reactive image fragments | P3 | S | missing | Proposed | — | — | No pointer-reactive image fragments. |
| M18 | Abstract Canvas/Shader hero | P3 | S+V | partial | LocalVerified | MB-13, EXP-001, [`three-bundle.mjs`](../../src/render/three-bundle.mjs) | [mb-11-15](../../docs/evidence/mb-11-15/review.md) | Legacy v1/v2 Three.js orbit/layer recipes with static fallbacks; nothing in v3 (EXP-001 planned). |
| M19 | Progressive series and annotation reveal | P1 | D+P+S | partial | LocalVerified | VIS-009, [`cues.mjs`](../../src/motion/cues.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | Cue replay of data.filter gives series reveal; annotation.reveal is limited to image hotspots, not chart annotations. |
| M20 | Fade, mask and stagger primitives | P1 | P+S | partial | LocalVerified | VIS-005, VIS-009, [`policies.mjs`](../../src/motion/policies.mjs) | [vis-009](../../docs/evidence/vis-009/review.md) | Finite fade/small translate up to 400 ms; no mask or stagger primitive. |

## 4. Capability matrix

Existing evidence only. Cells with no evidence are **Unknown**, not failed. "Not implemented" cites the source that refuses the target.

| Target | Classic v1/v2 deck path | v3 visual path |
|---|---|---|
| Local browser | Passed (direct loopback). Editor, presenter and audience flows were checked in Chromium. [mb-01-05](../evidence/mb-01-05/review.md). The earlier Linux run used fixture mode: [browser evidence](../browser-evidence.json). | Passed in isolated Chrome for Testing 151 (Chromium only): 6 stories, 146 captures at 1440/1024/390 px, 216 preview/export image pairs. [interaction regression](../evidence/interaction-visual-regression/review.md). Firefox and Safari/WebKit: Unknown. |
| Codex host | HostVerified for Codex CLI: a skill completed a three-slide task. [dw-020](../evidence/dw-020/review.json). Desktop native activation: Unknown. | HostVerified for Codex CLI: structured draft, image findings, distinct page-4 revision and two reviewed exports. [vis-012](../evidence/vis-012/review.md). Desktop: Unknown. |
| Claude host | Deferred. Version/help probes only. [Claude preflight](../evidence/vis-012/claude-preflight.json). Live run: Unknown. | Deferred, same probes. [vis-012](../evidence/vis-012/review.md). Live run: Unknown. |
| Remote CI | Passed: GitHub Actions Node 22 on Ubuntu, macOS and Windows ran `npm run verify` for `5427aa9`. [publication](../evidence/interaction-visual-regression/publication.json). | Same run. It covers unit, type, check, build and demo gates; browser capture is not part of CI. |
| PowerPoint | ExportVerified: the 14-slide DevDay deck opened without repair [devday](../evidence/devday-redesign/review.json); the 7-slide planning deck opened [mb-06-10](../evidence/mb-06-10/review.md). | S7: compiled; package, workbook and text checks pass on 9 decks; Quick Look reference renders. PowerPoint not run: Unknown. [vis-016](../evidence/vis-016/review.md) |
| Keynote | Unknown. Installed but never run. [app availability](../evidence/vis-006/app-availability.json), [mb-06-10](../evidence/mb-06-10/review.md). | S7 PowerPoint package exists; Keynote not run: Unknown. |
| LibreOffice | ExportVerified: 18 pages rendered and reviewed on Linux [office evidence](../office-evidence.json); three Codex-generated slides in LibreOfficeDev 26.8 [dw-020](../evidence/dw-020/review.json). | Not installed in the S7 environment: Unknown. |
| Figma | Partial. The handoff generator and mock tests exist. Figma desktop was opened, but plugin registration/import was not completed. [mb-11-15](../evidence/mb-11-15/review.md). Importer acceptance: Unknown. | Not implemented: no v3 Figma target. |
| After Effects | Unknown. Not installed. [app availability](../evidence/vis-006/app-availability.json), [mb-11-15](../evidence/mb-11-15/review.md). | Not implemented. |

## 5. Structure families

The handoff proposes 12 content-driven structure families. [`compositions.mjs`](../../src/design/compositions.mjs) defines six, each with three variants. Every theme lists all 18 variants plus its own extra compositions: [Cream Collage](../../themes/cream-collage/theme.json) `diagonal-cover`, `reading-flow`; [Dark Data](../../themes/dark-data/theme.json) `chart-with-evidence-rail`, `reading-flow`; [Electric Violet](../../themes/electric-violet/theme.json) `photo-split`, `violet-chapter`, `reading-flow`.

| Handoff family | Existing family (variants) | Theme-only compositions | Status | VIS-014 proposal |
|---|---|---|---|---|
| Thesis / Chapter | `statement` (split, banner, center) | `diagonal-cover`, `violet-chapter` | partial: thesis yes; chapter only in Electric Violet | Add **`chapter`** |
| EvidenceChart | `evidence` (left, top, right) | `chart-with-evidence-rail` | exists | — |
| Comparison | `comparison` (matrix, rail, stack) | — | exists | — |
| BeforeAfter | none; the `image-compare` interaction exists | — | missing as a family | Add **`before-after`** if the page-42 storyboard is frozen (decision 1) |
| ProductStage | `image` partly | `photo-split` | partial | Add **`product-stage`** (requirements: "annotated product") |
| Sequence | `process` (line, rail, stair) | — | exists | — |
| SystemMap | none; the relationship diagram block exists but infers to `process` | — | partial | Add **`system-map`** (requirements: "technical explanation") |
| SmallMultiples | none | — | missing | Defer: needs a facet/shared-scale chart contract (S4) first |
| Documentary | `image` (left, strip, right) | `photo-split` | partial | Add **`case-study`** if the requirements §9 gallery is frozen (decision 1) |
| Quote | none; a `quote` block renders but has no attribution fields | — | missing | Add **`quote`** |
| Table / Reference | `comparison-matrix` uses tables | — | partial | Defer: tables are covered; a method appendix belongs with F08 |
| Conclusion / NextStep | none | — | missing | Add **`closing`** |

`metric` (oversized number) is a DeckWeft family with no handoff family. Its closest handoff matches are EvidenceChart and C08.

**Proposal: five firm families plus one that follows decision 1:**

- `chapter`
- `quote`
- `closing`
- `system-map`
- `product-stage`
- `case-study` **or** `before-after`

**Why these:**

1. Five of them match the list the requirements already name for VIS-014 ([VIS-006 section](../../DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md)): quote, case study, annotated product, chapter, technical explanation, closing.
2. Each fills a handoff family that is missing or only theme-specific.
3. Each reuses a block or interaction that already exists. That keeps VIS-014 an integration gate:
   - `quote` uses the quote block;
   - `system-map` uses the relationship diagram and steps;
   - `product-stage` uses image hotspots;
   - `before-after` uses image-compare.
4. The sixth slot depends on the gallery. Requirements §9 page 7 needs an annotated case story (`case-study`). Handoff page 09 needs `before-after`.

SmallMultiples and Table/Reference wait because they need chart contract work or overlap with existing tables.

**Implementation notes for S3:**

- Three schemas enumerate composition ids (`design-plan`, `web-scene`, `theme-pack`), and each theme lists its compositions. New families change all four.
- Today each family declares one `required` block type, and inference picks the first match. `chapter` and `statement` both need only a heading, so new families must be chosen by explicit composition id, not inferred.
- Each family needs three geometrically distinct variants (VIS-006 acceptance).

## 6. Charts

[`model.mjs`](../../src/components/charts/model.mjs) and the v3 schema define six chart variants: `line`, `area`, `ranked-bar`, `stacked`, `scatter`, `heatmap`. Some handoff charts map to other v3 blocks (table, metric, diagram, image interactions). The table names that block in "Closest existing".

Class: **existing** means it maps to a current variant or block. **extension** means it changes a current variant. **new** means it needs a new variant or contract.

Summary: 6 existing, 9 extension, 9 new. After S4 (2026-10-19), C01, C02, C05, C09, C13, C14 and C17 exist and are LocalVerified; C04, C06 (log axis drawn, connected ordering not), C22 and C23 remain partial.

| ID | Chart | P | Marks | Class | Closest existing | Status | State | Evidence | Repository note |
|---|---|---|---|---|---|---|---|---|---|
| C01 | Direct-labelled bar | P1 | D+S | extension | ranked-bar | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: `ranked-bar` with `sort: author` (or `value-asc`) draws HTML rows with the value at each bar end, a declared category focus and row event marks. |
| C02 | Grouped bar | P1 | S | extension | ranked-bar | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: new `chartType: grouped-bar` (two or more series, author order, zero baseline or declared truncation); every bar line names its series. |
| C03 | Stacked composition | P1 | D+S | existing | stacked | exists | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | stacked variant with positive/negative stacking and null gaps. |
| C04 | Sortable ranking matrix | P1 | S+V | extension | heatmap | partial | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | heatmap gives a value matrix; no rank semantics, change markers or interactive sort. |
| C05 | Benchmark table with qualifiers | P1 | D+V | extension | table block | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: dataset-backed `chartType: benchmark-table` with units, missing reasons, new dataset `qualifiers[]` and a best mark per column under `betterDirection`; the plain table block is unchanged. |
| C06 | Cost–performance frontier | P1 | D+S+V | extension | scatter | partial | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | scatter exists; connected ordering and log axes are missing. |
| C07 | Relationship scatter | P1 | D | existing | scatter | exists | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | scatter variant with explicit xUnit; fit/reference lines are not drawn. |
| C08 | Metric card | P1 | D | existing | metric block | exists | LocalVerified | [vis-006](../../docs/evidence/vis-006/review.md) | metric block with metric-left/band/right compositions. Metric block, not a chart variant; no reporting-period field. |
| C09 | Dot and interval | P1 | D | new | — | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: new `chartType: dot-interval` drawing the S1 series `interval` (type, level, method, bounds) on a linear or log axis. |
| C10 | Box plot | P2 | D | new | — | missing | Proposed | — | No distribution summary contract. |
| C11 | Area bubble overview | P2 | D | new | — | missing | Proposed | — | No area-encoded bubble layout. |
| C12 | Choropleth map | P2 | D+S | new | — | missing | Proposed | — | No geographic shapes. |
| C13 | Time trend with end labels | P1 | D+S | extension | line | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: `line` with `labels: end` (collision-free end labels) and a series `focus` that mutes background series. |
| C14 | Area trend with event notes | P1 | S | extension | area | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: dataset `events` draw as numbered rules on line, area and stacked axes, numbered row marks on bars and tables, and a visible note with the relation. |
| C15 | Waterfall | P2 | D | new | — | missing | Proposed | — | No waterfall decomposition. |
| C16 | Cumulative concentration (Lorenz) | P2 | D | new | — | missing | Proposed | — | No cumulative-share/Lorenz semantics with equality reference. |
| C17 | Faceted small multiples | P1 | D+S | new | — | exists | LocalVerified | [s4](../../docs/evidence/s4-chart-renderer/review.md) | S4: new `chartType: small-multiples`, one panel per series on one shared, stated scale, other series as faint context. |
| C18 | Network / computation path | P2 | D | extension | relationship diagram | partial | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | relationship diagram with directed supplied edges; bounded routing, no layered path layout. Diagram block, not a chart variant. |
| C19 | Process and feedback loop | P1 | D+S | existing | process/sequence diagram | exists | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | process/sequence diagrams draw supplied edges, including back edges. Diagram block, not a chart variant. |
| C20 | Object anatomy and part focus | P1 | S+V | existing | image-hotspots | exists | LocalVerified | [vis-009](../../docs/evidence/vis-009/review.md) | image-hotspots with stable annotations. Image component, not a chart variant. |
| C21 | Narrated process timeline | P3 | S | new | — | missing | Proposed | — | No narration/caption timeline. |
| C22 | Before/after | P1 | S | existing | image-compare | partial | LocalVerified | [vis-009](../../docs/evidence/vis-009/review.md) | image-compare tabs; no slider or permanent before/after labels contract. |
| C23 | Milestone timeline | P1 | D | extension | sequence/process diagram | partial | LocalVerified | [vis-008](../../docs/evidence/vis-008/review.md) | sequence/process diagrams; no dated milestone axis in v3. |
| C24 | Weighted term map | P3 | D | new | — | missing | Proposed | — | No weighted term layout. |

All three themes already carry `chartColors`. No handoff chart changes values to fit a theme; that rule matches VIS-008's exact-data contract.

## 7. Open decisions

**Decided by the user on 2026-10-19 at the start of S6:** decision 1 is option C. Decision 2 was not needed for VIS-014 and stays open for S8. See [§13](#13-s6-decisions-2026-10-19).

Both decisions belong to the user. Either answer can change VIS-014 or VIS-015 acceptance text in `roadmap.json`, which this step must not edit.

### Decision 1 — which 12-page gallery is frozen

| Option | What it is | Consequence |
|---|---|---|
| A. Requirements §9 | Four theme-specific pages per theme: Cream Collage 1–4, Electric Violet 5–8, Dark Data 9–12, run in both languages ([requirements §9](../../DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md)) | This is the gallery VIS-014's acceptance already refers to. Almost every page uses existing charts and interactions. It needs `case-study` and `closing`. |
| B. Handoff page 42 storyboard | Twelve content tasks (Chapter, Thesis+SideNote, Sequence, Comparison, EvidenceChart, DotInterval, ObjectAnatomy, ScenarioSnapshot, BeforeAfter, Reference, Quote/Documentary, Conclusion), each run in every theme | Tests cross-theme fact consistency directly. It puts C09 dot-interval (missing), a scenario snapshot (missing) and `before-after` on the release-gate path. It also changes VIS-014's acceptance text. |
| C. Both (kickoff suggestion) | A frozen as the VIS-014 diagnostic gallery; B kept as a cross-theme content deck | No VIS-014 text change. B becomes a later P1 exit check (handoff P1 exit: "the same 12 pages in three themes"). B's charts move to S4. |

Assessment: C keeps VIS-014 an integration gate and adds no new chart kinds to it. Neither 12-page set replaces VIS-014's separate 8-page story per theme.

### Decision 2 — T01–T03 and the VIS-015 themes

The handoff's DWD-100 makes T01–T03 the P1 *core* themes. The repository already ships three different core themes (VIS-005) and plans three more in VIS-015 ([requirements §4](../../DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md)). The planned and proposed directions correspond closely:

| Handoff | Closest VIS-015 plan | Overlap |
|---|---|---|
| T01 Editorial Fieldnotes (paper #F3F0E8, terracotta #B95E42) | `silver-gray-editorial` (white/black, copper #9D5A37) | Editorial serif, documentary photography, negative space |
| T02 Research Atlas (#FAFAF7, green #286448, cobalt #345BC5) | `fresh-report` (light/dark green, pink, lavender) | Structured reports; T02 is chart-first, fresh-report is illustration-first |
| T03 Luminous Stage (#0C1017, ice blue #A8D2EA) | `orange-launch` (near-black, orange #FC7C3D) | Dark product launch; orange-launch is a recorded derivative of `orange-tech` |

| Option | Consequence |
|---|---|
| Replace | VIS-015 keeps three themes. The handoff supplies full grammar and sample-page lists. The fresh-report illustration grammar and orange-launch derivative record are dropped. |
| Run in parallel | Six new themes; VIS-015 roughly doubles. |
| Merge | Keep the VIS-015 ids and adopt T01–T03's composition, type roles and acceptance pages as their grammar. |

Either way, VIS-014 keeps the existing three themes. Moving T01–T03 into VIS-014 would reopen a planned gate.

Font note: T01/T02 suggest Source Serif, IBM Plex and Noto CJK. AGENTS.md forbids redistributing fonts. Use locally available fonts with a recorded licence check.

## 8. Gap list, P0 → P3

Priorities are the handoff's. "Owner" is the existing task or kickoff step that would carry the work. It is a proposal, not an authorization.

### P0

| Gap | Items | Owner |
|---|---|---|
| Host baseline | Claude live acceptance (deferred; needs a new user instruction); Codex desktop activation; host resize/recovery receipts | DWD-010 → VIS-012, DW-020 |
| Scene contract fields | Typed takeaway, `contentStatus`, `keyStates` with named `staticState`; locks split by text/data/sources/composition | DWD-020 → S1 (contract done, see §11) |
| Chart field semantics | Denominator, better direction, log axis, interval type/bounds/method, missing-value reasons, frozen filter state | DWD-020/110 → S1 (contract done, renderers remain, see §11) |
| Theme token roles | `numeric` type role; `reference`/`missing` colours; `captionGap`/`sectionGap`/`safeArea`; motion distance/easing/delay/fallback. `displayZh`/`bodyZh` already cover the CJK roles | DWD-020 → S1 (contract done, see §11) |
| Interaction/accessibility | Real IME, 200% zoom, screen reader, other engines | DWD-040 → DW-120 |
| Navigation | F04/M04 chapter index and progress; F08 method appendix; M02 copy feedback | S2/S5 |
| Catalogue | F07 has little value inside slides. Propose deferring it, or scoping it to the Studio library | user/S10 |
| Vertical sample | One evidence page through import → theme switch → measurement → focus → pause → static freeze → export | S2 |

### P1

| Gap | Items | Owner |
|---|---|---|
| Families | Six new families (section 5) | VIS-014 → S3 |
| Charts | Done in S4: C02, C09, C17, C01, C05, C13, C14. Open: C04 ranking matrix, C06 connected frontier (log axis done), C23 dated milestone axis | DWD-110 → S4 (open items: S4 follow-up) |
| Motion | M20 mask/stagger, M19 chart annotation reveal, M08 slider, M05 tab stage, M13 interactive sort, M07 paired layers | DWD-120/125 → S5 |
| Quote and media | F10 speaker/organisation fields; F12 v3 video/recording block with player controls; F02 cross-theme chapter | S3 |
| Low-value P1 motion | M01 skippable intro, M03 hover cards, M06 carousel. Each conflicts with "no unsolicited autoplay" or adds pointer-only state. Propose re-ranking | user/S5 |
| Output | ~~L1/L2/L3 capability tiers; v3 PPTX/PDF compilers with per-element receipts~~ Done locally in S7 ([§15](#15-s7-result--output-levels-and-vis-016-2026-10-19)); application runs remain | DWD-130 → VIS-016, S7 |
| Release gate | Frozen gallery, three 8-page stories, both hosts, standalone package | VIS-014 → S6 |
| Themes | T01–T03 per decision 2 | VIS-015 → S8 |

### P2

| Gap | Items | Owner |
|---|---|---|
| Exploration | M09 three stages, M11/M14 parameter panels, M12 scale shift | DWD-210 → S9 |
| Analytical charts | C10, C11, C12, C15, C16; C18 layered routing | DWD-215 → S4 follow-up |
| Authoring | Chapter and object scopes; version diff; style-only restore | DWD-200/230 → S9 |
| Themes | T04, T05; layout switch after translation growth | DWD-220 → VIS-015 |

### P3

| Gap | Items | Owner |
|---|---|---|
| Advanced visuals | M18 in v3, M17 pointer fragments | DWD-300 → EXP-001 |
| Media clock | M16, C21 | DWD-305 (no task yet) |
| Term map | C24 | Defer |
| Pattern library | Version and deprecation fields, source re-review | DWD-310 → S10 |

## 9. What remains Unknown

- Keynote, Figma import and After Effects for any path.
- PowerPoint and LibreOffice for v3 output: no compiler exists.
- PDF output: earlier PDFs were intermediate LibreOffice conversions and are not distributed.
- Codex desktop activation; Claude live runs.
- Firefox and Safari/WebKit.
- Screen readers, real IME, 200% zoom.
- Performance budgets on a reference device.
- Every handoff source page: the repository did not re-open them. The 38 patterns without a V mark describe reference behaviour that remains unobserved.

## 10. Commands run for this alignment

```bash
node --test tests/design-registers.test.mjs
DECKWEFT_HANDOFF_DIR=/path/to/DeckWeft_Design_Handoff node --test tests/design-registers.test.mjs
npm run check
npm test
```

Results on 2026-10-19:

- Register test: 3 pass, 1 skipped. With the handoff directory set: 4 pass. Three hand-made violations were each rejected: a reference wrongly marked verified, a missing pattern given a *Verified state, and a nonexistent evidence path.
- `npm run check`: 1,075 files checked, all relative document links included.
- `npm test`: 342 tests, 341 pass, 0 fail, 1 skipped (the environment-gated comparison).

The full `npm run verify` (types, build, demos) was not run because no runtime code changed.

No browser, host or application was run. Nothing was visually inspected for this step. PowerPoint, Keynote, Figma and After Effects were not opened.

## 11. S1 result — contract extension, 2026-10-19

Checked against the same commit `058b939` plus the uncommitted S1 changes. State of everything below: **Implemented** (unit tests and regenerated types; no browser, host or application run). Field-by-field expected results and recovery steps are in [architecture](../en/architecture.md#version-3-handoff-fields-s1-2026-10-19) and [migration](../en/migration.md#opt-into-the-strict-misreading-guards).

### Closed in the contracts

| Gap (§8 P0) | Where it landed | Proof |
|---|---|---|
| Typed takeaway | `design-plan` scene `takeaway {blockId}` (content stays in the block); chart block `question` / `takeaway` | [test](../../tests/handoff-contracts.test.mjs), [fixture](../../tests/fixtures/visual/semantic-chart.en.json) |
| `contentStatus` | scene `contentStatus` (`sourced` is checked against synthetic/unsourced datasets, metrics and the takeaway) | same |
| `keyStates` / named `staticState` | scene `keyStates[] {id, position}` over cue boundaries; `staticState {keyStateId}`; position 0 is the existing authored opening (`initialSeriesIds` / `initialTab` / `initialStepId`), so nothing is duplicated; `staticInteractionState()` returns the frozen filter/focus | same |
| Lock categories | No new fields: text → `lockedBlockIds`; data → locked chart ⇒ dataset (incl. `definition`, `missing`, `events`, intervals); sources → linked sources; composition → `sceneLocks` | lock test |
| Dataset identity and definitions | `version`, `collectedAt`, `validPeriod`, `definition {denominator, sample, normalized, betterDirection}` | guard 3 and migration tests |
| Log axis per chart | `axis.scale` / `xAxis.scale`; dataset-level scale is rejected | guard 2 |
| Sort | chart `sort` (`author` / `value-desc` / `value-asc`) | capability test |
| Missing-value reasons | dataset `missing[]` bound to `categoryIds`, null only | guard 5 |
| Interval type, bounds, method | series `interval {type, level, method, lower, upper}` — one type and level per dataset (C09 contract, `chartClass` stays `new`) | guard 4 |
| Event notes (C14) | dataset `events[]` with `relation: temporal | attributed` | guard 6 |
| Motion key states, trigger, clock, reducedMotion | scene `keyStates`; `motion.trigger: manual`, `motion.clock: cues`, `motion.reducedMotion: instant | static`; `effectiveMotion()` unchanged | motion test |
| Theme token roles | optional `typography.numeric`, `palette.reference` / `missing`, `spacing.captionGap` / `sectionGap` / `safeArea`, `motion.distance` / `easing` / `delay` / `fallback`; `themeTokens()` resolves the documented defaults; `resolveTheme()` untouched | theme test + render baseline |
| Six misreading guards | [chart semantics](../../src/components/charts/semantics.mjs), each with a passing and a failing test | guards 1–6 |

**Version strategy.** No new `schemaVersion`. Five guards are structural: they can only fire on the new fields (log scale, truncation, intervals, missing reasons, events), so every existing v3 document, demo and fixture still loads unchanged. The percentage-denominator guard would have rejected every existing fixture (all use unit `%` with no denominator), so it is opt-in through `rules.misreading: "strict"`, entered by the explicit migration `declareChartSemantics()`, which never infers a denominator. Legacy fixture: `wave-a.*.json` unchanged. Negative fixture: `semantic-chart.negative.json`. Byte-identical proof: [render-baseline.json](../../tests/fixtures/visual/render-baseline.json) hashes 12 HTML/JSON outputs and 12 resolved themes recorded before the change; the S1 test regenerates and compares them.

**Declared but not drawn.** The HTML target refuses, with a named code, every declaration that no compiler renders yet instead of dropping it from the figure: `CHART_SCALE_UNIMPLEMENTED`, `CHART_TRUNCATION_UNIMPLEMENTED`, `CHART_SORT_UNIMPLEMENTED`, `CHART_INTERVAL_UNIMPLEMENTED`, `CHART_EVENTS_UNIMPLEMENTED` (S4), `STATIC_STATE_UNIMPLEMENTED`, `REDUCED_MOTION_FALLBACK_UNIMPLEMENTED` (S2). JSON export always carries them. Since S4, `CHART_TRUNCATION_UNIMPLEMENTED` and `CHART_SORT_UNIMPLEMENTED` are removed, and the other three chart codes fire only on kinds without that drawing (see the S4 field list below).

### Still open after S1

| Remaining | Owner |
|---|---|
| ~~Drawing log axes, truncated bars, author/ascending sort, dot-intervals (C09), event marks (C14); showing missing reasons, question and takeaway in output~~ Done in S4 (see below) | S4 |
| Applying `staticState` beyond the opening and the `static` reduced-motion fallback in static export; the vertical sample | S2 |
| Theme packs declaring the new tokens and the renderer consuming them (numeric type role, reference/missing colours, spacing, motion distance/easing/delay) | S3 / S8 |
| Trigger kinds beyond `manual` (enter, scroll), a media clock (M16), RevealMask/Crossfade primitives | S5 — primitives done (see below); trigger kinds and the media clock still open |
| Studio editing of the new fields (only motion-policy preservation was added to the editor) | S2 / S9 |
| Browser evidence for any of the above (state stays Implemented) | S2 onward |

### Fields considered and not added

- `chartKind`, `cjkDisplay` / `cjkBody`, `margin` / `gutter`, `intensity`, a `locked` list: `chartType`, `displayZh` / `bodyZh`, `spacing.page` / `gap`, `profile.motionIntensity` and the existing locks already carry them.
- A dataset-level axis scale: rejected on purpose; the handoff rule is "declared per chart".
- Encoding fields (colour meaning, shape, layers, comparison target), per-cell table qualifiers (C05) and events at instants between categories: they need the S4 chart design, not a contract placeholder.
- Separate lock fields for text / data / sources / composition: the existing locks express all four (mapping above).
- `sceneLocks.fields` allows nine values but `maxItems` is 8, so all nine cannot be locked at once. Noted, not changed in S1.

### Returned from S2

The [vertical sample](design-handoff-vertical-sample.md#returned-to-the-s1-field-list) sends five items back to this field list, without a new schema: legend focus on single-series ranked bars (C1), “absent `staticState` means the opening” versus existing no-JS output (C7), declared-but-not-drawn chart and dataset fields that are not refused (C10), a versioning rule for the embedded runtime (C6), and the lock mapping, which now keeps `staticState` under `cues` and `motion` (C18, done). S2 applied the static state and the `static` reduced-motion fallback in web output; the S2 rows of “Still open after S1” are closed except the items in its conflict list. S5 decided C6 and C7 ([below](#s5-decisions-on-the-field-list-2026-10-19)); C1 and C10 remain open.

### S5 decisions on the field list (2026-10-19)

Checked on the S2 commit `232060e` plus the S5 changes ([vertical sample](design-handoff-vertical-sample.md#s5-update-2026-10-19), [evidence](../evidence/s5-motion-state/review.md)).

| Item | Decision | Fields |
| --- | --- | --- |
| C7 — absent `staticState` | **Keep.** “Absent means the opening” holds for the player; the no-JavaScript view keeps drawing the complete authored data, so existing output does not change. Freezing the opening is an explicit author choice: a key state at position 0 named as the static state. No migration is added, because nothing is converted. | none |
| Series focus (EvidenceStage, M13) | Focus and hide are separate. Hide stays `data.filter` (`seriesIds`); focus is a new cue event and an optional opening field. Schema-validated, refused when the series is hidden at that point; legacy plans are unaffected (both are optional). | design-plan and web-scene: chart-select `initialFocusSeriesId`; cue `{event: "data.focus", interactionId, seriesId?}` (omit `seriesId` to clear) |
| EvidenceStage state | `datasetId`, `metricId`, `focusSeriesId`, `sortKey`, `scale` and `caption` are separate fields of the runtime state, not schema fields. `datasetId`, `sortKey` and `scale` come from the chart declaration; `metricId` is `null`. No event changes them until a metric switch (M14, S9), an interactive sort (M13) or a scale shift (M12, S9) is drawn. | none (runtime state only) |
| C6 — embedded runtime versioning | `PLAYER_VERSION` names the player bytes. Any change bumps it and re-records `render-baseline.json` in its own commit; `playerHistory` refuses one version with two byte sequences; separate markup/data/script/style hashes per HTML entry. | none (test fixture) |
| Motion primitives (M19, M20) | Six named primitives on existing cue events with a declared reduced-motion result; no new motion field. The 400 ms cap stays; the handoff's 450–800 ms proposal is not adopted. ImagePan is not added. | none |
| Still open | Trigger kinds beyond `manual` (enter, scroll), the scroll-story advancement mode, a media clock (M16), a category focus for single-series ranked bars (C1). | — |

### S4 field-list decisions, 2026-10-19

State: **LocalVerified** for the chart renderer ([evidence](../evidence/s4-chart-renderer/review.md), [conflicts](design-handoff-vertical-sample.md#conflict-list)). No new schema; the optional fields below extend `presentation-v3`.

| Item | Decision | Contract |
|---|---|---|
| C1 legend focus on a single-series ranked bar | **Declared category focus.** A single-series chart has no series to focus: every bar belongs to the one series. The author names the categories that carry the conclusion; series focus exists only where there are two or more series. | Chart `focus {categoryIds[]}` for `ranked-bar`, `grouped-bar`, `dot-interval`, `benchmark-table`; `focus {seriesIds[]}` for `line`, `grouped-bar`, `dot-interval`, `small-multiples`, never naming every series. Exactly one of the two. Rejected: `focus.seriesIds` on a single-series dataset ("cannot focus a series"). Drawing: focused marks solid, others lighter and outlined; the legend names both. **For S5:** the chart-select state gains `focusIds` initialised from the block; the player passes `{...block, focus}` to `chart()`; the series switch is not offered for single-series charts. |
| C3 filter versus sort | **Separate concepts.** `sort` orders what is shown; it never removes a category. A chart-select range (`fromId` → `toId`) filters in author (`categoryIds`) order; it never reorders. | The static statement names both: "Filter: author order, A → B (n of N categories)" and "Sorted by value, highest first; ranks among all N: …". A "top N by rank" filter is a different filter kind; **for S5** it needs its own field, not an author range. |
| C10 declared but not drawn | **Drawn.** No field is refused. | Chart `question` (figure caption heading) and `takeaway` (labelled line); dataset `definition` (denominator, sample, normalized, better direction), `version`, `collectedAt` and `validPeriod` as one visible definition line. |
| C6 embedded runtime versioning | **Deliberate re-recording, with a renderer version bump.** `chart()` is embedded in every export, so any drawing change changes every HTML hash. A conditional extension (as S2 did) would leave two chart drawings in circulation. | `WEB_RENDERER_VERSION` `visual-art-direction.3` → `.4`; [render-baseline.json](../../tests/fixtures/visual/render-baseline.json) re-recorded in a separate commit with a per-entry diff that keeps text, values and anchors ([evidence](../evidence/s4-chart-renderer/review.md#byte-identity)). |
| New kinds | `chartType` adds `grouped-bar`, `dot-interval`, `small-multiples`, `benchmark-table`. | Grouped bars and small multiples need two or more series; a dot-interval needs an interval on every series; grouped bars are filled (zero baseline or declared truncation, never log). |
| End labels (C13) | Chart `labels: "points" \| "end"`, line only. | A label strategy, not a new kind; a theme may move labels but never switch the strategy. |
| Qualifiers (C05) | Dataset `qualifiers[] {seriesId, categoryId, label, note?}`. | One per value, never on a null (a null takes a missing reason); needs `categoryIds`. Numbered in the dataset's own order, so filtered views and the full table share numbers. |
| Where each S1 declaration is drawn | Truncation: every filled kind. Sort: ranked bars and stacks (by net total). Log axis: line, scatter, dot-interval, small multiples. Intervals: line, dot-interval. Events: line, area, stacked, ranked, grouped, dot-interval, small multiples, benchmark table. Missing reasons and qualifiers: every kind (notes and table). | Anything else stays refused for HTML with `CHART_SCALE_UNIMPLEMENTED`, `CHART_INTERVAL_UNIMPLEMENTED` or `CHART_EVENTS_UNIMPLEMENTED`. Capability receipts list the drawn declarations per component (`declarations`). |
| Conclusion labels (C2) | Labels a chart needs for its conclusion carry `data-conclusion-label`. | The fit audit fails when one is hidden, clipped, only reachable by scrolling, outside the viewport or covered by another; the Studio gate then answers `VISUAL_FIT`. Legacy line/area/stacked/scatter/heatmap point labels are not marked and still scroll on narrow screens (open). |

### Commands run for S1

```bash
npm test                      # before any change: 342 tests, 341 pass, 1 skipped (incl. 4 register tests)
node --test tests/handoff-contracts.test.mjs   # 13 pass
node --test tests/design-registers.test.mjs    # 3 pass, 1 skipped
npm run verify                # 355 tests, 354 pass, 0 fail, 1 skipped; types, check (1,083 files), build, demos
```

## 12. S3 result — six composition families, 2026-10-19

Checked against `232060e` (S2) plus the S3 changes. State: **LocalVerified** for HTML layout in Chromium. [Review](../evidence/s3-composition-families/review.md) · [manual](../en/visual-studio.md#six-more-composition-families-s3).

### Chosen and left out

The S3 instruction listed seven candidates. Six were added: `chapter`, `before-after`, `system-map`, `small-multiples`, `quote`, `closing`. `compositions.mjs` now holds twelve families and 36 geometries. All three schemas and all three theme packs enumerate them.

**Table / Reference was left out.** The comparison family already owns tables in three geometries, so a reference family could not be told apart by content. Its method appendix belongs with F08 (progressive disclosure).

**Changes against §5.** ProductStage and case-study were not in the S3 list and remain open. SmallMultiples, deferred in §5, is layout only. Its shared scale is a declared fixed axis that the current renderer already draws, so no S4 contract was needed.

### Decisions

| Topic | Decision | Why |
|---|---|---|
| Inference | New families are explicit only (composition id or Studio control) | `chapter`, `closing` and `statement` need the same blocks; keeping inference unchanged also keeps the VIS-006, component and interaction suites' candidates unchanged |
| Quote attribution | Verbatim = quote block, attribution = a citation of one of the quote's sources, paraphrase = paragraph. No schema field | Uses existing blocks. Speaker / organisation typed fields go back to the S1 field list |
| Before / after "same object" | Two images, same factual kind, same displayed aspect ratio (checked with assets in `assertVisualProject`). The baseline is the first image and is labelled by generated text | The object's identity cannot be verified by code; framing and kind can |
| Small multiples | Same chart type, unit, fixed axis and categories; two panels per 1440 px page; `splitSmallMultiples()` for more | The current 800-unit chart canvas needs at least 572 px per panel for 10 px text |
| Rhythm | Repeat and card-run rules are DP costs (100 each) over a two-page state; variety is advice | Selection only varies geometry within families chosen by content and author; locked compositions stay and are reported |
| C9 | `applySceneTheme` never writes `colorMode`; violet chapter only when the mode allows chapter colour | Theme switches change composition and type roles only; the round trip is now lossless |

### Pattern register

F02 → `exists` / LocalVerified. F10 → LocalVerified (still `partial`: no typed speaker fields). C17 → `partial` / LocalVerified (layout only). C22 → LocalVerified (still `partial`: no slider). Pattern summary: F 6 exist / 5 partial / 1 missing; M unchanged; C 5 / 10 / 9.

### Open after S3

| Item | Owner |
|---|---|
| Panel-sized chart drawing (more than two panels per page), narrow drawing for branching relationship maps | S4 |
| Before/after slider (M08), quote carousel (M06) | S5 |
| C12 line-end CJK punctuation measured as overflow; C13 header font; CJK heading breaks inside phrases; theme packs declaring the S1 token roles | S8 |
| Studio control for splitting small multiples; typed quote speaker fields | S9 / S1 field list |
| ProductStage, case-study, Table / Reference | VIS-014 decision — not added ([§13](#13-s6-decisions-2026-10-19)) |

## 13. S6 decisions, 2026-10-19

The user decided these at the start of S6 (VIS-014). They are recorded here so S7–S10 do not reopen them silently.

| Topic | Decision | Consequence |
|---|---|---|
| Integration of S3, S4, S5 | Merge the three sibling branches into the S6 branch (S3 → S4 → S5). `main` is not changed and nothing is pushed. | One re-recording of [render-baseline.json](../../tests/fixtures/visual/render-baseline.json) after the merge, in its own commit, with `PLAYER_VERSION` → `semantic-player.3` and `WEB_RENDERER_VERSION` → `visual-art-direction.5`. |
| Decision 1 — frozen gallery | **Option C.** The requirements §9 gallery (four pages per theme, English and Simplified Chinese) is the frozen VIS-014 gallery. The page-42 storyboard stays a later P1 exit check (S8). | No change to VIS-014's acceptance text. Page 7 (annotated case / image story) uses the `image` family with image hotspots; no `case-study` family is added. ProductStage and Table / Reference are not added in VIS-014 either. |
| C1 — chart focus (S4 `focus` vs S5 `data.focus`) | **Layered rule.** The declared block `focus` is the author's default emphasis and the no-JavaScript drawing. A reader's `data.focus` (one series) overrides it while set; clearing returns to the declared focus (**Author's focus**). A static state that freezes `data.focus` wins. Single-series charts show no series controls and refuse a series focus. | [charts.js](../../public/runtime/charts.js) `focusedChart` draws both the player and static output; the reducer refuses a single-series focus. [Tests](../../tests/layered-focus.test.mjs). Kinds that draw a declared series focus draw the reader's focus the same way; area, stacked and scatter keep S5's colour mixing. |
| Claude host | Stays **deferred**. Only Codex runs a real prompt-to-artifact task and scoped revision. | VIS-014 needs both hosts, so the most its evidence can support is `partial`. |
| Decision 2 — T01–T03 | Not asked; not needed for VIS-014. | Open for S8. |


## 14. S6 result — VIS-014 release gate, 2026-10-19

State: **partial** (roadmap) / LocalVerified for the gate's local scope; HostVerified for one Codex run; Claude deferred. [Evidence](../evidence/vis-014/review.md) · [gate manual](../visual-acceptance/README.md) · [scored review](../visual-acceptance/review.md).

| Kickoff step | Result |
|---|---|
| 1. Gallery in both languages per theme; facts identical | Frozen §9 gallery (decision C) with per-page content hashes; every page drawn in every theme keeps identical tables, links and citations (tested) |
| 2. One coherent bilingual 8-page story per theme; weakest page | Three stories from one document; weakest pages named (`st-process`, `st-evidence`, `st-process`) |
| 3. At least three interaction types with real traces | Four kinds, 96 of 96 traces at 1440 / 1024 / 390 px |
| 4. Explicit cases | 10 of 11 pass; missing glyph undetected (C13, S8) |
| 5. Compare with the VIS-001 baseline | Text preserved in every theme; side-by-side sheets viewed |
| 6. Standalone package outside the repository | 8 of 8 decks offline in Chromium 151, Firefox 153 and WebKit 26.5; bundle ran a local task there |
| 7. Host runs | Codex drafted → reviewed → exported → page-3 revision → reviewed → exported (attempt 3); Claude deferred |

Found and fixed by the gate (renderer `visual-art-direction.6`, player `semantic-player.4`): diagonal-cover citation contrast and split cover number, trend label overlap, heatmap label margin, before/after labels under the compare panel, linear process layout. Also: the host adapter now names which review check failed.

Handoff decisions not changed by S6: ProductStage, case-study and Table / Reference are not added; the page-42 storyboard stays a P1 exit check for S8; T01–T03 (decision 2) stays open for S8.

## 15. S7 result — output levels and VIS-016, 2026-10-19

State: **partial** (roadmap) / LocalVerified for the package and text checks. PowerPoint and Keynote were not run. [Evidence](../evidence/vis-016/review.md) · [manual](../en/compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016).

| Kickoff step | Result |
|---|---|
| 1. Levels per component and format | `COMPONENT_LEVELS` and `outputLevel()` in [capabilities.mjs](../../src/targets/capabilities.mjs). Web is L1 throughout. In PDF, text, tables and images are L1; charts and diagrams are L2. In PowerPoint, everything is L1 except charts with no native form, interval bounds, a log axis or a missing value, which are L3. Every export report lists them per block. |
| 2. Export order in code | [export-order.mjs](../../src/targets/export-order.mjs): ready → static-state → freeze → stop-motion → reveal → render → check. `EXPORT_ORDER` refuses a stage out of order. Stage 1 refuses a stale or unmeasured layout, fonts not loaded, a last-resort glyph (`FONT_GLYPH_MISSING`) or an image not decoded. |
| 3. Static delivery rules | [static-delivery.mjs](../../src/targets/static-delivery.mjs). Staged reveals export the final state or the static state. Hover facts are visible annotations. Filters export the selected result with a written statement. Legends keep series identity. Comparisons keep both states. Scroll stories, media scenes and shared-element transitions do not exist in the v3 schema; each is recorded as absent. |
| 4. VIS-016 compiler | [compile.mjs](../../src/targets/pptx/compile.mjs), [fallbacks.mjs](../../src/targets/pptx/fallbacks.mjs), [audit.mjs](../../src/targets/pptx/audit.mjs) and [compatibility-report.mjs](../../src/targets/pptx/compatibility-report.mjs), plus [the PDF print job](../../src/targets/pdf/print.mjs). Charts that stay editable embed their data in a workbook. An L3 chart is an image of that chart only, with its summary in alt text and notes. |
| 5. Four separate results | PowerPoint editability and the page check pass on 9 of 9 decks. PDF searchability passes for English; Chinese is partial (CJK radical code points). Accessibility is partial: the package passes, and the PDF has Chromium figure wrappers without alt text. Visual fidelity is partial (Quick Look renders only). |

**Decisions made in S7** (no user decision was needed):

- **Geometry comes from a browser measurement of the static web scene.** Each scene is scaled whole into 16:9, never re-laid out.
- **Balanced headings get the browser's line breaks** as written breaks, with a receipt.
- **Translucent paint is blended.** Horizontal bars store rows bottom-to-top. Both choices survive renderers that ignore transparency or a reversed axis.
- **Log-axis charts and charts with a missing value are L3** until an application run confirms native log axes and gaps. Quick Look drew both wrongly.
- **The PDF prints with screen styles.** Closed disclosures keep only their summary; their content goes to the notes pages.
- **The embedded web player and renderer are unchanged**, so no version bump or baseline re-recording.

**Returned to later steps:**

- the Chinese PDF Unicode maps
- the PDF figure wrappers (a markup change, so a player bump)
- small text on tall scenes (16:9 measurement or stepped pages)
- PowerPoint and PDF export in the Studio menu (S9)
- application runs by the user

## 16. S8 decisions — T01–T03 themes and VIS-015, 2026-10-19

Decision 2 ([§7](#decision-2--t01t03-and-the-vis-015-themes)) was left as a placeholder in the S8 brief. It is recorded here before any S8 code, as the brief asks, so that S9 and S10 do not reopen it silently.

| Topic | Decision | Consequence |
|---|---|---|
| Decision 2 — T01–T03 and the VIS-015 themes | **Merge** (the user's choice, 2026-10-19, after the session first proposed Replace). VIS-015 keeps its planned ids, `silver-gray-editorial`, `fresh-report` and `orange-launch`, and each adopts one handoff art direction as its whole grammar: T01 Editorial Fieldnotes → `silver-gray-editorial`, T02 Research Atlas → `fresh-report`, T03 Luminous Stage (static hero, no shader) → `orange-launch`. The requirements §4 palettes for those ids (white/black with copper, light/dark green with pink and lavender, near-black with orange) are **not** used: the packs carry the handoff's measured palettes, composition grammar, type roles, tokens and acceptance pages. The fresh-report illustration grammar and the orange-launch derivative record are dropped. | VIS-014 keeps Cream Collage, Dark Data and Electric Violet unchanged. The three packs were first built under the handoff names; the rename changed ids, folder names and stylesheet selectors only (renderer `.9` → `.10`, baseline re-recorded, evidence re-run). |
| Who decided | The user chose Merge in the session's wrap-up. The session had taken Replace first under the brief's wording (the themes named by their handoff names, three packs asked for) and flagged it as reversible. | Recorded here so S9 and S10 do not reopen it. |
| VIS-015 acceptance text | Unchanged in `roadmap.json`. "Two gallery pages per new direction and a full story in each" is met by drawing the frozen 12-page gallery and an 8-page story in each new theme; "author feedback can promote a successful design into a reusable profile" is not built in S8, so VIS-015 can reach `partial` at most. | Status is set only with the S8 evidence ([VIS-015 review](../evidence/vis-015/review.md)). |
| Fonts | Source Serif, IBM Plex and Noto CJK are candidates only and are not installed on the S8 machine. Packs name platform fonts first and the Open Font Licence candidates as later fallbacks; no font file is bundled. | The licence check and the fonts actually drawn are recorded in the VIS-015 review. |
| Token roles | The S1 token roles (`typography.numeric`, `palette.reference` / `missing`, `spacing.captionGap` / `sectionGap` / `safeArea`, `motion.distance` / `easing` / `delay` / `fallback`) are declared by the three new packs and consumed by the renderer through CSS custom properties whose fallbacks equal the current literal values, so the three VIS-014 themes render exactly as before. | `resolveTheme()` gains a `tokens` object; the render baseline is re-recorded once, in its own commit, with the renderer and player version bumps that S8 needs anyway (new theme CSS, the C12 heading breaks, the C13 glyph audit). |

### S8 result, 2026-10-19

State: **partial** (roadmap VIS-015) / LocalVerified for the web output in Chromium; exports compile and pass their own checks; PowerPoint and Keynote not run. [Evidence](../evidence/vis-015/review.md) · [manual](../en/visual-studio.md#three-more-themes-silver-gray-editorial-fresh-report-orange-launch-s8-vis-015).

| Brief item | Result |
|---|---|
| Three theme packs with attribution | `themes/silver-gray-editorial`, `themes/fresh-report`, `themes/orange-launch`, version 1.0.0; sixteen theme-only compositions (two or more title, two or more evidence, one closing per theme); type roles, media ratio and motion tokens differ per theme |
| S1 token roles declared and consumed | All roles declared by the three packs; custom properties emitted only for declaring packs; consumers fall back to the previous literal values, so the VIS-014 themes keep their text, values and anchors (baseline diff) |
| Contrast at actual sizes | 136 measured pairs as drawn, all above 4.5:1 (body) or 3:1 (large, graphics); T01 terracotta darkened to `#A8503A`; token pairs recorded |
| Fonts | Platform fonts by name (Charter, Gill Sans, Futura, Avenir Next, Helvetica Neue, Menlo, Songti SC, PingFang SC); OFL candidates named as later fallbacks, none installed here, none bundled; drawn fonts recorded per deck and listed in every export report |
| C12 | `<wbr>` at ICU word boundaries with `word-break: keep-all` on zh-CN display text; full-width punctuation advances kept so the measured box equals the drawn box; 24 headings per theme checked at 1440 and 390 px |
| C13 | In-page glyph audit (canvas pixels against the font's own .notdef) in the fit audit, the Studio gate, the candidate fit, the quality checks and the export readiness stage; the VIS-014 missing-glyph case now passes |
| T01 / T02 pairing | Shared type scale tiers, citation role and chart colour order; the S8 story document drawn by both keeps identical facts |
| T03 acceptance | Title contrast measured, media-failure cover (drawn orb; missing file refused by name), low-motion mode (`fallback: static`), static composition; no WebGL |
| Sample pages | T01 six pages and T02 six pages as listed by the handoff; T03 six pages; built before any motion work |
| Page-42 storyboard | Twelve tasks in every theme and both languages, facts identical; ScenarioSnapshot drawn as a static comparison table and recorded as missing |
| Verification | 24 decks × 3 widths with 0 issues; black-and-white atlas distinguishes the main series; contact sheets viewed and the weakest page named per theme; `npm run export:targets -- --s8` passes PowerPoint editability and the page check on 18 of 18 |

**Decisions made in S8** (besides decision 2): the stage hero's drawn orb appears only when no object is bound; theme-only compositions stay outside the family registry (validated in `plan.mjs`, replaced by family geometry when rhythm runs, as diagonal-cover is); the S8 stylesheet uses no text transform so exported text keeps its authored case; a declared monospace numeric role widens chart value space; the renderer version moved to `.9` and the player to `.5`, each re-recording in its own commit.

**Returned to later steps:** reusable-profile promotion from author feedback (VIS-015, S9); pages over the 900 px candidate budget (a 16:9 tier or page splitting); table cells in zh-CN at 390 px; ScenarioSnapshot parameters; application runs by the user.

## 17. S9a decisions and result — author controls, 2026-10-19

Built on `4f26b33` (S1–S8) in a worktree branch stacked on `claude/design-handoff-alignment-19703c`. Nothing is pushed. State: **LocalVerified** for the S9a scope (isolated Chromium, viewed images). In the roadmap, VIS-013 stays `implemented-local` and VIS-015 stays `partial`. [Evidence](../evidence/s9a-author-controls/review.md) · [workbench manual](../en/workbench.md#six-questions-and-three-directions-s9a) · [Visual Studio manual](../en/visual-studio.md#author-controls-chapters-and-separate-locks-s9a).

### The ten questions

The brief left all ten questions unanswered, so each took its stated default. The answers are recorded here so S9b and S10 do not reopen them silently.

| # | Question | Answer applied |
|---|---|---|
| 1 | One session or two | Two: S9a here; S9b in its own session and worktree, starting from S9a's tip |
| 2 | Branch | Stacked on `claude/design-handoff-alignment-19703c` (this worktree's branch was fast-forwarded to `4f26b33`); `main` unchanged; nothing pushed |
| 3 | Reusable profile in S9a | Yes |
| 4 | Blueprint A object | A: DeckWeft's own export pipeline anatomy (measure → repair → review → export), for S9b |
| 5 | Explore parameter control | None: Explore selects parts and compares states statically (S9b) |
| 6 | Studio PowerPoint and PDF | Built now |
| 7 | Pages over the 900 px budget | Recorded, not fixed |
| 8 | S8 PowerPoint / Keynote checks | Treated as not run; VIS-015 / VIS-016 text unchanged on this point |
| 9 | T04 Kinetic Proof, T05 Human Documentary | Proposed, not scheduled |
| 10 | Claude host | Deferred |

### Decisions made in S9a

| Topic | Decision |
|---|---|
| Contract | Optional fields, no `schemaVersion` change: plan `chapters[] {id, startSceneId, profile?}`, scene `disclosure {blockIds}`, and `authorOverrides.lockMode` / `lockedDatasetIds` / `lockedSourceIds`. `schemas/design-profile.schema.json` is new. Negative fixture: `s9a.negative.json`. Migration: `separateLocks()` (explicit; copies every implied lock). |
| Chapters | Defined by a start page; membership follows page order, so moves and splits never leave gaps. Precedence: object › page › chapter › deck (`effectiveProfile(document, scene, plan)`). |
| Four levels | Deck, chapter and page carry profile choices. The object level carries locks and per-object actions (replace one image, move one block). |
| Locks | Text, data, sources and composition are separate after `separateLocks()`; combined (S1) behaviour is unchanged until then. Entering separate mode without copying implied locks is refused. |
| Author actions | Planned on the server, never applied there. Each plan states its scope and effects and what locks kept; the Studio applies it through `changed()`, so Undo, Save, conflicts and History are unchanged. |
| Give the chart more space | Moves to the layout that draws the plot largest per theme, by measurement (`chart-space-measurements.json`): `evidence-top` caps the plot at 700 × 350 px; side layouts draw 780 × 390, `atlas-figure` 865 × 433 and `fieldnotes-figure` 834 × 417. Otherwise it moves supporting text behind the disclosure; more than two panels split into pages of two. |
| Reduce text | Never deletes. Paragraphs and lists move behind a closed page disclosure (web), slide notes (PowerPoint) or notes pages (PDF). The first supporting block, numbers, units, qualifications (*synthetic*, *not measured*, …), citations and callouts stay; a callout moves only when chosen as the object. A renderer stylesheet rule was needed: `visual-art-direction.11`, baseline re-recorded in its own commit, no visible word or value changed. |
| Directions | Three grammar groups: editorial, report and stage. The chosen style leads its group, and the S8 pack represents each other group. Auto order follows the content: charts → report, images → stage, else editorial. A chosen direction is re-applied deterministically by the workbench, so the deck equals its preview. No third identical composition in a row. |
| Page planning | Classification uses the author's own labels, then structure, then keywords, then position; the deciding cue is shown. Capacity per detail level. The planner asks for missing units and unsourced claims, or marks pages `evidence-required`, which every final export refuses (`EVIDENCE_REQUIRED`); previews still render. It never pads or merges. |
| Profiles | Promotion needs a passing workbench review of the saved deck, or explicit author acceptance. Stored per library. The dominant theme of the deck is recorded with its composition per page kind. Token drift is reported when applied. |
| Studio export | PowerPoint and PDF run the S7 export order in the isolated capture browser over CDP. The CDP code moved from `capture.mjs` to `cdp.mjs` without behaviour change. Without `--capture-browser` the server refuses with `TARGET_BROWSER_REQUIRED`. |
| S8 leftovers | Studio export menu: built. Studio control for splitting small multiples: built into Give the chart more space. Typed quote speaker fields: not added, since no author control needs them (the quotation family's citation rule stands). Over-budget pages: recorded (answer 7). |

### Result

| Brief item | Result |
|---|---|
| Six-question entry, three different previews, explanation before choosing, expand | Built. All seven style answers give three directions that differ in graphics, type, media and motion with identical facts (tested); the UI trace measured and expanded them at 1440 px and showed them at 1024 and 390 px |
| Six actions with defined behaviour, stated first, undoable | Built; the UI trace applied, undid and redid Reduce text at three widths, and planned and applied the others at 1440 px |
| Four-level overrides; separate locks surviving theme change, source update and history restore; partial redo states its scope | Built and tested; the browser trace restored a copy with chapters, disclosure and separate locks intact |
| Page-count planning from argument units; ask or mark evidence-required | Built; the trace asked instead of padding (target 9, material 5) and marked a page whose export was then refused by name |
| Reusable profile round trip | Built; saved, reloaded, applied to the zh-CN deck, exported and imported as a copy |
| Studio PowerPoint and PDF | Built; 48 of 48 exports pass on the 24 direction decks, and the menu downloaded both formats in the trace |

**Found and fixed while building:**

- `applyChoices` passed the project envelope as the document, so page choices dropped the deck profile (VIS-013).
- The Studio's mount-time API calls ran before the session token, so the capture-capability probe could fail with 401 (VIS-013).
- The export layout did not measure diagram edges without an author id, so PowerPoint had 0 of 2 connectors on the six-family process page and failed its editability check. This also happens on `4f26b33` (VIS-016).
- The first chart-space rule made the chart smaller.
- Directions repeated one composition four times on text-only decks.

An independent code review of the S9a change set then reported 12 defects. All were fixed with regression tests and the browser evidence was re-run ([list](../evidence/s9a-author-controls/review.md#independent-code-review)).

**Returned to later steps:**

- S9b (blueprint A, Explain → Diagram → Explore) and its export-target runs.
- A page-count plan for the Codex draft path.
- Pages over the 900 px budget: 11 of 132 in the S9a direction run.
- PowerPoint and Keynote runs by the user.
- Claude acceptance.

## 18. S9b decisions and result — blueprint A, 2026-10-19

Built on `e80ecd7` (S1–S9a) in the worktree branch `claude/agitated-torvalds-969a1e`. Nothing is pushed. State: **LocalVerified** for the S9b scope (isolated Chromium, viewed images). In the roadmap, VIS-009 stays `implemented-local` (S9b recorded under it) and DWD-210 stays `partial`. [Evidence](../evidence/s9b-blueprint-a/review.md) · [interactions manual](../en/interactions.md#explain--diagram--explore-blueprint-a-s9b) · [Visual Studio manual](../en/visual-studio.md#explain--diagram--explore-pages-s9b).

### The six questions

The user answered the kickoff questions on 2026-10-19 and asked for the last three in Chinese.

| # | Question | Answer |
|---|---|---|
| 1 | Restore rule | **A**: per-page memory while the document is open; a reload opens on Explain |
| 2 | Build on existing or new component | Build on diagram + `steps` + key states + static state |
| 3 | One page or three | One page with the stages as key states |
| 4 | Player change | Bump to `semantic-player.6` with its own baseline re-record (no visible word or value changed); the renderer moved to `visual-art-direction.12` in the same commit |
| 5 | Firefox / WebKit traces | Chromium only, recorded |
| 6 | S9a leftovers | **Handle the Codex draft-path page plan**; qualifier word lists and the 900 px pages stay recorded |

### Decisions made in S9b

| Topic | Decision |
|---|---|
| Contract | One optional field on `steps`: `blueprint {questionBlockId, answerBlockId, wholeExplanationId}`. Content stays in blocks and explanations; the plan stores identities. No `schemaVersion` change. Negative fixture `s9b.negative.json` (14 cases). The explicit migration of an existing page is the Studio action `addBlueprintA`, which keeps an existing node explanation and refuses relationship steps. |
| Stages | Derived from the cue position, so the one clock drives them: 0 Explain, 1 Diagram, 2… Explore each part in reading order. A blueprint page's cues are 1 to parts + 1 `step.next` cues on that interaction; the page has no other interaction. |
| Explain | Draws the question, the answer and the object's name; the diagram is not drawn (the handoff's Explain state). Recorded as the weakest page. |
| Show whole | `step.select` without a part returns to Diagram, never to Explain. Only a blueprint accepts it. |
| Opening | A blueprint page opens on Explain, even with a static state; its static state serves readers without JavaScript, paged exports and the static reduced-motion fallback. This is the one exception to the S2 rule that the player opens on the static state. **Use current chart / step as opening** refuses on a blueprint page. |
| Restore rule | Answer 1: the existing per-scene state is kept on page turns (leaving stops the timer and animations); reload resets. Traced at three widths in both languages. |
| Keyboard | Parts on the diagram are focusable controls (`tabindex`, `role="button"`); arrow keys, Home, End, Enter and Space change the part. `turnsPage` already ignores focused controls, so nothing new was needed to keep the page still. |
| Skip | Jumps to the author's static state, or Diagram when none is declared. |
| Static output | Every blueprint page carries the complete explanation without JavaScript (whole object, numbered parts, every explanation), whether or not a static state is declared. A static state adds its statement and marks an Explore part. |
| Export order | The static-state stage refuses a missing static state (`BLUEPRINT_STATIC_REQUIRED`), Explain, or a measured page missing a part label or an explanation (`BLUEPRINT_STATIC_INCOMPLETE`). The message names the page. HTML export is not refused. |
| Review gate | The measurement covers the opening, the static state and every blueprint key state. |
| PowerPoint | Part numbers are measured with their part and compiled as native circles (found dropped silently during S9b). |
| Codex page plan | `draftWithHost` takes `pagePlan {detail, targetPages}`; the prompt carries `pageBrief()` and forbids padding; `draftPagePlan` plans the drafted deck and lists pages holding none of the supplied lines as host-added (status `needs-review`). The workbench plans every generated deck after saving it. Fake-host tests, plus one live Codex CLI run at the user's request: 3 supplied pages, target 6, Codex returned 4 pages without padding and the local plan asked for the missing material ([evidence](../evidence/s9b-blueprint-a/codex-page-plan/page-plan.json)). |
| Object | DeckWeft's own export pipeline (measure → repair → review → export) as the code-drawn process diagram with stable part ids (answer 4 of §17). |

### Result

| Brief item | Result |
|---|---|
| Key states Explain, Diagram, Explore, Static | Built on one page. The player trace reached every stage by Next, Previous and part selection |
| Restore rule | Rule A traced at 1440, 1024 and 390 px in English and Chinese: same stage and part after Next/Previous page and arrow-key pages; reload opens on Explain |
| Keyboard isolation | 16 key presses on parts, part buttons, stage buttons, Skip, Replay and the slider never turned the page; ArrowRight with nothing focused did |
| Reduced motion | Every stage reached with 0 running animations; `static` opens on the static state and still reaches Explain and Explore |
| Export never leaves disassembled parts | Static page complete in every case; the export order refuses a missing or Explain static state, by name; Studio PowerPoint and PDF exported with Diagram, all 5 explanations on slide 2 |
| Studio create and static state | Built through `changed()`: Undo/Redo, Save, scene and diagram locks honoured; traced at three widths |
| Codex draft page plan | One live Codex CLI run: 4 pages for a target of 6, no padding, no host-added page; the local plan asked for background, limits and 2 more pages |
| Six themes, two languages | 12 decks, facts identical per language, 0 fit, contrast or glyph issues at three widths; contact sheets viewed |
| `export:targets -- --s9` | PowerPoint editability and page check pass on 12 of 12; Chinese PDF search partial (known S7) |

**Returned to later steps:**

- The Explain stage composition (mostly empty page).
- Pages over the 900 px budget: four pages in the S9b run (answer 7: recorded).
- Scroll advancement (M09) and part groups (M10).
- PowerPoint and Keynote runs by the user.
- Claude acceptance.
