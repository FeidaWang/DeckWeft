# Cinematic composition build map (CINE-001 … CINE-012) and batch 1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the cinematic composition roadmap into DeckWeft code in four priority batches, starting with the P0 batch (target-aware canvas, compact references, visual intent, primary media area) on a frozen corpus, without rebuilding the existing composition, crop, rhythm, source-note, author-control or export systems.

**Architecture:** Every new fact is one optional, versioned scene field (`references`, `intent`, `media`) validated in `src/design/plan.mjs`; absent fields keep today's behaviour byte-for-byte except the renderer version. Derived values (target fit, reference markers, effective intent, media roles) are computed in small pure modules and consumed by the web renderer, the paged exporters, the rhythm gate and the S9a author actions. Measurement stays where it is (browser runtime, `measureExportLayout`); nothing here guesses a layout.

**Tech Stack:** Node 22 ESM, no runtime dependencies, `node --test`, isolated Chromium via Playwright for browser runners (`CHROMIUM_PATH`, `PLAYWRIGHT_MODULE`), existing `scripts/export-targets.mjs` for PowerPoint and PDF evidence.

**Spec:** [DeckWeft-Cinematic-Design-Roadmap-2026-10-19.md](../../DeckWeft-Cinematic-Design-Roadmap-2026-10-19.md) (repository copy of the research document; its code links point at `9771bf4`, see §0 for what moved since).

**Branch:** work on `claude/deckweft-design-roadmap-2d3d10` in this checkout. Commit per task. Do not push, merge, publish or send anything external.

## Global constraints

Copied from the spec and AGENTS.md; every task's requirements include them.

- English is primary in code and documentation; keep the separate Simplified Chinese pages (`docs/zh-CN/*`) accurate for every English page you change.
- No new dependency. Local, loopback-only, offline. No telemetry.
- Version schema changes explicitly and migrate legacy input without silent repair; `schemas/project.schema.json` is the contract. New scene fields are optional; a legacy project must validate and render unchanged.
- Keep source facts, datasets, source anchors, author locks and original assets intact. No action writes, deletes or rewrites text, data or sources.
- Fixed 16:9 target layout (1440 × 810) and final-output font/object measurements. Do not solve excessive height by silently shrinking the whole scene.
- References keep exact source content, correct claim associations, accessible lookup and an audience-visible static appendix. Material qualifiers stay near claims; quote attribution stays beside the quotation.
- Automated ratios are diagnostic signals, not aesthetic truth; a bounding-box proxy is never called eye tracking.
- Any change to the HTML stylesheet bumps `WEB_RENDERER_VERSION` (`src/scene/web/compile.mjs`); any change to player bytes bumps `PLAYER_VERSION` (`src/render/web/runtime.mjs`) and re-records `tests/fixtures/visual/render-baseline.json` in its own commit (`node tests/render-baseline.mjs --write`).
- `tests/studio-export.test.mjs` runs alone (it asserts no leftover `dw-studio-export-*` temp dirs).
- Record which native applications were available. Do not claim PowerPoint or Keynote acceptance from XML checks alone. Update roadmap status only with evidence.
- Use an isolated automation browser outside `/Applications` with temporary profiles.

## Review focus

Inputs the spec implies but no roadmap acceptance line names. Each is pinned to a test in the owning task.

1. **A compact-mode page whose only citation attributes a quotation.** The attribution must stay a region beside the quote, never move to the strip (Task 6).
2. **A source cited on two pages, then the pages are reordered.** Display numbers follow deck order; source ids, citation text and claim bindings do not change (Task 5).
3. **A tall scene whose single element is taller than one band.** PDF and PowerPoint take the element whole, report `width-bound` or an over-height band, and never cut through a chart or image (Task 2).
4. **A legacy project with none of the new fields.** Markup without the stylesheet, render hash inputs other than the renderer version, scene source hash inputs other than the renderer version, and every exported word stay identical (Task 7, Task 12).
5. **An image with no subject annotation.** The subject fraction equals the container fraction and the report says "no subject annotation" instead of inventing one (Task 11).

---

## 0. Baseline reconciliation (HEAD `be9921d`, 46 commits after the research baseline `9771bf4`)

What the spec's §1 describes has partly moved. Build on the current code, not on the spec's links.

| Spec claim | Current state | Consequence for this plan |
|---|---|---|
| §1.1 PPTX fits the whole scene with one uniform scale | Still true for the scale (`sceneFrame`), but Astra F1 added `src/targets/pptx/paginate.mjs`: a scene whose text would fall under `TYPOGRAPHY_MINIMUM_PT` (`title:18, body:10, annotation:6`, `src/targets/capabilities.mjs`) is cut into bands at lines no element crosses; the heading repeats on continuation slides. `runExport` refuses a failed typography result unless `acceptTypography` names an author. | CINE-001 extends this: the PDF path gets the same bands, the budget becomes a declared target contract, and the web candidate gate reads from it. Do not write a second pager. |
| §1.1 PDF computes min(width-fit, height-fit) | True (`src/targets/pdf/print.mjs` `pdfPrintJob`), no bands. | Task 2. |
| §1.2 citations are full-width rows with rule, 20 px margin, 16 px padding | True (`src/render/web/art-direction.mjs`, `.web-scene .region[data-component=citation]`). | CINE-002. |
| §1.3 sparse = ≤6 blocks and no chart/table/diagram/code; images excluded | True (`sceneDirection`, `data-space=open` → `align-content:center; min-height:500px`). | CINE-003. |
| §1.4 image-right capped at 440 px, image-left 570 px, system map 560/640 px | True. | CINE-004. |
| §1.5 runtime measures focus zone, density, image ratio | True; `components[].minTextPixels` already measures the smallest drawn SVG label in CSS px. | CINE-004 uses it; no player change in batch 1. |
| Studio files `public/studio/visual.js` | Removed by the single-entry steps; author controls live in `public/studio/author.js`. | CINE-011 targets `author.js`. |
| Renderer `visual-art-direction.12`, player `semantic-player.6` | Current. | Batch 1 ends at renderer `.13`; the player is untouched. |
| Existing fixtures with a citation as focal block | None (checked all `tests/fixtures/visual/*.json`). | The "citation cannot be focal" rule can apply whenever `intent` is declared. |

