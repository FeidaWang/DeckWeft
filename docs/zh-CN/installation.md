# 安装：选“小配方”还是“完整盒子”

[English](../en/installation.md) · [首页](../../README.zh-CN.md)

**技能**像一张编程助手会阅读的配方；**原生插件**像有名字、有标签的完整盒子，把技能与运行程序一起装进去。通常只选一种，不必重复安装。

DeckWeft 需要 Node.js 22+。编程助手的安装、登录、订阅或 API 用量由你原有的宿主负责；这里不提供额度，也不会绕过权限。

## A. 最简单：一条命令复制独立技能

在源码目录运行：

```bash
node bin/deckweft.mjs install --target both --scope project --dry-run
node bin/deckweft.mjs install --target both --scope project
```

第一条只显示计划；第二条复制完整运行文件到 `.agents/skills/deckweft/`（Codex）和 `.claude/skills/deckweft/`（Claude Code）。

只装一个就用 `--target codex` 或 `--target claude`。`--scope user` 是个人目录，`--scope project` 是当前项目。`--project /你的项目绝对路径` 可以指定别的项目。

让宿主重新发现技能后，在 Codex 使用 `$deckweft`，在 Claude Code 使用 `/deckweft`。请它制作三页示例、执行检查并导出 HTML 和 PowerPoint。要看到真正运行命令与生成文件，不能只看到“安装成功”的聊天文字。

更新与卸载：

```bash
node bin/deckweft.mjs install --target both --scope project --replace
node bin/deckweft.mjs uninstall --target both --scope project --dry-run
node bin/deckweft.mjs uninstall --target both --scope project
```

更新保留单独的备份目录；不覆盖无法确认属于本项目的文件夹。卸载发现你改过文件时，会拒绝删除。请先手动备份并移走它。卸载不删除本地文稿库。

## B. 原生插件：先打包，再让宿主加载

```bash
npm run build
```

产物是 `dist/deckweft-plugin/` 和版本化 ZIP。运行文件都在包内，不依赖原源码目录。打包不会发布到任何平台。

Claude Code 本地验收：

```bash
claude plugin validate ./dist/deckweft-plugin
claude --plugin-dir ./dist/deckweft-plugin
```

进入会话后使用 `/deckweft:deck`。本地市场方式则在源码目录先完成构建，然后运行：

```bash
claude plugin marketplace add .
claude plugin install deckweft@deckweft-local
```

核对宿主显示的安装范围与权限，按需重新加载。市场文件指向构建产物；公开发布时必须确保相应路径真的存在，不能把只有源码、尚未构建的 Git 仓库宣传成可直接市场安装。

Codex 本地目录注册：

```bash
codex plugin marketplace add .
```

这只是注册目录。还需在支持的宿主界面安装、启用并实际调用。不同版本、账号或管理策略可能不同；开发阶段优先使用 A 的独立技能路线。

## C. Figma 与 AE 是另外的安装

AI 插件不等于 Figma 开发插件。Figma 必须使用自己生成的插件 ID，见 [Figma 说明](../../integrations/figma/README.zh-CN.md)。AE 通过真实应用运行 JSX，见 [AE 说明](../../integrations/after-effects/README.zh-CN.md)。

本版依据 2026-10-16 核查的官方文档构建目录契约，链接与详细注意事项见[英文安装文档](../en/installation.md)。本地测试覆盖文件完整性、独立运行和安装器行为；不冒充已经在你的已登录宿主里验收通过。

## 检查真正的宿主加载

按[宿主验收指南](host-acceptance.md)运行检查。安装成功不等于 DW-020 通过。升级 alpha.2 时重新打包，并更新之前选用的安装路线；技能有独立运行文件，仅替换源码不会自动更新已安装副本。先备份文稿库并停止旧 Studio。
