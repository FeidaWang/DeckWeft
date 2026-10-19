// S7 / VIS-016 export run. Optional local QA: Playwright and an isolated browser are supplied separately, like the VIS-014 gate.
// For every deck of the frozen VIS-014 corpus (plus the S4 chart-kinds sample, which exercises the fallbacks) it measures the
// static web scene after fonts and images are ready, compiles PowerPoint and PDF through the export order, reads both files
// back with independent inspectors, renders them with macOS Quick Look when available, and writes one export report per deck.
// It never opens PowerPoint or Keynote and never claims their compatibility.
import path from 'node:path';
import os from 'node:os';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,readFile,readdir,realpath,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LOCALES,THEMES,releaseProject} from '../tests/release-gate.mjs';
import {chartKindsProject} from '../tests/chart-kinds.mjs';
import {S8_THEMES,s8Project} from '../tests/s8-themes.mjs';
import {BLUEPRINT_THEMES,blueprintProject} from '../tests/blueprint-a.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {measureExportLayout,EXPORT_VIEWPORT} from '../src/targets/layout.mjs';
import {scanMissingGlyphs} from '../src/render/web/glyphs.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {checkPdfText,checkPdfAccessibility} from '../src/targets/pdf/print.mjs';
import {readZip} from '../src/targets/pptx/audit.mjs';
import {exportReport,reportMarkdown} from '../src/targets/pptx/compatibility-report.mjs';
import {zipFiles} from '../src/render/zip.mjs';
import {WEB_RENDERER_VERSION} from '../src/scene/web/compile.mjs';
import {PLAYER_VERSION} from '../src/render/web/runtime.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},decks:{type:'string'},supplementary:{type:'boolean',default:true},quicklook:{type:'boolean',default:true},s8:{type:'boolean',default:false},s9:{type:'boolean',default:false},help:{type:'boolean'}}});
if(args.help){console.log('Usage: CHROMIUM_PATH=/isolated/browser PLAYWRIGHT_MODULE=/abs/playwright/index.mjs node scripts/export-targets.mjs [--out dist/export-targets] [--decks gallery-en,story-dark-data-zh-CN] [--no-supplementary] [--no-quicklook]\nThen view sheet-*.jpg and record the review. PowerPoint and Keynote checks stay with the user (report.applicationChecks).');process.exit(0);}
const out=path.resolve(args.out||path.join(root,'dist/export-targets')),home=path.join(out,'home'),hash=b=>createHash('sha256').update(b).digest('hex');
// --s8 (VIS-015): the frozen gallery drawn in each S8 theme, the S8 stories and the three handoff sample decks, instead of the VIS-014 corpus.
const S8_DECKS=LOCALES.flatMap(locale=>[...S8_THEMES.flatMap(theme=>[{name:`gallery-${theme}-${locale}`,kind:'s8-gallery',locale,theme},{name:`story-${theme}-${locale}`,kind:'s8-story',locale,theme}]),{name:`fieldnotes-${locale}`,kind:'fieldnotes',locale},{name:`atlas-${locale}`,kind:'atlas',locale},{name:`stage-${locale}`,kind:'stage',locale}]);
// --s9 (S9b): the blueprint A sample (Explain → Diagram → Explore, static state Diagram) in all six themes and both languages.
const S9_DECKS=LOCALES.flatMap(locale=>BLUEPRINT_THEMES.map(theme=>({name:`blueprint-${theme}-${locale}`,kind:'s9-blueprint',locale,theme})));
const DECKS=(args.s9?S9_DECKS:args.s8?S8_DECKS:[...LOCALES.flatMap(locale=>[{name:`gallery-${locale}`,kind:'gallery',locale},...THEMES.map(theme=>({name:`story-${theme}-${locale}`,kind:'story',locale,theme}))]),...(args.supplementary?[{name:'chart-kinds-en',kind:'supplementary',locale:'en'}]:[])]).filter(d=>!args.decks||args.decks.split(',').includes(d.name));
await mkdir(home,{recursive:true});

