import {fontPreference,estimatedTextMeasurer} from './text.mjs';
/** Closed native vocabulary: text, rect, ellipse and individually replaceable PNG. No imported SVG/JS. */
export function compileRecipe(project,slide,layout,{measurer=estimatedTextMeasurer,assetResources={},palette,dimensions}={}){
 const [w,h]=dimensions,p=palette,m=Math.round(Math.min(w,h)*.075),inner=w-2*m,portrait=w<h*.85,family=slide.intent.visualFamily;
 const scene={format:'deckweft-scene',version:1,id:slide.id,layout,width:w,height:h,background:p.background,measurement:measurer.kind,recipe:family,nodes:[],issues:[],capabilities:{html:'native',svg:'static-fallback',pptx:'native',figma:'native',motion:'static-fallback',audience:'static-fallback'}};
 let n=0;
 const box=(role,x,y,bw,bh,fill=p.tint,radius=12,state)=>scene.nodes.push({id:`${slide.id}_${role}_${n++}`,role,type:'rect',x,y,w:Math.max(1,bw),h:Math.max(1,bh),fill,radius,...(state===undefined?{}:{state})});
 function text(role,value,x,y,bw,bh,preferred=28,minimum=20,color=p.ink,state){
  if(!value)return;const id=`${slide.id}_${role}_${n++}`,style={...fontPreference(project.locale,false),preferred,minimum,leading:1.23},fit=measurer.fit(value,{w:bw,h:bh},style,`${layout}:${id}`);
  scene.nodes.push({id,role,type:'text',x,y,w:bw,h:bh,color,...fit,...(state===undefined?{}:{state})});
  if(fit.overflow)scene.issues.push({code:'TEXT_OVERFLOW',severity:'error',node:role,message:`${role}: shorten the text or split this slide.`,requiredHeight:fit.requiredHeight,availableHeight:bh});
 }
 const c=slide.content,items=[...c.items,...c.metrics.map(v=>`${v.value} · ${v.label}`)];
 const titleH=family==='cover'?(portrait?290:180):(portrait?200:108),titleY=m+48;
 text('eyebrow',c.eyebrow||family.toUpperCase(),m,m,inner,26,16,14,p.accent);
 text('title',c.title,m,titleY,inner,titleH,family==='cover'?64:48,30);
 let y=titleY+titleH+24,bottom=h-m-45;
 if(c.body){const bh=family==='cover'?Math.min(140,(bottom-y)*.4):Math.min(94,(bottom-y)*.27);text('body',c.body,m,y,inner,bh,26,20,p.muted);y+=bh+22;}
 const avail=bottom-y;
 function cards(columns){
  const cols=portrait?1:Math.min(columns,Math.max(1,items.length)),rows=Math.ceil(items.length/cols),gap=18,cw=(inner-gap*(cols-1))/cols,ch=(avail-gap*(rows-1))/Math.max(1,rows);
  items.forEach((v,i)=>{const x=m+(i%cols)*(cw+gap),cy=y+Math.floor(i/cols)*(ch+gap);box('card',x,cy,cw,ch,p.tint,12,i);text('item',v,x+22,cy+22,cw-44,ch-44,family==='metric'?38:28,20,p.ink,i);});
 }
 if(family==='image-caption'){
  const a=project.assets.find(a=>a.id===slide.intent.assetIds[0]),resource=a&&Object.hasOwn(assetResources,a.id)?assetResources[a.id]:null,iw=portrait?inner:inner*.57,ih=portrait?Math.min(avail*.56,320):avail;
  box('image-frame',m,y,iw,ih,p.tint);
  if(slide.intent.spatialRecipe&&slide.intent.spatialRecipe!=='none'){
   const ids=[],count=Math.min(6,Math.max(1,items.length));
   for(let i=0;i<count;i++){const id=`${slide.id}_spatial_${i}`,radius=Math.min(iw,ih)*.10,cx=m+iw/2,cy=y+ih/2,angle=i/count*Math.PI*2;scene.nodes.push({id,type:slide.intent.spatialRecipe==='orbit'?'ellipse':'rect',role:'spatial-fallback',x:slide.intent.spatialRecipe==='orbit'?cx+Math.cos(angle)*iw*.29-radius:m+iw*.16+i*iw*.07,y:slide.intent.spatialRecipe==='orbit'?cy+Math.sin(angle)*ih*.28-radius:y+ih*.18+i*ih*.09,w:slide.intent.spatialRecipe==='orbit'?radius*2:iw*.42,h:slide.intent.spatialRecipe==='orbit'?radius*2:ih*.22,fill:i%2?p.accent:p.ink,radius:8});ids.push(id);}
   text('spatial-fallback-note','3D view · static exports use editable shapes.',m,h-m-28,inner,24,14,14,p.muted);
   scene.spatial={recipe:slide.intent.spatialRecipe,count,region:{x:m+12,y:y+12,w:iw-24,h:ih-24},color:p.accent,label:slide.intent.spatialRecipe==='orbit'?'Orbit of related ideas':'Layers of a shared idea',fallbackNodeIds:ids,support:{html:'native',svg:'static-fallback',pptx:'static-fallback',figma:'static-fallback',motion:'static-fallback',audience:'static-fallback'}};
  }else if(resource){scene.nodes.push({id:`${slide.id}_image_${n++}`,type:'image',role:'illustration',asset:a.id,resource,x:m+12,y:y+12,w:iw-24,h:ih-24,alt:a.alt});scene.capabilities.figma='native';scene.capabilities.motion='static-fallback';}
  else {text('asset-fallback',a?.fallback||'Add an approved local image. Its text alternative remains available here.',m+24,y+24,iw-48,ih-48,28,20,p.muted);scene.issues.push({code:'ASSET_FALLBACK',severity:'warning',message:'Image unavailable. The declared text fallback is shown.'});}
  const tx=portrait?m:m+iw+28,ty=portrait?y+ih+24:y,tw=portrait?inner:inner-iw-28,th=portrait?avail-ih-24:avail;
  text('caption',items.join('\n\n')||a?.alt||'',tx,ty,tw,th,28,20);
 }else if(family==='process'||family==='timeline'){
  const horizontal=family==='process'&&!portrait&&items.length<=4,gap=18;
  items.forEach((v,i)=>{
   const cw=horizontal?(inner-gap*(items.length-1))/items.length:inner,ch=horizontal?avail:(avail-gap*(items.length-1))/Math.max(1,items.length),x=horizontal?m+i*(cw+gap):m,cy=horizontal?y:y+i*(ch+gap);
   box('step',x,cy,cw,ch,p.tint,12,i);text('step-number',String(i+1).padStart(2,'0'),x+18,cy+14,50,30,20,16,p.accent,i);
   text('item',v,x+(horizontal?18:78),cy+(horizontal?64:14),cw-(horizontal?36:98),ch-(horizontal?82:28),28,20,p.ink,i);
  });
 }else if(family==='cover'){
  box('cover-rule',m,y,6,Math.max(1,avail),p.accent,2);text('item',items.join('\n\n'),m+30,y,inner-30,avail,30,20);
 }else cards(family==='metric'?3:2);
 const interaction=slide.intent.interaction;
 if(interaction.kind!=='none'){
  scene.interaction={...structuredClone(interaction),support:{html:'native',svg:'static-fallback',pptx:'static-fallback',figma:'static-fallback',motion:'static-fallback'},targetIds:interaction.labels.map((_,i)=>scene.nodes.filter(n=>n.state===i).map(n=>n.id)),staticFallback:'Static export shows all content. Initial state: '+interaction.labels[interaction.initial]};
  text('interaction-fallback',scene.interaction.staticFallback,m,h-m-28,inner,24,14,14,p.muted);
 }
 box('footer-rule',m,h-m+2,inner,1,p.line,0);text('footer',`${project.slides.findIndex(s=>s.id===slide.id)+1} / ${project.slides.length} · ${family}`,m,h-m+12,inner,22,14,14,p.muted);
 return scene;
}
