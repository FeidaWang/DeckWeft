# Migration: keep the old recipe before making a new one

[中文](../zh-CN/migration.md) · [Home](../../README.md)

The legacy formats come from Open Deck Skill and Open Deck Astra. DeckWeft can import some of those old project files; it does not pretend every old format is supported.

## Import a legacy schema 2 project

First copy your original JSON somewhere safe. Then:

```bash
node bin/deckweft.mjs import old-project.json --out imported.deck.json
node bin/deckweft.mjs check imported.deck.json
```

The command never rewrites the input. It maps supported titles, text, points, metrics, notes, and known layout names into the new schema. Unsafe or duplicate slide ids are replaced. Old layout scores are discarded and recalculated.

The complete original JSON is kept in `extensions.legacy.original`. Old media, custom theme values, locks, citations, and custom motion remain archived there; they are **not** silently converted into supported rendered features. Review these fields manually before sharing a result.

Current DeckWeft files must already be valid. Import does not hide their errors by inserting defaults. Unknown versions, arbitrary PPTX files, and old PPTD formats are rejected. Browser import makes a new project id, so an existing project is not overwritten.

## Move from the old plugin

Keep the old installed plugin until a new DeckWeft test deck has been exported successfully. The new installer writes only its own new directories and does not remove predecessor installations. Remove the old one through the host's own manager or a carefully reviewed manual operation. Do not keep two similarly triggered skills enabled while diagnosing behavior.

## Public documentation

All active UI, package, CLI, examples, README, and operational manuals use DeckWeft. Old names belong in this migration guide, the implementation audit, and [NOTICE](../../NOTICE.md), where preserving provenance matters. The original [LICENSE](../../LICENSE) stays intact.

## Opt into the strict misreading guards

