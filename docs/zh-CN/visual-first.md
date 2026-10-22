# 视觉优先重建：Wave A

**早期首批记录。** 后续 [Visual Studio 实现](visual-studio.md) 已加入 v3 编辑／存储、图片绑定与 Electric Violet。下文限制描述早期 Wave A 快照，不代表当前 Studio。

[English](../en/visual-first.md) · [检查记录](../evidence/visual-wave-a/review.md)

这是 2026-10-18 路线图的首批实验性实现。现有 Studio 继续编辑 v1/v2；新语义网页路径需要显式启用。目前有两种构图，完整样例库与一句话生成流程仍待实现。

## 打开样例

1. 在项目根目录使用 Node.js 22 或更新版本。
2. 执行 `npm run visual:preview`。
3. 打开终端打印的 `http://127.0.0.1:…/`，选择英文或简体中文。
4. 查看两页。按下标题键（“演示视图”），再点击幻灯片任意位置：每次点击播放本页下一步，播完后翻页。← 回退一步；边缘的半透明按键直接翻页，不播放步骤。再次按下标题键（“阅读视图”）重新显示全部页面。
5. 展开“查看完整数据”。应有六个时期，最后一期为 78 和 45。所有数据均明确标为合成演示数据。
6. 在终端按 `Ctrl+C` 停止预览。

封面采用真实 DOM 文字与斜切 SVG 色块；数据页采用数值数据集、SVG 曲线、语义表格与独立说明栏。390 像素宽度会重排，禁用 JavaScript 也能阅读。无需字体文件、远程图片、外部脚本或模型服务。

执行 `npm run visual:render -- --case wave-a --locale all`，在 `dist/visual/wave-a/` 得到独立 HTML。打开 `index.html` 或任一语言文件即可。参数见 `--help`。目前仅支持 `wave-a`，请求 `release-gallery` 会明确报错。

## 数据与迁移边界

v2 Studio 契约仍为 `schemas/project.schema.json`，v1 读取行为保留。新 `presentation-v3.schema.json` 使用独立的 `deckweft-presentation` 格式；内容块、数值数据集、来源与锁定信息独立于设计计划。设计计划只绑定稳定 ID，缺失引用、重复 ID 或遗漏内容都会报错。WebScene 使用封闭组件与阅读顺序，不接收可执行 HTML/JavaScript。类型声明由同一组 schema 生成。

初始内容块支持标题、段落、列表、引语、数值、表格、图表、关系图、代码、图片、提示与引用。图片能通过 JSON 往返，但网页导出会拒绝尚未解析的图片资源。关系图当前提供语义节点/边阅读列表，尚无图形布局；表格单元格为文本，图表与数值块保留真正的数字。

`src/core/adapters/legacy-project.mjs` 中的 `migrateToPresentation(project)` 会先验证 v1/v2，再返回语义副本、设计计划和警告，不保存或修改原文件。完整原始项目与来源哈希保存在 `migration` 中。旧数字字符串仍是文本提示，不猜测为数值。旧素材、设计、意图与私密备注保留在原始归档中，需要人工复核；迁移不保证视觉一致。

通过 `exportDeck(document, 'html', { plan, experimentalWeb: true })` 显式启用新路径。JSON 包含完整语义文档与迁移归档；HTML 仅渲染绑定的公开内容，不嵌入归档或私密备注。v3 原生格式导出返回 `TARGET_CAPABILITY`，不阻止有效 HTML。Studio 的 v3 保存与编辑尚未实现；v1/v2 的修订冲突和历史机制继续生效。

## 重现检查

```bash
npm ci
npm run verify
npm run visual:baseline
npm run visual:render -- --case wave-a --locale all
```

基线包含英文产品、中文策略和技术 API/代码三组固定旧版样例。旧渲染器将代码/API 行显示为普通文本，这个限制保留在基线中。

浏览器检查另需 Playwright 与隔离测试浏览器。将 `CHROMIUM_PATH` 设为 `/Applications` 之外的测试浏览器程序；必要时将 `PLAYWRIGHT_MODULE` 设为 Playwright 的绝对 `index.mjs` 路径，再执行 `npm run visual:capture`。它们仅是检查工具，不是新增运行依赖。脚本拒绝已安装应用路径，使用临时会话与回环地址，不改动浏览器应用包或个人配置。

结果位于 `dist/visual/capture/`：截图、实际字体、DOM 边界测量、完整数值表、键盘展开、页面导航、禁用 JavaScript 阅读检查及各类哈希。报告区分源文件、输入、输出、渲染与截图指纹。相同像素还依赖相同浏览器、字体与视口。

出现 `EXPERIMENTAL_WEB_REQUIRED` 时，显式开启实验选项；出现 `TARGET_CAPABILITY` 时，说明该目标（例如 Figma）没有 v3 编译器：选择 HTML/JSON，或继续用 v1/v2 导出原生文件。v3 的 PowerPoint 与 PDF 出现 `EXPORT_LAYOUT_REQUIRED` 时，需要先测量静态场景：运行 `npm run export:targets`（[手册](compatibility.md#v3-视觉演示文稿的-powerpoint-与-pdfs7vis-016)）。缺少浏览器工具时可先生成 HTML，但应记录尚未视觉检查。自动测量不能代替对比度和美观检查，必须实际查看截图。

VIS-001～005 均保持 **partial**。远程 CI 尚未运行。完整来源快照、素材裁切、交互协议、原生场景、作者偏好、Electric Violet、双语 12 页样例库、完整 8 页叙事、候选构图、自动纠错、宿主生成与 Studio 集成仍待后续实现。本批不关闭任何宿主或原生应用验收关卡。
