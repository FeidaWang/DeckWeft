# Design system
## Two layers, one quiet product
The workbench is an instrument: stable neutral surfaces, precise grouping, one accent for the active action, visible state and restrained depth. The slides are editorial: evidence, colour, typography and hierarchy serve the argument. Do not repaint all chrome every time the movie palette changes. Material styling belongs mainly to tactile controls, not reading surfaces.

Teenage Engineering's field-system pages supply an industrial reference, not a kit to copy. TP–7 ties its reel to scrubbing, pausing and navigation; OP–1 field describes a low-profile aluminium body and deliberately revised screen graphics. Transfer functional correspondence and restraint, not logos, exact device silhouettes or proprietary audio. Only selected product pages were reviewed; the rest remain in the coverage register. [SRC-TE-FIELD, SRC-TE-TP7, SRC-TE-OP1, SRC-TE-CATALOG]

## Colour contracts
`PALETTES.json` contains 22 distinct discrete community palettes, including all 16 names on the uploaded screenshot. The source RGBs and derived D65 Lab values are immutable. Every palette has light, dark and stage role tokens. The raw colours are not approved arbitrary foreground/background pairs. [SRC-WES]

| Role | Rule |
|---|---|
| Canvas / surface | Neutral or low-tint substrate; do not reduce text legibility to preserve a film look |
| Text / secondary text | At least 4.5:1 against actual background; aim for 7:1 for main stage text |
| Large display text | WCAG minimum 3:1 where large-text conditions apply; default product policy remains 4.5:1 |
| Accent | Attention, not an automatic success/error status; use with tested on-accent text |
| Essential strokes / connectors / focus | At least 3:1 against adjacent relevant colours; two-tone focus treatment if adjacency varies |
| Data series | Direct labels and shapes/patterns where needed; no colour-only identity |
| References | Readable short keys near claims; expanded metadata in a source view/appendix |
| Missing data | Label and pattern; never convert a null into a zero or a weakly coloured bar |

Ratios are computed before rounding. A palette passing the supplied role-pair checks does not certify an entire rendered application. Images, alpha blending, gradients, hover states, chart adjacency and system forced-colours modes still need rendering-level checks. [SRC-WCAG-TEXT, SRC-WCAG-NONTEXT]

## Colour use by content
**Photos:** retain natural/evidential colour by default. Use matching background, border, crop or caption to integrate them. Any artistic tint is optional, non-destructive and clearly excluded for charts, evidence images, colour-critical product photos and scientific/medical interpretation.

**Charts:** emphasise one relevant comparison, not all series equally. Keep chart semantics from the current project: axis units, denominators, nulls, interval meanings, ordering and source IDs. Categorical cinema swatches are not automatically perceptually ordered sequential/diverging scales. Use a validated scale for magnitude; direct labels and a data table remain available.

**Workflow diagrams:** one left-to-right or top-to-bottom main path, labelled transitions and a separate exception lane. Put explanatory labels near their objects. Preserve edge identity and direction when exporting.

**Mechanism diagrams:** part identifiers, stable callout anchors, consistent component colours, clear motion/force/flow arrows and a “not to scale” statement when applicable. Do not imply physical accuracy from an illustrative schematic. Keep the dominant mechanism large enough to inspect; provide detail states and a complete static fallback.

## Typography and geometry — product defaults, not scientific constants
Use existing permitted local/system font stacks. Do not bundle font files. English-first UI; a Chinese document may retain its own locale and font fallback independently.

A 16:9 stage preset can begin with 32–44 pt headlines, 22–28 pt body and 16–18 pt chart/source labels. These are authoring defaults to validate at viewing distance, not an accessibility guarantee. Do not shrink below the chosen floor to force a dense slide to fit: split content or switch to a reading-deck mode. On a laptop, use readable UI text and scalable preview, not misleading conversion of slide points to browser pixels.

Use an internal 12-column grid, a small spacing scale and consistent safe margins as engineering choices. Dominant evidence should generally receive roughly 45–65% of the useful area on figure-led pages. Comparison and table pages may legitimately differ. Golden ratios, equal distribution and a top-left starting point are not universal cognitive laws.

