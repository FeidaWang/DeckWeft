# DeckWeft modular roadmap

[简体中文](docs/zh-CN/roadmap.md) · [Machine-readable tasks](roadmap.json) · [Verification](docs/en/verification.md)

## Current local build — MB-11 through MB-15

The user authorized this third batch on 2026-10-18. Local source adds an opt-in host-image journal/cache, two independently scoped workers and isolated code copies, two general Three.js recipes with editable static fallbacks, and media/font/source-map and temporal/rollback importer improvements. [Guide](docs/en/media-workers.md) · [Evidence](docs/evidence/mb-11-15/review.md).

MB-11 and MB-13 are `implemented-local`. MB-12 is `partial`: a real two-worker Codex CLI pair passed with 12.547 seconds of overlap, after an initial invalid-source result was rejected; Dot desktop remains unverified. MB-14 is `partial`: Figma desktop was opened but plugin registration/import was not completed. MB-15 is `partial`: AE is not installed, so native import/render/cancel acceptance could not run. No application gate is closed by local mocks or exported JSON.

## Earlier local build — MB-06 through MB-10

The user authorized the second batch. The local implementation adds a typed v2 storyboard/asset contract with explicit copy migration, six semantic recipes, allowlisted HTML exploration and static fallbacks, separate deck/code proposal grants, pinned execution capsules, durable events/checkpoints and validated-work progress. A real Codex CLI task and a four-turn medium/high pilot produced actual artifacts. [Guide](docs/en/planning.md) · [Evaluation](docs/en/astra-evaluation.md) · [Evidence](docs/evidence/mb-06-10/review.md).

MB-08 retains a partial acceptance state until a real Dot host negotiates and executes the required operations. CLI evidence does not close Dot desktop, DW-020, Figma/AE or wider accessibility gates. The later MB-11–15 authorization is recorded above.

## Earlier local build — MB-01 through MB-05

The first batch is implemented locally: schema-derived type contracts and emitted-module checks, semantic actions, light/dark/system appearance, shared motion preferences, a separate read-only audience origin and a slide-following private teleprompter. [Instructions](docs/en/presenting.md) · [Evidence](docs/evidence/mb-01-05/review.md).

MB-01, MB-03 and MB-05 are `implemented-local`. MB-02 and MB-04 retain `partial` acceptance states: their code and local browser flows work, while 200% zoom/screen-reader and actual conferencing/extended-display checks remain. No real host gate is closed by these local results. That first batch was limited to MB-01–05. The newly authorized second batch is recorded above.

## Modular build plan — 2026-10-17

The [modular construction plan](docs/en/modular-build-roadmap.md) addresses TypeScript, automatic visuals, scoped Dot delegation/progress, action controls, a private presenter and appearance/accessibility settings. It includes priorities, dependencies, module boundaries and acceptance gates, with separate [task data](docs/plans/modular-build-2026-10-17.json). The first five tasks formed the earlier batch; the user subsequently authorized MB-06–10 and MB-11–15. Existing release tasks and their evidence remain unchanged.

## Earlier alpha.2 execution order

`DW-020 → DW-130 → DW-120 → DW-110 recovery UI`.

DW-020 remains blocked overall. On 2026-10-17, the authenticated Codex CLI project skill completed a real task and its three-slide output passed trace, export and LibreOffice visual review. Claude sign-in was deferred by the user; Codex desktop native activation and remote CI remain untested. See the [current host evidence](docs/evidence/dw-020/review.json). Earlier work proceeded on independent local modules. DW-130 now has real Canvas measurements; DW-120 has tested interaction fixes but real-device/accessibility checks remain; DW-110 has read-only history and restore-as-copy, not the entire project-management roadmap.

| Task | Priority | Module | Current state |
| --- | --- | --- | --- |
| DW-001 | P0 | New identity and English-first documentation | implemented-local |
| DW-010 | P0 | Strict schema, explicit migration, and security boundary | implemented-local |
| DW-020 | P0 | Reproducible bundle and real-host release checks | blocked overall; Codex CLI reviewed |
| DW-100 | P1 | Studio editing and durable project storage | implemented-local |
| DW-110 | P1 | History recovery and project management | partial |
| DW-120 | P1 | Interaction and accessibility hardening | partial |
| DW-130 | P2 | Measured multilingual text and adversarial layout corpus | implemented-local |
| DW-140 | P2 | Native editable output fidelity | partial |
| DW-150 | P2 | Semantic slide-family expansion | partial |
| DW-200 | P3 | Evidence-bearing story planner | partial |
| DW-210 | P3 | Safe host-agent jobs and resumable checkpoints | partial |
| DW-220 | P3 | Optional explicit provider and translation adapters | planned |
| DW-300 | P4 | Figma editable import acceptance | partial |
| DW-310 | P4 | After Effects editable import acceptance | partial |
| DW-320 | P4 | Rights-aware media and animation library | partial |
| DW-400 | P5 | Template SDK and reviewed community contributions | planned |
| DW-410 | P5 | Optional collaboration service | planned |
| DW-420 | P5 | Optional commercial hosting and team controls | planned |

## Next gates

Run the [real-host guide](docs/en/host-acceptance.md) on an authenticated machine. Then run browser acceptance in **direct** mode, test real Chinese input methods, 200% zoom and screen readers, and inspect both measurement paths in PowerPoint/Keynote. The authorized local planning batch proceeds independently; the wider host, retention and application gates remain open. No hosted service, database replacement or paid provider has been added to make these checks look complete.

Task acceptance lists and dependencies in `roadmap.json` remain authoritative. `implemented-local` means the named local scope is implemented and tested; it never means every application, host or security property has been certified.
