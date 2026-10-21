# Source register
Checked on 2026-10-21. The machine-readable register is `data/source-register.json`. Primary code, standards, manufacturer pages and research records are kept separate from archived reports. “Inspected” never means “executed”. The 2025 paper is a research lead, not a verified effect.
No complete systematic review through 2026 or private Slides implementation access is claimed.

## SRC-DW-AGENTS — DeckWeft contributor instructions
Access: **file-read**. Type: repository.
Source: <https://github.com/FeidaWang/DeckWeft/blob/05643c614cf7d981227b0a14be02a2d65eda15c3/AGENTS.md>
Verified scope: Node 22+, ESM; preserve runtime dependency and local-first boundaries. Keep source, layout, rendering, storage and packaging separate; evidence is required for acceptance.
Limitations: Repository code was not executed in this workpack creation.
Locator: `{"commit": "05643c614cf7d981227b0a14be02a2d65eda15c3", "gitBlobSha": "5d67e83830b079fcec2f3f70fa68e1440d423307"}`

## SRC-DW-PKG — DeckWeft package metadata
Access: **file-read**. Type: repository.
Source: <https://github.com/FeidaWang/DeckWeft/blob/05643c614cf7d981227b0a14be02a2d65eda15c3/package.json>
Verified scope: Version 0.1.0-alpha.2, private package, Node >=22.0.0, MIT declaration. verify chains types, test, check, build and demo.
Limitations: A declared script is not a record that it passed.
Locator: `{"commit": "05643c614cf7d981227b0a14be02a2d65eda15c3", "gitBlobSha": "48236a3310f89e7a0069284fda8c545ad5adc169"}`

## SRC-DW-README — DeckWeft scope and limitations
Access: **file-read**. Type: repository.
Source: <https://github.com/FeidaWang/DeckWeft/blob/05643c614cf7d981227b0a14be02a2d65eda15c3/README.md>
Verified scope: Existing Studio and agent workflows should be reused. README distinguishes structural native-chart checks from real Office acceptance.
Limitations: Feature claims remain upstream claims unless independently tested.
Locator: `{"commit": "05643c614cf7d981227b0a14be02a2d65eda15c3", "gitBlobSha": "8916c88d61b7cad64bfe90bb5516be59194cd8de"}`

## SRC-DW-ARCH — DeckWeft architecture
Access: **partial-file-read**. Type: repository.
Source: <https://github.com/FeidaWang/DeckWeft/blob/05643c614cf7d981227b0a14be02a2d65eda15c3/docs/en/architecture.md>
Verified scope: Describes classic and v3 contracts, shared scenes, local storage and browser measurement. Identifies shell/kind modules and semantic chart/static-state fields.
Limitations: Tool output was truncated; only surfaced sections were inspected. Current implementation symbols must be resolved in Phase 00.
Locator: `{"commit": "05643c614cf7d981227b0a14be02a2d65eda15c3"}`

## SRC-KIMI-PKG — open-kimi-ppt-skill package metadata
Access: **file-read**. Type: repository.
Source: <https://github.com/acnlie/open-kimi-ppt-skill/blob/c32890fe0985bdf668f2722fed30f1010bdf24c9/package.json>
Verified scope: Version 1.2.0, MIT declaration, Node >=18, self-described unofficial reverse-engineered skill.
Limitations: No licence conclusion about remote proprietary components.
Locator: `{"commit": "c32890fe0985bdf668f2722fed30f1010bdf24c9", "gitBlobSha": "fb70cdd30ac38e8ce7aad2c2ad520ef4574c478d"}`

## SRC-KIMI-EXPORT — open-kimi-ppt-skill exporter entry
Access: **partial-file-read**. Type: repository.
Source: <https://github.com/acnlie/open-kimi-ppt-skill/blob/c32890fe0985bdf668f2722fed30f1010bdf24c9/skills/open-kimi-ppt/scripts/export_pptx.py>
Verified scope: Uses a local SDK host and browser-side writer; remote referenced resources may still be fetched. The inspected entry can install PyYAML automatically.
Limitations: Only first 160 lines were read; exporter was not run. Not an approved default offline dependency.
Locator: `{"commit": "c32890fe0985bdf668f2722fed30f1010bdf24c9", "gitBlobSha": "3d32e294c6a13645913e556ba231af42e7ef6a98", "lines": [1, 160]}`

