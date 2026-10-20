CINE batch 1 (cinematic composition P0: CINE-001 target budget, CINE-002 compact references, CINE-003 visual intent, CINE-004 primary media area) is **implemented locally** as of 2026-10-20 on branch `claude/deckweft-design-roadmap-2d3d10` (stacked on `main` at `be9921d`), not merged and not pushed. State: implemented-local for the batch; VIS-006, VIS-007, VIS-013 and VIS-016 keep their states and carry notes. The plan is [the build map](../plans/cinematic-composition-build-map.md) (its §0 reconciles the [roadmap document](../../DeckWeft-Cinematic-Design-Roadmap-2026-10-19.md) with the code); the evidence is [cine-p0](../evidence/cine-p0/review.md). What it adds:

- one declared presentation target (`src/targets/target-budget.mjs`: frame, safe area, grid, the unchanged hard typography minima and reported targets) that the web candidate gate, the PowerPoint pager and the PDF pager read; the PDF now pages a tall scene on the PowerPoint bands with the heading repeated; `fit-page` splits a page after a measured block instead of shrinking it;
- three optional scene fields, `references`, `intent` and `media` ([migration](migration.md#references-intent-and-media-cine-batch-1)); pages without them render byte-identical markup (renderer `visual-art-direction.13`, player unchanged);
- the compact source strip, claim markers and reference panel on the web page, markers in PowerPoint notes and the PDF appendix, stable across reordering;
- inferred or declared page purpose and entry, the family's variant preference per purpose, and the `set-intent` Studio controls;
- media roles, the 5/7 and 7/5 image grids, the 260 px supporting image, raised system-map widths, the subject-fraction and label-size report, and the `visual-space` Studio button.

Known limits recorded in the evidence: the corpus mechanism page exceeds the 900 px web budget in every system-map variant because of the diagram's own edge routing; the Chinese long-heading page exceeds it because `statement-split` gives a headline 12ch (six CJK glyphs); the overflow page needs two stated cuts. PowerPoint and Keynote are installed and were not run, so their acceptance is not claimed. Batch 2 (CINE-005 to CINE-007) is not authorized by this handoff; the user decides.

S11 (merge readiness for S1–S10) is **done** as of 2026-10-19 and merged into `main` by pull request #2 (merge commit `20457eb`). It was built on branch `claude/s11-merge-readiness-61283b`, stacked on S10 (`d584d76`); that remote branch is deleted. State **LocalVerified**; the Verify run on `main` passed on Ubuntu, macOS and Windows. What S11 did:

- froze `d584d76`, proved it from a clean archive (`npm ci`, `npm run verify`: 475 tests, 471 pass, 4 environment- or browser-gated skips) and reran all 18 browser runners and the release gate in isolated Chrome for Testing 151; the recorded numbers reproduce ([evidence](../evidence/s11-merge-readiness/review.md));
- found that `browser_families.mjs` and `browser_compositions.mjs` failed on the tip because S9a's `directionsPanel` made a test selector ambiguous; fixed in three test lines, no runtime code; two other runners failed once and passed on rerun, cause not found;
- fetched `origin/main` (unmoved at `058b939`) and created the local tag `backup/main-before-design-handoff` at `058b939`; the tag is still local only;
- corrected the figures in the [merge plan](../plans/design-handoff-merge-to-main.md) (562 files changed over `main`) and added its Readiness section;
- after the first push, the Windows job failed in `tests/atomic-write.test.mjs` (`EPERM` while replacing a checkpoint read by a concurrent reader). `0ade8dc` makes reads and replacements of one path in the same process take turns (`src/services/io.mjs`); all three systems then passed.

The user's S11 answers were: merge commit as the leaning, keep the remote `claude/s6-start-1c14f9`, and open the PowerPoint and Keynote exports before any push. Later the user instructed the push, the merge (done by the user in GitHub, as a merge commit) and the deletion of the leftover branches, which replaced the first two answers. The PowerPoint and Keynote exports were **not** opened first, so ExportVerified is still not reached. Details are in [alignment §20](../plans/design-handoff-alignment.md#20-s11-decisions-and-result--merge-readiness-2026-10-19). Nothing further is authorized by this handoff.

S10 (pattern library maintenance and the P3 boundary, DWD-310) is **done** as of 2026-10-19 and merged into `main` with S11 (it was built on branch `claude/pattern-library-maintenance-p3-28aa7c`, stacked on S9b, `a2d5371`; the branch is deleted). It is documentation and register work only: no runtime code, schema or task state changed, and DWD-310 stays `partial`. What S10 adds:

- fifteen maintenance fields on all 56 pattern records and four on the 82 source records, filled only where evidence supports them (the rest are `null`); `checkedAt` keeps its repository-check meaning and the page date is `sourceCheckedAt`;
- a [manual](../design/pattern-register.md) ([简体中文](../zh-CN/pattern-register.md)): when to add a pattern, how to run a browser check, how an upstream change is recorded without touching existing decks;
- what a full site-by-site verification still needs (a template grouping of OpenAI's 1,390 zh-Hans-CN paths, 8 cells per template, and a verifiable Anthropic URL list);
- the P3 deferrals as `notes` on EXP-001, which stays `planned`;
- a three-page [browser sample](../evidence/s10-pattern-maintenance/browser-sample.json) (ANT-01, OAI-S01, OAI-S20) the user allowed;
- a [plan for merging S1–S10 into `main`](../plans/design-handoff-merge-to-main.md). It was a plan when written; it has since been carried out (see S11 above).

The six answers and the decisions are in [alignment §19](../plans/design-handoff-alignment.md#19-s10-decisions-and-result--pattern-library-maintenance-and-the-p3-boundary-2026-10-19). Nothing further in the design-handoff plan (S1–S10) is open for implementation; the open items are listed there. Further steps are not authorized by this handoff.

S9b (blueprint A, Explain → Diagram → Explore, DWD-210) is **done** as of 2026-10-19 and merged into `main`. It was built on branch `claude/agitated-torvalds-969a1e`, stacked on S9a (`e80ecd7`); the branch is deleted. VIS-009 stays implemented-local. What S9b adds:

- one page that explains one object in three stages, built on diagram, `steps`, the cue clock, key states and the static state (one optional field, `blueprint`);
- restore rule A (per-page memory while the document is open), keyboard isolation and reduced motion at every stage;
- static, PowerPoint and PDF output that always carries the complete explanation, and export-order refusals by name;
- a Studio action through the normal edit path;
- a page-count plan for the Codex draft path (fake-host tests and one live Codex CLI run: no padding).

Renderer `visual-art-direction.12`, player unchanged (`semantic-player.7` since CINE batch 2). The six answers and the decisions are in [alignment §18](../plans/design-handoff-alignment.md#18-s9b-decisions-and-result--blueprint-a-2026-10-19); see also the [evidence](../evidence/s9b-blueprint-a/review.md). S10 followed (above).

S9a (author controls, DWD-200) is **done** as of 2026-10-19 and merged into `main`. It was built on branch `claude/design-handoff-alignment-review-978a91`, stacked on the S1–S8 branch `claude/design-handoff-alignment-19703c`; both branches are deleted. VIS-013 stays implemented-local and VIS-015 stays partial. What S9a adds:

- the six-question entry and three measured directions;
- planned author actions with undo;
- four-level scope, chapters and separate locks;
- page planning that asks instead of padding;
- reusable profiles;
- PowerPoint and PDF in the Studio export group.

The ten answers and the decisions are in [alignment §17](../plans/design-handoff-alignment.md#17-s9a-decisions-and-result--author-controls-2026-10-19); see also the [evidence](../evidence/s9a-author-controls/review.md). S9b followed (above).

S7 (output levels and VIS-016) is **partial** as of 2026-10-19 and merged into `main`. It was built on branch `claude/nice-archimedes-d8a127`, which started from the S6 branch and held S1–S7; the branch is deleted.

- Components declare L1/L2/L3 levels per format.
- The export order is enforced.
- v3 decks compile to PowerPoint and PDF with per-element receipts.
- Each deck gets an export report with four separate results (a fifth, typography by role, was added on 2026-10-19 after the Astra second verification; see [the response plan](../plans/astra-second-verification-response.zh-CN.md)).

Run it with `npm run export:targets` ([manual](compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016), [evidence](../evidence/vis-016/review.md)). PowerPoint and Keynote were not run: the user's checks are listed in each report. Also open after S7:

- Chinese PDF search (CJK radical code points)
- PDF figure wrappers without alt text
- small text on tall scenes
- ~~PowerPoint and PDF in the Studio menu~~ (built in S9a)

S8 (T01–T03, VIS-015) is done, merged into `main`, and partial ([evidence](../evidence/vis-015/review.md)).

S6 (VIS-014 visual release gate) is **partial** as of 2026-10-19 and merged into `main` (pull request #1 shows as merged). It was built on branch `claude/s6-start-1c14f9`, which merged S3, S4 and S5; that remote branch is deleted. Start from `main`. The decisions are in [alignment §13](../plans/design-handoff-alignment.md#13-s6-decisions-2026-10-19):

- gallery option C
- the layered chart-focus rule
- Claude deferred

Run the gate with `node scripts/release-gate.mjs` ([manual](../visual-acceptance/README.md)). Embedded player changes still bump `PLAYER_VERSION` (now `semantic-player.7`) and re-record the baseline in their own commit.

Open after S6: missing-glyph detection, the 390 px heatmap scroll, CJK heading breaks, payload size, and author calibration of the [scored review](../visual-acceptance/review.md) (74–77, below 80). S7 followed (above).


# Continue from the current visual implementation

**Historical section.** Written for runtime source `5427aa9`; the S6–S11 entries above supersede its status claims (VIS-014 and later were built; see the top of this page). It is kept for its standing rules in the final paragraphs.

[简体中文](../zh-CN/handoff.md) · [Roadmap](../../ROADMAP.md) · [Requirements](../../DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md)

VIS-012 now has [local adapter implementation](hosts.md) and [real-run evidence](../evidence/vis-012/review.md). The strict Codex distinct-page revision, image review and changed HTML export now pass; preserve the responsive-closure evidence. Continue from it; Claude login/live acceptance remains deferred and the overall task stays partial. VIS-014 is the next planned implementation, not automatically authorized by this handoff.

The visual workbench and explanatory interactions are published on `origin/main`. Runtime source `5427aa9b10e07aea5ea0734562be6d01d4a1a92e` passed 338 tests from a clean local archive and Node 22 CI on Ubuntu/macOS/Windows; subsequent documentation/test receipts identify their own commits. Use `git status` and `git log` for current checkout state. [Publication and visual evidence](../evidence/interaction-visual-regression/review.md). VIS-002–013 retain their recorded local/host limits. Read the latest [task-loop manual](task-loop.md) and [verification](verification.md). Historical receipts identify their own source fingerprints and do not accept a later bundle automatically.

For separately requested implementation work:

1. Read AGENTS.md, README.md, ROADMAP.md, roadmap.json and the requirements' current-state section. Use `nextExecutionOrder` as a plan, not an authorization record.
2. For remaining VIS-012 acceptance: retain the existing adapters, shared tools and packaging; only run the deferred Claude route when newly authorized, recording actual structured artifacts and image delivery. Do not rebuild the semantic renderer or substitute a paid provider.
3. Maintain the implemented VIS-013 workbench inside Visual Studio. Preserve languages, scoped author choices, locks, revision checks and last-valid recovery.
4. Prepare VIS-014's six additional composition families, fixed bilingual 12-page gallery, complete 8-page stories per theme, actual host acceptance and standalone package checks. Representative VIS-010 stories do not replace this gate.
5. Run `npm run verify`. Visual changes also require real browser capture after font/image readiness and actual image review. Record exact tests, inspected output and unavailable applications.

Claude sign-in remains deferred; do not retry it without a new request. Prior legacy Codex CLI evidence does not certify the current v3 host loop or native desktop activation. PowerPoint/Keynote/Figma/AE compatibility needs actual target-application evidence. Existing accessibility, projection and native-host gates remain open; generic three-platform CI has passed.

Use an isolated automation browser outside `/Applications` and temporary profiles. Installed browser bundles and personal profiles are read-only. Do not publish, push, add paid providers, upload sources or create scheduled jobs without a direct request. Retain LICENSE/NOTICE, local loopback storage, private-note boundaries, exact facts and explicit migrations. Build from source into `dist/`; do not edit generated output or delete history to pass checks.
