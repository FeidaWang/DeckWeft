# Validation record — workpack v1.0

Prepared on 2026-10-21. Scope: **this engineering workpack**, not the DeckWeft application.

## Actual completed checks
| Check | Result | Evidence |
|---|---|---|
| `npm run verify` | **63 Node tests passed**, 0 failed, 0 skipped, 0 todo; structural check passed | `workpack-tests.txt` |
| `node scripts/validate-workpack.mjs --json` | 22 palettes, 66 modes, 1,320 role pairs, 29 tasks, 7 phases, 24 sources | `workpack-validation.json` |
| `python scripts/sample_screenshot.py` | All 76 recorded screenshot samples reproduced | `screenshot-replay.json` |
| Draft 2020-12 schema preparation check | 3 schema definitions valid; PALETTES.json validates | `jsonschema-check.json` |
| Static catalogue browser rendering | 1,440×1,000 and 390×844; search, comparison disclosure and page overflow checks passed | `catalogue-browser-check.json` |
| Visual inspection | Desktop/mobile screenshots opened and inspected; no horizontal page overflow in the tested viewports | `catalogue-desktop.png`, `catalogue-mobile.png` |

Minimum tested text-role contrast: 4.758839838:1 (all 4.5:1 thresholds compared before rounding). Minimum tested essential-stroke/background ratio: 14.613838884:1. These figures apply **only to the listed token pairs**. The 1,320 checks are 22 palettes × 3 modes × 20 role/background pairs, not all possible colour combinations or chart adjacencies.

Node reference tests include known colour-math vectors, malformed inputs, negative contrast mutations, invalid/cyclic task dependencies, provenance claims, default-silent tick policy, navigation bounds, IME guards and a **synthetic temporary git checkout**. That fixture does not constitute a test of the actual DeckWeft checkout.

## Environment and limitations
Preparation used Node v22.16.0, Python 3.13.5 and Chromium 144.0.7559.96. Browser navigation to the local `file:` URL was blocked by the managed preparation environment. The successful browser checks use the permitted `set_content` mechanism to render the exact supplied HTML string; no browser policy was changed. No direct-file-navigation acceptance is claimed.

Pillow, Playwright and jsonschema were already installed in the preparation environment. They were not added to the workpack runtime dependencies. The required `npm run verify` path uses only Node built-ins and does not install packages or make network requests. Optional browser/pixel checks are separate.

The gallery was tested, not the proposed Studio dial, Office exports, screen-reader behaviour or a full WCAG conformance audit. Original application tests, real Codex/Claude invocation, PowerPoint/Keynote opening, deployment, paid-provider use and GitHub writes were **not performed**.

## Reproduce and inspect
Run `npm run integrity` before changing package files, then `npm run verify`. Optional: `python3 scripts/sample_screenshot.py`; an absent Pillow dependency is reported as blocked, never silently installed. Optional static-gallery check: `python3 scripts/check-catalogue.py`, with already installed Playwright and Chromium.

`manifest.json` contains file hashes and lengths. `SHA256SUMS` covers files other than itself and the manifest, avoiding recursive hashes. The manifest includes the checksum file but excludes itself. Integrity is not cryptographic authenticity: this is not a signed release. The preparation process checks the ZIP and reruns verification from an extracted copy; its archive-specific record is delivered beside the ZIP.

## Completion boundary
The requested engineering files and runnable reference checks are delivered. All 29 application tasks remain planned until implemented and accepted in the actual repository. See `DELIVERY_STATUS.json`; research corpus gaps remain explicit in `data/coverage.json`.
