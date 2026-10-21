# DWI Phase 06 — acceptance, release candidate and handoff

Date: 2026-10-22. Branch `claude/read-work-package-00-06-256b3e`, from `05643c6`; not merged, not pushed, nothing published. Model: as in [Phase 00](../phase-00/report.md#model-and-effort). This is the handoff for the whole workpack — not a claim that the workpack's whole scope is complete.

## Tasks

States: **accepted** (every acceptance line has evidence), **implemented** (built and tested; a named check is open), **blocked** (needs the user, an application, permission or material), **planned** (written down, not started).

| Task | Title | State | Evidence or blocker |
|---|---|---|---|
| DWI-000 | Record and reconcile the current repository | accepted | [reuse map](../phase-00/dwi-000/reuse-map.json) |
| DWI-001 | Inventory real host capabilities | accepted | [host inventory](../phase-00/dwi-001/host-capabilities.json) |
| DWI-002 | Adopt corrected evidence and rights rules | accepted | [rights](../phase-00/dwi-002/rights.json) |
| DWI-003 | Capture regression fixtures | accepted | [six-page slice runs](../phase-00/dwi-003/) |
| DWI-010 | Integrate immutable palette registry | accepted | [Phase 01](../phase-01/report.md) |
| DWI-011 | Resolve semantic light dark and stage tokens | accepted | [PowerPoint colours](../phase-01/dwi-011/pptx-colours.json) |
| DWI-012 | Make chart and diagram roles accessible | accepted | [Phase 01](../phase-01/report.md) |
| DWI-013 | Expose palette evidence in one picker | accepted | [browser run](../phase-01/dwi-013/browser/report.json) |
| DWI-020 | Add bounded multiple-document intake | accepted | [Phase 02](../phase-02/report.md) (PDF/DOCX deliberately disabled) |
| DWI-021 | Build claim source and contradiction records | accepted | [Phase 02](../phase-02/report.md) |
| DWI-022 | Review story before composition | accepted | [browser run](../phase-02/dwi-022/browser/report.json) |
| DWI-023 | Validate agent handoffs and project migrations | accepted | [Phase 02](../phase-02/report.md) |
| DWI-030 | Implement task-aware layout candidate policy | accepted | [Phase 03](../phase-03/report.md) |
| DWI-031 | Separate claim citations from full references | accepted | [Phase 03](../phase-03/report.md) |
| DWI-032 | Protect dominant images and truthful charts | implemented | [evidence share](../phase-03/dwi-032/evidence-share.json): workflow 0.35 and mechanism 0.70 outside the 0.45–0.65 default |
| DWI-033 | Compose readable workflows and mechanism figures | accepted | [blueprint run](../phase-03/dwi-033/) |
| DWI-034 | Export the first complete native vertical slice | accepted | [export run](../phase-03/dwi-034/export-targets/) |
| DWI-040 | Simplify the existing workbench shell | implemented | [Phase 04](../phase-04/report.md): export dialog has no single recommended format (a product decision) |
| DWI-041 | Add accessible bounded slide dial | accepted | [browser run](../phase-04/browser/report.json) |
| DWI-042 | Add quiet original detent feedback | implemented | [Phase 04](../phase-04/report.md): logic tested; the tick was not heard (automation is silent) |
| DWI-043 | Test complete keyboard touch and recovery flows | implemented | [Phase 04](../phase-04/report.md): keyboard and recovery pass; screen reader and touch not run |
| DWI-050 | Integrate only documented host capabilities | blocked | [Phase 05](../phase-05/report.md): local route done; a live Codex or Claude run needs the user's go-ahead |
| DWI-051 | Evaluate Kimi compatibility as an isolated option | blocked | [feasibility](../phase-05/dwi-051/feasibility.md): needs network and a Python environment approved by the user |
| DWI-052 | Extend film palette provenance deliberately | blocked | [Phase 05](../phase-05/report.md): contract built; no licensed media |
| DWI-053 | Complete product and recent-study coverage audit | planned | [protocol](../phase-05/dwi-053/protocol.md) |
| DWI-060 | Run cross-mode visual and novice acceptance | implemented | [88 palette renders, 0 issues](dwi-060/palette-render-report.json); novice study blocked ([protocol](dwi-060/novice-study-protocol.md)) |
| DWI-061 | Open exports in real target applications | blocked | [checklist for the user](dwi-061/checklist.md): PowerPoint 16.114 and Keynote 14.5 installed, not opened |
| DWI-062 | Package reproducible offline release candidate | accepted | [manifest](dwi-062/manifest.json), [SHA256SUMS](dwi-062/SHA256SUMS), [capability matrix](dwi-062/capability-matrix.json) |
| DWI-063 | Close the handoff with truthful status | accepted | this report; [handoff](../../../en/handoff.md); [roadmap](../../../../ROADMAP.md) |

Counts: 19 accepted, 5 implemented, 4 blocked, 1 planned.

## Phase 06 work

- **DWI-060.** `tests/browser_dwi_palettes.mjs` draws the six-page slice in every palette and mode (66 English decks, 22 Chinese light decks) in isolated Chromium 151 and runs the existing render check: 0 coverage, fit, overflow, contrast or glyph issues, no page errors, no external requests. [Contact sheet](dwi-060/palette-contact.jpg) of page 1 per palette and mode: colour stays in the rules, chart lines and markers; text keeps the neutral ink. The novice study has a fixed protocol and was not run.
- **DWI-061.** Not run by this session; the [checklist](dwi-061/checklist.md) gives the user the files, steps and how to record results.
- **DWI-062.** `scripts/release-candidate.mjs` builds the plugin twice from the committed source (identical bytes), scans every archive entry for the private workpack inputs, environment files, fonts, sounds, key files, credentials and home-directory paths, unpacks the archive into an empty folder and runs `new`, `check`, `export --format html`, `export --format pptx` and `doctor` there with the network denied by `sandbox-exec`. It publishes nothing.
- **DWI-063.** This report, the [English](../../../en/handoff.md) and [Chinese](../../../zh-CN/handoff.md) handoff, the [roadmap](../../../../ROADMAP.md) section and the status record.

## Decisions the user owns

1. Open the exports in PowerPoint and Keynote and record the results ([checklist](dwi-061/checklist.md)).
2. Whether to allow one live Codex CLI run (it uses the account's allowance) and whether to resume Claude sign-in.
3. Whether to enlarge process diagrams (changes the markup of every existing deck with a diagram; needs an announced re-recording).
4. Which format the Take away dialog should recommend, and whether its engineering status line should move out of the dialog.
5. Whether to approve the Kimi comparison, film-frame sampling (needs licensed media) or the research audit.
6. Whether and how to merge or push this branch.
