// S9b evidence: the blueprint A sample in all six themes and both languages. For every deck it renders the HTML export, checks
// that the facts are identical, runs the in-page fit, contrast and glyph audits at 1440, 1024 and 390 px (the opening and every
// key state), captures Explain, Diagram, Explore and the no-JavaScript page at 1440 px, and draws one contact sheet per language.
// Isolated browser only. Usage: CHROMIUM_PATH=… PLAYWRIGHT_MODULE=… node scripts/s9b-blueprint.mjs [--out dist/s9b-blueprint-a]
import path from 'node:path';
import {mkdir,writeFile,realpath,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {exportDeck} from '../src/render/export.mjs';
import {factsHash} from '../src/workbench/directions.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {BLUEPRINT_THEMES,blueprintProject} from '../tests/blueprint-a.mjs';
const {values:a}=parseArgs({options:{out:{type:'string'}}}),out=path.resolve(a.out||'dist/s9b-blueprint-a'),dir=path.join(out,'themes');
await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
const binary=await realpath(process.env.CHROMIUM_PATH||'');if(/\/Applications\//i.test(binary))throw Error('Use an isolated browser outside /Applications.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),browser=await chromium.launch({executablePath:binary,headless:true});
const decks=[],external=[],errors=[];
async function page(file,width,js=true){
 const context=await browser.newContext({viewport:{width,height:width<500?860:1000},javaScriptEnabled:js}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.startsWith('data:'))return r.continue();external.push(u);return r.abort();});
 await p.goto(pathToFileURL(file).href+(js?'#scene=pipeline':''));if(js)await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.evaluate(()=>document.fonts.ready);return {context,p};
}
const capture=async(p,file)=>{await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(450);await p.locator('#pipeline').screenshot({path:file,animations:'disabled'});return path.relative(out,file);};
for(const locale of ['en','zh-CN'])for(const theme of BLUEPRINT_THEMES){
 const project=await blueprintProject(locale,{theme}),name=`${theme}-${locale}`,file=path.join(dir,name+'.html'),html=exportDeck(project.document,'html',{experimentalWeb:true,plan:project.plan});await writeFile(file,html.body);
 const fit={};
 for(const width of [1440,1024,390]){const {context,p}=await page(file,width);fit[width]=await p.evaluate(()=>{const f=window.deckweftFit,sum=s=>({overflow:s.overflow.length,clip:s.clipIssues.length,contrast:s.contrastIssues.length,glyphs:s.glyphs.length,height:Math.round(s.height),fontsLoaded:s.fonts.every(x=>x.loaded)});return {ok:f.ok,pages:f.checks.map(c=>({sceneId:c.sceneId,...sum(c)})),states:f.states.map(s=>({keyStateId:s.keyStateId,position:s.position,...sum(s)}))};});
  if(width===1440){fit.shots={explain:await capture(p,path.join(dir,name+'-1-explain.png'))};await p.locator('#pipeline h2').click();fit.shots.diagram=await capture(p,path.join(dir,name+'-2-diagram.png'));await p.evaluate(()=>{const cfg=JSON.parse(document.getElementById('dw-runtime-data').textContent).scenes.find(s=>s.id==='pipeline');window.deckweftInteractions.dispatch('pipeline',{event:'step.select',interactionId:cfg.interactions[0].id,stepId:'step-repair'});});fit.shots.explore=await capture(p,path.join(dir,name+'-3-explore.png'));}
  await context.close();}
 const {context,p}=await page(file,1440,false);fit.shots.static=await capture(p,path.join(dir,name+'-4-static.png'));await context.close();
 const issues=Object.values(fit).filter(v=>v&&'ok' in v).flatMap(v=>[...v.pages,...v.states]).reduce((n,s)=>n+s.overflow+s.clip+s.contrast+s.glyphs,0);
 decks.push({deck:name,theme,locale,composition:project.plan.scenes[1].composition,factsHash:factsHash(project.document),renderHash:html.renderHash,ok:[1440,1024,390].every(w=>fit[w].ok),issues,fit:{1440:fit[1440],1024:fit[1024],390:fit[390]},shots:fit.shots});
 console.log(name,'ok',[1440,1024,390].map(w=>fit[w].ok).join('/'),'issues',issues);
}
// One contact sheet per language: a row per theme, Explain | Diagram | Explore (Repair) | Static page without JavaScript.
for(const locale of ['en','zh-CN']){
 const rows=decks.filter(d=>d.locale===locale),sheet=path.join(out,`contact-${locale}.html`);
 await writeFile(sheet,`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#666;font:14px Arial,sans-serif;color:#fff}h1{font-size:16px;margin:10px 12px}.g{display:grid;grid-template-columns:150px repeat(4,1fr);gap:6px;padding:4px 8px;align-items:start}.g img{width:100%;display:block;background:#444}b{padding-top:6px}</style><h1>S9b blueprint A · ${locale} · 1440 px · ${WEB_RENDERER_VERSION} / ${PLAYER_VERSION}</h1><div class="g"><span></span><span>Explain</span><span>Diagram</span><span>Explore · Repair</span><span>Static page (no JavaScript)</span>${rows.map(r=>`<b>${r.theme}</b>${['explain','diagram','explore','static'].map(k=>`<img src="${path.relative(out,path.join(out,r.shots[k]))}">`).join('')}`).join('')}</div>`);
 const context=await browser.newContext({viewport:{width:2000,height:1000}}),p=await context.newPage();await p.goto(pathToFileURL(sheet).href);await p.waitForLoadState('load');await p.screenshot({path:path.join(out,`contact-${locale}.jpg`),fullPage:true,type:'jpeg',quality:80});await context.close();
}
await browser.close();
const facts=new Set(decks.map(d=>d.locale+':'+d.factsHash));
await writeFile(path.join(out,'themes.json'),JSON.stringify({format:'deckweft-s9b-themes',version:1,renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,browser:'Chromium (isolated, Playwright cache)',factsIdenticalPerLanguage:facts.size===2,decks,errors,external},null,1)+'\n');
console.log(JSON.stringify({decks:decks.length,allOk:decks.every(d=>d.ok),issues:decks.reduce((n,d)=>n+d.issues,0),factsIdenticalPerLanguage:facts.size===2,errors:errors.length,external:external.length}));
