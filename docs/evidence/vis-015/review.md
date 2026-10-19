# VIS-015 T01–T03 theme packs (S8) — evidence, 2026-10-19

[Theme manual](../../en/visual-studio.md#three-more-themes-editorial-fieldnotes-research-atlas-luminous-stage-s8-vis-015) · [Alignment §16](../../plans/design-handoff-alignment.md#16-s8-decisions--t01t03-themes-and-vis-015-2026-10-19) · [Quality](quality.json) · [Contrast](contrast.json) · [Cases](cases.json) · [Exports](exports/exports.json) · [Baseline diff](baseline-diff-s8.json)

**State: partial** (roadmap) / LocalVerified for the web output in Chromium; PowerPoint and PDF compile and pass their own checks; PowerPoint and Keynote were not run. VIS-015's last acceptance sentence (author feedback promoting a design into a reusable profile) is not built, so the task cannot reach `implemented-local`.

Decision 2 is **Replace** ([§16](../../plans/design-handoff-alignment.md#16-s8-decisions--t01t03-themes-and-vis-015-2026-10-19)): the three handoff art directions are the three VIS-015 themes, under their own ids. The three VIS-014 themes are unchanged; the VIS-014 gate was not reopened.

Source: branch `claude/design-handoff-alignment-19703c`, started from `claude/nice-archimedes-d8a127` (S1–S7). Renderer `visual-art-direction.9`, player `semantic-player.5`. Nothing was pushed or published.

## What ran

| Step | Command | Result |
|---|---|---|
| Unit, contract and type checks | `npm run verify` | See [verification](../../en/verification.md#s8-t01t03-theme-packs-and-vis-015--2026-10-19) |
| Themes evidence | `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node scripts/s8-themes.mjs` | build, quality, contrast and cases all pass ([run.json](run.json)) |
| Exports | `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… npm run export:targets -- --s8 --out dist/export-targets-s8` | 18 decks ([exports.json](exports/exports.json)) |
| VIS-014 cases, re-run for C13 | `node scripts/release-gate.mjs --steps build,cases` | 11 of 11 pass; the missing-glyph case is now detected by the fit audit ([vis-014/cases.json](../vis-014/cases.json)) |
| Baseline diff | `node tests/render-baseline-diff.mjs <a8c0404 tree> …` | 12 entries changed bytes; no visible word, value, table, anchor or title changed |

Environment: macOS, Node 24.14.0 locally (CI uses 22; remote CI has not run this branch), ICU 78.2 (Unicode 17). Isolated Chrome for Testing 151.0.7922.34 from the Playwright cache, Playwright 1.61.1, temporary contexts, no installed browser or profile, 0 external requests in every run. Python 3.9.6 for the independent package checks; macOS Quick Look for the reference renders.

## The packs

| Pack | Surface / text / accent | Drawn fonts (DevTools platform fonts, 1440 px) | Own compositions |
|---|---|---|---|
| `editorial-fieldnotes` (T01) | `#F3F0E8` / `#24241F` / `#A8503A`, numbers `#3B5B74` | Charter (display, numerals), Gill Sans (body); zh: Songti SC, PingFang SC | fieldnotes-cover, -thesis, -figure, -method, -closing |
| `research-atlas` (T02) | `#FAFAF7` / `#15211B` / `#286448`, `#345BC5` | Avenir Next and Avenir Next Demi Bold (display, body), Menlo (numerals, chart values); zh: PingFang SC | atlas-cover, -section, -figure, -panels, -appendix, -closing |
| `luminous-stage` (T03) | `#0C1017` / `#F2F3EE` / `#A8D2EA`, object `#4F7EA3` | Futura (display, numerals), Helvetica Neue (body); zh: PingFang SC | stage-hero, -chapter, -figure, -metric, -closing |

Every pack lists the twelve shared families and declares all S1 token roles (`typography.numeric`, `palette.reference` / `missing`, `spacing.captionGap` / `sectionGap` / `safeArea`, `motion.distance` / `easing` / `delay` / `fallback`). The renderer emits them as custom properties only for declaring packs; every consumer's fallback equals the previous literal value, which the re-recorded baseline confirms for the VIS-014 themes (text, values and anchors unchanged in all 12 entries).

**Handoff values changed after measurement.** T01 terracotta `#B95E42` → `#A8503A` (4.76:1 on paper; the handoff value gave 4.1:1 at body sizes). T02 keeps the handoff green and cobalt; chart colour 4 moved from plum to grey-sage `#7A8A84` so the first four series keep distinct luminance in black and white. T03 keeps the handoff surface, text and ice blue.

**Fonts and licence check.** Source Serif 4, IBM Plex and Noto CJK (all SIL Open Font Licence 1.1) are not installed on this machine. The packs name platform fonts first and the OFL candidates as later fallbacks; no font file is bundled (`scripts/check.mjs` refuses font binaries), and every export report lists the fonts it used under `fonts.used` with `embedded: false`. The platform fonts drawn here are the operating system's own (Charter, Gill Sans, Futura, Avenir Next, Helvetica Neue, Menlo, Songti SC, PingFang SC); a machine without them substitutes the next family in the stack and must be measured again.

## Quality: 24 decks, three widths

The [quality report](quality.json) measures every deck at 1440, 1024 and 390 px: fit audit (overflow, clipping, contrast, missing glyphs, text outside the scene, fonts loaded), render checks (text and source coverage, images decoded) and heights.

| Deck set | Decks | Issues at 1440 / 1024 / 390 | Pages over the 900 px candidate budget at 1440 |
|---|---|---|---|
| Frozen VIS-014 gallery drawn in each new theme | 6 | 0 / 0 / 0 | T01 7–8, T02 4–6, T03 7–8 of 12 |
| S8 story (the VIS-014 story document) per theme | 6 | 0 / 0 / 0 | 2–3 of 8 |
| Page-42 storyboard per theme | 6 | 0 / 0 / 0 | T01 5–6, T02 1–3, T03 6–7 of 12 |
| T01 / T02 / T03 handoff sample pages | 6 | 0 / 0 / 0 | 4–5, 3, 2–4 of 6 |

In all: 228 pages per width, 0 issues. 102 of the 228 pages at 1440 px exceed the 900 px presentation budget (T01 39, T02 24, T03 39 of 76 each). The budget is a candidate gate for the composition comparison, not a failure of the reading view; the VIS-014 gallery pages with interactions (`dd-explain`, 1470–1524 px) and the metric pages are the tallest in every theme, as they were in the VIS-014 themes. The stage and fieldnotes tiers are larger by design and therefore taller.

Facts identical across the three new themes, per locale: gallery, story and storyboard ([build.json](build.json), hashes of every data table, source link and citation), and tested in `tests/s8-themes.test.mjs`.

## Contrast as drawn

[contrast.json](contrast.json) records every text node of the English story and sample decks and the Chinese storyboards at 1440 px: computed colour over the composited backgrounds, grouped by theme, role, size and weight.

| Theme | Pairs measured | Lowest ratio (role, size) | Required |
|---|---|---|---|
| editorial-fieldnotes | 46 | 6.28 (numeric 112 px, slate on paper) | 3:1 |
| research-atlas | 44 | 5.82 (callout 16 px, cobalt on paper) | 4.5:1 |
| luminous-stage | 46 | 11.86 (callout 12 px, ice blue on surface) | 4.5:1 |

All 136 pairs pass. The token pairs computed from the packs: T01 ink 13.69, accent 4.76, secondary 6.28, reference 4.96, missing 5.48, chart colours 4.76–13.69; T02 ink 15.87, accent 6.68, secondary 5.82, reference 5.40, missing 5.64, chart 4.08–15.87; T03 text 17.09, accent 11.86, object 4.40 (used for the drawn orb and panel rules only; text never sits on it), reference 9.30, missing 9.03, chart 9.21–14.22. The fit audit's own contrast check (which also tests text over decor paths) reported no failure in any deck.

## Explicit cases ([cases.json](cases.json))

| Case | Theme | Result | Detail |
|---|---|---|---|
| Missing glyph (U+E000 in the cover title) | all three | pass | The fit audit lists the glyph and the region; `fit.ok` is false; the render checks file a `glyph` issue ([T01](case-missing-glyph-editorial-fieldnotes.png), [T02](case-missing-glyph-research-atlas.png), [T03](case-missing-glyph-luminous-stage.png)). Chromium draws the primary font's own .notdef box, so the DevTools platform-font list names no last-resort font; detection compares canvas pixels of every grapheme with the same font's U+0378 |
| Media-failure cover | luminous-stage | pass | The hero without an image keeps a drawn orb, text never over it, contrast clean ([capture](case-stage-no-image.png)); with the hero image file deleted from a copy of the asset home, the export is refused with `ASSET_UNRESOLVED` |
| Low-motion mode | luminous-stage | pass | Every scene carries `data-motion-fallback="static"`; with reduced motion no animation runs and the player opens on the static state; with full motion the replay animations use the declared easing (`ease-in-out`) and at least the declared delay (40 ms) |
| Black and white | research-atlas | pass | Grayscale captures of the three chart pages ([figure](case-atlas-bw-at-figure.png), [panels](case-atlas-bw-at-panels.png), [interval](case-atlas-bw-at-interval.png)): series luminance 0.100 / 0.151 / 0.196 / 0.240 (smallest gap 0.044), line dashes `none`, `9 5`, `2 4`, focus solid versus outlined |
| CJK phrase breaks (C12) | all three | pass | Every heading and callout with Han text in the zh-CN gallery, at 1440 and 390 px: no line ends inside a dictionary word, no region overflow (24 headings per theme) |

## Exports ([exports.json](exports/exports.json), one report per deck)

18 decks: the frozen gallery in each new theme, the S8 story in each new theme and the three sample decks, in both languages.

| Result | Count |
|---|---|
| PowerPoint editability (compiler check and the standard-library Python check) | pass 18 of 18 |
| Page check against the measured scene | pass 18 of 18 |
| PDF searchability | pass 9 (English); partial 9 (Chinese: Chromium's radical code points, as in VIS-016) |
| Accessibility | partial 18 (package pass; PDF figure wrappers without `/Alt`, as in VIS-016) |
| Visual fidelity | partial 18 (Quick Look reference renders only) |
| L3 elements | 8: the gallery trend chart with a missing value in each of the six gallery decks, and the dot-interval chart in both atlas decks |

Every report lists the fonts used (for example `Charter, Gill Sans, Songti SC` for the fieldnotes decks) and the application checks that stay with the user. The first export run found two defects that S8 fixed: the stage orb path extended past the 1440-unit frame (slide check: outside the slide), and `text-transform: uppercase` on table headers changed the text the PDF carried (searchability: four header strings missing). The S8 stylesheet now has no text transform.

## Byte identity

The renderer version moved `.6` → `.7` → `.8` → `.9` (theme stylesheet added, then the text transforms removed, then one missed header) and the player `.4` → `.5` (glyph audit, motion tokens, no behaviour change for undeclared packs). Each bump re-recorded [render-baseline.json](../../../tests/fixtures/visual/render-baseline.json) in its own commit. [baseline-diff-s8.json](baseline-diff-s8.json) compares the final tree with `a8c0404`: all 12 HTML entries changed bytes; in none did a visible word, value, data table, anchor or document title change. The Chinese entries now contain `<wbr>` between dictionary words; the diff tool treats it as the empty text it is.

## Viewed

Contact sheets at 1440 px for every deck (`*-contact.jpg`: galleries, stories, storyboards and samples, both languages) and at 390 px for the six sample decks (`narrow-390-*.jpg`); the case captures; the export sheets (`exports/*/sheet-1.jpg`) of the three English sample decks. Two intermediate rounds of captures drove the fixes below.

### Found by viewing and fixed in S8

| # | Page | Symptom | Fix |
|---|---|---|---|
| 1 | Stage hero with image (gallery 5, stage sample 1) | "Generate/d imagery": the text column was 38% of the width with a 120 px headline | The hero grid takes the image split as a percentage; a hero with media caps the headline at 80 px; the paragraph row is pinned under the heading |
| 2 | Stage metric page (gallery 1) | "Internationalizati/on" broke inside the word | Column ratio .85 / 1.15, no 12ch cap, and a 64 px tier when a word has 14 or more letters |
| 3 | Stage story opening at 1024 px | Metric label over the orb: 3.89:1 | The orb is drawn only when no image, metric, chart, diagram or table is bound |
| 4 | Stage storyboard chapter | A long title went back to 120 px after the length rule | The stage tier applies before the long-title rule |
| 5 | Atlas figure with a dot-interval | Value labels overflowed the rows | A declared monospace numeric role gets 1.3× the value space |
| 6 | Fieldnotes storyboard reference page (zh) | A citation measured as overflow by 5 px: a full-width closing bracket trimmed by `text-spacing-trim` but counted in `scrollWidth` | zh-CN scenes keep full-width advances (`text-spacing-trim: space-all`), so the drawn box equals the measured box (C12) |
| 7 | Fieldnotes cover and closing | 112 px headings ran to 1151 px pages | Fieldnotes caps at 96 px; theme-only closings take the 88 px closing tier |

### Weakest pages

- **Editorial Fieldnotes.** Story: `st-compare` (comparison-stack: four attribute cards with repeated labels, the fourth orphaned under the row). Sample: `fn-cover` (a six-line serif title leaves the page tall and the margin note small). Storyboard: `sb-comparison` (the same card stack).
- **Research Atlas.** Story: `st-pair` (before-after-split: two small images, the baseline note far right). Sample: `at-panels` (four panels fit, but captions and definitions crowd each panel; at 390 px the page is 2,422 px tall). Storyboard: `sb-chapter` (atlas-section: the long title sits in the narrow column beside the section number).
- **Luminous Stage.** Story: `st-compare` (comparison-rail: the light table header bar breaks the dark surface). Sample: `ls-figure` (the chart panel pushes the page to 1,098 px). Storyboard: `sb-chapter` (title and contents index stacked to 1,403 px).

## Page-42 storyboard: what is missing

The twelve content tasks run in every theme and both languages ([build.json](build.json) `storyboard`, tested). One task is not what the handoff asked for:

| Page | Task | Drawn as | Missing |
|---|---|---|---|
| 08 | ScenarioSnapshot | A comparison table of three named scenarios (`comparison-rail`), static contrast only | There is no scenario family and no parameter input; the handoff's P2 parameter exploration is not built |

Everything else maps to an existing family or a theme-only composition: Chapter, Thesis + side note, Sequence (with a `steps` interaction), Comparison (units in headers, a Missing cell), EvidenceChart, DotInterval, ObjectAnatomy (image hotspots), BeforeAfter (image compare), Reference, Quote (the verbatim WCAG 2.2 sentence only), Conclusion.

## Open — recorded, not fixed

| Item | Detail | Owner |
|---|---|---|
| Reusable profile from author feedback | VIS-015's last acceptance sentence; nothing in S8 promotes a design into a profile | S9 / Studio |
| Pages over the 900 px candidate budget | 102 of 228 at 1440 px; the tall pages are the metric, chapter and interaction pages. A 16:9 tier or page splitting is not built | Follow-up |
| Word segmentation depends on ICU | `<wbr>` positions come from `Intl.Segmenter('zh')`; ICU 78.2 here. Another ICU may segment a phrase differently and change the zh-CN render hashes; the baseline test would show it | Record per environment |
| PowerPoint and Keynote | Installed, not run; application checks listed in each report | User |
| Chinese PDF search, PDF figure wrappers, small text on tall scenes | As in VIS-016 | Follow-up |
| Table cells in zh-CN at 390 px | A cell such as `1,440 px · 英文` can still break inside a word: `word-break: keep-all` covers headings, callouts and metric labels only | Follow-up |
| ScenarioSnapshot | See above | VIS-015 / S9 |
| Studio theme switch for a locked composition | A page locked to another theme's own composition refuses the switch by design; the message names the theme | By design |

## Applications

- PowerPoint, Keynote and Figma: installed, **not run** (only the user runs them).
- LibreOffice and After Effects: not installed.
- The installed Safari, Chrome and Firefox were not used; the isolated Chrome for Testing build was. Firefox and WebKit were not run in S8.
- macOS Quick Look drew the export reference renders; it is neither PowerPoint nor Keynote.
- Not tested: screen readers, IME input, 200% zoom, projection, remote CI.

## Files

`*-contact.jpg` (1440 px sheets per deck), `narrow-390-*.jpg` (390 px sheets of the sample decks), `case-*.png`, `build.json`, `quality.json`, `contrast.json`, `cases.json`, `run.json`, `baseline-diff-s8.json`, and `exports/`: `exports.json` plus `report.json`, `report.md` and `pptx-inspection.json` per deck, with `sheet-1.jpg` for the three English sample decks. The `.pptx`, `.pdf` and print files are not committed; `npm run export:targets -- --s8` rebuilds them in `dist/export-targets-s8/`, and each report records their SHA-256.
