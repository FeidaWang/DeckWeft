# 五分钟 DevDay 演示

[English](../en/devday-demo.md)

当前英文稿共 14 页，讲者备注有 644 个英文词。建议从每分钟 **140 词**开始练习：正文约 4 分 36 秒，另留 24 秒用于操作与停顿；各页时间合计 300 秒。这是估算，尚非真人计时彩排。

## 播放与排练

1. 运行 `npm run demo`，应在 `dist/devday-five-minute` 得到离线 HTML、可编辑 PPTX、项目 JSON 和英文讲稿。
2. 打开 HTML，点 **Present** 和 **Full screen**。方向键翻页，Escape 退出全屏；把指针移到底部可显示控件。
3. 点 **Wake the Dots** 或角色。应看到 Three.js 几何体弹跳，移动指针可产生轻微倾斜。主体、边缘和表情均为网格，未使用角色截图贴图。
4. 点 **Try layouts** 比较真实核心场景。离线比较使用文字估算，Studio 才进行浏览器实测。**Notes / interaction** 显示讲稿与流程交互，**Reduce motion** 保留全部静态内容。
5. PPTX 保留原生文字、流程图形和独立角色渲染图，作为静态版本使用。它不包含原生 PowerPoint 动画。

WebGL 不可用时会显示同一套几何体导出的透明图片。播放不会访问 CDN、图片服务或远程字体。

## 在工具中使用

1. 启动 Studio，在工具栏打开 **Interactive feature tour**，点 **Open the 5-minute demo deck**。应新建已保存的副本，不覆盖当前文稿。
2. 在 **Design → Presentation style** 选择 **Cosmic & Dots**。该风格需要 16:9；其他比例会提示阻塞，而非偷偷改动项目。
3. 功能导览的 **3D Dots** 可查看五个角色并分别下载透明渲染图。**Rehearse** 可统计讲稿、调整语速、计时和下载讲稿。
4. 该风格支持 PPTX、HTML、SVG、JSON。实验性的 Figma／AE 导入器暂不支持这些媒体，所以相应导出按钮禁用。切回 Studio layouts 后恢复。
5. 桌面与窄屏保留相同五个主要工具入口；窄屏通过抽屉打开大纲和检查器。

## 真实 Dot 验收

打开 **Generate with Dot → Enable local bridge → Copy task for Dot**，把任务交给有本机操作权限的 Dot。它应连接准确的本地项目库并报告实际宿主模型。随后在 Studio 设定英文、时长、语速，主动同意交接当前快照，再点一次 **Generate draft**。完整验收需经历排队、运行、返回、审阅、另存新副本、重新打开和实际导出。

请求 GPT-6 Astra 不能强制切换或独立验证模型。本会话的工具无法控制 ChatGPT 自身，也没有 Dot 浏览器入口，桥接仍在等待真实 agent。因此 **Dot／Astra 真实生成仍待验收**，本地测试不会替代它。

鸣谢包括 MLAI、四位组织者、全体参与筹办的员工与志愿者，以及 OpenAI 社区，按要求不写用度金额。ChatGPT 网页规划、Codex Sol High、多个 agent 和 Dots 的贡献按构建者提供的信息署名。Tibo 的经历与周末预测明确作为个人玩笑。

视觉参考为用户指定的 Astra 页面和 Dots 活动图；星场为原创生成图，Dots 为几何重建，并非官方 3D 模型。随材料保留许可与素材说明。可选 Three.js 使用 MIT 许可，固定的两份源码约 2.12 MB；图片约 3 MB。普通 Studio 布局不会加载该渲染器，没有新增需要安装的包或远程运行依赖。
