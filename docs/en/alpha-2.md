# Alpha.2: measured type and recoverable editing

[中文](../zh-CN/alpha-2.md) · [Manual](manual.md) · [Verification](verification.md)

**Version: 0.1.0-alpha.2.** Project schema remains 1, so existing alpha.1 decks can open without a migration. Stop the old local server before starting the new one, and back up the library. Installed skills/plugins contain their own runtime; rebuild and update the chosen installation route. The installer refuses unknown ownership and supports dry-run. Do not delete the library to upgrade.

| Requested order | Delivered | Remaining |
| --- | --- | --- |
| DW-020 | Real command probe runner, isolated bundle/hash checks, opt-in live task and redacted evidence | Blocked: executables/authentication unavailable; native desktop/remote CI not certified |
| DW-130 | Whole-string Canvas metrics, local font probes, grapheme-safe lossless ranges, validated replay, content-bound tickets | CLI remains estimated; other renderer/font substitutions require inspection |
| DW-120 | IME guards, bounded undo grouping, correct native dialog keyboard/focus, queued-close fix, in-flight save/edit guards, stale preview and invalid-draft backup | Real OS IME, 200% browser zoom, screen reader, direct browser/CSP and other engines |
| DW-110 subset | Read-only paged history, measured preview, hash-pinned/idempotent restore-as-copy, safe explicit project switching | Retention/prune preview and project archive management |

No framework, database, paid model provider or cloud dependency was added. No font binaries are redistributed. This release does not write a live Figma file or run After Effects.

## Key files

`src/qa/hosts.mjs`; `src/layout/text.mjs`; `public/text-measurer.js`; `src/services/measurements.mjs`; `public/interaction.js`; `public/history.js`; `src/services/store.mjs`; `src/services/server.mjs`; `tests/browser_acceptance.py`; `tests/browser_fonts.py`.

The source and generated native bundle use the same version. Re-running host checks with an existing evidence report is refused before starting a new task. Exact evidence and reproduction commands are in the verification report; no badge claims a remote run.
