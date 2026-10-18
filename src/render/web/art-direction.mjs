// Shared by editor previews, non-interactive thumbnails and standalone audience HTML.
// Content stays in native regions. Neither fixed clipping nor line clamping creates a fit.
export const artDirectionCSS = `
.web-scene{min-height:810px;display:flex;flex-direction:column;padding:56px var(--page);font-synthesis:none}
.web-scene .folio{font:600 11px/1.4 var(--body);letter-spacing:.16em;border-bottom:1px solid currentColor;padding-bottom:16px;margin-bottom:48px;gap:24px}
.web-scene .regions{flex:1;align-content:start;column-gap:var(--story-gutter);row-gap:24px}
.web-scene h2{font-family:var(--display);font-size:var(--headline);font-weight:var(--headline-weight);line-height:var(--headline-leading);letter-spacing:var(--headline-tracking);margin:0 0 10px;text-wrap:balance}
.web-scene .region[data-component=paragraph] p,.web-scene blockquote{font-size:var(--body-size);line-height:1.55;max-width:var(--text-measure);margin:0 0 12px}
.web-scene .region[data-component=list] ul{font-size:var(--body-size);line-height:1.6;padding-left:1.1em;max-width:var(--text-measure);margin:0}
.web-scene .region[data-component=list] li+li{margin-top:12px}
.web-scene .region[data-component=callout] p{font-size:var(--lead-size);font-weight:600;line-height:1.3;letter-spacing:-.02em;max-width:32ch;margin:0;color:var(--accent)}
.web-scene .region[data-component=citation]{margin-top:20px;padding-top:16px;border-top:1px solid currentColor;grid-column:1 / -1}
.web-scene .citation{font:400 12px/1.6 var(--body);letter-spacing:0;max-width:90ch;margin:0}
.web-scene .web-image figcaption{font:400 12px/1.5 var(--body);max-width:60ch;margin-top:14px}
.web-scene .metric strong{font-family:var(--body);font-size:clamp(112px,16vw,230px);font-weight:650;letter-spacing:-.075em;line-height:.88;color:var(--accent);font-variant-numeric:tabular-nums}
.web-scene .metric strong small{font-size:.17em;line-height:1.3;letter-spacing:.03em;margin-top:24px}
.web-scene .metric span{font-size:18px;line-height:1.5;margin-top:22px;max-width:24ch}
.web-scene[data-theme=cream-collage] .metric strong{color:var(--secondary)}
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
.web-scene.image-left .regions{grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);align-content:center}
.web-scene.image-left .web-image{width:min(100%,calc(570px * var(--image-aspect)));max-width:none;margin:auto}
.web-scene.image-left [data-component=heading]{align-self:end}
.web-scene.image-right .web-image{width:min(100%,calc(440px * var(--image-aspect)));max-width:none}
.web-scene.image-right .regions{align-content:center}
.web-scene.image-strip .regions{align-content:center}
.web-scene.image-strip .web-image{width:min(100%,calc(320px * var(--image-aspect)));max-width:600px}
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
`;
