import {revealStudio,closeStudio} from './studio-controls.mjs';
// Real UI + dependency-free capture; offline evidence fixtures are display/transport checks only.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {startStudio} from '../src/services/server.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
const {values:a}=parseArgs({options:{live:{type:'boolean'},out:{type:'string'},review:{type:'string'}}}),out=path.resolve(a.out||'dist/workbench-acceptance');await mkdir(out,{recursive:true});const home=await realpath(path.join(out,'library').replace(/\/$/,'' )).catch(async()=>{await mkdir(path.join(out,'library'));return realpath(path.join(out,'library'));});
const binary=await realpath(process.env.CHROMIUM_PATH||'');assert.ok(!/\/Applications\//i.test(binary));const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),store=await new VisualProjectStore(home).init();let source;
const ids=(await store.list()).filter(p=>!p.unreadable);if(ids.length)source=await store.get(ids[0].id);else{source=await createCompositionDemo('en',store.home);source.document.authorOverrides.lockedBlockIds.push('violet-image');source.document.authorOverrides.sceneLocks=[{sceneId:'chapter',fields:['theme','composition']}];source.document.migration={sourceHash:'a'.repeat(64),original:{privateSpeakerNotes:'PRIVATE-NOTES-VIS013-DO-NOT-PUBLISH'},limitations:['QA private-note sentinel, not audience material.']};source=await store.save(source,{create:true});}
const app=await startStudio({home,port:0,captureBrowser:binary}),browser=await chromium.launch({executablePath:binary,headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(app.url+'/')||r.request().url().startsWith('data:')||r.request().url().startsWith('blob:')?r.continue():(external.push(r.request().url()),r.abort()));
const session=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+session.token,Origin:app.url,'Content-Type':'application/json'};
const api=async(route,data,method='POST')=>{const r=await fetch(app.url+'/api/visual/'+route,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});if(!r.ok)throw Error(JSON.stringify(await r.json()));return r;};
let report={ok:false,browser:browser.version(),liveHost:!!a.live,errors,externalRequests:external};
try{
 // Single entry step 3: the prompt workbench sits in More · Let the assistant write for me. The image review (capture checkbox,
 // gallery, author form, evidence report button) left the browser for the release gate; those steps run through the same
 // workbench API here, and the browser keeps showing what they record (F3 added lines, F5 attestations).
 const measured=()=>page.waitForFunction(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale');},{},{timeout:30000});
 const settle=async r=>{for(let k=0;k<1500&&r.running;k++){await new Promise(z=>setTimeout(z,200));r=await(await api('workbench/'+r.id,undefined,'GET')).json();}return r;};
 await page.goto(app.url+'/?project='+source.id);await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#sceneTitle').textContent.length>0);
 await revealStudio(page,'agent');if(!await page.locator('#workbenchPreferences').evaluate(n=>n.open))await page.locator('#workbenchPreferences summary').click();
 await page.locator('#workbench-visualStyle').selectOption('electric-violet');
 if(a.review){
  await page.locator('#workbenchUseSource').click();await page.waitForFunction(()=>!!document.querySelector('#workbenchProgress').dataset.status&&document.querySelector('#workbenchProgress').dataset.status!=='running',{},{timeout:300000});
  let r=await settle(await(await api('workbench/'+(await store.get(source.id)).extensions.deckweftWorkbench.id,undefined,'GET')).json());const supplied=JSON.parse(await readFile(a.review,'utf8'));assert.equal(r.receipt.id,supplied.receiptId);
  r=await settle(await(await api('workbench/'+r.id+'/action',{expectedSequence:r.sequence,action:'review',host:'local',review:{attestation:'author',reviewer:'Local author',delivery:'Author explicitly attested actual inspection of every captured image; native image files supplied',images:r.receipt.captures.map(c=>c.file),judgment:supplied.judgment,verdict:'pass'}})).json());assert.equal(r.canExport,true);
 }else{
  if(a.live){await page.locator('#workbenchHost').selectOption('codex');await page.locator('#workbenchConsent').check();}
  await page.locator('#workbenchPrompt').fill('Keep all exact supplied facts, sources and private-note boundaries. Review this local diagnostic story.');await page.locator('#workbenchUseSource').click();
  await page.waitForFunction(()=>['browser-capture','exported','actual-image-review','quality-repair','blocked'].includes(document.querySelector('#workbenchProgress').dataset.status),{},{timeout:300000});
  // The capture the browser no longer asks for: one inspect action with capture, as the release gate runs it.
  if(!a.live){const r=await(await api('workbench/'+(await store.get(source.id)).extensions.deckweftWorkbench.id,undefined,'GET')).json();if(r.status==='browser-capture')await settle(await(await api('workbench/'+r.id+'/action',{expectedSequence:r.sequence,action:'inspect',host:'local',live:false,capture:true})).json());}
 }
 let project=(await store.get(source.id)),id=project.extensions.deckweftWorkbench.id,r=await(await api('workbench/'+id,undefined,'GET')).json();await writeFile(path.join(out,'before.json'),JSON.stringify(r,null,2));assert.equal(r.receipt.checks.ok,true,JSON.stringify(r.receipt.checks.issues));assert.deepEqual(r.project.document.authorOverrides,source.document.authorOverrides);assert.equal(r.project.document.blocks.find(b=>b.id==='violet-image').assetId,source.document.blocks.find(b=>b.id==='violet-image').assetId);
 const stripped=structuredClone(r.project);delete stripped.extensions.deckweftWorkbench;const bypass=await fetch(app.url+'/api/visual/export',{method:'POST',headers,body:JSON.stringify({project:stripped,format:'html'})});assert.equal(bypass.status,409);
 if(!a.live&&!a.review){
  assert.equal(r.status,'actual-image-review');
  // F3: a labelled offline checkpoint fixture, including a heading, duplicate and HTML-shaped data.
  const file=path.join(store.home,'workbench',id,'checkpoint.json'),fixture=JSON.parse(await readFile(file,'utf8')),sceneId=r.project.plan.scenes[0].id;
  const lines=[r.project.document.blocks.find(b=>b.id===r.project.plan.scenes[0].focalBlockId).text,'<img src=x onerror="throw Error(123)">','Repeated added line','Repeated added line'];
  fixture.task.hostDraft={hostAuthoredLines:4,hostAuthored:lines.map(text=>({page:0,text}))};await writeFile(file,JSON.stringify(fixture));
  const thumb=page.locator('#slideList [data-slide="'+sceneId+'"]');
  await page.reload();await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(id=>/Host added · 4/.test(document.querySelector('#slideList [data-slide="'+id+'"] .thumbnail-mark')?.textContent||''),sceneId);
  assert.match(await thumb.locator('.thumbnail-mark').textContent(),/Host added.*4/);
  assert.match(await thumb.getAttribute('aria-label'),/Host added.*4.*unverified/);
  await thumb.click();await revealStudio(page,'edit');
  await measured();assert.deepEqual(await page.locator('#hostAuthoredLines [data-host-authored-line]').allTextContents(),lines);assert.equal(await page.locator('#hostAuthoredLines img').count(),0);
  await page.screenshot({path:path.join(out,'host-added-en.png'),fullPage:true});
  // F5: four explicit UI-only fixtures. Never write host attestation into an accepted task. The evidence shows in the drawer and in Take away.
  const route=app.url+'/api/visual/workbench/'+id;
  for(const attestation of ['author','host-metadata-only','host-pixel-control','unattested']){
   await page.route(route,async route=>{const response=await route.fetch(),data=await response.json();data.evidence.review={attestation,verdict:'fail',controls:{hits:attestation==='host-pixel-control'?2:0,total:2}};await route.fulfill({response,json:data});});
   await page.reload();await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(a=>document.querySelector('#workbenchEvidence')?.textContent.includes(a),attestation);
   assert.match(await page.locator('#workbenchEvidence').textContent(),new RegExp((attestation==='host-pixel-control'?'2':'0')+'/2'));
   await revealStudio(page,'agent');await page.locator('#workbenchEvidence').screenshot({path:path.join(out,'attestation-'+attestation+'.png')});await closeStudio(page);
   await page.unroute(route);
  }
  await page.reload();await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>/unattested/.test(document.querySelector('#workbenchEvidence')?.textContent||''));assert.ok(r.receipt.captures.length>0,'the capture is recorded');
  assert.match(await page.locator('#workbenchEvidence').textContent(),/unattested/);assert.match(await page.locator('#workbenchEvidence').textContent(),/not run/);
  // The author's judgment, explicitly *failing*, through the review action (transport evidence, not visual acceptance); the drawer shows it.
  r=await(await api('workbench/'+id+'/action',{expectedSequence:r.sequence,action:'review',host:'local',review:{attestation:'author',reviewer:'Local author',delivery:'Automated author-form transport fixture; native image files supplied',images:r.receipt.captures.map(c=>c.file),judgment:'Automated author-form transport fixture; no human visual acceptance.',verdict:'fail'}})).json();r=await settle(r);
  assert.equal(r.status,'review-required');assert.equal(r.receipt.review.attestation,'author');assert.equal(r.canExport,false);
  await page.reload();await page.waitForSelector('#root.workspace',{state:'attached'});await page.waitForFunction(()=>/author/.test(document.querySelector('#workbenchEvidence')?.textContent||''));await revealStudio(page,'agent');await page.locator('#workbenchEvidence').screenshot({path:path.join(out,'author-form-result.png')});await closeStudio(page);
  // The evidence report, as the release gate downloads it.
  const md=await(await api('workbench/'+id+'/report?format=md',undefined,'GET')).text();await writeFile(path.join(out,'report.md'),md);
  const markdown=await readFile(path.join(out,'report.md'),'utf8');assert.match(markdown,/Host-added lines \| 4/);assert.match(markdown,/author/);assert.match(markdown,/fail/);assert.match(markdown,/not run/);assert.ok(markdown.includes(sceneId));
  const jsonReport=await(await api('workbench/'+id+'/report',undefined,'GET')).json();assert.equal(jsonReport.evidence.hostAuthored.total,4);assert.equal(jsonReport.evidence.review.attestation,'author');await writeFile(path.join(out,'evidence-report.json'),JSON.stringify(jsonReport,null,2));
  report.displayFixtures={addedLines:4,attestations:4,authorForm:'author + fail through the review action; not actual visual acceptance'};
  report.required='Actual primary image inspection followed by --review file';report.receiptId=r.receipt.id;report.captures=r.receipt.captures;report.id=id;await writeFile(path.join(out,'pending.json'),JSON.stringify(report,null,2));
 }
 else{
  assert.equal(r.canExport,true);const initialHTML=await(await api('workbench/'+id+'/export',{})).text();await writeFile(path.join(out,'before.html'),initialHTML);assert.ok(!initialHTML.includes('PRIVATE-NOTES-VIS013'));assert.ok(!initialHTML.includes('promptWorkbench'));assert.ok(initialHTML.includes('id="present"'));
  if(a.live){const previous=structuredClone(r.project),target=previous.plan.scenes[3].composition==='evidence-top'?'evidence-right':'evidence-top';await page.locator('#slideList [data-slide="evidence"]').click();await revealStudio(page,'revision');await page.locator('#workbenchRevision').fill('Make page 4 use '+target+'. Preserve every word, number, source, color and other page.');await page.locator('#workbenchRevise').click();await page.waitForFunction(()=>document.querySelector('#workbenchProgress').dataset.status==='running');await page.waitForFunction(()=>['exported','blocked','quality-repair'].includes(document.querySelector('#workbenchProgress').dataset.status),{},{timeout:300000});r=await(await api('workbench/'+id,undefined,'GET')).json();assert.equal(r.canExport,true,JSON.stringify(r));assert.equal(r.project.plan.scenes[3].composition,target);assert.deepEqual(r.project.document,previous.document);assert.deepEqual(r.project.assets,previous.assets);for(const [i,s]of previous.plan.scenes.entries())if(i!==3)assert.deepEqual(r.project.plan.scenes[i],s);}
  const afterHTML=await(await api('workbench/'+id+'/export',{})).text();await writeFile(path.join(out,'after.html'),afterHTML);if(a.live)assert.notEqual(afterHTML,initialHTML);await writeFile(path.join(out,'after.json'),JSON.stringify(r,null,2));report.exactScope='Only selected page composition changed; source document/assets/other scenes retained';report.hostReview=r.receipt.review;
  if(a.live){await api('workbench/'+id+'/action',{expectedSequence:r.sequence,action:'revise',host:'local',request:'Use statement-center',sceneIds:['chapter']});let failed;for(let k=0;k<100;k++){failed=await(await api('workbench/'+id,undefined,'GET')).json();if(!failed.running)break;await new Promise(r=>setTimeout(r,100));}assert.equal(failed.canExport,false);assert.equal(failed.hasLastValid,true);assert.equal(failed.error.code,'AUTHOR_LOCK');const recovered=await(await api('workbench/'+id+'/export',{lastValid:true})).text();assert.equal(recovered,afterHTML);report.failedRerun={status:failed.status,error:failed.error.code,lastValidExact:true};}
  const stale=await fetch(app.url+'/api/visual/workbench/'+id+'/action',{method:'POST',headers,body:JSON.stringify({expectedSequence:0,action:'inspect'})});assert.equal(stale.status,409);
 }
 for(const [width,height]of [[1600,1100],[390,844]]){await page.setViewportSize({width,height});await measured();await page.screenshot({path:path.join(out,'workbench-'+width+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
 // The interface language is the shell's one switch; the prompt language and tone are gone, the output language is the deck's.
 await revealStudio(page,'library');await page.locator('#uiLanguage').click();await revealStudio(page,'agent');await page.screenshot({path:path.join(out,'workbench-zh.png'),fullPage:true});assert.equal(await page.locator('#workbenchGenerate').textContent(),a.live?'根据需求起草':'排版所提供的原文');assert.equal(await page.locator('#outputLanguage').inputValue(),'en');await closeStudio(page);
 if(!a.live&&!a.review){assert.match(await page.locator('#slideList .thumbnail-mark:not([hidden])').first().textContent(),/宿主新增.*4/);await revealStudio(page,'edit');assert.equal(await page.locator('#hostAuthoredLines [data-host-authored-line]').count(),4);await page.screenshot({path:path.join(out,'host-added-zh-mobile.png'),fullPage:true});await page.locator('#hostAuthoredLines').screenshot({path:path.join(out,'host-added-zh-panel.png')});await closeStudio(page);await revealStudio(page,'agent');await page.locator('#workbenchEvidence').screenshot({path:path.join(out,'author-form-result-zh.png')});await closeStudio(page);}
 report.id=id;report.home=home;report.checkpoint=path.join(store.home,'workbench',id,'checkpoint.json');report.ok=true;assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}
finally{await browser.close();await app.close();await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:report.ok,required:report.required,failure:report.failure,out}));}
