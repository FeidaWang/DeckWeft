# Merged UI shell (M0–M8)

Screenshots of the combined shell, taken in an isolated Chrome for Testing 149 against a seeded library:
`merged-desktop.png` (1440 px: top band, page strip, Words / Look zones, fit-state layout cards),
`merged-more-open.png` (More drawer), `merged-phone.png`, `merged-phone-more.png`, `merged-phone-look.png` (390 px).

Base is `claude/topbar-redesign-autosave-b4def0` (M0 tokens, M1 top band and autosave, M2 page strip, M3 zones, M6 first run).
`claude/classic-topbar-autosave-1d1ff0` added M4 layout cards, M5 More drawer, M7 wording and the M8 phone rules.
Where both built the same thing (M1 autosave and top band, the Redo hold) the first branch won.
Per-module screenshots from each branch stay in `m0` to `m8`; they show each module as first built, not the combined shell.

Not run: the Python runners (`browser_acceptance.py`, `browser_smoke.py`, `browser_page_strip.py`, `browser_inspector_zones.py`, `capture_studio.py`) because this machine has no Python Playwright module. Their readiness check was moved off the removed `#fitStatus` text.
`browser_author_controls.mjs` times out on `#actionLevel` at 1024 px; it fails the same way on the topbar-redesign branch alone.
`browser_media.mjs` times out waiting for `.three-scene-layer` on both source branches too.
