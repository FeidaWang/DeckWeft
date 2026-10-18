# 迁移：先保留旧配方，再制作新文稿

[English](../en/migration.md) · [首页](../../README.zh-CN.md)

前身叫 Open Deck Skill / Open Deck Astra。新项目不是到处替换名字、连原作者声明也抹掉。

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
