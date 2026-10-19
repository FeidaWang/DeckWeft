// S9a evidence run: the three-direction entry drawn in all six themes. For a supplied-text deck and the six-family deck, in both
// languages, each theme is the lead direction once (style answer = that theme). Every deck is exported, measured at 1440, 1024
// and 390 px (fit audit with the glyph audit, render checks, heights) and drawn into 1440 px contact sheets. Facts must be
// identical across the six themes. It never certifies a deck: the sheets still need to be viewed and the weakest page named.
// Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/abs/playwright/index.mjs node scripts/s9a-directions.mjs [--out dist/s9a-directions]
import path from 'node:path';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,readFile,realpath,rm,writeFile} from 'node:fs/promises';
import {createVisualTask} from '../src/agent/director.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {inspectRenderedPage,checkRender} from '../src/quality/render-checks.mjs';
import {planDirections,factsHash} from '../src/workbench/directions.mjs';
import {themePacks} from '../src/design/theme-registry.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {studioTargetExport} from '../src/targets/studio-export.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},widths:{type:'string',default:'1440,1024,390'},exports:{type:'boolean',default:false},plots:{type:'boolean',default:false}}});
const out=path.resolve(args.out||path.join(root,'dist/s9a-directions')),widths=args.widths.split(',').map(Number);
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'home'),{recursive:true});
const home=await realpath(path.join(out,'home')),store=await new VisualProjectStore(home).init();
const TEXT={en:'Why do exports drift?\nTeams lose hours fixing slides after export.\nThe fixes are rarely recorded.\n---\nHow the pipeline works\nThe browser measures the static scene.\nEach page is repaired on its own.\n- Measure the static scene\n- Repair one page\n---\nEvidence: what we measured\nPowerPoint editability passed on 18 of 18 decks.\n---\nLimits\nKeynote was not run.\n---\nNext steps\n- Run PowerPoint yourself\n- Record the result',
 'zh-CN':'为什么导出会走样？\n团队在导出后花很多时间修补幻灯片。\n这些修补很少被记录。\n---\n流程如何运作\n浏览器测量静态场景。\n每一页单独修复。\n- 测量静态场景\n- 修复一页\n---\n证据：我们测到了什么\nPowerPoint 可编辑性在 18 份文稿中全部通过。\n---\n局限\n尚未运行 Keynote。\n---\n下一步\n- 由你运行 PowerPoint\n- 记录结果'};
