// Browser code embedded in the same offline runtime. No screenshot/color sampling service.
export const contrastScript = String.raw`function auditContrast(scene){
 function rgb(value){const m=value.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const n=m[1].split(/[, /]+/).filter(Boolean).map(Number);return n.length>=3?{c:n.slice(0,3),a:n[3]??1}:null;}
 function mix(top,bottom){return top.c.map((v,i)=>v*top.a+bottom[i]*(1-top.a));}
 function luminance(c){const a=c.map(v=>{v=v/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
 function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 const issues=[],page=rgb(getComputedStyle(scene).backgroundColor)?.c||[255,255,255],paths=[...scene.querySelectorAll('.decor path')].reverse();
 for(const region of scene.querySelectorAll('.region')){
  const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);let node;let failed=false;
  while((node=walker.nextNode())&&!failed){if(!node.textContent.trim())continue;const el=node.parentElement;if(!el||el.closest('script,style'))continue;const style=getComputedStyle(el),fg=rgb(style.color);if(!fg)continue;
   const range=document.createRange();range.selectNodeContents(node);const rects=[...range.getClientRects()].filter(r=>r.width>.1&&r.height>.1);const size=parseFloat(style.fontSize),threshold=size>=24||(size>=18.66&&Number(style.fontWeight)>=700)?3:4.5;
   for(const rect of rects){if(failed)break;for(const px of [rect.left+Math.min(1,rect.width/2),rect.left+rect.width/2,rect.right-Math.min(1,rect.width/2)]){
    const py=rect.top+rect.height/2;let backgrounds=[page];
    for(const path of paths){const matrix=path.getScreenCTM();if(!matrix||!path.getBoundingClientRect().width)continue;const pt=new DOMPoint(px,py).matrixTransform(matrix.inverse());if(!path.isPointInFill(pt))continue;
     const fill=getComputedStyle(path).fill,solid=rgb(fill);if(solid)backgrounds=[mix(solid,page)];else if(fill.includes('url(')){const id=path.getAttribute('fill').match(/#([^)]*)/);const gradient=id&&scene.querySelector('[id="'+CSS.escape(id[1])+'"]');if(gradient){const stops=[...gradient.querySelectorAll('stop')].map(s=>rgb(getComputedStyle(s).stopColor)).filter(Boolean);if(stops.length)backgrounds=stops.map(s=>mix(s,page));}}
     break;
    }
    const ancestors=[];for(let a=el;a&&a!==scene;a=a.parentElement)ancestors.push(a);ancestors.reverse();for(const a of ancestors){const bg=rgb(getComputedStyle(a).backgroundColor);if(bg&&bg.a>0)backgrounds=backgrounds.map(b=>mix(bg,b));}
    const minimum=Math.min(...backgrounds.map(bg=>ratio(mix(fg,bg),bg)));
    if(minimum+.01<threshold){issues.push({regionId:region.id,ratio:Number(minimum.toFixed(2)),required:threshold,text:node.textContent.slice(0,80)});failed=true;break;}
   }}
  }
 }
 return issues;
}`;
export const clippingScript = String.raw`function auditClipping(scene){
 const issues=[];
 for(const region of scene.querySelectorAll('.region')){
  const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);let node;let failed=false;
  while((node=walker.nextNode())&&!failed){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);const rects=[...range.getClientRects()].filter(r=>r.width>.1&&r.height>.1);
   for(let a=node.parentElement;a&&a!==scene;a=a.parentElement){const style=getComputedStyle(a),clipX=['hidden','clip'].includes(style.overflowX),clipY=['hidden','clip'].includes(style.overflowY);if(!clipX&&!clipY)continue;const box=a.getBoundingClientRect();if(rects.some(r=>clipX&&(r.left<box.left-1||r.right>box.right+1)||clipY&&(r.top<box.top-1||r.bottom>box.bottom+1))){issues.push({regionId:region.id,element:a.tagName,text:node.textContent.slice(0,80)});failed=true;break;}}
  }
 }
 // Labels a chart needs to state its conclusion are marked data-conclusion-label. Each must be displayed, uncovered by other such labels, and inside every clipping or scrolling box and the viewport without scrolling.
 for(const figure of scene.querySelectorAll('.chart')){
  const region=figure.closest('.region'),boxes=[];
  for(const label of figure.querySelectorAll('[data-conclusion-label]')){
   if(label.closest('details:not([open])'))continue;
   const style=getComputedStyle(label),rects=[...label.getClientRects()].filter(r=>r.width>.1&&r.height>.1),text=label.textContent.slice(0,80);
   if(!rects.length||style.visibility==='hidden'||Number(style.opacity)===0){issues.push({regionId:region?.id,element:'conclusion label',text,reason:'Conclusion label is not displayed'});continue;}
   let failed=false;
   for(let a=label.parentElement;a&&a!==document.body&&!failed;a=a.parentElement){const s=getComputedStyle(a);if(s.overflowX==='visible'&&s.overflowY==='visible')continue;const box=a.getBoundingClientRect();if(rects.some(r=>r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)){issues.push({regionId:region?.id,element:'conclusion label',text,reason:'Conclusion label is clipped or only reachable by scrolling',scroller:a.className&&String(a.className.baseVal??a.className)||a.tagName});failed=true;}}
   if(!failed&&rects.some(r=>r.left<-1||r.right>document.documentElement.clientWidth+1)){issues.push({regionId:region?.id,element:'conclusion label',text,reason:'Conclusion label is outside the viewport'});failed=true;}
   for(const r of rects){const other=boxes.find(b=>b.label!==label&&!b.label.contains(label)&&!label.contains(b.label)&&Math.min(r.right,b.r.right)-Math.max(r.left,b.r.left)>1&&Math.min(r.bottom,b.r.bottom)-Math.max(r.top,b.r.top)>1);if(other&&!failed){issues.push({regionId:region?.id,element:'conclusion label',text,reason:'Conclusion labels overlap',other:other.label.textContent.slice(0,80)});failed=true;}boxes.push({label,r});}
  }
 }
 return issues;
}`;
/** CINE-006/007 (semantic-player.7): the grayscale hierarchy. Each region's dominant foreground (its first text colour, or a 32 × 32
 * canvas sample of its image) is reduced to relative luminance and compared with the page, weighted by the region's share of the
 * scene; the primary subject (the hero media region, else the focal block) should carry the strongest weight. A diagnostic, not eye tracking. */
