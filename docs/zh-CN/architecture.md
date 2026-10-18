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
| 数据集 `events[] {id, categoryId, label, relation, sourceIds}` | `temporal` 事件只标记时间邻近，标签不能含因果连接词（`because`、`caused`、`led to`、`导致`、`因为`……）；`attributed` 事件至少需要一个来源。S4 起在折线、面积、堆叠、条形、点与区间、小多图和基准表上绘制带编号的虚线或行旁编号，并写出关系注释；散点与热力矩阵返回 `CHART_EVENTS_UNIMPLEMENTED`。 | 改写标签，或改为 `attributed` 并引用来源。 |
| 系列 `interval {type, level, method, lower[], upper[]}` | `ci` 需要 (0, 100) 之间的 `level`；`sd`、`iqr`、`range` 不带 level。同一数据集内所有区间类型与 level 相同。上下界包住每个值，并且恰好在值为 `null` 处为 `null`。S4 起折线绘制误差线、`dot-interval` 绘制区间，并在注释中写明类型、水平与方法；其他类型返回 `CHART_INTERVAL_UNIMPLEMENTED`。 | 一个数据集只用一种区间类型；其他系列拆到另一个数据集。 |
| 图表 `question`、`takeaway` | 纯文本；图表块自身的 `sourceIds` 就是其来源。S4 起两种网页视图都在图的开头显示问题、在图例之后显示结论。 | — |
| 图表 `axis.scale`、`xAxis.scale`（默认 `linear`，可 `log`） | 按图声明；数据集级别的 scale 是未知字段。`log` 要求全部为正值、`extent` 或正的 `fixed` 范围，且不能用于填充图形。S4 起折线、散点、点与区间和小多图绘制整十倍对数轴并加注释；其他类型返回 `CHART_SCALE_UNIMPLEMENTED`。 | 保持 `linear`，或修正范围并处理所引用数据集中的零／负值。 |
| 图表 `sort`（`author`、`value-desc`、`value-asc`） | `ranked-bar` 默认 `value-desc`，其余默认 `author`。按值排序只适用于类别数据的排序条形与堆叠。S4 起所有排序均可绘制（`author` 绘制直接标注条形；堆叠按净总量排序），该错误码已移除。 | 使用默认值或改用 `ranked-bar`。 |
| 图表 `truncation {note}` | 仅用于 `area`、`ranked-bar`、`stacked` 和 S4 新增的 `grouped-bar`，且仅当坐标轴确实不含零（`extent`，或 `fixed` 且 `min > 0` / `max < 0`）。未声明时填充图形仍必须含零基线。S4 起绘制断轴标记、说明行中的“截断坐标轴”和作者说明，该错误码已移除。 | 补上说明，或改回 `policy: "zero"`。 |
| 图表 `focus {categoryIds}` 或 `{seriesIds}`（S4） | 二选一。类别重点用于排序条形、分组条形、点与区间和基准表；系列重点用于含两个及以上系列的折线、分组条形、点与区间和小多图，且不能包含全部系列。重点为实色，其余较浅并带描边，图例写明两种状态。 | 单系列图不能聚焦系列（C1）：请声明承载结论的类别。 |
| 图表 `labels`（默认 `points`，可 `end`）（S4） | `end` 绘制末端标注的折线趋势：不逐点标注，末端标签互不重叠。 | 只用于 `line`。 |
| 图表 `chartType` 新增 `grouped-bar`、`dot-interval`、`small-multiples`、`benchmark-table`（S4） | 见[图表类型](components.md#图表类型与声明s42026-10-19)。 | 分组条形与小多图需要两个及以上系列；点与区间要求每个系列都有区间。 |
| 数据集 `qualifiers[] {seriesId, categoryId, label, note}`（S4） | 为单个数值添加带编号的限定说明，显示在图表注释和数据表中；编号按数据集中的顺序。 | 每个数值最多一条，不能用于 `null`（请改用缺失原因）；需要 `categoryIds`。 |

### 设计计划场景（`design-plan`，透传到 `web-scene`）

| 字段 | 预期结果 | 被拒绝时的恢复 |
| --- | --- | --- |
| `takeaway {blockId}` | 同一场景中的 heading、paragraph、callout、quote 或 metric 块承载结论。把该块 id 放入 `lockedBlockIds` 即锁定结论文字。 | 引用 `blockIds` 内、类型为文字或指标的块。 |
| `contentStatus`（`sourced`、`illustrative`、`evidence-required`） | `sourced` 要求非合成且有来源的数据集、有来源的指标和有来源的结论；其余两个值只记录意图。 | 把合成素材标为 `illustrative`，或补来源。 |
| `keyStates[] {id, position, label}` | 命名的提示边界：`position` 0 是作者选定的开场（初始系列／范围、标签页、步骤），`n` 是前 `n` 个提示执行后的状态。 | 保持 `position ≤ cues.length`，id 唯一。 |
| `staticState {keyStateId}` | 指定静态输出所冻结的状态；`staticInteractionState()` 返回冻结的筛选／聚焦选择。缺省即开场。自 S2 起网页输出会应用它（[见下文](#网页输出中的静态状态s22026-10-19)）；若静态状态改变了步骤、图片比较或热点的选择，HTML 导出返回 `STATIC_STATE_UNIMPLEMENTED`。 | 指向已存在的关键状态；含步骤／比较／热点的页面请选择只改变图表的关键状态，或开场。 |
| `motion.trigger: "manual"`、`motion.clock: "cues"`、`motion.reducedMotion`（默认 `instant`，可 `static`） | 对现有播放器的声明：提示由重播／下一步／定位在同一个确定性提示时钟上推进；减少动态时状态即时生效。`effectiveMotion()` 忽略新键。`static` 需要 `staticState`；自 S2 起，减少动态时网页播放器显示静态状态，不播放提示。 | 删除该声明，或补上静态状态。 |

### 主题包 token（`theme-pack`）

可选的 `typography.numeric`、`palette.reference`、`palette.missing`、`spacing.captionGap`、`spacing.sectionGap`、`spacing.safeArea` 以及 `motion.distance`、`motion.easing`、`motion.delay`、`motion.fallback`。`themeTokens(id, locale)` 负责解析；`resolveTheme()` 未改动，因此主题输出不变。默认值就是渲染器现在使用的值：numeric = 对应语言的正文字体栈，reference = ink，missing = ink，captionGap 14，sectionGap = gap，safeArea = page，distance 4，easing `ease-out`，delay 0，fallback `instant`。内置三个主题尚未声明任何新 token；声明的值会在 `declared` 中报告，但渲染器尚未使用。

### 锁定类别

没有新增锁定字段。交接包的四类锁定映射到现有锁：**文字** → `authorOverrides.lockedBlockIds`（块内容，包括结论块）；**数据** → 锁定图表块即锁定其数据集，包括 `definition`、`missing`、`events` 与区间；**来源** → 与锁定块或其说明相连的来源；**构图** → `sceneLocks.fields: ["composition"]`，同组还有 `theme`、`interactions`、`cues`、`motion`、`profile`。[锁定测试](../../tests/handoff-contracts.test.mjs)覆盖每一种映射。自 S2 起，`cues` 与 `motion` 场景锁同时保护 `staticState` 及其关键状态的位置（[测试](../../tests/evidence-scene.test.mjs)）。

## 网页输出中的静态状态（S2，2026-10-19；S5 扩展）

声明了 `staticState` 的页面按该状态导出。状态：一页中英双语证据页的图表选择为 **LocalVerified**（S2）；S5 起，双语交互样例中的聚焦系列、图解与代码步骤、比较标签和热点也为 **LocalVerified**（[S2 证据](../evidence/s2-vertical-sample/review.md)、[S5 证据](../evidence/s5-motion-state/review.md)、[冲突清单](../plans/design-handoff-vertical-sample.md)）。

| 视图 | 预期结果 |
| --- | --- |
| 无 JavaScript | 绘制 `staticInteractionState()` 给出的冻结状态：图表选择与聚焦；标出的步骤节点、关系或原文行；所选比较图片，另一张放在关闭的展开区中；编号热点标记，展开的那个加框。每个组件上方一行文字写明关键状态名称及其显示内容（每个图表显示值、步骤说明、展开的注释）。**查看完整数据** 仍是未经筛选的完整表格；选择之外的数据点在表格中保留锚点。 |
| 阅读视图 | 播放器从静态状态所在的提示边界开始。页面停在该边界时这行文字保持可见，读者自行探索时隐藏。 |
| 演示视图 | 从同一边界开始。**重播提示序列** 仍从作者设定的开场（位置 0）开始，依次播放全部提示。 |
| 减少动态，`reducedMotion: "static"` | 系统设置或页面的 **减少动态效果** 开启时，页面回到静态状态，**重播提示序列** 与 **播放提示** 不可用，并显示“不自动播放提示”的说明。`deckweftInteractions.play()` 保持静态状态。**上一提示**、**下一提示** 和提示位置滑块仍可用，状态即时生效。 |
| 减少动态，`instant`（默认） | 不变：提示照常播放，只去掉动画。 |
| 审查门 | 版式回执（`window.deckweftFit`）包含每页开场的 `checks`，以及每个已声明静态状态的 `states`；`POST /api/visual/measure` 拒绝缺少任一通过项的回执。 |

实现方式：S5 起，静态状态播放逻辑并入唯一的内嵌播放器（[运行时](../../src/render/web/runtime.mjs)、[semantic.js](../../public/runtime/semantic.js)）；服务端生成的冻结标记在 [static-state.mjs](../../src/render/web/static-state.mjs) 中，只加入声明了静态状态的页面，其他页面的标记不变。播放器挂载前先移除仅供无 JavaScript 读者使用的标记（`[data-static-only]`、`details[data-static-wrapper]`），再自行绘制同一状态。运行时数据带有 `staticState {keyStateId, position, reducedMotion}`，因此全局动效 **关闭** 不会丢掉静态回退。

边界：带逐点标签的折线、面积、堆叠、散点和热力图在 390px 屏幕上仍在图形区内横向滚动（S4 后续）。S4 起排序条形图不再横向滚动，静态陈述分别写明筛选与排序，两种视图以相同尺寸绘制图表；S5 起版式测量覆盖每个静态状态，无 JavaScript 时也绘制冻结的步骤、比较标签与热点。见[冲突清单](../plans/design-handoff-vertical-sample.md#conflict-list)。

恢复：只有选了静态状态时测量才不通过，说明冻结视图本身放不下；请换一个关键状态或缩短内容。Studio 拒绝修改静态状态时，先取消 **锁定本页交互计划**。要删除静态状态，先把 `reducedMotion` 改为 `instant`。

## 动效状态与内嵌播放器（S5，2026-10-19）

状态：在隔离浏览器中以 1440 与 390px、中英文验证，**LocalVerified**（[证据](../evidence/s5-motion-state/review.md)）。保留 VIS-009 的状态转换器、提示与生命周期；S5 拆分状态、统一时钟，并为动效原语命名。

| 部分 | 位置 | 规则 |
| --- | --- | --- |
| 图表状态（EvidenceStage） | [timeline.mjs](../../src/motion/timeline.mjs) | `datasetId`、`metricId`、`seriesIds`（显示中）、`focusSeriesId`、`fromId`／`toId`、`sortKey`、`scale` 和 `caption {categoryId, seriesIds}` 分开保存。`data.filter` 改变显示的系列与范围；`data.focus` 只改变聚焦，且不会显示已隐藏的系列；隐藏聚焦系列会结束聚焦。`datasetId`、`sortKey`、`scale` 来自图表声明，`metricId` 为 `null`：在指标切换（M14）、交互排序（M13）或刻度切换（M12）能够绘制之前，没有事件会改变它们。 |
| 说明对象（C4） | [cues.mjs](../../src/motion/cues.mjs) `captionOrder` | 说明行描述排序条形图当前范围内的第一名，其他图表描述范围内最后一个类别，对象是聚焦系列或全部显示系列。 |
| 统一时钟 | [clock.mjs](../../src/motion/clock.mjs) | 播放、暂停、定位、下一、上一、重播、探索与减少动态回退共用一个位置和一个可取消的计时器。暂停、定位、探索、离开页面、隐藏标签页和 `pagehide` 会同时取消计时器、动画和已登记资源。 |
| 动效原语 | [primitives.mjs](../../src/motion/primitives.mjs) | FadeIn、SlideSmall、Crossfade、RevealMask、SeriesReveal、AnnotationReveal 挂在已有提示事件上；`motionPlan()` 把事件和前后两个状态映射为原语与稳定目标，因此播放、定位和重播的动效一致。每个动画以原语名称作为 Web Animations 的 `id`。减少动态时的结果：内容可见、进入目标布局、显示完整图形。没有随机视觉，因此不保存 seed。 |
| 翻页按键（C14） | [keys.js](../../public/runtime/keys.js) `turnsPage()` | 控件、链接、滑块、标签、可编辑区域或可获得焦点的元素（包括带 `tabindex` 的 SVG 图表标记）获得焦点时，以及按键带修饰键时，翻页逻辑不响应。 |
| 开场回复（C20） | [runtime.mjs](../../src/render/web/runtime.mjs)、[interactions.js](../../public/studio/interactions.js) | `deckweft:opening` 携带 `position`、`exploring` 与 `staticPosition`；对未经探索的后续提示位置，`useInteractionOpening()` 拒绝写入开场。 |

逐字节一致（C6）：S5 把 S2 的条件扩展并入唯一的播放器，而不是再加一个扩展，因为按键守卫（C14）和说明行（C4）是所有交互导出共有的缺陷，不只存在于声明了静态状态的文稿。`PLAYER_VERSION` 标识播放器字节（运行时加交互模块，包括内嵌的图表渲染器）。规则：这些字节的任何改动都要提升 `PLAYER_VERSION`，并在单独提交中重新记录 [render-baseline.json](../../tests/fixtures/visual/render-baseline.json)（`node tests/render-baseline.mjs --write`）；若同一版本对应两组字节，`playerHistory` 会使测试失败。基线为每个 HTML 条目分别记录读者可见标记、运行时数据、播放器脚本和 CSS 的哈希，因此重新记录时可以证明文字、数值和锚点未变。

未声明 `staticState` 的页面的静态输出（C7，S5 决定）：保持不变。无 JavaScript 视图绘制完整的作者数据，播放器从作者开场开始。冻结开场是作者的明确选择（把位置 0 的关键状态设为静态状态），绝不自动迁移。
