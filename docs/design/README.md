# Design registers

These files are imported copies of the 2026-10-18 design handoff registers. Each record has added repository status fields and, since S10, maintenance fields. How to add, re-check and retire a pattern: [pattern-register.md](pattern-register.md) ([简体中文](../zh-CN/pattern-register.md)). They are design evidence, not runtime contracts. The [alignment](../plans/design-handoff-alignment.md) explains every field and table.

| File | Contents |
|---|---|
| [pattern-register.json](pattern-register.json) | F01–F12 compositions, M01–M20 motion/interaction, C01–C24 charts |
| [source-register.json](source-register.json) | 62 content sources, 1 supplement, 19 technical sources |

## Rules

- Do not edit the handoff's original fields. `import.sourceSha256` identifies the delivered file.
- `evidence` keeps the original V/S/D/P marks; `evidenceMarks` only indexes them.
- `referenceVerified` is `true` only with a V mark.
- `repositoryState` uses Proposed / Implemented / LocalVerified / HostVerified / ExportVerified. Any *Verified state must cite a `docs/` evidence file in `verifiedBy`.
- Content sources keep `verifiedBy` empty until someone re-opens and records the page. A spot check goes in `browserSample` with an evidence file; it does not change `referenceVerified`.
- `checkedAt` is the date of the repository status check. The date a reference page was read is `sourceCheckedAt`.
- `deprecatedBy` is `null` or the id of a registered, live, different pattern.

## Check

```bash
node --test tests/design-registers.test.mjs
```

Expected: eight tests pass. A ninth test, which compares against the delivered package, is skipped.

To compare against the delivered package:

```bash
DECKWEFT_HANDOFF_DIR=/path/to/DeckWeft_Design_Handoff node --test tests/design-registers.test.mjs
```

Expected: nine tests pass.

If a test fails, the message names the record and the rule it broke. Fix the status fields. Never change the original evidence to make the test pass.
