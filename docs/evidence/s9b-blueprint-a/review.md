# S9b evidence — blueprint A, Explain → Diagram → Explore (DWD-210)

Checked 2026-10-19 on branch `claude/agitated-torvalds-969a1e`, stacked on S9a (`e80ecd7`). Nothing is pushed. State: **LocalVerified** for the S9b scope (isolated Chromium, viewed images). Renderer `visual-art-direction.12`, player `semantic-player.6`. Decisions: [alignment §18](../../plans/design-handoff-alignment.md#18-s9b-decisions-and-result--blueprint-a-2026-10-19). Manuals: [interactions](../../en/interactions.md#explain--diagram--explore-blueprint-a-s9b) · [Visual Studio](../../en/visual-studio.md#explain--diagram--explore-pages-s9b).

## What was built

- **Contract.** A `steps` interaction over a diagram may declare `blueprint {questionBlockId, answerBlockId, wholeExplanationId}` in the `design-plan` and `web-scene` schemas. The field is optional and `schemaVersion` is unchanged. Legacy steps interactions keep their exact behaviour (render baseline). Negative fixture: [`s9b.negative.json`](../../../tests/fixtures/visual/s9b.negative.json), 14 cases. The explicit migration of an existing page is the Studio action `addBlueprintA`. It keeps an existing node explanation, ids and words included, and refuses relationship steps.
- **Stages.** The cue clock is the stage clock: 0 Explain, 1 Diagram, 2… Explore each part in reading order. `step.select` explores a part. `step.select` without a part (**Show whole**) returns to Diagram ([`blueprint.mjs`](../../../src/motion/blueprint.mjs), [`timeline.mjs`](../../../src/motion/timeline.mjs)).
- **Player.** `mountBlueprint` ([`components.js`](../../../public/runtime/components.js)) and the stage-aware timeline ([`semantic.js`](../../../public/runtime/semantic.js)) provide:
  - stage pills;
  - Previous / Next stage and Skip on the one clock;
  - numbered, focusable parts on the diagram and as buttons;
  - Explore that marks one part and keeps the others drawn.

  A blueprint page opens on Explain.
- **Static output.** Every blueprint page carries the complete explanation without JavaScript: the whole object, numbered parts and every explanation. A static state adds its statement and marks an Explore part. PowerPoint receives native number circles and a native numbered list.
- **Export order.** The static-state stage refuses a blueprint page with no static state (`BLUEPRINT_STATIC_REQUIRED`). It also refuses Explain as the static state, or a measured page missing a part label or an explanation (`BLUEPRINT_STATIC_INCOMPLETE`). The review gate measures every blueprint key state.
- **Studio.** **Make this page Explain → Diagram → Explore** goes through `changed()`, so Undo, Redo, Save and History work, and it honours the scene lock and the diagram lock. The whole object's explanation is editable. A hint states what the static state means for exports.
- **Codex draft page plan (S9a leftover).** The prompt carries `pageBrief()`. The drafted deck is planned locally (`draftPagePlan`), and pages holding none of the supplied lines are listed as host-added and asked about. Tested with the fake host and one live Codex run (below).

## Restore rule, keyboard, reduced motion — player trace

[`player-trace.json`](player-trace.json): 66 steps, English (Editorial Fieldnotes) and Chinese (Dark Data), at 1440, 1024 and 390 px, with 0 page errors and 0 external requests.

| Check | Result at every width and language |
|---|---|
| Opening | Explain (position 0), diagram hidden, panel names the object, page 2 / 3, although the static state is Diagram |
| Fit audit | `deckweftFit.ok`: the opening and every key state (Explain, Diagram, Explore · Measure) have 0 overflow, clipping, contrast or glyph issues |
| Restore rule A | Select Repair on the diagram, then **Next** page and **Previous** page: Explore · Repair, still *Exploring*, Repair pressed and marked. The same holds with ArrowRight / ArrowLeft (nothing focused). **Reload**: back to Explain, not exploring |
| Keyboard isolation | 16 key presses never turned the page: Enter, Space, arrows, Home and End on a diagram part; arrows on part buttons; Enter on **Show whole**; Enter/Space on **Next** / **Previous stage**; arrows, Home and End on the cue slider; Enter on **Skip**; Space on **Replay**. Control: ArrowRight with nothing focused turned the page to 3 / 3 |
| Reduced motion | Next stage reached Diagram and each of the 4 parts, and Previous back to Explain, each with 0 running animations. Skip reached the static state (Diagram) |
| `reducedMotion: "static"` | Opens on Diagram with the notice shown and Replay disabled. Previous reaches Explain; Next reaches Explore |
| No JavaScript | 4 numbered parts, 4 explanation items and the *Static view* statement |

Viewed: [`shots/player-*.jpg`](shots/) (a selection from 36 captures). One defect was found and fixed during the trace: the cue count named the position's stage (*Diagram*) while the reader explored a part. It now names the reader's stage.

## Studio trace

[`studio-trace.json`](studio-trace.json): 9 steps, with 0 page errors and 0 external requests.

1. At 1440 px (English deck): **Lock this scene interaction plan** disables the action. Unlocked, it creates the blueprint: 5 stage cues, 3 key states, and the hint says exports refuse.
2. **Undo** removes the blueprint and **Redo** restores it. The Studio frame (the player) opens on Explain and moves to Diagram.
3. **PowerPoint** was refused without a static state: *Page pipeline: Choose the static state…*
4. **PDF** was refused with Explain: *Page pipeline: The Explain stage does not show the object or its parts…*
5. With Diagram, both downloaded. Slide 2 holds all 5 explanations as text and 4 parts.
6. At 1024 and 390 px (Chinese deck): action, static state and hint in the narrow inspector.

Viewed: [`shots/studio-*.jpg`](shots/).

## Six themes, two languages

[`themes.json`](themes.json), from `scripts/s9b-blueprint.mjs`: 12 decks. Facts are identical per language (one `factsHash` for each). There are 0 fit, contrast or glyph issues on every page and every key state at 1440, 1024 and 390 px. The blueprint page uses `process-line` in every theme.

Contact sheets viewed: [`contact-en.jpg`](contact-en.jpg), [`contact-zh-CN.jpg`](contact-zh-CN.jpg). Each row is a theme; the columns are Explain, Diagram, Explore · Repair and the static page without JavaScript.

**Weakest page: the Explain stage.** The question, the answer and the object card fill the top third, and the lower two thirds stay empty while the diagram is held back. It is correct by design (the handoff's Explain shows no object), but it is the least composed state in every theme. The linear four-part diagram is also drawn at about 55 % of the content width in `process-line`. In the Diagram stage the static-state line repeats what the panel says, because the static state sits at position 1.

## Exports

`npm run export:targets -- --s9 --out dist/s9b-exports` ([`s9-exports.json`](s9-exports.json)) covered 12 decks, one per theme and language (static state: Diagram).

| Result | Value |
|---|---|
| PowerPoint editability and page check | pass on 12 of 12; all components L1 |
| PDF search | pass in English (6). Partial in Chinese (6): CJK radical code points, the known S7 limit |
| Accessibility | partial: package checks pass; Chromium figure wrappers without alt (known S7) |
| Visual fidelity | partial: Quick Look renders only |
| Receipts | 7 per deck: balanced lines, disclosures, interaction and motion not compiled |

Viewed export sheets: `blueprint-cream-collage-en`, `blueprint-orange-launch-en`, `blueprint-dark-data-zh-CN` and `blueprint-fresh-report-zh-CN` (web | PowerPoint | PDF).

A defect was found and fixed: PowerPoint dropped the part numbers silently, because they sit in nested SVG groups. They are now measured with their part and compiled as native circles.

Weakest export page: the blueprint page in 16:9. The tall static page (diagram plus the explanation list) is scaled whole into a slide, so its smallest text is 5.5 pt. This is the known S7 limit, small text on tall scenes. The numbered list's markers also sit wide of the text in Quick Look.

Studio PowerPoint and PDF: see the Studio trace above.

## Live Codex run of the draft page plan

Run on 2026-10-19 at the user's request: [`codex-page-plan/`](codex-page-plan/) holds the brief, the hash-only host receipt and application record, and [`page-plan.json`](codex-page-plan/page-plan.json).

- **Command:** `node bin/deckweft.mjs visual-task --brief brief.json --out dist/s9b-codex/run --host codex --live --timeout-ms 600000`.
- **Host:** Codex CLI 0.160.0 with the existing login; model and billing are not inferred.
- **Receipt:** validated, exit 0, 29.3 s, one turn.
- **Brief:** three supplied pages (question and mechanism, evidence, next step), detail *standard*, target 6 pages.

| Check | Result |
|---|---|
| Padding | Codex returned 4 pages, not 6. It split the first supplied page into a question page and a mechanism page. Every page holds supplied lines, so no page is host-added. |
| Coverage | Every supplied line is on a drafted page (`HOST_CONTENT_COVERAGE` passed). |
| Local plan | `needs-material`: units present are question, mechanism, evidence and action; background and limits are missing. Four questions follow: two missing units, one unsourced claim (page 3), and *The material supports 4 pages; the target is 6 … DeckWeft will not pad the deck.* |
| Host wording | Codex wrote the unit names as page headings and added one sentence on the last page naming the missing units. It added no fact, number or quotation. The draft stays marked *unverified host-authored outline; author must review*. |

The run checks one host path with one brief. It does not certify Codex desktop or other briefs, and Claude stays deferred.

## Byte identity

The renderer `.11 → .12` and the player `.5 → .6` were re-recorded in their own commit. [`baseline-diff-s9b.json`](baseline-diff-s9b.json) compares against `e80ecd7`. In all 12 HTML entries, no visible word, value, data table, anchor or title changed.

## Tests

- `node --test tests/s9b-blueprint-a.test.mjs`: 6 tests. They cover the contract and the negative fixture, the stages, the static output, the export-order refusals, facts in six themes and both languages, and the Studio action and locks.
- Codex page plan: `tests/host-adapters.test.mjs`, `tests/argument-units.test.mjs` and `tests/workbench.test.mjs` (one new test each).
- `npm run verify`: see [verification](../../en/verification.md#s9b--blueprint-a-dwd-210).

## Open — recorded, not fixed

| Item | Detail | Owner |
|---|---|---|
| Explain stage composition | Mostly empty page (weakest page above) | Follow-up |
| Pages over the 900 px budget | In the player at 1440 px: Luminous Stage English opening 1014 px, closing 1071 px, Explore 918 px; Cream Collage Chinese opening 989 px. Answer 7 = record only | Follow-up |
| Scroll advancement (M09) | v3 has no scroll trigger; Next / Previous only | Open since S1 |
| Part groups (M10) | Parts are single nodes; no grouping | Follow-up |
| Qualifier word lists, mixed-theme profiles | S9a leftovers, unchanged (answer 6) | Follow-up / by design |
| PowerPoint, Keynote | Installed, not run; open the exports yourself | User |

## Applications

- PowerPoint, Keynote and Figma: installed, **not run**.
- LibreOffice and After Effects: not installed.
- Firefox and WebKit: not run (answer 5); the installed Safari, Chrome and Firefox were not used.
- Not tested: screen readers, IME input, 200% zoom, projection, remote CI.

## Files

| File | Content |
|---|---|
| `player-trace.json` | Restore rule, keyboard, reduced motion, no JavaScript |
| `studio-trace.json` | The Studio path |
| `themes.json` | Six themes × two languages |
| `s9-exports.json` | `export:targets --s9` summary |
| `baseline-diff-s9b.json` | The baseline receipt |
| `contact-*.jpg` | The two contact sheets |
| `shots/` | Player and Studio captures (JPEG selection) |

Rebuild everything with:

```bash
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node tests/browser_blueprint_a.mjs
```

The same environment runs `node tests/browser_blueprint_studio.mjs`, `node scripts/s9b-blueprint.mjs` and `npm run export:targets -- --s9`. The output goes to `dist/`.
