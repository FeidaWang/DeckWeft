# Executable task queue

These are application implementation tasks, not a claim that code has already been merged. `TASKS.json` is authoritative for IDs/dependencies. Existing equivalent implementations may satisfy a task only after regression evidence is attached. Proposed testFile names are canonical new task tests; reuse or add specialised tests mentioned below and record the mapping.

Priorities: P0 = integrity and usable local vertical slice; P1 = usability and real acceptance; P2 = optional material effects, adapters and corpus expansion. Optional P2 tasks do not block a labelled local alpha, but remain visibly incomplete.

## Phase 00 — Audit before touching code (P0)

### DWI-000 · P0 · Record and reconcile the current repository
Status: **planned**. Dependencies: none. Target locations: `AGENTS.md`, `package.json`, `ROADMAP.md`, `PROJECT_STATUS.json`.

Read current contracts and create a conflict/reuse map. The recorded commit is a reference, not a required reset target.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Resolve a changing repository baseline and overlapping CINE/VIS/S contracts before editing.

Escalation/checkpoint: A minimal conflict map still contains incompatible schema or exporter assumptions after two distinct, evidenced analyses. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-000.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Record git HEAD, dirty files, Node version and existing scripts.
- Map earlier CINE/VIS/S work to reuse, extend or unnecessary; do not overwrite user edits.
- Run available baseline checks and record failures without relabelling skipped checks.

Create or map regression test `tests/dwi-000.test.mjs`. Evidence: `docs/evidence/dwi/phase-00/dwi-000/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-001 · P0 · Inventory real host capabilities
Status: **planned**. Dependencies: DWI-000. Target locations: `docs/en/host-acceptance.md`, `docs/en/compatibility.md`.

Probe documented local capabilities without modifying host settings; unavailable clients become explicit blockers for host-only tests.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `medium`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: The work is bounded capability inspection rather than new architecture.

Escalation/checkpoint: Observed version/help output contradicts the documented capability contract; unavailable binaries are blockers, not a reason to increase effort. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-001.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Record actual Codex/Claude versions only when available.
- Keep local tests, installation, enablement and real invocation as separate states.
- Do not use an undocumented Slides command or infer account entitlements.

Create or map regression test `tests/dwi-001.test.mjs`. Evidence: `docs/evidence/dwi/phase-00/dwi-001/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-002 · P0 · Adopt corrected evidence and rights rules
Status: **planned**. Dependencies: DWI-000. Target locations: `RESEARCH_AUDIT.md`, `data/source-register.json`, `data/coverage.json`.

Resolve research conflicts before code generation. Preserve screenshot/library/frame distinctions and the partial corpus label.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Keep source evidence, inferred design rules and asset rights distinct.

Escalation/checkpoint: Sources disagree or rights remain uncertain: preserve the unresolved finding and obtain primary evidence; do not solve missing evidence by escalating effort. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-002.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Original reports remain non-normative.
- No example Lab values or unsupported API calls enter production code.
- Every planned imported asset has a provenance/licence disposition.

Create or map regression test `tests/dwi-002.test.mjs`. Evidence: `docs/evidence/dwi/phase-00/dwi-002/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-003 · P0 · Capture regression fixtures
Status: **planned**. Dependencies: DWI-000. Target locations: `tests`, `examples`, `docs/evidence/dwi/phase-00`.

Use existing harnesses; a baseline image without the underlying project and command is insufficient.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `medium`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Freeze representative fixtures and exact content invariants using the existing harness.

Escalation/checkpoint: A fixture cannot reproduce the same source/lock invariants across current pipelines; isolate that mismatch before changing the harness. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-003.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Create six representative slide fixtures using current supported contracts.
- Capture current exports and measured render paths.
- Locks, source links, values and notes have explicit invariants.

Create or map regression test `tests/dwi-003.test.mjs`. Evidence: `docs/evidence/dwi/phase-00/dwi-003/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

## Phase 01 — Palette evidence and semantic roles (P0)

### DWI-010 · P0 · Integrate immutable palette registry
Status: **planned**. Dependencies: DWI-002, DWI-003. Target locations: `src/design`, `schemas`, `tests/dwi-palette.test.mjs`.

