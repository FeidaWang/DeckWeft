/**
 * PowerPoint and PDF from the local Visual Studio (S7). The same per-deck path as scripts/export-targets.mjs, without
 * Playwright, inspectors or reference renders: the isolated browser the Studio already drives over the DevTools protocol
 * opens the static web export with page scripts disabled, waits for fonts and images, measures it, captures the elements
 * delivered as images, and the export order compiles the file. A failing stage or check refuses the file; nothing is repaired.
 */
import http from 'node:http';
import {DeckError} from '../core/errors.mjs';
import {exportDeck} from '../render/export.mjs';
import {scanMissingGlyphs} from '../render/web/glyphs.mjs';
import {measureExportLayout,EXPORT_VIEWPORT} from './layout.mjs';
import {presentationCapabilities} from './capabilities.mjs';
import {withIsolatedBrowser,delay} from '../workbench/cdp.mjs';

const MIME={pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',pdf:'application/pdf'};
const REDUCED=[{name:'prefers-reduced-motion',value:'reduce'}];
// Buffers (package bytes) are not report data.
const jsonSafe=v=>JSON.parse(JSON.stringify(v,function(k,x){return ArrayBuffer.isView(this[k])?undefined:x;}));
const enclosing=b=>{const x=Math.floor(b.x+1e-3),y=Math.floor(b.y+1e-3);return {x,y,width:Math.ceil(b.x+b.width-1e-3)-x,height:Math.ceil(b.y+b.height-1e-3)-y,scale:1};};

/** Polls a page condition. Evaluation fails while a navigation replaces the document; that is retried, a closed browser is not. */
async function until(cdp,expression,signal){
 for(let i=0;i<150;i++){signal?.throwIfAborted();try{if(await cdp.evaluate(expression))return;}catch(e){if(cdp.socket.readyState!==WebSocket.OPEN)throw e;}await delay(100);}
 throw Error('CAPTURE_READY_TIMEOUT');
}
/** Opens one loopback page and waits for fonts, then every image decoded (export order, stage 1). Page scripts stay off; DevTools evaluation still runs. */
async function open(cdp,url,signal){
 const nav=await cdp.send('Page.navigate',{url});if(nav.errorText)throw new DeckError('EXPORT_PAGE_LOAD',`The isolated browser could not open the local export page (${nav.errorText}).`,502);
 await until(cdp,`location.href===${JSON.stringify(url)}&&document.readyState==='complete'`,signal);
 await cdp.evaluate('Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>null))]).then(()=>true)');
}
/** The fonts the browser actually drew each measured text with (same shape as scripts/export-targets.mjs). */
async function platformFonts(cdp){
 await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const doc=await cdp.send('DOM.getDocument',{depth:-1}),{nodeIds}=await cdp.send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'[data-dw-measure]'}),fonts={};
 for(const n of nodeIds){const a=(await cdp.send('DOM.getAttributes',{nodeId:n})).attributes,id=a[a.indexOf('data-dw-measure')+1];try{const f=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:n})).fonts;if(f.length)fonts[id]=f;}catch{}}
 await cdp.send('CSS.disable');await cdp.send('DOM.disable');return fonts;
}
/** One element as PNG at the measurement's device scale: scrolled into view, its enclosing pixel box clipped from the page. */
async function shot(cdp,measureId,signal){
 signal?.throwIfAborted();
 const b=await cdp.evaluate(`(()=>{const e=document.querySelector('[data-dw-measure="${measureId}"]');e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};})()`);
 const r=await cdp.send('Page.captureScreenshot',{format:'png',clip:enclosing(b),captureBeyondViewport:!(b.width<=EXPORT_VIEWPORT.width&&b.height<=EXPORT_VIEWPORT.height)});
 return Buffer.from(r.data,'base64');
}
/** L3 chart plots and non-PNG/JPEG images, keyed `${sceneId}/${blockId}/plot|image` as the PowerPoint compiler reads them. */
async function captures(cdp,{document,plan},resources,layout,signal){
 const rasters={},levels=presentationCapabilities('pptx',document,resources,plan).components;
 for(const s of layout.scenes)for(const r of s.regions){const lv=levels.find(c=>c.blockId===r.blockId);
  if(lv?.component==='chart'&&lv.level==='L3'&&r.plot)rasters[`${s.sceneId}/${r.blockId}/plot`]=await shot(cdp,r.plot.measureId,signal);
  if(r.image&&!['image/png','image/jpeg'].includes(resources[document.blocks.find(b=>b.id===r.blockId)?.assetId]?.mime))rasters[`${s.sceneId}/${r.blockId}/image`]=await shot(cdp,r.image.measureId,signal);}
 return rasters;
}
const external=(cdp,origin)=>{const urls=cdp.requests.filter(u=>!u.startsWith(origin+'/')&&!u.startsWith('data:'));if(urls.length)throw new DeckError('EXPORT_EXTERNAL_REQUEST','The export page asked for something outside this computer; nothing was exported.',422,urls.map(url=>({url})));};
const browserError=e=>e.message==='CAPTURE_REQUIRES_ISOLATED_BROWSER'?new DeckError(e.message,'Use an isolated test browser outside /Applications for PowerPoint and PDF export; an installed browser is never driven.',422)
 :e.syscall==='realpath'?new DeckError('TARGET_BROWSER_REQUIRED','The isolated browser path does not exist. Start the studio with --capture-browser /absolute/isolated/chromium, then export again.',422)
 :/^CAPTURE_/.test(e.message)?new DeckError(e.message,'The isolated browser did not finish the export. Nothing was exported; check the browser and export again.',502):e;

