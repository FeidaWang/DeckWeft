// DWI-020/022 (workpacks/wes-instrument): Add material → Review story → Make slides in the visual Studio, driven like an author.
// Two text files go in, a PDF is refused with its recovery, the outline shows locators and the contradiction, a heading is renamed
// and a point dropped, one of three directions is chosen, and "Make slides" opens a new deck while the open deck stays unchanged.
// Optional QA: isolated browser + external Playwright module. EVIDENCE_DIR=<folder> saves screenshots and report.json.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,mkdtemp,realpath,writeFile} from 'node:fs/promises';
import {startStudio} from '../src/services/server.mjs';
import {revealStudio} from './studio-controls.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),shots=process.env.EVIDENCE_DIR?path.resolve(process.env.EVIDENCE_DIR):path.join(root,'dist/dwi-story');await mkdir(shots,{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const report={browser:'',checks:[],errors:[],externalRequests:[],screenshots:[]};
const step=text=>{report.checks.push(text);console.log('PASS: '+text);};
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-dwi-story-')));
const app=await startStudio({home,port:0,seed:false}),browser=await chromium.launch({executablePath,headless:true});report.browser=browser.version();
const files={review:{name:'review.md',mimeType:'text/markdown',buffer:Buffer.from('# Results\nMedian review time fell from 44 to 33 minutes.\nTeams found the check useful.\n# Next steps\nShip the checker in round 5\n')},bench:{name:'bench.txt',mimeType:'text/plain',buffer:Buffer.from('Bench notes\nMedian review time fell from 44 to 31 minutes.\n')},pdf:{name:'scan.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n')}};
try{
 const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
 const call=async(route,data,method='POST')=>{const r=await fetch(app.url+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;};
 const open=(await call('/api/visual/demo',{locale:'en'})).project,before=(await call('/api/visual/projects/'+open.id,undefined,'GET')).project;
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(app.url+'/')||url.startsWith('data:')||url.startsWith('blob:')||url.startsWith('about:'))await route.continue();else{report.externalRequests.push(url);await route.abort();}});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const measured=()=>page.waitForFunction(()=>{const c=document.querySelector('#canvas');return c?.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale');},{},{timeout:60000});
 const shoot=async name=>{await page.screenshot({path:path.join(shots,name)});report.screenshots.push(name);};
 await page.goto(app.url+'/?project='+open.id);await measured();
 await revealStudio(page,'agent');
 // A PDF among the files is refused by name with its recovery; nothing is proposed.
 await page.locator('#workbenchSource').setInputFiles([files.review,files.pdf]);
 const proposed=page.waitForResponse(r=>r.url().endsWith('/api/visual/story/propose'));await page.locator('#storyReview').click();
 const answer=await proposed;assert.ok(answer.ok(),await answer.text());await page.locator('#storyDialog').waitFor({state:'visible'});
 assert.match(await page.locator('#storyRefused').textContent(),/scan\.pdf: PDF reading is not enabled/);
 step('a PDF next to a Markdown file is listed in the review with its recovery, not dropped');
 await shoot('story-refused.png');await page.locator('#storyCancel').click();
 await page.locator('#workbenchSource').setInputFiles([files.review,files.bench]);
 await page.locator('#storyReview').click();await page.locator('#storyDialog').waitFor({state:'visible'});
 const headings=await page.locator('.story-heading').evaluateAll(l=>l.map(n=>n.value));assert.deepEqual(headings,['Results','Next steps','Bench notes']);
 assert.match(await page.locator('#storyConflicts').textContent(),/44 \/ 33 minutes \(review\.md, line 2\) ≠ 44 \/ 31 minutes \(bench\.txt, line 2\)/);
 assert.equal(await page.locator('[name=storyDirection]').count(),3);
 assert.match(await page.locator('.story-page').first().textContent(),/review\.md, line 2/);
 step('the outline shows three pages with locators, the contradiction with both values and sources, and three directions');
 await shoot('story-review.png');
 await page.locator('.story-heading[data-page="page-1"]').fill('What changed');
 await page.locator('[data-page="page-1"][data-point="1"]').uncheck();
 await page.locator('[data-keep-page="page-2"]').uncheck();
 await page.locator('[name=storyDirection]').nth(1).check();
 await page.locator('#storyAudience').fill('Engineering leads');await page.locator('#storyOutcome').fill('Approve the checker');
 await shoot('story-edited.png');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/visual/story/approve'));await page.locator('#storyApprove').click();
 const approved=await(await created).json();await measured();
 assert.ok(await page.locator('#storyDialog').isHidden());
 const p=approved.project;assert.notEqual(p.id,open.id);assert.equal(p.plan.scenes.length,2);
 const text=p.document.blocks.map(b=>b.text??'').join('\n');assert.ok(text.includes('What changed')&&!text.includes('Teams found')&&!text.includes('Ship the checker'));
 assert.equal(p.document.visualBrief.audience,'Engineering leads');assert.equal(p.extensions.deckweftIntake.outcome,'Approve the checker');assert.ok(p.plan.scenes.every(s=>s.contentStatus==='evidence-required'));
 step('Make slides opens a new two-page deck: renamed heading, dropped point and page absent, audience and outcome kept, pages marked evidence-required');
 await shoot('story-deck.png');
 assert.deepEqual((await call('/api/visual/projects/'+open.id,undefined,'GET')).project,before);
 step('the deck that was open is unchanged in the library');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);step('no page errors and no external requests');
}finally{await writeFile(path.join(shots,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await app.close();}
