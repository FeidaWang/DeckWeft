# Plan: merging the S1–S10 stack into `main`

Written 2026-10-19 in step S10. **This is a plan only.** Nothing here has been run: no merge, no push, no tag, no branch deletion. Each action below needs the user's direct instruction, as AGENTS.md requires for anything that publishes.

## Where things stand

`main` and `origin/main` are both `058b939`. The S1–S9b work is a stack of local branches, each holding everything below it. The S10 branch adds one more commit range on top of S9b.

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
| S10 maintenance | `claude/pattern-library-maintenance-p3-28aa7c` | the S10 commits on top of `a2d5371` | 47 + S10 |

Facts that shape the plan:

- `main` has not moved since the stack started. `git merge-base main a2d5371` is `058b939`, so a fast-forward is possible and no content conflict is expected today.
- At `a2d5371` the stack changes 557 files over `main` (about 116,000 added lines; 365 files are under `docs/evidence/`, 192 are elsewhere). The S10 commits add a few more. Review by step, not as one diff.
- `origin/claude/s6-start-1c14f9` **exists on the remote** at `4814952`, although the handoff text says the stack is not pushed. Who pushed it and when is not recorded in the repository. Every other branch above is local only.
- CI (`.github/workflows/ci.yml`) runs `npm ci` and `npm run verify` on Ubuntu, macOS and Windows with Node 22 for every push. None of S7–S10 has had a remote run. `npm run verify` here skips 4 environment- or browser-gated tests, so remote CI also skips them.
- Embedded runtime bytes are pinned: the renderer is `visual-art-direction.12` and the player `semantic-player.6`, each bump with its own baseline re-record commit. A merge must not reorder or squash those commits away from their baselines.

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

1. **Freeze.** Pick the final tip commit (the S10 tip). Record its hash. `git status` must be clean.
2. **Local proof.** From a clean archive of that commit (`git archive <tip> | tar -x -C <empty dir>`), run `npm ci` and `npm run verify`. Expected: all pass; 4 gated tests skipped. A pass from a clean archive rules out untracked files.
3. **Browser gates.** With an isolated Chromium (outside `/Applications`, temporary profile) run the recorded release-gate and browser runners named in [verification](../en/verification.md) for S6 to S9b. Expected: the numbers in each evidence file reproduce, or the difference is explained in a new evidence file.
4. **Check `main` again.** `git fetch` and compare `origin/main` with `058b939`. If it moved, merge `main` into the S10 branch first (not the other way round), resolve conflicts, and repeat steps 2 and 3.
5. **Backup point.** Create a local tag `backup/main-before-design-handoff` at `058b939`. It stays local unless the user asks to push it.
6. **Push the branch** (needs the user's instruction). Push the S10 tip to a new remote branch. Do not push over `claude/s6-start-1c14f9`: it holds S6 only and is already on the remote.
7. **Remote CI.** Wait for all three operating systems. The Windows job is the one most likely to differ (atomic file replacement retries, path handling). Expected: green on all three. A red job is a stop: fix on the branch, never on `main`.
8. **Open the pull request** (needs the user's instruction). Describe each step range with its evidence file and the 4 skipped tests. State plainly what was not run: PowerPoint, Keynote, Figma, Firefox, WebKit, Claude sign-in, screen readers.
9. **Merge** (needs the user's instruction) with a merge commit. Do not enable auto-merge.
10. **After the merge.** Run `npm run verify` on `main` and read the remote CI result for the merge commit. Then update the text that says "not pushed" and "start from this branch, not `main`": [handoff](../en/handoff.md) and its zh-CN page, the alignment status lines and each step's "stacked on" sentence. Keep the history of what each step decided; change only the status words.

## Rollback

- Before the merge is pushed: delete the local merge commit with `git reset --hard 058b939` on `main` (the backup tag points there). This is local only.
- After it is pushed: `git revert -m 1 <merge commit>` on `main`, in its own pull request. The step branches and the evidence stay intact, so the work can return after a fix.
- Never force-push `main`.

## Clean-up after a successful merge

These branches would all be ancestors of `main`: the ten step branches in the table plus `claude/brave-bhaskara-fd57a7`, `claude/deckweft-design-handoff-analysis-1ab6ce` and `claude/deckweft-design-handoff-analysis-a6ff8c`, which sit at `058b939`. Delete them only when the user asks, and only after `git branch --merged main` lists them. The remote `claude/s6-start-1c14f9` goes the same way.

## Decisions for the user

1. Merge commit (recommended), fast-forward, or stacked pull requests.
2. Whether to publish the stack before the user has opened the PowerPoint and Keynote exports. Nothing in the stack depends on those runs, but the handoff lists them as the user's checks.
3. Whether the remote `claude/s6-start-1c14f9` should be kept, deleted, or replaced by the new branch.
