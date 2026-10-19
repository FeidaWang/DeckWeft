// S8 theme packs (alignment §16): Editorial Fieldnotes (T01), Research Atlas (T02), Luminous Stage (T03).
// Each theme changes composition, type roles, media ratio and motion character, not only colours. Every theme-only composition
// keeps every region in the DOM; long content fails the candidate height gate instead of being clipped. 1440 px uses the grids
// below; 701–1100 px keeps them except where noted; 700 px and below reads in DOM order. Shared families and components take
// their theme flavour from the [data-theme] rules, and the S1 token roles arrive as custom properties (see document.mjs).
const T01='[data-theme=editorial-fieldnotes]',T02='[data-theme=research-atlas]',T03='[data-theme=luminous-stage]';
const FIELDNOTES=':is(.fieldnotes-cover,.fieldnotes-thesis,.fieldnotes-figure,.fieldnotes-method,.fieldnotes-closing)';
const ATLAS=':is(.atlas-cover,.atlas-section,.atlas-figure,.atlas-panels,.atlas-appendix,.atlas-closing)';
const STAGE=':is(.stage-hero,.stage-chapter,.stage-figure,.stage-metric,.stage-closing)';
const OWN=':is(.fieldnotes-cover,.fieldnotes-thesis,.fieldnotes-figure,.fieldnotes-method,.fieldnotes-closing,.atlas-cover,.atlas-section,.atlas-figure,.atlas-panels,.atlas-appendix,.atlas-closing,.stage-hero,.stage-chapter,.stage-figure,.stage-metric,.stage-closing)';
export const themeCSS=`
/* ---- shared by the sixteen S8 compositions ---- */
.web-scene${OWN} .regions{display:grid;align-items:start}
.web-scene${OWN} .regions>.region[data-component=citation]{grid-column:1 / -1}
.web-scene${OWN} h2{max-width:100%}

/* ---- T01 Editorial Fieldnotes: main column, margin, hairlines, serif display, quiet numbers ---- */
.web-scene${T01} .folio{font:500 11px/1.4 var(--body);letter-spacing:.14em;border-bottom:1px solid var(--reference,currentColor)}
.web-scene${T01} h2{font-weight:var(--headline-weight);letter-spacing:var(--headline-tracking)}
.web-scene${T01} .region[data-component=paragraph] p{line-height:1.6}
.web-scene${T01} .region[data-component=callout] p{font:italic 400 var(--lead-size)/1.4 var(--display);color:var(--ink);letter-spacing:0;border-top:1px solid var(--accent);padding-top:12px;max-width:30ch}
.web-scene${T01} .region[data-component=list] ul{line-height:1.55}
.web-scene${T01} .metric strong{font-weight:400;letter-spacing:-.04em;color:var(--secondary)}
.web-scene${T01} .metric strong small{font-family:var(--body);letter-spacing:.08em;text-transform:uppercase;font-size:.14em}
.web-scene${T01} blockquote{font-style:italic;border-left-color:var(--accent)}
.web-scene${T01} .chart svg{font-size:13px}
.web-scene${T01} th{background:transparent;color:var(--ink);border-bottom:2px solid var(--ink);font:600 12px/1.4 var(--body);letter-spacing:.08em;text-transform:uppercase}
.web-scene${T01} td{border-bottom:1px solid var(--reference,currentColor)}
.web-scene${T01}.comparison-matrix th{background:transparent;color:var(--ink)}
.web-scene${T01} .semantic-annotation,.web-scene${T01} .step-explanation,.web-scene${T01} .hotspot-explanation{background:#24241F0A}
.web-scene.fieldnotes-cover .regions{grid-template-columns:minmax(0,1.5fr) minmax(0,.7fr);column-gap:64px;align-content:end;min-height:560px;row-gap:20px}
.web-scene.fieldnotes-cover [data-component=callout]{grid-column:1;grid-row:1;align-self:end}
.web-scene.fieldnotes-cover [data-component=callout] p{font:600 12px/1.4 var(--body);font-style:normal;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);border:0;padding:0;max-width:none}
.web-scene.fieldnotes-cover [data-component=heading]{grid-column:1;grid-row:2}
.web-scene.fieldnotes-cover h2{max-width:15ch;margin:0}
.web-scene.fieldnotes-cover [data-component=paragraph]{grid-column:2;grid-row:2;align-self:end}
.web-scene.fieldnotes-cover [data-component=paragraph] p{font-size:18px;line-height:1.55;max-width:30ch;border-left:1px solid var(--reference,currentColor);padding-left:20px;margin:0}
.web-scene.fieldnotes-cover :is([data-component=metric],[data-component=list],[data-component=image],[data-component=quote]){grid-column:2;grid-row:1;align-self:end}
.web-scene.fieldnotes-cover .metric strong{font-size:clamp(72px,8vw,112px);line-height:.95}
.web-scene.fieldnotes-cover .metric span{font-size:15px;max-width:26ch}
.web-scene.fieldnotes-thesis .regions{grid-template-columns:minmax(0,1.3fr) minmax(0,.6fr);column-gap:56px;row-gap:28px}
.web-scene.fieldnotes-thesis [data-component=heading]{grid-column:1 / -1;border-bottom:1px solid var(--reference,currentColor);padding-bottom:28px}
.web-scene.fieldnotes-thesis h2{max-width:22ch}
.web-scene.fieldnotes-thesis .region:is([data-component=paragraph],[data-component=quote],[data-component=diagram],[data-component=table],[data-component=code],[data-component=image],[data-component=metric],[data-component=chart]){grid-column:1}
.web-scene.fieldnotes-thesis .region[data-component=paragraph] p{font-size:var(--lead-size);line-height:1.5;max-width:40ch}
.web-scene.fieldnotes-thesis .region:is([data-component=callout],[data-component=list],[data-component=annotation]){grid-column:2}
.web-scene.fieldnotes-thesis .region[data-component=callout] p{font-size:18px}
.web-scene.fieldnotes-thesis .region[data-component=list] ul{font-size:16px;border-top:1px solid var(--accent);padding:12px 0 0 1.1em}
.web-scene.fieldnotes-figure .regions{grid-template-columns:minmax(0,.62fr) minmax(0,1.38fr);column-gap:56px;row-gap:18px;align-content:center}
.web-scene.fieldnotes-figure .region:is([data-component=heading],[data-component=paragraph],[data-component=callout],[data-component=list],[data-component=metric],[data-component=quote],[data-component=annotation]){grid-column:1}
.web-scene.fieldnotes-figure h2{max-width:14ch}
.web-scene.fieldnotes-figure .region[data-component=paragraph] p{font-size:18px;max-width:34ch}
.web-scene.fieldnotes-figure .region:is([data-component=chart],[data-component=image],[data-component=table],[data-component=diagram]){grid-column:2;grid-row:1 / span 6}
.web-scene.fieldnotes-figure .chart svg{max-height:430px}
.web-scene.fieldnotes-figure .region[data-component=chart]~.region[data-component=image]{grid-row:auto}
.web-scene.fieldnotes-method .regions{grid-template-columns:minmax(0,1.25fr) minmax(0,.6fr);column-gap:56px;row-gap:22px}
.web-scene.fieldnotes-method [data-component=heading]{grid-column:1 / -1}
.web-scene.fieldnotes-method h2{max-width:24ch}
.web-scene.fieldnotes-method .region:is([data-component=paragraph],[data-component=list],[data-component=diagram],[data-component=table],[data-component=code],[data-component=quote],[data-component=chart],[data-component=image],[data-component=metric]){grid-column:1}
.web-scene.fieldnotes-method .region:is([data-component=callout],[data-component=annotation]){grid-column:2}
.web-scene.fieldnotes-method .region[data-component=callout] p{font-size:17px;line-height:1.5}
.web-scene.fieldnotes-method .regions>.region[data-component=citation]{grid-column:2;border-top:0;margin-top:0;padding-top:0}
.web-scene.fieldnotes-method .region[data-component=paragraph] p{font-size:var(--body-size);max-width:46ch}
.web-scene.fieldnotes-method .semantic-diagram svg{max-width:640px}
.web-scene.fieldnotes-closing .regions{grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:64px;align-content:center;row-gap:24px}
.web-scene.fieldnotes-closing [data-component=heading]{grid-column:1;grid-row:1}
.web-scene.fieldnotes-closing h2{max-width:12ch}
.web-scene.fieldnotes-closing .region:is([data-component=paragraph],[data-component=quote]){grid-column:1}
.web-scene.fieldnotes-closing .region[data-component=list]{grid-column:2;grid-row:1 / span 2;align-self:end}
.web-scene.fieldnotes-closing .region[data-component=list] ul{list-style:none;padding:0;font-size:var(--lead-size);line-height:1.35;font-family:var(--display);max-width:none}
.web-scene.fieldnotes-closing .region[data-component=list] li{border-top:1px solid var(--ink);padding-top:14px;margin-top:0}
.web-scene.fieldnotes-closing .region[data-component=list] li+li{margin-top:18px}
.web-scene.fieldnotes-closing .region[data-component=callout]{grid-column:2}

/* ---- T02 Research Atlas: shared grid, numbered rails, tabular numerals, figure-first ---- */
.web-scene${T02} .folio{font:600 11px/1.4 var(--numeric,var(--body));letter-spacing:.08em;text-transform:none;border-bottom:1px solid var(--ink)}
.web-scene${T02} h2{letter-spacing:var(--headline-tracking)}
.web-scene${T02} .region[data-component=paragraph] p{line-height:1.5}
.web-scene${T02} .region[data-component=callout] p{font:600 var(--lead-size)/1.3 var(--body);letter-spacing:-.01em;color:var(--accent);border-left:3px solid var(--secondary);padding-left:14px;max-width:34ch}
.web-scene${T02} .metric strong{font-weight:600;letter-spacing:-.05em;color:var(--accent)}
.web-scene${T02} .metric strong small{font-family:var(--body);font-size:.16em;letter-spacing:.02em}
.web-scene${T02} blockquote{border-left-color:var(--secondary)}
.web-scene${T02} th{background:transparent;color:var(--ink);border-bottom:2px solid var(--ink);font:600 12px/1.4 var(--body);letter-spacing:.06em;text-transform:uppercase;padding:10px 12px}
.web-scene${T02} td{border-bottom:1px solid var(--reference,currentColor);font-variant-numeric:tabular-nums;padding:12px}
.web-scene${T02}.comparison-matrix th{background:transparent;color:var(--ink);padding:12px 14px}
.web-scene${T02}.comparison-matrix td{font-size:20px;padding:16px 14px}
.web-scene${T02} .chart figcaption .chart-question{font-size:16px}
.web-scene${T02} .chart-takeaway{font-weight:600}
.web-scene${T02} .chart svg{font-size:13px}
.web-scene${T02} .legend{font-size:13px}
.web-scene${T02} .semantic-annotation,.web-scene${T02} .step-explanation,.web-scene${T02} .hotspot-explanation{background:#15211B0A;border-left-color:var(--secondary)}
.web-scene.atlas-cover{border-top:10px solid var(--accent)}
.web-scene.atlas-cover .regions{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);column-gap:48px;align-content:center;row-gap:20px}
.web-scene.atlas-cover [data-component=callout]{grid-column:1;grid-row:1}
.web-scene.atlas-cover [data-component=callout] p{font:600 13px/1.4 var(--numeric,var(--body));letter-spacing:.06em;color:var(--secondary);border:0;padding:0;max-width:none}
.web-scene.atlas-cover [data-component=heading]{grid-column:1;grid-row:2}
.web-scene.atlas-cover h2{max-width:16ch}
.web-scene.atlas-cover [data-component=paragraph]{grid-column:1;grid-row:3}
.web-scene.atlas-cover [data-component=paragraph] p{font-size:var(--lead-size);max-width:40ch;margin:0}
.web-scene.atlas-cover .region:is([data-component=list],[data-component=metric],[data-component=image],[data-component=table]){grid-column:2;grid-row:1 / span 3;align-self:center}
.web-scene.atlas-cover .region[data-component=list] ul{list-style:none;padding:0;font-size:17px;line-height:1.4;max-width:none}
.web-scene.atlas-cover .region[data-component=list] li{border-top:1px solid var(--ink);padding:12px 0;margin:0}
.web-scene.atlas-cover .region[data-component=list] li:last-child{border-bottom:1px solid var(--ink)}
.web-scene.atlas-section .regions{grid-template-columns:minmax(0,.35fr) minmax(0,1fr);column-gap:40px;align-content:center;row-gap:20px}
.web-scene.atlas-section [data-component=callout]{grid-column:1;grid-row:1 / span 3;align-self:start}
.web-scene.atlas-section [data-component=callout] p{font:600 clamp(56px,7vw,112px)/.95 var(--numeric,var(--body));letter-spacing:-.06em;color:var(--secondary);border:0;padding:0;max-width:none}
.web-scene.atlas-section .region:not([data-component=callout]):not([data-component=citation]){grid-column:2}
.web-scene.atlas-section [data-component=heading]{border-top:2px solid var(--ink);padding-top:18px}
.web-scene.atlas-section h2{max-width:16ch}
.web-scene.atlas-section .region[data-component=paragraph] p{font-size:var(--lead-size);max-width:40ch}
.web-scene.atlas-section .region[data-component=list] ul{font-size:17px}
.web-scene.atlas-figure .regions{grid-template-columns:minmax(0,1.55fr) minmax(0,.7fr);column-gap:40px;row-gap:14px;align-content:center}
.web-scene.atlas-figure [data-component=heading]{grid-column:1 / -1}
.web-scene.atlas-figure h2{max-width:30ch}
.web-scene.atlas-figure .region:is([data-component=chart],[data-component=table],[data-component=image],[data-component=diagram]){grid-column:1;grid-row:2 / span 6}
.web-scene.atlas-figure .region[data-component=chart]~.region:is([data-component=table],[data-component=image]){grid-row:auto;grid-column:1 / -1}
.web-scene.atlas-figure .region:is([data-component=callout],[data-component=paragraph],[data-component=list],[data-component=metric],[data-component=annotation],[data-component=quote]){grid-column:2}
.web-scene.atlas-figure .region[data-component=paragraph] p{font-size:16px;max-width:38ch}
.web-scene.atlas-figure .region[data-component=list] ul{font-size:15px}
.web-scene.atlas-figure .chart svg{max-height:440px}
.web-scene.atlas-figure .folio{margin-bottom:32px}
.web-scene.atlas-panels .regions{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28px;row-gap:12px;align-content:start}
.web-scene.atlas-panels .folio{margin-bottom:28px}
.web-scene.atlas-panels [data-component=heading]{grid-column:1 / -1;margin-bottom:4px}
.web-scene.atlas-panels h2{max-width:30ch;font-size:calc(var(--headline) * .88)}
.web-scene.atlas-panels .region[data-component=chart]{border-top:1px solid var(--reference,currentColor);padding-top:8px}
.web-scene.atlas-panels .chart svg{max-height:230px}
.web-scene.atlas-panels .chart .chart-plot svg{min-width:0}
.web-scene.atlas-panels .chart figcaption .chart-question{font-size:14px}
.web-scene.atlas-panels .chart-takeaway{font-size:14px;margin:4px 0}
.web-scene.atlas-panels .chart-definition,.web-scene.atlas-panels .chart-notes{font-size:11px}
.web-scene.atlas-panels .chart .chart-rows{font-size:13px;gap:5px}
.web-scene.atlas-panels .legend{margin-bottom:8px;font-size:12px}
.web-scene.atlas-panels .region:is([data-component=paragraph],[data-component=callout],[data-component=list],[data-component=annotation]){grid-column:1 / -1}
.web-scene.atlas-panels .region[data-component=paragraph] p{font-size:16px;max-width:70ch}
.web-scene.atlas-panels .region[data-component=callout] p{font-size:20px}
.web-scene.atlas-appendix .regions{grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:40px;row-gap:16px}
.web-scene.atlas-appendix .folio{margin-bottom:28px}
.web-scene.atlas-appendix [data-component=heading]{grid-column:1 / -1}
.web-scene.atlas-appendix h2{font-size:calc(var(--headline) * .8);max-width:34ch}
.web-scene.atlas-appendix .region:is([data-component=table],[data-component=chart],[data-component=diagram],[data-component=code]){grid-column:1 / -1}
.web-scene.atlas-appendix td{font-size:14px;padding:8px 10px;line-height:1.4}
.web-scene.atlas-appendix th{font-size:11px;padding:8px 10px}
.web-scene.atlas-appendix .region[data-component=paragraph]{grid-column:1}
.web-scene.atlas-appendix .region[data-component=paragraph] p{font-size:15px;line-height:1.5;max-width:56ch}
.web-scene.atlas-appendix .region:is([data-component=list],[data-component=callout],[data-component=annotation]){grid-column:2}
.web-scene.atlas-appendix .region[data-component=list] ul{font-size:14px;line-height:1.5}
.web-scene.atlas-appendix .region[data-component=list] li+li{margin-top:6px}
.web-scene.atlas-appendix .region[data-component=callout] p{font-size:16px}
.web-scene.atlas-appendix .regions>.region[data-component=citation]{margin-top:8px}
.web-scene.atlas-closing .regions{grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:48px;align-content:center;row-gap:20px}
.web-scene.atlas-closing [data-component=heading]{grid-column:1;grid-row:1}
.web-scene.atlas-closing h2{max-width:14ch}
.web-scene.atlas-closing .region:is([data-component=callout],[data-component=quote],[data-component=metric]){grid-column:1}
.web-scene.atlas-closing .region[data-component=callout] p{color:var(--secondary);border-left-color:var(--accent)}
.web-scene.atlas-closing .region[data-component=list]{grid-column:2;grid-row:1 / span 3;align-self:center}
.web-scene.atlas-closing .region[data-component=list] ul{list-style:none;padding:0;font-size:var(--lead-size);line-height:1.3;max-width:none}
.web-scene.atlas-closing .region[data-component=list] li{border-top:1px solid var(--ink);padding-top:12px}
.web-scene.atlas-closing .region[data-component=list] li+li{margin-top:16px}
.web-scene.atlas-closing .region[data-component=paragraph]{grid-column:2}
.web-scene.atlas-closing .region[data-component=paragraph] p{font-size:16px}

/* ---- T03 Luminous Stage: dark surface, one large object, calm text area, no shader ---- */
.web-scene${T03} .folio{opacity:.72;border-bottom-color:var(--reference,currentColor)}
.web-scene${T03} h2{letter-spacing:var(--headline-tracking)}
.web-scene${T03} .region[data-component=paragraph] p{line-height:1.55}
.web-scene${T03} .region[data-component=callout] p{color:var(--accent);font-weight:500;letter-spacing:0}
.web-scene${T03} .metric strong{font-weight:500;letter-spacing:-.04em;color:var(--accent)}
.web-scene${T03} .metric strong small{font-family:var(--body);font-weight:400;letter-spacing:.06em;font-size:.14em}
.web-scene${T03} blockquote{border-left-color:var(--accent)}
.web-scene${T03} .citation{opacity:.85}
.web-scene${T03} th{background:var(--ink);color:var(--paper)}
.web-scene${T03} td{border-bottom:1px solid var(--reference,currentColor)}
.web-scene${T03} .chart svg{font-size:13px}
.web-scene${T03} .semantic-annotation,.web-scene${T03} .step-explanation,.web-scene${T03} .hotspot-explanation,.web-scene${T03} pre{background:#F2F3EE14}
.web-scene${T03} .image-crop{background:#1A2230}
.web-scene${T03} .web-image figcaption{opacity:.85}
.web-scene${T03} .decor path{opacity:.85}
.web-scene.stage-hero .regions{grid-template-columns:minmax(0,calc(100% - var(--image-split) - var(--gap))) minmax(0,var(--image-split));column-gap:var(--gap);align-content:center;align-items:center;min-height:620px;row-gap:20px}
.web-scene.stage-hero:not(:has(.region[data-component=image])) .regions{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
.web-scene.stage-hero:has(.region[data-component=image]) h2{font-size:min(var(--headline),80px);max-width:12ch}
.web-scene.stage-hero [data-component=callout]{grid-column:1;grid-row:1;align-self:end}
.web-scene.stage-hero [data-component=callout] p{font:500 12px/1.4 var(--body);letter-spacing:.18em;text-transform:uppercase;color:var(--accent);max-width:none}
.web-scene.stage-hero [data-component=heading]{grid-column:1;grid-row:2}
.web-scene.stage-hero h2{max-width:10ch;margin:0}
.web-scene.stage-hero .region:is([data-component=paragraph],[data-component=list],[data-component=quote]){grid-column:1}
.web-scene.stage-hero [data-component=paragraph]{grid-row:3}
.web-scene.stage-hero .region:is([data-component=list],[data-component=quote]){grid-row:4}
.web-scene.stage-hero .region[data-component=paragraph] p{font-size:var(--lead-size);max-width:30ch;margin:0}
.web-scene.stage-hero .region:is([data-component=image],[data-component=metric],[data-component=chart],[data-component=diagram]){grid-column:2;grid-row:1 / span 4;align-self:center}
.web-scene.stage-hero .web-image{width:100%;max-width:none;margin:0}
.web-scene.stage-hero .image-crop{border-radius:6px}
.web-scene.stage-hero .metric strong{font-size:clamp(140px,18vw,260px)}
.web-scene.stage-chapter .regions{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:24px;max-width:1100px;width:100%;margin:0 auto;min-height:560px}
.web-scene.stage-chapter .region{max-width:100%}
.web-scene.stage-chapter [data-component=callout] p{font:500 12px/1.4 var(--body);letter-spacing:.18em;text-transform:uppercase;color:var(--accent);max-width:none}
.web-scene.stage-chapter h2{border-top:2px solid var(--accent);padding-top:28px;max-width:14ch;margin:0}
.web-scene.stage-chapter .region[data-component=paragraph] p{font-size:var(--lead-size);max-width:34ch;margin:0}
.web-scene.stage-chapter .region[data-component=list] ul{font-size:18px;list-style:none;padding:0;display:flex;gap:40px;flex-wrap:wrap}
.web-scene.stage-chapter .region[data-component=list] li+li{margin:0}
.web-scene.stage-chapter .regions>.region[data-component=citation]{width:100%;align-self:stretch}
.web-scene.stage-figure .regions{grid-template-columns:minmax(0,1.5fr) minmax(0,.7fr);column-gap:var(--gap);row-gap:16px;align-content:center}
.web-scene.stage-figure [data-component=heading]{grid-column:1 / -1}
.web-scene.stage-figure h2{max-width:26ch}
.web-scene.stage-figure .region:is([data-component=chart],[data-component=table],[data-component=diagram],[data-component=image],[data-component=code]){grid-column:1;grid-row:2 / span 6;background:#1A2230;border:1px solid #2C3645;border-radius:6px;padding:24px}
.web-scene.stage-figure .region[data-component=chart]~.region:is([data-component=image],[data-component=table]){grid-row:auto;grid-column:1 / -1}
.web-scene.stage-figure .region:is([data-component=callout],[data-component=paragraph],[data-component=list],[data-component=metric],[data-component=annotation],[data-component=quote]){grid-column:2}
.web-scene.stage-figure .region[data-component=paragraph] p{font-size:17px;max-width:34ch}
.web-scene.stage-figure .region[data-component=callout] p{font-size:var(--lead-size);line-height:1.3;border-top:2px solid var(--accent);padding-top:12px;max-width:30ch}
.web-scene.stage-figure .chart svg{max-height:420px}
.web-scene.stage-metric .regions{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);column-gap:var(--gap);align-content:center;align-items:center;row-gap:18px}
.web-scene.stage-metric [data-component=metric]{grid-column:1;grid-row:1 / span 4;align-self:center}
.web-scene.stage-metric .metric strong{font-size:clamp(140px,19vw,280px);line-height:.85}
.web-scene.stage-metric .metric span{font-size:18px;max-width:26ch}
.web-scene.stage-metric .region:not([data-component=metric]):not([data-component=citation]){grid-column:2}
.web-scene.stage-metric h2{max-width:none;font-size:min(var(--headline),72px)}
.web-scene.stage-metric .region[data-component=paragraph] p{font-size:18px;max-width:34ch}
.web-scene.stage-closing .regions{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);column-gap:var(--gap);align-content:center;row-gap:20px}
.web-scene.stage-closing [data-component=heading]{grid-column:1;grid-row:1}
.web-scene.stage-closing h2{max-width:12ch}
.web-scene.stage-closing .region:is([data-component=callout],[data-component=paragraph],[data-component=quote],[data-component=metric]){grid-column:1}
.web-scene.stage-closing .region[data-component=callout] p{font-size:var(--lead-size);border-top:2px solid var(--accent);padding-top:14px;max-width:28ch}
.web-scene.stage-closing .region[data-component=list]{grid-column:2;grid-row:1 / span 3;align-self:center}
.web-scene.stage-closing .region[data-component=list] ul{list-style:none;padding:0;font-size:var(--lead-size);line-height:1.3;max-width:none}
.web-scene.stage-closing .region[data-component=list] li{border-top:1px solid var(--reference,currentColor);padding-top:14px}
.web-scene.stage-closing .region[data-component=list] li+li{margin-top:18px}

@media(max-width:1100px) and (min-width:701px){
 .web-scene.atlas-panels .regions{grid-template-columns:minmax(0,1fr)}
 .web-scene.atlas-panels .chart svg{max-height:260px}
 .web-scene.stage-hero h2,.web-scene.stage-chapter h2{font-size:calc(var(--headline) * .72)}
 .web-scene.atlas-section [data-component=callout] p{font-size:64px}
}
@media(max-width:700px){
 .web-scene${OWN} .regions{display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:22px;min-height:0}
 .web-scene${OWN} .region{min-width:0;align-self:stretch;max-width:100%}
 .web-scene${OWN} h2{max-width:100%;margin:0}
 .web-scene.fieldnotes-cover [data-component=paragraph] p,.web-scene.fieldnotes-thesis [data-component=heading],.web-scene.fieldnotes-method .regions>.region[data-component=citation],.web-scene.atlas-section [data-component=heading],.web-scene.stage-chapter h2{border:0;padding:0}
 .web-scene.fieldnotes-method .regions>.region[data-component=citation]{border-top:1px solid currentColor;padding-top:14px}
 .web-scene:is(.fieldnotes-cover,.fieldnotes-closing,.atlas-section) .metric strong,.web-scene:is(.stage-hero,.stage-metric) .metric strong{font-size:clamp(80px,25vw,116px)}
 .web-scene.atlas-section [data-component=callout] p{font-size:48px}
 .web-scene.stage-chapter .region[data-component=list] ul{display:block}
 .web-scene.stage-chapter .region[data-component=list] li+li{margin-top:12px}
 .web-scene.stage-figure .region:is([data-component=chart],[data-component=table],[data-component=diagram],[data-component=image],[data-component=code]){padding:14px}
 .web-scene.atlas-panels .chart svg{max-height:none}
 .web-scene${T01} .region[data-component=callout] p,.web-scene${T02} .region[data-component=callout] p,.web-scene${T03} .region[data-component=callout] p{max-width:100%}
}
@media print{.web-scene.stage-figure .region:is([data-component=chart],[data-component=table],[data-component=diagram],[data-component=image],[data-component=code]){background:#1A2230;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