Map PALETTES.json into the current theme registry; add a versioned palette schema without weakening existing project validation.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Registry integration is constrained by immutable seed data and the existing theme contract.

Escalation/checkpoint: An explicit schema migration changes old saved projects or creates conflicting palette identities. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-010.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- 22 unique seed palette IDs; Rushmore remains an alias, not a duplicate.
- Library values and screenshot samples remain separate.
- Film timestamps stay null until a real frame record exists.

Create or map regression test `tests/dwi-010.test.mjs`. Evidence: `docs/evidence/dwi/phase-01/dwi-010/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-011 · P0 · Resolve semantic light dark and stage tokens
Status: **planned**. Dependencies: DWI-010. Target locations: `src/design`, `src/render`, `tests/dwi-color-roles.test.mjs`.

Use the supplied color functions as reference; account for actual backgrounds, alpha blending and exports.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Colour roles, composited backgrounds and multiple exporters must agree numerically.

Escalation/checkpoint: A reproducible alpha, transfer-function or export discrepancy survives two distinct fixes with numeric test vectors. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-011.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Derived roles never overwrite source RGBs.
- Normal text pairs meet 4.5:1 without rounding; meaningful strokes meet 3:1 where required.
- Stage body policy targets 7:1; status colours stay semantic and independent of the movie theme.

Create or map regression test `tests/dwi-011.test.mjs`. Evidence: `docs/evidence/dwi/phase-01/dwi-011/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-012 · P0 · Make chart and diagram roles accessible
Status: **planned**. Dependencies: DWI-011. Target locations: `src/components/charts`, `src/design`, `tests/dwi-diagram-colors.test.mjs`.

Direct labels, strokes, patterns and a readable data table provide redundant information channels.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Chart and diagram identities must survive colour, label, pattern and output changes.

Escalation/checkpoint: Accessible redundant encodings conflict with native export: split by component and test the contract rather than using unbounded retries. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-012.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- No colour-only series/part identity.
- Adjacency checks cover marks, arrows and callout boundaries.
- Categorical swatches are never silently used as a sequential magnitude scale.

Create or map regression test `tests/dwi-012.test.mjs`. Evidence: `docs/evidence/dwi/phase-01/dwi-012/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-013 · P1 · Expose palette evidence in one picker
Status: **planned**. Dependencies: DWI-011. Target locations: `public/shell.js`, `public/kinds/visual.js`.

Use small metadata in the picker and an expandable evidence view; movie provenance does not belong as a giant on-slide logo.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `medium`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: A single picker and its evidence disclosure reuse known shell patterns.

Escalation/checkpoint: Changing a palette unexpectedly alters locks, undo or author-selected composition. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-013.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- One theme/palette picker, not a second competing design panel.
- Show community-derived status without crowding the slide.
- Switching a palette preserves content, locks and undo.

Create or map regression test `tests/dwi-013.test.mjs`. Evidence: `docs/evidence/dwi/phase-01/dwi-013/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

## Phase 02 — Safe intake and story contracts (P0)

### DWI-020 · P0 · Add bounded multiple-document intake
Status: **planned**. Dependencies: DWI-003, DWI-010. Target locations: `src/services`, `src/core`, `tests/dwi-intake.test.mjs`.

Reuse existing importers; distinguish supported parsing from desired future formats. Preserve duplicates and source ordering.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Untrusted documents, parser boundaries and multiple source locators create data-loss and security risks.

Escalation/checkpoint: A small malicious/malformed fixture demonstrates unresolved parser isolation, resource-bound or source-loss behaviour after two targeted attempts. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-020.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Text and Markdown work offline with per-document hashes and locators.
- PDF/DOCX adapters are enabled only after local parser/dependency review.
- Encrypted, scanned or malformed documents yield explicit recovery and never silently vanish.

