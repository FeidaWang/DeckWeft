# DeckWeft 设计交接包 · 分步开工提示词

整理日期：2026-10-19。依据 `DeckWeft_Design_Handoff/`（路线图 v1.0、Pattern Register、Source Register）与仓库当前状态（`roadmap.json`、`docs/en/handoff.md`、VIS-013 implemented-local，VIS-014 planned）。

本文是计划与提示词，不是授权记录。每一步在新 session 中开工，先贴「通用前置段」，再贴该步骤的提示词。

---

## 0. 交接包与仓库的对齐结论

交接包自述「本次未修改 DeckWeft 仓库，也未核验现有代码」。它提出的 DWD 工作项与仓库已实现的 VIS 任务重叠很大，开工时必须先映射，不能按 DWD 重新建一套。

| 交接包工作项 | 仓库现状 | 开工处理 |
|---|---|---|
| DWD-001 证据注册表 | 无。两个 Register JSON 尚未进仓库 | 步骤 S0 导入并加状态字段 |
| DWD-010 宿主基线（对应 DW-020） | DW-020 blocked overall；Codex CLI 有实测，Claude 登录 deferred；`docs/evidence/` 多份记录 | S0 汇总为能力矩阵，不新跑宿主 |
| DWD-020 SceneSpec / tokens | 已有 `presentation-v3`、`design-plan`、`web-scene`、`theme-pack` schema 与显式迁移 | S1 在现有 schema 上扩字段，不新建平行契约 |
| DWD-030 字体与布局（DW-130） | implemented-local，真实 Canvas 测量 | 复用，不重做 |
| DWD-040 交互与静态状态（DW-120） | VIS-009 implemented-local；DW-120 partial（IME / 200% zoom / 读屏未做） | S2 垂直样本检验 staticState；可访问性缺口保持 open |
| DWD-100 三核心主题 T01–T03 | 已有三个主题包 cream-collage / electric-violet / dark-data，与 T01–T03 不是同一组 | VIS-014 用现有三主题；T01–T03 归入 VIS-015（S8） |
| DWD-110 语义图表核心 | VIS-008 六种精确数据图表变体 | S4 对照 C01–C24 补缺并加 ChartSpec 字段 |
| DWD-120 统一时间线 | `src/motion/` cues / timeline / policies，确定性回放与 seek，reduced motion | S5 对齐六个动作原语与播放器接口 |
| DWD-125 受控比较 | VIS-009 已有 range / series selection、diagram steps | S5 按 EvidenceStage 蓝图拆分状态字段 |
| DWD-130 输出适配 | HTML 导出有审查门；v3 原生 PPTX / PDF 是 VIS-016 planned；`src/targets/capabilities.mjs` 拒绝未支持目标 | S7 先做 L1/L2/L3 声明，再做 VIS-016 |
| 12 个结构族 | VIS-006 六族：statement / image / metric / evidence / comparison / process | VIS-014 要求再加六族，S3 从交接包 12 族中选 |
| 12 页验收故事板 | 需求文档第 9 节已有另一版 12 页 gallery（每主题 4 页） | S6 需要二选一或合并成一份冻结清单 |
| DWD-200–230 作者偏好 / 探索 / 历史 | VIS-013 已有 scoped choices、locks、history；探索场景与 T04 / T05 为新增 | S9 |
| DWD-300–310 高级视觉 / 模式库维护 | EXP-001 planned；模式库维护无对应任务 | S10 |

两个需要用户拍板的点，开工前确认：

1. 12 页冻结 gallery 用哪一版：需求文档第 9 节（按现有三主题各 4 页），还是交接包第 42 页（12 个内容任务，三主题各跑一套）。建议采用交接包版做故事板、需求文档版做诊断 gallery，两者都保留。
2. T01–T03 是替换 VIS-015 计划中的 silver-gray-editorial / fresh-report / orange-launch，还是并列。建议替换，因为交接包给出了完整的构图、字体角色与验收样页。

---

## 1. 模型与强度推荐

