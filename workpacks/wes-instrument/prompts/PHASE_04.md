# Phase 04 — Novice workbench and instrument control

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-040, DWI-041, DWI-042, DWI-043. Confirm required dependency tasks and the prior phase-03 report. Reconcile any blocked optional tasks explicitly.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-040 | Medium | High | High | `prompts/tasks/DWI-040.md` |
| DWI-041 | High | High | Extra High | `prompts/tasks/DWI-041.md` |
| DWI-042 | Medium | Medium | High | `prompts/tasks/DWI-042.md` |
| DWI-043 | High | High | Extra High | `prompts/tasks/DWI-043.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Simplify the existing shell rather than creating a new UI framework. Add one optional native-backed dial for bounded slide navigation with stable IDs, keyboard and touch alternatives, focus management, IME safety and cancelled-pointer handling. Original short sound feedback is a separate opt-in P2 task; the entire workflow must work silently and with reduced motion.

## Task acceptance

### DWI-040: Simplify the existing workbench shell
- One obvious next action in empty/import/review/export states.
- No duplicate toolbars or dead gauges.
- Viewport fit does not change slide coordinates or hide primary controls.

### DWI-041: Add accessible bounded slide dial
- 0/1/N slide cases, reorder and current-slide deletion are safe.
- Arrow/Home/End and visible alternatives work without a rotation gesture.
- No global wheel/arrow hijack, IME interference or loss of focus.

### DWI-042: Add quiet original detent feedback
- Off by default and enabled only with a visible preference/user gesture.
- No backlog of sounds during rapid scrubbing; background/presenter output is quiet.
- Reduced motion and no-audio paths retain complete state feedback.

### DWI-043: Test complete keyboard touch and recovery flows
- Focus returns correctly after drawers/dialogs.
- Saved-state conflicts and restore-as-copy remain intact.
- Screen-reader/touch results are recorded separately from unit tests.

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
