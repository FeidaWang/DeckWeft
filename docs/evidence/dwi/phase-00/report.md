# DWI Phase 00 — baseline, reuse map, host inventory, rights and fixtures

Date: 2026-10-21. Branch `claude/read-work-package-00-06-256b3e`, based on `05643c6` (the commit the workpack recorded; `origin/main` points at it). Workpack: `workpacks/wes-instrument/` (v1.1), copied unchanged from the user's download; its private `inputs/` folder is git-ignored.

## Model and effort

The workpack routes every task to a user-approved Codex Sol model. This work ran in the Claude desktop app (Code tab) on `claude-opus-5-5`, because the user started it there with the instruction to read the workpack and work through phases 00–06. Effort is not observable from inside the session and is recorded as `null`. No Sol model, Astra quota, API key, host configuration change or extra agent session was used. One read-only exploration subagent of the same session mapped existing modules.

## Commands and results

| Command | Exit | Result | Output |
|---|---|---|---|
| `npm --prefix workpacks/wes-instrument run integrity` | 0 | 102 files match the manifest | — |
| `npm --prefix workpacks/wes-instrument run verify` | 0 | 108 workpack tests pass; validator PASS (workpack checks only) | — |
| `node workpacks/wes-instrument/scripts/inspect-repo.mjs .` | 0 | HEAD `05643c6…`, only `workpacks/` untracked | [inspect-repo.json](inspect-repo.json) |
| `npm run verify` (before any change) | 0 | 573 tests: 567 pass, 0 fail, 5 skipped, 1 todo — the numbers recorded for `05643c6` | [verify-baseline.txt](verify-baseline.txt) |
| `node --test tests/dwi-000.test.mjs … dwi-003.test.mjs` | 0 | 21 tests pass | — |
| `npm run verify` (after Phase 00) | 0 | 594 tests: 588 pass, 0 fail, 5 skipped, 1 todo | [verify-phase-00.txt](verify-phase-00.txt) |
| `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node scripts/export-targets.mjs --dwi` | 0 | see DWI-003 | [dwi-003/](dwi-003/) |

The five skips are the existing environment gates (`DECKWEFT_HANDOFF_DIR`, `CHROMIUM_PATH`); the todo is the recorded wording test. None were relabelled.

## Tasks

**DWI-000 — accepted.** [Reuse map](dwi-000/reuse-map.json): 29 tasks → 2 reuse, 15 extend, 7 new, 5 blocked; seven conflicts with resolutions (palette "stage" vs the orange-launch art direction, closed theme enum, evidence schema without model fields, roadmap.json vs TASKS.json, 4:3 unsupported, 12,000-character source limit, model routing). Test: `tests/dwi-000.test.mjs`.

**DWI-001 — accepted.** [Host inventory](dwi-001/host-capabilities.json): Codex CLI 0.160.0 and Claude Code 2.1.288 installed; DeckWeft skill not installed for either; authentication not probed; no DWI host invocation; neither CLI documents a Slides command, so none is recorded. PowerPoint 16.114 and Keynote 14.5 are installed and were not opened. Test: `tests/dwi-001.test.mjs` (also checks an absent CLI is reported unavailable, not simulated).

**DWI-002 — accepted.** [Rights dispositions](dwi-002/rights.json) for 11 planned asset classes. The archived reports are excluded and non-normative; their illustrative palettes (PAL001/PAL002), `openai slides …` and `import slides_api` are absent from `src`, `public`, `schemas`, `themes`, `bin` and `skills`. Test: `tests/dwi-002.test.mjs`.

**DWI-003 — accepted.** `tests/dwi-slice.mjs`: six pages (assertion + evidence, comparison table, small multiples on one 0–40 scale, five-step workflow, mechanism map with a not-to-scale statement, reading brief) in English and Simplified Chinese with identical ids, values and sources; a null with a reason, units, denominators, separate locks and claim sources are declared invariants. `tests/dwi-003.test.mjs` checks them through HTML, PowerPoint (synthetic layout) and PDF. The measured run in isolated Chrome for Testing 151 ([en sheet](dwi-003/dwi-slice-en-sheet.jpg), [zh-CN sheet](dwi-003/dwi-slice-zh-CN-sheet.jpg), reports beside them):

- PowerPoint editability and the scene check pass in both languages (27 L1 elements, 1 L3: the line chart with the missing round, delivered as an element image with a receipt).
- Typography **fails** on the small-multiples page: two chart annotations at 5.97/5.99 pt against the 6 pt minimum (the known SVG-chart-label limit).
- PDF accessibility **fails**: one of seven figures has no alternative text (page 6). PDF search is partial in Chinese (radical code points U+2E9F, U+2EDA — the known S7 limit).
- Visual review of the sheets: the paged PowerPoint puts the assertion title alone on its first slide and the chart on the second; the mechanism map routes Document → Measured scene through a long elbow and draws the three output arrows upward from below. Both are baseline weaknesses for DWI-030/033/034, not fixed here.

## Files

Added: `workpacks/wes-instrument/**` (except `inputs/`), `tests/dwi-000…003.test.mjs`, `tests/dwi-slice.mjs`, `docs/evidence/dwi/phase-00/**`. Changed: `.gitignore` (ignore the private inputs), `scripts/export-targets.mjs` (`--dwi`). No runtime code, schema, renderer or player byte changed.

## Not run

PowerPoint, Keynote, LibreOffice (not installed), any host task, screen readers. `dist/dwi-export-targets/` is build output and not tracked.

## Recovery

Every change is additive. Revert the phase commit to return to `05643c6`; `npm run verify` then reproduces the baseline numbers above.

## Next

Phase 01 (DWI-010, DWI-011, DWI-012, DWI-013): dependencies DWI-002 and DWI-003 are met.
