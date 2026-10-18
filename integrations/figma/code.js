/* Local editable-scene importer. No network requests and no full-slide rasterization. */
figma.showUI(__html__, {width:480,height:480,themeColors:true});
function rgb(hex){return {r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255};}
function pngBytes(url){
 if(typeof url!=='string'||url.length>5400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(url))throw Error('Use bounded embedded PNG media only.');
 const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',raw=url.split(',')[1],out=[];let bits=0,value=0;
 for(const c of raw){if(c==='=')break;value=(value<<6)|chars.indexOf(c);bits+=6;if(bits>=8){bits-=8;out.push((value>>bits)&255);}}
 if(out.length<33||[137,80,78,71,13,10,26,10].some((v,i)=>out[i]!==v))throw Error('Invalid PNG signature.');return new Uint8Array(out);
}
function validate(bundle){
 if(!bundle||bundle.format!=='deckweft-figma'||bundle.version!==1||!Array.isArray(bundle.scenes)||!bundle.scenes.length||bundle.scenes.length>100)throw Error('Choose a DeckWeft Figma handoff.');
 let total=0,mediaBytes=0;const sceneIds=new Set();
 for(const scene of bundle.scenes){
  if(typeof scene.id!=='string'||sceneIds.has(scene.id)||![scene.width,scene.height].every(n=>Number.isFinite(n)&&n>0&&n<=4096)||!Array.isArray(scene.nodes)||!/^#[0-9A-Fa-f]{6}$/.test(scene.background))throw Error('Invalid scene size, id or background.');sceneIds.add(scene.id);
  total+=scene.nodes.length;if(total>10000)throw Error('This handoff has too many layers.');const ids=new Set();
  for(const n of scene.nodes){
   if(typeof n.id!=='string'||ids.has(n.id)||!['text','rect','ellipse','image'].includes(n.type)||![n.x,n.y,n.w,n.h].every(Number.isFinite)||n.w<=0||n.h<=0||n.w>4096||n.h>4096)throw Error('Invalid layer id or geometry.');ids.add(n.id);
   if(n.type==='image'){const bytes=pngBytes(n.resource?.dataURL);mediaBytes+=bytes.length;if(mediaBytes>16000000)throw Error('Embedded media exceeds 16 MB.');if(typeof n.alt!=='string'||!n.alt.trim())throw Error('Image needs alternative text.');continue;}
   if(!/^#[0-9A-Fa-f]{6}$/.test(n.color||n.fill))throw Error('Invalid colour.');
   if(n.type==='rect'&&n.radius!==undefined&&(!Number.isFinite(n.radius)||n.radius<0))throw Error('Invalid corner radius.');
   if(n.type==='text'&&(!Array.isArray(n.lines)||!n.lines.every(t=>typeof t==='string')||typeof n.fontFamily!=='string'||!Number.isFinite(n.fontSize)||n.fontSize<1||n.fontSize>300||!Number.isFinite(n.lineHeight)||n.lineHeight<=0||n.lineHeight>600))throw Error('Invalid text layer.');
  }
 }
}
let busy=false,cancelled=false;
figma.ui.onmessage=async message=>{
 if(message.type==='cancel'){cancelled=true;return;}
 if(message.type!=='import')return;
 if(busy){figma.ui.postMessage({ok:false,message:'An import is already running.'});return;}
 busy=true;cancelled=false;const created=[],createdLayers=[],nodeMap=[],fontDecisions=[],createdNodeIds=[];
 function check(){if(cancelled)throw Error('Import cancelled. Only frames from this run were removed.');}
 try{
  const bundle=message.bundle;validate(bundle);
  const fonts=await figma.listAvailableFontsAsync(),mapping=new Map(),warnings=[];check();
  const families=new Set(bundle.scenes.flatMap(s=>s.nodes.filter(n=>n.type==='text').map(n=>n.fontFamily)));
  for(const family of families){
   const aliases=family==='Noto Serif CJK SC'?[family,'Noto Serif SC']:family==='Noto Sans CJK SC'?[family,'Noto Sans SC']:[family];
   let found=fonts.find(f=>aliases.includes(f.fontName.family)&&f.fontName.style==='Regular');
   if(!found){if(message.allowFontFallback!==true)throw Error(`Missing ${family}. Install it or explicitly allow Inter substitution and inspect wrapping.`);found=fonts.find(f=>f.fontName.family==='Inter'&&f.fontName.style==='Regular');warnings.push(`${family} was replaced with Inter. Check wrapping.`);}
   if(!found)throw Error('No suitable font is installed.');await figma.loadFontAsync(found.fontName);check();mapping.set(family,found.fontName);fontDecisions.push({requested:family,actual:found.fontName,substituted:!aliases.includes(found.fontName.family)});
  }
  let startX=100;for(const node of figma.currentPage.children)startX=Math.max(startX,node.x+node.width+100);
  let top=0;for(const [i,scene]of bundle.scenes.entries()){
   check();const frame=figma.createFrame();created.push(frame);createdNodeIds.push(frame.id);frame.name=`DeckWeft / ${i+1} / ${bundle.title}`;frame.resize(scene.width,scene.height);frame.x=startX;frame.y=top;top+=scene.height+80;frame.layoutMode='NONE';frame.fills=[{type:'SOLID',color:rgb(scene.background)}];nodeMap.push({slideId:scene.id,nodeId:frame.id,type:'FRAME',layout:'fixed-scene'});
   for(const n of scene.nodes){
    check();let node;
    if(n.type==='text'){
     node=figma.createText();createdLayers.push(node);node.fontName=mapping.get(n.fontFamily);frame.appendChild(node);node.characters=n.lines.join('\n');node.fontSize=n.fontSize;node.lineHeight={unit:'PIXELS',value:n.lineHeight};node.textAutoResize='NONE';node.fills=[{type:'SOLID',color:rgb(n.color)}];
    }else if(n.type==='image'){
     const image=figma.createImage(pngBytes(n.resource.dataURL));node=figma.createRectangle();createdLayers.push(node);frame.appendChild(node);node.fills=[{type:'IMAGE',imageHash:image.hash,scaleMode:'FIT'}];
    }else{node=n.type==='ellipse'?figma.createEllipse():figma.createRectangle();createdLayers.push(node);frame.appendChild(node);node.fills=[{type:'SOLID',color:rgb(n.fill)}];if(n.type==='rect')node.cornerRadius=Math.min(n.radius||0,n.w/2,n.h/2);}
    createdNodeIds.push(node.id);node.resize(n.w,n.h);node.x=n.x;node.y=n.y;node.name=(n.role||n.type)+' / '+n.id;
    nodeMap.push({slideId:scene.id,sourceId:n.id,nodeId:node.id,type:node.type,...(n.type==='image'?{alt:n.alt}:{}),...(n.type==='text'?{requestedFont:n.fontFamily,actualFont:mapping.get(n.fontFamily)}:{})});
    if(typeof setTimeout==='function')await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(scene.spatial||scene.interaction)warnings.push(`Slide ${i+1}: fixed static fallback; live interaction and 3D are not imported.`);
  }
  check();figma.currentPage.selection=created;figma.viewport.scrollAndZoomIntoView(created);
  figma.ui.postMessage({ok:true,message:`Imported ${created.length} editable frames.`,warnings,report:{format:'deckweft-figma-import-report',version:1,frames:created.map(n=>n.id),createdNodeIds,nodeMap,fontDecisions,layout:'Fixed scene coordinates; no reusable components or auto-layout inferred.'}});
 }catch(error){for(const node of createdLayers)if(!node.removed)node.remove();for(const node of created)if(!node.removed)node.remove();figma.ui.postMessage({ok:false,message:error.message,rolledBackFrames:created.length});}
 finally{busy=false;}
};