if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to an isolated test browser outside /Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser bundles are read-only.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',playwright=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const browser=await playwright.chromium.launch({executablePath,headless:true});
const which=cmd=>spawnSync('/usr/bin/which',[cmd],{encoding:'utf8'}).stdout.trim()||null;
const quicklook=args.quicklook&&process.platform==='darwin'&&existsSync('/usr/bin/qlmanage');
const python=which('python3');
const environment={node:process.version,platform:`${process.platform} ${os.release()}`,browser:`Chromium ${browser.version()} (isolated${/ms-playwright/.test(executablePath)?', Playwright cache':''})`,playwright:JSON.parse(await readFile(path.join(path.dirname(path.isAbsolute(module)?module:fileURLToPath(import.meta.resolve(module))),'package.json'),'utf8')).version,renderer:WEB_RENDERER_VERSION,player:PLAYER_VERSION,python:python?spawnSync(python,['--version'],{encoding:'utf8'}).stdout.trim():null,quickLook:quicklook};
const applications={
 powerpoint:{state:existsSync('/Applications/Microsoft PowerPoint.app')?'installed, not run':'not installed',detail:'Only the user runs it; see applicationChecks.'},
 keynote:{state:existsSync('/Applications/Keynote.app')?'installed, not run':'not installed',detail:'Only the user runs it; see applicationChecks.'},
 libreoffice:{state:which('soffice')||existsSync('/Applications/LibreOffice.app')?'installed, not run':'not installed'},
 quickLook:{state:quicklook?'rendered':'not run',detail:'macOS Quick Look (qlmanage, OfficeImport) drew each slide and PDF page as an independent reference render. It is neither PowerPoint nor Keynote.'}
};