const executablePath=await realpath(process.env.CHROMIUM_PATH||'');if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Use an isolated browser outside /Applications.');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),browser=await chromium.launch({executablePath,headless:true});
async function open(file,width){
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'}),external=[],errors=[];
 await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.startsWith('data:'))return r.continue();external.push(u);return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(file).href);
 await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>null))]));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return {context,page,external,errors};
}
const themes=themePacks().map(p=>p.id),bases=[];
for(const locale of ['en','zh-CN']){bases.push({name:'text-'+locale,locale,project:createVisualTask({request:TEXT[locale],locale}).project});bases.push({name:'six-family-'+locale,locale,project:await createCompositionDemo(locale,store.home)});}
const result={format:'deckweft-s9a-directions',version:1,renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,browser:browser.version(),node:process.version,icu:process.versions.icu,widths,bases:[]};
for(const base of bases){
 const resources=await visualAssetResources(base.project,store.home),entry={base:base.name,locale:base.locale,facts:factsHash(base.project.document),decks:[]},cells=[];
 for(const theme of themes){
  const r=planDirections(base.project,{topic:'x',style:theme,detail:'standard',motion:'off',output:'pptx'},resources),d=r.directions[0],p=d.project;
  const dir=path.join(out,base.name,theme);await mkdir(dir,{recursive:true});const file=path.join(dir,'deck.html');await writeFile(file,exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources}).body);
  const deck={theme,group:d.direction.group,facts:factsHash(p.document),distinct:r.differences.every(x=>Object.values(x.differs).every(Boolean)),explanation:{graphics:d.explanation.graphics.en,type:d.explanation.type.en,media:d.explanation.media.en,motion:d.explanation.motion.en},widths:{}};
  for(const width of widths){
   const {context,page,external,errors}=await open(file,width),observation=await page.evaluate(inspectRenderedPage),checks=checkRender(p,[observation]),fit=observation.fit;
   deck.widths[width]={ok:checks.ok&&fit.ok,issues:checks.issues.map(i=>({kind:i.kind,sceneId:i.sceneId,reason:i.reason.slice(0,160)})),glyphs:fit.checks.flatMap(c=>c.glyphs||[]),overBudget:width>700?fit.checks.filter(c=>c.height>900).map(c=>({sceneId:c.sceneId,height:Math.round(c.height)})):[],external,errors};
   if(width===1440)for(const s of p.plan.scenes){const png=path.join(dir,`1440-${s.id}.png`);await page.locator('#'+s.id).screenshot({path:png});cells.push({label:`${theme} · ${s.composition} · ${Math.round(fit.checks.find(c=>c.sceneId===s.id).height)}px`,png});}
   await context.close();
  }
  // --exports: the Studio's PowerPoint and PDF path (S7 export order, isolated browser) on this deck; refusals are recorded by code.
  if(args.exports)for(const format of ['pptx','pdf']){try{const f=await studioTargetExport({browserPath:executablePath,project:p,resources,format});const levels=f.report.levels.reduce((m,c)=>{const l=c[format]?.level;if(l)m[l]=(m[l]||0)+1;return m;},{});await writeFile(path.join(dir,'deck.'+format),f.body);deck[format]={ok:true,bytes:f.body.length,levels,receipts:f.report.receipts.length,check:f.report.order.at(-1)};}catch(e){deck[format]={ok:false,code:e.code||e.message,details:(e.details||[]).slice(0,3)};}}
  entry.decks.push(deck);console.log(base.name,theme,args.exports?`pptx ${deck.pptx.ok?'ok':deck.pptx.code} pdf ${deck.pdf.ok?'ok':deck.pdf.code}`:'',JSON.stringify(Object.fromEntries(Object.entries(deck.widths).map(([w,v])=>[w,{ok:v.ok,issues:v.issues.length,glyphs:v.glyphs.length,overBudget:v.overBudget.length}]))));
 }
 entry.factsIdentical=entry.decks.every(d=>d.facts===entry.facts);
 const columns=base.project.plan.scenes.length,sheet=await browser.newPage({viewport:{width:1800,height:1000}});
 const images=await Promise.all(cells.map(async c=>({...c,b64:(await readFile(c.png)).toString('base64')})));
 await sheet.setContent(`<style>body{margin:0;padding:12px;font:15px system-ui;background:#cfcfcf}main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px}figure{margin:0;background:#fff}img{width:100%;display:block}figcaption{font-size:11px;padding:3px 5px}</style><h1 style="font-size:16px;margin:0 0 8px">${base.name} · six lead directions · 1440 px · facts ${entry.factsIdentical?'identical':'DIFFER'} (${entry.facts.slice(0,12)})</h1><main>${images.map(c=>`<figure><figcaption>${c.label}</figcaption><img src="data:image/png;base64,${c.b64}"></figure>`).join('')}</main>`);
 await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));entry.sheet=path.join(base.name+'-contact.jpg');await sheet.screenshot({path:path.join(out,entry.sheet),fullPage:true,type:'jpeg',quality:80});await sheet.close();
 result.bases.push(entry);
}
// --plots: the drawn plot size of the six-family evidence page in every single-chart layout and theme at 1440 px. This is the
// measurement behind “Give the chart more space” (LARGEST_PLOT in src/workbench/author-actions.mjs).
if(args.plots){const base=bases.find(b=>b.name==='six-family-en').project,resources=await visualAssetResources(base,store.home),own={'dark-data':['chart-with-evidence-rail'],'fresh-report':['atlas-figure'],'silver-gray-editorial':['fieldnotes-figure'],'orange-launch':['stage-figure'],'cream-collage':[],'electric-violet':[]},rows=[];
 for(const theme of themes)for(const composition of ['evidence-left','evidence-top','evidence-right',...own[theme]]){let p=structuredClone(base);if(p.plan.scenes.find(s=>s.id==='evidence').theme!==theme)p=applySceneTheme(p,'evidence',theme);p.plan.scenes.find(s=>s.id==='evidence').composition=composition;
  const file=path.join(out,'plot.html');await writeFile(file,exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources}).body);const {context,page}=await open(file,1440);
  rows.push({theme,composition,...await page.evaluate(()=>{const svg=document.querySelector('#evidence .chart-plot svg'),b=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal,k=Math.min(b.width/vb.width,b.height/vb.height);return {drawn:[Math.round(vb.width*k),Math.round(vb.height*k)],box:[Math.round(b.width),Math.round(b.height)],sceneHeight:Math.round(document.getElementById('evidence').getBoundingClientRect().height)};})});await context.close();}
 await writeFile(path.join(out,'chart-space-measurements.json'),JSON.stringify({format:'deckweft-s9a-plot-sizes',version:1,page:'six-family-en / evidence (one line chart)',width:1440,browser:browser.version(),rows},null,1)+'\n');}
result.ok=result.bases.every(b=>b.factsIdentical&&b.decks.every(d=>d.distinct&&Object.values(d.widths).every(w=>w.ok&&!w.glyphs.length&&!w.external.length&&!w.errors.length)&&(!args.exports||d.pptx?.ok&&d.pdf?.ok)));
await writeFile(path.join(out,'directions.json'),JSON.stringify(result,null,1)+'\n');await browser.close();
console.log('ok',result.ok);
