# DeckWeft

**Ideas, beautifully arranged.**

[简体中文](README.zh-CN.md) · [Start here](docs/en/start.md) · [Simple manual](docs/en/manual.md) · [Roadmap](ROADMAP.md) · [What is actually supported](docs/en/compatibility.md)

DeckWeft turns an outline into an editable presentation on your own computer. Think of it as a tidy workbench: your words are the materials, four layouts are the arranging tools, and exports are the boxes you carry away.

**Status: `0.1.0-alpha.2`.** This is a working local-first foundation, not a finished replacement for a commercial presentation suite. There is no hosted service, bundled model, required API key, telemetry, or automatic cloud upload. An installed Codex or Claude Code skill can use its host's model to write the outline; the studio itself arranges and edits content deterministically.

![DeckWeft Studio, rendered from the running application](docs/assets/studio-desktop.png)

Run `npm run studio:compositions` for six composition families, three measured candidates per page, and whole-deck rhythm selection. [Usage and recovery](docs/en/visual-studio.md) · [VIS-006 visual evidence](docs/evidence/vis-006/review.md).

Run `npm run studio:assets` for source-preserving image slots, local JPEG/WebP conversion and author-protected crop choices. [Asset manual](docs/en/assets.md) · [VIS-007 evidence](docs/evidence/vis-007/review.md).

Run `npm run studio:components` for editable exact-data charts, directed diagrams, original code and stable annotations across three themes and both languages. [Component manual](docs/en/components.md) · [VIS-008 evidence](docs/evidence/vis-008/review.md).

Run `npm run studio:interactions` for real chart filters, image comparison/hotspots, step explanations and deterministic offline cue replay. Keyboard, touch and reduced motion share the same source-preserving state. [Interaction manual](docs/en/interactions.md) · [VIS-009 evidence](docs/evidence/vis-009/review.md).

Run `npm run visual:verify` for local browser quality capture and bounded composition repair, then `npm run visual:review` to explore complete stories, diagnostics and native screenshots. Passing receipts require actual image review. [Quality manual](docs/en/visual-quality.md) · [VIS-010 evidence](docs/evidence/vis-010/review.md).

Run `npm run deck:create -- --brief examples/task-brief.en.json --out dist/my-task` for a source-preserving local task checkpoint and preview. The shared tools connect planning, exact-data revisions, real browser checks, actual image review, bounded repair and reviewed HTML export. [Task manual](docs/en/task-loop.md) · [VIS-011 evidence](docs/evidence/vis-011/review.md). VIS-012 adapters have local implementation with deferred Claude acceptance; the prompt-first workbench (VIS-013) is implemented locally.

Local coding-host adapters now support opt-in structured drafting, scoped revisions and actual captured-image feedback through the shared task tools. Claude live acceptance remains deferred; VIS-012 is partial. [Host manual](docs/en/hosts.md) · [Evidence](docs/evidence/vis-012/review.md).

Enter a prompt or select a saved source in the existing Visual Studio, then watch, revise a page, inspect actual screenshots and export reviewed HTML. Language/style preferences, author locks and recovery persist locally. [Prompt-first workbench](docs/en/workbench.md) · [VIS-013 evidence](docs/evidence/vis-013/review.md). Claude login remains deferred.

