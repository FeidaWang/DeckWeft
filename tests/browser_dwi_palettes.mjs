// DWI-060 (workpacks/wes-instrument): every seed palette in every mode, rendered in isolated Chromium. The six-page slice is drawn
// with one palette and mode on all pages (22 × 3 = 66 decks, both languages for light), measured after fonts are ready, and checked
// with the existing render check (text coverage, fit, overflow, contrast, missing glyphs). A contact sheet of page 1 per palette and
// mode is written for review. Optional QA: isolated browser + external Playwright module. EVIDENCE_DIR=<folder> keeps the results.
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,realpath,writeFile} from 'node:fs/promises';
import {exportDeck} from '../src/render/export.mjs';
import {paletteIds} from '../src/design/palette-registry.mjs';
import {applyScenePalette} from '../src/design/profile.mjs';
import {inspectRenderedPage,checkRender} from '../src/quality/render-checks.mjs';
import {dwiSliceProject} from './dwi-slice.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),shots=process.env.EVIDENCE_DIR?path.resolve(process.env.EVIDENCE_DIR):path.join(root,'dist/dwi-palettes');await mkdir(path.join(shots,'pages'),{recursive:true});
if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH to a cached isolated testing browser outside Applications.');
const executablePath=await realpath(process.env.CHROMIUM_PATH);if(/[\\/]Applications[\\/]/i.test(executablePath))throw Error('Installed browser apps are read-only; use an isolated test binary.');
const module=process.env.PLAYWRIGHT_MODULE||'playwright',{chromium}=await import(path.isAbsolute(module)?pathToFileURL(module).href:module);
const browser=await chromium.launch({executablePath,headless:true}),report={browser:browser.version(),decks:[],external:[],errors:[]};
const pages=new Map(),origin='http://dwi-palettes.invalid';
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
await context.route('**/*',async route=>{const url=route.request().url(),body=pages.get(url);if(body)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body});if(url.startsWith('data:')||url.startsWith('blob:'))return route.continue();report.external.push(url);return route.abort();});
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
try{
 const runs=[...paletteIds().flatMap(id=>['light','dark','stage'].map(mode=>({id,mode,locale:'en'}))),...paletteIds().map(id=>({id,mode:'light',locale:'zh-CN'}))];
 for(const r of runs){
  let p=await dwiSliceProject(r.locale);for(const s of p.plan.scenes)p=applyScenePalette(p,s.id,{id:r.id,registryVersion:1,mode:r.mode});
  const name=`${r.id}-${r.mode}-${r.locale}`,url=`${origin}/${name}.html`;pages.set(url,exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}}).body.toString());
  await page.goto(url);await page.waitForFunction(()=>document.body.dataset.ready==='true',{},{timeout:30000});await page.evaluate(()=>document.fonts.ready);
  const observation=await page.evaluate(inspectRenderedPage),check=checkRender(p,[observation]);
  const kinds={};for(const i of check.issues.filter(i=>i.severity!=='warning'))kinds[i.kind]=(kinds[i.kind]||0)+1;
  report.decks.push({palette:r.id,mode:r.mode,locale:r.locale,issues:check.issues.filter(i=>i.severity!=='warning').length,kinds,warnings:check.issues.filter(i=>i.severity==='warning').length});
  if(r.locale==='en'){await page.locator('section.web-scene').first().screenshot({path:path.join(shots,'pages',`${name}.png`),scale:'css'});}
  pages.delete(url);
 }
 // Contact sheet: 22 rows (palettes) × 3 columns (light, dark, stage) of page 1.
 const cells=paletteIds().map(id=>`<tr><th>${id}</th>${['light','dark','stage'].map(m=>`<td><img src="pages/${id}-${m}-en.png"></td>`).join('')}</tr>`).join('');
 await writeFile(path.join(shots,'contact.html'),`<!doctype html><meta charset="utf-8"><style>body{font:12px sans-serif;margin:8px}img{width:300px;display:block}th{text-align:left;padding-right:8px}</style><table><tr><th></th><th>light</th><th>dark</th><th>stage</th></tr>${cells}</table>`);
 // The sheet is local files only; it opens in a context without the page router so its images load from disk.
 const plain=await browser.newContext({viewport:{width:1000,height:800}}),sheet=await plain.newPage();await sheet.goto(pathToFileURL(path.join(shots,'contact.html')).href);await sheet.waitForLoadState('load');await sheet.screenshot({path:path.join(shots,'contact.png'),fullPage:true});await plain.close();
 const failing=report.decks.filter(d=>d.issues);
 console.log(JSON.stringify({decks:report.decks.length,withIssues:failing.length,kinds:failing.reduce((a,d)=>{for(const [k,v] of Object.entries(d.kinds))a[k]=(a[k]||0)+v;return a;},{}),errors:report.errors.length,external:report.external.length}));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);
}finally{await writeFile(path.join(shots,'report.json'),JSON.stringify(report,null,1)+'\n');await browser.close();}
