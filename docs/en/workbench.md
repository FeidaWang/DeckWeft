# Visual Studio workbench

[简体中文](../zh-CN/workbench.md) · [Task tools](task-loop.md) · [Hosts](hosts.md) · [Evidence](../evidence/vis-013/review.md)

## Work first

Opening a saved deck shows its page first. The page strip on the left uses non-interactive views of the same derived scenes, including actual images and charts. Select a thumbnail, or use the arrow keys on the strip. **Words** and **Look** sit beside the page (below 1050 px and on a phone, **Edit** opens them as a sheet). Everything else is in **More** or **Take away** in the top band; only one dialog opens at a time and closing it keeps unsaved edits.

Local mode arranges the supplied wording. Leave a blank line between pages; one supplied page stays one page. It does not research a topic, rewrite the text or add repeated pages to reach a requested length. Codex is an explicit choice under **More → Let the assistant write for me**; its operation permission appears only there.

1. Start `node bin/deckweft.mjs studio --open`. Open the printed loopback address: visual and classic decks open at the same address, and choosing a deck of the other kind in **More → Backup and restore → My decks** switches in place, without reloading.
2. With no deck open, the page shows the first-run paste box. Paste what you want to say (leave a blank line between pages) and press **Arrange**, or press **See an example first**. Expected: a plain v3 deck with your words exact, and the three directions below. No model runs.
3. To draft from a brief, open **More → Let the assistant write for me**. Enter what the presentation should explain, optionally a local `.txt` or `.md` source (up to 12,000 characters), and **Audience**. Choose **Your own words, arranged here** or **Codex**, then **Arrange supplied text** or **Use / resume selected deck**. Supplied words and numbers stay exact; arbitrary PDF/Office ingestion is not implemented here.
4. For Codex, tick the permission line for that operation. It uses the existing host configuration and may consume its allowance. Nothing signs in, chooses another model/provider or infers billing. Claude remains deferred.
5. **Design choices for the draft** (in the same section) holds the visual style, colour intensity, image emphasis and update preference, with **Apply design to** *Selected page only* or *Entire project*. A page choice persists on that page, without replacing project defaults. **Preserve this page’s image and crop** adds author image locks; no generation, theme change or source synchronization unlocks them.
6. To revise, open **Revise the result** in the same section and enter a revision, for example `Use evidence-top; keep every word and other page`. Codex also accepts ordinary phrasing for the existing composition/exact-data chart patch contract. Local mode accepts named compositions and the narrow chart grammar. For a chart, select an existing exact dataset if one is not already bound; missing data stops the operation. `Use dark-data` applies a typed scoped design choice locally. For other changes, use the editors under **More → For developers** rather than assuming unsupported prose was executed. A scope statement appears before **Revise selected scope** runs, for example *Scope: Page 3. It may change composition, chart data binding, theme on page 3; no other page changes. Facts, numbers, units and sources are never rewritten.* It names any locks inside that scope.
7. Press **Take away → Present** to open the audience artifact, with presentation navigation and no editor controls. A preview is not a final accepted export.

Interface language and output language are separate: **More → Language** holds the one interface switch and **Output language**. Output language selects drafting language and formatting; it never silently translates protected source words. Prompt language and tone are not settings any more; a draft sends the output language and a neutral tone.

## Three directions (S9a)

The old six questions are gone. DeckWeft draws the same content three ways, and the choice of how much material to expect is **Less / Medium / More** at the foot of **Look**. The three previews differ in graphics, type, media and motion. Their facts are identical.

1. Choose **Less**, **Medium** or **More** under **Look → Three directions**:
   - *Less*: question, evidence, action.
   - *Medium*: also background and limits.
   - *More*: all six argument units.
2. Press **Show three directions**. A change of level asks for three new directions of the open deck. Expect cards on the stage. Each card shows:
   - a measured preview with buttons for its sample pages;
   - what the direction changes: *Graphics* (surface, accent, the layout of each sample page, how many pages change layout), *Type* (display, body and number fonts, contrast), *Media*, *Motion* (what plays, or what would play when motion is on) and *Output* (how many elements are L1, L2 or L3 in PowerPoint or PDF);
   - a fit line, for example *✓ Fits all 5 pages at 1440 px*.

   The line above the cards gives the shared facts hash. A page taller than the 900 px candidate budget is listed and does not block the choice. Any other fit failure disables **Use this direction**.
3. Read **Argument units** above the cards. A missing unit or an unsupported claim becomes a question, for example *Which data, source or quotation supports the claim on page 3? DeckWeft will not invent one.* Nothing is added to reach a page count.
4. Press **Use this direction**. The direction is applied to every page through the normal edit path. Nothing is applied until you do. **Undo** returns the previous design. A page you locked with **Lock this page** keeps its theme and composition; the card says how many pages were kept. The first-run **Arrange** shows the same cards for the deck it just made.

