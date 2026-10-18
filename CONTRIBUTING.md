# Contributing to DeckWeft

Thank you for helping make presentations clearer. Start with a small, reproducible issue rather than a full rewrite.

Use Node.js 22+. Run `npm run verify` from the repository root. No dependency download is required. Select a task from [the roadmap](ROADMAP.md), then reproduce the issue with a tiny fictional or permission-cleared example.

Keep changes within one module when possible. Add tests that fail before the fix, and inspect actual output when changing layout or export. Update the English guide and its Simplified Chinese counterpart. Explain what remains unverified; do not claim Office/Figma/AE compatibility from a mock.

Do not submit credentials, personal documents, commercially licensed assets without redistribution rights, bundled font files, or copied vendor prompts. Keep original license notices. Screenshots for regression tests must come from synthetic examples.

A useful pull request states the problem, the exact changed behavior, tests run, screenshots or output evidence, and remaining limitations. For security issues, follow [SECURITY.md](SECURITY.md) rather than posting exploitable details publicly.

中文版说明：先选一个小任务，用虚构或有权分享的示例复现，再修改、加回归测试、检查实际输出。英文文档为主，并同步中文页。不要提交密钥、私人资料、字体文件或无分发权素材。
