# Export report · gallery-zh-CN

VIS-014 发布画廊——十二张冻结页面 (zh-CN) · 12 slides · 4 native charts · 3 pictures · PDF 25 pages

| Result | Status |
|---|---|
| PowerPoint editability | pass |
| Page check against the derived scene | pass |
| PDF searchability | partial |
| Accessibility (package checks) | partial |
| Visual fidelity | partial |

| Level | Web | PDF | PowerPoint |
|---|---|---|---|
| L1 | 54 | 47 | 54 |
| L2 | 0 | 7 | 0 |
| L3 | 0 | 0 | 0 |

## Receipts

- `PPTX_TEXT_BALANCE` × 10: PowerPoint does not balance lines. The measured line breaks are written as line breaks; the text stays editable.
- `PPTX_DISCLOSURE` × 9: A slide has no disclosure control.
  - cc-timeline “关系与节点说明” disclosure: Its content is in the slide notes.
  - ev-case “全部作者说明与提示顺序” disclosure: The explanations are in the slide notes in cue order.
  - ev-evidence “查看完整数据” disclosure: Its content is in the slide notes.
  - dd-trend “查看完整数据” disclosure: Its content is in the slide notes.
  - dd-ranked “查看完整数据” disclosure: Its content is in the slide notes.
  - dd-matrix “查看完整数据” disclosure: Its content is in the slide notes.
  - dd-explain “关系与节点说明” disclosure: Its content is in the slide notes.
  - dd-explain “查看完整数据” disclosure: Its content is in the slide notes.
  - dd-explain “全部作者说明与提示顺序” disclosure: The explanations are in the slide notes in cue order.
- `PPTX_INTERACTION_STATIC` × 3: Slides are not interactive in this compiler.
  - ev-case image-hotspots interaction case-spots: Every annotation is visible text on the page.
  - dd-explain steps interaction pipeline-steps: The complete final state: every node and relationship is drawn.
  - dd-explain chart-select interaction pipeline-data: The complete authored data (no static state is declared).
- `PPTX_MOTION_NOT_COMPILED` × 2: No animation, transition or timing is compiled. The slide shows the static state.
- `PPTX_CHART_LEGEND` × 1: Native bars carry no per-bar series name. The native chart legend names every series.
- `PPTX_CHART_MISSING_LABEL` × 1: The gap is kept, but the in-plot “missing” label is not drawn. The missing reason is in the visible chart notes and the embedded data leaves the cell empty.

## Fonts referenced, not embedded

Geeza Pro, PingFang SC, Songti SC

## Applications

- powerpoint: installed, not run — Only the user runs it; see applicationChecks.
- keynote: installed, not run — Only the user runs it; see applicationChecks.
- libreoffice: not installed
- quickLook: rendered — macOS Quick Look (qlmanage, OfficeImport) drew each slide and PDF page as an independent reference render. It is neither PowerPoint nor Keynote.
