# Astra 二次验证响应：交接（2026-10-19，第六轮后更新）

给下一个会话的交接。方案本身在 [响应方案](astra-second-verification-response.zh-CN.md)，其 §9 是实施记录；本文只说当前状态、做了什么、没做什么、下一步怎么开。

## 当前状态

| 项 | 值 |
|---|---|
| 分支 | `claude/astra-feedback-solutions-725dfb`（基于 `main` 的 `9771bf4`，未推送） |
| 工作区 | `.claude/worktrees/astra-feedback-solutions-725dfb` |
| 提交状态 | 六轮改动经评审后按六个提交落在本分支（方案文档、验收契约 F2/F3/F5、F1、F7 与 §5、F6、F4 与 §4 文案；见 `git log main..`），**未推送**。各中间提交没有单独跑 `verify`，只在最后一个提交上跑过 |
| `npm run verify` | 通过：485 项测试，481 通过，0 失败，4 环境门控跳过；源码检查 1545 文件 |
| 浏览器门控 | 隔离 Chrome for Testing 149.0.7827.55 + Playwright 1.61.1：`browser_session_reconnect.mjs`（6 项，连续三次）、`browser_visual_studio.mjs`（22 项）、`browser_author_controls.mjs`、`browser_workbench.mjs`、`browser_visual_task.mjs` 通过；`tests/studio-export.test.mjs` 4/4 |
| 未能运行 | `tests/browser_acceptance.py`、`tests/browser_smoke.py`：本机 Python 没有 `playwright` 模块。第五轮改过 `browser_acceptance.py` 的 409 步骤，未经运行验证 |
| 真实宿主 | 没有调用；Claude 登录仍 deferred |
| 原生应用 | PowerPoint / Keynote / Figma / AE 未打开 |

隔离浏览器与 Playwright 模块路径（浏览器在 `/Applications` 之外，临时 profile；JS runner 需要 `PLAYWRIGHT_MODULE`，1.61.1 已验证可驱动 chromium-1228）：

```bash
export CHROMIUM_PATH="/Users/feida/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
```

```bash
export PLAYWRIGHT_MODULE=/Users/feida/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs
```

**会话注意。** 新会话要直接在上面的 worktree 里打开。若会话启动在另一个 worktree，写文件会被钩子拒绝；第五轮用 `EnterWorktree`（`path` 指向本 worktree）切换后才能写。

## 已完成（五轮，均在 2026-10-19）

