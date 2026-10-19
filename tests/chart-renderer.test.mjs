import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertPresentation} from '../src/core/blocks.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {presentationCapabilities} from '../src/targets/capabilities.mjs';
import {resolveTheme,themePacks} from '../src/design/theme-registry.mjs';
import {chart,chartDash,chartShape} from '../src/components/charts/render.mjs';
import {chartFacts,chartSummary,chartModel} from '../src/components/charts/model.mjs';
import {interactionBundle} from '../src/render/web/interaction-bundle.mjs';
import {interactionCSS,componentCSS} from '../src/render/web/styles.mjs';
import {clippingScript} from '../src/render/web/contrast.mjs';
import {objectAnchor} from '../src/components/annotations/identity.mjs';
import {chartKinds,chartKindsProject,CHART_KIND_SCENES} from './chart-kinds.mjs';
import {evidenceProject} from './evidence-scene.mjs';
const html=p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan}).body;
const rejects=(fn,pattern)=>assert.throws(fn,error=>{assert.equal(error.code,'INVALID_PRESENTATION');assert.match(error.message+JSON.stringify(error.details||[]),pattern);return true;});
const blockOf=(d,id)=>d.blocks.find(b=>b.id===id+'-chart'),dataOf=(d,id)=>d.datasets.find(s=>s.id==='data-'+id);
const theme=(locale,id='dark-data')=>resolveTheme(id,'1.0.0',locale);
const render=(d,id,options={})=>chart(blockOf(d,id),d,theme(d.locale,options.theme),{sceneId:id,...options});
const graphic=s=>s.slice(0,s.indexOf('<details>')),table=s=>s.slice(s.indexOf('<details>'));
const text=s=>s.replace(/<title>[\s\S]*?<\/title>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

test('S4 every new kind and S1 declaration draws in both languages without a refusal',()=>{
 for(const locale of ['en','zh-CN']){
  const p=chartKindsProject(locale),{document:d}=p;
  assert.deepEqual(p.plan.scenes.map(s=>s.id),CHART_KIND_SCENES);
  assert.deepEqual(presentationCapabilities('html',d,{},p.plan).issues,[]);
  const body=html(p);
  for(const id of CHART_KIND_SCENES)assert.ok(body.includes(`data-block-id="${id}-chart"`),id);
  assert.deepEqual(JSON.parse(exportDeck(d,'json',{experimentalWeb:true}).body),d);
  // Every declaration reaches visible text: question, takeaway, definition, dataset identity, truncation note, interval method, events, missing reasons and qualifiers.
  const visible=text(body.replace(/<details>[\s\S]*?<\/details>/g,''));
  for(const b of d.blocks.filter(b=>b.type==='chart')){for(const key of ['question','takeaway'])if(b[key])assert.ok(visible.includes(b[key].replaceAll("'",'&#39;')),key+' '+b.id);if(b.truncation)assert.ok(visible.includes(b.truncation.note),b.id);}
  for(const s of d.datasets){
   for(const v of [s.version,s.collectedAt,s.validPeriod?.from,s.definition?.denominator?.replaceAll("'",'&#39;'),s.definition?.sample])if(v)assert.ok(visible.includes(v),v);
   for(const e of s.events||[])assert.ok(visible.includes(e.label),e.label);
   for(const m of s.missing||[])assert.ok(visible.includes(m.note),m.note);
   for(const q of s.qualifiers||[])assert.ok(visible.includes(q.label),q.label);
   for(const series of s.series.filter(v=>v.interval))assert.ok(visible.includes(series.interval.method),series.interval.method);
  }
 }
});

test('S4 refusal codes stay only where a kind does not draw the declaration',async()=>{
 const {document:d,plan}=chartKinds('en'),codes=doc=>presentationCapabilities('html',doc,{},plan).issues.map(i=>[i.code,i.blockId]);
 const scatter=structuredClone(d);Object.assign(blockOf(scatter,'small-multiples'),{chartType:'scatter'});Object.assign(dataOf(scatter,'small-multiples'),{xUnit:'weeks'});dataOf(scatter,'small-multiples').series.forEach(s=>s.xValues=[1,2,3,4,5,6]);
 assertPresentation(scatter);assert.deepEqual(codes(scatter),[['CHART_EVENTS_UNIMPLEMENTED','small-multiples-chart']]);
 const heat=structuredClone(d);blockOf(heat,'log-line').chartType='heatmap';assertPresentation(heat);assert.deepEqual(codes(heat),[['CHART_SCALE_UNIMPLEMENTED','log-line-chart']]);
 const area=structuredClone(d);Object.assign(blockOf(area,'trend'),{chartType:'area'});delete blockOf(area,'trend').labels;delete blockOf(area,'trend').focus;assertPresentation(area);assert.deepEqual(codes(area),[['CHART_INTERVAL_UNIMPLEMENTED','trend-chart']]);
 // Truncation and sort are drawn for every kind the guards allow, so their codes are gone.
 const source=await readFile(new URL('../src/targets/capabilities.mjs',import.meta.url),'utf8');
 for(const code of ['CHART_TRUNCATION_UNIMPLEMENTED','CHART_SORT_UNIMPLEMENTED'])assert.equal(source.includes(code),false,code);
});

test('S4 guards: focus (C1), end labels, grouped and faceted series, intervals and qualifiers',()=>{
 const {document:d}=chartKinds('en'),edit=fn=>{const copy=structuredClone(d);fn(copy);return copy;};
 assertPresentation(d);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'direct-bar').focus={seriesIds:['hours']})),/single-series chart cannot focus a series/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'log-line').focus={categoryIds:['y2019']})),/category focus is drawn for/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'direct-bar').focus={categoryIds:['review'],seriesIds:['hours']})),/not both/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'direct-bar').focus={categoryIds:['absent']})),/existing categories/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'trend').focus={seriesIds:['guided','manual','template']})),/focuses nothing/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'stacked-sorted').focus={seriesIds:['writing']})),/series focus is drawn for/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'direct-bar').labels='end')),/End labels are a line-trend strategy/);
 rejects(()=>assertPresentation(edit(c=>{const g=dataOf(c,'grouped');g.series.splice(1);delete g.missing;delete g.qualifiers;})),/two or more series/);
 rejects(()=>assertPresentation(edit(c=>{dataOf(c,'small-multiples').series.splice(1);})),/two or more series/);
 rejects(()=>assertPresentation(edit(c=>delete dataOf(c,'dot-interval').series[1].interval)),/interval on every series/);
 rejects(()=>assertPresentation(edit(c=>dataOf(c,'benchmark').qualifiers.push({seriesId:'motion',categoryId:'pipeline-b',label:'x'}))),/explain a null with a missing-value reason/);
 rejects(()=>assertPresentation(edit(c=>dataOf(c,'benchmark').qualifiers.push({...dataOf(c,'benchmark').qualifiers[0]}))),/one qualifier/);
 rejects(()=>assertPresentation(edit(c=>dataOf(c,'benchmark').qualifiers[0].categoryId='absent')),/existing series and category/);
 rejects(()=>assertPresentation(edit(c=>{const s=dataOf(c,'benchmark');delete s.categoryIds;delete s.missing;blockOf(c,'benchmark').focus={seriesIds:['text']};})),/stable categoryIds/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'grouped').axis={policy:'extent'})),/zero baseline unless truncation/);
 rejects(()=>assertPresentation(edit(c=>Object.assign(blockOf(c,'grouped'),{axis:{policy:'extent',scale:'log'},truncation:{note:'declared'}}))),/cannot sit on a log axis/);
 rejects(()=>assertPresentation(edit(c=>blockOf(c,'grouped').chartType='violin')),/./);
});

