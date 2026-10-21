import test from 'node:test';
import assert from 'node:assert/strict';
import {paletteIds} from '../src/design/palette-registry.mjs';
import {paletteRoles,adjacencyIssues,deltaE76} from '../src/design/semantic-colors.mjs';
import {resolveTheme} from '../src/design/theme-registry.mjs';
import {chart,chartDash,chartShape} from '../src/components/charts/render.mjs';
import {diagram} from '../src/components/diagrams/render.mjs';
import {dwiSliceDocument} from './dwi-slice.mjs';
/** DWI-012 (workpacks/wes-instrument/TASKS.md): chart and diagram identity never rests on palette colour alone. */
const MODES=['light','dark','stage'],ref=(id,mode)=>({id,registryVersion:1,mode});

test('marks, arrows, node strokes and callout rules clear 3:1 on every ground; node text 4.5:1; neighbours stay apart',()=>{
 const issues=paletteIds().flatMap(id=>MODES.flatMap(mode=>adjacencyIssues(paletteRoles(ref(id,mode))).map(i=>`${id}/${mode} ${i.what}`)));
 assert.deepEqual(issues,[]);
 const t=paletteRoles(ref('Zissou1','light'));
 assert.ok(adjacencyIssues({...t,series:[t.series[0],t.series[0]]}).some(i=>/beside/.test(i.what)),'identical neighbours are reported');
 assert.ok(adjacencyIssues({...t,series:['#F4F4F4',...t.series]}).some(i=>/series 0 mark on canvas/.test(i.what)),'a pale mark is reported');
 assert.ok(adjacencyIssues({...t,seriesScale:'sequential'}).some(i=>/magnitude/.test(i.what)));
});

test('more series than palette colours: colour repeats, dash and marker never do',()=>{
 const doc=dwiSliceDocument('en'),t=paletteRoles(ref('Zissou1','light'));
 assert.ok(t.series.length<4,'Zissou1 keeps 3 distinct series colours after fitting');
 const d={id:'four',unit:'min',synthetic:true,categories:['A','B','C'],categoryIds:['a','b','c'],series:['s1','s2','s3','s4'].map((id,j)=>({id,label:`Series ${j+1}`,values:[j+1,j+2,j+3]})),sourceIds:['src-bench']};
 const document={...doc,datasets:[...doc.datasets,d]},block={id:'c4',type:'chart',sourceIds:['src-bench'],datasetId:'four',chartType:'line',axis:{policy:'zero'}};
 const theme=resolveTheme('silver-gray-editorial','1.0.0','en',{palette:ref('Zissou1','light')}),svg=chart(block,document,theme);
 const strokes=[...svg.matchAll(/<polyline[^>]*>/g)].map(m=>[m[0].match(/stroke="(#[0-9A-Fa-f]{6})"/)[1].toUpperCase(),m[0].match(/stroke-dasharray="([^"]+)"/)?.[1]??'none']);
 assert.equal(strokes.length,4);assert.equal(strokes[3][0],strokes[0][0],'the fourth series reuses the first colour');
 assert.equal(new Set(strokes.map(s=>s[1])).size,4,'every series has its own dash');
 assert.equal(new Set(Array.from({length:4},(_,j)=>chartDash(j)+chartShape(j,0,0,5,'#000'))).size,4);
 assert.match(svg,/<table|<details/,'the data table is present');
 for(const s of d.series)assert.ok(svg.includes(s.label),s.label);
});

test('a heatmap keeps one hue per sign and encodes magnitude by opacity and printed value, never by categorical swatches',()=>{
 const doc=dwiSliceDocument('en'),d={id:'heat',unit:'pts',synthetic:true,categories:['A','B','C'],categoryIds:['a','b','c'],series:[{id:'r1',label:'Row 1',values:[1,5,-3]},{id:'r2',label:'Row 2',values:[2,null,9]}],sourceIds:['src-bench']};
 const theme=resolveTheme('silver-gray-editorial','1.0.0','en',{palette:ref('Moonrise2','light')}),svg=chart({id:'h',type:'chart',sourceIds:['src-bench'],datasetId:'heat',chartType:'heatmap'},{...doc,datasets:[d]},theme);
 const fills=new Set([...svg.matchAll(/<rect[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*fill-opacity/g)].map(m=>m[1].toUpperCase()));
 assert.ok(fills.size<=2,`at most two hues, got ${[...fills]}`);
 assert.deepEqual([...fills].sort(),[theme.chart[0],theme.chart[1]].map(c=>c.toUpperCase()).sort());
 for(const v of ['9','-3','5'])assert.match(svg,new RegExp(`>${v}<`));
});

test('diagram parts keep their ids and labels in every palette; connectors use the text colour',()=>{
 const doc=dwiSliceDocument('en'),b=doc.blocks.find(b=>b.id==='mech-diagram');
 const base=diagram(b,doc,resolveTheme('silver-gray-editorial','1.0.0','en'));
 for(const id of ['Royal2','Moonrise3','IsleofDogs1'])for(const mode of MODES){
  const t=resolveTheme('silver-gray-editorial','1.0.0','en',{palette:ref(id,mode)}),svg=diagram(b,doc,t);
  for(const n of b.nodes)assert.ok(svg.includes(n.label),`${id}/${mode} ${n.label}`);
  assert.equal(svg.replace(/#[0-9A-Fa-f]{6}/g,''),base.replace(/#[0-9A-Fa-f]{6}/g,''),'only colours differ');
  assert.ok(deltaE76(t.accent,t.paper)>0);
 }
});