| 步骤 | 模型 | 强度 | 理由 |
|---|---|---|---|
| S0 对齐与证据注册 | Opus 5.5 | high | 读 60+ 文件后做结构化映射，判断多、写代码少 |
| S1 契约扩展 | Fable 5.1 | high | 跨 schema / 渲染 / 导出的全局推理，错误会传播到后面每一步 |
| S2 垂直样本 | Opus 5.5 | xhigh | 长程 agentic，要跑浏览器、看图、改多个模块 |
| S3 六个新增构图族 | Opus 5.5 | xhigh | 大量实现 + 108 级候选测量 + 看图 |
| S4 图表契约与补图 | Opus 5.5 | xhigh | 数据语义规则多，需要严格测试 |
| S5 时间线与受控比较 | Opus 5.5 | xhigh | 状态机与资源清理，回归面大 |
| S6 VIS-014 发布门 | Opus 5.5 | xhigh | 集成与整套审图，弱页也要审 |
| S7 输出等级与 VIS-016 | Opus 5.5 | xhigh；卡住时单次 max | PPTX 编译与逐元素回执，正确性优先于成本 |
| S8 T01–T03 原创主题 | Fable 5.1 或 Opus 5.5 | high | 艺术方向判断重于代码量 |
| S9 作者偏好与探索场景 | Opus 5.5 | xhigh | 交互蓝图 A 的状态恢复规则复杂 |
| S10 模式库维护 | Sonnet 5.5 | medium | 机械的注册表维护与文档 |

说明：

- Claude Code 默认强度是 xhigh。只在读多写少的步骤（S0、S8、S10）调低；只在 S7 导出正确性反复失败时单次用 max。
- Haiku 5.5 不建议独立承担任何步骤。可作为子代理做 JSON 转换、逐条校对来源 URL 这类机械任务。
- 并行：S1 完成后，S3 / S4 / S5 分别只碰 `src/design/`、`src/components/`、`src/motion/`，可以三个 worktree 并行。S2 必须在它们之前单独跑完，因为它的目的是暴露契约冲突。
- 每步一个新 session、fresh context、自己的 worktree。不要让两个写代码的 session 碰同一组文件。

执行顺序：S0 → S1 → S2 → (S3 ‖ S4 ‖ S5) → S6 → S7 → S8 → S9 → S10。

---

## 2. 通用前置段（每次开工先贴）

```text
Read AGENTS.md, CLAUDE.md, README.md, ROADMAP.md, roadmap.json,
docs/en/handoff.md and docs/en/verification.md first. Files and test
results override conversational claims.

Then read the design handoff package at DeckWeft_Design_Handoff/:
README.md, DeckWeft_Design_Roadmap.md, DeckWeft_Pattern_Register.json
and DeckWeft_Source_Register.json. Treat every theme, component name,
duration, token value, priority and acceptance target in that package as
a proposal. It was written without inspecting this repository. Do not
assume the repository lacks something until you have looked.

Rules that apply to this task:
- Node 22+, ESM, no new runtime dependency without measured justification.
- schemas/*.json are the contract. No coercion or silent repair. Any
  schema change ships with an explicit migration that preserves legacy
  input and a negative fixture.
- Keep content, layout, rendering, storage and host packaging separate.
  Derived scenes drive every exporter. Never flatten a slide to hide a
  fidelity failure.
- Facts, datasets, units, sources, stable IDs and author locks stay
  independent of themes and motion.
- English in code and docs; keep the zh-CN pages accurate when you touch
  their English counterparts.
- Use state words exactly: Proposed / Implemented / LocalVerified /
  HostVerified / ExportVerified. implemented-local never means host or
  application certification.
- Claude sign-in stays deferred. Do not retry it, infer billing, add a
  paid provider, push, publish, or create scheduled jobs.
- Visual changes need real browser capture after fonts and images are
  ready, in an isolated automation browser outside /Applications with a
  temporary profile, and you must actually view the images.
- Run npm run verify before claiming completion. Report which tests ran,
  what you visually inspected, and which applications were unavailable.
  Update roadmap status only with evidence.
```

---

## 3. 分步提示词

### S0 · 对齐与证据注册（DWD-001 + DWD-010 汇总）

模型 Opus 5.5 · 强度 high · 只读为主，产出文档与一份 JSON。

