# Plan a story and its visuals

[简体中文](../zh-CN/planning.md) · [Agent connection](agent-bridge.md) · [Effort evaluation](astra-evaluation.md)

1. Open the Studio and choose a local project.
2. Select **Plan story** in the tool rail. Enter a brief. Separate proposed slide claims with a blank line to create a new sequence; a single paragraph retains the supplied slides.
3. Select **Propose storyboard**. Expected: one card per slide with its claim, audience, supplied evidence references, visual family and editable speaker script. This local proposal arranges supplied content; it does not research or invent evidence.
4. Review each card. Select cover, comparison, process, timeline, metric or image + caption. Existing version 2 choices and assets survive a proposal that retains the slides.
5. Select **Approve and save a version 2 copy**. Expected: a separate project opens. The source remains intact. If validation fails, repair the named field and retry; no source file is silently upgraded.
6. Use **Design → Semantic visual plan** to revise the selected slide. Comparison, process, timeline and metric support item exploration when there are items. HTML provides buttons, arrow keys, Home/End and a text alternative. SVG, PowerPoint and handoffs show all content and identify the initial state. Cover and image + caption remain static.

Version 1 projects keep the four existing layout choices. Version 2 uses the reviewed semantic recipe. Both use the same measured scene for preview and export. An overflow blocks visual export; shorten the marked content or split the slide. Runtime code has no new package dependencies.

## Local images

1. On a version 2 slide, open **Design → Local image and rights**.
2. Enter provenance, license, allowed use, alternative text and an offline text fallback. These are the author's declarations, not a legal verification.
3. Select **Import local PNG** and choose a PNG smaller than 1.3 MB. Expected: the file is stored separately under the selected library's `assets/<sha256>.png`; project JSON contains metadata only. The slide switches to image + caption.
4. Export HTML or PowerPoint. Expected: an individual image and editable text. Missing files show the declared text fallback. A changed hash or excessive asset budget blocks loading with a recovery message.

The registry accepts PNG only, limits file dimensions/size, rejects symlink paths and checks hash/dimensions on reopen. Library reads also limit total image bytes, decoded pixels and projected preview payload. Direct registry tools have a 4 MB file ceiling. SVG input, generated images, crop/focal-point controls and provider requests are outside this batch.

Keep the `assets` folder with a JSON backup. HTML and PPTX embed the images they use. The MB-11–15 follow-up adds optional image jobs and embedded-media Figma/AE handoffs; actual design-app acceptance remains open. See [media and workers](media-workers.md).

## Explicit CLI migration

```bash
node bin/deckweft.mjs upgrade old-v1.deck.json --out reviewed-v2.deck.json
node bin/deckweft.mjs check reviewed-v2.deck.json
node bin/deckweft.mjs export reviewed-v2.deck.json --format pptx --home /absolute/path/to/library --out reviewed.pptx
```

Expected: the old file remains unchanged and the new project has a new id, revision 0, typed intent and a migration source hash. Keep both files. Without `--home`, CLI asset lookup uses the input file's directory. CLI text fitting remains an offline estimate; the Studio measures actual browser text.
