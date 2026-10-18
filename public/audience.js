// This origin has no editor session endpoint. Only a scoped read-only capability.
const $=id=>document.getElementById(id),params=new URLSearchParams(location.hash.slice(1));
let session=null,sequence=-1,stopped=false,policy='full';
try{if(params.has('id')&&params.has('key')){session={id:params.get('id'),key:params.get('key')};sessionStorage.setItem('deckweft.audience',JSON.stringify(session));history.replaceState(null,'',location.pathname);}else session=JSON.parse(sessionStorage.getItem('deckweft.audience')||'null');}catch{}
const system=matchMedia('(prefers-reduced-motion:reduce)');
function motion(){const effective=policy==='off'?'off':system.matches?'reduced':policy;document.body.dataset.motion=effective;if(effective!=='full')document.getAnimations().forEach(a=>a.cancel());}
system.addEventListener('change',motion);
async function refresh(){
 if(stopped)return;
 try{
  if(!session||!/^[a-f0-9]{32}$/.test(session.id)||!/^[a-f0-9]{64}$/.test(session.key))throw Error('Open the audience link from the presenter.');
  const response=await fetch('/api/view/'+session.id,{headers:{Authorization:'Bearer '+session.key},signal:AbortSignal.timeout(4000)});
  if(response.status===410||response.status===401){stopped=true;$('audienceCanvas').replaceChildren();document.body.dataset.state='ended';try{sessionStorage.removeItem('deckweft.audience');}catch{}throw Error(response.status===410?'Presentation ended. Open a new audience link.':'Audience access expired. Open the link again.');}
  if(!response.ok)throw Error('Connection lost. Showing the last public slide; retrying…');
  const view=await response.json();policy=view.motion;motion();document.documentElement.lang=view.locale;
  if(sequence!==view.sequence){
   // SVG is compiled on the server from validated measured scenes, never client markup.
   const template=document.createElement('template');template.innerHTML=view.slide.svg;
   $('audienceCanvas').replaceChildren(template.content);$('audienceCanvas').dataset.motion=view.slide.motion;
   document.title=view.title+' — Audience';sequence=view.sequence;
  }
  document.body.dataset.state='connected';$('audienceStatus').textContent=`${view.index+1} / ${view.total} · ${view.locale==='zh-CN'?'仅观众画面':'Audience only'}`;$('audienceFull').textContent=view.locale==='zh-CN'?'全屏':'Full screen';
 }catch(e){if(!stopped)document.body.dataset.state='disconnected';$('audienceStatus').textContent=e.message;}
 if(!stopped)setTimeout(refresh,500);
}
$('audienceFull').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{$('audienceStatus').textContent='Use your browser’s full-screen control.';});};
refresh();
