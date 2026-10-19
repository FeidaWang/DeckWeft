# Migration: keep the old recipe before making a new one

[中文](../zh-CN/migration.md) · [Home](../../README.md)

The predecessor names were Open Deck Skill and Open Deck Astra. DeckWeft is a new identity, not a global search-and-replace that changes copyright notices or pretends every old format is supported.

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

Legacy fixtures and the negative fixture are checked by `node --test tests/s9a-author-controls.test.mjs`: `wave-a.*`, `families.en` and `evidence-scene.zh-CN` load unchanged, and every case in `tests/fixtures/visual/s9a.negative.json` is refused.