/** Opens a file with page scripts disabled; every non-file request is refused and recorded. */
async function open(file,{dpr=1}={}){
 const context=await browser.newContext({viewport:EXPORT_VIEWPORT,deviceScaleFactor:dpr,javaScriptEnabled:false,reducedMotion:'reduce'}),external=[];
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('file:')||url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(pathToFileURL(file).href);await page.waitForLoadState('load');
 // Fonts and images first (export order, stage 1).
 await page.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>null))]));
 return {context,page,external};
}
/** The fonts the browser actually drew each measured text with (Chromium DevTools protocol). */
async function platformFonts(context,page){
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const doc=await cdp.send('DOM.getDocument',{depth:-1}),{nodeIds}=await cdp.send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'[data-dw-measure]'}),fonts={};
 for(const n of nodeIds){const a=(await cdp.send('DOM.getAttributes',{nodeId:n})).attributes,id=a[a.indexOf('data-dw-measure')+1];try{const f=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:n})).fonts;if(f.length)fonts[id]=f;}catch{}}
 await cdp.detach();return fonts;
}
const run=(cmd,argv,opts={})=>{const r=spawnSync(cmd,argv,{encoding:'utf8',timeout:300000,...opts});return {status:r.status,stdout:r.stdout,stderr:r.stderr};};
/** Quick Look draws only the first slide of a package, so each slide gets a copy whose slide list names only that slide. */
async function quickLookSlides(pptx,dir){
 const files=readZip(pptx),pres=files.get('ppt/presentation.xml').toString('utf8'),ids=pres.match(/<p:sldId [^>]*\/>/g),names=[];
 await mkdir(dir,{recursive:true});
 for(const [k,id]of ids.entries()){const name=path.join(dir,`slide-${String(k+1).padStart(2,'0')}.pptx`);await writeFile(name,zipFiles([...files].map(([n,b])=>[n,n==='ppt/presentation.xml'?pres.replace(ids.join(''),id):b])));names.push(name);}
 run('/usr/bin/qlmanage',['-t','-s','1440','-o',dir,...names]);
 return names.map(n=>existsSync(n+'.png')?n+'.png':null);
}
async function quickLookPages(dir){const pages=(await readdir(dir)).filter(f=>/^page-\d+\.pdf$/.test(f)).sort().map(f=>path.join(dir,f));if(pages.length)run('/usr/bin/qlmanage',['-t','-s','1440','-o',dir,...pages]);return pages.map(p=>existsSync(p+'.png')?p+'.png':null);}
const dataURL=async file=>file?'data:image/png;base64,'+(await readFile(file)).toString('base64'):null;
/** Advisory pixel comparison: the web scene fitted to 16:9 against each reference render, mean absolute luminance difference (0–255). */
async function compare(pairs){
 const context=await browser.newContext({viewport:{width:400,height:300}}),page=await context.newPage();await page.setContent('<canvas></canvas>');
 const result=await page.evaluate(async pairs=>{const load=src=>new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});const W=192,H=108;
  const draw=(img,bg,fit)=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle=bg;x.fillRect(0,0,W,H);if(fit){const s=Math.min(W/img.width,H/img.height);x.drawImage(img,(W-img.width*s)/2,(H-img.height*s)/2,img.width*s,img.height*s);}else x.drawImage(img,0,0,W,H);const d=x.getImageData(0,0,W,H).data,l=new Float32Array(W*H);for(let i=0;i<W*H;i++)l[i]=.2126*d[i*4]+.7152*d[i*4+1]+.0722*d[i*4+2];return l;};
  const out=[];for(const p of pairs){const web=await load(p.web);if(!web){out.push(null);continue;}const a=draw(web,'#'+p.bg,true),row={};for(const k of ['pptx','pdf']){const img=await load(p[k]);if(!img){row[k]=null;continue;}const b=draw(img,'#'+p.bg,false);let sum=0,big=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;if(d>48)big++;}row[k]={meanAbsDiff:Math.round(sum/a.length*10)/10,changedShare:Math.round(big/a.length*1000)/1000};}out.push(row);}return out;},pairs);
 await context.close();return result;
}
async function sheet(rows,file,title){
 const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#777;font:14px Arial,sans-serif;color:#fff}h1{font-size:16px;margin:10px 12px}.head,.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:4px 8px}.cell{aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#555}.cell img{max-width:100%;max-height:100%}.row{position:relative}.row b{position:absolute;left:12px;top:6px;background:#000;padding:2px 6px}</style><h1>${title}</h1><div class=head><span>Web static scene (1440 px)</span><span>PowerPoint package · Quick Look</span><span>PDF page · Quick Look</span></div>${rows.map(r=>`<div class=row><b>${r.label}</b>${['web','pptx','pdf'].map(k=>`<div class=cell style="background:#${r.bg}">${r[k]?`<img src="${pathToFileURL(r[k]).href}">`:'<span>not rendered</span>'}</div>`).join('')}</div>`).join('')}`;
 const tmp=file.replace(/\.jpg$/,'.html');await writeFile(tmp,html);
 const context=await browser.newContext({viewport:{width:1800,height:900}}),page=await context.newPage();await page.goto(pathToFileURL(tmp).href);await page.waitForLoadState('load');
 await page.screenshot({path:file,fullPage:true,type:'jpeg',quality:82});await context.close();
}

