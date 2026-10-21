# 每个模块的模型与推理强度 — v1.1

上一版没有逐任务写模型强度，本版补齐 29 个任务。这里是工程建议，不是已经跑过的模型对比实验。

**主力模型：Codex 中实际可选且你已明确授权的 Sol。** 若界面已提供 GPT-6.1 Sol，优先选它；没有则由你确认可用的版本，不擅自接 API、不自动使用 Astra 额度。本工作包不能替你切换客户端模型，不能证明你的账号有某个模型，也不会因文件写着 High 就真的把宿主设成 High。

“构建”用于实现；“复核”用于单独检查本模块 diff、测试和证据，不等于自动另开一个收费 Agent；“升级上限”只在存在具体失败证据且经你同意时考虑。Low 仍须满足相同验收标准。Extra High 不作任何模块的默认值。

| 任务 | 模块 | 构建 | 复核 | 条件升级上限 |
|---|---|---|---|---|
| DWI-000 | 仓库审计与已有模块复用 | High | High | Extra High |
| DWI-001 | 真实宿主能力清单 | Medium | Medium | High |
| DWI-002 | 研究证据与素材权利边界 | High | High | High |
| DWI-003 | 回归夹具与测试基线 | Medium | Medium | High |
| DWI-010 | 调色盘注册与不可变色值 | Medium | High | High |
| DWI-011 | 语义色彩与对比度 | High | High | Extra High |
| DWI-012 | 图表及流程图无障碍配色 | High | High | High |
| DWI-013 | 配色选择器与来源展示 | Medium | Medium | High |
| DWI-020 | 多文档安全导入 | High | High | Extra High |
| DWI-021 | 论点、来源与矛盾数据 | High | High | Extra High |
| DWI-022 | 提纲预览与故事确认 | Medium | High | High |
| DWI-023 | Agent 交接与项目迁移 | High | High | Extra High |
| DWI-030 | 排版候选与阅读顺序 | High | High | Extra High |
| DWI-031 | 紧凑引文与完整参考文献 | Medium | High | High |
| DWI-032 | 主图构图与图表真实性 | High | High | High |
| DWI-033 | 流程图与机械结构示意图 | High | High | Extra High |
| DWI-034 | 可编辑 PPTX 与跨端导出 | High | High | Extra High |
| DWI-040 | 零基础工作台与界面精简 | Medium | High | High |
| DWI-041 | 金属旋钮与输入状态机 | High | High | Extra High |
| DWI-042 | 默认静音的机械反馈 | Medium | Medium | High |
| DWI-043 | 键盘、触控、撤销与恢复 | High | High | Extra High |
| DWI-050 | Codex／Claude 真实宿主适配 | High | High | Extra High |
| DWI-051 | Kimi 可选兼容性审查 | High | High | High |
| DWI-052 | 电影帧与配色来源扩充 | High | High | High |
| DWI-053 | TE 产品及近期论文研究 | High | High | High |
| DWI-060 | 跨模式视觉与新手验收 | High | High | High |
| DWI-061 | PowerPoint／Keynote 实机验收 | Medium | High | High |
| DWI-062 | 离线打包与隐私检查 | Medium | High | High |
| DWI-063 | 交付状态与最终说明 | Low | Medium | Medium |

默认分配：**1 个 Low、10 个 Medium、18 个 High、0 个 Extra High**。详细原因和每一任务的升级触发条件写在 `TASKS.json` 与 `TASKS.md`。

## 怎么执行
在 Codex 选择对应模型与强度后，提交该任务的 `prompts/tasks/DWI-xxx.md`；仍按 `TASKS.json` 的依赖和 `PHASE_00`–`PHASE_06` 的验收顺序执行。新会话先读 `prompts/START.md`。实际设置不可见时应记录“未核实”，由你确认，不能让模型靠自我介绍证明运行设置。

连续两次有针对性的修复仍无进展时，保留最小复现、失败测试、尝试过的不同原因和当前 diff，再提议升级。缺少论文全文、电影授权、PowerPoint、浏览器、登录或额度时，应标为阻塞，不能靠增加推理强度掩盖。

检查一个任务的配置：
```sh
node scripts/task-profile.mjs DWI-034
```
该命令只打印本地记录，不启动 Codex，不调用模型，也不修改配置。

## 版本替换
尚未改过原工作包：用本版替换仓库内 `workpacks/wes-instrument/` 的内容，不覆盖仓库根文件。已经修改过原工作包：先备份并比较差异，合并新增模型字段、指令和检查，不覆盖你的任务进度或证据。29 个应用任务在本次交付中仍为 planned；没有重新生成或修改 DeckWeft 产品代码。

官方参数和模型资料见 `MODEL_ROUTING.md` 与 `SOURCES.md`。本版只安排模型使用建议，不授予自动用量/收费权限，也不承诺更高强度一定更好。
