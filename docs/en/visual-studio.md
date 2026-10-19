# Visual Studio

[简体中文](../zh-CN/visual-studio.md) · [Build review](../evidence/visual-studio/review.md) · [Earlier Wave A](visual-first.md)

Visual Studio is the v3 editing workspace in the same local DeckWeft application. Open **Visual Studio · v3** below the classic Studio's library selector, or open `/visual` on its printed loopback address. Existing v1/v2 projects remain in the classic workspace. Migration is explicit and creates a separate saved copy.

## Visual expression in existing presentations

The shared renderer gives existing v3 projects a content-aware type hierarchy. Openings use larger display type; evidence and comparison pages reserve room for their data. Cream Collage combines serif headlines, warm paper, blue numbers and a rust accent. Electric Violet pairs strong sans-serif headlines with quiet image pages and saturated authored chapters. Dark Data uses a deep green surface with light type and distinct chart colors. All fonts are system fallbacks; no font files or remote resources are loaded.

1. Open an existing presentation in `/visual`. Inspect the opening, a content page and the ending. Expect different title tiers, bounded text widths and more deliberate space around focal content.
2. Select **Edit page → Design** to adjust typographic contrast or density. Balanced contrast lowers the display tier; compact density reduces spacing. These choices keep exact text and data.
3. Compare image compositions. Tall images scale within their authored aspect and crop; they are not stretched or cropped again to force a fit.
4. Use **Explore compositions and story rhythm → Compare three compositions**. Apply measured rhythm only after reviewing the candidates. The selector balances an entrance, proof and closing emphasis against adjacent repetition, and excludes failed candidates.
5. Check **Reading · 390**. Chinese has a separate reading type tier to avoid overly fragmented headlines. Original line breaks remain in the source.
6. Inspect and export the current work again. The same derived typography, spacing and palettes reach preview, filmstrip and audience HTML. Renderer changes invalidate previous review receipts; a previous accepted artifact remains explicitly historical.

Sparse scenes use open space; dense scenes retain every region and can grow or fail the presentation budget. Source citations stay visible. No source wording, numeric value, theme identity, crop or author lock is rewritten by these renderer rules. A visual change is not evidence that a claim is true.

## Start with the examples

1. Run `npm run studio:visual-demo` from the source checkout, using Node.js 22 or newer.
2. Open the printed Visual Studio URL. This command uses an isolated library under `dist/visual-studio/library`, rather than your usual library.
3. Select the English or Chinese example. Each has four scenes: Cream Collage cover, Dark Data evidence, Electric Violet image story and violet chapter.
4. Select scene 3. Open **Design** to inspect the theme, author preferences and image crop. Open **Content** to edit its words.
5. Click **Save**, then reload. Expect your edits, theme, crop and preferences to remain.
6. Click **Export HTML** after the measured-preview indicator appears. Open the file independently: it includes its runtime and local PNG bytes, with reading/presentation navigation.
7. Press `Ctrl+C` in the terminal to stop both local servers.

For your usual library, start `node bin/deckweft.mjs studio --open`, then follow the Visual Studio link. An empty visual library offers **New visual example** or **Bring an existing deck**. The demo's data is synthetic; its workbench image is retained generated decorative artwork, not documentary photography or product evidence. No model, image tool, remote provider or connector runs when an example is created.

## Edit facts and design separately

Select a scene in the left rail. The Content panel edits text, list items, numeric metrics, exact chart datasets, image alternative text and other typed blocks. Chart values are JSON numbers; changing a series updates its marks and accessible table. Source references and versioned snapshot anchors have an advanced JSON editor. Source records preserve attribution, not proof that a claim is true.

The Design panel changes only the selected scene's theme/composition. Cream Collage uses serif display type and diagonal planes; Dark Data uses an evidence rail, numeric charts and a dark palette; Electric Violet uses a large image split or a full-color chapter with sans-serif display type. A compatible composition is chosen without rewriting facts, captions, asset references or other scenes.

Author preferences persist color intensity, typographic contrast, density, motion and image emphasis. **Audience** and **Output language / font preference** belong to the document; **Interface language** belongs to the local UI. Switching language does not translate existing words. Motion defaults to off, and system reduced-motion disables entrances.

Lock individual content blocks or the current scene's theme/composition. Locked chart content also protects its numeric dataset and linked source records. Unlock explicitly before editing protected content. Locks remain during save, reload and theme changes. The APIs reject conflicts rather than silently dropping locks.

