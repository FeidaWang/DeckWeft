# VIS-014 视觉发布门

[English](../visual-acceptance/README.md) · [评分审阅（英文）](../visual-acceptance/review.md) · [证据与失败记录（英文）](../evidence/vis-014/review.md) · [路线图](roadmap.md)

状态：**partial**（2026-10-19）。发布门已实现并可在本地运行。Codex 完成了从提示到产物的任务和一次局部修订；Claude 仍为 deferred。一个显式用例（缺字形）未通过，咨询性的视觉评分也低于试点门槛。详见[证据](../evidence/vis-014/review.md)。

## 冻结了什么

| 文件 | 内容 |
|---|---|
| [gallery-manifest.json](../visual-acceptance/gallery-manifest.json) | 需求文档第 9 节画廊（决策 C）：12 页，每个主题 4 页，英文与简体中文使用相同 id。每页记录任务、主题、构图、内容状态以及每种语言的内容哈希。页面改动后 `npm test` 会失败，直到有意重写此文件。 |
| [story-cases.json](../visual-acceptance/story-cases.json) | 每个主题绘制的一份 8 页故事（同一文档、三套计划），包括其交互和最弱页；以及 11 个显式用例，记录页面、状态、宿主、复现方法与修复。 |
| [host-receipts.json](../visual-acceptance/host-receipts.json) | Codex 运行记录（起草、两次图片审阅、修订、两次导出、每次尝试），以及 deferred 的 Claude 单元格。 |
| [review.md](../visual-acceptance/review.md) | 评分审阅。评分标准仅供参考，自动评分从不认证输出。 |

内容位于 [tests/release-gate.mjs](../../tests/release-gate.mjs)。仓库事实和 WCAG 2.2 引文有来源；其余数字均为合成数据，并在页面上注明。图片均为生成或代码绘制的作品并已标注，不作为照片展示。

## 运行发布门

需要 Node 22 或更高版本、Playwright，以及位于 `/Applications` 之外的隔离浏览器（Playwright 缓存即可）。发布门从不使用已安装的浏览器或个人配置。

1. 构建并运行全部步骤：

   ```bash
   CHROMIUM_PATH=/path/to/isolated/chrome PLAYWRIGHT_MODULE=/abs/path/playwright/index.mjs node scripts/release-gate.mjs
   ```

   预期：`dist/visual-acceptance/` 中有 `projects/`、`runs/<deck>/`（截图、整稿对照表、回执）、`cases/`、`legacy/`、独立运行截图和 `gate.json`。最后一行打印每一步的结果，例如 `{"build":true,"quality":true,"cases":false,…}`。
2. 其他引擎（可选）：Playwright 自带版本未缓存时，用 `FIREFOX_PATH=` 和/或 `WEBKIT_PATH=` 指向隔离的浏览器。预期：`standalone.json` 为每个引擎列出版本，或 `available:false` 及原因。
3. 用 `--steps build,cases` 单独运行某些步骤（新的 `--out` 目录中必须先运行一次 build）。
4. 查看截图：打开 `runs/<deck>/project-contact.png` 和 `runs/<deck>/index.html`。在审阅中写明每份故事的最弱页。JSON 通过不等于整稿获批。
5. 宿主运行（使用宿主现有配置，会消耗其额度）：

   ```bash
   npm run host:visual -- --host codex --live --out dist/host-visual-NEW --case drafted
   ```

   预期：`report.json` 中 `ok:true`，两份含图片审阅的回执，`before.html` 与 `after.html` 只在被修订的那一页不同。Claude 只有在另行授权后才运行。

## 恢复

- **`Set CHROMIUM_PATH…` 或 `Installed browser bundles are read-only`**：改为指向 `/Applications` 之外的测试版浏览器。
- **`npm test` 报 `A gallery page changed`**：恢复该页；或有意重写 `gallery-manifest.json`，并在审阅中说明原因。
- **`quality.json` 中某份整稿为 `failed`**：打开 `runs/<deck>/report.json`，每个问题都写明场景、内容块和原因。修复内容或渲染器后重新运行发布门；绝不隐藏失败的页面。
- **宿主运行报 `HOST_REVIEW_FINDINGS_INVALID`**：错误中的 `reason` 写明宿主回答未通过哪一项检查，例如某张图片缺少发现。在新的 `--out` 目录中重新运行；之前的尝试保留为证据。

## 仍未完成

完整清单见[证据](../evidence/vis-014/review.md#open--recorded-not-fixed)：

- Claude 宿主
- 缺字形检测
- 390 px 下热力图需要横向滚动
- 中文标题在词中断行
- 页面体积
- 读屏软件、输入法、200% 缩放与投影
- PowerPoint、Keynote 与 PDF 原生导出（VIS-016）
