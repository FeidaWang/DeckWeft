# 维护模式登记表

[English](../design/pattern-register.md) · [登记表说明](../design/README.md) · [对齐计划 §19](../plans/design-handoff-alignment.md#19-s10-decisions-and-result--pattern-library-maintenance-and-the-p3-boundary-2026-10-19)

本手册写给要在 [pattern-register.json](../design/pattern-register.json) 中新增、复查或退役模式的人。登记表是设计证据，不是运行时契约：`schemas/` 与 `src/` 都不读取它。状态词只有 Proposed / Implemented / LocalVerified / HostVerified / ExportVerified，状态只有在有 `docs/` 证据文件时才能改变。

## 维护字段

S10（DWD-310）给全部 56 条模式记录加入了下列字段。交接包的原始字段和 S1 的状态字段都没有改动；文件里的 `import.addedFields` 逐项解释了每个字段。

| 字段 | 当前取值 | 规则 |
|---|---|---|
| `patternId` | 等于 `id` | 作品和文档引用的稳定名称。 |
| `version` | 56 条全部为 `"1.0.0"` | 主.次.修订。模式的含义或 DeckWeft 的实现发生变化时提高。 |
| `sourceUrl`、`locale` | 由 `source_ids` 推导 | 顺序与 `source_ids` 相同；`locale` 是排序后的去重语言列表。要改就改来源，不要直接改这两项。 |
| `sourceCheckedAt` | `2026-10-18`（交接包阅读日期），仅有提案证据的为 `null` | 上一次有人读过该模式参考页面的日期。 |
| `evidenceType` | `observed` / `source` / `text` / `proposal` | 把 V / S / D / P 标记写成文字。 |
| `observedBehavior` | 仅在 `referenceVerified` 为 true 时填写 | 实际看到了什么，沿用交接包原话。其中可能夹带 S 或 D 的说法，用 `evidenceType` 判断混入了哪几类。 |
| `dataRequirements`、`interactionState`、`staticFallback`、`outputTier`、`accessibility` | `null` | 只有在模式层面的来源或浏览器核验写明时才填。输出等级是按组件在 `src/targets/capabilities.mjs` 中声明的，不按模式声明。 |
| `assetStatus` | `no-reference-assets-bundled` | 本仓库不含任何参考站点的图片、视频或字体。 |
| `verification` | 对象 | `reference`（observed、source-or-text-only、proposal-only）、`deckweft`（仓库状态）、`browserSampleSources` 与 `evidence`（已存在的 `docs/` 文件）。 |
| `deprecatedBy` | `null` | 取代本模式、仍在使用的那条模式的 id。 |

`checkedAt` **不是**页面核对日期。它是 S1 加入的，意思是“核对仓库状态的日期”。页面被阅读的日期是 `sourceCheckedAt`。[source-register.json](../design/source-register.json) 里有同样的一对，并另外新增了 `sourceUrl`、`locale` 与 `browserSample`。

## 何时新增模式

只有出现独有设计时才新增模式：不同的构图、不同的动效或交互行为、不同的图表语法。站点在登记表已描述的模板上发布新内容，不需要新 id。把它记录为新来源（新的 `ANT-` 或 `OAI-` 记录），并在现有模式的 `source_ids` 中引用。

1. 打开页面，写下有什么不同：版面、行为、图表语法、控件。
2. 在登记表中搜索。对照最接近的几条记录的 `title`、`deckweft` 与 `acceptance_and_static`。
3. 如果已有记录覆盖它，加上来源即可，到此为止。预期：`source_ids` 变长，没有新 id。
4. 如果确实独有，取该类别下一个空闲 id（F13、M21 或 C25），先做下面的浏览器核验，再添加记录，`repositoryState` 为 `Proposed`、`repositoryStatus` 为 `missing`。
5. 运行测试（见“检查”）。预期：通过。

恢复办法：测试会指出记录和被违反的规则，就改那个字段。绝不要为了让测试通过而修改交接包的原始字段。

## 为新模式做浏览器核验

使用内置浏览器或带临时配置的隔离自动化浏览器。不要使用个人配置，不要登录。

1. 以 1440 × 900 打开页面，等字体、图片和开场动画稳定后再记录。写下日期、浏览器、视口和设备像素比。
2. 记录**初始**状态，再记录该模式依赖的每个交互（滚动一步、控件、排序、选择）。模式声称用真实指针或按键时，就用真实指针或按键；用了脚本要注明。
3. 在 390 × 844 重复一遍，记录版面是否按阅读顺序重排、页面是否只纵向滚动。
4. 打开减少动态效果（浏览器的模拟或操作系统设置），记录哪些仍在动、每个阶段是否仍可到达。
5. 记录**静态**状态：关闭 JavaScript，或打印页会显示的状态。
6. 把结果写成 `docs/evidence/<名称>/browser-sample.json`。只保存文字，不要保存参考站点的截图。
7. 把来源的 `browserSample` 设为 `{date, evidence, states}`，并把该来源写进模式的 `verification.browserSampleSources`。预期：测试能找到该文件和这些交叉引用。

没做的部分在文件里写成 `notChecked`。没有人看过的格子保持未核验；模式数量不能代替它。

## 记录上游站点的改版

参考站点改版不会改变任何作品。

1. 重新打开来源，把日期记为 `browserSample.date`（阅读完整时也记为 `sourceCheckedAt`）。在证据文件里写下变了什么：旧读法、新读法、模式是否仍然成立。
2. 模式仍然成立，则不动 `version`。含义变了，则提高 `version`，并在 `repositoryNote` 中描述变化。
3. 如果有新模式取代它，先添加新记录，再把旧记录的 `deprecatedBy` 设为新 id。测试会拒绝未登记的、指向自己的，或本身也已弃用的替代者。
4. 已有作品固定其主题和组件版本，按作者排定的样子继续渲染。是否升级到较新的模式版本由作者决定，并在 Visual Studio 中走正常的撤销与历史路径。没有任何东西会在后台升级作品。
5. 弃用代价高的效果（Shader、3D 物件、长开场）时保留其静态状态。静态状态留在模式文字和作品中，使历史作品仍可阅读与导出。

## 完成“全站逐页核验”还需要什么

交接包保存的是路径，不是访问记录。当前仓库的证据是交接包的 18 个带 V 标记的模式，加一次三页抽样（[证据](../evidence/s10-pattern-maintenance/browser-sample.json)）；抽样覆盖 ANT-01、OAI-S01 与 OAI-S20。

**OpenAI，zh-Hans-CN。** 交接包列出 1,390 条去重后的 zh-Hans-CN alternate 路径（`OpenAI_zh-Hans-CN_Discovered_URLs.txt`，SHA-256 `f992714d…ed869`，站点地图统计见 `OpenAI_Sitemap_Coverage.json`）。它们分属 62 个首段路径，其中 `index`（716）与 `business`（468）占大头。这 1,390 条不能与 2,063 条 canonical URL 相加。要完成核验：

1. 把 1,390 条路径归并成模板（版面、控件与图表语法相同的页面）。这个归并目前还不存在；它的产出是一份模板 id 清单，每个模板有一条或多条代表路径。
2. 对每个模板，在桌面与移动端各检查四种状态：初始、交互、减少动态效果、静态。每个模板 8 格。若逐条检查全部路径，则是 1,390 × 8 = 11,120 格。
3. 每格记录为“看到了”“没看到”或“与交接包读法不同”。目前的抽样共 7 格：3 个桌面初始、3 个移动初始（OAI-S20 那格未定，因为没有查看表格在 390 px 下如何容纳）、1 个交互（OAI-S20 的排序）。没有记录任何减少动态效果格或静态格。

**Anthropic。** 交接包未能取得站点地图，所以全站 URL 总数未知（`sitewide_url_total: null`），也无法计算覆盖比例。在任何核验之前，必须先有一份可核对的完整 URL 清单：公开的站点地图，或一次记录了起点、深度上限和日期的抓取，并连同其哈希保存为文件。在此之前，已阅读的 32 个主站页面只是抽样，不是普查。Anthropic 覆盖率应标为未知。

**其他缺口。** Firefox 与 WebKit、屏幕阅读器、真实输入法、200% 缩放和实测帧率，都没有页面级证据。

## P3 边界

DWD-310 只完成上述维护机制。P3 效果仍按 EXP-001 记录在 [roadmap.json](../../roadmap.json) 中并保持延后。不要用某个模式去提前论证它们：

- 不做全屏长期粒子；
- 不做多层模糊或透明滤镜；
- 没有静态定稿就不做 3D；
- 不做只有用鼠标才能理解的开屏；
- 在 P1 验收之前，不做没有语义作用的数字翻滚。

性能预算要先写明固定的参考设备、浏览器版本、分辨率、设备像素比和电源模式。这五项在证据文件里记录之前，登记表、路线图和文档中都不写任何毫秒、帧率或内存数字。

## 检查

```bash
node --test tests/design-registers.test.mjs
```

预期：八个测试通过，一个跳过。带上交接包时九个全部通过：

```bash
DECKWEFT_HANDOFF_DIR=/path/to/DeckWeft_Design_Handoff node --test tests/design-registers.test.mjs
```

测试检查：维护字段齐全，且类型正确或为 `null`；`version` 是 主.次.修订，`deprecatedBy` 指向已登记、仍在使用、且不是自身的模式；每个 `verification.evidence` 与 `browserSample.evidence` 路径都存在；EXP-001 仍记录 P3 延后项且没有预算数字；交接包的原始字段与已交付文件一致。