Create or map regression test `tests/dwi-020.test.mjs`. Evidence: `docs/evidence/dwi/phase-02/dwi-020/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-021 · P0 · Build claim source and contradiction records
Status: **planned**. Dependencies: DWI-020. Target locations: `src/core`, `schemas`, `tests/dwi-provenance.test.mjs`.

Map onto existing sources/contentStatus/takeaway fields; add fields only through a tested explicit migration.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Claim identity, contradictory values and source locators must survive explicit migrations.

Escalation/checkpoint: A minimal round-trip fixture still loses or misbinds claims/sources after two hypothesis-driven attempts. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-021.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Every factual claim is source-linked or evidence-required.
- Contradictory numbers stay distinct with their attribution.
- No imported text is executed as instructions.

Create or map regression test `tests/dwi-021.test.mjs`. Evidence: `docs/evidence/dwi/phase-02/dwi-021/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-022 · P0 · Review story before composition
Status: **planned**. Dependencies: DWI-021. Target locations: `public/shell.js`, `src/core`, `tests/dwi-story-review.test.mjs`.

Provide deterministic local outlining for pasted material; allow an explicitly supplied agent outline without hidden AI calls.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: The reviewed outline is a bounded local workflow with preserved project copies.

Escalation/checkpoint: Accepting an outline changes existing source/lock semantics or requires a new planning contract. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-022.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- The novice can review audience, outcome and a concise outline.
- Approving a new plan preserves the prior project/copy.
- At most three visible style directions; no required prompt syntax.

Create or map regression test `tests/dwi-022.test.mjs`. Evidence: `docs/evidence/dwi/phase-02/dwi-022/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-023 · P0 · Validate agent handoffs and project migrations
Status: **planned**. Dependencies: DWI-021, DWI-001. Target locations: `src/plugin`, `schemas`, `tests/dwi-handoff.test.mjs`.

Do not treat a code-generation agent session as an API key or permission to bypass local security.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Agent handoffs cross trust and project-version boundaries.

Escalation/checkpoint: A reproducible privilege, unknown-field or version-migration failure survives two isolated repairs. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-023.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Handoffs contain content, sources and declared capabilities, not credentials.
- Unknown schema fields fail with a repair path.
- Classic and visual/v3 inputs keep their contracts and round-trip invariants.

Create or map regression test `tests/dwi-023.test.mjs`. Evidence: `docs/evidence/dwi/phase-02/dwi-023/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

## Phase 03 — Measured layouts and editable export (P0)

### DWI-030 · P0 · Implement task-aware layout candidate policy
Status: **planned**. Dependencies: DWI-011, DWI-022. Target locations: `src/layout`, `src/design`, `tests/dwi-reading-policy.test.mjs`.

Reuse the existing candidate engine; preserve its measured text and grapheme constraints.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Measured typography, layout feasibility and target-specific geometry form a coupled constraint problem.

Escalation/checkpoint: A fixed fixture cannot meet content, typography and geometry invariants after two documented candidate-policy fixes. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-030.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Reject overflow and unreadable type before aesthetic scoring.
- Six layout families have explicit logical reading order.
- No mandatory F/Z or golden-ratio rule; self-paced and stage modes differ.

Create or map regression test `tests/dwi-030.test.mjs`. Evidence: `docs/evidence/dwi/phase-03/dwi-030/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-031 · P0 · Separate claim citations from full references
Status: **planned**. Dependencies: DWI-021, DWI-030. Target locations: `src/design`, `src/render`, `tests/dwi-sources.test.mjs`.

Reduce citation clutter without deleting provenance; keep hyperlinks and export metadata where supported.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Compact source display can reuse the existing references layer but needs strong fidelity review.

Escalation/checkpoint: Reordering, disclosure or export breaks a claim-to-source link or hides an essential qualifier. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-031.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Readable compact source keys remain near claims.
- Full source metadata appears in an appendix/source view.
- Warnings and essential qualifiers are never hidden as tiny footnotes.

Create or map regression test `tests/dwi-031.test.mjs`. Evidence: `docs/evidence/dwi/phase-03/dwi-031/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-032 · P0 · Protect dominant images and truthful charts
Status: **planned**. Dependencies: DWI-012, DWI-030. Target locations: `src/components/charts/semantics.mjs`, `src/design`.

Use crop/placement and surrounding surfaces for integration rather than modifying image meaning.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Subject framing and chart semantics must preserve data and protected regions.

Escalation/checkpoint: Theme or geometry changes alter values, nulls, scales or protected subject bounds: split and repair the affected invariant. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-032.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Figure-led slides allocate meaningful space to evidence.
- Numeric values, axis policies, intervals and nulls survive layout/theme changes.
- No default recolouring of evidence or colour-critical photos.

