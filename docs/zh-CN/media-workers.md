# 本地素材、多 worker 与空间场景

[English](../en/media-workers.md) · [证据](../evidence/mb-11-15/review.md) · [规划](planning.md)

MB-11、MB-13 已有本地实现。MB-12 已完成两个真实并发 CLI 任务，Dot 桌面验收仍未完成。MB-14、MB-15 更新了导入器和本地测试，真实应用关卡仍开放。本批未增加运行时包依赖、密钥读取或自动供应商连接。

## 可选图片生成

1. 审阅并保存 v2 故事板，在目标页打开 **Design → Local image and rights**。
2. 填写许可、允许用途、替代文字和离线后备说明。这些是作者声明，不代表权利核查。
3. 展开 **Optional image generation**，只写愿意共享的提示词，勾选宿主工具授权，点击 **Prepare image request**。
4. 点击一次 **Copy host task**，把任务交给可用的图片生成宿主。预期：只共享已审阅提示词；DeckWeft 不直接请求供应商，宿主权限和用量另行适用。
5. 点击 **Import generated PNG** 导入原始输出。浏览器上限为 1.3 MB；较大原图可用以下 CLI 完成登记，再点 **Check result and attach**。
6. 检查图片后保存。预期：独立图片、可编辑文字、内容哈希与权利记录。HTML/PPTX/Figma/motion 嵌入独立素材；备份 JSON 时还需保存文稿库的 `assets` 文件夹。

```bash
node bin/deckweft-image.mjs status --home /绝对路径/文稿库 --id REQUEST_ID
node bin/deckweft-image.mjs complete --home /绝对路径/文稿库 --id REQUEST_ID --image /绝对路径/原图.png
```

相同提示词与权利记录的已完成请求会复用校验过的本地文件。相同的待处理请求即使换请求 id 也不能重复派发。取消后拒绝迟到结果，但已经开始的宿主操作还需要在宿主中停止。

结果未知时先恢复原结果。派发键只是本地提示，不代表供应商支持幂等或取消。每个请求只派发一次，不自动重试。若派发后复制失败，使用状态中的请求 id 运行 `status` 找回原提示词，不要盲目再次生成。文稿已改动时重新准备请求，已完成的匹配素材可免生成复用。文件缺失或变化时恢复哈希匹配的原图；权利元数据冲突需要审阅。

只接受静态 PNG：小于 4 MB、单边最多 8192、最多 2400 万像素；同时校验区块、CRC、符号链接、尺寸和哈希，并沿用总素材预算。不接受 SVG 脚本或远程图片地址。

## 两个独立授权的 worker

1. 启用本地桥接，连接两个独立 MCP 会话，或在同一文稿库使用不同 CLI 身份：

```bash
node bin/deckweft-worker.mjs wait --home /绝对路径/文稿库 --worker-id alpha --name Alpha --model ACTUAL_HOST_MODEL
node bin/deckweft-worker.mjs wait --home /绝对路径/文稿库 --worker-id beta --name Beta --model ACTUAL_HOST_MODEL
```

2. 在 **Generate with Dot** 中选择授权的 worker。可选填写一个会话快照 id，并粘贴明确选中的文字，再勾选共享。预期：只有该快照和选定文稿进入该 worker 的固定任务，不读取或发送真实会话，也不新建桌面聊天。
3. 每个 worker 同时持有一个任务，两个独立任务可以并发。概览显示连接、状态、已验证产物、耗时和下一阶段。可在另一份源文稿上重新打开对话框并提交独立任务。宿主推理仍为不确定进度，不编造合并 ETA。
4. 分别审阅并保存新副本。桥接事务保持单一集成写入者；请求 id、身份绑定和租约拒绝重复领取、越权及迟到提交。

代码提案仍需要独立 code-change 授权。重叠的活跃路径授权会冲突。当前目录没有 Git，代码任务只取得获准源码、规则和胶囊的独立副本；这不是操作系统沙箱，宿主仍须遵守授权。原文件哈希变化时拒绝陈旧提案；代码集成仍需人工审阅，保存文稿的接口不能应用代码补丁。副本不包含别的 worker 的会话或目录。

更换 worker 身份前先关闭再启用桥接，这会撤销待处理授权并拒绝迟到结果。已生成草稿保留供查看。崩溃后的租约保留到过期；恢复需要明确授权、已验证检查点和原授权 worker。

## 空间插图

1. 在 v2 页选择 **Design → Spatial illustration → Orbit of ideas** 或 **Layers of an idea**。预期：图片与说明布局、按条目数量生成 1～6 个几何对象，文字保持原生可编辑。
2. 使用旋转或重置按钮，支持 Tab/Enter。统一的减弱/关闭动态偏好停止持续旋转，保留手动控制。
3. HTML 保留本地实时 3D；SVG、PPTX、Figma、AE 和私密观众界面使用原生静态形状后备，不声称具有可编辑 3D。打印时显示形状并隐藏 canvas。

WebGL 失败或上下文丢失时恢复静态形状；切页释放资源。每个视图最多 6 个网格，共用一份几何与材质，无纹理，像素比为 1，画布最多 63 万像素。现有源码链接器加入约 2.12 MB 渲染器（gzip 418 KB），此适配器约 5.3 KB；仅需要的 HTML 包含它，Studio 按需加载本地文件。此数值与早先压缩过的独立舞台示例不同。[实测体积](../evidence/mb-11-15/render-cost.json)。

## 外部应用关卡

Figma 导入器支持可编辑文字、形状和独立 PNG 填充，缺失字体替换必须明确接受，并可下载来源节点/字体映射报告。使用固定坐标，不推断组件或自动布局。图片单边最多 4096。导入属于明确的下游操作，Figma 自身的保存行为适用。[本地插件步骤](../../integrations/figma/README.zh-CN.md)。

AE 交接包含逐节点秒数、缓动和上移量。JSX 创建原生图层和独立 PNG 素材，要求选择本地素材目录，在图层及 MASTER 注释记录来源/字体，并在取消或失败时移除本次新建的项目与文件，不自动渲染。[AE 步骤](../../integrations/after-effects/README.zh-CN.md)。

本次打开了 Figma 桌面，但插件菜单一直加载，后续应用截图不可用，未取得实际分配的插件身份或导入图层审阅。`/Applications` 中未安装 After Effects。两项保持 partial，导出文件、本地模拟与浏览器截图均不算真实应用验收。

## 复现

```bash
npm run verify
node scripts/serve-media-demo.mjs
```

示例使用保存的原始插图，构建不会调用图片供应商；产物位于 `dist/mb-11-15/demo`。可选的 `node scripts/multi-worker-acceptance.mjs --live --out /全新目录` 会消耗两个短宿主回合，只使用自编输入，拒绝现有目录、不自动修复并记录失败。已记录的 CLI 并发结果不证明 Dot 桌面、API 模型身份或实际费用。
