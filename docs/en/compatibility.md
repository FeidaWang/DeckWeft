# Compatibility: a checked box has a specific meaning

[中文](../zh-CN/compatibility.md) · [Verification evidence](verification.md) · [VIS-016 evidence](../evidence/vis-016/review.md)

| Surface | Implemented | Acceptance boundary |
| --- | --- | --- |
| Node CLI / local server | Yes; Node 22+ | Linux local run tested. macOS/Windows CI jobs are configured, not claimed as executed here. |
| Browser studio | Yes | Chromium interaction and viewport checks are recorded in the verification report. Other browser engines remain unverified. |
| Local skill installation | Yes | Temporary-directory installation, updates, safe removal, and isolated runtime are tested. Real authenticated agent discovery remains separate. |
| Codex native plugin | Manifests and self-contained bundle | Local catalog contract followed. Actual host activation has not been verified here. |
| Claude Code native plugin | Manifests and self-contained bundle | Real `claude plugin validate` / authenticated skill invocation still need a host run. |
| PowerPoint export, v1/v2 decks | Native text, basic shapes, speaker notes | The 14-slide DevDay deck opened in PowerPoint without repair ([evidence](../evidence/devday-redesign/review.json)); so did the planning deck ([evidence](../evidence/mb-06-10/review.md)). |
| PowerPoint export, v3 visual decks (S7) | Native text, tables, charts with embedded data, shapes, connectors, pictures, notes; per-element receipts | Package, XML, workbook and text checks pass on the VIS-014 corpus. PowerPoint and Keynote are installed here but were **not run**; see [below](#version-3-powerpoint-and-pdf-s7-vis-016). |
| PDF export, v3 visual decks (S7) | One page per scene with real text, tagged, plus notes pages | Text extraction and tag checks pass for English; Chinese is **partial** (search can miss some ideographs). No PDF/UA validator or screen reader was run. |
| HTML / SVG | Offline HTML; single-slide SVG | Escaping and browser output tested. SVG does not embed fonts. |
| Figma handoff | JSON plus local development-plugin source | Editable layer importer and local mock tests; real Figma execution remains unverified. No cloud file was renamed in this release. |
| After Effects handoff | JSON plus strict-parser JSX importer | Parser and cancellation tests; actual AE composition, font, and render checks remain unverified. |

## Version 3 PowerPoint and PDF (S7, VIS-016)

State: **partial** (implemented locally). The compiler, its checks and an export report per deck exist and pass on the frozen VIS-014 corpus. Compatibility with PowerPoint or Keynote is not claimed: neither was run.

### Export a deck

You need Node 22+, Playwright and an isolated browser outside `/Applications`, as for the VIS-014 gate.

1. Run:

   ```bash
   CHROMIUM_PATH=/path/to/isolated/chrome PLAYWRIGHT_MODULE=/abs/path/playwright/index.mjs npm run export:targets
   ```

   Expected: `dist/export-targets/decks/<deck>/` holds `<deck>.pptx`, `<deck>.pdf`, `report.json`, `report.md` and `sheet-*.jpg`; `exports.json` lists every deck. Add `-- --decks gallery-en` for one deck.
2. Open `report.md`. Read the five results (editability, page check, PDF searchability, accessibility, and typography by role) and every receipt. A typography failure names the scene, shape, role, actual and required size; split or re-page that scene rather than accepting small text.
3. Open `sheet-*.jpg`: web scene, PowerPoint slide and PDF page side by side (macOS Quick Look renders).

   **Tall scenes are paged (F1, 2026-10-19).** A scene is fitted to the slide with one uniform scale, so a page taller than 16:9 would shrink its text. When that would push any text under the typography minimums (`TYPOGRAPHY_MINIMUM_PT` in `src/targets/capabilities.mjs`: 18 pt titles, 10 pt body, 6 pt annotations, calibrated to the web minimums at the width fit), the compiler cuts the scene into horizontal bands at lines no element crosses, preferring a line between blocks and keeping the bands even. Each band is one slide; continuation slides repeat the heading with its part number in the title placeholder and in the notes, and the report lists them under `pagination` (`{sceneId, parts}`). Nothing is shrunk, removed or rasterized, and the same input gives the same bytes. Pass `paginate: 'none'` to `exportDeck`/`studioTargetExport` (or `paginate` in the Studio export request) to keep every scene whole; the typography result then names what is too small. A scene whose text is too small even at the width fit is left whole either way. Measured on the S9b blueprint page: whole, the part numbers are 5.2 pt and the typography result fails; paged, two slides (question and answer; diagram, parts and source) and every result passes at 7.2 pt or larger.
4. Open the `.pptx` in PowerPoint and Keynote and work through `applicationChecks` in `report.json`.

From code, measure the static web export first (`measureExportLayout` in `src/targets/layout.mjs`, run in the page after fonts and images are ready), then call `exportDeck(document, 'pptx' | 'pdf', { plan, experimentalWeb: true, assetResources, layout, rasters })`. The script does both.

### Export order

Enforced in `src/targets/export-order.mjs`; a stage out of order fails with `EXPORT_ORDER`.

1. **ready** — every image hash-matches; the layout was measured on this exact render, at 1440 px, with fonts loaded, no last-resort (missing) glyph and every image decoded.
2. **static-state** — each scene's author static state, or the opening.
3. **freeze** — filters, sort, focus and parameters per chart.
4. **stop-motion** — no cue, timing, transition, loop or random variation is compiled.
5. **reveal** — sources, complete data, relationships and explanations that the page keeps behind a disclosure go to the notes (PowerPoint) or notes pages (PDF).
6. **render** — PowerPoint package or PDF print document.
7. **check** — the output is read back and compared with the derived scene.

### Output levels

L1: native editable text, shapes, tables and supported charts (in PDF: real, searchable text). L2: an embedded vector drawing whose title, caption and source stay real text. L3: a high-resolution image of that one element with a semantic summary. A whole slide is never an image.

| Component | Web | PDF | PowerPoint |
| --- | --- | --- | --- |
| heading, paragraph, quote, callout, list, metric, citation, annotation, code | L1 | L1 | L1 native text (the scene title is the slide title) |
| table | L1 | L1 | L1 native table; a table the web draws as cards becomes text with a receipt |
| image | L1 | L1 | L1 native picture with crop and alt text |
| diagram | L1 | L2 | L1 shapes, glued connectors and text |
| chart: line, area, ranked bar, grouped bar, stacked, scatter | L1 | L2 | L1 native chart with the data embedded |
| chart: heatmap, benchmark table | L1 | L2 | L1 native table |
| chart: dot-interval, small multiples, or any chart with interval bounds, a log axis or a missing value | L1 | L2 | L3 image of the chart, summary in alt text and notes |

### What PowerPoint does not receive, and how it is delivered

Each case is a receipt in `report.json`, per element:

- Interactions and motion. The slide shows the static state; step explanations, hotspot notes and data are in the notes.
- Disclosures ("View all data"). Their content is in the notes.
- Balanced headings. The browser's line breaks are written as line breaks.
- Chart details:
  - event marks
  - qualifier superscripts
  - axis break marks

  Their text stays visible under the chart.
- Series named inside the web plot. They get the native chart legend.

### Results on the corpus (2026-10-19)

Eight VIS-014 decks plus the S4 chart-kinds sample. [Evidence](../evidence/vis-016/review.md).

| Result | Status |
| --- | --- |
| PowerPoint editability (compiler check and an independent Python check) | pass, 9 of 9 |
| Page check against the derived scene | pass, 9 of 9 |
| PDF searchability | pass for 5 English decks. Partial for 4 Chinese decks: some ideographs (页, 门, 长, 见, 母) are stored as CJK radical code points. |
| Accessibility (package checks) | PowerPoint pass. PDF partial: Chromium tags each HTML `<figure>` as a figure without alt text around the inner, described figure. |
| Visual fidelity | partial: reference renders by Quick Look only |

### Still needs PowerPoint or Keynote on your machine

- **Open the files.** No repair prompt in PowerPoint, no import warning in Keynote, every slide present.
- **Edit Data on each native chart.** The workbook opens and holds the values.
- **Focus colours.** On ranked and grouped bars the focused bar is solid and the others pale. Quick Look draws every bar solid.
- **Native chart details.** Markers, dashes, value labels, end labels, first/last time labels and axis steps. Quick Look ignores these.
- **Missing values, log axes and intervals.** These charts are images in this release because Quick Look drew them wrongly: values moved to the wrong category, `#N/A` drawn as zero, a linear axis. Native versions need PowerPoint and Keynote checks first.
- **Text.** Wrapping and negative letter-spacing. The fonts in `report.json` are installed (they are not embedded).
- **Free-form shapes.** Decorative shapes keep their colour; Quick Look draws them lighter.
- **Accessibility.** Run the Accessibility Checker and a screen reader.
- **Keynote objects.** Charts, tables, connectors and notes import as editable objects.

### Recovery

- **`EXPORT_LAYOUT_REQUIRED`.** The static scene was not measured. Run `npm run export:targets`, or measure it as above.
- **`EXPORT_LAYOUT_INVALID` with `EXPORT_LAYOUT_STALE`.** The document, plan or renderer changed after measuring. Measure again.
- **`EXPORT_NOT_READY` with `FONT_GLYPH_MISSING`.** A character has no glyph in any installed font. Change the text or the font; the export refuses rather than drawing a box.
- **`PPTX_RASTER_MISSING` (editability fails).** An L3 chart has no captured image. Use the script, which captures it.
- **Text wraps differently in PowerPoint.** Check that the fonts in the report are installed; otherwise the application substitutes them.

## Important gaps

The classic v1/v2 path supports text and basic geometry, not photos, logos, embedded videos, spreadsheet-backed charts, tables, arbitrary drag positioning, live co-editing, or import of arbitrary PowerPoint files. Exporting a Figma JSON is not exporting a native `.fig`; exporting motion JSON is not rendering a video.

Language preference selects a bounded font list; the Studio probes available local candidates and measures actual browser text. Privacy restrictions and per-glyph fallback still apply. CLI-only output remains estimated. Exact text wrapping can vary across applications. A layout preflight pass is not a factual accuracy, accessibility, legal, security, or performance certification.

No cloud credentials are requested. Using an agent's model or importing into a cloud design product still follows that host's own account, billing, and privacy rules.

Version history is now a read-only browser with restore-as-copy. Retention and archive management remain unimplemented. See [alpha.2 scope](alpha-2.md).
