# DWI Phase 02 — safe intake and story contracts

Date: 2026-10-22. Commit `7b567e7` on `claude/read-work-package-00-06-256b3e`. Model: as in [Phase 00](../phase-00/report.md#model-and-effort).

## What changed

- **DWI-020 intake.** [`src/services/document-intake.mjs`](../../../../src/services/document-intake.mjs), `POST /api/intake`. Up to 12 `.txt`/`.md` files (256 KB each, 1 MB and 12,000 characters together). Each document keeps an id, SHA-256, order and line locators; a duplicate stays listed as a duplicate. The content, not the extension, decides the type. PDF (and encrypted PDF), Word/PowerPoint and other zip packages, images, non-UTF-8 and empty files are refused one by one, each with a recovery; an archive is never opened, nothing is fetched or run. Markup, links and assistant-addressed sentences are flagged and kept verbatim as material. `sourceMap` ties the existing F3 protected-line numbering to document and line. The workbench's source input takes several files.
- **DWI-021 claims.** [`src/planning/claims.mjs`](../../../../src/planning/claims.mjs). A claim is a source line that states a number, with its document, line and values as written. The same statement with different numbers forms an *unresolved* contradiction listing each value and its attribution; nothing is averaged or chosen. Local files have no HTTP(S) URL, so they never enter `document.sources`; a page whose numbers have no source is marked `evidence-required` (an existing field). No schema change: the ledger travels in `project.extensions.deckweftIntake` and is checked strictly by `assertClaimLedger`.
- **DWI-022 story review.** [`src/planning/story-review.mjs`](../../../../src/planning/story-review.mjs), `/api/visual/story/{propose,edit,approve}`, [`public/studio/story.js`](../../../../public/studio/story.js) and the **Review the story** dialog: audience, outcome, outline with locators, refused files, contradictions and three named directions; **Make slides** saves a new deck and leaves the open deck as it was. No prompt syntax; no model call.
- **DWI-023 handoff and migrations.** [`schemas/agent-handoff.schema.json`](../../../../schemas/agent-handoff.schema.json) (adopted from the workpack proposal), [`src/adapters/agent-handoff.mjs`](../../../../src/adapters/agent-handoff.mjs), `/api/visual/story/handoff`. Credential-shaped keys or values anywhere refuse the handoff without echoing the value; unknown fields name their path and the repair; declared capabilities are recorded and grant nothing. `validateSchema` now also names the field inside a `oneOf` block (an added detail; the existing message stays). Classic import, the v3 adapter, a v3 JSON round trip and `separateLocks` are covered by `tests/dwi-023.test.mjs`.

## Results

| Check | Exit | Result |
|---|---|---|
| `node --test tests/dwi-020…023.test.mjs` | 0 | 25 tests pass |
| `npm run verify` at `7b567e7` | 0 | 643 tests: 637 pass, 0 fail, 5 skipped, 1 todo — [log](verify-7b567e7.txt) |
| `node tests/browser_dwi_story.mjs` (isolated Chrome for Testing 151, 1440 × 900) | 0 | 5 steps pass — [report and screenshots](dwi-022/browser/) |

The browser run found three defects that the unit tests could not: `public/studio/story.js` was missing from the server's static file list (the page failed to load); the dialog builder assigned the read-only `dataset` property; and a refused PDF beside a readable file disappeared from the review. All three are fixed, and the review now lists refused files with their recovery. Global `input{width:100%}` stretched the dialog's checkboxes; the dialog has its own control styles.

## Visual review

[story-edited.png](dwi-022/browser/story-edited.png): one dialog, two short fields, three page cards with file/line locators and status labels, the contradiction in red with both values, three direction choices. [story-deck.png](dwi-022/browser/story-deck.png): the new two-page deck in the research-report direction.

## Limits

- PDF and DOCX reading stays disabled: no parser dependency was reviewed for offline packaging and licence, as the task requires before enabling it.
- Claims are numeric lines only; a factual sentence without a number is not detected as a claim.
- A handoff's HTTP(S) sources are recorded in the ledger but the approved deck still marks those pages evidence-required; binding them to `document.sources` is not built.
- The outline is deterministic (section and heading based); there is no summarisation.
- Firefox, WebKit, screen readers and touch were not run.

## Next

Phase 03: DWI-030 (needs DWI-011, DWI-022 — met).
