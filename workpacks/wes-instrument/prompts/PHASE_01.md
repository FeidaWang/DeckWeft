# Phase 01 — Palette evidence and semantic roles

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-010, DWI-011, DWI-012, DWI-013. Confirm required dependency tasks and the prior phase-00 report. Reconcile any blocked optional tasks explicitly.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-010 | Medium | High | High | `prompts/tasks/DWI-010.md` |
| DWI-011 | High | High | Extra High | `prompts/tasks/DWI-011.md` |
| DWI-012 | High | High | High | `prompts/tasks/DWI-012.md` |
| DWI-013 | Medium | Medium | High | `prompts/tasks/DWI-013.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Integrate immutable palette data through the existing theme registry and schema/version system. Use exact source/library values; keep screenshot samples and derived role colours separate. Implement contrast checks on actual semantic pairs, then extend diagram/chart styles. Do not render every seed swatch as an equally important accent. Resolve a single picker in the existing shell; keep its evidence UI compact.

## Task acceptance

### DWI-010: Integrate immutable palette registry
- 22 unique seed palette IDs; Rushmore remains an alias, not a duplicate.
- Library values and screenshot samples remain separate.
- Film timestamps stay null until a real frame record exists.

### DWI-011: Resolve semantic light dark and stage tokens
- Derived roles never overwrite source RGBs.
- Normal text pairs meet 4.5:1 without rounding; meaningful strokes meet 3:1 where required.
- Stage body policy targets 7:1; status colours stay semantic and independent of the movie theme.

### DWI-012: Make chart and diagram roles accessible
- No colour-only series/part identity.
- Adjacency checks cover marks, arrows and callout boundaries.
- Categorical swatches are never silently used as a sequential magnitude scale.

### DWI-013: Expose palette evidence in one picker
- One theme/palette picker, not a second competing design panel.
- Show community-derived status without crowding the slide.
- Switching a palette preserves content, locks and undo.

## Commands and evidence
From the repository root, set the actual workpack location once:
```sh
WP=workpacks/wes-instrument
node "$WP/scripts/inspect-repo.mjs" .
npm --prefix "$WP" run verify
```
For each code change, add or map the task's testFile from TASKS.json. Run it using `node --test tests/<the-actual-task-test-file>.test.mjs` after the file exists; do not run a placeholder literally. Then run the current repository's `npm run verify`. Use `npm run visual:verify` for rendered behaviour and the documented host/export checks only when their executables are available. Record the exact command actually used, not the example placeholder.

Write `docs/evidence/dwi/phase-XX/report.md` with XX replaced by this phase number. Include current commit, file changes, command exit codes, stdout location, screenshots where relevant, unavailable apps, rollback/recovery and task states. Add machine-readable evidence records using the workpack's evidence schema.

## Stop conditions
Do not overwrite dirty user files. Do not weaken schemas, cut text, guess citations, flatten complete slides, invoke a paid API, install dependencies invisibly or publish. A missing permission or dependency blocks that path; it is not a passing test. A private vendor API is not something to fabricate.

## Finish
Report completed, blocked and unstarted task IDs separately, with actual file paths and commands. State the next executable task. Advance to the next phase only when all required dependencies are met; optional P2 work may remain explicitly deferred for a labelled alpha. Never announce a background task instead of delivering files.
