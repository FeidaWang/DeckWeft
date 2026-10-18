# The deck is a labelled box

A project holds the title, language, theme, and slides. Each slide holds its words,
its layout choice, and optional movement. The layout engine turns those words into
text boxes and shapes. It does not write or verify the words.

The exact contract is `runtime/schemas/project.schema.json` in the plugin package.
Create a valid file with the bundled `new` command, then edit that file.
Resolve the absolute runtime location from SKILL.md. The following commands assume
you have changed into that runtime folder (where `bin/` and `schemas/` exist).

```sh
node bin/deckweft.mjs new --outline outline.md --out talk.deck.json
node bin/deckweft.mjs layouts talk.deck.json
node bin/deckweft.mjs check talk.deck.json
node bin/deckweft.mjs export talk.deck.json --format pptx --out talk.pptx
```

`content.title` is the big sentence. `content.body` explains it. `content.items` is
an array of short supporting points. `content.metrics` is an array of
`{"value":"4", "label":"layout choices"}` objects. The app never invents a chart
from these strings. To add citations, put `{id,title,url}` objects in project
`sources` and add their ids to the slide's `sourceIds`.

Use `design.layout: "auto"` or `editorial`, `spotlight`, `grid`, `timeline`.
Use `motion.preset: "none"`, `"fade"`, or `"rise"` and a duration from 2–60 seconds.
A project uses `format: "deckweft"`, `schemaVersion: 1`. It is not the old schema 2.
Do not delete unknown legacy information from `extensions.legacy.original`.