```text
Task: align the design handoff package with the repository and register
its evidence. Do not change runtime code in this task.

1. Build a mapping table from every DWD item (001–040, 100–130, 200–230,
   300–310) and every handoff pattern ID (F01–F12, M01–M20, C01–C24) to
   the existing VIS/DW/MB/EXP tasks, source modules and evidence files.
   For each row record: exists / partially exists / missing, the file
   that proves it, and the current state word.
2. Import DeckWeft_Pattern_Register.json and DeckWeft_Source_Register.json
   into docs/design/ (or the location you justify) with added fields:
   repositoryStatus, implementedBy (module or task id), verifiedBy
   (evidence path), checkedAt. Keep the original V / S / D / P evidence
   marks untouched. Patterns with only S or D evidence must not be marked
   verified.
3. Produce one capability matrix from existing evidence only: local
   browser, Codex host, Claude host (deferred), remote CI, PowerPoint,
   Keynote, LibreOffice, Figma, After Effects. Cite the evidence file for
   each cell. Cells without evidence are Unknown, not failed.
4. List the handoff's 12 structure families against the six existing
   composition families in src/design/compositions.mjs and the theme
   composition lists in themes/*/theme.json. Propose which six to add for
   VIS-014 and why.
5. List the handoff's C01–C24 chart kinds against the chart variants in
   src/components/charts/model.mjs. Mark each as existing, extension of
   an existing variant, or new.
6. Write docs/plans/design-handoff-alignment.md with the tables above,
   the two open decisions (which 12-page gallery is frozen; whether
   T01–T03 replace the VIS-015 planned themes), and a gap list ordered by
   the handoff's P0 → P3.

Done looks like: the alignment document, the two imported registers with
status fields, and npm run check passing on link integrity. No roadmap
status changes.
```

### S1 · 契约扩展（DWD-020 + ChartSpec / MotionPlan / StaticState 字段）

模型 Fable 5.1 · 强度 high · TDD，先写失败的 schema 测试。

```text
Task: extend the existing v3 contracts so one scene carries the handoff's
semantic, chart, motion and static-state information, using stable IDs.
Read docs/plans/design-handoff-alignment.md first.

Scope:
- Do not create parallel SceneSpec / ChartSpec / DesignIntent / MotionPlan
  / StaticState schemas. Map each onto presentation-v3, design-plan,
  web-scene, theme-pack and the author profile in src/design/profile.mjs.
  Add fields only where the alignment document shows a gap.
- Candidate fields, each to be confirmed against existing schemas before
  adding: scene takeaway, contentStatus (evidence-required /
  illustrative / sourced), keyStates with a named staticState, locked
  object list by category (text, data, sources, composition); chart
  question, takeaway, chartKind, dataset identity (id, version, source,
  collectedAt, validPeriod), field definitions (unit, denominator,
  sample, normalized, betterDirection), axis declarations (linear/log,
  domain, sort), missing-value reasons, interval type with bounds and
  method, filter / focus / selection state and the frozen static
  selection; motion key states, trigger kind, clock, reducedMotion
  fallback.
- Theme tokens: check theme-pack.schema.json against the handoff's role
  model (display / body / numeric / code / cjkDisplay / cjkBody; surface /
  text / accent / chart.series / reference / missing; motion duration /
  distance / easing / delay / intensity / fallback). Add missing roles as
  optional with documented defaults.
- Every schema change: explicit migration in src/, a legacy fixture that
  still loads unchanged, a negative fixture that is rejected, and
  regenerated types via npm run types.
- Encode the six misreadings as validation rules with tests: bars start
  at zero unless an explicit truncation flag and note exist; log axes are
  declared per chart; percentage denominators are declared; interval
  types are not mixed; missing values are never coerced to zero; event
  adjacency is never labelled causal.

Done looks like: all existing tests still pass, new contract tests pass,
docs/en/architecture.md and the zh-CN counterpart describe the fields,
and the migration manual lists the new fields with expected results. No
renderer behaviour change in this task beyond reading the new fields.
```

### S2 · 垂直样本（P0 一页研究证据）

模型 Opus 5.5 · 强度 xhigh · 必须真实浏览器与看图。

