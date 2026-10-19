# One local presentation task

[简体中文](../zh-CN/task-loop.md) · [Evidence](../evidence/vis-011/review.md)

The [VIS-012 adapters](hosts.md) now connect opt-in host drafting, scoped patches and actual image feedback to these tools. Claude live acceptance remains deferred. Default tasks still select no host.

VIS-011 connects the existing semantic planner, local assets, DOM/SVG renderer, VIS-010 quality checks and exports. It runs locally without runtime dependencies, model selection, API calls or image requests. It does not certify a Codex/Claude desktop adapter (VIS-012) or implement the later workbench (VIS-013).

1. Save a JSON brief containing `request`, optional `locale` (`en` or `zh-CN`), and optionally an existing `project`. A supplied natural-language outline uses `---` between pages. Without a project, the deterministic planner preserves supplied wording and assigns opening/context/closing roles; a host must author richer content using its existing authorized model. A short single-page input becomes three views of the same supplied text, not researched new claims.
2. Run `npm run deck:create -- --brief brief.json --out dist/my-task`. Use a new folder. For existing local image assets, add `--home /absolute/asset-home`.
3. Open `dist/my-task/preview.html`. Expect editable-source HTML and `task.json` with the story arc, scene roles, focal identities, three family candidates, selected composition/color mode, required assets and only relevant theme rules. The preview is provisional until reviewed.
4. Continue with `npm run deck:task -- --task dist/my-task/task.json --tool TOOL --args args.json`. Every args file includes the current integer `expectedSequence` from the checkpoint. The CLI locks the checkpoint and writes after every step; stale sequences retain diagnostics rather than overwrite a revision.
5. Supply a real browser capture capability to `runVisualTask` from `src/agent/tools.mjs`, or submit honest host measurements to `render.inspect`. The optional QA command `npm run deck:verify` demonstrates actual isolated-browser capture. It needs `CHROMIUM_PATH` outside `/Applications` and `PLAYWRIGHT_MODULE` pointing to an existing QA Playwright installation. The runtime adds no browser dependency.
6. Actually inspect all receipt-required images. Submit `render.inspect` with `review: {receiptId, reviewer, delivery, images, judgment, verdict, issues}`. Each visual issue has stable `sceneId`, `nodeId`, bounds, severity, reason and suggestion. Image judgments are explicit attestations; DOM checks do not imply visual review. Add `attestation: "author"` when a person looked; without it the review is recorded as `unattested`. Host attestations cannot be submitted here (see [hosts](hosts.md)). Host-reported captures remain labelled as such.
7. Call `artifact.export` with `format: "html"`. Expect a numbered standalone HTML artifact only after a current passing receipt. `format: "project"` and `"checkpoint"` always provide recovery JSON. Keep the original checkpoint and assets. Native v3 PowerPoint/Figma/AE exports remain future gates.

Shared tools:

| Tool | Result |
| --- | --- |
| `content.inspect` | Exact supplied claims, datasets and references, plus missing-evidence diagnostics. No external factual verification is claimed. |
| `design.propose` | Task-specific design brief before compilation; no loading of all design manuals. |
| `assets.resolve` | Actual local original/derivative resources; missing bytes block rather than trigger remote generation. |
| `render.preview` | Source-preserving HTML and current source/renderer fingerprints. |
| `render.inspect` | Real observation checks, image-bound receipt, optional bounded composition repair and explicit actual-image review. |
| `design.patch` | One scoped composition change or exact-data chart addition. All existing words, colors, data and citations remain. |
| `artifact.export` | Reviewed HTML or recoverable source/task JSON. |

For “make slide 4 a chart; keep wording and colors”, call `design.patch` with `request` and, when the page does not already bind a chart, an explicit original `datasetId`. The local grammar supports English page/slide/scene numbers and Chinese `第 4 页`; other requests need structured patches. It never converts prose, formatted metric strings or unrelated data into invented numbers. Citation blocks are added on that page using the original dataset sources. Original blocks retain identity; other scenes are byte-identical. Then inspect content, preview, recapture and review the revision.

`runVisualTask(task, {home, capture, review, checkpoint})` executes ordinary stages within the same scope and persists each transition through the supplied checkpoint callback. Missing capabilities return `browser-capture` or `actual-image-review`; supply those capabilities and resume using the checkpoint. No internal step asks for repeated authorization. Automatic correction shares one cumulative default budget: **2 rounds, 6 candidates, 2 accepted scene changes, 60 seconds**. Machine and actual-image diagnostics can propose composition changes only in authorized affected scenes. Author locks apply before candidate rendering; source content, datasets, citations, assets, colors and unrelated scenes cannot be rewritten to pass quality.

Recovery states include `data-required`, `blocked`, `revision-conflict`, `stale-receipt`, `quality-failed` and `repair-exhausted`. Keep `original`, `history`, `repair.candidate`, diagnostics and `lastValid`. Fix missing original files, reload after a conflict, or make a new explicitly scoped task when more rounds are needed. Do not reset budget fields in an existing checkpoint. Changing source, layout, audience-state observation, captured-image identity or renderer/contracts/themes invalidates the receipt. Failed reruns retain the last exported valid source and HTML; previews never replace it.

The opt-in agent bridge accepts `workflow: "visual"` with the selected project and optional `sceneIds`/`budget`. Its existing consent, host identity, model ceiling, lease, expiry and cancellation apply. MCP `deckweft_visual_tool` carries `{id, lease, tool, arguments}` to the same dispatcher. It cannot create grants, use repository commands, expand tools, switch hosts/models or complete a visual task through the old draft submission route. An exported result enters `needs-review`; the returned artifact is the local result. Real browser orchestration, unit mock capabilities and authenticated host runs are separate evidence categories.
