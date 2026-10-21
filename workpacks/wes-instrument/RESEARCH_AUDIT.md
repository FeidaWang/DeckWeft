# Research audit: what was corrected
## Why there was no downloadable package
The recovered second report described an “engineering workpack explanation”, provided templates and explicitly labelled the implementation commands pseudocode. It left file creation and packaging as future tasks. This delivery performs those missing steps instead of starting another research request. Original inputs remain in `inputs/`.

| Earlier statement / pattern | Finding | Workpack action |
|---|---|---|
| A research report is a completed workpack | False equivalence: no separate files/ZIP were delivered in the earlier replies | Actual files, validation output, manifest and ZIP are produced now |
| `openai slides generate ...` | No official command was verified in the inspected material | Removed from executable instructions; capability audit instead |
| `import slides_api` | Unidentified pseudocode module, not a verified dependency | No such dependency or call in runnable code |
| R palettes are “official” movie colour standards | The inspected package calls them a handful of palettes derived from a community Tumblr | `officialPalette: false`; distinguish library verification from film-frame evidence |
| The screenshot validates exact film colours | A labelled colour strip is not a film frame | Record 7×7 pixel samples, source library values, CIE76 difference and absent frame timecodes |
| Two example JSON palettes and Lab arrays are measured data | The original report labels them illustrative and does not provide frames | Excluded from seed data; values recomputed from inspected hex codes |
| Every element needs 4.5:1 | WCAG differentiates normal text, qualifying large text and meaningful graphics | Role-specific tests with unrounded ratios; rendering-level checks still required |
| Universal F-shaped reading path | Web scanning cannot establish every slide's optimal observation sequence | Task-specific layout policies and a validation study; no mandatory F/Z layout |
| Earliest prototype proves host operation | Repository instructions explicitly distinguish copied/enabled/ran in host | Separate local, browser, Office, host and deployment evidence |
| An MIT repository makes every external runtime asset freely reusable | Source licensing is not a licence for remote vendor code, film media or fonts | Preserve notices and review dependencies; no proprietary assets copied |
| “All films / all TE products / newest research” finished | The recovered reports do not provide complete auditable corpora | Explicit coverage gaps and dedicated phase-05 tasks |

## Screenshot verdict
The 16 names and their colour order correspond to the community-library palette selection. All 76 swatches were sampled at specified centres; only one modal RGB value equals the corresponding current library hex exactly (the black swatch in Darjeeling2). The remainder differ numerically. This does **not** determine whether the screenshot was altered or why: display transforms, prior processing, scaling and encoding cannot be recovered from this image alone.

See `data/screenshot-audit.json` for the measurements. These are screenshot-vs-library comparisons, not screenshot-vs-film comparisons. The CIE76 metric here is deliberately labelled; no claim that it is CIEDE2000, calibrated perceptual equivalence, or a universal acceptance threshold.

## Evidence levels
1. Screenshot sample: actual pixels at recorded crop coordinates, under an sRGB interpretation.
2. Library values verified: exact values in an inspected source file, anchored by the Git blob SHA.
3. Licensed frame sampled: a permitted source frame, edition/colour pipeline, timestamp and sampling method recorded.
4. Independently reviewed frame: a second reviewer checks attribution and sampling.

All 22 seed palettes are level 2 for library provenance and level 0 for film-frame verification. A seed can be useful for design without falsely claiming frame-level accuracy. Derived semantic theme values have their own derivation status.

## Recent research status
Primary material located includes a 2024 background-colour experiment, a 2024 text/image signalling study, a 2025 highlighting/EEG/eye-tracking article, and the directly relevant 2013 assertion-evidence experiment. The 2025 publisher full page returned 403; only its abstract-level information was available. Do not invent sample sizes, effect sizes or results from it. The older experiment is labelled older; no claim of a systematic literature review through October 2026 is made. [SRC-COLOR2024, SRC-SIGNAL2024, SRC-HIGHLIGHT2025, SRC-AE2013]

## Spaces / Codex Slides boundary
Official skill documentation and public descriptions of slide-related work do not by themselves expose the implementation of a particular built-in Spaces feature. The exact internal Slides code/API requested was not inspected or verified here. Phase 00 records the user's actual host version and available documented capabilities; Phase 05 only builds against verified contracts. No vendor-private code is copied or reconstructed from a fictitious command. [SRC-OAI-SKILLS, SRC-OAI-WORKFLOW]
