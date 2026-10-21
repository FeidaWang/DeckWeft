# Phase 03 — Measured layouts and editable export

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-030, DWI-031, DWI-032, DWI-033, DWI-034. Confirm required dependency tasks and the prior phase-02 report. Reconcile any blocked optional tasks explicitly.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-030 | High | High | Extra High | `prompts/tasks/DWI-030.md` |
| DWI-031 | Medium | High | High | `prompts/tasks/DWI-031.md` |
| DWI-032 | High | High | High | `prompts/tasks/DWI-032.md` |
| DWI-033 | High | High | Extra High | `prompts/tasks/DWI-033.md` |
| DWI-034 | High | High | Extra High | `prompts/tasks/DWI-034.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Extend the existing measured layout and scene compiler. Build all six layout families around claim/evidence relationships and stable source metadata. Keep a large useful main figure, honest quantitative semantics and editable diagram parts. Create a six-page native export fixture. Compare preview/export semantic content and inspect OOXML; do not claim PowerPoint compatibility without actual app evidence.

## Task acceptance

### DWI-030: Implement task-aware layout candidate policy
- Reject overflow and unreadable type before aesthetic scoring.
- Six layout families have explicit logical reading order.
- No mandatory F/Z or golden-ratio rule; self-paced and stage modes differ.

### DWI-031: Separate claim citations from full references
- Readable compact source keys remain near claims.
- Full source metadata appears in an appendix/source view.
- Warnings and essential qualifiers are never hidden as tiny footnotes.

### DWI-032: Protect dominant images and truthful charts
- Figure-led slides allocate meaningful space to evidence.
- Numeric values, axis policies, intervals and nulls survive layout/theme changes.
- No default recolouring of evidence or colour-critical photos.

### DWI-033: Compose readable workflows and mechanism figures
- Stable part IDs, attached labels and directed edges.
- Illustrations identify not-to-scale or unverified physical properties.
- Step reveals have a complete, meaningful static export state.

### DWI-034: Export the first complete native vertical slice
- Preview and export use the same semantic scene.
- Native text, shapes and supported chart/diagram objects are checked structurally.
- Unsupported export behaviours are disclosed; original source project remains recoverable.

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
