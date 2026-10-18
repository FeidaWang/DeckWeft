# 验证记录 — 0.1.0-alpha.2

[English](../en/verification.md) · [本轮改动](alpha-2.md) · [真实宿主验收](host-acceptance.md)

准备日期：2026-10-16。下面是这份源码实际观察到的结果，不是所有电脑都能通过的保证。原始日志保留运行环境的真实时间戳；alpha.1 的证据单独保存在 `docs/evidence/alpha.1/`。

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
