# Model and reasoning-effort routing — v1.1

## What changed
The v1.0 workpack omitted per-task model/effort assignments. This revision adds an explicit route for every one of the 29 DWI tasks, preserves their priorities/dependencies/acceptance, and leaves all application tasks **planned**. These are engineering recommendations, not measured model benchmark results.

`TASKS.json` contains each task's `modelRouting`; `MODEL_POLICY.json` defines common consent and capability rules. The tables and prompts are views of those records, not a second queue.

## Model binding: recommendation is not availability or permission
Use the **Sol model already available in the user's Codex and explicitly approved for this work**. GPT-6.1 Sol is the preferred label only when actually present and approved. Its API catalogue entry does not prove Codex account availability. The retrieved Codex selection guide still illustrates a different generation; therefore `actualModelId` stays null until the real host/user establishes it. [SRC-MODEL-CATALOG, SRC-CODEX-MODELS]

Do not automatically select Astra, use its coding allocation, add an API key, consume API credits, launch subagents, enable Ultra/Max or start additional sessions. This file does not grant spending permission. Even an existing subscription can have usage limits; a local workpack check does not make later agent use free. Binding and any substitution or effort change must be explicitly authorised.

## Effort is not verbosity, priority or a model name
Low/Medium/High/Extra High describe recommended reasoning effort. They do not alter acceptance strictness. The documented Codex setting is `model_reasoning_effort`; `xhigh` corresponds to Extra High where supported. Model and client support must be checked. Do not confuse this with response length, plan-mode settings, API `reasoning.effort`, or output-token limits. [SRC-CODEX-EFFORT-CONFIG]

Higher settings can trade latency and token use for more reasoning. The mapping below is a risk-based starting policy: ordinary bounded integration at Medium, coupled semantics/security/layout/export work at High, and evidence-only closing text at Low. Extra High is a **conditional ceiling**, not a default. It needs a concrete unresolved case and user approval; missing tools or sources are not reasoning problems. [SRC-MODEL-EFFORT]

## Every module
All rows use the same `sol-approved` profile. “Review” is a separate, explicitly scoped check in the approved workflow; it is not an automatic second billable agent or a claim of independent validation.

| Task | Module | Build | Review | Conditional ceiling | Why this build level |
|---|---|---|---|---|---|
| DWI-000 | Record and reconcile the current repository | High | High | Extra High | Resolve a changing repository baseline and overlapping CINE/VIS/S contracts before editing. |
| DWI-001 | Inventory real host capabilities | Medium | Medium | High | The work is bounded capability inspection rather than new architecture. |
| DWI-002 | Adopt corrected evidence and rights rules | High | High | High | Keep source evidence, inferred design rules and asset rights distinct. |
| DWI-003 | Capture regression fixtures | Medium | Medium | High | Freeze representative fixtures and exact content invariants using the existing harness. |
| DWI-010 | Integrate immutable palette registry | Medium | High | High | Registry integration is constrained by immutable seed data and the existing theme contract. |
| DWI-011 | Resolve semantic light dark and stage tokens | High | High | Extra High | Colour roles, composited backgrounds and multiple exporters must agree numerically. |
| DWI-012 | Make chart and diagram roles accessible | High | High | High | Chart and diagram identities must survive colour, label, pattern and output changes. |
| DWI-013 | Expose palette evidence in one picker | Medium | Medium | High | A single picker and its evidence disclosure reuse known shell patterns. |
| DWI-020 | Add bounded multiple-document intake | High | High | Extra High | Untrusted documents, parser boundaries and multiple source locators create data-loss and security risks. |
| DWI-021 | Build claim source and contradiction records | High | High | Extra High | Claim identity, contradictory values and source locators must survive explicit migrations. |
| DWI-022 | Review story before composition | Medium | High | High | The reviewed outline is a bounded local workflow with preserved project copies. |
| DWI-023 | Validate agent handoffs and project migrations | High | High | Extra High | Agent handoffs cross trust and project-version boundaries. |
| DWI-030 | Implement task-aware layout candidate policy | High | High | Extra High | Measured typography, layout feasibility and target-specific geometry form a coupled constraint problem. |
| DWI-031 | Separate claim citations from full references | Medium | High | High | Compact source display can reuse the existing references layer but needs strong fidelity review. |
| DWI-032 | Protect dominant images and truthful charts | High | High | High | Subject framing and chart semantics must preserve data and protected regions. |
| DWI-033 | Compose readable workflows and mechanism figures | High | High | Extra High | Graph identity, labels, connectors and final static states must map to editable output. |
| DWI-034 | Export the first complete native vertical slice | High | High | Extra High | Preview, semantic scenes and native OOXML must preserve object editability and meaning. |
| DWI-040 | Simplify the existing workbench shell | Medium | High | High | Refine the existing shell rather than redesigning application architecture. |
| DWI-041 | Add accessible bounded slide dial | High | High | Extra High | Slide identity, drag/keyboard/touch input, IME and focus interact as a state machine. |
| DWI-042 | Add quiet original detent feedback | Medium | Medium | High | A small original tick and explicit opt-in have a bounded local implementation. |
| DWI-043 | Test complete keyboard touch and recovery flows | High | High | Extra High | Recovery, history and whole-workflow input checks span several existing components. |
| DWI-050 | Integrate only documented host capabilities | High | High | Extra High | Host adapters need documented interfaces and strict permission/usage boundaries. |
| DWI-051 | Evaluate Kimi compatibility as an isolated option | High | High | High | Compatibility and remote resource/licence constraints need a bounded feasibility decision. |
| DWI-052 | Extend film palette provenance deliberately | High | High | High | Corpus, edition, transfer function, clustering and provenance need a reproducible method. |
| DWI-053 | Complete product and recent-study coverage audit | High | High | High | Compare primary evidence without confusing attention, comprehension, preference and persuasion. |
| DWI-060 | Run cross-mode visual and novice acceptance | High | High | High | Acceptance combines broad visual results with separately recorded novice task outcomes. |
| DWI-061 | Open exports in real target applications | Medium | High | High | Run prescribed application-open and edit checks and capture concrete evidence. |
| DWI-062 | Package reproducible offline release candidate | Medium | High | High | Packaging is mostly deterministic but requires a careful privacy and reproducibility review. |
| DWI-063 | Close the handoff with truthful status | Low | Medium | Medium | Summarise already verified artefacts and task states without changing application code. |

