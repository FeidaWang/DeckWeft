# VIS-016 target-specific editable exports (S7) — evidence, 2026-10-19

[Compatibility manual](../../en/compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016) · [Alignment §15](../../plans/design-handoff-alignment.md#15-s7-result--output-levels-and-vis-016-2026-10-19) · [All decks](exports.json)

**State: partial.** Output levels are declared per component and format. The export order is enforced in code. PowerPoint and PDF compile from the static web scene. Every deck gets an export report with levels, per-element receipts and four separate results.

On the frozen VIS-014 corpus:

- PowerPoint editability and the page-by-page scene check pass.
- English PDFs are searchable.
- Chinese PDFs are only partly searchable.
- Accessibility is checked on the package structure only.
- Visual fidelity rests on macOS Quick Look reference renders.

PowerPoint and Keynote were not run, so no application compatibility is claimed.

Source: branch `claude/nice-archimedes-d8a127`, started from `claude/s6-start-1c14f9` (S1–S6). Renderer `visual-art-direction.6` and player `semantic-player.4` are unchanged: no embedded web byte changed, and the render baseline still passes. Nothing was pushed or published.

## What ran

| Step | Command | Result |
|---|---|---|
| Unit, contract and type checks | `npm run verify` | See [verification](../../en/verification.md#s7-output-levels-and-vis-016-exports--2026-10-19) |
| Export run | `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… npm run export:targets` | 9 decks, about 50 s |
| Independent PowerPoint check | `python3 -I tests/inspect_v3_pptx.py` (standard library) | pass on 9 of 9; every chart workbook equals its chart cache |
| Independent PDF check | `python3 tests/inspect_pdf.py` (pypdf 6.16.2) | text, tags, language, title and figures per deck |
| Reference renders | `qlmanage -t` (macOS Quick Look) | every slide and every PDF page |

Environment:

- macOS, Node 24.14.0 locally (CI uses 22).
- Chrome for Testing 151.0.7922.34, isolated, from the Playwright cache, with temporary contexts and page scripts disabled. No installed browser or profile was used.
- Playwright 1.61.1, Python 3.9.6.

Every export made 0 external requests.

## Input corpus

The frozen VIS-014 gallery and the three 8-page stories, in English and Simplified Chinese (`tests/release-gate.mjs`). The S4 chart-kinds sample (`tests/chart-kinds.mjs`) is added only because it is the one deck that exercises the L3 fallbacks: dot-interval, small multiples, intervals, a log axis and missing values.

## Results per deck

| Deck | Slides | Native charts | Pictures | PowerPoint levels L1/L2/L3 | PDF L1/L2/L3 | Editability | Scene check | PDF search | Accessibility | Fidelity (Quick Look) |
|---|---|---|---|---|---|---|---|---|---|---|
| [gallery-en](gallery-en/report.md) | 12 | 3 | 3 + 1 L3 chart | 53/0/1 | 47/7/0 | pass | pass | pass | partial | partial |
| [gallery-zh-CN](gallery-zh-CN/report.md) | 12 | 3 | 3 + 1 L3 chart | 53/0/1 | 47/7/0 | pass | pass | partial | partial | partial |
| [story-cream-collage-en](story-cream-collage-en/report.md) | 8 | 1 | 2 | 36/0/0 | 34/2/0 | pass | pass | pass | partial | partial |
| [story-cream-collage-zh-CN](story-cream-collage-zh-CN/report.md) | 8 | 1 | 2 | 36/0/0 | 34/2/0 | pass | pass | partial | partial | partial |
| [story-dark-data-en](story-dark-data-en/report.md) | 8 | 1 | 2 | 36/0/0 | 34/2/0 | pass | pass | pass | partial | partial |
| [story-dark-data-zh-CN](story-dark-data-zh-CN/report.md) | 8 | 1 | 2 | 36/0/0 | 34/2/0 | pass | pass | partial | partial | partial |
| [story-electric-violet-en](story-electric-violet-en/report.md) | 8 | 1 | 2 | 36/0/0 | 34/2/0 | pass | pass | pass | partial | partial |
| [story-electric-violet-zh-CN](story-electric-violet-zh-CN/report.md) | 8 | 1 | 2 | 36/0/0 | 34/2/0 | pass | pass | partial | partial | partial |
| [chart-kinds-en](chart-kinds-en/report.md) (supplementary) | 12 | 4 | 7 L3 charts | 29/0/7 | 24/12/0 | pass | pass | pass | partial | partial |

The four results:

- **PowerPoint editability.** The compiler's check reads the package back. Text is native text and tables are native tables. Each native chart embeds a workbook whose values equal both the chart cache and the dataset. Diagrams have a shape per node and a glued connector per relationship. Pictures exist only for image blocks and L3 charts; none is slide-sized. No timing or transition is written. Every error receipt fails the check. The Python check confirms CRC, XML, content types, relationships, workbooks, text and picture size independently.
- **PDF searchability.** Every expected string of each scene (block text, metric values, table cells, chart categories and values, diagram labels, alt text) is extracted from that scene's page or from the notes pages. The printed scene sizes equal the measured ones in every deck.
  - English: pass.
  - Chinese: **partial**. Chromium writes some shared CJK glyphs into the PDF's Unicode map as radical code points, so a viewer's search for the ideograph can miss them: 页 → U+2EDA, 门 → U+2ED4, 长 → U+2ED3, 见 → U+2EC5, 母 → U+2E9F. The text is in the file; 16–22 strings per Chinese deck are affected. The check names the code points and never counts them as found.
- **Accessibility.**
  - PowerPoint package: pass for every deck. Each slide has a title placeholder. Pictures, charts and tables have alt text. Decoration is marked decorative. Reading order equals the derived scene. Every run has a language. Links resolve to sources, every slide has notes, and text contrast is at least the web threshold.
  - PDF: partial. Tagged, `/Marked`, language and title are present, and every leaf figure has `/Alt`. Chromium also tags each HTML `<figure>` wrapper as a `/Figure` without `/Alt` around the described figure: 10 per gallery.
  - Not tested: screen readers, PowerPoint's Accessibility Checker, PDF/UA.
- **Visual fidelity: partial.** Each slide and PDF page was rendered by Quick Look and set beside the web scene in the contact sheets. Advisory mean luminance difference (0–255): PowerPoint 1.6–16.6, PDF 0.9–5.0. The larger PowerPoint values are Quick Look chart limits (below), not compiled geometry.

## Receipts across the nine decks

| Code | Count | Element | Delivered as |
|---|---|---|---|
| `PPTX_TEXT_BALANCE` | 69 | Balanced headings | Measured line breaks written as breaks |
| `PPTX_DISCLOSURE` | 61 | "View all data", "Relationships and node notes", transcripts, a hidden comparison image | Content in the slide notes |
| `PPTX_INTERACTION_STATIC` | 25 | chart-select, steps, image-compare, image-hotspots | Static state; the delivery statement per interaction |
| `PPTX_MOTION_NOT_COMPILED` | 23 | Scenes with cues or motion | Static state, no timing |
| `PPTX_CHART_IMAGE` | 9 | Charts with a missing value: the gallery trend in both languages, plus a ranked bar and a grouped bar. Also dot-interval ×2, small multiples, an interval line and a log-axis line | L3 image of the chart; summary in alt text and notes |
| `PPTX_CHART_BREAK_MARK` | 1 | Truncated-axis break symbol | Truncation note stays visible |
| `PPTX_CHART_LEGEND` | 2 | Series named inside the web plot | Native chart legend |
| `PPTX_TABLE_AS_CARDS` | 2 | A comparison table drawn as cards (Electric Violet) | Native text cards with column labels; not a PowerPoint table |
| `PPTX_CHART_EVENT_MARK` | 1 | Event marker | Listed in the visible notes |

## Found while running the corpus, fixed in S7

Each item was found by running the corpus and viewing the renders. Each fix is in the compiler or the print document; none changes the web output.

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | Chart captions and annotation labels overlapped the text above them | Text was placed at the container's top | Text is placed at the measured line box: glyph box minus half the leading |
| 2 | Hairline rules missing | One-pixel filled rectangles vanish in some renderers | One-sided borders are lines |
| 3 | Ranked and grouped bars drawn bottom-up in Quick Look | It ignores a reversed category axis | Horizontal bars store rows and series bottom-to-top, so every renderer draws the declared order top-down |
| 4 | Heatmap cells all fully saturated | Quick Look ignores alpha in table cells | Translucent paint is blended with what lies under it |
| 5 | Balanced headings re-wrapped onto extra lines | PowerPoint has no balanced wrapping | Measured line breaks written as breaks (receipt) |
| 6 | Grouped bars lost series identity | The web names series inside the plot | Native legend (receipt) |
| 7 | PDF pages lost their lower content | Chromium expands closed `<details>` when printing, and print media drops the scenes' minimum height | Closed disclosures keep only their summary (content goes to the notes pages); printing uses screen styles. Every printed scene's size is checked against the measurement. |
| 8 | A card-layout table overflowed the slide | It was compiled as a grid | Card tables are text and boxes (receipt) |
| 9 | Log-axis chart drawn on a linear axis by Quick Look | It ignores `logBase` | Log-axis charts are L3 until PowerPoint and Keynote are checked (receipt) |
| 10 | After a missing value, Quick Look drew every later bar or point on the previous category | It ignores cache point indexes. Writing the gap as `#N/A` instead made it draw a zero | Charts with a missing value are L3 until PowerPoint and Keynote are checked (receipt). The gallery trend is now an image |
| 11 | A truncated-axis bar chart compiled in the text colour | The measure read the axis-break stroke as the bar | Marks take their paint from the filled data graphic |

## Independent code review, fixed in S7

A separate review of the S7 modules found the following; each fix has a test in `tests/export-targets.test.mjs`:

- A gradient stroke could write an invalid colour. `solid()` now accepts only six hex digits, and a gradient needs two stops.
- Rows under a row span lacked cells. Every table row now covers the grid, with `rowSpan`/`vMerge`/`hMerge`.
- An unsupported region path was dropped without a receipt (`PPTX_SHAPE_PATH`).
- The ZIP reader trusted declared sizes. It now bounds inflation and checks CRC, local headers and duplicate names.
- Links and entities were looked up on plain objects (`constructor`, `__proto__`).
- Nested disclosures were matched wrongly in print; a balanced scan replaces the regex.
- List numbering is now the list's own style, with a valid start.
- The workbook check compared values as a set. It now compares each cached point with the cell its formula names.
- Measured boxes and colours are validated before they reach XML or CSS.
- An export whose own check fails is refused (`EXPORT_CHECK_FAILED`); the evidence run keeps such files on purpose.

## Viewed

- Every contact sheet of the nine decks (`*/sheet-1.jpg`, `*/sheet-2.jpg`): web scene, PowerPoint slide (Quick Look) and PDF page (Quick Look) side by side.
- Single Quick Look slide renders for the cover, trend, ranked, heatmap and diagram pages.
- PDF page renders for the pages that lost content before fix 7.

**Weakest output.** Native line and area charts in Quick Look: the gallery pipeline line (page 12) and the chart-kinds area chart (page 12). Quick Look drops markers, dashes, tick and value labels and shifts points at a gap; PowerPoint must be checked. Second: tall scenes fitted into 16:9 make the smallest text 4.6–6.4 pt (citations and page chrome).

## Open — recorded, not fixed

| Item | Detail | Owner |
|---|---|---|
| PowerPoint and Keynote | Installed, not run. See the `applicationChecks` list in each report and in the [manual](../../en/compatibility.md#still-needs-powerpoint-or-keynote-on-your-machine) | User |
| Chinese PDF search | Radical code points in Chromium's Unicode maps (above). A post-print rewrite of the ToUnicode maps, or another PDF writer, is needed | Follow-up |
| PDF figure wrappers without `/Alt` | Chromium's tagging of HTML `<figure>`. Changing the web markup changes embedded bytes (player bump and re-recorded baseline) | Follow-up |
| Small text on tall scenes | One uniform scale fits a scene of up to 1189 px height into 16:9. A 16:9 measurement pass, or splitting tall scenes into stepped pages, is not built | Follow-up |
| Intervals, log axes and missing values in PowerPoint | Delivered at L3. Native error bars, log axes and gaps need application checks first | After the user's check |
| Studio | The Visual Studio export menu still offers HTML and JSON; PowerPoint and PDF run through `npm run export:targets` or the API | S9 / Studio |
| Fonts | Referenced by name, never embedded. A machine without them substitutes another face | By design |

## Applications

- PowerPoint and Keynote: installed, **not run** (only the user runs them).
- LibreOffice: not installed. After Effects is not involved.
- macOS Quick Look (OfficeImport) drew the reference renders; it is neither PowerPoint nor Keynote.

## Files

Per deck:

- `report.json`: levels, export-order receipts, every per-element receipt, the four results, fonts, applications and application checks.
- `report.md`: a summary of the same.
- `pptx-inspection.json`: the independent check.
- `sheet-*.jpg`: contact sheets.

`exports.json` lists every deck with the environment. The `.pptx`, `.pdf` and print files are not committed; the run rebuilds them in `dist/export-targets/`, and each report records their SHA-256.
