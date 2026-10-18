# Proposed modular build roadmap — 2026-10-17

[简体中文](../zh-CN/modular-build-roadmap.md) · [Current release roadmap](../../ROADMAP.md) · [Proposed task data](../plans/modular-build-2026-10-17.json) · [Current UI inspection](../evidence/roadmap-2026-10-17/review.md)

This document records the original construction proposal. The user subsequently authorized MB-01 through MB-05; their local implementation and remaining manual gates are recorded in the [presenter guide](presenting.md) and `roadmap.json`. Subsequent MB-06–15 authorizations and their actual acceptance states are recorded below. No provider connection or host/chat delegation is authorized by adopting the first batch.

The recommended order is: establish typed boundaries; improve actions and preferences; separate audience and presenter views; deliver the teleprompter; build a structured generation loop with one verified agent; then add concurrent agents, richer rendering and design-app adapters. Migrate TypeScript in small slices alongside feature work.

## Adoption update — MB-06–10

The user subsequently authorized MB-06–10. The local implementation and actual CLI effort pilot are described in the [planning guide](planning.md), [evaluation](astra-evaluation.md) and [review](../evidence/mb-06-10/review.md). Dot desktop acceptance remains open for MB-08. MB-11–15 were later authorized on 2026-10-18; their local implementation and remaining host/application gates are recorded in the [media and worker guide](media-workers.md).

## Baseline at planning time

The source is Node ESM with no external runtime package dependencies. Content, layout, scenes, exporters, local storage and host packaging are already separated. Preserve those boundaries. `public/app.js`, `public/studio-tools.js` and the agent bridge combine several responsibilities in compact files; splitting by responsibility matters more than changing extensions.

Current source and this inspection establish the following:

| Request | Existing foundation | Gap |
| --- | --- | --- |
| TypeScript | Explicit JSON schema, ESM modules and tests | No TypeScript build or static type gate |
| Automatic visuals | Four layout recipes, SVG scenes, native PPTX, fixed Cosmic & Dots assets and local Three.js | No general media model, content-to-visual planner, image provider or template/interaction contract |
| Dots and progress | Opt-in MCP/CLI queue, input hashes, lease, cancellation, review-as-copy | One connected agent only; no conversation access grant, effort control, task DAG, progress events or ETA |
| Clearer actions | Icon rail, accessible names, focus helpers | Generation and export both receive strong blue emphasis; many other actions share small icon styling |
| Private pitch | Speaker notes, rehearsal timer, reading-time estimate | Studio presentation hides editor panels in the same document. Exported HTML contains notes and per-slide details; neither is a private presenter channel |
| Appearance/accessibility | Dark slide palette and some reduced-motion behavior | Slide theme is separate from editor appearance; no unified editor light/dark/system preference or shared playback policy |

`speechStats()` currently counts English-style word groups. A continuous Chinese sentence can count as one group. `motion.duration` is bounded to 2–60 seconds; it must not become an implicit limit on spoken pitch length.

The inspected workspace has no Git metadata. Coding-agent isolation must therefore support a source-copy/patch workflow until a real Git repository is available. Do not invent a branch or claim worktree protection here.

## Prioritized work and dependencies

Priorities below are local to this proposal; existing `P0`–`P5` roadmap phases keep their meaning. Estimates are initial engineering estimates for one experienced maintainer, including implementation and local checks. They are not measured agent durations. Authentication, unavailable applications, user review and external waiting time are excluded.

