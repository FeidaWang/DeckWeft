# M1 · Top band and autosave (evidence)

- `m1-topbar-saved.png`: top band at 1600 px after an edit settled by itself. Only Undo, title, state square and Take away are visible; the square is green.
- `m1-topbar-conflict-attention.png`: the second tab after a real `REVISION_CONFLICT`. Square is red, the existing banner is shown, no dialog opened by itself.

How the autosave / `REVISION_CONFLICT` interaction was checked (two real tabs of one Studio, Chromium, fixture mode of `tests/browser_harness.py`):

1. Both tabs open the same deck at revision N.
2. Tab 1 edits the title; its square goes `unsaved` → `saving` → `saved` with no click (revision N+1).
3. Tab 2 edits the title. After 1.2 s its autosave PUT is refused with 409. Tab 2 shows `data-state="attention"` and the banner "Another window saved first…", opens no dialog, keeps its text, and the stored deck still holds tab 1's title.
4. Further typing in tab 2 does not retry (autosave stays blocked until a manual save, reopen or successful save).
5. Pressing the hidden `#save` (the manual path) still offers "save as a separate copy"; Cancel keeps the draft and the red square.
6. `Ctrl+S` in tab 1 still saves.

Automated in `tests/browser_acceptance.py` (run through `tests/browser_smoke.py --mode fixture`): the 1.5 s autosave assertion, hold-Undo-reveals-Redo, the in-flight autosave race, and the two-tab conflict above.
