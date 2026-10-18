# 架构：一份配方，多个交付盒子

[English](../en/architecture.md) · [路线图](roadmap.md)

MB-01～05 的本地构建详见[演示指南](presenting.md)。`src/contracts/presentation.mts` 定义公开画面与会话类型，Project 声明从现有 schema 生成到 `dist/types`。限定范围的 JSDoc/TypeScript 检查覆盖语速、偏好、计时与浏览器操作注册表；开发编译器不进入运行包，仍可直接启动 ESM 源码。

`src/presentation/sessions.mjs` 管理有容量限制的内存公开场景投影和另一个 loopback 观众服务。它不保存私密备注或编辑器令牌，观众来源没有 session、项目 API 或 CORS。编辑器命令使用单调序号，迟到命令不能覆盖新页或新动效偏好。讲者本地阅读状态独立于项目内容，演示使用精确绑定的实测快照；视觉导出仅在明确请求时包含私密备注。

项目仍使用 `format: deckweft`、`schemaVersion: 1`，无需迁移 alpha.1 文稿。内容、布局、动效和来源分开保存；预览与候选布局是派生结果，不额外保存另一套互相矛盾的数据。

`src/core` 校验文稿；`src/layout` 生成布局和文字范围；`src/render` 转为各格式；`src/services` 管理本地 API、历史与测量缓存；`src/plugin` 打包和安全安装；`src/qa` 记录真实宿主进程证据；`public` 提供工作台和测量器。

## 文字测量不是第二套渲染引擎

共享接口为 `fit(text, box, style, key)`。浏览器等字体就绪后，用 Canvas 对整段字符串排字，`Intl.Segmenter` 保持字素完整。原文范围包含空格、换行、emoji 组合和重音字符，不因换行而删字。命令行无浏览器时仍明确使用估算。

`/api/measure/plan` 从四种布局生成文字框请求；浏览器只返回范围、尺寸、字体名和上下边界，不上传可执行 SVG。`/api/measure/resolve` 校验后由服务器重新编译，生成内存中的 render ticket。导出复用同一份页面元素。除保存版本号外，文稿任意字段改变都会使指纹不同，拒绝复用旧测量。

缓存最多八份计划和八份渲染，各保留十五分钟。JSON 请求仍限制为 2 MB；特别大的文稿需拆分。来自同源浏览器的尺寸并不是独立认证的字体证明，也不能承诺目标软件像素完全一致。

## 保存、历史与恢复

每个文稿独立 JSON 文件，独占锁与版本比较阻止旧窗口覆盖新保存。历史快照以排他方式新建；已有文件内容不同会报错，不偷偷覆盖。

历史列表支持 `limit` 和 `before` 游标。单个快照经过大小、Schema、id 和版本号校验后附带 SHA-256。恢复必须提交所浏览的哈希值、`mode: copy` 和请求 id；创建新文稿并记录来源，重试复用同一副本。不会覆盖原文稿。保留策略、归档和自动清理仍未实现。

浏览器撤销有容量上限，保存回应不会清掉回应到达前新输入的字。预览有代际和内容计数检查；过期回应被丢弃。历史弹窗单独管理，不通过修改全局活动文稿来预览。

## 边界

服务只监听 `127.0.0.1`，校验 Host、Origin、跨站标记及本次进程令牌，只允许固定静态文件。它不是多人服务器，不应暴露公网。拒绝符号链接，但不宣称能够抵御同一用户权限的恶意进程或所有文件系统断电风险。没有额外运行时依赖、字体二进制、云上传和模型 API 调用。

## 版本 3 交接字段（S1，2026-10-19）

设计交接包的 SceneSpec、ChartSpec、MotionPlan 与 StaticState 映射到现有契约，没有新建平行 schema。所有字段都是可选的：不含这些字段的 v3 文稿、设计计划和主题包，校验与渲染结果与之前逐字节一致（[对比测试](../../tests/handoff-contracts.test.mjs)、[基线](../../tests/fixtures/visual/render-baseline.json)）。校验代码在[图表语义](../../src/components/charts/semantics.mjs)与[场景语义](../../src/design/scene-semantics.mjs)。已声明但尚无渲染器绘制的内容，HTML 导出会以具名错误码拒绝，不会从图中悄悄删掉。状态：**Implemented**（仅单元测试，无浏览器证据）。

### 语义文稿（`presentation-v3`）