/**
 * `project` is a validated visual project ({document, plan, assets, ...}); `resources` = await visualAssetResources(project, home).
 * Returns {body: Buffer, mime, extension, report} where report is the export order's record (order, levels, delivery, check, receipts).
 */
export async function studioTargetExport({browserPath,project,resources={},format,signal,paginate='auto'}){
 if(!MIME[format])throw new DeckError('EXPORT_FORMAT','The Studio exports pptx and pdf through the export order.',400);
 if(!browserPath)throw new DeckError('TARGET_BROWSER_REQUIRED','PowerPoint and PDF are measured in an isolated browser. Start the studio with --capture-browser /absolute/isolated/chromium, then export again.',422);
 const {document,plan}=project,opts={experimentalWeb:true,plan,assetResources:resources},html=exportDeck(document,'html',opts),pages=new Map([['/static',html.body]]);
 const server=http.createServer((req,res)=>{if(req.method!=='GET'||!pages.has(req.url)||req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(pages.get(req.url));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 try{return await withIsolatedBrowser(browserPath,{signal,prefix:'dw-studio-export-'},async cdp=>{
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Network.enable');await cdp.send('Emulation.setScriptExecutionDisabled',{value:true});await cdp.send('Emulation.setEmulatedMedia',{features:REDUCED});
  // Measure the static scene at 1440 px and device scale 2, after fonts and images; then the drawn fonts and the glyph audit.
  await cdp.send('Emulation.setDeviceMetricsOverride',{...EXPORT_VIEWPORT,deviceScaleFactor:2,mobile:false});await open(cdp,origin+'/static',signal);
  const layout=await cdp.evaluate('('+measureExportLayout.toString()+')()');layout.platformFonts=await platformFonts(cdp);layout.missingGlyphs=await cdp.evaluate('('+scanMissingGlyphs.toString()+')(document)');
  const rasters=format==='pptx'?await captures(cdp,project,resources,layout,signal):{};external(cdp,origin);signal?.throwIfAborted();
  // No allowFailedCheck: whatever the export order refuses, the Studio refuses.
  const out=exportDeck(document,format,{...opts,layout,rasters,paginate});
  if(format==='pptx')return {body:Buffer.from(out.body),mime:MIME.pptx,extension:'pptx',report:jsonSafe(out.report)};
  // Screen styles keep the measured layout (print media drops the scenes' minimum height); every printed scene is checked against it.
  pages.set('/print',out.body);await cdp.send('Emulation.setDeviceMetricsOverride',{...EXPORT_VIEWPORT,deviceScaleFactor:1,mobile:false});await cdp.send('Emulation.setEmulatedMedia',{media:'screen',features:REDUCED});await open(cdp,origin+'/print',signal);
  const printed=await cdp.evaluate("[...document.querySelectorAll('.dw-fit>.web-scene')].map(s=>({sceneId:s.id,width:s.offsetWidth,height:s.offsetHeight}))");
  const mismatches=printed.length!==layout.scenes.length?[{printed:printed.length,measured:layout.scenes.length}]:printed.map((g,i)=>({...g,measured:{width:layout.scenes[i].bounds.width,height:layout.scenes[i].bounds.height}})).filter(g=>Math.abs(g.height-g.measured.height)>1.5||Math.abs(g.width-g.measured.width)>1.5);
  if(mismatches.length)throw new DeckError('PDF_PRINT_GEOMETRY','A printed scene does not match its measured size; nothing was exported.',422,mismatches);
  signal?.throwIfAborted();
  const pdf=await cdp.send('Page.printToPDF',{paperWidth:out.print.width/96,paperHeight:out.print.height/96,printBackground:true,preferCSSPageSize:true,generateTaggedPDF:true,generateDocumentOutline:true,marginTop:0,marginBottom:0,marginLeft:0,marginRight:0},120000);
  external(cdp,origin);
  return {body:Buffer.from(pdf.data,'base64'),mime:MIME.pdf,extension:'pdf',report:jsonSafe(out.report)};
 });}catch(e){signal?.throwIfAborted();throw browserError(e);}finally{await new Promise(r=>server.close(r));}
}
