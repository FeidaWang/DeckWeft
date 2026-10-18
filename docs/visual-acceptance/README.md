# VIS-014 visual release gate

[简体中文](../zh-CN/visual-acceptance.md) · [Scored review](review.md) · [Evidence and failures](../evidence/vis-014/review.md) · [Roadmap](../../ROADMAP.md)

State: **partial** (2026-10-19). The gate is implemented and runs locally. Codex finished a prompt-to-artifact task and a scoped revision; Claude is deferred. One explicit case (missing glyph) fails, and the advisory visual review is below the pilot threshold. See the [evidence](../evidence/vis-014/review.md).

## What is frozen

| File | Content |
|---|---|
| [gallery-manifest.json](gallery-manifest.json) | The requirements §9 gallery (decision C): 12 pages, four per theme, English and Simplified Chinese with the same ids. Each page records its task, theme, composition, content status and a content hash per language. `npm test` fails when a page changes until this file is rewritten on purpose. |
| [story-cases.json](story-cases.json) | One 8-page story drawn by each theme (same document, three plans), its interactions and weakest page, plus the eleven explicit cases with page, state, host, reproduction and fix. |
| [host-receipts.json](host-receipts.json) | The Codex run (draft, two image reviews, revision, two exports, every attempt) and the deferred Claude cell. |
| [review.md](review.md) | The scored review. The rubric is advisory: automated scores never certify output. |

The content lives in [tests/release-gate.mjs](../../tests/release-gate.mjs). Repository facts and the WCAG 2.2 quotation are sourced; every other number is synthetic and says so on the page. The images are generated or code-drawn and labelled; none is presented as a photograph.

## Run the gate

You need Node 22 or later, Playwright, and an isolated browser outside `/Applications` (the Playwright cache works). The gate never uses an installed browser or profile.

1. Build and run everything:

   ```bash
   CHROMIUM_PATH=/path/to/isolated/chrome PLAYWRIGHT_MODULE=/abs/path/playwright/index.mjs node scripts/release-gate.mjs
   ```

   Expected: `dist/visual-acceptance/` holds `projects/`, `runs/<deck>/` (captures, contact sheets, receipts), `cases/`, `legacy/`, the standalone captures and `gate.json`. The last line prints each step's result, for example `{"build":true,"quality":true,"cases":false,…}`.
2. Optional engines: add `FIREFOX_PATH=` and/or `WEBKIT_PATH=` for isolated binaries when Playwright's own revision is not cached. Expected: `standalone.json` lists each engine with a version, or `available:false` with the reason.
3. Run one step at a time with `--steps build,cases` (the build step must run once first in a new `--out` folder).
4. View the captures. Open `runs/<deck>/project-contact.png` and `runs/<deck>/index.html`. Name the weakest page of every story in the review. A deck is not approved by a passing JSON file.
5. Host run (uses the host's existing configuration and allowance):

   ```bash
   npm run host:visual -- --host codex --live --out dist/host-visual-NEW --case drafted
   ```

   Expected: `report.json` with `ok:true`, two receipts with image reviews, and `before.html` / `after.html` whose only difference is the revised page. Claude runs only when separately authorized.

## Recovery

- **`Set CHROMIUM_PATH…` or `Installed browser bundles are read-only`.** Point to a testing build outside `/Applications`.
- **`A gallery page changed`** from `npm test`. Restore the page, or rewrite `gallery-manifest.json` on purpose and say why in the review.
- **A deck shows `failed` in `quality.json`.** Open `runs/<deck>/report.json`. Each issue names its scene, block and reason. Fix the content or renderer, then run the gate again; never hide the failing page.
- **The host run fails with `HOST_REVIEW_FINDINGS_INVALID`.** The error's `reason` names the check the host's answer failed, for example a missing finding for one image. Run again in a new `--out` folder; earlier attempts stay as evidence.

## Still open

The [evidence](../evidence/vis-014/review.md#open--recorded-not-fixed) has the full list:

- the Claude host
- missing-glyph detection
- the 390 px heatmap scroll
- CJK heading breaks
- payload size
- screen readers, IME, 200% zoom and projection
- native PowerPoint, Keynote and PDF (VIS-016)
