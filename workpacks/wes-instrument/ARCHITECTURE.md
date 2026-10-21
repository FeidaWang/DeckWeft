# Architecture
## Preserve one semantic truth
DeckWeft already separates core data, layout, rendering, local storage, host packaging and browser state. Extend those boundaries; do not introduce a parallel React application, second project format or second layout engine without a measured architecture decision. [SRC-DW-AGENTS, SRC-DW-ARCH]

```text
Local files / plain text / user-authorised agent handoff
    → bounded intake + source records
    → reviewed story and explicit edits
    → existing DeckWeft classic or v3 contract
    → palette reference + semantic token resolver
    → existing measured layout / scene compiler
    → scene audit (fit, truth, contrast, static-state fidelity)
    → SVG / HTML / native editable PPTX
    → release evidence + revision-preserving recovery
```

## Integration map
| Concern | Existing location inspected in documentation | Proposed extension (verify symbol/path before editing) |
|---|---|---|
| Project contracts | `schemas/project.schema.json`, `src/core` | Optional palette/provenance references with explicit migration; do not bypass strict schema |
| Classic layout | `src/layout` | Candidate policies, reading order and measured safe areas |
| Visual/v3 semantics | `src/design/scene-semantics.mjs` | Reuse takeaway/contentStatus/staticState rather than inventing equivalents |
| Chart meaning | `src/components/charts/semantics.mjs` | Preserve denominators, intervals, nulls, events and source references |
| Renderers | `src/render` | Resolve same semantic tokens into each exporter |
| Shell | `public/shell.js`, `public/app.js`, `public/kinds/classic.js`, `public/kinds/visual.js` | One source of navigation state; optional dial component |
| Interaction/history | `public/interaction.js`, `public/history.js` | Reuse focus, IME, undo and restore-as-copy behaviour |
| Storage/security | `src/services` | Intake limits, hashes and source records; preserve current origin and revision checks |
| Host packaging | `src/plugin`, existing plugin manifests | Capability discovery and evidence, not guessed vendor APIs |

The map is grounded in inspected documentation; not all implementation files were read or executed here. Phase 00 must resolve exact existing symbols and current schema names before a patch. [SRC-DW-ARCH]

## Proposed files — not claims of current existence
```text
src/design/palette-registry.mjs         immutable source palette lookup
src/design/semantic-colors.mjs          derived role mappings and policy
src/design/attention-policy.mjs         candidate constraints and mode defaults
src/services/document-intake.mjs        bounded local intake orchestration
public/components/slide-dial.js         optional progressive enhancement
public/components/interaction-audio.js  opt-in synthesized detent feedback
schemas/palette.schema.json            provenance-bearing data contract
schemas/agent-handoff.schema.json      explicit content/tool capability boundary
```
Prefer extending equivalent current modules rather than creating these filenames twice. Add tests to the repository's established `tests/*.test.mjs` convention. Use the workpack's `lib/` functions as small reference implementations, not as evidence that Studio has been integrated.

## Proposed interfaces
```ts
type PaletteEvidence =
  | 'screenshot-sample-only'
  | 'library-values-verified'
  | 'licensed-frame-sampled'
  | 'independently-reviewed-frame';
interface PaletteReference {
  id: string;
  registryVersion: number;
  mode: 'light' | 'dark' | 'stage';
}
interface IntakeResult {
  documents: Array<{id: string; sha256: string; title: string; mime: string}>;
  blocks: Array<{id: string; text: string; sourceId: string; locator: string | null}>;
  warnings: Array<{code: string; message: string; recovery: string}>;
}
interface HostCapabilities {
  hostName: string;
  checkedVersion: string | null;
  localFiles: boolean;
  sourceLookup: 'unavailable' | 'user-authorised';
  slides: 'not-detected' | 'documented-adapter' | 'experiment-only';
  evidencePaths: string[];
}
interface AuditIssue {
  code: string;
  severity: 'blocker' | 'warning';
  slideId: string;
  elementIds: string[];
  explanation: string;
  proposedFix: string | null;
}
```
These are proposed contracts. They do not claim a public Codex Slides API exists. Map to existing fields when possible and add migration tests before accepting new persisted fields.