```text
Task: run one complete evidence scene through the whole pipeline to expose
contract, font, interaction and export conflicts before any template work.

The scene: one claim, one bar chart with explicitly labelled illustrative
data, one source, one legend focus. Build it in both English and
Simplified Chinese with a long title and mixed punctuation.

Path to complete end to end, recording each stage's result:
import data → choose theme (use two existing theme packs) → measure
fonts after document.fonts.ready → switch legend focus by mouse and by
keyboard → pause and seek → freeze the author-chosen staticState → export
HTML through the existing review gate → report the declared PPTX / PDF
level for each component (L1 editable, L2 vector with real text, L3
image with summary) without implementing new export code.

Requirements:
- Theme switch changes composition and type roles, not facts, IDs or
  sources. Assert equality of the semantic document before and after.
- Keyboard focus change must not advance the page. Rapid next/previous
  must cancel pending async work; verify zero leftover timers.
- The static state must contain the title, chart, visible labels, legend
  identity, source and caption without any pointer-dependent fact.
- Record every conflict you hit as an issue list with file, state and
  reproduction; fix only what blocks the path and leave the rest listed.

Done looks like: a reproducible script or test under tests/ that drives
the path, captured and viewed screenshots for both languages at 1440 and
390 px, the conflict list in docs/plans/design-handoff-vertical-sample.md,
and npm run verify passing.
```

### S3 · 六个新增构图族（VIS-014 前置，DWD-100 结构语法）

模型 Opus 5.5 · 强度 xhigh · 可与 S4、S5 并行，只碰 `src/design/`、`themes/`、相关测试。

```text
Task: add the six composition families chosen in
docs/plans/design-handoff-alignment.md to src/design/compositions.mjs and
to all three existing theme packs, following the VIS-006 pattern.

Likely candidates from the handoff: Chapter, BeforeAfter, SystemMap,
SmallMultiples, Quote, Table/Reference, Conclusion/NextStep. Pick six
and justify the omission.

For each family: three variants that change proportion, position and
reading path (not colour), a required block type, focus and density
metadata, response rules for 390 / 1024 / 1440 px, and a semantic
reading order that survives narrow screens. SmallMultiples must declare
shared scale and allow page splitting. BeforeAfter needs the same object
and an explicit baseline label that stays visible without interaction.
Quote must separate verbatim quotation, paraphrase and attribution.

Rhythm rules from the handoff to encode in src/design/rhythm.mjs with
tests: a typical 10–15 page deck uses at least four families; the same
composition does not repeat more than twice in a row unless the content
is a sequence or comparison; no three consecutive "heading plus three
cards". Author overrides must still win.

Verification: measured candidates for every new family across three
themes and two languages, at least two passing candidates per
representative scene, contact sheets actually viewed, failed candidates
excluded not hidden. Existing 108-candidate suite still passes.

Done looks like: twelve families total, new browser evidence under
docs/evidence/, docs/en/visual-studio.md updated, npm run verify passing.
Do not touch src/components/ or src/motion/ in this task.
```

### S4 · 图表契约落地与补图（DWD-110）

模型 Opus 5.5 · 强度 xhigh · 可与 S3、S5 并行，只碰 `src/components/charts/`、`src/render/svg.mjs`、相关测试。

```text
Task: make the chart renderer honour the ChartSpec fields added in the
contract task and add the missing P1 chart kinds.

1. From docs/plans/design-handoff-alignment.md take the C01–C24 mapping.
   Implement the P1 kinds marked new or extension, in this order of
   explanatory value: direct-labelled bar (C01), grouped bar (C02), dot
   and interval (C09), trend with end labels (C13), small multiples
   (C17), qualified benchmark table (C05), stacked composition (C03),
   sortable ranking matrix (C04). Stop where the budget ends and list the
   rest.
2. One data object produces the graphic, the numeric summary, the
   accessible data table and the export content. No number is typed
   twice in SVG, prose or export.
3. Enforce the validation rules from the contract task at render time
   with clear DeckError codes: zero baseline, declared log axis,
   declared denominator, unmixed interval types, missing not zero,
   adjacency not causality. A ranking matrix that becomes a numeric
   heatmap must redefine its colour scale from real values and drop the
   rank legend.
4. Style layer may change type roles, stroke, colour, caption position,
   label strategy and whitespace; it may not change data, unit, source,
   comparison condition or betterDirection. Write a test that switches
   all three themes and asserts the data table is byte-identical.
5. Every chart has a short description, a fuller takeaway and a data
   table in the static state. Labels needed to read the conclusion are
   visible without hover.

Verification: exact-data mutation tests, bilingual rendering at three
widths with real browser measurement, contact sheets viewed, black-and-
white export still distinguishes main series by shape or label.

Done looks like: new kinds documented in docs/en/components.md with
expected results, evidence recorded, npm run verify passing.
```

