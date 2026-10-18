# DeckWeft

当前本地构建新增[私密讲者界面与独立观众窗口](docs/zh-CN/presenting.md)、逐页跟随提词器、工作区亮/暗/跟随系统、统一动效偏好与操作分组。视觉导出默认不含私密备注，需要讲者副本时显式开启。开发期类型试点不影响直接离线启动；真实投屏和宿主关卡另行验收。开发检查前执行 `npm ci` 安装开发工具，日常启动 Studio 无需安装依赖。

**把想法，排成清晰的故事。**

[English](README.md) · [从这里开始](docs/zh-CN/start.md) · [简单手册](docs/zh-CN/manual.md) · [路线图](docs/zh-CN/roadmap.md) · [实际支持范围](docs/zh-CN/compatibility.md)

你可以把 DeckWeft 想成一张整齐的工作桌：文字是材料，四种布局是整理工具，导出文件是你最后带走的成果。它在自己的电脑上运行，默认先支持英文，简体中文独立维护。

**当前版本：`0.1.0-alpha.2`。** 这是已经能运行的本地基础版本，不是完整商业演示套件。没有内置模型、隐藏上传、遥测或必须购买的 API。Codex / Claude Code 中的技能可以让宿主模型帮助写稿，但工作台本身只是按规则排版，不会假装在调用 AI。

![实际运行的 DeckWeft 工作台](docs/assets/studio-desktop.png)

## 本地素材与多个 worker

MB-11～15 增加可选宿主图片请求/本地复用、两个独立授权 worker、轨道/层叠 3D 与可编辑静态后备，以及更完整的 Figma/AE 交接。真实并发 CLI 与直接浏览器素材/3D 流程已通过；**Dot 桌面、Figma 原生导入与 AE 实际渲染仍未验收。**[指南](docs/zh-CN/media-workers.md) · [证据](docs/evidence/mb-11-15/review.md)。

## 叙事与视觉规划

MB-06～MB-10 本地构建新增可审阅提案、六类语义模板、本地 PNG 来源/许可/后备记录、HTML 键盘探索，以及带授权、检查点和时间线的单宿主任务。v1 保持原样，批准提案后保存为独立 v2 副本。[使用步骤](docs/zh-CN/planning.md) · [medium/high 实测](docs/zh-CN/astra-evaluation.md) · [证据](docs/evidence/mb-06-10/review.md)。

真实 Codex CLI 对同一组六项短任务各运行两次 medium/high，两档均通过 12/12 当前检查。本组 medium 的耗时和报告输出更少，美元成本与独立服务端模型身份未知。Dot 桌面验收仍未完成。

## 先跑起来

安装 Node.js 22 或更新版本。解压源码 ZIP，在包含 `package.json` 的 `DeckWeft` 文件夹中打开终端：

```bash
node bin/deckweft.mjs studio --open
```

没有需要下载的第三方运行依赖。浏览器没有自动打开时，手动打开终端打印的本地地址。关闭前点击“保存”；在终端按 `Ctrl+C` 停止程序。

## 英文演示与可选起草

在 Studio 地址后加 `?mode=pitch` 可进入英文演示视图，其他语言项目暂时隐藏而不修改。Signal 新增白、黑、蓝预设。**Generate with Dot** 是可选本地接口，支持 MCP 和已连接电脑上的 CLI；本地测试通过，实际 Dot 宿主运行仍待验收。见[连接说明](docs/zh-CN/agent-bridge.md)。

[舞台展示示例](docs/examples/dot-stage/README.md)另有离线 Three.js 动效和可编辑 PPTX 回退。可选舞台示例与 Cosmic & Dots 风格使用本地打包的 MIT 渲染库；普通布局不需要安装外部包。

[五分钟 DevDay 演示](docs/zh-CN/devday-demo.md)已将图标工具栏、讲稿排练、交互导览和可选 Cosmic & Dots 风格接入工作台。该风格使用本地 Three.js 几何角色、原创星场，并在 PPTX 中保留原生文字。Dot 桌面仍待验收，独立 GPT-6 Astra CLI 实测见上文。

## 现在能做什么

导入 Markdown / 纯文本大纲或项目 JSON；比较四种不同布局；修改标题、正文、要点、数字卡、备注、来源、主题和顺序；撤销和重做；切换四种画幅；保存多个项目并检查版本冲突；导出可编辑 PowerPoint、离线 HTML、单页 SVG、完整项目 JSON 和实验性的 Figma / AE 交接数据。

文字放不下时，不会偷偷删字，也不会无限缩小字体，而是阻止视觉导出并提示你修改。**排版分数不是事实核查分数。** 工作台使用浏览器实测，独立 CLI 保持离线估算；演示前仍要检查目标软件里的最终文件。

## 装进编程助手

```bash
node bin/deckweft.mjs install --target both --scope project --dry-run
node bin/deckweft.mjs install --target both --scope project
```

第一条只预览，第二条才复制文件。`project` 只影响当前项目；`user` 会安装到个人技能目录。这里安装的是**独立技能与完整运行文件**，不是已经通过宿主验证的市场插件。Codex 识别后使用 `$deckweft`；Claude Code 识别后使用 `/deckweft`。

原生插件另走 `npm run build` 与[安装手册](docs/zh-CN/installation.md)。复制成功、宿主启用成功、实际运行成功，是三件不同的事。

## 不打开网页也能导出

```bash
node bin/deckweft.mjs check examples/welcome.zh-CN.deck.json
node bin/deckweft.mjs export examples/welcome.zh-CN.deck.json --format pptx --out welcome-zh.pptx
```

默认不覆盖已有文件。确实要替换时才加 `--force`。

## 暂时没有的功能

自动查资料、生成图片、原生可编辑图表、视频渲染、任意 PPTX 导入、多人实时协作、在线付费系统、直接控制桌面 Figma / AE，都没有被包装成已完成。两个导入器仍需要真实软件验收。切换语言不会自动翻译文稿。

## 开发与许可

```bash
npm run verify
```

这会运行测试、文档与源码检查、插件打包及示例导出。更多见[架构](docs/zh-CN/architecture.md)、[贡献说明](CONTRIBUTING.md)和[下一阶段交接](docs/zh-CN/handoff.md)。

MIT 许可证和原作者声明见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE.md)。新名字不等于抹去原来的来源。`package.json` 的 `private` 只用于避免误发 npm，不妨碍公开 GitHub 源码。

## 验证记录

查看[验证报告](docs/zh-CN/verification.md)、[机器可读状态](PROJECT_STATUS.json)和[本地测试输出](docs/test-results.txt)。已通过的本地检查与尚未运行的真实宿主检查分开记录，不用假徽章代替证据。

## alpha.2 更新

工作台新增浏览器真实文字测量，预览和导出复用同一份排版；命令行仍明确使用离线估算。加入只读历史版本浏览和“恢复为新副本”，并修复输入法、键盘焦点、过期预览及保存竞争。**DW-020 整体验收仍阻塞**：已登录 Codex CLI 的独立项目技能任务已通过，并完成输出审阅；按用户要求暂不登录 Claude，Codex 桌面原生激活和远程 CI 也尚未验证。详见[当前宿主证据](docs/zh-CN/host-acceptance.md)。

[更新说明](docs/zh-CN/alpha-2.md) · [宿主验收指南](docs/zh-CN/host-acceptance.md) · [当前验证报告](docs/zh-CN/verification.md)
