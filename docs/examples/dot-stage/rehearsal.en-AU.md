# DeckWeft: three-minute rehearsal

Everything on stage is in English. The main HTML edition includes a locally bundled Three.js layer. Use the eight-slide pitch, ending with **Thanks**. The technical questions stay in this guide instead of following the closing slide.

## Start here

1. Open `deckweft-stage.html`. Move the pointer to see parallax, and click the paper stack on slides 1, 3 or 6 to fan the actual layouts. The **3D on** button switches back to 2D. Expected: eight slides, timed rehearsal controls and an animated closing page. Use this for motion. The PPTX is an editable static fallback.
2. Select **Rehearse this slide** to read each page's natural spoken script and delivery cue. Close the cues before projecting. They appear on the same screen.
3. Select **Practise the 50s demo**, then **Start demo timer**. The coach shows one action and one line at a time. **Next cue** jumps to the next action. **Reset demo** starts the exercise again.
4. Use **Explore layouts** while practising, outside the timed pitch. These are actual core scene previews, with CLI text estimates. The real Studio performs browser measurement.
5. On the last page, click a Dot or press Space for a short wave. **Reduce motion** stops entrance and character movement. The system's reduced-motion preference also applies.

The Dot characters come from the supplied event reference. Figma crops keep the original appearance and colours. The slides contain no organiser wordmarks or event-company copy. The Figma file uses Inter. The local PPTX uses Arial. Fonts remain unembedded.

## The order

| Time | Slide | Your job |
| --- | --- | --- |
| 0:00–0:15 | DeckWeft | Greet the room. Name the useful outcome. |
| 0:15–0:35 | A working demo, a rough story | Explain one familiar newcomer task. |
| 0:35–0:55 | One outline, four arrangements | Explain the current workflow. |
| 0:55–1:45 | One clear change | Run the real Studio demo. |
| 1:45–2:10 | How it works, simply | Explain the notes, layout desk and takeaway. |
| 2:10–2:30 | One scene, editable outputs | Give developers the architecture. |
| 2:30–2:45 | Optional help, with review | Explain the optional bridge honestly. |
| 2:45–3:00 | Thanks | Make one invitation, then stop. |

The pitch timer does not advance slides automatically. Keep the audience in control of your pacing. The closing animation plays on entry, rather than throughout the explanation.

## Before the live demo

Run from the repository root:

```bash
node bin/deckweft.mjs studio --port 4190 --home dist/deckweft-three-stage-reviewed/rehearsal-library
```

Open `http://127.0.0.1:4190/?mode=pitch`. Expected: English controls, an English project list and no language-switch button. The Chinese edition remains available in the normal Studio without deleting or translating those projects.

If the prepared project is absent, import `stage-demo.deck.json` through **Import JSON / outline**. This is a file picker. Select the JSON file. Do not expect a paste dialog. Select slide 1, whose headline is “Our build is ready”. Choose Signal in the Design tab if needed. Return to Content.

Before projecting, practise at the actual display resolution. At narrow widths the **Slides** and **Edit** buttons open drawers. The timed plan assumes the title field and layout choices are readily accessible. Use the wide Studio window for the live slot.

## The fifty-second sequence

| Time | Action | Say |
| --- | --- | --- |
| 0–5s | Switch to Studio and select slide 1. | Here is a rough outline with three simple points. |
| 5–15s | Change the headline to “Our build is ready to share”. | I can change the headline right here. |
| 15–25s | Choose **Evidence grid**. Wait for **Browser-measured**. | Then I can try a different arrangement without rewriting the content. |
| 25–33s | Save. Check **Saved on this computer**. | The words stay intact, and I can save the result locally. |
| 33–43s | Choose **Export**, then **PowerPoint**. | The PowerPoint export contains editable text and shapes. |
| 43–50s | Return to pitch slide 5. | That is the workflow. Here is what happens underneath. |

Use the layout's name, rather than a thumbnail number: ranking can change with the text. Do not double-click while text measurement is pending. Do not open a destination presentation app during these fifty seconds. Keep the already exported file ready for questions afterwards.

