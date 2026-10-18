# 发布前检查：先构建，再主动公开

[English](../en/release.md)

当前文件是“准备发布”，不是已经发布。

先检查 DeckWeft 名称、许可证与素材分发权，保留 LICENSE / NOTICE；再运行 `npm run verify` 并查看真实输出。Codex / Claude Code 已登录加载、目标软件渲染、远程 GitHub CI 都要真实执行后才能写“通过”。

确定真实仓库归属与公开范围之后，再补 repository / homepage / 安全联系方式。本包没有虚构这些地址。只有你明确操作 Git/GitHub 才公开代码；插件 ZIP 可作为以后 release 附件。市场描述引用 `dist/deckweft-plugin`，公开分发时该路径必须存在，或说明用户先本地构建。

公开前启用私密漏洞报告，检查 ZIP 路径、SHA-256 和待提交文件。`private: true` 防止误发 npm，不阻止公开 GitHub 源码。CI 只构建附件，不自动公开发布、打标签或更改宿主权限。

工作流采用当前官方文档中的 [checkout](https://github.com/actions/checkout)、[setup-node](https://github.com/actions/setup-node) 和 [upload-artifact](https://github.com/actions/upload-artifact) 主版本，只申请仓库读取权限，不持久保存 checkout 凭据，不启用本项目不需要的包缓存。主版本标签会更新，发布前应在真实仓库中重新验证；本次本地构建没有运行 GitHub Actions。


[alpha.2 范围和升级说明](alpha-2.md)。真实宿主验收仍需实际已登录运行和人工检查；宣布浏览器/CSP 兼容前请运行 direct 模式。