| 反馈项 | 做了什么 | 测试 |
|---|---|---|
| F2 required model 跨路径 | `src/orchestration/grants.mjs` 新增 `assertModelPolicy`；`src/services/agent-bridge.mjs` 的 `complete`、`completePatch`、`visualTool`、`checkpoint` 共用 `acceptModel`，通过时写 `model.reported` | `tests/planning-jobs.test.mjs` 末尾 "F2: …" |
| F1 字号 gate | `src/targets/capabilities.mjs` 的 `TYPOGRAPHY_MINIMUM_PT`（校准后 标题 18 / 正文 10 / 注释 6）；`src/targets/pptx/audit.mjs` 的 `typographyCheck` 与 `textRole`；导出报告、Markdown、`export:targets` 摘要多出 `typography` | `tests/export-targets.test.mjs` 的 "F1: the typography result…" |
| F1 拆页 | `src/targets/pptx/paginate.mjs`（元素清单、均衡切段、分段布局）；`compilePPTX`/`auditPPTX`/`runExport`/`exportDeck`/`studioTargetExport`/Studio API 的 `paginate: 'auto' \| 'none'`；报告 `pagination`；中英 `compatibility.md` 说明 | `tests/export-targets.test.mjs` 的 "F1: a scene taller…"（gallery 真实高页）；隔离 Chromium 实测 blueprint en/zh：`auto` 4 张、五项 pass、最小 7.17 pt |
| F5 离线部分 | `src/quality/pixel-control.mjs`（PNG 编解码、标记放置/识别）；`reviewWithHost` 的 `pixelControl` 与 `review.attestation`/`controls`；`recordVisualReview` 的 attestation；CLI `--pixel-control`；中英 `hosts.md` | `tests/pixel-control.test.mjs`（编解码、放置/识别、三种 fake host、attestation 规则） |
| F3 结构化覆盖 | `schemas/host-response.schema.json` 的 `outline` 为 `pages[].lines[]{text, sourceLine}`；`src/hosts/tasks.mjs` 的 `sourceLines`/`checkSourceCoverage`/`outlineText`，逐字节、恰好一次、顺序单调，`hostDraft.hostAuthored` 记录新增行；中英 `hosts.md`、`skills/deck/SKILL.md` 同步 | `tests/host-adapters.test.mjs` 的 "F3: …"（重复、空白、重排、嵌入、错误归属、越界、新增计数、无源文） |
| F4 快速字段 | `PROJECT_STATUS.json` 测试数 475/471/0/4 带 commit，旧值移入 `historicalPublicationAutomatedTests`；`notImplemented` 图表句；`roadmap.json` VIS-015 gate；中英 handoff 的 player 版本 `.6` 与历史段标注 | `npm run check` |
| F6 重连并保留草稿 | 新文件 `public/session.js`（`ask`、`sessionRecovery`→`reconnect()`、`askSaveCopy`），`server.mjs` 以 `/session.js` 提供；`public/app.js` 与 `public/studio/visual.js` 的 `api()` 在 401 时弹"重新连接并保留修改"，取新令牌后重试一次，不刷新页面；选"暂不"后后台请求不再弹窗，直到再点保存；409 时弹"另存为独立副本 / 继续编辑"，副本走现有 import 路由；中英 `agent-bridge.md`、`manual.md` 同步 | 新 runner `tests/browser_session_reconnect.mjs`（经典版与视觉版：拒绝重连、重连保存、409 另存副本）；`browser_visual_studio.mjs` 与 `browser_acceptance.py` 的 409 步骤先点"继续编辑" |
| F7 部分 | `src/workbench/cdp.mjs` SIGKILL 后有界等待；`tests/browser_harness.py` `try/finally` 与 TERM→KILL；`src/qa/hosts.mjs` 的 `commandProbe` 改为 POSIX 进程组 kill | `tests/hosts.test.mjs` 末尾 "F7: …"（孙进程被停止，Windows 跳过） |
| §5 加固 | `sanitizeOutput` 增加 JWT/AWS/`api_key=`/`password:`/`token=`/home/`~/` 形状；`validateFit` 可见文字宽度下界 | `tests/hosts.test.mjs`、`tests/measurements.test.mjs` 各一条 |
| §4 文案 | `agent-bridge.md`（worker 上限、required 模式）、`architecture.md`（session 端点）、`manual.md`（宿主联网）、`compatibility.md`（五项结果），中英同步；`docs/evidence/vis-010/review.md` 与 `docs/visual-acceptance/review.md` 标注为 agent 图像审阅；parity 阈值注释 | `npm run check` |

## 未完成（按方案编号）

| 项 | 缺什么 | 方案位置 |
|---|---|---|
| F1 剩余 | Studio 导出对话框的 paginate 选项与黄色状态、作者显式接受（`typography.acceptedBy`）、`export:targets` 的 `--paginate` 开关、续页上的页码 chrome、18 个 deck 的失败清单、用户在 PowerPoint/Keynote 中打开冻结包 | §2 F1、§3.2、§9 第三轮 |
| F3 剩余 | Studio 大纲里的"宿主新增"标记与导出报告显示 | §2 F3 |
| F4 生成脚本 | `scripts/status-summary.mjs` 生成 `docs/current-status.json`，`npm run check` 与 `PROJECT_STATUS.json` 比较；`PROJECT_STATUS.json` 的 `history[]`；`handoff-contracts.test.mjs` 的 player 版本断言 | §2 F4 |
| F5 剩余 | 在线三组对照脚本与通过标准（需用户授权真实宿主）；Studio 与导出报告显示 attestation；Claude 形状的 fake 读像素测试；Studio 评审表单提交 `attestation: 'author'` 的浏览器验证；`.deckweft-pixel-control/` 的清理与 `.gitignore`（第六轮已修：`control.json` 宿主运行后才写入、工具参数不能自报宿主等级） | §2 F5、§9 第四、六轮 |
| F6 剩余 | 在装有 Python Playwright 的环境跑 `browser_acceptance.py` 与 `browser_smoke.py`；视觉版重启后旧测量票据被拒时顶部出现一次"Refresh the measured visual preview."（下一次预览后恢复，未改）；视觉版对话框主按钮没有强调色；`docs/en/verification.md` 的 runner 清单未加入新 runner | §9 第五轮 |
| F7 剩余 | Windows CI 的进程树测试（`tests/process-tree.test.mjs`） | §2 F7 |
| §5 剩余 | importer PNG 校验抽取、历史容量提示、CDP `Target.setAutoAttach`、bridge 分享确认文案、`SECURITY.md` 审查范围清单、Codex "no tools" 说明、doctor 输出首行说明、media-workers 文案核对 | §5、§4 |
| §3.3 | 30 分钟作者实测协议与 `start.md` 重排 | §3.3 |
| 英文版 | 方案与本文都只有中文；按 AGENTS.md 需要英文主页 | — |