Create or map regression test `tests/dwi-032.test.mjs`. Evidence: `docs/evidence/dwi/phase-03/dwi-032/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-033 · P0 · Compose readable workflows and mechanism figures
Status: **planned**. Dependencies: DWI-012, DWI-030. Target locations: `src/design/scene-semantics.mjs`, `src/render`, `tests/dwi-mechanisms.test.mjs`.

Prefer editable vector/shape geometry; explain any per-asset fallback instead of hiding whole-slide rasterization.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Graph identity, labels, connectors and final static states must map to editable output.

Escalation/checkpoint: A minimal mechanism graph exposes unresolved label/edge identity or editable-export mismatch after two targeted repairs. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-033.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Stable part IDs, attached labels and directed edges.
- Illustrations identify not-to-scale or unverified physical properties.
- Step reveals have a complete, meaningful static export state.

Create or map regression test `tests/dwi-033.test.mjs`. Evidence: `docs/evidence/dwi/phase-03/dwi-033/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-034 · P0 · Export the first complete native vertical slice
Status: **planned**. Dependencies: DWI-031, DWI-032, DWI-033. Target locations: `src/render`, `tests/dwi-export-fidelity.test.mjs`.

Create a six-page fixture deck and compare content counts/values, not just whether a PPTX zip opens.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Preview, semantic scenes and native OOXML must preserve object editability and meaning.

Escalation/checkpoint: A six-page fixture still differs structurally or visually between targets after two isolated fixes and a minimised reproducer. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-034.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Preview and export use the same semantic scene.
- Native text, shapes and supported chart/diagram objects are checked structurally.
- Unsupported export behaviours are disclosed; original source project remains recoverable.

Create or map regression test `tests/dwi-034.test.mjs`. Evidence: `docs/evidence/dwi/phase-03/dwi-034/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

## Phase 04 — Novice workbench and instrument control (P1)

### DWI-040 · P1 · Simplify the existing workbench shell
Status: **planned**. Dependencies: DWI-034, DWI-013. Target locations: `public/shell.js`, `public/app.js`, `public/kinds`.

Keep current shell adapters; expose Words/Look/detail controls only where useful.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Refine the existing shell rather than redesigning application architecture.

Escalation/checkpoint: Novice simplification removes a required state, recovery control or keyboard path. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-040.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- One obvious next action in empty/import/review/export states.
- No duplicate toolbars or dead gauges.
- Viewport fit does not change slide coordinates or hide primary controls.

Create or map regression test `tests/dwi-040.test.mjs`. Evidence: `docs/evidence/dwi/phase-04/dwi-040/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-041 · P1 · Add accessible bounded slide dial
Status: **planned**. Dependencies: DWI-040. Target locations: `public/components/slide-dial.js`, `public/interaction.js`, `tests/dwi-dial.test.mjs`.

Use a native input foundation; visual metal is decoration over real semantics. Store active slide by stable ID.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Slide identity, drag/keyboard/touch input, IME and focus interact as a state machine.

Escalation/checkpoint: A deterministic event trace still jumps to the wrong slide or loses focus after two isolated fixes. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-041.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- 0/1/N slide cases, reorder and current-slide deletion are safe.
- Arrow/Home/End and visible alternatives work without a rotation gesture.
- No global wheel/arrow hijack, IME interference or loss of focus.

Create or map regression test `tests/dwi-041.test.mjs`. Evidence: `docs/evidence/dwi/phase-04/dwi-041/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-042 · P2 · Add quiet original detent feedback
Status: **planned**. Dependencies: DWI-041. Target locations: `public/components/interaction-audio.js`, `tests/dwi-audio.test.mjs`.

Synthesize a short original tick; no TE sound files or promised physical haptics.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `medium`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: A small original tick and explicit opt-in have a bounded local implementation.

Escalation/checkpoint: A deterministic trace reveals audio backlog, a background/presenter leak or failure to respect the preference. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-042.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Off by default and enabled only with a visible preference/user gesture.
- No backlog of sounds during rapid scrubbing; background/presenter output is quiet.
- Reduced motion and no-audio paths retain complete state feedback.

Create or map regression test `tests/dwi-042.test.mjs`. Evidence: `docs/evidence/dwi/phase-04/dwi-042/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-043 · P1 · Test complete keyboard touch and recovery flows
Status: **planned**. Dependencies: DWI-041. Target locations: `public/interaction.js`, `public/history.js`, `docs/evidence/dwi/phase-04`.

