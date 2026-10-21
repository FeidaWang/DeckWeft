import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import {exportDeck} from '../src/render/export.mjs';
import {themePacks} from '../src/design/theme-registry.mjs';
import {applySceneTheme,applyScenePalette} from '../src/design/profile.mjs';
import {paletteIds} from '../src/design/palette-registry.mjs';
import {evidenceShare,EVIDENCE_SHARE,FIGURE_LED,layoutFamilyOf} from '../src/design/attention-policy.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {cineProject} from './cine-corpus.mjs';
import {dwiSliceProject,DWI_VALUES} from './dwi-slice.mjs';
/** DWI-032 (workpacks/wes-instrument/TASKS.md): evidence keeps its space, its values and its colours through layout, theme and palette changes. */
const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-dwi-032-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const html=(p,resources={})=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:resources});
/** What a chart says, colours removed: point labels, the data table, notes and the accessible summary. */
const chartFacts=markup=>[...markup.matchAll(/<figure class="chart"[\s\S]*?<\/figure>/g)].map(m=>m[0].replace(/<style[\s\S]*?<\/style>/g,'').replace(/(fill|stroke|stop-color|color)="[^"]*"/g,'').replace(/style="[^"]*"/g,'').replace(/<svg[\s\S]*?<\/svg>/g,s=>[...s.matchAll(/>([^<>]+)</g)].map(t=>t[1]).join('|')));

test('values, nulls, units, axis policies and the data table are identical in every theme and palette mode',async()=>{
 const base=await dwiSliceProject('en'),ref=chartFacts(html(base).body.toString());
 assert.ok(ref.length>=3);assert.ok(ref[0].includes('not collected'),'the null is stated as missing');
 for(const pack of themePacks()){let p=base;for(const s of p.plan.scenes)if(s.id!=='mechanism')p=applySceneTheme(p,s.id,pack.id);
  assert.deepEqual(p.document.datasets,base.document.datasets,pack.id);
  for(const b of p.document.blocks.filter(b=>b.type==='chart'))assert.deepEqual(b.axis,base.document.blocks.find(x=>x.id===b.id).axis);
  const facts=chartFacts(html(p).body.toString());assert.equal(facts.length,ref.length);for(const f of facts){for(const v of DWI_VALUES.teamA)assert.ok(facts.join('').includes(String(v)));}
 }
 for(const id of paletteIds())for(const mode of ['light','dark','stage']){let p=base;for(const s of p.plan.scenes)p=applyScenePalette(p,s.id,{id,registryVersion:1,mode});
  assert.deepEqual(chartFacts(html(p).body.toString()),ref,`${id}/${mode}`);}
});

test('a palette never recolours an image: no filter or blend, the same bytes, an evidence screenshot stays whole',async()=>{
 const p=await cineProject('en',home),resources=await visualAssetResources(p,home);
 const tinted=applyScenePalette(applyScenePalette(p,'product',{id:'Moonrise3',registryVersion:1,mode:'dark'}),'product-center',{id:'Moonrise3',registryVersion:1,mode:'stage'});
 const a=html(p,resources),b=html(tinted,resources);
 const imgs=out=>[...out.body.toString().matchAll(/<img\b[^>]*>/g)].map(m=>m[0].replace(/ style="[^"]*"/,''));
 assert.deepEqual(imgs(b),imgs(a),'image elements, sources and crops unchanged');
 const section=(out,id)=>out.sceneMarkup[out.scenes.findIndex(s=>s.id===id)];
 for(const id of ['product','product-center'])assert.ok(!/filter:|mix-blend-mode|background-blend-mode/.test(section(b,id).match(/style="([^"]+)"/)[1]),id);
 assert.match(section(b,'product-center'),/data-palette="Moonrise3"/);
 assert.deepEqual(tinted.plan.scenes.find(s=>s.id==='product-center').crops,p.plan.scenes.find(s=>s.id==='product-center').crops,'the evidence screenshot keeps its whole-image crop');
});

test('evidence share: the measured useful area its evidence takes, reported against the 45–65 % default band',()=>{
 const r=(blockId,component,x,y,width,height)=>({blockId,component,bounds:{x,y,width,height}});
 const scene={regions:[r('h','heading',0,0,1000,100),r('c','chart',0,100,600,500),r('p','paragraph',600,100,400,200),r('cite','citation',0,600,1000,30)]};
 const e=evidenceShare(scene);assert.equal(e.usefulArea,1000*630);assert.equal(e.evidenceArea,300000);assert.ok(Math.abs(e.share-300000/630000)<1e-12);assert.deepEqual(e.blocks,['c']);
 assert.deepEqual(evidenceShare({regions:[]}),{share:0,evidenceArea:0,usefulArea:0,blocks:[]});
 assert.deepEqual(EVIDENCE_SHARE,{min:.45,max:.65});assert.deepEqual(FIGURE_LED,['assertion-evidence','evidence-chart','workflow','mechanism']);
});

test('the figure-led pages of the slice are figure-led',async()=>{
 const p=await dwiSliceProject('en');
 assert.deepEqual(p.plan.scenes.filter(s=>FIGURE_LED.includes(layoutFamilyOf(p.document,s))).map(s=>s.id),['assertion','chart','workflow','mechanism']);
});
