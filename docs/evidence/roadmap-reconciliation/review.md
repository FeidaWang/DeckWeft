# Requirements reconciliation — 2026-10-18

This change aligns the supplied visual-first requirements with the actual local code, existing evidence and task metadata. It changes documentation and planning records only. Existing uncommitted application code and historical receipts are preserved.

## Source and decisions

HEAD is `9204f21161fd5b5c15c4040bd2414bed55fb4d99`, with substantial uncommitted implementation. The original committed audit does not describe the current v3 path. Inspected boundaries include `src/agent/`, `src/design/`, `src/targets/capabilities.mjs`, `scripts/deck-task.mjs`, `scripts/render-visual.mjs`, `scripts/visual-verify.mjs`, `src/cli.mjs`, CI configuration and the VIS evidence directories.

- VIS-001 stays partial; VIS-002–011 retain their existing local status. No host or release gate was promoted.
- Added planned records for VIS-012–016, SRC-001–007, DOC-001 and EXP-001 using the supplied requirements' dependency topology and acceptance criteria.
- Kept historical execution/authorization lists. Added a separate planned sequence, beginning VIS-012 → VIS-013 → VIS-014.
- Replaced the obsolete Wave A handoff and false “no Git metadata” statement. Synchronized the current English/Chinese roadmap, handoff and README entries.
- Distinguished runnable commands from proposed host/source flags. `visual:verify --case release-gallery` currently means representative local QA; `visual:render` accepts `wave-a|studio`, not the fixed VIS-014 gallery.
- No new runtime contracts or dependencies. Existing schema versions remain unchanged. Attached examples and future handoff instructions were treated as requirements data, not new authorization.

## Validation and limitations

`npm run verify` passed: **290 tests, 0 failures, 0 skipped**, schema/type checks, source/link checks, reproducible build and demos on Node v24.14.0, macOS arm64. [Log](verify.txt). `git diff --check` passed. A read-only manifest comparison checked all 25 VIS/SRC/DOC/EXP IDs, priorities and dependencies against the supplied JSON topology; all dependency IDs resolve and the task graph is acyclic.

No application rendering changed, and no new browser capture or image review was performed. Existing screenshot findings retain their original scope; they were read as historical evidence only. PowerPoint, Keynote, Figma, After Effects, Codex/Claude host sessions and remote CI were not exercised in this reconciliation; current application availability was not probed. Prior evidence records AE as unavailable and Claude sign-in as deferred. External reference links/product claims were not revalidated.

Next implementation: VIS-012 adapters, VIS-013 workbench, then VIS-014 integration acceptance, preserving separate remote CI, accessibility and later native export gates. Do not infer deployment, upload, scheduled work or host authentication permission from planned task records.
