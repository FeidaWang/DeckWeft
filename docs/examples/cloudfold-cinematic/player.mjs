// A self-contained, offline slide player generated from the same scene as PPTX.
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderPlayer(deck,images){
  const slides=deck.slides.map((s,i)=>{
    const frame=s.artFrame||{x:0,y:0,w:deck.width,h:deck.height};
    const artStyle=`left:${frame.x}px;top:${frame.y}px;width:${frame.w}px;height:${frame.h}px`;
    const art=s.artFrame?`<div class="process-art" style="${artStyle}" role="img" aria-label="${esc(s.alt)}">${[0,1,2].map(n=>`<div class="art-slice" style="left:${n*frame.w/3}px;width:${frame.w/3}px;--delay:${300+n*160}ms"><img alt="" draggable="false" src="${images[s.art]}" style="left:${-n*frame.w/3}px;width:${frame.w}px;height:${frame.h}px"></div>`).join('')}</div>`:`<img class="hero-art" alt="${esc(s.alt)}" draggable="false" src="${images[s.art]}" style="${artStyle}">`;
    return `<section class="slide${i===0?' active':''}" data-index="${i}" aria-label="${i+1}. ${esc(s.title)}" aria-hidden="${i!==0}" style="background:${s.background}">${art}${s.texts.map(t=>`<div class="copy" data-id="${esc(t.id)}" style="left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px;font-size:${t.size}px;color:${t.color};font-family:${t.font},${t.font==='Georgia'?'serif':'sans-serif'};font-weight:${t.bold?700:400};--delay:${t.delay}ms">${esc(t.value)}</div>`).join('')}</section>`;
  }).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'">
<title>Cloudfold Club — illustrated motion edition</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#101A20;color:#FFF4E5;font:15px Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}button{font:inherit}#frame{position:relative;overflow:hidden;isolation:isolate;box-shadow:0 20px 80px #0005;background:#142C34}#stage{position:absolute;width:1600px;height:900px;transform-origin:top left}.slide{position:absolute;inset:0;overflow:hidden;opacity:0;visibility:hidden;transition:opacity 480ms ease,visibility 480ms;pointer-events:none}.slide.active{opacity:1;visibility:visible;pointer-events:auto;z-index:1}.hero-art,.process-art,.copy{position:absolute}.hero-art{object-fit:cover;transform-origin:75% 45%}.copy{white-space:pre;line-height:1.15;display:flex;align-items:flex-start;overflow:visible}.active .copy{animation:copyEnter 1100ms cubic-bezier(.22,1,.36,1) var(--delay) both}.active .hero-art{animation:artEnter 1800ms cubic-bezier(.2,.8,.2,1) both}.art-slice{position:absolute;top:0;height:100%;overflow:hidden}.art-slice img{position:absolute;top:0;max-width:none}.active .art-slice{animation:foldEnter 1400ms cubic-bezier(.22,1,.36,1) var(--delay) both}
@keyframes copyEnter{from{opacity:0;transform:translate3d(0,42px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes artEnter{from{opacity:.1;transform:translate3d(40px,14px,0) scale(1.065)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
@keyframes foldEnter{from{opacity:0;transform:translate3d(0,60px,0) scale(.94)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
nav{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;width:96vw;max-width:1000px}button{border:1px solid #fff4e54a;background:#ffffff08;color:inherit;border-radius:5px;padding:10px 16px;cursor:pointer;min-height:42px}button:hover{background:#ffffff1c}button:focus-visible{outline:3px solid #EF9879;outline-offset:4px}button:disabled{opacity:.35;cursor:default}#status{min-width:65px;text-align:center;font-variant-numeric:tabular-nums}#hint{margin:0;color:#AAB9B7;font-size:12px;line-height:1.4;text-align:center}.capture{gap:0;background:#142C34}.capture nav,.capture #hint{display:none}.still .copy,.still .hero-art,.still .art-slice,.reduced .copy,.reduced .hero-art,.reduced .art-slice{animation:none!important;opacity:1!important;transform:none!important}.reduced .slide,.still .slide{transition:none}
@media(prefers-reduced-motion:reduce){.copy,.hero-art,.art-slice{animation:none!important;opacity:1!important;transform:none!important}.slide{transition:none}}
@media(max-width:600px){body{gap:12px}nav{gap:6px}button{padding:8px 10px;font-size:13px}#hint{max-width:92vw}}
@media print{html,body{height:auto;overflow:visible;display:block;background:white}#frame{width:1600px!important;height:auto!important;overflow:visible;box-shadow:none}#stage{position:static;transform:none!important}.slide{position:relative;width:1600px;height:900px;opacity:1;visibility:visible;break-after:page}.copy,.hero-art,.art-slice{animation:none!important;opacity:1!important;transform:none!important}nav,#hint{display:none}}
</style></head><body>
<main id="frame" aria-label="Cloudfold Club presentation"><div id="stage">${slides}</div></main>
<nav aria-label="Slide controls"><button id="prev" aria-label="Previous slide">Previous</button><span id="status" aria-live="polite">1 / 3</span><button id="next" aria-label="Next slide">Next</button><button id="play" aria-pressed="false">Play sequence</button><button id="replay">Replay slide</button><button id="motion" aria-pressed="false">Reduce motion</button></nav>
<p id="hint">Arrow keys to navigate · Space to play or pause · R to replay<br>Fictional club. AI-generated paper illustrations. Motion plays in this HTML edition.</p>
<script>
(()=>{'use strict';
 const params=new URLSearchParams(location.search),slides=[...document.querySelectorAll('.slide')],frame=document.getElementById('frame'),stage=document.getElementById('stage');
 let index=0,playing=false,timer=null,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(params.has('capture'))document.body.classList.add('capture');if(params.has('still'))document.body.classList.add('still');
 const byId=id=>document.getElementById(id);
 function fit(){const capture=params.has('capture');const margin=capture?0:24;const reserved=capture?0:(innerWidth<600?180:132);const width=Math.min(innerWidth-margin*2,(innerHeight-reserved)*16/9);frame.style.width=width+'px';frame.style.height=width*9/16+'px';stage.style.transform='scale('+width/1600+')';}
 function sync(){byId('status').textContent=(index+1)+' / '+slides.length;byId('prev').disabled=index===0;byId('next').disabled=index===slides.length-1;byId('play').textContent=playing?'Pause sequence':'Play sequence';byId('play').setAttribute('aria-pressed',String(playing));byId('motion').setAttribute('aria-pressed',String(reduced));document.body.classList.toggle('reduced',reduced);}
 function schedule(){clearTimeout(timer);if(playing)timer=setTimeout(()=>go((index+1)%slides.length),6500);}
 function go(n){if(!Number.isInteger(n)||n<0||n>=slides.length)return;slides.forEach(s=>{s.classList.remove('active');s.setAttribute('aria-hidden','true');});index=n;void stage.offsetWidth;slides[index].classList.add('active');slides[index].setAttribute('aria-hidden','false');sync();schedule();}
 function play(value){playing=value;sync();schedule();}
 byId('prev').onclick=()=>go(index-1);byId('next').onclick=()=>go(index+1);byId('play').onclick=()=>play(!playing);byId('replay').onclick=()=>go(index);byId('motion').onclick=()=>{reduced=!reduced;sync();};
 document.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&[' ','Enter'].includes(e.key))return;if(['ArrowRight','ArrowLeft','Home','End',' ','r','R'].includes(e.key))e.preventDefault();if(e.key==='ArrowRight')go(index+1);if(e.key==='ArrowLeft')go(index-1);if(e.key==='Home')go(0);if(e.key==='End')go(slides.length-1);if(e.key===' ')play(!playing);if(e.key.toLowerCase()==='r')go(index);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)play(false);});
 const preference=matchMedia('(prefers-reduced-motion: reduce)');preference.addEventListener('change',e=>{reduced=e.matches;sync();});
 addEventListener('resize',fit);window.cloudfold={go,play,state:()=>({index,playing,reduced,slides:slides.length})};fit();sync();
 if(params.has('autoplay')&&!reduced)play(true);
})();
</script></body></html>`;
}
