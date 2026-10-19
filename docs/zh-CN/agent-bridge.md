# 可选本地代理桥接

[English](../en/agent-bridge.md) · [叙事规划](planning.md) · [实际强度评测](astra-evaluation.md)

桥接是可选的本地队列，提供 stdio MCP 与连接电脑的 CLI 传输，不内置模型或 API 供应商。真实 Codex CLI 任务已走通授权队列；**Dot 桌面仍待验收**。桥接不能读取其他聊天、创建聊天或推断账户权限。

## 连接并请求一份草稿

1. 运行 `node bin/deckweft.mjs studio --home /absolute/path/to/library`。
2. 打开 **Generate with Dot → Enable local bridge**。预期：等待代理连接，生成按钮仍禁用。
3. 打开 **Connection details**，在连接的电脑上使用其中准确的 MCP 命令或 worker 路径。纯云端代理不能访问电脑上的回环地址。
4. 调用 `deckweft_connect`，报告真实宿主名、已选模型，以及可选的强度和能力。只声明实际支持的模型选择、强度、取消、用量和事件操作；聊天操作为空，工作者上限为一。模型仍属宿主报告，`apiConfirmed` 保持 null。
5. 在 Studio 填写简报、可选讲述目标和模型策略，审阅分享所选项目的勾选项。**Generate draft** 仅授权一份草稿、一个工作者、十分钟，不授予其他聊天、仓库路径、网络或工具权限。宿主权限仍由宿主管理。必选 Astra/强度不受支持时明确阻止，不替换模型。
6. 宿主调用 `deckweft_next_job`。预期：取得租约、固定输入、授权和执行胶囊。胶囊固定任务、验收要求、路线图、规则、源码哈希、基线修订和选定输入。导入文稿只是数据。
7. 返回完整项目，使用分配的 id、修订号 0、请求的 schema 版本，并保留来源 id/网址。`deckweft_checkpoint` 可保存通过 schema 验证的 v2 提案。`deckweft_complete_job` 验证最终草稿，可附带受限的宿主报告 token 计数。预期：`needs-review`，尚未应用。
8. 审阅内容与时间线，点击 **Save and open a new copy**。预期：打开新项目，原稿仍保留；重复应用返回同一副本。

宿主无法确认选择时，通用模式仅为建议。已报告的强度超过授权上限会被阻止；必选模式在每条完成与工具路径（complete、patch、visual tool、checkpoint）上核对宿主报告的模型／强度；该报告不是服务端证明。能力声明与运行参数都不是独立的服务端模型证明。成本比较请参阅实测限制。

## CLI 传输

使用 Connection details 中的绝对路径：

```bash
node /absolute/path/to/DeckWeft/bin/deckweft-worker.mjs wait \
  --home /absolute/path/to/library --name Dot --model ACTUAL_HOST_MODEL \
  --timeout-ms 45000
```

确实支持选择的宿主可加 `--effort medium --capabilities /absolute/path/to/capabilities.json`。能力文件示例：

```json
{"modelSelection":true,"effortSelection":true,"models":[{"id":"gpt-6-astra","efforts":["medium","high"]}],"cancel":true,"usage":true,"events":true,"conversationOperations":[]}
```

这些参数报告外部宿主的实际配置，worker 本身不会选择模型。不要让不具备能力的宿主复制该声明。

收到 `waiting` 时，在授权会话内继续轮询。收到 `claimed` 后读取 `jobPath`，由宿主生成独立 JSON，再提交：

```bash
node /absolute/path/to/DeckWeft/bin/deckweft-worker.mjs complete \
  --home /absolute/path/to/library --job CLAIMED_JOB_ID \
  --draft /absolute/path/to/generated.deck.json
```

预期：`needs-review`。`checkpoint` 使用相同文件参数提交 v2 提案。验证失败时修复提案，不要原样重复。身份与租约保存在项目 JSON 之外的私有文件。

## 进度与恢复

持久状态为 queued → running → validating → needs-review → applied，另有 blocked、failed、cancelled、expired。模型返回不等于应用项目；单宿主不能同时取得两份有效租约。

固定任务权重为规划 30、草稿 45、验证 25。规划检查点通过 schema 后才计入权重，最终草稿通过排版检查后计入其余部分。模型内部阶段显示不定进度。百分比表示已验证工作，不表示时间或隐藏推理。范围变化需要新请求和新授权。ETA 至少需要三次可比成功记录，显示区间、低置信度和样本数；不足时显示正在估算，断连和审阅等待单独标明。

- 重新打开对话框可找回该源项目最近的任务，简报、模型和时长来自真实请求。
- 认证后的 `/api/agent/jobs/ID/events?after=SEQUENCE` 提供游标事件；日志截断会报告缺口。事件保留任务、尝试、序号、时间和产物哈希，不包含租约令牌或私密聊天正文。
- failed/expired 且有验证过的检查点时，**Authorize checkpoint retry** 会创建新授权、租约和尝试，保留旧胶囊引用。撤销的授权不能恢复。
- 取消或禁用桥接会撤销未完成工作，拒绝迟到结果；已产出的本地草稿与检查点仍保留。已经应用的副本不会因此撤回。
- `deckweft_fail_job` 只接收明确的宿主、验证或工具故障代码，不接收私密原始日志。
- 心跳为 90 秒，单次租约最多十分钟且不超过授权有效期。长模型调用可在有效租约内完成；过期不会自动重试收费工作。
- 队列上限为 20 个任务、每任务 200 条事件、总计 8 MB，不暗中清理任务。满时换独立文稿库。旧 v1 队列先备份，旧的在途任务取消后需要新授权。
- 队列、应用与取消共用独占锁；不会自动删除旧锁。手工恢复前停止相关进程、保留文件并检查锁。
- 开发中重启服务会使旧标签的会话失效；重新加载可恢复，重启前先保护未保存内容。

## 独立的代码提案

文稿授权不能提交代码。认证请求 API 可另建 `code-change` 策略，列出准确的 `src/*.mjs` 路径及可选的 `npm run verify` 命令声明。`deckweft_complete_patch` 检查范围、固定基线和当前文件哈希，只保留有界替换提案，**不会写入源码或通过文稿保存路线应用补丁**。集成与多工作者仍属后续工作，两类授权都不授予聊天访问。

本地桥接不能撤销宿主原有权限，宿主仍需遵守自己的沙箱和授权范围。凭据字段检查只是额外边界，分享前也要审阅普通文字中的敏感内容。

运行 `npm run verify` 检查源码、契约、子进程、租约、持久化、导出和打包。本地协议测试与真实 Codex CLI 任务不能代替 Dot 桌面、Claude 登录或原生插件激活验收。

现行[素材与 worker 指南](media-workers.md)补充两个独立身份、明确选择的会话文字快照、worker 进度与本地图片任务。单个文稿请求仍只授权指定 worker；不授予真实会话读取、源码、网络或工具权限。Dot 桌面验收仍开放。

VIS-011 增加可选 `workflow: "visual"` 任务及受作用域约束的 MCP `deckweft_visual_tool`。七个共享工具、版本冲突、明确的浏览器/图像回执及恢复操作见[任务闭环](task-loop.md)。这属于本地协议支持，不代表 VIS-012 真实宿主验收。
