# Phase 00 — Audit before touching code

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-000, DWI-001, DWI-002, DWI-003. There are no prior phase gates.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-000 | High | High | Extra High | `prompts/tasks/DWI-000.md` |
| DWI-001 | Medium | Medium | High | `prompts/tasks/DWI-001.md` |
| DWI-002 | High | High | High | `prompts/tasks/DWI-002.md` |
| DWI-003 | Medium | Medium | High | `prompts/tasks/DWI-003.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Record git status and HEAD; inspect AGENTS.md, package.json, ROADMAP.md, schemas and current implementation. Run the workpack inspector and its tests without network. Then run available target-repository verification with existing dependencies. If TypeScript/browser/host tools are missing, record them; do not install silently. Create a task-to-existing-module matrix and a host capability inventory. Do not edit application behaviour yet.

## Task acceptance

### DWI-000: Record and reconcile the current repository
- Record git HEAD, dirty files, Node version and existing scripts.
- Map earlier CINE/VIS/S work to reuse, extend or unnecessary; do not overwrite user edits.
- Run available baseline checks and record failures without relabelling skipped checks.

### DWI-001: Inventory real host capabilities
- Record actual Codex/Claude versions only when available.
- Keep local tests, installation, enablement and real invocation as separate states.
- Do not use an undocumented Slides command or infer account entitlements.

### DWI-002: Adopt corrected evidence and rights rules
- Original reports remain non-normative.
- No example Lab values or unsupported API calls enter production code.
- Every planned imported asset has a provenance/licence disposition.

### DWI-003: Capture regression fixtures
- Create six representative slide fixtures using current supported contracts.
- Capture current exports and measured render paths.
- Locks, source links, values and notes have explicit invariants.

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
