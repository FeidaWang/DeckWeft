# Step 2: one deck list

`picker-en.png` / `picker-zh.png`: the More drawer's "Backup and restore" with the picker drawn open as a list box (a native select does not show its popup in a headless screenshot). Three decks, newest first, each marked Classic / Visual (经典 / 视觉), and "Make a new-version copy" / 做一份新版副本 directly under it.

`node tests/browser_single_picker.mjs` (7 checks) asserts: both lists are read at startup; typed labels, newest first; a visual choice opens `/visual?project=<id>` on that deck; a classic choice switches in place; the network record has no `/api/visual/migrate` after switching between both types; Chinese labels; the copy button calls migrate exactly once, opens the copy and keeps the original.
