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

The server binds only to `127.0.0.1`. It checks Host, Origin, and cross-site metadata and requires a per-process bearer token for project APIs. The same-origin session endpoint returns that token to the local studio. No CORS permission is issued. JSON requests are size-limited; static paths are allowlisted; imported text is escaped on rendering.

Do not expose this service through a reverse proxy or open network binding. It has no multi-user identity, TLS termination, permission model, remote storage, or hostile local process isolation.

## Why no framework or dependency download yet?

The alpha's runtime uses Node built-ins, ESM, and browser APIs. This makes the agent package self-contained and the first run small. The tradeoff is a deliberately narrow schema validator, conservative text engine, and native OOXML exporter that need explicit tests. Add a well-maintained library when its measured benefit is worth the packaging and review cost; zero dependencies is not a security certificate.

## Design and language choices

Warm paper, a strong ink foreground, restrained terracotta, visible boundaries, and generous gaps keep the argument prominent. The editor uses three regions on wide screens and drawers on smaller ones. The UI uses system sans-serif fonts; slides use Georgia/Arial for English and named CJK families for Chinese. No font binary is redistributed.

English is the source language. Chinese docs, sample content, and UI labels are separate. UI language and document locale are different settings. Translation is explicit future work, not a side effect of a dropdown.

## Interaction modules

`public/interaction.js` owns bounded edit history, IME-aware keyboard decisions and native dialogs with explicit Tab wrapping/focus return. `public/history.js` owns the read-only history workflow. `public/app.js` guards preview responses by generation, content counter and slide id; save responses update the revision but cannot clear later edits. Leave-confirmation handlers are scoped per opening to avoid queued-close races.

## Version 3 handoff fields (S1, 2026-10-19)

The design handoff's SceneSpec, ChartSpec, MotionPlan and StaticState are mapped onto the existing contracts instead of new schemas. Every field is optional; a version 3 document, plan or theme without them validates and renders exactly as before ([byte-identical proof](../../tests/handoff-contracts.test.mjs), [baseline](../../tests/fixtures/visual/render-baseline.json)). Validation lives in [chart semantics](../../src/components/charts/semantics.mjs) and [scene semantics](../../src/design/scene-semantics.mjs). Declarations that no compiler draws yet are refused for HTML with a named code, never dropped from the figure. State: **Implemented** (unit tests only; no browser evidence).

### Semantic document (`presentation-v3`)