test('S4 C1: a single-series ranked bar draws a declared category focus, never a series focus',async()=>{
 for(const locale of ['en','zh-CN']){
  const project=await evidenceProject(locale,{staticState:'structure-first'}),d=project.document,b=d.blocks.find(b=>b.type==='chart');
  assert.deepEqual(b.focus,{categoryIds:['claim-first']});
  const out=chart(b,d,theme(locale),{sceneId:'evidence'}),rows=out.slice(out.indexOf('<ol class="chart-rows"'),out.indexOf('</ol>'));
  assert.deepEqual([...rows.matchAll(/data-category-id="([^"]+)" data-focus="(true|false)"/g)].map(m=>[m[1],m[2]]),[['claim-first','true'],['outline-first','false'],['data-first','false'],['template','false'],['slide-by-slide','false'],['no-habit','false']]);
  // Focus is not colour alone: muted bars are outlined and lighter, and the legend names both states.
  assert.equal((rows.match(/fill-opacity="\.28" stroke=/g)||[]).length,5);
  assert.match(graphic(out),new RegExp(`<ul class="legend"><li><svg[^>]*>.*?</svg>${locale==='zh-CN'?'重点：先写结论':'Focus: Claim first'}</li><li><svg[^>]*>.*?fill-opacity=".28".*?</svg>${locale==='zh-CN'?'其他类别':'Other categories'}</li></ul>`));
 }
});

test('S4 C2: row charts reflow without a scroller and mark every label the conclusion needs',async()=>{
 const p=await evidenceProject('en'),out=chart(p.document.blocks.find(b=>b.type==='chart'),p.document,theme('en'),{sceneId:'evidence'});
 assert.equal(out.includes('chart-plot'),false,'no horizontal scroller around the bars');
 assert.equal((out.match(/class="chart-row-label"><span data-conclusion-label="true">/g)||[]).length,6);
 assert.equal((out.match(/class="chart-value" data-conclusion-label="true"/g)||[]).length,6);
 // Value labels sit at the bar end inside a track that reserves their width; no fixed minimum width can force a scroll.
 assert.match(componentCSS,/\.chart-track\{position:relative;display:block;width:calc\(100% - var\(--value-space\)\)/);
 assert.match(componentCSS,/\.chart-value\{position:absolute;top:0;left:calc\(100% \* var\(--end\) \+ 8px\)/);
 assert.match(out,/--value-space:5ch/);
 // The gate: a conclusion label that is hidden, clipped, only reachable by scrolling, outside the viewport or covered by another fails the fit check.
 for(const reason of ['Conclusion label is not displayed','Conclusion label is clipped or only reachable by scrolling','Conclusion label is outside the viewport','Conclusion labels overlap'])assert.ok(clippingScript.includes(reason),reason);
 for(const id of ['direct-bar','grouped','dot-interval','trend','small-multiples','benchmark']){const {document:d}=chartKinds('en');assert.match(render(d,id),/data-conclusion-label="true"/,id);}
});

test('S4 C3: filter and sort are separate in the static statement and the drawing',()=>{
 for(const locale of ['en','zh-CN']){
  const p=chartKindsProject(locale),body=html(p),section=body.slice(body.indexOf('<section id="filter-sort"'),body.indexOf('</section>',body.indexOf('<section id="filter-sort"')));
  const note=section.match(/<p class="component-note static-state-note" data-static-state="middle">([^<]+)<\/p>/)[1];
  assert.equal(note,locale==='en'?'Static view · Four habits by author order: Claim first 38 %, Outline first 31 %, Data first 27 %, Slide by slide 12 %. Filter: author order, Claim first → Slide by slide (4 of 6 categories). Sorted by value, highest first; ranks among all 6: 1, 2, 3, 6. Complete data below.':'静态视图 · 按作者顺序的四种习惯：先写结论 38 %，先列提纲 31 %，先看数据 27 %，逐页制作 12 %。筛选：按作者顺序 先写结论 → 逐页制作（6 个类别中的 4 个）。按数值从高到低；在全部 6 个类别中的排名：1，2，3，6。完整数据见下方。');
  // The frozen rows follow the sort; the filter removed two categories that rank 4 and 5.
  assert.deepEqual([...section.slice(0,section.indexOf('<details>')).matchAll(/data-category-id="([^"]+)"/g)].map(m=>m[1]),['claim','outline','data','slide']);
 }
});

test('S4 C10: question, takeaway and dataset definition, sample, version and dates are drawn as visible text',async()=>{
 for(const locale of ['en','zh-CN']){
  const p=await evidenceProject(locale,{staticState:'structure-first'}),b=p.document.blocks.find(b=>b.type==='chart'),d=p.document.datasets[0],body=html(p);
  const section=body.slice(body.indexOf('<section id="evidence"'),body.indexOf('</section>')),visible=text(section.replace(/<details>[\s\S]*?<\/details>/g,''));
  for(const v of [b.question,b.takeaway,d.definition.denominator,d.definition.sample,d.version,d.collectedAt,d.validPeriod.from,d.validPeriod.to])assert.ok(visible.includes(v.replaceAll("'",'&#39;')),v);
  assert.ok(visible.includes(locale==='zh-CN'?'数值越高越好':'Higher is better'));assert.ok(visible.includes(locale==='zh-CN'?'已归一化':'Normalized'));
  assert.deepEqual(presentationCapabilities('html',p.document,{},p.plan).issues,[]);
 }
});

test('S4 C19: the interactive view draws the same chart, at the same size, as the static view',()=>{
 // The presentation-size cap for interactive scenes is keyed on markup both views share, never on the JavaScript-only has-interactions class.
 assert.equal(/\.has-interactions \.chart/.test(interactionCSS+componentCSS),false);assert.ok(componentCSS.includes('.web-scene:has(>.interaction-transcript) .chart-plot svg{max-height:290px}'));
 // The embedded runtime renders with the same chart() bytes as export; nothing in it reaches outside the bundle.
 const bundled=new Function(interactionBundle+'\nreturn chart;')();
 for(const locale of ['en','zh-CN']){
  const {document:d}=chartKinds(locale);
  for(const id of CHART_KIND_SCENES){
   const b=blockOf(d,id),ds=dataOf(d,id),anchors={};for(const c of ds.categoryIds)for(const s of ['',...ds.series.map(s=>s.id)])anchors[JSON.stringify([c,s])]=objectAnchor(id,b.id,c,s);
   const options={sceneId:id,anchors,paletteIds:ds.series.map(s=>s.id)},runtimeDocument={locale,datasets:[ds]};
   assert.equal(bundled(b,runtimeDocument,theme(locale),options),chart(b,d,theme(locale),options),id);
   assert.equal(chart(b,d,theme(locale),{sceneId:id}),chart(b,d,theme(locale),options),id+' anchors');
  }
 }
});

test('S4 exact-data mutation: one changed value reaches the graphic, labels, statement, table and JSON export, and nothing else moves',()=>{
 for(const locale of ['en','zh-CN'])for(const id of CHART_KIND_SCENES){
  const p=chartKindsProject(locale),copy=structuredClone(p),s=dataOf(copy.document,id).series[0],kind=blockOf(copy.document,id).chartType||'line';
  const nonNull=s.values.flatMap((v,i)=>v===null?[]:[i]),i=id==='filter-sort'?1:['line','small-multiples'].includes(kind)&&blockOf(copy.document,id).labels!=='points'?nonNull.at(-1):nonNull[0],next=s.values[i]+0.0625;
  s.values[i]=next;if(s.interval){s.interval.lower[i]=Math.min(s.interval.lower[i],next);s.interval.upper[i]=Math.max(s.interval.upper[i],next);}
  assertPresentation(copy.document);
  const before=render(p.document,id),after=render(copy.document,id),value=String(next);
  assert.notEqual(graphic(after),graphic(before),id);assert.ok(graphic(after).includes(value),`${locale} ${id}: graphic label`);assert.equal(graphic(before).includes(value),false);
  assert.ok(table(after).includes(`<td>${value}`),`${locale} ${id}: table`);
  assert.ok(exportDeck(copy.document,'json',{experimentalWeb:true}).body.includes(value),`${locale} ${id}: JSON export`);
  // Only the changed value differs between the two tables.
  assert.equal(table(after).replace(value,String(next-0.0625)),table(before),id);
  if(id==='filter-sort')assert.ok(html(copy).includes(`${value} %`),'static statement');
 }
});

test('S4 theme switch: the data table is byte-identical across all three themes; data, units, sources and betterDirection never move',()=>{
 for(const locale of ['en','zh-CN']){
  const {document:d}=chartKinds(locale);
  for(const id of CHART_KIND_SCENES){
   // Since S8 every theme pack, the three VIS-014 themes and the three T01–T03 themes, draws the same table and text.
   const views=themePacks().map(pack=>render(d,id,{theme:pack.id}));
   assert.equal(views.length,themePacks().length);assert.ok(views.length>=6);
   for(const view of views.slice(1)){assert.equal(table(view),table(views[0]),id);assert.equal(text(view),text(views[0]),id);}
   if(id!=='benchmark')assert.notEqual(graphic(views[1]),graphic(views[0]),id+': colour may change');
  }
 }
});

test('S4 one data object: labels, statement and table cells read the same facts',()=>{
 const {document:d}=chartKinds('en'),b=blockOf(d,'direct-bar'),ds=dataOf(d,'direct-bar'),f=chartFacts(b,ds,'en'),out=render(d,'direct-bar');
 const labels=[...graphic(out).matchAll(/class="chart-value" data-conclusion-label="true">([^<]+)</g)].map(m=>m[1]),cells=[...table(out).matchAll(/<tr><th scope="row">[^<]+<\/th><td>([^<]+)<\/td>/g)].map(m=>m[1]);
 assert.deepEqual(labels,chartModel(b,ds).order.map(i=>f.cell(0,i)));assert.deepEqual(cells,ds.categories.map((_,i)=>f.cell(0,i)));
 assert.deepEqual(chartSummary(f),['Draft 6.5 hours','Review 11.25 hours','Revise 4 hours','Approve 2.5 hours','Publish 1 hours']);
 const q=chartFacts(blockOf(d,'benchmark'),dataOf(d,'benchmark'),'en');assert.equal(q.cell(1,2),'98¹');assert.equal(q.cell(3,1),'Missing · not applicable');assert.deepEqual([...q.best[1]],[0],'a qualified higher value is never marked best');
});

test('S4 declarations drawn: log decades, truncation break and note, author and ascending sorts, intervals, events, missing reasons',()=>{
 const {document:d}=chartKinds('en');
 const log=render(d,'log-line');for(const v of ['100','1000','10000','100000'])assert.ok(log.includes(`>${v}</text>`),v);assert.ok(log.includes('Log scale: equal steps are equal ratios.'));
 const dotLog=render(d,'dot-log');assert.deepEqual([...dotLog.matchAll(/chart-axis-track[\s\S]*?<\/span><\/li>/g)].length,1);assert.match(dotLog,/>1<\/span>.*>10<\/span>.*>100<\/span>.*>1000<\/span>.*>10000<\/span>/s);
 const cut=render(d,'ranked-truncated');assert.match(cut,/<path d="M-1 -4l7 5-7 5 7 5-7 5"/);assert.ok(cut.includes('Axis starts at 80, not zero: Scores cluster'));
 assert.deepEqual([...cut.matchAll(/data-category-id="([^"]+)"/g)].map(m=>m[1]),['zoom','alt','keyboard','order','contrast','captions'],'ascending, missing last');
 assert.deepEqual([...render(d,'direct-bar').matchAll(/data-category-id="([^"]+)"/g)].map(m=>m[1]),['draft','review','revise','approve','publish'],'author order');
 assert.deepEqual(chartModel(blockOf(d,'stacked-sorted'),dataOf(d,'stacked-sorted')).order,[0,2,3,1,4],'stacks by net total, stable ties');
 const area=render(d,'area-truncated');assert.match(area,/<path d="M94 266l6 -5 6 5 6 -5"/);assert.match(area,/<polygon points="145,270 /,'area fills from the axis start, not from an off-chart zero');
 const dots=render(d,'dot-interval');assert.ok(dots.includes('40 [34–47]'));assert.ok(dots.includes('Interval: 95% confidence interval · method Synthetic bootstrap, 2,000 resamples'));
 const trend=render(d,'trend');assert.match(trend,/data-event-id="release"/);assert.ok(trend.includes('1 · W3 · Guided mode released (adjacent in time; not a cause)'));assert.ok(trend.includes('2 · W6 · Team training credited in the survey (attributed in a cited source)'));assert.ok(trend.includes('Missing · Manual, W5: not collected — Survey paused in week 5.'));
 assert.ok(table(trend).includes('<td>Missing · not collected'));assert.ok(table(trend).includes('Guided · 90% confidence interval'));
 assert.ok(render(d,'grouped').includes('Missing · not collected'));
});

test('S4 black-and-white: series differ by dash, shape or direct name, not by colour alone',()=>{
 const pairs=Array.from({length:8},(_,j)=>chartDash(j)+'|'+chartShape(j,0,0,5,'#000'));assert.equal(new Set(pairs).size,8);
 const {document:d}=chartKinds('en');
 const trend=render(d,'trend');assert.deepEqual([...trend.matchAll(/<polyline[^>]*stroke-dasharray="([^"]+)"/g)].map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i),['none','9 5','2 4']);
 for(const name of ['Guided 44','Manual 20','Template 14'])assert.ok(trend.includes(`>${name}</text>`),name);
 const grouped=render(d,'grouped');assert.equal((grouped.match(/class="chart-series-name" data-conclusion-label="true">2024</g)||[]).length,4);
 const dots=render(d,'dot-interval');assert.match(dots,/<circle cx="[^"]+%" cy="9" r="6" fill=/);assert.match(dots,/<rect x="[^"]+%" y="9" width="10.8" height="10.8" transform="translate\(-5.4 -5.4\)" fill=/);
});