Use **Undo** / **Redo** for local edits. Invalid JSON remains in its field when you switch scenes and blocks save/HTML export. Repair it, or click **Discard unapplied field edits** to retain the last valid content. Project JSON with unapplied fields is an explicit draft recovery wrapper; repair its fields before importing it as a visual project.

## Images and cropping

1. Select a scene. In Design, choose **Use a local PNG**.
2. Choose a PNG smaller than 1.3 MB. Supply provenance, license, allowed use, alternative text and a text fallback.
3. Attach it. An existing image block is replaced in place; its composition, crop, datasets and other author decisions remain.
4. Set normalized crop `x`, `y`, `width`, `height`. Keep `x + width ≤ 1` and `y + height ≤ 1`. A crop outside the original fails validation; it is not repaired automatically.
5. Save and inspect the measured preview before exporting.

Local PNGs are content-addressed and verified against their hashes. Source bytes are preserved; crop changes use semantic image markup rather than creating a screenshot of the page. The built-in 2.4 MiB artwork is preloaded directly from the package; browser imports have the smaller limit above. Resource budgets count every scene binding, including repeated uses of the same image.

Missing or changed assets stop HTML export with a recovery message. Restore the hash-matching file, or attach a replacement deliberately. The [VIS-007 asset workflow](assets.md) adds preserved JPEG/WebP originals, local derivatives, author-protected crop choices and source-document reuse. Automatic subject detection and a v3 image-generation transport remain unavailable.

## Save, history and recovery

Visual projects live under `<library>/visual/projects/`; image bytes are in `<library>/visual/assets/`. V1/v2 projects stay under the original library paths. Both stores use the same atomic-write, revision-conflict, immutable-history and restore-as-copy implementation.

If another window saved first, your edits remain in the window. Export Project JSON to keep them, then open the newer version or import a separate copy. If you edit during a save, only that save's snapshot is committed; later edits stay dirty and can be saved next.

Open **History**, inspect a read-only snapshot, then select **Restore as a new copy**. The current project remains unchanged. Retrying the same restore request reuses its existing copy.

**Bring an existing deck** migrates the selected saved v1/v2 project. The original JSON and its hash are archived. Legacy metric strings remain text; old assets, design intent and private notes are retained in the archive with explicit limitations. Migration does not guess chart numbers or claim visual parity.

Project JSON is the complete private envelope: semantic document, plan, asset manifest, revisions and archives. It references local asset files rather than embedding them; keep the assets folder for transfer to another library. Import validates the original envelope before assigning a new copy identity. HTML is portable and embeds the required images, but omits migration archives and private notes. V3 PPTX/Figma/AE/SVG export remains unsupported and fails explicitly; classic Studio retains its existing exporters and presenter.

## Verification and contracts

```bash
npm ci
npm run verify
npm run visual:render -- --case studio --locale all
```

The last command writes deterministic three-theme standalone examples to `dist/visual/studio/`. `--case wave-a` retains the earlier two-scene fixtures. `--case release-gallery` is still unsupported. Use `--help` on the rendering and preview commands for their current arguments.

Optional direct-browser acceptance:

```bash
CHROMIUM_PATH=/isolated/test/browser PLAYWRIGHT_MODULE=/qa/playwright/index.mjs node tests/browser_visual_studio.mjs
```

Use a test browser outside `/Applications`. The harness refuses installed app paths and uses ephemeral contexts. Its artifacts go to `dist/visual-studio/acceptance/`. It exercises actual editing, locks, themes, datasets, in-flight/stale saves, history recovery, local image upload, legacy copy migration, export and no-JavaScript reading. Both language editions are captured at 390/1024/1440 widths, with actual platform-font evidence, DOM measurements, image decode and render/screenshot hashes. Negative cases insert white-on-white text and a clipped heading and require scene-specific failures.

The browser checks text bounds, clipping ancestors and text contrast against page surfaces and actual SVG path geometry. Gradient stops are checked conservatively. Fit receipts are explicitly browser-reported, bound to exact input and render hashes, and expire with their preview artifact. They are not cryptographic attestations or an independent accessibility certification. Export uses the same artifact that passed the current browser checks; subsequent edits invalidate it.

