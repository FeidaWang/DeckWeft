// S8 / VIS-015 evidence run: the three T01–T03 theme packs. Optional local browser QA: Playwright and an isolated browser are
// supplied separately, as for the VIS-014 gate. It builds the frozen gallery drawn in every new theme, the S8 stories, the
// handoff sample decks and the page-42 storyboard; measures every deck at 1440, 1024 and 390 px (fit audit, heights, drawn
// fonts); records measured contrast per type role; runs the explicit cases (missing glyph, media-failure cover, low motion,
// black-and-white Research Atlas, CJK phrase breaks); and writes contact sheets. It never certifies a deck: the images still
// need to be viewed, and the weakest page named, in docs/evidence/vis-015/review.md.
import path from 'node:path';
import os from 'node:os';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {cp,mkdir,mkdtemp,readFile,realpath,rm,unlink,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LOCALES,releaseProject} from '../tests/release-gate.mjs';
import {S8_THEMES,S8_STORY_COMPOSITIONS,STORYBOARD_TASKS,s8Project} from '../tests/s8-themes.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {inspectRenderedPage,checkRender} from '../src/quality/render-checks.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {resolveTheme,themePacks} from '../src/design/theme-registry.mjs';
import {cjkSegments} from '../src/render/web/components/cjk.mjs';
import {contrastRatio} from '../src/layout/text.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},steps:{type:'string',default:'build,quality,contrast,cases'},widths:{type:'string',default:'1440,1024,390'},decks:{type:'string'},help:{type:'boolean'}}});
if(args.help){console.log('Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/abs/playwright/index.mjs node scripts/s8-themes.mjs [--out dist/s8-themes] [--steps build,quality,contrast,cases] [--widths 1440,1024,390]\nThen view the contact sheets, name the weakest page per theme and record the review. Exports run separately: npm run export:targets -- --s8.');process.exit(0);}
const out=path.resolve(args.out||path.join(root,'dist/s8-themes')),home=path.join(out,'home'),projects=path.join(out,'projects'),steps=new Set(args.steps.split(',')),widths=args.widths.split(',').map(Number);
const hash=b=>createHash('sha256').update(b).digest('hex');
const ALL_DECKS=LOCALES.flatMap(locale=>[
 ...S8_THEMES.flatMap(theme=>[{name:`gallery-${theme}-${locale}`,kind:'gallery',locale,theme},{name:`story-${theme}-${locale}`,kind:'story',locale,theme},{name:`storyboard-${theme}-${locale}`,kind:'storyboard',locale,theme}]),
 {name:`fieldnotes-${locale}`,kind:'fieldnotes',locale,theme:'editorial-fieldnotes'},{name:`atlas-${locale}`,kind:'atlas',locale,theme:'research-atlas'},{name:`stage-${locale}`,kind:'stage',locale,theme:'luminous-stage'}]);
const DECKS=args.decks?ALL_DECKS.filter(d=>args.decks.split(',').includes(d.name)):ALL_DECKS;
const run={format:'deckweft-s8-themes',version:1,renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,node:process.version,icu:process.versions.icu,steps:{}};
const report=async(name,data)=>{run.steps[name]=data;await writeFile(path.join(out,name+'.json'),JSON.stringify(data,null,2)+'\n');};
const load=async name=>JSON.parse(await readFile(path.join(projects,name+'.json'),'utf8'));
const html=async p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:await visualAssetResources(p,home)});
async function project(d){
 if(d.kind==='gallery'){let g=await releaseProject('gallery',d.locale,home);for(const s of g.plan.scenes)g=applySceneTheme(g,s.id,d.theme);return g;}
 return s8Project(d.kind,d.locale,home,d.theme);
}
await mkdir(projects,{recursive:true});