If the directions do not appear, the message names the reason: an empty deck, an unknown field, or a deck with unsaved edits (wait for the state square to show saved).

### Image review and page planning (API only)

The image review and page planning left the browser in the single-entry shell. The server still enforces them, and the API runs them:

- **Page planning.** `POST /api/visual/page-plan` returns a table of each page's argument unit and why it was chosen (*label*, *structure*, *keyword* or *position*), its text length and the pages it needs, plus questions where material is missing (for example *The material supports 5 pages; the target is 9 … DeckWeft will not pad the deck.*). `POST /api/visual/page-plan/apply` can mark unsupported evidence pages *Evidence required* (final exports then refuse them with `EVIDENCE_REQUIRED`) or split long pages onto continuation pages that repeat the heading, without rewriting a word. A target outside 1–1000 is refused (`PAGE_PLAN_TARGET`).
- **After generation (S9b).** Every generated deck, local or Codex, is planned after it is saved, at the chosen detail level (*standard* without one). The plan names the pages drafted, the pages the material supports and the target, then the questions. On the Codex path the plan also travels with the request: the prompt names the argument units, the characters a page holds and the target, and forbids pages, facts or quotations added to reach it. When you supplied source text, a drafted page holding none of its lines is listed: *Page n holds none of your supplied lines; the host added it.* One live Codex CLI run checked this path ([record](../evidence/s9b-blueprint-a/codex-page-plan/page-plan.json)).
- **Capture, review, report and reviewed export** of a workbench deck: `POST /api/visual/workbench/:id/action` with `inspect` (capture) and `review`, `GET /api/visual/workbench/:id/report`, `POST /api/visual/workbench/:id/export`. The finer author actions and `POST /api/visual/migrate` are API-only too. `tests/browser_workbench.mjs` and `tests/browser_author_controls.mjs` call each of them and keep the assertions the browser steps used to make.

Consequence in the browser: a deck drafted from **Let the assistant write for me** is a workbench deck, and the server refuses its HTML, PowerPoint and PDF export (`WORKBENCH_REVIEW_REQUIRED`) until its image review has passed through the API. A deck made by **Arrange** is not a workbench deck and is not held. Nothing in the browser can approve an export.

## Save a look for reuse

A saved look keeps the theme, the profile choices (colour, contrast, density, motion, image emphasis), the composition used for each kind of page, and the type and motion tokens that were drawn. It has no field for text, data, sources, images or branding.

1. Wait for the state square to show the deck saved. Open **More → Backup and restore → Save this look** and type a name under *Profile name*.
2. A deck whose image review passed in this workbench is promoted with that review as its acceptance. Otherwise tick **I accept this design as it is**.
3. Press **Save this look**. Expect a message that names its theme and its number of composition choices. A refusal names the cause:
   - `PROFILE_UNSAVED`: save first.
   - `PROFILE_NOT_ACCEPTED`: pass the review or confirm acceptance.
4. Reload the Studio and open another deck: the look is listed under *Saved looks*. Choose it and press **Use on this deck**. The look is applied to the open deck.
5. **Download** saves the JSON. **Import a look** adds it back, as a copy when that id exists. Looks are stored in `<library>/visual/profiles/`. If the theme draws differently from when the look was saved, applying it lists the changed tokens. Applying at chapter or page scope is API-only.

[S9a evidence](../evidence/s9a-author-controls/review.md)

## Actual screenshots (API and release gate)

The runtime has no external dependencies. Capture is optional and explicit. To enable it, start the studio with an isolated Chromium executable outside `/Applications`:

```bash
node bin/deckweft.mjs studio --capture-browser /absolute/isolated/chromium
```

The executable is never discovered from a personal browser/profile, patched or re-signed. Each allowed operation launches a temporary profile, serves the derived artifact on loopback, waits for fonts/images and current fit, then captures actual PNG bytes at 1440/390px. Node's built-in WebSocket controls this isolated process. PNG hashes bind the existing quality receipt. Native image/chart/diagram captures complement full stories, within the existing 20-image host limit. Interactive stories still require real action traces; missing traces block acceptance instead of being fabricated. Dense scrolling components and exhaustive interaction states remain broader gates.

The browser has no capture or review button. Run the steps through the API above (or `node scripts/release-gate.mjs`, see the [gate manual](../visual-acceptance/README.md)):

1. Capture with `inspect`, with permission for this operation. Without the configured capability the task stops at a recoverable preview; it cannot export final HTML.
2. In Codex mode, the actual screenshots are attached to the selected host. Every required image needs hash-matching findings. Existing quality checks, source identities, scopes, locks and the cumulative two-round repair budget still apply.
3. In local mode, the author reviews every native image, inspects the whole story and components, records visible findings including the weakest page, chooses pass/fail and explicitly attests inspection. Loaded files alone do not attest that you viewed them. Machine fit never supplies an automatic author judgment.
4. The reviewed export becomes available only for the current passing receipt. Changed source, renderer, screenshots, failed review or a newer project revision blocks it. The older measured-preview export route cannot bypass workbench review, even if the client removes its metadata.

