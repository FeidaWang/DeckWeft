// S9b blueprint A in the real player: the restore rule, keyboard isolation and reduced motion at 1440, 1024 and 390 px, in English
// and Chinese, plus the no-JavaScript static page. Isolated browser only (outside /Applications, temporary profile); every
// non-file request is refused and recorded.
// Usage: CHROMIUM_PATH=/isolated/chrome PLAYWRIGHT_MODULE=/abs/playwright/index.mjs node tests/browser_blueprint_a.mjs [--out dist/s9b-blueprint-a]
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile,realpath,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {exportDeck} from '../src/render/export.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {blueprintProject} from './blueprint-a.mjs';
const {values:a}=parseArgs({options:{out:{type:'string'},widths:{type:'string'}}}),out=path.resolve(a.out||'dist/s9b-blueprint-a'),shots=path.join(out,'player');
await rm(shots,{recursive:true,force:true});await mkdir(shots,{recursive:true});
const binary=await realpath(process.env.CHROMIUM_PATH||'');assert.ok(!/\/Applications\//i.test(binary),'Use an isolated browser outside /Applications.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),browser=await chromium.launch({executablePath:binary,headless:true});
const widths=(a.widths||'1440,1024,390').split(',').map(Number),RUNS=[{locale:'en',theme:'silver-gray-editorial'},{locale:'zh-CN',theme:'dark-data'}];
const trace=[],errors=[],external=[],started=Date.now();
const record=(run,width,step,detail={})=>{trace.push({locale:run.locale,theme:run.theme,width,step,ms:Date.now()-started,...detail});console.log(run.locale,width,step,JSON.stringify(detail).slice(0,200));};
async function deck(run,{reducedMotion}={}){
 const p=await blueprintProject(run.locale,{theme:run.theme});if(reducedMotion)p.plan.scenes.find(s=>s.id==='pipeline').motion.reducedMotion=reducedMotion;
 const file=path.join(out,`deck-${run.theme}-${run.locale}${reducedMotion?'-'+reducedMotion:''}.html`);await writeFile(file,exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan}).body);return file;
}
async function open(file,width,{reducedMotion='no-preference',js=true,hash='#scene=pipeline'}={}){
 const context=await browser.newContext({viewport:{width,height:width<500?860:1000},reducedMotion,javaScriptEnabled:js}),page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push({width,message:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({width,console:m.text()});});
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.startsWith('data:'))return r.continue();external.push(u);return r.abort();});
 await page.goto(pathToFileURL(file).href+hash);if(js)await page.waitForFunction(()=>document.body.dataset.ready==='true');else await page.waitForLoadState('load');
 await page.evaluate(()=>document.fonts.ready);return {context,page};
}
// What the reader sees: page number, the stage and part the player holds, whether it was explored, and what is drawn.
const look=page=>page.evaluate(()=>{const s=window.deckweftInteractions.snapshot().find(v=>v.sceneId==='pipeline'),scene=document.getElementById('pipeline'),v=s.state[0];
 return {page:document.querySelector('#page').textContent,position:s.position,exploring:s.exploring,stage:v.stage,stepId:v.stepId,drawnStage:scene.dataset.blueprintStage,figureShown:getComputedStyle(scene.querySelector('.region.blueprint .semantic-diagram')).display!=='none',
  marked:[...scene.querySelectorAll('.region.blueprint g.semantic-step-target')].map(g=>g.dataset.part),
  panel:scene.querySelector('.blueprint-panel strong').textContent,animations:document.getAnimations().filter(a=>a.playState==='running').length,controls:scene.querySelectorAll(':is(button,select,input,[role=button],.semantic-timeline)').length};});