Pixel-to-point arithmetic used throughout: a 1440 px scene fitted to the 13.333 in slide is 960 pt wide, so **1 px = 2/3 pt in PowerPoint**; the PDF page is 1440 × 810 CSS px, so **1 px = 3/4 pt in PDF**. Today's body text (19–22 px) delivers 12.7–14.7 pt in PowerPoint. The spec's §4 typography values (body ≈ 18 pt, labels 14–16 pt, references 10–12 pt) are therefore **targets to report**, not minima to enforce, until CINE-006 recalibrates type roles. Raising the hard minima now would page most existing decks.

## 1. Priority map

Batches are the delivery order. A package is "done" when its acceptance lines in the spec are shown by tests and inspected evidence, not when its code exists.

| Batch | Package | Outcome (one line) | Depends on | Files it owns | Evidence folder |
|---|---|---|---|---|---|
| 1 (P0) | CINE-001 | A declared presentation target (frame, safe area, grid, typography minima and targets) measured in web, PDF and PowerPoint; PDF pages tall scenes like PowerPoint; overflow resolved by disclosure or a stated split, never by shrinking | — | `src/targets/target-budget.mjs` (new), `paginate.mjs`, `pdf/print.mjs`, `export-order.mjs`, `design/rhythm.mjs`, `workbench/author-actions.mjs` | `docs/evidence/cine-p0/` |
| 1 (P0) | CINE-002 | Compact source strip + reference panel + export appendix with stable markers; canonical sources untouched | 001 for budgets | `src/references/presentation.mjs` (new), schema, `plan.mjs`, `blocks.mjs`, `document.mjs`, `art-direction.mjs`, `render-checks.mjs`, `static-delivery.mjs`, `pptx/compile.mjs`, `pdf/print.mjs` | same |
| 1 (P0) | CINE-003 | Page purpose + entry + focus group; images count as subjects; sparse no longer centres; intent steers variant preference and author action | 001 | `src/design/intent.mjs` (new), schema, `plan.mjs`, `design/art-direction.mjs`, `scene/web/compile.mjs`, `document.mjs`, `art-direction.mjs` (CSS), `author-actions.mjs` | same |
| 1 (P0) | CINE-004 | Media roles; 5/7 product and 7/5 detail grids; diagram caps raised; label size reported against target; "Give the visual more space" action | 001, 003 | `src/design/media.mjs` (new), schema, `compositions.mjs` (CSS), `art-direction.mjs` (CSS), `author-actions.mjs`, `public/studio/author.js` | same |
| 2 (P1) | CINE-005 | Authored `subjectBounds`, protected and context regions, visible caption separate from alt; crops respect them | 004 | `src/assets/brief.mjs`, `crop.mjs`, `slots.mjs`, `schemas/asset-brief.schema.json`, `blocks.mjs`, `targets/*` media | `docs/evidence/cine-p1/` |
| 2 (P1) | CINE-006 | Type roles (title, lead, body, label, reference, numeric), grayscale hierarchy, fewer borders; delivered sizes meet the target policy | 001–004 | `theme-registry.mjs`, `design/art-direction.mjs`, `render/web/themes.mjs`, `contrast.mjs`, `themes/*/theme.json` | same |
| 2 (P1) | CINE-007 | Hard gates + documented soft features (subject area, strip height, entry clarity, competing accents); ranked candidates with stated differences; weakest-page report | 001 baseline; 003–006 for ranking | `runtime.mjs` (player bump), `render-checks.mjs`, `visual-review.mjs`, `repair-plan.mjs`, `rhythm.mjs`, `scripts/release-gate.mjs` | same |
| 3 (P2) | CINE-008 | Shot-scale sequence (context → product → detail → mechanism → evidence → action) with stable object identity and chapter pauses; no padding | 003–007 | `planning/storyboard.mjs`, `argument-units.mjs`, `rhythm.mjs`, `chapters.mjs`, `agent/director.mjs` | `docs/evidence/cine-p2/` |
| 3 (P2) | CINE-009 | Overview-to-detail, active path and returning object on the existing cue clock; stronger Explain state | 008, DW-120, S9b | `motion/blueprint.mjs`, `cues.mjs`, `primitives.mjs`, `timeline.mjs`, `static-state.mjs` | same |
| 3 (P2) | CINE-010 | Film-informed profile directions inside the six existing themes; no new skins | 006–009 | `design-profile.mjs`, `theme-registry.mjs`, `themes/*/theme.json`, `docs/design/*` register | same |
| 4 (P3) | CINE-011 | Plain-language controls ("Larger visual", "Quieter references", "More space between groups", "Show the detail") with preview and undo; opt-in preference learning | basics ship in batch 1; refinement after 007–010 | `public/studio/author.js`, `author-actions.mjs`, `design-profile.mjs`, `workbench/preferences.mjs` | `docs/evidence/cine-p3/` |
| 4 (P3) | CINE-012 | Optional atmosphere within EXP-001 limits; disabling it keeps the full argument | all P0/P1 accepted; P2 stable | EXP-001 scope only | same |

Roadmap nesting (spec §10): CINE-001 under VIS-016 remaining, CINE-002 under VIS-013 and VIS-016, CINE-003 under VIS-006/VIS-013, CINE-004 under VIS-006/VIS-007/VIS-008. Add `notes` to those `roadmap.json` tasks; add no new task ids and change no `state` without evidence.

## 2. Contract decisions (batch 1)

These are the names every task uses. They are optional additions to `schemas/design-plan.schema.json` (scene level) unless stated.

```ts
// scene.references — CINE-002. Absent = "expanded" (today's rendering).
{ mode: "expanded" | "compact" | "source-is-subject" }

// scene.intent — CINE-003. Absent = inferIntent(). primary object = existing scene.focalBlockId (no new field).
{ purpose: "explain"|"show-product"|"show-detail"|"compare"|"evidence"|"overview"|"chapter",
  entry: "left"|"center"|"contextual",
  focusGroupBlockIds?: string[],           // ⊂ blockIds, must contain focalBlockId, max 6
  emptyRegions?: {x,y,width,height}[] }    // normalized to the 1440×810 frame, max 4, reported only in batch 1

// scene.media — CINE-004. Absent = mediaRoles() defaults.
[{ blockId: string, role: "hero"|"mechanism"|"context"|"supporting" }]   // blockId is an image or diagram of this scene, max 20, unique

// authorOverrides.sceneLocks[].fields gains "references", "intent", "media" (schemas/presentation-v3.schema.json, the enum after "profile").
```

Derived, never stored:

