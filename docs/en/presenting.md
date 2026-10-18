# Present with a private script

[简体中文](../zh-CN/presenting.md) · [Manual](manual.md) · [Build evidence](../evidence/mb-01-05/review.md)

## Open the two surfaces

1. Open a deck in Studio. Add the full explanation in **Content → Notes for the speaker**. Keep the visible slide concise.
2. Wait for **Browser-measured · ready to export**, then select **Present**.
3. Expected: the private presenter shows the current slide, next slide and script. A separate audience popup opens. In hosts that use tabs, it may open as a separate tab.
4. Share only the audience window/tab, or move it to an extended display. Mirroring or sharing your whole desktop can expose the presenter. A webpage cannot hide another window from desktop sharing.

If the popup is blocked or closed, use **Open audience window**. Refreshing the audience window reconnects using its tab-local read-only capability. Closing the presenter clears its public slide when the audience next polls. A server restart requires a new presentation/link. If abandoned sessions reach the four-session limit after repeated crashes, stop and restart your local Studio; this discards in-memory sessions, not saved projects.

The audience server runs on a different loopback port. It has no editor session or project API. The audience receives only the public derived SVG, title, locale, page position and effective motion preference. Speaker notes, private source annotations, brief, full project JSON and editor credentials are not sent to it. The original deck and script remain on the private editor origin. This is not a guarantee against a hostile process already running as your user.

## Read and rehearse

1. Select **Start script**. Expected: the highlight and following scroll advance at the estimated pace. Slides advance only when you choose **Next**.
2. Use **Pause script** to stop the script clock. Use **Resume script** to continue. **Restart slide script** resets only the current slide's reading position.
3. Scroll or use Page Up/Down inside the script to pause following. Select **Resume following** to follow again. The separate talk timer can continue while you inspect an earlier sentence.
4. Open **Reading options**. Adjust English words/minute and Chinese characters/minute independently, plus the allowance for sentence/paragraph pauses. Mixed text uses both rates. Reading time is not capped by the slide's 2–60 second animation field.
5. Adjust font size or sidebar width. Drag the divider, or focus it and use Left/Right. Choose Left/Right docking. The current text anchor is retained when the sidebar reflows.
6. For calibration, select **Calibrate with this slide**, read the complete script, then finish after at least ten seconds. Expected: a bounded pace estimate based on your timed reading. No microphone or speech recognition is used.

Use the presenter Previous/Next controls, arrows, Page Up/Down, Home/End or Escape outside inputs. Arrow keys in the script and reading inputs keep their usual editing/scrolling jobs. Reading position and controls are stored locally for the same content fingerprint; changing the deck invalidates saved positions. An active presentation is a snapshot. Return to the editor and start a new presentation to include edits.

With reduced motion, the script uses manual scrolling and timed highlighting. Continuous following does not override the viewer's motion preference. If a measurement expired before opening, Studio requests a fresh measurement; wait for readiness and select Present again.

## Choose appearance and motion

1. Open **Settings** on the tool rail, or in the presenter.
2. Choose **System**, **Light** or **Dark**. Expected: editor and presenter controls change; the authored slide palette stays the same. System mode listens for OS appearance changes.
3. Use **Reduce motion** for the shared quick preference. Advanced playback offers System, Full, Reduced and No animation. The OS reduction request remains respected, even if Full was selected.
4. Expected: CSS/Web Animations, local Three.js layers, parallax/replay and presenter following honor the effective policy. Off cancels active animations/loops and leaves static content usable. This is a viewing preference; it does not rewrite authored slide animation settings.

Settings persist locally, synchronize across editor tabs, and do not become project JSON. Keyboard, contrast, screen-reader operation and usable labels are independent requirements; this switch does not certify accessibility compliance.

## Keep public and private exports distinct

Visual exports omit private notes/source annotations by default. In the export dialog, select **Include private speaker notes and source annotations** only for an intentional presenter copy in formats that support notes. **Project JSON always contains the complete private project**, including notes and preserved extensions. It is a backup, not an audience package. Figma does not gain a speaker-notes feature from this switch.

The CLI uses the same default. Create a private copy explicitly:

```bash
node bin/deckweft.mjs export my.deck.json --format pptx --include-notes --out presenter.pptx
```

`npm run demo` creates English and Chinese rehearsal examples under `dist/presenter-demo/`, each with separate audience/presenter HTML and PPTX variants. These are authored product examples, not external research or real-host AI output.

## Development type pilot

The current runtime still starts directly with Node 22+ and no dependency installation. Development checks require `npm ci`, then `npm run verify`. The sole development package is pinned TypeScript 5.9.3 (Apache-2.0): its downloaded archive measured 4,377,468 bytes and unpacked contents 23,625,066 bytes. It is not copied into the runtime or plugin; runtime dependency cost is zero.

`npm run types` derives Project declarations from the unchanged schema, checks the speech/preferences/clock slice and browser action registry, rejects seven negative contract fixtures, emits JavaScript/declarations/maps into `dist/runtime`, and exercises the emitted modules. The local pilot took roughly 0.4–0.7 seconds in early runs; current run data is in `dist/types/verification.json`. This is a bounded type/build pilot, not a claim that the entire server, UI and exporters have migrated to TypeScript. The JavaScript launcher and copied plugin remain offline-capable. The generated pilot manifest is `dist/runtime/build-manifest.json`.
