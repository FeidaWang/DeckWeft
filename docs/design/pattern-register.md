# Maintaining the pattern register

[简体中文](../zh-CN/pattern-register.md) · [Register guide](README.md) · [Alignment §19](../plans/design-handoff-alignment.md#19-s10-decisions-and-result--pattern-library-maintenance-and-the-p3-boundary-2026-10-19)

This manual is for whoever adds, re-checks or retires a pattern in [pattern-register.json](pattern-register.json). The registers are design evidence, not runtime contracts: nothing in `schemas/` or `src/` reads them. State words are Proposed / Implemented / LocalVerified / HostVerified / ExportVerified, and a state changes only with a `docs/` evidence file.

## The maintenance fields

S10 (DWD-310) added these fields to all 56 pattern records. Original handoff fields and the S1 status fields are untouched; `import.addedFields` in the file explains each one.

| Field | Value today | Rule |
|---|---|---|
| `patternId` | equals `id` | The stable name decks and docs refer to. |
| `version` | `"1.0.0"` for all 56 | major.minor.patch. Raise it when the pattern's meaning or its DeckWeft implementation changes. |
| `sourceUrl`, `locale` | derived from `source_ids` | Same order as `source_ids`; `locale` is the sorted unique language list. Edit the source, not these. |
| `sourceCheckedAt` | `2026-10-18` (the handoff reading date), or `null` for proposal-only evidence | When someone last read the reference page for this pattern. |
| `evidenceType` | `observed` / `source` / `text` / `proposal` | The V / S / D / P marks spelled out. |
| `observedBehavior` | only where `referenceVerified` is true | What was seen, in the handoff's own words. It may also carry S or D claims; `evidenceType` says which kinds are mixed in. |
| `dataRequirements`, `interactionState`, `staticFallback`, `outputTier`, `accessibility` | `null` | Filled only when a pattern-level source or a browser check states them. Output levels are declared per component in `src/targets/capabilities.mjs`, not per pattern. |
| `assetStatus` | `no-reference-assets-bundled` | No reference-site picture, video or font is part of this repository. |
| `verification` | object | `reference` (observed, source-or-text-only, proposal-only), `deckweft` (the repository state), `browserSampleSources` and `evidence` (existing `docs/` files). |
| `deprecatedBy` | `null` | The id of the live pattern that replaces this one. |

`checkedAt` is **not** the page-check date. It was added in S1 and means "the date the repository status was checked". The date a page was read is `sourceCheckedAt`. The same pair exists in [source-register.json](source-register.json), which also gained `sourceUrl`, `locale` and `browserSample`.

## When to add a pattern

Add a pattern only for a distinct design: a different composition, a different motion or interaction behaviour, or a different chart grammar. A site that publishes new content on a template the register already describes does not need a new id. Record it as a new source (a new `ANT-` or `OAI-` record) and cite it from the existing pattern's `source_ids`.

1. Open the page and write down what is different: layout, behaviour, chart grammar, control.
2. Search the register for it. Compare `title`, `deckweft` and `acceptance_and_static` of the nearest records.
3. If a record already covers it, add the source and stop. Expected result: `source_ids` grows, no new id.
4. If it is distinct, take the next free id in the family (F13, M21 or C25), run the browser check below, and add the record with `repositoryState` `Proposed` and `repositoryStatus` `missing`.
5. Run the test (see Check). Expected: it passes.

Recovery: if the test names a record and a rule, fix that field. Never edit an original handoff field to satisfy a test.

## Run a browser check for a new pattern

Use the built-in or an isolated automation browser with a temporary profile. Do not use a personal profile and do not sign in.

1. Open the page at 1440 × 900 and wait until fonts, images and any opening animation have settled. Record the date, browser, viewport and device pixel ratio.
2. Record the **initial** state, then each interaction the pattern depends on (scroll step, control, sort, selection). Use a real pointer or key press where the pattern claims one; note it when you used a script instead.
3. Repeat at 390 × 844 and record whether the layout reorders in reading order and the page scrolls only vertically.
4. Turn on reduced motion (the browser's emulation, or the operating-system setting) and record what still moves and whether every stage is still reachable.
5. Record the **static** state: with JavaScript off, or the state a printed page would show.
6. Write the result as a `docs/evidence/<name>/browser-sample.json` file. Keep text only; do not store reference-site screenshots.
7. Set the source's `browserSample` to `{date, evidence, states}` and list the source in the pattern's `verification.browserSampleSources`. Expected: the test finds the file and the cross-links.

What you did not do goes in the file as `notChecked`. A cell nobody looked at stays unverified; the number of patterns never stands in for it.

## Record an upstream site change

A reference site changing does not change any deck.

1. Re-open the source and record the date as `browserSample.date` (and as `sourceCheckedAt` when the reading is complete). Write what changed in the evidence file: the old reading, the new reading, whether the pattern still holds.
2. If the pattern still holds, leave `version` alone. If its meaning changed, raise `version` and describe the change in `repositoryNote`.
3. If a new pattern replaces it, add the new record, then set the old one's `deprecatedBy` to the new id. The test refuses a replacement that is unregistered, is the pattern itself, or is deprecated too.
4. Existing decks pin their theme and component versions. They keep rendering as authored. Upgrading to a newer pattern version is the author's choice, made in Visual Studio with the normal undo and history path. Nothing upgrades a deck in the background.
5. Deprecating an expensive effect (a shader, a 3D object, a long opening) keeps its static state. The static state stays in the pattern text and the deck so a historical deck still reads and exports.

## What a full site-by-site verification still needs

The handoff saved paths, not visits. Today's repository evidence is the handoff's 18 V-marked patterns and one three-page sample ([evidence](../evidence/s10-pattern-maintenance/browser-sample.json)); the sample covers ANT-01, OAI-S01 and OAI-S20.

**OpenAI, zh-Hans-CN.** The handoff lists 1,390 deduplicated zh-Hans-CN alternate paths (`OpenAI_zh-Hans-CN_Discovered_URLs.txt`, SHA-256 `f992714d…ed869`, with `OpenAI_Sitemap_Coverage.json` for the sitemap counts). They fall under 62 first path segments; `index` (716) and `business` (468) hold most. The same 1,390 are not added to the 2,063 canonical URLs. To finish:

1. Group the 1,390 paths into templates (a page with the same layout, controls and chart grammar). The grouping does not exist yet; its output is a list of template ids with one or more representative paths each.
2. For each template, check desktop and mobile in four states: initial, interaction, reduced motion and static. That is 8 cells per template. Checking every path instead would be 1,390 × 8 = 11,120 cells.
3. Record each cell as seen, not seen, or different from the handoff reading. The sample so far has 7 cells: 3 desktop initial, 3 mobile initial (the OAI-S20 one is undecided, because the table's fit at 390 px was not looked at) and 1 interaction (the OAI-S20 sort). No reduced-motion or static cell was captured.

**Anthropic.** The handoff could not obtain a sitemap, so the site-wide URL total is unknown (`sitewide_url_total: null`) and no coverage share can be computed. Before any verification there must be a verifiable full URL list: a published sitemap, or a crawl that records its start point, depth limit and date, kept as a file with its hash. Until then the 32 reviewed main-site pages are a sample, not a census. Mark Anthropic coverage as unknown.

**Other gaps.** Firefox and WebKit, screen readers, real IME, 200 % zoom and measured frame rates have no page-level evidence.

## P3 boundary

DWD-310 closes only the maintenance mechanism above. The P3 effects stay deferred under EXP-001 in [roadmap.json](../../roadmap.json). Do not use a pattern to argue them in early:

- no full-screen persistent particles;
- no multi-layer blur or transparent filters;
- no 3D without a static final state;
- no opening that can only be understood with a mouse;
- no number rolling that carries no meaning, before P1 acceptance.

A performance budget names a fixed reference device, browser version, resolution, device pixel ratio and power mode first. Until those five are recorded in an evidence file, no millisecond, frame-rate or memory number is written in the register, the roadmap or the docs.

## Check

```bash
node --test tests/design-registers.test.mjs
```

Expected: eight tests pass and one is skipped. With the delivered package, all nine pass:

```bash
DECKWEFT_HANDOFF_DIR=/path/to/DeckWeft_Design_Handoff node --test tests/design-registers.test.mjs
```

The test checks that maintenance fields are present and either typed or `null`; that `version` is major.minor.patch and `deprecatedBy` names a registered, live, different pattern; that every `verification.evidence` and `browserSample.evidence` path exists; that EXP-001 still records the P3 deferrals and no budget number; and that the original handoff fields still match the delivered files.
