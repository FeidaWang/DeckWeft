/**
 * VIS-016 PowerPoint compiler (S7). Input: the semantic document, its plan, the derived web scenes, the static delivery from
 * the export order, and the browser-measured layout of the static web scene. Output: a PresentationML package where text is
 * native text, tables are native tables, supported charts are native charts with their data embedded, diagrams are shapes
 * and connectors, images are pictures, and the notes carry sources, complete data and explanations. Anything not compiled
 * natively is either an image of that one element with a semantic summary (L3) or a receipt; never a whole slide.
 */
import {chartFacts,chartSummary,chartText} from '../../components/charts/model.mjs';
import {chartDash} from '../../components/charts/render.mjs';
import {frozenChart} from '../static-delivery.mjs';
import {pptxChartPlan,layoutReceipts,PPTX_IMAGE_TYPES} from './fallbacks.mjs';
import {sceneFrame,esc,solid,paragraph,textBody,textShape,presetShape,pathShape,gradFill,picture,connector,chartFrame,tableFrame,ALIGN,typefaces} from './ooxml.mjs';
import {chartXML,workbook} from './chart.mjs';
import {packagePPTX} from './package.mjs';
import {contrast} from './audit.mjs';
import {createHash} from 'node:crypto';

const sha=b=>createHash('sha256').update(b).digest('hex');
const rgb=c=>[0,2,4].map(i=>parseInt(c.hex.slice(i,i+2),16));
/** Translucent paint is blended with what lies under it, so every renderer shows the measured colour without transparency support. */
export const blend=(c,under)=>{if(!c||c.alpha>=1||!under)return c;const a=rgb(c),b=rgb(under);return {hex:a.map((v,i)=>Math.round(v*c.alpha+b[i]*(1-c.alpha)).toString(16).padStart(2,'0')).join('').toUpperCase(),alpha:1};};
const inPolygon=(pt,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
const union=boxes=>{const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};};
const flat=d=>d.flatMap(c=>c.c==='C'?Array.from({length:8},(_,k)=>{const t=(k+1)/8,p0=c.from,[p1,p2,p3]=c.p,u=1-t;return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];}):c.c==='Q'?Array.from({length:6},(_,k)=>{const t=(k+1)/6,p0=c.from,[p1,p2]=c.p,u=1-t;return [u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]];}):c.p||[]);
/** Clips a closed path to a convex quadrilateral (Sutherland–Hodgman). Curves are flattened first. */
export function clipPath(commands,quad){
 let last=null;const withFrom=commands.map(c=>{const r={...c,from:last};if(c.p)last=c.p.at(-1);return r;});
 let poly=flat(withFrom);const area=quad.reduce((s,p,i)=>{const q=quad[(i+1)%4];return s+p[0]*q[1]-q[0]*p[1];},0),sign=Math.sign(area)||1;
 for(let i=0;i<4&&poly.length;i++){const a=quad[i],b=quad[(i+1)%4],inside=p=>sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))>=0,cut=(p,q)=>{const d1=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),d2=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]),t=d1/(d1-d2);return [p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];};
  const out=[];poly.forEach((p,k)=>{const q=poly[(k+1)%poly.length];if(inside(p)){out.push(p);if(!inside(q))out.push(cut(p,q));}else if(inside(q))out.push(cut(p,q));});poly=out;}
 return poly.length>2?[{c:'M',p:[poly[0]]},...poly.slice(1).map(p=>({c:'L',p:[p]})),{c:'Z'}]:[];
}

