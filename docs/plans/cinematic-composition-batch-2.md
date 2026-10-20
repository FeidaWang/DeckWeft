# Cinematic composition batch 2 (CINE-005 … CINE-007) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the P1 batch of the [build map](cinematic-composition-build-map.md) §5: authored subject annotations that crops and the subject-fraction report respect (CINE-005), six type roles with a grayscale hierarchy check and delivered sizes reported against the target policy (CINE-006), and a reviewable aesthetic evaluation — player measurements, documented soft features, ranked candidates with stated differences and a named weakest page (CINE-007) — on the frozen batch 1 corpus.

**Architecture:** Every new fact is optional and declared: five optional fields on the asset brief (`schemas/asset-brief.schema.json`), type roles per theme pack (`themes/*/theme.json`, read by `theme-registry.mjs`), and custom properties the page gets only when it declares a batch 1 field. Pages without declared fields keep byte-identical markup (the handoff contract test); the stylesheet and the player change under one renderer bump (`visual-art-direction.14`) and one player bump (`semantic-player.7`), each re-recorded in its own commit. Soft features are pure functions over the player's measurements, named diagnostics, never "eye tracking".

**Tech Stack:** Node 22 ESM, no runtime dependencies, `node --test`; isolated Chromium (`CHROMIUM_PATH`, `PLAYWRIGHT_MODULE`) for `tests/browser_cine.mjs`, `tests/browser_assets.mjs` and `scripts/export-targets.mjs --cine`.

**Spec:** [DeckWeft-Cinematic-Design-Roadmap-2026-10-19.md](../../DeckWeft-Cinematic-Design-Roadmap-2026-10-19.md) §1.4, §4, §5 (CINE-005 to CINE-007), §6, §8; [build map](cinematic-composition-build-map.md) §0–§3, §5 batch 2, §6.

**Branch:** the worktree branch cut from `claude/deckweft-design-roadmap-2d3d10` (HEAD `a5b331c`). Commit per task. Do not push, merge or publish.

## Global constraints

The build map's global constraints apply unchanged. Batch 1 decisions this batch keeps:

- The three scene fields and the new brief fields change markup only when declared; legacy decks stay byte-identical in markup and content hashes (`tests/handoff-contracts.test.mjs`).
- Renderer after this batch: `visual-art-direction.14`; player: `semantic-player.7`. One recorded player byte sequence per version: all player byte changes land in one task (Task 5) before the bump; the baseline is re-recorded in its own commit after every stylesheet or player change (`node tests/render-baseline.mjs --write --source-commit <sha> --note "…"`).
- Hard typography minima stay `{title:18, body:10, annotation:6}` pt; targets `{title:24, body:18, label:14, reference:10}` pt are reported by `typographyReport`, never enforced.
- `tests/studio-export.test.mjs` runs alone. Browser runners use the isolated Chrome for Testing 151 from the Playwright cache.
- Existing `focalPoint` and `safeRegion` stay required and authoritative for crop feasibility (spec CINE-005 contract); the new fields refine, never replace, them.
- Nothing writes, deletes or rewrites text, data, sources, alt text or original assets. No new dependency. Questions to the user in Simplified Chinese.

## Review focus

1. **A brief whose protected regions do not fit the requested aspect.** The crop is refused with `PROTECTED_REGION` and `mode:'contain'`; nothing silently crops through a protected region (Task 1).
2. **An evidence screenshot (`role:'product-screenshot'`, `factual:true`) asked for a crop.** Refused with `PROTECTED_REGION`; `contain` is the only accepted display and the full-image crop the only valid crop (Task 1).
3. **A visible caption that differs from the alt text.** The caption is the figcaption; the `<img alt>` is still the block's alt, the render check still finds the alt, and PowerPoint's picture description is the alt (Tasks 2, 3).
4. **A legacy deck with no declared fields after the type-role CSS lands.** Markup and content hashes unchanged; only the stylesheet part of the baseline changes (Task 4).
5. **A scene whose focal block is an image on a dark theme.** The grayscale audit still reads the image's own luminance (sampled through a canvas), so the hierarchy judgment is about the drawing, not the page colour (Task 5).

---

## Contract decisions (batch 2)

