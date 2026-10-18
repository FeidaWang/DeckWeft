import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createSlide,RATIOS,THEMES,LAYOUTS} from '../src/core/model.mjs';
import {candidates,resolveScenes,auditProject} from '../src/layout/engine.mjs';
import {compileSlide} from '../src/layout/scene.mjs';
import {fitText,contrastRatio} from '../src/layout/text.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {zipFiles,crc32} from '../src/render/zip.mjs';
import {unzip} from './helpers.mjs';
const sample=()=>createProject({slides:[createSlide({role:'process',content:{title:'A clear path',body:'A small change.',items:['First step','Next step'],metrics:[{label:'Choices',value:'4'}]}})]});
test('four ranked choices have distinct geometry and stable scores',()=>{const p=sample(),choices=candidates(p,p.slides[0]);assert.equal(choices.length,4);assert.equal(new Set(choices.map(c=>c.id)).size,4);assert.deepEqual(choices,candidates(p,p.slides[0]));assert.equal(new Set(choices.map(c=>JSON.stringify(compileSlide(p,p.slides[0],c.id).nodes))).size,4);});
for(const ratio of RATIOS)for(const theme of THEMES)test(`shared scene fits a short deck: ${ratio} / ${theme}`,()=>{const p=sample();p.aspectRatio=ratio;p.theme=theme;const r=resolveScenes(p);assert.equal(auditProject(p,r).ok,true);for(const n of r[0].scene.nodes){assert.ok(n.x>=0&&n.y>=0);assert.ok(n.x+n.w<=r[0].scene.width+1);assert.ok(n.y+n.h<=r[0].scene.height+1);}});
for(const layout of LAYOUTS)test(`${layout} retains all semantic content`,()=>{const p=sample(),scene=compileSlide(p,p.slides[0],layout);const visible=scene.nodes.filter(n=>n.type==='text').flatMap(n=>n.lines).join(' ');for(const text of ['A clear path','A small change.','First step','Next step','Choices','4'])assert.ok(visible.includes(text),text);});
test('dense text is a blocker, never a silently truncated export',()=>{const p=createProject();p.slides[0].content.body='Important content '.repeat(350);assert.equal(auditProject(p).ok,false);assert.throws(()=>exportDeck(p,'pptx'),{code:'EXPORT_BLOCKED'});assert.equal(JSON.parse(exportDeck(p,'json').body).slides[0].content.body,p.slides[0].content.body);});
test('all renderers share selected geometry and notes',()=>{const p=sample();p.slides[0].design.layout='grid';p.slides[0].notes='Speaker only';const figma=JSON.parse(exportDeck(p,'figma',{includeNotes:true}).body),motion=JSON.parse(exportDeck(p,'motion',{includeNotes:true}).body);assert.deepEqual(figma.scenes[0].nodes,motion.compositions[0].nodes);assert.equal(motion.compositions[0].notes,'Speaker only');});
test('SVG escapes markup instead of executing it',()=>{const p=createProject();p.slides[0].content.title='<script>alert(1)</script>';const svg=exportDeck(p,'svg').body;assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));});
test('HTML contains offline slides, notes, and sources',()=>{const p=sample();p.slides[0].notes='<b>Not markup</b>';p.sources=[{id:'s',title:'Example',url:'https://example.com'}];p.slides[0].sourceIds=['s'];const html=exportDeck(p,'html',{includeNotes:true}).body;assert.ok(html.includes('&lt;b&gt;'));assert.ok(html.includes('https://example.com'));assert.ok(html.includes("script-src 'sha256-"));assert.ok(!html.includes('<script src='));});
test('invalid format and selected SVG page fail clearly',()=>{const p=sample();assert.throws(()=>exportDeck(p,'exe'),{code:'EXPORT_FORMAT'});assert.throws(()=>exportDeck(p,'svg',{slideIndex:-1}),{code:'SLIDE_RANGE'});});
test('ZIP CRC, UTF-8 paths, and deterministic output round-trip',()=>{assert.equal(crc32(Buffer.from('123456789')),0xCBF43926);const a=zipFiles([['hello/中文.txt','Hello 🌱']]);assert.deepEqual(a,zipFiles([['hello/中文.txt','Hello 🌱']]));assert.equal(unzip(a).get('hello/中文.txt').toString(),'Hello 🌱');});
test('ZIP writer rejects traversal and duplicate paths',()=>{for(const entries of [[['../x','x']],[['/etc/x','x']],[['a\\b','x']],[['x','1'],['x','2']]])assert.throws(()=>zipFiles(entries));});
test('PPTX is a ZIP of native shapes, text, theme, notes, and relationships',()=>{const p=sample();p.slides[0].notes='Talk about this';const zip=unzip(exportDeck(p,'pptx',{includeNotes:true}).body);for(const file of ['[Content_Types].xml','ppt/presentation.xml','ppt/slides/slide1.xml','ppt/slideMasters/slideMaster1.xml','ppt/slideLayouts/slideLayout1.xml','ppt/theme/theme1.xml','ppt/notesSlides/notesSlide1.xml'])assert.ok(zip.has(file),file);const slide=zip.get('ppt/slides/slide1.xml').toString();assert.ok(slide.includes('<p:sp>'));assert.ok(!slide.includes('<p:pic>'));assert.ok(slide.includes('A clear path'));assert.ok(zip.get('ppt/notesSlides/notesSlide1.xml').toString().includes('Talk about this'));assert.equal([...zip.keys()].some(k=>k.includes('vba')),false);});
test('contrast math has expected endpoints',()=>{assert.equal(contrastRatio('#000000','#FFFFFF'),21);assert.equal(contrastRatio('#FFFFFF','#FFFFFF'),1);});

test('metric cards reserve label height for the bundled CJK example without overlap',async()=>{
 const {readFile}=await import('node:fs/promises');
 const p=JSON.parse(await readFile(new URL('../examples/welcome.zh-CN.deck.json',import.meta.url),'utf8'));
 const scene=compileSlide(p,p.slides[2],'grid'),labels=scene.nodes.filter(n=>n.role==='metric-label'),values=scene.nodes.filter(n=>n.role==='metric-value');
 assert.equal(labels.length,3);
 labels.forEach((label,i)=>{assert.ok(label.h>=32);assert.ok(values[i].y+values[i].h<=label.y);assert.ok(label.fontSize>=18);assert.ok(values[i].fontSize>=24);});
});
test('PPTX has a separate notes theme and a presentation theme relationship',()=>{
 const zip=unzip(exportDeck(sample(),'pptx').body),read=name=>zip.get(name).toString();
 assert.ok(zip.has('ppt/theme/theme2.xml'));
 assert.match(read('ppt/notesMasters/_rels/notesMaster1.xml.rels'),/Target="..\/theme\/theme2.xml"/);
 assert.match(read('ppt/slideMasters/_rels/slideMaster1.xml.rels'),/Target="..\/theme\/theme1.xml"/);
 assert.match(read('ppt/_rels/presentation.xml.rels'),/relationships\/theme" Target="theme\/theme1.xml"/);
});