The report and the PowerPoint/PDF export report show the review attestation (`author`, `host-metadata-only`, `host-pixel-control` or `unattested`), verdict and pixel-control hits/total. “Not run” means no control record exists; it is different from zero hits. An attestation describes the evidence, not the accuracy of the judgment.

For a host draft, the thumbnail on the page strip is marked **Host added · unverified** with its line count, and **Words** lists each added line under it. Check those claims against your sources before approving the work. The **Take away** dialog shows the evidence line, and `GET /api/visual/workbench/:id/report` downloads `report.md`. The task's export report and `report.md` list the total and page locations; older count-only checkpoints say when locations are unavailable. These markers stay attached to page IDs when pages move. A project JSON alone does not contain the separate task evidence.

## Resume and recover

1. Reopen the saved visual project (**More → Backup and restore → My decks**) and, under **More → Let the assistant write for me → Resume earlier work**, choose **Resume last task** in the same browser session. Task checkpoints and preferences are stored separately from audience HTML in the local visual library.
2. If another editor saved newer content, the operation reports a revision conflict. It does not overwrite the newer project. Use **Sync saved source** explicitly, then recapture and review. Synchronization retains author locks, the last accepted artifact and the cumulative repair budget.
3. Use **Cancel operation** to stop its host/capture work. Use **Recover interrupted task** only after the owning server stopped; a live operation cannot be stolen. Nothing automatically retries a model call after restart.
4. **Save a recovery file** downloads the full local recovery record, including original source and private archival material. Keep it private. **More → Backup and restore → Last accepted HTML** explicitly downloads the previous accepted artifact after a failed attempt; the current candidate is not promoted. **More → Earlier versions** restores a saved revision as a copy.

References can remain public in the audience HTML. Archived private speaker notes, checkpoints, prompts and host receipts are not rendered there. Project/checkpoint exports retain archival data for recovery, so they are not audience documents.

## Add material, review the story, make slides (DWI-020 to DWI-023)

1. Open **More** and **Write with a prompt**. Under **Optional local text / Markdown source**, choose one or more `.txt` or `.md` files (up to 12 files, 256 KB each, 1 MB and 12,000 characters together). Expected: nothing happens until you choose an action.
2. Choose **Review the story first**. Expected: **Review the story** opens. Nothing is composed yet. Each page shows its heading, its points with the file and line they came from, and a label: *From your files*, *Numbers need a source* or *Files disagree*.
3. Read the red list: statements that disagree between files show both values and where each came from. Nothing is averaged or chosen; correct the source file if one is wrong.
4. Rename a heading, untick points or pages you do not want, fill **Who is it for?** and **What should they know or decide afterwards?**, and pick one of the three directions.
5. Choose **Make slides**. Expected: a new deck opens. The deck that was open stays in your library unchanged. Pages with numbers are marked evidence-required, because a local file is not a web source.

Files that are not read are listed at the top of the review with what to do: PDF, Word and PowerPoint files, images (no OCR runs), encrypted or non-UTF-8 files. Text that looks like an instruction to an assistant is kept as material and never followed. Links in the files are kept as text; nothing is downloaded.

An agent you run yourself can hand content over instead of files: `POST /api/visual/story/handoff` with a `deckweft-content-handoff` version 1 body ([schema](../../schemas/agent-handoff.schema.json)). It carries content, sources and the capabilities the agent declares; a handoff with a credential-shaped field or value is refused, and declared capabilities grant nothing. Its outline goes through the same review.

### If something goes wrong

- *Choose one or more text or Markdown files first*: the review needs at least one readable file.
- *Together the text is longer than 12,000 characters*: shorten the files or make two decks; nothing is cut for you.
- `HANDOFF_UNKNOWN_FIELD`: the handoff names a field this version does not have; remove it.

## The page dial and its tick (DWI-040 to DWI-043)

1. Open a deck. Expected: beside **WORKBENCH** the dial shows `1 / N` with **‹** and **›** on either side; the separate page count is hidden so there is one position display.
2. Click the dial and press the arrow keys, **Home** or **End**, or drag its knob. Expected: one page per step; the last page does not wrap to the first; the page opens when you let go. The **‹** and **›** buttons do the same without dragging.
3. While you type in a field, the arrow keys move the caret and never turn the page. The mouse wheel never turns pages.
4. Tick **Tick** to hear a short, quiet click per page step. Expected: off until you tick it; the choice is remembered on this computer; nothing sounds in a hidden tab, while presenting or in automated tests. The page number always shows the step, so the sound is never the only signal.
5. With no deck open, **Take away** is unavailable and **Arrange** is the one thing to do.

### If something goes wrong

- The dial is greyed out: the deck has one page.
- No sound after ticking **Tick**: click the dial once (browsers allow sound only after a click or key press), and check the tab is visible.
