# S9a — author controls (DWD-200; VIS-013, VIS-015), 2026-10-19

**LocalVerified for the S9a scope** in an isolated Chromium (Chrome for Testing 151.0.7922.34 from the Playwright cache, Playwright 1.61.1, temporary profiles, every non-loopback request refused). In the roadmap, VIS-013 stays `implemented-local` and VIS-015 stays `partial`. PowerPoint and Keynote were not run, so no application compatibility is claimed. Claude is deferred.

[Alignment §17: the ten answers, decisions and result](../../plans/design-handoff-alignment.md#17-s9a-decisions-and-result--author-controls-2026-10-19) · [Workbench manual](../../en/workbench.md#six-questions-and-three-directions-s9a) · [Visual Studio manual](../../en/visual-studio.md#author-controls-chapters-and-separate-locks-s9a) · [Migration](../../en/migration.md#chapters-page-disclosure-and-separate-locks-s9a)

## What was built

- **Default entry.** Create asks six questions: Topic, Audience, Style, Detail, Motion and Output. **Show three directions** draws the same content three ways (editorial, report and stage grammars), renders and measures them, and explains each one: graphics, type, media, motion, and output levels in the chosen format. The argument-unit check comes with them. **Use this direction** builds the deck; the workbench re-applies the direction deterministically, so the deck equals the preview.
- **Author actions.** More editorial, Give the chart more space, Make quieter, Keep this layout, Replace the visual and Reduce text, plus starting or removing a chapter, separate locks and applying a profile. Each is planned on the server and stated (scope, effects, what locks kept), then applied through the Studio's edit path, so Undo, Save, revision conflicts and History are unchanged.
- **Four levels.** Deck, chapter, page and object; the most specific wins. Chapters are defined by a start page.
- **Separate locks.** Text, data, sources and composition, after the explicit migration `separateLocks()`, which releases nothing.
- **Partial revisions.** Revise and Apply choices state their scope before they run.
- **Page planning.** Pages are planned from argument units (question, background, mechanism, evidence, limits, action) and the planner shows the cue that decided each one. It asks for missing material or marks pages `evidence-required`; final exports refuse those pages. It never pads or merges.
- **Reusable profiles.** An accepted design can be promoted into a profile; `schemas/design-profile.schema.json` has no field for text, data, sources, images or branding. Profiles are saved, reloaded, exported, imported (as a copy when the id exists) and applied with stated effects and token-drift reporting.
- **Export group.** HTML, PowerPoint, PDF and Project JSON. PowerPoint and PDF run the S7 export order in the isolated capture browser.

## Actual checks

- **Unit tests.** `node --test tests/s9a-author-controls.test.mjs`: 14 tests. They cover:
  - the contract, legacy fixtures and every case of `tests/fixtures/visual/s9a.negative.json`;
  - chapters and profile precedence;
  - the page disclosure in web output and in PowerPoint and PDF notes;
  - separate locks and their survival;
  - scope statements;
  - all six actions (input unchanged, facts unchanged, locks honoured);
  - the three directions for all seven style answers on two bases;
  - profiles (no leaked text, asset, source or dataset string; round trip; token drift);
  - the evidence-required refusal;
  - the Studio API;
  - a workbench direction that equals its preview.

  Agent-written modules were reviewed and kept with their own tests: `tests/argument-units.test.mjs` (11) and `tests/studio-export.test.mjs` (4, three of them browser-gated).
- **`npm run verify`** passed: see [verification](../../en/verification.md#s9a-author-controls--2026-10-19) for the counts.
- **Render baseline.** Re-recorded once, in its own commit, for `visual-art-direction.11` (one stylesheet rule for the page disclosure). The per-entry diff against `4f26b33` shows no visible word, value, table, anchor or title changed in 12 of 12 HTML entries: [baseline-diff-s9a.json](baseline-diff-s9a.json). The player is unchanged (`semantic-player.5`).
- **[UI trace](trace.json)** (`tests/browser_author_controls.mjs`): 28 recorded steps, 0 page errors and 0 external requests. The one console error is the expected HTTP 409 from the deliberately refused theme change on a locked layout.

  At **1440 px**, each step below happened as stated:

  | Step | Observed |
  |---|---|
  | Three directions | Measured: every page fits |
  | Direction 2 expanded | Research Atlas compositions on all five pages |
  | Reduce text | Stated, applied (*More detail · 1 item* in the preview), undone and redone |
  | Give the chart more space | Moved to `atlas-figure` in Research Atlas |
  | Keep this layout | A theme change refused by name for a theme-own layout; the shared `metric-left` kept after a move to Luminous Stage |
  | Data lock | The separation migration stated first |
  | Chapter | Started on page 5; chapter-level More editorial |
  | Save, history | Restore-as-copy kept chapters, disclosure and separate locks |
  | Profile | Saved with author acceptance, listed after reload, applied to the zh-CN deck, exported and imported as a copy |
  | Exports from the menu | HTML; PowerPoint (export order shown, L1 = 24, 8 receipts); PDF (L1 = 22, L2 = 2); Project JSON |
  | Page plan | Asked for background, evidence and four more pages instead of padding (target 9, material 5) |
  | Mark evidence-required | The page was flagged and its export refused with `EVIDENCE_REQUIRED` |

  At **1024 and 390 px**: three directions measured, then Reduce text stated, applied, undone and redone, with 0 px of horizontal page overflow.
- **[Six-theme direction run](directions.json)** (`node scripts/s9a-directions.mjs --exports`):
  - Four bases (supplied text and the six-family deck, English and Chinese), each drawn with every theme as the lead direction: 24 decks at 1440, 1024 and 390 px.
  - 0 fit, render or glyph issues, 0 page errors and 0 external requests.
  - Facts identical across the six themes for every base, and the three directions distinct in every run.
  - Studio PowerPoint and PDF exports passed the export order's own checks on 48 of 48. PowerPoint levels: 420 L1. PDF levels: 396 L1, 24 L2 (diagrams).
- **[Plot measurement](chart-space-measurements.json)** (`--plots`): the drawn plot of the six-family evidence page in every single-chart layout and theme at 1440 px. This is the basis of Give the chart more space.

## Visually inspected

- **All four 1440 px contact sheets**: [text, English](text-en-contact.jpg), [text, Chinese](text-zh-CN-contact.jpg), [six-family, English](six-family-en-contact.jpg) and [six-family, Chinese](six-family-zh-CN-contact.jpg).
- **The directions panel** at three widths, plus each direction card on screen at 390, 1024 and 1440 px. In the tall element screenshot the off-screen card iframes are blank; captured on screen, each card paints its preview.
- **Plans and edits**: the Reduce text plan at three widths, the applied disclosure at three widths, the chart-space and keep-layout results, the chapter list, the page plan, the evidence-required flag, the expanded deck and the profile-applied zh-CN cover (in [shots/](shots/)).

**Weakest pages:**

- **Supplied text, both languages:** page 3, the evidence page, in Research Atlas. `atlas-section` turns the only measured result into what looks like a chapter divider. There is no data to draw, and DeckWeft correctly invents none; a source or dataset would let it take `atlas-figure`. The one-line Limits pages are sparse in every theme for the same reason.
- **Six-family, Chinese:** the Luminous Stage cover. The four-line heading competes with the orb, and at 984 px it is over the 900 px candidate budget, as are most Luminous Stage pages (933–1014 px).
- **Six-family, English:** the Editorial Fieldnotes image page (971 px). "A story worth getting close to." leaves "to." alone on its own line.

## Found and fixed by these runs

| Finding | Fix |
|---|---|
| The first Give the chart more space moved charts to `evidence-top`, which draws the plot smaller (700 × 350 against 780 × 390 px) while the statement claimed full width. | The action now uses the measured largest layout per theme. |
| The first chart-space and Reduce text rules moved a *synthetic, not measured* caveat behind the disclosure. | Qualifications stay beside the claim. Automatic moves take only paragraphs and lists and keep the first supporting block. |
| Text-only directions in the VIS-014 themes put one composition on four pages in a row (render check `repeated-composition`). | A rhythm pass varies the family variant. |
| The Studio menu refused PowerPoint for the six-family deck: 0 of 2 connectors on the process page. The same happens on `4f26b33`. | The export layout now measures diagram edges without an author id. |
| VIS-013: a page-scoped choice dropped the deck profile (the project envelope passed as the document). | Fixed. |
| VIS-013: the Studio's mount-time API calls could run before the session token. | Calls now wait for the token. |
| Profiles did not list after reload; the trace read a project before its save finished. | Profiles load when the controls open; the trace waits for the save message. |

### Independent code review

A separate review of the S9a change set reported 12 defects; each was reproduced and fixed with a regression test (`tests/s9a-author-controls.test.mjs`, two review tests), and the browser evidence above was re-run on the fixed code.

- **Machine review.** It reported a disclosed block as a missing region, so a deck with a disclosure could never pass. Disclosed text is now checked inside the disclosure.
- **Core lock check.** It let a disclosure through on a layout-locked page, and let a text-locked block move behind one. Both are now refused.
- **Profile locks.** Deck and chapter changes moved a profile-locked page that has no page profile without saying so. The plan now states it.
- **Reduce text.** It moved `$40,000` and `1,200 respondents`: any digit now keeps a block with the claim.
- **Page plans.** Stale plans applied, and a client could mark any page. Plans now carry a basis hash and are re-derived on apply.
- **Studio state.** Plans captured the edit counter after the request, and applying a plan restored an old revision (the next save conflicted). Both are fixed.
- **Combined-mode unlock.** Unlocking data or sources in combined mode was always refused. It is now checked against the separated deck.
- **Theme changes.** They counted disclosed blocks, and directions misreported their refusal reason.
- **Player.** It ignored chapter and page motion. Profile promotion recorded only the deck profile.
- **Directions.** Applying one cleared the deck's audience.
- **Replace the visual.** A re-render could reset the chosen image; the effect now names it.
- **Page numbers.** After a split, effects cited old page numbers.

## Open — recorded, not fixed

| Item | Detail | Owner |
|---|---|---|
| S9b | Blueprint A (Explain → Diagram → Explore), its restore rule, keyboard isolation, reduced motion and export-target runs | Next session |
| Pages over the 900 px budget | 11 of 132 pages at 1440 px in this run (Luminous Stage and one Editorial Fieldnotes page); answer 7 = record only | Follow-up |
| Codex draft path | Receives a chosen direction but no page-count plan; planning and actions run on the local plan | Follow-up |
| Profiles from mixed-theme decks | Record the dominant theme and that theme's composition choices; pages in other themes are listed as skipped | By design, documented |
| Object-level profile choices | The object level carries locks and per-object actions, not colour or density per object | By design |
| Qualifier detection | Word lists in English and Chinese, documented in `author-actions.mjs`; an unlisted hedge can move with Reduce text (it stays in the disclosure, notes and appendix) | Follow-up |
| PowerPoint, Keynote | Installed, not run; open the Studio exports yourself | User |

## Applications

- PowerPoint, Keynote and Figma: installed, **not run** (only the user runs them).
- LibreOffice and After Effects: not installed.
- The installed Safari, Chrome and Firefox were not used. Firefox and WebKit were not run for S9a.
- Not tested: screen readers, IME input, 200% zoom, projection, remote CI.

## Files

| File | Content |
|---|---|
| `trace.json` | The UI trace |
| `directions.json` | The six-theme run with the export results |
| `chart-space-measurements.json` | The plot measurements |
| `baseline-diff-s9a.json` | The baseline receipt |
| `*-contact.jpg` | The four 1440 px sheets |
| `shots/` | Studio captures at 1440, 1024 and 390 px |

`.pptx`, `.pdf` and HTML files are not committed; `node scripts/s9a-directions.mjs --exports` rebuilds them in `dist/s9a-directions/`.
