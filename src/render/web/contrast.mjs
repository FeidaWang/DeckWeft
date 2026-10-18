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
 return issues;
}`;
