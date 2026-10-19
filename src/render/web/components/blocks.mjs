import {diagram} from '../../../components/diagrams/render.mjs';
import {code} from '../../../components/code/render.mjs';
import {annotation} from '../../../components/annotations/render.mjs';
import { DeckError } from '../../../core/errors.mjs';
import { x } from './escape.mjs';
import { chart } from './chart.mjs';
import { cjkBreaksHTML } from './cjk.mjs';
export function blockHTML(b, document, theme, {resources={},crop,slot,sceneId='scene'}={}) {
  if(b.type==='image'){
    const r=resources[b.assetId],c=crop||{x:0,y:0,width:1,height:1};
    return `<figure class="web-image" style="--image-aspect:${slot?.display==='contain'?slot.aspect:(r.width*c.width)/(r.height*c.height)}"><div class="image-crop" style="aspect-ratio:${slot?.display==='contain'?slot.aspect:(r.width*c.width)/(r.height*c.height)}"><img src="${x(r.dataURL)}" alt="${x(b.alt)}" style="${slot?.display==='contain'?'object-fit:contain;width:100%;height:100%;left:0;top:0':`width:${100/c.width}%;height:${100/c.height}%;left:${-c.x/c.width*100}%;top:${-c.y/c.height*100}%`}"></div><figcaption>${x(b.alt)}</figcaption></figure>`;
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