## Before a task
Read the task's record and dependency evidence; do not reread the complete research corpus unnecessarily. Confirm the selected host model/effort from actual UI/runtime evidence, or record that it is unobservable and ask the user to confirm. A self-description in a model response is not verification of its runtime configuration. Record requested and observed settings separately in the task evidence; never manufacture the observed value.

The user can use Codex's model/effort control or `/model` in an interactive CLI. These Markdown prompts **cannot force the host to switch settings**. They must not rewrite global or project configuration on the user's behalf. When the active setting differs, report the mismatch and obtain a user decision before a new model run. [SRC-CODEX-MODELS]

An effort-only configuration fragment, for manual use in a compatible client after approval, is:
```toml
model_reasoning_effort = "high"
```
This is documentation, not an installer. No model ID, API key, endpoint or permission setting is silently added. Check the actual client's documentation before use. [SRC-CODEX-EFFORT-CONFIG]

## Failure and escalation protocol
After at most two targeted repair attempts without progress, stop and record the failing invariant, relevant diff, exact command, log/fixture and the two different hypotheses. Request the row's conditional ceiling only when its task-specific trigger applies. Escalation is never an automatic retry loop. For High→Extra High, show why the bounded problem still needs deeper analysis. For tasks already at their ceiling, decompose or return a precise blocker.

On completion of a harder incident, do not leave all future tasks at the elevated setting. Return to the next row's recommended level only after the user selects/approves it. Never claim a switch from a change to prompt text alone.

## Reproducible local checks
```sh
npm run verify
node scripts/task-profile.mjs DWI-034
```
The second command prints the recommended route and task prompt. It does not start Codex, alter settings, access the network or consume model quota. Run the workpack checks before edits; application and native-host verification still use the existing phase gates.

Each task also has a complete instruction under `prompts/tasks/DWI-xxx.md`. A task prompt narrows work to that task; it does not waive upstream dependencies or the phase exit gate.

## Record the actual run separately
In the actual application's task evidence, include task ID, desired model/effort, observed model/effort (or null), observation source, user approval reference, reason for any departure, changed files and tests. Reuse a host-provided receipt when available. A separate review pass checks the diff and evidence; it is not automatically independent just because the prompt says “review”.

No per-task token budget, duration, accuracy gain or actual model execution is asserted by this package. Benchmark those claims on real authorised runs before making them.