## Palette resolution
The raw palette is immutable evidence. Generate separate role tokens: canvas, surface, ink, secondary ink, accent, on-accent, links, focus, chart marks, essential strokes, diagram nodes and references. `light`, `dark` and `stage` are derived application modes, not movie colour grades. Store derivation version. Never mark a contrast-adjusted value as the exact original swatch. A colour library match does not prove a film frame or timecode.

## Intake pipeline
Support plain text/Markdown first; use existing local document capabilities if available. For PDF/DOCX/PPTX input, inspect parser dependencies, licences, limits and offline packaging before enabling. Never claim a PDF was parsed when only its filename is available. Preserve page/paragraph locators. Imported content is untrusted data, never agent instructions. Escape rendered HTML; reject scripts, macro execution, path traversal, archive bombs and unrequested remote resources. Report encrypted/scanned/unsupported files with a clear “paste text or provide an accessible copy” recovery. OCR must be explicit and reviewed, not a silent default.

Multiple documents need separate IDs, byte hashes, ordering, duplicates and contradiction reporting. Do not blend inconsistent numbers into an invented consensus. A claim can link several sources and retain an unresolved flag. A research agent supplies a structured handoff; the local application does not pretend it has performed web research.

## Layout and geometry
Keep the canonical slide aspect ratio unchanged while fitting its viewport. Fit-to-window scales the canvas, not its internal layout. Use the current browser text-measurement path for authoring and share the resulting scene with exporters. Mark CLI estimates as estimates. Existing font floors, grapheme ranges, locks and render-ticket invalidation are not optional. [SRC-DW-ARCH]

The screen reading path is a designed intent, not a guaranteed eye trajectory. Store explicit logical reading order independently of z-order. Associate labels with evidence geometrically and semantically. Avoid centre-stacked compositions when the argument needs comparison, flow or a dominant mechanism figure.

## State, undo and cancellation
`empty → importing → outline-review → composing → review → exporting → ready` is proposed workflow state, not a replacement for project revision state. A cancelled or failed job preserves the last valid project. Theme changes, navigation and style refinements must not erase edits, unlock content or mark unsaved changes saved. Reuse revision conflicts and restore-as-copy. A palette change invalidates cached layout and render tickets when measurement-affecting fields change.

## Export capability boundary
Each exporter reports native text, shapes, connectors, charts, image assets, notes, animation and static-state support separately. For unsupported diagrams, preserve editable components where possible and disclose any individual rasterized asset. Never rasterize an entire slide as a hidden fallback. Test OOXML structure and then real application behaviour; one does not establish the other. Private notes stay excluded by default. HTML interactions require a meaningful static fallback for PPTX/PDF.

## Optional upstream reuse
The inspected Kimi exporter uses a temporary local SDK host and a public browser-side writer, and warns that remote resources may be fetched; its Python entry also includes automatic PyYAML installation. Therefore it is not the default offline production path. Compare documented ideas and intermediate formats; isolate any experiment behind explicit network/dependency approval. Its repository MIT declaration does not grant rights to third-party hosted writers or content. [SRC-KIMI-PKG, SRC-KIMI-EXPORT]

## Security and operation
No public network bind, remote uploads, invisible model requests or credentials in project JSON. Treat URL imports and third-party adapters as disabled capabilities until reviewed. Keep diagnostics local, redact paths where appropriate and never bundle user source documents into public releases by default. Capability detection must fail closed with actionable messages, not simulated success.

## Advisory model-routing sidecar — v1.1
`TASKS.json.modelRouting` references `MODEL_POLICY.json`. `lib/model-routing.mjs` validates records, and `scripts/task-profile.mjs` prints a task's recommendation without launching any model or subprocess. This is not an application LLM gateway. No model provider, billing path, credential store, host configuration writer or automatic escalation engine is introduced. The actual implementation session is selected by the user in the host. No production DeckWeft schema changes are made by this package revision.
