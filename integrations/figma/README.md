# Figma: turn the recipe into editable layers

[中文](README.zh-CN.md) · [Installation](../../docs/en/installation.md)

This importer creates text, basic shape layers and individual embedded PNG fills from the same scenes used by the studio. It does **not** flatten the slide into a screenshot. It also does not claim to create a full auto-layout component library or a synchronized design system.

1. Export **Figma handoff** from the studio, or run `node bin/deckweft.mjs export examples/welcome.deck.json --format figma --out welcome.figma.json` from the repository root.
2. In Figma's development-plugin workflow, create a new local plugin with a UI. Keep the **id assigned by Figma**. Do not invent one.
3. Use `manifest.template.json` as the settings template, adding the real assigned id. Save it as `manifest.json` beside this folder's `code.js` and `ui.html`. The manifest requests dynamic-page access and no network domains.
4. Import that manifest through the desktop development-plugin interface. Open a writable Design file, run the importer, and select your exported `.figma.json`.
5. Missing fonts stop the import by default. Install them or explicitly check the Inter-substitution option, then inspect every frame at normal scale. Check wrapping, layering and independent image fills. Save the import report to review requested/actual fonts and source-to-node ids. Figma images must be at most 4096 pixels per side.
6. Use Cancel to stop an import. A cancelled/failed run removes its newly created layers and frames; existing content remains. Fixed scene positions are preserved; interactions and 3D use declared static fallbacks.

The importer places new frames to the right of existing content. On a failed import, it removes only frames it created in that run. It does not replace existing content, publish a library or change account permissions. This plugin makes no network requests; Figma itself may save the imported document/media through its ordinary cloud workflow when you explicitly run it.

**Status:** media/font/source-map and cancellation/rollback checks pass in a local mock. Figma desktop was opened on 2026-10-18, but plugin registration/import could not be completed; the plugin menu remained loading and application screenshots became unavailable. No assigned plugin identity was fabricated. Real Figma acceptance remains required. Follow the [official manifest reference](https://developers.figma.com/docs/plugins/manifest/) when registering the plugin.