### S5 · 统一时间线与受控比较（DWD-120 + DWD-125，蓝图 B）

模型 Opus 5.5 · 强度 xhigh · 可与 S3、S4 并行，只碰 `src/motion/`、`src/render/player.mjs`、`src/scene/web/`、相关测试。

```text
Task: align the existing motion system with the handoff's state-first
model and the EvidenceStage blueprint without rewriting VIS-009.

1. Map the six proposed primitives (FadeIn, RevealMask, SlideSmall,
   Crossfade, SeriesReveal, AnnotationReveal) onto existing cues in
   src/motion/cues.mjs. Add only what is missing. Each primitive declares
   its reduced-motion result: content directly visible, target layout
   directly entered, or full graphic with conclusion shown.
2. Player surface: play, pause, seek, next, previous, restart and
   reducedMotion share one clock. Random visuals persist a seed. Fast
   paging and back-navigation cancel the previous scene's async work;
   assert zero remaining timers, animations and registered resources, as
   the VIS-009 background-tab probe already does.
3. Three advancement modes share semantics: presentation advances by key
   state, long-page reading keeps document flow, scroll story maps
   progress to key state. Intersection Observer is for enter/leave and
   resource management only; do not use it as a pixel timeline.
4. EvidenceStage: store metricId, datasetId, focusSeries, sortKey, scale
   and caption as separate state, never one activeIndex. Changing a
   metric updates name, unit, direction, data, footnote and source
   together; changing the axis updates title, scale, domain, point
   definition and missing note; focusing a series updates button state,
   marks, visible labels and the caption filter; sorting moves whole
   rows with data and announces the order to assistive technology.
5. Test "focus one series" and "hide one series" as distinct behaviours.
   The Haiku page evidence is single-series focus; do not generalise it
   to multi-select. Static output freezes the author's selection and
   offers all series or a panel expansion when a full comparison is
   needed.
6. Keyboard parameter changes never trigger page navigation. Verify
   with real browser keyboard traces at 1440 and 390 px.

Done looks like: docs/en/interactions.md updated with expected results
and recovery steps, deterministic replay tests, browser evidence viewed,
npm run verify passing. No composition or chart-kind changes here.
```

### S6 · VIS-014 发布门：冻结 gallery、8 页故事、独立包

模型 Opus 5.5 · 强度 xhigh · 集成任务，全套审图。

```text
Task: implement and run the VIS-014 first visual release gate using the
three existing theme packs and the twelve composition families.

Content: use the decision recorded in docs/plans/design-handoff-alignment.md
for the frozen 12-page gallery. If the handoff storyboard was chosen,
build the twelve tasks (Chapter long bilingual title; Thesis + SideNote;
Sequence; Comparison with missing values and units; EvidenceChart with
direct values and source status; DotInterval with method; ObjectAnatomy
with pointer, keyboard and whole state; ScenarioSnapshot static
comparison only; BeforeAfter with registered images and permanent
labels; Reference with disclosure and static appendix; Quote with no
invented quotation; Conclusion with one action). Fixture data is real
with provenance or explicitly marked illustrative. Include long English
words, CJK proper names, multilingual numerals and units, a source URL
and a constrained text block.

Gate steps:
1. Run the gallery in English and Simplified Chinese for each theme.
   Assert facts, data tables and sources are identical across themes.
2. Build one coherent bilingual 8-page story per theme. Approve the whole
   story including its weakest pages; record the weakest page per story.
3. Exercise at least three interaction types with real browser traces.
4. Run explicit cases for: long title, overlong legend, missing glyph,
   no-image asset, missing data, reload, rapid paging, pause and resume,
   export final state. Record page, state, host, reproduction and fix
   for every failure.
5. Compare the same content against the VIS-001 legacy baseline.
6. Package the standalone export and run it outside the repository.
7. Host runs: record the actual Codex prompt-to-artifact task and scoped
   revision. Claude remains deferred; mark its cell deferred, not failed.

Add docs/visual-acceptance/ with the gallery manifest, story cases, host
receipts and a scored review using the requirements' rubric as advisory.
Automated scores do not certify the output.

Done looks like: VIS-014 status updated only to the state the evidence
supports, remaining gates (other engines, screen reader, IME, 200% zoom,
Claude host) listed explicitly, npm run verify passing.
```

