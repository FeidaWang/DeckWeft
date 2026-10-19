# Visual Studio workbench

[简体中文](../zh-CN/workbench.md) · [Task tools](task-loop.md) · [Hosts](hosts.md) · [Evidence](../evidence/vis-013/review.md)

## Work first

Opening a saved deck shows its canvas first. The filmstrip below uses non-interactive views of the same derived scenes, including actual images and charts. Select a thumbnail, use the previous/next controls, or use arrow keys within the filmstrip. **Enlarge page** gives the current page the available width; **Fit workspace** returns to the overview size.

Use **Create** for supplied text, an attached source and design preferences. Use **Edit page** for the selected page's content, design and scoped revisions. Only one sidebar opens at a time. **Back to work** closes it and retains unapplied and unsaved edits. **File & history** contains undo, redo, history and project backup. Imports and examples are under **Create → Import and examples**.

Local mode arranges the supplied wording. Use `---` between pages; one supplied page stays one page. It does not research a topic, rewrite the text or add repeated pages to reach a requested length. Select Codex explicitly to draft from a brief; its operation permission appears only in that mode. Design choices have their own visible page/project scope, independent of revision scope.

Open **Explore compositions and story rhythm** to compare layouts. Open **Review and export** for capture permission, current images and author judgment. These use the existing review gate; the filmstrip does not approve an export. Project and recovery downloads retain private archival material; audience HTML is rendered from scenes rather than copied from the editor.

1. Start `node bin/deckweft.mjs studio --open`. Follow **Visual Studio** from the classic library, or open `/visual` on the printed loopback address.
2. Enter the story you want to explain. Optionally choose a local `.txt` or `.md` source, up to 12,000 characters. Open **Create** and choose **Arrange supplied text** in local mode, or **Draft from your brief** with Codex, or **Use / resume selected deck** for a saved local visual project. Save editor changes first. Supplied words and numbers remain exact; local mode arranges supplied text without a model. Arbitrary PDF/Office ingestion is not implemented here.
3. Open **Languages and design choices** when needed. Interface, prompt and output languages are independent; content tone and visual style have separate fields. Output language selects drafting language and formatting; it never silently translates protected source words. Local mode does not rewrite tone. The update preference is stored author intent; updates always require an explicit operation, and every changed HTML still needs review.
4. To draft or review with Codex, select **Codex CLI** and allow that operation. It uses the existing host configuration and may consume its allowance. Nothing signs in, chooses another model/provider or infers billing. Claude remains deferred.
5. Watch the preview. **Watch preview** opens the audience artifact, with presentation navigation and no editor controls. A preview is not a final accepted export.
6. Open **Edit page → Revise the result** and enter a revision, for example `Use evidence-top; keep every word and other page`. Codex also accepts ordinary phrasing for the existing composition/exact-data chart patch contract. Local mode accepts named compositions and the narrow chart grammar. For a chart, select an existing exact dataset if one is not already bound; missing data stops the operation. `Use dark-data` applies a typed scoped design choice locally. For other changes, use the existing advanced editor rather than assuming unsupported prose was executed.
7. Under **Create → Languages and design choices**, choose **Selected page only** or **Entire project** before applying design choices. A scene choice persists on that scene, without replacing project defaults. Color/image profile overrides are typed scene fields used by the same derived renderer. Locked themes/compositions stay protected. **Preserve this page’s image and crop** adds author image locks; no generation, theme change or source synchronization unlocks them.

## Six questions and three directions (S9a)

**Create** starts with six questions: **Topic** (the text box), **Audience**, **Style**, **Detail**, **Motion** and **Output**. Languages, tone, colour, image emphasis and the update preference are under **More options**. DeckWeft draws the same content three ways before it builds the deck. The three previews differ in graphics, type, media and motion. Their facts are identical.

1. Open **Create**. Paste your text (use `---` between pages) or a brief, and fill the six questions. **Style** may be *Suggest from my content* or one of the six themes. **Detail** sets how much material DeckWeft expects:
   - *Brief*: question, evidence, action.
   - *Standard*: also background and limits.
   - *Detailed*: all six argument units.
2. Choose **Content**: *The text above* (a new deck) or *The open deck* (restyle the deck you have open). Click **Show three directions**.
3. Expect **Three directions** on the stage. Each card shows:
   - a measured preview with buttons for its sample pages;
   - what the direction changes: *Graphics* (surface, accent, the layout of each sample page, how many pages change layout), *Type* (display, body and number fonts, contrast), *Media*, *Motion* (what plays, or what would play when motion is on) and *Output* (how many elements are L1, L2 or L3 in PowerPoint or PDF);
   - a fit line, for example *✓ Fits all 5 pages at 1440 px*.

   The line above the cards gives the shared facts hash. A page taller than the 900 px candidate budget is listed and does not block the choice. Any other fit failure disables **Use this direction**.
4. Read **Argument units** above the cards. A missing unit or an unsupported claim becomes a question, for example *Which data, source or quotation supports the claim on page 3? DeckWeft will not invent one.* Nothing is added to reach a page count.
5. Click **Use this direction**.
   - With *The text above*, the workbench builds the whole deck with that direction. It is the same design the preview showed: the server re-applies the direction to the same planned content.
   - With *The open deck*, the direction is applied to every page through the normal edit path. **Undo** returns the previous design. A page whose theme or composition you locked keeps it; the card says how many pages were kept.

If the directions do not appear, the message names the reason: an empty topic, an unknown field, or a deck with unsaved edits (save first).

