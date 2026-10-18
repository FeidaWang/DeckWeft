# VIS-009 local semantic interaction review — 2026-10-18

[Manual](../../en/interactions.md) · [简体中文说明](../../zh-CN/interactions.md) · [Machine evidence](review.json) · [Verification](verify.txt) · [Browser log](browser-log.txt)

This is evidence for local offline semantic web behavior, not native v3 PowerPoint/Figma/AE or authenticated-host acceptance. The work extends the existing VIS-002–008 workspace and retains its original content, assets, source references and history model.

## Source and behavior

Author interaction definitions and cue order live in the closed DesignPlan contract and source-bound derived WebScenes. Explanatory labels/text/source references live once in the semantic document's `explanations` collection; plans reference them by stable `explanationId`. Content, design, derived state, rendering, resource ownership and local storage remain separate. Audience state never writes back to project data.

The pure timeline supports lifecycle entry/exit, chart `data.filter`, image `tab.select`, diagram/code steps and `annotation.reveal`. Chart selections genuinely rebuild geometry, labels, palettes and the selected table while retaining a complete original table. Removed marks keep their source identity in that table; annotation links never select another point by position. Single-category, negative/zero/null, datetime and numeric scatter data retain exact original values. Images change between actual authored crops; hotspots use original-image coordinates, with explicit crop/contain validation. Step views contain supplied directed relationships or exact referenced code lines, plus authored semantic explanations. Complete original code and source anchors remain intact.

Replay resets and plays a finite authored cue sequence at one-second boundaries. Pause, Next cue and keyboard/pointer seek derive deterministic prefixes from authored initial state. Manual exploration is marked separately. OS reduction and author-global Off remove visual animation while retaining content and cue operations. Scene/visibility/pagehide lifecycle stops finite timers/animations, pauses any media and invokes registered resource cleanup. V3 allocates no WebGL renderer or remote media stream; the disposal hook does not certify a native spatial host.

## Validation and actual image review

The machine record lists exact final counts, screenshots, hashes and regressions. Real isolated Chromium checks cover both languages and three themes, native mouse/keyboard/touch actions, source-preserving data/DOM changes, fixed CSP and no-JavaScript reading, replay/seek/pause/completion, local configuration/content editing and save/reload, independent locks, conflicts, history restore-as-copy and scene movement. Three complete candidates per story are measured, including current DOM/SVG geometry and effective text size.

Actual component/interaction contact sheets, complete-story contact sheets/full screenshots, selected chart/code/image/hotspot views and editor captures are supplied as image input and inspected. Screenshot capture settles finite motion rather than recording an arbitrary mid-fade frame. Raw HTML/PNG artifacts are reproducible under `dist/visual-interactions/acceptance/`; selected captures and the final browser receipt are retained here. This is bounded representative state coverage, not exhaustive graph routing or every possible filter combination.

Ordinary Playwright applies focus emulation. An independent driver process and cached testing browser with a temporary profile and `connectOverCDP({noDefaults:true})` supplies a genuine native foreground/background tab probe. No installed browser bundle, personal profile or browser policy is changed. The native probe runs in its own process and requests the actual loopback preview without content routing; this avoids cross-driver focus/interception state. Actual visibility, timer/resource cleanup and return-to-foreground state are recorded, rather than represented by a synthetic DOM event.

V1/v2 remain explicit existing paths. [Legacy comparison](legacy-scene-comparison.json) records unchanged SVG geometry for both six-page language demos. Their HTML bytes intentionally change because the fixed offline player now suspends scene resources and its clock interval when hidden/idle; no legacy input project is silently migrated. [Actual legacy player checks](legacy-browser.json) also executed both six-page editions: idle clock intervals stay at zero, explicit timing allocates one native interval, pausing clears it, keyboard navigation and reduced motion work, and returning to reading remains operational.

## Observed failures and repairs

1. Applying a different pack to the pack-specific `photo-split` benchmark correctly failed its contract. The new authored interaction story uses a reusable image family; no current saved project was coerced. [Contract failure](initial-contract-failure.json).
2. The original hotspot layout left no feasible candidate, and initial interactive chart/diagram controls exceeded presentation budgets. Display widths, compact controls and row spacing now retain the source crop/text while recovering feasible layouts. [Layout failure](initial-layout-failure.json) · [Early hotspot capture](initial-hotspot.png).
3. Chinese process candidates initially measured 911px/902px. Tightening gaps rather than deleting text restores the bounded presentation budget while preserving three geometries and reading paths.
4. The first editor test tried to fill a closed disclosure. It now opens the actual author panel before editing. The user flow remains a normal explicit disclosure.
5. The first background probe timed out because the testing harness's focus emulation masked native visibility. An isolated temporary-profile native browser and documented no-default-overrides CDP connection now test real tab visibility. [Earlier probe](background-probe-failure.json).
6. Keyboard probing found the macOS test browser's native closed select did not commit ArrowDown. Explicit bounded ArrowUp/Down/Home/End handling now dispatches the same validated semantic filter action; invalid range/empty-series attempts restore the prior view.
7. Source measurement originally rebuilt a chart disclosure and could lose focused SVG/summary nodes or repeat live announcements. It now preserves disclosure/focus/exploration and suppresses temporary measurement announcements while checking author state. Audience filtering cannot replace a source receipt with a smaller view.
8. Same-document scene hash navigation initially left the previous scene visible. Stable scene hash changes now update actual active state and resource ownership. Derived control/anchor namespaces are reserved and interaction panels use a distinct identity namespace.
9. Review moved explanatory facts out of the scene plan into semantic content, so changing an explanation updates every referenced view without maintaining duplicate facts. Independent theme/composition and interaction locks also retain each other.

## Reproduce and boundaries

```sh
npm run verify
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_PATH=/isolated/testing/browser node tests/browser_interactions.mjs
npm run studio:interactions
```

The browser harness refuses installed binaries under `/Applications` and uses temporary profiles. Its headed visibility probe uses an isolated cached binary, a loopback-only debugging port, and no personal default browser. No runtime dependency, remote service, automatic image request, subscription/billing inference, telemetry or publishing/push action is added. Offline HTML embeds fixed code, inert escaped data and original local image resources; no whole slide is rasterized.

Native v3 target compilers remain explicitly unsupported. Other engines, actual screen-reader/IME/200% zoom, arbitrary state/label-collision coverage, remote CI and broader release/host acceptance remain open. Code line references are authored source numbers; editing/reordering source lines requires explicitly updating those references. Playback is cue-boundary sequencing, not a frame-accurate video editor. Application availability for this revision is recorded in the machine review.