/** Writes measured line breaks into runs: a break replaces the space (or newline) at a line end, or is inserted between CJK characters. */
export function breakRuns(runs,lines){
 const text=runs.map(r=>r.text).join(''),cuts=new Map();let pos=0;
 for(const line of lines.slice(0,-1)){const at=text.indexOf(line,pos);if(at<0)return runs;pos=at+line.length;cuts.set(pos,/[ \n]/.test(text[pos]||'')?'replace':'insert');}
 let offset=0;return runs.map(r=>{let out='';for(let i=0;i<r.text.length;i++){const k=offset+i,cut=cuts.get(k);if(cut==='replace'){out+='\n';continue;}if(cut==='insert')out+='\n';out+=r.text[i];}offset+=r.text.length;return {...r,text:out};});
}
export function compilePPTX({document,plan,scenes,layout,delivery,resources={},rasters={}}){
 const lang=document.locale==='zh-CN'?'zh-CN':'en-US',zh=document.locale==='zh-CN',t=chartText(document.locale),blocks=new Map(document.blocks.map(b=>[b.id,b]));
 const platform=layout.platformFonts||{},fontsOf=style=>platform[style?.measureId]||null;
 const receipts=[],media=new Map(),charts=[],slides=[],records=[],seriesColors=[];
 plan.scenes.forEach((scene,index)=>{
  const m=layout.scenes.find(s=>s.sceneId===scene.id),derived=scenes[index],f=sceneFrame(m.bounds),shapes=[],rels=[],links=Object.create(null),notes=[],elements=[];
  let nextId=2,relId=3;const id=()=>nextId++,rel=(type,target,external)=>{const r='rId'+(relId++);rels.push([r,type,target,external]);return r;};
  const record=(e)=>{elements.push(e);return e;};
  const push=(xml,e)=>{if(!xml)return;shapes.push(xml);record(e);};
  const right=m.bounds.x+m.bounds.width;
  // What lies under a point: the topmost opaque box or decorative shape, else the scene background.
  const layers=[...m.decor.filter(d=>!d.unsupported&&d.fill&&!d.fill.gradient&&d.fill.alpha>=1).map(d=>{let last=null;const poly=flat(d.commands.map(c=>{const r={...c,from:last};if(c.p)last=c.p.at(-1);return r;}));return {fill:d.fill,hit:pt=>inPolygon(pt,poly)};}),
   ...[m.chrome,...m.regions].flatMap(r=>r.boxes).filter(b=>b.fill&&b.fill.alpha>=1).map(b=>({fill:b.fill,hit:([x,y])=>x>=b.box.x&&x<=b.box.x+b.box.width&&y>=b.box.y&&y<=b.box.y+b.box.height}))];
  const under=(x,y)=>{let bg=m.background||{hex:'FFFFFF',alpha:1};for(const l of layers)if(l.hit([x,y]))bg=l.fill;return bg;};
  const flatAt=(c,box)=>blend(c,under(box.x+box.width/2,box.y+box.height/2));
  const opaqueRuns=(runs,box)=>runs.map(r=>({...r,style:{...r.style,color:flatAt(r.style.color,box)}}));
  const link=href=>{if(!/^https?:\/\//.test(href))return null;if(!links[href])links[href]=rel('hyperlink',href,true);return links[href];};
  // Text parts → one text box each; consecutive items of one list share a box with bullets.
  function textBoxes(parts,{blockId,decorative=false,titlePart=null,prefix=blockId}){
   // Only a vertical run of items from one list shares a box; items laid out in columns keep their own boxes.
   const groups=[];for(const p of parts){const g=groups.at(-1),prev=g?.at(-1);if(p.list&&prev?.list&&prev.list.list===p.list.list&&p.box.y>=prev.box.y+prev.box.height-1)g.push(p);else groups.push([p]);}
   for(const g of groups){
    const first=g[0],align=ALIGN[first.style.align]||'l',indent=first.list?first.style.fontSize*1.3:0;
    for(const p of g)for(const r of p.runs)if(r.href)link(r.href);
    // The first line box starts half a leading above the glyphs; balanced text keeps its widest measured line as the wrap width.
    const boxes=g.map(p=>{const lh=p.style.lineHeight||p.style.fontSize*1.2,lines=Math.max(1,p.lines||1),glyph=Math.max(1,p.box.height-(lines-1)*lh),top=p.box.y-(lh-glyph)/2;
     let x=p.content.x,w=p.content.width;if(align==='l'&&p.box.x-p.content.x>2){w=p.content.x+p.content.width-p.box.x;x=p.box.x;}
     if(lines===1&&align==='l'){x=p.box.x;w=p.box.width;}
     if(w<p.box.width)w=p.box.width;
     // Slack for other font metrics: a single line must stay one line, balanced lines already carry their breaks.
     if(align==='l')w=Math.min(w+(p.lineTexts?w*.15:lines===1?Math.max(w*.08,p.style.fontSize*.6):Math.min(16,w*.04)),right-x);
     return {x:x-indent,y:top,width:w+indent,height:lines*lh};});
    const single=g.every(p=>(p.lines||1)===1);
    for(const p of g)if(p.lineTexts)receipts.push({code:'PPTX_TEXT_BALANCE',target:'pptx',sceneId:scene.id,blockId,element:`balanced line breaks (${p.lineTexts.length} lines)`,reason:'PowerPoint does not balance lines.',delivered:'The measured line breaks are written as line breaks; the text stays editable.'});
    const box=union(boxes),paragraphs=g.map((p,k)=>paragraph(opaqueRuns(p.lineTexts?breakRuns(p.runs,p.lineTexts):p.runs,boxes[k]),{f,lang,fonts:fontsOf,links,align:ALIGN[p.style.align]||'l',lineHeight:p.style.lineHeight||p.style.fontSize*1.2,spaceBefore:k?Math.max(0,boxes[k].y-(boxes[k-1].y+boxes[k-1].height)):0,bullet:p.list?{ordered:p.list.ordered,type:p.list.type,index:p.list.index,indent:f.len(indent)}:null}));
    const title=!!titlePart&&g.includes(titlePart),name=`${prefix}/${title?'title':first.list?'list':'text'}-${elements.length+1}`,c0=first.runs[0]?.style.color,bg=under(boxes[0].x+boxes[0].width/2,boxes[0].y+boxes[0].height/2),large=first.style.fontSize>=24||(first.style.fontSize>=18.66&&first.style.fontWeight>=700);
    const measured=!decorative&&c0?{ratio:Math.round(contrast(blend(c0,bg).hex,bg.hex)*100)/100,required:large?3:4.5}:null;
    push(textShape({id:nextId,name,f,box,body:textBody(paragraphs,{wrap:!single}),title,decorative}),{shapeId:id(),name,blockId,kind:title?'title':'text',text:g.map(p=>p.runs.map(r=>r.text).join('')).join('\n'),box,decorative,...(measured?{contrast:measured}:{})});
   }
  }
  function decorations(boxes,{blockId,prefix}){
   for(const b of boxes){
    const sides=['top','right','bottom','left'].map(k=>b.borders[k]),uniform=sides.every(s=>s&&sides[0]&&s.width===sides[0].width&&s.color.hex===sides[0].color.hex);
    if(b.fill||uniform){const name=`${prefix}/box-${elements.length+1}`;push(presetShape({id:nextId,name,f,box:b.box,preset:b.radius>0?'roundRect':'rect',fill:flatAt(b.fill,b.box),stroke:uniform?sides[0].color:null,strokeWidth:uniform?sides[0].width:0,radius:b.radius,decorative:true}),{shapeId:id(),name,blockId,kind:'shape',decorative:true,box:b.box});}
    // One-sided borders are lines along the edge: a filled one-pixel rectangle disappears in some renderers.
    if(!uniform)sides.forEach((s,k)=>{if(!s)return;const B=b.box,h=s.width/2,[from,to]=[[[B.x,B.y+h],[B.x+B.width,B.y+h]],[[B.x+B.width-h,B.y],[B.x+B.width-h,B.y+B.height]],[[B.x,B.y+B.height-h],[B.x+B.width,B.y+B.height-h]],[[B.x+h,B.y],[B.x+h,B.y+B.height]]][k],name=`${prefix}/border-${elements.length+1}`;
     push(connector({id:nextId,name,f,from,to,stroke:flatAt(s.color,B),strokeWidth:s.width,decorative:true}),{shapeId:id(),name,blockId,kind:'connector',decorative:true,box:{x:Math.min(from[0],to[0]),y:Math.min(from[1],to[1]),width:Math.abs(to[0]-from[0]),height:Math.abs(to[1]-from[1])}});});
   }
  }
  function svgShapes(list,{blockId,prefix,decorative=false}){
   for(const s of list){const name=`${prefix}/mark-${elements.length+1}`;
    if(s.kind==='line'){push(connector({id:nextId,name,f,from:s.from,to:s.to,stroke:s.stroke?.gradient?null:flatAt(s.stroke,s.box),strokeWidth:s.strokeWidth,dash:s.dash}),{shapeId:id(),name,blockId,kind:'connector',box:s.box,decorative});continue;}
    if(['rect','circle','ellipse'].includes(s.kind)){push(presetShape({id:nextId,name,f,box:s.box,preset:s.kind==='rect'?(s.radius>0?'roundRect':'rect'):'ellipse',fill:s.fill?.gradient?null:flatAt(s.fill,s.box),stroke:s.stroke?.gradient?null:flatAt(s.stroke,s.box),strokeWidth:s.strokeWidth,dash:s.dash,radius:s.radius||0,decorative}),{shapeId:id(),name,blockId,kind:'shape',box:s.box,decorative});continue;}
    if(s.commands&&s.unsupported){receipts.push({code:'PPTX_SHAPE_PATH',target:'pptx',sceneId:scene.id,blockId,element:`${s.kind} in ${blockId}`,reason:'The path uses arcs or smooth-curve shorthand that is not compiled.',delivered:'The shape is omitted; its meaning is carried by the text beside it.'});continue;}
    if(s.commands)push(pathShape({id:nextId,name,f,commands:s.commands,fill:s.fill?.gradient?null:s.fill,gradient:s.fill?.gradient?{...s.fill.gradient,alpha:s.fill.alpha}:null,stroke:s.stroke?.gradient?null:s.stroke,strokeWidth:s.strokeWidth,dash:s.dash,decorative}),{shapeId:id(),name,blockId,kind:'shape',box:s.box,decorative});
   }
  }
  function mediaRel(bytes,ext){const h=sha(bytes);if(!media.has(h))media.set(h,{path:`ppt/media/image${media.size+1}.${ext}`,bytes});return rel('image','../media/'+media.get(h).path.split('/').pop());}
  function table(tbl,{blockId,descr,prefix}){
   // Every row covers the whole grid: column spans continue with hMerge, row spans with vMerge, short rows are padded.
   const occupied=tbl.rows.map(()=>[]),rows=tbl.rows.map((r,i)=>{const out=[];let col=0;const take=()=>{while(occupied[i][col]){out.push(occupied[i][col]);col++;}};
    for(const c of r.cells){take();for(const p of c.texts)for(const run of p.runs)if(run.href)link(run.href);
     out.push({paragraphs:c.texts.map(p=>paragraph(opaqueRuns(p.runs,c.box),{f,lang,fonts:fontsOf,links,align:ALIGN[p.style.align]||'l',lineHeight:p.style.lineHeight||p.style.fontSize*1.2})),fill:flatAt(c.fill,c.box),borders:c.borders,padding:c.padding,anchor:{middle:'ctr',bottom:'b'}[c.valign]||'t',span:c.colspan,rowSpan:c.rowspan});
     for(let k=1;k<c.colspan;k++)out.push({merged:true});
     for(let d=1;d<c.rowspan&&i+d<tbl.rows.length;d++)for(let k=0;k<c.colspan;k++)occupied[i+d][col+k]={vmerge:true,hmerge:k>0};
     col+=c.colspan;}
    take();return {height:r.box.height,cells:out};});
   const cols=Math.max(...rows.map(r=>r.cells.length));for(const r of rows)while(r.cells.length<cols)r.cells.push({paragraphs:[],fill:null,borders:{},padding:[0,0,0,0],anchor:'t',span:1});
   const full=tbl.rows.find(r=>r.cells.length===cols&&r.cells.every(c=>c.colspan===1&&c.rowspan===1)),columns=full?full.cells.map(c=>c.box.width):Array(cols).fill(tbl.box.width/cols);
   const box={...tbl.box,height:tbl.rows.reduce((h,r)=>h+r.box.height,0)},name=`${prefix}/table`;
   push(tableFrame({id:nextId,name,f,box,descr,columns,rows}),{shapeId:id(),name,blockId,kind:'table',level:'L1',box,text:tbl.rows.flatMap(r=>r.cells.flatMap(c=>c.texts.map(p=>p.runs.map(x=>x.text).join('')))).join('\n')});
   if(tbl.caption?.length)textBoxes(tbl.caption,{blockId,prefix});
  }
  function chart(region,block){
   const it=delivery.frozen[index].charts[block.id],spec=(scene.interactions||[]).find(s=>s.kind==='chart-select'&&s.blockId===block.id),state=it.frozen&&spec?delivery.states[index].states.find(s=>s.id===spec.id):null;
   const fz=frozenChart(document,scene,block,state),cplan=pptxChartPlan(fz.block,fz.dataset,fz.view,document.locale);
   receipts.push(...cplan.receipts.map(r=>({...r,sceneId:scene.id})));
   const facts=chartFacts(fz.block,fz.view,document.locale),order=facts.model.order,plot=region.plot,summary=chartSummary(facts),descr=`${block.question?block.question+' ':''}${summary.join(zh?'；':'; ')}`.slice(0,1500);
   if(cplan.level==='L3'){
    const png=rasters[`${scene.id}/${block.id}/plot`],name=`${block.id}/chart-image`;
    if(!png){receipts.push({code:'PPTX_RASTER_MISSING',target:'pptx',sceneId:scene.id,blockId:block.id,element:'chart image',reason:'No captured image of this chart was supplied.',delivered:'Nothing is drawn; the export check fails.',error:true});return;}
    push(picture({id:nextId,name,f,box:plot.box,rel:mediaRel(png,'png'),descr}),{shapeId:id(),name,blockId:block.id,kind:'picture',level:'L3',box:plot.box,descr});
    notes.push(`${zh?'图表图像的语义摘要':'Semantic summary of the chart image'} (${block.id}): ${summary.join(zh?'；':'; ')}`);
    return;
   }
   const scale=plot.scale||1,label=plot.labelStyle||{fontFamily:'Arial',fontSize:12,fontWeight:400,color:{hex:'333333',alpha:1}},labelStyle={...label,color:flatAt(label.color,plot.box),fontSize:label.fontSize*scale,platform:fontsOf(label)},size=Math.max(600,Math.round(f.pt(labelStyle.fontSize)*100));
   const mark=(seriesId,categoryId)=>plot.marks.find(k=>k.seriesId===seriesId&&(categoryId===undefined||k.objectId===categoryId));
   const ids=fz.view.categoryIds||fz.view.categories.map((_,i)=>'category-'+i);
   if(cplan.native==='table'){
    if(plot.table){table(plot.table,{blockId:block.id,descr,prefix:block.id});return;}
    const header=[fz.view.unit||'',...fz.view.categories.map((_,i)=>facts.display(i))],cell=(text,{fill=null,dash=false,align='ctr'}={})=>({paragraphs:[paragraph([{text,style:labelStyle}],{f,lang,fonts:()=>labelStyle.platform,align,lineHeight:labelStyle.fontSize*1.2})],fill,borders:{top:dash?{width:1,color:label.color}:null,right:null,bottom:dash?{width:1,color:label.color}:null,left:null},padding:[4,6,4,6],anchor:'ctr',span:1});
    const rowsData=fz.view.series.map(s=>[cell(s.label,{align:'r'}),...s.values.map((v,i)=>{const mk=mark(s.id,ids[i]);return cell(v===null?t.missing:String(v),{fill:v===null||!mk?.fill?null:flatAt(mk.fill,mk.box),dash:v===null});})]);
    // Cells sit where the web drew them; the row-label column starts at the measured row labels and the header row sits above the cells.
    const rowLabels=(plot.texts||[]).filter(x=>fz.view.series.some(s=>s.label===x.text.trim())),first=fz.view.series[0],cellsX=fz.view.categories.map((_,i)=>mark(first.id,ids[i])?.box),cellsY=fz.view.series.map(s=>mark(s.id,ids[0])?.box);
    let tbox=plot.box,columns,height;
    if(cellsX.every(Boolean)&&cellsY.every(Boolean)){const left=rowLabels.length?Math.min(...rowLabels.map(x=>x.box.x))-18:plot.box.x,widths=cellsX.map((c,i)=>i<cellsX.length-1?cellsX[i+1].x-c.x:c.width),rowH=cellsY.length>1?cellsY[1].y-cellsY[0].y:cellsY[0].height;
     columns=[cellsX[0].x-left,...widths];height=rowH;tbox={x:left,y:cellsY[0].y-rowH,width:columns.reduce((a,b)=>a+b,0),height:rowH*(cellsY.length+1)};}
    else{const firstCol=plot.box.width*.25;columns=[firstCol,...fz.view.categories.map(()=>(plot.box.width-firstCol)/fz.view.categories.length)];height=plot.box.height/(fz.view.series.length+1);}
    const name=`${block.id}/table`;
    push(tableFrame({id:nextId,name,f,box:tbox,descr,columns,rows:[{height,cells:header.map((h,k)=>cell(h,{align:k?'ctr':'l'}))},...rowsData.map(cells=>({height,cells}))]}),{shapeId:id(),name,blockId:block.id,kind:'table',level:'L1',box:tbox,text:[...header,...fz.view.series.flatMap(s=>[s.label,...s.values.map(v=>v===null?t.missing:String(v))])].join('\n')});
    return;
   }
   const kind=facts.kind,rows=plot.tag==='ol',[lo,hi]=facts.model.domain,muted=s=>!!facts.focus.series&&!facts.focus.series.has(s.id);
   const series=fz.view.series.map((s,j)=>{
    const own=plot.marks.filter(k=>k.seriesId===s.id&&(k.fill&&!k.fill.gradient||k.stroke&&!k.stroke.gradient)),base=own.find(k=>k.focus!=='false')||own[0]||{},paint=base.fill||base.stroke||{hex:'5114F6',alpha:1};
    if(!seriesColors.some(c=>c===paint.hex))seriesColors.push(paint.hex);
    const shape=(j+Math.floor(j/4))%4,points=[];
    if(['ranked-bar','grouped-bar','stacked'].includes(kind))order.forEach((i,k)=>{const mk=mark(s.id,ids[i]);if(mk&&mk.fill&&(mk.fill.hex!==base.fill?.hex||mk.fill.alpha!==base.fill?.alpha||(mk.stroke?.hex||null)!==(base.stroke?.hex||null)))points.push({idx:k,fill:flatAt(mk.fill,mk.box),stroke:flatAt(mk.stroke,mk.box),strokeWidth:f.len(mk.strokeWidth)});});
    const width=(plot.className.includes('trend')||fz.block.labels==='end'?3.5:3)*scale*(muted(s)?2/3:1);
    return {name:s.label,values:order.map(i=>s.values[i]),xValues:s.xValues?order.map(i=>s.xValues[i]):null,fill:flatAt(kind==='area'?{hex:paint.hex,alpha:.18}:(base.fill||paint),plot.box),stroke:flatAt(kind==='area'||['line','scatter'].includes(kind)?{hex:paint.hex,alpha:muted(s)?.45:1}:base.stroke||null,plot.box),strokeWidth:['line','area'].includes(kind)?f.len(width):f.len(base.strokeWidth||0),dash:chartDash(j),points,
     marker:kind==='line'&&fz.block.labels!=='end'||kind==='scatter'?{symbol:shape%2?'square':'circle',hollow:shape>=2,color:paint}:null,markerSize:f.pt(10*scale),labels:kind==='line'&&fz.block.labels==='end'?'end':null};
   });
   const axis={min:lo,max:hi,log:facts.model.scale.y==='log',majorUnit:rows?(lo>=0||hi<=0?hi-lo:0):(hi-lo)/4};
   // Series named only inside the web plot get the native legend, so series identity survives.
   const outside=new Set(region.texts.map(p=>p.runs.map(r=>r.text).join('').trim())),legend=fz.view.series.length>1&&fz.view.series.some(s=>![...outside].some(v=>v===s.label||v.endsWith(s.label)));
   if(legend)receipts.push({code:'PPTX_CHART_LEGEND',target:'pptx',sceneId:scene.id,blockId:block.id,element:'series names inside the plot',reason:'Native bars carry no per-bar series name.',delivered:'The native chart legend names every series.'});
   const data={legend,kind:rows||kind==='ranked-bar'||kind==='grouped-bar'?'bar':kind==='stacked'?'column':kind==='area'?'area':kind==='scatter'?'scatter':'line',stacked:kind==='stacked',categories:order.map(i=>facts.display(i)),categoryHeader:t.category,series,scatter:kind==='scatter',axis,
    xAxis:kind==='scatter'?{min:facts.model.xDomain[0],max:facts.model.xDomain[1],log:facts.model.scale.x==='log',majorUnit:(facts.model.xDomain[1]-facts.model.xDomain[0])/4}:null,labels:kind==='scatter'?'none':'values',grid:rows?null:flatAt({hex:label.color?.hex||'888888',alpha:.2},plot.box),axisLine:rows?labelStyle.color:null,gapWidth:rows?40:80,
    // A trend labels only its first and last time, as the web drawing does.
    labelSkip:fz.block.labels==='end'&&order.length>2?order.length-1:0};
   if(data.kind==='bar'){data.categories.reverse();for(const s of series){s.values.reverse();s.xValues?.reverse();s.points=s.points.map(p=>({...p,idx:order.length-1-p.idx}));}}
   const n=charts.length+1,path=`ppt/charts/chart${n}.xml`;
   charts.push({path,xml:chartXML(data,{lang,style:labelStyle,size}),workbookPath:`ppt/embeddings/Microsoft_Excel_Worksheet${n}.xlsx`,workbookTarget:`../embeddings/Microsoft_Excel_Worksheet${n}.xlsx`,workbook:workbook(data),data});
   const name=`${block.id}/chart`;
   push(chartFrame({id:nextId,name,f,box:plot.box,descr,rel:rel('chart','../charts/'+path.split('/').pop())}),{shapeId:id(),name,blockId:block.id,kind:'chart',level:'L1',box:plot.box,chartPath:path,descr,text:[...data.categories,...series.flatMap(s=>[s.name,...s.values.filter(v=>v!==null).map(String),...(s.xValues||[]).filter(v=>v!==null).map(String)])].join('\n')});
   // The plot's unit, x unit and time-zone labels are text on the slide, beside the native chart.
   const named=new Set([fz.view.unit,fz.view.xUnit,fz.view.timeZone].filter(Boolean).map(v=>v.trim()));
   const unitParts=(plot.texts||[]).filter(x=>named.has(x.text.trim())).map(x=>{const style={...x.style,fontSize:x.style.fontSize*scale,align:x.anchor==='end'?'right':x.anchor==='middle'?'center':'left'};return {box:x.box,content:x.box,lines:1,style,runs:[{text:x.text.trim(),style}]};});
   if(unitParts.length)textBoxes(unitParts,{blockId:block.id,prefix:block.id});
  }
  function diagram(region,block){
   const dg=region.diagram,s=dg.scale||1,nodeShapes=new Map(),order=new Map(block.nodes.map((n,i)=>[n.id,i]));
   for(const node of [...dg.nodes].sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99))){
    const sh=node.shape,preset=sh.kind==='rect'?(sh.radius>0?'roundRect':'rect'):'ellipse';
    const paras=node.texts.map(tx=>paragraph([{text:tx.lines.map(l=>l.text).join('\n'),style:{...tx.style,fontSize:tx.style.fontSize*s}}],{f,lang,fonts:()=>fontsOf(tx.style),align:'ctr',lineHeight:tx.lines.length>1?tx.lines[1].box.y-tx.lines[0].box.y:tx.style.fontSize*s*1.2}));
    const name=`${block.id}/node-${node.id}`,sid=nextId;
    push(presetShape({id:nextId,name,f,box:sh.box,preset,fill:sh.fill?.gradient?null:sh.fill,stroke:sh.stroke?.gradient?null:sh.stroke,strokeWidth:sh.strokeWidth,dash:sh.dash,radius:sh.radius||0,body:textBody(paras,{anchor:'ctr'})}),{shapeId:id(),name,blockId:block.id,kind:'shape',box:sh.box,text:node.texts.map(tx=>tx.lines.map(l=>l.text).join(' ')).join(' ')});
    nodeShapes.set(node.id,{id:sid,box:sh.box,preset});
   }
   const glue=p=>{for(const n of nodeShapes.values()){const b=n.box;if(n.preset==='ellipse'||p[0]<b.x-10||p[0]>b.x+b.width+10||p[1]<b.y-10||p[1]>b.y+b.height+10)continue;const sites=[[b.x+b.width/2,b.y],[b.x,b.y+b.height/2],[b.x+b.width/2,b.y+b.height],[b.x+b.width,b.y+b.height/2]],d=sites.map(q=>Math.hypot(q[0]-p[0],q[1]-p[1]));return {id:n.id,idx:d.indexOf(Math.min(...d))};}return null;};
   for(const edge of dg.edges){const l=edge.line;if(!l.from||!l.to)continue;const name=`${block.id}/edge-${edge.id}`;
    push(connector({id:nextId,name,f,from:l.from,to:l.to,stroke:l.stroke?.gradient?null:flatAt(l.stroke,l.box),strokeWidth:l.strokeWidth,dash:l.dash,tail:l.markerEnd,head:l.markerStart,start:glue(l.from),end:glue(l.to)}),{shapeId:id(),name,blockId:block.id,kind:'connector',box:l.box});
    for(const tx of edge.texts){const p={box:tx.box,content:tx.box,style:{...tx.style,fontSize:tx.style.fontSize*s,align:'center'},runs:[{text:tx.lines.map(x=>x.text).join('\n'),style:{...tx.style,fontSize:tx.style.fontSize*s}}],lines:tx.lines.length};textBoxes([p],{blockId:block.id,prefix:block.id});}
   }
  }
  // Slide content, back to front: decoration, page chrome, then regions in the derived scene's reading order.
  for(const d of m.decor){if(d.unsupported)continue;const commands=d.clip?clipPath(d.commands,d.clip):d.commands,name=`decor/${d.id||elements.length+1}`;
   push(pathShape({id:nextId,name,f,commands,fill:d.fill?.gradient?null:d.fill,gradient:d.fill?.gradient?{...d.fill.gradient,alpha:d.fill.alpha}:null,stroke:null,decorative:true}),{shapeId:id(),name,blockId:null,kind:'shape',decorative:true,box:d.box});}
  decorations(m.chrome.boxes,{blockId:null,prefix:'chrome'});textBoxes(m.chrome.texts,{blockId:null,decorative:true,prefix:'chrome'});
  const order=derived.readingOrder.map(rid=>derived.regions.find(r=>r.id===rid).blockId),titleBlock=order.find(id=>blocks.get(id)?.type==='heading');
  for(const blockId of order){
   const region=m.regions.find(r=>r.blockId===blockId),block=blocks.get(blockId);if(!region)continue;
   decorations(region.boxes,{blockId,prefix:blockId});
   const items=[];
   if(region.image)items.push({y:region.image.box.y,x:region.image.box.x,run:()=>{
    const res=resources[block.assetId],native=res&&PPTX_IMAGE_TYPES[res.mime],name=`${blockId}/image`;let r,source=region.image.source;
    if(native)r=mediaRel(Buffer.from(res.dataURL.split(',')[1],'base64'),PPTX_IMAGE_TYPES[res.mime]);
    else{const png=rasters[`${scene.id}/${blockId}/image`];if(!png){receipts.push({code:'PPTX_RASTER_MISSING',target:'pptx',sceneId:scene.id,blockId,element:'image',reason:'The image is not PNG or JPEG and no capture was supplied.',delivered:'Nothing is drawn; the export check fails.',error:true});return;}r=mediaRel(png,'png');source=null;receipts.push({code:'PPTX_IMAGE_REENCODED',target:'pptx',sceneId:scene.id,blockId,element:'image',reason:`${res?.mime||'This image format'} is not embedded natively.`,delivered:'A PNG capture of the displayed crop is embedded; the alt text is kept.'});}
    push(picture({id:nextId,name,f,box:region.image.box,rel:r,descr:block.alt,source}),{shapeId:id(),name,blockId,kind:'picture',level:'L1',box:region.image.box,descr:block.alt});}});
   for(const tbl of region.tables||[])items.push({y:tbl.box.y,x:tbl.box.x,run:()=>table(tbl,{blockId,descr:tbl.caption?.map(p=>p.runs.map(r=>r.text).join('')).join(' ')||block.columns?.join(' · ')||'',prefix:blockId})});
   if(region.plot&&block.type==='chart')items.push({y:region.plot.box.y,x:region.plot.box.x,run:()=>chart(region,block)});
   if(region.diagram&&block.type==='diagram')items.push({y:region.diagram.box.y,x:region.diagram.box.x,run:()=>diagram(region,block)});
   for(const s of region.shapes)items.push({y:s.box.y,x:s.box.x,run:()=>svgShapes([s],{blockId,prefix:blockId})});
   for(const p of region.texts)items.push({y:p.box.y,x:p.box.x,text:p});
   items.sort((a,b)=>a.y-b.y||a.x-b.x);
   // Adjacent text items are compiled together so list items share one box.
   for(let k=0;k<items.length;){if(!items[k].text){items[k].run();k++;continue;}const run=[];while(k<items.length&&items[k].text)run.push(items[k++].text);textBoxes(run,{blockId,titlePart:blockId===titleBlock?run[0]:null});}
   if(region.cardTables)receipts.push({code:'PPTX_TABLE_AS_CARDS',target:'pptx',sceneId:scene.id,blockId,element:'table drawn as cards',reason:'The web lays this table out as one card per row; a native table cannot take that layout.',delivered:'Each card is native text with its column labels; the slide is not a PowerPoint table.'});
   for(const s of region.disclosures)receipts.push({code:'PPTX_DISCLOSURE',target:'pptx',sceneId:scene.id,blockId,element:`“${s}” disclosure`,reason:'A slide has no disclosure control.',delivered:'Its content is in the slide notes.'});
  }
  for(const s of m.disclosures)receipts.push({code:'PPTX_DISCLOSURE',target:'pptx',sceneId:scene.id,element:`“${s}” disclosure`,reason:'A slide has no disclosure control.',delivered:'The explanations are in the slide notes in cue order.'});
  for(const it of delivery.frozen[index].interactions)receipts.push({code:'PPTX_INTERACTION_STATIC',target:'pptx',sceneId:scene.id,blockId:it.blockId,element:`${it.kind} interaction ${it.id}`,reason:'Slides are not interactive in this compiler.',delivered:it.delivery});
  const mo=delivery.motion[index];if(mo.cuesNotPlayed||mo.policy!=='none')receipts.push({code:'PPTX_MOTION_NOT_COMPILED',target:'pptx',sceneId:scene.id,element:`motion (${mo.policy}, ${mo.cuesNotPlayed} cue${mo.cuesNotPlayed===1?'':'s'})`,reason:'No animation, transition or timing is compiled.',delivered:'The slide shows the static state.'});
  receipts.push(...layoutReceipts(m,id=>blocks.get(id)));
  // Notes: delivery, revealed content and sources.
  const rv=delivery.reveal[index];
  notes.unshift(`${String(index+1).padStart(2,'0')} · ${scene.id}`);
  for(const it of delivery.frozen[index].interactions)notes.push(`${it.kind}: ${it.delivery}`);
  if(mo.cuesNotPlayed)notes.push(zh?`动效未播放（${mo.cuesNotPlayed} 个提示）；本页为静态状态。`:`Motion is not played (${mo.cuesNotPlayed} cue${mo.cuesNotPlayed===1?'':'s'}); this slide shows the static state.`);
  for(const n of rv.notes){notes.push(`${n.title}${zh?'：':':'}`);for(const l of n.lines)notes.push('· '+l);}
  if(rv.sources.length){notes.push(zh?'来源：':'Sources:');for(const s of rv.sources)notes.push(`· ${s.title} — ${s.url}`);}
  const title=titleBlock?blocks.get(titleBlock).text.replace(/\n/g,' '):scene.id;
  slides.push({name:title,background:solid(m.background||{hex:'FFFFFF',alpha:1}),shapes,rels,notes});
  records.push({sceneId:scene.id,title,scale:Math.round(f.ratio*1000)/1000,elements,notes});
 });
 // Theme fonts and colours follow the deck: the first title and body runs, the first background and the chart colours.
 const firstStyle=k=>{for(const s of layout.scenes)for(const r of s.regions)if(blocks.get(r.blockId)?.type===k&&r.texts[0])return r.texts[0].style;return null;};
 const face=style=>style?typefaces(style,fontsOf(style)):{latin:'Arial',ea:zh?'PingFang SC':'Arial'};
 const head=firstStyle('heading'),body=firstStyle('paragraph')||head;
 const themeInfo={major:face(head),minor:face(body),colors:{...(head?.color?{dk1:head.color.hex}:{}),...(layout.scenes[0]?.background?{lt1:layout.scenes[0].background.hex}:{}),...Object.fromEntries(seriesColors.slice(0,6).map((c,i)=>['accent'+(i+1),c]))}};
 const bytes=packagePPTX({title:document.title,lang,slides,media:[...media.values()],charts,themeInfo});
 return {bytes,slides:records,receipts,media:media.size,charts:charts.map(c=>({path:c.path,kind:c.data.kind,categories:c.data.categories,series:c.data.series.map(s=>({name:s.name,values:s.values}))}))};
}
