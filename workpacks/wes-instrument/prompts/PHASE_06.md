# Phase 06 — Real acceptance and release candidate

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-060, DWI-061, DWI-062, DWI-063. Confirm required dependency tasks and the prior phase-05 report. Reconcile any blocked optional tasks explicitly.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-060 | High | High | High | `prompts/tasks/DWI-060.md` |
| DWI-061 | Medium | High | High | `prompts/tasks/DWI-061.md` |
| DWI-062 | Medium | High | High | `prompts/tasks/DWI-062.md` |
| DWI-063 | Low | Medium | Medium | `prompts/tasks/DWI-063.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Run cross-mode visual, accessibility, novice and export-application acceptance. Use a documented environment and actual applications. Package a reproducible offline release candidate with logs, source revision, checksums and honest capability states. Never publish, push, change licensing or expose user source material without direct user instruction.

## Task acceptance

### DWI-060: Run cross-mode visual and novice acceptance
- All seed palettes and output modes have representative render checks.
- Formative novices complete input/edit/export/recover tasks.
- Comprehension and preference are reported separately with limitations.

### DWI-061: Open exports in real target applications
- Record PowerPoint/Keynote version and actual object-edit tests where available.
- Real host invocation is recorded or explicitly blocked.
- Structural OOXML tests do not substitute for rendering/application evidence.

### DWI-062: Package reproducible offline release candidate
- Fresh offline install/start/export succeeds on documented environment.
- No user inputs, secrets, fonts or unlicensed assets leak into distribution.
- Manifest, checksums, test logs and capability matrix accompany the archive.

### DWI-063: Close the handoff with truthful status
- Each task links its evidence or named blocker.
- Optional research/adapters are reported as partial when unfinished.
- The user receives an actual artifact path, not a background-task claim.

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
