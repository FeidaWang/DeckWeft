# Astra 二次验证（2026-10-19）解决方案

针对 `main` 的 `b86ec18` 收到的两份 Astra 反馈：

| 来源 | 位置（本机，仓库外） | 结论 |
|---|---|---|
| 独立二次验证报告（A–E） | `~/.codex/state/plugins/codex-security/scans/repo/b86ec18…_20261019T091613Z_nesxiqo4/artifacts/second-verification.zh-CN.md` | 475 / 471 / 0 / 4 复现；7 项发现 F1–F7；8 条被高估的表述；10 个无法判断的问题 |
| Codex Security 审查报告 | 同目录 `report.md` | 0 项可报告安全发现，覆盖 partial；两处 Needs follow-up（宿主进程与提示语义、Figma/AE 原生解析） |

本文是实施方案，不是实施记录。写作时未改任何源码、测试、roadmap 或状态文件；每一节的"验收"要等对应分支的 `npm run verify` 和列出的证据到位后才算完成。本文也不授权任何真实宿主调用、登录、推送或依赖变更；需要用户决定的事项集中在 [§6](#6-需要用户决定的事项)。

## 1. 对反馈的总体判断

两份报告的主结论都接受：本地实现与测试数字可信，安全威胁模型内没有可复现的漏洞，差距集中在"通过"一词覆盖的范围比实际证明的范围大。因此方案的主线不是修漏洞，而是三件事，顺序与报告 §6 一致：

1. **统一"接受结果"的契约**：F2、F3、F5 共用一组负例，让源文、模型、视觉结论三种保证各自的强弱在代码和 UI 里可见。
2. **让交付包可信**：F1 字号 gate、真实 PowerPoint/Keynote 验收、唯一的 current 状态矩阵（F4）。
3. **让普通作者能走完主路线**：30 分钟实测、F6 重连保留草稿、F7 清理、历史容量提示。

逐项核对后，有三处与报告的表述略有出入，已在对应小节注明：F4 表中的 README "all four" 在当前树中没有找到；`notImplemented` 里的 "editable native v3 charts" 与 README 的冲突，真实情况是支持的图表类型为原生、其余为 L3 图片，两边都要改；S9a 已建"可复用 profile"，roadmap 的 open gate 确实滞后。

## 2. 逐项方案：F1–F7

每项含：根因、改什么、测试、验收、不做什么。文件路径以仓库根为准。

### F1（高）PPTX 通过全部包检查但字号低于可读下限

**根因。** `src/targets/pptx/ooxml.mjs` 的 `sceneFrame` 用一个统一比例把整个测量页面装进 13.333 × 7.5 in 的画幅。高页面（S9b blueprint 约 1174 px 高）被整体缩到约 0.4 倍，数字 1–4 变为 5.18 pt，解释正文 7.48 pt。`src/targets/pptx/audit.mjs` 只在最小字号 < 7 pt 时往 `editability.notes` 写一句提醒，四个结果仍是 pass。

**改什么。**

1. 新增第五个结果 `typography`，与 `package`、`editability`、`sceneCheck`、`accessibility` 并列，状态 pass/fail。按角色分级阈值，角色来自编译后元素所属的 block 类型（标题、正文、来源/脚注/图注、图表刻度），不是从字号猜：

   | 角色 | 默认下限（pt） |
   |---|---|
   | 标题 | 20 |
   | 正文、列表、解释 | 12 |
   | 来源、脚注、图注、图表刻度 | 9 |

   阈值放在 `src/targets/capabilities.mjs` 的常量表里并写入导出报告，便于用户审阅；不提供"调低阈值"的开关。
2. 失败信息指名 `sceneId`、角色、实际 pt 和需要的 pt，并给出两条可选出路：(a) 拆页：blueprint 页按 Explain / Diagram / Explore 三个阶段各出一页，其他高页面按 section 边界拆；(b) 作者显式接受，写入导出报告 `typography.acceptedBy: 'author'` 和时间，Studio 里显示黄色而不是绿色。两条路都保留原文和层级，不缩字也不删字。
3. 拆页作为 `src/targets/pptx` 编译阶段的一个选项（`paginate: 'stages' | 'sections' | 'none'`），由 Studio 导出对话框和 `export:targets` 的 `--paginate` 暴露；默认 `stages`，对没有阶段/section 的页面退回单页。
4. 导出报告保留两个环境的数字：历史的 5.5 pt 与本次 5.18 pt 并列，注明浏览器与字体环境。

**测试。** 新增 `tests/pptx-typography.test.mjs`：用 `tests/blueprint-a.mjs` 的 en + `silver-gray-editorial` 项目导出，断言 `typography.status === 'fail'`、失败项包含第二页的 sceneId 与正文角色；同一项目用 `paginate: 'stages'` 导出后断言 pass 且页数为 3、原文逐行仍在；一个普通 16:9 页面断言 pass。`tests/inspect_v3_pptx.py` 增加逐 run 的 `sz` 直方图输出。

**验收。** `npm run verify` 通过；`export:targets` 对现有 18 个 deck 的报告里 `typography` 列出哪些 deck 失败与原因；用户在 PowerPoint 和 Keynote 中打开冻结的中英 12 页包（见 §3.2），逐页记录字号与可编辑性。只有最后一步完成，ExportVerified 才能从 "not reached" 变为达成。

**不做什么。** 不把高页面整体栅格化；不自动缩小正文到阈值以内；不因为阈值改动而调整渲染器版本（`visual-art-direction.12` 不变）。

### F2（中）required model/effort 在 visual/code 路径未核对

**根因。** `src/orchestration/grants.mjs` 的 `modelBlock` 只检查宿主**能否**选择所需模型；真正的"宿主报告与要求一致"检查只写在 `src/services/agent-bridge.mjs` 的 `complete()` 内部，`visualTool()`、`completePatch()`、`checkpoint()` 没有。

**改什么。**

1. 在 `grants.mjs` 新增 `assertModelPolicy(grant, host)`，合并现有 `modelBlock` 与 `complete()` 内的匹配判断：effort 超上限 → 拒绝；`required` 且宿主不能选 → 拒绝；`required` 且宿主报告的 `model`/`effort` 与策略不等 → 拒绝。统一错误码 `AGENT_MODEL`、HTTP 422。
2. 四条路径（`complete`、`completePatch`、`visualTool`、`checkpoint`）都调用它，并在通过时把 `j.model.reported = {model, effort}` 记录下来，保留 `apiConfirmed: null`。
3. `docs/en/agent-bridge.md:18` 与中文页改为："required 模式在所有完成与工具调用路径核对宿主报告的 model/effort；宿主报告不是服务端证明。"

**测试。** `tests/agent-bridge.test.mjs` 新增一组 "capable but wrong selected model" 用例：worker 能力声明含 `gpt-6-astra/medium`，当前 `model = 'other-model'`，`required = true`，分别走四条路径，全部期待 `AGENT_MODEL`；再用正确模型跑一遍期待通过，并断言 `model.reported` 已写入。

**验收。** 四条路径同一负例同一结果；源码字节在 code 路径测试前后不变。

### F3（中）sourceText 的"逐行 verbatim"保证不成立

**根因。** `src/hosts/tasks.mjs` 的 `draftWithHost` 把每个源行和整段输出都做 `\s+ → ' '` 归一化后用 `includes` 检查。重复次数、行边界、顺序、空白、是否新增句子都不在检查范围内。

**改什么。** 分两步，第一步先把承诺写准，第二步把保证做强。

1. **立即（文案与元数据）**：`docs/en/hosts.md:18`、中文页、`skills/deck/SKILL.md` 相关句改为"每个非空源行的归一化文本必须出现在输出中；不保证空白、顺序、出现次数或没有新增内容"。`task.sourceInput.coverage` 的值同步改成这句话。
2. **结构化覆盖（代码）**：把 `schemas/host-response.schema.json` 的 `outline` 从一段文本改为页数组，每页是 `heading` 加 `lines[]`，每行 `{text, sourceLine: <源行序号 | null>}`。本地检查：
   - 每个源行序号恰好出现 `n` 次（`n` 为源文中的出现次数），顺序单调；
   - 带序号的行的 `text` 与源行 trim 后**逐字节相等**（只允许去掉首尾空白）；
   - `sourceLine: null` 的行标为 `hostAuthored`，计数写入 `task.hostDraft.hostAuthoredLines`，Studio 大纲里用标记显示"宿主新增，未经核实"，导出报告也列出数量；
   - 任何一条失败返回现有的 `HOST_CONTENT_COVERAGE`，并在 `application.json` 里写明失败的源行序号。
   旧的纯文本 outline 不再接受；fake host 与示例随之更新。

**测试。** `tests/host-adapters.test.mjs` 新增负例：重复句只出现一次、`A   B` 被改为 `A B`（trim 以外的空白）、两行顺序互换、源行作为更长句子的子串出现、新增 "Additional invented result: 999 units."（应通过但 `hostAuthoredLines === 1`）。

**验收。** 报告 §4 F3 的 mock 复现脚本在新检查下返回 `HOST_CONTENT_COVERAGE`；新增句能通过但被标记。

**不做什么。** 不尝试判定新增句子的真伪，那是作者复核；不自动删除宿主新增内容。

### F4（中）当前状态入口与历史记录冲突

**根因。** `PROJECT_STATUS.json`、`README.md`、`docs/en/handoff.md`、`roadmap.json` 各自手写"当前"，历史段落被保留在当前入口里，没有任何检查比较它们。

**改什么。**

1. 新增 `scripts/status-summary.mjs`，生成 `docs/current-status.json`，只含机器可得的字段：commit、`package.json` 版本、`PLAYER_VERSION` 与渲染器版本、最近一次 `verify` 的 total/pass/fail/skip（从 `docs/evidence/**/verify.log` 或指定日志解析）、浏览器版本、`roadmap.json` 的 open gates 列表。`npm run check` 调用它并与 `PROJECT_STATUS.json` 的同名字段比较，不一致即失败。
2. `PROJECT_STATUS.json` 增加 `history[]`，每条带 `commit`、`date`、`supersededBy`；顶层 `current` 只保留当前。历史证据文件不删。
3. 本次已确认要改的具体字段：

   | 文件 | 现状 | 改为 |
   |---|---|---|
   | `PROJECT_STATUS.json` `automatedTests` | 338 / 0 / 0，commit `5427aa9` | 475 / 471 / 0 / 4，commit `b86ec18`，旧值入 `history` |
   | `PROJECT_STATUS.json` `notImplemented` | "editable native v3 charts (semantic web charts exist)" | "editable native v3 charts for chart kinds outside the native set (those fall back to an L3 picture)"；README 同句补"受支持的图表类型" |
   | `docs/en/handoff.md:74` 起 | "VIS-014 is the next planned implementation…Prepare VIS-014's six additional composition families" | 删除或移入历史段，顶部已记录 S6 以后的状态 |
   | `docs/en/handoff.md:65` | `semantic-player.4` | `semantic-player.6` |
   | `roadmap.json` `openAcceptanceGates` | "reusable-profile promotion from author feedback not built" | 改为 S9a 已建 profile 保存/应用；保留 PowerPoint/Keynote 未运行 |
   | `docs/en/agent-bridge.md:12` | "worker limit is one" | "最多两个 worker 连接（`workerLimit: 2`），每个 worker 同时只持一个租约" |
   | README "verify 的四个阶段" | 报告称 README 写 "all four"；当前树的 `README.md` 与 `docs/zh-CN` 均未搜到此句 | 不改；若报告指的是其他文件，改为五阶段（types、test、check、build、demo） |

**测试。** `npm run check` 的新比较；`tests/handoff-contracts.test.mjs` 增加一条：`handoff.md` 中出现的 `semantic-player.N` 必须等于 `PLAYER_VERSION`。

**验收。** 同一棵树上任何两个"当前"入口不再给出不同的测试数、版本或能力结论。

### F5（中）review pass 只证明声明与元数据一致，缺视觉理解的独立验收

**根因。** `reviewWithHost` 校验的是文件名、sha256、每图非空 finding、sceneId/nodeId 合法。sha256 本身写在 prompt 里；`tests/host-adapters.test.mjs:126` 的 fakeHost 不读像素也能通过。

**改什么。** 现有 hash 检查保留（防陈旧与替换），新增"像素盲对照"作为可选但可记录的验收等级：

1. 新增 `src/quality/pixel-control.mjs`：在每张待审截图上随机位置叠加一个小标记（随机 3 位数字与一个色块），位置与内容只存在本地 `control.json`，不进入 prompt、文件名、alt 或 scene JSON；hash 用叠加后的图计算。
2. review schema 新增可选 `controls[]`：`{file, text, bounds}`。本地比对：文字全对且 bounds 与真实位置交叠 → 该图 `visionEvidence: 'pixel-control-hit'`；否则 `'miss'`。
3. 评估脚本 `scripts/pixel-control-eval.mjs --live`：三组对照（完整图、同尺寸空白图只保留元数据、随机调换图片），预先登记通过标准（例如命中率 ≥ 90%，空白组命中率接近 0），输出 `reviewedBy`、输入 hash、命中率、错位/裁切定位准确率。需要真实宿主，只在用户授权时运行。
4. `review.attestation` 字段三选一：`author`、`host-metadata-only`、`host-pixel-control`；Studio 与导出报告显示该等级。
5. 把 `tests/host-adapters.test.mjs` 的 fakeHost 换成会解码 PNG 读取标记的实现，证明本地链路在无真实宿主时也能区分"读了像素"与"只回声元数据"。

**验收。** 离线：fake host 不读像素时 `attestation` 只能是 `host-metadata-only`。在线：一次授权运行的 `control.json`、结果 JSON 与 CLI 版本/模型/日期一并存入 `docs/evidence/`。

**不做什么。** 不宣称能防住所有视觉误判；不重写历史证据的结论，只给新证据加等级。

### F6（低）重启后 token 失效，缺"保留草稿重连"

**根因。** `public/app.js` 与 `public/studio/visual.js` 在 401 时只提示 Reload；内存中的草稿随刷新丢失，恢复手段只有导出 Project JSON。

**改什么。**

1. 两个客户端共用一个 `reconnect()`：401 时弹出对话框"服务已重启。重新连接并保留当前改动？"，确认后重新 GET `/api/session` 取新 token，草稿留在内存。
2. 之后的保存走现有 revision 流程：若服务端 revision 已前进得到 409，进入现有"另存为副本"对话，不覆盖。
3. 文档：`docs/en/agent-bridge.md` 与 manual 中"Reload the Studio; preserve unsaved work"改为描述新路径。

**测试。** 新增浏览器 runner `tests/browser_session_reconnect.mjs`：打开项目、修改一页、重启服务、点击重连、保存，读取 `/api/projects/:id` 断言改动已持久化；再做一次 409 分支。

**验收。** 运行器在隔离 Chromium 通过；`verify` 不受影响（runner 仍是浏览器门控）。

### F7（低）异常清理与 QA 子进程的保证比 runtime 窄

**根因。** `src/workbench/cdp.mjs` 发 SIGKILL 后不等退出；`tests/browser_harness.py` 的 `browser.close()` 在 `yield` 之后而不在 `finally` 里，`process.wait(timeout=10)` 超时没有升级 kill；`src/qa/hosts.mjs` 的 `commandProbe` 只杀直接子进程。

**改什么。**

1. `cdp.mjs`：SIGKILL 后再等一次有界 exit（1 秒），临时 profile 只删本次 `mkdtemp` 创建的目录（已是如此，补注释与测试）。
2. `browser_harness.py`：`try/finally` 包住 `yield`，finally 里依次 `browser.close()`、`process.terminate()`、`wait(10)`、超时则 `kill()` 再 `wait()`。
3. `commandProbe` 改用 `src/hosts/process.mjs` 的有界进程工具（POSIX `detached` + 进程组 kill，TERM → 500 ms → KILL），QA 与 runtime 共享同一份实现。
4. Windows：保持"仅直接子进程"的实现，但在 CI 的 `windows-latest` 作业上加一个"子进程再生孙进程，取消后孙进程是否存活"的测试，把"未验证"变成实测结果，无论结果如何都记录。

**测试。** `tests/hosts.test.mjs` 新增 POSIX 孙进程取消用例；`tests/browser_harness.py` 新增 context 体内抛错的用例，断言无残留 Chromium 进程与 profile 目录；新增 `tests/process-tree.test.mjs`，三平台都跑。

**验收。** 三平台 CI 通过，Windows 的实际行为写入 `docs/en/hosts.md`。不承诺 OS 强杀父进程时也能执行 finally。

## 3. 三件最值得做的事如何落地

### 3.1 统一"接受结果"契约（对应 F2、F3、F5）

一个分支，一次完成：

- 一组共享的负例 fixture（`tests/fixtures/acceptance/`）：错模型、重复源行、改空白、重排、嵌入子串、宿主新增句、仅元数据的 review；
- 一张 UI 表，三种保证各一行：源文覆盖（结构化逐字节）、模型（宿主报告，非服务端证明）、视觉（attestation 等级），在 Studio 的 review 面板和导出报告中显示；
- 文案与元数据同步（§4）。

优先级高于任何新布局、媒体 provider 和 P3 动效。

### 3.2 冻结一个交付包，完成真实目标应用验收，建立唯一 current 矩阵（对应 F1、F4）

1. 从现有素材固定一套中英各 12 页的 deck：含一个 tall blueprint 页、一个原生图表、一个缺失值、中文搜索/复制页、链接来源、alt 文本。文件与 hash 写入 `docs/evidence/export-verified/manifest.json`。
2. 先在本地过 F1 的 `typography` gate 与现有四项检查。
3. 用户在本机 PowerPoint 和 Keynote 中打开（本机 `/Applications` 有两者，但按仓库规则，agent 不打开安装的应用，由用户执行并按清单记录）：逐页截图、最弱页放大、编辑一处文字并另存、重新打开、记录应用版本、字体映射、最小字号。清单模板放在 `docs/en/host-acceptance.md` 的新节。
4. CJK PDF：用独立提取器（`tests/inspect_pdf.py` 扩展为按 Unicode 码点比对）加查看器实际检索/复制记录；图表包装补 alt。
5. 上述全部完成后，`status-summary.mjs` 生成的 current 矩阵才把 ExportVerified 标为达成。

这优先于 handoff 中重复出现的 VIS-014 构建，也不被 Claude 登录（仍 deferred）挤后。

### 3.3 一次普通作者 30 分钟实测，收短主路线（对应 D 节、F6）

1. 实测协议写入 `docs/en/author-trial.md`：一台没有 Node 的机器、一位非开发者、给定 12 页短文本和数字表，从安装到导出 PowerPoint 计时；记录每个卡点、失败、作者复核耗时。不提前演示。
2. 根据结果重排 `docs/en/start.md`：第一屏只有一条主路线（安装 → 启动 → 粘贴 → 选版式 → 复核 → 导出），classic 与 v3 的选择放在一句话判断里；隔离浏览器设置、七工具 JSON、回执、代码提案移到"高级"页。
3. F6 的重连与 §5 的历史容量提示一并进入这一波。

## 4. 被高估的表述：逐条改法

| 文件与位置 | 现文 | 改为 |
|---|---|---|
| `docs/en/hosts.md:18`、`skills/deck/SKILL.md` | "Each nonempty source line must survive verbatim" | 第一步按 F3 步骤 1 改写；结构化覆盖上线后改为"带序号的源行逐字节保留，新增行单独标记" |
| `docs/en/agent-bridge.md:18` | "Required mode also checks the returned host report." | "Required mode checks the host-reported model/effort on every completion and tool route; that report is not server attestation." |
| `docs/en/handoff.md:84` 等 "actual image review" | 含义不明 | "需要当前截图与明确的 review attestation 等级；hash 与 schema 不独立证明视觉理解" |
| 各 evidence 的 "0 external requests" | 泛化为无联网 | "在已接入的页面/测试 context 的网络事件范围内未观察到外部资源请求；未监测浏览器后台、独立 worker target 与宿主 CLI 的网络" |
| `docs/en/manual.md:110` "The studio itself makes no external calls" | 基本准确 | 补一句："选用 AI 宿主后，宿主及其 hooks/config 可以联网，Studio 的页面事件不监测它" |
| PowerPoint editability / page check "pass" | 读作可投影 | 导出报告每项结果旁固定一句范围说明："包检查通过，不保证字体、投影字号、PowerPoint/Keynote 打开与另存" |
| "hash-only receipts" | 字面不准 | "回执保存 hash、状态与受限元数据（含文件 basename 与宿主报告的模型），不保存原始 prompt/stdout/stderr" |
| 指向旧 publication 的 "all source/current verification" | 旧 commit | 由 `status-summary.mjs` 生成，历史证据注明适用 commit 与环境 |
| `docs/en/media-workers.md:9` 起 | "图片生成自动、安全清权、取消能停止宿主" | "图片任务是复制任务加导入 PNG；rights 是作者声明；重复请求复用字节不是重新授权；本地取消只拒绝迟到结果，不停止宿主进程" |
| VIS-010 与 S6 评分文档 | 读作人类评分 | 标题与首段注明"agent 图像审阅，单一评审者，非盲测人类评分" |
| `tests/browser_interaction_visual_parity.mjs:15` 注释与 evidence | 阈值读作统计校准 | 注明阈值来源于先前观察到的差异，不是跨平台统计校准 |
| `src/hosts/capabilities.mjs` doctor 输出 | 可能被读作实测 | 保持 advertised/unknown 标签，并在 `doctor` 输出首行说明"来自 help 文本与权限模式匹配，不是执行证明" |
| `/api/session` 相关文档 | "只向同源页面返回 token" | "无 Origin 的本地 HTTP 客户端也能取得 token；跨站浏览器读取由 SOP/CORP/无 CORS/Fetch Metadata 阻止，这不是本地进程身份认证" |

中文页逐句同步。

## 5. 边界加固（报告列为建议，不是漏洞）

| 项 | 改什么 | 测试 |
|---|---|---|
| Figma/AE importer 的 PNG 校验弱于 core registry | 把 `src/assets/registry.mjs` 的 PNG 检查（魔数、IHDR 尺寸、CRC、大小上限）抽成无依赖的 `src/assets/png.mjs`，构建时内联进 `integrations/figma/code.js` 与 `integrations/after-effects/DeckWeft-Import.jsx` | 畸形 PNG/JSON fixtures 在 Node 侧跑；真实 Figma/AE 行为仍标"未验证"，需要用户在目标应用中跑一次 |
| QA 脱敏漏形状 | `src/qa/hosts.mjs` `sanitizeOutput` 增加 JWT（`eyJ…`）、AWS `AKIA…`、`api[_-]?key=`、`password=`、`token=` 形状，`roots` 永远包含 `os.homedir()` 与 `~`；文案保持"尽力而为，不是保证" | 合成字符串测试，报告中的几种形状全部被替换 |
| 历史无限增长 | `history` API 返回条数与字节数；Studio 在超过阈值（默认 500 条或 200 MB）时显示提示，提供"导出历史为 zip 并清空"的显式操作，不自动删除 | 存储测试：阈值提示出现；导出后原文件仍在 zip 中 |
| 同源 measurement 信任 | `validateFit` 增加下界：非空行宽度 ≥ 可见 grapheme 数 × fontSize × 0.05；文档保留"同源客户端被信任" | 0.001 的假宽度被拒；真实测量值通过 |
| CDP 网络观测只覆盖页面 target | `withIsolatedBrowser` 开启 `Target.setAutoAttach({flatten:true})`，对附着的 worker/OOPIF 也收集 `Network.requestWillBeSent`；文案仍按 §4 写 | 一个带 Web Worker 发请求的 fixture 被记录 |
| Codex "不调用工具" 只是 prompt | `docs/en/hosts.md` 明确：Codex 为 read-only sandbox 加 prompt 指令，不等于 Claude 的空工具集；宿主的 hooks/network 不被撤销 | 文档检查 |
| bridge 分享确认 | 分享确认旁加一句："宿主仍保留自己的文件、连接器与网络权限；本地授权不能撤销它们" | 浏览器 runner 断言文案存在 |
| 安全审查覆盖范围 | `SECURITY.md` 增加"已审查入口与支持模块"清单，并注明生成/vendor 代码与历史证据不在逐行审计内；不做 1538 文件逐行审计 | 文档检查 |

## 6. 需要用户决定的事项

| 决定 | 影响 | 建议 |
|---|---|---|
| F1 阈值 | 决定多少现有 deck 的导出会变红 | 第三轮已按实测校准为标题 18 / 正文 10 / 注释 6 pt（见 §9）；20/12/9 会把所有正常 16:9 页面判红。仍可改，但改动要带 18 个 deck 的清单 |
| 是否在 `devDependencies` 加一个 JSON Schema 校验器做差分测试 | 违背零依赖的字面，但只在开发 QA | 暂不加；先用现有 negative fixtures，若 schema 子集出现 bug 再议 |
| 是否授权一次真实宿主运行用于 F5 像素盲对照 | 消耗额度，需要 Codex CLI 登录态 | 授权一次，记录 CLI 版本、模型、日期、hash；Claude 登录仍 deferred |
| 由谁打开 PowerPoint/Keynote | agent 不打开安装的应用 | 用户按 §3.2 清单执行并提交截图与版本 |
| 30 分钟实测的参与者与机器 | 需要一位非开发者和一台干净机器 | 用户指定；之前不改 `start.md` |
| medium/high 48 次配对实验是否做 | 费用未知，需授权 | 推迟到 §3.1、§3.2 完成之后 |

## 7. 实施顺序与分支

| 波次 | 内容 | 分支（建议） | 完成证据 |
|---|---|---|---|
| W1 | F2、F3、F5 离线部分、§4 文案、§5 的脱敏与 measurement 下界 | `claude/acceptance-contract` | `npm run verify`；新负例清单；文案 diff |
| W2 | F1 gate 与拆页、F4 状态生成与字段修正、§3.2 冻结包与清单 | `claude/export-verified` | 18 个 deck 的 typography 报告；用户的 PowerPoint/Keynote 记录；`docs/current-status.json` |
| W3 | F6、F7、历史容量、CDP 自动附着、§3.3 实测与 `start.md` 重排 | `claude/author-main-path` | 新浏览器 runner；三平台 CI 含 Windows 进程树结果；实测记录 |
| 另行授权 | F5 在线对照、Figma/AE 真实导入、medium/high 配对实验 | 按授权单独开 | 各自的 evidence 目录 |

规则不变：每个波次独立 `npm run verify`；嵌入式 runtime 若改动则单独提交 `PLAYER_VERSION` 与基线重录；不推送、不发布、不加运行时依赖；完成时列出跑过的测试、看过的图和没打开的应用。

## 8. 报告 §7 未决问题的关闭条件（摘要）

| 未决问题 | 本方案中的对应 | 仍需外部条件 |
|---|---|---|
| Claude 真实 schema/图片投递、Codex 视觉理解 | F5 在线对照 | 用户授权一次真实运行 |
| Codex 桌面 / Dot 连接 | 不在本方案 | 真正的桌面激活环境 |
| 当前 v3 PowerPoint/Keynote 保真与可编辑性 | §3.2 | 用户打开应用 |
| Figma/AE 恶意 handoff 与取消回滚 | §5 第一行 | 用户在目标应用中跑 fixtures |
| Windows EPERM 长占用、大小写别名、子孙进程 | F7 的 Windows CI 测试 | CI 只覆盖进程树；EPERM 与别名要 Windows 实机 |
| 全部进程无外部通信 | §5 CDP 自动附着 + §4 文案 | 按进程的 OS 网络观测仍不在范围 |
| CJK PDF 搜索/复制、PDF/UA、屏幕阅读器 | §3.2 第 4 步 | 屏幕阅读器需人工 |
| 跨字体/浏览器/IME/200% zoom/投影 | 不在本方案 | 环境矩阵与真实操作 |
| medium/high 稳健差异 | §6 最后一行 | 授权与费用 |
| 历史"实际看图"逐条外部核验 | F5 的 attestation 等级只对新证据生效 | 历史证据不追溯重判 |

## 9. 实施记录

### 2026-10-19 第一轮（19 分钟时限，本地未提交）

做了什么（`npm run verify`：479 项测试，475 通过，0 失败，4 环境门控跳过；源码检查 1539 文件）：

- **F2**：`grants.mjs` 新增 `assertModelPolicy`，`agent-bridge.mjs` 的 `complete`、`completePatch`、`visualTool`、`checkpoint` 共用 `acceptModel`，通过时记录 `model.reported`。新测试：能选 Astra 但当前报告 `other-model` 的 worker 在四条路径都得到 `AGENT_MODEL`。
- **F1（gate 部分）**：`capabilities.mjs` 新增 `TYPOGRAPHY_MINIMUM_PT`（标题 20 / 正文 12 / 注释 9 pt）；`audit.mjs` 新增 `typographyCheck` 与 `textRole`，导出报告与 Markdown 多出第五个结果 `typography`。用缓存的隔离 Chrome for Testing 149 导出 en + silver-gray-editorial blueprint：editability、sceneCheck、accessibility 仍 pass，`typography` **fail，14 处**，最小 5.18 pt（与报告一致）。拆页选项、Studio 显示和作者显式接受尚未做。
- **§5 加固**：`sanitizeOutput` 增加 JWT、AWS、`api_key=`/`password:`/`token=` 形状、home 目录与 `~/`；`validateFit` 对可见文字加宽度下界（grapheme 数 × 字号 × 0.05），0.001 px 的假宽度被拒。各有测试。
- **F7（部分）**：`cdp.mjs` SIGKILL 后再等一次有界退出；`browser_harness.py` 用 `try/finally` 包住 `yield`，服务进程 TERM → 10 s → KILL。浏览器门控的 `studio-export` 4/4 在隔离 Chromium 通过。`commandProbe` 的进程组 kill 与 Windows 进程树测试未做。
- **F3 第一步与 §4 文案**：`hosts.md`（中英）、`skills/deck/SKILL.md`、`tasks.mjs` 的 coverage 字串改为"归一化出现，不保证空白/顺序/次数/无新增"；`agent-bridge.md`（中英）改 worker 上限与 required 模式说明；`architecture.md`（中英）改 session 端点说明；`manual.md` 补宿主联网一句；`compatibility.md`（中英）改为五项结果。
- **F4 快速字段**：`PROJECT_STATUS.json` 的 `automatedTests` 改为 475/471/0/4 并带 commit，旧值移入 `historicalPublicationAutomatedTests` 并互相标注 supersedes；`notImplemented` 图表一句改准；`roadmap.json` VIS-015 gate 改为"profile 已建，自动晋升未建"；中英 handoff 的 `semantic-player.4` 改 `.6`，旧"继续"段落加历史标注。`status-summary.mjs` 生成脚本未做。

未做：F3 结构化覆盖、F5、F6、F1 拆页与 UI、历史容量提示、CDP 自动附着、Windows 进程树测试、英文版本文。

### 2026-10-19 第二轮（9 分钟，本地未提交）

- **F7**：`src/qa/hosts.mjs` 的 `commandProbe` 改为 POSIX 进程组 kill（与 `src/hosts/process.mjs` 同一规则），新测试证明超时后孙进程也被停止；Windows 仍只停直接子进程，测试在 Windows 跳过并记录为未验证。
- **F1**：`scripts/export-targets.mjs` 摘要行增加 `typography` 与失败数。
- **§4**：`tests/browser_interaction_visual_parity.mjs` 阈值注释说明来源；`docs/evidence/vis-010/review.md` 与 `docs/visual-acceptance/review.md` 标注为 agent 图像审阅而非盲测人类评分。
- `npm run verify`：480 项测试，476 通过，0 失败，4 跳过。
- 交接文档：[astra-second-verification-handover.zh-CN.md](astra-second-verification-handover.zh-CN.md)。

### 2026-10-19 第三轮：F3 结构化覆盖与 F1 拆页（本地未提交）

- **F3**：`schemas/host-response.schema.json` 的 `outline` 改为 `pages[].lines[]{text, sourceLine}`（0 = 宿主新增）；`src/hosts/tasks.mjs` 新增 `sourceLines`、`checkSourceCoverage`、`outlineText`，prompt 把编号源行作为 `sourceLines` 发给宿主；检查：每个编号恰好一次、顺序单调、trim 后逐字节相等、越界编号拒绝；失败返回 `HOST_CONTENT_COVERAGE` 并在返回值与 `application.json` 里给出 `coverage{missing,duplicated,mismatched,outOfOrder,invalid}`；通过时 `task.hostDraft.hostAuthoredLines/hostAuthored[]` 记录新增行，`sourceInput.coverage` 改为新保证。`tests/host-adapters.test.mjs` 新增 `pages()` 辅助与"F3: …"负例（重复、空白、重排、嵌入子串、错误归属、越界、新增句计数、无源文）。中英 `hosts.md` 与 `skills/deck/SKILL.md` 同步。Studio 大纲里的"宿主新增"标记与导出报告显示未做。
- **F1 阈值校准**：用隔离 Chromium 对 demo、chart-kinds、两份 blueprint 实测后，`TYPOGRAPHY_MINIMUM_PT` 从 20/12/9 改为 **18/10/6**（28 px 标题、16 px 正文在等宽放入时的 pt 值，以及编译器原有的 6 pt 原生图表标签下限）；20/12/9 会把所有正常 16:9 页面判红。§6 第一行的决定据此改为"采纳 18/10/6"。
- **F1 拆页**：新文件 `src/targets/pptx/paginate.mjs`（`sceneElements`、`sceneBands`、`bandLayout`）；`compilePPTX` 新增 `paginate: 'auto' | 'none'`，每段按整场景同一路径编译，续页在预留条带里重复标题 `(k/n)`，场景级回执只记一次；`auditPPTX` 按 `compiled.slides[].sceneId` 把多张幻灯片归到同一场景（标题、备注逐张检查，区块、文本覆盖、阅读顺序按场景合并）；`exportDeck`→`exportPresentation`→`runExport`→`compilePPTX`、`studioTargetExport`、Studio API（`data.paginate`）全链路透传；报告新增 `pagination`，`typography.pagination` 同步。
- **证据**：离线 `tests/export-targets.test.mjs` 的 "F1: …" 用 release gallery 真实高页 `ev-evidence`（1292 px）：`none` 时字号失败，`auto` 时切成两张、五项结果通过、同输入同字节、场景级回执不重复；旧 VIS-016 断言由 12 张改为 13 张并说明原因。隔离 Chromium 实测 S9b blueprint（en/zh，silver-gray-editorial）：`none` 3 张、字号失败 6 处、最小 5.18/5.06 pt；`auto` 4 张、`pagination=[{pipeline,2}]`、五项全部 pass、最小 7.17 pt；切点在回答与图解之间。`tests/studio-export.test.mjs` 在隔离 Chromium 4/4。
- **未做**：Studio 导出对话框的 paginate 选项与黄色状态、作者显式接受 `typography.acceptedBy`、`export:targets` 的 `--paginate` 开关、续页上的页码 chrome、18 个 deck 的失败清单、PowerPoint/Keynote 打开。

### 2026-10-19 第四轮：F5 离线部分（本地未提交）

- **新文件 `src/quality/pixel-control.mjs`**：无依赖的 8 位 RGB/RGBA 非交错 PNG 编解码（滤波 0–4 还原、CRC 校验、不支持的格式按名拒绝）；`placePixelControl` 在截图副本上随机位置（距边 ≥ 8 px）放一个洋红（255,43,214）色块加三位黑色数字（3×5 点阵，按图片尺寸缩放）；`detectPixelControl` 只凭像素找回色块与数字；`controlOverlap` 计算上报框与真实框的重叠。
- **`reviewWithHost`（`src/hosts/tasks.mjs`）**：`pixelControl: true` 时，宿主收到 `.deckweft-pixel-control/<id>/` 下的打标副本，副本哈希进入提示元数据，标记内容与位置只写入该目录的 `control.json`；原图哈希检查、回执、`review.images` 仍指向原图。schema 在开启时才把 `$defs.reviewControls`（`file`、三位 `text`、`bounds`）绑定为必填，关闭时不发送该字段。结果 `review.controls = {summary:{hits,total}, images:[{file, sentFile, hit, expected, reported}]}`；`review.attestation` 为 `host-pixel-control`（全部读回）或 `host-metadata-only`。
- **`recordVisualReview`（`src/quality/visual-review.mjs`）**：新增 `attestation`（默认 `author`，枚举 `REVIEW_ATTESTATIONS`）与 `controls`；声称 `host-pixel-control` 而没有全命中的控制记录会被拒绝。
- **CLI**：`deckweft visual-task … --host codex --live --pixel-control`；`scripts/host-visual-acceptance.mjs --pixel-control`。中英 `hosts.md` 第 5 步说明三种 attestation。
- **测试 `tests/pixel-control.test.mjs`**：编解码往返与拒绝；放置/识别在六个随机位置一致、改动像素全部落在标记框内、未打标图片无标记；三种 fake host（读像素 → `host-pixel-control` 2/2；只回声元数据 → `host-metadata-only` 0/2；读错数字 → 0/2）；关闭时 schema 不含 `controls`；原图哈希不变、原图被改仍 `HASH_MISMATCH`；`recordVisualReview` 保留 attestation、作者评审为 `author`、伪造 `host-pixel-control` 被拒。fake host 还断言提示元数据只含文件名与哈希，数字与位置不在提示里。
- **证据**：`npm test` 485 / 481 / 0 / 4；`tests/browser_visual_task.mjs` 在隔离 Chrome for Testing 149 加 Playwright 1.61.1 下退出码 0；亲眼看过一张打标样图（`subject.png` 上的 620 号标记，位置、颜色、数字可读）。没有调用真实宿主，没有登录，没有打开 /Applications 里的应用。
- **未做**：在线三组对照脚本（完整图 / 仅元数据空白图 / 随机调换）与通过标准登记（需用户授权真实宿主）；Studio 与导出报告显示 attestation；对 Claude 路径（base64 图片块）的 fake 读像素测试只覆盖了 Codex 形状的 fake host；标记可能被宿主当作版面缺陷报告，提示里已说明但未实测。

### 2026-10-19 第五轮：F6 重连并保留草稿（本地未提交）

- **新文件 `public/session.js`**（两个 Studio 共用，`src/services/server.mjs` 以 `/session.js` 提供）：`ask()` 生成并移除一个原生 `<dialog>`；`sessionRecovery({t,setToken})` 返回 `reconnect()`，同时失败的请求共用一个提示，确认后 GET `/api/session` 取新令牌，不刷新页面；选“暂不”时以 `AUTH_REQUIRED` 拒绝，之后的后台请求（预览、测量）不再弹窗，直到用户再次点保存（`reconnect.offerAgain()`）；`askSaveCopy()` 是 409 后的“另存为独立副本 / 继续编辑”对话框。
- **`public/app.js` 与 `public/studio/visual.js`**：`api()` 收到 401 时调用 `reconnect()` 并重试一次（服务端在路由前就检查令牌，所以 401 的请求没有被处理，重试不会重复写入）；保存仍带 `expectedRevision`。`REVISION_CONFLICT` 时先问是否另存为副本：经典版走现有的 `/api/import` + `POST /api/projects`，视觉版走现有的 `/api/visual/import`；副本在当前窗口打开并回到原来的页面，较新版本不动。选“继续编辑”时保持原来的提示（经典版 issue banner，视觉版服务端消息）。
- **新浏览器 runner `tests/browser_session_reconnect.mjs`**（先写，改客户端前运行，按预期在“等待 `#sessionDialog`”处失败）：经典版与视觉版各做两段——(1) 改一页 → 重启服务（同端口、新令牌）→ 保存 → 先选“暂不”，断言草稿仍在、服务端没有写入 → 再保存并重连，断言改动已持久化、页面没有刷新；(2) 再改一页 → 重启 → 另一写入方先保存使 revision 前进 → 保存并重连 → 断言出现冲突对话框、草稿仍在 → 另存为副本，断言原文稿停在另一写入方的 revision 且不含草稿、恰好多出一个含草稿的副本、页面没有刷新。同时断言 0 页面错误、0 外部请求。
- **既有 runner 的调整**：`tests/browser_visual_studio.mjs` 的第二窗口 409 步骤与 `tests/browser_acceptance.py` 的同类步骤，在保存后先点冲突对话框的“继续编辑”，再断言原有提示与草稿保留。检查意图不变。
- **文档**：`docs/en/agent-bridge.md`、`docs/zh-CN/agent-bridge.md` 的重启一句改为新路径；`docs/en/manual.md`、`docs/zh-CN/manual.md` 的“保存与恢复”改写 409 段落并新增重启后重连的步骤与预期结果。
- **证据**：`npm run verify` 通过（485 项测试，481 通过，0 失败，4 环境门控跳过；源码检查 1545 文件）。隔离 Chrome for Testing 149.0.7827.55 + Playwright 1.61.1：`tests/browser_session_reconnect.mjs` 6 项检查，连续三次通过；`tests/browser_visual_studio.mjs` 22 项通过；`tests/browser_author_controls.mjs` 通过（1 个控制台错误，即已记录的锁定版式主题变更 409）；`tests/browser_workbench.mjs` 通过；`tests/studio-export.test.mjs` 4/4。亲眼看过 `dist/session-reconnect/classic-reconnect.png`（重连对话框、草稿标题在背景中）与 `visual-conflict.png`（另存为副本对话框、草稿标题在字段中）。
- **未做或未验证**：`tests/browser_acceptance.py` 与 `tests/browser_smoke.py` 没有运行（本机 Python 没有安装 `playwright` 模块），其中 409 步骤的改动未经运行验证；视觉版重启后旧的测量票据被拒绝时，顶部会出现一次“Refresh the measured visual preview.”错误提示，下一次预览后恢复，没有改；视觉版的对话框沿用 `visual.css` 的通用 `dialog` 样式，主按钮没有单独强调色；`docs/en/verification.md` 的浏览器 runner 清单未加入新 runner；英文版方案仍未写。没有调用真实宿主，没有登录，没有推送，没有加依赖，没有打开 /Applications 里的应用。

### 2026-10-19 第六轮：评审后的 F5 修正与中文同步

评审五轮改动时发现两处会削弱 F5 的问题，本轮修正：

- **`control.json` 不再在宿主运行时存在**：Codex 以 read-only sandbox 在任务目录运行，能读取工作区文件，原先在调用宿主前写入的 `control.json` 让宿主不看像素也能"读回"标记。现在期望数字与位置只在内存里，宿主进程结束后才写入（记录 `writtenAfterHost: true`）。`tests/pixel-control.test.mjs` 的读像素 fake host 在运行期间断言该文件不存在，结束后断言内容与结果一致。仍然存在的边界：未打标的原图也在工作区，宿主可以用工具比对两张图找到标记，这同样是读取像素，等级含义不变。
- **工具参数里的评审不再默认 `author`，也不能自报宿主等级**：`REVIEW_ATTESTATIONS` 增加 `unattested` 并作为默认值；`executeVisualTool` 新增只能由代码传入的 `trustedReview` 上下文，`runVisualTask` 的 review 回调与 `deckweft visual-task --tool render.inspect --host` 走这条路；作为 `render.inspect` 参数提交的评审只能写 `author` 或不写，写宿主等级或附带 `controls` 返回 `REVIEW_ATTESTATION`，两条同时给返回 `REVIEW_SOURCE`。Studio 工作台的评审表单本来就写着"作者明确声明"，现在显式发送 `attestation: 'author'`。`tests/visual-task.test.mjs` 覆盖三种拒绝、`author`、`unattested` 与 trusted 路径。
- **文案**：中英 `hosts.md` 说明四种等级、`control.json` 的写入时机与工具路径规则；中英 `task-loop.md` 说明 `attestation: "author"`；中文 `handoff.md` 的"四项结果"补上第五项；中文 `manual.md` 补上宿主联网一句。
- **证据**：`npm run verify` 485 / 481 / 0 / 4，源码检查 1545 文件；隔离 Chrome for Testing 149 下 `tests/browser_workbench.mjs` 与 `tests/browser_visual_task.mjs` 退出 0。
- **未做**：`browser_workbench.mjs` 停在"需要人工看图后提供 --review 文件"，没有走到 Studio 评审表单提交，表单里新增的 `attestation` 未经浏览器运行验证；Studio 与导出报告仍不显示 attestation；`.deckweft-pixel-control/` 目录不会自动清理，也没有加入 `.gitignore`。

### 2026-10-19 第七轮：F4 状态生成脚本（本地未提交）

- **新文件 `scripts/status-summary.mjs`**：`docs/current-status.json` 分两类字段。**实时字段**每次检查都从源码树读（以文本读取，不执行代码）：`package.json` 版本、`PLAYER_VERSION`、`WEB_RENDERER_VERSION`、`roadmap.json` 的 `openAcceptanceGates`。**记录字段**在记录时固定：verify 日志的 total/passed/failed/skipped、记录时的 commit 与 `worktreeClean`、声明的隔离浏览器版本。一个文件无法写进包含它自己的 commit，所以 commit 是这次运行开始时的提交。`parseVerifyLog` 只接受完整的 verify 日志：五个阶段（types、test、check、build、demo）都出现、恰好一份测试汇总、0 失败、计数相加等于总数。
- **用法**：`npm run verify > docs/evidence/<名>/verify.txt 2>&1`，然后 `npm run status:record -- docs/evidence/<名>/verify.txt --browser <版本>`，再把打印出的字段抄进 `PROJECT_STATUS.json`；`npm run status:check` 单独检查。
- **`npm run check`**（`scripts/check.mjs`）调用 `checkStatus`：生成文件与源码树不一致（过期）、与自己的日志不一致、或与 `PROJECT_STATUS.json` 的同名字段（`version`、`playerVersion`、`rendererVersion`、`openAcceptanceGates`、`automatedTests.{command,commit,worktreeClean,log,total,passed,failed,skipped,browserVersion}`）不一致时，逐字段报错。检查本身不调用 git。
- **`PROJECT_STATUS.json`**：新增顶层 `playerVersion`、`rendererVersion`、`openAcceptanceGates` 与 `history[]`（`record`、`commit`、`date`、计数、`log`、`supersededBy`）；b86ec18 的 475/471/0/4 与 5427aa9 的 338 进入 `history`，`historicalPublicationAutomatedTests` 原记录保留；`automatedTests` 改为本轮记录的运行。
- **测试（先写，运行时因模块不存在而失败）**：`tests/status-summary.test.mjs` 五条（日志解析的五种拒绝、实时字段来自源码树、逐字段命名的不一致、仓库自洽与 history 形状、缺少生成文件时报错）；`tests/handoff-contracts.test.mjs` 新增一条：中英 `handoff.md` 里出现的 `semantic-player.N` 全部等于 `PLAYER_VERSION`。
- **证据**：`npm run verify` 491 / 487 / 0 / 4，源码检查 1549 文件（含 current status），日志在 `docs/evidence/astra-second-verification/verify.txt`；`docs/current-status.json` 记录 commit `c09b795`、`worktreeClean: false`（运行时 F4 改动尚未提交）。引导过程：第一次 verify 要求状态已经一致，所以先用本会话上一次完整通过的运行（485/481/0/4）临时记录一次，再跑上面的 verify 并改为记录它，临时日志已删除。
- **未做或限制**：提交后 commit 字段仍是 `c09b795`（`worktreeClean: false`）；要得到干净树上的记录，需要提交后再跑一次 verify 并重新记录。浏览器版本是声明的，没有从二进制探测。`PROJECT_STATUS.json` 里其他历史块（`browser.browserVersion` 144、各种 `previous*`）以及 README/handoff 正文里的测试数不在比较范围内；handoff 只检查 player 版本。verify 日志里含本机绝对路径（与已有 evidence 日志一致）。
- **第七轮补记（提交后）**：第七轮提交为 `bf042bf`。在干净树上重跑 verify 时把日志写回了当前记录的 `verify.txt`，状态测试读到写了一半的日志而失败；已还原，改为写新文件。`--record` 原先把正在记录的未跟踪日志也算作改动，`27bf948` 修正为忽略它。在干净的 `27bf948` 上 verify 491 / 487 / 0 / 4，记录为 `worktreeClean: true`（日志 `verify-27bf948.txt`）；`c09b795` 的记录移入 `history[]`。