const summary=[];
for(const d of DECKS){
 const dir=path.join(out,'decks',d.name);await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
 const p=d.kind==='s9-blueprint'?await blueprintProject(d.locale,{theme:d.theme}):d.kind==='supplementary'?chartKindsProject(d.locale):d.kind==='s8-gallery'?await (async()=>{let g=await releaseProject('gallery',d.locale,home);for(const sc of g.plan.scenes)g=applySceneTheme(g,sc.id,d.theme);return g;})():d.kind==='s8-story'?await s8Project('story',d.locale,home,d.theme):['fieldnotes','atlas','stage'].includes(d.kind)?await s8Project(d.kind,d.locale,home):await releaseProject(d.kind,d.locale,home,d.theme);
 const resources=await visualAssetResources(p,home),opts={experimentalWeb:true,plan:p.plan,assetResources:resources};
 const html=exportDeck(p.document,'html',opts),staticFile=path.join(dir,'static.html');await writeFile(staticFile,html.body);await writeFile(path.join(dir,'project.json'),JSON.stringify(p,null,1));
 // Measure (after fonts and images), confirm the drawn fonts, capture each scene and every element delivered as an image.
 const m=await open(staticFile,{dpr:2}),layout=await m.page.evaluate(measureExportLayout);layout.platformFonts=await platformFonts(m.context,m.page);layout.missingGlyphs=await m.page.evaluate(scanMissingGlyphs,await m.page.evaluateHandle(()=>document));
 const rasters={},webShots={},levels=presentationCapabilities('pptx',p.document,resources,p.plan).components;
 for(const s of layout.scenes){webShots[s.sceneId]=path.join(dir,`web-${s.sceneId}.png`);await m.page.locator('#'+s.sceneId).screenshot({path:webShots[s.sceneId],animations:'disabled'});
  for(const r of s.regions){const lv=levels.find(c=>c.blockId===r.blockId);
   if(lv?.component==='chart'&&lv.level==='L3'&&r.plot)rasters[`${s.sceneId}/${r.blockId}/plot`]=await m.page.locator(`[data-dw-measure="${r.plot.measureId}"]`).screenshot({animations:'disabled'});
   if(r.image&&!['image/png','image/jpeg'].includes(resources[p.document.blocks.find(b=>b.id===r.blockId)?.assetId]?.mime))rasters[`${s.sceneId}/${r.blockId}/image`]=await m.page.locator(`[data-dw-measure="${r.image.measureId}"]`).screenshot({animations:'disabled'});}}
 await writeFile(path.join(dir,'layout.json'),JSON.stringify(layout));await m.context.close();
 // Compile both paged targets through the export order.
 // Failures are recorded, not hidden: the evidence run keeps a failing file and its report.
 const pptx=exportDeck(p.document,'pptx',{...opts,layout,rasters,allowFailedCheck:true}),pdfJob=exportDeck(p.document,'pdf',{...opts,layout,rasters,allowFailedCheck:true});
 const pptxFile=path.join(dir,d.name+'.pptx'),printFile=path.join(dir,'print.html'),pdfFile=path.join(dir,d.name+'.pdf');
 await writeFile(pptxFile,pptx.body);await writeFile(printFile,pdfJob.body);
 // Screen styles keep the measured layout (print media drops the scenes' minimum height); every printed scene is checked against it.
 const pr=await open(printFile);await pr.page.emulateMedia({media:'screen'});
 const printed=await pr.page.evaluate(()=>[...document.querySelectorAll('.dw-fit>.web-scene')].map(s=>({sceneId:s.id,width:s.offsetWidth,height:s.offsetHeight})));
 const geometry=printed.map((g,i)=>({...g,measured:{width:layout.scenes[i].bounds.width,height:layout.scenes[i].bounds.height}})).filter(g=>Math.abs(g.height-g.measured.height)>1.5||Math.abs(g.width-g.measured.width)>1.5);
 await pr.page.pdf({path:pdfFile,width:pdfJob.print.width+'px',height:pdfJob.print.height+'px',printBackground:true,tagged:true,outline:true,preferCSSPageSize:true});await pr.context.close();
 // Independent inspections.
 const expected=pdfJob.run.output.expected,expectFile=path.join(dir,'expected.json');await writeFile(expectFile,JSON.stringify(expected,null,1));
 let pptxInspection=null,pdfInspection=null;
 if(python){run(python,['-I',path.join(root,'tests/inspect_v3_pptx.py'),pptxFile,'--expect',expectFile,'--out',path.join(dir,'pptx-inspection.json')]);try{pptxInspection=JSON.parse(await readFile(path.join(dir,'pptx-inspection.json'),'utf8'));}catch{}
  run(python,[path.join(root,'tests/inspect_pdf.py'),pdfFile,'--out',path.join(dir,'pdf-inspection.json'),'--split',path.join(dir,'pdf-pages')]);try{pdfInspection=JSON.parse(await readFile(path.join(dir,'pdf-inspection.json'),'utf8'));}catch{}}
 const pdfAvailable=pdfInspection?.available;
 const searchability=pdfAvailable?checkPdfText(expected,pdfInspection):{status:'not-run',reason:'pypdf or python3 unavailable'};
 searchability.printGeometry={status:geometry.length?'fail':'pass',mismatches:geometry};if(geometry.length)searchability.status='fail';
 const pdfAccess=pdfAvailable?checkPdfAccessibility(pdfInspection,{locale:p.document.locale}):{status:'not-run'};
 // Reference renders and the advisory comparison.
 let slidesQL=[],pagesQL=[];if(quicklook){slidesQL=await quickLookSlides(pptx.body,path.join(dir,'ql-pptx'));if(pdfAvailable)pagesQL=await quickLookPages(path.join(dir,'pdf-pages'));}
 const scenes=p.plan.scenes.map((s,i)=>({label:`${i+1} · ${s.id}`,sceneId:s.id,bg:layout.scenes[i].background?.hex||'FFFFFF',web:webShots[s.id],pptx:slidesQL[i]||null,pdf:pagesQL[i]||null}));
 const metrics=quicklook?await compare(await Promise.all(scenes.map(async s=>({bg:s.bg,web:await dataURL(s.web),pptx:await dataURL(s.pptx),pdf:await dataURL(s.pdf)})))):[];
 const fidelity=quicklook?{status:'partial',reason:'Reference renders by macOS Quick Look only; PowerPoint and Keynote were not run. Metrics are advisory; the contact sheets were viewed.',renderer:'qlmanage (OfficeImport)',slides:scenes.map((s,i)=>({sceneId:s.sceneId,pptx:metrics[i]?.pptx||null,pdf:metrics[i]?.pdf||null})),sheets:[]}:{status:'not-run',reason:'Quick Look is not available.'};
 for(let k=0;k<scenes.length;k+=6){const file=path.join(dir,`sheet-${Math.floor(k/6)+1}.jpg`);await sheet(scenes.slice(k,k+6),file,`${d.name} · web | PowerPoint | PDF (Quick Look renders)`);if(fidelity.sheets)fidelity.sheets.push(path.relative(out,file));}
 const report=exportReport({deck:d.name,document:p.document,plan:p.plan,pptx:{run:pptx.run,inspection:pptxInspection},pdf:{run:pdfJob.run,inspection:pdfInspection,searchability,accessibility:pdfAccess},fidelity,environment,applications});
 report.files.sha256={pptx:hash(pptx.body),pdf:hash(await readFile(pdfFile))};
 await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,1)+'\n');await writeFile(path.join(dir,'report.md'),reportMarkdown(report));
 const line={deck:d.name,pptxEditability:report.results.pptxEditability.status,sceneCheck:report.results.pptxEditability.sceneCheck.status,pdfSearchability:report.results.pdfSearchability.status,accessibility:report.results.accessibility.status,visualFidelity:report.results.visualFidelity.status,receipts:report.receipts.reduce((n,g)=>n+g.count,0),levels:report.levelCounts.pptx,external:[...m.external,...pr.external]};
 summary.push(line);console.log(JSON.stringify(line));
}
await writeFile(path.join(out,'exports.json'),JSON.stringify({format:'deckweft-s7-exports',version:1,environment,applications,decks:summary},null,1)+'\n');
await browser.close();
