# DeckWeft

**Ideas, beautifully arranged.**

[简体中文](README.zh-CN.md) · [Start here](docs/en/start.md) · [Simple manual](docs/en/manual.md) · [Roadmap](ROADMAP.md) · [What is actually supported](docs/en/compatibility.md)

![DeckWeft Studio, rendered from the running application](docs/assets/studio-desktop.png)

## What is this, in one breath?

You have notes. You want slides. DeckWeft sits in the middle.

Think of a weaving loom. Your words are the threads. DeckWeft is the loom that weaves them into a neat cloth: a slide deck you can still edit, save, present, and take to PowerPoint or a web page.

It all runs **on your own computer**. No account, no cloud upload, no hidden AI, no tracking.

**Version: `0.1.0-alpha.2`.** "Alpha" means: it works, but it is still young. It is not a finished replacement for a commercial presentation suite.

## Try it in three steps

1. Install **Node.js 22 or newer**.
2. Download this repository (the green **Code → Download ZIP** button), unzip it, and open a terminal in the `DeckWeft` folder (the one with `package.json` inside).
3. Run:

```bash
node bin/deckweft.mjs studio --open
```

A browser window opens with the Studio. There is **nothing else to download**. If no browser appears, copy the local address the terminal prints. Click **Save** before you close. Press `Ctrl+C` in the terminal to stop.

## How it works, like you're five

1. **You write.** Paste plain notes or Markdown. Put `---` between slides.
2. **DeckWeft offers layouts.** For each slide it tries several arrangements, measures them, and shows you the best ones side by side. You pick.
3. **You polish.** Change words, numbers, charts, pictures, colors and order. Undo works. Lock the parts you don't want touched.
4. **You take it away.** Export an editable PowerPoint, a single-file web page, a PDF, an SVG picture of one slide, or the project file itself.

Two promises it keeps:

- **It never secretly cuts your words.** If text won't fit, it stops and tells you, instead of shrinking it until it is unreadable.
- **A layout score is not a truth score.** "This looks balanced" says nothing about whether the content is right.

## The toy box (things you can try)

Each command opens a ready-made demo. Each row links to a manual and to the proof that it was checked.

| Run this | You get to play with… | Read more |
| --- | --- | --- |
| `npm run studio:visual-demo` | The Visual Studio: three themes (Cream Collage, Dark Data, Electric Violet), English and Chinese examples, image cropping, history | [Visual Studio](docs/en/visual-studio.md) |
| `npm run studio:compositions` | Six families of page layouts, three measured choices per page, and a "whole deck rhythm" picker | [Guide](docs/en/visual-studio.md) · [Evidence](docs/evidence/vis-006/review.md) |
| `npm run studio:assets` | Image slots that keep your original file, local JPEG/WebP conversion, crops that protect what matters | [Assets](docs/en/assets.md) · [Evidence](docs/evidence/vis-007/review.md) |
| `npm run studio:components` | Editable charts with exact numbers, arrow diagrams, code blocks, notes that stay put | [Components](docs/en/components.md) · [Evidence](docs/evidence/vis-008/review.md) |
| `npm run studio:interactions` | Chart filters, before/after image comparison, hotspots, step-by-step explanations; keyboard, touch and reduced motion all work | [Interactions](docs/en/interactions.md) · [Evidence](docs/evidence/vis-009/review.md) |
| `npm run visual:verify`, then `npm run visual:review` | A robot proofreader: it takes real browser screenshots, spots layout problems, tries small fixes, and lets you review them | [Visual quality](docs/en/visual-quality.md) · [Evidence](docs/evidence/vis-010/review.md) |
| `npm run deck:create -- --brief examples/task-brief.en.json --out dist/my-task` | A whole "plan → build → check → fix → export" task, saved step by step so nothing is lost | [Task loop](docs/en/task-loop.md) · [Evidence](docs/evidence/vis-011/review.md) |

## Bigger features, in plain words

