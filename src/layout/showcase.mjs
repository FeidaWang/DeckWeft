import {DeckError} from '../core/errors.mjs';
import {estimatedTextMeasurer,fontPreference} from './text.mjs';
import {speechStats} from '../core/speech.mjs';
// A selectable presentation style. Native content nodes and media share one scene.
// Only bundled asset identifiers are emitted; no project path/URL is dereferenced.
export function compileShowcase(project,slide,layout,{measurer=estimatedTextMeasurer}={}){
 if(project.extensions.deckweftShowcase.version!==1)throw new DeckError('SHOWCASE_VERSION','Unsupported showcase style version. Use Studio layouts or the matching runtime.',422);
 const i=project.slides.findIndex(s=>s.id===slide.id),count=project.slides.length,c=slide.content;
 const mode=i%14,dark=[0,3,8,10,13].includes(mode),blue=mode===2,purple=mode===7;
 const bg=dark?'#080D13':blue?'#075FFF':purple?'#7C3DF0':'#FFFFFF',ink=dark||blue||purple?'#FFFFFF':'#101010',muted=dark?'#B8C5D5':blue||purple?'#E1E8FF':'#535C68';
 const scene={format:'deckweft-scene',version:1,id:slide.id,layout,width:1600,height:900,background:bg,measurement:measurer.kind,style:'cosmos-dots',nodes:[],issues:[]};let serial=0;
 if(project.aspectRatio!=='16:9')scene.issues.push({code:'SHOWCASE_RATIO',severity:'error',message:'Cosmic & Dots uses a 16:9 stage. Choose 16:9 or switch back to Studio layouts.'});
 const image=(asset,x,y,w,h,role='art')=>scene.nodes.push({id:`${slide.id}_${role}_${serial++}`,type:'image',asset,x,y,w,h,role,alt:role==='cosmos'?'Original AI-generated star field':asset.startsWith('dot-')?'Dot character from the supplied event artwork':asset==='studio'?'Actual DeckWeft Studio screenshot':'Actual DeckWeft at a narrow viewport'});
 const rect=(x,y,w,h,fill,radius=0)=>scene.nodes.push({id:`${slide.id}_shape_${serial++}`,type:'rect',x,y,w,h,fill,radius});
 function text(role,value,x,y,w,h,size=40,min=28,color=ink){if(!value)return;const id=`${slide.id}_${role}_${serial++}`,fit=measurer.fit(value,{w,h},{...fontPreference(project.locale,false),preferred:size,minimum:min,leading:1.10},`${layout}:${id}`);scene.nodes.push({id,type:'text',role,x,y,w,h,color,...fit});if(fit.overflow)scene.issues.push({code:'TEXT_OVERFLOW',severity:'error',node:role,message:`${role}: shorten the text or use Studio layouts.`,requiredHeight:fit.requiredHeight,availableHeight:h});}
 const colours=['#075FFF','#FF7900','#974BFF','#00AB47','#D6D6D6'];
 const items=[...c.items,...c.metrics.map(m=>`${m.value} · ${m.label}`)];
 function list(x,y,w,h,colour=ink){const n=items.length;if(!n)return;const cell=(h-(n-1)*18)/n;items.forEach((v,j)=>{rect(x,y+j*(cell+18)+8,5,Math.max(24,cell-12),colours[j%4],2);text('item',v,x+24,y+j*(cell+18),w-24,cell,33,24,colour);});}
 function flow(y=440){const n=items.length,cell=(1440-(n-1)*34)/Math.max(1,n);items.forEach((v,j)=>{const x=80+j*(cell+34);if(j<n-1)rect(x+cell-10,y+45,44,3,dark?'#596777':'#C3CCD9');rect(x,y,cell,4,blue||purple?'#FFFFFF':colours[j%4]);text('step-number',String(j+1).padStart(2,'0'),x,y+28,cell,80,64,50,blue||purple?'#FFFFFF':colours[j%4]);text('item',v,x,y+140,cell-10,155,35,24);});}
 if([0,13].includes(mode))image('cosmos',0,0,1600,900,'cosmos');
 text('eyebrow',c.eyebrow||'DECKWEFT / IN MOTION',80,62,1370,40,23,20,dark||blue||purple?'#BBCBFF':'#075FFF');
 if(layout!=='editorial'){
  text('title',c.title,80,140,1400,210,100,54);text('body',c.body,84,370,1330,110,38,28);
  if(layout==='grid'){
   const rows=Math.ceil(items.length/2),hh=Math.min(132,(330-(rows-1)*20)/Math.max(1,rows));items.forEach((v,j)=>{const x=84+(j%2)*750,y=505+Math.floor(j/2)*(hh+20);rect(x,y,710,hh,dark?'#142131':blue?'#0047CD':purple?'#642BCB':'#EEF2FA',10);text('item',v,x+22,y+20,666,hh-36,34,24);});
  }else if(layout==='timeline')flow(515);else list(84,555,1240,255);
 }else if(mode===0){
  text('title',c.title,76,237,1070,180,154,72);text('body',c.body,84,470,790,180,43,30);list(84,670,730,130);image('dot-blue',1220,565,260,260,'dot');image('dot-green',1120,150,150,150,'dot');image('dot-orange',1430,350,96,96,'dot');
 }else if(mode===1){
  text('title',c.title,80,143,1130,220,106,58);text('body',c.body,84,405,950,120,39,28);list(84,564,940,215);image('dot-orange',1180,470,340,340,'dot');
 }else if(mode===2){
  text('title',c.title,80,128,1410,230,104,54);text('body',c.body,84,390,1370,100,39,28);flow(530);
 }else if(mode===3){
  text('title',c.title,80,135,1370,190,100,54);text('body',c.body,84,348,1220,90,37,28);flow(490);image('dot-orange',1320,220,160,160,'dot');
 }else if(mode===4){
  text('title',c.title,80,154,440,265,90,48);text('body',c.body,84,438,410,170,31,24);image('studio',555,145,970,610,'workbench');list(84,650,410,175);
 }else if(mode===5||mode===9){
  text('title',c.title,80,136,1370,175,88,48);text('body',c.body,84,328,1370,90,36,28);flow(470);image('dot-green',1350,130,130,130,'dot');
 }else if(mode===6){
  text('title',c.title,80,130,960,245,100,54);text('body',c.body,84,410,900,100,36,28);list(84,553,900,220);image('mobile',1120,130,312,675,'workbench');
 }else if(mode===7){
  text('title',c.title,80,138,890,215,100,54);text('body',c.body,84,380,810,120,36,28);list(84,550,810,230);const stats=speechStats(project,{wpm:140});text('timer',`${Math.floor(stats.scheduledSeconds/60)}:${String(stats.scheduledSeconds%60).padStart(2,'0')}`,990,260,520,190,148,86);text('speech-count',`${stats.words} spoken words\n140 words / minute`,1010,480,470,140,35,28);image('dot-orange',1300,655,170,170,'dot');
 }else if(mode===8){
  text('title',c.title,80,130,1370,150,96,54);text('body',c.body,84,300,1310,90,36,28);const names=['dot-blue','dot-orange','dot-purple','dot-green'];items.forEach((v,j)=>{const col=j%2,row=Math.floor(j/2),x=84+col*750,y=450+row*170;image(names[j%4],x,y,110,110,'dot');text('item',v,x+142,y+10,560,120,34,26);});
 }else if(mode===10){
  text('title',c.title,80,140,800,275,96,54);text('body',c.body,84,447,700,140,36,28);image('dot-blue',170,640,180,180,'dot');list(930,300,570,440);
 }else if(mode===11){
  text('title',c.title,80,140,820,200,116,64);text('body',c.body,84,365,700,110,36,28);list(930,200,570,280);['blue','orange','purple','green','grey'].forEach((name,j)=>image('dot-'+name,80+j*300,580+(j%2?0:50),j===2?230:180,j===2?230:180,'dot'));
 }else if(mode===12){
  rect(0,0,1600,900,'#075FFF');text('title',c.title,80,160,1400,250,110,64,'#FFFFFF');text('body',c.body,84,450,1100,155,42,30,'#FFFFFF');list(84,650,1100,150,'#FFFFFF');image('dot-green',1310,610,200,200,'dot');
 }else{
  text('title',c.title,80,142,980,240,102,54);text('body',c.body,84,420,900,110,37,28);list(84,605,960,180);image('dot-purple',1140,410,300,300,'dot');image('dot-orange',1390,180,125,125,'dot');
 }
 text('footer',`${String(i+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`,1400,844,120,28,18,18,mode===12?'#FFFFFF':muted);
 if(slide.sourceIds.length)text('source-note','Sources in speaker notes',80,844,900,28,17,17,mode===12?'#FFFFFF':muted);
 return scene;
}
