/** PresentationML / DrawingML fragments for the v3 compiler. Strings only; no layout decisions are made here. */
export const NS={a:'http://schemas.openxmlformats.org/drawingml/2006/main',p:'http://schemas.openxmlformats.org/presentationml/2006/main',r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',c:'http://schemas.openxmlformats.org/drawingml/2006/chart'};
/** 16:9 slide, 13.333 × 7.5 in. */
export const SLIDE={width:12192000,height:6858000};
const EMU_PER_PT=12700;
export const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const xml=body=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body;
const DECORATIVE='<a:extLst><a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}"><adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext></a:extLst>';

/** Maps measured page pixels into the slide: one uniform scale that fits the scene, centred. */
export function sceneFrame(bounds){
 const s=Math.min(SLIDE.width/bounds.width,SLIDE.height/bounds.height),ox=(SLIDE.width-bounds.width*s)/2,oy=(SLIDE.height-bounds.height*s)/2;
 return {scale:s,ratio:s/9525,x:v=>Math.round(ox+(v-bounds.x)*s),y:v=>Math.round(oy+(v-bounds.y)*s),len:v=>Math.max(0,Math.round(v*s)),pt:v=>v*s/EMU_PER_PT};
}
export const xfrm=(f,b,{tag='a:xfrm',flipH=false,flipV=false}={})=>`<${tag}${flipH?' flipH="1"':''}${flipV?' flipV="1"':''}><a:off x="${f.x(b.x)}" y="${f.y(b.y)}"/><a:ext cx="${Math.max(1,f.len(b.width))}" cy="${Math.max(1,f.len(b.height))}"/></${tag}>`;
const HEX=/^[0-9A-Fa-f]{6}$/;
/** A solid fill, or no fill. Anything but six hex digits (a gradient, an unparsed value) is no fill, never an invalid colour. */
export const solid=c=>c&&HEX.test(c.hex||'')?`<a:solidFill><a:srgbClr val="${c.hex}">${c.alpha<1?`<a:alpha val="${Math.round(c.alpha*100000)}"/>`:''}</a:srgbClr></a:solidFill>`:'<a:noFill/>';
const DASH={dashed:'dash',dotted:'sysDot',solid:'solid'};
/** SVG dash arrays map to the nearest preset dash. */
export const presetDash=v=>{if(!v||v==='none'||v==='solid')return 'solid';if(DASH[v])return DASH[v];const n=String(v).split(/[\s,]+/).map(parseFloat).filter(Number.isFinite);if(n.length>=4)return 'dashDot';if(n[0]<=n[1]&&n[0]<=3)return 'sysDot';return 'dash';};
export const line=(c,widthEMU,{dash,head,tail}={})=>c?`<a:ln w="${Math.max(3175,Math.round(widthEMU))}">${solid(c)}<a:prstDash val="${presetDash(dash)}"/>${head?'<a:headEnd type="triangle" w="med" len="med"/>':''}${tail?'<a:tailEnd type="triangle" w="med" len="med"/>':''}</a:ln>`:'<a:ln><a:noFill/></a:ln>';

const GENERIC=new Set(['serif','sans-serif','monospace','system-ui','cursive','fantasy','ui-monospace','ui-sans-serif','ui-serif','-apple-system']);
const CJK_FONT=/PingFang|Songti|Hiragino|Heiti|Kaiti|STSong|STHeiti|STKaiti|Noto (Sans|Serif) (CJK|SC)|Source Han|Microsoft YaHei|SimSun|SimHei|DengXian|Yu Gothic|Meiryo|苹方|宋体|黑体/i;
/** The faces a run is drawn with: the fonts the browser actually used (CDP platform fonts) when measured, else the CSS stack. */
export function typefaces(style,platform){
 const stack=String(style.fontFamily||'').split(',').map(s=>s.trim().replace(/^["']|["']$/g,'')).filter(f=>f&&!GENERIC.has(f.toLowerCase()));
 const used=(platform||[]).filter(f=>f.glyphCount>0&&!/LastResort/i.test(f.familyName)).sort((a,b)=>b.glyphCount-a.glyphCount).map(f=>f.familyName);
 const mono=/monospace/i.test(style.fontFamily||'');
 const latin=used.find(f=>!CJK_FONT.test(f))||stack.find(f=>!CJK_FONT.test(f))||used[0]||stack[0]||(mono?'Menlo':'Arial');
 return {latin,ea:used.find(f=>CJK_FONT.test(f))||stack.find(f=>CJK_FONT.test(f))||latin};
}
export const ALIGN={left:'l',start:'l',center:'ctr',right:'r',end:'r',justify:'just','-webkit-center':'ctr'};
export function runProps(style,{f,lang,platform,link}){
 const sz=Math.min(400000,Math.max(100,Math.round(f.pt(style.fontSize)*100))),{latin,ea}=typefaces(style,platform);
 const spc=style.letterSpacing?Math.max(-400000,Math.min(400000,Math.round(f.pt(style.letterSpacing)*100))):0;
 // A face whose name already carries its weight (Avenir Next Demi Bold) is not bolded again.
 const named=/\b(demi ?bold|semi ?bold|bold|heavy|black|medium)\b/i.test(latin);
 return `<a:rPr lang="${lang}" sz="${sz}"${style.fontWeight>=600&&!named?' b="1"':''}${style.italic?' i="1"':''}${style.underline?' u="sng"':''}${spc?` spc="${spc}"`:''}${style.transform==='uppercase'?' cap="all"':''} dirty="0">${solid(style.color)}<a:latin typeface="${esc(latin)}"/><a:ea typeface="${esc(ea)}"/><a:cs typeface="${esc(latin)}"/>${link?`<a:hlinkClick r:id="${link}"/>`:''}</a:rPr>`;
}
/** One paragraph of runs; newlines inside a run become line breaks. */
export function paragraph(runs,{f,lang,fonts,links={},align='l',lineHeight=null,spaceBefore=0,bullet=null}){
 const first=runs[0]?.style,ln=lineHeight?`<a:lnSpc><a:spcPts val="${Math.max(0,Math.round(f.pt(lineHeight)*100))}"/></a:lnSpc>`:'',bef=`<a:spcBef><a:spcPts val="${Math.max(0,Math.round(f.pt(spaceBefore)*100))}"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft>`;
 const NUM={'lower-alpha':'alphaLcPeriod','lower-latin':'alphaLcPeriod','upper-alpha':'alphaUcPeriod','upper-latin':'alphaUcPeriod','lower-roman':'romanLcPeriod','upper-roman':'romanUcPeriod'};
 const bu=bullet?(bullet.ordered?`<a:buFontTx/><a:buAutoNum type="${NUM[bullet.type]||'arabicPeriod'}" startAt="${Math.min(32767,Math.max(1,Math.round(bullet.index)||1))}"/>`:`<a:buFont typeface="Arial"/><a:buChar char="${bullet.type==='circle'?'◦':bullet.type==='square'?'▪':'•'}"/>`):'<a:buNone/>';
 const indent=bullet?` marL="${bullet.indent}" indent="-${bullet.indent}"`:' marL="0" indent="0"';
 const body=runs.flatMap(r=>{const props=runProps(r.style,{f,lang,platform:fonts(r.style),link:r.href&&Object.hasOwn(links,r.href)?links[r.href]:null});return r.text.split('\n').flatMap((t,i)=>[...(i?[`<a:br>${props}</a:br>`]:[]),...(t?[`<a:r>${props}<a:t>${esc(t)}</a:t></a:r>`]:[])]);}).join('');
 return `<a:p><a:pPr${indent} algn="${align}">${ln}${bef}${bu}</a:pPr>${body}${first?`<a:endParaRPr lang="${lang}" sz="${Math.min(400000,Math.max(100,Math.round(f.pt(first.fontSize)*100)))}" dirty="0"/>`:`<a:endParaRPr lang="${lang}" dirty="0"/>`}</a:p>`;
}
export const textBody=(paragraphs,{anchor='t',tag='p:txBody',wrap=true}={})=>`<${tag}><a:bodyPr wrap="${wrap?'square':'none'}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${anchor}" rtlCol="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paragraphs.join('')||'<a:p><a:endParaRPr dirty="0"/></a:p>'}</${tag}>`;

const nv=(id,name,{descr,decorative,inner='',kind='p:cNvSpPr',extra='',nvPr='<p:nvPr/>'}={})=>`<p:cNvPr id="${id}" name="${esc(name)}"${descr?` descr="${esc(descr)}"`:''}>${decorative?DECORATIVE:''}</p:cNvPr><${kind}${extra}>${inner}</${kind}>${nvPr}`;
/** A text box, or the slide title placeholder. */
export function textShape({id,name,f,box,body,title=false,decorative=false}){
 return `<p:sp><p:nvSpPr>${nv(id,name,{decorative,...(title?{inner:'<a:spLocks noGrp="1"/>',nvPr:'<p:nvPr><p:ph type="title"/></p:nvPr>'}:{extra:' txBox="1"'})})}</p:nvSpPr><p:spPr>${xfrm(f,box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>${body}</p:sp>`;
}
/** A preset shape (rectangle, rounded rectangle or ellipse) with an optional text body. */
export function presetShape({id,name,f,box,preset='rect',fill=null,stroke=null,strokeWidth=0,dash=null,radius=0,body='',decorative=false,descr}){
 const adj=preset==='roundRect'?`<a:avLst><a:gd name="adj" fmla="val ${Math.round(Math.min(.5,radius/Math.max(1,Math.min(box.width,box.height)))*100000)}"/></a:avLst>`:'<a:avLst/>';
 return `<p:sp><p:nvSpPr>${nv(id,name,{decorative,descr})}</p:nvSpPr><p:spPr>${xfrm(f,box)}<a:prstGeom prst="${preset}">${adj}</a:prstGeom>${solid(fill)}${line(stroke,f.len(strokeWidth),{dash})}</p:spPr>${body}</p:sp>`;
}
/** A free-form shape from absolute page-pixel path commands (M, L, C, Q, Z). */
export function pathShape({id,name,f,commands,fill=null,stroke=null,strokeWidth=0,dash=null,decorative=true,gradient=null}){
 const pts=commands.flatMap(c=>c.p||[]);if(!pts.length)return '';
 const minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1])),maxX=Math.max(...pts.map(p=>p[0])),maxY=Math.max(...pts.map(p=>p[1]));
 const box={x:minX,y:minY,width:Math.max(.01,maxX-minX),height:Math.max(.01,maxY-minY)},w=Math.max(1,f.len(box.width)),h=Math.max(1,f.len(box.height));
 const P=([x,y])=>`<a:pt x="${Math.round(f.len(x-minX))}" y="${Math.round(f.len(y-minY))}"/>`;
 const path=commands.map(c=>c.c==='M'?`<a:moveTo>${P(c.p[0])}</a:moveTo>`:c.c==='L'?`<a:lnTo>${P(c.p[0])}</a:lnTo>`:c.c==='C'?`<a:cubicBezTo>${c.p.map(P).join('')}</a:cubicBezTo>`:c.c==='Q'?`<a:quadBezTo>${c.p.map(P).join('')}</a:quadBezTo>`:'<a:close/>').join('');
 const paint=gradient?gradFill(gradient):solid(fill);
 return `<p:sp><p:nvSpPr>${nv(id,name,{decorative})}</p:nvSpPr><p:spPr>${xfrm(f,box)}<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${w}" h="${h}"${fill||gradient?'':' fill="none"'}>${path}</a:path></a:pathLst></a:custGeom>${paint}${line(stroke,f.len(strokeWidth),{dash})}</p:spPr></p:sp>`;
}
/** Linear gradient: page-space start and end points give the angle. */
export function gradFill({stops,from,to,alpha=1}){
 const ang=((Math.atan2(to[1]-from[1],to[0]-from[0])*180/Math.PI)+360)%360;
 const usable=stops.filter(s=>s.color&&HEX.test(s.color.hex||''));if(usable.length<2)return solid(usable[0]?.color?{...usable[0].color,alpha:usable[0].color.alpha*alpha}:null);
 return `<a:gradFill rotWithShape="1"><a:gsLst>${usable.map(s=>`<a:gs pos="${Math.round(Math.max(0,Math.min(1,s.offset))*100000)}"><a:srgbClr val="${s.color.hex}">${s.color.alpha*alpha<1?`<a:alpha val="${Math.round(s.color.alpha*alpha*100000)}"/>`:''}</a:srgbClr></a:gs>`).join('')}</a:gsLst><a:lin ang="${Math.round(ang*60000)}" scaled="0"/></a:gradFill>`;
}
export function picture({id,name,f,box,rel,descr,source}){
 const src=source?`<a:srcRect l="${Math.round(source.left*100000)}" t="${Math.round(source.top*100000)}" r="${Math.round(source.right*100000)}" b="${Math.round(source.bottom*100000)}"/>`:'';
 return `<p:pic><p:nvPicPr>${nv(id,name,{descr,kind:'p:cNvPicPr',inner:'<a:picLocks noChangeAspect="1"/>'})}</p:nvPicPr><p:blipFill><a:blip r:embed="${rel}"/>${src}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(f,box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}
/** A straight connector, glued to the shapes it joins when they are known. */
export function connector({id,name,f,from,to,stroke,strokeWidth,dash,head,tail,start,end,decorative=false}){
 const x1=f.x(from[0]),y1=f.y(from[1]),x2=f.x(to[0]),y2=f.y(to[1]);
 const glue=`${start?`<a:stCxn id="${start.id}" idx="${start.idx}"/>`:''}${end?`<a:endCxn id="${end.id}" idx="${end.idx}"/>`:''}`;
 return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="${esc(name)}">${decorative?DECORATIVE:''}</p:cNvPr><p:cNvCxnSpPr>${glue}</p:cNvCxnSpPr><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm${x2<x1?' flipH="1"':''}${y2<y1?' flipV="1"':''}><a:off x="${Math.min(x1,x2)}" y="${Math.min(y1,y2)}"/><a:ext cx="${Math.abs(x2-x1)}" cy="${Math.abs(y2-y1)}"/></a:xfrm><a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom><a:noFill/>${line(stroke,f.len(strokeWidth),{dash,head,tail})}</p:spPr></p:cxnSp>`;
}
export function graphicFrame({id,name,f,box,descr,uri,data}){
 return `<p:graphicFrame><p:nvGraphicFramePr>${nv(id,name,{descr,kind:'p:cNvGraphicFramePr',inner:'<a:graphicFrameLocks noGrp="1"/>'})}</p:nvGraphicFramePr>${xfrm(f,box,{tag:'p:xfrm'})}<a:graphic><a:graphicData uri="${uri}">${data}</a:graphicData></a:graphic></p:graphicFrame>`;
}
export const chartFrame=(o)=>graphicFrame({...o,uri:NS.c,data:`<c:chart xmlns:c="${NS.c}" r:id="${o.rel}"/>`});
/** A native table. `rows` hold cells with paragraphs, fill, borders and padding in page pixels. */
export function tableFrame({id,name,f,box,descr,columns,rows,firstRow=true}){
 const edge=(tag,b)=>b?`<a:${tag} w="${Math.max(3175,f.len(b.width))}">${solid(b.color)}</a:${tag}>`:`<a:${tag} w="0"><a:noFill/></a:${tag}>`;
 const blank=attrs=>`<a:tc${attrs}><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr dirty="0"/></a:p></a:txBody><a:tcPr/></a:tc>`;
 const cell=c=>c.vmerge?blank(` vMerge="1"${c.hmerge?' hMerge="1"':''}`):c.merged?`<a:tc hMerge="1"><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr dirty="0"/></a:p></a:txBody><a:tcPr/></a:tc>`:`<a:tc${c.span>1?` gridSpan="${c.span}"`:''}${c.rowSpan>1?` rowSpan="${c.rowSpan}"`:''}>${textBody(c.paragraphs,{tag:'a:txBody'}).replace('<a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" rtlCol="0"><a:noAutofit/></a:bodyPr>','<a:bodyPr/>')}<a:tcPr marL="${f.len(c.padding[3])}" marR="${f.len(c.padding[1])}" marT="${f.len(c.padding[0])}" marB="${f.len(c.padding[2])}" anchor="${c.anchor||'t'}">${edge('lnL',c.borders.left)}${edge('lnR',c.borders.right)}${edge('lnT',c.borders.top)}${edge('lnB',c.borders.bottom)}${c.fill?solid(c.fill):'<a:noFill/>'}</a:tcPr></a:tc>`;
 const tbl=`<a:tbl><a:tblPr firstRow="${firstRow?1:0}" bandRow="0"/><a:tblGrid>${columns.map(w=>`<a:gridCol w="${Math.max(1,f.len(w))}"/>`).join('')}</a:tblGrid>${rows.map(r=>`<a:tr h="${Math.max(1,f.len(r.height))}">${r.cells.map(cell).join('')}</a:tr>`).join('')}</a:tbl>`;
 return graphicFrame({id,name,f,box,descr,uri:'http://schemas.openxmlformats.org/drawingml/2006/table',data:tbl});
}
