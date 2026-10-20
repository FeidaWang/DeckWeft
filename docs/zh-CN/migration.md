# 迁移：先保留旧配方，再制作新文稿

[English](../en/migration.md) · [首页](../../README.zh-CN.md)

旧格式来自 Open Deck Skill / Open Deck Astra。DeckWeft 能导入其中一部分旧项目文件，但不假装支持所有旧格式。

先备份原 JSON，然后运行：

```bash
node bin/deckweft.mjs import old-project.json --out imported.deck.json
node bin/deckweft.mjs check imported.deck.json
```

当前仅明确迁移旧 `schemaVersion: 2` 的支持字段：标题、文字、要点、数字、备注和已知布局。输入文件不改写，完整原数据归档到 `extensions.legacy.original`。不安全或重复的页面 ID 会重建，旧分数重新计算。

旧媒体、主题覆盖、锁定、引用格式和自定义动效只是保存在归档里，**不会自动变成可渲染功能**。导出前需要人工核对。

无效的当前 DeckWeft 文件不会被偷偷修成“看似有效”；未知版本、任意 PPTX、旧 PPTD 都会明确拒绝。网页导入会生成新项目 ID，避免覆盖已有文稿。

新安装器只写新目录，不会删除旧插件。先验收新的导出流程，再通过宿主管理器移除旧插件。排查问题时尽量不要同时启用两套相似触发器。

活动代码、界面、包名和手册使用 DeckWeft；旧名只在迁移、审计和 [NOTICE](../../NOTICE.md) 中作为来源保留。原 [LICENSE](../../LICENSE) 完整保留。

## 启用严格误读守卫

