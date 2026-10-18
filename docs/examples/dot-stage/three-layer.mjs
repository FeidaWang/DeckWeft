import * as THREE from './vendor/three.module.js';

// Optional presentation enhancement. Text remains in the editable DOM/PPTX scene.
// Assets are embedded data URLs. No fetch, CDN, account or telemetry is used.
window.DeckWeft3D={async create({stage,frame,dots,layouts,onStatus=()=>{}}){
 const canvas=document.createElement('canvas');canvas.id='three-stage';canvas.setAttribute('aria-hidden','true');
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{onStatus('2D fallback');return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(1600,900,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
 Object.assign(canvas.style,{position:'absolute',inset:'0',width:'1600px',height:'900px',zIndex:3,pointerEvents:'none'});stage.append(canvas);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1600/900,1,5000);camera.position.set(0,0,1236);camera.lookAt(0,0,0);
 scene.add(new THREE.AmbientLight(0xffffff,2.2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-500,700,1000);scene.add(key);
 const loader=new THREE.TextureLoader(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let active=0,reduced=false,enabled=true,visible=true,entered=performance.now(),last=performance.now(),hover=-1,fan=0;
 const mouse={x:0,y:0},groups=[],hitTargets=[],resources=[];
 function keep(resource){resources.push(resource);return resource;}
 async function texture(url){const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return keep(t);}
 const layoutTextures=await Promise.all(layouts.map(svg=>texture('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg))));
 const faceTextures=await Promise.all(dots.map((d,i)=>texture(document.querySelector(`[data-dot="${i}"] img`).src)));
 const paper=new THREE.Group(),coins=new THREE.Group();scene.add(paper,coins);
 const sheets=[];for(let i=0;i<4;i++){
  const g=new THREE.Group();paper.add(g);
  const body=new THREE.Mesh(keep(new THREE.BoxGeometry(480,270,18)),keep(new THREE.MeshStandardMaterial({color:['#075FFF','#FF7900','#974BFF','#00AB47'][i],roughness:.65,metalness:.03})));g.add(body);
  const face=new THREE.Mesh(keep(new THREE.PlaneGeometry(480,270)),keep(new THREE.MeshBasicMaterial({map:layoutTextures[i],side:THREE.FrontSide})));face.position.z=9.5;g.add(face);face.userData.sheet=i;hitTargets.push(face);
  const edge=new THREE.LineSegments(keep(new THREE.EdgesGeometry(body.geometry)),keep(new THREE.LineBasicMaterial({color:0x8a9dbf,transparent:true,opacity:.8})));g.add(edge);sheets.push(g);
 }
 const dotGroups=[];const colours=['#075FFF','#FF7900','#974BFF','#00AB47','#D6D6D6'];
 for(let i=0;i<dots.length;i++){
  const d=dots[i],g=new THREE.Group();coins.add(g);g.userData={index:i,kick:0,born:performance.now()};
  const rim=new THREE.Mesh(keep(new THREE.CylinderGeometry(d.s/2,d.s/2,38,80,1,false)),keep(new THREE.MeshStandardMaterial({color:colours[i],roughness:.45,metalness:.04})));rim.rotation.x=Math.PI/2;g.add(rim);
  const face=new THREE.Mesh(keep(new THREE.PlaneGeometry(d.s,d.s)),keep(new THREE.MeshBasicMaterial({map:faceTextures[i],transparent:true,alphaTest:.1,side:THREE.DoubleSide,depthWrite:false})));face.position.z=20;face.userData.dot=i;g.add(face);hitTargets.push(face);
  // A soft local contact shadow gives depth without adding a scene-wide floor.
  const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(12,20,35,.2)');gradient.addColorStop(1,'rgba(12,20,35,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const shadowTexture=keep(new THREE.CanvasTexture(c));
  const shadow=new THREE.Mesh(keep(new THREE.PlaneGeometry(d.s*1.2,d.s*.35)),keep(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.55})));scene.add(shadow);g.userData.shadow=shadow;dotGroups.push(g);
 }
 function enter(){entered=performance.now();for(const g of dotGroups)g.userData.born=entered;}
 function boop(i){if(reduced||!enabled)return;if(dotGroups[i])dotGroups[i].userData.kick=1;}
 function setSlide(i){active=i;enter();}
 function setReduced(value){reduced=!!value;sync();}
 function sync(){canvas.hidden=!enabled||reduced;stage.classList.toggle('three-live',enabled&&!reduced);onStatus(enabled&&!reduced?'3D on':'2D mode');}
 function enabledSet(value){enabled=!!value;sync();}
 function point(event){const r=frame.getBoundingClientRect();mouse.x=((event.clientX-r.left)/r.width-.5)*2;mouse.y=((event.clientY-r.top)/r.height-.5)*2;pointer.set(mouse.x,-mouse.y);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(hitTargets,false).find(h=>(active===7&&h.object.userData.dot!==undefined)||([0,2,5].includes(active)&&h.object.userData.sheet!==undefined));hover=hit?.object.userData.dot??-1;return hit;}
 frame.addEventListener('pointermove',point);frame.addEventListener('pointerleave',()=>{mouse.x=0;mouse.y=0;hover=-1;});
 frame.addEventListener('click',event=>{if(!enabled||reduced)return;const hit=point(event);if(active===7&&hit?.object.userData.dot!==undefined)boop(hit.object.userData.dot);if([0,2,5].includes(active)&&hit?.object.userData.sheet!==undefined)fan=(fan+1)%4;});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();enabled=false;sync();onStatus('2D fallback');});
 document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=performance.now();});
 let frames=0;const metrics={engine:'Three.js',revision:THREE.REVISION,frames:0,lastFrameMs:0,drawCalls:0,scene:0};
 function render(now){
  const dt=Math.min(.04,(now-last)/1000);last=now;if(!enabled||reduced||!visible)return;
  const t=(now-entered)/1000;paper.visible=[0,2,5].includes(active);coins.visible=active===7;
  const ease=1-Math.exp(-t*4);
  if(paper.visible){
   const hero=active===0;paper.position.set(hero?430:active===2?425:420,hero?35:active===2?-120:140,0);paper.scale.setScalar(hero ? .77 : active===2 ? .68 : .7);
   paper.rotation.y=-.24+mouse.x*.11;paper.rotation.x=.12+mouse.y*.08;
   for(let i=0;i<sheets.length;i++){
    const rank=(i+fan)%4,spread=active===2?1.65:1.1;
    sheets[i].position.x=THREE.MathUtils.lerp(sheets[i].position.x,(rank-1.5)*58*spread,Math.min(1,dt*7));
    sheets[i].position.y=THREE.MathUtils.lerp(sheets[i].position.y,(rank-1.5)*47*spread+(1-ease)*140+Math.sin(now/1250+i)*5,Math.min(1,dt*8));
    sheets[i].position.z=rank*28;sheets[i].rotation.z=(rank-1.5)*.075+Math.sin(now/2100+i)*.012;sheets[i].rotation.y=(rank-1.5)*.055;
   }
  }
  for(let i=0;i<dotGroups.length;i++){
   const d=dots[i],g=dotGroups[i],delay=d.delay/1000,u=Math.max(0,t-delay),entrance=u===0?180:180*Math.exp(-u*5)*Math.cos(u*8);
   g.visible=coins.visible&&t>=delay;g.userData.shadow.visible=g.visible;
   g.userData.kick=Math.max(0,g.userData.kick-dt*1.7);const jump=Math.sin((1-g.userData.kick)*Math.PI)*g.userData.kick*100;
   const x=d.x+d.s/2-800,y=450-(d.y+d.s/2);g.position.set(x,y-entrance+jump+Math.sin(now/1000+i)*7,(i%2)*24);
   const targetX=mouse.y*.18+(hover===i?-.08:0),targetY=mouse.x*.18+(hover===i?.14:0);g.rotation.x=THREE.MathUtils.lerp(g.rotation.x,targetX,dt*6);g.rotation.y=THREE.MathUtils.lerp(g.rotation.y,targetY,dt*6);g.rotation.z=entrance/1200*d.turn*.05+Math.sin(now/1700+i)*.018;
   const squeeze=1+Math.sin(g.userData.kick*Math.PI)*.07;g.scale.set(squeeze,1/squeeze,1);
   g.userData.shadow.position.set(x,y-d.s*.52-12,-24);g.userData.shadow.material.opacity=.48-Math.min(.3,jump/200);
  }
  camera.position.x=THREE.MathUtils.lerp(camera.position.x,mouse.x*12,dt*3);camera.position.y=THREE.MathUtils.lerp(camera.position.y,-mouse.y*8,dt*3);camera.lookAt(0,0,0);
  renderer.render(scene,camera);frames++;metrics.frames=frames;metrics.lastFrameMs=dt*1000;metrics.drawCalls=renderer.info.render.calls;metrics.scene=active;if(frames%30===0){stage.dataset.threeFrames=String(frames);stage.dataset.threeDrawCalls=String(metrics.drawCalls);stage.dataset.threeFrameMs=String(metrics.lastFrameMs.toFixed(2));}
 }
 renderer.setAnimationLoop(render);stage.dataset.renderer='three-webgl';sync();
 return {setSlide,setReduced,setEnabled:enabledSet,boop,wave:()=>dotGroups.forEach((_,i)=>setTimeout(()=>boop(i),i*100)),replay:enter,metrics:()=>({...metrics}),dispose(){renderer.setAnimationLoop(null);for(const r of resources)r.dispose?.();renderer.dispose();canvas.remove();stage.classList.remove('three-live');}};
}};