Create now asks six questions and shows three measured directions of the same content before it builds the deck. Edit page → Author controls states each change before applying it, and Undo reverses it. You also get chapters, separate text/data/source/composition locks, page planning that asks instead of padding, reusable design profiles, and PowerPoint/PDF export from the Studio. [Author controls](docs/en/visual-studio.md#author-controls-chapters-and-separate-locks-s9a) · [S9a evidence](docs/evidence/s9a-author-controls/review.md).

Existing works now support source-bound chart switching, editable step explanations, finite motion and saved opening selections in Visual Studio. Full bilingual interaction regression and actual preview/export image comparison passed; see the [interaction manual](docs/en/interactions.md) and [current evidence](docs/evidence/interaction-visual-regression/review.md).

## Visual-first local implementation

[Visual Studio](docs/en/visual-studio.md) now edits and saves v3 semantic projects inside the local app. Cream Collage, Dark Data and Electric Violet have bilingual examples, live DOM/SVG previews, numeric data tables, scoped theme/content locks, local image cropping and history recovery. Run `npm run studio:visual-demo`, or follow Visual Studio from the classic library. The full release gallery, host generation and native v3 exports remain later gates. The [reconciled requirements](DeckWeft-Visual-First-Build-Roadmap-2026-10-18.md) continue from VIS-002–011; VIS-012 adapters now have local implementation with deferred Claude acceptance, with the local VIS-013 workbench and planned VIS-014 release acceptance.

## Local media and multiple workers

The MB-11–15 build adds optional host-image requests with local reuse, two scoped workers, orbit/layer 3D recipes with editable static fallbacks, and richer Figma/AE handoffs. A real concurrent CLI pair and direct-browser media/3D flows passed. **Dot desktop, native Figma import and actual AE rendering remain open gates.** [Guide](docs/en/media-workers.md) · [Evidence](docs/evidence/mb-11-15/review.md).

## Narrative and visual planning

The MB-06–10 local build adds a reviewable storyboard, six semantic templates, local PNG provenance/rights/fallback records, keyboard exploration in HTML, and scoped single-host jobs with durable checkpoints and a progress timeline. Version 1 projects stay unchanged; approving a storyboard creates a separate version 2 copy. [Try the workflow](docs/en/planning.md) · [Actual medium/high pilot](docs/en/astra-evaluation.md) · [Evidence](docs/evidence/mb-06-10/review.md).

Four actual Codex CLI turns compared the same six short tasks at medium/high, twice each. Both passed 12/12 current checks. Medium used less wall time and reported output in this pilot; dollar cost and independent server model identity are unknown. Dot desktop acceptance remains open.

## New in alpha.2

The current local build adds a [private presenter and audience window](docs/en/presenting.md), slide-following teleprompter, editor light/dark/system appearance, shared motion preferences and semantic action controls. Visual exports omit private notes by default; use the explicit presenter option when needed. The development type pilot preserves direct offline runtime startup. These local checks do not close the outstanding host or real projection gates.

Browser-measured multilingual text, safer keyboard/dialog/save handling, and a read-only version browser with restore-as-copy. **DW-020 remains blocked overall:** the authenticated Codex CLI skill run now passes with reviewed output; Claude sign-in was deferred, and Codex desktop activation remains untested. The [host acceptance guide](docs/en/host-acceptance.md) links the current evidence. [Release notes](docs/en/alpha-2.md) · [Evidence](docs/en/verification.md).

## Try it

Install **Node.js 22 or newer**. Download this repository's source ZIP and unzip it. Open a terminal in the `DeckWeft` folder—the folder containing `package.json`.

```bash
node bin/deckweft.mjs studio --open
```

There are **no package dependencies to download**. If a browser does not open, open the local address printed in the terminal. Use **Save** before closing. Press `Ctrl+C` in the terminal to stop.

## English demos and optional drafting

Use `?mode=pitch` on the Studio URL for an English presentation view. It hides other language editions without changing them. Signal adds a white, black and blue preset. **Generate with Dot** opens an opt-in local interface with MCP and connected-computer CLI transports. The bridge is tested locally; an actual Dot host run remains unverified. [Connection guide](docs/en/agent-bridge.md).

The [stage example](docs/examples/dot-stage/README.md) includes an offline Three.js presentation and an editable PPTX fallback. This optional example has a bundled MIT renderer; the core Studio remains dependency-free.

The [five-minute DevDay demo](docs/en/devday-demo.md) now brings the same tools into the Studio: an icon rail, speech planning, an interactive tour and an optional Cosmic & Dots style. The style uses local Three.js geometry, original star art and native editable text in PPTX. Actual Dot desktop generation remains pending; the separate GPT-6 Astra CLI pilot is recorded above.

## What works in this alpha

| You need to… | DeckWeft currently does… |
| --- | --- |
| Start from notes | Import plain text / Markdown with `---` between slides, or import project JSON. |
| Compare layouts | Show four structurally different, ranked compositions with explainable rule scores. |
| Keep editing | Edit titles, support text, points, number cards, notes, source references, themes, and slide order. Undo and redo local edits. |
| Work at different sizes | Arrange 16:9, 4:3, square, and portrait slide canvases. The editor uses drawers on smaller windows. |
| Keep your work safe | Save revisioned JSON; browse read-only earlier versions and restore a separate copy. Refuse stale overwrites and retain edits made during a save. |
| Take the deck away | Export native editable PowerPoint text/shapes, standalone HTML, one-slide SVG, project JSON, and experimental Figma / AE handoffs. |
| Use an agent | Install a local skill for Codex, Claude Code, or both; build a self-contained native plugin bundle. |

Layouts do not silently drop content. If text cannot fit above the minimum size, visual export stops and explains the blocker. Scores assess layout rules, **not truth, business quality, or a guarantee of perfect rendering**. The Studio measures whole text runs with browser Canvas and reuses the validated result for preview and export. Headless CLI output remains explicitly estimated. Other applications can substitute fonts; inspect the final file there.

## Add it to your agent

From this repository, preview the change, then install into this project:

```bash
node bin/deckweft.mjs install --target both --scope project --dry-run
node bin/deckweft.mjs install --target both --scope project
```

For all your projects, replace `--scope project` with `--scope user`. This copies a **standalone skill** plus its runtime. It does not silently approve permissions or claim a native plugin was enabled. Use `$deckweft` in Codex or `/deckweft` in Claude Code after the host discovers the skill.

For a **native plugin package**, use `npm run build`, then follow the separate [installation guide](docs/en/installation.md). Installing, enabling, and successfully running inside the host are separate checks.

## Export without opening the studio

```bash
node bin/deckweft.mjs check examples/welcome.deck.json
node bin/deckweft.mjs export examples/welcome.deck.json --format pptx --out welcome.pptx
node bin/deckweft.mjs export examples/welcome.deck.json --format html --out welcome.html
```

Output files are not overwritten unless you explicitly pass `--force`. The Chinese example is `examples/welcome.zh-CN.deck.json`.

## Not implemented yet

There is no automatic web research, built-in unattended image provider, video rendering, arbitrary PowerPoint import, real-time collaboration, hosted billing, or embedded Figma/AE desktop control. Native editable charts exist only in the experimental v3 PowerPoint export (`npm run export:targets`); it is checked by package inspection, not yet in PowerPoint or Keynote ([compatibility](docs/en/compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016)). The Figma and AE importers are experimental, and their real application acceptance tests remain release gates. Language switching changes the interface or font preference; it does not translate your text.

## Evidence, not badges

Read the [verification report](docs/en/verification.md), [machine-readable status](PROJECT_STATUS.json), and [local test output](docs/test-results.txt). They distinguish passing local checks from host and application checks that have not run.

## Build and contribute

```bash
npm ci # development-only TypeScript compiler; not required to run the Studio
npm test
npm run check
npm run build
npm run demo
```

`npm run verify` runs all four. See [architecture](docs/en/architecture.md), [contributing](CONTRIBUTING.md), and [next-task handoff](docs/en/handoff.md). The current committed source passed clean-checkout verification and Node 22 CI on Ubuntu, macOS and Windows. [Publication and visual regression evidence](docs/evidence/interaction-visual-regression/review.md) keeps these results separate from native host/application acceptance.

English is the source language for code and documentation. Simplified Chinese has separate, human-readable pages. We do not mix two full manuals into one crowded page.

## License and lineage

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE.md). This new identity preserves the supplied predecessor's copyright notice rather than erasing its history. No vendor affiliation is implied. The package is marked `private` to prevent accidental npm publication; this does not prevent publishing the source on GitHub.