Version 3 documents gained optional chart, dataset, scene, motion and theme fields on 2026-10-19 ([field list](architecture.md#version-3-handoff-fields-s1-2026-10-19)). Five of the six misreading guards apply only when their fields exist, so every existing version 3 document loads unchanged. The sixth guard, declared percentage denominators, would reject the existing fixtures and demos, so it is opt-in: `rules.misreading: "strict"`.

```js
import {declareChartSemantics} from './src/core/adapters/chart-semantics.mjs';
const strict=declareChartSemantics(document,{datasets:{'adoption-quarterly':{definition:{denominator:'Teams active in the quarter'},collectedAt:'2026-09-30'}}});
```

Expected result: a validated copy with `rules.misreading` set and the declared definitions; the input document is not modified and its series are byte-equal.

Recovery:

- `MIGRATION_DECLARATION … No denominator was inferred`: a percentage dataset has no declared denominator. Supply it in `datasets.<id>.definition.denominator`. The migration never guesses.
- `MIGRATION_DECLARATION … does not exist`: a declaration names a dataset id that is not in the document.
- `INVALID_PRESENTATION … denominator of percentage dataset`: a hand-edited document set `rules` without the declaration. Add the denominator or remove `rules`.

Legacy fixtures and the negative case are checked by `node --test tests/handoff-contracts.test.mjs`: `tests/fixtures/visual/wave-a.*.json` load unchanged, `semantic-chart.en.json` carries every new field, and `semantic-chart.negative.json` is rejected.

## Series focus and static states (S5): nothing to migrate

S5 (2026-10-19) added two optional plan fields: `initialFocusSeriesId` on a chart selection and the `data.focus` cue ([how to use them](interactions.md#focus-one-series-or-hide-it)). Existing plans load and export as before; nothing is converted.

1. A scene without `staticState` keeps its output: without JavaScript it draws the complete authored data, and the player opens at the authored opening (decision C7). Expected: the reader-visible markup of every existing export is byte-identical ([baseline test](../../tests/handoff-contracts.test.mjs)).
2. To freeze the opening in output without JavaScript, add a key state at position 0 and name it as the static state, for example `"keyStates":[{"id":"opening","position":0}],"staticState":{"keyStateId":"opening"}`. Expected: the export draws the opening selection, step, tab or hotspot with a statement line.
3. Exports made before S5 keep their embedded player. Re-export to get the S5 player (key guard, focus, static-state measurement).

Recovery: a plan whose `data.focus` cue or `initialFocusSeriesId` names a series that is hidden at that point is refused (`INVALID_INTERACTION … Show a series before focusing it`); show the series first or change the focus. `STATIC_STATE_UNIMPLEMENTED` no longer exists.

## Chapters, page disclosure and separate locks (S9a)

S9a (2026-10-19) added optional fields. There is no new `schemaVersion`: every existing document and plan loads and exports as before (the render baseline shows no visible word or value changed).

| Field | Where | Meaning |
|---|---|---|
| `chapters[] {id, startSceneId, profile?}` | design plan | A chapter runs from its start page to the page before the next start. Its profile applies to member pages without their own profile. |
| `disclosure {blockIds}` | design-plan scene | Supporting paragraph, list or callout blocks of that page, shown behind one closed **More detail** control. |
| `lockMode`, `lockedDatasetIds`, `lockedSourceIds` | `authorOverrides` | Separate data and source locks. |
| `schemas/design-profile.schema.json` | new contract | A reusable design profile. It has no field for text, data, sources, images or branding. |

Only the locks need a migration, and only when you want them separate:

```js
import {separateLocks} from './src/core/adapters/locks.mjs';
const next=separateLocks(project);
```

Expected result: a validated copy with `lockMode: "separate"`. Every dataset and source that a locked object implied (a chart's dataset, the block's sources and those of its step explanations) is now in `lockedDatasetIds` / `lockedSourceIds`. The input is not modified, and running it twice returns the same copy. In the Studio, the first **Data** or **Sources** lock runs it and says so.

Recovery:

- `AUTHOR_LOCK` when saving a hand-edited project: it set `lockMode: "separate"` without copying the implied locks, which would release them. Use `separateLocks()`.
- `INVALID_PRESENTATION … A locked dataset is missing` / `A locked source is missing`: a lock names an id that is not in the document.
- `INVALID_DESIGN_PLAN … A chapter starts on a missing page`, `Start at most one chapter on a page`, `Use unique chapter ids`, or `Chapter ids must differ from page ids`.
- `INVALID_DESIGN_PLAN … A page disclosure holds paragraph, list or callout blocks of the same page`, or `The focal block, the takeaway and interaction or annotation targets stay on the page`.

Lock rules for the new fields:

- A `composition` or `blockIds` page lock also freezes that page's disclosure.
- A text-locked block is never moved behind a disclosure.
- A page plan from `planPages()` carries a `basis` hash and its options; `applyPagePlan()` refuses it for any other version of the deck (`PAGE_PLAN_STALE`) and re-derives what it splits or marks.

Legacy fixtures and the negative fixture are checked by `node --test tests/s9a-author-controls.test.mjs`: `wave-a.*`, `families.en` and `evidence-scene.zh-CN` load unchanged, and every case in `tests/fixtures/visual/s9a.negative.json` is refused.

## References, intent and media (CINE batch 1)

Nothing to migrate. CINE batch 1 (2026-10-20, `docs/plans/cinematic-composition-build-map.md`) adds three optional fields to a scene of `schemas/design-plan.schema.json`. A project without them validates and renders as before: the markup of every recorded fixture and demo is byte-identical apart from the stylesheet and the renderer version (`visual-art-direction.13`), as `docs/evidence/cine-p0/baseline-diff.json` records.

- `references: {mode}` — how the page presents its citations. Absent means `expanded`: every citation is a full-width region, today's rendering. `compact` moves the citations to a source strip at the foot of the page, numbers each claim with the display markers of its sources and adds a closed reference panel with every source in full; a citation that attributes a quotation stays beside the quotation. `source-is-subject` keeps every citation as a region and flags the page. Markers are recomputed on every render in deck order; the stable key is the source id. Canonical sources, citation texts and claim bindings never change. PowerPoint notes and the PDF appendix list the markers only for a page that declares a mode.
- `intent: {purpose, entry, focusGroupBlockIds?, emptyRegions?}` — what the page is for (`explain`, `show-product`, `show-detail`, `compare`, `evidence`, `overview`, `chapter`) and where the eye enters (`left`, `center`, `contextual`). Absent means `inferred`: the purpose and entry are read from the content, the composition and the page's place in the deck, and nothing in the markup changes. A declared intent writes `data-purpose` and `data-entry` on the page's section, decides whether a short text page is open (centred) or structured, and steers the family's variant preference in the rhythm. The primary object is the existing `focalBlockId`; a citation cannot be the focal block once an intent is declared.
- `media: [{blockId, role}]` — the role of each image or diagram (`hero`, `mechanism`, `context`, `supporting`). Absent entries take the composition's defaults (the first image of an image page is the hero, both before/after images are heroes, diagrams are mechanisms, other images supporting). A declared list writes `data-media-role` on the regions; a supporting image is drawn at 260 px, a context image fills its column.

`authorOverrides.sceneLocks[].fields` accepts `references`, `intent` and `media`. The new author actions are `fit-page`, `set-intent` and `visual-space` ([Visual Studio](visual-studio.md#page-purpose-and-entry-cine-003)); the PDF export now pages a tall scene on the same bands as PowerPoint ([verification](verification.md)).

Recovery:

- `INVALID_DESIGN_PLAN … Choose a reference mode`, `… Quotation … needs an attributing citation on this page` (compact mode).
- `INVALID_DESIGN_PLAN … Choose a visual purpose`, `… The focus group must contain the focal block`, `… A citation cannot be the focal block of a page with a declared intent`, `… An empty region is a rectangle normalized to the page frame`.
- `INVALID_DESIGN_PLAN … A media role names an image or diagram of this page`, `… Give … one media role`.
- `SCENE_SPLIT` from `splitScene()` / `fit-page`: the cut would leave a page with only a heading, move the takeaway away from its claim, or separate an annotation from its target; `AUTHOR_LOCK`: the page's `blockIds` are locked.

Legacy fixtures and every case of `tests/fixtures/visual/cine.negative.json` are checked by `node --test tests/cine-p0.test.mjs`.

## Subject annotations, type roles and soft features (CINE batch 2)

Nothing to migrate. CINE batch 2 (2026-10-21, [plan](../plans/cinematic-composition-batch-2.md)) adds optional fields to the image slot brief (`schemas/asset-brief.schema.json`, copied into the design-plan and web-scene contracts) and type roles to the theme packs. A project without them validates and renders as before: legacy markup and content hashes are unchanged; the stylesheet is renderer `visual-art-direction.14` and the player `semantic-player.7` (both re-recorded in `tests/fixtures/visual/render-baseline.json`).

- `imageSlots[].brief.subjectBounds` — the drawn subject, a rectangle normalized to the original image. It is what the subject-fraction report calls annotated; without it the report says "no subject annotation" and treats the whole image as the subject (the conservative policy; nothing is detected).
- `protectedRegions[]` (max 8) and `contextRegion` — the crop floor and ceiling. `safeCrop` keeps every protected region and the existing `safeRegion` inside the crop and never extends the crop beyond the context region; when the floor cannot fit the asked aspect the crop is refused with `PROTECTED_REGION` and `contain` is the stated alternative. `focalPoint` and `safeRegion` stay required and authoritative.
- `visibleCaption` (≤ 300 characters) — the visible figcaption. The block's `alt` stays on `<img>`, is the PowerPoint picture description and is checked on the page; the caption is the slide and PDF text.
- `detailLocator: {blockId, region}` — another image of the same page that shows the whole object, and where this detail sits in it. The locator figure carries `data-locator-for` and draws the rectangle as a frame inside its crop.
- An evidence screenshot (brief `role: "product-screenshot"` with `factual: true`) is shown whole: every crop is refused with `PROTECTED_REGION`, `configureSlot` sets `display: "contain"`, and a saved plan whose evidence crop is not the full image is refused by name.
- Theme packs declare `typography.roles` (`title`, `lead`, `body`, `label`, `reference`, `numeric` in px at 1440 px; 1 px = 2/3 pt in PowerPoint). A page that declares `references`, `intent` or `media` takes the roles: its body and lead rise to the role sizes unless the page is dense (more than four text blocks, a list over six items, or over 250 measure units of body text, a CJK glyph counting two), and its section names `--label-size` and `--reference-size`; a page without a declared field keeps today's sizes. Compositions that pin their paragraph size (evidence, system map, small multiples) keep it; chart and diagram SVG labels are drawn by their compilers and are not resized.
- Measurements and diagnostics: the player reports every region's box and text-size range, every image's box, the source strip's height and a grayscale hierarchy audit; `checkRender` adds seven soft features and the weakest page ([definitions](../visual-acceptance/review.md#soft-features-cine-007)); `rankCandidates` orders the three candidates of a page hard gates first, then by the weighted soft features, and states the differences. None of it changes a saved project.

Recovery:

- `SAFE_REGION … The context region must contain the safe region, the subject and every protected region.`
- `PROTECTED_REGION … The protected subject cannot fit this crop. Use contain …` or `… Evidence screenshots are shown whole.`
- `IMAGE_SLOT … A detail locator names another image of this page.`
- `CANDIDATE_CONTENT … Compare candidates measured at one viewport …` (the A/B rule).

Legacy fixtures and every case of `tests/fixtures/visual/cine.negative.json` tagged `CINE-005` are checked by `node --test tests/cine-p1.test.mjs`.
