# Asset direction, original sources and protected crops

[简体中文](../zh-CN/assets.md) · [Visual Studio](visual-studio.md) · [VIS-007 evidence](../evidence/vis-007/review.md)

## Open the local example

1. Run `npm run studio:assets` with Node.js 22 or newer.
2. Open the printed address (it ends in `?scene=violet`). The isolated library is `dist/visual-assets/library`; your usual library is separate.
3. Choose the English or Chinese example, open **Design**, and find **Asset direction & protected subject**. Expect an original authored synthetic fixture, explicitly labelled as non-documentary.
4. Use **Inspect original & crop candidates**. The orange outline is the author-marked protected region; the circle is the focal point. No automatic subject detection runs.
5. Compare portrait, square and wide options. Apply a passing crop, inspect the main preview, then save. Use **Contain complete image in 16:9** to retain every original pixel in the frame.
6. Press `Ctrl+C` in the terminal to stop the local servers.

## Describe a named image slot

1. Select the image binding. A page may have multiple named slots.
2. Set a unique slot name and choose photo, product screenshot, illustration/concept, or background.
3. Set the minimum visible source width/height in pixels. These are source-resolution requirements, not a command to upscale or resample.
4. Mark the focal point and protected rectangle using normalized original-image coordinates. For EXIF-rotated inputs, coordinates refer to the correctly oriented native image. Include every important label, face or object in the protected rectangle. Unprotected image areas may be cropped.
5. Choose a display mode and **Apply direction**. A crop that excludes the newly protected area fails; explicitly choose complete-image display, apply it, and inspect crop candidates again.
6. For factual photos/screenshots, declare original origin at import, select a document source reference, then enable **Factual source evidence**. Generated/unclassified assets cannot satisfy this slot. A declared origin records the author's statement; it is not independent verification that a photograph or screenshot is true.

The current crop is retained when an old image first becomes a slot; it supplies the initial protected region. Inspect and mark the actual subject deliberately. Author image locks also protect that image's crop/slot decisions. Scene crop or image-slot locks block direction and replacement actions. Unlock explicitly before editing. Theme/composition locks retain their existing scope.

## Import an original PNG, JPEG or static WebP

1. Select a page or image slot and choose **Import PNG / JPEG / WebP original**.
2. Choose a file up to 1.3 MB. Supply declared origin, provenance, license, allowed use, alternative text and fallback description. Keep generated concepts labelled as generated.
3. Optionally choose a local lossy JPEG or WebP web derivative. PNG fidelity is the default. Browser decoding/conversion occurs entirely on this computer, retains the full oriented dimensions and rejects a derivative with excessive measured pixel differences. JPEG is refused when it would remove transparency.
4. Choose **Preserve and attach to this slot**. Expect the family, theme, captions, datasets, sources, author choices and other scenes to remain. A page without an image gets a named slot without automatically changing its composition. Replacing a shared image creates a dedicated binding for the chosen scene.
5. Inspect the new subject and update its protected region deliberately. Save and reload; expect the slot and asset records to remain.
6. Use **Download unchanged original**. The downloaded bytes match the original file, including its retained original metadata. File names are generic; content identity is the recorded SHA-256 hash.

Each source/encoded upload must fit the 1.3 MB request limit. The complete native PNG keeps the original oriented dimensions and must fit the same limit; conversion never silently shrinks it to pass. If it is too large, use a smaller source deliberately. The original already uploaded remains local; no project binding is committed on failure. The older **Use a local PNG** path remains for legacy scenes without typed slots.

The server validates image containers, dimensions, orientations and hashes. Native pixel equivalence is browser-derived, not an independent server decoder certification. Source JPEG/WebP bytes stay immutable under `visual/asset-originals/`; the native target-compatible PNG stays under `visual/assets/`. A lossy web derivative records its original source hash, method and dimensions. Screenshots and factual slots use native PNG; other slots may use a smaller available derivative. Missing or modified original/native/derivative files block use instead of falling back to a remote URL. Repeated imports reuse identical files and hashes; conflicting rights/source manifests are refused instead of silently replacing attribution.

## Extract images from an existing document

1. Choose **Find images in saved local decks**.
2. Pick a registered image from a saved v2 or v3 project in this library. The list contains local document images only; it does not parse arbitrary PPTX/PDF files or fetch linked URLs.
3. Choose **Extract and attach — preserve source**.
4. Inspect the target page. Expect the original source document and files to remain unchanged; the target selection records the source project id, revision, project hash and asset id. Provenance/license/allowed use and any original/derivative chain are copied intact.
5. If extraction reports a missing file, hash change or conflicting rights, restore the matching source or resolve the conflicting record explicitly. Do not relabel a generated image as historical evidence.

**Reuse an existing asset** uses a current-document manifest without generation. If an image-generation backend is unavailable, Studio reports that fact. **Choose text-led alternative** is a deliberate composition choice: it preserves every existing semantic block and author lock. No generation request, retry, charge, API-key lookup or external provider is triggered by these controls. The older opted-in v2 host job journal remains a separate workflow.

## Save and recover

Save uses the existing revision check. If another window saved first, retain the unsaved window or export its JSON, then review the newer revision. **History → Restore as a new copy** retains earlier asset/slot records without overwriting the current project. Image files are content-addressed and retained for recovery; this batch adds no pruning or automatic cleanup policy.

`npm run verify` includes strict-contract, crop, format, source-copy, hash, lock and history tests. The optional `tests/browser_assets.mjs` requires an isolated testing browser outside `/Applications` and an external Playwright QA tool; these are not runtime dependencies. [Actual results, screenshots and limits](../evidence/vis-007/review.md).
