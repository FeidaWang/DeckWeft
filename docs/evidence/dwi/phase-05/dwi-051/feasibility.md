# DWI-051 — Kimi compatibility: feasibility record (not run)

Date: 2026-10-22. State: **blocked** for the comparison; the feasibility decision below is complete.

## What is known (from the workpack's source register, not re-read here)

- `open-kimi-ppt-skill` 1.2.0 at commit `c32890f` declares MIT and describes itself as an unofficial, reverse-engineered skill (SRC-KIMI-PKG).
- Its exporter entry `skills/open-kimi-ppt/scripts/export_pptx.py` starts a local SDK host and uses a browser-side writer; referenced remote resources may be fetched; the entry can install PyYAML automatically (SRC-KIMI-EXPORT; only lines 1–160 were read; the exporter was never run).

## Requirements a run would have

| Requirement | Why it blocks the default path |
|---|---|
| Network access for remote writer resources | AGENTS.md: no hidden network request; the default export is offline |
| Automatic `pip install` of PyYAML | AGENTS.md: no dependency without measured benefit, licence, packaging cost and offline behaviour; installs must be explicit |
| A remote, proprietary writer | The repository's MIT declaration does not license hosted third-party code or content (THIRD_PARTY_NOTICES.md) |

## Decision

DeckWeft keeps its own native export (`src/targets/pptx`, measured in DWI-034). No Kimi code is copied, vendored or called; `integrations/` holds only `after-effects` and `figma`. A comparison on a permitted fixture (editable fidelity and content preservation against the six-page slice) needs the person's explicit approval for: network access for that run, a Python environment with PyYAML installed by them, and a throwaway directory outside the repository. Without that approval the comparison stays **not run**, and a negative feasibility result is acceptable under the task.

## If approved later

1. Clone the pinned commit into a temporary folder outside the repository; record its commit and the licence files.
2. Install its dependencies yourself in a virtual environment; record versions.
3. Export `tests/dwi-slice.mjs`'s six pages through it, offline where possible, recording every network request.
4. Compare with `tests/dwi-034.test.mjs`'s checks: table cells, chart values and nulls, diagram parts and connectors, sources in notes, whole-slide pictures.
