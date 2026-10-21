# Validation record — workpack v1.1

Prepared on 2026-10-21. Scope: **this revised engineering workpack**, not the DeckWeft application or an actual Codex model session.

## Checks executed for v1.1
| Check | Actual result | Evidence |
|---|---|---|
| `npm run verify` | **108 Node tests passed**, 0 failed, 0 skipped, 0 todo; structural check passed | `workpack-tests.txt` |
| `node scripts/validate-workpack.mjs --json` | 29 model routes, 7 phases; build levels Low 1 / Medium 10 / High 18 / Extra High 0; 22 palettes and 1,320 role pairs still validate | `workpack-validation.json` |
| Draft 2020-12 schema check | Four schema definitions valid; 29 routing objects and PALETTES.json validated | `jsonschema-check.json` |
| `node scripts/task-profile.mjs DWI-034` | Prints a recommendation with actual model/effort null and no model invocation or setting change | `model-routing-example.json` |
| Original queue comparison | All 29 task IDs, states, priorities, dependencies, implementations and acceptance requirements preserved | `model-routing-check.json` |
| Original asset comparison | Palette/catalogue, screenshot/audit, archived input reports, colour/navigation helpers and original catalogue screenshots byte-identical | `model-routing-check.json` |

The original 63 tests remain; 45 routing/consistency tests were added. The task prompt test is exercised for each of the 29 tasks. Negative cases cover missing routes, invalid/default maximum efforts, automatic usage/fallback, fictional host binding, protected-model substitution, path traversal, unsafe review claims and phase-table mismatches.

The code paths tested are local metadata/reference checks. They neither run a model nor show that the recommended effort improves results. They do not enforce a user's runtime setting merely because the prompt or JSON says High. A real host or user confirmation must supply the actual model and effort separately.

## Environment and unchanged historical evidence
Node: v22.16.0. Python: 3.13.5. The required workpack `npm run verify` uses Node built-ins with no package install or network access. jsonschema was already installed and used only for an additional preparation check.

The original catalogue browser/pixel results are preserved from v1.0. **No fresh browser, screenshot-pixel replay, screen reader, PowerPoint, Keynote, Codex or Claude execution was performed by v1.1.** The catalogue and its input assets were unchanged. Historical documentation and logs are under `reports/v1.0/`; other unchanged visual assets retain their original locations in `reports/`.

## Reproduce
```sh
npm run integrity
npm run verify
node scripts/task-profile.mjs DWI-034
```

Run integrity before local edits; changed workpack files will intentionally no longer match the packaged hashes. `manifest.json` excludes itself, includes SHA256SUMS, and records byte lengths and SHA-256 hashes. SHA256SUMS excludes itself and the manifest. Hash checking is not a signed authenticity claim.

The final ZIP is checked for archive corruption and is re-extracted for another integrity/verification run. That archive-specific result is stored beside the ZIP to avoid recursive checksums.

## Completion boundary
Every module now has an explicit model profile, build effort, review effort, conditional ceiling, reason, stop/escalation trigger and task prompt. All 29 application tasks are still planned. No DeckWeft repository writes, host configuration changes, paid model calls, publishing or deployment were performed. Model availability and any usage permission are not inferred from this package.
