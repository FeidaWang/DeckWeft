/**
 * Missing-glyph audit (C13, S8). Browser code; no DOM is touched. Chromium draws a character that no installed font covers
 * with the primary font's own .notdef box, so neither `document.fonts` nor the DevTools platform-font list can name it
 * (the VIS-014 case recorded `Iowan Old Style` for U+E000). The audit therefore draws every distinct grapheme of a region in
 * that region's computed font on a canvas and compares the pixels with the same font's rendering of U+0378, an unassigned
 * code point that no font has. Equal pixels and advance mean the glyph is missing. Whitespace, format and combining marks are
 * skipped: a blank glyph is not evidence either way.
 *
 * `scanMissingGlyphs(root)` returns one entry per `.region` with missing graphemes: {regionId, font, missing:[...]} .
 * It is self-contained so the same source runs inside the embedded player and through `page.evaluate` for export readiness.
 */
export function scanMissingGlyphs(root){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=48;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return [];
 const key=(font,text)=>{ctx.clearRect(0,0,48,48);ctx.font=font;ctx.textBaseline='middle';ctx.fillStyle='#000';ctx.fillText(text,6,24);const d=ctx.getImageData(0,0,48,48).data;let h=0;for(let i=3;i<d.length;i+=4)h=(h*31+d[i])>>>0;return h+':'+Math.round(ctx.measureText(text).width*100);};
 const references=new Map(),reference=font=>{if(!references.has(font))references.set(font,key(font,'\u0378'));return references.get(font);};
 const skip=/^(?:\s|\p{Cf}|\p{Mn}|\p{Me}|\u3000)+$/u;
 const pieces=text=>typeof Intl!=='undefined'&&Intl.Segmenter?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(s=>s.segment):Array.from(text);
 const out=[];
 for(const region of root.querySelectorAll('.region')){
  const seen=new Set(),missing=[],fonts=new Set(),walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){
   const el=node.parentElement;if(!el||el.closest('script,style,title,.dw-sr,details:not(.scene-disclosure)')||!node.textContent.trim())continue;
   const s=getComputedStyle(el),font=`${s.fontStyle} ${s.fontWeight} 24px ${s.fontFamily}`,ref=reference(font);
   for(const piece of pieces(node.textContent)){if(skip.test(piece)||seen.has(font+'\u0000'+piece))continue;seen.add(font+'\u0000'+piece);if(key(font,piece)===ref){missing.push(piece);fonts.add(s.fontFamily);}}
  }
  if(missing.length)out.push({regionId:region.id,font:[...fonts].join(' | '),missing});
 }
 return out;
}
/** The same function as page source, embedded in the player. */
export const glyphScript=scanMissingGlyphs.toString();