```ts
// Asset brief (schemas/asset-brief.schema.json, src/assets/brief.mjs). All optional; absent = today's behaviour.
{ subjectBounds?: NormalizedRect,          // the drawn subject; what subjectFraction reports as annotated:true
  protectedRegions?: NormalizedRect[],     // max 8; their union with safeRegion is the crop floor
  contextRegion?: NormalizedRect,          // the crop ceiling: a crop never extends beyond it; must contain safeRegion, subjectBounds and every protected region
  visibleCaption?: string,                 // ≤ 300 chars; the <figcaption>; alt stays on <img>
  detailLocator?: { blockId: string, region: NormalizedRect } }  // another image block of the same scene that shows the whole object, and where this detail sits in it

// Theme pack (schemas/theme-pack.schema.json): typography.roles, optional, px at 1440 px.
{ title: number, lead: number, body: number, label: number, reference: number, numeric: number }
// Delivered pt in PowerPoint = px × 2/3 at scale 1, so the targets 24/18/14/10 pt are 36/27/21/15 px.
```

Derived, never stored:

- `cropFloor(brief)` = bounding rectangle of `safeRegion` and every `protectedRegions[]` entry; `cropCeiling(brief)` = `contextRegion ?? {0,0,1,1}`; `isEvidenceBrief(brief)` = `role==='product-screenshot' && factual===true`.
- `subjectOf(scene, blockId)` = the slot brief's `subjectBounds` or `null`; the browser runner passes it to `subjectFraction` so `annotated` is true only when an author drew it.
- Type roles: `themeTypeRoles(themeId)` from the pack; `sceneDirection` adds `roles`, `label`, `reference` to its result; `document.mjs` writes `--label-size` and `--reference-size` only on a page that declares `references`, `intent`, `media` or image slots with batch 2 fields (`declaresCine(scene)`); the stylesheet consumes them with fallbacks that hold today's literal values. Body is raised to the role size on a declared page unless the page is dense (`denseText`: more than 4 text blocks, or a list over 6 items, or over 600 characters of body text), so a dense page keeps today's size and is reported `below`, never squeezed.
- Soft features (CINE-007, `SOFT_FEATURES` in `render-checks.mjs`): `subjectArea` (largest annotated subject fraction, else container fraction, with `annotated`), `stripHeight` (px over the 48 px budget), `groupingGapVariance` (variance of vertical gaps between consecutive regions in DOM order, px²), `alignmentAxes` (distinct left edges of regions, rounded to 8 px), `competingAccents` (regions other than the focal whose smallest text is at least as large as the focal region's largest text), `titleFigureDistance` (px from the heading box bottom to the first image or diagram box top; `null` without one), `entryClarity` (whether the focal region's centre lies in the declared entry third of the page). A bounding-box proxy; definitions and exceptions in `docs/visual-acceptance/review.md`.
- Ranking (`rankCandidates`): candidates failing a hard gate (`candidateFit.ok===false`) rank last; feasible ones by `softScore = Σ SOFT_WEIGHTS[k] × normalized(feature)`; `differences` lists the composition and every feature that differs by more than its tolerance between the winner and each other candidate.

## Corpus additions (Task 1)

`tests/cine-corpus.mjs` gains `imageSlots` and `crops` declarations (merged like the other fields; `CINE_FIELDS` grows to five):

| Page | Slot | Brief additions | Crop |
|---|---|---|---|
| `product` | `prod-image` (800 × 600) | `subjectBounds {x:.3,y:.3,width:.4,height:.4}`, `protectedRegions [{x:.28,y:.28,width:.44,height:.44}]`, `contextRegion {x:.1,y:.1,width:.8,height:.8}`, `visibleCaption` (en: "The product in its field; the drawing is synthetic", zh-CN: "产品与其空白场地；绘图为合成"), display `crop`, aspect 1 | `{x:.2,y:.2,width:.6,height:.6}` (computed by `safeCrop` at aspect 1 inside the context region) |
| `detail` | `det-hero` (480 × 960) | `subjectBounds {x:.1,y:.35,width:.8,height:.3}`, `protectedRegions [{x:.1,y:.35,width:.8,height:.3}]`, `visibleCaption` ("Seam and latch" / "接缝与锁扣"), `detailLocator {blockId:'det-locator', region:{x:.3,y:.3,width:.4,height:.4}}`, display `crop`, aspect 1 | `{x:0,y:.25,width:1,height:.5}` |
| `detail` | `det-locator` (800 × 600) | `subjectBounds {x:.3,y:.3,width:.4,height:.4}`, display `contain`, aspect 4/3 | full |
| `product-center` | `pc-image` | `role:'product-screenshot'`, `factual:true`, `sourceId:'src-product'`, display `contain` | full (the evidence screenshot that must not be cropped, spec §8) |

