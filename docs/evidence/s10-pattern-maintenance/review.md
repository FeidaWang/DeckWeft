# S10 — pattern library maintenance and the P3 boundary (DWD-310)

Date 2026-10-19. Branch `claude/pattern-library-maintenance-p3-28aa7c`, built on `a2d5371` (S1–S9b). State: **Implemented** (register fields, manuals, tests). DWD-310 stays `partial`. No runtime code, no schema and no task state changed. Nothing is pushed.

[Alignment §19](../../plans/design-handoff-alignment.md#19-s10-decisions-and-result--pattern-library-maintenance-and-the-p3-boundary-2026-10-19) · [Manual](../../design/pattern-register.md) · [简体中文](../../zh-CN/pattern-register.md) · [Merge plan](../../plans/design-handoff-merge-to-main.md) · [Browser sample](browser-sample.json)

## Tests run

| Run | Result |
|---|---|
| `node --test tests/design-registers.test.mjs` | 8 pass, 1 skipped (needs the delivered package) |
| `DECKWEFT_HANDOFF_DIR=…/DeckWeft_Design_Handoff node --test tests/design-registers.test.mjs` | 9 pass: original handoff fields byte-for-byte unchanged, both `import.sourceSha256` values match the delivered files |
| `npm run verify` | passes; 475 tests, 471 pass, 4 skipped (the same four environment- or browser-gated tests as S9b; S9b had 470 tests); types, source and link checks, packaging and demos |

New tests in `tests/design-registers.test.mjs` (5): maintenance fields present and typed or null; source maintenance fields and sample evidence; sampled pages registered both ways; lifecycle refusals on synthetic bad records (bad version, self-replacement, unregistered, deprecated replacement, `patternId` mismatch); EXP-001 deferrals and no budget number.

## What was looked at

- Three reference pages in the built-in browser pane (Chromium 152, 2026-10-19): `https://www.anthropic.com/`, `https://openai.com/zh-Hans-CN/`, `https://openai.com/zh-Hans-CN/signals/enterprise-data/`. At 1440 × 900 and 390 × 844: one screenshot per viewport plus page-script measurements, and one table sort. The facts are in [browser-sample.json](browser-sample.json).
- The two registers' diff by structure (original fields compared by the delivered-package test), not by eye.
- Both manuals were read through once for step order and links.

## What was not run

- Reduced-motion and static (no-JavaScript) states of any reference page: the pane cannot change the setting.
- The OAI-S20 table at 390 px was measured (800 px wide, clipped wrapper), not looked at.
- Every other page of the 1,390 OpenAI paths and every Anthropic page except the home page.
- PowerPoint, Keynote and Figma (installed, not run; the user runs them); LibreOffice and After Effects (not installed); Firefox and WebKit; screen readers, IME, 200 % zoom; remote CI for S7–S10; Claude sign-in (deferred).

## Files

| File | Content |
|---|---|
| `browser-sample.json` | The three-page sample: observations, matches against the handoff, what was not checked |
| `review.md` | This page |
