# Export report · story-orange-launch-zh-CN

交付完整的故事——八页发布审阅 (zh-CN) · 8 slides · 1 native charts · 1 pictures · PDF 16 pages

| Result | Status |
|---|---|
| PowerPoint editability | pass |
| Page check against the derived scene | pass |
| PDF searchability | partial |
| Accessibility (package checks) | partial |
| Visual fidelity | partial |

| Level | Web | PDF | PowerPoint |
|---|---|---|---|
| L1 | 36 | 34 | 36 |
| L2 | 0 | 2 | 0 |
| L3 | 0 | 0 | 0 |

## Receipts

- `PPTX_TEXT_BALANCE` × 7: PowerPoint does not balance lines. The measured line breaks are written as line breaks; the text stays editable.
- `PPTX_DISCLOSURE` × 5: A slide has no disclosure control.
  - st-evidence “查看完整数据” disclosure: Its content is in the slide notes.
  - st-evidence “全部作者说明与提示顺序” disclosure: The explanations are in the slide notes in cue order.
  - st-process “关系与节点说明” disclosure: Its content is in the slide notes.
  - st-process “全部作者说明与提示顺序” disclosure: The explanations are in the slide notes in cue order.
  - st-pair “全部作者说明与提示顺序” disclosure: The explanations are in the slide notes in cue order.
- `PPTX_INTERACTION_STATIC` × 3: Slides are not interactive in this compiler.
  - st-evidence chart-select interaction hours-range: The selected result, with the filter, sort and focus written out in the static-state note.
  - st-process steps interaction process-steps: The complete final state: every node and relationship is drawn.
  - st-pair image-compare interaction pair-compare: Both images side by side, each labelled.
- `PPTX_MOTION_NOT_COMPILED` × 3: No animation, transition or timing is compiled. The slide shows the static state.

## Fonts referenced, not embedded

Futura, PingFang SC

## Applications

- powerpoint: installed, not run — Only the user runs it; see applicationChecks.
- keynote: installed, not run — Only the user runs it; see applicationChecks.
- libreoffice: not installed
- quickLook: rendered — macOS Quick Look (qlmanage, OfficeImport) drew each slide and PDF page as an independent reference render. It is neither PowerPoint nor Keynote.