Contracts: `presentation-v3.schema.json`, `design-plan.schema.json`, `web-scene.schema.json`, `visual-project.schema.json`, and `theme-pack.schema.json`. Content and design remain separate. The derived scene protocol includes registered components, stable block/data bindings, groups, reading order, breakpoints, bounded SVG paths/transforms/clips/gradients and normalized image crops. No executable imported HTML is accepted. Themes are packaged versioned JSON with typography, spacing, image grammar, chart colors, motion, modes and scoped rules. Schema-derived types share these contracts.

This is local implementation evidence for VIS-002–005. The complete 12-page gallery, coherent eight-page stories, composition candidates, prompt generation, broader host acceptance, native v3 output and general visual correction remain later roadmap work. The current embedded-image demo is larger than the suggested 2 MB initial-payload target; media optimization/lazy loading is not claimed. Remote CI has not been triggered or passed by this work.

## Compare compositions and choose the deck rhythm (VIS-006)

1. Run `npm run studio:compositions`. Open the printed `/visual` address. This uses `dist/visual-compositions/library` and seeds two six-page examples. In another visual library, select **New six-family example**.
2. Select a page, open **Design**, and choose its composition family. Families requiring a missing image, metric, chart, table or diagram are disabled. Every family includes three different structures; changing the family keeps all existing blocks.
3. Click **Compare three compositions** below the main preview. Expect three real previews and a measured status for each. The browser measures all pages at 1440px after fonts and images are ready. Use **View larger** to inspect a candidate, then close the inspection window.
4. Choose **Use this composition** on a passing candidate, or **Apply measured deck rhythm** to choose across all pages. The rhythm considers narrative suitability for the opening, scene role and closing, together with actual focal position, occupied content area, image area, color mode and repeated adjacent geometry. It chooses compositions in the current page order; it preserves themes, color modes, focal bindings, crops, facts, sources, assets and locks. The combined rhythm cost is a layout heuristic, not a quality or truth score. A basis-hashed decision report is saved in the project's extensions when rhythm is applied.
5. Inspect the updated preview and rhythm explanations. Click **Save**. Reload and expect the chosen compositions to remain. **Undo**, revision conflict handling and **History → Restore as a new copy** work as before.
6. Use **Move up** / **Move down** to change page order. Themes follow stable page identities. Compare again after reordering or editing: old measurements cannot be used for changed content.

A candidate fails if content overflows, is clipped, has inadequate measured contrast, uses an unready font, or exceeds the 900px presentation height budget at 1440px width. Failure retains the full content and shows the reason. If all candidates fail, selection stops: retain the wording and repair the layout or deliberately divide the material into additional pages. Reading views can grow vertically; the height budget is a presentation-candidate gate. Comparing again replaces expired measurements (ten minutes), and saving invalidates receipts tied to the previous revision.

The six families are statement (split/banner/center), image narrative (left/sequential/right), oversized number (left/band/right), data evidence (plot left/full width/plot right), comparison (matrix/side rail/dimension cards), and process (horizontal/vertical/stepped). English and Chinese representative content was checked under Cream Collage, Electric Violet and Dark Data. [Measured geometry, screenshots, failures and repairs](../evidence/vis-006/review.md).

## Six more composition families (S3)

S3 adds six families to the six above, so a page can now use twelve. They are never inferred from content: choose them yourself.

1. Select a page and open **Design → Composition family**. The new families follow the original six: Chapter, Before / after, System map, Small multiples, Quotation, Conclusion / next step. A family is disabled when the page lacks its required block.
2. Click **Compare three compositions**. Expect three measured previews. If the page breaks a family contract, comparing stops with a reason (for example *Attribute every verbatim quotation*). Nothing is repaired or removed for you.
3. Choose a passing candidate, or **Apply measured deck rhythm**. Your family choice is kept; rhythm only picks among its three geometries.
4. Save and reload. The composition stays.

| Family | Needs | Three geometries (reading path) | 1440 / 1024 / 390 px |
|---|---|---|---|
| Chapter | heading; text only (no chart, table, diagram, image, metric, code) | headline low left, intro beside it · headline and intro left, contents index right · contents in a narrow margin, headline right | 2 / 2 / 1 |
| Before / after | exactly two images, both factual or both illustrations, shown at the same aspect ratio | baseline left, after right · text rail, baseline above after · baseline, what changed, after | 2 / 2 / 1 (triptych 3 / 3 / 1) |
| System map | a relationship diagram that branches or loops (a single chain is a process) | header row, full-width map, key row · map left, text right · key left, map right | 2 / 2 / 1; rail and key stack at 1024 |
| Small multiples | two or more charts with the same chart type, unit, fixed value axis (same range and scale) and, for line, area, stacked and heatmap, the same categories | panels side by side, notes below · heading beside the reading note, panels below · centered heading, note and key on a centre line, panels below | 2 / 1 / 1 |
| Quotation | a quote block, each quote attributed by a citation of one of its sources | centered quote · paraphrase left, quote right · full-width quote band | 1 / 1 / 1 (centre), 2 / 2 / 1 |
| Conclusion / next step | a list of next steps | conclusion left, steps right · steps in one row · centered conclusion and ask | 2 / 2 / 1 |

