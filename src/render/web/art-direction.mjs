// Shared by editor previews, non-interactive thumbnails and standalone audience HTML.
const QUOTE=':is(.quote-center,.quote-split,.quote-band)',PAIR=':is(.before-after-split,.before-after-rail,.before-after-triptych)',MAP=':is(.system-map-wide,.system-map-rail,.system-map-key)',PANELS=':is(.small-multiples-row,.small-multiples-lead,.small-multiples-center)',CHAPTER=':is(.chapter-low,.chapter-index,.chapter-margin)',CLOSING=':is(.closing-split,.closing-steps,.closing-focus)';
// S3 families. Verbatim quotation uses the display role; paraphrase stays body text; the attribution sits directly under its quote.
const s3ArtDirectionCSS=`
.web-scene${CHAPTER} h2{max-width:13ch}
.web-scene.chapter-low .regions{align-content:end;column-gap:72px}
.web-scene:is(.chapter-low,.chapter-margin) .region[data-component=paragraph] p{font-size:var(--lead-size);max-width:32ch}
.web-scene:is(.chapter-index,.chapter-margin) .region[data-component=list] ul{list-style:none;padding:0}
.web-scene:is(.chapter-index,.chapter-margin) .region[data-component=list] li{border-top:1px solid currentColor;padding-top:12px}
.web-scene.chapter-index .region[data-component=list] ul{font-size:var(--lead-size);line-height:1.3}
.web-scene:is(.chapter-low,.chapter-margin) .region[data-component=list] ul{font-size:16px;line-height:1.5}
.web-scene${PAIR} .regions{align-content:center;column-gap:40px;row-gap:16px}
.web-scene:is(${PAIR.slice(4,-1)},${MAP.slice(4,-1)},${PANELS.slice(4,-1)}) .folio{margin-bottom:32px}
.web-scene:is(${PAIR.slice(4,-1)},${MAP.slice(4,-1)},${PANELS.slice(4,-1)}) .region[data-component=citation]{margin-top:12px;padding-top:12px}
.web-scene${PAIR} h2{max-width:24ch}
.web-scene.before-after-split .web-image{width:min(100%,calc(300px * var(--image-aspect)))}
.web-scene.before-after-rail .web-image{width:min(100%,calc(240px * var(--image-aspect)))}
.web-scene.before-after-triptych .web-image{width:min(100%,calc(340px * var(--image-aspect)))}
.web-scene${PAIR} .region[data-component=paragraph] p{font-size:18px;max-width:40ch}
.web-scene.before-after-triptych .region[data-component=paragraph]{border-top:1px solid currentColor;padding-top:14px}
.web-scene${MAP} .regions{align-content:center;row-gap:16px;column-gap:48px}
.web-scene${MAP} h2{max-width:20ch}
/* CINE-004: a mechanism diagram takes 65–80 % of the 1312 px content width. */
.web-scene.system-map-wide .semantic-diagram svg{max-width:1040px;margin:0 auto}
.web-scene.system-map-key .semantic-diagram svg{max-width:800px;margin-left:auto}
.web-scene.system-map-wide .region[data-component=list] ul{columns:3;column-gap:40px;max-width:none}.web-scene.system-map-wide .region[data-component=list] li{break-inside:avoid}
.web-scene${MAP} .region[data-component=paragraph] p{font-size:18px;max-width:42ch}
.web-scene${MAP} .region[data-component=list] ul{font-size:16px;line-height:1.5}
.web-scene${PANELS} .regions{align-content:center;row-gap:14px;column-gap:40px}
.web-scene${PANELS} h2{max-width:22ch}
.web-scene${PANELS} .region[data-component=paragraph] p{font-size:18px;max-width:46ch}
.web-scene.small-multiples-lead .region[data-component=paragraph]{border-left:1px solid currentColor;padding-left:24px}
.web-scene${PANELS} .chart svg{max-height:300px}
.web-scene.small-multiples-center [data-component=heading]{justify-self:center;text-align:center}
.web-scene.small-multiples-center [data-component=paragraph]{justify-self:end;text-align:right}.web-scene.small-multiples-center [data-component=paragraph] p{margin-left:auto}
.web-scene${QUOTE} blockquote{font-family:var(--display);font-size:clamp(30px,3vw,44px);line-height:1.2;letter-spacing:-.015em;max-width:24ch;margin:0;border-left:0;padding-left:0}
.web-scene${QUOTE} blockquote::before{content:"\\201C" / "";display:block;font:400 112px/.75 var(--display);color:var(--accent);margin-bottom:6px}
.web-scene${QUOTE}:lang(zh-CN) blockquote{line-height:1.45;letter-spacing:0;max-width:17em}
.web-scene.quote-band blockquote{max-width:34ch;border-block:2px solid var(--accent);padding:24px 0 28px}
.web-scene${QUOTE} [data-component=quote]+[data-component=citation]{margin-top:0;padding-top:4px;border:0}
.web-scene${QUOTE} [data-component=quote]+[data-component=citation] .citation{font-size:16px;line-height:1.5;font-weight:600}
.web-scene${QUOTE} [data-component=quote]+[data-component=citation] .citation::before{content:"— " / ""}
.web-scene${QUOTE} .region[data-component=paragraph] p{font-size:var(--body-size);font-style:normal;max-width:42ch}
.web-scene.quote-center .region[data-component=paragraph]{border-top:1px solid currentColor;padding-top:20px;margin-top:12px}
.web-scene.quote-split .region[data-component=paragraph]{border-left:1px solid currentColor;padding-left:24px}
.web-scene${CLOSING} .regions{align-content:center;column-gap:56px}
.web-scene.closing-split .region[data-component=list] ul{list-style:none;padding:0;font-size:var(--lead-size);line-height:1.3}
.web-scene.closing-split .region[data-component=list] li{border-top:1px solid currentColor;padding-top:14px}
.web-scene.closing-steps .region[data-component=list] ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;list-style:none;padding:0;max-width:none}
.web-scene.closing-steps .region[data-component=list] li{margin:0;padding-top:18px;border-top:5px solid var(--accent);font-size:var(--lead-size);line-height:1.3}
.web-scene.closing-focus h2{max-width:18ch}
.web-scene.closing-focus .region[data-component=callout] p{font-size:clamp(26px,2.4vw,36px);max-width:30ch;margin:0 auto;border-top:4px solid var(--accent);padding-top:18px}
@media(max-width:700px){
 .web-scene:is(${CHAPTER.slice(4,-1)},${PAIR.slice(4,-1)},${MAP.slice(4,-1)},${PANELS.slice(4,-1)},${QUOTE.slice(4,-1)},${CLOSING.slice(4,-1)}) h2{max-width:100%}
 .web-scene.chapter-low .regions{align-content:start}
 .web-scene${QUOTE} blockquote{font-size:26px;max-width:100%}
 .web-scene${QUOTE} blockquote::before{font-size:72px}
 .web-scene.quote-center .regions{justify-items:stretch;text-align:left}
 .web-scene:is(.quote-split,.small-multiples-lead) .region[data-component=paragraph]{border:0;padding:0}
 .web-scene${PAIR} .web-image{width:100%}
 .web-scene.small-multiples-center .region:not([data-component=chart]){justify-self:stretch;text-align:left}
 .web-scene.small-multiples-center [data-component=paragraph] p{margin-left:0}
 .web-scene.system-map-wide .region[data-component=list] ul{columns:auto}
 .web-scene.closing-steps .region[data-component=list] ul{display:block}
 .web-scene.closing-steps .region[data-component=list] li+li{margin-top:18px}
 .web-scene.closing-focus .region:is([data-component=heading],[data-component=callout]){justify-self:stretch;text-align:left}
 .web-scene.closing-focus .region[data-component=callout] p{font-size:24px;margin:0}
}
`;
// Content stays in native regions. Neither fixed clipping nor line clamping creates a fit.
export const artDirectionCSS = `
.web-scene{min-height:810px;display:flex;flex-direction:column;padding:var(--safe-area,56px) var(--safe-area,var(--page));font-synthesis:none}
.web-scene .folio{font:600 11px/1.4 var(--body);letter-spacing:.16em;border-bottom:1px solid currentColor;padding-bottom:16px;margin-bottom:48px;gap:24px}
.web-scene .regions{flex:1;align-content:start;column-gap:var(--story-gutter);row-gap:var(--section-gap,24px)}
.web-scene h2{font-family:var(--display);font-size:var(--headline);font-weight:var(--headline-weight);line-height:var(--headline-leading);letter-spacing:var(--headline-tracking);margin:0 0 10px;text-wrap:balance}
.web-scene .region[data-component=paragraph] p,.web-scene blockquote{font-size:var(--body-size);line-height:1.55;max-width:var(--text-measure);margin:0 0 12px}
.web-scene .region[data-component=list] ul{font-size:var(--body-size);line-height:1.6;padding-left:1.1em;max-width:var(--text-measure);margin:0}
/* A verbatim quotation never looks like body text or paraphrase, in any composition. */
.web-scene blockquote{font-family:var(--display);border-left:3px solid var(--accent);padding-left:20px}
.web-scene .region[data-component=list] li+li{margin-top:12px}
.web-scene .region[data-component=callout] p{font-size:var(--lead-size);font-weight:600;line-height:1.3;letter-spacing:-.02em;max-width:32ch;margin:0;color:var(--accent)}
.web-scene .region[data-component=citation]{margin-top:20px;padding-top:var(--caption-gap,16px);border-top:1px solid currentColor;grid-column:1 / -1}
.web-scene .citation{font:400 var(--reference-size,12px)/1.6 var(--body);letter-spacing:0;max-width:90ch;margin:0}
.web-scene .web-image figcaption{font:400 var(--reference-size,12px)/1.5 var(--body);max-width:60ch;margin-top:var(--caption-gap,14px)}
.web-scene .metric strong{font-family:var(--numeric,var(--body));font-size:clamp(112px,16vw,230px);font-weight:650;letter-spacing:-.075em;line-height:.88;color:var(--accent);font-variant-numeric:tabular-nums;overflow-wrap:normal;word-break:keep-all}
.web-scene .metric strong small{font-size:.17em;line-height:1.3;letter-spacing:.03em;margin-top:24px}
.web-scene .metric span{font-size:18px;line-height:1.5;margin-top:22px;max-width:24ch}
.web-scene:lang(zh-CN){text-spacing-trim:space-all}
.web-scene:lang(zh-CN) :is(h2,.region[data-component=callout] p,.metric span){word-break:keep-all;line-break:strict}
.web-scene[data-theme=cream-collage] .metric strong{color:var(--secondary)}
/* S1 token roles consumed here (S8): numeric type role, reference and missing colours. Undeclared packs inherit the previous values. */
.web-scene .chart-value,.web-scene .chart-axis-track span,.web-scene .benchmark-table td,.web-scene .chart svg text,.web-scene .comparison-matrix td,.web-scene .comparison-rail td{font-family:var(--numeric,inherit)}
.web-scene .chart [data-reference]{stroke:var(--reference,currentColor)}
.web-scene .chart-mark[data-missing] .chart-value,.web-scene .chart-notes li[data-missing]{color:var(--missing,inherit)}
.web-scene[data-theme=electric-violet] h2{font-weight:var(--headline-weight)}
.web-scene[data-theme=dark-data] .region[data-component=paragraph] p{font-size:20px;line-height:1.65}
.web-scene[data-space=open] .regions{align-content:center;min-height:500px}
.web-scene.statement-split .regions{grid-template-columns:minmax(0,1.25fr) minmax(0,.8fr)}
.web-scene.statement-split [data-component=heading]{border:0;padding-right:0}
.web-scene.statement-split [data-component=heading] h2{max-width:12ch}
.web-scene.statement-split .region[data-component=paragraph]{border-left:1px solid currentColor;padding-left:28px}
.web-scene.statement-split .region[data-component=paragraph] p{font-size:var(--lead-size);max-width:30ch}
.web-scene.statement-banner .regions{grid-template-columns:1fr 1fr;align-content:center}
.web-scene.statement-banner [data-component=heading]{border-bottom:2px solid var(--accent);padding-bottom:40px;margin-bottom:16px}
.web-scene.statement-banner h2{max-width:18ch}
.web-scene.statement-center .regions{max-width:1120px;padding-top:0;justify-items:center;align-content:center}
.web-scene.statement-center [data-component=heading] h2{max-width:19ch}
.web-scene.statement-center .region[data-component=paragraph] p{max-width:48ch;font-size:var(--lead-size)}
.web-scene.reading-flow .regions{max-width:1020px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:28px;justify-content:center}
.web-scene.reading-flow .region{max-width:100%;margin:0}
.web-scene.reading-flow .region[data-component=paragraph] p{max-width:54ch}
/* CINE-004 primary media area. Content width 1440 − 2 × 64 = 1312 px; 7 of 12 columns with 32 px gutters ≈ 747 px; the height
   under the folio ≈ 618 px, so a hero box of 560 px height fits inside the 810 px frame. image-right: the statement leads in
   the 5-column side and the product takes the 7-column side (5/7); image-left: the hero takes 7 columns and the text 5 (7/5).
   A supporting image (a locator) stays at 260 px; a context image fills its column. */
.web-scene.image-left .regions{grid-template-columns:minmax(0,7fr) minmax(0,5fr);align-content:center}
.web-scene.image-left .web-image{width:min(100%,calc(560px * var(--image-aspect)));max-width:none;margin:auto}
.web-scene.image-left [data-component=heading]{align-self:end}
.web-scene.image-right .regions{grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-content:center}
.web-scene.image-right [data-component=heading]{grid-column:1}
.web-scene.image-right [data-component=image]{grid-column:2;grid-row:1 / span 8;align-self:center}
.web-scene.image-right .web-image{width:min(100%,calc(560px * var(--image-aspect)));max-width:none;margin-left:auto}
.web-scene.image-strip .regions{align-content:center}
.web-scene.image-strip .web-image{width:min(100%,calc(400px * var(--image-aspect)));max-width:760px}
/* A second image of an image-left or image-right page (a locator beside a detail) sits in the text column at the foot of the hero's span instead of the hero's own cell. */
.web-scene.image-left .region[data-component=image]~.region[data-component=image]{grid-column:2;grid-row:3 / span 6;align-self:end}
.web-scene.image-right .region[data-component=image]~.region[data-component=image]{grid-column:1;grid-row:3 / span 6;align-self:end}
.web-scene .region[data-media-role=supporting] .web-image{width:min(100%,calc(260px * var(--image-aspect)))}
.web-scene .region[data-media-role=context] .web-image{width:100%;max-width:none}
.web-scene.image-left .region[data-component=callout] p,.web-scene.photo-split .region[data-component=callout] p{font-size:13px;line-height:1.6;font-weight:500;letter-spacing:.04em;border-top:1px solid currentColor;padding-top:20px}
.web-scene.photo-split .regions{align-content:center}.web-scene.photo-split .web-image{width:min(100%,calc(570px * var(--image-aspect)));margin:auto}
.web-scene.violet-chapter .regions{max-width:1160px;min-height:560px}
.web-scene.violet-chapter h2{max-width:16ch}
.web-scene.violet-chapter .region[data-component=paragraph] p{font-size:var(--lead-size);max-width:38ch;margin-top:28px}
.web-scene:is(.metric-left,.metric-right) .regions{align-content:center;align-items:center;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)}
.web-scene.metric-left [data-component=metric]{padding-top:0}
.web-scene.metric-right [data-component=metric]{padding-top:0;border-left:1px solid currentColor}
.web-scene.metric-band [data-component=metric]{border-block-width:1px;padding:28px 0}
.web-scene.metric-band .metric strong{font-size:180px}
/* The metric can cross the decorative diagonal as its type/height changes.
   Give the complete source text an actual contrasting surface at every width. */
.web-scene.diagonal-cover .metric{background:var(--secondary);padding:24px}
.web-scene.diagonal-cover [data-component=metric] .metric strong{color:inherit}
.web-scene:is(.evidence-left,.evidence-right,.evidence-top,.chart-with-evidence-rail) .regions{row-gap:12px;align-content:center;column-gap:40px}
.web-scene:is(.evidence-left,.evidence-right,.evidence-top,.chart-with-evidence-rail) h2{max-width:24ch}
.web-scene:is(.evidence-left,.evidence-right,.evidence-top,.chart-with-evidence-rail) .region[data-component=paragraph] p{font-size:18px;max-width:40ch}
.web-scene:is(.evidence-left,.evidence-right) .region[data-component=callout]{padding-top:12px;border-top:2px solid var(--accent)}
.web-scene:is(.evidence-left,.evidence-right,.chart-with-evidence-rail) .chart svg{max-width:780px}
.web-scene:is(.evidence-left,.evidence-right,.evidence-top,.chart-with-evidence-rail) .folio{margin-bottom:32px}
.web-scene:is(.evidence-left,.evidence-right,.evidence-top,.chart-with-evidence-rail) .region[data-component=citation]{margin-top:12px;padding-top:12px}
.web-scene.evidence-top .chart svg{max-height:350px}
.web-scene:is(.comparison-matrix,.comparison-rail,.comparison-stack) h2{max-width:23ch}
.web-scene.comparison-matrix th{background:var(--ink);color:var(--paper);font-size:13px;letter-spacing:.04em;padding:18px 22px}
.web-scene.comparison-matrix td{font-size:24px;padding:24px 22px}
.web-scene.comparison-matrix td:first-child{font-size:16px;font-weight:600}
.web-scene.comparison-rail .regions{align-content:center}
.web-scene.comparison-rail th{font-size:13px}
.web-scene.comparison-rail td{font-size:20px}
.web-scene:is(.process-line,.process-rail,.process-stair) .regions{align-content:center}
.web-scene[data-beat=closing] .region[data-component=heading]{margin-bottom:16px}
.web-scene[data-profile=compact]{padding-block:36px}
.web-scene[data-profile=compact] .folio{margin-bottom:32px}
.web-scene.has-interactions{padding-block:40px}
.web-scene.has-interactions .folio{margin-bottom:28px}
.web-scene.has-interactions h2{font-size:48px!important;line-height:1.12}
.web-scene.has-interactions .regions{align-content:start;min-height:0;row-gap:12px}
.web-scene.has-interactions .region[data-component=citation]{margin-top:6px;padding-top:10px}
.web-scene.has-interactions .region[data-component=paragraph] p{font-size:18px;margin-bottom:8px}
@media(max-width:1100px) and (min-width:701px){.web-scene h2{font-size:calc(var(--headline) * .82)}.web-scene .metric strong{font-size:clamp(100px,16vw,180px)}.web-scene .regions{column-gap:32px}}
@media(max-width:700px){
 .web-scene{min-height:0;padding:32px 24px}
 .web-scene .folio{font-size:10px;letter-spacing:.1em;margin-bottom:36px;padding-bottom:14px;gap:18px}
 .web-scene h2{font-size:var(--reading-headline);line-height:1.1;letter-spacing:-.035em;max-width:100%}
 .web-scene:lang(zh-CN) h2{line-height:1.2;letter-spacing:-.02em}
 .web-scene:is(.image-left,.image-strip,.image-right,.photo-split) .web-image{width:100%;max-width:none}
 .web-scene .regions,.web-scene[data-space=open] .regions,.web-scene.violet-chapter .regions{min-height:0;gap:26px;align-content:start;justify-content:start;padding:0}
 .web-scene .region[data-component=paragraph] p{font-size:19px;line-height:1.6;max-width:100%;margin:0}
 .web-scene .region[data-component=callout] p{font-size:22px;max-width:100%}
 .web-scene .region[data-component=list] ul{font-size:19px}
 .web-scene.statement-split .region[data-component=paragraph]{padding-left:0;border:0}
 .web-scene.statement-split .region[data-component=paragraph] p,.web-scene.statement-center .region[data-component=paragraph] p,.web-scene.violet-chapter .region[data-component=paragraph] p{font-size:20px;max-width:100%;margin:0}
 .web-scene:is(.statement-banner,.statement-split,.statement-center,.image-left,.image-right,.image-strip,.metric-left,.metric-band,.metric-right,.evidence-left,.evidence-top,.evidence-right,.comparison-matrix,.comparison-rail,.comparison-stack,.process-line,.process-rail,.process-stair,.reading-flow,.photo-split) .regions{display:flex;flex-direction:column;text-align:left;align-items:stretch}
 .web-scene.statement-banner [data-component=heading]{padding-bottom:24px;margin:0}
 .web-scene.statement-split [data-component=heading] h2{max-width:100%}
 .web-scene .region[data-component=citation]{margin-top:8px;padding-top:16px}
 .web-scene .metric strong,.web-scene.metric-band .metric strong{font-size:clamp(80px,25vw,116px)}
 .web-scene .metric strong small{font-size:.2em;margin-top:18px}
 .web-scene .metric span{font-size:16px;margin-top:18px;max-width:100%}
 .web-scene.metric-right [data-component=metric]{border:0;padding:0}
 .web-scene.comparison-matrix td{font-size:18px;padding:16px 12px}
 .web-scene.comparison-matrix th{font-size:12px;padding:14px 12px}
 .web-scene:is(.evidence-left,.evidence-right,.evidence-top,.chart-with-evidence-rail) .region[data-component=paragraph] p{font-size:18px}
 .web-scene.has-interactions h2{font-size:36px!important}
 .web-scene.has-interactions{padding:28px 22px}
}
@media print{.web-scene{display:block;min-height:0}.web-scene .regions{min-height:0}}
`+s3ArtDirectionCSS+`
/* CINE-002 compact references. The strip is a flex row of citation regions at the foot of the page (48 px ≈ 6 % of 810 is the
   budget the browser evidence measures against, not a clip: nothing here hides text, so the fit audit stays honest); the panel
   is a closed disclosure with every source in full; a marker is a superscript on the claim. The strip never reflows the grid. */
.web-scene .source-strip{--strip-budget:48px;margin-top:auto;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 20px;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 35%,transparent)}
.web-scene .source-strip .region[data-component=citation]{margin:0;padding:0;border:0;grid-column:auto;min-width:0}
.web-scene .source-strip .citation{font:400 var(--reference-size,12px)/1.3 var(--body);max-width:32ch;margin:0}
.web-scene .source-strip .citation a{text-decoration:none}
.web-scene .reference-panel{font:400 var(--reference-size,12px)/1.3 var(--body);margin:0;min-width:0}
.web-scene .reference-panel[open]{flex-basis:100%}
.web-scene .reference-panel summary{cursor:pointer;min-height:0;padding:0;margin:0;font:inherit;line-height:1.3}
.web-scene .reference-panel ol{margin:6px 0 0;padding-left:1.4em;max-width:none}
.web-scene .reference-panel li{overflow-wrap:anywhere}
/* A marker is a superscript reference mark: never below 12 px (the caption size) and 0.7 of its claim's size, so it meets the annotation minimum wherever its claim meets the body minimum. */
.web-scene .source-marker{font-size:max(.7em,12px);vertical-align:super;color:var(--reference,inherit);letter-spacing:0}
.web-scene .source-marker-line{font:400 var(--reference-size,12px)/1.4 var(--body);margin:4px 0 0}
.web-scene .chart-notes .source-marker-note .source-marker{font-size:1em;vertical-align:baseline}
@media(max-width:700px){.web-scene .source-strip{gap:4px 16px;padding-top:8px}.web-scene .source-strip .citation{max-width:100%}}
/* CINE-006 type roles. A declared page names --label-size and --reference-size (document.mjs); the fallbacks hold the values these
   rules had before, so a legacy page renders as it did. SVG chart and diagram text is drawn by its compiler at its own scale
   and is not resized here (the recorded label limit). A run of expanded citations carries one rule, not one per citation. */
.web-scene .chart-rows{font-size:var(--label-size,15px)}
.web-scene .legend{font-size:var(--label-size,14px)}
.web-scene .chart-notes{font-size:var(--reference-size,13px)}
.web-scene .region[data-component=citation]+.region[data-component=citation]{border-top:0;margin-top:0;padding-top:6px}
/* CINE-005: the locator frame marks where a detail sits on the whole object; drawn inside the locator's crop, never over text. */
.web-scene .image-crop .locator-frame{position:absolute;border:2px solid var(--accent);box-shadow:0 0 0 2px var(--paper);pointer-events:none}
/* CINE-003: a declared left entry starts its regions at the top whatever the composition's own alignment; [data-space=open] is unchanged. */
.web-scene[data-entry=left] .regions{align-content:start}
`;
