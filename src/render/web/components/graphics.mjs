import { x } from './escape.mjs';
/** Closed vector protocol: no markup, scripts, foreign objects or remote paint resources. */
export function graphicsHTML(scene,theme){
 if(!scene.graphics?.length)return '';
 const prefix='paint-'+scene.id+'-',gradients=scene.gradients||[];
 const defs=gradients.map(g=>`<linearGradient id="${x(prefix+g.id)}" x1="${g.x1*100}%" y1="${g.y1*100}%" x2="${g.x2*100}%" y2="${g.y2*100}%"><stop offset="0%" stop-color="${theme[g.from]}"/><stop offset="100%" stop-color="${theme[g.to]}"/></linearGradient>`).join('')+scene.graphics.filter(g=>g.clip).map(g=>`<clipPath id="${x(prefix+g.id+'-clip')}"><rect x="${g.clip.x}" y="${g.clip.y}" width="${g.clip.width}" height="${g.clip.height}"/></clipPath>`).join('');
 return `<svg class="decor" aria-hidden="true" viewBox="0 0 1440 810" preserveAspectRatio="none"><defs>${defs}</defs>${scene.graphics.map(g=>{const t=g.transform||{translateX:0,translateY:0,scaleX:1,scaleY:1,rotate:g.rotation};return `<path data-graphic-id="${x(g.id)}" d="${x(g.path)}" fill="${g.fill==='gradient'?`url(#${x(prefix+g.gradientId)})`:theme[g.fill]}" transform="translate(${t.translateX} ${t.translateY}) scale(${t.scaleX} ${t.scaleY}) rotate(${t.rotate} 720 405)"${g.clip?` clip-path="url(#${x(prefix+g.id+'-clip')})"`:''}/>`;}).join('')}</svg>`;
}
