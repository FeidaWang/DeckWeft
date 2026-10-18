# 本地编码宿主适配

[English](../en/hosts.md) · [任务工具](task-loop.md) · [VIS-012 证据](../evidence/vis-012/review.md)

VIS-012 为现有七个任务工具增加 Codex 与 Claude Code CLI 薄适配层，不安装宿主、不登录、不选择提供方，也不实现 VIS-013 工作台。未选择宿主时任务仍为确定性本地操作。实际调用沿用宿主已有配置，可能消耗其额度；认证可用不证明订阅、价格或计费路线。

## 查看能力

1. 在源码目录使用 Node.js 22 或更新版本。
2. 执行 `npm run doctor -- --host codex --json` 或 `npm run doctor -- --host claude-code --json`。
3. 预期得到版本／帮助证据、CLI 宣告的结构化输出／图像输入能力、本地渲染边界，以及未知的认证／计费／图片后端。不会调用模型或登录。
4. 只有检查已授权的现有路线时才添加 `--probe-auth`。它仅运行状态命令并丢弃可能包含账号的输出，不调用登录。用户要求暂缓 Claude 认证时继续暂缓。

能力回执绑定宿主、工作区和配置元数据指纹。换工作区、配置改变或超过五分钟时拒绝复用。任务开始探测一次，有效期间复用；不读取配置内容、不复制密钥，无法观察的设置继续标为未知。

## 生成本地预览

1. 查看 `examples/host-brief.zh-CN.json` 或英文版。`request` 是指令，`locale` 独立设置输出语言，可选 `sourceText` 是精确原文。每个非空原文行必须逐字保留；带 `---` 的多页请求也自动获得此保护。翻译／改写受保护原文需另行准备替代来源；未提供原文的自由指令仍是未经事实验证的宿主创作。
2. 执行 `npm run deck:create -- --brief examples/host-brief.zh-CN.json --out dist/host-task-NEW --host codex --live`，使用新目录。只有授权且可用时才选择 `claude-code`；`--live` 防止仅指定宿主就意外调用模型。
3. 预期得到 `task.json`、`preview.html` 及 `.deckweft-host-runs/<id>/receipt.json`。打开预览核对内容；这还不是已审阅成品。已有项目不能通过重新起草替换，应使用局部修订。
4. 独立包使用 `node /absolute/plugin/runtime/bin/deckweft.mjs visual-task ...`，参数一致，不依赖源码 scripts、编译器或包下载。

`--model` 将指定模型原样传给选定宿主；省略时沿用宿主默认值。不换宿主、不换模型、不回退 API、不自动重试。Codex 事件未报告实际模型时保持未知；Claude 可用的模型信息仅标为宿主自报，不算独立验证。不推断金额或订阅权限。

## 局部修订和看图

1. 读取检查点当前 `sequence`。保留已授权 `scope` 和工具范围；宿主不能扩大范围或解除锁定。
2. 执行 `npm run deck:task -- --task dist/host-task-NEW/task.json --host codex --live --tool design.patch --request '将第 4 页改为 statement-center，保留文字和颜色。' --expected-sequence N`，将 `N` 替换为当前整数。支持选择构图或绑定已有精确数据集；更广语义编辑留待后续。
3. 通过常规共享工具重新检查内容／设计／素材／预览，再按任务手册向 `render.inspect` 提供真实浏览器捕获。CLI 不会虚构浏览器能力。
4. 获得当前机器检查通过的回执、并将截图保存在任务目录后，执行 `npm run deck:task -- --task dist/host-task-NEW/task.json --host codex --live --tool render.inspect --expected-sequence N`。
5. 预期每张必审图片实际附加，返回哈希对应的逐图判断及具体场景／内容块问题。PNG／JPEG 必须位于任务工作区内且不能经过符号链接；最多 20 张，每张 8 MB，总计 24 MB。哈希和 CLI 图像参数不等于视觉通过。
6. 只有当前机器和图像审阅均通过后，才能由共享 `artifact.export` 导出最终 HTML；失败时仍可导出项目／检查点恢复 JSON。v3 原生导出仍不支持。

程序接口在 `src/hosts/tasks.mjs`：`draftWithHost`、`patchWithHost`、`reviewWithHost`、`runHostVisualTask`。完整流程接收显式本地 `capture` 和检查点回调，复用一次能力探测；修复仍受 VIS-011 累计预算、原文和作者锁约束。宿主审阅缺失或失败会保留检查点，不授予导出通过。

## 证据与恢复

Codex 的最终结构化消息从文件读取，事件 JSONL 单独解析且必须含完成事件。Claude 使用常规 `--print --output-format json --json-schema`，只接受 `structured_output`；图像用原生 stream-JSON base64 块传入。禁用 Claude 内置工具，保留普通 manual 权限，不使用 `--bare`、权限绕过、shell 拼接或后备提供方。

提示通过 stdin 传递；每次使用新的私有目录和请求身份。回执只保存输入／schema／输出哈希、图片哈希、进程状态和模型证据，不保存提示、原始输出／错误、账号或凭据。临时 schema、结果、图片副本结束后删除。进程有输出上限、超时（默认 120 秒，可设 1～600 秒）和取消处理；POSIX 终止进程组，Windows 子进程树终止及真实 Windows 宿主验收尚未验证。宿主自身的日志／hook 配置不在 DeckWeft 回执策略控制内，不更改全局宿主设置。

超时、进程失败、schema 不匹配、能力过期、图片变化或原文覆盖失败时，保留检查点和最后有效产物。修正已诊断来源／配置，必要时重新探测，再显式发起新尝试。不自动重试模型，不手改哈希绕过审阅。尚未创建任务的草稿失败会保留哈希回执及调用方原始 brief，不伪造成功任务。

真实宿主 QA 仅用于已授权路线：设置 `/Applications` 之外的隔离 `CHROMIUM_PATH` 及现有 QA `PLAYWRIGHT_MODULE`，执行 `npm run host:visual -- --host codex --live --out dist/host-visual-NEW`。它复制构建包到干净本地环境，先生成保留原文的预览，再对提供的六类构图合成诊断样例在 1440／390px 捕获（包括横向滚动末端状态）、交付真实图像，并只修订第 4 页。只有实际审阅通过才导出 HTML；刻意混合主题的诊断样例不算 VIS-014 连贯故事生成。不证明桌面原生插件、全部无障碍或原生应用兼容性；已安装浏览器和个人配置只读。

实现对照[OpenAI 非交互文档](https://learn.chatgpt.com/docs/non-interactive-mode)、[Claude 程序调用](https://code.claude.com/docs/en/headless)、[Claude CLI 参数](https://code.claude.com/docs/en/cli-reference)及本机帮助；仍需验证实际选定宿主，不能仅靠文档推断能力。

VIS-012 视觉闭环修复让短标签折线／面积比较图（最多六个类别、两个系列，数值标签长度有界）适应窄屏，分开重合数值，并把简单相邻节点链纵向排列。长标签或密集组件仍保留原有滚动／数据表阅读方式，不声称任意关系图均能重排。缩放保留对象身份和精确原始数据。沿用隔离浏览器环境运行 `node tests/browser_responsive_components.mjs`，检查双语、320～1440px、标签碰撞、变换后裁切检测及返回桌面几何。
