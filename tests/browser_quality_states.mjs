// Supplementary native-size responsive state screenshots from the captured HTML.
import {realpath,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const executablePath=await realpath(process.env.CHROMIUM_PATH||'');if(/[\\/]Applications[\\/]/i.test(executablePath)||/[\\/]Applications[\\/]/i.test(process.env.CHROMIUM_PATH))throw Error('Use an isolated testing binary outside Applications.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module),out=path.resolve('dist/visual-quality'),name='zh-CN-electric-violet',body=await readFile(path.join(out,name+'.html'));
const server=http.createServer((req,res)=>{if(req.headers.host!==`127.0.0.1:${server.address().port}`||req.url!=='/deck.html'){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html'});res.end(body);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({executablePath,headless:true}),page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(external.push(r.request().url()),r.abort()));
const report={ok:false,captures:[]};try{
 for(const width of [390,1024]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/deck.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');const source=await page.locator('#dw-runtime-data').textContent();
 const code=page.locator('[data-block-id="component-code"]');await code.locator('[data-step-id="difference"]').press('Enter');assert.equal(await code.locator('[data-step-id="difference"]').getAttribute('aria-pressed'),'true');
 const diagram=page.locator('[data-block-id="component-process"]');await diagram.locator('[data-step-id="revise"]').click();assert.equal(await diagram.locator('[data-step-id="revise"]').getAttribute('aria-pressed'),'true');
 const chart=page.locator('[data-block-id="component-line"]');await chart.locator('input[type="checkbox"]').first().uncheck();assert.equal(await chart.locator('.full-source-data tbody tr').count(),4);assert.equal(await page.locator('#dw-runtime-data').textContent(),source);
 for(const id of ['component-code','component-process','component-line']){const file='responsive-'+width+'-'+id+'.png';await page.locator('#'+id).screenshot({path:path.join(out,file)});report.captures.push(file);}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.ok=true;report.checks=['Keyboard-selected exact code explanation','Actual process return-path selection','Series checkbox changes active chart and preserves complete source rows','Immutable runtime source; no document overflow at 390/1024'];
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(path.join(out,'responsive-states.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