### S7 · 输出等级声明与 VIS-016 原生导出（DWD-130）

模型 Opus 5.5 · 强度 xhigh；导出正确性反复失败时单次切 max。PowerPoint / Keynote 的实际打开由用户在本机完成。

```text
Task: declare per-component output levels and build the target-specific
editable export for v3 scenes, extending the existing export path.

1. Every component declares, per format (web, PDF, PPTX), a level: L1
   editable real text, shapes and supported charts; L2 embedded vector
   with title, caption and source kept as real text; L3 high-resolution
   image plus semantic summary. Write the declaration into
   src/targets/capabilities.mjs and expose it in the export report.
2. Export order, enforced in code with tests: load and confirm fonts and
   assets → apply the author's staticState → freeze filters, sort and
   parameters → stop loops and random variation → reveal required
   labels, sources and method notes → render per target → check each
   page's content and layout against the derived scene.
3. Static delivery rules: masks and staged reveals export the complete
   final state or expanded key-state pages; hover facts become visible
   annotations; filters export the selected result with its state
   written out; scroll stories become stepped pages; video, canvas and
   shader scenes export a cover, key frame, summary and optional link;
   legends keep series identity, scale and intervals; shared-element
   transitions export both full layouts.
4. VIS-016: add src/targets/pptx/compile.mjs, fallbacks.mjs, audit.mjs
   and compatibility-report.mjs. Compile semantic content into native
   text, supported charts, shapes, connectors, images and notes. Every
   unsupported element gets an explicit per-element receipt. Never
   present a whole-slide screenshot as editable. Charts that must stay
   editable export the ChartSpec data and component information, not a
   screenshot alone.
5. Check PPTX editability, PDF searchability, accessibility and visual
   fidelity as four separate results. A file that opens is not a pass.

Verification: package and XML inspection via the existing tests/inspect_*
scripts, LibreOffice render if available, and a clear list of what still
needs PowerPoint or Keynote on the user's machine.

Done looks like: export report per deck listing levels and receipts,
docs/en/compatibility.md updated, VIS-016 status set only to what the
evidence supports, npm run verify passing.
```

### S8 · T01–T03 原创主题（VIS-015）

模型 Fable 5.1 或 Opus 5.5 · 强度 high · 艺术方向判断为主；先做静态样页。

```text
Task: implement the handoff's three first-wave art directions as theme
packs, replacing or sitting beside the VIS-015 planned themes per the
recorded decision: T01 Editorial Fieldnotes, T02 Research Atlas, T03
Luminous Stage (static hero version, no shader).

Rules:
- A theme must change composition, type roles, media ratio and motion
  character, not only colours. Each theme ships at least two title
  compositions, two evidence compositions and one closing page.
- The handoff's hex values are starting points. Verify every
  foreground/background pair at the actual sizes and weights: 4.5:1
  for body, 3:1 for large text and meaningful graphics. Record the
  measured ratios.
- Fonts: Source Serif, IBM Plex and Noto CJK are candidates only. Do not
  bundle any font file. Use platform fonts or an opt-in licensed asset
  path, and record the licence check. Measure after fonts load.
- T01 and T02 may pair in one deck: shared type scale, footnotes and
  stable colour meaning; legend meaning must not drift between chapters.
- T03 acceptance: title contrast, media-failure cover, low-motion mode
  and static composition. The name does not imply WebGL.
- Build the acceptance sample pages listed in the handoff for T01
  (cover, two-column thesis, chart evidence, method with margin note,
  quotation, conclusion) and T02 (single-chart conclusion, multi-metric
  table, four-panel comparison, method flow, uncertain conclusion,
  evidence appendix) before adding any motion.

Verification: the frozen 12-page gallery in all three new themes, both
languages, facts identical across themes, black-and-white export of T02
still distinguishes main series, contact sheets viewed.

Done looks like: themes/<id>/theme.json with attribution, gallery
evidence, docs/en/visual-studio.md theme section updated, VIS-015 status
only as supported, npm run verify passing.
```

