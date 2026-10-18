# 从 alpha.2 继续，不要再从旧计划重做

[English](../en/handoff.md) · [路线图](roadmap.md)

把以下内容交给仓库根目录里的 Codex 或 Claude Code：

当前进展：MB-11～15 的本地代码已实现，先读[素材与 worker](media-workers.md)及[证据](../evidence/mb-11-15/review.md)。MB-12 的 Dot 桌面、MB-14 的实际分配身份与 Figma 原生导入、MB-15 的 AE 执行/渲染仍未完成；MB-08 与既有无障碍/投屏门槛保持开放。Claude 登录继续暂缓。源码没有 Git 元数据；保护已安装浏览器，自动化使用独立测试浏览器和临时配置。

```text
继续 DeckWeft 0.1.0-alpha.2。先读 AGENTS.md、README.md、roadmap.json、
docs/zh-CN/alpha-2.md 和 verification.md，再运行 npm run verify。
DW-020：本机 Codex CLI 0.160.0 的已登录独立项目技能任务及三页 LibreOffice 视觉审阅已通过，证据见 docs/evidence/dw-020/review.json。Claude 2.1.288 校验通过，但用户要求暂不登录，未运行模型任务；未经新请求不要重试。Codex 桌面原生激活和远程 CI 仍未验证，整体验收不能标记通过。
在真实已登录机器运行 host-check；Codex 独立技能不等于原生桌面插件验收。
DW-130 浏览器字体测量和 DW-110 恢复副本界面已经存在，不要重写。
接着完成 DW-120 真实输入法、200% 缩放、屏幕阅读器、direct 浏览器测试，
再检查 DW-140 PowerPoint / Keynote 的字体表现。CLI 仍明确标为估算。
两个 browser 测试都用 --mode direct；fixture 不证明生产 CSP。
英文优先，中文同步。不得绕过权限、自动发布、引入收费云服务或打包字体。
每项结果附真实日志，不能把未测试的环境写成通过。
```

`dist/` 是生成物，不是源码；改源码后重建。历史保留策略和项目归档另做，不要为了通过测试而删除历史。