What each contract protects:

- **Before / after.** The first image in block order is the baseline. Every geometry places it first (left, top or first in the row) and labels both images *Before · baseline* and *After* above the frame, so the label is visible without interaction, in the no-JavaScript view and in print. Both frames have the same size. If the two images are shown at different aspect ratios, saving fails: crop them to the same framing. A comparison control on this page must pair the baseline with the changed image and may not open on the changed image alone.
- **Small multiples.** The shared scale is declared, not inferred: every panel needs a fixed value axis with the same range. Panels are always the same size. With the current chart drawing, two panels fit a 1440 px page; at 1024 and 390 px they stack. To split a page with more panels, call `splitSmallMultiples(project, sceneId, perPage)` from `src/design/rhythm.mjs`. Every page keeps the heading and the sources, the panels stay in order, and text blocks stay on the first page. It refuses pages with interactions, locks, or a page size that would leave one panel alone. There is no Studio control for this yet.
- **Quotation.** Verbatim words are the quote block, set in the display type with an ornamental mark. The citation that attributes it sits directly under it. Paraphrase is a paragraph, in body type, separated by a rule; it is never styled as a quotation. Speaker and organisation are written in the citation text: the quote block has no separate speaker fields.

### Rhythm rules

**Apply measured deck rhythm** now also follows three handoff rules. The report under the button lists any that remain:

- The same composition appears at most twice in a row. Runs of one comparison family (comparison, process, before / after, small multiples) are allowed: a sequence may keep its structure.
- No three heading-plus-cards pages in a row (comparison dimension cards or next steps in one row, with three or more cards).
- A 10–15 page deck uses at least four families. Families come from your content and choices, so this rule is advice. The report suggests pages that could use an unused family; nothing changes on its own.

Author choices win. A composition locked with **Lock this scene’s theme and composition** is kept even when it breaks a rule; the report marks it *kept: author lock*. A rule that remains without a lock means no measured candidate could avoid it.

### Theme changes keep the colour mode

Changing a page's theme now changes only its theme and, when needed, its composition. The colour mode is left as it was. Changing to another theme and back returns the original plan and the same render hash. Violet chapter is offered only when the page can use the chapter colour; a page whose colour mode is explicitly *default* gets reading flow instead.

### If something goes wrong

- *Show both states at the same aspect ratio*: edit one crop until both match, then save.
- *Declare the shared scale*: give every chart the same `axis: {policy: "fixed", min, max}`.
- *No measured candidate fits*: keep the content. Choose another family, shorten the text yourself, or split small multiples into more pages.

[S3 measured candidates, contact sheets, failures and open issues](../evidence/s3-composition-families/review.md).

## Three more themes: Editorial Fieldnotes, Research Atlas, Luminous Stage (S8, VIS-015)

S8 adds the design handoff's three first-wave art directions as theme packs under the planned VIS-015 ids ([decision 2, alignment §16](../plans/design-handoff-alignment.md#16-s8-decisions--t01t03-themes-and-vis-015-2026-10-19)). The three VIS-014 themes are unchanged. State: see the [VIS-015 evidence](../evidence/vis-015/review.md); the roadmap entry says what is supported.