- `TARGETS.presentation` in `src/targets/target-budget.mjs`: `frame {width:1440,height:810}`, `safeArea {x:64,y:56}`, `grid {columns:12,gutter:32}`, `candidateHeight:900` (the existing web pre-gate, kept), `typography.minimum = TYPOGRAPHY_MINIMUM_PT` (hard, unchanged), `typography.target = {title:24, body:18, label:14, reference:10}` pt (reported, not enforced), `overflow:'reflow-then-split'`. `TARGETS.reading`: `frame {width:1440,height:null}`, `overflow:'flow'`. `PT_PER_PX = {pptx: 960/1440, pdf: 0.75}`.
- Reference markers: display number = order of first appearance of a `sourceId` walking `plan.scenes` in order and each scene's `blockIds` in author order over `block.sourceIds`, `block.sourceId` and the dataset's `sourceIds`. Recomputed on every render; the stable key is `sourceId`.
- Text roles for the typography target: `title` (the scene heading), `body` (paragraph, list, callout, quote, metric label), `label` (chart and diagram SVG text, `kind` `diagram-text`/`diagram-number`/plot text in `sceneElements`), `reference` (citation, image caption, chrome). Hard minima keep F1's three roles (`textRoleOf`); `label` and `reference` map to `annotation` for the minimum.
- Web-scene regions (`schemas/web-scene.schema.json`, `additionalProperties:false`) gain optional `reference: "compact"|"expanded"|"subject"` and `mediaRole`.

Renderer version after batch 1: `visual-art-direction.13`. Player: unchanged (`semantic-player.6`). If `node tests/render-baseline.mjs` reports the stylesheet part changed, re-record in its own commit and say so in `docs/en/verification.md`.

## 3. Batch 1 corpus (shared by every task)

`tests/cine-corpus.mjs` exports `cineProject(locale, home)` and `CINE_SCENES`; fixtures `tests/fixtures/visual/cine.en.json` and `cine.zh-CN.json` (same ids, same sources, same datasets, translated text), built like `tests/families.mjs`. Assets under `tests/fixtures/visual/assets/`: `cine-context.png` 1600 × 900 (a landscape with low detail), `cine-product.png` 800 × 600 (a product drawn inside the central 40 % × 40 %, white elsewhere), `cine-tall.png` 480 × 960 (a tall product). Generate them with a script kept in the scratchpad, not in the repository; each ≤ 30 KB.

| Scene id | Blocks | Composition / theme | Declared fields | What it proves |
|---|---|---|---|---|
| `context` | heading, image(context), paragraph (≤ 2 sentences), 1 citation | `image-left`, cream-collage | `intent {explain,left}`, `media [{context}]`, `references compact` | left entry, 1-source strip |
| `product` | heading, image(product), callout, 2 citations | `image-right` | `intent {show-product,left}`, `media [{hero}]`, `references compact` | 5/7 hero; container vs subject |
| `product-center` | same blocks, same asset | `image-strip`, composition lock | `intent {show-product,center}` | intentional centre survives |
| `detail` | heading, image(tall, hero), image(product, supporting), paragraph | `image-left` | `intent {show-detail,left}`, `media [hero, supporting]` | 7/5 detail + locator |
| `mechanism` | heading, diagram (7 nodes, 9 edges, two boundary nodes), paragraph, list (3) | `system-map-wide` | `intent {explain,left}`, `media [{mechanism}]` | wide diagram, label size |
| `evidence` | heading, 2 charts (fixed shared axis), paragraph, callout "Illustrative, not measured" (`synthetic:true` dataset, `contentStatus:'illustrative'`), 12 citations to 12 sources with titles ≥ 120 chars and URLs ≥ 150 chars | `small-multiples-row` | `intent {evidence,left}`, `references compact` | 12-source strip, qualifier near chart |
| `quote` | heading, quote, citation (attribution), paragraph | `quote-split` | `references compact` | attribution stays beside the quote |
| `overflow` | heading, 3 paragraphs (≥ 80 words each), 2 lists (8 items), 4 citations | `statement-banner` | `references compact` | exceeds 810 px; fit-page and paging |
| `long-heading` | heading (en 160 chars, zh-CN 70 chars), paragraph, 1 citation | `statement-split` | `intent {explain,left}` | long headline, 1-source |
| `action` | heading, list (3), callout | `closing-split` | `intent {chapter,contextual}` | whitespace is intentional |

The deck has one lock: `product-center` composition. Themes: cream-collage for pages 1–5 and 9–10, dark-data for `evidence`, electric-violet for `quote` and `overflow` (so every lock, theme and family rule in the existing checker runs on the corpus).

---

## 4. Batch 1 tasks

Each task: write the failing test in `tests/cine-p0.test.mjs` (one file for the batch), run it, implement, run it, run `npm test` for the touched area, commit. Browser evidence is Task 12.

### Task 1: Target budget contract and typography report

**Files:**
- Create: `src/targets/target-budget.mjs`
- Modify: `src/targets/capabilities.mjs` (export `TYPOGRAPHY_TARGET_PT`), `src/targets/pptx/paginate.mjs` (`sceneBands` frame parameter)
- Test: `tests/cine-p0.test.mjs`

