import {DeckError} from '../core/errors.mjs';
import {visibleBlockIds} from '../design/plan.mjs';
/**
 * Export geometry (S7). Native targets place semantic content where the derived scene was actually drawn: the static HTML
 * export, opened with page scripts disabled at 1440 px after fonts and images are ready. Text comes from the rendered
 * derived scene; the check stage compares it with the semantic document. Nothing here guesses a layout.
 */
export const EXPORT_LAYOUT_FORMAT='deckweft-export-layout';
export const EXPORT_VIEWPORT={width:1440,height:810};

/**
 * Executed in the page by the export harness (Playwright `page.evaluate`), never imported by page code. Self-contained: no
 * imports or module constants. Pseudo-element content is first copied into real spans so its text and boxes can be measured;
 * the scene heights before and after are returned so a reflow is visible.
 */
export function measureExportLayout(){
 const sx=scrollX,sy=scrollY,scenesEl=[...document.querySelectorAll('.web-scene')];
 const heights=()=>scenesEl.map(s=>Math.round(s.getBoundingClientRect().height*100)/100);
 const before=heights();
 // 1. Materialise ::before / ::after so their text and boxes exist in the DOM. The original pseudo-element is suppressed.
 const sheet=document.createElement('style');sheet.textContent='[data-dw-pseudo~="before"]::before,[data-dw-pseudo~="after"]::after{content:none!important}';document.head.append(sheet);
 const cssText=(value,el)=>{if(!value||value==='none'||value==='normal')return null;const main=value.split(/\s\/\s/)[0];let out='',ok=true;main.replace(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|attr\(([^)]+)\)|(counter\w*\([^)]*\))/g,(m,a,b,attr,counter)=>{if(counter)ok=false;else if(attr)out+=el.getAttribute(attr.trim())||'';else out+=(a??b).replace(/\\(.)/g,'$1');return '';});return ok?out:null;};
 let materialized=0,unresolved=0;
 for(const scene of scenesEl)for(const el of [scene,...scene.querySelectorAll('*')]){if(el.closest('svg'))continue;
  for(const which of ['before','after']){const cs=getComputedStyle(el,'::'+which),text=cssText(cs.content,el);if(text===null){if(cs.content&&!['none','normal'].includes(cs.content))unresolved++;continue;}
   const span=document.createElement('span');for(const p of cs)span.style.setProperty(p,cs.getPropertyValue(p));span.textContent=text;span.dataset.dwPseudo=which;
   el.setAttribute('data-dw-pseudo',((el.getAttribute('data-dw-pseudo')||'')+' '+which).trim());if(which==='before')el.prepend(span);else el.append(span);materialized++;}
 }
 const after=heights();
 // 2. Helpers. Colours are resolved by painting one pixel, so every CSS colour syntax becomes sRGB hex and alpha.
 const box=n=>{const b=n.getBoundingClientRect();return {x:b.left+sx,y:b.top+sy,width:b.width,height:b.height};};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true}),memo=new Map();
 const color=c=>{if(!c||c==='none'||c==='transparent'||c.startsWith('url('))return null;if(memo.has(c))return memo.get(c);ctx.clearRect(0,0,1,1);ctx.fillStyle='rgba(0,0,0,0)';ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const [r,g,b,a]=ctx.getImageData(0,0,1,1).data,v=a?{hex:[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase(),alpha:Math.round(a/255*1000)/1000}:null;memo.set(c,v);return v;};
 const px=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:0;};
 const opacity=(n,stop)=>{let o=1;for(let a=n;a&&a!==stop;a=a.parentElement)o*=+getComputedStyle(a).opacity;return Math.round(o*1000)/1000;};
 let measureId=0;const tag=n=>{if(!n.dataset.dwMeasure)n.dataset.dwMeasure=String(++measureId);return n.dataset.dwMeasure;};
 const textStyle=(n,stop)=>{const s=getComputedStyle(n),c=color(s.color),o=opacity(n,stop);return {fontFamily:s.fontFamily,fontSize:px(s.fontSize),fontWeight:+s.fontWeight||400,italic:s.fontStyle!=='normal',lineHeight:s.lineHeight==='normal'?null:px(s.lineHeight),letterSpacing:s.letterSpacing==='normal'?0:px(s.letterSpacing),color:c&&{hex:c.hex,alpha:Math.round(c.alpha*o*1000)/1000},align:s.textAlign,transform:s.textTransform,whiteSpace:s.whiteSpace,wrap:s.textWrapStyle||s.textWrap||'wrap',underline:s.textDecorationLine.includes('underline'),superscript:s.verticalAlign==='super'||!!n.closest('sup'),measureId:tag(n)};};
 // Content of a closed disclosure still reports boxes in Chromium; it is not drawn, so it is not measured.
 const visible=n=>!n.closest('details:not([open])>:not(summary)')&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'&&+getComputedStyle(n).opacity>0;
 const isContainer=n=>{const d=getComputedStyle(n).display;return !d.startsWith('inline')||['inline-block','inline-flex','inline-grid','inline-table'].includes(d);};
 const collapse=(text,ws)=>ws.startsWith('pre')&&ws!=='pre-line'?text:ws==='pre-line'?text.replace(/[ \t]+/g,' ').replace(/ ?\n ?/g,'\n'):text.replace(/\s+/g,' ');
 // Balanced text: the browser's own line breaks, which PowerPoint cannot reproduce by wrapping.
 const lineTexts=nodes=>{const out=[];let cur='',top=null;for(const t of nodes){const s=t.textContent;for(let i=0;i<s.length;i++){const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+1);const rect=[...r.getClientRects()].find(x=>x.width>.1);if(rect){if(top!==null&&rect.top>top+rect.height*.5){out.push(cur);cur='';}if(top===null||rect.top>top+rect.height*.5)top=rect.top;}cur+=s[i];}}out.push(cur);return out.map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);};
 // 3. Text parts: every visible text node joins its nearest block-level container. Runs keep inline style and links.
 function texts(root,{skip=()=>false,stop}){
  const parts=new Map(),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let t;
  while((t=walker.nextNode())){const el=t.parentElement;if(!el||el.closest('svg,summary,script,style,[hidden],details:not([open])>:not(summary)')||skip(el)||!t.textContent)continue;
   const range=document.createRange();range.selectNodeContents(t);const rects=[...range.getClientRects()].filter(r=>r.width>.1&&r.height>.1);if(!rects.length&&!t.textContent.trim())continue;if(!rects.length||!visible(el))continue;
   let c=el;while(c!==root&&!isContainer(c))c=c.parentElement;
   if(!parts.has(c))parts.set(c,{nodes:[],rects:[]});const p=parts.get(c);p.nodes.push(t);p.rects.push(...rects);
  }
  return [...parts].map(([c,p])=>{
   const ws=getComputedStyle(c).whiteSpace,runs=[];
   for(const t of p.nodes){const el=t.parentElement,style=textStyle(el,stop),link=el.closest('a[href]'),href=link?link.getAttribute('href'):null,text=collapse(t.textContent,getComputedStyle(el).whiteSpace),last=runs.at(-1);
    if(last&&last.href===href&&JSON.stringify({...last.style,measureId:0})===JSON.stringify({...style,measureId:0}))last.text+=text;else runs.push({text,style,...(href?{href}:{})});}
   if(!ws.startsWith('pre')||ws==='pre-line'){runs[0].text=runs[0].text.replace(/^\s+/,'');runs.at(-1).text=runs.at(-1).text.replace(/\s+$/,'');for(let i=1;i<runs.length;i++)if(/\s$/.test(runs[i-1].text))runs[i].text=runs[i].text.replace(/^ +/,'');}
   const xs=p.rects.map(r=>[r.left+sx,r.top+sy,r.right+sx,r.bottom+sy]),cb=box(c),cs=getComputedStyle(c);
   const content={x:cb.x+px(cs.paddingLeft)+px(cs.borderLeftWidth),y:cb.y+px(cs.paddingTop)+px(cs.borderTopWidth),width:cb.width-px(cs.paddingLeft)-px(cs.paddingRight)-px(cs.borderLeftWidth)-px(cs.borderRightWidth),height:cb.height-px(cs.paddingTop)-px(cs.paddingBottom)-px(cs.borderTopWidth)-px(cs.borderBottomWidth)};
   const lines=[...new Set(p.rects.map(r=>Math.round(r.top)))].length;
   const list=c.tagName==='LI'&&getComputedStyle(c).display==='list-item'&&cs.listStyleType!=='none'?{ordered:c.parentElement.tagName==='OL',type:cs.listStyleType,index:[...c.parentElement.children].indexOf(c)+(+c.parentElement.getAttribute('start')||1),list:tag(c.parentElement)}:null;
   const wrap=getComputedStyle(c).textWrapStyle||getComputedStyle(c).textWrap;
   return {...(wrap==='balance'&&lines>1?{lineTexts:lineTexts(p.nodes)}:{}),tag:c.tagName.toLowerCase(),className:c.getAttribute('class')||'',box:{x:Math.min(...xs.map(v=>v[0])),y:Math.min(...xs.map(v=>v[1])),width:Math.max(...xs.map(v=>v[2]))-Math.min(...xs.map(v=>v[0])),height:Math.max(...xs.map(v=>v[3]))-Math.min(...xs.map(v=>v[1]))},content,lines,style:textStyle(c,stop),runs:runs.filter(r=>r.text),...(list?{list}:{})};
  }).filter(p=>p.runs.length);
 }
 // 4. Painted boxes (backgrounds and borders) outside plots, tables and diagrams.
 function boxes(root,skip,stop){
  const out=[];for(const n of [root,...root.querySelectorAll('*')]){if(n.closest('svg')||skip(n)||!visible(n))continue;const s=getComputedStyle(n),fill=color(s.backgroundColor),o=opacity(n,stop);
   const side=k=>{const w=px(s['border'+k+'Width']),c=color(s['border'+k+'Color']);return w>0&&c&&s['border'+k+'Style']!=='none'?{width:w,color:{hex:c.hex,alpha:Math.round(c.alpha*o*1000)/1000},dash:s['border'+k+'Style']}:null;};
   const borders={top:side('Top'),right:side('Right'),bottom:side('Bottom'),left:side('Left')};
   if(!fill&&!Object.values(borders).some(Boolean)&&s.backgroundImage==='none')continue;
   out.push({tag:n.tagName.toLowerCase(),box:box(n),fill:fill&&{hex:fill.hex,alpha:Math.round(fill.alpha*o*1000)/1000},borders,radius:px(s.borderTopLeftRadius),backgroundImage:s.backgroundImage==='none'?null:s.backgroundImage.slice(0,120)});}
  return out;
 }
 // 5. SVG geometry in page coordinates.
 const pt=(el,x,y)=>{const m=el.getScreenCTM(),p=new DOMPoint(x,y).matrixTransform(m);return [Math.round((p.x+sx)*100)/100,Math.round((p.y+sy)*100)/100];};
 function pathCommands(el){
  const d=el.getAttribute('d')||'',tokens=d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g)||[],out=[];let i=0,cmd='',x=0,y=0,x0=0,y0=0,unsupported=false;const num=()=>+tokens[i++];
  while(i<tokens.length){if(/[a-zA-Z]/.test(tokens[i]))cmd=tokens[i++];const rel=cmd===cmd.toLowerCase(),C=cmd.toUpperCase(),ax=v=>rel?x+v:v,ay=v=>rel?y+v:v;
   if(C==='Z'){out.push({c:'Z'});x=x0;y=y0;continue;}
   if(C==='M'){x=ax(num());y=ay(num());x0=x;y0=y;out.push({c:'M',p:[pt(el,x,y)]});cmd=rel?'l':'L';continue;}
   if(C==='L'){x=ax(num());y=ay(num());out.push({c:'L',p:[pt(el,x,y)]});continue;}
   if(C==='H'){x=rel?x+num():num();out.push({c:'L',p:[pt(el,x,y)]});continue;}
   if(C==='V'){y=rel?y+num():num();out.push({c:'L',p:[pt(el,x,y)]});continue;}
   if(C==='C'){const a=[ax(num()),ay(num())],b=[ax(num()),ay(num())];x=ax(num());y=ay(num());out.push({c:'C',p:[pt(el,...a),pt(el,...b),pt(el,x,y)]});continue;}
   if(C==='Q'){const a=[ax(num()),ay(num())];x=ax(num());y=ay(num());out.push({c:'Q',p:[pt(el,...a),pt(el,x,y)]});continue;}
   unsupported=true;break;
  }
  return {commands:out,unsupported};
 }
 const paint=(el,attr)=>{const s=getComputedStyle(el),v=s[attr],o=opacity(el,el.ownerSVGElement)*+(attr==='fill'?s.fillOpacity:s.strokeOpacity);
  if(v&&v.startsWith('url(')){const id=(el.getAttribute(attr)||v).match(/#([^)"']+)/),g=id&&el.ownerSVGElement.querySelector('[id="'+CSS.escape(id[1])+'"]');if(!g)return null;
   const bb=el.getBBox(),stops=[...g.querySelectorAll('stop')].map(st=>({offset:px(st.getAttribute('offset'))/(String(st.getAttribute('offset')).includes('%')?100:1),color:color(getComputedStyle(st).stopColor)}));
   const f=k=>{const a=g.getAttribute(k)||'';return a.includes('%')?px(a)/100:+a;},p1=pt(el,bb.x+f('x1')*bb.width,bb.y+f('y1')*bb.height),p2=pt(el,bb.x+(g.hasAttribute('x2')?f('x2'):1)*bb.width,bb.y+f('y2')*bb.height);
   return {gradient:{stops,from:p1,to:p2},alpha:o};}
  const c=color(v);return c&&{hex:c.hex,alpha:Math.round(c.alpha*o*1000)/1000};};
 const svgShape=el=>{const s=getComputedStyle(el),b=box(el),kind=el.tagName.toLowerCase(),dash=s.strokeDasharray&&s.strokeDasharray!=='none'?s.strokeDasharray:null;
  const base={kind,box:b,fill:paint(el,'fill'),stroke:paint(el,'stroke'),strokeWidth:px(s.strokeWidth)*(el.getScreenCTM()?.a||1),dash};
  if(kind==='line')return {...base,from:pt(el,+el.getAttribute('x1'),+el.getAttribute('y1')),to:pt(el,+el.getAttribute('x2'),+el.getAttribute('y2'))};
  if(kind==='rect')return {...base,radius:px(el.getAttribute('rx'))*(el.getScreenCTM()?.a||1)};
  if(['path','polyline','polygon'].includes(kind)){if(kind!=='path'){const pts=(el.getAttribute('points')||'').trim().split(/[\s,]+/).map(Number),c=[];for(let i=0;i+1<pts.length;i+=2)c.push({c:i?'L':'M',p:[pt(el,pts[i],pts[i+1])]});if(kind==='polygon')c.push({c:'Z'});return {...base,commands:c};}
   const {commands,unsupported}=pathCommands(el),len=el.getTotalLength?el.getTotalLength():0,a=len?el.getPointAtLength(0):null,z=len?el.getPointAtLength(len):null;
   return {...base,commands,unsupported,...(a?{from:pt(el,a.x,a.y),to:pt(el,z.x,z.y)}:{}),markerEnd:s.markerEnd!=='none',markerStart:s.markerStart!=='none'};}
  return base;};
 const svgText=(t,stop)=>{const spans=[...t.querySelectorAll('tspan')].filter(n=>n.textContent.trim()),lines=(spans.length?spans:[t]).map(n=>({text:n.textContent,box:box(n)}));return {box:box(t),lines,style:textStyle(t,stop),anchor:getComputedStyle(t).textAnchor};};
 // 6. Per-component structures.
 function table(t,stop){return {box:box(t),rows:[...t.rows].filter(visible).map(r=>({box:box(r),cells:[...r.cells].filter(visible).map(c=>{const s=getComputedStyle(c),side=k=>{const w=px(s['border'+k+'Width']),col=color(s['border'+k+'Color']);return w>0&&col&&s['border'+k+'Style']!=='none'?{width:w,color:col}:null;};
  return {box:box(c),header:c.tagName==='TH',colspan:c.colSpan,rowspan:c.rowSpan,fill:color(s.backgroundColor),borders:{top:side('Top'),right:side('Right'),bottom:side('Bottom'),left:side('Left')},padding:[px(s.paddingTop),px(s.paddingRight),px(s.paddingBottom),px(s.paddingLeft)],valign:s.verticalAlign,texts:texts(c,{stop})};})})),caption:t.caption&&visible(t.caption)?texts(t.caption,{stop}):[]};}
 function plotOf(fig){return [...fig.children].find(n=>visible(n)&&!n.matches('figcaption,.legend,.chart-notes,p,details,.component-note,.static-state-note'))||null;}
 function chartPlot(plot,stop){
  // A mark's paint is its data graphic: a filled shape before any unfilled stroke (axis breaks and reference lines are drawn in the text colour).
  const graphic=m=>{if(m.matches('rect,circle,ellipse,path,line,polyline'))return m;const all=[...m.querySelectorAll('rect,circle,ellipse,path,polyline,line')],filled=all.filter(e=>getComputedStyle(e).fill!=='none'&&e.tagName!=='line');return filled.find(e=>['rect','circle','ellipse'].includes(e.tagName))||filled[0]||all.find(e=>e.tagName!=='line'&&getComputedStyle(e).stroke!==getComputedStyle(m).color)||all[0]||(m.closest('svg')?null:m);};
  const marks=[...plot.querySelectorAll('[data-series-id]')].filter(visible).map(m=>{const shape=graphic(m),s=shape&&getComputedStyle(shape);
   const fill=shape?(shape.closest('svg')?paint(shape,'fill'):color(s.backgroundColor)):null,stroke=shape&&shape.closest('svg')?paint(shape,'stroke'):null;
   return {seriesId:m.dataset.seriesId,objectId:m.dataset.objectId||null,focus:m.closest('[data-focus]')?.dataset.focus??null,tag:shape?.tagName.toLowerCase()||null,fill,stroke,strokeWidth:shape&&shape.closest('svg')?px(s.strokeWidth)*(shape.getScreenCTM()?.a||1):0,dash:s&&s.strokeDasharray!=='none'?s.strokeDasharray:null,box:box(m)};});
  const label=plot.querySelector('svg text, .chart-row-label, td, th'),frame=plot.matches('svg[viewBox]')?plot:plot.querySelector(':scope>svg[viewBox]'),tbl=plot.matches('table')?plot:plot.querySelector('table');
  // SVG text is drawn at its computed size times the frame's scale; HTML rows draw at the computed size.
  const texts=[...plot.querySelectorAll('svg text')].filter(t=>visible(t)&&t.textContent.trim()&&!t.closest('[data-series-id],[data-event-id]')).map(t=>({text:t.textContent,box:box(t),style:textStyle(t,stop),anchor:getComputedStyle(t).textAnchor}));
  return {box:box(plot),measureId:tag(plot),tag:plot.tagName.toLowerCase(),className:plot.getAttribute('class')||'',marks,texts,labelStyle:label?textStyle(label,stop):null,scale:frame&&label&&label.closest('svg')===frame?frame.getScreenCTM().a:1,svg:!!frame,...(tbl&&visible(tbl)?{table:table(tbl,stop)}:{})};
 }
 function diagram(svg,stop){
  const groups=[...svg.querySelectorAll('g[data-object-id]')].filter(visible);
  return {box:box(svg),scale:svg.getScreenCTM()?.a||1,// S9b: a blueprint part's reading-order number is measured with its part.
   nodes:groups.filter(g=>g.querySelector(':scope>rect,:scope>circle,:scope>ellipse')).map(g=>{const n=g.querySelector(':scope>.blueprint-number');return {id:g.dataset.objectId,shape:svgShape(g.querySelector(':scope>rect,:scope>circle,:scope>ellipse')),texts:[...g.querySelectorAll(':scope>text')].map(t=>svgText(t,stop)),...(n&&visible(n)?{number:{shape:svgShape(n.querySelector('circle')),texts:[...n.querySelectorAll('text')].map(t=>svgText(t,stop))}}:{})};}),
   // Edges without an author id are drawn as plain groups around a marker-ended path; they are measured too (S9a found 0 of 2).
   edges:[...groups.filter(g=>!g.querySelector(':scope>rect,:scope>circle,:scope>ellipse')&&g.querySelector('path,line,polyline')),...[...svg.querySelectorAll('g:not([data-object-id])')].filter(g=>visible(g)&&g.querySelector(':scope>path[marker-end]')&&!g.querySelector(':scope>rect,:scope>circle,:scope>ellipse'))].map(g=>({id:g.dataset.objectId||null,line:svgShape(g.querySelector('path,line,polyline')),texts:[...g.querySelectorAll('text')].map(t=>svgText(t,stop))}))};
 }
 function image(fig){
  const img=fig.querySelector('img');if(!img||!visible(img))return null;const s=getComputedStyle(img),b=box(img),win=box(img.closest('.image-crop')||img),iw=img.naturalWidth,ih=img.naturalHeight;
  const fit=s.objectFit,k=fit==='cover'?Math.max(b.width/iw,b.height/ih):fit==='contain'||fit==='scale-down'?Math.min(b.width/iw,b.height/ih):fit==='none'?1:null,cw=k?iw*k:b.width,ch=k?ih*k:b.height;
  const [px1,py1]=s.objectPosition.split(' '),off=(v,free)=>v.endsWith('%')?free*parseFloat(v)/100:parseFloat(v),c={x:b.x+off(px1,b.width-cw),y:b.y+off(py1||'50%',b.height-ch),width:cw,height:ch};
  const v={x:Math.max(c.x,b.x,win.x),y:Math.max(c.y,b.y,win.y)};v.width=Math.min(c.x+c.width,b.x+b.width,win.x+win.width)-v.x;v.height=Math.min(c.y+c.height,b.y+b.height,win.y+win.height)-v.y;
  return {box:v,source:{left:(v.x-c.x)/c.width,top:(v.y-c.y)/c.height,right:(c.x+c.width-v.x-v.width)/c.width,bottom:(c.y+c.height-v.y-v.height)/c.height},naturalWidth:iw,naturalHeight:ih,alt:img.getAttribute('alt')||'',ready:img.complete&&iw>0,measureId:tag(img)};
 }
 // 7. Scenes.
 const scenes=scenesEl.map(scene=>{
  const s=getComputedStyle(scene),decor=[...scene.querySelectorAll(':scope>svg.decor path')].filter(p=>p.getBoundingClientRect().width).map(p=>{const clip=p.getAttribute('clip-path'),r=clip&&scene.querySelector('[id="'+CSS.escape((clip.match(/#([^)"']+)/)||[])[1]||'')+'"] rect');
   return {id:p.dataset.graphicId||null,...svgShape(p),clip:r?[[+r.getAttribute('x'),+r.getAttribute('y')],[+r.getAttribute('x')+ +r.getAttribute('width'),+r.getAttribute('y')],[+r.getAttribute('x')+ +r.getAttribute('width'),+r.getAttribute('y')+ +r.getAttribute('height')],[+r.getAttribute('x'),+r.getAttribute('y')+ +r.getAttribute('height')]].map(([x,y])=>pt(p,x,y)):null};});
  const folio=scene.querySelector(':scope>.folio'),own=[...scene.children].filter(n=>!n.matches('.regions,.folio,svg.decor,details,script,style'));
  const sideOf=k=>{const w=px(s['border'+k+'Width']),c=color(s['border'+k+'Color']);return w>0&&c&&s['border'+k+'Style']!=='none'?{width:w,color:c,dash:s['border'+k+'Style']}:null;},sceneBorders={top:sideOf('Top'),right:sideOf('Right'),bottom:sideOf('Bottom'),left:sideOf('Left')};
  const regions=[...scene.querySelectorAll('.region')].map(r=>{
   const fig=r.querySelector('figure.chart'),plot=fig&&plotOf(fig),dsvg=r.querySelector('figure.semantic-diagram svg'),allTables=[...r.querySelectorAll('table')].filter(t=>visible(t)&&!(plot&&plot.contains(t))),tables=allTables.filter(t=>getComputedStyle(t).display==='table'&&[...t.rows].every(row=>!visible(row)||getComputedStyle(row).display==='table-row')),cards=allTables.length-tables.length,img=r.querySelector('figure.web-image')?image(r.querySelector('figure.web-image')):null;
   const special=n=>(plot&&plot.contains(n))||(dsvg&&dsvg.contains(n))||tables.some(t=>t.contains(n));
   const keys=[...r.querySelectorAll('svg')].filter(v=>visible(v)&&!special(v)&&v!==dsvg).flatMap(v=>[...v.querySelectorAll('rect,circle,ellipse,line,path,polyline,polygon')].filter(e=>e.getBoundingClientRect().width||e.getBoundingClientRect().height).map(svgShape));
   return {nodeId:r.id,blockId:r.dataset.blockId,component:r.dataset.component,bounds:box(r),texts:texts(r,{skip:special,stop:scene}),boxes:boxes(r,special,scene),shapes:keys,
    ...(plot?{plot:chartPlot(plot,scene)}:{}),...(dsvg?{diagram:diagram(dsvg,scene)}:{}),...(tables.length?{tables:tables.map(t=>table(t,scene))}:{}),...(img?{image:img}:{}),
    // A table the web lays out as cards is measured as its text and boxes; it is not a grid on the page.
    ...(cards?{cardTables:cards}:{}),disclosures:[...r.querySelectorAll('details:not([open])>summary')].filter(visible).map(n=>n.textContent.trim())};
  });
  return {sceneId:scene.id,bounds:box(scene),background:color(s.backgroundColor),backgroundImage:s.backgroundImage==='none'?null:s.backgroundImage.slice(0,120),decor,
   chrome:{texts:[...(folio?texts(folio,{stop:scene}):[]),...own.flatMap(n=>texts(n,{stop:scene}))],boxes:[...(Object.values(sceneBorders).some(Boolean)?[{tag:'section',box:box(scene),fill:null,borders:sceneBorders,radius:0,backgroundImage:null}]:[]),...(folio?boxes(folio,()=>false,scene):[]),...own.flatMap(n=>boxes(n,()=>false,scene))]},regions,
   disclosures:[...scene.querySelectorAll(':scope>details:not([open]):not([data-disclosure])>summary')].filter(visible).map(n=>n.textContent.trim())};
 });
 const images=[...document.images].map(i=>({ready:i.complete&&i.naturalWidth>0,measureId:i.dataset.dwMeasure||null}));
 return {format:'deckweft-export-layout',version:1,renderHash:document.body.dataset.renderHash,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
  fontStatus:document.fonts.status,fontFaces:[...document.fonts].map(f=>({family:f.family,status:f.status})),images,pseudo:{materialized,unresolved,heightsBefore:before,heightsAfter:after,stable:before.every((h,i)=>Math.abs(h-after[i])<.5)},scenes};
}

/** Node-side check that a measured layout belongs to this exact static render and is complete. */
export function assertExportLayout(layout,{renderHash,plan}){
 const issues=[],add=(code,message,extra={})=>issues.push({code,message,...extra});
 if(layout?.format!==EXPORT_LAYOUT_FORMAT||layout.version!==1)add('EXPORT_LAYOUT_FORMAT','Measure the static export with measureExportLayout().');
 else{
  if(layout.renderHash!==renderHash)add('EXPORT_LAYOUT_STALE','The layout was measured on a different render. Measure the current static export again.');
  if(layout.viewport?.width!==EXPORT_VIEWPORT.width)add('EXPORT_LAYOUT_VIEWPORT',`Measure at ${EXPORT_VIEWPORT.width} px; this layout used ${layout.viewport?.width} px.`);
  if(!layout.pseudo?.stable)add('EXPORT_LAYOUT_REFLOW','Copying pseudo-element content changed a scene height; the measurement does not match the page.');
  if(layout.pseudo?.unresolved)add('EXPORT_LAYOUT_PSEUDO',`${layout.pseudo.unresolved} pseudo-element content value(s) could not be resolved to text (counters).`);
  const ids=plan.scenes.map(s=>s.id);if(JSON.stringify(layout.scenes.map(s=>s.sceneId))!==JSON.stringify(ids))add('EXPORT_LAYOUT_SCENES','The measured scenes do not match the plan.');
  for(const scene of plan.scenes){const m=layout.scenes.find(s=>s.sceneId===scene.id);if(!m)continue;for(const id of visibleBlockIds(scene))if(!m.regions.some(r=>r.blockId===id))add('EXPORT_LAYOUT_REGION',`Block ${id} was not measured in scene ${scene.id}.`,{sceneId:scene.id,blockId:id});}
  // Measured values reach XML and CSS: boxes must be finite numbers and colours six hex digits.
  const bad=[];(function walk(v,path){if(bad.length>4||v===null||typeof v!=='object')return;
   if(['box','bounds','content'].some(k=>path.endsWith('.'+k))&&!['x','y','width','height'].every(k=>Number.isFinite(v[k])))bad.push(path);
   if('hex' in v&&!/^[0-9A-F]{6}$/i.test(String(v.hex)))bad.push(path);
   for(const [k,c]of Object.entries(v))if(k!=='platformFonts')walk(c,path+'.'+k);})(layout.scenes,'scenes');
  if(bad.length)add('EXPORT_LAYOUT_VALUES','Measured boxes must be finite numbers and colours six hex digits.',{paths:bad});
 }
 if(issues.length)throw new DeckError('EXPORT_LAYOUT_INVALID','The measured export layout cannot be used.',422,issues);
 return layout;
}
