# Export report · atlas-en

What a release gate measures: synthetic numbers for three widths and two languages (en) · 6 slides · 5 native charts · 1 pictures · PDF 12 pages

| Result | Status |
|---|---|
| PowerPoint editability | pass |
| Page check against the derived scene | pass |
| PDF searchability | pass |
| Accessibility (package checks) | partial |
| Visual fidelity | partial |

| Level | Web | PDF | PowerPoint |
|---|---|---|---|
| L1 | 28 | 21 | 27 |
| L2 | 0 | 7 | 0 |
| L3 | 0 | 0 | 1 |

## Receipts

- `PPTX_TEXT_BALANCE` × 4: PowerPoint does not balance lines. The measured line breaks are written as line breaks; the text stays editable.
- `PPTX_DISCLOSURE` × 7: A slide has no disclosure control. Its content is in the slide notes.
- `PPTX_CHART_IMAGE` × 1: PowerPoint has no dot-and-interval chart; error bars are not compiled. A high-resolution image of this chart only, with its question, caption, takeaway and source as native text; alt text and the slide notes carry every value.

## Fonts referenced, not embedded

Avenir Next, Avenir Next Demi Bold, Avenir Next Heavy, Menlo, PingFang SC

## Applications

- powerpoint: installed, not run — Only the user runs it; see applicationChecks.
- keynote: installed, not run — Only the user runs it; see applicationChecks.
- libreoffice: not installed
- quickLook: rendered — macOS Quick Look (qlmanage, OfficeImport) drew each slide and PDF page as an independent reference render. It is neither PowerPoint nor Keynote.