| 字段 | 预期结果 | 被拒绝时的恢复 |
| --- | --- | --- |
| `rules.misreading: "strict"` | 启用百分比守卫：单位为百分比（`%`、`percent`、`pct`、`百分比`……）的数据集必须声明 `definition.denominator`。 | 用 `declareChartSemantics()` 声明分母（[迁移](migration.md#启用严格误读守卫)），或删除 `rules`。不会推断任何值。 |
| 数据集 `version`、`collectedAt`、`validPeriod {from,to}` | 数据集身份。日期须为真实日历日（`YYYY-MM-DD`），`from` 不晚于 `to`。 | 改正日期；不会归一化。 |
| 数据集 `definition {denominator, sample, normalized, betterDirection}` | 字段定义。`datasetSemantics()` 把缺省值解析为 `null`、`null`、`false`、`"none"`。 | 只有分母会被要求，且仅在 strict 下。 |
| 数据集 `missing[] {seriesId, categoryId, reason, note}` | 为某个 `null` 说明原因。需要稳定的 `categoryIds`；每个值一个原因；值保持 `null`。 | 让原因指向已有的 null，或恢复 null。原因永远不会把值改成零。 |
| 数据集 `events[] {id, categoryId, label, relation, sourceIds}` | `temporal` 事件只标记时间邻近，标签不能含因果连接词（`because`、`caused`、`led to`、`导致`、`因为`……）；`attributed` 事件至少需要一个来源。S4 绘制之前，HTML 导出返回 `CHART_EVENTS_UNIMPLEMENTED`。 | 改写标签，或改为 `attributed` 并引用来源。 |
| 系列 `interval {type, level, method, lower[], upper[]}` | `ci` 需要 (0, 100) 之间的 `level`；`sd`、`iqr`、`range` 不带 level。同一数据集内所有区间类型与 level 相同。上下界包住每个值，并且恰好在值为 `null` 处为 `null`。S4 加入点区间渲染器之前，HTML 导出返回 `CHART_INTERVAL_UNIMPLEMENTED`。 | 一个数据集只用一种区间类型；其他系列拆到另一个数据集。 |
| 图表 `question`、`takeaway` | 纯文本；图表块自身的 `sourceIds` 就是其来源。 | — |
| 图表 `axis.scale`、`xAxis.scale`（默认 `linear`，可 `log`） | 按图声明；数据集级别的 scale 是未知字段。`log` 要求全部为正值、`extent` 或正的 `fixed` 范围，且不能用于填充图形。S4 之前 HTML 导出返回 `CHART_SCALE_UNIMPLEMENTED`。 | 保持 `linear`，或修正范围并处理所引用数据集中的零／负值。 |
| 图表 `sort`（`author`、`value-desc`、`value-asc`） | `ranked-bar` 默认 `value-desc`，其余默认 `author`。按值排序只适用于类别数据的排序条形与堆叠。非默认排序在 S4 之前对 HTML 返回 `CHART_SORT_UNIMPLEMENTED`。 | 使用默认值或改用 `ranked-bar`。 |
| 图表 `truncation {note}` | 仅用于 `area`、`ranked-bar`、`stacked`，且仅当坐标轴确实不含零（`extent`，或 `fixed` 且 `min > 0` / `max < 0`）。未声明时填充图形仍必须含零基线。S4 之前 HTML 导出返回 `CHART_TRUNCATION_UNIMPLEMENTED`。 | 补上说明，或改回 `policy: "zero"`。 |

### 设计计划场景（`design-plan`，透传到 `web-scene`）

| 字段 | 预期结果 | 被拒绝时的恢复 |
| --- | --- | --- |
| `takeaway {blockId}` | 同一场景中的 heading、paragraph、callout、quote 或 metric 块承载结论。把该块 id 放入 `lockedBlockIds` 即锁定结论文字。 | 引用 `blockIds` 内、类型为文字或指标的块。 |
| `contentStatus`（`sourced`、`illustrative`、`evidence-required`） | `sourced` 要求非合成且有来源的数据集、有来源的指标和有来源的结论；其余两个值只记录意图。 | 把合成素材标为 `illustrative`，或补来源。 |
| `keyStates[] {id, position, label}` | 命名的提示边界：`position` 0 是作者选定的开场（初始系列／范围、标签页、步骤），`n` 是前 `n` 个提示执行后的状态。 | 保持 `position ≤ cues.length`，id 唯一。 |
| `staticState {keyStateId}` | 指定静态输出所冻结的状态；`staticInteractionState()` 返回冻结的筛选／聚焦选择。缺省即开场。位置大于 0 时，S2 实现之前 HTML 导出返回 `STATIC_STATE_UNIMPLEMENTED`。 | 指向已存在的关键状态。 |
| `motion.trigger: "manual"`、`motion.clock: "cues"`、`motion.reducedMotion`（默认 `instant`，可 `static`） | 对现有播放器的声明：提示由重播／下一步／定位在同一个确定性提示时钟上推进；减少动态时状态即时生效。`effectiveMotion()` 忽略新键。`static` 需要 `staticState`，且 S2 之前对 HTML 返回 `REDUCED_MOTION_FALLBACK_UNIMPLEMENTED`。 | 删除该声明，或补上静态状态。 |

### 主题包 token（`theme-pack`）

可选的 `typography.numeric`、`palette.reference`、`palette.missing`、`spacing.captionGap`、`spacing.sectionGap`、`spacing.safeArea` 以及 `motion.distance`、`motion.easing`、`motion.delay`、`motion.fallback`。`themeTokens(id, locale)` 负责解析；`resolveTheme()` 未改动，因此主题输出不变。默认值就是渲染器现在使用的值：numeric = 对应语言的正文字体栈，reference = ink，missing = ink，captionGap 14，sectionGap = gap，safeArea = page，distance 4，easing `ease-out`，delay 0，fallback `instant`。内置三个主题尚未声明任何新 token；声明的值会在 `declared` 中报告，但渲染器尚未使用。

### 锁定类别

没有新增锁定字段。交接包的四类锁定映射到现有锁：**文字** → `authorOverrides.lockedBlockIds`（块内容，包括结论块）；**数据** → 锁定图表块即锁定其数据集，包括 `definition`、`missing`、`events` 与区间；**来源** → 与锁定块或其说明相连的来源；**构图** → `sceneLocks.fields: ["composition"]`，同组还有 `theme`、`interactions`、`cues`、`motion`、`profile`。[锁定测试](../../tests/handoff-contracts.test.mjs)覆盖每一种映射。