**Interfaces:**
- Produces: `TARGETS`, `PT_PER_PX`, `typographyRole(blockType, kind, {title})`, `typographyReport(elements, blocks, {titleBlockId, ptPerPx, scale, target})` → `{minimum:{status:'pass'|'fail', failures:[{blockId,role,pt,minimum}]}, target:{status:'met'|'below', below:[{blockId,role,pt,target}]}}`, `targetFit(measuredScene, blocks, {format:'pptx'|'pdf', titleBlockId, strip})` → `{status:'fits'|'paged'|'width-bound'|'trimmed', bands, scale, typography}`.
- `sceneBands(m, blocks, {titleBlockId, strip, minimums, frame=SLIDE, unitsPerPt=EMU_PER_PT})`: unchanged defaults, PDF passes `{frame:{width:1440,height:810}, unitsPerPt:4/3}`.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-001 target budget: one declared presentation target with hard minima and reported targets',()=>{
 assert.deepEqual(TARGETS.presentation.frame,{width:1440,height:810});
 assert.deepEqual(TARGETS.presentation.typography.minimum,TYPOGRAPHY_MINIMUM_PT);
 assert.deepEqual(TARGETS.presentation.typography.target,{title:24,body:18,label:14,reference:10});
 assert.equal(TARGETS.presentation.candidateHeight,900);
 assert.ok(Math.abs(PT_PER_PX.pptx-2/3)<1e-9);assert.equal(PT_PER_PX.pdf,.75);
});
test('CINE-001 typography report: 20 px body at full width is 13.3 pt in PowerPoint (above the 10 pt minimum, below the 18 pt target)',()=>{
 const r=typographyReport([{box:{x:0,y:0,width:100,height:20},fontSize:20,blockId:'p1',kind:'text'}],new Map([['p1',{type:'paragraph'}]]),{titleBlockId:null,ptPerPx:PT_PER_PX.pptx,scale:1});
 assert.equal(r.minimum.status,'pass');assert.equal(r.target.status,'below');assert.equal(r.target.below[0].role,'body');assert.ok(Math.abs(r.target.below[0].pt-13.33)<.01);
});
test('CINE-001 targetFit on the synthetic overflow page: PowerPoint pages it, PDF pages it at the same cuts, a short page fits',async()=>{
 // cineProject + syntheticLayout (tests/export-layout.mjs); scene 'overflow' → status 'paged', bands.length>=2; scene 'action' → 'fits'.
 // The PDF bands (frame 1440×810, unitsPerPt 4/3) start at the same y values as the PowerPoint bands.
});
```

- [ ] **Step 2: Run** `node --test tests/cine-p0.test.mjs` **→ FAIL** (module not found)
- [ ] **Step 3: Implement** `target-budget.mjs`; add the `frame`/`unitsPerPt` parameters to `sceneBands` (replace the two `SLIDE.*` reads and `EMU_PER_PT` inside it); export `TYPOGRAPHY_TARGET_PT` next to `TYPOGRAPHY_MINIMUM_PT`. `typographyReport` computes `pt = fontSize * ptPerPx * scale` per element and compares against role minima and targets; `targetFit` calls `sceneBands` and reports the typography at the whole-scene scale (`fits`) or at each band's scale (`paged`).
- [ ] **Step 4: Run the test → PASS**; run `node --test tests/export-targets.test.mjs` → unchanged results.
- [ ] **Step 5: Commit** `CINE-001 (1/4): target budget contract and typography report`

### Task 2: PDF pages tall scenes with the PowerPoint bands

**Files:**
- Modify: `src/targets/pdf/print.mjs` (`pdfPrintJob`, `checkPrintJob`, `PRINT_CSS`), `src/targets/export-order.mjs` (pass `paginate` and blocks to the PDF job)
- Test: `tests/cine-p0.test.mjs`, `tests/export-targets.test.mjs` (existing PDF tests must still pass)

**Interfaces:**
- Consumes: `targetFit` (Task 1).
- Produces: `pdfPrintJob({document,plan,html,layout,delivery,paginate='auto'})` → `pages[]` items gain `part`, `parts`, `clip:{y,height}`, `reason`; `job.pagination=[{sceneId,parts,reason}]` like the PPTX report.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-001 PDF: the overflow page becomes two print pages at a scale that keeps 10 pt body text; the heading repeats; the strip stays on the last band',()=>{
 // paged(cine,'pdf') → job.pages.filter(p=>p.sceneId==='overflow').length===job.pagination[0].parts>=2; every page scale*PT_PER_PX.pdf*20>=10
 // checkPrintJob passes; the second page's clip.y equals the first page's clip.y+clip.height.
});
test('CINE-001 PDF: a page whose only element is taller than one band is taken whole and reported, not cut',()=>{ /* one chart 900 px tall → reason 'width-bound' or a single over-height band; no page clip starts inside the chart box */ });
test('CINE-001 PDF: paginate:"none" keeps one page per scene (today's behaviour) and the check names the whole-scene scale',()=>{});
```

- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement.** Each band is one `.dw-page`; the `.dw-fit` child gets `transform:translate(ox, oy - band.y*scale) scale(scale)` and the page clips with `overflow:hidden` (already in `PRINT_CSS`). A continuation page repeats the heading region's markup inside a `.dw-strip` box of height `strip` at the top (same markup string as the PPTX `bandLayout` heading repeat). `checkPrintJob` asserts `pages.length >= scenes.length`, every scene has a first part, parts are consecutive, and each page scale is `>0 && <=1.05`.
- [ ] **Step 4: Run → PASS**; `node --test tests/export-targets.test.mjs tests/export-targets-cli.test.mjs` → PASS.
- [ ] **Step 5: Commit** `CINE-001 (2/4): PDF pages tall scenes on the PowerPoint bands`

### Task 3: Web candidate gate reads the target; `fit-page` author action

**Files:**
- Modify: `src/design/rhythm.mjs` (`candidateFit`, `CANDIDATE_HEIGHT` re-exported from `TARGETS`), `src/workbench/author-actions.mjs` (`AUTHOR_ACTIONS['fit-page']`, `splitScene`)
- Create: `src/design/split.mjs` (`splitScene`)
- Test: `tests/cine-p0.test.mjs`; `tests/composition-families.test.mjs` and `tests/s9a-author-controls.test.mjs` unchanged

