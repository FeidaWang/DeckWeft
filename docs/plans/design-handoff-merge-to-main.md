# Plan: merging the S1–S10 stack into `main`

Written 2026-10-19 in step S10; steps 1 to 5 were prepared locally in S11 (see [Readiness](#readiness-s11-2026-10-19)). **Status: executed on 2026-10-19 at the user's instructions** (see [After the merge](#after-the-merge-2026-10-19)). The text below keeps the plan as written; the sentences about what had not yet happened describe the time of writing. No release was tagged.

## Where things stand

`main` and `origin/main` are both `058b939`. The S1–S10 work is a stack of local branches, each holding everything below it. The S10 branch adds two commits on top of S9b. The S11 branch adds the readiness evidence on top of S10; it is the branch to push.

| Step | Branch | Tip | Commits over `main` |
|---|---|---|---|
| S1 contracts | `claude/design-handoff-v3-contracts-21024a` | `7810149` | 1 |
| S2 vertical sample | `claude/evidence-scene-pipeline-s2-a5fbff` | `232060e` | 2 |
| S3 compositions | `claude/composition-families-s3-6e2a5a` | `4155ec1` | 4 |
| S4 charts | `claude/chart-renderer-s1-s2-442075` | `9b92edf` | 4 (own history; merged into S6) |
| S5 motion state | `claude/motion-state-first-alignment-2b73bc` | `99dba5c` | 5 (own history; merged into S6) |
| S6 gate | `claude/s6-start-1c14f9` | `4814952` | 18 (merges S3, S4 and S5) |
| S7 output levels | `claude/nice-archimedes-d8a127` | `a8c0404` | 22 |
| S8 themes | `claude/design-handoff-alignment-19703c` | `4f26b33` | 36 |
| S9a author controls | `claude/design-handoff-alignment-review-978a91` | `e80ecd7` | 41 |
| S9b blueprint A | `claude/agitated-torvalds-969a1e` | `a2d5371` | 47 |
| S10 maintenance | `claude/pattern-library-maintenance-p3-28aa7c` | `d584d76` | 49 (2 over `a2d5371`) |
| S11 readiness | `claude/s11-merge-readiness-61283b` | `d584d76` plus the S11 commits (documentation and three test selectors) | 49 + S11 |

Facts that shape the plan:

- `main` has not moved since the stack started. `git merge-base main d584d76` is `058b939`, so a fast-forward is possible and `git merge-tree --write-tree main d584d76` merges without conflict (checked 2026-10-19).
- At `d584d76` the stack changes **562 files** over `main` (119,052 added and 1,801 deleted lines; 367 files are under `docs/evidence/`, 195 are elsewhere). At `a2d5371` it was 557 files. Five of the 562 are under `schemas/` (`design-plan`, `design-profile`, `presentation-v3`, `theme-pack`, `web-scene`, changed by S1 and later steps); state that in the pull request. Review by step, not as one diff.
- `origin/claude/s6-start-1c14f9` **exists on the remote** at `4814952` (rechecked by `git fetch` on 2026-10-19), although the handoff text then said the stack was not pushed. That remote branch has since been deleted. Who pushed it and when is not recorded in the repository. Every other branch above is local only.
- CI (`.github/workflows/ci.yml`) runs `npm ci` and `npm run verify` on Ubuntu, macOS and Windows with Node 22 for every push. None of S6–S10 has had a remote run on the current content. `npm run verify` here skips 4 environment- or browser-gated tests, so remote CI also skips them.
- Embedded runtime bytes are pinned: the renderer is `visual-art-direction.12` and the player `semantic-player.6` (unchanged by S10 and S11), each bump with its own baseline re-record commit. A merge must not reorder or squash those commits away from their baselines.

## Recommendation

Merge the S10 tip into `main` as **one merge commit** after a pull request that is reviewed in step ranges. Keep the commits (no squash): the baseline re-record commits and the evidence commits are the audit trail the AGENTS.md rules ask for.

Why not the alternatives:

| Option | Result | Verdict |
|---|---|---|
| Fast-forward `main` to the tip | Linear history, no merge commit | Acceptable if `main` has not moved; loses the single revert point |
| Merge commit (`--no-ff`) of the tip | One revert point, full history | **Recommended** |
| Squash | One commit with 116,000 lines | No: hides the baseline commits and cannot be bisected |
| Ten stacked PRs, one per step | Smallest reviews | Most accurate review, but each step needs its own CI run and every later PR changes when an earlier one is amended. Use it only if the reviewer asks |

## Steps

Every step stays unexecuted until the user says so. The pushing steps need a separate instruction.

1. **Freeze.** Pick the final tip commit. Record its hash. `git status` must be clean. *S11: `d584d76` was frozen and proved; the S11 branch tip is the one to push, because it adds the evidence and the three test-selector fixes.*
2. **Local proof.** From a clean archive of that commit (`git archive <tip> | tar -x -C <empty dir>`), run `npm ci` and `npm run verify`. Expected: all pass; 4 gated tests skipped. A pass from a clean archive rules out untracked files.
3. **Browser gates.** With an isolated Chromium (outside `/Applications`, temporary profile) run the recorded release-gate and browser runners named in [verification](../en/verification.md) for S6 to S9b. Expected: the numbers in each evidence file reproduce, or the difference is explained in a new evidence file.
4. **Check `main` again** (once more just before the push; S11 found it unmoved). `git fetch` and compare `origin/main` with `058b939`. If it moved, merge `main` into the S10 branch first (not the other way round), resolve conflicts, and repeat steps 2 and 3.
5. **Backup point.** Create a local tag `backup/main-before-design-handoff` at `058b939`. It stays local unless the user asks to push it. *S11: created, not pushed.*
6. **Push the branch** (needs the user's instruction, and only after the user has opened the PowerPoint and Keynote exports: the user's answer in S11. The result goes in a new evidence file; `ExportVerified` is claimed only from it). Push the S11 branch tip to a new remote branch. Do not push over `claude/s6-start-1c14f9`: it holds S6 only and is already on the remote.
7. **Remote CI.** Wait for all three operating systems. The Windows job is the one most likely to differ (atomic file replacement retries, path handling). Expected: green on all three. A red job is a stop: fix on the branch, never on `main`.
8. **Open the pull request** (needs the user's instruction). Describe each step range with its evidence file and the 4 skipped tests. State plainly what was not run: PowerPoint, Keynote, Figma, Firefox, WebKit, Claude sign-in, screen readers.
9. **Merge** (needs the user's instruction) with a merge commit. Do not enable auto-merge.
10. **After the merge.** Run `npm run verify` on `main` and read the remote CI result for the merge commit. Then update the text that says "not pushed" and "start from this branch, not `main`": [handoff](../en/handoff.md) and its zh-CN page, the alignment status lines and each step's "stacked on" sentence. Keep the history of what each step decided; change only the status words.

## Rollback

- Before the merge is pushed: delete the local merge commit with `git reset --hard 058b939` on `main` (the backup tag points there). This is local only.
- After it is pushed: `git revert -m 1 <merge commit>` on `main`, in its own pull request. The step branches and the evidence stay intact, so the work can return after a fix.
- Never force-push `main`.

## Clean-up after a successful merge

These branches would all be ancestors of `main`: the eleven step branches in the table (S4 and S5 included) plus `claude/brave-bhaskara-fd57a7`, `claude/deckweft-design-handoff-analysis-1ab6ce` and `claude/deckweft-design-handoff-analysis-a6ff8c`, which sit at `058b939`. Delete them only when the user asks, and only after `git branch --merged main` lists them. The remote `claude/s6-start-1c14f9` goes the same way.

## Readiness (S11, 2026-10-19)

Steps 1 to 5 were prepared locally on `claude/s11-merge-readiness-61283b`. The evidence is in [s11-merge-readiness/review.md](../evidence/s11-merge-readiness/review.md). State: **LocalVerified**. Nothing is **HostVerified** or **ExportVerified**.

| Step | Result |
|---|---|
| 1 Freeze | Passed. `d584d76`, clean tree; the S11 worktree was fast-forwarded to it before any edit |
| 2 Clean archive | Passed. `git archive d584d76`, `npm ci`, `npm run verify` outside the repository: 475 tests, 471 pass, 4 skipped (the three `CHROMIUM_PATH` Studio export tests and the `DECKWEFT_HANDOFF_DIR` register test). Node 24.14.0; Node 22 was not available locally |
| 3 Browser gates | Passed, with two findings. In isolated Chrome for Testing 151 with Playwright 1.61.1, all 18 runners reproduce the recorded numbers (two only after a rerun or a test fix, below). `browser_families` and `browser_compositions` failed on the tip because S9a's `directionsPanel` made `.candidate-panel` ambiguous in three test selectors; fixed in tests only (F1). `browser_interaction_visual_parity` and `browser_author_controls` each failed once on the first pass and passed on rerun, cause not found (F2). Release-gate cases are 11 of 11 against S6's recorded 10 of 11, which S8 had already explained (F3). Firefox and WebKit were not rerun |
| 4 `origin/main` | Fetched. Unmoved at `058b939`; no merge of `main` was needed; `git merge-tree` shows no conflict |
| 5 Backup tag | `backup/main-before-design-handoff` at `058b939`, local only |

What did not pass or was not run: F2 is open; PowerPoint, Keynote and Figma exports (the user's step, now a precondition of the push); remote CI on three operating systems; Node 22; Firefox and WebKit; Claude sign-in.

User answers recorded in S11: leaning toward a merge commit (recorded, not executed); rerun all browser gates (done); keep the remote `claude/s6-start-1c14f9` (recorded only); wait for the PowerPoint and Keynote exports before any push (a pre-push step above).

## Decisions for the user

Answered in S11 (2026-10-19); the plan records them and executes none:

1. Merge commit (the leaning), over fast-forward or stacked pull requests.
2. Wait for the user's PowerPoint and Keynote exports before the push (a precondition of step 6).
3. Keep the remote `claude/s6-start-1c14f9`. The push in step 6 goes to a new branch name; the old one stays until the user decides otherwise.

## After the merge (2026-10-19)

| Plan step | What happened |
|---|---|
| 6 Push | The S11 branch was pushed to a new remote name (`claude/s11-merge-readiness-61283b`, first `844973a`). The user's rule to wait for the PowerPoint and Keynote exports was replaced by the user's later instruction to push; the exports have still not been opened |
| 7 Remote CI | First run: Windows failed (`EPERM` in the atomic-write concurrency test). Fixed by `0ade8dc`; the rerun was green on Ubuntu, macOS and Windows, and so was the run on `main` after the merge |
| 8 Pull request | Pull request #2 (S11 branch into `main`); #1 (S6 branch) also shows as merged |
| 9 Merge | Merge commit `20457eb`, made by the user in GitHub. No squash, no auto-merge |
| 10 Status text | Updated in the follow-up pull request: handoff (en and zh-CN), both roadmaps, both verification pages and the alignment plan. Evidence files were left as written |
| Clean-up | The remote `claude/s6-start-1c14f9` and the S11 remote branch were deleted; eleven local step branches and worktrees were removed by the user. Four local branches remain and were not touched. The backup tag is local only |
