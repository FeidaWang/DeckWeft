# Melbourne demo kit

This original, independent template uses Australian English. It takes colour and large-type cues from the public MLAI site. It does not copy its logos, kangaroo artwork, proprietary template assets or third-party slides. It is not an official OpenAI or MLAI template.

## The event and the prize

The [public Melbourne listing](https://luma.com/jsqz7a56) describes a community build day at Stone & Chalk, 121 King St. It allows existing projects, welcomes beginners and lists demos from 12:00 to 12:45 pm. The page does not publish individual pitch limits, judging weights, a competition submission process or a winner's prize. We use the participant's confirmed three-minute slot for this kit.

The participant reports a Dot-themed water bottle prize. The award method remains unverified. Do not confuse it with the listing's conditional attendee credits: $100 in Codex credits and $50 in OpenAI API credits for eligible attendees who check in. The page does not establish the currency or make those credits a winner's prize. Check the organiser's current onsite instructions before submission. Do not claim the whole project was built during the event.

The [MLAI site](https://mlai.au/) describes a not-for-profit volunteer community, rather than a commercial company. Its public pitch guidance supports plain explanations, distinguishing evidence from assumptions and making a clear request. Those are useful rehearsal criteria, not a verified judging rubric.

## Files to open

1. Open `deckweft-melbourne-pitch.html` in your browser. Expected: eight main slides, followed by three optional Q&A slides.
2. Use Left and Right to navigate. Select **Start 3 min** when rehearsing. Select **Speaker notes** only on your private screen. Notes appear in the same window and will show on a mirrored projector.
3. Open `deckweft-melbourne-pitch.pptx` to edit the native text. Check fonts in the presentation app you will actually use. No fonts are embedded.
4. Use `melbourne-demo-template.pptx` for a different project. Replace every bracketed field and the screenshot area. Delete unused evidence fields instead of inventing metrics. It is an editable slide deck, not a `.potx` master or a newly implemented Studio theme.
5. For the Studio, import `stage-demo.deck.json`. The other two JSON files carry the full semantic pitch and reusable guidance using the Studio's existing preset theme and four layouts. Their appearance will differ from the bespoke presentation.

If the browser blocks local HTML, use the PPTX or serve only the output directory on loopback with `python3 -m http.server 4188 --bind 127.0.0.1 --directory dist/melbourne-demo-kit-final/output` from the repository root. Open the printed loopback address. Stop with Ctrl+C. There are no remote fonts, scripts, uploads or analytics in the presentation player.

## Rehearsal order

| Time | Slide | Job |
| --- | --- | --- |
| 0:00–0:15 | 1 | Name the familiar problem and the project. |
| 0:15–0:35 | 2 | Explain the newcomer and their task. |
| 0:35–0:55 | 3 | State what works today. |
| 0:55–1:45 | 4 + Studio | Show one input, a layout change and a saved result. |
| 1:45–2:10 | 5 | Explain the paper-notes analogy. |
| 2:10–2:30 | 6 | State concrete implementation facts. |
| 2:30–2:45 | 7 | Name the next user test as a plan. |
| 2:45–3:00 | 8 | Invite one useful next action and finish. |

The HTML timer is manual. It does not advance slides. At slide 8, stop. Only show the appendix in response to a relevant question. For a 90-second interruption, use slides 1, 3, 4, 5 and 8 and shorten the demo to one layout switch.

## A reliable 50-second demo

1. From the repository root run `node bin/deckweft.mjs studio --port 4187 --home dist/melbourne-demo-kit/studio-library`. Open `http://127.0.0.1:4187` in the provided browser. This uses a separate local library. Node.js 22+ is required.
2. Choose **Import JSON / outline**. Paste the contents of `stage-demo.deck.json` and complete import. Expected: a three-slide project with “Our build is ready” as the first title. If import reports an existing ID, import as a new copy through the UI instead of overwriting another deck.
3. Before the pitch, keep the first slide selected with the content and layout controls visible. Practise at the projector's resolution. Keep notifications and private windows out of the projected view.
4. At 0:55, switch to Studio. Change the headline to “Our build is ready to share”. Choose a different layout thumbnail, then **Save**. Expected: the headline remains intact, the arrangement changes, and the save completes.
5. Export PowerPoint only if the exact export workflow fits in your rehearsal. An exported deck keeps native text and shapes. The destination app may substitute fonts. The prebuilt `stage-demo-core-export.pptx` is an actual DeckWeft CLI export using estimated text fitting.
6. Return to slide 5 by 1:45. If anything stalls for five seconds, show the screenshot on slide 4 and describe it honestly. Do not debug in front of the audience. Keep the exported file ready as a second fallback.

The screenshot is evidence of the Studio UI. It is not evidence that the full bespoke pitch design comes from the core four-layout engine. This kit deliberately ships both an authored presentation and an actual core-export example.

## The ELI5 explanation

Think of writing each thought on a paper note. That is the content. The layout engine is a tidy desk that tries four arrangements. It checks whether the words fit. The exporter packs the chosen arrangement into a takeaway box. You can open the box in another app and keep editing the words.

JSON is a labelled list the computer reads. A schema is the checklist that says which labels and values are allowed. A scene is a map of where each word and shape belongs. “Local” means the Studio stores its projects on your computer and listens only to this computer. It still needs a browser and Node.js.

Codex can help draft the paper notes through an installed host skill. The host's account, network and data handling are separate. The Studio itself has no bundled model and arranges content with explicit rules. Layout scores describe fit rules, not whether the idea is true or deserves a prize.

## Likely questions

**Why build this when people already have slide tools?** This alpha explores a narrow workflow: a short outline, four explainable arrangements and editable exports on your laptop. We need actual user trials to know whether people prefer that workflow. Avoid untested claims that commercial tools are worse.

**What is AI doing?** An installed host agent can draft an outline. The local layout and export engine are deterministic. The repository records a reviewed Codex CLI skill task. Desktop native activation and the full host gate remain open.

**Does it work offline?** The prepared HTML presentation and the core Studio editing/export loop need no network. Optional AI drafting through a host may need the host's network and account. Opening links in a source list is an explicit user action.

**What happens when text is too long?** The app reports layout blockers. Visual export stops if the selected scene cannot fit all content. Shorten the text, split the slide or choose a fitting layout. Browser Canvas uses actual text measurements. CLI exports use an offline estimate.

**Can I edit the exported file?** The core PPTX uses native text and shapes. This kit's bespoke PPTX also keeps text and the architecture diagram native. The Studio screenshot stays an image. Inspect the file in your destination app for font changes.

**What did you build today?** Give only your actual contribution. This kit and pitch were prepared for the event. DeckWeft already existed. Fill in your real event-day changes before saying more.

**How will you know it helps?** Proposed test: five willing first-time builders, each using a rough outline. Observe task completion, confusing steps and what they can explain afterwards. Compare against their current workflow only with a fair method. No user trial or measured saving is claimed yet.

## Increasing the chance of a strong showing

These are rehearsal recommendations, not official judging criteria. Make the purpose understandable in the first 15 seconds. Spend the live demo on a visible change. Tell the audience what the result means. Name one limitation without spending the pitch on a feature backlog. Finish on time with a specific invitation. A willingness to accept confusing feedback is more useful than an unsupported superlative.

Ask one willing peer to explain DeckWeft back to you after rehearsal. If they think it generates every slide with a model, clarify the AI boundary. Do not count politeness as adoption. Record a quote or contact only with permission.

Keep the water bottle as personal motivation. The main pitch stays about the user's problem. If there is a casual prize conversation after the demo, a natural optional line is: “I came to build something useful, and I would be pretty chuffed to take that Dot bottle home.” A good pitch can improve your showing. It cannot determine the organiser's award decision.
