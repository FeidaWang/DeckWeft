import {sceneAsset} from './assets.mjs';
export const escapeXML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function sceneToSVG(scene, { title='Slide preview', showIssues=false }={}) {
  const x=escapeXML;
  const nodes=scene.nodes.map(n=>{
    if(n.type==='image')return `<image data-node="${x(n.id)}" data-role="${x(n.role)}" data-asset="${x(n.asset)}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" href="${sceneAsset(n.asset,n.resource).dataURL}" preserveAspectRatio="xMidYMid meet"><title>${x(n.alt)}</title></image>`;
    if(n.type==='text') {
      const spans=n.lines.map((line,i)=>`<tspan x="${n.x}" y="${n.y+(n.baselineOffset??n.fontSize*.91)+i*n.lineHeight}">${x(line)}</tspan>`).join('');
      return `<g data-node="${x(n.id)}" data-overflow="${n.overflow}"><text font-family="${x(n.fontStack||n.fontFamily)}" font-kerning="normal" font-size="${n.fontSize}" fill="${n.color}" xml:space="preserve">${spans}</text>${showIssues&&n.overflow?`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="none" stroke="#B33425" stroke-width="2" stroke-dasharray="6 5"/>`:''}</g>`;
    }
    if(n.type==='ellipse') return `<ellipse data-node="${x(n.id)}" cx="${n.x+n.w/2}" cy="${n.y+n.h/2}" rx="${n.w/2}" ry="${n.h/2}" fill="${n.fill}"/>`;
    if(n.type!=='rect')throw new Error('Unsupported scene node');
    return `<rect data-node="${x(n.id)}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.radius||0}" fill="${n.fill}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}" role="img"${scene.spatial?` data-spatial="${x(JSON.stringify(scene.spatial))}"`:""} aria-label="${x(title)}"><title>${x(title)}</title><rect width="100%" height="100%" fill="${scene.background}"/>${nodes}</svg>`;
}
