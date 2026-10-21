# DeckWeft · cinematic colour / instrument workbench
## Codex engineering workpack · 2026-10-21 · v1.1

**This is a real implementation workpack, not a completed application or a repository patch.** It contains a corrected research baseline, prioritised tasks, seven execution prompts, palette data, portable reference code and runnable workpack checks. It does not imply that the target application, a host integration or an Office export has passed acceptance.

### Start in three steps
1. Unzip this folder. Read `START_HERE.zh-CN.md` or `MASTER_PLAN.md`.
2. Put the entire folder inside an existing DeckWeft checkout at `workpacks/wes-instrument/`. Do not overwrite its root `AGENTS.md`, `package.json`, schemas or implementation files.
3. Give Codex `prompts/START.md`. Begin with `prompts/PHASE_00.md`; finish one gate before proceeding to the next.

### Check the workpack now
Node.js 22+ is sufficient; no dependency install, account or paid API is required.
```sh
cd workpacks/wes-instrument
npm run verify
```
Expected: the Node reference tests and the workpack structural validator pass. These checks inspect this workpack, not the complete DeckWeft application. Results from preparation are in `reports/`. Run `npm run integrity` before editing to compare packaged files with the manifest; it is an integrity check, not a signed authenticity certificate.

Open `palette-catalog.html` directly in a browser to inspect the 22 discrete community-library palettes and 16 screenshot comparisons. This is a static data catalogue, not the future Studio interface.

### What is authoritative?
`TASKS.json` is the execution queue. `TASKS.md` adds implementation details. `RESEARCH_AUDIT.md` overrides unsupported claims in the archived reports. `SOURCES.md` and `data/source-register.json` identify evidence. `data/repository-baseline.json` records the actual source revision inspected. The target repository's existing instructions and contracts take precedence over this sidecar where they conflict; report the conflict instead of silently changing either.

The two original research reports and the uploaded screenshot are preserved under `inputs/`, explicitly **non-normative**. The workpack never calls Deep Research, Claude, Codex, Kimi or an external model on its own.

### Scope labels
- **Verified in this workpack:** 22 palette entries copied from the inspected community-library source; 76 screenshot colour samples; computed sRGB/CIELAB values; generated role-pair contrast tests; task dependency validation; local helper tests.
- **Inspected, not executed here:** selected DeckWeft metadata, instructions and architecture; selected open-kimi-ppt-skill source.
- **Still to implement or accept:** integration into DeckWeft, full film-frame sampling, all-product TE analysis, latest-paper systematic review, real Codex/Claude host tests, real PowerPoint/Keynote tests, measured user studies.

No all-films/all-colours/all-products claim is made. `data/coverage.json` records the gaps rather than concealing them.

### v1.1: explicit module-level model/effort settings
Read `MODEL_ROUTING.md` / `MODEL_ROUTING.zh-CN.md`. All 29 tasks, seven phase prompts and 29 task-specific prompts now contain build/review effort and a conditional escalation ceiling. `MODEL_POLICY.json` keeps model binding unverified and automatic invocation/switching off. `node scripts/task-profile.mjs DWI-034` prints a recommendation only. No application task, host model call or real Office acceptance was performed by this update. Preserve/merge locally edited workpack files rather than blindly replacing them.
