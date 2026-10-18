# Local coding-host adapters

[简体中文](../zh-CN/hosts.md) · [Task tools](task-loop.md) · [VIS-012 evidence](../evidence/vis-012/review.md)

VIS-012 adds thin Codex and Claude Code CLI adapters around the existing seven task tools. It does not install a host, sign in, choose a provider or implement the VIS-013 workbench. Without a selected host, tasks remain deterministic and local. A live host call uses its existing configuration and may consume its allowance. Authentication availability does not establish a subscription, price or billing route.

## Inspect capabilities

1. Use Node.js 22+ in the source checkout.
2. Run `npm run doctor -- --host codex --json` or `npm run doctor -- --host claude-code --json`.
3. Expect CLI version/help evidence, advertised structured output/image input, local renderer boundaries and unknown authentication/billing/image-backend fields. This command does not call a model or log in.
4. Only when checking an authorized existing route, add `--probe-auth`. It runs the host's status command and discards account-bearing output. It never invokes a login command. Keep Claude authentication deferred when requested.

The capability receipt binds the host, workspace and configuration metadata fingerprint. A run rejects a different workspace, changed configuration or a receipt older than five minutes. Probe once at task start and reuse it while current. Config contents and secret values are never copied into receipts; unobserved settings remain unknown.

## Draft a local preview

1. Review `examples/host-brief.en.json` or the Chinese edition. `request` contains the instruction, `locale` sets output language, and optional `sourceText` supplies exact material. Each nonempty source line must survive verbatim; a multi-page request using `---` also receives this protection. Translation/rewording of protected source text requires a separately authored replacement source. Unstructured instructions without source text remain unverified host-authored content.
2. Run `npm run deck:create -- --brief examples/host-brief.en.json --out dist/host-task-NEW --host codex --live` using a new folder. Use `claude-code` only when that route is authorized and available. `--live` prevents an accidental model invocation from mere host selection.
3. Expect `task.json`, `preview.html` and `.deckweft-host-runs/<id>/receipt.json`. Open the preview and check supplied content. This is not a reviewed final artifact. A host cannot replace an existing project through drafting; use a scoped revision.
4. For installed bundles, run `node /absolute/plugin/runtime/bin/deckweft.mjs visual-task ...` with the same arguments. The installed runtime needs neither this checkout's scripts nor a compiler/package download.

`--model` passes the exact requested model to that host; omitting it retains the host default. The adapter never retries through another host, model or API. Codex's actual model is unknown when its event stream does not report it. Claude's result model, where available, is labelled host-reported, not independently verified. No dollar cost or subscription entitlement is inferred.

## Revise and inspect

1. Read the current `sequence` in the checkpoint. Keep the task's authorized `scope` and tool grant; a host cannot widen them or unlock content.
2. Run `npm run deck:task -- --task dist/host-task-NEW/task.json --host codex --live --tool design.patch --request 'Make page 4 centered using statement-center; keep words and colors.' --expected-sequence N`. Replace `N` with the current integer. Supported changes are composition selection and binding an existing exact dataset to a chart. Richer semantic editing remains later scope.
3. Re-run the normal content/design/assets/preview tools, then supply real browser capture to `render.inspect` as described in the task manual. The CLI does not invent a browser capability.
4. With a current machine-passing receipt and the screenshot files inside the task folder, run `npm run deck:task -- --task dist/host-task-NEW/task.json --host codex --live --tool render.inspect --expected-sequence N`.
5. Expect an actual image attachment per required screenshot, hash-matching per-image findings and scene/block-specific issues. PNG/JPEG files must stay within the task workspace, without symlinks; at most 20 images, 8 MB each and 24 MB total. A hash or an advertised image flag does not establish visual acceptance.
6. Use `artifact.export` through the shared tools for final HTML only after a current passing machine and image-review receipt. Project/checkpoint recovery remains available in failed states. V3 native exports remain unsupported.

Programmatic integration uses `draftWithHost`, `patchWithHost`, `reviewWithHost` and `runHostVisualTask` from `src/hosts/tasks.mjs`. The complete-loop wrapper receives an explicit local `capture` callback and checkpoint callback, and reuses one capability receipt. Repairs still use the cumulative VIS-011 budget and source/lock checks. Missing or failed host review leaves a checkpoint rather than granting export approval.

## Evidence and recovery

Codex uses a schema-constrained final-message file; its JSONL events are parsed separately and must contain a completed turn. Claude uses ordinary `--print --output-format json --json-schema`; only `structured_output` is accepted. Native Claude stream-JSON image blocks carry base64 bytes. Built-in Claude tools are disabled; normal manual permissions remain. There is no `--bare`, permission bypass, shell interpolation or fallback provider.

Host prompts travel on stdin. Each attempt has a fresh private directory and request identity. Input/schema/output hashes, image hashes, process outcomes and model evidence enter the receipt; prompts, raw stdout/stderr, account text and credentials do not. Temporary schema/result/image copies are removed after the attempt. Child processes have bounded output, timeout (default 120 seconds; 1–600 seconds allowed) and cancellation. POSIX termination targets the process group; Windows child-tree termination and real Windows host acceptance remain unverified. The host's own configured logging/hooks are outside DeckWeft's receipt policy; no global host settings are changed.

For timeout, process failure, schema mismatch, stale capability, changed images or source coverage failure, retain the existing checkpoint and last valid artifact. Correct the diagnosed source/configuration, probe again when needed, then make an explicit new attempt. There are no automatic model retries. Never edit receipt hashes to bypass review. A failed source-only draft retains its hash receipt and the caller's original brief; it does not create a false task success.

For an explicitly authorized real-host QA run, use an isolated browser outside `/Applications`, set `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE`, then run `npm run host:visual -- --host codex --live --out dist/host-visual-NEW`. It copies the built runtime into a clean local environment, drafts a source-preserving preview, then captures a supplied six-family synthetic diagnostic gallery at 1440/390px (including native mobile chart/diagram captures and any remaining horizontal-scroll endpoint states), delivers actual images and revises only page 4. Reviewed HTML is produced only if the actual review passes. The intentionally mixed-theme diagnostic gallery is not a generated coherent VIS-014 story. It does not certify native plugin activation, desktop hosts, all accessibility states or native applications. Installed browser bundles and personal profiles stay read-only.

Reference behavior was checked against [OpenAI non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude programmatic execution](https://code.claude.com/docs/en/headless), [Claude CLI reference](https://code.claude.com/docs/en/cli-reference) and local CLI help. Validate the actual selected host rather than inferring capabilities from documentation alone.

The VIS-012 responsive closure fits short-label line/area comparisons (up to six categories and two series, with bounded numeric label lengths) into the narrow viewport, separates coincident values and stacks simple adjacent-node chains vertically. Longer/dense components keep their existing scroll/data-table reading path; this is not universal diagram reflow. Resize preserves object identities and exact source data. Run `node tests/browser_responsive_components.mjs` with the same isolated-browser environment to verify both languages, 320–1440px, label collisions, transformed clipping detection and return to desktop geometry.
