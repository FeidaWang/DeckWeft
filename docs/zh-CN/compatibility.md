# 兼容性：“通过”必须说清楚通过了什么

[English](../en/compatibility.md) · [验证记录](../en/verification.md) · [VIS-016 证据](../evidence/vis-016/review.md)

本地 Node 命令、服务、浏览器编辑、数据与安装测试有实际记录。macOS / Windows 的 CI 工作流只是配置完成，不代表在这里已经远程执行。

Codex 与 Claude Code 的目录、清单和完整运行包已实现，但需要在真实已登录宿主中分别验证发现、启用和调用。不能把复制文件等同于原生插件验收。

v1/v2 演示文稿的 PPTX 导出原生文字和基本形状；私密讲者备注仅在显式开启时包含。14 页 DevDay 演示文稿曾在 PowerPoint 中打开且无需修复（[证据](../evidence/devday-redesign/review.json)），规划演示文稿同样打开过（[证据](../evidence/mb-06-10/review.md)）。

Figma 提供交接 JSON 和本地开发插件源码；AE 提供交接 JSON 与严格解析的 JSX。代码测试不等于真实 Figma / AE 实机渲染通过。本次也没有修改此前的云端设计文件名称。

v1/v2 路径没有照片、视频、原生图表、表格、任意拖拽、多用户实时协作或任意 PPTX 导入。Figma JSON 不是 `.fig`，动效 JSON 不是视频。字体名称不等于目标电脑已经安装字体。

排版通过不等于事实、无障碍、安全、法律或性能认证。工作台不请求云端凭据；使用编程助手模型或导入云端设计产品时，仍适用宿主自己的账号、计费和隐私规则。

## v3 视觉演示文稿的 PowerPoint 与 PDF（S7，VIS-016）

状态：**partial**（本地已实现）。编译器、检查和每份演示文稿的导出报告都已存在，并在冻结的 VIS-014 语料上通过。没有声称与 PowerPoint 或 Keynote 兼容：两者都没有运行。

### 导出一份演示文稿

需要 Node 22+、Playwright，以及 `/Applications` 之外的隔离浏览器，与 VIS-014 发布门相同。

1. 运行：

   ```bash
   CHROMIUM_PATH=/path/to/isolated/chrome PLAYWRIGHT_MODULE=/abs/path/playwright/index.mjs npm run export:targets
   ```

   预期：`dist/export-targets/decks/<deck>/` 中有 `<deck>.pptx`、`<deck>.pdf`、`report.json`、`report.md` 和 `sheet-*.jpg`；`exports.json` 列出每份演示文稿。只导出一份时加 `-- --decks gallery-zh-CN`。
2. 打开 `report.md`，阅读四项结果和每一条回执。
3. 打开 `sheet-*.jpg`：网页场景、PowerPoint 幻灯片、PDF 页面并排（macOS 快速查看渲染）。
4. 在 PowerPoint 和 Keynote 中打开 `.pptx`，逐项完成 `report.json` 中的 `applicationChecks`。

在代码中，先在字体和图片就绪后测量静态网页导出（页面内运行 `src/targets/layout.mjs` 的 `measureExportLayout`），再调用 `exportDeck(document, 'pptx' | 'pdf', { plan, experimentalWeb: true, assetResources, layout, rasters })`。脚本会完成这两步。

### 导出顺序

由 `src/targets/export-order.mjs` 强制执行；任何一步顺序不对都会以 `EXPORT_ORDER` 失败。

1. **ready**：每张图片哈希一致；布局是在同一次渲染、1440 px 下测得的，字体已加载，没有最后兜底字体（缺字形），每张图片都已解码。
2. **static-state**：每个场景的作者静态状态，或开场状态。
3. **freeze**：冻结每个图表的筛选、排序、聚焦与参数。
4. **stop-motion**：不编译任何提示、时间轴、转场、循环或随机变化。
5. **reveal**：页面上折叠在展开控件里的来源、完整数据、关系与讲解，写入备注（PowerPoint）或备注页（PDF）。
6. **render**：生成 PowerPoint 包或 PDF 打印文档。
7. **check**：读回输出，与派生场景逐页比较。

### 输出等级

L1：原生可编辑的文字、形状、表格和受支持的图表（PDF 中为真实、可搜索的文字）。L2：嵌入的矢量图，标题、图注与来源仍是真实文字。L3：仅该元素的高分辨率图像，附语义摘要。不会把整页做成图像。