Test existing shell controls as well as the new dial; audit the whole task, not just a component.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Recovery, history and whole-workflow input checks span several existing components.

Escalation/checkpoint: A saved-state/reorder/restore event trace still loses data or focus after two targeted repairs. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-043.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Focus returns correctly after drawers/dialogs.
- Saved-state conflicts and restore-as-copy remain intact.
- Screen-reader/touch results are recorded separately from unit tests.

Create or map regression test `tests/dwi-043.test.mjs`. Evidence: `docs/evidence/dwi/phase-04/dwi-043/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

## Phase 05 — Host adapters and research breadth (P1/P2)

### DWI-050 · P1 · Integrate only documented host capabilities
Status: **planned**. Dependencies: DWI-023, DWI-034. Target locations: `src/plugin`, `docs/en/host-acceptance.md`.

Use official skills/handoff contracts and existing plugin packaging; refuse guessed Slides API stubs.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `xhigh`; no automatic switch or escalation.

Reason: Host adapters need documented interfaces and strict permission/usage boundaries.

Escalation/checkpoint: Actual authorised host output conflicts with the handoff contract after two isolated fixes; missing access or quota is a blocker, not a trigger. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-050.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Record actual invocation in each available host with version.
- Unavailable Spaces internal implementation is not a mandatory dependency.
- Local generation stays useful with no host research capability.

Create or map regression test `tests/dwi-050.test.mjs`. Evidence: `docs/evidence/dwi/phase-05/dwi-050/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-051 · P2 · Evaluate Kimi compatibility as an isolated option
Status: **planned**. Dependencies: DWI-034, DWI-002. Target locations: `integrations`, `docs/evidence/dwi/phase-05`.

A negative feasibility result is acceptable; retain DeckWeft native export rather than adding a silent cloud fallback.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Compatibility and remote resource/licence constraints need a bounded feasibility decision.

Escalation/checkpoint: A proprietary or unavailable dependency is required: record a negative feasibility result; do not escalate or install it to force success. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-051.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Document remote writer/resource requirements and licences.
- No automatic pip/browser install or remote load in the default path.
- Compare editable fidelity and content preservation on a permitted fixture.

Create or map regression test `tests/dwi-051.test.mjs`. Evidence: `docs/evidence/dwi/phase-05/dwi-051/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-052 · P2 · Extend film palette provenance deliberately
Status: **planned**. Dependencies: DWI-010, DWI-002. Target locations: `data/coverage.json`, `schemas`, `docs/evidence/dwi/phase-05`.

Do not promise every possible colour combination. Define a corpus/version and cluster representative scene palettes with explicit coverage.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Corpus, edition, transfer function, clustering and provenance need a reproducible method.

Escalation/checkpoint: Evidence or permitted footage is missing: mark the corpus partial; revisit the method only when actual data reveals a reproducibility defect. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-052.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Verify dated filmography and define feature/short/ad scope.
- Only permitted media is sampled; record edition, timestamp, transfer function and frame hash.
- Scene and neutral/skin/subtitle handling, cluster seed, weighting and deduplication are reproducible.

Create or map regression test `tests/dwi-052.test.mjs`. Evidence: `docs/evidence/dwi/phase-05/dwi-052/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-053 · P2 · Complete product and recent-study coverage audit
Status: **planned**. Dependencies: DWI-002, DWI-040. Target locations: `data/coverage.json`, `SOURCES.md`, `docs/evidence/dwi/phase-05`.

Extend the targeted source review into a documented search protocol; do not relabel this package as an exhaustive survey.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Compare primary evidence without confusing attention, comprehension, preference and persuasion.

Escalation/checkpoint: Papers or catalogue records are incomplete or conflicting: obtain primary material and retain limits; reasoning cannot replace unavailable sources. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-053.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Review all catalogue links and historical-product scope, marking unavailable material.
- Search current primary studies; record methods, samples, outcomes and access limits.
- Separate attention, comprehension, preference and persuasion; no fabricated effect sizes.

