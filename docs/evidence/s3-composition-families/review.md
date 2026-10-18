# S3 — six more composition families

2026-10-19 · started from `232060e` (S2). Step S3 of the [kickoff plan](../../plans/design-handoff-kickoff-prompts.md). [Browser receipt](report.json) · [Application check](app-availability.json) · [Manual](../../en/visual-studio.md#six-more-composition-families-s3) · [Alignment result](../../plans/design-handoff-alignment.md#12-s3-result--six-composition-families-2026-10-19).

State: **LocalVerified** for HTML layout in one browser engine (Chromium). No host, native export or other engine was run. Roadmap states are unchanged.

## Families chosen, and the one left out

| Handoff family | DeckWeft family | Required | Contract beyond the required block |
|---|---|---|---|
| Chapter | `chapter` | heading | Text only: no chart, table, diagram, image, metric, code or annotation. |
| BeforeAfter | `before-after` | image | Exactly two images. The first in block order is the baseline. Both factual, or both illustrations. Same displayed aspect ratio (2 % tolerance). An `image-compare` control must pair baseline → changed and may not open on the changed image alone. |
| SystemMap | `system-map` | diagram | Relationship diagrams only. The graph must branch or loop; a single chain is a process. |
| SmallMultiples | `small-multiples` | chart | Two or more panels. Same chart type, unit and fixed value axis (same min, max and scale). Line, area, stacked and heatmap panels share categories. Scatter panels also share a fixed x axis and unit. |
| Quote | `quote` | quote | Every quote block is attributed by a citation of one of its sources, in the same page. Paraphrase is a paragraph. |
| Conclusion / NextStep | `closing` | list | The list is the next steps. |

**Left out: Table / Reference.** The comparison family already requires a table and has three table geometries (matrix, rail, dimension cards). A reference family with the same required block cannot be told apart by content, so it would add a fourth way to lay out the same table rather than a new reading task. The method appendix the handoff pairs with it is progressive disclosure (F08), which belongs to the interaction work.

**Differences from the alignment proposal (§5).** The S3 instruction listed seven candidates. ProductStage and case-study were not among them and are not added; ProductStage is partly covered by the image family plus image hotspots. SmallMultiples, deferred in §5, is included as layout only: the shared scale is a declared fixed axis that the current chart renderer already draws. No chart code was changed.

All six families are **explicit**: they are chosen by composition id or the Studio family control, never inferred. Inference still returns the VIS-006 families, so existing projects and the other browser suites produce the same candidates.

## Geometry

Heights are the measured page height at 1440 px across three themes and two languages (810 px is the page minimum). Columns are the variant's `columns` metadata, checked in the browser at each width. With one column, regions stack in DOM order; with more, at least two regions sit side by side. At 390 px every region also shares one left edge.

| Variant | Route | Focus | Density | Columns 1440 / 1024 / 390 | Height |
|---|---|---|---|---|---|
| chapter-low | open space → headline low left → intro and contents beside it | bottom | .25 | 2 / 2 / 1 | 810 |
| chapter-index | headline and intro left → contents index right | left | .45 | 2 / 2 / 1 | 810 |
| chapter-margin | contents in a narrow margin → headline and intro right | right | .35 | 2 / 2 / 1 | 810 |
| before-after-split | headline → baseline left, after right → notes | top | .65 | 2 / 2 / 1 | 856–869 |
| before-after-rail | headline and notes left → baseline above after right | right | .55 | 2 / 2 / 1 | 851–856 |
| before-after-triptych | headline → baseline · what changed · after | center | .6 | 3 / 3 / 1 | 810 |
| system-map-wide | headline and note → full-width map → key row | top | .6 | 2 / 2 / 1 | 850–872 |
| system-map-rail | map left → headline, notes and key right | left | .65 | 2 / 1 / 1 | 810 |
| system-map-key | headline → key and notes left → map right | right | .6 | 2 / 1 / 1 | 850–872 |
| small-multiples-row | headline → equal panels side by side → notes | top | .7 | 2 / 1 / 1 | 863–889 |
| small-multiples-lead | headline left, reading note right → panels | left | .7 | 2 / 1 / 1 | 810 |
| small-multiples-center | centered headline → note and key on a centre line → panels | center | .65 | 2 / 1 / 1 | 863–889 |
| quote-center | kicker → centered verbatim quote → attribution → paraphrase | center | .3 | 1 / 1 / 1 | 810 |
| quote-split | headline and paraphrase left → quote and attribution right | right | .5 | 2 / 2 / 1 | 810 |
| quote-band | headline → full-width quote band → attribution, paraphrase | top | .45 | 2 / 2 / 1 | 810 |
| closing-split | conclusion left → next steps right | left | .5 | 2 / 2 / 1 | 810 |
| closing-steps | conclusion → next steps in one row → ask | top | .55 | 2 / 2 / 1 | 810 |
| closing-focus | centered conclusion → the ask → steps and summary | center | .35 | 2 / 2 / 1 | 810 |

What the layout guarantees:

- **Before / after.** The baseline is always first: left, top or first column, and first in DOM order. Both images carry a label above the frame, *Before · baseline* / *After* (*之前 · 基线* / *之后*). The label is CSS-generated, so it shows without interaction, in the no-JavaScript view and in print, and Chromium exposes it to assistive technology. Both frames have the same size.
- **Quote.** The quote block uses the display type and an ornamental mark (`content: "“" / ""`, hidden from assistive technology). Its attributing citation is the next region in DOM order in every variant. Paraphrase stays body text behind a rule. Outside the quote family, a verbatim quote now also keeps a distinct treatment (display type and an accent rule); no existing fixture or demo contains a quote block.
- **Small multiples.** Panels sit in equal grid columns. Panel SVGs are capped at 300 px tall, so the smallest chart text measured is 10.5 px (budget 10 px). System-map text measured 11.2–15.4 px.

## Browser evidence

Chrome for Testing 151.0.7922.34 from the Playwright cache under `~/Library/Caches/ms-playwright`, outside `/Applications`, loaded through Playwright 1.61.1 from a local npx cache. Every browser context used a Playwright temporary profile. Exports were served over direct loopback through scoped response routes. **0 page errors and 0 external requests.**

```bash
CHROMIUM_PATH=<isolated Chrome for Testing> PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/browser_families.mjs
```

- **108 new candidates** in 18 decks: six families × three geometries × three themes × two languages. **108 pass** at 1440 px (810–889 px tall).
- Every family has three distinct measured geometry signatures in every theme and language, and three passing candidates (two required).
- **324 width checks** (each candidate scene at 1440, 1024 and 390 px) match the declared columns. Every 390 px page reads in DOM order on one left edge. No page scrolls horizontally at 1024 or 390 px.
- **54 label checks.** In every candidate at 1440, 1024 and 390 px, the before/after page draws *Before · baseline* above the first image and *After* above the second (*之前 · 基线* / *之后* in Chinese) as block-level generated text, before any interaction. At 1440 px both frames measure the same.
- Six selected rhythm decks (one per theme and language) pass the fit gate at 1440 px. None selects a failed candidate. They also pass at 1024 and 390 px.
- **Failed candidates are excluded, not hidden.** A four-panel small-multiples page keeps all four panels and fails all three geometries: row 1269 px, lead 1187 px, center 1269 px. Deck rhythm refuses it with *No measured candidate fits: small-multiples*. `splitSmallMultiples` makes two pages of two panels, and all six resulting candidates pass (810–863 px). [Stress contact sheet](stress-small-multiples.png).
- **Studio.** The family control lists all twelve families. On the quote page only Chapter, Quotation and Statement are enabled. Comparing gives three measured quote candidates and a larger view. `quote-band` was selected, saved and survived a reload. The author then chose Chapter for the same page; the chapter composition was kept through a fresh comparison and deck rhythm.
- **Existing suites, rerun with S3 in place.** `tests/browser_compositions.mjs`: 18 decks / 108 VIS-006 candidates, 135 captures, ok. `tests/browser_evidence_scene.mjs` (S2): ok. Its theme stage now records `colorMode: null` after dark-data → cream-collage → dark-data, where S2 recorded `"default"` (C9).

Fonts Chromium actually drew for headings and quotes: Iowan Old Style (en, Cream Collage), Helvetica Neue (en, Dark Data and Electric Violet), Songti SC (zh-CN, Cream Collage), PingFang SC (zh-CN, Dark Data and Electric Violet).

### Failures found and repaired during S3

Each repair changes proportion or position, never content. No word was removed and no font was set below its family tier.

1. First measurement, English Cream Collage: six of 18 geometries exceeded 900 px. before-after-split 992, before-after-rail 959, system-map-wide 1032, system-map-key 973, small-multiples-row 905, small-multiples-center 951. Repairs: image frames from 400/280 px to 300/240 px tall; maps capped at 560 px (wide) and 640 px (key); a 64 px headline tier for paired, map and panel families, as data evidence already uses; the evidence family's tighter folio and source spacing; the wide map's note moved into a header row; the centred small-multiples notes put on either side of a centre line.
2. Second measurement across all themes: Chinese small-multiples-row and -center at 914–917 px (one passing candidate only); English Dark Data and Electric Violet before-after-rail at 944–949 px; Chinese system-map-key at 900 px. Repairs: the spacing above, and before-after-rail columns from .8 / 1.2 to 1.2 / 1 so the heading no longer wraps in a narrow rail.
3. Viewing the 390 px sheets: the chapter variants' grid `align-self` carried into the narrow flex column and pushed the heading (chapter-low) and contents (chapter-margin) to the right edge. The vertical-order check had passed, so the browser suite now also checks for one left edge at 390 px.
4. Viewing the Studio override: as a chapter page, the verbatim quote looked like the paraphrase beside it. Verbatim quotations now keep a distinct treatment in every composition.
5. Stress run: on a continuation page with no reading note, small-multiples-lead placed both panels beside the heading (1033 px, failed). The heading now spans the row when the lead has no note.

## Unit tests

[`tests/composition-families.test.mjs`](../../../tests/composition-families.test.mjs), 14 tests:

- registry metadata, schemas and theme packs;
- explicit-only inference;
- lossless candidates in every theme and language;
- reading orders;
- the quote and before/after separation;
- every content refusal;
- theme-switch semantic equality;
- C9;
- the three rhythm rules, including an exhaustive optimality check with rule costs over random fits;
- page splitting;
- fixture parity.

The S2 C9 test now asserts an unchanged plan and render hash. The VIS-006 count test asserts that the 18 original geometries are unchanged.

## Images viewed

All six 1440 px contact sheets: [en Cream Collage](en-cream-collage-contact.png), [en Electric Violet](en-electric-violet-contact.png), [en Dark Data](en-dark-data-contact.png), [zh-CN Cream Collage](zh-CN-cream-collage-contact.png), [zh-CN Electric Violet](zh-CN-electric-violet-contact.png), [zh-CN Dark Data](zh-CN-dark-data-contact.png).

- en Electric Violet, zh-CN Cream Collage and zh-CN Dark Data were viewed from the final run.
- en Cream Collage, en Dark Data and zh-CN Electric Violet were viewed from earlier runs of the same suite. Their 1440 px geometry is unchanged in the final run: the later repairs touched only 390 px alignment, the lead variant without a note, and quotes outside the quote family.

Also viewed:

- The 390 px sheets: [zh-CN Cream Collage](zh-CN-cream-collage-contact-390.png) before repair 3 and again in the final run, [en Dark Data](en-dark-data-contact-390.png) after the repair, and one 390 px before/after page at full size.
- The [stress sheet](stress-small-multiples.png), before and after repair 5.
- The selected decks: [en Cream Collage](en-cream-collage-full-deck.png) and [zh-CN Dark Data](zh-CN-dark-data-full-deck.png).
- Studio: [quote candidates](studio-quote-candidates.png), [larger view](studio-quote-large.png) (quote-band at full size), [author family choice](studio-author-family.png) (before and after repair 4) and the [rhythm report](studio-rhythm.png).
- Scratch iterations for en Cream Collage and zh-CN Dark Data.

The other 390 px sheets, decks and per-scene captures are in `dist/visual-families/acceptance`, with hashes in the receipt.

Full-page Studio captures show the sticky editor toolbar partway down the image. This is how full-page screenshots draw a fixed header, not a layout fault.

## Listed, not fixed

| Item | Seen in | Owner |
|---|---|---|
| C12: Chrome trims a line-end `）` to half width when breaking, but the measured box keeps the full glyph. The source line of the Chinese small-multiples page reads as a 3.38 px overflow at 390 px (9 records, every theme and variant). The browser suite classifies each overflowing glyph and fails on anything else. | `report.json` → `knownIssues` | S8 |
| C13: the document header still renders in Arial (+ PingFang SC) in every theme. | full-deck captures | S8 |
| Chinese display headings break inside a phrase under `text-wrap: balance` (closing-split: “在证据可 / 见时做决定”). | zh contact sheets | S8 |
| Branching relationship diagrams have no narrow drawing; at 390 px the map scrolls inside its scroller. | 390 px sheets | S4 |
| Chart panels are drawn on an 800-unit canvas, so only two fit a 1440 px page; at 390 px the Chinese unit label touches the top tick (“小时40”). | small-multiples captures | S4 |
| The wide system map is capped at 560 px by the 900 px budget and looks small on the page. | contact sheets | S4 (map drawing) |
| No Studio control for `splitSmallMultiples`; the quote block has no typed speaker or organisation fields; no before/after slider. | — | S9; S1 field list; S5 (M08) |
| Theme packs still do not declare the S1 token roles (`numeric`, `reference`, `missing`, spacing, motion). | — | S8 |

## Applications

PowerPoint, Keynote and Figma are installed and were not run: no v3 compiler exists. LibreOffice, After Effects and Firefox were not found. Safari and Google Chrome are installed and were not used. See [the check](app-availability.json).
