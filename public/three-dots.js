/* Geometry-only Dots. No sprite textures, screenshot masks or external requests. */
(()=>{'use strict';
const colours={blue:'#075FFF',orange:'#FF7900',purple:'#974BFF',green:'#00AB47',grey:'#D6D6D6'};
function character(THREE,name){
 if(!Object.hasOwn(colours,name))throw Error('Unknown Dot character.');
 const g=new THREE.Group(),resources=[],keep=x=>(resources.push(x),x),front=keep(new THREE.MeshBasicMaterial({color:colours[name]})),rim=keep(new THREE.MeshStandardMaterial({color:colours[name],roughness:.8,metalness:0})),black=keep(new THREE.MeshBasicMaterial({color:'#050505'}));
 const body=new THREE.Mesh(keep(new THREE.CylinderGeometry(1,1,.18,96)),rim);body.rotation.x=Math.PI/2;g.add(body);
 const bevel=new THREE.Mesh(keep(new THREE.TorusGeometry(.972,.028,12,96)),rim);bevel.position.z=.09;g.add(bevel);
 const face=new THREE.Mesh(keep(new THREE.CircleGeometry(.972,96)),front);face.position.z=.116;g.add(face);
 function bar(x,y,w,h,angle=0){const m=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,.012)),black);m.position.set(x,y,.136);m.rotation.z=angle;g.add(m);}
 function ring(x,y,r,tube){const m=new THREE.Mesh(keep(new THREE.TorusGeometry(r,tube,12,64)),black);m.position.set(x,y,.136);g.add(m);}
 if(name==='blue')for(const side of [-1,1]){bar(side*.38,.075,.36,.075,side*.42);bar(side*.38,-.075,.36,.075,-side*.42);}
 if(name==='orange')for(const side of [-1,1])bar(side*.5,-.63,.37,.065);
 if(name==='green')for(const side of [-1,1]){bar(side*.46,-.05,.38,.085);bar(side*.46,-.05,.085,.38);}
 if(name==='purple'){ring(-.64,-.32,.23,.055);ring(.28,-.32,.35,.06);}
 if(name==='grey')for(const side of [-1,1])for(const angle of [0,Math.PI/3,-Math.PI/3])bar(side*.45,.1,.33,.07,angle);
 g.userData.name=name;g.userData.dispose=()=>resources.forEach(r=>r.dispose());return g;
}
function environment(THREE,scene){scene.add(new THREE.AmbientLight(0xffffff,.9));const light=new THREE.DirectionalLight(0xffffff,1.2);light.position.set(-600,800,1200);scene.add(light);}
function createLayer({canvas,specs,width=1600,height=900,onStatus=()=>{},animate=true}){
 const THREE=window.DeckWeftThree;if(!THREE)throw Error('Load the local Three.js renderer first.');
 let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});}catch{onStatus('fallback');return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(width,height,false);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,1,4000);camera.position.z=1500;environment(THREE,scene);
 const dots=specs.map((s,i)=>{const g=character(THREE,s.name),radius=Math.min(s.w,s.h)/2;g.scale.setScalar(radius);g.position.set(s.x+s.w/2-width/2,height/2-s.y-s.h/2,0);g.userData.base=g.position.clone();g.userData.radius=radius;g.userData.kick=-10000;g.userData.index=i;scene.add(g);return g;});
 let reduced=!animate||matchMedia('(prefers-reduced-motion:reduce)').matches,frames=0,born=performance.now(),disposed=false;const pointer={x:0,y:0};
 function draw(now){if(disposed||document.hidden)return;const time=(now-born)/1000;
  for(const [i,g]of dots.entries()){const u=Math.max(0,time-i*.1),entry=reduced?0:110*Math.exp(-u*5)*Math.cos(u*9),k=(now-g.userData.kick)/900,jump=reduced||k<0||k>1?0:Math.sin(k*Math.PI)*g.userData.radius*.55;g.position.y=g.userData.base.y-entry+jump;g.rotation.x=reduced?0:pointer.y*.13;g.rotation.y=reduced?0:pointer.x*.18;g.rotation.z=reduced?0:Math.sin(k*Math.PI)*(k>=0&&k<=1?.10:0);}
  renderer.render(scene,camera);canvas.dataset.frames=String(++frames);canvas.dataset.renderer='threejs-mesh';canvas.dataset.meshes=String(dots.reduce((n,g)=>n+g.children.length,0));canvas.dataset.textures='0';canvas.dataset.reduced=String(reduced);
 }
 function loop(t){draw(t);}if(!reduced)renderer.setAnimationLoop(loop);draw(performance.now());onStatus('ready');
 const host=canvas.parentElement;
 function move(e){const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width-.5)*2;pointer.y=((e.clientY-r.top)/r.height-.5)*2;}
 function click(e){if(reduced)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*width,y=(e.clientY-r.top)/r.height*height;const index=specs.findIndex(s=>Math.hypot(x-s.x-s.w/2,y-s.y-s.h/2)<=Math.min(s.w,s.h)/2);if(index>=0)dots[index].userData.kick=performance.now();}
 host.addEventListener('pointermove',move);host.addEventListener('click',click);const lost=e=>{e.preventDefault();onStatus('fallback');};canvas.addEventListener('webglcontextlost',lost);
 return {wave(){if(reduced)return;dots.forEach((g,i)=>g.userData.kick=performance.now()+i*110);},setReduced(value){reduced=!!value;if(reduced){renderer.setAnimationLoop(null);draw(performance.now());}else{born=performance.now();renderer.setAnimationLoop(loop);}},replay(){born=performance.now();draw(born);},dispose(){disposed=true;renderer.setAnimationLoop(null);host.removeEventListener('pointermove',move);host.removeEventListener('click',click);canvas.removeEventListener('webglcontextlost',lost);dots.forEach(g=>g.userData.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
function mount(root,{reduced=false}={}){
 const svg=root.querySelector('svg'),images=[...root.querySelectorAll('svg image[data-role=dot]')];if(!svg||!images.length)return null;
 const [, ,width,height]=svg.getAttribute('viewBox').split(' ').map(Number),canvas=document.createElement('canvas');canvas.className='three-dots-layer';canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});root.style.position='relative';root.append(canvas);
 const specs=images.map(n=>({name:n.dataset.asset.replace('dot-',''),x:Number(n.getAttribute('x')),y:Number(n.getAttribute('y')),w:Number(n.getAttribute('width')),h:Number(n.getAttribute('height'))}));
 const api=createLayer({canvas,specs,width,height,animate:!reduced,onStatus:s=>images.forEach(n=>n.style.opacity=s==='ready'?'0':'')});if(!api)canvas.remove();else{const dispose=api.dispose;api.dispose=()=>{images.forEach(n=>n.style.opacity='');dispose();};}return api;
}
async function download(name){const canvas=document.createElement('canvas'),host=document.createElement('div');host.append(canvas);const api=createLayer({canvas,width:512,height:512,specs:[{name,x:12,y:12,w:488,h:488}],animate:false});if(!api)throw Error('WebGL is unavailable.');const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));api.dispose();if(!blob)throw Error('The renderer could not create a PNG.');const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='dot-'+name+'.mesh.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
window.DeckWeftDots={createLayer,mount,download};
})();