`pc-image`'s block gets `factual:true` in both fixtures (the slot contract requires agreement); its asset has `origin:'original'`? — check `assets[1].origin`; if the fixture asset lacks `origin`, `assertAssetSuitability` refuses a factual slot: set the asset's `origin` to `original` in both fixtures (the drawing is the fixture's own original artwork; the provenance text says so).

---

## Task 1: Brief contract, subject-aware `safeCrop`, evidence screenshots and the corpus annotations

**Files:**
- Modify: `schemas/asset-brief.schema.json`, `schemas/design-plan.schema.json` (the inline brief copy under `imageSlots[].brief`), `src/assets/brief.mjs`, `src/assets/crop.mjs`, `src/assets/slots.mjs`, `src/design/media.mjs`, `tests/cine-corpus.mjs`, `tests/fixtures/visual/cine.en.json`, `tests/fixtures/visual/cine.zh-CN.json`, `tests/fixtures/visual/cine.negative.json`
- Test: `tests/cine-p1.test.mjs` (new; one file for the batch)

**Interfaces:**
- Produces: `cropFloor(brief) → NormalizedRect`, `cropCeiling(brief) → NormalizedRect`, `isEvidenceBrief(brief) → boolean` (crop.mjs); `safeCrop(asset,{aspect,focalPoint,safeRegion,protectedRegions=[],contextRegion=null,role,factual})` (unchanged return shape; evidence → `{ok:false,code:'PROTECTED_REGION',mode:'contain',reason,crop:full,aspect}`); `assertAssetBrief` validates the new rects and containment; `assertImageSlots` refuses `detailLocator.blockId` that is not another image of the scene (`IMAGE_SLOT`) and an evidence slot whose crop is not the full image (`PROTECTED_REGION`); `applySlotCrop` throws `PROTECTED_REGION` for an evidence brief and `UNSAFE_CROP` otherwise; `subjectOf(scene,blockId) → NormalizedRect|null` (media.mjs); `subjectFraction({…,subjectBounds})` accepts `subjectBounds` as the annotation (alias of `safeRegion`); `CINE_FIELDS=['references','intent','media','imageSlots','crops']`, `CINE_SCENES[id].imageSlots/crops`.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-005 brief: subjectBounds, protectedRegions, contextRegion, visibleCaption and detailLocator validate; rects outside the context region, a 9th protected region and a locator that is not an image of the page are refused',…);
test('CINE-005 safeCrop: the floor is the union of safeRegion and the protected regions, the ceiling is the context region; the corpus product crop at aspect 1 is {.2,.2,.6,.6}; a floor that cannot fit the aspect is refused PROTECTED_REGION with contain',…);
test('CINE-005 evidence screenshot: product-screenshot + factual refuses every crop with PROTECTED_REGION, accepts contain, and applySlotCrop names the code',…);
test('CINE-005 corpus: both locales carry the annotated product and tall slots, cineProject validates with imageSlots and crops declared, the legacy (declared:[]) corpus still validates; every cine.negative.json case tagged CINE-005 is refused',…);
test('CINE-005 subject fraction: the product hero with its 40 % × 40 % subject reports annotated:true and subject = container × 0.16 (crop {.2,.2,.6,.6} → subject share (.4/.6)² ≈ 0.444 of the cropped container); an image without subjectBounds reports annotated:false and "no subject annotation"',…);
```

(The subject share inside a crop is the subject rect intersected with the crop, divided by the crop area: `subjectFraction` gains an optional `crop` so the runner can pass the scene's crop.)

- [ ] **Step 2: Run** `node --test tests/cine-p1.test.mjs` **→ FAIL**
- [ ] **Step 3: Implement.** Schema: the five optional properties (rects reuse the `safeRegion` definition; `protectedRegions` `maxItems:8`; `visibleCaption` `maxLength:300`; `detailLocator` `{blockId:pattern,region:rect}`). `assertAssetBrief`: `assertRect` on every rect; `contextRegion` must `contain` `safeRegion`, `subjectBounds` and each protected region (`SAFE_REGION`, "The context region must contain the subject and every protected region."). `safeCrop`: compute the maximal crop of `aspect` inside the ceiling instead of the unit square; refuse when the floor is wider or taller than it; place with the existing `place` against the floor, then clamp into the ceiling. `assertImageSlots`: after the existing checks, `isEvidenceBrief` → crop must be full or throw `PROTECTED_REGION` ("Evidence screenshots are shown whole. Use contain."); `detailLocator` → the block is an image of this scene other than the slot's. `subjectFraction({pageWidth,pageHeight,imageBox,safeRegion,subjectBounds,crop})`: annotation = `subjectBounds ?? safeRegion`; `share` = area of (annotation ∩ crop) / area of crop. Corpus: the table above; `cineProject` merges `imageSlots` and `crops` like the other fields.
- [ ] **Step 4: Run → PASS**; `node --test tests/assets-visual.test.mjs tests/cine-p0.test.mjs tests/handoff-contracts.test.mjs tests/visual-studio.test.mjs` → PASS (a cine-p0 test that asserted the uncropped product image may need its expectation updated; say which in the commit body).
- [ ] **Step 5: Commit** `CINE-005 (1/3): subject-aware brief, protected and context regions, evidence screenshots stay whole`

## Task 2: Visible caption, locator frame and alt preservation in the web renderer; renderer `.14`

**Files:**
- Modify: `src/render/web/components/blocks.mjs` (figcaption = `slot?.brief.visibleCaption ?? b.alt`; locator frame), `src/render/web/document.mjs` (pass the locator of a region: the slot on the same scene whose `detailLocator.blockId` is this region's block), `src/render/web/art-direction.mjs` (CSS `.web-scene .image-crop .locator-frame{position:absolute;border:2px solid var(--accent);box-shadow:0 0 0 2px var(--paper);pointer-events:none}`), `src/scene/web/compile.mjs` (`WEB_RENDERER_VERSION='visual-art-direction.14'`; region gains optional `locator:{forBlockId,region}`), `schemas/web-scene.schema.json`, `src/quality/render-checks.mjs` (`inspectRenderedPage` images gain `alt`; `expectedText` for an image is the caption when the scene's slot declares one; an observed `alt` that differs from `block.alt` is a `text-coverage` issue "Alt text changed"), `src/targets/pptx/audit.mjs` (image expected text = caption when declared; `descr` stays the alt)
- Test: `tests/cine-p1.test.mjs`, `tests/render.test.mjs`, `tests/visual-web.test.mjs`

**Interfaces:**
- Markup: `<figure class="web-image" …><div class="image-crop" …><img … alt="{alt}"><span class="locator-frame" style="left:30%;top:30%;width:40%;height:40%" aria-hidden="true"></span></div><figcaption>{caption}</figcaption></figure>`; the locator figure carries `data-locator-for="{detailBlockId}"`. Only pages with a declared slot change.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-005 web: the product page prints the visible caption in <figcaption> and keeps the alt on <img>; the detail page draws the locator frame on the locator image at the declared rect; pages without slots render as before',…);
test('CINE-005 checks: checkRender from a synthetic observation passes text coverage with the caption and fails when the observed alt differs from the block alt',…);
test('CINE batch 2: a legacy deck renders the same markup except the renderer version (render-baseline parts: markup unchanged, renderer .14)',…);
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/render.test.mjs tests/visual-web.test.mjs tests/visual-quality.test.mjs tests/export-targets.test.mjs` → PASS; `node tests/render-baseline.mjs` reports the style part changed.
- [ ] **Step 5: Commit** `CINE-005 (2/3): visible caption beside the alt, locator frame; renderer .14`
- [ ] **Step 6 (own commit):** `node tests/render-baseline.mjs --write --source-commit <sha> --note "CINE-005 locator frame CSS; renderer .14"` → `Re-record render baseline for renderer .14`

## Task 3: Captions and alt in the paged exports; subject annotations in the candidate report

**Files:**
- Modify: `src/design/rhythm.mjs` (`candidateFit` media entries take `subjectBounds` and `crop` from `check.images[]` and report `annotated`), `tests/browser_cine.mjs` (the runner passes `subjectOf(scene, blockId)` and the scene crop per image), `src/targets/static-delivery.mjs` (hidden-image notes list the caption and the alt), `tests/browser_assets.mjs` (one new API case: an evidence-screenshot crop is refused with `PROTECTED_REGION`)
- Test: `tests/cine-p1.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-005 exports: with the synthetic layout the product page compiles the caption as real text in PowerPoint and PDF and the picture description is the alt; the typography report classes the caption as reference',…);
test('CINE-005 candidateFit: media entries with subjectBounds report annotated:true and the subject fraction; without them annotated:false',…);
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/export-targets.test.mjs tests/cine-p0.test.mjs` → PASS.
- [ ] **Step 5: Commit** `CINE-005 (3/3): captions and alt in the paged exports; annotated subjects in the candidate report`

## Task 4: Type roles, luminance-free hierarchy in the stylesheet, delivered sizes against the target

**Files:**
- Modify: `schemas/theme-pack.schema.json` (`typography.roles`), `themes/*/theme.json` (six packs: `roles` per the table below), `src/design/theme-registry.mjs` (`TYPE_ROLES`, `themeTypeRoles(id)`), `src/design/art-direction.mjs` (`sceneDirection` → `roles`, `label`, `reference`, `declared`; body raised on a declared page with room), `src/render/web/document.mjs` (`--label-size`, `--reference-size` on declared pages), `src/render/web/art-direction.mjs` (consumers with fallbacks; one border per citation run), `src/targets/target-budget.mjs` (`typographyReport` rows gain `roleSizePx` when the direction is given — optional), `tests/fixtures/visual/render-baseline.json` (Step 6)
- Test: `tests/cine-p1.test.mjs`, `tests/art-direction.test.mjs`, `tests/handoff-contracts.test.mjs`

**Interfaces:**
- `TYPE_ROLES=['title','lead','body','label','reference','numeric']`; `themeTypeRoles(id) → {title,lead,body,label,reference,numeric}` px (packs: cream-collage / dark-data / electric-violet `{36,28,27,21,15,27}`; silver-gray-editorial `{36,28,27,21,15,27}`; fresh-report `{36,26,25,21,15,25}` (its tight demi-bold body is recorded below the 18 pt target at 16.7 pt: a theme decision, stated); orange-launch `{36,28,27,21,15,27}`).
- `sceneDirection` result gains `roles` (the theme's), `label` (px), `reference` (px), `declared` (boolean); `body` = `max(today, roles.body)` when `declared && !denseText`, else today's value; `lead` likewise against `roles.lead`.
- CSS: `.web-scene .chart-rows{font-size:var(--label-size,15px)}`, `.web-scene .legend{font-size:var(--label-size,14px)}`, `.web-scene table{font-size:var(--label-size,14px)}`, `.web-scene .citation,.web-scene .web-image figcaption,.web-scene .source-strip .citation,.web-scene .reference-panel{font-size:var(--reference-size,12px)}` (each fallback is the value the rule holds today); SVG chart and diagram text is drawn by its compiler at its own scale and is **not** resized here (recorded as the label limit). Borders: `.web-scene .region[data-component=citation]+.region[data-component=citation]{border-top:0;margin-top:0;padding-top:6px}` so a run of expanded citations carries one rule.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-006 type roles: every pack declares six roles that deliver at least the 24/18/14/10 pt targets in PowerPoint except the recorded fresh-report body; themeTypeRoles throws for an unknown pack',…);
test('CINE-006 direction: a declared product page gets body 27 px and label/reference sizes; the same page without declared fields keeps 22 px; the dense overflow page keeps 22 px and is reported below',…);
test('CINE-006 markup: a declared page carries --label-size and --reference-size; a legacy page carries neither; the stylesheet consumes both with the previous literal fallbacks and a citation run has one border',…);
test('CINE-006 typography: typographyReport on the synthetic PowerPoint layout of the corpus reports body met on every non-dense page and names each page still below with its role',…);
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/art-direction.test.mjs tests/composition-families.test.mjs tests/cine-p0.test.mjs tests/handoff-contracts.test.mjs` (the last fails only on the style part until Step 6).
- [ ] **Step 5: Commit** `CINE-006 (1/2): six type roles per theme, delivered sizes against the target, one border per citation run`
- [ ] **Step 6 (own commit):** re-record → `Re-record render baseline after the CINE-006 type-role stylesheet`

## Task 5: Player: grayscale hierarchy audit and the CINE-007 measurements; `semantic-player.7`

**Files:**
- Modify: `src/render/web/contrast.mjs` (`grayscaleScript` → `auditGrayscale(scene)`), `src/render/web/runtime.mjs` (`check()` gains `regions:[{regionId,blockId,box,minTextPx,maxTextPx}]`, `images:[{regionId,blockId,box}]`, `strip:{height}|null`, `grayscale`; `PLAYER_VERSION='semantic-player.7'`), `tests/fixtures/visual/render-baseline.json` (Step 6)
- Test: `tests/cine-p1.test.mjs`, `tests/handoff-contracts.test.mjs`

**Interfaces:**
- `auditGrayscale(scene) → {focal:{regionId,luminance,contrast}, regions:[{regionId,luminance,contrast,area}], strongest:regionId, holds:boolean}` where `luminance` is the relative luminance of a region's dominant foreground (the text colour of its first text node, or the mean of a 32 × 32 canvas sample of its `<img>`), `contrast` = `|luminance − pageLuminance|`, `holds` = the focal region's `contrast × area` is the largest or within 10 %. A diagnostic, named so in the field `method`.
- `check()` per scene adds `regions`, `images`, `strip` and `grayscale`; `window.deckweftFit` keeps `version:1` and the existing fields.

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-007 player: the runtime declares semantic-player.7, carries auditGrayscale, and check() reports per-region minTextPx, per-image boxes and the strip height (string checks on the embedded player)',…);
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/render.test.mjs tests/visual-quality.test.mjs` → PASS; `node tests/render-baseline.mjs` reports the script part changed.
- [ ] **Step 5: Commit** `CINE-006 (2/2) / CINE-007 (1/3): grayscale hierarchy audit and per-region measurements in the player; player .7`
- [ ] **Step 6 (own commit):** re-record with `--note "player semantic-player.7"` → `Re-record render baseline for player semantic-player.7`

## Task 6: Soft features with documented definitions; the weakest page

**Files:**
- Modify: `src/quality/render-checks.mjs` (`SOFT_FEATURES`, `softFeatures(sceneCheck, {entry, focalBlockId, subjects})`, `checkRender` adds `features:[{sceneId,…}]` when the fit check carries the player .7 fields, `weakestPage(features) → {sceneId, score, reasons}`), `src/quality/visual-review.mjs` (`createQualityReceipt` keeps `checks.features` and names `weakestPage`), `docs/visual-acceptance/review.md` (section "Soft features (CINE-007)": one row per feature with definition, unit, direction and exceptions)
- Test: `tests/cine-p1.test.mjs`, `tests/visual-quality.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-007 soft features: from a synthetic player .7 check the seven features compute as defined (subject area, strip height over budget, grouping gap variance, alignment axes, competing accents, title-figure distance, entry clarity); an undeclared entry gives entryClarity null',…);
test('CINE-007 weakest page: the page with the lowest score is named with its reasons; checkRender carries features and the receipt names the weakest page; a check without the player .7 fields yields no features and no error',…);
test('CINE-007 docs: docs/visual-acceptance/review.md defines every SOFT_FEATURES key (string check)',…);
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/visual-quality.test.mjs tests/release-gate.test.mjs` → PASS.
- [ ] **Step 5: Commit** `CINE-007 (2/3): soft features with documented definitions; the weakest page`

## Task 7: Ranked candidates with stated differences; the release gate prints the weakest page

**Files:**
- Modify: `src/design/rhythm.mjs` (`SOFT_WEIGHTS`, `rankCandidates(project,candidates,feasibility) → [{sceneId, ranked:[{candidate,composition,ok,reasons,score,differences:[{feature,winner,this}]}]}]`, `chooseRhythm` report gains `ranking` and `method` names the hard-gate-then-weights order), `scripts/release-gate.mjs` (the quality step computes `weakestPage` per deck from the visual-verify observation and prints `weakest: <deck> <sceneId> (<reasons>)`; `quality.json` records it)
- Test: `tests/cine-p1.test.mjs`, `tests/composition-families.test.mjs`, `tests/release-gate.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('CINE-007 ranking: on the product page three measured candidates rank hard gates first (the over-budget image-strip last), then by weighted soft features, and each loser states what differs from the winner; chooseRhythm still picks the same path for the corpus and its report carries the ranking',…);
test('CINE-007 A/B rule: rankCandidates refuses candidates whose document, assets, theme or viewport differ (CANDIDATE_CONTENT)',…);
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implement** · **Step 4: Run → PASS**; `node --test tests/composition-families.test.mjs tests/release-gate.test.mjs tests/s9a-author-controls.test.mjs` → PASS.
- [ ] **Step 5: Commit** `CINE-007 (3/3): ranked candidates with stated differences; the release gate names the weakest page`

## Task 8: Browser evidence, exports, docs, roadmap notes and the status record

**Files:**
- Modify: `tests/browser_cine.mjs` (extend: subject fractions from the annotated slots, the player's grayscale and strip measurements, soft features and the weakest page per locale, the three ranked candidates of the product page with their differences, a 1440 px capture of the detail page's locator frame, grayscale copies of product, detail and mechanism; writes `docs/evidence/cine-p1/browser-report.json` and the contact sheets with `--evidence`), `scripts/export-targets.mjs` (unchanged unless `--cine` needs the slots: `cineProject` already merges them), `docs/en/migration.md` + `docs/zh-CN/migration.md` (section "Subject annotations, type roles and soft features (CINE batch 2)"), `docs/en/verification.md` + `docs/zh-CN/verification.md` (new top section), `docs/en/visual-studio.md` + zh-CN (the brief fields the image-slot API accepts; no new Studio control in this batch), `docs/en/handoff.md` + zh-CN (batch 2 entry on top; batch 3 not authorized), `ROADMAP.md` + `roadmap.json` (notes on VIS-006, VIS-007, VIS-010, VIS-014, VIS-016; no state change), `PROJECT_STATUS.json` (status record)
- Create: `docs/evidence/cine-p1/review.md` (spec §8 passing conditions checked one by one, the weakest page, test counts, browser version, applications available or not), `docs/evidence/cine-p1/verify-<sha>.txt`
- Test: `tests/cine-p1.test.mjs` (docs string check)

- [ ] **Step 1: Write the failing test** `CINE batch 2 docs: migration, verification and visual-studio pages mention subjectBounds, the type roles and the soft features in English and Chinese`.
- [ ] **Step 2: Run → FAIL** · **Step 3: Write the docs → PASS**.
- [ ] **Step 4: Evidence.** `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_cine.mjs --evidence`; `node tests/browser_assets.mjs`; `node scripts/export-targets.mjs --cine --out dist/export-targets-cine`; `node --test tests/studio-export.test.mjs` alone with `CHROMIUM_PATH`. Open every capture named in `review.md`; name the weakest page; record PowerPoint/Keynote as installed and not run unless opened.
- [ ] **Step 5: Commit** `CINE batch 2: browser evidence, exports and docs`
- [ ] **Step 6: Status record.** `npm run verify 2>&1 | tee docs/evidence/cine-p1/verify-<sha>.txt`; `node scripts/status-summary.mjs --record docs/evidence/cine-p1/verify-<sha>.txt --browser 151.0.7922.34`; copy the printed fields into `PROJECT_STATUS.json` (previous block into `history[0]`); commit `Record the CINE batch 2 verify run`.

### Batch 2 exit

Show in `docs/evidence/cine-p1/review.md`: the product page with its annotated subject (container and subject fractions, `annotated:true`), the detail page with the locator frame, the evidence screenshot kept whole, grayscale copies in which the primary subject still reads, the typography report per page (met / below with the reason), the three ranked product candidates with their differences, and the weakest page. Then ask the user (in Chinese) before any batch 3 work.

## Self-review notes

- Spec coverage: CINE-005 contract (fields) → Task 1; behaviour (deterministic crops, evidence screenshots, caption beside alt, locator) → Tasks 1–3; acceptance (missing annotation = conservative policy, same subject in alternate frames) → Tasks 1, 3 (browser evidence on the three widths in Task 8). CINE-006 contract (six roles) → Task 4; luminance → Task 5; borders → Task 4; delivered sizes → Task 4 test and Task 8 evidence. CINE-007 hard gates (unchanged, `candidateFit`), soft features → Task 6, selection/ranking → Task 7, A/B rule → Task 7 test, weakest page → Tasks 6–8. §8 corpus items already present in batch 1 plus the evidence screenshot (`pc-image`) added here.
- Names used consistently: `cropFloor`, `cropCeiling`, `isEvidenceBrief`, `subjectOf`, `themeTypeRoles`, `TYPE_ROLES`, `auditGrayscale`, `SOFT_FEATURES`, `softFeatures`, `weakestPage`, `SOFT_WEIGHTS`, `rankCandidates`, `CINE_FIELDS`.
- Deliberately not in batch 2: Studio controls for the new brief fields (CINE-011), automatic subject detection, chart and diagram SVG label resizing (their compilers set the scale; recorded as the label limit), new themes, batch 3.
