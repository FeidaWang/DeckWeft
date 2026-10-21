# Master plan
## Decision
Extend DeckWeft rather than replacing it. Deliver a useful local-first vertical slice before material effects: **input → reviewed story → source-linked slide → measured layout → editable export**. Instrument-like controls are a restrained enhancement to that workflow, not a second product.

## Actual baseline
The inspected default-branch commit was `05643c614cf7d981227b0a14be02a2d65eda15c3`. The repository declares Node 22+, ESM, a dependency-free runtime, an existing shell, derived scenes, explicit schema validation and native export paths. It has classic and visual/v3 concepts already. These are inspected source/documentation facts, not a new execution certification. [SRC-DW-AGENTS, SRC-DW-ARCH, SRC-DW-PKG]

Do not repeat old roadmap items blindly. Phase 00 compares this package with the checkout's current CINE/VIS/S-series work, records what already exists, and maps each DWI task to reuse, extend or unnecessary. A newer commit is not an error; it triggers a documented rebase of the plan.

## Product outcome
A novice provides one or more local documents, a title with notes, or pasted research with source links. They see a short outline, select at most one of three visual directions, and receive a coherent, editable deck. They can correct an individual page without regenerating everything. The interface speaks in outcomes: “Add material”, “Review story”, “Make slides”, “Change this page”, “Export”. It does not require prompt syntax or PowerPoint terminology.

## Non-negotiable constraints
No hidden AI, billable API, external model fallback, telemetry or remote document upload. Existing user-authorised Codex/Claude sessions can supply content explicitly; their presence does not imply a subscription, API entitlement or permission for network use. Default operation is deterministic and local. Preserve source text, locked blocks, units, citations, confidential notes and undo history. Keep the server loopback-only. Never silently flatten an entire slide to conceal editable-export limitations. No font files, vendor sound recordings or film copies are bundled. [SRC-DW-AGENTS]

## Priorities and gates
| Phase | Priority | Deliverable | Exit evidence |
|---|---|---|---|
| 00 | P0 | Baseline, conflict map, host capability inventory | Current commit, real commands, failures and reused modules recorded |
| 01 | P0 | Evidence-aware palettes and semantic theme tokens | 22 seed palettes; contrast and provenance regression tests; no frame-verification inflation |
| 02 | P0 | Safe local intake and reviewed story plan | Multiple inputs retain provenance; unsupported parsers give explicit recovery; source links survive |
| 03 | P0 | Measured layouts and editable export vertical slice | Same semantic scene in preview/export; no clipping; chart/diagram values preserved |
| 04 | P1 | Novice shell and optional instrument controls | Keyboard and pointer equivalence; quiet default; no redundant panels |
| 05 | P1/P2 | Host boundaries, optional adapters and coverage expansion | Real-host status split from mocks; no reliance on a guessed Slides API |
| 06 | P1 | Release candidate acceptance | Fresh-install offline run, app-specific results, regression evidence, reproducible package |

Do not assign calendar promises without staffing and baseline results. The original research report's 2026–2027 dates were illustrative, not commitments. [INPUT-EXEC]

## Release slices
**Slice A — core usefulness:** complete Phases 00–03 with plain keyboard navigation and one instrument-neutral theme. It must export a six-page test deck with an assertion/evidence page, comparison, chart, workflow and mechanism schematic. No visual polish can excuse lost text or incorrect numbers.

**Slice B — tactile workbench:** Phase 04 adds the optional slide dial and coherent material tokens. Accept only if first-time users can still find the main action and switch pages without learning a gesture. A/B the dial against plain navigation; keep it optional when it does not help.

**Slice C — host and corpus breadth:** Phase 05 extends verified capabilities and research coverage. Missing film rights or a private vendor implementation blocks that integration only, not the local core. Distinguish a partial release from “all requested scope completed”.

## Quality hierarchy
Hard gates: content integrity, source traceability, accessibility of essential functions, safe storage and truthful export capabilities. Then minimise reading effort, improve hierarchy, enlarge the visual evidence, and apply cinematic colour. Aesthetics never outranks fidelity.

Use multi-objective candidate selection, not a fictitious scientific “persuasion score”. Reject overflow and truth violations first; compare valid candidates on legibility, evidence proximity, hierarchy, diagram area and deck rhythm. Product thresholds in DESIGN_SYSTEM.md are defaults to test, not universal laws of vision.

## Definition of done for a task
A task has: an actual commit/diff or explicit reuse decision; tests with command/exit code; required screenshot or app-open evidence; unresolved risks; a user-visible result; and a recovery path. Mark `verified` only when all mandatory acceptance checks have evidence. `implemented`, `mock-tested`, `host-blocked` and `visually-reviewed` are not synonyms.

## Out of scope for this package delivery
This package does not modify the GitHub repository, deploy a service, complete a new application, obtain licensed film masters, inspect proprietary Spaces source code, or certify accessibility of a finished interface. `reports/VALIDATION.md` records exactly what ran here.

## Per-module model and effort assignments — v1.1
Use `MODEL_ROUTING.md` (English) or `MODEL_ROUTING.zh-CN.md` (Chinese) for the complete matrix. Each of the 29 tasks in `TASKS.json` now includes a `modelRouting` object, and all phase prompts carry their local task table. There are 1 Low, 10 Medium and 18 High build recommendations; no task starts at Extra High. These are engineering hypotheses, not measured speed/quality guarantees.

`sol-approved` means a model actually available and explicitly approved in the user's Codex; GPT-6.1 Sol is only a conditional preferred label. Do not assume account access, switch to Astra, use API credits or change effort automatically. Extra High is allowed only after a concrete unresolved case and user approval. Real model settings remain unverified until observed in the host. [SRC-MODEL-CATALOG, SRC-MODEL-EFFORT, SRC-CODEX-MODELS, SRC-CODEX-EFFORT-CONFIG]
