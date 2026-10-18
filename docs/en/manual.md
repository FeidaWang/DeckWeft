# The simple manual

[中文](../zh-CN/manual.md) · [Home](../../README.md)

## The three parts of the workbench

**Left: your book's pages.** Pick a slide, add a page, choose another saved project, or import an outline. The arrows in the inspector move the selected slide up or down. Duplicate makes a new slide with its own identity.

**Middle: the stage.** This is what your audience sees. Below it are four arrangements of the same content. Pick one or choose **Auto layout**. The numbers are rule scores, not customer ratings or AI confidence.

**Right: your toolbox.** Content changes words. Design changes the theme, the slide's job, the canvas's language preference, and AE motion. Sources stores references. The check panel tells you what needs attention.

## Make a deck from notes

Choose **New deck**, then paste this:

```markdown
# A small change with a clear benefit
Put the important idea first.
---
# How we will do it
- Write the story
- Compare the layouts
- Check the exported file
---
# The next step
Choose one page to improve today.
```

The `---` line is a page break, like turning a page in a book. A line starting with `-` is a point. The first line is the title. This button arranges your text; it does not invent missing research or contact an AI service.

## Add numbers without making a fake chart

In **Numbers**, write one row per number:

```text
4 | Layout choices
6 | Slides in this example
```

The left side of `|` is the value. The right side is its label. These become editable text and cards, not native spreadsheet-backed charts. Add a reference in **Sources**, or explain that the figures are your own example in **Notes**. A warning may remain until a source is linked; that warning alone does not prevent export.

## Change the look without losing the story

Try Warm paper, Midnight ink, or Quiet ocean. Use the ratio selector for widescreen, classic, square, or portrait slides. Content stays in the document even when a layout cannot fit it. A red fit warning means “give these words more room,” not “the words have been deleted.” Try another layout, shorten the text yourself, or split one crowded slide into two.

The smallest supported audience text is a design constraint, not a guarantee of legibility at every screen size. Footers are deliberately smaller. Moving to a tiny portrait preview naturally makes the whole slide appear smaller.

## Save, undo, and recover

**Save is explicit.** Click it or press `⌘S` / `Ctrl+S`. Changing a field does not mean it is already on disk. Typing while a save is running stays marked as unsaved; the earlier save response cannot erase your newer words. The browser warns before you leave with unsaved changes.

Use Undo / Redo for local edits. While typing in a field, normal text undo belongs to that field. Outside a field, `⌘Z` / `Ctrl+Z` uses deck history. Local undo history is not retained after closing the page.

If another window saved first, DeckWeft refuses to overwrite it. Your edits remain in the current window. Export **Project JSON** to keep them, reopen the latest deck, and decide which changes to reapply. You can also import the backup as a separate new project. Automatic merging is not implemented.

### Find an earlier version, like looking through a photo album

Click **Version history** on the left. Each previous save is a photo of the whole deck, not a photo image of a slide. Pick a revision to inspect a read-only preview. Use **Load older** for more revisions, and the slide buttons to look through that version.

Click **Restore as a new copy**. This creates a second deck, with a new id and revision 1. It does **not** replace the original and does **not** throw away your current unsaved typing. Only **Open restored copy** switches the workbench; if you have unsaved changes, choose Save and continue, Discard and continue, or Keep editing. A retry of the same restore request reuses the copy rather than making duplicates.

No older versions? Save after making a change: the version you just replaced will appear here. A damaged snapshot is marked as needing repair; the app does not delete or silently fix it. If a snapshot changed since you opened it, refresh before restoring. Snapshots live in `~/.deckweft/history/PROJECT_ID/`; there is still **no automatic pruning or retention cap**. Back up the library and monitor disk use. This is not crash recovery for typing that was never saved.

## Export: which box do you need?

See [private presentation and rehearsal](presenting.md) for the audience window, teleprompter, appearance and motion settings. Visual exports now omit private notes by default; use the explicit private-notes option for a presenter copy. Project JSON remains a complete private backup.

| Format | Think of it as | What stays editable |
| --- | --- | --- |
| Project JSON | The complete recipe | All supported project data and archived legacy data |
| PowerPoint | A slide file for presentation software | Native text and basic shapes; static, no native charts |
| HTML | A small offline book | Viewable slides; private notes/source annotations only when explicitly included |
| SVG | One carefully arranged page | Vector shapes and text; current slide only |
| Figma handoff | Instructions for the Figma importer | Text and shape layers after import |
| AE handoff | Instructions for the animation importer | Compositions, text, shapes, notes markers, restrained entrances |

JSON backup still works when layout export is blocked, or a field is temporarily invalid. It preserves the draft as-is; repair invalid fields before importing that backup. Visual formats require no blocking fit errors. Figma/AE JSON is not a `.fig` or `.aep` file; run the supplied importer in the real app. Inspect fonts there before sharing.

## How the text ruler works

Wait for **Browser-measured · ready to export**. The browser measures the actual words with available local fonts, much like laying a ruler beside a printed sentence. It keeps emoji families and combining accents together. Four arrangements use these measurements, and the selected result is reused by the export server.

The ruler only probes a small declared font list on this computer; it does not upload text, enumerate every installed font, download fonts, or embed font files. Privacy settings can restrict detection. Another app can use a different font, so a browser pass is not a promise of identical PowerPoint or AE rendering.

Editing invalidates the old measurement. While measuring or after an error, stale choices and visual export are disabled. Correct the field or edit again after reconnecting. Expired export measurements are refreshed rather than reused. A command-line export with no browser uses **offline-estimate**, not a secretly claimed real measurement.

## Languages

The **中文 / English** button changes interface labels. **Deck language / font preference** changes the content language tag and font choices. Neither translates existing words. To make a Chinese deck, write Chinese or open the Chinese example. Documents and examples are separate so each stays easy to read.

## Keyboard and small windows

Press `1`–`4` outside text fields to choose one of the currently ranked layouts. **Compare layouts** collapses the tray. Click **Present** for the private presenter and separate audience view. Outside inputs/script controls, arrows or Page Up/Down move slides, Home/End jump and Escape exits. The script starts only when requested; motion follows the viewer preference.

On smaller windows, use **Slides** and **Edit** to open the side drawers; Escape closes them and returns focus to their trigger. Tab/Shift+Tab stay inside an open dialog. Application shortcuts do not take over while an input method is composing text. Keyboard event tests do not replace testing your real input method and screen reader. The main canvas fits inside its available stage. Text fields and long side panels scroll independently.

## Common problems

**“node: command not found.”** Install Node.js 22+ and reopen your terminal.

**“Address already in use.”** Another studio may already be running. Use that window or start with `--port 4180`.

**“Choose a real folder.”** The alpha refuses symlinked storage/install paths. Pick a normal directory. On macOS, avoid alias-like paths through `/tmp`; a folder inside your home directory is simpler.

**“This deck is being saved elsewhere.”** Wait and retry. After a crash, stop every DeckWeft process before inspecting the exact `.json.lock` file next to the affected project. Back up the project and lock file, then remove only that stale lock. Never delete a live lock to force a competing write.

**The font looks different in PowerPoint.** The intended font may be absent. Install an appropriately licensed font yourself or change fonts in PowerPoint, then inspect every slide. DeckWeft does not bundle font files.

**Is my text private?** The studio itself makes no external calls. Your browser, operating system, chosen AI host, backup software, and later cloud imports have their own behavior. Local-first is not encryption and not a defense against another process already running as you.