v3 文稿在 2026-10-19 新增了可选的图表、数据集、场景、动效与主题字段（[字段清单](architecture.md#版本-3-交接字段s12026-10-19)）。六条误读守卫中有五条只在相关字段存在时生效，所以现有 v3 文稿全部原样加载。第六条——百分比必须声明分母——会拒绝现有示例与演示，因此改为显式启用：`rules.misreading: "strict"`。

```js
import {declareChartSemantics} from './src/core/adapters/chart-semantics.mjs';
const strict=declareChartSemantics(document,{datasets:{'adoption-quarterly':{definition:{denominator:'当季活跃团队'},collectedAt:'2026-09-30'}}});
```

预期结果：得到一份已校验的副本，带有 `rules.misreading` 和所声明的定义；输入文稿不被修改，各系列数值逐字节相同。

恢复：

- `MIGRATION_DECLARATION … No denominator was inferred`：某个百分比数据集没有声明分母。在 `datasets.<id>.definition.denominator` 中补上；迁移永远不会猜测。
- `MIGRATION_DECLARATION … does not exist`：声明引用了文稿中不存在的数据集 id。
- `INVALID_PRESENTATION … denominator of percentage dataset`：手工编辑的文稿设置了 `rules` 却没有声明。补上分母或删除 `rules`。

旧示例与反例由 `node --test tests/handoff-contracts.test.mjs` 检查：`tests/fixtures/visual/wave-a.*.json` 原样加载，`semantic-chart.en.json` 携带全部新字段，`semantic-chart.negative.json` 被拒绝。

## 系列聚焦与静态状态（S5）：无需迁移

S5（2026-10-19）新增两个可选计划字段：图表选择上的 `initialFocusSeriesId` 和 `data.focus` 提示（[用法](interactions.md#聚焦一个系列或隐藏它)）。现有计划照常加载与导出，不做任何转换。

1. 未声明 `staticState` 的页面输出不变：无 JavaScript 时绘制完整的作者数据，播放器从作者开场开始（决定 C7）。预期：每份现有导出的读者可见标记逐字节一致（[基线测试](../../tests/handoff-contracts.test.mjs)）。
2. 若要在无 JavaScript 的输出中冻结开场，请添加位置为 0 的关键状态并将其设为静态状态，例如 `"keyStates":[{"id":"opening","position":0}],"staticState":{"keyStateId":"opening"}`。预期：导出文件绘制开场时的选择、步骤、标签或热点，并附一行说明。
3. S5 之前导出的文件保留其内嵌播放器。重新导出即可获得 S5 播放器（按键守卫、聚焦、静态状态测量）。

恢复：若 `data.focus` 提示或 `initialFocusSeriesId` 指向当时已隐藏的系列，计划会被拒绝（`INVALID_INTERACTION … Show a series before focusing it`）；请先显示该系列或修改聚焦对象。`STATIC_STATE_UNIMPLEMENTED` 已不存在。

## 章节、页面折叠内容与分项锁定（S9a）

S9a（2026-10-19）新增可选字段，没有新的 `schemaVersion`：现有文稿与计划照常加载和导出（渲染基线显示没有任何可见文字或数值变化）。

| 字段 | 位置 | 含义 |
|---|---|---|
| `chapters[] {id, startSceneId, profile?}` | 设计计划 | 章节从起始页延续到下一个章节起始页之前。章节配置作用于没有自身页面配置的成员页。 |
| `disclosure {blockIds}` | 设计计划中的页面 | 本页的辅助段落、列表或标注，收在一个关闭的“更多细节”控件后面。 |
| `lockMode`、`lockedDatasetIds`、`lockedSourceIds` | `authorOverrides` | 分开的数据锁定与来源锁定。 |
| `schemas/design-profile.schema.json` | 新契约 | 可复用的设计配置；没有可存放文字、数据、来源、图片或品牌的字段。 |

只有锁定需要迁移，而且只在你需要分项锁定时：

```js
import {separateLocks} from './src/core/adapters/locks.mjs';
const next=separateLocks(project);
```

预期结果：得到一份已校验的副本，`lockMode: "separate"`。原来由锁定对象隐含保护的数据集与来源（图表的数据集、块的来源及其步骤讲解的来源）全部写入 `lockedDatasetIds` / `lockedSourceIds`，不会释放任何锁定。输入不被修改，重复运行得到相同结果。在 Studio 中，第一次使用“数据”或“来源”锁定时会自动运行并说明。

恢复：

- 保存手工编辑的项目时出现 `AUTHOR_LOCK`：它设置了 `lockMode: "separate"` 却没有复制隐含锁定，这会释放锁定。请使用 `separateLocks()`。
- `INVALID_PRESENTATION … A locked dataset is missing` / `A locked source is missing`：锁定指向文稿中不存在的 id。
- `INVALID_DESIGN_PLAN … A chapter starts on a missing page`、`Start at most one chapter on a page`、`Use unique chapter ids` 或 `Chapter ids must differ from page ids`。
- `INVALID_DESIGN_PLAN … A page disclosure holds paragraph, list or callout blocks of the same page` 或 `The focal block, the takeaway and interaction or annotation targets stay on the page`。

新字段的锁定规则：

- 页面的 `composition` 或 `blockIds` 锁定同时冻结该页的折叠内容。
- 文字锁定的内容块不会被移入折叠内容。
- `planPages()` 生成的页数规划带有 `basis` 哈希和所用选项；`applyPagePlan()` 对其他版本的文稿一律拒绝（`PAGE_PLAN_STALE`），并重新推导要拆分或标记的页面。

旧示例与反例由 `node --test tests/s9a-author-controls.test.mjs` 检查：`wave-a.*`、`families.en` 与 `evidence-scene.zh-CN` 原样加载，`tests/fixtures/visual/s9a.negative.json` 中的每个反例都被拒绝。

## 来源呈现、页面意图与媒体角色（CINE 批次 1）

无需迁移。CINE 批次 1（2026-10-20，`docs/plans/cinematic-composition-build-map.md`）为 `schemas/design-plan.schema.json` 的场景新增三个可选字段。没有这些字段的项目照旧验证和渲染：每个已记录的样例与演示的标记在样式表与渲染器版本（`visual-art-direction.13`）之外逐字节相同，见 `docs/evidence/cine-p0/baseline-diff.json`。

- `references: {mode}` —— 本页如何呈现引用。缺省即 `expanded`：每条引用都是通栏区域，即现有渲染。`compact` 把引用移到页脚的来源条，用来源的显示编号标记每个论点，并加一个默认折叠的参考面板列出全部来源；为引语署名的引用留在引语旁。`source-is-subject` 保留所有引用区域并标记本页。编号在每次渲染时按整套顺序重新计算；稳定键是来源 id。规范来源、引用文字与论点绑定不变。只有声明了模式的页面，其 PowerPoint 备注与 PDF 附录才列出编号。
- `intent: {purpose, entry, focusGroupBlockIds?, emptyRegions?}` —— 本页的用途（`explain`、`show-product`、`show-detail`、`compare`、`evidence`、`overview`、`chapter`）与视线入口（`left`、`center`、`contextual`）。缺省即“推断”：用途与入口按内容、构图和页面在整套中的位置得出，标记不变。声明的意图会在页面 section 上写入 `data-purpose` 与 `data-entry`，决定短文字页是居中留白还是结构化排布，并引导节奏中同一类别的版式偏好。主对象就是现有的 `focalBlockId`；声明意图后，引用不能作为焦点块。
- `media: [{blockId, role}]` —— 每张图片或图解的角色（`hero`、`mechanism`、`context`、`supporting`）。未声明的条目取构图默认值（图片页的第一张图片为主体，前后对比的两张图都是主体，图解为机制图，其他图片为辅助）。声明后区域带 `data-media-role`；辅助图片按 260 px 绘制，环境图片占满其栏。

`authorOverrides.sceneLocks[].fields` 接受 `references`、`intent` 与 `media`。新的作者动作是 `fit-page`、`set-intent` 与 `visual-space`（见[视觉工作室](visual-studio.md#页面用途与入口cine-003)）；PDF 导出现在按与 PowerPoint 相同的分段对高页分页（见[验证记录](verification.md)）。

恢复方法：

- `INVALID_DESIGN_PLAN … Choose a reference mode`、`… Quotation … needs an attributing citation on this page`（compact 模式）。
- `INVALID_DESIGN_PLAN … Choose a visual purpose`、`… The focus group must contain the focal block`、`… A citation cannot be the focal block of a page with a declared intent`、`… An empty region is a rectangle normalized to the page frame`。
- `INVALID_DESIGN_PLAN … A media role names an image or diagram of this page`、`… Give … one media role`。
- `splitScene()` / `fit-page` 的 `SCENE_SPLIT`：切分会让某页只剩标题、让要点离开其论点页，或把注释与其目标分开；`AUTHOR_LOCK`：本页的 `blockIds` 已锁定。

旧样例与 `tests/fixtures/visual/cine.negative.json` 的每个用例由 `node --test tests/cine-p0.test.mjs` 检查。

## 主体标注、字号角色与软性特征（CINE 批次 2）

无需迁移。CINE 批次 2（2026-10-21，[计划（英文）](../plans/cinematic-composition-batch-2.md)）给图片槽位简报（`schemas/asset-brief.schema.json`，同样复制到设计计划与网页场景契约中）加入可选字段，并给主题包加入字号角色。没有这些字段的项目照旧校验与渲染：旧版标记与内容哈希不变；样式表为渲染器 `visual-art-direction.14`，播放器为 `semantic-player.7`（两者都已在 `tests/fixtures/visual/render-baseline.json` 中重新记录）。

- `imageSlots[].brief.subjectBounds`——作者画出的主体，按原图归一化的矩形。主体占比报告以它为“已标注”；没有它时报告写明“no subject annotation”，并把整张图当作主体（保守策略，不做任何检测）。
- `protectedRegions[]`（最多 8 个）与 `contextRegion`——裁切的下限与上限。`safeCrop` 让每个保护区与原有的 `safeRegion` 都留在裁切内，且裁切从不超出场景区；当下限装不进所要的比例时以 `PROTECTED_REGION` 拒绝，并指明 `contain` 为替代。`focalPoint` 与 `safeRegion` 仍是必填且具权威性。
- `visibleCaption`（≤ 300 字）——可见的图注。块的 `alt` 仍留在 `<img>` 上，是 PowerPoint 的图片描述，并在页面上受检；图注才是幻灯片与 PDF 的文字。
- `detailLocator: {blockId, region}`——同页另一张显示整体的图片，以及本细节在其中的位置。定位图的 figure 带 `data-locator-for`，并在其裁切内把该矩形画成一个框。
- 证据截图（简报 `role: "product-screenshot"` 且 `factual: true`）整张显示：任何裁切都以 `PROTECTED_REGION` 拒绝，`configureSlot` 把 `display` 设为 `"contain"`，保存的计划里证据裁切不是整图时按名拒绝。
- 主题包声明 `typography.roles`（`title`、`lead`、`body`、`label`、`reference`、`numeric`，1440 px 下的 px 值；PowerPoint 中 1 px = 2/3 pt）。声明了 `references`、`intent` 或 `media` 的页面采用这些角色：除非页面密集（文字块多于四个、列表超过六项或正文超过 250 个度量单位，一个中日韩文字计两个），其正文与导语升到角色字号，且其 section 写入 `--label-size` 与 `--reference-size`；未声明字段的页面保持原字号。自行固定段落字号的构图（证据、系统图、小多图）保持不变；图表与图解的 SVG 标签由各自编译器绘制，不在此调整。
- 测量与诊断：播放器报告每个区域的框与字号范围、每张图片的框、来源条高度与灰度层级审计；`checkRender` 加入七个软性特征与最弱页（[定义（英文）](../visual-acceptance/review.md#soft-features-cine-007)）；`rankCandidates` 先按硬性门禁、再按加权软性特征为一页的三个候选排序，并写明差异。这些都不改变保存的项目。

恢复：

- `SAFE_REGION … The context region must contain the safe region, the subject and every protected region.`
- `PROTECTED_REGION … The protected subject cannot fit this crop. Use contain …` 或 `… Evidence screenshots are shown whole.`
- `IMAGE_SLOT … A detail locator names another image of this page.`
- `CANDIDATE_CONTENT … Compare candidates measured at one viewport …`（A/B 规则）。

旧版夹具与 `tests/fixtures/visual/cine.negative.json` 中标记为 `CINE-005` 的每个用例由 `node --test tests/cine-p1.test.mjs` 检查。
