# DeckWeft Cinematic Composition and Visual Hierarchy Roadmap

**Research date:** 19 October 2026 (Australia/Melbourne)  
**Repository baseline:** [FeidaWang/DeckWeft, main at 9771bf46e20b982ca7ca1d73e018a3b51bca89ef](https://github.com/FeidaWang/DeckWeft/tree/9771bf46e20b982ca7ca1d73e018a3b51bca89ef)  
**Status:** Research and implementation proposal. No repository changes, commits, pull requests or deployment were made.

## Executive recommendation

Make the next release a composition and visual hierarchy upgrade. Establish the actual presentation canvas, distinguish the primary subject from supporting information and references, give product images and mechanism diagrams adequate space, and evaluate the result at its delivered size. Then extend the existing storyboard, rhythm and motion systems with methods drawn from cinematography.

The 17 Oscar winners in this study offer different answers to a shared question: what should the audience notice, in what relationship to its surroundings, and at what moment? They support a vocabulary of deliberate composition. They do not establish a universal golden-ratio coordinate, an obligation to fill every region evenly, or a reason to ban centered compositions.

For ordinary English and horizontal Chinese explanatory pages, offer a clear left entry and a coherent progression toward the main figure and its interpretation. Preserve large centered product reveals, quotations and chapter pauses when they serve the page.

### Scope and evidence

- Award years are **ceremony years, 2010–2026 inclusive**, rather than film-release years. The 2026 award was presented on 15 March 2026 for films released in 2025.
- Film methods come from Academy records and direct cinematographer or production-team interviews published by the ASC, ARRI, Kodak, Film and Digital Times and British Cinematographer.
- Product translations and all proposed thresholds are design hypotheses for DeckWeft, not experimentally proven consequences of those films.
- Code findings were checked through the user-selected GitHub connector at the pinned revision.
- Repository test and screenshot reports are explicitly identified as existing evidence. The Studio, a browser render of the current build, PowerPoint and Keynote were not rerun in this review. A direct local clone could not connect in the available environment; the source review continued through GitHub.
- This is not a frame-by-frame annotation of all 17 complete films. Exact shot timings or focal lengths are included only when supported by the cited production source.

## 1. What the current code actually explains

### 1.1 A tall webpage can become an undersized slide

The PowerPoint `sceneFrame()` function uniformly fits the measured scene into a 16:9 frame. The same scale transforms type and objects. The PDF path similarly computes the minimum of width-fit and height-fit.

Consequently, allowing a web scene to become taller makes the entire exported composition smaller. This can undermine a carefully chosen hero size as well as text readability.

**Code:** [PPTX frame](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/targets/pptx/ooxml.mjs#L11-L13), [PPTX application](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/targets/pptx/compile.mjs#L40-L45), [PDF fit](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/targets/pdf/print.mjs#L28-L35).

Existing 19 October repository reports record the following separate observations:

| Corpus | Recorded issue | Interpretation |
|---|---|---|
| S7 / VIS-016 | Tall scenes reached 1,189 px; fitted citations and chrome reached 4.6–6.4 pt. | Export readability needs its own gate. |
| S8 / VIS-015 | 102 of 228 pages at 1,440 px exceeded the 900 px candidate budget. | General fit success does not establish a fixed-height presentation. |
| Later S9a directions | 11 of 132 pages exceeded that budget. | A distinct corpus; do not present this as a matched before/after improvement. |

**Records:** [S7](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/docs/evidence/vis-016/review.md#L120-L129), [S8](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/docs/evidence/vis-015/review.md#L39-L48), [S9a](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/docs/evidence/s9a-author-controls/review.md#L105-L109).

**Decision:** Make target-specific layout an immediate priority. Keep flexible reading view and fixed presentation view as separate derived layouts of the same content.

### 1.2 Citations occupy ordinary composition rows

`blockHTML()` prints each citation's text together with the full source title. Each citation enters the main grid as a region. Styling adds a full-width rule, 20 px top margin and 16 px top padding to each citation, in addition to its text and grid spacing.

This explains why 12 px source text can still consume substantial space and attract attention through repeated horizontal separators.

**Code:** [Citation HTML and image captions](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/components/blocks.mjs#L8-L22), [region assembly](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/document.mjs#L55-L58), [citation CSS](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/art-direction.mjs#L71-L83).

The existing S9a disclosure system permits paragraph, list and callout blocks. Citations cannot simply use the current “Reduce text” action.

**Code:** [Disclosure contract](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/design/plan.mjs#L10-L13).

**Decision:** Add a separate reference presentation policy. Preserve all source records, exact text and relationships while changing how they occupy the audience canvas. Reuse existing PowerPoint source notes and PDF notes/appendix machinery.

### 1.3 Centering is partly a default classification outcome

`sceneDirection()` treats chart, table, diagram and code as visual content. Images are excluded from this particular test. A scene with six or fewer blocks and none of those types becomes sparse; `data-space=open` then gives its regions vertical centering and a 500 px minimum height.

Several individual layouts also center their content. This establishes a centering risk, not that every generated page is centered.

**Code:** [Sparse classification](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/design/art-direction.mjs#L12-L20), [centering rules](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/art-direction.mjs#L96-L119).

The repository already has twelve semantic composition families, variants, explicit reading order, measured candidates, deck rhythm and asymmetric author controls.

**Code:** [Existing families](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/design/compositions.mjs#L6-L40), [reading order](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/design/compositions.mjs#L99-L120), [author controls](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/workbench/author-actions.mjs#L33-L39).

**Decision:** Extend existing selection policy with page purpose, primary object and deliberate anchor zones. Centering should be an authored or selected composition intent, not an accidental consequence of block count.

### 1.4 Image bounds are not the same as product bounds

Later CSS overrides the older 400/500 px limits on left/right images. Those old rules should not be reported as universal current constraints. Remaining limits include a 600 px image strip, a centered 560 px system map and a 640 px alternate system map.

**Code:** [Current image overrides](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/art-direction.mjs#L111-L119), [diagram limits](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/art-direction.mjs#L21-L26).

A large image container can still contain a tiny product surrounded by margins. The current `safeCrop()` already supports an authored focal point and protected region. Its default protects the full original image. The 320 × 240 default is a source-pixel requirement, not a target display-size requirement.

**Code:** [Safe crop](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/assets/crop.mjs#L5-L14), [slot initialization](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/assets/slots.mjs#L8).

Image `alt` is also printed as the visible caption. A long accessibility description therefore consumes visible canvas space.

**Decision:** Separate source resolution, protected subject bounds, on-canvas size, context retention, alt text and visible caption. Measure diagram labels at their delivered size.

### 1.5 Present quality features do not measure aesthetic hierarchy

The browser runtime measures occupied bounding-box area, image-window area and the center of one focal block. It categorizes that point into left/center/right and top/middle/bottom. This is a geometric approximation, not eye tracking or a validated model of attention.

Source coverage checks URL presence in the output. It does not establish that the reader can associate a particular claim with the right source, or that source metadata has appropriate prominence.

**Code:** [Runtime features](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/render/web/runtime.mjs#L26), [render checks](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/quality/render-checks.mjs#L34-L43), [900 px candidate budget](https://github.com/FeidaWang/DeckWeft/blob/9771bf46e20b982ca7ca1d73e018a3b51bca89ef/src/design/rhythm.mjs#L6-L26).

**Decision:** Retain hard correctness gates and add calibrated aesthetic review. A page can preserve every word and still give the wrong object most of the attention.

## 2. The complete 2010–2026 cinematography reference set

The “translation” column is a proposed application to DeckWeft. The technique column summarizes documented production practice. Each year links to the official award record; each technique links to a primary interview or production source.

| Award year | Film and winning cinematographer | Documented method | Proposed DeckWeft translation |
|---|---|---|---|
| [2010](https://www.oscars.org/oscars/ceremonies/2010) | **Avatar — Mauro Fiore** | Deep focus from the small-sensor stereo system made background detail distracting. Fiore used lighting falloff and set dressing to direct attention. SimulCam enabled composition with virtual elements visible. [ASC](https://theasc.com/article/avatar/) | Establish primary/supporting/reference roles. Control source area, separators and contrast together. Compose the product with its surrounding content from the outset. |
| [2011](https://www.oscars.org/oscars/ceremonies/2011) | **Inception — Wally Pfister** | Photographic realism remained consistent across dream spaces. Main photography used anamorphic 35 mm with selected large-format scenes; physical rotating sets supported the spatial illusion. [ASC](https://theasc.com/article/dream-thieves-wally-pfister-asc-and-christopher-nolan-on-inception/) | Keep a stable visual vocabulary as a sequence moves between overview and detail. Preserve object identities and directions through spatial changes. |
| [2012](https://www.oscars.org/oscars/ceremonies/2012) | **Hugo — Robert Richardson** | Stereo depth was considered during shooting. Clockwork close-ups used 135 mm close-focus Cooke lenses, sometimes with diopters; Autochrome photographs informed colour. [Direct interview](https://www.fdtimes.com/2012/02/27/6750/) | Pair a full product view with a genuinely large detail view. Use nested framing for system/part relationships and reserve stronger atmosphere for selected pages. |
| [2013](https://www.oscars.org/oscars/ceremonies/2013) | **Life of Pi — Claudio Miranda** | Restrained “through-the-window” stereo staging adjusted subject distance for emotion. Camera tests prioritized retaining water highlights; large controlled lighting areas shaped the tank environment. [Direct interview](https://britishcinematographer.co.uk/claudio-miranda-asc-life-of-pi/) | Let page purpose determine subject scale. Environmental imagery can breathe; a product proof page must reveal useful detail. Keep bright image regions clear of explanatory text. |
| [2014](https://www.oscars.org/oscars/ceremonies/2014) | **Gravity — Emmanuel Lubezki** | Virtual lighting and a large LED light box coordinated live faces with the intended environment. Matching foreground and background illumination was central to the composite. [ASC](https://theasc.com/post/parallax-view/emmanuel-lubezki-ponders-virtual-cinematography/) | Coordinate product cutouts, backgrounds and shadows. Keep a shared spatial frame when explanatory states change. |
| [2015](https://www.oscars.org/oscars/ceremonies/2015) | **Birdman — Emmanuel Lubezki** | Handheld/Steadicam movement, actor blocking and practical lighting served the continuous-shot experience. The path was prepared around the story and performance. [ARRI interview](https://www.arri.com/news-en/emmanuel-lubezki-asc-amc-on-birdman-) | Specify what the audience should notice first, second and third before choosing transitions. Carry an important object into the next explanatory state. |
| [2016](https://www.oscars.org/oscars/ceremonies/2016) | **The Revenant — Emmanuel Lubezki** | Natural light and period firelight, wide lenses and extended mobile takes connected people with their environment and maintained a chosen point of view. [ASC](https://theasc.com/article/wrap-shot-the-revenant/) | Enlarge the subject while retaining useful context. A mechanism close-up should preserve the essential incoming and outgoing relationships. |
| [2017](https://www.oscars.org/oscars/ceremonies/2017) | **La La Land — Linus Sandgren** | Wide framing preserved full-body choreography. Storyboards and rehearsals coordinated camera and movement. Overexposure with one-stop pull processing softened contrast; colour and localized light supported emotional shifts. [Direct interview](https://britishcinematographer.co.uk/linus-sandgren-fsf-la-la-land/) | Arrange related information across a horizontal stage. Keep a demonstrated gesture/control/result intact. Use a chapter colour script while preserving data-category colours. |
| [2018](https://www.oscars.org/oscars/ceremonies/2018) | **Blade Runner 2049 — Roger Deakins** | Architecture, silhouettes and carefully placed pools of light shaped the composition. Lighting and space were designed together, including moving reflections in Wallace's environment. [ASC](https://theasc.com/article/uncanny-valley-blade-runner-2049/) | Give the main product or active mechanism a clear silhouette and dominant region. Limit bright competing accents and unnecessary card borders. |
| [2019](https://www.oscars.org/oscars/ceremonies/2019) | **Roma — Alfonso Cuarón** | Alexa 65 colour capture was finished in monochrome. Wide framing balanced foreground and background as mutually informative layers, with a sharp, naturalistic look. [ASC](https://theasc.com/article/roma-memories-of-mexico/) | Use a spacious system overview with deliberate near/far informational relationships. Establish hierarchy through geometry and tone, including in grayscale. |
| [2020](https://www.oscars.org/oscars/ceremonies/2020) | **1917 — Roger Deakins** | The continuous experience used compact large-format capture and several movement rigs. Deakins reports about 99% on a 40 mm Signature Prime, with specific exceptions serving spatial needs. [ARRI interview](https://www.arri.com/news-en/the-immersive-camera-movement-of-1917-) | Keep the viewer oriented through an explanation: stable objects, directions and scale relationships; change the viewpoint only for a reason. |
| [2021](https://www.oscars.org/oscars/ceremonies/2021) | **Mank — Erik Messerschmidt** | A monochrome RED Helium and higher T-stops supported deep focus. Texture, definition and depth compensated for the absence of colour separation. [ASC](https://theasc.com/article/mank/) | Make hierarchy work in grayscale before introducing accents. Keep secondary references readable through spacing and weight rather than blur or extremely faint text. |
| [2022](https://www.oscars.org/oscars/ceremonies/2022) | **Dune — Greig Fraser** | Selected IMAX sequences expanded the frame while the film was also composed for 2.39:1. Directional light, monumental space and subtle colour differences created depth. [ASC](https://theasc.com/article/dune-fear-is-the-mind-killer/) | Allocate enough space for a large primary figure. Use small context elements to explain scale. Compose separately for each delivery frame. |
| [2023](https://www.oscars.org/oscars/ceremonies/2023) | **All Quiet on the Western Front — James Friend** | Wide large-format views, detailed storyboards and a mainly single-camera approach organized the viewer's position. Selected colour events, including yellow smoke, interrupted a restrained environment. [ASC](https://theasc.com/article/back-to-the-battlefield-all-quiet-on-the-western-front/) | Define the viewpoint and active path before assigning emphasis. Give strong accent colour to the significant change rather than every node and metadata label. |
| [2024](https://www.oscars.org/oscars/ceremonies/2024) | **Oppenheimer — Hoyte van Hoytema** | 65 mm/IMAX photography also served intimate close-ups. Modified close-focus and macro optics supported faces and scientific imagery; monochrome and colour distinguished narrative perspectives. [Kodak interview](https://www.kodak.com/en/motion/blog-post/oppenheimer/) | Alternate whole-product views with enlarged critical details. Distinguish information perspectives consistently and with labels, preserving data meaning. |
| [2025](https://www.oscars.org/oscars/ceremonies/2025) | **The Brutalist — Lol Crawley** | 8-perf VistaVision served architecture and intimate scenes. Naturalistic lighting and selective push processing retained texture; space was lit for blocking and longer takes. [Kodak interview](https://www.kodak.com/en/motion/blog-post/the-brutalist/) | Use strong structural axes, broad figure areas and deliberate boundaries. Put texture in optional imagery or chapter surfaces while keeping data and labels crisp. |
| [2026](https://www.oscars.org/oscars/ceremonies/2026) | **Sinners — Autumn Durald Arkapaw** | Ultra Panavision 65 mm and IMAX capture used different frame shapes. Arkapaw explicitly describes centering important subjects to support reframing for 2.76:1. [ASC](https://theasc.com/article/sinners-big-bold-blues-and-blood/) | Protect the subject across output frames. Preserve a centered hero when appropriate; distinguish intentional central prominence from accidental central crowding. |

### Attribution and interpretation boundaries

Fiore's live-action work is not the sole source of Avatar's virtual-world design. Lighting, production design, visual effects, direction and editing are collaborative disciplines across these films. This roadmap credits documented photography methods without assigning an entire film's art direction to its cinematographer.

No cited interview proposes a slide citation system. The compact source layer proposed here is our translation of compositional hierarchy into product design.

F-shaped reading is an observation about certain web-reading behaviour, not a universal rule for a presentation. NN/g itself describes it as a rough general shape rather than a pixel-perfect pattern. [Original research](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/).

## 3. A small design vocabulary to implement

### 3.1 Page purpose before coordinates

Require one concise visual purpose per scene:

| Purpose | Main visual task | Useful composition options |
|---|---|---|
| Explain | Understand a relationship or mechanism. | Left explanation/right diagram; full-width diagram with short aligned notes. |
| Show product | Recognize the object and its important quality. | Large right hero; centered hero with short left or lower caption. |
| Show detail | Inspect a specific feature. | Large detail plus small locator overview; linked overview/detail sequence. |
| Compare | Recognize meaningful differences. | Equal-scale paired views; shared-axis charts; aligned criteria. |
| Present evidence | Understand the measured finding. | Wide plot with compact interpretation; benchmark with explicit units and qualifiers. |
| Overview | Understand the whole system. | Full-width map with current subsystem emphasized. |
| Chapter or conclusion | Establish a pause, change of subject or memorable statement. | Deliberate center, asymmetrical low anchor or large type. |

A page may have one primary focus group containing both a statement and a hero; “one focus” does not mean that only one element can be visible.

### 3.2 Visual roles

Separate `primary`, `supporting`, `reference` and `ambient` roles. Define typography, contrast, area and placement for each role. A theme should not turn every role into a bold card.

Use real whitespace to separate groups. Balance means the visible masses feel intentional; it does not require equal text lengths, equal object counts or equal pixel occupancy in every column.

A left-to-right explanation should keep DOM order, keyboard order and visible reading order coherent. Narrow reading view should reflow this order rather than shrink a desktop page.

### 3.3 Source presentation

Use three levels:

1. **On the main canvas:** stable source markers and a brief source strip; units, observation period and material qualifiers remain near the claim or chart.
2. **On demand:** a keyboard-accessible reference panel with full titles, exact authored citation text, URLs, dates and relevant locators. Include a clear return to the original claim.
3. **In delivered files:** public reference pages/appendices and links, with full notes where supported. Speaker notes remain separately controlled; do not rely on private notes as the only way an audience can inspect evidence.

Retain author attribution beside a verbatim quotation. Treat a method limitation or “illustrative, not measured” label as meaning-bearing content, not expendable bibliography. If a source is itself the subject of the slide, allow a deliberate prominent source layout.

Prefer stable source IDs and claim IDs. A display number may be derived by deck order; stable internal anchors must survive reorder and replacement. Deduplicate by identity without merging distinct editions or specific locators.

## 4. Suggested 16:9 composition starting points

These values are configurable starting hypotheses for a 1440 × 810 scene, not aesthetic laws.

| Parameter | Starting point | How to judge it |
|---|---|---|
| Safe margins | Approximately 56–72 px, adjusted by theme. | No clipped labels or crowded edges; a deliberate shared alignment axis. |
| Grid | 12 columns; 24–40 px gutters as content allows. | A consistent relationship between primary and supporting regions. |
| Left explanation/right product | Approximately 5 columns / 7 columns. | The title leads into the product; the product is visibly the subject. |
| Hero image region | Approximately 50–65% of usable content width on a product page. | Measure both container and actual subject. Tall/narrow products require exceptions. |
| Main mechanism | Approximately 65–80% of usable content width where its complexity warrants it. | Labels remain readable; relevant connections are intact. |
| Bibliography strip | Normally 1–2 lines, approximately 4–6% of canvas height. | Full references remain retrievable; qualifiers are counted separately. |
| Supporting text | A short lead plus 2–3 meaningful points when the content supports it. | Do not truncate or rewrite an author's claim merely to meet a quota. |
| Canvas height | Fixed 810 px for this presentation target. | Reflow, redistribute or split before whole-scene scaling makes text too small. |
| Type acceptance | Define minimum delivered sizes per role and target; begin with body approximately 18 pt, meaningful figure labels 14–16 pt, compact reference tokens approximately 10–12 pt in PPTX. | These are initial product defaults to calibrate in real projected/readable output. Low-density reading PDF may use a different policy. |

The typography values are acceptance proposals, not claims about current font sizes or a universal accessibility standard. Map design pixels to physical output units explicitly; do not use a DOM font-size value as proof of final PowerPoint readability.

**Example:** A product-explanation page can place its title and brief interpretation in the left five columns, the whole product or main mechanism in the right seven columns, and one compact reference strip across the bottom. A subsequent detail page can devote most of the canvas to one important component, with a small locator view keeping the reader oriented.

When an image fills 55% of a page but its subject occupies only 20% of that image, the visible subject occupies about 11% of the page before other geometric effects. This arithmetic explains why measuring only the outer image box can reward an ineffective “large image.”

## 5. Prioritized modular implementation plan

The **CINE** identifiers below are proposal work-package labels only. They are not existing repository task statuses. On acceptance, nest them under the corresponding current VIS/S/DW work rather than create a competing roadmap.

### Priority overview

| Order | Priority / package | Outcome | Existing work to extend |
|---|---|---|---|
| 1 | P0 · CINE-001 | Target-specific canvas and delivery readability | VIS-016/S7, VIS-014/S6, DW-130 |
| 2 | P0 · CINE-002 | Compact references with intact provenance | VIS-002/003/004, VIS-013/S9a, VIS-016 |
| 3 | P0 · CINE-003 | Explicit visual intent, hierarchy and reading entry | VIS-006/S3, VIS-013/S9a |
| 4 | P0 · CINE-004 | Adequate primary image/diagram space | VIS-006/007/008 |
| 5 | P1 · CINE-005 | Subject-safe framing and separate captions | VIS-007 |
| 6 | P1 · CINE-006 | Typography and grayscale hierarchy | VIS-015/S8, DW-130 |
| 7 | P1 · CINE-007 | Aesthetic candidate evaluation and release corpus | VIS-010, VIS-014 |
| 8 | P2 · CINE-008 | Shot-scale and page-sequence planning | Storyboard/planning, VIS-006 |
| 9 | P2 · CINE-009 | Stable explanatory motion and state continuity | VIS-009/S5, S9b/DWD-210, DW-120 |
| 10 | P2 · CINE-010 | Cinematic methods in existing theme profiles | VIS-015/S8 |
| 11 | P3 · CINE-011 | Author feedback and understandable art-direction controls | VIS-013/S9a, DWD-200 |
| 12 | P3 · CINE-012 | Optional atmospheric/spatial refinements | EXP-001 |

### CINE-001 — Target-aware canvas layout

**Purpose:** Stop excessive web height from shrinking the entire delivered slide.

**Change existing:** `src/design/rhythm.mjs`, `src/targets/layout.mjs`, `src/targets/pptx/ooxml.mjs`, `src/targets/pptx/compile.mjs`, `src/targets/pdf/print.mjs`, target schemas and quality gates. Consider a small new `src/layout/target-budget.mjs` if needed.

**Contract:** A derived target declares frame dimensions, safe area, typography minima and overflow policy. Reading and presentation derive from the same semantic document. Compare output scale to the target's normal pixel-to-unit mapping, not to a meaningless universal “scale equals one.”

**Behaviour:** Measure at the target; try feasible region reallocation, a compatible composition, moving eligible supplemental material, or a coherent split. Preserve facts, source links and locks. If no valid option remains, return an actionable layout failure. Existing uniform mapping can remain as a final unit transform, but cannot silently solve semantic overflow through arbitrarily small type.

**Acceptance:** A frozen long-content fixture produces readable web/PDF/PPTX compositions with complete content. Validate delivered typography and object bounds. Repeated export is deterministic. Explicit migrations preserve older projects.

**Dependency:** None. Begin the regression corpus here.

### CINE-002 — Reference display policy

**Purpose:** Free the main canvas and make the claim-to-source relationship clearer.

**Change existing:** `schemas/presentation-v3.schema.json` and `schemas/design-plan.schema.json` as applicable, `src/design/plan.mjs`, `src/render/web/components/blocks.mjs`, `src/render/web/document.mjs`, `src/render/web/art-direction.mjs`, `src/quality/render-checks.mjs`, `src/targets/static-delivery.mjs` and source-note exporters. Consider a new `src/references/presentation.mjs` for shared projection logic.

**Contract:** Preserve canonical source and claim identity. Add explicit display policy and separate full citation content from compact displayed labels. Keep quote attribution and material qualifiers on their associated page. Do not simply add “citation” to generic hidden block types without updating validation, source coverage, exports and interaction behaviour.

**Behaviour:** One source strip per scene; a full reference panel and audience-visible export appendix. The renderer chooses a compact representation; it does not delete or paraphrase canonical source evidence. Correct or absent source linkage is reported independently of presentation style.

**Acceptance:** With 1, 4 and 12 references, all source records and exact citation text remain retrievable and correctly associated after reordering, export and reload. Long URLs do not enlarge the main composition. Keyboard opening/closing restores focus. No-JavaScript reading still exposes full references. Private notes stay private.

**Dependency:** CINE-001 for target budgets; schema planning can run in parallel.

### CINE-003 — Visual intent and reading-path policy

**Purpose:** Replace accidental central clustering with deliberate staging.

**Change existing:** `src/design/art-direction.mjs`, `src/design/compositions.mjs`, `src/design/plan.mjs`, `src/design/rhythm.mjs`, `src/scene/web/compile.mjs`, `src/render/web/compositions.mjs`, `src/render/web/art-direction.mjs` and `src/workbench/author-actions.mjs`.

**Contract:** Page purpose, primary object/focus group, entry region, supporting order and intentional negative-space regions. Reuse current `focalBlockId` and `readingOrder` instead of creating conflicting alternatives. Any richer visual-intent contract must explain their relationship.

**Behaviour:** An image counts as a visual subject. Sparse content no longer implies vertical centering. Ordinary explanatory pages prefer a clear left entry, coherent lateral relationship and appropriately sized primary region. Centered title/quote/product-reveal layouts remain available. Three-thirds and golden-section anchors can be candidate templates, never mandatory coordinates.

**Acceptance:** A fixed corpus includes deliberate left-entry, intentional-center, paired comparison and overview pages. DOM and visual order remain coherent at 390 px. A long citation cannot become the focal block. Author locks survive theme and source updates.

**Dependency:** CINE-001; coordinate reference role with CINE-002.

### CINE-004 — Primary media and diagram area

**Purpose:** Make the central product or mechanism large enough to understand.

**Change existing:** `src/render/web/art-direction.mjs`, `src/render/web/compositions.mjs`, `src/components/diagrams/render.mjs`, `src/design/compositions.mjs`, `src/assets/slots.mjs` and measured author actions.

**Contract:** Separate source resolution from rendered dimensions. Give the main figure a role-specific size intent and reserve space before allocating secondary text.

**Behaviour:** Replace relevant fixed caps with target- and content-aware constraints. Measure the final label size for diagrams. Product hero, contextual landscape and supporting thumbnail can use different scale policies. Offer existing author controls an appropriately measured “Give visual more space” action.

**Acceptance:** A white-margin product photo, a tall product, a four-part mechanism and a dense mechanism all preserve their protected information. A sparse overview can retain intentional empty space. A diagram must not pass merely because the SVG container is wide while labels are unreadable.

**Dependency:** CINE-001 and CINE-003.

### CINE-005 — Subject-aware framing and image text

**Purpose:** Refine the area reservation with reliable framing.

**Change existing:** `src/assets/brief.mjs`, `src/assets/crop.mjs`, `src/assets/slots.mjs`, asset schemas, `src/render/web/components/blocks.mjs`, and target media compilation.

**Contract:** Authored `subjectBounds`, protected regions, optional context region, visible caption, alt description and optional detail locator. Existing focal and protected crop fields remain authoritative during migration.

**Behaviour:** Start with simple author-drawn bounds and deterministic crop suggestions. Automatic subject detection is optional later. Contextual images can retain surroundings; evidence screenshots and diagrams may forbid destructive crops. A short caption can accompany a richer alt description.

**Acceptance:** Cropping respects protected regions and relevant relationships. A missing subject annotation yields an explicit conservative policy, not fictional detection. Visible caption edits do not erase alt text. The same subject is preserved in alternate output frames.

**Dependency:** CINE-004.

### CINE-006 — Typography and luminance hierarchy

**Purpose:** Make emphasis visible even without colour.

**Change existing:** `src/design/theme-registry.mjs`, `src/design/art-direction.mjs`, `src/render/web/themes.mjs`, `src/render/web/contrast.mjs`, theme JSON files and actual font measurement.

**Contract:** Distinct title, lead, body, figure-label, reference and numeric roles. Separate semantic data colours from chapter mood colours.

**Behaviour:** Reduce competing borders, repeated frames and redundant captions. Fit typography by choosing an appropriate composition and text role. Preserve local font fallback and Chinese line-breaking behaviour. Background texture and glow do not cross meaningful text or chart detail.

**Acceptance:** Grayscale screenshots retain a clear primary subject and legible secondary content. The actual exported type sizes satisfy the target policy. Missing font/glyph conditions remain visible failures. Data meanings survive a theme change.

**Dependency:** CINE-001–004.

### CINE-007 — Aesthetic evaluation and acceptance

**Purpose:** Make “looks good” reviewable without pretending to measure human attention exactly.

**Change existing:** `src/render/web/runtime.mjs`, `src/quality/render-checks.mjs`, `src/quality/visual-review.mjs`, `src/quality/repair-plan.mjs`, `src/design/rhythm.mjs` and release gates.

**Hard gates:** Content/source preservation, safe crops, typography minima, geometry, contrast, readable labels, working reference links, current render evidence and target fit.

**Soft features:** Primary-subject area, reference-strip height, grouping, alignment, entry clarity, competing accents, relationship between title and figure, and sequence continuity. Document feature definitions and exceptions. A bounding-box proxy must not be named “eye tracking.”

**Selection:** Rank feasible candidates with calibrated preferences and show the three genuinely different alternatives already supported by the product. Record why each differs. Do not optimize solely for global density or penalize all repeated compositions; repeated geometry can serve a coherent comparison.

**Acceptance:** Same semantic corpus, images, theme, viewport and output targets in each A/B comparison. A small author/user preference exercise tests main-message recall, primary-subject identification and source retrieval. Screenshot judgment remains part of the gate. Inspect the weakest page, not just a deck average.

**Dependency:** Baseline in CINE-001; full ranking after CINE-003–006.

### CINE-008 — Shot scale and narrative sequence

**Purpose:** Give the whole deck a designed rhythm.

**Change existing:** `src/planning/storyboard.mjs`, `src/planning/argument-units.mjs`, `src/design/rhythm.mjs`, `src/design/chapters.mjs` and `src/agent/director.mjs`.

**Contract:** Optional overview/detail/comparison/conclusion purpose, stable object identity and sequence grouping, tied to current semantic blocks.

**Behaviour:** A product story might proceed: real context → whole product → important detail → mechanism → evidence → next action. Preserve spatial orientation and data-category colour across related pages. Use chapter pauses when the subject changes. Do not pad a deck to satisfy a cinematic sequence if fewer pages tell the story.

**Acceptance:** Each adjacent pair communicates why the view changes. The same object remains identifiable after a close-up. A paired data comparison retains scales and category mappings. Existing content and plan locks are respected.

**Dependency:** CINE-003–007.

### CINE-009 — Explanatory continuity and motion

**Purpose:** Move attention when explanation requires it.

**Change existing:** `src/motion/blueprint.mjs`, `src/motion/cues.mjs`, `src/motion/primitives.mjs`, `src/motion/timeline.mjs`, `src/render/web/static-state.mjs` and current semantic runtime.

**Behaviour:** Support overview-to-detail, active-path emphasis and a returning object. Use the existing clock and Explain → Diagram → Explore states. Strengthen the initial Explain composition, whose existing S9b report identified a weak empty lower region. Avoid introducing a second timing system. Reduced-motion and no-JavaScript paths carry the same meaning.

**Acceptance:** The viewer can follow the object and identify the changed part. Static export contains the complete explanation. Focus and keyboard actions do not change slides unintentionally. Motion can be disabled. Freeze and check the actual export state.

**Dependency:** CINE-008, existing DW-120 and S9b requirements.

### CINE-010 — Film-informed profiles within current themes

**Purpose:** Make cinematographic methods reusable without multiplying unrelated skins.

**Change existing:** `src/design/design-profile.mjs`, `src/design/theme-registry.mjs`, `src/design/art-direction.mjs`, `src/render/web/themes.mjs`, `themes/*/theme.json` and the existing design reference register.

**Suggested profile directions:**

| Current design surface | Methods to borrow |
|---|---|
| Silver Gray Editorial / editorial layouts | Roma's layered observation, Mank's tonal hierarchy, The Brutalist's structural axes. |
| Fresh Report / evidence layouts | Mank's clear depth without colour, Oppenheimer's overview/detail contrast, explicit analytical figure priority. |
| Orange Launch / product chapters | La La Land's horizontal staging, Blade Runner 2049's controlled bright regions, large product reveals. |
| Dark Data | Clear silhouette, restrained accent paths and dominant figures. |
| Cream Collage | Humane context, restrained material and carefully scaled imagery. |
| Electric Violet | Controlled focal colour and continuity through mechanism states. |

These are adjustable grammar choices, not exact film palette copies. Existing proposed T04 Kinetic Proof and T05 Human Documentary can use the research when their implementation is justified.

**Acceptance:** The same content remains recognizable and accurate in all applicable profiles. The author can tell what changed besides colour. No source role becomes primary merely because the theme applies an accent.

**Dependency:** CINE-006–009.

### CINE-011 — Clear author controls and preference learning

**Purpose:** Let the user request visible changes in ordinary language.

**Change existing:** `public/studio/author.js`, `public/studio/visual.js`, `src/workbench/author-actions.mjs`, `src/design/design-profile.mjs` and current profile storage.

**Behaviour:** Extend existing controls with brief commands such as “Larger visual,” “Quieter references,” “More space between groups” and “Show the detail.” Provide measured alternatives, a short explanation, preview and undo. Advanced anchors/subject bounds can sit behind a focused inspector. Retain existing local author preferences and scoped locks.

**Acceptance:** A user can improve the problem page without knowing a film title, CSS property or internal task ID. Chosen preferences do not overwrite protected facts or sources. Learning is opt-in and scoped to actual author feedback.

**Dependency:** Basic controls ship with their related P0/P1 work; preference refinement follows CINE-007–010.

### CINE-012 — Optional atmospheric and spatial refinements

**Purpose:** Add expressive depth after the composition system is reliable.

**Scope:** Carefully art-directed product backgrounds, restrained material texture, limited parallax or spatial transitions, and reference-informed media briefs. Keep this within EXP-001 and existing media capability boundaries.

**Behaviour:** Apply atmosphere to appropriate image/brand regions. Preserve clean text, charts, labels and source controls. Use existing source assets or independently created assets suited to the page; document references without redistributing film footage or proprietary production assets.

**Acceptance:** Disabling atmosphere preserves the full argument and high-quality composition. Reduced motion, static output and offline behaviour remain dependable. Any additional dependency or provider has an explicit measured benefit and follows existing opt-in rules.

**Dependency:** All P0/P1 acceptance complete; P2 identity and motion contract stable.

## 6. Implementation contract sketch

This sketch describes proposed responsibilities. It is **not** an object accepted by the current schemas and should not be pasted into a current saved project without a versioned migration.

```ts
type VisualPurpose =
  | "explain" | "show-product" | "show-detail"
  | "compare" | "evidence" | "overview" | "chapter";

type VisualIntent = {
  purpose: VisualPurpose;
  primaryBlockId: string;       // Reconcile with current focalBlockId.
  focusGroupBlockIds?: string[];
  entry: "left" | "center" | "contextual";
  readingOrder: string[];       // Reuse the derived scene's existing order.
  intentionalEmptyRegions?: NormalizedRect[];
  sequenceObjectId?: string;
};

type ReferencePresentation = {
  mode: "compact" | "expanded" | "source-is-subject";
  sourceIds: string[];          // Canonical records stay intact.
  claimBindings: Array<{ blockId: string; sourceIds: string[] }>;
  fullReferenceDestination: "panel-and-appendix";
};

type MediaIntent = {
  blockId: string;
  role: "hero" | "mechanism" | "context" | "supporting";
  subjectBounds?: NormalizedRect;
  protectedRegions: NormalizedRect[];
  contextRegion?: NormalizedRect;
  visibleCaption?: string;     // Separate from the block's alt description.
  targetWidthFraction?: number;
};

type NormalizedRect = {
  x: number; y: number; width: number; height: number;
};
```

Keep content, design intent, measured scene and exporter separate. Any new scene field must be represented consistently in validation, migration, derived output, lock behaviour, storage, snapshots and exports. Do not create a second parallel source store.

## 7. A six-page product sequence to use as a design fixture

Use real project content when available. If data is synthetic, label it on the affected evidence page and keep that label visible.

| Page | Viewer question | Composition | Cinematographic method translated |
|---|---|---|---|
| 1. Context | What problem am I looking at? | Broad context image or map with one short left-entry statement. | Roma / The Revenant: context informs the subject. |
| 2. Product | What is the product? | Large hero in a 5/7 arrangement or deliberate centered reveal. | Dune / Sinners: scale and frame chosen together. |
| 3. Detail | Which part matters? | Enlarged feature, small locator view, one aligned explanation. | Hugo / Oppenheimer: close-up reveals otherwise invisible meaning. |
| 4. Mechanism | How does it work? | Wide mechanism, stable node positions, one active relationship at a time. | Birdman / 1917: continuity through a chosen path. |
| 5. Evidence | What supports the claim? | Dominant plot with units and material conditions; compact sources. | Mank / Blade Runner 2049: hierarchy through tone and controlled emphasis. |
| 6. Action | What should happen next? | Short conclusion with deliberate whitespace and one clear action. | La La Land: a resolved visual beat. |

This is a testable product narrative, not a prescription that all decks need six pages.

## 8. Verification and release criteria

Extend existing fixtures and tests rather than duplicate the entire test framework:

- `tests/composition-families.test.mjs` and `tests/browser_compositions.mjs`.
- `tests/assets-visual.test.mjs`.
- `tests/visual-quality.test.mjs`.
- `tests/export-targets.test.mjs` and `tests/studio-export.test.mjs`.
- `tests/s9a-author-controls.test.mjs` and `tests/s9b-blueprint-a.test.mjs`.

Confirm the exact current test paths before implementation.

### Frozen content corpus

Include 1/4/12 sources with long titles; a hero image with large blank margins; a tall product; an evidence screenshot that must not be cropped; a mechanism with important boundary nodes; shared-axis comparison charts; a deliberate centered title; long English and Chinese headings; quote attribution; and a page where a method limitation affects interpretation.

Use the same semantic source and asset set across old/new candidates. Separate changed content from changed composition in the report.

### Measured targets

- 1440 × 810 presentation.
- A 1024 px desktop window.
- A 390 px reading view that reflows.
- Standalone no-JavaScript HTML.
- Generated PDF and editable PPTX at their actual page size.
- Real PowerPoint and Keynote when available; report their absence explicitly rather than claiming native compatibility.

### Passing means

1. Facts, values, citations and protected assets are preserved.
2. Main subject and meaningful labels can be understood at the delivery size.
3. Full sources remain discoverable, correctly linked and available in static outputs.
4. Explanatory reading order is coherent; intentional central/empty layouts remain valid.
5. Reference information does not repeatedly divide the main canvas into heavy full-width sections.
6. Reading and presentation targets receive appropriate geometry.
7. A sequence retains object identity and finishes in a complete static state.
8. The author can prefer one of the measured alternatives and explain the benefit.
9. The weakest page has been inspected.
10. Existing host, privacy, offline, keyboard and font guarantees remain intact.

Automated ratios are diagnostic signals, not aesthetic truth. A landscape may intentionally use a small subject; a source-analysis page may intentionally feature citations; a chapter pause may intentionally use a central title. Evaluate against declared page purpose.

## 9. Suggested first implementation batch

Start with CINE-001 through CINE-004, using a small fixed corpus. This addresses the three reported symptoms and the export problem that amplifies them.

A useful first release should visibly achieve:

- One explanatory page with a clear left-entry statement and a large right-side product or mechanism.
- One intentional centered hero, demonstrating that centering is still available.
- One evidence page with 12 complete sources accessible through compact markers and an appendix.
- One overflow case resolved through a measured composition or coherent split.
- One full product → detail → mechanism sequence with legible exported text.

After those pass, introduce subject-aware framing, tonal hierarchy and calibrated candidate scoring. Add sequence motion and atmosphere only after their static compositions are convincing.

### Copyable Codex / Claude Code implementation brief

```text
Work in FeidaWang/DeckWeft. Read AGENTS.md, README.md, ROADMAP.md,
roadmap.json and docs/en/verification.md. Recheck current main against
research baseline 9771bf46e20b982ca7ca1d73e018a3b51bca89ef.

Implement the accepted P0 work from
DeckWeft-Cinematic-Design-Roadmap-2026-10-19.md:
CINE-001 target-specific presentation layout,
CINE-002 compact reference presentation,
CINE-003 explicit visual intent and reading-path policy,
CINE-004 primary media and diagram area.

Extend existing VIS/S/DW modules. Do not rebuild the existing composition,
crop, rhythm, source-note, author-control or export systems from scratch.
Keep source facts, datasets, source anchors, author locks and original
assets intact. Version schema changes explicitly and migrate legacy input
without silent repair.

Use fixed 16:9 target layout and final-output font/object measurements.
Do not solve excessive height by silently shrinking the whole scene.
References must retain exact source content, correct claim associations,
accessible lookup and audience-visible static appendices. Keep material
qualifiers near claims and quote attribution near quotations.

Start with a frozen regression corpus and meaningful target-specific
tests. Inspect the rendered audience pages and exported files. Run the
repository-required verification gates for the actual changes. Record
which native applications were available; do not claim PowerPoint or
Keynote acceptance from XML checks alone.

English is primary in code and documentation. Keep the separate Chinese
documentation accurate. Preserve existing license, offline and opt-in
provider rules. Update roadmap status only with evidence.
Do not publish, merge, deploy or send external messages unless authorized.
```

## 10. Repository roadmap reconciliation

Retain the existing work and its status boundaries:

- **DW-130:** actual font measurement already exists locally. Extend it to delivered target typography.
- **DW-120:** preserve keyboard, narrow view and reduced-motion behaviour while new reference controls are added.
- **DW-020:** host acceptance remains separate; some real Codex CLI evidence exists, while other host gates remain incomplete. It need not block design research or independent layout work.
- **VIS-006/S3:** extend families, candidates and rhythm.
- **VIS-007:** extend protected cropping and slots.
- **VIS-008/S4:** improve chart/diagram visual priority and label geometry.
- **VIS-009/S5/S9b:** use the current semantic clock and state system.
- **VIS-013/S9a:** extend existing author controls, reusable preferences and locks.
- **VIS-014/S6:** bring target readability and weakest-page review into release acceptance.
- **VIS-015/S8:** extend current profiles and themes; T04/T05 remain proposed at this baseline.
- **VIS-016/S7:** strengthen target geometry and native-application inspection.
- **EXP-001:** keep atmospheric/spatial experimentation later.

Some older remaining-task paragraphs lag newer S9a code and evidence, including clauses about profile promotion and Studio export options. Reconcile status using current implementation and the latest evidence for that specific capability.

## Final design principle

Build a page as a composed scene: a subject with enough scale, a meaningful relationship to its context, a clear route through supporting information, and references that remain trustworthy and easy to inspect. Build the deck as a sequence of such scenes, with deliberate changes of scale and emphasis.

