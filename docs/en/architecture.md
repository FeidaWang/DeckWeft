# Architecture: one recipe, several delivery boxes

[中文](../zh-CN/architecture.md) · [Roadmap](../../ROADMAP.md)

A slide is not stored as a screenshot. It is a small structured record: what to say, how to arrange it, how to animate it later, and where its references came from.

```text
Agent / Markdown / Project JSON
                ↓
   strict project validator + explicit legacy importer
                ↓
   story content + layout preference + references
                ↓
   four candidate recipes → ranked choice → scene nodes
                ↓
   fit audit ── blocker? → explain; preserve JSON
                ↓
   SVG preview / HTML / native PPTX / Figma JSON / AE JSON
```

## Module boundaries

The [presenter guide](presenting.md) documents the MB-01–05 local build. `src/contracts/presentation.mts` contains typed public/session contracts; schema-derived Project declarations are generated in `dist/types`. The bounded JSDoc/TypeScript pilot checks universal speech/preferences/clock modules and the browser action registry. Existing ESM source startup remains supported; TypeScript is a development dependency excluded from packaged runtime metadata.

`src/presentation/sessions.mjs` owns a bounded in-memory public scene projection and a separate loopback audience server. It never stores private notes or editor tokens. The audience server serves only its three static assets and scoped read-only scene requests, with no session bootstrap, project API or CORS. Authenticated editor commands have monotonic ordering so late updates cannot undo a newer slide/motion selection. Browser-local presenter state is separate from persisted project content; every presentation starts from an exact measured snapshot. Private notes are omitted from visual exports unless explicitly requested.

| Folder | Responsibility | It must not do |
| --- | --- | --- |
| `src/core` | Create, validate, migrate, and edit project data | Fetch sources or silently repair invalid current documents |
| `src/layout` | Wrap text, compute four layouts, score and audit | Drop text to make a score look good |
| `src/render` | Compile one scene model into output files | Independently invent a second layout |
| `src/services` | Local HTTP boundary, per-project storage, revision checks | Listen on the public internet or use a global active project |
| `src/plugin` | Build self-contained bundles and install owned skills | Modify host permissions, subscriptions, or unrelated folders |
| `public` | Browser editor and interaction state | Store secrets in exported decks or send data to third parties |
| `integrations` | Translate handoffs inside actual design applications | Pretend that JSON is an already-rendered video or native app document |

## Data model

`format: "deckweft"` and `schemaVersion: 1` are a **new namespace**. This is not a downgrade of a legacy version 2 schema.

```text
Project
  id, title, locale, aspectRatio, theme
  brief: prompt, audience, outcome
  slides[]
    id, role
    content: eyebrow, title, body, items[], metrics[]
    design: selected recipe or auto
    motion: none / fade / rise, duration
    notes, sourceIds[]
  sources[]: id, title, url
  revision: number, createdAt, updatedAt
  extensions: preserved optional data
```

See [the JSON Schema](../../schemas/project.schema.json). The runtime implements exactly the schema subset used here, with no remote references or coercion. The build check rejects unsupported schema keywords. It also validates cross-record ids and source URLs. This validator is not a general-purpose JSON Schema library.

Normalized source records avoid copying a URL into every slide. Scenes and candidate rankings are derived, not saved as another competing truth. Revision numbers belong to the server. The browser keeps an undo stack; it never rolls the server revision backwards.

## Layout rules

There are four recipes, not four random colors. Editorial separates the claim from its support. Statement stage emphasizes the title. Evidence grid gives each item a card. Step by step makes sequence explicit. Auto prefers eligible layouts before considering rule scores and repetition.

The Studio uses `BrowserTextMeasurer` behind the shared `fit(text, box, style, key)` contract. Canvas shapes whole strings using permitted local font candidates after `document.fonts.ready`. `Intl.Segmenter` keeps graphemes intact; exact source ranges preserve spaces, paragraphs, emoji clusters, and combining characters. The headless CLI keeps an explicitly labelled conservative estimate. Both paths enforce a font floor and block overflow; neither guarantees pixel-identical Office output.

