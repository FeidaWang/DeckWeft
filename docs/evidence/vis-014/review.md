# VIS-014 first visual release gate — evidence, 2026-10-19

[Gate manual](../../visual-acceptance/README.md) · [Scored review](../../visual-acceptance/review.md) · [Gallery manifest](../../visual-acceptance/gallery-manifest.json) · [Story cases](../../visual-acceptance/story-cases.json) · [Host receipts](../../visual-acceptance/host-receipts.json)

**State: partial.** All automated gate checks except one pass, in three browser engines, and a real Codex prompt-to-artifact task with a scoped revision completed. VIS-014 stays partial for three reasons: the Claude host is deferred; a missing glyph is not detected; and the advisory visual review is below the 80/100 pilot threshold.

S6 source: branch `claude/s6-start-1c14f9`, which merges S3, S4 and S5 ([decisions](../../plans/design-handoff-alignment.md#13-s6-decisions-2026-10-19)). Renderer `visual-art-direction.6`, player `semantic-player.4`. Nothing was pushed or published.

## What ran

| Step | Command | Result |
|---|---|---|
| Unit and contract tests | `npm run verify` | See [verification](../../en/verification.md#vis-014-first-visual-release-gate--2026-10-19) for the final count |
| Gate | `CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… FIREFOX_PATH=… node scripts/release-gate.mjs` | build, quality, legacy and standalone pass; cases 10 of 11 |
| Host | `npm run host:visual -- --host codex --live --out dist/host-visual-s6 --case drafted` | passed on attempt 3 ([attempts](../../visual-acceptance/host-receipts.json)) |

Environment: macOS, Node 24.14.0 locally (CI uses 22). Isolated browsers from the Playwright cache, temporary contexts, no installed browser or profile touched:

- Chrome for Testing 151.0.7922.34
- Firefox 153.0 (cached build, launched by explicit path)
- WebKit 26.5

Playwright 1.61.1. Codex CLI 0.160.0, existing authentication (status only; output discarded).

## Gate results

| Check | Result | Evidence |
|---|---|---|
| Gallery frozen (requirements §9, option C): 12 pages, four per theme, EN and zh-CN, same ids | Pass; per-page content hashes in the manifest, enforced by a test | [manifest](../../visual-acceptance/gallery-manifest.json) |
| Facts, data tables, source links and citations identical across the three themes | Pass for the gallery (every page drawn in every theme) and the stories, both languages | `tests/release-gate.test.mjs` |
| Three coherent bilingual 8-page stories | Pass on machine checks: 0 issues, 12 of 12 traces each; the visual judgment is in the [scored review](../../visual-acceptance/review.md) | [quality.json](quality.json), contact sheets |
| At least three interaction types | Four, each with real traces at 1440, 1024 and 390 px: chart-select, steps, image-compare, image-hotspots. 96 of 96 traces pass | [quality.json](quality.json) |
| Explicit cases | 10 of 11 pass; the missing glyph is not detected | [cases.json](cases.json) |
| Same content against the VIS-001 baseline | All text of the three legacy fixtures survives in every theme; side-by-side sheets viewed | [legacy.json](legacy.json) |
| Standalone exported package outside the repository | 8 of 8 decks work offline from an OS temp folder in Chromium, Firefox and WebKit: images decode, an interaction works, 0 errors, 0 external requests. The copied bundle ran a local `visual-task` there | [standalone.json](standalone.json) |
| Both hosts: prompt-to-artifact and scoped revision | Codex passed; Claude deferred (not failed) | [host receipts](../../visual-acceptance/host-receipts.json) |

## Failures found by the gate and fixed in S6

Each was found by running the quality pipeline on the gallery and stories and by viewing the captures. Host: local isolated Chromium.

| # | Page and state | Reproduction | Fix |
|---|---|---|---|
| R1 | Gallery 1 / story 1 (diagonal cover), opening, 1024 and 1440 px | A long citation ran under the blue panel: contrast 2.2:1 | A generic `.regions>.region[data-component=citation]` rule outranked the cover's column rule; the cover rule now wins (ee20343) |
| R2 | Gallery 1, 1024 px | The cover number "12" split into "1" / "2" | Metric numbers never break inside; the cover metric's left padding scales with the viewport |
| R3 | Gallery 9 (trend), 390 px | First and last time labels overlapped | The last label takes its own line when the two would collide |
| R4 | Gallery 11 (heatmap), every width | Row labels over ~9 characters started outside the SVG frame | The left margin fits the longest label; short labels keep the old margin |
| R5 | Story 6 (before/after) in every theme, after the player mounts | Both images read "Before · baseline" / "之前 · 基线" | The compare panel's second image is labelled "After" / "之后" again |
| R6 | Story 5 and gallery 3 and 12 (process), 1440 px | A four-step chain wrapped after three nodes, connectors crossed, labels ~10 px under a 520 px cap, words split mid-word | A forward chain of up to six steps is one row with straight arrows and centred labels, uncapped; diagram text breaks between words |
| C1 | Gallery 8 | The test-card image had no visible source | Content: the image now has its own citation |
| C2 | Gallery 3 | A sequence diagram cut off its fourth node | Content: the timeline is a linear process on a horizontal composition |
| H1 | Host adapter | A rejected image review did not say which check failed | `reason` names the failed check (`HOST_IMAGE_FINDINGS_INCOMPLETE`, …) |

Render baseline re-recorded deliberately for R1–R6 (25e2704). Against the previous recording, no visible word or value changed in any of the 12 entries ([receipt](../s6-integration/baseline-diff-gallery-fixes.json)).

## Open — recorded, not fixed

| Item | Page and state | Reproduction | Owner |
|---|---|---|---|
| ~~Missing glyph not detected~~ Closed in S8 | Story 1 (cover title + U+E000), 1440 px | Chromium draws a .notdef box inside Iowan Old Style and the CDP platform-font probe names no last-resort font. Since S8 the fit audit compares canvas pixels with the font's own .notdef and reports the glyph; the case passes ([cases.json](cases.json), [VIS-015](../vis-015/review.md)) | C13, done |
| Heatmap scrolls at 390 px | Gallery 11 | The 390 px column named by the takeaway is off-screen until scrolled; the fit audit does not flag legacy SVG kinds | S4 follow-up |
| ~~CJK headings break inside words~~ Closed in S8 | Gallery 2 zh, legacy `strategy-zh-CN` | `三十六种几何结／构`, `可执／行`. Since S8 zh-CN headings, callouts and metric labels carry `<wbr>` at dictionary word boundaries with `word-break: keep-all` ([VIS-015](../vis-015/review.md)) | C12, done |
| Payload | Every deck | Single-file exports are 6.84–6.96 MB against the ~2 MB initial-payload starting budget; a story embeds the same 2.5 MB PNG twice (once per crop) | Later; no lazy loading in standalone HTML |
| Trend label stagger | Gallery 9, 1440 px | The stacking rule uses the narrow-screen type size, so the last label also drops a line where it would fit | Chart follow-up |
| Interaction chrome | Every interactive page | The cue toolbar sits above every interactive headline | Design follow-up |
| Host-drafted deck is plain | Codex `before.html` | Five text-only statement pages | Host drafting quality (VIS-012 / S9) |

## Weakest pages

The gallery's weakest page is `dd-explain` (page 12). For the stories:

- Cream Collage: `st-process` (page 5).
- Dark Data: `st-evidence` (page 3).
- Electric Violet: `st-process` (page 5).

The reasons are in [story cases](../../visual-acceptance/story-cases.json).

## Legacy comparison (VIS-001)

The three frozen legacy decks were migrated explicitly (`migrateToPresentation`) and drawn in every theme twice: in reading flow, and with each page's inferred family. No text is lost. Against the legacy captures, v3 gives a much stronger heading scale and three distinct identities. It does not enrich thin content: supporting text is smaller than in the legacy layout, and the pages have more empty space ([sheets](legacy-product-en.png)).

## Applications

- PowerPoint, Keynote and Figma are installed but were not run: there is no v3 native compiler (VIS-016).
- LibreOffice and After Effects were not found.
- The installed Safari, Chrome and Firefox were not used; isolated cached builds were.
- Not tested: screen readers, IME input, 200% zoom, projection.

## Files

Contact sheets (`*-contact.png`), 390 px sheets (`narrow-390-*.png`), cases (`case-*.png`), legacy sheets (`legacy-*.png`), standalone captures per engine (`standalone-*.png`), the gate reports (`build`, `quality`, `cases`, `legacy`, `standalone`.json) and the host run (`host/`: report, capability probe, hash-only receipts, the reviewed before/after HTML and captures).
