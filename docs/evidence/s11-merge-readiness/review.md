# S11 — merge readiness for S1–S10, evidence, 2026-10-19

[Merge plan](../../plans/design-handoff-merge-to-main.md) · [Alignment §20](../../plans/design-handoff-alignment.md#20-s11-decisions-and-result--merge-readiness-2026-10-19) · [Handoff](../../en/handoff.md)

**State: LocalVerified** for the S1–S10 tip `d584d76`, with two findings below (both about test scripts, none about runtime code). Nothing was pushed, merged, deleted or published. Remote CI has not run for any of S7–S10, so nothing here is **HostVerified** or **ExportVerified**.

The user's four answers (asked first, in Chinese): merge commit as the leaning (recorded only); rerun all browser gates; keep the remote `claude/s6-start-1c14f9`; wait for the user's PowerPoint and Keynote exports before any push.

## 1. Freeze

| Item | Value |
|---|---|
| Tip frozen | `d584d7695937475c6b525bbb37c8579ae77c6d0c` (`claude/pattern-library-maintenance-p3-28aa7c`) |
| This worktree | Started at `main` (`058b939`). `git merge-base --is-ancestor d584d76 HEAD` returned 1, so it was fast-forwarded with `git merge --ff-only d584d76` before any edit |
| `git status` | Clean at the freeze |
| Commits over `main` | 49 |

## 2. Clean-archive proof

`git archive d584d76` extracted into an empty directory outside the repository, then `npm ci` and `npm run verify` (Node v24.14.0 locally; CI uses 22, which was not available here).

| Result | Value |
|---|---|
| `npm ci` | 1 package added (TypeScript), 0 vulnerabilities |
| Tests | **475**, **471 pass**, 0 fail, **4 skipped** |
| Types, source and link checks, packaging, demos | Pass |

The four skipped tests, by name:

1. `design registers preserve the delivered handoff records exactly` — skipped: `DECKWEFT_HANDOFF_DIR` is not set.
2. `Studio export compiles PowerPoint and PDF through the export order in the isolated browser` — skipped: `CHROMIUM_PATH` is not set.
3. `Studio export captures the elements PowerPoint delivers as images` — skipped: `CHROMIUM_PATH` is not set.
4. `Studio export refuses what the export order refuses, and stops when cancelled` — skipped: `CHROMIUM_PATH` is not set.

The numbers equal S10's recorded 475 / 471 / 4. Remote CI will skip the same four.

## 3. Browser gates

Environment: Chrome for Testing 151.0.7922.34 from the Playwright cache (`~/Library/Caches/ms-playwright/chromium-1234`, outside `/Applications`), Playwright 1.61.1, launched by the runners with temporary contexts. No installed browser and no personal profile was used. All runs were in the clean archive, so `dist/` output stayed out of the repository. Release gate run with `--engines none`: Firefox and WebKit were **not** rerun (the user asked for isolated Chromium).

| Step | Runner | Recorded | New run | Verdict |
|---|---|---|---|---|
| S6 | `scripts/release-gate.mjs` | 8 decks, 0 issues, 96 of 96 traces; explicit cases 10 of 11 (missing glyph undetected) | 8 decks, 0 issues, 96 of 96 traces; legacy 3 fixtures, 0 missing text; cases **11 of 11** | Same, except cases (finding F3, explained) |
| S6 | `tests/studio-export.test.mjs` (`CHROMIUM_PATH` set) | 4 of 4 | 4 of 4 | Same |
| S2 | `browser_evidence_scene.mjs` | 18 stage records, 20 captures | 20 captures, 20 stage lines | Captures same; stage-line count differs (F4) |
| S5 | `browser_motion_state.mjs` | 28 captures | 28 captures, ok | Same |
| S4 | `browser_chart_kinds.mjs` | 12 views, 132 captures + 10 sheets | 142 images, ok | Same |
| S3 | `browser_families.mjs` | 108 of 108 candidates, 324 responsive checks | 108 of 108, 324, 260 captures, ok after the F1 fix | Same (capture count was not recorded) |
| VIS-006 | `browser_compositions.mjs` | 18 decks / 108 candidates, 135 captures | 18 cases, 135 captures, ok after the F1 fix | Same |
| VIS-009 | `browser_interaction_visual_parity.mjs` | 216 comparisons | 216, ok on rerun | Same after F2 |
| S7 | `npm run export:targets` | 9 of 9 PowerPoint and scene; PDF 5 pass, 4 partial; 9 charts as L3 | 9 / 9; PDF 5 pass, 4 partial; 9 L3; 0 external | Same |
| S8 | `scripts/s8-themes.mjs` | 24 decks, 0 fit or render issues, 136 contrast pairs, 9 of 9 cases | 24 decks, 0 issues, build/quality/contrast/cases all true, 9 case lines pass | Same (the pair count is not printed by the runner; `contrast.json` says ok) |
| S8 | `npm run export:targets -- --s8` | 18 of 18; PDF 9 pass, 9 partial | 18 / 18; PDF 9 pass, 9 partial; 0 external | Same |
| S9a | `browser_author_controls.mjs` | 28 UI steps, 0 page errors, the one expected 409 | Rerun: ok, 1 expected error, 0 external | Same after F2 |
| S9a | `s9a-directions.mjs --exports` | 24 decks, 48 of 48 exports, 11 of 132 pages over 900 px at 1440 | 24 decks, 24 PowerPoint ok and 24 PDF ok, 0 issues, 11 pages over budget at 1440 | Same |
| S9b | `browser_blueprint_a.mjs` | 66 steps, 0 errors, 0 external | 66 steps, 0 errors, 0 external | Same |
| S9b | `browser_blueprint_studio.mjs` | 9 steps | 9 steps, 0 errors, 0 external | Same |
| S9b | `s9b-blueprint.mjs` | 12 decks, 0 issues, facts identical | 12 decks, 0 issues, facts identical, 0 errors | Same |
| S9b | `npm run export:targets -- --s9` | 12 of 12; Chinese PDF search partial | 12 / 12; PDF 6 pass, 6 partial; 0 L3 | Same |

I looked at no new captures by eye in S11; the visual reviews recorded in each step's evidence stand and were not repeated. The comparison is of numbers only.

## 4. Findings

Old evidence files were not edited.

| # | Finding | Cause | Action |
|---|---|---|---|
| F1 | `browser_families.mjs` and `browser_compositions.mjs` failed on the tip with a Playwright strict-mode violation: `.candidate-panel` matched two elements | S9a added `<details id="directionsPanel" class="candidate-panel directions-panel">` to the Studio. Three test selectors (`tests/studio-controls.mjs`, `tests/browser_families.mjs`, `tests/browser_compositions.mjs`) were written before it. S9a and later steps recorded these two runners as not rerun | Test-only fix: `.candidate-panel:not(.directions-panel)` in the three places (3 lines). No runtime code changed. Both runners then passed with the numbers above. The fix is in the S11 commits; the clean archive of `d584d76` still has the old selectors, so a pre-S11 tip fails these two runners |
| F2 | On the first pass, `browser_interaction_visual_parity.mjs` failed one comparison (`en-cream-collage-390-component-process`: 65 edge pixels differ, channel difference 10, budget 5 pixels) and `browser_author_controls.mjs` timed out on `#actionLevel` at 1024 px | Not reproduced. Both passed on an immediate rerun with the recorded numbers (216 comparisons; 1 expected error). Cause not found; treat as a timing- or load-sensitive flake, not as cleared. The parity tolerance (1e-5 of pixels) is tight enough that a single-run failure can recur | Recorded. If either fails again in the pull request's browser run, investigate then |
| F3 | The release gate now reports explicit cases 11 of 11; the S6 evidence says 10 of 11 | The missing-glyph case was detected from S8 on (the S8 re-run already recorded 11 of 11). The S6 file is a statement about S6 | None. Not a regression |
| F4 | `browser_evidence_scene.mjs` printed 20 stage lines; S2 recorded "18 stage records" | Not traced. The captures (20) and `ok` are the same, and S3 to S5 extended this script's assertions; no later file records a stage count | Recorded. Does not affect any pass or fail |
| F5 | `schemas/` differs from `main` in 5 files over the stack | S1 changed the contracts (S1 contracts; not re-examined in S11). S11 changed no schema | Recorded in the plan so the pull request description says so |

## 5. `main` and the backup tag

- `git fetch origin` ran. `origin/main` is still `058b939`, equal to local `main`. No merge of `main` into the S10 branch was needed, so the `sync_with_base_branch` tool was not used and steps 2 and 3 were not repeated for a moved base.
- `git merge-tree --write-tree main d584d76` merges without conflict.
- Local tag `backup/main-before-design-handoff` created at `058b939`. `git ls-remote --tags origin` printed nothing, so it is not on the remote. It was not pushed.
- `origin/claude/s6-start-1c14f9` is still `4814952`. Who pushed it is still not recorded; the user chose to keep it.

## 6. Merge plan re-check

Every branch tip and commit count in the plan's table matched the repository, except the S10 row, which now has a tip (`d584d76`, 49 commits, 2 over `a2d5371`). The size figure moved. At `d584d76` the stack changes **562 files** over `main` (367 under `docs/evidence/`, 195 elsewhere; 119,052 added and 1,801 deleted lines); at `a2d5371` it was 557 files (365 and 192; 116,408 added). The corrections are in the plan.

## 7. "Not pushed" and "start from this branch" sentences

Listed with `git grep`, not changed. They change after a real merge (plan step 10).

| File | Line | Sentence |
|---|---|---|
| `docs/en/handoff.md` | 1 | S10 … "it is not pushed. That branch holds S1–S10." |
| `docs/en/handoff.md` | 8 | "Nothing was merged or pushed" (S10 merge-plan bullet) |
| `docs/en/handoff.md` | 12 | S9b … "it is not pushed" |
| `docs/en/handoff.md` | 22 | S9a … "it is not pushed" |
| `docs/en/handoff.md` | 33 | S7 … "That branch starts from the S6 branch … It is not pushed." |
| `docs/en/handoff.md` | 49 | S6 … "is not pushed. Start from it, not from `main`: `main` has none of S1–S6." |
| `docs/zh-CN/handoff.md` | 1, 8, 12, 22, 33, 49 | The same six sentences in Chinese (尚未推送, 请从这个分支继续，而不是 `main`) |
| `docs/zh-CN/roadmap.md` | 14 | "只是计划，没有合并，也没有推送" |
| `ROADMAP.md` | 14 | "a plan only. Nothing is merged or pushed." |
| `docs/plans/design-handoff-alignment.md` | 475 | §13: "`main` is not changed and nothing is pushed." |
| `docs/plans/design-handoff-alignment.md` | 565, 574, 632, 690 | §17 to §19: "Nothing is pushed" / "stacked on" / "nothing pushed" |
| `docs/plans/design-handoff-merge-to-main.md` | 27, 57 | Remote-branch fact and step 10 itself |
| `docs/evidence/s9b-blueprint-a/review.md` | 3 | "Nothing is pushed." (evidence; leave) |
| `docs/evidence/s10-pattern-maintenance/review.md` | 3 | Same kind (evidence; leave) |

`README.md` contains none. Evidence files record what was true when written and should not change; the rest change only their status words.

## 8. Not run

PowerPoint, Keynote and Figma (installed, run only by the user); Firefox and WebKit (not rerun); Node 22 (CI's version; local Node is 24.14.0); remote CI; Claude sign-in (deferred); screen readers. LibreOffice and After Effects are not installed.

## Rebuild

```bash
git archive d584d76 | tar -x -C <empty dir> && cd <empty dir> && npm ci && npm run verify
CHROMIUM_PATH=<isolated Chrome for Testing 151> PLAYWRIGHT_MODULE=<playwright 1.61.1>/index.mjs node scripts/release-gate.mjs --engines none
```

The browser runners are the ones in the table; each takes the same two environment variables.