| Field | Expected result | Recovery when rejected |
| --- | --- | --- |
| `rules.misreading: "strict"` | Opts the document into the percentage guard: every dataset whose unit is a percentage (`%`, `percent`, `pct`, `百分比`…) must declare `definition.denominator`. | Declare the denominator with `declareChartSemantics()` ([migration](migration.md#opt-into-the-strict-misreading-guards)) or remove `rules`. Nothing is inferred. |
| dataset `version`, `collectedAt`, `validPeriod {from,to}` | Dataset identity. Dates are real calendar days (`YYYY-MM-DD`); `from` is not after `to`. | Correct the date; no date is normalized. |
| dataset `definition {denominator, sample, normalized, betterDirection}` | Field definitions. `datasetSemantics()` resolves absent values to `null`, `null`, `false`, `"none"`. | Only the denominator is ever required, and only under strict rules. |
| dataset `missing[] {seriesId, categoryId, reason, note}` | A reason for a `null`. Needs stable `categoryIds`; one reason per value; the value stays `null`. | Point the reason at an existing null, or restore the null. A reason never replaces a value with zero. |
| dataset `events[] {id, categoryId, label, relation, sourceIds}` | `temporal` events mark adjacency only and their label cannot contain a causal connective (`because`, `caused`, `led to`, `导致`, `因为`…). `attributed` events need at least one source. HTML export answers `CHART_EVENTS_UNIMPLEMENTED` until S4 draws them. | Reword the label, or change the relation to `attributed` and cite the source. |
| series `interval {type, level, method, lower[], upper[]}` | `ci` needs `level` in (0, 100); `sd`, `iqr`, `range` carry none. All intervals in one dataset share type and level. Bounds enclose each value and are `null` exactly where the value is `null`. HTML export answers `CHART_INTERVAL_UNIMPLEMENTED` until S4 adds the dot-interval renderer. | Use one interval type per dataset; split the other series into another dataset. |
| chart `question`, `takeaway` | Plain text; the chart block's own `sourceIds` are its sources. | — |
| chart `axis.scale`, `xAxis.scale` (`linear` default, `log`) | Declared per chart; a dataset-level scale is an unknown field. `log` needs strictly positive values, `extent` or a positive `fixed` range, and no filled marks. HTML export answers `CHART_SCALE_UNIMPLEMENTED` until S4. | Keep `linear`, or fix the range and remove zero/negative values from the dataset you cite. |
| chart `sort` (`author`, `value-desc`, `value-asc`) | Default is `value-desc` for `ranked-bar` and `author` elsewhere. Value sorts apply to ranked bars and stacks with category data only. A non-default sort answers `CHART_SORT_UNIMPLEMENTED` for HTML until S4. | Use the default or a `ranked-bar`. |
| chart `truncation {note}` | Only for `area`, `ranked-bar`, `stacked`, and only when the axis actually excludes zero (`extent`, or `fixed` with `min > 0` / `max < 0`). Without it, filled marks still require a zero baseline. HTML export answers `CHART_TRUNCATION_UNIMPLEMENTED` until S4. | Add the note, or return to `policy: "zero"`. |

### Design plan scene (`design-plan`, passed through to `web-scene`)

| Field | Expected result | Recovery when rejected |
| --- | --- | --- |
| `takeaway {blockId}` | A heading, paragraph, callout, quote or metric block of the same scene carries the takeaway. Locking that block id in `lockedBlockIds` locks the takeaway text. | Reference a block that is in `blockIds` and has a text or metric type. |
| `contentStatus` (`sourced`, `illustrative`, `evidence-required`) | `sourced` requires non-synthetic, sourced datasets, sourced metrics and a sourced takeaway. The other values record intent only. | Mark synthetic material `illustrative`, or add the sources. |
| `keyStates[] {id, position, label}` | Named cue boundaries: `position` 0 is the authored opening (initial series/range, tab and step), `n` is the state after the first `n` cues. | Keep `position ≤ cues.length` and ids unique. |
| `staticState {keyStateId}` | Names the frozen state for static output; `staticInteractionState()` returns the frozen filter/focus selection. Absent means the opening. A position above 0 answers `STATIC_STATE_UNIMPLEMENTED` for HTML until S2 applies it. | Name an existing key state. |
| `motion.trigger: "manual"`, `motion.clock: "cues"`, `motion.reducedMotion` (`instant` default, `static`) | Declarations of the current player: cues advance by replay/next/seek on one deterministic cue clock; reduced motion applies state instantly. `effectiveMotion()` ignores the new keys. `static` needs a `staticState` and answers `REDUCED_MOTION_FALLBACK_UNIMPLEMENTED` for HTML until S2. | Remove the declaration or add the static state. |

### Theme pack tokens (`theme-pack`)

Optional `typography.numeric`, `palette.reference`, `palette.missing`, `spacing.captionGap`, `spacing.sectionGap`, `spacing.safeArea` and `motion.distance`, `motion.easing`, `motion.delay`, `motion.fallback`. `themeTokens(id, locale)` resolves them; `resolveTheme()` is unchanged, so no theme output changes. Defaults are the values the renderer already uses: numeric = the locale body stack, reference = ink, missing = ink, captionGap 14, sectionGap = gap, safeArea = page, distance 4, easing `ease-out`, delay 0, fallback `instant`. No packaged theme declares any of them yet; a declared value is reported under `declared` and is not yet consumed by the renderer.

### Lock categories

No new lock fields were added. The handoff's four categories map onto existing locks: **text** → `authorOverrides.lockedBlockIds` (block content, including the takeaway block); **data** → a locked chart block locks its dataset, including `definition`, `missing`, `events` and intervals; **sources** → sources linked to a locked block or its explanations; **composition** → `sceneLocks.fields: ["composition"]`, alongside `theme`, `interactions`, `cues`, `motion` and `profile`. The [lock test](../../tests/handoff-contracts.test.mjs) exercises each mapping.