If an export is blocked, say: “The fit check has caught a problem. I can shorten the text or choose another layout before exporting.” This demonstrates the boundary honestly. If a browser or app stalls for five seconds, switch back to slide 4: “This is the actual Studio screenshot. The workflow is the same: edit, arrange and export.” Continue to slide 5. Do not pretend the screenshot is a live result.

## Three practice rounds

1. **Actions only.** Complete the six steps without speaking. Aim to return by 43 seconds, leaving a buffer. Reset the headline afterwards.
2. **Actions with the six lines.** Say each line while its action is happening. Pause while the browser measures text. Aim for 45–50 seconds.
3. **The full pitch.** Start the three-minute timer. Speak each page's script once. Return from the real app by 1:45. Stop at Thanks by 3:00. If you run late, shorten explanation rather than clicking faster.

After a round, record the observed time and the step that caused hesitation. Ask a willing peer to describe the product back to you. If they think the layout engine itself is a generative model, use the distinction below.

| Round | Observed total | Demo duration | One change for the next round |
| --- | --- | --- | --- |
| Actions only | | | |
| Spoken demo | | | |
| Full pitch | | | |

These are blank rehearsal records. No live rehearsal or audience understanding is claimed until you complete them.

## The ELI5 version

Each idea is a paper note. The layout engine is a tidy desk that tries four ways to arrange those notes. A scene is a placement map. An exporter packs that arrangement into a file you can keep editing. The browser checks whether the words fit.

The optional agent can draft content. The core layout and export engine still use explicit rules. A requested model name does not prove which model a host actually used. The bridge displays the host's reported model rather than claiming to verify it.

## Questions from developers

**What is the contract?** Schema version 1 project JSON. Current projects validate strictly. Signal is an additional supported theme. The bespoke eight-slide composition is a separately authored example, not a new arbitrary-layout schema.

**Why a shared scene?** Preview and exporters use the same placement map. Native PowerPoint text and shapes remain editable. A screenshot is an image. Figma/AE handoffs require their own application checks.

**What does the new bridge actually do?** An opt-in queue, a stdio MCP server and a connected-computer CLI. It validates generated projects, blocks layout overflow, requires an owned lease and saves an explicitly reviewed result as a new copy. It keeps session and lease metadata outside project JSON. Local protocol tests do not establish actual Dot host acceptance.

**Can I use it with my Dot?** Enable the bridge, then use its **Connection details** on a computer your Dot is authorised to operate. The MCP configuration and connected-computer CLI are real local interfaces. A cloud-only agent cannot access your loopback address. No public endpoint, tunnel, credential bypass or automatic cloud upload is provided. Actual host setup and model access remain your host's responsibility.

**Will Astra guarantee better compatibility?** We have not measured such a gain. A stronger model may help drafting or visual proposals. The same schema, fit checks and destination-app inspection still determine output usability. The UI requests Astra as a preference and does not silently substitute another model.

**What ran in Figma?** Eight editable design frames, native text keyframes, source-image Dot crops and a rendered closing animation. The motion video was sampled during preparation. Local PowerPoint uses a different available font, so inspect it in the destination app.

**What ran in AE?** An editable JSX construction script is supplied. The app was unavailable in this preparation environment, so execution, fonts, keyframe timing and rendering remain unverified. The script adds a new folder and comps to the current project. It does not save over your work. Keep the `assets` folder next to it, run it in AE, inspect, then save a new AEP file.

**What did you build during the event?** Describe your actual event-day contribution. The project existed earlier. Never call all of it a same-day build.

## Staying focused

Show one visible change. Explain what it means. Be precise about what works and what remains open. A clear, on-time demonstration gives the audience something concrete to remember. Prize decisions remain with the organisers.

## Offline opening

The Three.js renderer and character images are embedded in the HTML. No internet connection is required. If your browser blocks local HTML, serve only this output folder on loopback:

```bash
python3 -m http.server 4195 --bind 127.0.0.1 --directory dist/deckweft-three-stage-reviewed/output
```

Open `http://127.0.0.1:4195/deckweft-stage.html`. Stop with Ctrl+C. The real Studio remains on port 4190 and runs separately. A 2D fallback remains usable if WebGL is unavailable.
