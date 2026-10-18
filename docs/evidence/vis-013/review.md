# VIS-013 — prompt-first workbench, 2026-10-18

**Implemented locally in the existing Visual Studio.** Claude login/live remains deferred. This is actual local UI and Codex CLI evidence, not native desktop/plugin or VIS-014 release certification.

[Machine review](review.json) · [Final source fingerprints](source-manifest.json) · [Verification](verify.txt) · [Manual](../../en/workbench.md)

## What changed

The workbench reuses the existing semantic editor, visual project store, seven task tools, host adapters, derived renderer and quality receipts. Focused prompt/profile/revision/workbench browser modules provide prompt or local Markdown generation, saved-source selection, audience preview, scoped revisions and an actual-image gallery. The existing advanced editor stays available. The classic Studio links to this workbench.

Interface, prompt and output languages, content tone, visual style, color/image preferences and update intent are separate typed choices. A scene profile is a versioned-plan optional field used by the same compiler/exporter; it does not replace the project profile. Named scoped styles are explicit local operations, not a provider fallback. Existing source words/data and author theme/composition/image locks survive. Original supplied text is retained separately in the durable checkpoint, including when an operation fails before a task is produced.

Capture is an explicit local capability. `--capture-browser` accepts an isolated executable outside `/Applications`, with a fresh temporary profile. Node's built-in WebSocket speaks CDP; no runtime package was added. The captured artifact is served on loopback with its existing offline CSP. Actual PNG bytes at 1440/390px, font-ready observations and native image/chart/diagram views enter the existing quality receipt. Missing real interaction traces still block interactive artifacts; no synthetic action coverage was added.

Final HTML still needs a current source/renderer/state-bound machine pass and actual image judgment. Codex receives every required image and supplies hash-matching findings. Local authors can instead open the native gallery and explicitly attest their own visual judgment. A loaded file is not automatically reviewed. Changed image bytes, stale project revisions and failed attempts block current export. The old measured-preview route also refuses a workbench project if its client metadata is stripped.

Automatic composition repair is committed through the normal project revision writer, then captured and reviewed again for that exact saved envelope. The cumulative budget is retained; receipts are never manually rebound to another revision. A synthetic controller regression covers this transition separately from real browser evidence.

Durable asynchronous jobs expose progress and recovery without automatic model retries. Sequence checks and saved-project revision checks reject stale operations. Cancellation stops host/capture work; synchronization of newer saved source is explicit and preserves the cumulative repair budget and last accepted artifact. A failed candidate cannot be promoted by downloading the previous artifact: that action is labelled **Last accepted HTML**.

## Actual checks

- `npm run verify`: **323 passed, 0 failed, 0 skipped**, type/negative fixtures, source/link checks, reproducible package and all demos; Node v24.14.0, macOS arm64. [Log](verify.txt).
- Eleven workbench unit regressions cover typed independent settings, scoped profile effects, author locks, missing-browser review boundaries, stale sequences/source revisions, explicit sync, cancellation and original-source retention. These tests do not claim actual model image review.
- [Existing Visual Studio regression](studio-browser.json): **22 checks, 31 captures**, with actual source editing, locks, save/conflict/history and browser-measured legacy export behavior retained.
- [Prompt/source UI generation](generation-browser.json): local Markdown becomes a complete four-page preview without manual layout edits, actual screenshots stop at the explicit review boundary, and **Watch preview** opens audience navigation without editor controls. Interface/output/source languages remain independent.
- [Before](before.json) and [after](after.json): the real UI adopts a rich six-family supplied source; Codex actually reviews eight screenshot files, applies a different page-4 composition, receives new screenshots, reviews again and permits a changed HTML export. The semantic document, exact datasets, assets and every other scene stay equal. [Hash-only host receipts](host-receipts.json).
- [Failure recovery](recovery.json): a real later patch against the locked chapter is refused, current export stays blocked, and explicit last-accepted HTML matches the accepted file byte for byte. Public references remain in HTML; a private speaker-note sentinel and editor chrome do not.

Build artifacts remain under `dist/vis013-final/` (reviewed before/after HTML), with earlier bounded attempts retained in their own `dist/vis013-*` folders. No source was pushed or published.

## Visual inspection and observed failures

The primary reviewer actually viewed complete desktop/mobile stories and native chart/diagram screenshots, the earlier eight-image author-review gallery, and desktop/mobile Chinese/English UI captures. Tall stories were downscaled; native component views were also inspected. Both exact chart series, all six periods, separated shared 18 labels and 78/45 endpoints are visible. The mobile workflow fits all three nodes and arrowheads. A separate [on-screen mobile canvas capture](workbench-mobile-viewport.png) confirms the iframe paints correctly; offscreen full-page screenshot culling is not counted as a blank-product failure. The final wide shell places the prompt and preview side by side; small screens stack them and retain native responsive preview width selection.

The desktop process connectors remain circuitous, and the metric page has excess lower whitespace. Actual Codex warnings remain in its findings; neither is relabelled as perfect release quality. The synthetic fixture is not the frozen coherent VIS-014 gallery.

Earlier QA exposed a preview button enabled before its render ticket, a harness waiting for literal `running` while UI displayed **Working**, and nested iframe scrolling after the new prompt panel moved the canvas. The button now waits for measured preview readiness; the harness waits for real progress and scrolls the outer frame before a native mouse action. Wide-screen prompt/preview placement was improved and the complete 22-check editor suite was rerun. These failures are retained separately from final passing evidence. A later post-patch Codex response failed strict image finding validation and was correctly held without export. A separately initiated UI capture/review [resumed successfully](explicit-resume.txt); no gate was relaxed and no automatic model retry or fallback was introduced.

A deliberately sparse host-drafted workshop was held at `scoped-visual-diagnostic`: actual image feedback found vague instructions and weak story rhythm despite machine fit. Its failure is retained; the image gate was not weakened and no extra model fallback or invented evidence was used. Local supplied-text planning preserves those words rather than silently adding facts. The [richer supplied-source drafting run](host-generation.json) actually passed structured Codex drafting, exact source-line retention and image review. Its own receipt records its earlier renderer basis; it is not silently rebound to the later task-loop persistence change.

## Boundaries

Claude was neither logged in nor invoked. Existing host settings were retained; independently confirmed model/billing remain unknown. No browser app bundle or personal profile was modified. PowerPoint, Keynote and Figma were present but not opened; After Effects was not found under `/Applications` and was not run. Windows execution, other engines, actual screen readers/IME/zoom, native v3 export applications, remote CI and the VIS-014 release gallery remain open.
