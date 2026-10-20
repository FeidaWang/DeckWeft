# VIS-014 scored review — 2026-10-19

[Gate manual](README.md) · [Evidence and failures](../evidence/vis-014/review.md) · [Story cases](story-cases.json) · [Host receipts](host-receipts.json)

The scores below are advisory and are a single agent reviewer's image review, not a blinded human rating; the totals can be recomputed, the individual judgments cannot be reproduced deterministically. They use the rubric in the [requirements §9](../../DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md) and come from one reviewer (the S6 agent) who viewed the actual captures listed at the end. Automated checks do not certify these pages, and these scores do not certify them either. The author should calibrate them on the same complete artifacts, weakest pages included.

Pilot gate in the requirements: at least 80/100 overall, no category below 3/5, no hard-check failure.

## Result

| Artifact | Composition /25 | Typography and bilingual /20 | Colour and material /15 | Assets and crop /15 | Rhythm /15 | Motion and interaction /10 | Total | Weakest page |
|---|---|---|---|---|---|---|---|---|
| Gallery (12 pages, EN + zh-CN) | 19 | 14 | 13 | 9 | 12 | 7 | **74** | 12 · `dd-explain` |
| Story · Cream Collage | 20 | 15 | 13 | 9 | 13 | 7 | **77** | 5 · `st-process` |
| Story · Dark Data | 19 | 15 | 13 | 9 | 13 | 7 | **76** | 3 · `st-evidence` |
| Story · Electric Violet | 20 | 15 | 13 | 9 | 13 | 7 | **77** | 5 · `st-process` |

**Verdict: below the suggested pilot threshold.** No artifact reaches 80. Assets and crop sit exactly at 3/5 (9/15) everywhere, and one hard check fails (a missing glyph is not detected; see the evidence). The gate does not pass on visual quality, even though every automated layout, contrast, source and interaction check now passes.

## What holds the scores down

1. **Assets (9/15).** The repository has no authorized photography. The gallery's "photography split" uses a labelled AI-generated starfield, the case and the before/after use one generated illustration, and the evidence page uses a code-drawn test card. They are honest and well cropped, but they do not show what a real photograph does to each theme.
2. **Typography (14–15/20).** Chinese headings break inside words (`三十六种几何结／构`, legacy `可执／行`): the open C12 item. The trend chart's last time label now takes its own line at every width, which looks staggered at 1440 px where it would fit. The metric unit `%` sits on its own line under `41`.
3. **Interaction chrome (7/10).** Every interactive page carries the cue toolbar (Replay, Play, Previous, Next, Cue position) above the headline. It works and is keyboard-safe, but on `st-evidence` and `dd-explain` it, the range controls and the static-state statement crowd the top of the page.
4. **Dense explanatory page.** `dd-explain` stacks a diagram, step buttons, an explanation panel, chart controls and a chart: the weakest gallery page by a distance.
5. **Narrow heatmap.** At 390 px the heatmap still scrolls sideways (S4 follow-up for SVG kinds); the 390 px column that the takeaway names is off-screen until the reader scrolls.

## What earns the scores

- Theme identity is unmistakable and consistent: cream paper with the blue diagonal, dark data with acid green, violet chapters. Facts, tables and sources are identical across themes (tested).
- Openings and chapters are strong: the diagonal cover, the full-violet chapter and the banner opening hold a long bilingual title at 1440, 1024 and 390 px.
- Charts state their question, unit, sample, missing reasons and takeaway in visible text; the focused category reads first without hover.
- Each story uses eight different compositions with no repeated family run; quotes are verbatim and attributed (WCAG 2.2 SC 1.4.3), with the paraphrase kept separate.
- After S6 fixes, the linear process diagrams read as one row, before/after pairs are labelled correctly in both languages, and the cover number and citation fit at 1024 px.

## Host-drafted artifact

The Codex prompt-to-artifact deck (five text-only pages in Cream Collage) passes every check and the host's own image review, but it is visually plain: statement pages only, no image, metric or chart. It would score in the low 60s on this rubric. VIS-014's host requirement is about completing the task and the scoped revision, which it did; it is not evidence that host drafting reaches the gallery's visual level.

## Images viewed for this review

Contact sheets of all eight decks at 1440 px (`../evidence/vis-014/*-contact.png`), two 390 px sheets, the case captures, the three legacy sheets, the Chromium/Firefox/WebKit standalone captures, the host before/after pages, and individual 1024 and 1440 px captures of the cover, timeline, process and before/after pages taken while fixing them.

## Soft features (CINE-007)

Added 2026-10-21 (CINE batch 2, `src/quality/render-checks.mjs`, `SOFT_FEATURES`). The player (`semantic-player.7`) measures every region's box and text-size range, every image's box and the source strip's height; `checkRender` turns them into the seven features below for each measured page and names the weakest page (the lowest weighted score, `weakestPage`). They are bounding-box diagnostics with stated units and exceptions: signals for a reviewer, never a certification, and not eye tracking. Hard gates (content and source coverage, safe crops, typography minima, geometry, contrast, readable labels, working links, current evidence, target fit) stay in `candidateFit` and the render checks; a soft feature never fails a page.

| Feature | Definition | Unit | Better | Exceptions |
|---|---|---|---|---|
| `subjectArea` | The largest visible subject on the page as a fraction of the page: the authored subject inside its crop (`annotated:true`), else the image container itself. | fraction of the page | higher | A context landscape or a chapter page may intend a small or absent subject; judge against the declared purpose. |
| `stripHeight` | How far the compact source strip exceeds its 48 px budget at presentation width. | px over budget | lower | A source-is-subject page has no strip; narrow widths wrap the strip by design. |
| `groupingGapVariance` | The variance of the vertical gaps between consecutive regions in reading order (a negative gap, from side-by-side regions, counts as 0). | px² | lower | A deliberate pause (a chapter, a closing) can hold one large gap; two-column pages report their column breaks as zero gaps. |
| `alignmentAxes` | The number of distinct left edges the regions start on, rounded to 8 px. | count | lower | Grids and small multiples use several axes; three or fewer is a starting point, not a rule. |
| `competingAccents` | Regions other than the focal block whose smallest text is at least as large as the focal block's largest text. | count | lower | A metric page shows its number larger than its heading on purpose; a quote page sets the quotation above its paraphrase. |
| `titleFigureDistance` | The vertical distance from the bottom of the focal (title) region to the top of the first declared media region (or the first image), clamped at zero. | px | lower | Side-by-side layouts report zero; a page without media reports null. |
| `entryClarity` | Whether the focal region's centre lies where the declared entry says the eye starts: the left 40 % for `left`, the middle fifth for `center`, anywhere for `contextual`. | boolean | — | Null when the page declares no intent; an inferred entry is never scored. |

Score: `1 − Σ weight × penalty` with the starting weights `SOFT_WEIGHTS` (subject area .3, competing accents .15, entry clarity .15, the rest .1 each); each penalty is the feature normalized to 0–1 (subject area reaches 0 at 30 % of the page, strip height at 48 px over, grouping at a 40 px standard deviation, axes at seven, accents at three, title distance at 400 px). The weights were set on the batch 1 corpus and are calibration inputs, not findings; the candidate ranking (`rankCandidates`) applies the hard gates first and these weights second, and records why each of the three candidates differs.
