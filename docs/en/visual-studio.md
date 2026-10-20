# Visual Studio

[简体中文](../zh-CN/visual-studio.md) · [Build review](../evidence/visual-studio/review.md) · [Earlier Wave A](visual-first.md)

Visual Studio is the v3 editing workspace in the same local DeckWeft application, on the same shell as the classic workbench: a top band (Undo, deck title, state square, **More**, **Take away**), the page strip, the page, and **Words** above **Look**. Open a visual deck from **More → Backup and restore → My decks**, or open the address the studio prints: `/visual` redirects there, keeping the query. Existing v1/v2 projects remain in the classic workbench. Migration is explicit and creates a separate saved copy.

## Visual expression in existing presentations

The shared renderer gives existing v3 projects a content-aware type hierarchy. Openings use larger display type; evidence and comparison pages reserve room for their data. Cream Collage combines serif headlines, warm paper, blue numbers and a rust accent. Electric Violet pairs strong sans-serif headlines with quiet image pages and saturated authored chapters. Dark Data uses a deep green surface with light type and distinct chart colors. All fonts are system fallbacks; no font files or remote resources are loaded.

1. Open an existing presentation in Visual Studio. Inspect the opening, a content page and the ending. Expect different title tiers, bounded text widths and more deliberate space around focal content.
2. In **Look**, press **Larger type** (pressed by default: expressive contrast; pressing it again gives balanced contrast, which lowers the display tier) or **More space** (the page's editorial layout with comfortable density, which reduces crowding). These choices apply at once, keep exact text and data, and **Undo** takes them back.
3. Compare image compositions. Tall images scale within their authored aspect and crop; they are not stretched or cropped again to force a fit.
4. Read the three choices at the top of **Look**; they are compared automatically once the page is measured. Press **Choose for the whole deck** to apply measured rhythm only after reviewing them. The selector balances an entrance, proof and closing emphasis against adjacent repetition, and excludes failed candidates (marked *Does not fit*).
5. Check **Reading · 390**. Chinese has a separate reading type tier to avoid overly fragmented headlines. Original line breaks remain in the source.
6. Inspect and export the current work again. The same derived typography, spacing and palettes reach preview, filmstrip and audience HTML. Renderer changes invalidate previous review receipts; a previous accepted artifact remains explicitly historical.

Sparse scenes use open space; dense scenes retain every region and can grow or fail the presentation budget. Source citations stay visible. No source wording, numeric value, theme identity, crop or author lock is rewritten by these renderer rules. A visual change is not evidence that a claim is true.

## Start with the examples

1. Run `npm run studio:visual-demo` from the source checkout, using Node.js 22 or newer.
2. Open the printed Visual Studio URL. This command uses an isolated library under `dist/visual-studio/library`, rather than your usual library.
3. Select the English or Chinese example. Each has four scenes: Cream Collage cover, Dark Data evidence, Electric Violet image story and violet chapter.
4. Select page 3 on the page strip. In **Look**, inspect the colours and **Image** (the **i** shows rights, slot and crop). In **Words**, edit its words.
5. Wait for the state square in the top band to show *Saved on this computer* (autosave runs 1.2 s after the last edit), then reload. Expect your edits, theme, crop and preferences to remain.
6. Press **Take away → HTML** once the page has been measured. Open the file independently: it includes its runtime and local PNG bytes, with reading/presentation navigation.
7. Press `Ctrl+C` in the terminal to stop both local servers.

For your usual library, start `node bin/deckweft.mjs studio --open`, then follow the Visual Studio link. An empty library shows the first-run paste box: paste your text and press **Arrange**, or press **See an example first**. The demo's data is synthetic; its workbench image is retained generated decorative artwork, not documentary photography or product evidence. No model, image tool, remote provider or connector runs when an example is created.

## Edit facts and design separately

Select a page on the page strip. **Words** edits text, list items, numbers, chart numbers, image alternative text and other typed blocks; the deck title is in the top band. Chart values are JSON numbers; changing a series updates its marks and accessible table. Chart settings and code metadata are under a *settings* disclosure inside their card. Source references and versioned snapshot anchors have an advanced JSON editor under **More → For developers → Data editors**. Source records preserve attribution, not proof that a claim is true.

**Look** changes only the selected page. The six colours are Cream Collage (serif display type and diagonal planes), Dark Data (evidence rail, numeric charts and a dark palette), Electric Violet (large image split or a full-colour chapter with sans-serif display type) and the three S8 themes below. A compatible composition is chosen without rewriting facts, captions, asset references or other pages.

Author preferences persist colour intensity, type contrast (**Larger type**), density (**More space**), motion (**Let this page move**) and image emphasis. **Audience** is under **More → Let the assistant write for me**; **Output language** is under **More → Language**; the interface language is the one switch in the same section. Switching language does not translate existing words. Motion defaults to off, and system reduced-motion disables entrances. Prompt language, tone and preview width no longer exist: a draft sends the output language and a neutral tone, and the stage scales the 1440 px page.

Press **Lock this page** to protect the page: its text, data, sources and layout, and its theme, interactions, cues and motion. Locked chart content also protects its numeric dataset and linked source records. Press it again to release it. Locks remain during save, reload and theme changes, and the APIs reject conflicts rather than silently dropping locks. The lock state is shown read-only under **More → For developers**. Locking one kind at a time is left to the API (see [Look controls](#look-controls-chapters-and-locks-s9a)).

Use **Undo** / **Redo** in the top band for local edits (hold Undo for half a second to show Redo). Invalid JSON remains in its field when you switch pages, the state square asks for attention, and save and HTML export are blocked. Repair it, or press **Discard unapplied field edits** to retain the last valid content. Project JSON with unapplied fields is an explicit draft recovery wrapper; repair its fields before importing it as a visual project.

## Images and cropping

1. Select a page. In **Look → Image**, press **i** and choose **Use a local PNG**. (**Replace image** / **Add an image**, or dropping a picture on the page, opens the image import dialog.) The **i** also shows rights, slot, crop, the catalogue of images in saved local decks, and a text-led layout when you would rather not use an image; nothing here generates images.
2. Choose a PNG smaller than 1.3 MB. Supply provenance, license, allowed use, alternative text and a text fallback.
3. Attach it. An existing image block is replaced in place; its composition, crop, datasets and other author decisions remain.
4. Open **i** next to **Image** and set the normalized crop `x`, `y`, `width`, `height`. Keep `x + width ≤ 1` and `y + height ≤ 1`. A crop outside the original fails validation; it is not repaired automatically.
5. Wait for the state square to show the deck saved, and inspect the measured preview before exporting.

Local PNGs are content-addressed and verified against their hashes. Source bytes are preserved; crop changes use semantic image markup rather than creating a screenshot of the page. The built-in 2.4 MiB artwork is preloaded directly from the package; browser imports have the smaller limit above. Resource budgets count every scene binding, including repeated uses of the same image.

Missing or changed assets stop HTML export with a recovery message. Restore the hash-matching file, or attach a replacement deliberately. The [VIS-007 asset workflow](assets.md) adds preserved JPEG/WebP originals, local derivatives, author-protected crop choices and source-document reuse. Automatic subject detection and a v3 image-generation transport remain unavailable.

## Save, history and recovery

Visual projects live under `<library>/visual/projects/`; image bytes are in `<library>/visual/assets/`. V1/v2 projects stay under the original library paths. Both stores use the same atomic-write, revision-conflict, immutable-history and restore-as-copy implementation.

Decks save on their own 1.2 s after your last edit. The square in the top band shows the state: saving, saved, unsaved or needing attention. If another window saved first, nothing is overwritten: your edits stay in the window, the square turns red and a banner says so. Press ⌘/Ctrl S to be offered a separate copy, or keep your edits with **Project JSON** (**More → Backup and restore**) and open the newer version. If you edit during a save, only that save's snapshot is committed; later edits are saved next. After a save the page is measured again.

Open **More → Earlier versions → Version history**, inspect a read-only snapshot, then select **Restore as a new copy**. The current project remains unchanged. Retrying the same restore request reuses its existing copy.

Old v1/v2 projects are not migrated in Visual Studio. To bring a saved one over, open it in the classic workbench and press **Make a new-version copy** (the API route `POST /api/visual/migrate` does the same). The original JSON and its hash are archived. Legacy metric strings remain text; old assets, design intent and private notes are retained in the archive with explicit limitations. Migration does not guess chart numbers or claim visual parity.

Project JSON is the complete private envelope: semantic document, plan, asset manifest, revisions and archives. It references local asset files rather than embedding them; keep the assets folder for transfer to another library. Import validates the original envelope before assigning a new copy identity. HTML is portable and embeds the required images, but omits migration archives and private notes. PowerPoint and PDF are in **Take away** when the studio runs with an isolated capture browser (see [Take away](#take-away)). Project JSON is under **More → Backup and restore**. V3 Figma, AE and SVG export remain unsupported and fail explicitly; classic Studio retains its existing exporters and presenter.

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

1. Run `npm run studio:compositions`. Open the printed Visual Studio address. This uses `dist/visual-compositions/library` and seeds two six-page examples. In another visual library, open **More → For developers → More examples → New six-family example**.
2. Select a page. To choose its composition family by hand, open **More → For developers → Composition family**. Families requiring a missing image, metric, chart, table or diagram are disabled. Every family includes three different structures; changing the family keeps all existing blocks.
3. Read the three choices at the top of **Look**. Expect three real previews and a measured status for each. The browser measures all pages at 1440px after fonts and images are ready and compares the choices automatically 0.6 s later, and again after each edit or save. Use **View larger** to inspect one, then close the inspection window.
4. Press a passing choice to use it, or press **Choose for the whole deck** to choose across all pages. The rhythm considers narrative suitability for the opening, scene role and closing, together with actual focal position, occupied content area, image area, color mode and repeated adjacent geometry. It chooses compositions in the current page order; it preserves themes, color modes, focal bindings, crops, facts, sources, assets and locks. The combined rhythm cost is a layout heuristic, not a quality or truth score. A basis-hashed decision report is saved in the project's extensions when rhythm is applied; the report and its status are under **More → For developers**.
5. Inspect the updated preview. Autosave keeps it: reload and expect the chosen compositions to remain. **Undo**, revision conflict handling and **More → Earlier versions → Restore as a new copy** work as before.
6. Use the ↑ / ↓ buttons under **Look** to change page order. Themes follow stable page identities. Edit or reorder, then wait for the choices to be measured again: old measurements cannot be used for changed content.

A candidate fails if content overflows, is clipped, has inadequate measured contrast, uses an unready font, or exceeds the 900px presentation height budget at 1440px width. Failure retains the full content and shows the reason. If all candidates fail, selection stops: retain the wording and repair the layout or deliberately divide the material into additional pages. Reading views can grow vertically; the height budget is a presentation-candidate gate. Choices are measured again when a measurement expires (ten minutes) or the page changes, and saving invalidates receipts tied to the previous revision.

The six families are statement (split/banner/center), image narrative (left/sequential/right), oversized number (left/band/right), data evidence (plot left/full width/plot right), comparison (matrix/side rail/dimension cards), and process (horizontal/vertical/stepped). English and Chinese representative content was checked under Cream Collage, Electric Violet and Dark Data. [Measured geometry, screenshots, failures and repairs](../evidence/vis-006/review.md).

## Six more composition families (S3)

S3 adds six families to the six above, so a page can now use twelve. They are never inferred from content: choose them yourself.

1. Select a page and open **More → For developers → Composition family**. The new families follow the original six: Chapter, Before / after, System map, Small multiples, Quotation, Conclusion / next step. A family is disabled when the page lacks its required block.
2. Look at the three choices at the top of **Look**. Expect three measured previews. If the page breaks a family contract, the choices stop with a reason (for example *Attribute every verbatim quotation*). Nothing is repaired or removed for you.
3. Choose a passing choice, or **Choose for the whole deck**. Your family choice is kept; rhythm only picks among its three geometries.
4. Wait for the state square to show the deck saved, then reload. The composition stays.

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

**Choose for the whole deck** now also follows three handoff rules. The report under the button lists any that remain:

- The same composition appears at most twice in a row. Runs of one comparison family (comparison, process, before / after, small multiples) are allowed: a sequence may keep its structure.
- No three heading-plus-cards pages in a row (comparison dimension cards or next steps in one row, with three or more cards).
- A 10–15 page deck uses at least four families. Families come from your content and choices, so this rule is advice. The report suggests pages that could use an unused family; nothing changes on its own.

Author choices win. A composition locked with **Lock this page** is kept even when it breaks a rule; the report marks it *kept: author lock*. A rule that remains without a lock means no measured candidate could avoid it.

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

1. Select a page and pick one of the six **Colours** in **Look**, one of the three above. Expect the page to keep every block and to take the theme's own composition by content: a chart gets `…-figure`, a metric gets `stage-metric` on the stage, a text page gets the theme's cover.
2. Choose the theme's other compositions from **More → For developers → Composition family** as before. A theme-only composition refuses another theme and names the block it needs (for example *atlas-panels needs at least 2 chart panels*); nothing is removed for you.
3. Use the three choices in **Look** and **Choose for the whole deck** as before. Rhythm varies geometry within the shared families; a theme-only composition stays until you change it.
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

## Look controls, chapters and locks (S9a)

The S9a author actions used to sit in an **Author controls** panel with a scope list and a plan box. On the shared shell the ones a person reaches for are buttons in **Look**; the finer ones left the browser (end of this section). Every button in **Look** applies at once: there is no Apply / Cancel step. Under the buttons the page states what changed and what a lock kept, **Undo** in the top band takes the change back, and autosave keeps it.

1. Select a page on the page strip and read **Look** from the top. (Below 1050 px, or on a phone, **Edit** opens **Words** and **Look** as a sheet.)
2. **Choices.** The top of **Look** always shows three measured choices of the page. Press one to use it. A choice that does not fit is marked *Does not fit*. **Choose for the whole deck** picks across all pages.
3. Press **More space**. Expected: the page moves to its family's editorial layout (claim first, asymmetric; Editorial Fieldnotes pages to their own cover, thesis, method, figure or closing layout) with comfortable density. It never changes the theme or a word. It is disabled while the page's layout is locked.
4. Press **Larger type**. It starts pressed (expressive type contrast). Expected: pressing it again switches the deck to balanced contrast, which lowers the display tier; pressing it once more returns.
5. Press **Lock this page**. Expected: the button stays pressed and a line says it *Holds this page's colours and motion*. The page's text, data, sources and layout are locked, and so are its theme, interactions, cues and motion. Press it again: the same locks come off (*Releases this page's colours and motion*).
6. Press one of the six **Colours**. Expected: only this page's theme changes, with a composition that fits its content and the same colour mode. A theme-only composition refuses another theme and names the block it needs.
7. Switch **Let this page move** on. Expected: the ways a page can move appear: **Add explanations to this page**, **Make this page Explain → Diagram → Explore**, **Page transition** (*Follow theme*, *Off* or *Subtle*), **Use current chart / step as opening** and **Still picture for print**. The page moves once one is chosen. Switch it off: the page becomes still, by removing its interactions, cues and transition. **Undo** brings them back.
8. **Image.** Pages with an image show **Replace image** (or **Add an image**) and an **i**. See [Images and cropping](#images-and-cropping).
9. **Three directions.** Choose **Less**, **Medium** or **More** and press **Show three directions**. Nothing is applied until you choose a card. See [Three directions](workbench.md#three-directions-s9a).
10. **↑ / ↓** under **Look** change the page order.

**Chapters.** Right-click a thumbnail on the page strip (or focus it and press the context-menu key or Shift F10). Choose **Start a chapter here** or **Remove this chapter**. Expected: the thumbnail carries a *Chapter* mark. A chapter runs to the page before the next chapter start and takes the profile of the chapter it splits, so nothing renders differently. Chapters follow page order, so moving or splitting pages never leaves a gap.

**What the Look buttons do not do.** *More space*, *Larger type* and the colours keep exact text, data, sources, crops and other pages. A lock is never overridden: the plan under the buttons names every item a lock kept.

**Page disclosure.** Text moved behind **More detail · n items** by the finer author actions appears after the composition. Readers open it on the page; no JavaScript is needed. PowerPoint puts the text in the slide notes with a receipt per block. The PDF puts it on the notes pages.

**Four levels.** Preferences resolve most specific first: object, page, chapter, deck. A page profile beats its chapter's profile, which beats the deck profile. The same order reaches the player: a chapter or page with motion off plays no motion, and the deck's *off* still wins everywhere. The buttons in **Look** act on the open page; the other scopes are in the API.

**Locks.** In the browser there is one lock, **Lock this page**; the per-field lock boxes are gone. The lock state is shown read-only under **More → For developers**. The API still locks *Text*, *Data*, *Sources* and *Composition* separately: text locks the object as written, data locks the dataset (values, units, definitions, missing reasons, events and intervals), sources locks the source records and composition locks the page layout. The first data or source lock runs the explicit migration `separateLocks()` and says so; in older (combined) decks it copies the implied locks, so nothing is released. Every lock survives theme changes, saving a source update, and **More → Earlier versions → Restore as a new copy**.

**Moved to the API.** These S9a actions have no browser control any more; `POST /api/visual/author-action` still runs them, with the same plan, scope statement and lock checks: reduce text, give the chart more space (including splitting a page of more than two panels), make quieter, keep this layout, replace the visual, lock and unlock one kind, start and remove a chapter, and apply a profile. So do the image review (capture, review, report and reviewed export of a workbench deck) and page planning (`POST /api/visual/page-plan` and `/page-plan/apply`); see [the workbench manual](workbench.md#image-review-and-page-planning-api-only). `tests/browser_author_controls.mjs` and `tests/browser_workbench.mjs` call each of them.

### Page purpose and entry (CINE-003)

Under the **Look** buttons, two selects state what the open page is for and where the eye enters. Both start at *Automatic*: the page's purpose and entry are then inferred from its content and composition and nothing is written to the plan.

1. Choose a **Page purpose** (*Explain*, *Show the product*, *Show the detail*, *Compare*, *Evidence*, *Overview*, *Chapter*). Expected: the plan box says *purpose …, entry …*; when the page's family has a preferred layout for that purpose (an image page with *Show the product* → headline → text left / image right), the composition changes to it and the box names the old and new layout. A composition lock keeps the layout and says so. Text, data and sources never change. **Undo** takes it back.
2. Choose an **Entry** (*Left*, *Centre*, *Where the composition points*). Expected: a short text page with a left entry starts at the top of the page instead of centring; a centred entry keeps the open, centred space. The page's section carries `data-purpose` and `data-entry`; a page left at *Automatic* carries neither and renders as before.
3. Choose *Automatic* under **Page purpose**. Expected: the declaration is cleared and the page is inferred again; the composition stays as it is.
4. Press **Give the visual more space** (enabled on pages with an image or a diagram). Expected: the page takes the layout that draws its primary image largest (measured at 1440 px: *Headline → text left / image right*; in Luminous Stage its own stage hero) or, for a diagram, the wide system map; the image's role is stated as *hero* (a diagram as *mechanism*; a second image becomes *supporting*, drawn at 260 px); supporting paragraphs and lists after the first move behind **More detail** (the first stays as the page's explanation, as *Reduce text* does). The plan box names each change. A composition lock keeps the layout; a `media` lock keeps the roles. The API action is `visual-space` (levels `page` and `object`: at object level the chosen image becomes the hero).

The API action is `set-intent` (`POST /api/visual/author-action`, level `page`, options `{purpose, entry}`; `purpose: null` clears). Compact references have no browser control in this batch: set `references: {mode: "compact"}` on the page through the API or the project JSON ([migration](migration.md#references-intent-and-media-cine-batch-1)); the strip, the markers and the panel then render on the page and in both exports. An `intent` lock (`sceneLocks[].fields`) keeps the declaration; a page whose focal block is a citation refuses a declared intent.

### Take away

1. Press **Take away** in the top band. Expected: the dialog *Take your story with you.* lists **Present**, **HTML**, **PowerPoint** and **PDF**. Present and HTML stay greyed out until the page has been measured.
2. **Present** opens the full presentation in a new tab. **HTML** downloads the offline file.
3. **PowerPoint** and **PDF** need the studio to run with `--capture-browser /absolute/isolated/chromium`; without it they are greyed out with the note *Needs the isolated checking browser*, and the server refuses with `TARGET_BROWSER_REQUIRED`. With it, pressing one selects that format. For PowerPoint the dialog offers **Pages taller than a slide**: *Split into slides so the text keeps its size (auto)*, the default, or *Keep every page whole (none)*.
4. Press **Export**. The current measured preview is measured again as a static scene and compiled through the export order (ready → static-state → freeze → stop-motion → reveal → render → check). The status turns green and lists the stages, the L1/L2/L3 counts, the number of element receipts and how many tall pages were split. A file that fails its own check is refused (`EXPORT_CHECK_FAILED`) and never downloaded.
5. When the only failed check is the typography result (text under the presentable minimum, F1), the status turns **yellow** and lists every failure (page, role, actual and required size, shape); nothing is downloaded. Choose *Split into slides*, shorten the page, or tick **Export with these text sizes anyway** and export again: the file is then downloaded, the export report records `typography.acceptedBy: 'author'` with the time, and the status stays yellow with the acceptance time. Acceptance never turns the result green, and opening the dialog again starts without it.
6. A workbench deck (a draft from **Let the assistant write for me**) exports only after its image review passed for the current content. The review is not in the browser; run it through the API ([workbench manual](workbench.md#image-review-and-page-planning-api-only)). A deck made with **Arrange** is a plain v3 deck and is not held by it. A page marked evidence-required refuses every final export.
7. **Project JSON** (the complete backup) and **Last accepted HTML** are under **More → Backup and restore**, not in this dialog.

Open the file in PowerPoint, Keynote or a PDF reader yourself: these exports are package-checked here, not application-verified.

### If something goes wrong

- *Does not fit* on every choice: keep the content. Choose another colour, shorten the text yourself, or split the page.
- *composition locked; kept*: press **Lock this page** again to release the page if you want the button to change it.
- A line under the buttons says *Already quiet* or *Nothing to move*: the control found nothing to change.
- *`EVIDENCE_REQUIRED`*: supply the evidence and set the page sourced, or set it illustrative (through the API).
- *`EXPORT_CHECK_FAILED`*: the message lists the failed check per page; change that page and export again. When the typography result is the only failure, the dialog shows it in yellow instead and offers the paging option and the author's acceptance (above).
- The square is red and a banner says another window saved first: press ⌘/Ctrl S to offer the separate copy.

[S9a evidence, traces and contact sheets](../evidence/s9a-author-controls/review.md) · [step 3 evidence: where each control went](../evidence/single-entry/step3/README.md) · [workbench steps](workbench.md#three-directions-s9a)

## Explain → Diagram → Explore pages (S9b)

A page with a heading, a paragraph or callout and one diagram can become an Explain → Diagram → Explore page (blueprint A). The reader's side is in [interactions](interactions.md#explain--diagram--explore-blueprint-a-s9b); the evidence is in the [S9b review](../evidence/s9b-blueprint-a/review.md).

1. Select the page. Open **Look** and switch **Let this page move** on.
2. Press **Make this page Explain → Diagram → Explore**. Expected: the message says the page is now Explain → Diagram → Explore; the preview opens the page on Explain with the stage pills; **Still picture for print** lists *Explain*, *Diagram · the whole* and *Explore · (first part)*; a hint says PowerPoint and PDF exports refuse the page until you choose its still picture. The heading is the question, the first paragraph or callout the short answer and each diagram node a part, in node order. No block changes.
3. Edit the words under **Step explanations** in **Words**: *The whole object · name* (it starts as the part labels joined by arrows), *The whole object · explanation*, and each part's label and explanation (they start as the node label and note). Existing explanations of the diagram's nodes are kept.
4. Choose the still picture: **Diagram** or an **Explore** state. Expected: the hint reads *Static state: …* and says that readers without JavaScript, PowerPoint and PDF get the whole object with every part and its explanation, while the player still opens on Explain.
5. Wait for the state square to show the deck saved and for the page to be measured (**Take away → HTML** is no longer greyed out), then export. The measurement covers the opening and every key state of the page. **PowerPoint** and **PDF** (Studio started with `--capture-browser`) export the complete explanation; the message lists the export stages.

**Undo** and **Redo** reverse the whole action, autosave keeps it and **More → Earlier versions** restores it as a copy. Locks:

- With **Lock this page** pressed (it holds the page's interactions, cues and motion), the button is disabled.
- A locked diagram is refused: *Unlock the diagram first.* Press **Lock this page** again to release the page.
- A locked page (cues and motion) keeps its still picture: unlock it before choosing another.

### If something goes wrong

- *This page needs exactly one diagram on the page*: add one, or move the second diagram to another page. A diagram behind **More detail** does not count.
- *Add a heading (the question) and a paragraph or callout (the short answer)*: add them, then click again.
- *An Explain → Diagram → Explore page has one explanation sequence*: move the page's other interactions to another page first.
- *This diagram's steps explain relationships*: blueprint parts are nodes; remove that steps interaction in **More → For developers → Data editors → Authored interactions, cue order and motion · JSON**, then click again.
- *Page …: Choose the static state…* or *The Explain stage does not show the object…* on export: choose Diagram or an Explore state (step 4), save and export again.