**Interfaces:**
- Produces: `splitScene(project, sceneId, {afterBlockId})` → project with a continuation scene `${sceneId}-2` (same theme, themeVersion, composition, profile; `blockIds` = [heading, ...blocks after `afterBlockId`]; `focalBlockId` = heading; citations whose source is cited by a moved block are shared into the new scene; refuses with `AUTHOR_LOCK` when `blockIds` is locked, with `SCENE_SPLIT` when the cut would leave either side without a non-heading block or when `afterBlockId` is the focal block's takeaway).
- `AUTHOR_ACTIONS['fit-page'] = {levels:['page'], changes:['page disclosure','page split']}`; options `{regionBounds?: [{blockId, y, height}]}` from `inspectRenderedPage().scenes[].regions`.
- `candidateFit(check, viewport, {target=TARGETS.presentation})`: the height reason reads `target.candidateHeight`; `features` gains `labelMinPx` (smallest `components[].minTextPixels`) and `labelTargetPx = target.typography.target.label / PT_PER_PX.pptx` (21 px).

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-001 fit-page: with measured bounds the overflow page is split after the last block ending above 754 px (810 − 56); facts, sources and locks unchanged; heading shared',()=>{});
test('CINE-001 fit-page: without bounds it moves movable supporting text behind the disclosure (reuses the S9a rule) and says that a split needs a measurement',()=>{});
test('CINE-001 fit-page refuses a blockIds-locked page by name and a split that would strip one side to a heading',()=>{});
test('CINE-001 candidateFit reports labelMinPx and the 21 px label target without changing today\'s ok/reasons',()=>{});
```

- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Implement.** `splitScene` is in its own module so `rhythm.mjs` (which already exports `splitSmallMultiples`) and the actions can both use it. The action's effect text (en/zh) names the page count and the cut block excerpt (`excerpt()` helper exists).
- [ ] **Step 4: Run → PASS**; `node --test tests/composition-families.test.mjs tests/s9a-author-controls.test.mjs` → PASS.
- [ ] **Step 5: Commit** `CINE-001 (3/4): candidate gate reads the target; fit-page action with a stated split`

### Task 4: Reference presentation module and schema

**Files:**
- Create: `src/references/presentation.mjs`
- Modify: `schemas/design-plan.schema.json` (scene `references`), `schemas/presentation-v3.schema.json` (lock fields enum), `src/design/plan.mjs` (call `assertReferences`), `tests/fixtures/visual/s9a.negative.json` → add cases to a new `tests/fixtures/visual/cine.negative.json`
- Test: `tests/cine-p0.test.mjs`

**Interfaces:**
- Produces: `REFERENCE_MODES`, `referenceIndex(document, plan)` → `Map<sourceId, number>`, `sceneReferences(document, plan, scene)` → `{mode, strip:[{marker, blockId, sourceId, text, title, url}], regions:[blockId…] (citations that stay in the composition), claims:[{blockId, markers:[number]}]}`, `assertReferences(document, scene)`.
- Rules: `compact` moves every citation region to the strip **except** a citation that attributes a quotation (`quoteAttributions` from `compositions.mjs`); `source-is-subject` keeps all citations as regions and flags them `subject`; `expanded` is today. `claims` lists heading, paragraph, callout, metric, chart (via dataset), image and table blocks whose sources are non-empty.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-002 markers: 1, 4 and 12 sources number by first appearance in deck order; the map is keyed by stable source id',()=>{});
test('CINE-002 sceneReferences: compact keeps the quote attribution as a region and sends the other citations to the strip; expanded keeps all; source-is-subject flags subject',()=>{});
test('CINE-002 contract: references.mode outside the enum, or a quote page whose attribution would leave the page, is refused with INVALID_DESIGN_PLAN; legacy fixtures validate unchanged',()=>{});
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**, plus `node --test tests/s9a-author-controls.test.mjs tests/handoff-contracts.test.mjs`
- [ ] **Step 5: Commit** `CINE-002 (1/3): reference presentation contract and markers`

### Task 5: Compact source strip, reference panel and claim markers in the web renderer

**Files:**
- Modify: `src/scene/web/compile.mjs` (region `reference` field; `WEB_RENDERER_VERSION='visual-art-direction.13'`), `schemas/web-scene.schema.json`, `src/render/web/document.mjs`, `src/render/web/components/blocks.mjs`, `src/render/web/art-direction.mjs` (CSS), `src/quality/render-checks.mjs`
- Test: `tests/cine-p0.test.mjs`, `tests/visual-web.test.mjs`, `tests/render.test.mjs`

**Interfaces:**
- Markup (compact): after `<div class="regions">…</div>`, `<footer class="source-strip" aria-label="Sources|来源">` holding one `<div class="region" data-block-id data-component="citation" data-text-role="caption" data-reference="compact">` per strip item with `<p class="citation"><a href="{url}" rel="noreferrer">[{n}] {text}</a></p>`, then `<details class="reference-panel"><summary>Sources · n|来源 · n</summary><ol>` with `<li id="{sceneId}-ref-{n}">[n] {text} · {title} — <a href>{url}</a> · <a href="#{claimRegionId}">↩</a>…</li>`. The panel carries no `data-block-id`.
- Claims in compact mode get ` <sup class="source-marker">[n]</sup>` appended inside their `<p>`/`<h2>`/`<figcaption>`; charts put the markers in the existing chart notes line.
- CSS: `.web-scene .source-strip{margin-top:auto;display:flex;flex-wrap:wrap;gap:6px 24px;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 35%,transparent);max-height:48px}` (48 px ≈ 6 % of 810), `.web-scene .source-strip .region{margin:0;padding:0;border:0;grid-column:auto}`, `.web-scene .source-strip .citation{font-size:12px;line-height:1.4;max-width:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:32ch}`, `.reference-panel{font:400 12px/1.5 var(--body)} .reference-panel summary{cursor:pointer}`, `.source-marker{font-size:.6em;vertical-align:super;color:var(--reference,inherit)}`. The strip never reflows the main grid: at 390 px it wraps below in DOM order.
- `render-checks.mjs`: a citation region in the strip satisfies coverage like any region (it is a `.region` with the block id); the reference panel URL satisfies `sourceLinks`.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-002 web: the evidence page shows 12 markers in a strip under 48 px of CSS height budget, every exact citation text, a panel with 12 full titles and URLs, and no citation region inside .regions',()=>{});
test('CINE-002 web: long URLs do not appear in the strip; the strip region count equals the citations not attributing a quote',()=>{});
test('CINE-002 web: claim markers match sceneReferences.claims; the quote page keeps its attribution beside the quote (data-reference absent)',()=>{});
test('CINE-002 web: checkRender passes text and source coverage on the compact corpus from a synthetic observation',()=>{});
test('CINE-002 web: a legacy deck renders the same markup except the renderer version (tests/render-baseline.mjs parts: markup unchanged)',()=>{});
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/visual-web.test.mjs tests/render.test.mjs tests/visual-quality.test.mjs` → PASS; `node tests/render-baseline.mjs` → note whether the style part changed.
- [ ] **Step 5: Commit** `CINE-002 (2/3): compact source strip, reference panel and claim markers; renderer .13`
- [ ] **Step 6 (own commit, only if Step 4 reported style drift):** `node tests/render-baseline.mjs --write --source-commit <sha> --note "CINE-002 strip/panel CSS"` → commit `Re-record render baseline for renderer .13`.

### Task 6: References in PowerPoint notes and the PDF appendix; reorder stability

