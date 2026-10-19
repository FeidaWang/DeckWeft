/**
 * A synthetic export layout for unit tests (S7). It has the shape measureExportLayout() returns, built from the derived scene
 * with simple stacked geometry instead of a browser. It is test data only: real exports refuse any layout whose render hash
 * does not match, and the evidence runs measure real pages (scripts/export-targets.mjs).
 */
const COLORS=['5114F6','B33C1E','166C65','BD4027','759786','6A5ACD'];
export function syntheticLayout(project,html,{fontStatus='loaded',lastResort=false,imageReady=true}={}){
 const {document,plan}=project,blocks=new Map(document.blocks.map(b=>[b.id,b])),platformFonts={};let mid=0;
 const style=(size,{weight=400,id,wrap='wrap',align='start',whiteSpace='normal'}={})=>({fontFamily:document.locale==='zh-CN'?'"PingFang SC", Arial, sans-serif':'Arial, sans-serif',fontSize:size,fontWeight:weight,italic:false,lineHeight:Math.round(size*1.3),letterSpacing:0,color:{hex:'171717',alpha:1},align,transform:'none',whiteSpace,wrap,underline:false,measureId:id});
 const font=text=>{const id=String(++mid);platformFonts[id]=[{familyName:lastResort&&mid===1?'LastResort':'Arial',postScriptName:lastResort&&mid===1?'LastResort':'ArialMT',isCustomFont:false,glyphCount:Math.max(1,text.length)}];return id;};
 const part=(text,{x,y,width,size=20,weight,tag='p',href,list,wrap,whiteSpace})=>{
  const id=font(text),lh=Math.round(size*1.3),lines=Math.max(1,text.split('\n').length,Math.ceil([...text].length*size*.55/width));
  const box={x,y:y+(lh-size)/2,width:Math.min(width,[...text].length*size*.55),height:(lines-1)*lh+size};
  return {tag,className:'',box,content:{x,y,width,height:lines*lh},lines,style:style(size,{weight,id,wrap,whiteSpace}),runs:[{text,style:style(size,{weight,id,whiteSpace}),...(href?{href}:{})}],...(list?{list}:{})};
 };
 const scenes=html.scenes.map((scene,k)=>{
  const top=k*2000,x=72,width=1296,regions=[];let y=top+80;
  for(const regionId of scene.readingOrder){
   const r=scene.regions.find(v=>v.id===regionId),b=blocks.get(r.blockId),start=y,region={nodeId:r.id,blockId:b.id,component:b.type,texts:[],boxes:[],shapes:[],disclosures:[]};
   const add=(text,o={})=>{const p=part(text,{x,y,width,...o});region.texts.push(p);y+=p.content.height+12;return p;};
   if(b.type==='heading')add(b.text,{size:48,weight:600,tag:'h2',wrap:'balance'});
   else if(['paragraph','quote','callout','annotation'].includes(b.type))add(b.text);
   else if(b.type==='code')add(b.text,{tag:'pre',whiteSpace:'pre'});
   else if(b.type==='citation')add(b.text,{size:12,href:document.sources.find(s=>s.id===b.sourceId).url});
   else if(b.type==='list')b.items.forEach((t,i)=>add(t,{tag:'li',list:{ordered:false,type:'disc',index:i+1,list:'list-'+b.id}}));
   else if(b.type==='metric'){add(new Intl.NumberFormat(document.locale,{maximumSignificantDigits:21}).format(b.value),{size:96,weight:650,tag:'strong'});add(b.unit,{size:24,tag:'small'});add(b.label,{size:16,tag:'span'});}
   else if(b.type==='image'){const res=project.resources?.[b.assetId];region.image={box:{x,y,width:600,height:400},source:{left:0,top:0,right:0,bottom:0},naturalWidth:res?.width||600,naturalHeight:res?.height||400,alt:b.alt,ready:imageReady,measureId:font(b.alt)};y+=412;add(b.alt,{size:12,tag:'figcaption'});}
   else if(b.type==='table'){const rows=[b.columns,...b.rows].map((cells,i)=>{const h=40,cy=y+i*h;return {box:{x,y:cy,width,height:h},cells:cells.map((c,j)=>({box:{x:x+j*width/cells.length,y:cy,width:width/cells.length,height:h},header:i===0,colspan:1,rowspan:1,fill:i===0?{hex:'1C2C3C',alpha:1}:null,borders:{top:null,right:null,bottom:{width:1,color:{hex:'888888',alpha:1}},left:null},padding:[8,8,8,8],valign:'middle',texts:[part(c,{x:x+j*width/cells.length+8,y:cy+8,width:width/cells.length-16,size:14,weight:i===0?700:400,tag:i===0?'th':'td'})]}))};});
    region.tables=[{box:{x,y,width,height:rows.length*40},rows,caption:[]}];y+=rows.length*40+12;}
   else if(b.type==='chart'){const d=document.datasets.find(v=>v.id===b.datasetId),rowsKind=['ranked-bar','grouped-bar','dot-interval'].includes(b.chartType);
    if(b.question)add(b.question,{size:18,weight:600,tag:'span'});
    const box={x,y,width:900,height:300},ids=d.categoryIds||d.categories.map((_,i)=>'category-'+i);
    region.plot={box,measureId:font('plot'),tag:rowsKind?'ol':'div',className:rowsKind?'chart-rows':'chart-plot',labelStyle:style(12,{id:font('label')}),scale:1,svg:!rowsKind,
     texts:[{text:d.unit,box:{x,y,width:40,height:14},style:style(12,{id:font(d.unit)}),anchor:'start'},...d.series.map((s,j)=>({text:s.label,box:{x,y:y+40+j*30,width:120,height:14},style:style(12,{id:font(s.label)}),anchor:'end'}))],
     marks:d.series.flatMap((s,j)=>ids.map((id,i)=>({seriesId:s.id,objectId:id,focus:null,tag:'rect',fill:{hex:COLORS[j%6],alpha:1},stroke:null,strokeWidth:0,dash:null,box:{x:x+140+i*60,y:y+40+j*30,width:56,height:26}})))};
    y+=312;region.texts.push(...d.series.map((s,j)=>part(s.label,{x:x+j*200,y,width:180,size:14,tag:'li'})));y+=30;
    region.shapes=d.series.map((s,j)=>({kind:'rect',box:{x:x+j*200-24,y:y-26,width:18,height:8},fill:{hex:COLORS[j%6],alpha:1},stroke:null,strokeWidth:0,dash:null,radius:0}));
    if(b.takeaway)add(b.takeaway,{size:16});region.disclosures=['View all data'];}
   else if(b.type==='diagram'){const n=b.nodes.length,w=160,gap=40,nodes=b.nodes.map((node,i)=>({id:node.id,shape:{kind:'rect',box:{x:x+i*(w+gap),y,width:w,height:70},fill:{hex:'F5EBD9',alpha:1},stroke:{hex:'BD4027',alpha:1},strokeWidth:1.5,dash:null,radius:6},texts:[{box:{x:x+i*(w+gap)+10,y:y+20,width:w-20,height:30},lines:node.label.split('\n').map((t,l)=>({text:t,box:{x:x+i*(w+gap)+10,y:y+20+l*18,width:w-20,height:16}})),style:style(16,{id:font(node.label)}),anchor:'middle'}]}));
    const at=id=>b.nodes.findIndex(v=>v.id===id);
    region.diagram={box:{x,y,width:n*(w+gap),height:70},scale:1,nodes,edges:b.edges.map((e,i)=>{const a=at(e.from),c=at(e.to),from=[x+a*(w+gap)+w+2,y+35],to=[x+c*(w+gap)-2,y+35];return {id:e.id||'edge-'+i,line:{kind:'path',box:{x:Math.min(from[0],to[0]),y:y+35,width:Math.abs(to[0]-from[0]),height:0},fill:null,stroke:{hex:'1C2C3C',alpha:1},strokeWidth:1.5,dash:null,commands:[{c:'M',p:[from]},{c:'L',p:[to]}],unsupported:false,from,to,markerEnd:true,markerStart:false},texts:e.label?[{box:{x:from[0],y:y+75,width:120,height:16},lines:[{text:e.label,box:{x:from[0],y:y+75,width:120,height:16}}],style:style(12,{id:font(e.label)}),anchor:'middle'}]:[]};})};
    y+=110;region.disclosures=['Relationships and node notes'];}
   region.bounds={x,y:start,width,height:Math.max(1,y-start)};regions.push(region);y+=12;
  }
  return {sceneId:scene.id,bounds:{x:24,y:top,width:1392,height:Math.max(810,y-top+60)},background:{hex:'FAF9F5',alpha:1},backgroundImage:null,decor:[],chrome:{texts:[part(`${String(k+1).padStart(2,'0')} / ${String(html.scenes.length).padStart(2,'0')}`,{x,y:top+30,width:80,size:11,tag:'span'})],boxes:[]},regions,disclosures:[]};
 });
 return {format:'deckweft-export-layout',version:1,renderHash:html.renderHash,viewport:{width:1440,height:810,dpr:1},fontStatus,fontFaces:[],images:document.blocks.filter(b=>b.type==='image').map(()=>({ready:imageReady,measureId:null})),pseudo:{materialized:0,unresolved:0,heightsBefore:[],heightsAfter:[],stable:true},scenes,platformFonts};
}