## Layout families
| Family | Use | Required guard |
|---|---|---|
| Assertion + evidence | A defensible takeaway supported by one main figure | Source and qualifier stay near the claim |
| Paired comparison | Two alternatives on common dimensions | Same scale and alignment; no unfair visual weight |
| Evidence chart | A quantitative answer | Unit/denominator/uncertainty remain visible |
| Workflow | Sequence with decisions | Reading order and edge direction agree |
| Mechanism | Components and behaviour | Large main figure; stable labels and honest scale |
| Reading brief | Self-paced dense information | Reflowed reading mode rather than tiny stage text |

The assertion–evidence research supports comprehension in the studied educational setting, not a guaranteed increase in business persuasion. Recent colour/background research does not justify treating palette choice as a memory enhancement by itself. [SRC-AE2013, SRC-COLOR2024]

## Attention policy
Choose a reading task first: live talk, self-paced reading, executive comparison or technical explanation. Make one primary takeaway apparent. Reveal relevant information in controllable steps when useful; ensure export contains the full intended state. Keep text next to the figure it explains. Do not enforce a universal F/Z path. Order is shaped by language, task, salience, experience and content; the original report's web-scanning rule was over-generalised.

No fabricated “neuroscience score”, exact universal optimal number of words or untested persuasion percentage. Candidate metrics are named heuristics. More gaze is not automatically better learning. Test comprehension, factual accuracy and decision quality separately from liking.

## The novice workbench
One clear empty state accepts a file drop, paste, or title-and-notes. Advanced choices stay in a single contextual drawer. The initial sequence is Add material → Review story → Make slides. After generation, show the active page, an optional compact page strip, one editing surface and a visible export action. Reuse the existing shell, not several parallel shells.

Every control needs a documented job, discoverable label, visible state and keyboard route. Delete duplicate status indicators and decorative gauges. “Undo” is not redundant with restore history: one reverts an edit, the other recovers a saved revision. Explain that distinction only when needed.

## Slide dial specification
The dial represents the integer slide index; it is not a decorative spinner. Use one detent per slide and a legible `3 / 12` value. Bound values; do not wrap from the last slide to the first by surprise. Retain the selected slide's stable ID across reordering.

Enhance a native range control where possible. Arrow keys move one slide, Home/End reach the bounds; PageUp/PageDown may jump by a documented larger step. A touch/assistive-technology route must not depend on rotation gestures. Native previous/next controls are legitimate accessible alternatives, not extra competing primary actions. [SRC-ARIA-SLIDER]

Use pointer capture for dragging, clamp out-of-bounds moves, support pointer cancel and preserve focus. Do not hijack the whole page's wheel: only interpret a deliberate focused-control interaction. Never navigate on global arrows while editing text or composing an IME string. In a one-slide deck, show the value and disable movement without divide-by-zero behaviour.

Metal is an original low-cost CSS treatment: a static layered gradient, restrained rim and clear pointer. No perpetual animation, fake 3D engine or copied vendor texture is required. Press/settle motion can be 80–160 ms as a testable default. Respect reduced motion; state changes work instantly without animation.

## Sound
Off by default. A single visible preference enables short synthesized ticks after a user gesture has unlocked audio. Use no vendor recording. Limit tick rate; do not queue hundreds of sounds during scrubbing. Presenter/audience output, exports, background tabs and automated tests are silent unless an explicit test enables sound. The sound is confirmation only, never the sole feedback. Separate sound preference from reduced-motion preference, while preserving a global quiet/presentation mode.

No claim that a desktop browser provides physical metal detents or guaranteed haptics. Unsupported vibration is simply absent; it is not a critical feature.

## Acceptance beyond numbers
Render representative pages in every mode and check images, gradients and small labels. Test keyboard-only, screen reader, touch, high contrast and reduced motion. Conduct a small formative novice study, then a larger counterbalanced comparison before making general claims. A proposed initial study uses 8–12 novices and identical content across conditions; report participant selection and limits. Success criteria are product hypotheses: find first action, create first outline, correct one page, export, recover an edit. Record failure causes rather than only a satisfaction average.