export const grayscaleScript = String.raw`function auditGrayscale(scene){
 function rgb(value){const m=value.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const n=m[1].split(/[, /]+/).filter(Boolean).map(Number);return n.length>=3?{c:n.slice(0,3),a:n[3]??1}:null;}
 function luminance(c){const a=c.map(v=>{v=v/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
 const round=v=>Math.round(v*1000)/1000,sb=scene.getBoundingClientRect(),page=rgb(getComputedStyle(scene).backgroundColor),pageL=luminance(page&&page.a>0?page.c:[255,255,255]);
 const regions=[...scene.querySelectorAll('.regions > .region, .source-strip > .region')].map(r=>{
  const img=r.querySelector('img'),box=(img?img.closest('.image-crop')||img:r).getBoundingClientRect();let lum=null,method='text colour';
  if(img&&img.complete&&img.naturalWidth){try{const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,32,32);const d=ctx.getImageData(0,0,32,32).data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=luminance([d[i],d[i+1],d[i+2]]);lum=sum/(d.length/4);method='image pixels (32 by 32 canvas sample)';}catch(e){method='image not sampled';}}
  if(lum===null){const walker=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let node,el=null;while((node=walker.nextNode()))if(node.textContent.trim()&&!node.parentElement.closest('script,style')){el=node.parentElement;break;}const fg=rgb(getComputedStyle(el||r).color);lum=fg?luminance(fg.c):pageL;}
  const area=Math.max(0,box.width*box.height)/Math.max(1,sb.width*sb.height),contrast=Math.abs(lum-pageL);
  return {regionId:r.id,blockId:r.dataset.blockId,mediaRole:r.dataset.mediaRole||null,luminance:round(lum),contrast:round(contrast),area:round(area),weight:round(contrast*area),method};
 });
 const primary=regions.find(r=>r.mediaRole==='hero')||regions.find(r=>r.blockId===scene.dataset.focalBlock)||regions[0]||null,strongest=regions.reduce((a,b)=>!a||b.weight>a.weight?b:a,null);
 return {method:'luminance-only (grayscale) contrast of each region\'s dominant foreground against the page, weighted by its share of the scene; a bounding-box diagnostic, not eye tracking',pageLuminance:round(pageL),primary:primary?{regionId:primary.regionId,blockId:primary.blockId,weight:primary.weight,contrast:primary.contrast}:null,strongest:strongest?strongest.regionId:null,holds:!!primary&&!!strongest&&primary.weight>=strongest.weight*.9,regions};
}`;
