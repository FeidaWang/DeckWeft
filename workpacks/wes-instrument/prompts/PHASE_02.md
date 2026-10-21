# Phase 02 — Safe intake and story contracts

You are working inside the existing DeckWeft repository. The workpack is `workpacks/wes-instrument/`. This is an execution instruction, not a request for another roadmap.

## Read first
Repository AGENTS.md and current contracts; workpack MASTER_PLAN.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, RESEARCH_AUDIT.md, TEST_PLAN.md; TASKS.json entries DWI-020, DWI-021, DWI-022, DWI-023. Confirm required dependency tasks and the prior phase-01 report. Reconcile any blocked optional tasks explicitly.

## Model and effort gate
Read `MODEL_ROUTING.md` and the task's `modelRouting` in `TASKS.json` before implementation. All rows use `sol-approved`: an actually available, user-approved Sol model. GPT-6.1 Sol is conditional on host availability, not a fabricated entitlement. Do not use Astra or an API fallback automatically.

The user must select/approve model and effort in the real host. Markdown does not switch settings. Record actual settings only when observed or user-confirmed; otherwise record null/unverified. Do not start an extra review agent, change configuration, consume protected quota or escalate effort automatically.

| Task | Build | Review | Conditional ceiling | Task prompt |
|---|---|---|---|---|
| DWI-020 | High | High | Extra High | `prompts/tasks/DWI-020.md` |
| DWI-021 | High | High | Extra High | `prompts/tasks/DWI-021.md` |
| DWI-022 | Medium | High | High | `prompts/tasks/DWI-022.md` |
| DWI-023 | High | High | Extra High | `prompts/tasks/DWI-023.md` |

The individual task record controls; do not apply one maximum effort to this whole phase. After two targeted unsuccessful repairs, preserve a minimal reproducer and request a decision. Missing tools, sources, permissions or quota remain blockers.

## Execute
Implement bounded multi-input handling, beginning with formats supported locally. Preserve source hashes, locators, numbers and contradictions. Add a reviewable story outline and an explicit handoff contract using existing v1/v3 concepts. No automatic research/model call. Reject unsupported documents with a useful recovery message instead of inventing their text.

## Task acceptance

### DWI-020: Add bounded multiple-document intake
- Text and Markdown work offline with per-document hashes and locators.
- PDF/DOCX adapters are enabled only after local parser/dependency review.
- Encrypted, scanned or malformed documents yield explicit recovery and never silently vanish.

### DWI-021: Build claim source and contradiction records
- Every factual claim is source-linked or evidence-required.
- Contradictory numbers stay distinct with their attribution.
- No imported text is executed as instructions.

### DWI-022: Review story before composition
- The novice can review audience, outcome and a concise outline.
- Approving a new plan preserves the prior project/copy.
- At most three visible style directions; no required prompt syntax.

### DWI-023: Validate agent handoffs and project migrations
- Handoffs contain content, sources and declared capabilities, not credentials.
- Unknown schema fields fail with a repair path.
- Classic and visual/v3 inputs keep their contracts and round-trip invariants.

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