### S9 · 作者偏好与探索场景（DWD-200 / DWD-210，蓝图 A）

模型 Opus 5.5 · 强度 xhigh。

```text
Task: extend the VIS-013 workbench with the handoff's author controls and
implement the Explain → Diagram → Explore blueprint with original content.

Author controls:
- Default entry asks Topic / Audience / Style / Detail / Motion / Output
  only. Generate three substantively different previews from the same
  content, explain what changes in graphics, type, media and motion,
  then expand to the deck.
- Actions with defined system behaviour: More editorial; Give the chart
  more space; Make quieter; Keep this layout; Replace the visual; Reduce
  text. Each explains its effect before applying.
- Four-level overrides: deck, chapter, page, object. Locks for text,
  data, sources and composition are stored separately. Partial redo
  states its scope first. Theme change never alters facts. Undo and
  history keep relationships.
- Page-count planning from argument units (question, background,
  mechanism, evidence, limits, action). When material is insufficient
  the generator asks or marks evidence-required; it never invents data
  or quotations to reach a page count.

Blueprint A key states: Explain (question, short answer, object name;
Next / Previous / Skip), Diagram (whole object, part labels, reading
order; select part, show whole), Explore (parameters, selected part,
result and baseline; buttons, keyboard, range), Static (author-chosen
complete explanation). Acceptance: select a part, go to the next page,
come back; selection restores by an explicit rule. Keyboard range input
never advances the page. Reduced motion still reaches every stage.
Export never leaves disassembled parts with an unexplained slider.

Only add a parameter control when changing the input explains a
valuable relationship. Otherwise keep the content static.

Done looks like: docs/en/workbench.md updated with steps and expected
results, browser traces for the restore rule and keyboard isolation,
npm run verify passing.
```

### S10 · 模式库维护与 P3 边界（DWD-310）

模型 Sonnet 5.5 · 强度 medium · 文档与注册表维护。

```text
Task: make the imported pattern and source registers maintainable and
record the P3 boundary.

1. Add to each pattern record the maintenance fields from the handoff:
   patternId / version, sourceUrl / locale / checkedAt, evidenceType /
   observedBehavior, dataRequirements / interactionState,
   staticFallback / outputTier, accessibility / assetStatus,
   verification / deprecatedBy. Fill only what existing evidence
   supports; leave the rest null.
2. Write docs/design/pattern-register.md: how to add a pattern (only when
   a distinct design appears; content updates on the same template are
   new sources or instances), how to run a browser check for a new
   pattern, and how an upstream site change is recorded without altering
   existing decks (old decks pin theme and component versions; upgrade
   is an author choice; deprecating an expensive effect keeps its static
   state).
3. Record what a full site-by-site verification would still need:
   per-template desktop/mobile, initial/interaction/reduced-motion/static
   states for OpenAI's 1,390 discovered zh-Hans-CN paths; a verifiable
   full URL list for Anthropic, which this package could not obtain.
4. Record the P3 deferrals as EXP-001 notes: no full-screen persistent
   particles, no multi-layer blur, no 3D without a static final state,
   no mouse-only openings, no semantics-free number rolling before P1
   acceptance. Performance budgets require a fixed reference device,
   browser version, resolution, DPR and power mode before any number.

Done looks like: register files validated by a small test, the manual in
English and Simplified Chinese, npm run check passing. No code changes.
```

---

## 4. 开工前后的检查

开工前：确认第 0 节的两个决策已记录；确认目标步骤的前置步骤已在 `roadmap.json` 或 evidence 中有记录，而不只是对话里说过。

收工时：对照 AGENTS.md 的要求报告跑了哪些测试、看了哪些图、哪些应用不可用；状态词只用 Proposed / Implemented / LocalVerified / HostVerified / ExportVerified；不要因为文件能打开就标 pass。