**Files:**
- Modify: `src/targets/static-delivery.mjs` (`revealRequired` sources gain `marker` and `citations:[text]`), `src/targets/pptx/compile.mjs` (notes line `· [n] text — title — url`), `src/targets/pdf/print.mjs` (appendix `Sources` list with markers), `src/targets/pptx/audit.mjs` only if `expectedBlockText` needs the strip text form
- Test: `tests/cine-p0.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-002 exports: PowerPoint notes and the PDF appendix of the evidence page list all 12 markers with exact text, title and URL; the PDF page text contains every citation text',()=>{});
test('CINE-002 reorder: after moveScene(evidence ↑) markers renumber by deck order, source ids and claim bindings are unchanged, and a reload of the saved project reproduces the same strip',()=>{});
test('CINE-002 review focus: a compact page whose only citation attributes a quotation exports the attribution with the quote, not in the strip',()=>{});
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/export-targets.test.mjs` → PASS.
- [ ] **Step 5: Commit** `CINE-002 (3/3): markers in PowerPoint notes and the PDF appendix; reorder stability`

### Task 7: Visual intent contract and inference

**Files:**
- Create: `src/design/intent.mjs`
- Modify: `schemas/design-plan.schema.json` (scene `intent`), `src/design/plan.mjs` (`assertIntent`), `tests/fixtures/visual/cine.negative.json`
- Test: `tests/cine-p0.test.mjs`

**Interfaces:**
- Produces: `VISUAL_PURPOSES`, `ENTRIES`, `CENTERED_COMPOSITIONS = ['statement-center','quote-center','closing-focus','small-multiples-center','stage-chapter','violet-chapter','diagonal-cover']`, `CONTEXTUAL_COMPOSITIONS = ['chapter-low','chapter-index','chapter-margin','metric-band','stage-hero','process-stair','comparison-stack','atlas-cover','fieldnotes-cover']`, `inferIntent(document, scene, index, total)` → `{purpose, entry, inferred:true}`, `effectiveIntent(document, plan, index)` (authored wins), `assertIntent(document, scene)`, `preferredVariant(intent, family)` (table below).
- Inference: chapter family, closing family, first page, last page → `chapter`; table or before-after → `compare`; chart → `evidence`; system-map → `overview`; diagram or process → `explain`; image with ≤ 1 text block besides the heading → `show-product`; image otherwise → `explain`; metric → `evidence`; else `explain`. Entry: composition in `CENTERED_COMPOSITIONS` → `center`; in `CONTEXTUAL_COMPOSITIONS` → `contextual`; else `left`.
- `preferredVariant`: explain → process-rail, system-map-rail, evidence-left, statement-split, image-left; show-product → image-right, metric-right, statement-split; show-detail → image-left, before-after-split; compare → comparison-matrix, before-after-split, small-multiples-row; evidence → evidence-left, small-multiples-row, metric-left; overview → system-map-wide, process-line; chapter → chapter-low, statement-center, closing-focus, quote-center (keyed by family; unlisted families return null).
- `assertIntent`: `focusGroupBlockIds ⊂ blockIds` and contains `focalBlockId`; a `citation` block cannot be the focal block when `intent` is declared; `emptyRegions` are normalized rects inside the unit square.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-003 inference: every corpus page without an authored intent infers the purpose and entry in this table; every existing fixture infers without throwing',()=>{});
test('CINE-003 contract: focus group must contain the focal block; a citation focal block with a declared intent is refused; legacy fixtures validate',()=>{});
test('CINE-003 preferredVariant returns the mapped variant per purpose and family and null for unlisted families',()=>{});
```

- [ ] **Step 2–5:** FAIL → implement → PASS (`node --test tests/cine-p0.test.mjs tests/handoff-contracts.test.mjs tests/compositions.test.mjs`) → commit `CINE-003 (1/3): visual intent contract and inference`

### Task 8: Intent in art direction, markup and rhythm preference

**Files:**
- Modify: `src/design/art-direction.mjs` (`sceneDirection` returns `intent`; `sparse` requires `intent.entry==='center'` and no image; `narrativeCost` uses `preferredVariant` when `scene.intent` is authored), `src/render/web/document.mjs` (`data-purpose`, `data-entry` on the section), `src/render/web/art-direction.mjs` (CSS `.web-scene[data-entry=left] .regions{align-content:start}` placed after every composition rule; `[data-space=open]` unchanged), `src/design/rhythm.mjs` (`chooseRhythm` already sums `narrativeCost`; no change expected, verify)
- Test: `tests/cine-p0.test.mjs`, `tests/art-direction.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-003 direction: a six-block text page with a left entry is data-space=structured; the same page with entry center is open; an image page is never open',()=>{});
test('CINE-003 markup: sections carry data-purpose and data-entry; the corpus has at least one left, one center and one contextual page',()=>{});
test('CINE-003 rhythm: with intent show-product the image family prefers image-right (cost 0) and image-left costs 3; without intent the S6 phase table is unchanged for every existing fixture',()=>{});
```

- [ ] **Step 2–5:** FAIL → implement → PASS (`node --test tests/art-direction.test.mjs tests/composition-families.test.mjs`) → commit `CINE-003 (2/3): intent steers spacing, entry and variant preference`

### Task 9: `set-intent` author action and Studio control

**Files:**
- Modify: `src/workbench/author-actions.mjs` (`AUTHOR_ACTIONS['set-intent']={levels:['page'],changes:['intent','composition']}`, options `{purpose, entry}`; writes `scene.intent`, then `setComposition` to `preferredVariant` when it fits and composition is unlocked; respects the new `intent` lock), `public/studio/author.js` (a "Page purpose" select + "Entry" select in the existing Look group, posting the action through the existing plan/apply path), `docs/en/visual-studio.md`, `docs/zh-CN/visual-studio.md`
- Test: `tests/cine-p0.test.mjs`, `tests/visual-studio.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-003 set-intent: plans the intent and the preferred variant, keeps a composition lock and an intent lock, changes no text, data or sources, and the Studio API applies it through the normal edit path',()=>{});
```

- [ ] **Step 2–5:** FAIL → implement → PASS (`node --test tests/visual-studio.test.mjs tests/s9a-author-controls.test.mjs`) → commit `CINE-003 (3/3): set-intent action and Studio control`

### Task 10: Media roles and the primary media grids

**Files:**
- Create: `src/design/media.mjs`
- Modify: `schemas/design-plan.schema.json` (scene `media`), `src/design/plan.mjs` (`assertMedia`), `src/scene/web/compile.mjs` (region `mediaRole`), `schemas/web-scene.schema.json`, `src/render/web/document.mjs` (`data-media-role`), `src/render/web/compositions.mjs` and `src/render/web/art-direction.mjs` (CSS below)
- Test: `tests/cine-p0.test.mjs`

**Interfaces:**
- Produces: `MEDIA_ROLES`, `mediaRoles(document, scene)` → `Map<blockId, role>` (authored entries win; defaults: first image of image/photo-split/stage-hero/fieldnotes-figure/atlas-cover pages → `hero`; both before-after images → `hero`; other images → `supporting`; diagrams → `mechanism`), `assertMedia(document, scene)` (block is an image or diagram of the scene; unique).
- CSS (1440 px; the 701–1100 px query keeps the grids; ≤ 700 px reads in DOM order as today):
  - `.web-scene.image-right .regions{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}` `.web-scene.image-right [data-component=heading]{grid-column:1}` `.web-scene.image-right [data-component=image]{grid-column:2;grid-row:1 / span 8;align-self:center}` `.web-scene.image-right .web-image{width:min(100%,calc(560px * var(--image-aspect)));max-width:none;margin-left:auto}` (replaces the 440 px cap; the heading leads into the product).
  - `.web-scene.image-left .regions{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}` `.web-scene.image-left .web-image{width:min(100%,calc(560px * var(--image-aspect)))}` (replaces 570 px / 1.08fr).
  - `.web-scene .region[data-media-role=supporting] .web-image{width:min(100%,calc(260px * var(--image-aspect)))}` `.web-scene .region[data-media-role=context] .web-image{width:100%;max-width:none}`.
  - `.web-scene.image-strip .web-image{width:min(100%,calc(400px * var(--image-aspect)));max-width:760px}` (replaces 320 px / 600 px).
  - `.web-scene.system-map-wide .semantic-diagram svg{max-width:1040px}` `.web-scene.system-map-key .semantic-diagram svg{max-width:800px}` (65–80 % of the 1312 px content width).
- Arithmetic to state in the CSS comment: content width 1440 − 2 × 64 = 1312 px; 7 of 12 columns with 32 px gutters ≈ 747 px; height under the folio ≈ 618 px, so a hero box of 560 px height fits inside the 810 px frame.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-004 media roles: defaults per composition and authored override; a role on a paragraph is refused; legacy fixtures validate',()=>{});
test('CINE-004 markup: regions carry data-media-role; the product page image sits in the 7-column side; the detail page shows a hero and a supporting locator',()=>{});
test('CINE-004 CSS: no 440 px, 570 px, 560 px or 640 px media cap remains for image-left, image-right, image-strip or system maps (string check on the stylesheet)',()=>{});
```

