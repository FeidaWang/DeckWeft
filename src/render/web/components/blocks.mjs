import {diagram} from '../../../components/diagrams/render.mjs';
import {code} from '../../../components/code/render.mjs';
import {annotation} from '../../../components/annotations/render.mjs';
import { DeckError } from '../../../core/errors.mjs';
import { x } from './escape.mjs';
import { chart } from './chart.mjs';
import { cjkBreaksHTML } from './cjk.mjs';
export function blockHTML(b, document, theme, {resources={},crop,slot,locator,sceneId='scene'}={}) {
  if(b.type==='image'){
    const r=resources[b.assetId],c=crop||{x:0,y:0,width:1,height:1};
    // CINE-005: the visible caption is the slot's, when authored; the alt stays the block's description on <img>. A locator
    // (an image another slot points at) draws the detail's rect as a frame inside its crop; the frame is decoration, not text.
    const caption=slot?.brief?.visibleCaption??b.alt,pct=v=>`${Math.round(v*10000)/100}%`;
    const frame=locator?`<span class="locator-frame" style="left:${pct(locator.region.x)};top:${pct(locator.region.y)};width:${pct(locator.region.width)};height:${pct(locator.region.height)}" aria-hidden="true"></span>`:'';
    return `<figure class="web-image"${locator?` data-locator-for="${x(locator.forBlockId)}"`:''} style="--image-aspect:${slot?.display==='contain'?slot.aspect:(r.width*c.width)/(r.height*c.height)}"><div class="image-crop" style="aspect-ratio:${slot?.display==='contain'?slot.aspect:(r.width*c.width)/(r.height*c.height)}"><img src="${x(r.dataURL)}" alt="${x(b.alt)}" style="${slot?.display==='contain'?'object-fit:contain;width:100%;height:100%;left:0;top:0':`width:${100/c.width}%;height:${100/c.height}%;left:${-c.x/c.width*100}%;top:${-c.y/c.height*100}%`}">${frame}</div><figcaption>${x(caption)}</figcaption></figure>`;
  }
  if (b.type === 'heading') return `<h2>${cjkBreaksHTML(b.text,document.locale)}</h2>`;
  if (b.type === 'callout') return `<p>${cjkBreaksHTML(b.text,document.locale)}</p>`;
  if (b.type === 'paragraph') return `<p>${x(b.text)}</p>`;
  if (b.type === 'quote') return `<blockquote>${x(b.text)}</blockquote>`;
  if (b.type === 'list') return `<ul>${b.items.map(v=>`<li>${x(v)}</li>`).join('')}</ul>`;
  if (b.type === 'metric') return `<p class="metric"><strong>${x(new Intl.NumberFormat(document.locale,{maximumSignificantDigits:21}).format(b.value))}<small>${x(b.unit)}</small></strong><span>${cjkBreaksHTML(b.label,document.locale)}</span></p>`;
  if (b.type === 'chart') return chart(b,document,theme,{sceneId});
  if (b.type === 'code') return code(b,document,{sceneId});
  if (b.type === 'annotation') return annotation(b,document,{sceneId});
  if (b.type === 'citation') { const source=document.sources.find(s=>s.id===b.sourceId); return `<p class="citation"><a href="${x(source.url)}" rel="noreferrer">${x(b.text)} · ${x(source.title)}</a></p>`; }
  if (b.type === 'table') return `<div class="table-scroll"><table><thead><tr>${b.columns.map(c=>`<th scope="col">${x(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r=>`<tr>${r.map((c,i)=>`<td data-column="${x(b.columns[i])}">${x(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (b.type === 'diagram') return diagram(b,document,theme,{sceneId});
  throw new DeckError('WEB_COMPONENT','This semantic component has no web renderer yet.');
}
/** CINE-002 claim markers: the display numbers of a claim's sources, appended inside the claim's own text element. */
export const markerHTML=markers=>markers?.length?`<sup class="source-marker">${markers.map(n=>`[${n}]`).join('')}</sup>`:'';
export function withMarkers(markup,type,markers){
 const m=markerHTML(markers);if(!m)return markup;
 const at=(pattern,replacement)=>{const i=markup.search(pattern);return i<0?null:markup.slice(0,i)+replacement+markup.slice(i);};
 const placed=type==='heading'?at(/<\/h2>(?![\s\S]*<\/h2>)/,' '+m)
  :['paragraph','callout'].includes(type)?at(/<\/p>(?![\s\S]*<\/p>)/,' '+m)
  :type==='image'?at(/<\/figcaption><\/figure>(?![\s\S]*<\/figcaption><\/figure>)/,' '+m)
  :type==='metric'?at(/<\/span><\/p>(?![\s\S]*<\/span><\/p>)/,' '+m)
  :type==='list'?at(/<\/li><\/ul>(?![\s\S]*<\/li><\/ul>)/,' '+m)
  :type==='chart'?(markup.includes('<ul class="chart-notes">')?markup.replace(/(<ul class="chart-notes">[\s\S]*?)<\/ul>/,`$1<li class="source-marker-note">${m}</li></ul>`):at(/<\/figure>(?![\s\S]*<\/figure>)/,`<ul class="chart-notes"><li class="source-marker-note">${m}</li></ul>`))
  :null;
 return placed??markup+`<p class="source-marker-line">${m}</p>`;
}
