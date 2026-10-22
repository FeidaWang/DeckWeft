import { paletteRecord, assertPaletteReference, PALETTE_REGISTRY, PALETTE_MODES, paletteIds, paletteEvidence } from './palette-registry.mjs';
/**
 * DWI-011: role colours for a page derived from an immutable source palette. Light, dark and stage are application modes, not film
 * grades. The neutrals (canvas, surface, text) follow the workpack's semantic-role-mapping v1 (workpacks/wes-instrument/lib/color.mjs).
 * DeckWeft draws its accent and secondary as text (callouts, metrics, kickers), so both must read as text on the canvas and the
 * surface; series and connectors are meaningful graphics at 3:1. A source colour that fails is mixed toward the text colour and
 * marked adjusted with its source index: an adjusted value is never presented as the original swatch. Ratios are never rounded.
 */
export const ROLE_DERIVATION=Object.freeze({id:'deckweft-semantic-roles',version:1,basis:'workpack semantic-role-mapping v1 neutrals'});
const hexRe=/^#[0-9A-F]{6}$/i;
export function hexToRgb(hex){if(typeof hex!=='string'||!hexRe.test(hex))throw TypeError('Expected #RRGGBB.');return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export const rgbToHex=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('').toUpperCase();
const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
export const relativeLuminance=hex=>{const [r,g,b]=hexToRgb(hex).map(v=>linear(v/255));return .2126*r+.7152*g+.0722*b;};
export const contrastRatio=(a,b)=>{const x=relativeLuminance(a),y=relativeLuminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
export function rgbToLab(rgb){
 const [r,g,b]=rgb.map(v=>linear(v/255)),xyz=[(.4124564*r+.3575761*g+.1804375*b)/.95047,.2126729*r+.7151522*g+.072175*b,(.0193339*r+.119192*g+.9503041*b)/1.08883],d=6/29;
 const [x,y,z]=xyz.map(t=>t>d**3?Math.cbrt(t):t/(3*d*d)+4/29);return [116*y-16,500*(x-y),200*(y-z)];
}
export const hexToLab=hex=>rgbToLab(hexToRgb(hex));
export const deltaE76=(a,b)=>Math.hypot(...hexToLab(a).map((v,i)=>v-hexToLab(b)[i]));
const chroma=hex=>{const [,a,b]=hexToLab(hex);return Math.hypot(a,b);};
const half=x=>{const f=Math.floor(x),r=x-f;return Math.abs(r-.5)<1e-10?f+(f%2):Math.round(x);};
export function mixHex(a,b,t){const x=hexToRgb(a),y=hexToRgb(b);return rgbToHex(x.map((v,i)=>half(v*(1-t)+y[i]*t)));}
/** Straight-alpha source over an opaque backdrop, rounded to 8-bit channels like the PowerPoint exporter's blend(). */
export function composite(hex,alpha,under){if(!(alpha>=0&&alpha<=1))throw TypeError('Alpha is in [0, 1].');const a=hexToRgb(hex),b=hexToRgb(under);return rgbToHex(a.map((v,i)=>Math.round(v*alpha+b[i]*(1-alpha))));}
/** Contrast of a possibly translucent foreground against the backdrop it is actually drawn on. */
export const effectiveContrast=(fg,bg,{alpha=1,under=bg}={})=>contrastRatio(alpha<1?composite(fg,alpha,under):fg,bg);
export const TEXT_MIN=4.5,GRAPHIC_MIN=3,STAGE_BODY_TARGET=7;
const passes=(hex,against,min)=>against.every(bg=>contrastRatio(hex,bg)>=min);
/** The source colour itself when it passes, otherwise the smallest mix toward `toward` (2 % steps) that passes. */
function fit(hex,against,min,toward,sourceIndex){
 if(passes(hex,against,min))return {hex,sourceIndex,adjusted:false};
 for(let t=.02;t<=1.0001;t+=.02){const m=mixHex(hex,toward,Math.min(1,t));if(passes(m,against,min))return {hex:m,sourceIndex,sourceHex:hex,adjusted:true,mix:Math.round(Math.min(1,t)*100)/100};}
 return {hex:toward,sourceIndex,sourceHex:hex,adjusted:true,mix:1};
}
/** Status colours are semantic and independent of the film palette; they are the same for every palette in a mode. */
export const STATUS_COLORS=Object.freeze({
 light:Object.freeze({positive:'#1D6B3A',caution:'#7A4A00',negative:'#A1262B',info:'#1F5A93'}),
 dark:Object.freeze({positive:'#7FD6A0',caution:'#F2C46B',negative:'#FF9A9E',info:'#8EC5FF'}),
 stage:Object.freeze({positive:'#145A2E',caution:'#6B4000',negative:'#8E1F24',info:'#174C80'})
});
/** The workpack v1 neutrals: independent application neutrals, never a recoloured source swatch. */
function neutrals(colors,mode){
 const dark=mode==='dark';
 return {canvas:dark?'#151716':mixHex('#FFFFFF',colors[0],mode==='light'?.035:0),surface:dark?'#232624':'#FFFFFF',text:dark?'#FAFAF7':'#171917',mutedText:dark?'#C5C8C5':mode==='stage'?'#3D423D':'#4B504B'};
}
/** Distinct enough from the text colour and from earlier picks to read as an accent rather than a second ink. */
const accentLike=(hex,text,taken)=>chroma(hex)>=15&&deltaE76(hex,text)>=20&&taken.every(t=>deltaE76(hex,t)>=15);
function pickTextRole(colors,n,taken,min){
 const {canvas,surface,text}=n,ground=[canvas,surface],used=new Set(taken.map(t=>t.sourceIndex)),hexes=taken.map(t=>t.hex);
 const plain=colors.findIndex((c,i)=>!used.has(i)&&passes(c,ground,min)&&accentLike(c,text,hexes));
 if(plain>=0)return {hex:colors[plain],sourceIndex:plain,adjusted:false};
 // Otherwise the most chromatic unused source colour whose fitted value still differs from the earlier picks.
 const fitted=colors.map((c,i)=>({c,i})).filter(({i})=>!used.has(i)).sort((a,b)=>chroma(b.c)-chroma(a.c)||a.i-b.i).map(({c,i})=>fit(c,ground,min,text,i));
 return fitted.find(f=>hexes.every(h=>deltaE76(f.hex,h)>=15))||fitted[0]||fit(colors[0],ground,min,text,0);
}
/** Resolves one palette reference to role tokens. Pure and deterministic; the same reference always yields the same tokens. */
export function paletteRoles(ref){
 assertPaletteReference(ref);
 const p=paletteRecord(ref.id),colors=p.colors.map(c=>c.hex),mode=ref.mode,n=neutrals(colors,mode),ground=[n.canvas,n.surface];
 const textMin=mode==='stage'?STAGE_BODY_TARGET:TEXT_MIN;
 const accent=pickTextRole(colors,n,[],TEXT_MIN),secondary=pickTextRole(colors,n,[accent],TEXT_MIN);
 const onAccent=[n.text,'#FFFFFF','#101010'].reduce((best,c)=>contrastRatio(c,accent.hex)>contrastRatio(best,accent.hex)?c:best);
 // Series: every source colour in order, fitted to 3:1 on both grounds; a colour that lands within ΔE76 12 of an earlier series is dropped.
 const series=[];for(const [i,c] of colors.entries()){const f=fit(c,ground,GRAPHIC_MIN,n.text,i);if(series.every(s=>deltaE76(s.hex,f.hex)>=12))series.push(f);}
 for(const extra of [accent,secondary])if(series.length<2&&series.every(s=>deltaE76(s.hex,extra.hex)>=12))series.push({...extra});
 return {paletteId:p.id,registryId:PALETTE_REGISTRY.id,registryVersion:PALETTE_REGISTRY.version,mode,derivation:{...ROLE_DERIVATION},
  ...n,textMinimum:textMin,accent:accent.hex,onAccent,secondary:secondary.hex,link:n.text,focusRing:n.text,essentialStroke:n.text,referenceText:n.mutedText,missingMark:n.mutedText,
  diagramFill:accent.hex,diagramText:onAccent,diagramConnector:n.text,series:series.map(s=>s.hex),seriesOutlines:n.text,seriesScale:'categorical',status:{...STATUS_COLORS[mode]},
  origins:{accent,secondary,series},semanticPolicy:'source-colors-not-semantic-status'};
}
/** Every role pair the renderers draw, with the minimum each needs. Status pairs are checked against both grounds too. */
export function rolePairs(t){
 const text=['text','mutedText','accent','secondary','link','referenceText','missingMark'],graphic=['focusRing','essentialStroke','diagramConnector','seriesOutlines'];
 const out=[];
 for(const fg of text)for(const bg of ['canvas','surface'])out.push({fg,bg,minimum:fg==='text'||fg==='mutedText'?t.textMinimum:TEXT_MIN});
 out.push({fg:'onAccent',bg:'accent',minimum:TEXT_MIN},{fg:'diagramText',bg:'diagramFill',minimum:TEXT_MIN});
 for(const fg of graphic)for(const bg of ['canvas','surface'])out.push({fg,bg,minimum:GRAPHIC_MIN});
 t.series.forEach((_,i)=>{for(const bg of ['canvas','surface'])out.push({fg:`series.${i}`,bg,minimum:GRAPHIC_MIN});});
 for(const k of Object.keys(t.status))for(const bg of ['canvas','surface'])out.push({fg:`status.${k}`,bg,minimum:TEXT_MIN});
 const get=k=>k.split('.').reduce((o,x)=>o[x],t);
 return out.map(p=>{const ratio=contrastRatio(get(p.fg),get(p.bg));return {...p,ratio,pass:ratio>=p.minimum};});
}
/**
 * DWI-012: what touches what on a page. Marks, arrows and callout rules sit on the canvas or a surface (3:1); text on a diagram
 * node sits on its fill (4.5:1); neighbouring series must stay apart (ΔE76 ≥ 12) although their identity never rests on colour
 * alone (charts add dash, marker, direct label and a data table). Returns the failing adjacencies; empty means none.
 */
export function adjacencyIssues(t){
 const issues=[],need=(what,fg,bg,min)=>{const ratio=contrastRatio(fg,bg);if(ratio<min)issues.push({what,fg,bg,ratio,minimum:min});};
 for(const g of ['canvas','surface']){
  t.series.forEach((s,i)=>need(`series ${i} mark on ${g}`,s,t[g],GRAPHIC_MIN));
  need(`diagram arrow on ${g}`,t.diagramConnector,t[g],GRAPHIC_MIN);need(`callout rule on ${g}`,t.accent,t[g],GRAPHIC_MIN);need(`diagram node stroke on ${g}`,t.diagramFill,t[g],GRAPHIC_MIN);
 }
 need('diagram node text on its fill',t.diagramText,t.diagramFill,TEXT_MIN);
 for(let i=1;i<t.series.length;i++){const d=deltaE76(t.series[i-1],t.series[i]);if(d<12)issues.push({what:`series ${i-1} beside series ${i}`,fg:t.series[i],bg:t.series[i-1],deltaE76:d,minimum:12});}
 if(t.seriesScale!=='categorical')issues.push({what:'palette series used as a magnitude scale',minimum:'categorical'});
 return issues;
}
/**
 * The theme a scene renders with when it declares a palette: the theme pack keeps typography, spacing and compositions; the
 * palette's role tokens replace its colours. Without a palette the theme is returned unchanged (existing decks stay byte-identical).
 */
export function applyPalette(theme,ref){
 if(!ref)return theme;
 const r=paletteRoles(ref);
 return {...theme,paper:r.canvas,ink:r.text,accent:r.accent,secondary:r.secondary,chart:[...r.series],
  tokens:{...theme.tokens,palette:{...theme.tokens.palette,reference:r.referenceText,missing:r.missingMark},declared:{...theme.tokens.declared,reference:true,missing:true}},
  palette:{id:r.paletteId,registryVersion:r.registryVersion,mode:r.mode,derivation:r.derivation}};
}
/**
 * A chart's theme when its dataset declares series colours (an identity colour such as a brand, the same in every theme): each
 * declared colour replaces the theme's colour at that series' position, fitted to 3:1 on the paper like palette series. Without a
 * declared colour the theme is returned unchanged (existing decks stay byte-identical).
 */
export function seriesColorTheme(theme,dataset){
 if(!dataset?.series?.some(s=>s.color))return theme;
 const chart=[...theme.chart],ground=hexRe.test(theme.paper)&&hexRe.test(theme.ink);
 dataset.series.forEach((s,j)=>{if(s.color&&j<chart.length)chart[j]=ground?fit(s.color.toUpperCase(),[theme.paper],GRAPHIC_MIN,theme.ink,j).hex:s.color.toUpperCase();});
 return {...theme,chart};
}
/** DWI-013: what the picker shows — film, source swatches, the evidence that exists and the derived colours per mode. */
export function paletteCatalogue(){
 return {registry:{...PALETTE_REGISTRY},modes:[...PALETTE_MODES],derivation:{...ROLE_DERIVATION},palettes:paletteIds().map(id=>{const p=paletteRecord(id),e=paletteEvidence(id);
  return {id,film:p.film,colors:p.colors.map(c=>c.hex),evidence:{library:e.library.evidence,official:false,filmFrameVerified:false,screenshot:e.screenshot&&{samples:e.screenshot.samples,exactMatches:e.screenshot.exactMatches,maxDeltaE76:e.screenshot.maxDeltaE76}},
   preview:Object.fromEntries(PALETTE_MODES.map(mode=>{const r=paletteRoles({id,registryVersion:PALETTE_REGISTRY.version,mode});return [mode,{canvas:r.canvas,text:r.text,accent:r.accent,secondary:r.secondary,adjusted:r.origins.accent.adjusted||r.origins.secondary.adjusted}];}))};})};
}