- **Three directions.** Paste what you want to say and press Arrange, or ask for three directions of the deck you have on screen (Less / Medium / More detail). Each direction is a different look of the *same* content, and nothing is applied until you pick one.
- **Look controls.** One-click changes (More space, Larger type, Lock this page) apply at once, and Undo takes them back. The finer author actions, the image review and page planning are available through the API and the release gate, not in the browser. [Look controls](docs/en/visual-studio.md#look-controls-chapters-and-locks-s9a) · [Evidence](docs/evidence/s9a-author-controls/review.md)
- **Explain → Diagram → Explore.** A slide asks a question, shows the whole picture, then lets the audience step through each part. Static copies still contain the full explanation. [How it works](docs/en/interactions.md#explain--diagram--explore-blueprint-a-s9b) · [Evidence](docs/evidence/s9b-blueprint-a/review.md)
- **Prompt-first workbench.** Type what you want, watch it build, fix one page, then take it away. The real-screenshot review runs through the API and the release gate. Your language, style and locks are remembered. [Workbench](docs/en/workbench.md) · [Evidence](docs/evidence/vis-013/review.md)
- **Storyboard first.** Plan the story before the slides. Approving it makes a new copy, so the old one stays safe. [Planning](docs/en/planning.md) · [Evidence](docs/evidence/mb-06-10/review.md)
- **Presenter mode.** A private speaker window with notes and a teleprompter, plus a separate audience window. Exports leave private notes out unless you ask. [Presenting](docs/en/presenting.md)
- **Helpers and media.** Optional image requests, two separate workers that don't step on each other, simple 3D scenes with flat backups, and handoff files for Figma and After Effects. [Media and workers](docs/en/media-workers.md) · [Evidence](docs/evidence/mb-11-15/review.md)
- **Demos.** A [five-minute DevDay demo](docs/en/devday-demo.md), an offline [stage example](docs/examples/dot-stage/README.md) with an editable PowerPoint backup, and `?mode=pitch` on the Studio address for an English-only pitch view.

## Let your coding assistant use it

DeckWeft can be installed as a skill for **Codex**, **Claude Code**, or both. Your assistant writes the outline; DeckWeft arranges it.

```bash
node bin/deckweft.mjs install --target both --scope project --dry-run
node bin/deckweft.mjs install --target both --scope project
```

The first line only *shows* what would happen. The second one copies the files. Use `--scope user` instead of `--scope project` to install for all your projects. Then type `$deckweft` in Codex or `/deckweft` in Claude Code.

For a native plugin package, run `npm run build` and follow the [installation guide](docs/en/installation.md). "Copied", "turned on in the host" and "actually ran in the host" are three separate checks. [Host manual](docs/en/hosts.md) · [Connection guide](docs/en/agent-bridge.md)

## Export without opening the Studio

```bash
node bin/deckweft.mjs check examples/welcome.deck.json
node bin/deckweft.mjs export examples/welcome.deck.json --format pptx --out welcome.pptx
node bin/deckweft.mjs export examples/welcome.deck.json --format html --out welcome.html
```

Existing files are never overwritten unless you add `--force`. A Chinese example lives at `examples/welcome.zh-CN.deck.json`.

## What it can't do yet

An honest list, so nothing surprises you:

- No automatic web research, built-in unattended image generator, or video rendering.
- No importing arbitrary PowerPoint files, no real-time collaboration, no hosted accounts or billing.
- No direct control of the Figma or After Effects desktop apps. Their importers are experimental.
- Editable native charts exist only in the experimental v3 PowerPoint export (`npm run export:targets`). They were checked by inspecting the file, not yet by opening it in PowerPoint or Keynote. [Compatibility](docs/en/compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016)
- Some checks inside real hosts (Claude sign-in, Codex desktop, Dot desktop) have not run yet. [Host acceptance](docs/en/host-acceptance.md)
- Switching the interface language does not translate your slides.

## Proof, not badges

Every claim above points to a record. Start with the [verification report](docs/en/verification.md), the [machine-readable status](PROJECT_STATUS.json) and the [local test output](docs/test-results.txt). Passing local checks are kept apart from host and app checks that haven't run.

## For builders

```bash
npm ci
npm run verify
```

`npm ci` installs the TypeScript compiler, which you only need for development, not for running the Studio. `npm run verify` runs type checks, tests, document/source checks, the plugin build and the demo. See [architecture](docs/en/architecture.md), [contributing](CONTRIBUTING.md) and the [next-task handoff](docs/en/handoff.md).

English is the source language. Simplified Chinese has its [own pages](README.zh-CN.md) rather than two languages squeezed onto one.

## License

MIT. Copyright (c) 2026 Feida Wang. See [LICENSE](LICENSE), and [NOTICE](NOTICE.md) for bundled third-party parts (icons, Three.js) and trademarks. DeckWeft is not affiliated with any vendor named in this repository. `package.json` is marked `private` only to prevent an accidental npm publish.
