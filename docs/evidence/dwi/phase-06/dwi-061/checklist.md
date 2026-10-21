# DWI-061 — open the exports in PowerPoint and Keynote (for the user)

State: **blocked — needs the user**. PowerPoint 16.114 and Keynote 14.5 are installed on this Mac. Under the repository's standing rule only the user opens them; no DWI session has. Structural OOXML checks (DWI-034) and Quick Look renders do not substitute for these results.

## Files

After `node scripts/export-targets.mjs --dwi` (isolated Chrome for Testing), the decks are in `dist/dwi-export-targets/decks/`:

- `dwi-slice-en/dwi-slice-en.pptx`, `dwi-slice-zh-CN/dwi-slice-zh-CN.pptx` — the six-page slice with theme colours
- `dwi-slice-palette-en/…pptx`, `dwi-slice-palette-zh-CN/…pptx` — one palette and mode per page (light, dark, stage)

Each folder's `report.md` lists the same checks as below with what Quick Look could and could not show.

## Steps (about 15 minutes per application)

1. Open each `.pptx` in PowerPoint, then in Keynote. Expected: no repair prompt or import warning; 9 slides for English (the assertion page is two slides, the mechanism three), 10 for Chinese.
2. Slide with the comparison table: click a cell and type. Expected: a native table; 15 cells with the authored text.
3. Small-multiples slide: **Edit Data** on each chart. Expected: the workbook holds 31, 24, 18, 12 and 28, 27, 25, 22; both axes run 0–40.
4. Assertion slide: the line chart is a picture (it has a missing value); the notes list every value and say Round 3 was not collected. Expected: the gap is not drawn as zero anywhere.
5. Workflow and mechanism slides: drag a node. Expected: connectors stay attached; arrowheads point from step to step; the mechanism slide shows “Schematic, not to scale.” as text.
6. Palette deck: dark and stage slides keep readable text; no slide is a single picture.
7. Notes: every slide's notes list its sources with URLs.
8. PowerPoint: run **Check Accessibility**. Record what it reports.

## How to record the result

Write the application name and version, the file, each step's result (pass / fail with what you saw) and a screenshot of any failure into `docs/evidence/dwi/phase-06/dwi-061/results.md`. A step not done is *not run*, never *pass*.