| Order | Priority | Module | Depends on | Estimated person-days | Observable acceptance |
| --- | --- | --- | --- | --- | --- |
| MB-01 | P0 | Typed contracts and build pilot | Existing schema/tests | 2–4 | Type-check a bounded module slice; compiled CLI/browser artifacts retain offline behavior and reproducible packaging |
| MB-02 | P0 | Action hierarchy and compact controls | MB-01 contract slice | 2–3 | Consistent semantic color, shape, label and focus states; important actions remain identifiable without color |
| MB-03 | P0 | Appearance and accessibility preferences | MB-02 | 2–3 | Light/dark/system editor modes and one quick motion switch work across preview and player without changing the deck theme |
| MB-04 | P0 | Separate audience/presenter surfaces | MB-01 contract slice | 3–5 | Audience output contains no private notes; reconnect/refresh/close fail safely; actual window sharing is checked |
| MB-05 | P0 | Resizable teleprompter and speech timing | MB-03, MB-04 | 3–5 | Follow the current slide, resize, pause/resume and calibrate pace; Chinese/mixed text is estimated sensibly |
| MB-06 | P1 | Storyboard, asset and scene contracts | MB-01 | 4–6 | Brief becomes a reviewable slide plan; asset references, provenance and schema migrations are explicit |
| MB-07 | P1 | Semantic templates, SVG and interaction recipes | MB-03, MB-06 | 4–6 | Content chooses a suitable visual family; measured text and editable exports pass; unsupported interactions have declared fallbacks |
| MB-08 | P1 | One Dot, scoped grants and host adapter | MB-01 | 4–6 | A real authorized host receives the pinned plan and selected inputs; requested and actual model/effort are distinguished |
| MB-09 | P1 | Job lifecycle, checkpoints and progress | MB-08 | 4–6 | Durable events survive restart, cancellation and retry; timeline and progress reflect actual work rather than a timer |
| MB-10 | P1 | Astra effort calibration | MB-06, MB-07, MB-09 | 2–4 | Representative tasks establish quality/cost/latency tradeoffs; policy records its evidence and expiry |
| MB-11 | P1 | Optional image generation and asset reuse | MB-06, MB-07, MB-09, MB-10 | 3–6 | One approved deck generates relevant local assets with rights records, alternative text and bounded retries; offline reopen works |
| MB-12 | P2 | Multiple Dots and conversations | MB-09, MB-10, MB-11 | 5–8 | Two workers complete independent tasks without cross-chat disclosure, duplicate work or competing file writes |
| MB-13 | P2 | General Three.js scene adapter | MB-03, MB-07 | 3–5 | Approved 3D recipes share the scene contract; context loss, keyboard operation and static export work |
| MB-14 | P3 | Figma adapter acceptance | MB-07, MB-11 | 3–5 | Actual importer preserves editable layers, font decisions and source mapping in Figma |
| MB-15 | P3 | After Effects adapter acceptance | MB-07, MB-13 | 4–7 | Actual AE import, native layers, timing, easing and preview render pass with cancellation/rollback evidence |

The complete scope is roughly 48–79 person-days; recompute from the task data when scope changes. Use a 20–30% planning allowance, then re-estimate after MB-01 and MB-05. The task data contains the exact ranges. Do not use this estimate as a live ETA. The first product milestone is MB-01 through MB-05, approximately 12–20 person-days before external acceptance waits.

## 1. Adopt TypeScript at contracts and new modules

TypeScript becomes more valuable as scene variants, assets, job states, model capabilities and host adapters grow. Discriminated unions can prevent a completed job without an artifact, an unsupported renderer node, or a presenter message carrying the wrong payload. It does not improve rendering speed, layout quality or runtime input validation by itself.