## SRC-WES — wesanderson palette definitions
Access: **file-read**. Type: repository.
Source: <https://github.com/karthik/wesanderson/blob/master/R/colors.R>
Verified scope: Contains 22 distinct discrete palettes plus a Rushmore alias and a Zissou interpolation entry. Documentation credits a community palette collection, not an official film colour standard.
Limitations: No licensed film-frame timecodes were verified. The Git blob hash identifies file content; it is not a repository commit hash.
Locator: `{"gitBlobSha": "ddcf7fb12888a658b8b3f80117ea933dcc0a0f16", "immutableBlobUrl": "https://api.github.com/repos/karthik/wesanderson/git/blobs/ddcf7fb12888a658b8b3f80117ea933dcc0a0f16"}`

## SRC-WES-META — wesanderson package metadata
Access: **file-read**. Type: repository.
Source: <https://github.com/karthik/wesanderson/blob/master/DESCRIPTION>
Verified scope: Version 0.3.7 metadata, authorship attribution and MIT + file LICENSE declaration.
Limitations: Package metadata does not establish movie image rights.
Locator: `{"gitBlobSha": "9ff54083ad494ec6998cec865cf5082842711dd5"}`

## SRC-TE-CATALOG — Teenage Engineering product catalogue
Access: **page-read**. Type: manufacturer.
Source: <https://teenage.engineering/products>
Verified scope: Product-family index used to create the research coverage queue.
Limitations: A catalogue index is not a full examination of every current, discontinued or collaboration product.

## SRC-TE-FIELD — Teenage Engineering field system
Access: **page-or-search-excerpt**. Type: manufacturer.
Source: <https://teenage.engineering/products/field-system>
Verified scope: Reference for a coherent portable instrument family.
Limitations: The workbench design is an interpretation; no affiliation or claim of copied proprietary geometry.

## SRC-TE-OP1 — Teenage Engineering OP-1 field
Access: **page-or-search-excerpt**. Type: manufacturer.
Source: <https://teenage.engineering/products/op-1>
Verified scope: Reference for restrained aluminium construction and a compact instrument interface.
Limitations: Only surfaced product description reviewed, not a complete physical usability study.

## SRC-TE-TP7 — Teenage Engineering TP-7
Access: **page-read**. Type: manufacturer.
Source: <https://teenage.engineering/products/tp-7>
Verified scope: Reel interaction provides a functional navigation/scrubbing reference.
Limitations: No product sound recording or visual asset is bundled. A dial is a proposed progressive enhancement, not a required control.

## SRC-WCAG-TEXT — WCAG 2.2 Understanding Contrast (Minimum)
Access: **page-read**. Type: standard.
Source: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
Verified scope: Normal text requires 4.5:1; qualifying large text requires 3:1. Do not round a failing result up to the threshold.
Limitations: Checking selected pairs alone is not WCAG conformance.

## SRC-WCAG-NONTEXT — WCAG 2.2 Understanding Non-text Contrast
Access: **page-read**. Type: standard.
Source: <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
Verified scope: Meaningful graphical and component boundaries need appropriate contrast, commonly 3:1 against adjacent colours.
Limitations: Which marks are essential and which backgrounds are adjacent must be tested in context.

## SRC-ARIA-SLIDER — WAI-ARIA APG Slider Pattern
Access: **page-read**. Type: standard-guidance.
Source: <https://www.w3.org/WAI/ARIA/apg/patterns/slider/>
Verified scope: Keyboard and value semantics inform a dial implemented as a slider. Touch assistive-technology support needs real testing.
Limitations: A numeric slide index is not evidence of complete screen-reader compatibility.

## SRC-OAI-SKILLS — OpenAI plugin skills concepts
Access: **search-excerpt**. Type: official-documentation.
Source: <https://developers.openai.com/plugins/concepts/skills>
Verified scope: Skills are a documented extension mechanism; inspect host capabilities before choosing an adapter.
Limitations: Does not establish a public command called openai slides generate or disclose proprietary Slides internals.

## SRC-OAI-WORKFLOW — OpenAI Codex workflow overview
Access: **search-excerpt**. Type: official-product-page.
Source: <https://openai.com/index/codex-for-every-role-tool-workflow/>
Verified scope: Product material describes workflow capabilities.
Limitations: A product description is not an inspected implementation or public API contract. No Spaces Slides source snapshot was recovered.

## SRC-AE2013 — Garner & Alley (2013): How the Design of Presentation Slides Affects Audience Comprehension of a Technical Presentation
Access: **abstract-or-index**. Type: primary-research.
Source: <https://pure.psu.edu/en/publications/how-the-design-of-presentation-slides-affects-audience-comprehens/>
Verified scope: A technical-presentation study compared assertion-evidence and conventional slide approaches in an engineering-student sample.
Limitations: Context-specific evidence, not proof of universally optimal reading order or persuasion.
Locator: `{"publication": "International Journal of Engineering Education 29(6), 1564–1579", "year": 2013}`