`POST /api/measure/plan` produces bounded text-box requests from all four recipes. The browser returns only ranges, widths, font choice and ascent/descent—not executable scenes. `/api/measure/resolve` validates those records, recompiles on the server, and issues an in-memory render ticket. Export reuses the same scenes. The SHA-256 fingerprint binds every project field except the save revision; text/theme/locale/layout changes invalidate the ticket. Caches hold at most eight plans and eight renders for 15 minutes. These are measurements from a same-origin client, not independently verified font certificates. JSON bodies retain the 2 MB limit; very large decks may need splitting.

## Storage and concurrency

Projects live under the chosen library's `projects/` folder. Filenames use strict ids without lossy slugification. A per-project exclusive lock serializes writes. Save compares the client's last revision against the current revision. A mismatch returns HTTP 409 without changing either version. The previous revision is copied to `history/`, then the current document is replaced through a flushed temporary file.

This protects against common local interleaving and partial-file writes. It is not a transactional multi-file database, distributed lock, disk encryption, or proof against power loss on every filesystem. Read-only history browsing and hash-pinned restore-as-copy are implemented. `GET /api/projects/:id/history?limit=10&before=N` returns cursor-paged metadata; `GET /api/projects/:id/history/:revision` returns a validated snapshot and its byte hash. `POST /api/projects/:id/history/:revision/restore` requires `mode: copy`, the viewed hash and a stable request id. Retries reuse a deterministic new id, and lineage is stored in `extensions.deckweftRecovery`. Existing snapshots are exclusive-created and never overwritten with different content. Retention and archive management remain planned. Symlinked storage and installation paths are deliberately rejected; TOCTOU attacks by a hostile same-user process are outside this alpha's protection.

## HTTP boundary

The server binds only to `127.0.0.1`. It checks Host, Origin, and cross-site metadata and requires a per-process bearer token for project APIs. The session endpoint returns that token to the local studio; a local HTTP client that sends no Origin can also obtain it. Cross-site browser reads are blocked by the same-origin policy, CORP, the absence of CORS and Fetch Metadata, which is origin protection, not authentication of local processes. No CORS permission is issued. JSON requests are size-limited; static paths are allowlisted; imported text is escaped on rendering.

Do not expose this service through a reverse proxy or open network binding. It has no multi-user identity, TLS termination, permission model, remote storage, or hostile local process isolation.

## Why no framework or dependency download yet?

The alpha's runtime uses Node built-ins, ESM, and browser APIs. This makes the agent package self-contained and the first run small. The tradeoff is a deliberately narrow schema validator, conservative text engine, and native OOXML exporter that need explicit tests. Add a well-maintained library when its measured benefit is worth the packaging and review cost; zero dependencies is not a security certificate.

## Design and language choices

Warm paper, a strong ink foreground, restrained terracotta, visible boundaries, and generous gaps keep the argument prominent. The editor uses three regions on wide screens and drawers on smaller ones. The UI uses system sans-serif fonts; slides use Georgia/Arial for English and named CJK families for Chinese. No font binary is redistributed.

English is the source language. Chinese docs, sample content, and UI labels are separate. UI language and document locale are different settings. Translation is explicit future work, not a side effect of a dropdown.

## Interaction modules

`public/interaction.js` owns bounded edit history, IME-aware keyboard decisions and native dialogs with explicit Tab wrapping/focus return. `public/history.js` owns the read-only history workflow. `public/shell.js` owns the shared workbench shell (top band, page strip, first run, Words / Look zones, More drawer, state square) and talks to a deck kind only through the adapter documented at its top; `public/app.js` mounts it with `public/kinds/classic.js`, and `public/studio/visual.js` mounts the same shell with `public/kinds/visual.js` for v3 decks (single entry step 3). The classic kind guards preview responses by generation, content counter and slide id; save responses update the revision but cannot clear later edits. Leave-confirmation handlers are scoped per opening to avoid queued-close races.

## Version 3 handoff fields (S1, 2026-10-19)

The design handoff's SceneSpec, ChartSpec, MotionPlan and StaticState are mapped onto the existing contracts instead of new schemas. Every field is optional; a version 3 document, plan or theme without them validates and renders exactly as before ([byte-identical proof](../../tests/handoff-contracts.test.mjs), [baseline](../../tests/fixtures/visual/render-baseline.json)). Validation lives in [chart semantics](../../src/components/charts/semantics.mjs) and [scene semantics](../../src/design/scene-semantics.mjs). Declarations that no compiler draws yet are refused for HTML with a named code, never dropped from the figure. State: **Implemented** (unit tests only; no browser evidence).

