# Security policy

DeckWeft is an alpha local tool, not an internet-facing service. Only the latest alpha is actively maintained. No security certification is claimed.

The local server binds to loopback, validates project data, checks Host/Origin and session tokens, escapes rendered text, bounds JSON requests, and refuses unsafe storage ids and symlinked paths. The installer changes only owned destinations and retains backups for replacement.

These controls do not protect against malicious processes already running as the same operating-system user, compromised browsers/extensions, every filesystem race or power failure, or policies of an external AI/design host. Project files and histories are not encrypted. History has no automatic retention limit in this alpha. Do not expose the local server through a public proxy.

Do not commit `.env` files, keys, tokens, private documents, local libraries, or identifying crash dumps. Providers and automatic uploads are not part of the current runtime.

Before a public release, the repository owner must enable GitHub private vulnerability reporting or publish a real maintained private security contact. Until then, do not submit sensitive exploit details to public issues and do not treat this prepublication source bundle as having a monitored disclosure channel. Share a non-sensitive request to establish a private channel first.

中文：这是本地 alpha，不是公网服务，也没有安全认证。文件不加密，历史无自动保留上限。不要公开密钥或漏洞利用细节。仓库正式公开前，维护者必须启用私密漏洞报告或提供真实维护的私密联系方式。
