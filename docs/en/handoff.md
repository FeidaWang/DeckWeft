S9b (blueprint A, Explain → Diagram → Explore, DWD-210) is **done locally** as of 2026-10-19. It sits on branch `claude/agitated-torvalds-969a1e`, stacked on S9a (`e80ecd7`); it is not pushed. VIS-009 stays implemented-local. What S9b adds:

- one page that explains one object in three stages, built on diagram, `steps`, the cue clock, key states and the static state (one optional field, `blueprint`);
- restore rule A (per-page memory while the document is open), keyboard isolation and reduced motion at every stage;
- static, PowerPoint and PDF output that always carries the complete explanation, and export-order refusals by name;
- a Studio action through the normal edit path;
- a page-count plan for the Codex draft path (fake-host tests only).

Renderer `visual-art-direction.12`, player `semantic-player.6`. The six answers and the decisions are in [alignment §18](../plans/design-handoff-alignment.md#18-s9b-decisions-and-result--blueprint-a-2026-10-19); see also the [evidence](../evidence/s9b-blueprint-a/review.md). Next in the plan is S10 (pattern library maintenance, DWD-310). It is not authorized by this handoff.

S9a (author controls, DWD-200) is **done locally** as of 2026-10-19. It sits on branch `claude/design-handoff-alignment-review-978a91`, stacked on the S1–S8 branch `claude/design-handoff-alignment-19703c`; it is not pushed. VIS-013 stays implemented-local and VIS-015 stays partial. What S9a adds:

- the six-question entry and three measured directions;
- planned author actions with undo;
- four-level scope, chapters and separate locks;
- page planning that asks instead of padding;
- reusable profiles;
- PowerPoint and PDF in the Studio export group.

The ten answers and the decisions are in [alignment §17](../plans/design-handoff-alignment.md#17-s9a-decisions-and-result--author-controls-2026-10-19); see also the [evidence](../evidence/s9a-author-controls/review.md). S9b followed (above).

S7 (output levels and VIS-016) is **partial** as of 2026-10-19 on branch `claude/nice-archimedes-d8a127`. That branch starts from the S6 branch, so it holds S1–S7. It is not pushed.

- Components declare L1/L2/L3 levels per format.
- The export order is enforced.
- v3 decks compile to PowerPoint and PDF with per-element receipts.
- Each deck gets an export report with four separate results.

Run it with `npm run export:targets` ([manual](compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016), [evidence](../evidence/vis-016/review.md)). PowerPoint and Keynote were not run: the user's checks are listed in each report. Also open after S7:

- Chinese PDF search (CJK radical code points)
- PDF figure wrappers without alt text
- small text on tall scenes
- ~~PowerPoint and PDF in the Studio menu~~ (built in S9a)

S8 (T01–T03, VIS-015) is done locally and partial ([evidence](../evidence/vis-015/review.md)).

S6 (VIS-014 visual release gate) is **partial** as of 2026-10-19 on branch `claude/s6-start-1c14f9`. The branch merges S3, S4 and S5 and is not pushed. Start from it, not from `main`: `main` has none of S1–S6. The decisions are in [alignment §13](../plans/design-handoff-alignment.md#13-s6-decisions-2026-10-19):

- gallery option C
- the layered chart-focus rule
- Claude deferred

Run the gate with `node scripts/release-gate.mjs` ([manual](../visual-acceptance/README.md)). Embedded player changes still bump `PLAYER_VERSION` (now `semantic-player.4`) and re-record the baseline in their own commit.

Open after S6: missing-glyph detection, the 390 px heatmap scroll, CJK heading breaks, payload size, and author calibration of the [scored review](../visual-acceptance/review.md) (74–77, below 80). S7 followed (above).


# Continue from the current visual implementation

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
