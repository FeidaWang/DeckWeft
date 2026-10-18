# DeckWeft stage presentation

Eight English slides for a three-minute developer demo. The last slide is a Thanks page with exact character crops from the participant-supplied event poster. The deck omits organiser wordmarks and event-company copy. Earlier Melbourne materials remain preserved in their own example directory.

The source scene drives editable PowerPoint, offline HTML and an After Effects construction script. The HTML includes staggered entrances, clickable character motion, reduced motion, a layout explorer, per-slide rehearsal cues and an independent fifty-second demo coach. The PowerPoint fallback stays static and editable. The actual Studio uses the additional Signal preset theme and English `?mode=pitch` view.

## Build

Use the optional bundled document runtime. Install the pinned build-only minifier separately with `npm install --prefix dist/dot-stage-tools --no-audit --no-fund --save-exact esbuild@0.28.2`, then pass `dist/dot-stage-tools/node_modules/.bin/esbuild` as the bundler. That explicit installation needs the registry. Subsequent builds use local files. No dependency is added to the core runtime or downloaded at presentation time.

```bash
node docs/examples/dot-stage/build.mjs \
  --runtime-modules /absolute/path/to/bundled/node_modules \
  --python /absolute/path/to/bundled/python3 \
  --presentation-skill /absolute/path/to/presentations/skill \
  --out dist/deckweft-three-stage-reviewed \
  --bundler /absolute/path/to/esbuild
```

Use a fresh output directory on each build. `assets/studio.png` is a real local capture. `dot-*.png` are isolated crops exported from the actual Figma file. No fonts are embedded or redistributed. The full reference poster stays in the source assets for provenance and is not included in the presentation bundle. Preserve the root licence and upstream notices.

## Design and motion tools

The task has an editable Figma design file with native timelines. Its private link belongs in the task handoff, not this distributable source. Eight frames and native keyframes were authored through the Figma tool. Inter was available there. `figma.mjs` records the construction recipe. A closing MP4 export can be supplied to the builder with `--figma-video /absolute/path/to/thanks-figma.mp4`.

The supplied `DeckWeft-Stage.jsx` creates editable text layers, source-image layers and a 180-second master timeline in AE. AE was unavailable during preparation. The JSX is an unverified application handoff, not a completed AEP or proof of AE rendering. Run it with its adjacent assets folder, inspect the new comps and save a new project. The HTML is the working local motion delivery.

Read [rehearsal.en-AU.md](rehearsal.en-AU.md) for the exact spoken script, demo sequence, recovery and questions. Read the separate [agent interface guide](../../en/agent-bridge.md) for the working local queue and its real-host boundary. The interface does not prove that a requested model improves compatibility or that a Dot host is connected.

## Three.js cost and offline behaviour

The optional HTML presentation vendors Three.js 0.186.1 under MIT. Its checked bundle is approximately 538 KiB, or 137 KiB gzip, and is inlined into the HTML. It adds a perspective slide stack, raycast selection, pointer parallax and physical Dot movement. The editable text remains in the DOM and PPTX. There are no CDN requests. WebGL failure, the 3D toggle and reduced-motion preference retain the 2D presentation. The core Studio and plugin runtime still have no external package dependency.

The build uses esbuild 0.28.2 (MIT), installed separately as an authoring tool. It is not shipped. The pinned Three.js source modules and licence live in `vendor`; only the required renderer bundle is delivered. Record exact bytes and SHA-256 from `.build/three-packaging.json` after each build. Do not remove `LICENSE.three` from the output.
