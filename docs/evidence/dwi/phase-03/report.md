# DWI Phase 03 — measured layouts and editable export

Date: 2026-10-22. Commits `48138d8` (feature, renderer `.16`), `19353c5` (render baseline re-recorded on its own), `ac0807e` (measured evidence, live fields), then the status record. Model: as in [Phase 00](../phase-00/report.md#model-and-effort).

## What changed

- **DWI-030 reading and delivery policy.** [`src/design/attention-policy.mjs`](../../../../src/design/attention-policy.mjs) maps the workpack's six families (assertion + evidence, paired comparison, evidence chart, workflow, mechanism, reading brief) onto DeckWeft's composition families. The logical reading order is the existing `compositionOrder`; new invariants check heading first, citations last, the evidence object present, process edges pointing forward in reading order, and one axis policy across panels. Two delivery modes: *self-paced* (≤ 600 units, ≤ 6 text blocks, labels ≥ 10 px) and *stage* (≤ 220 units, ≤ 3 text blocks, labels ≥ 21 px = the 14 pt label target). `rankForDelivery` turns a failed delivery gate into a failed hard gate before CINE-007's soft score. No F/Z path or golden ratio is encoded (tested on `src/design` and `src/layout`).
- **DWI-031 citations and references.** CINE-002's compact strip, claim markers, reference panel, PowerPoint notes and PDF appendix already separate keys from full references; `qualifierPlacement` adds the check that callouts and missing-value notes stay on the page at a reading role and never move into the strip.
- **DWI-032 evidence space and truth.** `evidenceShare` measures the share of a scene's useful area its evidence takes. Chart facts (point labels, data table, notes, summary) are identical in every theme and in all 66 palette modes; palettes add no filter or blend to images and leave crops unchanged.
- **DWI-033 workflows and mechanisms.** A diagram may declare `scale` (`not-to-scale`, `unverified`, `to-scale`); the statement is page text inside its figure, so the measured PowerPoint and PDF carry it (checked in an isolated-browser run). `mechanismIssues` warns when a mechanism does not say. Part ids, edge ids and arrowheads reach PowerPoint as named shapes and connectors. The fixture's scale statement moved from a callout into the diagram field.
- **DWI-034 native slice.** `tests/dwi-034.test.mjs` compares content counts and values through PowerPoint and PDF: 15 table cells with their text, both small-multiple panels as native charts with exactly the dataset values, every diagram node and edge, every source URL in the notes, no whole-slide picture, per-element receipts for the null-carrying line chart (an image with every value in the notes), and an unchanged source project.

## Results

| Check | Exit | Result |
|---|---|---|
| `node --test tests/dwi-030…034.test.mjs` | 0 | 20 tests pass |
| `npm run verify` at `ac0807e` | 0 | 663 tests: 657 pass, 0 fail, 5 skipped, 1 todo — [log](verify-ac0807e.txt), recorded |
| `node scripts/status-summary.mjs --check` | 0 | agrees |
| `node scripts/export-targets.mjs --dwi` (isolated Chrome for Testing 151) | 0 | 4 decks: PowerPoint editability and scene check pass; [reports and sheets](dwi-034/export-targets/) |
| `node docs/evidence/dwi/phase-03/dwi-032/evidence-share.mjs` | 0 | [evidence-share.json](dwi-032/evidence-share.json) |
| `node scripts/export-targets.mjs --s9 --decks blueprint-silver-gray-editorial-{en,zh-CN}` | 0 | step reveal exported with its static state; [reports and sheet](dwi-033/) |

## Findings

- **Evidence share** on figure-led pages (en / zh-CN): assertion 0.456 / 0.484 and small multiples 0.575 / 0.596 are inside the 45–65 % default band; the **workflow** page is **0.346 / 0.350** (the five-step strip is drawn at its natural width and does not grow with the region) and the **mechanism** map is **0.697 / 0.692**. Enlarging process diagrams changes the markup of every existing deck with a diagram, so it is left for a separately announced change; DWI-032 is therefore recorded as *implemented*, not accepted.
- **Typography** still fails on the small-multiples page (two chart annotations at 5.97 / 5.99 pt against 6 pt), as in Phase 00.
- **PDF accessibility** is now *partial* instead of *fail* on the slice: after the fixture change the PDF has 6 figures, all with alternative text (before: 7 figures, 6 with alt). The grouping-figure limit Chromium creates remains. This follows from the changed fixture, not from a PDF fix.
- The measured mechanism map still routes Document → Measured scene through a long elbow; DWI-033 did not change routing.

## Limits

PowerPoint and Keynote not opened; no screen reader; the delivery thresholds are product defaults to review; `stage` delivery is a ranking parameter, not a saved deck setting.

## Next

Phase 04: DWI-040 (needs DWI-034 — implemented with evidence — and DWI-013 — met).