### Semantic document (`presentation-v3`)

| Field | Expected result | Recovery when rejected |
| --- | --- | --- |
| `rules.misreading: "strict"` | Opts the document into the percentage guard: every dataset whose unit is a percentage (`%`, `percent`, `pct`, `百分比`…) must declare `definition.denominator`. | Declare the denominator with `declareChartSemantics()` ([migration](migration.md#opt-into-the-strict-misreading-guards)) or remove `rules`. Nothing is inferred. |
| dataset `version`, `collectedAt`, `validPeriod {from,to}` | Dataset identity. Dates are real calendar days (`YYYY-MM-DD`); `from` is not after `to`. | Correct the date; no date is normalized. |
| dataset `definition {denominator, sample, normalized, betterDirection}` | Field definitions. `datasetSemantics()` resolves absent values to `null`, `null`, `false`, `"none"`. | Only the denominator is ever required, and only under strict rules. |
| dataset `missing[] {seriesId, categoryId, reason, note}` | A reason for a `null`. Needs stable `categoryIds`; one reason per value; the value stays `null`. | Point the reason at an existing null, or restore the null. A reason never replaces a value with zero. |
| dataset `events[] {id, categoryId, label, relation, sourceIds}` | `temporal` events mark adjacency only and their label cannot contain a causal connective (`because`, `caused`, `led to`, `导致`, `因为`…). `attributed` events need at least one source. Since S4 they are drawn as numbered rules or row marks with a relation note on line, area, stacked, bar, dot-interval, small-multiple and benchmark-table charts; scatter and heatmap answer `CHART_EVENTS_UNIMPLEMENTED`. | Reword the label, or change the relation to `attributed` and cite the source. |
| series `interval {type, level, method, lower[], upper[]}` | `ci` needs `level` in (0, 100); `sd`, `iqr`, `range` carry none. All intervals in one dataset share type and level. Bounds enclose each value and are `null` exactly where the value is `null`. Since S4 lines draw whiskers and `dot-interval` charts draw intervals, with type, level and method in a note; other kinds answer `CHART_INTERVAL_UNIMPLEMENTED`. | Use one interval type per dataset; split the other series into another dataset. |
| chart `question`, `takeaway` | Plain text; the chart block's own `sourceIds` are its sources. Since S4 the question heads the figure and the takeaway follows the legend, in both web views. | — |
| chart `axis.scale`, `xAxis.scale` (`linear` default, `log`) | Declared per chart; a dataset-level scale is an unknown field. `log` needs strictly positive values, `extent` or a positive `fixed` range, and no filled marks. Since S4 line, scatter, dot-interval and small-multiple charts draw whole-decade log axes with a note; other kinds answer `CHART_SCALE_UNIMPLEMENTED`. | Keep `linear`, or fix the range and remove zero/negative values from the dataset you cite. |
| chart `sort` (`author`, `value-desc`, `value-asc`) | Default is `value-desc` for `ranked-bar` and `author` elsewhere. Value sorts apply to ranked bars and stacks with category data only. Since S4 every sort is drawn (`author` draws a direct-labelled bar; stacks sort by net total); the code is removed. | Use the default or a `ranked-bar`. |
| chart `truncation {note}` | Only for `area`, `ranked-bar`, `stacked` and (since S4) `grouped-bar`, and only when the axis actually excludes zero (`extent`, or `fixed` with `min > 0` / `max < 0`). Without it, filled marks still require a zero baseline. Since S4 a break mark, the caption **truncated axis** and the note are drawn; the code is removed. | Add the note, or return to `policy: "zero"`. |
| chart `focus {categoryIds}` or `{seriesIds}` (S4) | Exactly one. A category focus on ranked, grouped, dot-interval and benchmark-table charts; a series focus on line, grouped, dot-interval and small-multiple charts with two or more series, never naming all of them. Drawn solid against lighter, outlined marks, with a two-state legend. | A single-series chart cannot focus a series (C1): declare the categories that carry the conclusion. |
| chart `labels` (`points` default, `end`) (S4) | `end` draws a line trend with collision-free end labels and no per-point labels. | Use it on `line` only. |
| chart `chartType` `grouped-bar`, `dot-interval`, `small-multiples`, `benchmark-table` (S4) | See [chart kinds](components.md#chart-kinds-and-declarations-s4-2026-10-19). | Grouped bars and small multiples need two or more series; dot-intervals need an interval on every series. |
| dataset `qualifiers[] {seriesId, categoryId, label, note}` (S4) | A numbered qualifier on one value, drawn in the chart notes and the table; numbers follow the dataset order. | One per value, never on a null (use a missing reason); needs `categoryIds`. |

### Design plan scene (`design-plan`, passed through to `web-scene`)

| Field | Expected result | Recovery when rejected |
| --- | --- | --- |
| `takeaway {blockId}` | A heading, paragraph, callout, quote or metric block of the same scene carries the takeaway. Locking that block id in `lockedBlockIds` locks the takeaway text. | Reference a block that is in `blockIds` and has a text or metric type. |
| `contentStatus` (`sourced`, `illustrative`, `evidence-required`) | `sourced` requires non-synthetic, sourced datasets, sourced metrics and a sourced takeaway. The other values record intent only. | Mark synthetic material `illustrative`, or add the sources. |
| `keyStates[] {id, position, label}` | Named cue boundaries: `position` 0 is the authored opening (initial series/range, tab and step), `n` is the state after the first `n` cues. | Keep `position ≤ cues.length` and ids unique. |
| `staticState {keyStateId}` | Names the frozen state for static output; `staticInteractionState()` returns the frozen filter/focus selection. Absent means the opening. Applied in web output since S2 ([below](#static-state-in-web-output-s2-2026-10-19)); a static state that changes a step, comparison or hotspot answers `STATIC_STATE_UNIMPLEMENTED`. | Name an existing key state; for step/comparison/hotspot scenes choose a key state that changes charts only, or the opening. |
| `motion.trigger: "manual"`, `motion.clock: "cues"`, `motion.reducedMotion` (`instant` default, `static`) | Declarations of the current player: cues advance by replay/next/seek on one deterministic cue clock; reduced motion applies state instantly. `effectiveMotion()` ignores the new keys. `static` needs a `staticState`; since S2 the web player then shows the static state under reduced motion and does not play cues. | Remove the declaration or add the static state. |

### Theme pack tokens (`theme-pack`)

Optional `typography.numeric`, `palette.reference`, `palette.missing`, `spacing.captionGap`, `spacing.sectionGap`, `spacing.safeArea` and `motion.distance`, `motion.easing`, `motion.delay`, `motion.fallback`. `themeTokens(id, locale)` resolves them; `resolveTheme()` is unchanged, so no theme output changes. Defaults are the values the renderer already uses: numeric = the locale body stack, reference = ink, missing = ink, captionGap 14, sectionGap = gap, safeArea = page, distance 4, easing `ease-out`, delay 0, fallback `instant`. No packaged theme declares any of them yet; a declared value is reported under `declared` and is not yet consumed by the renderer.

### Lock categories

No new lock fields were added. The handoff's four categories map onto existing locks: **text** → `authorOverrides.lockedBlockIds` (block content, including the takeaway block); **data** → a locked chart block locks its dataset, including `definition`, `missing`, `events` and intervals; **sources** → sources linked to a locked block or its explanations; **composition** → `sceneLocks.fields: ["composition"]`, alongside `theme`, `interactions`, `cues`, `motion` and `profile`. The [lock test](../../tests/handoff-contracts.test.mjs) exercises each mapping. Since S2, `cues` and `motion` scene locks also keep `staticState` and the position of its key state ([test](../../tests/evidence-scene.test.mjs)).

## Static state in web output (S2, 2026-10-19; extended in S5)

A scene that declares `staticState` is exported in that state. State: **LocalVerified** for chart selections in one bilingual evidence scene (S2), and since S5 for focused series, diagram and code steps, comparison tabs and hotspots in the bilingual interaction demo ([S2 evidence](../evidence/s2-vertical-sample/review.md), [S5 evidence](../evidence/s5-motion-state/review.md), [conflicts](../plans/design-handoff-vertical-sample.md)).

| View | Expected result |
| --- | --- |
| Without JavaScript | The frozen state from `staticInteractionState()`: chart selection and focus; the marked step node, relationship or source lines; the chosen comparison image with the other one in a closed disclosure; numbered hotspot markers with the open one outlined. A line above each component names the key state and states what it shows (every shown chart value, the step text, the open annotation). **View all data** keeps the complete, unfiltered table; marks outside the selection keep their anchors there. |
| Reading view | The player starts at the static state's cue boundary. The same text line stays visible while the scene is at that boundary and hides while the reader explores. |
| Presentation view | Starts at the same boundary. **Replay cue sequence** still starts from the authored opening (position 0) and plays every cue. |
| Reduced motion, `reducedMotion: "static"` | With the system setting or the page's **Reduce motion** control, the scene returns to its static state, **Replay cue sequence** and **Play cues** are disabled and a notice says cues do not play. `deckweftInteractions.play()` keeps the static state. **Previous cue**, **Next cue** and the cue slider still work and apply state instantly. |
| Reduced motion, `instant` (default) | Unchanged: cues still play; animation is removed. |
| Review gate | The fit receipt (`window.deckweftFit`) has `checks` for every scene at the opening and `states` for every declared static state; `POST /api/visual/measure` refuses a receipt without a passing entry for each. |

How it is built: since S5 the static-state player is part of the one embedded player ([runtime](../../src/render/web/runtime.mjs), [semantic.js](../../public/runtime/semantic.js)); the server-side frozen markup is in [static-state.mjs](../../src/render/web/static-state.mjs) and is added only to scenes that declare a static state, so the markup of every other scene is unchanged. The player removes the markup that only readers without JavaScript need (`[data-static-only]`, `details[data-static-wrapper]`) before it mounts and then draws the same state itself. The runtime data carry `staticState {keyStateId, position, reducedMotion}`, so a global motion **Off** cannot drop the fallback.

Limits: point-labelled line, area, stacked, scatter and heatmap charts still scroll inside their plot on a 390 px screen (S4 follow-up). Since S4 a ranked bar no longer scrolls, the static statement names the filter and the sort separately, and both views draw the chart at the same size; since S5 the fit receipt covers each static state and frozen steps, comparison tabs and hotspots are drawn without JavaScript. See the [conflict list](../plans/design-handoff-vertical-sample.md#conflict-list).

Recovery: if the measured check fails only with a static state, the frozen view itself does not fit; choose another key state or shorten the content. If Studio refuses the static-state choice, unlock **Lock this scene interaction plan** first. To remove the static state, set `reducedMotion` to `instant` first.

## Motion state and the embedded player (S5, 2026-10-19)

State: **LocalVerified** in an isolated browser at 1440 and 390 px in both languages ([evidence](../evidence/s5-motion-state/review.md)). VIS-009's reducer, cues and lifecycle are kept; S5 separates state, adds one clock and names the motion primitives.

| Piece | Where | Rule |
| --- | --- | --- |
| Chart state (EvidenceStage) | [timeline.mjs](../../src/motion/timeline.mjs) | `datasetId`, `metricId`, `seriesIds` (shown), `focusSeriesId`, `fromId`/`toId`, `sortKey`, `scale` and `caption {categoryId, seriesIds}` are separate fields. `data.filter` changes shown series and range; `data.focus` changes the focus only and never shows a hidden series; hiding the focused series ends the focus. `datasetId`, `sortKey` and `scale` are the chart declarations and `metricId` is `null`: no event changes them until a metric switch (M14), an interactive sort (M13) or a scale shift (M12) is drawn. |
| Caption subject (C4) | [cues.mjs](../../src/motion/cues.mjs) `captionOrder` | The explanation line describes the top rank of a ranked bar, otherwise the last category in range, for the focused series or every shown series. |
| One clock | [clock.mjs](../../src/motion/clock.mjs) | play, pause, seek, next, previous, restart, exploration and the reduced-motion fallback move one position and share one cancellable timer. Pause, seek, exploration, scene exit, a hidden tab and `pagehide` cancel the timer, animations and registered resources together. |
| Motion primitives | [primitives.mjs](../../src/motion/primitives.mjs) | FadeIn, SlideSmall, Crossfade, RevealMask, SeriesReveal, AnnotationReveal on the existing cue events; `motionPlan()` maps an event and two states to primitives and stable targets, so play, seek and replay animate identically. Each animation carries its primitive name as its Web Animations `id`. Reduced results: content visible, target layout, full graphic. No random visuals exist, so no seed is stored. |
| Page keys (C14) | [keys.js](../../public/runtime/keys.js) `turnsPage()` | Page navigation ignores keys while a control, link, slider, tab, editable field or focusable element (including SVG chart marks with `tabindex`) has focus, and keys with a modifier. |
| Opening reply (C20) | [runtime.mjs](../../src/render/web/runtime.mjs), [interactions.js](../../public/studio/interactions.js) | `deckweft:opening` carries `position`, `exploring` and `staticPosition`; `useInteractionOpening()` refuses a state at a later cue position unless it was explored. |

Byte identity (C6): S5 folded the S2 conditional extension into the one player instead of adding a second one, because the key guard (C14) and the explanation line (C4) were defects in every interactive export, not only in documents with a static state. `PLAYER_VERSION` names the player bytes (runtime plus interaction bundle, including the embedded chart renderer). Rule: any change to those bytes bumps `PLAYER_VERSION` and re-records [render-baseline.json](../../tests/fixtures/visual/render-baseline.json) in its own commit (`node tests/render-baseline.mjs --write`); `playerHistory` fails the test if one version names two byte sequences. The baseline keeps separate hashes for the reader-visible markup, runtime data, player script and CSS of each HTML entry, so a re-recording shows that text, values and anchors did not move.

Static output for scenes without `staticState` (C7, decided in S5): unchanged. The no-JavaScript view draws the complete authored data, the player opens at the authored opening. Freezing the opening is an explicit author choice (a key state at position 0 chosen as the static state), never an automatic migration.

## Paged export targets (S7, 2026-10-19)

PowerPoint and PDF are compiled from the derived web scene as the browser actually drew it. They are never compiled from a second layout engine. [Manual](compatibility.md#version-3-powerpoint-and-pdf-s7-vis-016) · [evidence](../evidence/vis-016/review.md).

| Module | Responsibility |
| --- | --- |
| `src/targets/capabilities.mjs` | `COMPONENT_LEVELS` and `outputLevel()`: L1/L2/L3 per component and format. Charts resolve their PowerPoint level from kind and declarations. |
| `src/targets/layout.mjs` | `measureExportLayout()` runs in the static page with scripts disabled at 1440 px after fonts and images are ready. It measures text parts with runs and styles, painted boxes, SVG shapes in page coordinates, chart plots and marks, diagram nodes and edges, images with their visible source crop, and tables. `assertExportLayout()` binds the result to one render hash. |
| `src/targets/export-order.mjs` | The seven stages: ready → static-state → freeze → stop-motion → reveal → render → check. A stage out of order is refused. |
| `src/targets/static-delivery.mjs` | The frozen state of every interaction and chart, stopped motion, and the content behind disclosures. |
| `src/targets/pptx/*.mjs` | `compile` places native objects at the measured boxes. `fallbacks` decides native or L3 and writes receipts. `audit` reads the package back. `compatibility-report` builds the per-deck report. |
| `src/targets/pdf/print.mjs` | The print document (one measured scene per page, then notes pages) and the text and tag checks. |
| `scripts/export-targets.mjs` | The browser run over a corpus: measuring, capturing fallbacks, printing, independent inspectors and Quick Look renders. |

Invariants:

- Text comes from the rendered derived scene. The check stage compares it with the semantic document (`expectedBlockText`); nothing may be lost.
- One uniform scale fits each scene into the 16:9 slide or page. Nothing is re-laid out.
- No picture stands in for a slide. Pictures exist only for image blocks and L3 charts, and each L3 chart has a receipt and a summary.
- The same inputs give the same bytes. No network request. Fonts are referenced by name, never embedded.
- The web export is unchanged: no embedded player or renderer byte changed in S7.