| Theme | Direction | Type roles (platform fonts, nothing bundled) | Own compositions |
|---|---|---|---|
| `silver-gray-editorial` (T01) | Paper `#F3F0E8`, ink `#24241F`, terracotta `#A8503A`, slate numbers. Main column, margin notes, hairlines, generous space. | Display Charter (zh: Songti SC), body Gill Sans (zh: PingFang SC), numerals Charter | `fieldnotes-cover`, `fieldnotes-thesis` (two-column thesis with margin notes), `fieldnotes-figure` (narrow reading column, wide figure), `fieldnotes-method` (method text with a margin note), `fieldnotes-closing` |
| `fresh-report` (T02) | Paper `#FAFAF7`, ink `#15211B`, green `#286448`, cobalt `#345BC5`. Shared grid, numbered sections, figures take the main area. | Display and body Avenir Next (zh: PingFang SC), numerals Menlo (tabular) | `atlas-cover` (kicker, headline, contents index), `atlas-section` (section number), `atlas-figure` (single-chart conclusion), `atlas-panels` (two to four chart panels on one declared scale), `atlas-appendix` (table, limits, sources), `atlas-closing` |
| `orange-launch` (T03) | Surface `#0C1017`, text `#F2F3EE`, ice blue `#A8D2EA`. Dark stage, one large object, body text in the calm area. Static hero only: no shader, no WebGL. | Display Futura (zh: PingFang SC), body Helvetica Neue, numerals Futura | `stage-hero` (object right; without an image a drawn orb), `stage-chapter`, `stage-figure` (chart on a panel), `stage-metric`, `stage-closing` |

Every pack also lists the twelve shared families. The handoff's hex values were starting points: each foreground is measured against its own surface at the sizes it is used, and the measured ratios are in the evidence.

1. Select a page, open **Design → Scene theme** and choose one of the three. Expect the page to keep every block and to take the theme's own composition by content: a chart gets `…-figure`, a metric gets `stage-metric` on the stage, a text page gets the theme's cover.
2. Choose the theme's other compositions from **Composition family** as before. A theme-only composition refuses another theme and names the block it needs (for example *atlas-panels needs at least 2 chart panels*); nothing is removed for you.
3. Compare three compositions and apply rhythm as before. Rhythm varies geometry within the shared families; a theme-only composition stays until you change it.
4. Export. The same packs reach HTML, PowerPoint and PDF (`npm run export:targets -- --s8` runs the S8 decks).

Pairing: a deck may use Editorial Fieldnotes for the narrative and Research Atlas for the evidence chapters. Both share the type scale tiers, the citation role and the stable chart colour order, so a legend keeps its meaning across chapters.

### Token roles the renderer now consumes

The three packs declare the S1 token roles, and the page receives them as custom properties: `--numeric` (metric numbers, chart values, axis ticks, table numbers), `--reference` and `--missing` (reference lines, missing-value labels and notes), `--caption-gap`, `--section-gap`, `--safe-area`, and `--motion-distance`, `--motion-easing`, `--motion-delay`. A pack that declares none of them, like the three VIS-014 packs, renders exactly as before, because every consumer falls back to the previous literal value. The motion `fallback` (`instant` or `static`) is the reduced-motion result of a page that declared none itself.

### Chinese headings break between words (C12)

In a zh-CN document, headings, callouts and metric labels carry `<wbr>` at dictionary word boundaries and `word-break: keep-all`, so a line ends between words (三十六种 · 几何 · 结构) instead of inside one. Han numerals stay with their measure word. `<wbr>` has no text, so copied text, the coverage check and every exporter see the authored string. The scene's `overflow-wrap: anywhere` remains the last resort for a word longer than its column. Word boundaries come from the platform's ICU dictionary (`Intl.Segmenter`); the evidence records the ICU version.

### Missing glyphs are detected (C13)

The fit audit draws every distinct character of a page in its computed font on a canvas and compares it with the same font's `.notdef` box (the unassigned code point U+0378). A match is a missing glyph: the fit fails, the Studio gate answers `VISUAL_FIT`, a composition candidate reports *Missing glyph*, the quality pipeline files a `glyph` issue, and the export readiness stage refuses with `FONT_GLYPH_MISSING`. Change the text or the theme font; never export a box. The DevTools platform-font probe stays as a second signal where an engine reports a last-resort font.

### If something goes wrong

- *`atlas-panels` needs at least 2 chart panels* or *Declare the shared scale*: give every panel the same chart type, unit, categories and a fixed axis.
- *`stage-hero` … belongs to the orange-launch theme*: a theme-only composition was kept while the theme changed; choose the new theme's composition.
- *Missing glyph* on a page that looks fine: the character is drawn as a box in the chosen font family; check the fit report's `glyphs` list for the character and the font.
- A Chinese heading still breaks inside a word: the word is longer than its column at this tier, so the last-resort break applied. Shorten the column text, choose another composition, or add an authored line break.

For source preservation, named slots and protected crops, follow the [asset manual](assets.md). Run `npm run studio:assets` for the bilingual lab.
