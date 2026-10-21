# DWI Phase 05 — host boundaries and research breadth

Date: 2026-10-22. Model: as in [Phase 00](../phase-00/report.md#model-and-effort).

## Tasks

**DWI-050 — implemented locally; host invocation blocked.** The packaged skill (`skills/deck/SKILL.md`) now documents the content handoff route, `POST /api/visual/story/handoff`, with the `deckweft-content-handoff` contract from DWI-023, and states that no Slides or Spaces API sits behind it. `tests/dwi-050.test.mjs` builds the plugin, copies the runtime to an empty folder and reviews a handoff and a local file there with no host involved; the story review, the slide dial and the palette files are served by that copy. A live Codex or Claude run that sends a handoff was **not** made: it uses the person's host account and allowance, which this work did not have permission to spend; Claude sign-in also stays deferred by the existing handoff. The Spaces internal implementation is not a dependency of anything built here.

**DWI-051 — blocked (feasibility recorded).** [Feasibility record](dwi-051/feasibility.md): the Kimi exporter needs network access for a remote writer, installs PyYAML on its own and relies on a proprietary writer that its MIT declaration does not cover, so it cannot enter the default offline path. No Kimi code is in the repository. A comparison against the six-page slice needs the person's approval for network and a throwaway Python environment; the steps are listed.

**DWI-052 — implemented (contract only); sampling blocked.** [`schemas/film-frame-record.schema.json`](../../../../schemas/film-frame-record.schema.json) and `assertFilmFrameRecord` require the rights basis, edition, medium, transfer function, colour primaries, unique timestamps and frame hashes, the excluded regions (skin, subtitles, letterbox, neutrals), and a seeded k-means method with weighting and deduplication; an independently reviewed record names its reviewer. No frame record exists and every palette still reports `filmFrame: {verified: false, timestamp: null}`. No licensed film media is available, so no frame was sampled; the filmography in the workpack's coverage register was not re-verified.

**DWI-053 — planned (protocol recorded).** [Protocol](dwi-053/protocol.md): the product-catalogue review and the 2013–2026 study search, with attention, comprehension, preference and persuasion kept apart and no effect size beyond what an accessed text states. It was not executed: it is network research on the person's behalf that was not part of building the application.

## Results

| Check | Exit | Result |
|---|---|---|
| `node --test tests/dwi-050.test.mjs tests/dwi-051.test.mjs tests/dwi-052.test.mjs` | 0 | 7 tests pass |

## What would unblock each

- DWI-050: the person's go-ahead for one live Codex CLI run (consumes allowance) and, separately, for Claude sign-in.
- DWI-051: approval for network access and a Python environment in a throwaway folder.
- DWI-052: licensed or owned film media with permitted use, and the edition details.
- DWI-053: a request to run the search protocol.
