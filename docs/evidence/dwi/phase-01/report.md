# DWI Phase 01 — palette evidence and semantic roles

Date: 2026-10-22. Branch `claude/read-work-package-00-06-256b3e`. Commits: `e3bfd08` (feature, renderer `.15`), `10265b0` (render baseline re-recorded on its own), `2b5c8b5` (CSP fix, browser runner, evidence, live status fields), then the status record commit. Model: as in [Phase 00](../phase-00/report.md#model-and-effort) (Claude Code, `claude-opus-5-5`, effort not observable; no Sol model).

## What changed

- **Registry (DWI-010).** [`themes/palettes/wesanderson.json`](../../../../themes/palettes/wesanderson.json): 22 palettes and the `Rushmore → Rushmore1` alias, transcribed from the workpack, validated at load against [`schemas/palette-registry.schema.json`](../../../../schemas/palette-registry.schema.json). The schema pins `filmFrameVerified: false`, `frameTimestamp: null` and `officialPalette: false`. Screenshot samples are a separate file with evidence `screenshot-sample-only`. [`src/design/palette-registry.mjs`](../../../../src/design/palette-registry.mjs) refuses an alias in a saved plan and names its target. Attribution is in `NOTICE.md`; the package's own LICENSE file still has to be copied before public distribution.
- **Role tokens (DWI-011).** [`src/design/semantic-colors.mjs`](../../../../src/design/semantic-colors.mjs) derives light, dark and stage tokens. Neutrals equal the workpack's v1 derivation. DeckWeft draws its accent and secondary as text (callouts, metrics), so both must reach 4.5:1 on canvas and surface; a source colour that fails is mixed toward the text colour and marked `adjusted` with its source index. Series and connectors reach 3:1; stage body text reaches 7:1; status colours are fixed per mode. `resolveTheme` takes an optional scene palette; without one its output is identical.
- **Charts and diagrams (DWI-012).** Existing redundancy (dash, marker, direct labels, data table) already meets "no colour-only identity"; `adjacencyIssues` adds marks, arrows, node strokes, callout rules, node text and neighbouring series.
- **Picker (DWI-013).** One **Film palette** list under **Colours** in Look, a Light/Dark/Stage list, and an **About this palette** disclosure; `/api/visual/palettes`, `/api/visual/palette`, `applyScenePalette` (a theme lock holds the palette). Manuals: [en](../../../en/visual-studio.md#film-palettes-dwi-010-to-dwi-013), [zh-CN](../../../zh-CN/visual-studio.md#电影配色dwi-010-至-dwi-013).
- **Renderer `visual-art-direction.15`.** A declaring page carries `data-palette`. The baseline re-recording changed 12 entries only through render and scene source hashes; every content view, data, script and style part is unchanged.

## Results

| Check | Exit | Result |
|---|---|---|
| `node --test tests/dwi-010…013.test.mjs` | 0 | 21 tests pass |
| 66 palette × mode combinations | — | 0 failing role pairs; 0 adjacency issues; accent adjusted in 21, secondary in 39, series colours in 124 places (all marked) |
| `npm run verify` at `2b5c8b5` | 0 | 618 tests: 612 pass, 0 fail, 5 skipped, 1 todo — [log](verify-2b5c8b5.txt), recorded with `status-summary --record` |
| `node scripts/status-summary.mjs --check` | 0 | status record agrees with the tree |
| `node scripts/export-targets.mjs --dwi` (isolated Chrome for Testing 151) | 0 | 4 decks; PowerPoint editability and scene check pass on all; the palette decks keep the Phase 00 findings (typography 5.97 pt chart annotations, one PDF figure without alt, zh-CN radical code points) and add none — [reports and sheets](dwi-011/export-targets/) |
| `node docs/evidence/dwi/phase-01/dwi-011/pptx-colours.mjs` | 0 | every slide background equals its scene's derived canvas in both languages — [result](dwi-011/pptx-colours.json) |
| `node tests/browser_dwi_palette.mjs` (isolated Chromium 151, 1440 × 900) | 0 | 8 steps pass — [report and screenshots](dwi-013/browser/) |

The first browser run found a real defect: the evidence note's swatches rendered as empty boxes because the Studio's CSP refuses inline `style` attributes. They are now painted through CSSOM and the runner asserts their computed colours.

## Visual review

The palette sheet shows the same dark canvas, light text and gold node strokes for GrandBudapest1/dark in the web scene, the PowerPoint render and the PDF page; Royal1/dark keeps the comparison table legible; Zissou1/stage draws its two line charts in the fitted blue. In the Studio, choosing Darjeeling2 changes page 1 only; the panel stays compact (one list, one mode list, one disclosure).

## Limits

- Classic (`format: deckweft`) decks keep their four themes; palettes apply to visual decks only.
- No screen reader, forced-colours mode, Firefox or WebKit run; PowerPoint and Keynote not opened.
- Typed type-ahead was the keyboard route checked; on macOS the arrow keys open the native list.
- The palette derivation is a product default to review, not a measured perceptual result.

## Next

Phase 02: DWI-020 (needs DWI-003, DWI-010 — met), then DWI-021, DWI-022, DWI-023 (needs DWI-001 — met).
