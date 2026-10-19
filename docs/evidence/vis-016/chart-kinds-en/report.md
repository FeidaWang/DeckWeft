# Export report · chart-kinds-en

Chart kinds that keep their facts — S4 synthetic sample (en) · 12 slides · 6 native charts · 5 pictures · PDF 24 pages

| Result | Status |
|---|---|
| PowerPoint editability | pass |
| Page check against the derived scene | pass |
| PDF searchability | pass |
| Accessibility (package checks) | partial |
| Visual fidelity | partial |

| Level | Web | PDF | PowerPoint |
|---|---|---|---|
| L1 | 36 | 24 | 31 |
| L2 | 0 | 12 | 0 |
| L3 | 0 | 0 | 5 |

## Receipts

- `PPTX_TEXT_BALANCE` × 10: PowerPoint does not balance lines. The measured line breaks are written as line breaks; the text stays editable.
- `PPTX_CHART_EVENT_MARK` × 1: Native charts have no event marker on the category axis. The event is listed in the visible chart notes.
- `PPTX_DISCLOSURE` × 13: A slide has no disclosure control.
  - direct-bar “View all data” disclosure: Its content is in the slide notes.
  - filter-sort “View all data” disclosure: Its content is in the slide notes.
  - filter-sort “All authored explanations and cue order” disclosure: The explanations are in the slide notes in cue order.
  - ranked-truncated “View all data” disclosure: Its content is in the slide notes.
  - grouped “View all data” disclosure: Its content is in the slide notes.
  - dot-interval “View all data” disclosure: Its content is in the slide notes.
  - dot-log “View all data” disclosure: Its content is in the slide notes.
  - trend “View all data” disclosure: Its content is in the slide notes.
  - log-line “View all data” disclosure: Its content is in the slide notes.
  - small-multiples “View all data” disclosure: Its content is in the slide notes.
  - benchmark “View all data” disclosure: Its content is in the slide notes.
  - stacked-sorted “View all data” disclosure: Its content is in the slide notes.
  - area-truncated “View all data” disclosure: Its content is in the slide notes.
- `PPTX_INTERACTION_STATIC` × 1: Slides are not interactive in this compiler. The selected result, with the filter, sort and focus written out in the static-state note.
- `PPTX_MOTION_NOT_COMPILED` × 1: No animation, transition or timing is compiled. The slide shows the static state.
- `PPTX_CHART_BREAK_MARK` × 2: A native value axis starts at the truncated minimum but has no break symbol. The truncation note stays as visible text under the chart.
- `PPTX_CHART_MISSING_LABEL` × 2: The gap is kept, but the in-plot “missing” label is not drawn. The missing reason is in the visible chart notes and the embedded data leaves the cell empty.
- `PPTX_CHART_QUALIFIER_MARK` × 1: Native data labels do not carry the superscript qualifier number. The qualifier is listed in the visible chart notes.
- `PPTX_CHART_IMAGE` × 5: PowerPoint has no dot-and-interval chart; error bars are not compiled. A high-resolution image of this chart only, with its question, caption, takeaway and source as native text; alt text and the slide notes carry every value.

## Fonts referenced, not embedded

Arial, Avenir Next, Avenir Next Demi Bold, Helvetica Neue, Iowan Old Style

## Applications

- powerpoint: installed, not run — Only the user runs it; see applicationChecks.
- keynote: installed, not run — Only the user runs it; see applicationChecks.
- libreoffice: not installed
- quickLook: rendered — macOS Quick Look (qlmanage, OfficeImport) drew each slide and PDF page as an independent reference render. It is neither PowerPoint nor Keynote.