Create or map regression test `tests/dwi-053.test.mjs`. Evidence: `docs/evidence/dwi/phase-05/dwi-053/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

## Phase 06 — Real acceptance and release candidate (P1)

### DWI-060 · P1 · Run cross-mode visual and novice acceptance
Status: **planned**. Dependencies: DWI-034, DWI-043. Target locations: `tests`, `docs/evidence/dwi/phase-06`.

Use TEST_PLAN.md; recruit a suitable sample and predefine task outcomes rather than inventing study results.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `high`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Acceptance combines broad visual results with separately recorded novice task outcomes.

Escalation/checkpoint: A cross-mode result fails the preregistered criterion: minimise the failing case and route it to its owning implementation task. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-060.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- All seed palettes and output modes have representative render checks.
- Formative novices complete input/edit/export/recover tasks.
- Comprehension and preference are reported separately with limitations.

Create or map regression test `tests/dwi-060.test.mjs`. Evidence: `docs/evidence/dwi/phase-06/dwi-060/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-061 · P1 · Open exports in real target applications
Status: **planned**. Dependencies: DWI-034, DWI-050. Target locations: `docs/en/compatibility.md`, `docs/evidence/dwi/phase-06`.

A local-only alpha may ship with documented limitations; never mark unavailable applications passed.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Run prescribed application-open and edit checks and capture concrete evidence.

Escalation/checkpoint: The real application fails a fixture: capture the version/file/result and return the defect to DWI-034; a missing application is blocked. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-061.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Record PowerPoint/Keynote version and actual object-edit tests where available.
- Real host invocation is recorded or explicitly blocked.
- Structural OOXML tests do not substitute for rendering/application evidence.

Create or map regression test `tests/dwi-061.test.mjs`. Evidence: `docs/evidence/dwi/phase-06/dwi-061/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-062 · P1 · Package reproducible offline release candidate
Status: **planned**. Dependencies: DWI-060, DWI-061. Target locations: `scripts/build.mjs`, `dist`, `docs/evidence/dwi/phase-06`.

Build from source, not patched dist. Publication and repository push still require explicit user instruction.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `medium`. **Review effort:** `high`. **Conditional ceiling:** `high`; no automatic switch or escalation.

Reason: Packaging is mostly deterministic but requires a careful privacy and reproducibility review.

Escalation/checkpoint: A fresh install fails, archive contents leak private material or byte provenance is unclear: isolate the packaging cause. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-062.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Fresh offline install/start/export succeeds on documented environment.
- No user inputs, secrets, fonts or unlicensed assets leak into distribution.
- Manifest, checksums, test logs and capability matrix accompany the archive.

Create or map regression test `tests/dwi-062.test.mjs`. Evidence: `docs/evidence/dwi/phase-06/dwi-062/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.

### DWI-063 · P1 · Close the handoff with truthful status
Status: **planned**. Dependencies: DWI-062. Target locations: `PROJECT_STATUS.json`, `ROADMAP.md`, `docs/en/handoff.md`.

Provide completed/blocked/unstarted separation and the exact next executable task. Do not claim all original scope is complete.

**Model profile:** `sol-approved` (an actually available, user-approved Sol; GPT-6.1 Sol only when verified in the client). **Build effort:** `low`. **Review effort:** `medium`. **Conditional ceiling:** `medium`; no automatic switch or escalation.

Reason: Summarise already verified artefacts and task states without changing application code.

Escalation/checkpoint: The final status disagrees with logs or dependencies: raise to Medium to reconcile evidence, never infer success. Stop after at most two targeted failed repair attempts; preserve the reproducer and request approval.

Task instruction: `prompts/tasks/DWI-063.md`. Common rules: `MODEL_ROUTING.md` and `MODEL_POLICY.json`.

Acceptance:
- Each task links its evidence or named blocker.
- Optional research/adapters are reported as partial when unfinished.
- The user receives an actual artifact path, not a background-task claim.

Create or map regression test `tests/dwi-063.test.mjs`. Evidence: `docs/evidence/dwi/phase-06/dwi-063/`. Run the targeted test and `npm run verify` from the DeckWeft checkout; use its current visual/host harness where applicable. Record blocked binaries rather than simulating their success.