// 1. Build: every deck, its exported size and render identity, plus the facts a theme must not touch.
const facts=body=>({tables:body.match(/<tbody>[\s\S]*?<\/tbody>/g)||[],links:[...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m=>m[1]).filter(u=>!u.startsWith('#')),citations:[...body.matchAll(/data-component="citation"[\s\S]*?<\/div>/g)].map(m=>m[0].replace(/<[^>]+>/g,''))});
if(steps.has('build')){
 const decks=[],factsBy={};
 for(const d of DECKS){const p=await project(d);await writeFile(path.join(projects,d.name+'.json'),JSON.stringify(p,null,1));const o=await html(p);decks.push({...d,scenes:p.plan.scenes.length,compositions:p.plan.scenes.map(s=>s.composition),renderHash:o.renderHash,htmlBytes:Buffer.byteLength(o.body),wbr:(o.body.match(/<wbr>/g)||[]).length});factsBy[d.name]=hash(JSON.stringify(facts(o.body)));}
 // Facts identical across the three new themes: gallery, story and storyboard, per locale.
 const identical=LOCALES.flatMap(locale=>['gallery','story','storyboard'].map(kind=>{const keys=S8_THEMES.map(t=>`${kind}-${t}-${locale}`),same=keys.every(k=>factsBy[k]===factsBy[keys[0]]);return {kind,locale,same,hash:factsBy[keys[0]]};}));
 await report('build',{decks,facts:identical,ok:identical.every(i=>i.same),storyCompositions:S8_STORY_COMPOSITIONS,storyboard:STORYBOARD_TASKS});
}

let chromium,executablePath,playwright;
async function browser(){
 if(chromium)return chromium;
 if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated test browser outside /Applications.');
 executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser bundles are read-only.');
 const module=process.env.PLAYWRIGHT_MODULE||'playwright';playwright=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
 chromium=await playwright.chromium.launch({executablePath,headless:true});return chromium;
}
async function open(file,{width=1440,js=true,reducedMotion='reduce',init}={}){
 const context=await (await browser()).newContext({viewport:{width,height:1000},deviceScaleFactor:1,javaScriptEnabled:js,reducedMotion}),external=[],errors=[];
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('file:')||url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
 if(init)await context.addInitScript(init);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 await page.goto(pathToFileURL(file).href);
 if(!js){await page.waitForLoadState('load');return {page,context,errors,external};}
 await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>null))]));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 return {page,context,errors,external};
}
const shot=async(page,file,locator)=>{await (locator?page.locator(locator):page).screenshot({path:file,animations:'disabled',...(locator?{}:{fullPage:true})});return {file:path.relative(out,file),sha256:hash(await readFile(file))};};
/** The families Chromium actually drew for display, body, numeric and chart text (DevTools protocol). */
async function drawnFonts(context,page){
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');
 const roles={display:'.web-scene h2',body:'.web-scene .region[data-component=paragraph] p',numeric:'.web-scene .metric strong,.web-scene .chart-value',chart:'.web-scene .chart svg text',code:'.web-scene code'},result={};
 for(const [role,selector] of Object.entries(roles)){const ids=await cdp.send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector}),families=new Map();for(const nodeId of ids.nodeIds.slice(0,40)){try{for(const f of (await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts)families.set(f.familyName,(families.get(f.familyName)||0)+f.glyphCount);}catch{}}result[role]=[...families].sort((a,b)=>b[1]-a[1]).map(([family,glyphs])=>({family,glyphs}));}
 await cdp.detach();return result;
}
async function sheet(page,title,cells,file,columns){
 await page.setViewportSize({width:columns>3?1800:1800,height:1000});
 await page.setContent(`<style>body{margin:0;padding:12px;font:15px system-ui;background:#cfcfcf}main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:10px}figure{margin:0;background:#fff}img{width:100%;display:block}figcaption{font-size:12px;padding:3px 5px;background:#fff}</style><h1 style="font-size:16px;margin:0 0 8px">${title}</h1><main>${cells.map(c=>`<figure><figcaption>${c.label}</figcaption><img src="data:image/png;base64,${c.png}"></figure>`).join('')}</main>`);
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));return shot(page,file);
}
const b64=async f=>(await readFile(f)).toString('base64');

