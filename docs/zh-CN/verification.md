# 验证记录 — 0.1.0-alpha.2

[English](../en/verification.md) · [本轮改动](alpha-2.md) · [真实宿主验收](host-acceptance.md)

准备日期：2026-10-16。下面是这份源码实际观察到的结果，不是所有电脑都能通过的保证。原始日志保留运行环境的真实时间戳；alpha.1 的证据单独保存在 `docs/evidence/alpha.1/`。

## CINE 批次 1 电影化构图 P0，2026-10-20

CINE-001 至 CINE-004 在分支 `claude/deckweft-design-roadmap-2d3d10` 上的状态为 **implemented-local**（未合并）：一个声明的演示目标、三个可选场景字段 `references`、`intent`、`media`、紧凑来源条与编号、页面意图与媒体角色。任务状态不变。[证据（英文）](../evidence/cine-p0/review.md) · [构建地图](../plans/cinematic-composition-build-map.md) · [迁移](migration.md#来源呈现页面意图与媒体角色cine-批次-1) · [视觉工作室](visual-studio.md#页面用途与入口cine-003)。

命令（隔离浏览器为 Playwright 缓存中的 Chrome for Testing 151.0.7922.34，Playwright 1.61.1）：

```bash
npm run verify
CHROMIUM_PATH=… node --test tests/studio-export.test.mjs
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=…/playwright/index.mjs node tests/browser_cine.mjs --evidence
CHROMIUM_PATH=… PLAYWRIGHT_MODULE=…/playwright/index.mjs node scripts/export-targets.mjs --cine --out dist/export-targets-cine
node tests/render-baseline-diff.mjs <be9921d 的检出目录> docs/evidence/cine-p0/baseline-diff.json
```

结果：

- `npm run verify` 通过 **550 个测试**（545 通过，5 个跳过：需要 `DECKWEFT_HANDOFF_DIR` 的登记表测试、需要 `CHROMIUM_PATH` 的三个工作室导出测试，以及另一个受浏览器限制的用例），并通过类型、源码与链接检查、打包和演示。Node 24.14.0。
  - 新增 `tests/cine-p0.test.mjs`（38 个测试：双语语料、目标预算与字号报告、PDF 分段、fit-page 与声明的拆页、引用契约、编号、来源条、参考面板、导出与重排稳定性、意图契约、推断、排布、标记与节奏偏好、经工作室 API 的 set-intent 与 visual-space 动作、媒体角色、媒体网格、主体占比，以及文档）。`tests/fixtures/visual/cine.negative.json` 的 22 个用例全部被拒绝。
  - 设置 `CHROMIUM_PATH` 后，单独运行 `tests/studio-export.test.mjs` 通过 5/5。
- 渲染基线为渲染器 `visual-art-direction.13` 重新记录（仅样式表部分变化；38 个条目的内容哈希全部相同；播放器 `semantic-player.6` 不变）。与 `be9921d` 的对比显示 12 个 HTML 条目中没有任何可见文字、数值、锚点、数据表或标题变化。
- `tests/browser_cine.mjs`（隔离 Chromium 151，Playwright 1.61.1）：中英文在 1440、1024、390 px 下共 60 次页面测量、111 张截图、0 个页面错误、0 个外部请求。12 条来源的来源条在 1440 px 下高 46.2 px（预算 48 px）；溢出页经三次 `fit-page`（按测量边界）切成四页，均在预算内；六个主题下 38 次媒体版式测量得出 `LARGEST_MEDIA`（image-right；Luminous Stage 用 stage-hero；系统关系图用 system-map-wide）。1440 px 下超过 900 px 预算的页面：中英文的 product-center、mechanism、overflow（拆页前），以及中文的 long-heading；原因记录在证据中。
- `node scripts/export-targets.mjs --cine`：2 份文稿。PowerPoint 可编辑性、独立检查、页面检查与字号结果在 2/2 上通过；PDF 可搜索性英文通过、中文部分通过（部首码位，S7 已知限制）；无障碍部分通过（Chromium 的分组图形）。高页被分页：英文 3 页、中文 4 页，标题在续页以单行或按 18 pt 下限换行重复。
- 已查看：1440 与 390 px 的两份联络表、媒体联络表、product、product-center、detail、mechanism、evidence 与 overflow 的截图、灰度副本、证据页幻灯片与溢出页续页的 Quick Look 渲染和 PDF 页面，以及中文长标题幻灯片。最弱的一页是 `mechanism`（图解自身的连线布局）；其次是中文 `long-heading`（标题 12ch 栏宽）。
- PowerPoint 与 Keynote 已安装但**未运行**；LibreOffice 未安装。Firefox、WebKit、屏幕阅读器、PDF/UA 验证器与 Claude 均未运行。

## S11 S1–S10 合并就绪检查（本地），2026-10-19

对 `d584d76` 的状态为 **LocalVerified**。[证据（英文）](../evidence/s11-merge-readiness/review.md) · [对齐计划 §20（英文）](../plans/design-handoff-alignment.md#20-s11-decisions-and-result--merge-readiness-2026-10-19) · [合并计划](../plans/design-handoff-merge-to-main.md#readiness-s11-2026-10-19)。

结果：

- 在仓库之外对 `d584d76` 做干净 `git archive`，再 `npm ci` 和 `npm run verify`：**475 个测试**（471 通过，4 个跳过：需要 `DECKWEFT_HANDOFF_DIR` 的登记表测试，以及需要 `CHROMIUM_PATH` 的三个 Studio 导出测试）。Node 24.14.0。
- 发布门禁和 17 个浏览器脚本（S2 至 S9b）在隔离的 Chrome for Testing 151.0.7922.34、Playwright 1.61.1 中重跑：记录的数字都复现。`browser_families` 与 `browser_compositions` 起初因过期的 `.candidate-panel` 选择器失败（S9a 新增了同类名的面板），改三行测试后通过；parity 与 author-controls 各失败一次、重跑通过，原因未查明。发布门禁的显式用例为 11/11（S6 记录 10/11，S8 已修复）。
- 已拉取 `origin/main`：仍为 `058b939`，未变动。在该处建立了本地标签 `backup/main-before-design-handoff`。当时没有推送。之后分支已推送，Windows 任务曾在 atomic-write 并发测试中失败一次，已修复（`0ade8dc`），并合并进 `main`（`20457eb`）；推送、拉取请求和 `main` 上的 Ubuntu、macOS、Windows 都通过。
- 未运行：PowerPoint、Keynote、Figma、Firefox、WebKit、Node 22、远程 CI、Claude。

## S10 模式库维护（DWD-310）

登记表字段、手册与测试的状态为 **Implemented**（2026-10-19）。DWD-310 仍为 partial。[证据（英文）](../evidence/s10-pattern-maintenance/review.md) · [对齐计划 §19（英文）](../plans/design-handoff-alignment.md#19-s10-decisions-and-result--pattern-library-maintenance-and-the-p3-boundary-2026-10-19) · [手册](pattern-register.md)。

结果：

- `npm run verify` 通过 **475 个测试**（471 通过，4 个跳过：与 S9b 相同的环境类和浏览器类测试），另有类型、源码与链接检查、打包和演示。
- `tests/design-registers.test.mjs` 共 9 个测试；设置 `DECKWEFT_HANDOFF_DIR` 后 9 个全部通过，证明已交付的原始字段没有被改动。
- 三个页面的浏览器抽样（Chromium 152，内置窗格）：1440 与 390 px 的初始状态，加一次表格排序。没有记录减少动态效果或静态状态。它只是对交接包读法的抽查，不改变 `referenceVerified`。
- 未运行：其余 1,387 条 OpenAI 路径、Anthropic 首页以外的页面、Firefox、WebKit、PowerPoint、Keynote、Figma 与 Claude。

## S9b 蓝图 A — 讲解 → 图解 → 探索（DWD-210）

状态：S9b 范围为 **LocalVerified**（2026-10-19）。VIS-009 仍为 implemented-local。[证据（英文）](../evidence/s9b-blueprint-a/review.md) · [对齐计划 §18（英文）](../plans/design-handoff-alignment.md#18-s9b-decisions-and-result--blueprint-a-2026-10-19) · [交互](interactions.md#讲解--图解--探索蓝图-as9b) · [Visual Studio](visual-studio.md#讲解--图解--探索页面s9b)

结果：

- `npm run verify` 通过 **470 项测试**：466 项通过，4 项跳过（原有的环境门控测试，以及 3 项需要浏览器的 Studio 导出测试）。类型、1,528 个文件的源码与链接检查、打包和示例也全部通过。
  - 新增：`tests/s9b-blueprint-a.test.mjs`（6 项），另在 `host-adapters`、`argument-units` 和 `workbench` 中各新增一项 Codex 页面规划测试。
  - 设置 `CHROMIUM_PATH` 后，`tests/studio-export.test.mjs` 4 项全部通过。
- 渲染基线在单独的提交中重新录制一次：渲染器 `visual-art-direction.12`、播放器 `semantic-player.6`。与 `e80ecd7` 的逐项对比显示，没有任何可见文字、数值、表格、锚点或标题发生变化。
- `tests/browser_blueprint_a.mjs`（隔离的 Chrome for Testing 151，Playwright 1.61.1）：66 个步骤，覆盖恢复规则、键盘隔离、减少动态效果和无 JavaScript 视图，在 1440、1024、390 px 下用中英文各运行一遍；0 个页面错误，0 个外部请求。
- `tests/browser_blueprint_studio.mjs`：9 个步骤。依次检查锁定、操作本身和撤销／重做；没有静态状态时 PowerPoint 被拒绝，静态状态为“讲解”时 PDF 被拒绝；选择“图解”后两者都成功导出。1024 与 390 px 下检查了窄检查器。
- `node scripts/s9b-blueprint.mjs`：12 份文稿（六套主题 × 两种语言），每种语言内事实相同；在三种宽度下，每页和每个关键状态都没有版面、对比度或字形问题。
- `npm run export:targets -- --s9`：PowerPoint 可编辑性与页面检查 12 份全部通过；中文 PDF 搜索为部分通过（S7 已知限制）。
- 已查看：两张联系表、播放器与 Studio 截图、四张导出对照表。最弱的一页是“讲解”阶段；有四页超过 900 px 预算（已记录）。
- 应用户要求，用真实 Codex CLI（0.160.0）运行了一次草稿页数规划：提供 3 页原文、目标 6 页，结果起草 4 页，没有填充，也没有宿主添加的页面；本地规划询问了缺少的“背景”和“局限”单元以及另外 2 页材料（[记录（英文）](../evidence/s9b-blueprint-a/codex-page-plan/page-plan.json)）。
- 未运行：Firefox 与 WebKit、PowerPoint、Keynote，以及 Claude。

## S9a 作者控制 — 2026-10-19

状态：S9a 范围为 **LocalVerified**。VIS-013 仍为 implemented-local，VIS-015 仍为 partial。[证据（英文）](../evidence/s9a-author-controls/review.md) · [对齐计划 §17（英文）](../plans/design-handoff-alignment.md#17-s9a-decisions-and-result--author-controls-2026-10-19) · [工作台](workbench.md#六个问题与三个方向s9a) · [Visual Studio](visual-studio.md#作者控制章节与分项锁定s9a)。

结果：

- `npm run verify` 通过 **461 项测试**（457 项通过，4 项跳过：原有的环境门控测试与 3 项需要浏览器的 Studio 导出测试），以及类型、1,497 个文件的源码与链接检查、打包和演示。
  - 新增：`tests/s9a-author-controls.test.mjs`（14 项，其中两项是针对独立代码审查 12 项发现的回归测试）、`tests/argument-units.test.mjs`（11 项）、`tests/studio-export.test.mjs`（4 项）。
  - 设置 `CHROMIUM_PATH` 后，`tests/studio-export.test.mjs` 4 项全部通过；在 3 份文稿上，其 PowerPoint 字节与 `scripts/export-targets.mjs` 的 Playwright 路径完全一致。
- 渲染基线为渲染器 `visual-art-direction.11`（页面折叠内容的样式规则）重新记录一次，单独提交。与 `4f26b33` 的逐项对比显示没有任何可见文字、数值、表格、锚点或标题变化；播放器不变。
- `tests/browser_author_controls.mjs`（隔离的 Chrome for Testing 151、Playwright 1.61.1）：在 1440、1024、390 px 下完成 28 个界面步骤，0 个页面错误，0 个外部请求。唯一的控制台错误是锁定版式后更换主题被拒绝时预期的 HTTP 409。
- `node scripts/s9a-directions.mjs --exports`：
  - 24 份方向文稿（每套主题分别作为首选方向 × 原文与六类构图 × 英文与中文）在三种宽度下无排版、渲染或字形问题，各主题间事实一致。
  - Studio 的 PowerPoint 与 PDF 导出 48/48 通过导出顺序的检查。
  - 1440 px 下 132 页中有 11 页超过 900 px 候选预算（已记录）。
- 已查看：全部四张对照表、三种宽度下的方向卡片，以及证据中列出的计划与编辑结果；最弱页面已在证据中注明。
- PowerPoint、Keynote 与 Figma 已安装但未运行；LibreOffice 与 After Effects 未安装；Claude 仍延后。

## S8 T01–T03 主题包与 VIS-015 — 2026-10-19

状态 **partial**。[证据（英文）](../evidence/vis-015/review.md) · [手册](visual-studio.md#再增三套主题silver-gray-editorialfresh-reportorange-launchs8vis-015) · [对齐文档 §16](../plans/design-handoff-alignment.md#16-s8-decisions--t01t03-themes-and-vis-015-2026-10-19)。

结果：

- `npm run verify` 通过 **432 项测试**（431 通过，1 项按环境跳过），以及类型、源码与链接检查、打包和演示。
  - 新增 11 项测试在 `tests/s8-themes.test.mjs`：三套主题包及其 Token 角色、测得的对比度、自定义属性及其回退值、字体角色、主题专属构图、主题 CSS、C12 词间换行、C13 缺字形审计、S8 故事、交接样页与第 42 页故事板。
  - 既有测试为六套主题包、zh-CN 展示文字中的 `<wbr>`、每次适配结果中的 `glyphs` 列表以及导出就绪阶段的页内缺字形拒绝做了扩展。
  - 渲染基线重新记录三次，每次单独提交，对应渲染器 `visual-art-direction.7` → `.9` 与播放器 `semantic-player.5`。与 `a8c0404` 的逐条对比显示没有任何可见文字、数值、表格、锚点或标题改变。
- `node scripts/s8-themes.mjs`（隔离的 Chrome for Testing 151，Playwright 1.61.1，0 次外部请求）：24 份文稿在 1440、1024、390 px 下 0 个适配或渲染问题；136 对测得的对比度全部高于阈值；9 个显式用例全部通过（每个主题的缺字形、媒体失败封面、低动作模式、黑白 Research Atlas、每个主题的中文词间换行）；三个主题在两种语言下事实一致。
- `npm run export:targets -- --s8`：18 份文稿。PowerPoint 可编辑性与逐页检查 18 份全部通过；PDF 可搜索性在 9 份英文文稿通过，在 9 份中文文稿为 partial（部首码位，与 VIS-016 相同）；每份报告列出所用字体。
- VIS-014 的显式用例重新运行：11 项全部通过；缺字形现在由适配审计检测。
- PowerPoint、Keynote 与 Figma 已安装但未运行。LibreOffice 与 After Effects 未安装。

## S7 输出等级与 VIS-016 导出 — 2026-10-19

状态 **partial**。[证据（英文）](../evidence/vis-016/review.md) · [手册](compatibility.md#v3-视觉演示文稿的-powerpoint-与-pdfs7vis-016) · [对齐文档 §15](../plans/design-handoff-alignment.md#15-s7-result--output-levels-and-vis-016-2026-10-19)。

结果：

- `npm run verify` 通过 **421 项测试**（420 通过，1 项按环境跳过），以及类型检查、1,334 个文件的源码与链接检查、打包和示例。
  - 新增的 11 项测试在 `tests/export-targets.test.mjs` 中。它们覆盖等级、导出顺序、ready 阶段的拒绝、静态呈现、PowerPoint 编译、L3 回退、读回字节后发现的篡改、PDF 打印作业与检查、报告、编译辅助函数，以及独立代码审查发现的问题的修复。
  - 三项旧测试改为断言已声明的等级，不再断言 S2 的拒绝。
  - 渲染基线不变。
- `npm run export:targets` 跑完九份演示文稿（冻结的 VIS-014 语料加 S4 图表类型样例）。它使用禁用页面脚本的隔离 Chrome for Testing 151，外部请求为 0，约 50 秒完成。
- PowerPoint 可编辑性与逐页对照派生场景的检查：9/9 通过。带缺失值、对数轴或区间的图表以 L3 图像交付，共 9 个。
- 标准库检查 `tests/inspect_v3_pptx.py` 9/9 通过；每个内嵌工作簿都与图表缓存一致。
- PDF 可搜索性（pypdf 6.16.2）：5 份英文通过，4 份中文 partial。Chromium 把页、门、长、见、母记成 CJK 部首码位。每个打印出的场景尺寸都与测量值一致。
- 无障碍：PowerPoint 文件包检查通过；PDF partial（Chromium 的 figure 外层缺 `/Alt`）。
- 视觉保真：partial，只有 macOS 快速查看的参考渲染。

已查看：九份演示文稿的全部对照图（网页、PowerPoint、PDF 并排），以及封面、趋势、排序、热力图与示意图幻灯片的单张快速查看渲染。

PowerPoint 与 Keynote 已安装但未运行；未发现 LibreOffice 与 After Effects。未测试：读屏软件、PDF/UA、远程 CI。

## VIS-014 首个视觉发布门 — 2026-10-19

状态 **partial**。[证据（英文）](../evidence/vis-014/review.md) · [发布门手册](visual-acceptance.md) · [评分审阅（英文）](../visual-acceptance/review.md)。

结果：

- `npm run verify` 通过 **410 项测试**（409 通过，1 项按环境跳过），以及类型检查、1,271 个文件的源码与链接检查、打包和示例。
- `scripts/release-gate.mjs` 在隔离的 Chrome for Testing 151 和临时上下文中运行。冻结画廊与三份故事的中英文版本在 1440、1024、390 px 下均为 0 个问题，96/96 条交互轨迹通过。
- 11 个显式用例中 10 个通过；缺字形无法被检测。
- 三份 VIS-001 旧版整稿在每个主题中都保留全部文字。
- 8 份导出文件从系统临时目录离线打开，在 Chromium 151、Firefox 153（缓存版本）和 WebKit 26.5 中均正常；复制出去的运行包也在那里完成了一个本地任务。
- 真实 Codex CLI 0.160.0 运行：从提示起草整稿，审阅 7 张实际截图后导出，只修订第 3 页，再次审阅并导出，第 3 次尝试通过。第 1 次是发布门脚本的缺陷；第 2 次是宿主审阅被拒，适配器现在会写明拒绝原因。
- Claude 仍为 deferred。
- 在合并后的分支上重新运行：
  - `tests/browser_evidence_scene.mjs`（S2）
  - `browser_motion_state.mjs`（S5）
  - `browser_chart_kinds.mjs`（S4）
  - `browser_families.mjs`（S3）
  - `browser_compositions.mjs`（VIS-006）
  - `browser_interaction_visual_parity.mjs`（VIS-009，216 项对照）

  S2 与 S5 脚本已按分层聚焦规则和 S4 的 HTML 条形标记更新。

已查看：每份整稿的 1440 px 对照表、两张 390 px 对照表、用例截图、旧基线对照、各引擎截图，以及宿主修订前后的页面。

咨询性评分为 74–77/100，低于 80 的试点门槛。

PowerPoint、Keynote、Figma 已安装但未运行（没有 v3 编译器）；未发现 LibreOffice 与 After Effects。

## S6 合并 S3、S4、S5 — 2026-10-19

S6 中又重录了一次（`semantic-player.4`、`visual-art-direction.6`），原因是 VIS-014 画廊暴露出六个渲染缺陷：斜切封面的引用对比度、封面数字被拆行、趋势图时间标签重叠、热力图行标签超出画框、比较面板下前后对比图片标签错误、线性流程图换行。与上一次记录（`8252c10`）相比，12 个 HTML 条目中没有任何可见文字或数值变化；锚点与数据表相同。[回执](../evidence/s6-integration/baseline-diff-gallery-fixes.json)。

S3、S4、S5 是从 S2 分出的三个平行分支，各自重录过渲染基线。S6 按 S3 → S4 → S5 的顺序合并，并应用分层图表聚焦规则（[决定](../plans/design-handoff-alignment.md#13-s6-decisions-2026-10-19)）。`PLAYER_VERSION` 现为 `semantic-player.3`，`WEB_RENDERER_VERSION` 为 `visual-art-direction.5`。**渲染基线已在单独的提交中有意重录**，保留播放器历史（`.1`、`.2`、`.3`）。全部 12 个 HTML 条目的字节都有变化。与各分支末端逐条对照：相对 S4，任何条目的可见文字和数值都没有变化，锚点与数据表相同；相对 S3 和 S5，唯一的文字变化就是 S4 本身对排序条形图的修改（“按数值从高到低”说明、0 刻度、图表类型措辞），锚点与数据表相同。2 个 JSON 哈希不变。[S3](../evidence/s6-integration/baseline-diff-s3.json) · [S4](../evidence/s6-integration/baseline-diff-s4.json) · [S5](../evidence/s6-integration/baseline-diff-s5.json)。

## S5 动效状态与播放器冲突 — 2026-10-19

S2 的静态状态扩展并入唯一的内嵌播放器（`PLAYER_VERSION` 为 `semantic-player.2`）：一个提示时钟统一播放、暂停、定位、下一、上一、重播与减少动态；六个具名动效原语，各自声明减少动态时的结果；EvidenceStage 图表状态分开保存（聚焦不等于隐藏）；控件或图表标记获得焦点时按键不会翻页；审查门同时测量每个已声明的静态状态；Studio 开场操作拒绝复制静态状态；无 JavaScript 时绘制冻结的步骤、比较标签与热点。未声明 `staticState` 的输出保持不变（C7）。`render-baseline.json` 在单独提交中有意重新记录：10 个 HTML 条目只有播放器脚本与 CSS 变化（交互样例的运行时数据另有新增字段）；读者可见标记、两个 JSON 条目和全部 12 个主题条目不变。`npm run verify` 通过 **373 项测试**（372 通过，1 项按环境跳过），以及类型、源码与链接检查、打包和演示。`tests/browser_motion_state.mjs` 在隔离的 Chrome for Testing 151 和临时配置文件中通过：中英文、1440 与 390px 下共 2,864 次按键均未翻页；已查看全部 28 张截图。S2 脚本、VIS-009 验收和讲解编辑浏览器测试在新播放器上通过；预览／导出像素一致性测试在 S2 提交和本版本上都因 390px 图解边缘像素而失败。PowerPoint、Keynote、Figma 已安装但未运行；未发现 After Effects 与 LibreOffice。[证据](../evidence/s5-motion-state/review.md) · [冲突](../plans/design-handoff-vertical-sample.md#s5-update-2026-10-19) · [交互](interactions.md#提示时钟动效与键盘)。

## S3 构图类型 — 2026-10-19

在 VIS-006 的六类之外新增六类：章节、前后对比、系统关系图、小倍数图、引语、结论与下一步。每类有三种结构、一种必需内容块、焦点与密度元数据，以及 1440 / 1024 / 390px 的分栏规则；三个 schema 与三套主题包均已列出。表格／参考类未加入，因为比较类已覆盖表格。新增类别只能由作者明确选择，不会自动推断。

整稿节奏选择现在遵循交接包规则：同一构图不连续出现第三次（顺序内容与比较内容除外），不出现连续三页“标题加卡片”，10–15 页文稿少于四种类别时给出建议。作者锁定优先，并在报告中列出。C9 已修复：切换主题再切回，方案与渲染哈希都与原来相同。

结果：

- `npm run verify` 通过 **376 项测试**（375 通过，1 项按环境跳过），以及类型、源码与链接检查、打包和演示。
- `tests/browser_families.mjs` 在隔离的 Chrome for Testing 151 和临时配置文件中运行：108 个新候选全部在 1440px 下通过；1440 / 1024 / 390px 的 324 项检查均符合各结构的分栏规则；54 项基线标签检查通过；页面错误与外部请求均为 0。
- 四个面板的页面在三种结构下都未通过，因此被拒绝；用 `splitSmallMultiples` 拆分后，两页均通过。
- 现有 108 个候选的 `tests/browser_compositions.mjs` 与 S2 的 `tests/browser_evidence_scene.mjs` 仍然通过。
- 已查看全部六张 1440px 对照表，以及 390px 对照表、整稿截图和 Studio 截图。

`render-baseline.json` 已在单独的提交中有意重新记录：22 个字节哈希改变（样式表与主题构图列表），两个 JSON 导出不变，所有内容哈希（文字、数值、标识、链接、脚本）与 `232060e` 一致。

PowerPoint、Keynote、Figma 已安装但未运行（没有 v3 编译器）；未发现 LibreOffice、After Effects 与 Firefox。

[证据](../evidence/s3-composition-families/review.md) · [逐字节对照](../evidence/s3-composition-families/byte-identity.json) · [说明](visual-studio.md#新增六类构图s3)。

## S4 设计交接图表渲染器 — 2026-10-19

图表渲染器现在绘制 S1 的各项声明（对数轴、带说明的截断、作者顺序／升序排序、区间、事件、缺失原因），关闭 S2 的图表冲突 C1、C2、C3、C10 与 C19，并新增六种 P1 图表：直接标注条形、`grouped-bar`、`dot-interval`、末端标注趋势、`small-multiples`，以及带限定说明的 `benchmark-table`。图形、标签、文字陈述和数据表都来自同一个数据对象；三套主题下的数据表逐字节一致。`npm run verify` 通过 **375 项测试**（374 通过，1 项按环境跳过），以及类型、1,149 个文件的源码与链接检查、打包和演示。`tests/browser_chart_kinds.mjs` 在隔离的 Chrome for Testing 151 和临时配置文件中通过，覆盖中英文、1440／1024／390px、有无 JavaScript 和灰度：每个视图 119 个结论标签，无一被隐藏或只能滚动查看；注入滚动容器后，Studio 测量审查门以 `VISUAL_FIT` 拒绝。S2 垂直样本与现有交互套件再次通过；已提交的所有图片均已查看。**渲染基线经有意重新记录**，单独提交：10 个 HTML 哈希全部变化（嵌入的图表代码、CSS 与 `WEB_RENDERER_VERSION` `visual-art-direction.4`），每个文件的锚点、数据表和数值均未改变；JSON 与主题哈希不变。PowerPoint、Keynote、Figma 已安装但未运行（没有 v3 编译器）；未发现 After Effects 与 LibreOffice。[证据](../evidence/s4-chart-renderer/review.md) · [字段决定](../plans/design-handoff-alignment.md#s4-field-list-decisions-2026-10-19)。

## S2 设计交接垂直样本 — 2026-10-19

一页示意证据页（结论、排序条形图、来源、焦点）以中英文完整走过 Studio 导入、两套主题包、字体测量、鼠标与键盘焦点、暂停与定位、新增的静态状态选择、现有的测量后导出审查门，以及导出文件的各个视图。静态输出现在会把已声明的 `staticState` 应用到图表选择；`reducedMotion: "static"` 时显示该状态而不播放提示；现有输出保持逐字节一致。`npm run verify` 通过 **362 项测试**（361 通过，1 项按环境跳过），以及类型、源码与链接检查、打包和演示。`tests/browser_evidence_scene.mjs` 在隔离的 Chrome for Testing 151 和临时配置文件中通过；已查看 1440 与 390px 的全部 20 张截图。键盘焦点从未翻页，快速翻页后待执行计时器为 0。PowerPoint、Keynote、Figma 已安装但未运行（没有 v3 编译器）；未发现 After Effects 与 LibreOffice。20 项冲突附复现步骤列出。[证据](../evidence/s2-vertical-sample/review.md) · [冲突清单](../plans/design-handoff-vertical-sample.md)。

## S1 设计交接契约扩展 — 2026-10-19

仅契约变更，状态 **Implemented**。四个 v3 schema 新增可选交接字段（场景结论、内容状态、关键状态与静态状态；数据集身份、定义、缺失原因、区间与事件；按图声明的刻度、排序与截断；动效触发／时钟／减少动态；主题 token 角色）。`npm run verify` 通过 **355 项测试**（354 通过，1 项按环境跳过）、类型重新生成、1,083 个文件的源码与链接检查、可复现打包和演示。新增 13 项测试覆盖六条误读守卫（各含一正一反）、旧示例与反例、显式 `declareChartSemantics()` 迁移、锁定映射与主题默认值；其中一项证明 12 份现有 HTML／JSON 输出和 12 份主题解析结果与变更前记录的哈希完全一致。未运行浏览器、宿主、PowerPoint、Keynote、Figma 或 After Effects，未做任何视觉检查。尚无渲染器的声明会以具名错误码拒绝 HTML 导出。[字段与恢复](architecture.md#版本-3-交接字段s12026-10-19) · [计划记录](../plans/design-handoff-alignment.md#11-s1-result--contract-extension-2026-10-19)。

## 交互视觉回归闭环 — 2026-10-18

封面数字已有明确的对比色承载面；窄屏反向连线使用独立标签行与箭头轨道。`npm run verify` 通过 **338 项测试**；完整交互图库通过 **6 套故事／146 张截图**，覆盖 1440／1024／390px、触控、原生后台清理、锁定与历史。已有作品的中英文编辑流程均通过；**216 对真实预览／下载 HTML 画面**通过，HTML、页面标记与选择状态精确相同，像素比较使用已记录的光栅舍入容差。已查看六套整稿与交互联系图，以及封面、流程、编辑器原图。未观察到页面错误或外部请求。PowerPoint／Keynote／Figma 未运行，未发现 After Effects。[完整证据、修复与边界](../evidence/interaction-visual-regression/review.md)。本次结果取代下方历史记录中尚未解决的封面对比度阻断。

已提交运行时源码还通过本地干净目录 `npm ci`／完整验证和 GitHub Node 22 三平台 CI。修复了 Windows CLI 测试路径及原子替换时的短暂占用，保留功能断言并新增四项持久化测试。[远程 CI 与推送回执](../evidence/interaction-visual-regression/publication.json)。

## 已有作品的讲解交互 — 2026-10-18

`npm run verify` 通过 334 项测试及类型、源码、可复现打包与已有导出检查。已有 Studio 的添加交互、编辑说明、保存、重开及测量后 HTML 下载流程在中英文均通过；离线导出的 1440／390px 操作与减少动态状态通过，未观察到页面错误或外部请求。已实际查看图表、流程和编辑器截图。旧交互图库在非交互封面数字的对比度检查处停止，未计为通过。PowerPoint／Keynote／Figma 未测试，未发现 After Effects。[证据与限制](../evidence/explanatory-authoring/review.md)。

## 现有作品的视觉表达 — 2026-10-18

共享 v3 渲染器现在为现有项目派生标题／正文／图注层级、阅读宽度、开放或结构化留白，以及奶油拼贴／电紫叙事／黑底数据的协调配色。中文数值页与手机阅读标题使用独立字号档位。竖幅图片在作者原有比例和裁切内缩放。实测整篇节奏同时考虑叙事适配与相邻重复，继续排除失败候选。渲染器身份和源码字节审阅检查使旧依据失效。本轮未新增独立产品 demo、运行时依赖、字体文件、提供方或上传行为。

`npm run verify` 通过 **331 项测试**、类型、源码／链接检查、可复现打包和样例生成。内置浏览器实际检查了现有中英文各六页作品在 1440／1024／390px 的排版，并实际查看桌面与手机图片。36 个当前构图候选中 **32 个通过**，每页至少两种选择；超高候选仍显示失败。此前实际发现并修复了图文／证据页超高和中文标题碎行，没有通过裁切或遗漏原文取得通过。应用并保存实测节奏后，逐项确认语义文稿、素材、裁切与作者字段保持一致。实际从 UI 下载的 HTML 与共享渲染器输出逐字节一致，保留 81.25%、六个原生标题和本地图片，排除编辑器 DOM 和字体文件。

本地截图、来源比较、候选结果和验证日志位于 `dist/art-direction-review/`；总览图片由这些实际截图裁成。上述记录不新增真实编码宿主、绑定图片审阅后的导出、远程 CI、其他浏览器引擎、屏幕阅读器或原生应用验收。未打开 PowerPoint、Keynote、Figma、After Effects，也未探测其可用性。路线图验收状态不变。

## 现有工作台调整 — 2026-10-18

`/visual` 现在先显示作品画布和同一派生页面生成的缩略图。创作与单页编辑使用可收起的独立侧栏；构图比较、图片审阅、文件历史及恢复按需展开。本地模式明确只排版原文，不再把一页输入重复成多页。设计范围与修订范围独立。观众 HTML 仍由页面渲染，并保留已有审阅门槛。

`npm run verify` 通过 **326 项测试**、类型、源码／链接检查、可复现打包和样例生成。新增回归覆盖单页保留、另一输入主题及私人需求排除、含本地图片且无脚本的单页缩略图，以及无效页面的 404。本轮内置浏览器检查覆盖两个本地主题、81.25% 原值、一页结果、未审阅导出阻断、侧栏切换保留编辑、缩略图／前后翻页／键盘导航、放大阅读、Codex 许可按需出现和中英文响应布局。实际保存并查看了 `dist/workspace-review/` 下的桌面与 390px 阅读截图。可选外部浏览器脚本已适配新入口，本轮未重跑。不新增真实 Codex／Claude 调用、绑定图片审阅后的导出、远程 CI 或原生应用验收。未打开 PowerPoint、Keynote、Figma、After Effects，也未探测其可用性。路线图验收状态不变。

## VIS-013 — 提示词优先工作台，2026-10-18

`npm run verify` 通过 **323 项测试**、类型、源码／链接、可复现打包及示例。真实 UI 已检查无需手动布局的提示词／本地来源生成、隔离浏览器实际 PNG、明确图片审阅边界，以及真实 Codex 第 4 页有效修订、逐图反馈和变更后的已审阅 HTML。作者锁、原文／数据／素材、私有讲稿排除、过期序号及最后验收 HTML 保持受检。原有 22 项 Visual Studio 浏览器回归通过。实际查看桌面／手机界面及故事／组件截图。Claude 登录与真实任务继续暂缓；未打开 PowerPoint／Keynote／Figma，AE 不可用。VIS-013 为本地实现完成，VIS-014 更广发布／引擎／无障碍／原生关卡仍开放。[手册](workbench.md) · [证据](../evidence/vis-013/review.md)。

## VIS-012 — 编码宿主适配，2026-10-18

`npm run verify` 通过 **312 项测试**、类型、源码／链接、可复现构建与样例。真实 Codex 结构化起草、必需截图逐图反馈，以及确有变化的第 4 页局部修订现已完成严格闭环：再次审阅后导出新的 HTML，前后哈希不同，原文、数据、素材和其他页面保持一致。早先无变化导出和耗尽预算仍作为历史失败保留。新增 14 个双语缩放检查，并重跑已有组件／交互浏览器回归。Claude 仅探测版本／帮助，登录和真实任务继续暂缓。实际查看了桌面／移动完整故事及图表／流程图原尺寸截图，具体文件见闭环证据；未打开 PowerPoint／Keynote／Figma，未在 `/Applications` 找到 AE。VIS-012 为**本地实现完成，整体验收 partial**。[证据、失败与限制](../evidence/vis-012/review.md) · [手册](hosts.md)。

## 需求校准 — 2026-10-18

已按当前未提交实现同步视觉优先需求、任务依赖与后续交接。本次文档调整重新执行 `npm run verify`：**290 项测试通过**，类型、源码／链接、可复现构建和样例均通过。本次未新增浏览器／图像、宿主、原生应用或远程 CI 验收。[范围与验证](../evidence/roadmap-reconciliation/review.md)。

## VIS-011 — 本地任务编排，2026-10-18

`npm run verify` 通过 **290 项测试**、类型、源码检查、可复现构建及示例。隔离 Chromium 153.0.8010.12 在 1440/390px 实跑完整输入故事、仅第 4 页精确数据图表修订、有界修复和作者锁定失败。实际查看 13 个最终截图路径，三份结果经绑定图像审阅及最终 HTML 验证，有效导出后真实失败重跑仍保留已接受的源/HTML 字节。22 项双语 Studio 浏览器回归也通过。十一项控制器测试使用明确标注的模拟能力，不声称真实宿主/模型运行。PowerPoint/Keynote/Figma 未运行；AE 不可用。外部事实核实、v3 原生导出、更广无障碍/引擎检查及 VIS-012/013 保持后续范围。[说明](task-loop.md) · [证据](../evidence/vis-011/review.md) · [日志](../evidence/vis-011/verify.txt)。

## VIS-010 — 浏览器质量与实际图像审阅，2026-10-18

`npm run verify` 通过 **279 项测试**及类型、源码、可重复构建和示例。独立 Chromium 检查通过六套 15 页稿、390/1024/1440px 三种宽度、234 条真实操作轨迹和 1,872 条区域覆盖。五类注入故障均触发对应检查；内容／布局／状态绑定回执经过实际图像判断后通过。共查看 48 个图像输出，包括整稿、原尺寸组件、故障、修复前后和响应式选中状态。普通修复每套只改一页、用一轮；真实锁定失败探针验证两轮后最后有效 HTML 字节不变且未完成候选仍保留。Studio 的 22 项浏览器回归通过。缺失标记间距与移动端横向滚动保留为明确限制。[说明](visual-quality.md) · [证据](../evidence/vis-010/review.md) · [完整验证](../evidence/vis-010/verify.txt)。本轮未运行 PowerPoint／Keynote／Figma，AE 不可用；更广发布／宿主／原生／其他引擎／无障碍关卡仍开放。

## VIS-009 — 语义状态与有限场景生命周期，2026-10-18

`npm run verify` 通过 **271 项测试**及类型、源码、可重复打包和双语离线示例检查。三主题、中英文六份 15 页故事通过真实 Chromium 鼠标／键盘／原生触控／减少动态效果、精确图表筛选与数据表、图片视图／热点、原文代码／图解步骤、确定性有限重播／暂停／定位、编辑／独立锁定／冲突／历史及稳定身份重排验证。270 个实测候选中 264 个通过，每页至少两个可行。独立原生 Chrome 驱动和临时配置在无焦点模拟下确认真实后台切页，计时器／动画／登记资源归零，返回后保留信息。实际查看了六组整稿与交互联系表、完整截图及代表组件／编辑界面，修复预算、键盘、焦点／披露和场景哈希问题；组件／Studio／构图／素材浏览器回归也通过。未观察到页面错误或外部请求。未运行 PowerPoint／Keynote／Figma，未发现 AE；v3 原生、其他引擎／无障碍及更广发布关卡仍开放。[说明](interactions.md) · [证据与修复](../evidence/vis-009/review.md) · [日志](../evidence/vis-009/verify.txt)。

## VIS-008 — 精确数据、给定关系与原文代码，2026-10-18

`npm run verify` 通过 **263 项测试**及类型、源码、可重复打包和双语示例检查。隔离 Chromium 在 390／1024／1440px 验证六份三主题、中英文 14 页故事，覆盖六类图表数据变化、精确空白、稳定注释／页面身份、无 JavaScript 阅读和本地编辑保存。252 个实测候选中 240 个通过，每页至少两个可行候选。实际查看了六套组件及整稿联系表、完整截图、代表组件和编辑界面；已修复越界、箭头遮挡、堆叠标签、流程高度和热力图配色问题。既有 22 项 Studio、108 个构图候选及 36 个素材场景浏览器回归通过，未观察到页面错误或外部请求。未运行 PowerPoint／Keynote／Figma，未发现 AE。VIS-009 动效、v3 原生编译器、其他引擎／无障碍和更广发布检查仍开放。[说明](components.md) · [失败与证据](../evidence/vis-008/review.md) · [日志](../evidence/vis-008/verify.txt)。

## VIS-007 — 来源、保真像素与受保护裁切，2026-10-18

`npm run verify` 通过 **255 项测试**及类型、源码、可复现构建与样例检查。隔离 Chromium 验证 36 个中英文／三主题裁切视图，以及 JPEG／WebP／EXIF 导入、原件下载、重复复用、v2／v3 来源提取、锁定／质量／事实性限制和生成不可用时的明确替代。三组原图／保真 PNG 像素对照的最大 RGBA 差为 0。实际查看裁切总览、六份完整文稿与编辑器截图，最终素材浏览器报告无页面错误或外部请求。另重跑已有 Studio 和 VIS-006 浏览器回归。未运行 PowerPoint／Keynote／Figma，未找到 AE。[说明](assets.md) · [失败、限制与证据](../evidence/vis-007/review.md) · [日志](../evidence/vis-007/verify.txt)。

## VIS-006 — 实测构图与整稿节奏，2026-10-18

`npm run verify` 通过 **247 项测试**及类型、源码、可复现构建与示例检查。隔离 Chromium 测量六类、三结构、三主题、中英文共 108 个候选页面；96 个符合演示预算，每组代表内容至少两个通过。六份选定文稿在 390/1024/1440px 检查，实际查看六张候选总览、六份完整文稿截图及编辑器／放大候选。原有 Visual Studio 22 项浏览器回归通过，两份报告均无页面错误或外部请求。事实、精确小数、引用、素材、锁定、重排后主题身份、v1/v2 迁移、冲突与历史恢复持续覆盖。未运行 PowerPoint／Keynote／Figma，未找到 AE。[说明](visual-studio.md) · [失败、修复与证据](../evidence/vis-006/review.md) · [最终日志](../evidence/vis-006/verify.txt)。

## Visual Studio 与 Electric Violet — 2026-10-18

`npm run verify` 通过 **240 个测试**及类型、源码、可重复打包和双语演示。直接回环浏览器检查覆盖 v3 编辑／保存／重开、锁定、主题、数值图表、保存期间编辑、双窗口冲突、历史恢复、本地 PNG 替换、旧版迁移和实测 HTML 导出。双语页面在 390/1024/1440 宽度检查字体与图片就绪，31 张截图包含三主题总览。故意插入的白底白字与标题裁切均被检测；未观察到页面错误或外部请求。PowerPoint／Keynote／Figma 未运行，未找到 AE，远程 CI 和完整发布关卡仍待验收。[手册](visual-studio.md) · [检查记录](../evidence/visual-studio/review.md) · [完整日志](../evidence/visual-studio/verify.txt)。

## 视觉优先 Wave A — 2026-10-18

`npm run verify` 通过 **231 个测试**，类型、源码、可重复打包与原有演示检查通过。新实验性语义网页包含中英文拼贴与数值图表。隔离 Chromium 直接回环检查覆盖 390/1024/1440 宽度、实际字体与 DOM 测量、完整数值表、键盘展开、导航及禁用 JavaScript 阅读，未观察到页面错误或外部请求。三组旧版基线与原提交副本逐字节一致。已实际查看截图并修正封面数字对比度问题。VIS-001～005 仍为 partial，远程 CI 与宿主／原生应用关卡未完成。PowerPoint、Keynote、Figma 未运行，未找到 AE。[指南](visual-first.md) · [检查记录](../evidence/visual-wave-a/review.md) · [完整日志](../evidence/visual-wave-a/verify.txt)。

## MB-11～15 本地素材与 worker 构建 — 2026-10-18

`npm run verify` 通过 **222 项测试**、schema 派生类型/负例/编译产物检查、源码检查、可复现打包，以及中英文、讲者和素材示例。[日志](../evidence/mb-11-15/verify.txt)。

提供的浏览器与独立缓存测试浏览器 151.0.7922.34 直接访问回环地址，检查了四页英文/中文混合内容、生成插图、轨道/层叠、真实 WebGL 上下文丢失、减弱动态效果、键盘旋转、打印静态后备、390/1024/1440 宽度、保存重开和实测媒体导出。未观察到未捕获页面错误。四页 PPTX 的独立包检查发现 23 个原生文字形状和 1 张独立图片，原图哈希、文字、XML 与关系均保留。

一次真实图片工具调用生成了插图，之后用其原始输出检查新任务登记流程，不把后来的登记记录算作先前工具调用的派发/取消证据。并发 CLI 首轮因来源 URL 无效被严格拒绝；明确无来源输入约束后，第二轮两项通过并有 12.547 秒重叠，分别集成为新项目。模型身份仍来自 CLI 配置报告，费用未知。

MB-11/13 本地完成；MB-12 保留 Dot 桌面门槛。Figma 虽已打开，但没有完成实际分配插件身份的导入或真实图层审阅；本机无 AE，MB-14/15 保持 partial。本批未启动 PowerPoint/Keynote，既有宿主、无障碍和投屏门槛不变。[指南](media-workers.md) · [证据](../evidence/mb-11-15/review.md)。

## MB-06～10 本地规划构建 — 2026-10-17

`npm run verify` 通过 **207 项测试**、v1/v2 schema 派生类型、负例、编译后运行检查、源码检查、可复现插件打包及既有中英文/讲者示例。[最终日志](../evidence/mb-06-10/verify.txt)。

[叙事流程](planning.md)与[真实 Astra medium/high 评测](astra-evaluation.md)已有本地证据。浏览器实测并目视检查七页英文和一页中文混排。最终七页 PowerPoint 无修复提示打开，对比、图片及总览已目视检查；包内有 49 个原生文字形状和一张独立图片。HTML 鼠标/键盘探索、浏览器审阅保存副本通过；确认的宽度为 390、1024、1440 CSS 像素。

四次真实 CLI 调用产出 24 项结果，当前自动门槛全部通过，无修复调用。每批六项的平均耗时 medium 为 31.271 秒，high 为 36.567 秒。美元成本与独立服务端模型确认未知。另一次真实 CLI 队列任务已审阅并从浏览器保存副本。**Dot 桌面不可用，MB-08 保持 partial。** Keynote/Figma 已安装但本批未运行，AE 不可用；既有屏幕阅读器、缩放、投屏和宿主门槛仍保留。[记录](../evidence/mb-06-10/review.md) · [机器证据](../evidence/mb-06-10/review.json)。

## MB-01～05 本地讲者构建 — 2026-10-17

`npm run verify` 通过 **187 项测试**、schema 派生类型/无效契约检查、编译产物运行、源码检查、可重复插件构建与中英文示例生成。使用提供的浏览器直接访问本地服务，检查了操作语义、亮暗设置、跨标签页停止 Three.js 动画、逐页跟随提词、中英文实时计时、宽度/停靠、暂停/继续、四种响应式尺寸、独立来源观众同步、刷新重连与结束清屏。当前讲者和观众错误日志为空。视觉导出默认省略私密备注，显式讲者副本与完整项目 JSON 分别验证。

类型工作是限定范围试点，并非全仓库迁移。真实会议投屏/扩展屏幕、200% 缩放、读屏和其他引擎仍待验收。本批未运行 PowerPoint、Keynote 或 Figma，AE 不可用，也未做 Dot/Astra 真实宿主验收。[操作指南](presenting.md) · [检查与截图](../evidence/mb-01-05/review.md) · [最终日志](../evidence/mb-01-05/verify.txt)。

## 展示与本地 agent 接口：2026-10-17

`npm run verify` 通过 165 项测试、源码检查、插件构建及中英文示例导出。本地接口覆盖真实 MCP／CLI 子进程，以及浏览器中测试 worker 返回草稿、审阅、另存副本的流程。心跳和状态轮询引发的锁竞争已修复并加回归。Signal 为新增预设，英文演示视图未见可见中文内容。实际走通改标题、选 Evidence grid、保存和浏览器实测 PPTX 导出；这不是人工计时排练成绩。

单独编排的八页展示均已目视检查，PPTX 有 47 个原生文字形状与六张图片。Figma 实际创建八个设计画面和原生关键帧，检查了致谢视频前、中、稳定帧。Three.js WebGL、Dot 点击及减少动效回退已在提供的浏览器运行。单独 HTML 打包约 538 KiB 的 MIT 渲染库，gzip 约 137 KiB，核心工作台不增加第三方运行依赖。

此前认证 CLI 的证据仅适用于其记录的 bundle 哈希，本次新增接口和主题后没有重跑该宿主任务。

实际 Dot 宿主／模型、核心 Figma 导入器和 AE 执行仍未验收。本机 AE 不可用，当前修订未在 PowerPoint／Keynote 检查。不声称已测得模型质量或兼容性提升。见[证据](../evidence/dot-stage/review.json)、[完整验证日志](../evidence/dot-stage/verify.txt)和[连接指南](agent-bridge.md)。

## DW-020 更新：2026-10-17，macOS

当前 Mac 已安装 Codex CLI 0.160.0、Claude Code 2.1.288。Codex 使用已有登录，发现独立项目技能并调用自带 CLI，完成三页英文虚构任务。轨迹证实读取技能及格式说明，并成功执行 doctor、new、check、layouts、HTML 和 PPTX 导出。独立重导出与宿主文件逐字节相同。PPTX 包含 24 个原生文字形状，没有图片，XML、关系及原文完整性检查通过。LibreOfficeDev 26.8.0.0.alpha0 渲染后三页均完成视觉检查，未发现裁切、重叠或文字缺失。

**完整关卡仍阻塞**：用户要求暂不登录 Claude；Codex 桌面原生插件激活及远程 CI 未运行。首次任务的本地 HTML 浏览器访问被策略拒绝，PowerPoint、Keynote 未打开。脚本仍要求人工审阅，独立审阅记录只覆盖真实检查范围。运行器修复了 Claude 普通权限模式兼容性，移除备用技能路径，增加导出字节对比、插件哈希检查、安装失败处理、非空证据目录保护及有限超时参数。`npm run verify` 全部通过：149 项测试（包含 7 项新增回归）、源码检查、可复现打包，以及中英文示例导出。

[当前审阅](../evidence/dw-020/review.json) · [Codex 技能发现轨迹](../evidence/dw-020/2026-10-17-codex-discovery/report.json) · [本机验证日志](../evidence/dw-020/verify.txt)

以下为 2026-10-16 Linux 环境的原始 alpha.2 结果。

## 本轮结果

| 检查 | 实际结果 | 不能据此声称什么 |
| --- | --- | --- |
| Node 自动化测试 | **142 项通过、0 失败、0 跳过**；Node 22.16.0 / Linux | 不等于第三方安全认证 |
| 源码检查和插件构建 | 语法、文档链接、Schema、示例、任务依赖、版本、字体排除均通过 | 没有远程 GitHub CI 运行记录 |
| 真实 Codex / Claude Code 探测 | 两个 `--version` 都返回 `ENOENT`，**宿主验收阻塞** | 没有认证任务通过，也没有桌面插件启用通过 |
| 独立插件运行文件 | 隔离复制后，真实 CLI 校验示例成功 | 不是宿主读取并调用技能的证据 |
| Chromium 交互测试 | **22 项通过**，无未捕获页面错误 | 使用离线页面和真实本地 API 桥接 |
| 浏览器字体测试 | **28 组内容与画幅、112 个候选布局、448 个文字框** | 不涵盖所有字体与操作系统 |
| 完整中英文示例 | 各 6 页；额外测量 **304 个候选文字框**，检查 82 个选定文字节点的 SVG 边界 | 仅代表本次 Chromium/Linux 字体环境 |
| PPTX 独立解析 | 两种语言各 6 页、各 41 个原生文字形状；CRC/XML/关系目标通过 | 没有打开 Microsoft PowerPoint 或 Keynote |
| LibreOffice 渲染 | 两份 CLI 示例和一份浏览器实测示例，共 **18 页**已渲染并目视检查 | 不保证其他软件不会替换字体 |
| Figma / After Effects | 保留交接生成、模拟及静态测试 | 本轮没有真实应用验收 |

448 个单页用例文字框中，121 个实测结果与离线估算在字号或换行上不同。这证明实测路径被执行，不是“质量提升百分比”。用例覆盖中文标点、混排、组合字符、emoji、硬换行、制表符、长网址和密集文字。必须保留完整原文及字符簇；放不下就阻止视觉导出，不能悄悄删字。完整中文示例还暴露了数字卡标签高度不足的问题，现已修复并加入回归。

## 交互测试检查了什么

实际检查了键盘分页和标签页、撤销重做、无变化操作、弹窗焦点、合成输入法事件、保存途中继续输入、两个窗口的版本冲突、无效输入备份、测量失败、过期预览、实测 PPTX、只读历史、恢复为副本、等待恢复时禁止关闭、取消切换保护草稿及窄屏抽屉。

测试复现并修复了快速重开“未保存修改”弹窗后按钮失效的问题，以及 Tab 焦点移出抽屉的问题。6 种窗口从 320×740 到 1600×1000 未发现整页横向溢出；这不代表所有控件都无需滚动即可同时展示。**真实操作系统输入法、屏幕阅读器、200% 浏览器缩放仍待手工验收。**

## 为什么不能标记所有验收通过

这里的 Chromium 144.0.7559.96 被管理策略禁止直接打开本地地址，错误为 `ERR_BLOCKED_BY_ADMINISTRATOR`。没有修改安全策略。替代测试载入实际源码页面，把请求转发到真实本地服务，并使用仅供测试的 UUID 辅助；这种方式不验证生产 CSP。Node 集成测试另行检查 Host、Origin、令牌、大小限制及安全头，但也不能替代真实浏览器直连。

宿主探测执行了真实命令，而不是假装程序存在；安装源另有 DNS 错误 6。没有虚构版本，也没有绕过权限。你在 Mac 上执行真实宿主任务后，还需要核对调用轨迹和每页效果，才能关闭 DW-020。

## 原始证据与截图

[Node 日志](../test-results.txt) · [宿主报告](../evidence/alpha.2/host/report.json) · [安装源探测](../evidence/alpha.2/host/registry-reachability.txt) · [浏览器报告](../browser-evidence.json) · [字体报告](../font-evidence.json) · [PPTX 报告](../pptx-evidence.json) · [Office 渲染报告](../office-evidence.json)

[英文工作台](../assets/studio-desktop.png) · [中文工作台](../assets/studio-chinese.png) · [历史恢复](../assets/history-chinese.png) · [窄屏历史](../assets/history-mobile-loaded.png)

[英文 CLI 渲染](../assets/welcome-contact.png) · [中文 CLI 渲染](../assets/welcome.zh-CN-contact.png) · [浏览器实测渲染](../assets/browser-measured-contact.png)

截图来自运行代码或导出文件，不是设计稿。校验中间使用的 PDF 不随包分发，也不分发字体文件。数字卡示例故意保留了“缺少来源”的警告，它们描述演示功能，不是外部研究结论。

## 怎样重跑

只检查核心代码：

```bash
npm run verify
node bin/deckweft.mjs host-check --target both --out host-evidence-preflight
```

第二条命令退出码 **2** 表示完整宿主关卡还没有通过，不表示报告没有保存。启用 `--live` 前先阅读宿主手册：真实任务可能消耗现有套餐或 API 用量。

下面是可选 QA，需要 Python Playwright/Chromium；PPTX 解析另需 python-pptx/lxml，它们不是产品运行依赖：

```bash
python tests/browser_acceptance.py --mode direct
python tests/browser_fonts.py --mode direct
python tests/inspect_pptx.py
```

`--mode fixture` 仅用于明确重现受限环境的测试，不得改名为直连验收通过。不要把本轮结果宣传成所有浏览器、无障碍或安全认证。

## 五分钟 DevDay 与 Three.js 更新 — 2026-10-17

当前展示稿有 14 页、644 个讲稿词，推荐每分钟 140 词，正文约 276 秒，页面安排合计 300 秒。工具新增紧凑图标栏、英文生成的时长和语速、讲稿统计与计时、交互导览，以及 Cosmic & Dots 风格。Dots 主体与表情已用 Three.js 网格重建，实际下载了五个透明渲染图。

本轮在提供的浏览器中打开并检查全部 HTML 页面，测试布局比较、计时、抽屉、减少动效与实际 PowerPoint 下载。六种窗口宽度下保留五个主要工具入口和四种布局，未发现整页横向溢出。最终媒体版 PPTX 已在实际 PowerPoint 打开，无修复提示；检查封面、总览及工作台截图。修正了母版共用主题，以及截图文件后缀与真实编码不同导致宽度错误的缺陷。

真实 Dot／Astra 仍待连接验收，不能把本地协议测试计为宿主成功。After Effects 未安装；Keynote 可用但本轮未测。媒体风格暂时禁用实验性 Figma／AE 交接。无发布门槛被改为完成。见[当前指南](devday-demo.md)及[验收记录](../evidence/devday-redesign/review.json)。
