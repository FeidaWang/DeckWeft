# 从这里开始：先花五分钟做一页

[English](../en/start.md) · [首页](../../README.zh-CN.md)

准备电脑、浏览器，以及 Node.js 22 或更新版本。把 Node 想成启动工作台的小发动机。这一步不需要 Codex、Claude Code、Figma、Adobe 或 API 账号。

## 1. 找到正确的文件夹

解压源码，在有 `package.json` 的文件夹中打开终端：

```bash
node --version
node bin/deckweft.mjs doctor
```

第一条显示 `v22` 或更大的版本号即可。第二条说找不到 Codex 或 Claude 也没关系，本地工作台不需要它们；找到命令也不代表已经登录。

## 2. 打开工作台

```bash
node bin/deckweft.mjs studio --open
```

不要关闭这个终端。浏览器没打开时，自己打开打印出来的本地地址。你会看到六页示例，以及大画布下方的四个布局选项。

## 3. 先改一句话

点击左边一页，在右边改“大标题”，再点击下方另一种布局。文字应该还在，只是位置改变了。点击“保存”，看到“已保存在本机”才算保存成功。

## 4. 带走成果

点击“导出”再选 PowerPoint。用演示软件打开 `.pptx`，点击标题，它应该是可以继续改的文字，而不是一张整页截图。

再导出一份“项目 JSON”。它是完整工作备份；PowerPoint 是交付格式，当前不能重新导入回 DeckWeft。

## 5. 下次继续

终端按 `Ctrl+C` 关闭程序，再运行启动命令，保存过的项目仍在本地库中。默认保存在 `~/.deckweft/`；`~` 就是你的个人主文件夹。加 `--home ./my-local-library` 可指定别的真实文件夹。

遇到问题看[简单手册](manual.md)，要装进编程助手则看[安装手册](installation.md)。