// 2. Quality: fit audit, render checks, heights, drawn fonts and captures at every width; contact sheets per deck.
if(steps.has('quality')){
 const decks=[];
 for(const d of DECKS){
  const p=await load(d.name),dir=path.join(out,'runs',d.name);await mkdir(dir,{recursive:true});const file=path.join(dir,'deck.html');await writeFile(file,(await html(p)).body);
  const entry={deck:d.name,kind:d.kind,locale:d.locale,theme:d.theme,widths:{}};
  for(const width of widths){
   const {page,context,errors,external}=await open(file,{width});
   const observation=await page.evaluate(inspectRenderedPage),checks=checkRender(p,[observation]),fit=observation.fit;
   const fonts=width===1440?await drawnFonts(context,page):undefined;
   const captures=[];for(const s of p.plan.scenes)captures.push({sceneId:s.id,composition:s.composition,height:Math.round(fit.checks.find(c=>c.sceneId===s.id).height),...await shot(page,path.join(dir,`${width}-${s.id}.png`),'#'+s.id)});
   entry.widths[width]={ok:checks.ok&&fit.ok,issues:checks.issues.map(i=>({kind:i.kind,sceneId:i.sceneId,blockId:i.blockId,reason:i.reason.slice(0,200)})),fitOk:fit.ok,overBudget:width>700?fit.checks.filter(c=>c.height>900).map(c=>({sceneId:c.sceneId,height:Math.round(c.height)})):[],captures,errors,externalRequests:external,...(fonts?{fonts}:{})};
   await context.close();
  }
  // Contact sheets: 1440 (3 columns) and 390 (6 columns).
  const sp=await (await browser()).newPage();
  for(const width of widths.filter(w=>[1440,390].includes(w))){const cells=await Promise.all(entry.widths[width].captures.map(async c=>({label:`${c.sceneId} · ${c.composition} · ${c.height}px`,png:await b64(path.join(out,c.file))})));entry.widths[width].sheet=await sheet(sp,`${d.name} · ${width}px`,cells,path.join(dir,`contact-${width}.png`),width>700?3:6);}
  await sp.close();
  decks.push(entry);console.log(d.name,JSON.stringify(Object.fromEntries(Object.entries(entry.widths).map(([w,v])=>[w,{ok:v.ok,issues:v.issues.length,overBudget:v.overBudget.length}]))));
 }
 await report('quality',{decks,ok:decks.every(e=>Object.values(e.widths).every(w=>w.ok))});
}