需要用户决定的六件事仍在方案 §6，尚未得到答复。

## 下一个会话怎么开

**推荐顺序。** 六轮改动已评审并提交（未推送）。接下来 F4 生成脚本（它也会修正 `PROJECT_STATUS.json` 里仍记在 `b86ec18` 的 475 项测试数） → F1 的 Studio 拆页选项与作者接受 → F3/F5 的 Studio 显示 → §5 剩余 → 英文版文档。需要你授权或你本人操作的项（F5 在线对照、PowerPoint/Keynote 打开、Windows 实机、30 分钟实测）放在最后。一次会话只做一项，避免一个分支同时改 schema 和 UI。

**推荐模型与 effort。**

| 任务 | 模型 | effort | 理由 |
|---|---|---|---|
| **F4 状态生成脚本（推荐的下一个实现项）** | Claude Opus 5.5 | medium | 范围清楚、可单测，设计已在 §2 F4 |
| F1 的 Studio 选项与作者接受、Studio 显示 attestation 与宿主新增行 | Claude Fable 5.1 | high | UI 与导出报告要全局一致，牵动多个浏览器 runner |
| F7 Windows 进程树测试、§5 剩余 | Claude Opus 5.5 | medium | 机械实现为主 |
| 文案同步、英文版、`verification.md` runner 清单 | Claude Sonnet 5.5 | medium | 低风险 |

**提示词：F4 状态生成脚本（可直接粘贴）。**

```text
请先读 docs/plans/astra-second-verification-handover.zh-CN.md、docs/plans/astra-second-verification-response.zh-CN.md（含 §9 实施记录）和 AGENTS.md。工作区是分支 claude/astra-feedback-solutions-725dfb 的 worktree，前六轮已提交但未推送，不要改写这些提交。

本次只做方案 §2 的 F4 生成脚本：新增 scripts/status-summary.mjs，生成 docs/current-status.json（commit、package.json 版本、PLAYER_VERSION 与渲染器版本、最近一次 verify 的 total/pass/fail/skip、浏览器版本、roadmap.json 的 open gates）；npm run check 调用它并与 PROJECT_STATUS.json 的同名字段比较，不一致即失败；PROJECT_STATUS.json 增加 history[]（commit、date、supersededBy），历史证据不删；tests/handoff-contracts.test.mjs 增加一条：handoff.md 中的 semantic-player.N 必须等于 PLAYER_VERSION。先写测试再实现。完成后跑 npm run verify。

约束：不调用真实宿主、不登录、不推送、不加依赖、不打开 /Applications 里的应用；只在我说提交时提交。结束时按 AGENTS.md 列出跑过的测试、看过的图、没打开的应用，把做了什么和没做什么追加到方案 §9，并更新本交接文档。
```

把第二段换成其他项（例如 "F1 的 Studio 拆页选项与作者接受"、"§5 历史容量提示" 或 "F3 的 Studio 宿主新增标记"）即可复用；改到 Studio UI 的项要同时跑受影响的浏览器 runner（命令见下）。

**开场命令。**

```bash
git status --short
```

```bash
npm run verify
```

```bash
CHROMIUM_PATH="/Users/feida/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" node --test tests/studio-export.test.mjs
```

```bash
CHROMIUM_PATH="/Users/feida/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" PLAYWRIGHT_MODULE=/Users/feida/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node tests/browser_session_reconnect.mjs
```