## SRC-COLOR2024 — Meusel, Scheller, Rey & Schneider (2024): background colour cues in learning
Access: **publisher-page**. Type: primary-research.
Source: <https://link.springer.com/article/10.1007/s10639-024-12460-1>
Verified scope: The reported learning task cautions against assuming that background colour cueing alone guarantees a benefit.
Limitations: Task, participant and floor/ceiling limits matter; not a live-presentation optimisation result.
Locator: `{"doi": "10.1007/s10639-024-12460-1", "year": 2024}`

## SRC-SIGNAL2024 — Conrad & Obermaier: text-image signalling in geography learning
Access: **abstract-or-index**. Type: primary-research.
Source: <https://zgd-journal.de/index.php/zgd/en/article/view/486>
Verified scope: School geography text-image signalling offers a context-specific lead for label/evidence proximity.
Limitations: Do not extrapolate a school-learning abstract into a universal adult pitch rule.
Locator: `{"doi": "10.60511/52486", "year": 2024}`

## SRC-HIGHLIGHT2025 — Sun & Nembhard: The Effect of Highlighting on Cognitive Load and Visual Attention in Multimedia Learning
Access: **search-excerpt-fulltext-blocked**. Type: primary-research.
Source: <https://www.tandfonline.com/doi/full/10.1080/10447318.2025.2478274>
Verified scope: A 2025 research lead involving highlighting and attention measurement was located.
Limitations: Full-text access returned HTTP 403; no effect-size, sample-size or outcome claim is made here.
Locator: `{"doi": "10.1080/10447318.2025.2478274", "year": 2025}`

## INPUT-EXEC — Recovered workpack-description report
Access: **full-file-read**. Type: user-provided-or-recovered-file.
Local input: `inputs/original-executive-report.txt`.
Verified scope: Retained as non-normative input.
Limitations: Not an independently verified technical specification or official movie source.
Locator: `{"localPath": "inputs/original-executive-report.txt", "sha256": "44670c5e5fffc66bf390c22f422865df6d81f290592eedf9efe4bc82ebe024d4"}`

## INPUT-PALETTE — Recovered palette overview report
Access: **full-file-read**. Type: user-provided-or-recovered-file.
Local input: `inputs/original-palette-report.txt`.
Verified scope: Retained as non-normative input.
Limitations: Not an independently verified technical specification or official movie source.
Locator: `{"localPath": "inputs/original-palette-report.txt", "sha256": "27e818bab2d27eec795f790edf13d7c4e1017f3b95637997ef884ac2b33f3748"}`

## INPUT-SCREENSHOT — User-supplied palette screenshot
Access: **full-file-read**. Type: user-provided-or-recovered-file.
Local input: `inputs/palette-screenshot.png`.
Verified scope: Retained as non-normative input.
Limitations: Not an independently verified technical specification or official movie source.
Locator: `{"localPath": "inputs/palette-screenshot.png", "sha256": "4eba587e7000b5d7c181c3493063b61279809026df69a5dc2efaf3d0cfc972ba"}`

## Model routing sources added in v1.1

### SRC-MODEL-CATALOG — OpenAI API model catalogue

https://developers.openai.com/api/docs/models

Checked 2026-10-21. Catalogue identifies GPT-6.1 Sol as a balance of intelligence and cost. Limitations: API catalogue entries do not establish availability in this user's Codex picker, subscription or installed CLI.

### SRC-MODEL-EFFORT — OpenAI reasoning effort guidance

https://developers.openai.com/api/docs/guides/reasoning

Checked 2026-10-21. Effort availability is model-dependent; higher effort can use more tokens and take longer. xhigh should be evaluated for a justified benefit rather than used indiscriminately. Limitations: No per-task DeckWeft benchmark was performed; all routing decisions are project recommendations.

### SRC-CODEX-MODELS — Codex model and effort selection

https://learn.chatgpt.com/docs/models

Checked 2026-10-21. Interactive CLI exposes /model for model and effort selection; interface controls vary by client. Limitations: The retrieved Codex guide still illustrated GPT-5.6 models while the API catalogue listed newer models. No client or account was inspected; bind only an actually visible user-approved model.

### SRC-CODEX-EFFORT-CONFIG — Codex configuration reference

https://learn.chatgpt.com/docs/config-file/config-reference

Checked 2026-10-21. Documents model_reasoning_effort; xhigh support is model-dependent. Limitations: A Markdown instruction does not itself set this configuration; no host configuration was changed.