- [ ] **Step 2–5:** FAIL → implement → PASS (`node --test tests/composition-families.test.mjs tests/visual-web.test.mjs tests/render.test.mjs`) → commit `CINE-004 (1/3): media roles and the 5/7 and 7/5 media grids`

### Task 11: Subject fraction and label-size report

**Files:**
- Modify: `src/design/media.mjs` (`subjectFraction`), `src/design/rhythm.mjs` (`candidateFit` features gain `media:[{blockId, containerFraction, subjectFraction, annotated}]` when the check carries `components`/image boxes — the runtime already reports image window area; per-image boxes come from `inspectRenderedPage().scenes[].regions[].bounds` in the browser runner, so `subjectFraction` is a pure function used by the runner and the evidence, not by the player)
- Test: `tests/cine-p0.test.mjs`

**Interfaces:**
- Produces: `subjectFraction({pageWidth, pageHeight, imageBox, safeRegion})` → `{containerFraction, subjectFraction, annotated}` where `annotated = !(safeRegion.x===0&&safeRegion.y===0&&safeRegion.width===1&&safeRegion.height===1)`; the spec's example (55 % container, 20 % subject → 11 %) is the test value.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-004 subject fraction: a 55 % container with a 20 % protected region is an 11 % subject; a full-image region reports annotated:false and equal fractions',()=>{});
test('CINE-004 labels: candidateFit features report labelMinPx from the diagram and the 21 px target; a component under 10 px still fails as before',()=>{});
```

- [ ] **Step 2–5:** FAIL → implement → PASS → commit `CINE-004 (2/3): subject fraction and label-size report`

### Task 12: `visual-space` author action, Studio button, browser evidence and docs

**Files:**
- Modify: `src/workbench/author-actions.mjs` (`AUTHOR_ACTIONS['visual-space']={levels:['page','object'],changes:['composition','media role','page disclosure']}`; `LARGEST_MEDIA` constant measured in Step 3 and recorded in `docs/evidence/cine-p0/media-space.json`, mirroring `LARGEST_PLOT`), `public/studio/author.js` (button "Give the visual more space" / "给视觉更多空间" beside "Give the chart more space"), `scripts/export-targets.mjs` (`--cine` deck set: `cine-en`, `cine-zh-CN`)
- Create: `tests/browser_cine.mjs` (1440 / 1024 / 390 captures of every corpus page, `candidateFit` per page, `subjectFraction` for the three images, grayscale copies of the product and evidence pages, JSON report), `docs/evidence/cine-p0/review.md`, `docs/evidence/cine-p0/media-space.json`
- Modify docs: `docs/en/migration.md` + `docs/zh-CN/migration.md` (section "References, intent and media (CINE batch 1)": the three optional fields, defaults, what `expanded`/`inferred` mean, nothing to migrate), `docs/en/verification.md` (new top section with the exact commands, counts, browser version, applications not run), `docs/en/handoff.md` + `docs/zh-CN/handoff.md` (batch 1 entry at the top; batch 2 not authorized by it), `docs/en/visual-studio.md` + zh-CN (two new controls), `ROADMAP.md` + `roadmap.json` (notes on VIS-006, VIS-007, VIS-013, VIS-016; no state change)
- Test: `tests/cine-p0.test.mjs`, `tests/visual-studio.test.mjs`, `tests/release-gate.test.mjs` (unchanged)

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-004 visual-space: on the product page it chooses the measured largest media variant, sets the hero role, moves movable text behind the disclosure, keeps locks and facts; on the mechanism page it chooses system-map-wide; the Studio API applies it',()=>{});
test('CINE batch 1 docs: migration, verification and visual-studio pages mention the three fields in English and Chinese (string check)',()=>{});
```

