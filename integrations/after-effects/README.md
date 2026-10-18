# After Effects: build the layers, then inspect the motion

[中文](README.zh-CN.md) · [Installation](../../docs/en/installation.md)

The `.motion.json` file is an instruction sheet. `DeckWeft-Import.jsx` reads it in the actual After Effects application and builds compositions. It is not an `.aep` file and not a rendered video.

1. In the studio's Design tab, choose None, Soft fade, or Gentle rise. Set the duration, then export **After Effects handoff**.
2. Open After Effects and save any existing work. Run `DeckWeft-Import.jsx` using **File → Scripts → Run Script File** in your installed version.
3. Choose the exported `.motion.json` (up to 24 MB). Canceling the picker changes nothing. For embedded PNG media, choose a local output folder. Cancelling that folder picker also leaves the project unchanged. Media files use new, non-overwriting names; the application may require its normal scripting file-write setting, which you control.
4. Open the new DeckWeft folder and MASTER composition. Inspect native text/shapes, separate PNG footage, font decisions and per-node timing/easing. Layer comments contain source ids and requested/actual fonts; the MASTER comment contains the import map. Use the Cancel button to stop a running import.
5. Render only after this inspection, using your own AE / Media Encoder workflow and appropriate licenses.

The script uses a strict JSON reader, never `eval`. It creates a new folder and does not overwrite existing comps. A cancelled or failed import removes only its tracked new compositions, solids, footage and files, then balances the undo group; pre-existing items are preserved. No file-network permission is needed for remote requests because this importer does not make remote requests.

Motion is intentionally modest: an optional short opacity entrance and an optional 18-pixel upward entrance for text. It does not include elaborate camera moves, audio, editable 3D, charts, or generated video. Spatial scenes use native static fallback shapes; temporal handoffs name source nodes, start/end seconds and ease influence 65. PowerPoint export remains static.

**Status:** strict parsing, temporal validation, picker cancellation, item/media rollback and ES3 report serialization tested locally in mocks; After Effects itself is not available in the build environment. Real app execution, text bounds, fonts, easing, and rendering remain release gates. See the [official Adobe scripting instructions](https://helpx.adobe.com/after-effects/using/scripts.html).
