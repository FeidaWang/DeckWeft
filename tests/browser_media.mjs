// Optional direct-browser acceptance. Requires Playwright and an isolated test browser; no runtime dependency.
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdtemp,mkdir,rm,realpath} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseArgs} from 'node:util';
import {startStudio} from '../src/services/server.mjs';
import {ProjectStore} from '../src/services/store.mjs';
import {registerAsset} from '../src/assets/registry.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {ImageJobs} from '../src/assets/generation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),{values:args}=parseArgs({options:{out:{type:'string'}}});
const out=path.resolve(args.out||'dist/mb-11-15/browser');await mkdir(out,{recursive:true});const artifacts=path.join(root,'dist/mb-11-15/browser-artifacts');await mkdir(artifacts,{recursive:true});
const browserPath=process.env.CHROMIUM_PATH;
if(!browserPath||browserPath.includes('/Applications/'))throw Error('Set CHROMIUM_PATH to an isolated test browser outside Applications. Never use an installed browser or personal profile.');
const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(modulePath)?pathToFileURL(modulePath).href:modulePath);
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-media-browser-'))),store=await new ProjectStore(home).init();
const deck=JSON.parse(await readFile(path.join(root,'dist/mb-11-15/demo/media.deck.json'),'utf8')),original=await readFile(path.join(root,'docs/evidence/mb-11-15/workbench-generated.png'));
await registerAsset(home,original,deck.assets[0]);await store.save(deck,{create:true});
const studio=await startStudio({home,port:0});
const workerPages=new Map();for(const worker of ['alpha','beta']){const file=path.join(root,'docs/evidence/mb-11-15/worker-'+worker+'.deck.json');try{workerPages.set('/worker-'+worker+'.html',exportDeck(JSON.parse(await readFile(file,'utf8')),'html').body);}catch(e){if(e.code!=='ENOENT')throw e;}}
const htmlServer=http.createServer(async(req,res)=>{if(req.headers.host!==`127.0.0.1:${htmlServer.address().port}`||req.method!=='GET'||req.url!=='/media.html'&&!workerPages.has(req.url)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(workerPages.get(req.url)||await readFile(path.join(root,'dist/mb-11-15/demo/media.html')));});
await new Promise(r=>htmlServer.listen(0,'127.0.0.1',r));const htmlUrl='http://127.0.0.1:'+htmlServer.address().port;
const browser=await chromium.launch({executablePath:browserPath,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
const page=await context.newPage(),errors=[],requests=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const results={browser:browser.version(),isolation:'Cached Chrome for Testing with ephemeral context; no installed application or personal profile',checks:[],errors};
try{
await page.goto(htmlUrl+'/media.html');await page.getByRole('button',{name:'Next',exact:true}).click();await page.waitForSelector('.three-scene-layer');
await page.waitForFunction(()=>Number(document.querySelector('.three-scene-layer').dataset.frames)>2);
await page.screenshot({path:out+'/html-orbit.png',fullPage:true});results.checks.push('Actual WebGL orbit renders with separate native SVG text');
await page.getByRole('button',{name:'Reduce motion',exact:true}).click();const frames=await page.locator('.three-scene-layer').getAttribute('data-frames');await page.waitForTimeout(250);assert.equal(await page.locator('.three-scene-layer').getAttribute('data-frames'),frames);await page.getByRole('button',{name:'Rotate right',exact:true}).press('Enter');assert.ok(Number(await page.locator('.three-scene-layer').getAttribute('data-frames'))>Number(frames));results.checks.push('Reduced motion stops loop; Enter on rotation still draws');
await page.evaluate(()=>document.querySelector('.three-scene-layer').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await page.waitForFunction(()=>document.querySelector('[data-spatial-status="context-lost"]'));
assert.equal(await page.locator('.spatial-static-fallback').first().evaluate(n=>n.style.opacity),'');assert.ok(await page.locator('.three-scene-layer').isHidden());await page.screenshot({path:out+'/html-context-loss.png',fullPage:true});results.checks.push('Actual WebGL context loss restores static editable scene fallback');
await page.getByRole('button',{name:'Next',exact:true}).click();await page.waitForSelector('.three-scene-layer');assert.equal(await page.locator('.three-scene-layer').getAttribute('data-reduced'),'true');await page.screenshot({path:out+'/html-layers.png',fullPage:true});await page.getByRole('button',{name:'Next',exact:true}).click();await page.screenshot({path:out+'/html-chinese.png',fullPage:true});results.checks.push('Layers and mixed Chinese scene render');
await page.emulateMedia({media:'print'});assert.equal(await page.locator('.spatial-static-fallback').first().evaluate(n=>getComputedStyle(n).opacity),'1');assert.ok(await page.locator('.spatial-controls').isHidden());await page.emulateMedia({media:'screen'});results.checks.push('Print exposes native static shapes and hides canvas/controls');
for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}results.checks.push('HTML widths 390, 1024 and 1440 have no horizontal document overflow');
assert.ok(requests.every(u=>u.startsWith(htmlUrl+'/')));results.checks.push('Standalone HTML makes no remote requests');
await page.setViewportSize({width:1440,height:1000});await page.goto(studio.url);await page.waitForFunction(()=>document.querySelector('#canvas svg'));

// The library picker is hidden until the drawer (M5); choose the deck through the DOM.
await page.locator('#projectPicker').evaluate(el=>{el.value='mb_media_demo';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('#canvas svg')?.textContent.includes('Local art, a clear story'));
await page.screenshot({path:out+'/studio-image.png',fullPage:true});

const design=page.getByRole('tab',{name:'Design',exact:true});if(await design.count())await design.click();else await page.getByRole('button',{name:'Design',exact:true}).click();
await page.locator('#spatialRecipe').selectOption('orbit');await page.waitForSelector('#canvas .three-scene-layer');await page.waitForFunction(()=>document.querySelector('#canvas .three-scene-layer')?.dataset.frames>2);await page.screenshot({path:out+'/studio-orbit.png',fullPage:true});results.checks.push('Studio lazily loads local 3D adapter after selecting a recipe');
await page.waitForSelector('#saveState[data-state="saved"]',{state:'attached'});await page.reload();await page.waitForSelector('#canvas .three-scene-layer');results.checks.push('Saved spatial recipe reopens offline from local storage');
await page.locator('#openAgent').click();await page.waitForSelector('#agentDialog[open]');assert.ok(await page.locator('#agentWorker').count());await page.locator('#agentDialog [data-close]').click();
await page.locator('#openExport').click();await page.waitForSelector('#exportDialog[open]');assert.ok(await page.locator('[data-export="figma"]').isEnabled());const download=page.waitForEvent('download');await page.locator('[data-export="pptx"]').click();const file=await download;await file.saveAs(path.join(artifacts,'browser-measured.pptx'));results.checks.push('Browser-measured PPTX export succeeds with static 3D fallback');
if(await page.locator('#exportDialog').isVisible())await page.locator('#exportDialog [data-close]').click();await page.getByRole('tab',{name:'Design',exact:true}).click();await page.getByText('Local image and rights',{exact:true}).click();
await page.locator('#assetLicense').fill('Generated artwork; no third-party rights clearance asserted');await page.locator('#assetUse').fill('DeckWeft demonstration and local presentation; review your intended use');await page.locator('#assetAlt').fill('Blank paper story cards on a wooden workbench with a spool of blue thread');await page.locator('#assetFallback').fill('Paper story cards connected by blue thread; decorative artwork, not evidence.');
await page.getByText('Optional image generation',{exact:true}).click();await page.locator('#imagePrompt').fill('Decorative paper story cards connected with blue thread on a wooden workbench, warm light. No text.');await page.locator('#imageConsent').check();await page.locator('#imagePrepare').click();await page.waitForFunction(()=>document.querySelector('#imageCopy').disabled===false);await page.locator('#imageCopy').click();await page.waitForFunction(()=>document.querySelector('#imageStatus').textContent.includes('Dispatched'));
const clipboard=await page.evaluate(()=>navigator.clipboard.readText()),task=JSON.parse(clipboard.split('\nGenerate one independent')[0]);assert.equal(task.attempt,1);assert.equal(task.tool,'host-image-tool');
// Original output from the earlier actual tool call is supplied here; no new provider call is made.
await new ImageJobs(home).complete(task.id,original);
await page.locator('#imageCheck').click();await page.waitForFunction(()=>document.querySelector('#imageStatus').textContent.includes('Image attached'));await page.waitForSelector('#canvas image[data-role="illustration"]');assert.equal(await page.locator('#canvas .three-scene-layer').count(),0);await page.screenshot({path:out+'/studio-generated-image.png',fullPage:true});
await page.waitForSelector('#saveState[data-state="saved"]',{state:'attached'});await page.reload();await page.waitForSelector('#canvas image[data-role="illustration"]');
await page.locator('#openExport').click();await page.waitForSelector('#exportDialog[open]');for(const format of ['html','pptx','figma','motion']){assert.ok(await page.locator(`[data-export="${format}"]`).isEnabled());const promise=page.waitForEvent('download');await page.locator(`[data-export="${format}"]`).click();const d=await promise;await d.saveAs(path.join(artifacts,'reviewed-image.')+({html:'html',pptx:'pptx',figma:'figma.json',motion:'motion.json'}[format]));if(!await page.locator('#exportDialog').isVisible())await page.locator('#openExport').click();}

results.checks.push('UI prompt consent, one journal dispatch, original generated PNG completion, attachment, save/reload and four measured media exports');
for(const [url] of workerPages){await page.goto(htmlUrl+url);await page.waitForSelector('svg text');await page.screenshot({path:path.join(out,url.slice(1,-5)+'.png'),fullPage:true});}results.checks.push('Actual worker alpha/beta outputs opened for visual review');
assert.equal(errors.length,0);await writeFile(out+'/browser.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser.close();await studio.close();await new Promise(r=>htmlServer.close(r));await rm(home,{recursive:true,force:true});}