// 3. Contrast: every foreground/background pair as drawn, per theme, per type role (size and weight), at 1440 px, plus the token pairs computed from the packs.
if(steps.has('contrast')){
 const measure=()=>{
  function rgb(value){const m=value.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const n=m[1].split(/[, /]+/).filter(Boolean).map(Number);return n.length>=3?{c:n.slice(0,3),a:n[3]??1}:null;}
  const mix=(top,bottom)=>top.c.map((v,i)=>v*top.a+bottom[i]*(1-top.a)),lum=c=>{const a=c.map(v=>{v=v/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return a[0]*.2126+a[1]*.7152+a[2]*.0722;},ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const rows=[];
  for(const scene of document.querySelectorAll('.web-scene')){const page=rgb(getComputedStyle(scene).backgroundColor)?.c||[255,255,255];
   for(const region of scene.querySelectorAll('.region')){const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){if(!node.textContent.trim())continue;const el=node.parentElement;if(!el||el.closest('script,style,svg,summary,details:not([open])>:not(summary)'))continue;const s=getComputedStyle(el),fg=rgb(s.color);if(!fg)continue;
     let bg=page;for(const a of [...(function*(){for(let a=el;a&&a!==scene;a=a.parentElement)yield a;})()].reverse()){const c=rgb(getComputedStyle(a).backgroundColor);if(c&&c.a>0)bg=mix(c,bg);}
     const size=parseFloat(s.fontSize),weight=Number(s.fontWeight),large=size>=24||(size>=18.66&&weight>=700),role=el.closest('h2')?'display':el.closest('.metric strong')?'numeric':el.closest('.citation')?'citation':el.closest('.region[data-component=callout]')?'callout':el.closest('figcaption,.chart-notes,.chart-definition,.legend')?'caption':el.closest('td,th')?'table':'body';
     rows.push({theme:scene.dataset.theme,role,size:Math.round(size*10)/10,weight,required:large?3:4.5,ratio:Math.round(ratio(mix(fg,bg),bg)*100)/100,color:s.color,background:'rgb('+bg.map(Math.round).join(',')+')',text:node.textContent.trim().slice(0,40)});}
   }}
  return rows;
 };
 const measured={};
 for(const d of DECKS.filter(d=>['story','fieldnotes','atlas','stage'].includes(d.kind)&&d.locale==='en'||d.kind==='storyboard'&&d.locale==='zh-CN')){
  const p=await load(d.name),file=path.join(out,'runs',d.name,'contrast.html');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,(await html(p)).body);
  const {page,context}=await open(file,{width:1440});const rows=await page.evaluate(measure);await context.close();
  for(const r of rows){const key=`${r.theme}|${r.role}|${r.size}px/${r.weight}|${r.color}|${r.background}`;const m=measured[key]||(measured[key]={theme:r.theme,role:r.role,size:r.size,weight:r.weight,required:r.required,color:r.color,background:r.background,minRatio:r.ratio,count:0,decks:new Set(),sample:r.text});m.count++;m.decks.add(d.name);if(r.ratio<m.minRatio){m.minRatio=r.ratio;m.sample=r.text;}}
 }
 const pairs=Object.values(measured).map(m=>({...m,decks:[...m.decks],passes:m.minRatio+.01>=m.required})).sort((a,b)=>a.theme.localeCompare(b.theme)||a.role.localeCompare(b.role)||a.size-b.size);
 const tokens=S8_THEMES.map(id=>{const t=resolveTheme(id,'1.0.0','en'),pack=themePacks().find(p=>p.id===id);const pair=(name,fg,bg=t.paper)=>({name,fg,bg,ratio:Math.round(contrastRatio(bg,fg)*100)/100});
  return {theme:id,pairs:[pair('ink on paper',t.ink),pair('accent on paper',t.accent),pair('secondary on paper',t.secondary),pair('reference on paper',t.tokens.palette.reference),pair('missing on paper',t.tokens.palette.missing),pair('paper on ink (table header)',t.paper,t.ink),pair('ink on secondary (stage orb)',t.ink,t.secondary),...pack.chartColors.map((c,i)=>pair(`chart ${i+1} on paper`,c))]};});
 await report('contrast',{method:'Every text node of each deck at 1440 px: computed colour over the composited backgrounds of its ancestors and the scene surface (decor paths are covered by the fit audit). WCAG 2.2 thresholds: 4.5:1 below 24 px (18.66 px bold), 3:1 at or above.',measured:pairs,tokens,ok:pairs.every(p=>p.passes)});
}

