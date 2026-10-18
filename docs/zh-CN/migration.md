# 迁移：先保留旧配方，再制作新文稿

[English](../en/migration.md) · [首页](../../README.zh-CN.md)

前身叫 Open Deck Skill / Open Deck Astra。新项目不是到处替换名字、连原作者声明也抹掉。

先备份原 JSON，然后运行：

```bash
node bin/deckweft.mjs import old-project.json --out imported.deck.json
node bin/deckweft.mjs check imported.deck.json
```

当前仅明确迁移旧 `schemaVersion: 2` 的支持字段：标题、文字、要点、数字、备注和已知布局。输入文件不改写，完整原数据归档到 `extensions.legacy.original`。不安全或重复的页面 ID 会重建，旧分数重新计算。

旧媒体、主题覆盖、锁定、引用格式和自定义动效只是保存在归档里，**不会自动变成可渲染功能**。导出前需要人工核对。

无效的当前 DeckWeft 文件不会被偷偷修成“看似有效”；未知版本、任意 PPTX、旧 PPTD 都会明确拒绝。网页导入会生成新项目 ID，避免覆盖已有文稿。

新安装器只写新目录，不会删除旧插件。先验收新的导出流程，再通过宿主管理器移除旧插件。排查问题时尽量不要同时启用两套相似触发器。

活动代码、界面、包名和手册使用 DeckWeft；旧名只在迁移、审计和 [NOTICE](../../NOTICE.md) 中作为来源保留。原 [LICENSE](../../LICENSE) 完整保留。
