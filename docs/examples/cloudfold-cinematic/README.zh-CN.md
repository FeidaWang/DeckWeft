# Cloudfold Club 插画动效示例

[English](README.md)

此版本保留原示例的三页虚构纸飞机俱乐部内容，加入生成的立体纸艺插画、大字号可编辑文字和分层出现的动效。

这是单独编排的设计示例，没有改变 DeckWeft 核心 schema、CLI 或插件能力。核心 PPTX 导出仍不支持图片和原生动画。素材及可选编排工具位于 `docs/`，不进入插件运行包。没有新增运行依赖，也没有分发字体文件。

## 查看结果

产物位于 `dist/cloudfold-cinematic-v1/`：

- `output/cloudfold-animated.html`：可离线打开的播放器。点击 **Play sequence** 播放文字、插画入场和页面淡入淡出。支持方向键、Home/End、重播、暂停和减少动态效果；系统减少动态偏好也会关闭移动动画。
- `output/cloudfold-illustrated.pptx`：静态 PowerPoint 版本，文字可编辑，插画为独立嵌入图片；不包含原生 PowerPoint 动画。
- `output/cloudfold-motion-preview.mp4`：真实 HTML 播放器的录屏。
- `preview/slide-1.png` 至 `slide-3.png`：真实 PPTX 经 LibreOffice 渲染的图片。

HTML 无需网络、服务器、密钥或外部字体；应用内预览可使用回环地址。原始示例保留。

## 源文件及复现

`scene.mjs` 为 HTML 与 PPTX 共用的构图来源；`player.mjs` 生成动效播放器。[生成提示词](assets/prompts.json)记录了内置 Image Gen 的请求。插画为虚构生成作品，不是真实照片或事实图解。

可选构建工具使用工作区提供的文档编排运行环境，不属于 DeckWeft 核心依赖。通过工作区依赖工具及已安装 Presentations 技能解析路径，按[英文指南](README.md)构建到新的输出目录。已有交付文件不会被覆盖。视频需单独录制实际浏览器播放过程。

三页 PPTX 及 HTML 都完成渲染和视觉检查。浏览器检查覆盖控件、实际动画、减少动态偏好、移动端适配和无外部请求。自动化仅使用独立 Chromium for Testing 及临时配置；未修改已安装浏览器或个人配置。

未打开 PowerPoint 或 Keynote。动画验证范围为 HTML 及录屏；本示例不代表 Claude 或 Codex 桌面原生插件验收通过。