**Revise selected scope** and **Apply scoped choices** now show a scope statement before they run, for example *Scope: Page 3. It may change composition, chart data binding, theme on page 3; no other page changes. Facts, numbers, units and sources are never rewritten.* The statement follows the selected page and the scope list, and names any text, data, source or composition locks inside that scope.

### Pages from the argument

Open **Edit page → Author controls → Pages from the argument**.

1. Choose a detail level and, optionally, a target page count. Click **Plan pages**.
2. Expect a table: each page's argument unit and why it was chosen (*label*, *structure*, *keyword* or *position*, with the word that decided it), its text length and the pages it needs.
3. Expect questions where material is missing. Typical questions: a missing unit, a claim without a source, or *The material supports 5 pages; the target is 9 … DeckWeft will not pad the deck.*
4. **Mark evidence-required pages** marks the unsupported evidence pages. They get an *Evidence required* flag in the page list. Final exports (HTML, PowerPoint, PDF and the workbench's reviewed export) refuse them with `EVIDENCE_REQUIRED`; previews still work. To clear the mark, supply the evidence and set the page *sourced*, or set it *illustrative*.
5. **Split long pages** moves whole paragraphs and lists to continuation pages, which repeat the heading. No word is rewritten. Undo restores the pages.

**Page plan after generation (S9b).** Every generated deck, local or Codex, is planned after it is saved, at the chosen direction's detail level (*standard* without one). Expect a *Page plan* box under the operation status. It shows the pages drafted, the pages the material supports and the target, then the questions. On the Codex path the plan also travels with the request: the prompt names the argument units, the characters a page holds and the target, and forbids pages, facts or quotations added to reach it. When you supplied source text, a drafted page holding none of its lines is listed: *Page n holds none of your supplied lines; the host added it.* Keep it only if it says what you mean, or delete it. A target outside 1–1000 is refused before anything runs (`PAGE_PLAN_TARGET`). The Codex path is tested with a simulated host only; no live Codex run was made for S9b.

### Save a design as a reusable profile

A profile keeps the theme, the profile choices (colour, contrast, density, motion, image emphasis), the composition used for each kind of page, and the type and motion tokens that were drawn. It has no field for text, data, sources, images or branding.

1. Save the deck. Under **Author controls → Design profiles**, type a name.
2. A deck whose image review passed in this workbench is promoted with that review as its acceptance. Otherwise tick **I accept this design**.
3. Click **Save this design as a profile**. Expect a message that names its theme and its number of composition choices. A refusal names the cause:
   - `PROFILE_UNSAVED`: save first.
   - `PROFILE_NOT_ACCEPTED`: pass the review or confirm acceptance.
4. Reload the Studio and open another deck: the profile is still listed. Choose **Apply profile** at Deck, Chapter or Page scope. Read the stated effects, then apply.
5. **Export profile** downloads the JSON. **Import profile** adds it back, as a copy when that id exists. Profiles are stored in `<library>/visual/profiles/`. If the theme draws differently from when the profile was saved, applying it lists the changed tokens.

[S9a evidence](../evidence/s9a-author-controls/review.md)

## Actual screenshots and review

The runtime has no external dependencies. Capture is optional and explicit. To enable it, start the studio with an isolated Chromium executable outside `/Applications`:

```bash
node bin/deckweft.mjs studio --capture-browser /absolute/isolated/chromium
```

The executable is never discovered from a personal browser/profile, patched or re-signed. Each allowed operation launches a temporary profile, serves the derived artifact on loopback, waits for fonts/images and current fit, then captures actual PNG bytes at 1440/390px. Node's built-in WebSocket controls this isolated process. PNG hashes bind the existing quality receipt. Native image/chart/diagram captures complement full stories, within the existing 20-image host limit. Interactive stories still require real action traces; missing traces block acceptance instead of being fabricated. Dense scrolling components and exhaustive interaction states remain broader gates.

1. Check **Allow isolated local browser screenshots** for this operation, then choose **Capture and review**. Without this configured capability the task stops at a recoverable preview; it cannot export final HTML.
2. In Codex mode, the actual screenshots are attached to the selected host. Every required image needs hash-matching findings. Existing quality checks, source identities, scopes, locks and the cumulative two-round repair budget still apply.
3. In local mode, open **Inspect actual images / author review**. Open every native image link, inspect the whole story and components, enter visible findings including the weakest page, choose pass/fail and explicitly attest inspection. Loaded files alone do not attest that you viewed them. Machine fit never supplies an automatic author judgment.
4. **Export reviewed HTML** becomes available only for the current passing receipt. Changed source, renderer, screenshots, failed review or a newer project revision blocks it. The older measured-preview export route cannot bypass workbench review, even if the client removes its metadata.

## Resume and recover

1. Reopen the saved visual project and choose **Use / resume selected deck**, or **Resume last task** in the same browser session. Task checkpoints and preferences are stored separately from audience HTML in the local visual library.
2. If another editor saved newer content, the operation reports a revision conflict. It does not overwrite the newer project. Use **Sync saved source** explicitly, then recapture and review. Synchronization retains author locks, the last accepted artifact and the cumulative repair budget.
3. Use **Cancel operation** to stop its host/capture work. Use **Recover interrupted task** only after the owning server stopped; a live operation cannot be stolen. Nothing automatically retries a model call after restart.
4. **Recovery checkpoint** downloads the full local recovery record, including original source and private archival material. Keep it private. **Last accepted HTML** explicitly downloads the previous accepted artifact after a failed attempt; the current candidate is not promoted.

References can remain public in the audience HTML. Archived private speaker notes, checkpoints, prompts and host receipts are not rendered there. Project/checkpoint exports retain archival data for recovery, so they are not audience documents.