- [ ] **Step 2: Run → FAIL**
- [ ] **Step 3: Measure.** Run `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_cine.mjs` once with every image-family and system-map variant on the product and mechanism pages; write the hero/diagram box sizes to `docs/evidence/cine-p0/media-space.json`; encode the winners in `LARGEST_MEDIA`.
- [ ] **Step 4: Implement** the action, the button and the docs. Run `node --test tests/cine-p0.test.mjs tests/visual-studio.test.mjs` → PASS.
- [ ] **Step 5: Evidence.** `node tests/browser_cine.mjs` (final), `node scripts/export-targets.mjs --cine --out dist/export-targets-cine`, open the PDF in Preview and the PPTX in whatever is installed; inspect every captured page image yourself and name the weakest page in `review.md`. Record: tests run and counts, browser version, which applications were available, and that PowerPoint/Keynote acceptance is not claimed unless they were opened.
- [ ] **Step 6: `npm run verify`** → all green (expected ≈ 495 tests + the new file), then `node --test tests/studio-export.test.mjs` alone.
- [ ] **Step 7: Commit** `CINE-004 (3/3): visual-space action, browser evidence and batch 1 docs`

### Batch 1 exit (spec §9, first release)

Show in `docs/evidence/cine-p0/review.md`, with the image file names:

- one explanatory page with a left-entry statement and a large right-side product (`product`);
- one intentional centred hero (`product-center`);
- one evidence page with 12 sources through markers, strip, panel and appendix (`evidence`);
- one overflow page resolved by a stated split or disclosure and exported with legible text (`overflow`);
- the product → detail → mechanism sequence with legible exported text (`product`, `detail`, `mechanism`).

Then ask the user (in Chinese) before starting batch 2.

---

## 5. Batches 2–4 (task outlines; expand into steps when the batch starts)

### Batch 2 (P1)

**CINE-005 subject-aware framing.** Add `subjectBounds?`, `protectedRegions[]`, `contextRegion?`, `visibleCaption?`, `detailLocator?` to the asset brief (`schemas/asset-brief.schema.json`, `src/assets/brief.mjs`); `safeCrop` takes `protectedRegions` (union) as the floor and `contextRegion` as the ceiling; `blocks.mjs` prints `visibleCaption ?? alt` in `<figcaption>` while `alt` stays on `<img>`; evidence screenshots (`brief.role==='product-screenshot'` with `factual:true`) refuse destructive crops (`display:'contain'` forced, refusal code `PROTECTED_REGION`); a missing subject annotation yields `annotated:false` (Task 11) and the conservative full-image policy. Tests in `tests/assets-visual.test.mjs`; browser in `tests/browser_assets.mjs`.

**CINE-006 typography and luminance hierarchy.** `theme-registry.mjs` declares six type roles with px per role per theme; `sceneDirection` emits `--label-size` and `--reference-size`; `contrast.mjs` adds a grayscale pass (luminance-only contrast between focal region and the rest); remove the per-citation border in expanded mode; raise body/label px where the delivered pt falls below the target and the composition has room (measured per theme, recorded). Acceptance: `typographyReport.target.status==='met'` on the corpus for body and label in PowerPoint; grayscale captures still show the primary subject.

**CINE-007 aesthetic evaluation.** Player: `check()` gains per-region `minTextPx`, per-image box and the strip height; bump `PLAYER_VERSION` → `semantic-player.7`, re-record baseline. `render-checks.mjs` gains soft `features` (subject area, strip height, grouping gap variance, alignment axes count, competing accent count, title-to-figure distance) with documented definitions in `docs/visual-acceptance/review.md`; `rhythm.mjs` ranks feasible candidates by hard gates first, then calibrated weights, and records why each of the three differs; `scripts/release-gate.mjs` prints the weakest page. A/B rule: same corpus, assets, theme, viewport and targets.

### Batch 3 (P2)

**CINE-008 sequence planning.** `argument-units.mjs` gains the optional `shot` (`context|product|detail|mechanism|evidence|action`); `storyboard.mjs` maps shots to `intent.purpose` and `media` roles; `rhythm.mjs` adds a continuity cost (same object id across adjacent pages, same category colours); `director.mjs` never pads to complete a sequence. **CINE-009 motion.** `blueprint.mjs` adds the `overview-detail` and `returning-object` cue patterns on the existing clock; strengthen the Explain composition's lower region; static state remains complete. **CINE-010 profiles.** `design-profile.mjs` adds a `grammar` enum per theme (the spec's table) applied through existing profile fields only.

### Batch 4 (P3)

**CINE-011 plain-language controls.** Map "Larger visual" → `visual-space`, "Quieter references" → `references.mode='compact'` (new action `quieter-references`), "More space between groups" → profile density `comfortable` + `--section-gap`, "Show the detail" → `set-intent show-detail` + media hero on the chosen block; each with the S9a plan/preview/apply/undo path; advanced anchors behind an inspector; learning opt-in in `workbench/preferences.mjs`. **CINE-012 atmosphere.** Only after P0/P1 acceptance; EXP-001 notes apply.

## 6. Verification and release (all batches)

- Unit: `npm run verify` (types, tests, check, build, demo); `tests/studio-export.test.mjs` alone.
- Browser: `tests/browser_cine.mjs` at 1440 × 810, 1024 px and 390 px; standalone no-JavaScript HTML opened with scripts blocked (the export path already does this).
- Exports: `scripts/export-targets.mjs --cine`; PDF text read back with `tests/inspect_pdf.py`; PPTX audited by `src/targets/pptx/audit.mjs`. `tests/inspect_v3_pptx.py` does not understand pagination (slide count ≠ scene count), so compare bands with `job.pagination` instead of the slide count.
- Applications: open the files in what is installed and say which; never infer PowerPoint or Keynote from XML.
- The ten passing conditions of spec §8 are the batch exit checklist; the weakest page is named every time.

## Self-review notes

- Spec coverage: §1 (five decisions) → Tasks 1–12; §3 vocabulary → Tasks 4, 7, 10; §4 starting points → `TARGETS` values and the CSS in Task 10; §5 packages → §1 map and §5 outlines; §6 contract → §2 (reconciled with `focalBlockId`, `readingOrder`, `imageSlots`); §7 fixture → §3 corpus; §8 criteria → §6; §9 first batch → Batch 1 exit; §10 roadmap → Task 12 notes.
- Names used consistently: `TARGETS`, `PT_PER_PX`, `typographyReport`, `targetFit`, `sceneBands(frame, unitsPerPt)`, `splitScene`, `referenceIndex`, `sceneReferences`, `inferIntent`, `effectiveIntent`, `preferredVariant`, `mediaRoles`, `subjectFraction`, actions `fit-page`, `set-intent`, `visual-space`.
- Deliberately not in batch 1: raising hard typography minima, player changes, subject detection, new themes.
