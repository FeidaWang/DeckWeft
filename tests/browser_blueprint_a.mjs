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
  pressed:[...scene.querySelectorAll('.region.blueprint [data-step-id][aria-pressed=true]')].map(b=>b.dataset.stepId),marked:[...scene.querySelectorAll('.region.blueprint g.semantic-step-target')].map(g=>g.dataset.part),
  panel:scene.querySelector('.blueprint-panel strong').textContent,animations:document.getAnimations().filter(a=>a.playState==='running').length,count:scene.querySelector('[data-cue-count]').textContent};});
// Presentation view shows only the current page, so a full-page capture is that page with its header (never overlapping it).
async function shot(page,name){await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(450);const file=path.join(shots,name+'.png');await page.screenshot({path:file,fullPage:true});return path.relative(out,file);}
const expectState=(s,stage,stepId,msg)=>{assert.equal(s.stage,stage,msg);assert.equal(s.stepId,stepId,msg);assert.equal(s.drawnStage,stage,msg);assert.equal(s.figureShown,stage!=='explain',msg);assert.deepEqual(s.marked,stepId?[stepId]:[],msg);};
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
   await page.locator('#pipeline [data-cue-next]').click();s=await look(page);expectState(s,'diagram',null,'Next stage');images.diagram=await shot(page,`${tag}-2-diagram`);record(run,width,'Next stage → Diagram',s);
   // 2. Restore rule A: select a part on the diagram, turn the page, come back.
   await page.locator('#pipeline g[data-part="step-repair"]').click();s=await look(page);expectState(s,'explore','step-repair','select part');assert.equal(s.exploring,true);images.explore=await shot(page,`${tag}-3-explore-repair`);record(run,width,'select Repair on the diagram',s);
   await page.locator('#next').click();assert.equal((await look(page)).page,'03 / 03');await page.locator('#previous').click();s=await look(page);
   assert.equal(s.page,'02 / 03');expectState(s,'explore','step-repair','restored after Next/Previous page');assert.equal(s.exploring,true);assert.deepEqual(s.pressed,['step-repair']);images.restored=await shot(page,`${tag}-4-restored`);record(run,width,'Next page, Previous page: the same stage and part',s);
   await page.locator('#pipeline .folio').click();await page.keyboard.press('ArrowRight');assert.equal((await look(page)).page,'03 / 03');await page.keyboard.press('ArrowLeft');s=await look(page);
   expectState(s,'explore','step-repair','restored after arrow-key pages');record(run,width,'ArrowRight, ArrowLeft with nothing focused: pages turn, the part is restored',s);
   await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');s=await look(page);expectState(s,'explain',null,'reload');assert.equal(s.exploring,false);record(run,width,'reload resets to Explain',s);
   // 3. Keyboard isolation: part selection and Explore controls never turn the page.
   await page.locator('#pipeline [data-cue-next]').click();const keys=[];
   const press=async(selector,key,stage,stepId)=>{const target=page.locator(selector).first();await target.focus();await page.keyboard.press(key);const after=await look(page);assert.equal(after.page,'02 / 03',`${selector} ${key} must not turn the page`);if(stage)expectState(after,stage,stepId,`${selector} ${key}`);keys.push({target:selector,key,page:after.page,stage:after.stage,stepId:after.stepId,position:after.position});};
   await press('#pipeline g[data-part="step-measure"]','Enter','explore','step-measure');
   await press('#pipeline g[data-part="step-measure"]','ArrowRight','explore','step-repair');
   await press('#pipeline g[data-part="step-repair"]','End','explore','step-export');
   await press('#pipeline g[data-part="step-export"]','Home','explore','step-measure');
   await press('#pipeline g[data-part="step-measure"]','ArrowDown','explore','step-repair');
   await press('#pipeline g[data-part="step-repair"]',' ','explore','step-repair');
   await press('#pipeline [data-step-id="step-review"]','ArrowLeft','explore','step-repair');
   await press('#pipeline [data-step-id="step-repair"]','ArrowRight','explore','step-review');
   await press('#pipeline [data-show-whole]','Enter','diagram',null);
   await press('#pipeline [data-cue-next]','Enter','explore','step-measure');
   await press('#pipeline [data-cue-previous]',' ','diagram',null);
   await press('#pipeline [data-cue-position]','ArrowRight','explore','step-measure');
   await press('#pipeline [data-cue-position]','End','explore','step-export');
   await press('#pipeline [data-cue-position]','Home','explain',null);
   await press('#pipeline [data-cue-skip]','Enter','diagram',null);
   await press('#pipeline [data-cue-replay]','Space');
   await page.locator('#pipeline .folio').click();await page.keyboard.press('ArrowRight');const control=await look(page);assert.equal(control.page,'03 / 03','control: ArrowRight with nothing focused turns the page');
   keys.push({target:'nothing focused (control)',key:'ArrowRight',page:control.page});record(run,width,'keyboard isolation',{keys:keys.length,control:control.page});await context.close();
   // 4. Reduced motion: every stage is reached by Next and Previous, nothing animates.
   ({context,page}=await open(file,width,{reducedMotion:'reduce'}));const reduced=[];
   for(const [k,[stage,stepId]]of [['diagram',null],['explore','step-measure'],['explore','step-repair'],['explore','step-review'],['explore','step-export']].entries()){await page.locator('#pipeline [data-cue-next]').click();s=await look(page);expectState(s,stage,stepId,'reduced next '+k);assert.equal(s.animations,0,'no running animation');reduced.push([s.position,s.stage,s.stepId,s.animations]);}
   for(let k=0;k<5;k++)await page.locator('#pipeline [data-cue-previous]').click();s=await look(page);expectState(s,'explain',null,'reduced previous');assert.equal(s.animations,0);reduced.push([s.position,s.stage,s.stepId,s.animations]);
   await page.locator('#pipeline [data-cue-skip]').click();s=await look(page);expectState(s,'diagram',null,'reduced skip');images.reduced=await shot(page,`${tag}-5-reduced-skip`);record(run,width,'reduced motion: every stage by Next / Previous, Skip, no animation',{reduced});await context.close();
   // The static reduced-motion fallback opens on the static state; Next and Previous still reach Explain and Explore.
   ({context,page}=await open(staticFile,width,{reducedMotion:'reduce'}));s=await look(page);expectState(s,'diagram',null,'static fallback opens on the static state');
   const notice=await page.locator('#pipeline [data-static-fallback]').isVisible(),replay=await page.locator('#pipeline [data-cue-replay]').isDisabled();assert.ok(notice&&replay);
   await page.locator('#pipeline [data-cue-previous]').click();expectState(await look(page),'explain',null,'static fallback previous');for(let k=0;k<2;k++)await page.locator('#pipeline [data-cue-next]').click();expectState(await look(page),'explore','step-measure','static fallback next');
   record(run,width,'reducedMotion static: opens on Diagram, Replay disabled, Explain and Explore reachable',{notice,replayDisabled:replay});await context.close();
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
