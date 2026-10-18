# Visual-first rebuild: Wave A

**Historical first slice.** The later [Visual Studio implementation](visual-studio.md) adds live v3 editing/storage, image binding and Electric Violet. The limitations below describe the earlier Wave A snapshot, not the current Studio.

[简体中文](../zh-CN/visual-first.md) · [Review](../evidence/visual-wave-a/review.md)

This is the first experimental slice of the 2026-10-18 visual-first roadmap. The existing Studio still edits v1/v2 projects. The new semantic web path is separate and requires explicit opt-in. It has two compositions, not the complete release gallery or a prompt-to-deck system.

## Open the examples

1. Use Node.js 22 or newer in the repository root.
2. Run `npm run visual:preview`.
3. Open the printed `http://127.0.0.1:…/` URL. Choose English or Simplified Chinese.
4. Read both scenes. Select **Present**, then **Next**, to move between them. Select **Reading view** to show both again.
5. Open **View all data** on the chart. Expect six periods, with final values 78 and 45. All numbers are explicitly synthetic.
6. Press `Ctrl+C` in the terminal to stop the local preview.

The cover uses live DOM text with diagonal SVG color fields. The evidence page uses a numeric dataset, SVG series, a semantic table and a separate evidence rail. Reading mode reflows at 390 px and remains available with JavaScript disabled. No font binaries, remote images, external scripts or providers are required.

Run `npm run visual:render -- --case wave-a --locale all` to write standalone files to `dist/visual/wave-a/`. Open `index.html` or either language file locally. `--help` documents the arguments. Only `wave-a` is implemented; requesting `release-gallery` fails explicitly.

## Contracts and copy migration

- `schemas/project.schema.json` remains the v2 Studio contract, with the unchanged v1 reader.
- `schemas/presentation-v3.schema.json` defines the experimental `deckweft-presentation` format. It keeps text blocks, numeric datasets, sources and locks separate from design choices.
- `schemas/design-plan.schema.json` binds stable block IDs to versioned themes and named compositions. Missing bindings, duplicate IDs and omitted blocks fail validation.
- `schemas/web-scene.schema.json` is the initial closed component/reading-order protocol. It does not accept executable HTML or JavaScript.
- Schema-derived TypeScript declarations and negative examples run in `npm run types`.

The semantic contract accepts heading, paragraph, list, quote, metric, table, chart, diagram, code, image, callout and citation blocks. Image blocks can round-trip through JSON, but HTML export refuses them until an asset resolver is implemented. Diagrams currently provide a semantic node/edge reading list; graph layout is still pending. Tables currently contain textual cells; chart series and metric values are numeric.

`migrateToPresentation(project)` in `src/core/adapters/legacy-project.mjs` validates a v1/v2 project and returns `{ document, plan, warnings }`. It does not save or mutate its input. The returned semantic copy archives the entire original and a source hash under `migration`. Legacy metric strings remain callouts; they are never guessed into numbers. Legacy assets, design, intent and private notes remain in the archived original and require manual review. The adapter creates a readable composition rather than claiming a lossless visual migration.

Use `exportDeck(document, 'html', { plan, experimentalWeb: true })` for the new path. JSON export preserves the complete semantic document, including migration archives. HTML includes only bound public blocks; it does not serialize the archive or private notes. V3 native/PPTX/SVG/Figma/motion exports fail with `TARGET_CAPABILITY`; valid HTML remains exportable. The v1/v2 store continues enforcing its existing revisions and history. V3 saving/editing in Studio is not implemented.

## Reproduce the evidence

```bash
npm ci
npm run verify
npm run visual:baseline
npm run visual:render -- --case wave-a --locale all
```

The baseline writes three frozen legacy decks: English product, Chinese strategy, and technical API/code material. The old renderer presents code/API rows as ordinary text; this limitation is retained for comparison.

Optional browser QA requires a separately installed Playwright module and an isolated testing browser. Set `CHROMIUM_PATH` to its executable **outside `/Applications`**. Set `PLAYWRIGHT_MODULE` to the module's absolute `index.mjs` path if it is not otherwise resolvable. Then run `npm run visual:capture`. These are QA tools, not new runtime dependencies. The harness refuses installed application paths, uses ephemeral contexts and binds only to loopback. It never changes browser app bundles or personal profiles.

Expect screenshots and `capture-manifest.json` in `dist/visual/capture/`. Capture waits for font readiness and image decode, checks DOM bounds, records actual Chromium platform fonts, measures text probes, checks exact table values and keyboard disclosure, tests presentation navigation and JavaScript-free reading, and rejects external requests or page errors. Source tree, input, output, render, browser-binary, screenshot and viewport/font/state fingerprints are recorded. Repeated output hashes apply to a fixed source/configuration; browser pixels require the same environment.

If `EXPERIMENTAL_WEB_REQUIRED` appears, explicitly enable the experimental export option. If `TARGET_CAPABILITY` appears, use HTML/JSON or keep native export on v1/v2. If capture cannot find its QA tools, render the deterministic HTML and record that browser inspection has not run. A fit report checks bounds and font availability; it is not an automatic aesthetic or contrast certificate. Inspect the screenshots, including the weakest pages.

## Remaining work

VIS-001–005 remain **partial**. Remote CI has not been run. The contracts still need full source snapshots, richer asset/crop and interaction geometry, target-specific native scenes and author profiles. Full theme packs, Electric Violet, the 12-page bilingual gallery, complete 8-page stories, composition candidates, bounded correction, host generation and Studio integration follow. No host, native application or release gate is closed by this slice.
