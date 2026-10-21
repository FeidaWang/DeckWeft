# Test plan and evidence gates
## Workpack checks (implemented here)
`npm run verify` runs the portable Node tests and package validator. It checks palette IDs/hex/RGB/Lab correspondence, selected semantic contrast pairs, provenance nulls, screenshot metadata, dependency graph, referenced paths, prompt coverage and essential files. This is not a complete JSON Schema engine or WCAG certification.

## Product checks (to implement in DeckWeft)
| Area | Required positive and negative fixtures | Completion evidence |
|---|---|---|
| Intake | One Markdown file; mixed multi-file input; duplicate; conflicting statistics; unsupported/encrypted document; malformed archive; script content | Provenance-preserving output; bounded failure and no execution/upload |
| Content | Long headline, URLs, empty text, emoji/combining marks, English/CJK, source-free factual claim | No loss; explicit evidence-required state; correct grapheme handling |
| Themes | 22 palettes × light/dark/stage; on-accent labels; mixed image backgrounds; forced colours | Actual role-pair checks and rendered review |
| Layout | 16:9 and 4:3; 1366×768 and 1920×1080 viewports; 200% zoom | Canvas fit; editable controls reachable; no text clipping or missing evidence |
| Charts | Null vs zero; denominator; uncertainty; long labels; monotonic scale; multiple series | Dataset survives export; chart semantics stay truthful |
| Diagrams | Branches, cycles, long labels, callouts, mechanism arrows | No disconnected connectors; logical reading order; full static fallback |
| Dial | 0/1/2/100 slides; keyboard; wheel; pointer cancel; reorder; deleted current slide; IME | Stable selection, bounds, no lost edits, no global input hijack |
| Audio/motion | Default off; explicit enable; gesture lock; background tab; 100 rapid steps; reduced motion | No queued audio; quiet presentation; instantaneous accessible state |
| Storage | Conflict, undo, interrupted save, restore-as-copy | Preserve originals and revisions; no silent success |
| Export | Native text/shape/connector/chart checks; no whole-slide raster fallback; notes/privacy | Structural OOXML checks plus real app-open records |
| Host | Installed, enabled, invoked, exported with actual version | Separate real Codex and Claude records; blocked if unavailable |
| Security | No remote resources at first run; origin restrictions; malicious imported instructions | Network trace where available; attack fixtures; no permission changes |

## Test command discipline
From the current DeckWeft checkout, read scripts before use. Known baseline commands include `npm run verify`, `npm run visual:verify`, `npm run host:visual` and `npm run export:targets`; availability of browsers/apps may vary. Do not mark a missing executable, skipped check or test fixture as a pass. Dependency installation must be explicit; no automatic provider signup or paid API.

New phase-specific tests should follow the existing `node --test tests/*.test.mjs` path. Add a dedicated test before modifying a behaviour. Keep `docs/evidence/dwi/phase-XX/` records with current commit, modified files, command, exit code, stdout, screenshots, environment and limitations.

## Numerical policies to measure, not fabricate
A candidate performance budget is p95 page switching below 100 ms on a documented 100-page fixture and a specified reference machine. A candidate UI budget is no additional network call on local page change. These are acceptance targets, not measurements from this package. Establish baseline hardware and sample size in Phase 00.

Use exact thresholds for code correctness. Do not turn a visual score, palette popularity or a small novice study into a quantified claim about universal persuasion. Keep user comprehension and visual preference outcomes separate.

## Release decision
Fail release on lost content, data meaning changes, inaccessible essential functions, privacy leaks, broken recovery or undisclosed whole-slide flattening. An unavailable host may permit a clearly labelled local-only alpha, not a claim of full host certification. Document each optional blocked capability and its fallback.

## Workpack routing acceptance — v1.1
The workpack validator must reject missing task routes, invalid effort values, unbound profile IDs, automatic switches/escalation, a default Extra High/Max/Ultra, path traversal, missing task prompts and mismatched Markdown effort tables. Cover all 29 task IDs with route tests. These tests check policy records and consistency, not actual model settings or comparative model quality. Host-visible runtime settings and task acceptance remain separate evidence.