// Presentation view shows only the current page, so a full-page capture is that page with its header (never overlapping it).
async function shot(page,name){await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(450);const file=path.join(shots,name+'.png');await page.screenshot({path:file,fullPage:true});return path.relative(out,file);}
const expectState=(s,stage,stepId,msg)=>{assert.equal(s.controls,0,msg+': no controls on the slide');assert.equal(s.stage,stage,msg);assert.equal(s.stepId,stepId,msg);assert.equal(s.drawnStage,stage,msg);assert.equal(s.figureShown,stage!=='explain',msg);assert.deepEqual(s.marked,stepId?[stepId]:[],msg);};
const results={};
try{
 for(const run of RUNS){
  const file=await deck(run),staticFile=await deck(run,{reducedMotion:'static'});
  for(const width of widths){
   const tag=`${run.locale}-${width}`,images={};
   // 1. Opening: a blueprint page opens on Explain even though its static state is Diagram.
   let {context,page}=await open(file,width);let s=await look(page);
   assert.equal(s.page,'02 / 03');expectState(s,'explain',null,'opening');images.explain=await shot(page,`${tag}-1-explain`);record(run,width,'opens on Explain',s);
   const fit=await page.evaluate(()=>({ok:window.deckweftFit.ok,states:window.deckweftFit.states.map(x=>({keyStateId:x.keyStateId,overflow:x.overflow.length,clip:x.clipIssues.length,contrast:x.contrastIssues.length,glyphs:x.glyphs.length}))}));
   assert.equal(fit.ok,true,'fit audit');record(run,width,'fit audit: opening and every key state',fit);
   const build=()=>page.locator('#pipeline h2').click();
   await build();s=await look(page);expectState(s,'diagram',null,'click → Diagram');images.diagram=await shot(page,`${tag}-2-diagram`);record(run,width,'a click on the slide → Diagram',s);
   // 2. Restore rule A: select a part on the diagram, turn the page, come back.
   await page.evaluate(()=>{const cfg=JSON.parse(document.getElementById('dw-runtime-data').textContent).scenes.find(s=>s.id==='pipeline');window.deckweftInteractions.dispatch('pipeline',{event:'step.select',interactionId:cfg.interactions[0].id,stepId:'step-repair'});});s=await look(page);expectState(s,'explore','step-repair','select part');assert.equal(s.exploring,true);images.explore=await shot(page,`${tag}-3-explore-repair`);record(run,width,'select Repair on the diagram',s);
   await page.locator('#next').click();assert.equal((await look(page)).page,'03 / 03');await page.locator('#previous').click();s=await look(page);
   assert.equal(s.page,'02 / 03');expectState(s,'explore','step-repair','restored after Next/Previous page');assert.equal(s.exploring,true);images.restored=await shot(page,`${tag}-4-restored`);record(run,width,'Next page, Previous page: the same stage and part',s);
   await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('ArrowRight');s=await look(page);
   assert.equal(s.page,'02 / 03','a page key plays the next stage while one is left');assert.equal(s.stage,'explore');record(run,width,'ArrowRight while a stage is left: plays it, the page stays',s);
   await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');s=await look(page);expectState(s,'explain',null,'reload');assert.equal(s.exploring,false);record(run,width,'reload resets to Explain',s);
   // 3. Click-to-build (player .9): each click plays the next stage or part; the click after the last part turns the page.
   const keys=[];
   for(const [stage,stepId] of [['diagram',null],['explore','step-measure'],['explore','step-repair'],['explore','step-review'],['explore','step-export']]){await build();const after=await look(page);assert.equal(after.page,'02 / 03','a click plays the next stage, not the next page');expectState(after,stage,stepId,'click '+stage+' '+stepId);keys.push({input:'click',page:after.page,stage:after.stage,stepId:after.stepId,position:after.position});}
   await build();const control=await look(page);assert.equal(control.page,'03 / 03','the click after the last part turns the page');keys.push({input:'click after the last part',page:control.page});
   await page.keyboard.press('ArrowLeft');s=await look(page);assert.equal(s.page,'02 / 03');expectState(s,'explore','step-export','Left returns to the built page');keys.push({input:'ArrowLeft',page:s.page,stage:s.stage,stepId:s.stepId});
   record(run,width,'click-to-build',{keys:keys.length,control:control.page});await context.close();
   // 4. Reduced motion: every stage is reached by Next and Previous, nothing animates.
   ({context,page}=await open(file,width,{reducedMotion:'reduce'}));const reduced=[];
   for(const [k,[stage,stepId]]of [['diagram',null],['explore','step-measure'],['explore','step-repair'],['explore','step-review'],['explore','step-export']].entries()){await page.locator('#pipeline h2').click();s=await look(page);expectState(s,stage,stepId,'reduced click '+k);assert.equal(s.animations,0,'no running animation');reduced.push([s.position,s.stage,s.stepId,s.animations]);}
   for(let k=0;k<5;k++)await page.keyboard.press('ArrowLeft');s=await look(page);expectState(s,'explain',null,'reduced previous');assert.equal(s.animations,0);reduced.push([s.position,s.stage,s.stepId,s.animations]);
   await page.evaluate(()=>{const v=window.deckweftInteractions.snapshot().find(x=>x.sceneId==='pipeline');window.deckweftInteractions.seek('pipeline',v.staticPosition);});s=await look(page);expectState(s,'diagram',null,'reduced: the complete explanation');images.reduced=await shot(page,`${tag}-5-reduced-skip`);record(run,width,'reduced motion: every stage by click and Left, the complete explanation, no animation',{reduced});await context.close();
   // The static reduced-motion fallback opens on the static state; Next and Previous still reach Explain and Explore.
   ({context,page}=await open(staticFile,width,{reducedMotion:'reduce'}));s=await look(page);expectState(s,'diagram',null,'static fallback opens on the static state');
   await page.keyboard.press('ArrowLeft');expectState(await look(page),'explain',null,'static fallback Left');for(let k=0;k<2;k++)await page.locator('#pipeline h2').click();expectState(await look(page),'explore','step-measure','static fallback next');
   record(run,width,'reducedMotion static: opens on Diagram, Explain and Explore reachable by Left and clicks',{});await context.close();
   // 5. Readers without JavaScript: the complete explanation.
   ({context,page}=await open(file,width,{js:false,hash:''}));const nojs=await page.evaluate(()=>{const scene=document.getElementById('pipeline');return {parts:[...scene.querySelectorAll('.blueprint-parts li')].map(li=>li.textContent.length),numbers:scene.querySelectorAll('.blueprint-number').length,statement:scene.querySelector('.static-state-note')?.textContent||null};});
   assert.equal(nojs.parts.length,4);assert.equal(nojs.numbers,4);assert.ok(nojs.statement);images.nojs=await shot(page,`${tag}-6-no-javascript`);record(run,width,'no JavaScript: whole object, numbered parts, every explanation',nojs);await context.close();
   results[tag]={images,keys,fit};
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();}
await writeFile(path.join(out,'player-trace.json'),JSON.stringify({format:'deckweft-s9b-player-trace',version:1,renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,browser:'Chromium (isolated, Playwright cache)',widths,runs:RUNS,restoreRule:'A: per-page memory while the document is open; a reload opens on Explain',steps:trace,results,errors,external},null,1)+'\n');
console.log(JSON.stringify({steps:trace.length,errors:errors.length,external:external.length}));
