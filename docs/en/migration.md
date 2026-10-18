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