| 组件 | 网页 | PDF | PowerPoint |
| --- | --- | --- | --- |
| 标题、段落、引文、提示、列表、指标、出处、注释、代码 | L1 | L1 | L1 原生文字（场景标题即幻灯片标题） |
| 表格 | L1 | L1 | L1 原生表格；网页以卡片呈现的表格转为文字并附回执 |
| 图片 | L1 | L1 | L1 原生图片，保留裁切与替代文字 |
| 示意图 | L1 | L2 | L1 形状、吸附连接线与文字 |
| 图表：折线、面积、排序条形、分组条形、堆叠、散点 | L1 | L2 | L1 原生图表，内嵌数据 |
| 图表：热力图、基准表 | L1 | L2 | L1 原生表格 |
| 图表：点与区间、小倍数，或任何带区间、对数轴或缺失值的图表 | L1 | L2 | L3 图表图像，摘要在替代文字和备注中 |

### PowerPoint 没有收到什么，以及如何交付

每种情况都在 `report.json` 中按元素记录回执：

- 交互与动效。幻灯片显示静态状态；步骤讲解、热点注释和数据在备注中。
- 展开控件（“查看全部数据”）。内容在备注中。
- 平衡断行的标题。浏览器的断行写成换行。
- 图表细节：
  - 事件标记
  - 限定上标
  - 截断坐标轴的断裂符号

  它们的文字仍显示在图表下方。
- 只在网页图内标注的系列名。改由原生图例给出。

### 语料结果（2026-10-19）

八份 VIS-014 演示文稿，加上 S4 图表类型样例。[证据](../evidence/vis-016/review.md)。

| 结果 | 状态 |
| --- | --- |
| PowerPoint 可编辑性（编译器检查与独立的 Python 检查） | 通过，9/9 |
| 与派生场景逐页比较 | 通过，9/9 |
| PDF 可搜索性 | 5 份英文通过；4 份中文 partial：部分汉字（页、门、长、见、母）在 PDF 中被记成 CJK 部首码位 |
| 无障碍（包结构检查） | PowerPoint 通过；PDF partial：Chromium 把每个 HTML `<figure>` 标成没有替代文字的 figure，包住内部有说明的 figure |
| 视觉保真 | partial：只有快速查看的参考渲染 |

### 仍需在你的电脑上用 PowerPoint 或 Keynote 检查

- **打开文件。** PowerPoint 无修复提示，Keynote 无导入警告，每页都在。
- **每个原生图表的“编辑数据”。** 工作簿能打开，数值一致。
- **聚焦颜色。** 排序与分组条形图中聚焦条为实色、其余为浅色。快速查看把所有条都画成实色。
- **原生图表细节。** 标记点、虚线、数值标签、末端标签、首末时间标签、坐标轴步长。快速查看会忽略这些。
- **缺失值、对数轴与区间。** 本版中这些图表是图像，因为快速查看把它们画错了：数值移到错误的类别、`#N/A` 画成零、坐标轴变成线性。改为原生图表之前需要先在 PowerPoint 与 Keynote 中检查。
- **文字。** 断行与负字距。报告中列出的字体已安装（字体不嵌入）。
- **自由形状。** 装饰形状颜色不变；快速查看会画得偏浅。
- **无障碍。** 运行辅助功能检查器和读屏软件。
- **Keynote 对象。** 图表、表格、连接线和备注以可编辑对象导入。

### 恢复

- **`EXPORT_LAYOUT_REQUIRED`。** 尚未测量静态场景。运行 `npm run export:targets`，或按上文测量。
- **`EXPORT_LAYOUT_INVALID` 且含 `EXPORT_LAYOUT_STALE`。** 测量后文档、方案或渲染器变了。重新测量。
- **`EXPORT_NOT_READY` 且含 `FONT_GLYPH_MISSING`。** 有字符在所有已安装字体中都没有字形。修改文字或字体；导出会拒绝，而不是画出方框。
- **`PPTX_RASTER_MISSING`（可编辑性失败）。** 某个 L3 图表缺少截图。使用脚本，它会自动截取。
- **PowerPoint 中断行不同。** 检查报告中的字体是否已安装；否则应用会替换字体。

## alpha.2 新边界

浏览器会探测声明的字体候选并测量文字，但隐私限制和逐字后备仍可能发生。CLI 无浏览器时仍为估算。历史已支持只读浏览和恢复副本，未实现保留策略或归档。实际宿主、真实输入法、屏幕阅读器及直接访问 CSP 不因本地测试通过而视为验收完成。详见[本轮说明](alpha-2.md)。
