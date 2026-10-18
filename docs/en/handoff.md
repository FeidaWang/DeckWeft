# Continue from alpha.2, not the old plan

[中文](../zh-CN/handoff.md) · [Roadmap](../../ROADMAP.md)

Current follow-up: MB-11–15 local source is implemented. Read [media/workers](media-workers.md) and [evidence](../evidence/mb-11-15/review.md). MB-12 remains partial for Dot desktop; MB-14 needs assigned-plugin real Figma import; MB-15 needs actual AE execution/rendering. MB-08 and older accessibility/projection gates remain open. Claude sign-in stays deferred. This source directory has no Git metadata; preserve installed browsers and use isolated test-browser profiles.

```text
Continue DeckWeft 0.1.0-alpha.2 from actual files. Read AGENTS.md, README.md,
roadmap.json, docs/en/alpha-2.md and docs/en/verification.md. Run npm run verify.
DW-020: Codex CLI 0.160.0 authenticated project-skill task and three-slide LibreOffice
review passed on this Mac. Read docs/evidence/dw-020/review.json. Claude 2.1.288
validator passes but sign-in was explicitly deferred by the user; do not retry it
without a new request. Native Codex desktop activation and remote CI remain untested.
Run host-check again only for an authorized outstanding route in a fresh output folder. Do not count a valid bundle,
standalone Codex skill or passing subprocess as desktop native-plugin acceptance.
DW-130 browser measurement and DW-110 history restore-as-copy already exist.
Do not rebuild them. Finish DW-120 real input method, zoom, screen reader and
browser-direct checks; then DW-140 PowerPoint/Keynote font fidelity. Preserve
CLI offline-estimate labeling and editable native output. Run both browser scripts
with --mode direct; fixture mode does not certify browser CSP.
Keep English primary and update matching Simplified Chinese docs. Do not change
permissions, publish, add cloud billing or redistribute fonts. Each claim needs
actual logs, test evidence and explicit remaining limitations.
```

Generated `dist/` is not the source of truth. Rebuild after source edits. Snapshot retention and archive management remain separate work; never delete history to make a test pass.