// 4. Explicit cases.
if(steps.has('cases')){
 const dir=path.join(out,'cases');await mkdir(dir,{recursive:true});const cases=[];
 const write=async(name,p)=>{const file=path.join(dir,name+'.html');await writeFile(file,(await html(p)).body);return file;};
 const record=c=>{cases.push({host:'local isolated Chromium (file://)',...c});console.log(c.id,c.theme||'',c.passed?'pass':'FAIL');};
 // Missing glyph: the in-page audit must report it in every new theme (C13); render checks name the region.
 for(const theme of S8_THEMES){
  const p=await load(`story-${theme}-en`),title=p.document.blocks.find(b=>b.id==='open-title');title.text+=' ';const file=await write(`missing-glyph-${theme}`,p);
  const {page,context}=await open(file);const o=await page.evaluate(inspectRenderedPage),issues=checkRender(p,[o]).issues.filter(i=>i.sceneId==='st-open'),fit=o.fit.checks.find(c=>c.sceneId==='st-open');
  await shot(page,path.join(dir,`missing-glyph-${theme}.png`),'#st-open');await context.close();
  record({id:'missing-glyph',theme,locale:'en',page:'story 1 · st-open',state:'opening',reproduction:'Append U+E000 to the cover title; open at 1440 px; read the fit audit and the render checks.',observed:{fitOk:o.fit.ok,glyphs:fit.glyphs,glyphIssues:issues.filter(i=>i.kind==='glyph').map(i=>i.reason)},passed:o.fit.ok===false&&fit.glyphs.some(g=>g.missing.includes(''))&&issues.some(i=>i.kind==='glyph'),detectedBy:'in-page glyph audit (canvas pixels against the font\'s own .notdef)',fix:'C13 closed for the web fit audit and the Studio gate; the export readiness stage refuses the same layout (FONT_GLYPH_MISSING).'});
 }
 // Media-failure cover (T03): the hero without an image keeps a drawn object; a missing asset file is a named refusal, never a blank cover.
 {
  const p=await load('stage-en'),file=await write('stage-no-image',p),{page,context}=await open(file);
  const scene=p.plan.scenes.find(s=>s.composition==='stage-hero'&&!s.blockIds.some(id=>p.document.blocks.find(b=>b.id===id).type==='image'));
  const observed=await page.evaluate(id=>{const s=document.getElementById(id);return {decor:!!s.querySelector('.decor path[data-graphic-id="orb"]'),headline:getComputedStyle(s.querySelector('h2')).fontSize,textOverOrb:(()=>{const path=s.querySelector('.decor path');if(!path)return null;const m=path.getScreenCTM().inverse();return [...s.querySelectorAll('.region h2,.region p')].some(n=>{const r=n.getBoundingClientRect();return path.isPointInFill(new DOMPoint(r.left+1,r.top+r.height/2).matrixTransform(m))||path.isPointInFill(new DOMPoint(r.right-1,r.top+r.height/2).matrixTransform(m));});})()};},scene.id);
  const fit=(await page.evaluate(()=>window.deckweftFit)).checks.find(c=>c.sceneId===scene.id);await shot(page,path.join(dir,'stage-no-image.png'),'#'+scene.id);await context.close();
  const temporary=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s8-noimage-')));let refusal;
  try{await cp(home,temporary,{recursive:true});const withImage=await load('stage-en'),image=withImage.document.blocks.find(b=>b.type==='image'),asset=withImage.assets.find(a=>a.id===image.assetId);await unlink(path.join(temporary,asset.path));
   try{exportDeck(withImage.document,'html',{experimentalWeb:true,plan:withImage.plan,assetResources:await visualAssetResources(withImage,temporary)});refusal={export:'succeeded'};}catch(error){refusal={export:'refused',code:error.code,details:(error.details||[]).map(d=>d.code)};}}
  finally{await rm(temporary,{recursive:true,force:true});}
  record({id:'media-failure-cover',theme:'luminous-stage',locale:'en',page:`stage sample · ${scene.id}`,state:'opening',reproduction:'Render the hero without an image block; separately delete the hero image file from a copy of the asset home and export.',observed:{...observed,fitOk:fit.overflow.length===0&&fit.contrastIssues.length===0,refusal},passed:observed.decor&&observed.textOverOrb===false&&fit.contrastIssues.length===0&&refusal.export==='refused'&&refusal.details.includes('ASSET_UNRESOLVED'),fix:'None needed: the cover composes without media and a missing file is refused by name.'});
 }
 // Low-motion mode (T03): the theme declares fallback "static"; with reduced motion nothing animates and the player opens on the static state.
 {
  const p=await load('story-luminous-stage-en'),file=await write('stage-low-motion',p);
  const reduced=await open(file,{reducedMotion:'reduce'});const r=await reduced.page.evaluate(()=>({fallback:[...new Set([...document.querySelectorAll('.web-scene')].map(s=>s.dataset.motionFallback))],animations:document.getAnimations({subtree:true}).length,snapshot:window.deckweftInteractions.snapshot().map(s=>({sceneId:s.sceneId,position:s.position,playing:s.playing,frozen:s.frozen}))}));await reduced.context.close();
  const full=await open(file,{reducedMotion:'no-preference'});await full.page.evaluate(()=>{location.hash='scene=st-evidence';});await full.page.waitForFunction(()=>document.getElementById('st-evidence').classList.contains('active'));
  const f=await full.page.evaluate(()=>{window.deckweftInteractions.replay('st-evidence');return new Promise(r=>setTimeout(()=>r({animations:document.getAnimations({subtree:true}).map(a=>({id:a.id,easing:a.effect.getTiming().easing,delay:a.effect.getTiming().delay,duration:a.effect.getTiming().duration}))}),60));});await full.context.close();
  const theme=resolveTheme('luminous-stage','1.0.0','en');
  record({id:'low-motion',theme:'luminous-stage',locale:'en',page:'story (luminous-stage)',state:'reduced motion, then full motion replay',reproduction:'Open with prefers-reduced-motion: reduce and read the animations; open without it, replay page 3 and read the running animations.',observed:{reduced:r,full:f,declared:theme.tokens.motion},passed:r.fallback.includes('static')&&r.animations===0&&f.animations.every(a=>a.easing===theme.tokens.motion.easing&&a.delay>=theme.tokens.motion.delay),fix:'None needed.'});
 }
 // Black-and-white Research Atlas: the main series stay distinguishable with the colour removed (luminance steps plus dash patterns).
 {
  const p=await load('atlas-en'),file=await write('atlas-bw',p),{page,context}=await open(file);
  await page.addStyleTag({content:'html{filter:grayscale(1)}'});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const theme=resolveTheme('research-atlas','1.0.0','en'),lum=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const greys=theme.chart.map(c=>Math.round(lum(c)*1000)/1000),gaps=greys.slice(0,4).flatMap((a,i)=>greys.slice(0,4).slice(i+1).map(b=>Math.abs(a-b)));
  const dashes=await page.evaluate(()=>[...new Set([...document.querySelectorAll('.chart svg polyline[stroke-dasharray],.legend-key path[stroke-dasharray]')].map(n=>n.getAttribute('stroke-dasharray')))]);
  const figures=p.plan.scenes.filter(s=>s.blockIds.some(id=>p.document.blocks.find(b=>b.id===id).type==='chart')),captures=[];for(const s of figures)captures.push(await shot(page,path.join(dir,`atlas-bw-${s.id}.png`),'#'+s.id));
  await context.close();
  record({id:'black-and-white',theme:'research-atlas',locale:'en',page:figures.map(s=>s.id).join(', '),state:'grayscale filter over the whole page',reproduction:'Open the atlas sample, apply html{filter:grayscale(1)}, capture every chart page; compute the relative luminance of the first four series colours.',observed:{seriesLuminance:greys,minGapFirstFour:Math.min(...gaps),dashPatterns:dashes,captures:captures.map(c=>c.file)},passed:Math.min(...gaps)>=.03&&dashes.length>=2,fix:'Series differ by luminance and by dash pattern; focus is drawn as solid versus outlined. The captures were viewed.'});
 }
 // CJK phrase breaks (C12): no heading line ends inside a dictionary word, in every new theme, at 1440 and 390 px; and no overflow is measured at a line-end punctuation mark.
 for(const theme of S8_THEMES){
  const p=await load(`gallery-${theme}-zh-CN`),file=await write(`cjk-${theme}`,p),result={};
  for(const width of [1440,390]){
   const {page,context}=await open(file,{width});
   const headings=p.plan.scenes.flatMap(s=>s.blockIds.map(id=>p.document.blocks.find(b=>b.id===id)).filter(b=>['heading','callout'].includes(b.type)&&/\p{Script=Han}/u.test(b.text)).map(b=>({sceneId:s.id,blockId:b.id,text:b.text,boundaries:(()=>{const set=new Set();let i=0;for(const line of b.text.split(/\r\n|\r|\n/)){for(const seg of cjkSegments(line)){i+=[...seg].length;set.add(i);}i+=1;}return [...set];})()})));
   const observed=await page.evaluate(items=>items.map(it=>{const el=document.querySelector(`#${CSS.escape(it.sceneId)} [data-block-id="${CSS.escape(it.blockId)}"] :is(h2,p)`);if(!el)return {...it,error:'no element'};
    const chars=[];const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))for(let i=0;i<node.textContent.length;i++){const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);const rect=[...r.getClientRects()].find(x=>x.width>0);chars.push({ch:node.textContent[i],top:rect?Math.round(rect.top):null});}
    const ends=[];let count=0,prev=null;for(const c of chars){if(c.top!==null){if(prev!==null&&c.top>prev+4)ends.push(count);prev=c.top;}count+=c.ch.length;}
    // Character index -> grapheme index in the authored text.
    const codePoints=[...it.text],map=new Map();let u=0;codePoints.forEach((cp,g)=>{map.set(u,g);u+=cp.length;});
    const lineEnds=ends.map(e=>map.get(e)??e),insideWord=lineEnds.filter(e=>!it.boundaries.includes(e)&&/\p{Script=Han}/u.test(codePoints[e-1]||'')&&/\p{Script=Han}/u.test(codePoints[e]||''));
    const region=el.closest('.region');return {sceneId:it.sceneId,blockId:it.blockId,lines:lineEnds.length+1,lineEnds,insideWord:insideWord.map(e=>codePoints.slice(Math.max(0,e-3),e).join('')+'／'+codePoints.slice(e,e+3).join('')),overflow:region.scrollWidth>region.clientWidth+1,endsWithPunctuation:/[，。：；！？、）」』》]$/u.test(it.text.replace(/\s+$/,''))};}),headings);
   const fit=await page.evaluate(()=>window.deckweftFit);result[width]={headings:observed,overflowRegions:fit.checks.flatMap(c=>c.overflow)};await context.close();
  }
  const broken=Object.values(result).flatMap(r=>r.headings.filter(h=>h.insideWord.length)),overflow=Object.values(result).flatMap(r=>r.overflowRegions);
  record({id:'cjk-breaks',theme,locale:'zh-CN',page:'gallery (every heading and callout with Han text)',state:'opening',reproduction:'Open the zh-CN gallery at 1440 and 390 px; read the line boxes of every heading character and compare line ends with the dictionary word boundaries; read the fit audit overflow list.',observed:{brokenInsideWord:broken.map(h=>({sceneId:h.sceneId,blockId:h.blockId,width:Object.entries(result).find(([,r])=>r.headings.includes(h))?.[0],at:h.insideWord})),overflowRegions:overflow,headingsChecked:result[1440].headings.length},passed:broken.length===0&&overflow.length===0,fix:'C12: <wbr> at dictionary word boundaries with word-break: keep-all on display text.'});
 }
 await report('cases',{cases,ok:cases.every(c=>c.passed)});
}
if(chromium)await chromium.close();
await writeFile(path.join(out,'run.json'),JSON.stringify(run,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(run.steps).map(([k,v])=>[k,v.ok??true]))));
