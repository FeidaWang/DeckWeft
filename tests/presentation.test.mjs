import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProject} from '../src/core/model.mjs';
import {speechStats,spokenWords,validatePresentationRequest} from '../src/core/speech.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {playerScript} from '../src/render/player.mjs';
import {demoProject} from '../scripts/devday-demo.mjs';
import {unzip} from './helpers.mjs';
test('spoken plan counts only notes and keeps pauses outside estimated speech',()=>{const p=createProject();p.slides[0].notes="A builder’s five-minute pitch. It's editable.";p.slides[0].content.body='Not spoken';const stats=speechStats(p,{wpm:140,minutes:5});assert.equal(stats.words,6);assert.equal(stats.targetWords,700);assert.equal(spokenWords('').length,0);assert.throws(()=>speechStats(p,{wpm:0}));});
test('generation timing rejects coercion and unknown fields',()=>{for(const v of [null,[],{minutes:'5',wpm:140},{minutes:5,wpm:0},{minutes:5,wpm:140,model:'invented'},{minutes:5.5,wpm:140}])assert.throws(()=>validatePresentationRequest(v));assert.deepEqual(validatePresentationRequest({minutes:5,wpm:140}),{minutes:5,wpm:140});});
test('English DevDay pitch has a five-minute schedule and editable native exports',()=>{const s=speechStats(demoProject,{wpm:140});assert.equal(s.scheduledSeconds,300);assert.equal(demoProject.slides.length,14);assert.ok(s.spokenSeconds<=280);assert.equal(s.words,644);const zip=unzip(exportDeck(demoProject,'pptx').body);for(let i=1;i<=14;i++){const slide=zip.get(`ppt/slides/slide${i}.xml`).toString();assert.ok(slide.includes('<p:sp>'));assert.ok(slide.includes('devday_')); assert.ok(zip.get(`ppt/notesSlides/notesSlide${i}.xml`).toString().includes('<a:t'));}assert.ok(!JSON.stringify(demoProject).match(/\$(?:50|100)/));for(const name of ['Callum Holt','Dr Sam Donegan','Advita Velury','Dhruv','volunteers','Sol High','ChatGPT','Multiple agents','MCP','Tibo'])assert.ok(JSON.stringify(demoProject).includes(name),name);});
test('offline player executes only a hashed fixed script, escapes imported text, and preserves native scenes',()=>{const p=createProject();p.slides[0].notes='</script><script src="https://bad.invalid">injection</script>';p.extensions.deckweftPresentation={wpm:'bad'};const html=exportDeck(p,'html',{includeNotes:true}).body;const hash=createHash('sha256').update(playerScript).digest('base64');assert.ok(html.includes(`script-src 'sha256-${hash}'`));assert.equal(html.match(/<script>/g).length,1);assert.ok(!html.includes('<script src='));assert.ok(html.includes('&lt;/script&gt;'));assert.ok(html.includes('prefers-reduced-motion'));assert.ok(html.includes('data-motion="none"'));assert.ok(html.includes('<svg'));});
test('showcase exports keep editable text and deduplicate only bundled image assets',()=>{
 const zip=unzip(exportDeck(demoProject,'pptx').body);assert.equal([...zip.keys()].filter(k=>k.startsWith('ppt/media/')).length,8);
 const first=zip.get('ppt/slides/slide1.xml').toString();assert.ok(first.includes('<a:t xml:space="preserve">DeckWeft</a:t>'));assert.ok(first.includes('<p:pic>'));assert.ok(first.includes('descr="Original AI-generated star field"'));
 const svg=exportDeck(demoProject,'svg').body;assert.ok(svg.includes('<image'));assert.ok(svg.includes('data:image/png;base64,'));assert.ok(svg.includes('<text'));
 for(const f of ['figma','motion']){const bundle=JSON.parse(exportDeck(demoProject,f).body),scenes=bundle.scenes||bundle.compositions;assert.ok(scenes.some(s=>s.nodes.some(n=>n.type==='image'&&n.resource.dataURL.startsWith('data:image/png;base64,'))));assert.ok(scenes.some(s=>s.nodes.some(n=>n.type==='text')));}
});
test('showcase variants differ, preserve content and fail clearly on an unsupported stage ratio/version',async()=>{
 const {compileSlide}=await import('../src/layout/scene.mjs');const scenes=['editorial','spotlight','grid','timeline'].map(id=>compileSlide(demoProject,demoProject.slides[3],id));assert.equal(new Set(scenes.map(s=>JSON.stringify(s.nodes.map(n=>[n.type,n.x,n.y,n.w,n.h])))).size,4);
 for(const s of scenes)for(const source of ['English drafting with Dot',...demoProject.slides[3].content.items])assert.ok(s.nodes.some(n=>n.type==='text'&&n.text===source),source);
 const p=structuredClone(demoProject);p.aspectRatio='9:16';assert.throws(()=>exportDeck(p,'pptx'),{code:'EXPORT_BLOCKED'});p.aspectRatio='16:9';p.extensions.deckweftShowcase.version=2;assert.throws(()=>exportDeck(p,'html'),{code:'SHOWCASE_VERSION'});
 const {sceneAsset}=await import('../src/render/assets.mjs');assert.throws(()=>sceneAsset('../../private'));assert.throws(()=>sceneAsset('https://example.com/image.png'));
});
test('Three.js is pinned, locally linked, and all offline code is covered by its CSP hash',async()=>{
 const {threeBundle}=await import('../src/render/three-bundle.mjs');const source=threeBundle();assert.ok(source.includes('window.DeckWeftThree'));assert.ok(source.includes('Permission is hereby granted'));assert.ok(!/^import\s/m.test(source));assert.ok(!/^export\s/m.test(source));
 const html=exportDeck(demoProject,'html').body,script=html.match(/<script>([\s\S]*)<\/script>/)[1],hash=createHash('sha256').update(script).digest('base64');assert.ok(html.includes(`script-src 'sha256-${hash}'`));assert.ok(script.includes('CylinderGeometry'));assert.ok(script.includes("canvas.dataset.textures='0'"));assert.ok(!html.includes('<script src='));
});
test('workbench screenshots have real PNG dimensions and preserve their aspect ratio in PowerPoint',async()=>{
 const {sceneAsset}=await import('../src/render/assets.mjs');assert.deepEqual([sceneAsset('studio').width,sceneAsset('studio').height],[1440,960]);assert.deepEqual([sceneAsset('mobile').width,sceneAsset('mobile').height],[390,844]);
 const zip=unzip(exportDeck(demoProject,'pptx').body),xml=zip.get('ppt/slides/slide5.xml').toString(),pic=xml.match(/<p:pic>[\s\S]*?<\/p:pic>/)[0],dim=pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/);assert.ok(Math.abs(Number(dim[1])/Number(dim[2])-1.5)<.001);assert.ok(Number(dim[1])>8_000_000);
});