Start with JSDoc and scoped `allowJs`/`checkJs` for stable `.mjs` boundaries. Generate or check project declarations against `schemas/project.schema.json`; the schema remains the persisted-data contract. Use `unknown` at imported JSON, HTTP, MCP, host events and provider results, then validate before narrowing. Avoid `any` and type assertions that merely conceal invalid input. The official [TypeScript incremental migration option](https://www.typescriptlang.org/tsconfig/allowJs.html) supports mixed JavaScript and TypeScript.

For new code, use `.mts` → `.mjs` for Node ESM and `.ts` → `.js` for browser modules. Use separate Node and DOM configurations, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, explicit type imports and relative ESM paths. Compile with pinned development tools to `dist/runtime`; keep a build manifest consumed by the CLI, server static allowlist and plugin packager. Test the emitted code, copied bundle and source maps, rather than testing only the source-language path.

Keep the existing JavaScript launcher working during migration. A full TypeScript cutover introduces a developer build step. End users would need a prepared distribution with emitted JavaScript; an unbuilt source-only ZIP cannot silently retain today's no-install startup promise. Resolve and document that packaging decision before migrating the launcher. Node's native [type stripping](https://nodejs.org/api/typescript.html) performs no type checking and ignores `tsconfig.json`; it is not a replacement for this gate, and the current minimum is Node 22.0, not a particular later 22.x release.

Suggested module destinations are a proposal, not directories that already exist:

| Boundary | Proposed ownership | Current code to reuse |
| --- | --- | --- |
| `src/contracts/` | Project declarations, asset/scene/job/event/host contracts | `schemas/project.schema.json`, `src/core/validate.mjs` |
| `src/planning/` | Storyboard, visual intent, template selection | `src/core/model.mjs`, `src/layout/engine.mjs` |
| `src/assets/` | Asset registry, local files, rights and content hashes | `src/render/assets.mjs`, `src/layout/showcase.mjs` |
| `src/presentation/` | Session projection, transport and speech timing | `src/core/speech.mjs`, `src/render/player.mjs` |
| `src/orchestration/` | Grants, jobs, events, scheduler, effort policy, integration | `src/services/agent-bridge.mjs` |
| `src/adapters/hosts/`, `src/adapters/media/` | Negotiated host and optional provider capabilities | `src/adapters/agent-mcp.mjs`, worker CLI |
| `ui/workspace/`, `ui/presenter/`, `ui/audience/`, `ui/settings/`, `ui/jobs/` | Separate browser surfaces and state | `public/app.js`, `public/studio-tools.js`, `public/agent-bridge.js` |
| `src/render/` and `integrations/` | Scene exporters and host-specific handoffs | Existing SVG/HTML/PPTX/Figma/AE code |

Keep AE JSX as its host-compatible artifact; do not assume AE can execute modern TypeScript or Node ESM. A framework rewrite is not required.

No dependency is added by this plan. Before adopting TypeScript development tooling, record caught contract errors, cold/incremental build time, exact package/archive size, dependency license and offline build requirements. TypeScript is Apache-2.0; any Node type declarations and transitive tooling need their own license/size record. The compiler stays out of the shipped runtime. New renderer libraries require the same evidence. Existing Three.js packaging is already documented separately; reuse it before adding another engine.

## 2. Generate visual meaning before selecting a renderer

Use this pipeline: brief → narrative proposal → per-slide visual intent → reviewed template/asset requests → derived scene → fit/accessibility audit → preview/export. Preserve the title, evidence and pitch as editable content. Regenerate only the changed slide/asset, with input hashes and cache invalidation.

`SlideIntent` should describe the claim, audience, supporting evidence, visual family, asset request, interaction intent and speaker script. The first families should be comparison, process, timeline, metric, image-caption and a restrained cover. A scientific or commercial claim needs supplied evidence; a decorative image must never masquerade as evidence or data.

Add a versioned asset registry with local hash, MIME type, dimensions, provenance, generation metadata without secrets, license/allowed use, alternative text, crop/focal point and fallback. Keep binary files outside project JSON and existing HTTP JSON limits. Asset import must check file/path/size/type boundaries. Extend the project schema and runtime validator together; add explicit copy-preserving migration for a new project version. Do not put an unvalidated public feature in the free-form `extensions` object to avoid a migration.

| Need | First renderer/adapter | Output policy |
| --- | --- | --- |
| Diagram, process, comparison, data-driven visual | Native scene text/shapes and a constrained SVG vocabulary | Preserve editable text/data; reject scripts, foreign content and remote resource references |
| Photo, illustration, texture | Optional image-generation tool/provider or approved local media | Local asset file plus rights/provenance; image remains an individual editable media object |
| Entrance, reveal, highlight | Declarative motion tokens/timeline over scene node IDs | HTML playback; static PPTX fallback and explicit AE mapping |
| Tabs, progressive explanation, parameter exploration | Allowlisted interaction state machines | HTML keyboard/touch controls, text alternative; selected state plus explanation for static outputs |
| Spatial explanation or meaningful 3D | Optional Three.js adapter | Lazy loading, static fallback, bounded resource use and shared motion policy |
| Reusable visual design | Internal theme tokens plus semantic template recipes | Choose structure based on content, rather than only changing colors |
| External authoring or polished motion finishing | Figma / AE adapters | Optional downstream branches with real-app acceptance |

Astra can plan, produce code and invoke tools; its documented native image modality is input, while image generation is a separate supported tool. Keep image tool access explicit. See [Astra capabilities](https://developers.openai.com/api/docs/models/gpt-6-astra). Do not assume a model selection alone grants image generation, Figma, AE or account access.

Record renderer support as `native`, `static-fallback` or `unsupported` for each node/behavior. Preview the fallback and explain fidelity loss before export. Never rasterize an entire slide to conceal missing text, interaction or layout support. Add editability/package checks plus real-app visual review for new node types. A general 3D scene does not imply native editable 3D in PPTX, Figma or AE.

## 3. Make Dot delegation scoped, inspectable and resumable

The present bridge stores one agent and rejects a second live session. It has three main worker operations: connect, claim/heartbeat and complete. It cannot read chats or select Astra. Start with a real single-host capability handshake before changing the queue into a multi-worker system.

Support separate job kinds: `deck-generation` returns a validated project/asset proposal; `code-change` returns a bounded patch, artifact manifest and test evidence. A slide-generation grant must not imply permission to edit repository code. A coding grant must identify workspace paths, permitted commands and integration scope.

A proposed `DelegationGrant` names exact chat IDs and allowed operations, selected transcript snapshots or future-message scope, permitted project/workspace paths, host/agent identities, model/effort policy, network/tool permissions, budget/concurrency/time limits and revocation. Creating a chat, reading a different chat, sending messages or inheriting its files requires the corresponding supported host capability and user scope. Do not infer access from the word “take over.” Revocation stops new work and rejects late results; retain already produced local drafts for review.

Each job receives an immutable execution capsule: adopted task IDs, `roadmap.json` hash/version, relevant `AGENTS.md` rules, source/schema hashes, base revision, selected inputs, acceptance commands and grant ID. The runner reads adopted tasks only. Imported deck text remains data. A newer roadmap creates a proposed replan; it must not silently change a running job's permissions, budget or acceptance conditions. This proposal file is not yet an adopted execution plan.

The `HostAdapter` negotiates conversation operations, available models/efforts, selection support, worker limits, cancellation, usage and event capabilities. Store requested, host-reported and API-confirmed model/effort separately. If the host cannot select the required Astra model/effort, show a blocked step and the required host action; do not claim selection succeeded or silently substitute another model. A runtime-verified API response is still different from a self-reported host string. Host mode and an optional future API mode have separate permissions; no subscription/billing inference or automatic credential reuse.

Use `queued → running → validating → needs-review → applied`, with `blocked`, `failed`, `cancelled` and `expired` paths. Distinguish artifact completion from user application. Persist bounded events with job/task/attempt/worker ID, monotonic sequence, timestamps, input/output hashes and short status summaries. Keep lease tokens, keys and private transcript text out of project files, progress events and exports. Send a reconnectable event stream or use a cursor-based polling fallback; local persistence is not remote telemetry.

For multiple workers, split independent slide plans, assets or files after a shared brief/template contract. Use one integration writer and base-hash/revision checks. Coding workers use separate worktrees when Git exists; in this workspace use isolated source copies and hash-pinned patches. A stale patch becomes a conflict, not an overwrite. Resume only verified checkpoints, retry with idempotency keys, cancel unused child jobs and prevent duplicated chargeable image requests where supported. If a provider cannot recover an unknown request outcome, require review before repeating the chargeable operation.

Start concurrency at two, measure contention and output consistency, and increase only when it helps. Planning and integration are serial dependencies; adding agents will not make them parallel. No automatic cross-chat messages or new chats are needed for a local deck job.

### Honest progress and timeline

Show each worker's current task, completed artifacts, status, elapsed time and next dependency. The global bar represents estimated task work, not hidden reasoning or elapsed time. Weight the accepted DAG once; completed weight counts after task validation. Show within-task progress only for real measurable units, such as 3 of 6 assets or checked slides. An opaque model turn gets an indeterminate indicator. A new scope produces a versioned revised estimate.

Estimate remaining time from the critical path, queued work and actual worker concurrency, using comparable local task durations and model/effort/tool settings. Show a range and confidence/sample count; with insufficient history display “Estimating — not enough comparable runs.” Include waiting for permissions, quota, tools and review as named states. Do not let a timer creep to 99% or display a confident completion time while the host is disconnected. Announce milestones accessibly without reading every event aloud.

### Find the effort sweet spot with evidence

Use Astra `medium` as an initial candidate for bounded story/visual planning, `high` for ambiguous synthesis, difficult layout repair and integration, and deterministic code for schema/fit/package checks. Routine extraction can test `low`. Treat `xhigh`/`max` as selective candidates after a measurable benefit. The official [deployment checklist](https://developers.openai.com/api/docs/guides/deployment-checklist) recommends representative evaluation when trading higher effort for quality; a universal best effort is not established.

Build a small pilot corpus covering English pitch, Chinese/mixed text, source-heavy argument, image-dependent slides, interaction and a code-change task. Compare medium/high first on identical inputs, with repeated runs and blinded human review where feasible. Record first-pass schema/fit success, supported claims, semantic visual relevance, editable output, repair count, human acceptance time, latency and reported usage. Reuse approved assets to avoid confusing image variability with reasoning quality, then measure the complete workflow separately.

Choose the lowest-cost policy that meets the accepted quality gates, including retries and integration overhead. With actual API usage, include text, image, tool and retry charges using a dated price snapshot. With host-only access and no cost/usage signal, label cost unknown and compare latency, repair burden and reported usage; do not equate subscription quota with a dollar price. Store evaluation date, corpus/policy hash and host/model version, and re-evaluate after meaningful changes. Failure-based escalation stays inside the user's preauthorized ceiling.

## 4. Use color and shape as a small action vocabulary

Keep the existing icon rail and focus helpers, then define one action registry shared by labels, icons, hotkeys, semantic color, shape and enabled states. Proposed roles are purple for generation, blue for primary document actions, teal for presentation and red for destructive actions; neutral for navigation. Validate actual foreground/background pairs in light and dark themes before adopting exact colors.

Use rounded rectangles with labels for primary actions, square icon buttons for local tools, pill toggles for persistent states and segmented controls for mutually exclusive modes. Do not give each button a novel shape. Keep destructive controls away from adjacent navigation and retain undo/recovery behavior. Hover and keyboard focus expose readable labels; tooltips alone are insufficient for important unfamiliar actions.

Recover workspace area by keeping one prominent action per group, grouping edit-history controls, moving rare operations into a labeled overflow and making the four-layout comparison tray collapsible. Preserve a visible route to these tools. Measure canvas area and task steps before/after on fixed viewports instead of claiming a percentage improvement in advance.

Color must not be the only cue, per [W3C use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Target at least 24 × 24 CSS pixels subject to the documented exceptions/spacing rules, with a 44 × 44 product target for touch controls; do not confuse visible glyph size with the hit area. See [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Verify keyboard, 200% zoom, narrow layouts and a real screen reader before claiming accessibility acceptance.

## 5. Separate the public slide from the private pitch

Create a dedicated audience document/window containing only the audience scene projection. It must receive neither speaker scripts nor hidden notes, full project JSON, grants, model logs or private source annotations. A second tab using the same editor session and merely hiding a sidebar is not a privacy boundary. Use a restricted, separate loopback origin with no editor session or general project endpoints; the current same-origin session endpoint must not become an audience credential source. Give it a session-scoped, read-only audience capability and bounded messages carrying only slide ID, scene version, playback state and permitted visual/interaction data. Check origin/session/message shape and isolate the opener where appropriate. The presenter service publishes the already-filtered projection, never the full project.

The presenter surface keeps the current slide, a resizable/dockable script sidebar, next-slide preview, elapsed/remaining time, pace, pause/resume and previous/next controls visible. Changing slides selects its script automatically. Sidebar width, font size and line position persist locally per presentation. Keyboard shortcuts must avoid stealing input while editing notes.

Estimate speech in English words and Chinese characters at separately calibrated rates. For mixed text, count both without double counting and add explicit pause/cue allowances. Distinguish spoken duration, automatic slide advance and entrance-animation duration. Do not coerce a pitch into the existing 60-second motion field. Use a session timing sidecar first, then a versioned typed contract if timing is saved as deck content.

Auto-scroll starts only after the speaker starts it. Manual scroll pauses following and offers a clear “Resume following” action. Pausing retains the current line; changing pace or sidebar width recalculates wrapped-line positions while preserving the current text anchor. A reduced-motion preference uses manual paging or discrete highlighting; it must not restart smooth scrolling. Auto-advance slides is a separate opt-in control. Rehearsal calibration can use a manual timer; microphone/speech recognition is a later optional capability.

Share only the audience window/tab, or use an extended second display. Mirroring or sharing the entire desktop can expose a presenter sidebar; no webpage can guarantee otherwise. Test an actual conferencing share and a second-screen session, including opening, refresh, disconnect, closing and blank-screen recovery. A blocked popup should show a retry/open-audience action without moving private notes onto the audience surface.

Split exports into audience and explicitly requested presenter packages. Current HTML contains notes; CSS hiding does not remove them from a shared file. An audience export omits private note DOM/JSON/metadata entirely. Define whether PPTX speaker notes are included; default the audience variant to omit them, while retaining an explicit presenter option. Integration and file sharing must keep these distinctions visible.

## 6. Consolidate appearance and motion preferences

Keep three distinct concepts: editor appearance, deck theme and viewer playback preference. Use `appearance: system | light | dark`, following `prefers-color-scheme` live in system mode and honoring a manual override. A later user-specified local schedule may be optional; do not request location for a sunset calculation. Theme changes affect editor chrome, dialogs, forms, jobs and presenter controls without recoloring slide content. Audience output uses the deck theme.

Use a quick “Reduce motion” switch and an advanced `system | full | reduced | off` policy. Effective playback respects explicit viewer and OS reduction requirements; an author preset cannot force motion back on. Store the user's environment preference locally outside project JSON. Saved author motion remains declarative deck content. A clearly labeled “Apply no animation to deck” action is separate and undoable.

Send the effective motion policy to CSS, Web Animations, Three.js, particle/background effects, parallax, replay, auto-scroll and exported player controls. Turning it off cancels active animations/loops, settles a meaningful static state and prevents replay from re-enabling them. Reduced mode removes continuous/spatial effects; off removes all nonessential deck animation. Keep usable interaction and focus feedback. The teleprompter still has independent pause/manual control. See [W3C pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

Put appearance and accessibility in one compact settings surface: editor appearance, reduce motion and readable presentation controls, with advanced detail collapsed. High contrast, font size and keyboard/screen-reader operation are independent requirements; an “accessibility” switch cannot replace them or certify compliance. Avoid redundant per-slide viewer settings.

## Existing roadmap alignment and gates

Preserve `DW-020` as blocked until its actual outstanding host/CI gates pass; the user's deferred Claude sign-in remains deferred. Independent local UI and contract work can proceed. A specific Dot/Astra release claim needs its own real host evidence, rather than borrowing the Codex CLI test. No extra host is required merely to develop an offline presenter.

Map MB-02/03/04/05 to the broader DW-120 work and a proposed presentation branch; MB-06/07 to DW-150/DW-200; MB-08/09/10/12 to DW-210; MB-11 to DW-220 and the local part of DW-320; MB-14/15 to DW-300/310. DW-140 remains the cross-app fidelity gate as node support expands.

Recommended dependency correction when this proposal is adopted: split DW-320 into the local media contract/provider path and optional Figma/AE bridges. Local SVG/image generation must not wait for both design applications. Bring a minimal internal template recipe contract forward from DW-400; defer community code execution, hosting and collaboration. These are recommendations; `roadmap.json` has not been silently rewritten.

Before adopting any batch, select its exact task IDs and acceptance scope. Completion requires evidence, not implementation alone. Add regression tests for audience-data omission, timing/Chinese segmentation, host grants, multiple lease ownership, stale patches, retry/cancellation and motion shutdown. Run `npm run verify`; after TypeScript adoption add a type/build gate and execute the emitted runtime. Run visual checks on representative viewports and actual target applications only when their adapters change.

The historical first implementation batch selected MB-01 through MB-05: typed boundaries, clearer actions, coherent appearance/motion settings and a private presenter with an automatically following script. This yields a demonstrable product improvement before scaling generation.
