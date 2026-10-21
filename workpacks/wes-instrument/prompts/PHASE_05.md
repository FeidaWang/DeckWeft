# Phase 05 — Host adapters and research breadth

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-050, DWI-051, DWI-052, DWI-053. Confirm required dependency tasks and the prior phase-04 report. Reconcile any blocked optional tasks explicitly.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-050 | High | High | Extra High | `prompts/tasks/DWI-050.md` |
| DWI-051 | High | High | High | `prompts/tasks/DWI-051.md` |
| DWI-052 | High | High | High | `prompts/tasks/DWI-052.md` |
| DWI-053 | High | High | High | `prompts/tasks/DWI-053.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Integrate only capabilities exposed by actual documented host contracts. Record missing Spaces internal APIs explicitly. Evaluate the Kimi route only as an isolated, user-approved experiment because remote runtime resources and dependency installation may be involved. Expand film/product/literature coverage with verifiable source records; do not fabricate unavailable frames, papers or code.

## Task acceptance

### DWI-050: Integrate only documented host capabilities
- Record actual invocation in each available host with version.
- Unavailable Spaces internal implementation is not a mandatory dependency.
- Local generation stays useful with no host research capability.

### DWI-051: Evaluate Kimi compatibility as an isolated option
- Document remote writer/resource requirements and licences.
- No automatic pip/browser install or remote load in the default path.
- Compare editable fidelity and content preservation on a permitted fixture.

### DWI-052: Extend film palette provenance deliberately
- Verify dated filmography and define feature/short/ad scope.
- Only permitted media is sampled; record edition, timestamp, transfer function and frame hash.
- Scene and neutral/skin/subtitle handling, cluster seed, weighting and deduplication are reproducible.

### DWI-053: Complete product and recent-study coverage audit
- Review all catalogue links and historical-product scope, marking unavailable material.
- Search current primary studies; record methods, samples, outcomes and access limits.
- Separate attention, comprehension, preference and persuasion; no fabricated effect sizes.

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
