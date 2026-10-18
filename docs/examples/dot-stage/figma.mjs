// Run through the Figma tool, not the core runtime. Assets are supplied explicitly.
export function figmaScript(deck,dots,posterBase64){return `
const page=await figma.getNodeByIdAsync('0:1');await figma.setCurrentPageAsync(page);
const existing=page.children.map(n=>({id:n.id,name:n.name}));if(existing.length)throw Error('This build expects an empty new file. Inspect existing nodes before retrying.');
await Promise.all([figma.loadFontAsync({family:'Inter',style:'Regular'}),figma.loadFontAsync({family:'Inter',style:'Bold'})]);
const source=${JSON.stringify(deck)},dots=${JSON.stringify(dots)},encoded=${JSON.stringify(posterBase64)};
const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',bytes=[];let bits=0,value=0;for(const c of encoded){if(c==='=')break;const n=chars.indexOf(c);if(n<0)continue;value=(value<<6)|n;bits+=6;if(bits>=8){bits-=8;bytes.push((value>>bits)&255)}}const image=figma.createImage(new Uint8Array(bytes));
const created=[],roots=[],dotFrames=[];const rgb=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
function track(n,delay=.0){n.manualKeyframeTracks={OPACITY:{keyframes:[{timelinePosition:delay,value:{type:'FLOAT',value:0}},{timelinePosition:delay+.5,value:{type:'FLOAT',value:1},easing:{type:'EASE_OUT'}}]},TRANSLATION_Y:{keyframes:[{timelinePosition:delay,value:{type:'FLOAT',value:24}},{timelinePosition:delay+.5,value:{type:'FLOAT',value:0},easing:{type:'EASE_OUT'}}]}}}
for(let i=0;i<source.slides.length;i++){
 const s=source.slides[i],frame=figma.createFrame();created.push(frame.id);page.appendChild(frame);frame.name=String(i+1).padStart(2,'0')+' / '+s.title;frame.resize(1600,900);frame.x=120+(i%2)*1760;frame.y=100+Math.floor(i/2)*1060;frame.fills=[{type:'SOLID',color:rgb(s.background)}];frame.clipsContent=true;roots.push({id:frame.id,name:frame.name});
 for(let j=0;j<s.nodes.length;j++){
  const n=s.nodes[j];if(n.kind!=='text')continue;
  const holder=figma.createAutoLayout('VERTICAL');created.push(holder.id);frame.appendChild(holder);holder.name='Text / '+j;holder.resize(n.w,n.h);holder.layoutSizingHorizontal='FIXED';holder.layoutSizingVertical='FIXED';holder.x=n.x;holder.y=n.y;holder.fills=[];holder.paddingLeft=0;holder.paddingRight=0;holder.paddingTop=0;holder.paddingBottom=0;
  const t=figma.createText();created.push(t.id);holder.appendChild(t);t.name=n.value.split('\\n')[0];t.fontName={family:'Inter',style:n.bold?'Bold':'Regular'};t.fontSize=n.size;t.lineHeight={unit:'PERCENT',value:115};t.fills=[{type:'SOLID',color:rgb(n.color)}];t.characters=n.value;t.textAutoResize='HEIGHT';t.resize(n.w,n.h);t.layoutSizingHorizontal='FIXED';t.layoutSizingVertical='HUG';track(holder,(n.delay||0)/1000);
 }
 if(s.dots)for(const d of dots){
  const f=figma.createFrame();created.push(f.id);frame.appendChild(f);f.name=d.name+' Dot / source crop';f.resize(d.s,d.s);f.x=d.x;f.y=d.y;f.cornerRadius=d.s/2;f.clipsContent=true;f.fills=[];
  const r=figma.createRectangle();created.push(r.id);f.appendChild(r);const scale=d.s/d.crop.s;r.name='Supplied event artwork';r.resize(800*scale,800*scale);r.x=-d.crop.x*scale;r.y=-d.crop.y*scale;r.fills=[{type:'IMAGE',imageHash:image.hash,scaleMode:'FILL'}];
  const delay=d.delay/1000;f.manualKeyframeTracks={TRANSLATION_Y:{keyframes:[{timelinePosition:delay,value:{type:'FLOAT',value:150}},{timelinePosition:delay+.55,value:{type:'FLOAT',value:-18},easing:{type:'EASE_OUT'}},{timelinePosition:delay+.9,value:{type:'FLOAT',value:0},easing:{type:'EASE_OUT'}},{timelinePosition:2,value:{type:'FLOAT',value:-7},easing:{type:'EASE_IN_AND_OUT'}},{timelinePosition:3.2,value:{type:'FLOAT',value:0},easing:{type:'EASE_IN_AND_OUT'}}]},OPACITY:{keyframes:[{timelinePosition:delay,value:{type:'FLOAT',value:0}},{timelinePosition:delay+.3,value:{type:'FLOAT',value:1},easing:{type:'EASE_OUT'}}]}};dotFrames.push({id:f.id,name:d.name});
 }
 const [timeline]=frame.timelines;if(timeline&&timeline.duration<4)frame.setTimelineDuration(timeline.id,4);
}
return {createdNodeIds:created,roots,dotFrames,font:'Inter',notes:'Original type and motion. Dot characters are cropped from the user-supplied reference, not regenerated or recoloured. Studio screenshot will be inserted separately.'};
`;}
