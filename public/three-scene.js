/* Bounded, geometry-only scene recipes. Text remains in the shared editable scene. */
(()=>{'use strict';
function mount(root,{reduced=false}={}){
 const svg=root?.querySelector('svg[data-spatial]');if(!svg)return null;
 const spec=JSON.parse(svg.dataset.spatial),THREE=window.DeckWeftThree;
 if(!THREE||!['orbit','layers'].includes(spec.recipe)||!Number.isInteger(spec.count)||spec.count<1||spec.count>6)return null;
 const canvas=document.createElement('canvas'),overlay=document.createElement('div'),controls=document.createElement('div');canvas.className='three-scene-layer';overlay.className='three-scene-overlay';canvas.setAttribute('aria-hidden','true');canvas.dataset.renderer='three-scene';root.style.position='relative';
 Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',zIndex:'1'});
 const [,,width,height]=svg.getAttribute('viewBox').split(' ').map(Number),r=spec.region;
 Object.assign(canvas.style,{left:r.x/width*100+'%',top:r.y/height*100+'%',width:r.w/width*100+'%',height:r.h/height*100+'%'});Object.assign(overlay.style,{position:'absolute',left:'0',right:'0',top:'0',aspectRatio:width+'/'+height,pointerEvents:'none',zIndex:'1'});overlay.append(canvas);root.append(overlay);
 const fallback=spec.fallbackNodeIds.map(id=>[...svg.querySelectorAll('[data-node]')].find(n=>n.dataset.node===id)).filter(Boolean);fallback.forEach(n=>n.classList.add('spatial-static-fallback'));
 let renderer,scene,camera,group,resources=[],disposed=false,lost=false,angle=0,frames=0;
 const system=matchMedia('(prefers-reduced-motion:reduce)');let policy=!!reduced||system.matches;
 const restoreFallback=()=>{fallback.forEach(n=>n.style.opacity='');canvas.hidden=true;controls.hidden=true;};
 function draw(){if(disposed||lost||document.hidden)return;group.rotation.y=angle;renderer.render(scene,camera);canvas.dataset.frames=String(++frames);canvas.dataset.reduced=String(policy);}
 function loop(){angle+=.003;draw();}
 function update(){renderer?.setAnimationLoop(!disposed&&!lost&&!policy&&!document.hidden?loop:null);draw();}
 function contextLost(e){e.preventDefault();lost=true;renderer.setAnimationLoop(null);restoreFallback();root.dataset.spatialStatus='context-lost';}
 function contextRestored(){if(disposed)return;lost=false;try{draw();fallback.forEach(n=>n.style.opacity='0');canvas.hidden=false;controls.hidden=false;root.dataset.spatialStatus='ready';update();}catch{lost=true;restoreFallback();}}
 function visibility(){update();}
 function systemChange(){policy=!!reduced||system.matches;update();}
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(1);const scale=Math.min(1,900/r.w,700/r.h);renderer.setSize(Math.round(r.w*scale),Math.round(r.h*scale),false);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,r.w/r.h,.1,100);camera.position.z=8;group=new THREE.Group();scene.add(group);scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
  const keep=v=>(resources.push(v),v),geometry=keep(spec.recipe==='orbit'?new THREE.SphereGeometry(.38,24,16):new THREE.BoxGeometry(2.6,.32,1.6)),material=keep(new THREE.MeshStandardMaterial({color:spec.color,roughness:.45,metalness:.1}));
  for(let i=0;i<spec.count;i++){const mesh=new THREE.Mesh(geometry,material);if(spec.recipe==='orbit'){const a=i/spec.count*Math.PI*2;mesh.position.set(Math.cos(a)*1.7,Math.sin(a)*1.4,Math.sin(a*2)*.6);}else{mesh.position.set((i-spec.count/2)*.13,(i-spec.count/2)*.5,0);mesh.rotation.y=.4;}group.add(mesh);}
  controls.setAttribute('role','group');controls.setAttribute('aria-label',spec.label+' — 3D controls');controls.className='spatial-controls';Object.assign(controls.style,{position:'relative',zIndex:'2',display:'flex',gap:'6px',flexWrap:'wrap'});
  const labels=document.documentElement.lang==='zh-CN'?['左转','右转','重置']:['Rotate left','Rotate right','Reset 3D'];
  labels.forEach((label,i)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{angle=i===2?0:angle+(i===0?-.25:.25);draw();};controls.append(button);});root.append(controls);
  draw();fallback.forEach(n=>n.style.opacity='0');root.dataset.spatialStatus='ready';canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);document.addEventListener('visibilitychange',visibility);system.addEventListener('change',systemChange);update();
 }catch{renderer?.dispose();resources.forEach(v=>v.dispose());overlay.remove();controls.remove();restoreFallback();root.dataset.spatialStatus='fallback';return null;}
 return {setReduced(value){reduced=!!value;policy=reduced||system.matches;update();},dispose(){disposed=true;renderer.setAnimationLoop(null);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);document.removeEventListener('visibilitychange',visibility);system.removeEventListener('change',systemChange);resources.forEach(v=>v.dispose());renderer.dispose();renderer.forceContextLoss();overlay.remove();controls.remove();fallback.forEach(n=>n.style.opacity='');},canvas};
}
window.DeckWeftSpatial={mount};
})();
