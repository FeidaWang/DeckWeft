# Changelog

## Model comparison demo — 2026-10-23

Added `npm run comparison:render`: a six-page English and Simplified Chinese deck that sets GPT-6 Astra beside Claude Opus 5.5 using only figures from the two launch pages (read 2026-10-23), all marked vendor-reported. It uses existing themes, compositions and the grouped-bar chart; no renderer, player, schema or theme change. Sources: `examples/model-comparison.{en,zh-CN}.json`, `scripts/render-comparison.mjs`, `tests/model-comparison.test.mjs`.

## DW-020 follow-up — 2026-10-17

Verified an authenticated Codex CLI standalone project-skill task on macOS with trace review, independent HTML/PPTX export comparisons, native-text package inspection and all three slides rendered and visually inspected in LibreOffice. Claude Code validation passes; its authentication is unavailable and sign-in was deferred by the user. Codex native desktop activation and remote CI remain untested, so DW-020 stays blocked overall.

The runner now discovers skills without a fallback source path, selects Claude's advertised normal permission mode, checks installation results and bundle integrity, rejects invalid or mismatched exports and nonempty evidence folders, and accepts bounded task timeouts. Original alpha.2 evidence is preserved separately.

## 0.1.0-alpha.2 — 2026-10-16

Added a real host acceptance runner with bounded probes, isolated bundle checks, opt-in authenticated tasks and redacted evidence. DW-020 remains blocked in the build environment; no host was impersonated.

Added actual browser Canvas text measurement, lossless grapheme ranges, controlled local font probes, validated server replay and content-bound measured exports. CLI remains explicitly estimated. Reserved real label height in metric cards after a CJK example regression.

Added read-only paginated history and hash-pinned, idempotent restore-as-copy. Fixed IME shortcut interference, stale previews, in-flight save/edit races, invalid-draft backup, modal focus confinement, hidden-trigger focus return and rapidly reopened confirmation dialogs. No automatic history pruning or crash-draft recovery was added.

Expanded Node, browser/API and real-font regressions; updated English-first ELI5 manuals, task states and evidence. Project schema stays at 1; reinstall the bundled runtime when upgrading. Actual desktop hosts, direct-browser CSP, real OS IME, screen readers and other design applications remain acceptance gates.

## 0.1.0-alpha.1 — 2026-10-16

First DeckWeft alpha. New project identity, English-first ELI5 documentation, separate Simplified Chinese guides, a closed project schema, explicit legacy migration, four ranked layouts, a responsive local studio, revision-aware storage, native editable text/shape PPTX export, offline HTML/SVG, and self-contained agent packaging.

Includes experimental Figma and AE handoff formats and importer sources. Real authenticated agent loading and actual Figma/AE execution are not claimed. No cloud service, automatic research, provider API, generated media, collaboration, or billing is implemented.

The predecessor's names, releases, and validation claims are not replayed as DeckWeft history. See NOTICE.md for attribution and docs/en/verification.md for this build's evidence.
