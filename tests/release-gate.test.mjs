import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {GALLERY_PAGES,STORY_COMPOSITIONS,THEMES,LOCALES,WCAG_143,releaseProject,releaseGallery,releaseStory,releaseAssets} from './release-gate.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {compositions} from '../src/design/compositions.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {chart} from '../src/render/web/components/chart.mjs';
import {diagram} from '../src/components/diagrams/render.mjs';
import {resolveTheme} from '../src/design/theme-registry.mjs';
import {css,interactionCSS} from '../src/render/web/styles.mjs';
import {compositionCSS} from '../src/render/web/compositions.mjs';
import {artDirectionCSS} from '../src/render/web/art-direction.mjs';

const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s6-gate-')));
test.after(()=>rm(home,{recursive:true,force:true}));
const assets=await releaseAssets(home);
const ids=p=>({blocks:p.document.blocks.map(b=>b.id),datasets:p.document.datasets.map(d=>d.id),sources:p.document.sources.map(s=>s.id),scenes:p.plan.scenes.map(s=>s.id)});
const html=async p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:await visualAssetResources(p,home)}).body;
/** The facts a theme must not touch: every data table, every source link and every citation, in document order. */
const facts=body=>({tables:body.match(/<tbody>[\s\S]*?<\/tbody>/g)||[],links:[...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m=>m[1]).filter(u=>!u.startsWith('#')),citations:[...body.matchAll(/data-component="citation"[\s\S]*?<\/div>/g)].map(m=>m[0].replace(/<[^>]+>/g,''))});

test('VIS-014 gallery is the frozen requirements §9 set: 12 pages, four per theme, the same ids in both languages',async()=>{
 assert.equal(GALLERY_PAGES.length,12);
 assert.deepEqual(GALLERY_PAGES.map(p=>p.theme),[...Array(4).fill('cream-collage'),...Array(4).fill('electric-violet'),...Array(4).fill('dark-data')]);
 const [en,zh]=await Promise.all(LOCALES.map(locale=>releaseProject('gallery',locale,home)));
 for(const p of [en,zh]){
  assertVisualProject(p);
  assert.deepEqual(p.plan.scenes.map(s=>[s.id,s.theme,s.composition]),GALLERY_PAGES.map(g=>[g.id,g.theme,g.composition]));
 }
 assert.deepEqual(ids(en),ids(zh));
 // Numbers never change with the language.
 assert.deepEqual(en.document.datasets.map(d=>d.series.map(s=>s.values)),zh.document.datasets.map(d=>d.series.map(s=>s.values)));
});

test('VIS-014 facts, data tables and sources are identical across the three themes',async()=>{
 for(const locale of LOCALES){
  // Gallery: every page drawn in every theme.
  const gallery=await releaseProject('gallery',locale,home),byTheme=[];
  for(const theme of THEMES){let p=gallery;for(const s of gallery.plan.scenes)p=applySceneTheme(p,s.id,theme);assert.deepEqual(p.document,gallery.document,theme);byTheme.push(facts(await html(p)));}
  assert.deepEqual(byTheme[1],byTheme[0]);assert.deepEqual(byTheme[2],byTheme[0]);
  // Story: one document, three plans that differ only in theme, composition and colour mode.
  const stories=await Promise.all(THEMES.map(theme=>releaseProject('story',locale,home,theme)));
  const plain=p=>p.plan.scenes.map(({theme,composition,colorMode,...rest})=>rest);
  // Each project has its own id; everything else in the document is the same.
  const content=p=>({...p.document,id:null});
  for(const p of stories.slice(1)){assert.deepEqual(content(p),content(stories[0]));assert.deepEqual(plain(p),plain(stories[0]));}
  const storyFacts=await Promise.all(stories.map(async p=>facts(await html(p))));
  assert.deepEqual(storyFacts[1],storyFacts[0]);assert.deepEqual(storyFacts[2],storyFacts[0]);
  assert.ok(storyFacts[0].tables.length>=2&&storyFacts[0].links.length>=3);
 }
});

test('VIS-014 content carries the required stress cases in both languages',()=>{
 for(const locale of LOCALES){
  const {document}=releaseGallery(locale,assets),text=JSON.stringify(document.blocks)+JSON.stringify(document.datasets);
  assert.ok([...document.blocks.find(b=>b.id==='cover-title').text].length>=(locale==='en'?60:20),'a long title');
  assert.match(text,/苹方/);assert.match(text,/宋体/);assert.match(text,/Asia\/Shanghai/);
  assert.match(text,/٣٦/);assert.match(text,/３６/);assert.match(text,/三十六/);assert.match(text,/1,440 px/);assert.match(text,/"unit":"ms"/);
  assert.ok(document.sources.some(s=>s.url.startsWith('https://github.com/')),'a source URL');
  // A constrained block: the evidence rail callout beside a chart.
  assert.ok(document.blocks.some(b=>b.id==='trend-rail'&&b.type==='callout'));
 }
 assert.match(JSON.stringify(releaseGallery('en',assets).document.blocks),/incomprehensibilities/,'a long English word');
});

test('VIS-014 numbers are sourced or marked synthetic; the only quotation is verbatim and attributed',()=>{
 for(const locale of LOCALES){
  for(const {document,plan} of [releaseGallery(locale,assets),...THEMES.map(theme=>releaseStory(locale,theme,assets))]){
   for(const d of document.datasets){assert.equal(d.synthetic,true,d.id);assert.deepEqual(d.sourceIds,['synthetic'],d.id);}
   for(const s of plan.scenes.filter(s=>s.contentStatus==='sourced'))for(const id of s.blockIds){const b=document.blocks.find(b=>b.id===id);assert.ok(!b.sourceIds.includes('synthetic'),s.id+' '+id);}
   const quotes=document.blocks.filter(b=>b.type==='quote');
   for(const q of quotes){assert.equal(q.text,WCAG_143);assert.deepEqual(q.sourceIds,['wcag22']);assert.ok(document.sources.find(s=>s.id==='wcag22').url.startsWith('https://www.w3.org/TR/WCAG22/'));}
   for(const b of document.blocks.filter(b=>b.type==='image'))assert.equal(b.factual,false,'generated or code-drawn artwork is never presented as a photograph');
  }
 }
});

