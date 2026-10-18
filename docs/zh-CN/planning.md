# 规划叙事与视觉

[English](../en/planning.md) · [连接代理](agent-bridge.md) · [推理强度评测](astra-evaluation.md)

1. 打开 Studio，选择本地文稿。
2. 点击工具栏的 **Plan story**，填写简报。用空行分隔新的页面主张；只写一段时，保留现有页面。
3. 点击 **Propose storyboard**。预期：每页出现主张、受众、已提供的来源引用、视觉结构和可编辑讲稿。此本地提案整理已提供内容，不会自动研究或编造依据。
4. 逐页审阅，选择封面、对比、流程、时间线、指标或图片与说明。保留页面时，已有 v2 视觉选择与素材引用也会保留。
5. 点击 **Approve and save a version 2 copy**。预期：打开独立的新文稿，原稿保持完整。验证失败时修复指出的字段再试，不会暗中升级原文件。
6. 在 **Design → Semantic visual plan** 修改当前页。对比、流程、时间线和指标有要点时可启用交互。HTML 支持按钮、左右键、Home/End 和文字说明；SVG、PowerPoint 和交接文件显示完整内容，并标明初始状态。封面与图片页保持静态。

v1 保留原来的四种布局；v2 使用审阅后的语义结构。预览与导出共享实测场景。文字溢出会阻止视觉导出，请缩短内容或拆页。运行时没有新增包依赖。

## 本地图片

1. 在 v2 页面打开 **Design → Local image and rights**。
2. 填写来源、许可、允许用途、替代文字和离线后备说明。这些是作者声明，不代表已完成法律核查。
3. 点击 **Import local PNG**，选择小于 1.3 MB 的 PNG。预期：图片单独存入所选文稿库的 `assets/<sha256>.png`，项目 JSON 只保存元数据；当前页切换为图片与说明。
4. 导出 HTML 或 PowerPoint。预期：图片是独立对象，文字仍可编辑。文件缺失时显示后备说明；哈希改变或素材预算超限时，界面会明确阻止加载。

登记器只接受 PNG，检查尺寸、大小、符号链接、哈希与元数据；读取时还限制总字节、解码像素和预览体积。直接登记工具的单文件上限为 4 MB。本批不包含 SVG 导入、图片生成、裁切焦点或供应商请求。

备份 JSON 时同时保存 `assets` 文件夹。HTML/PPTX 会嵌入实际使用的图片。MB-11～15 后续已增加可选图片任务和嵌入媒体的 Figma/AE 交接，真实设计软件验收仍开放。见[素材与 worker](media-workers.md)。

## 显式 CLI 迁移

```bash
node bin/deckweft.mjs upgrade old-v1.deck.json --out reviewed-v2.deck.json
node bin/deckweft.mjs check reviewed-v2.deck.json
node bin/deckweft.mjs export reviewed-v2.deck.json --format pptx --home /absolute/path/to/library --out reviewed.pptx
```

预期：原文件不变，新项目使用新 id、修订号 0、类型化意图和迁移来源哈希。请保留两份文件。不传 `--home` 时，CLI 在输入文件所在目录查找素材。CLI 排版仍为离线估算，Studio 才会测量浏览器中的实际文字。
