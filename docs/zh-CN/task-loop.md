# 一个本地演示任务

[English](../en/task-loop.md) · [验证证据](../evidence/vis-011/review.md)

[VIS-012 适配器](hosts.md)已将显式宿主起草、局部修改和真实图像反馈接入这些工具；Claude 真实验收继续暂缓，默认任务仍不选择宿主。

VIS-011 将语义规划、本地素材、DOM/SVG 渲染、VIS-010 质量检查和导出连成共享任务。没有新增运行依赖、模型切换、API 调用或自动图片请求。VIS-012 真实宿主适配及 VIS-013 工作台仍是后续任务。

1. 保存 JSON 简报：`request`，可选 `locale`（`en` 或 `zh-CN`），以及可选的已有 `project`。自然语言大纲用 `---` 分页。没有项目时，本地确定性规划器保留输入文字，分配开场、正文和结尾角色；丰富创作由已授权宿主的现有模型负责。单页短输入只形成同一原文的三个视图，不会自动研究或补充事实。
2. 执行 `npm run deck:create -- --brief brief.json --out dist/my-task`，使用新目录。已有图片资源加 `--home /绝对路径/素材库`。
3. 打开 `dist/my-task/preview.html`。应看到预览和 `task.json`：故事弧线、场景角色、焦点身份、三个同族构图候选、所选构图、配色模式、素材需求及相关主题规则。预览尚未通过最终审阅。
4. 执行 `npm run deck:task -- --task dist/my-task/task.json --tool 工具名 --args args.json`。参数必须包含检查点当前整数 `expectedSequence`。CLI 锁定检查点，每步落盘；旧序号保留诊断，不覆盖新修订。
5. 向 `src/agent/tools.mjs` 的 `runVisualTask` 提供真实浏览器捕获能力，或向 `render.inspect` 提交如实标注的宿主测量。`npm run deck:verify` 演示隔离浏览器实跑，需要已有测试用 `PLAYWRIGHT_MODULE` 和位于 `/Applications` 之外的 `CHROMIUM_PATH`；运行时不安装浏览器依赖。
6. 实际查看回执要求的所有图片。向 `render.inspect` 提交 `review: {receiptId, reviewer, delivery, images, judgment, verdict, issues}`。问题需含稳定 `sceneId`、`nodeId`、边界、严重性、原因和修复建议。图像审阅是明确的看图声明；DOM 通过不等于已看图。宿主报告的测量单独标注，不能变成独立验证。
7. 调用 `artifact.export`，指定 `format: "html"`。只有当前机器检查和图像审阅都通过，才输出带序号的独立 HTML。`"project"` 和 `"checkpoint"` 始终可导出恢复 JSON。保留原检查点及素材。v3 原生 PowerPoint/Figma/AE 导出仍待实现。

| 工具 | 结果 |
| --- | --- |
| `content.inspect` | 保留精确事实、数据、引用并列出缺证据诊断；不声称已在外部核实事实。 |
| `design.propose` | 编译前返回当前任务相关设计简报，不塞入全部设计文档。 |
| `assets.resolve` | 读取真实本地原件及衍生文件；缺文件阻塞，不请求远程图片。 |
| `render.preview` | 保留源内容的 HTML，以及当前源和渲染器指纹。 |
| `render.inspect` | 浏览器检查、图像绑定回执、可选有界构图修复及明确看图审阅。 |
| `design.patch` | 仅修改指定场景构图，或添加使用原始精确数据的图表。保留原文、颜色、数据与引用。 |
| `artifact.export` | 已审阅 HTML，或可恢复项目与任务 JSON。 |

“把第 4 页改成图表，保持原文和颜色”：向 `design.patch` 提交 `request`；该页尚无图表时还需明确选择原始 `datasetId`。本地语法支持英文 page/slide/scene 页码及中文“第 4 页”；其他请求需结构化补丁。不能从自然语言、格式化数值字符串或无关数据推断数字。只在该页添加原始数据引用对应的 citation；已有对象身份不变，其他场景逐字节相同。随后重新检查内容、预览、捕获及审阅。

`runVisualTask(task, {home, capture, review, checkpoint})` 在同一作用域执行内部阶段，通过传入的 checkpoint 回调逐步持久化。缺少能力时明确返回 `browser-capture` 或 `actual-image-review`，提供能力后从检查点继续。常规内部步骤不重复请求授权。自动修复共享累计默认预算：**两轮、六个候选、两次接受的场景修改、60 秒**。机器或实际看图问题只允许修改已授权受影响场景的构图；渲染候选前检查作者锁定。不能为通过质量检查改写事实、数据、引用、素材、颜色或无关页面。

恢复状态包括 `data-required`、`blocked`、`revision-conflict`、`stale-receipt`、`quality-failed`、`repair-exhausted`。保留 `original`、`history`、`repair.candidate`、诊断和 `lastValid`。补回原始文件，冲突后重载，或在需要更多轮数时明确创建新作用域任务；不要重置旧任务预算。源、布局、观众状态测量、截图身份或渲染器/契约/主题改变都会使回执失效。失败重跑保留最近有效导出的源和 HTML，预览不会覆盖它。

已有可选 agent bridge 请求支持 `workflow: "visual"`，选定项目及可选 `sceneIds`/`budget`。沿用同意、宿主身份、模型上限、租约、过期和取消检查。MCP `deckweft_visual_tool` 使用 `{id, lease, tool, arguments}` 调用同一个分派器，不能自行创建授权、执行仓库命令、扩大工具、切换宿主/模型或用旧草稿提交绕过质量检查。导出后进入 `needs-review`，工具返回本地产物。真实浏览器编排、单元 mock 能力和真实认证宿主运行分别记证。