test('VIS-014 stories use at least four families without a third identical page in a row, and the gate covers four interaction kinds',()=>{
 const familyOf=id=>compositions.find(c=>c.id===id)?.family||id;
 for(const theme of THEMES){
  const order=Object.values(STORY_COMPOSITIONS[theme]),families=order.map(familyOf);
  assert.ok(new Set(families).size>=4,theme);
  for(let i=2;i<order.length;i++)assert.ok(!(order[i]===order[i-1]&&order[i]===order[i-2]),theme);
 }
 const kinds=new Set([releaseGallery('en',assets),releaseStory('en','dark-data',assets)].flatMap(p=>p.plan.scenes.flatMap(s=>(s.interactions||[]).map(i=>i.kind))));
 assert.deepEqual([...kinds].sort(),['chart-select','image-compare','image-hotspots','steps']);
});

test('S6 renderer fixes from the gallery: trend time labels, heatmap row labels, linear processes, cover citation, metric numbers, pair labels',()=>{
 const theme=resolveTheme('dark-data','1.0.0','en'),doc=d=>({locale:'en',datasets:[d]});
 // Trend: a long first and last time label never share a line.
 const trend={id:'t',type:'chart',datasetId:'d',chartType:'line',labels:'end',axis:{policy:'zero'},sourceIds:[]},times={id:'d',unit:'ms',synthetic:true,sourceIds:[],categoryKind:'datetime',timeZone:'Asia/Shanghai',categories:['2026-10-19T01:00:00Z','2026-10-19T06:00:00Z'],categoryIds:['a','b'],series:[{id:'s',label:'1,440 px',values:[800,360]},{id:'r',label:'390 px',values:[1100,500]}]};
 const out=chart(trend,doc(times),theme,{sceneId:'x'}),labels=[...out.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*data-conclusion-label="true">(Oct[^<]*)<\/text>/g)].map(m=>Number(m[1]));
 assert.equal(labels.length,2);assert.ok(labels[1]-labels[0]>=22*1.45-1e-9,'the last time label takes its own line');assert.match(out,/viewBox="0 0 600 388"/);
 // Heatmap: the left margin fits the longest row label.
 const heat={id:'h',type:'chart',datasetId:'d',chartType:'heatmap',axis:{policy:'zero'},sourceIds:[]},rows={id:'d',unit:'n',synthetic:true,sourceIds:[],categories:['a','b'],categoryIds:['a','b'],series:[{id:'c',label:'Electric Violet',values:[1,2]},{id:'d',label:'Dark',values:[3,4]}]};
 const x=Number(chart(heat,doc(rows),theme,{sceneId:'x'}).match(/<text x="([\d.]+)" y="[\d.]+" text-anchor="end">Electric Violet<\/text>/)[1]);
 assert.ok(x-'Electric Violet'.length*10.5>=0,'the label starts inside the frame');
 const short={...rows,series:rows.series.map(s=>({...s,label:'Local'}))};assert.match(chart(heat,doc(short),theme,{sceneId:'x'}),/<text x="90" y="[\d.]+" text-anchor="end">Local<\/text>/,'short labels keep the original margin');
 // Linear process: one row, straight arrows, whole words.
 const chain={id:'p',type:'diagram',diagramType:'process',sourceIds:[],nodes:[{id:'a',label:'Measure'},{id:'b',label:'Modular build plan'},{id:'c',label:'Review'},{id:'d',label:'Export'}],edges:[{id:'e1',from:'a',to:'b'},{id:'e2',from:'b',to:'c'},{id:'e3',from:'c',to:'d'}]};
 const linear=diagram(chain,{locale:'en'},theme,{sceneId:'x'});
 assert.match(linear,/data-linear-diagram="true"/);assert.equal(new Set([...linear.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="190"/g)].map(m=>m[1])).size,1);
 assert.equal((linear.match(/ d="M[\d.]+ [\d.]+H[\d.]+"/g)||[]).length,3);assert.ok([...linear.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(m=>m[1]).includes('Modular build'));
 const loop=diagram({...chain,edges:[...chain.edges,{id:'e4',from:'d',to:'a'}]},{locale:'en'},theme,{sceneId:'x'});assert.doesNotMatch(loop,/data-linear-diagram/,'a loop keeps the grid layout');
 // CSS: cover citation on the paper side, metric numbers never split, the compare panel keeps the After label in both languages, linear diagrams uncapped.
 assert.match(css,/\.diagonal-cover \.regions>\.region\[data-component=citation\]\{grid-column:1\}/);
 assert.match(css,/padding:90px 0 0 clamp\(24px,calc\(9vw - 30px\),100px\)/);
 assert.match(artDirectionCSS,/\.web-scene \.metric strong\{[^}]*overflow-wrap:normal;word-break:keep-all/);
 assert.match(compositionCSS,/\.compare-panel \.web-image~\.web-image::before\{content:"After"\}/);assert.match(compositionCSS,/:lang\(zh-CN\) \.compare-panel \.web-image~\.web-image::before\{content:"之后"\}/);
 assert.match(interactionCSS,/\.has-interactions \.semantic-diagram svg\[data-linear-diagram\]\{max-width:800px\}/);
});
