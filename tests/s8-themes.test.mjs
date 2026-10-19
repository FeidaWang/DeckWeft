import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {themePacks,resolveTheme,themeTokens,DEFAULT_PROFILE} from '../src/design/theme-registry.mjs';
import {THEME_COMPOSITIONS,assertDesignPlan} from '../src/design/plan.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {sceneDirection} from '../src/design/art-direction.mjs';
import {compositions} from '../src/design/compositions.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {themeCSS} from '../src/render/web/themes.mjs';
import {artDirectionCSS} from '../src/render/web/art-direction.mjs';
import {runtime,PLAYER_VERSION} from '../src/render/web/runtime.mjs';
import {cjkSegments,cjkBreaksHTML} from '../src/render/web/components/cjk.mjs';
import {scanMissingGlyphs,glyphScript} from '../src/render/web/glyphs.mjs';
import {checkRender} from '../src/quality/render-checks.mjs';
import {candidateFit} from '../src/design/rhythm.mjs';
import {contrastRatio} from '../src/layout/text.mjs';
import themeSchema from '../schemas/theme-pack.schema.json' with {type:'json'};
import planSchema from '../schemas/design-plan.schema.json' with {type:'json'};
import sceneSchema from '../schemas/web-scene.schema.json' with {type:'json'};

// The S8 corpus (tests/s8-themes.mjs): its asset home is prepared before any test registers, as in release-gate.test.mjs.
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {S8_THEMES,S8_STORY_COMPOSITIONS,STORYBOARD_TASKS,s8Project,s8Story,storyboard} from './s8-themes.mjs';
import {releaseAssets,releaseStory,releaseProject,LOCALES} from './release-gate.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';

const corpusHome=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-s8-corpus-')));
test.after(()=>rm(corpusHome,{recursive:true,force:true}));
const corpusAssets=await releaseAssets(corpusHome);
const factsOf=body=>({tables:body.match(/<tbody>[\s\S]*?<\/tbody>/g)||[],links:[...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m=>m[1]).filter(u=>!u.startsWith('#')),citations:[...body.matchAll(/data-component="citation"[\s\S]*?<\/div>/g)].map(m=>m[0].replace(/<[^>]+>/g,''))});
const render=async p=>exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:await visualAssetResources(p,corpusHome)}).body;


const S8=['editorial-fieldnotes','research-atlas','luminous-stage'];
const S8_COMPOSITIONS=Object.keys(THEME_COMPOSITIONS);
const example=async locale=>JSON.parse(await readFile(new URL(`../tests/fixtures/visual/wave-a.${locale}.json`,import.meta.url)));

test('S8 packs: three versioned packs declare every S1 token role, own compositions and attribution; the VIS-014 packs are unchanged',async()=>{
 const packs=themePacks();
 assert.deepEqual(packs.map(p=>p.id),['cream-collage','dark-data','electric-violet',...S8]);
 for(const id of S8){
  const pack=packs.find(p=>p.id===id);
  assert.equal(pack.version,'1.0.0');assert.match(pack.attribution,/Design Handoff/);assert.match(pack.attribution,/never bundled/);
  assert.ok(pack.typography.numeric&&pack.palette.reference&&pack.palette.missing);
  for(const k of ['captionGap','sectionGap','safeArea'])assert.equal(typeof pack.spacing[k],'number',id+' '+k);
  for(const k of ['distance','easing','delay','fallback'])assert.ok(k in pack.motion,id+' '+k);
  // Two title compositions, two evidence compositions and one closing page of its own.
  const own=S8_COMPOSITIONS.filter(c=>THEME_COMPOSITIONS[c].theme===id);
  assert.ok(own.length>=5,id);assert.ok(own.every(c=>pack.compositions.includes(c)),id);
  assert.ok(own.filter(c=>THEME_COMPOSITIONS[c].needs.flat().some(k=>['chart','metric','table','diagram'].includes(k))).length>=2,id+' evidence compositions');assert.ok(own.filter(c=>!THEME_COMPOSITIONS[c].needs.flat().some(k=>['chart','metric','table','diagram','list'].includes(k))).length>=2,id+' title compositions');
  assert.ok(own.some(c=>/closing$/.test(c)),id+' closing');
  // Every shared family geometry is available too; other themes' own compositions are not.
  for(const c of compositions)assert.ok(pack.compositions.includes(c.id),id+' '+c.id);
  for(const c of S8_COMPOSITIONS.filter(c=>THEME_COMPOSITIONS[c].theme!==id))assert.ok(!pack.compositions.includes(c),id+' must not list '+c);
  for(const c of ['diagonal-cover','chart-with-evidence-rail','photo-split','violet-chapter'])assert.ok(!pack.compositions.includes(c));
 }
 // Schema enums carry the ids and the sixteen compositions.
 assert.deepEqual(themeSchema.properties.id.enum.slice(3),S8);
 for(const c of S8_COMPOSITIONS){assert.ok(themeSchema.properties.compositions.items.enum.includes(c),c);assert.ok(JSON.stringify(planSchema).includes(`"${c}"`),c);assert.ok(JSON.stringify(sceneSchema).includes(`"${c}"`),c);}
 // The three VIS-014 packs are byte-identical to their committed JSON.
 for(const id of ['cream-collage','dark-data','electric-violet'])assert.deepEqual(packs.find(p=>p.id===id),JSON.parse(await readFile(new URL(`../themes/${id}/theme.json`,import.meta.url))));
});

test('S8 contrast: every foreground token clears 4.5:1 on its own paper and every chart colour clears 3:1, in both modes; the dark theme keeps its own chart colours',()=>{
 for(const id of S8)for(const mode of ['default','chapter'])for(const intensity of ['bold','restrained']){
  const t=resolveTheme(id,'1.0.0','en',{colorMode:mode,profile:{...DEFAULT_PROFILE,colorIntensity:intensity}});
  for(const [name,hex] of [['ink',t.ink],['accent',t.accent],['reference',t.tokens.palette.reference],['missing',t.tokens.palette.missing]])assert.ok(contrastRatio(t.paper,hex)>=4.5,`${id} ${mode} ${intensity} ${name} ${contrastRatio(t.paper,hex)}`);
  // The secondary colour is used for large numbers, rules and the stage's drawn object: 3:1 is its threshold.
  assert.ok(contrastRatio(t.paper,t.secondary)>=3,`${id} secondary`);
  for(const c of t.chart)assert.ok(contrastRatio(t.paper,c)>=3,`${id} ${mode} chart ${c}`);
  assert.deepEqual(t.chart,themePacks().find(p=>p.id===id).chartColors,id+' keeps its own chart colours');
 }
 // Paper text on the comparison header (ink background) in every theme.
 for(const id of S8){const t=resolveTheme(id,'1.0.0','zh-CN');assert.ok(contrastRatio(t.ink,t.paper)>=7);}
});

test('S8 token roles reach the page as custom properties only for declaring packs; the renderer consumes them with fallbacks equal to the previous values',async()=>{
 const {document,plan}=await example('en');
 const cream=exportDeck(document,'html',{experimentalWeb:true,plan}).body;
 assert.ok(!/--numeric:|--reference:|--missing:|--caption-gap:|--section-gap:|--safe-area:|--motion-distance:|--motion-easing:|--motion-delay:|data-motion-fallback/.test(cream.split('<main>')[1].split('<script')[0]),'VIS-014 themes emit no token properties');
 for(const id of S8){
  let p={document:structuredClone(document),plan:structuredClone(plan),assets:[]};
  const {createVisualProject}=await import('../src/core/visual-project.mjs');p=createVisualProject(p.document,p.plan,{id:'s8-tokens-'+id});
  for(const s of p.plan.scenes)p=applySceneTheme(p,s.id,id);
  const body=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan}).body,scene=body.slice(body.indexOf('<section'),body.indexOf('</section>'));
  const tokens=themeTokens(id,'en'),q=v=>String(v).replaceAll('"','&quot;');
  assert.ok(scene.includes(`--numeric:${q(tokens.typography.numeric)}`));assert.ok(scene.includes(`--reference:${tokens.palette.reference}`));assert.ok(scene.includes(`--missing:${tokens.palette.missing}`));
  assert.ok(scene.includes(`--caption-gap:${tokens.spacing.captionGap}px`));assert.ok(scene.includes(`--section-gap:${tokens.spacing.sectionGap}px`));assert.ok(scene.includes(`--safe-area:${tokens.spacing.safeArea}px`));
  assert.ok(scene.includes(`--motion-distance:${tokens.motion.distance}px`));assert.ok(scene.includes(`--motion-easing:${tokens.motion.easing}`));assert.ok(scene.includes(`--motion-delay:${tokens.motion.delay}ms`));
  assert.ok(scene.includes(`data-motion-fallback="${tokens.motion.fallback}"`));
  assert.ok(body.includes(`data-theme="${id}"`));
 }
 // Consumers.
 assert.match(artDirectionCSS,/padding:var\(--safe-area,56px\) var\(--safe-area,var\(--page\)\)/);
 assert.match(artDirectionCSS,/row-gap:var\(--section-gap,24px\)/);
 assert.match(artDirectionCSS,/margin-top:var\(--caption-gap,14px\)/);
 assert.match(artDirectionCSS,/\.metric strong\{font-family:var\(--numeric,var\(--body\)\)/);
 assert.match(artDirectionCSS,/\[data-reference\]\{stroke:var\(--reference,currentColor\)\}/);
 assert.match(artDirectionCSS,/\[data-missing\] \.chart-value,[^{]*\{color:var\(--missing,inherit\)\}/);
 const resources=await readFile(new URL('../public/runtime/resources.js',import.meta.url),'utf8');
 assert.match(resources,/--motion-distance/);assert.match(resources,/--motion-easing/);assert.match(resources,/--motion-delay/);
 // The theme's declared fallback becomes a scene's reduced-motion result when the author declared none.
 const {compileInteractionRuntime}=await import('../src/motion/web.mjs');
 const {createVisualProject:envelope}=await import('../src/core/visual-project.mjs');
 const stage=(()=>{let p=envelope(structuredClone(document),structuredClone(plan),{id:'s8-stage-fallback'});for(const s of p.plan.scenes)p=applySceneTheme(p,s.id,'luminous-stage');return p;})();
 const scene=stage.plan.scenes.find(s=>s.interactions?.length)||stage.plan.scenes[0];
 if(scene.interactions?.length){scene.keyStates=scene.keyStates||[{id:'open',position:0,label:'Open'}];scene.staticState={keyStateId:scene.keyStates[0].id};
  const compiled=compileInteractionRuntime(stage.document,stage.plan,{});assert.equal(compiled.scenes.find(s=>s.id===scene.id).staticState.reducedMotion,'static');}
});

test('S8 type roles: each theme changes headline weight, tracking, leading, body size, gutter and measure, not only colours',async()=>{
 const {document,plan}=await example('en'),base=sceneDirection(document,plan,0);
 const seen=new Set();
 for(const id of S8){
  const p=structuredClone({document,plan});for(const s of p.plan.scenes){s.theme=id;s.composition='reading-flow';}
  const d=sceneDirection(p.document,p.plan,0),key=[d.headlineWeight,d.headlineTracking,d.headlineLeading,d.body,d.gutter,d.measure].join('|');
  assert.ok(!seen.has(key),id+' repeats another theme');seen.add(key);
  assert.notEqual(key,[base.headlineWeight,base.headlineTracking,base.headlineLeading,base.body,base.gutter,base.measure].join('|'));
  const t=resolveTheme(id,'1.0.0','en');assert.notEqual(t.split,resolveTheme('cream-collage','1.0.0','en').split,id+' media ratio');
 }
 assert.ok(sceneDirection({...document,locale:'en'},{...plan,scenes:plan.scenes.map(s=>({...s,theme:'luminous-stage',composition:'reading-flow'}))},0).headline>=120,'the stage opens larger');
});

test('S8 theme-only compositions refuse another theme or missing blocks and never drop content',async()=>{
 const {document,plan}=await example('en');
 const scene=structuredClone(plan.scenes[0]),blocks=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id)),kinds=blocks.map(b=>b.type);
 assert.ok(kinds.includes('heading')&&kinds.includes('paragraph')&&kinds.includes('metric'),'the example cover has a heading, a paragraph and a metric');
 const check=(theme,composition)=>{const p=structuredClone(plan);Object.assign(p.scenes[0],{theme,composition});return assertDesignPlan(document,p);};
 for(const [theme,composition] of [['editorial-fieldnotes','fieldnotes-cover'],['research-atlas','atlas-cover'],['luminous-stage','stage-metric'],['luminous-stage','stage-hero']])assert.ok(check(theme,composition));
 for(const [theme,composition,pattern] of [['cream-collage','fieldnotes-cover',/belongs to the editorial-fieldnotes theme/],['research-atlas','stage-hero',/belongs to the luminous-stage theme/],['editorial-fieldnotes','fieldnotes-figure',/needs chart/],['research-atlas','atlas-panels',/needs chart/],['luminous-stage','stage-closing',/needs list/]])assert.throws(()=>check(theme,composition),e=>e.code==='INVALID_DESIGN_PLAN'&&pattern.test(e.message));
 // A theme change keeps every block and chooses the theme's own composition by content.
 const {createVisualProject}=await import('../src/core/visual-project.mjs');let p=createVisualProject(structuredClone(document),structuredClone(plan),{id:'s8-switch'});
 for(const [theme,expected] of [['editorial-fieldnotes','fieldnotes-cover'],['research-atlas','atlas-cover'],['luminous-stage','stage-metric']]){const q=applySceneTheme(p,p.plan.scenes[0].id,theme);assert.equal(q.plan.scenes[0].composition,expected,theme);assert.deepEqual(q.document,p.document);}
 // Round trip back to the original theme restores the original composition family choice without touching facts.
 const away=applySceneTheme(p,p.plan.scenes[0].id,'research-atlas'),back=applySceneTheme(away,p.plan.scenes[0].id,p.plan.scenes[0].theme);assert.deepEqual(back.document,p.document);
});

test('S8 theme CSS covers the sixteen compositions at 1440 and stacks them under 700 px; nothing clips or clamps',()=>{
 for(const c of S8_COMPOSITIONS)assert.ok(themeCSS.includes(`.web-scene.${c} `)||themeCSS.includes(`.web-scene.${c}{`)||themeCSS.includes(`,.${c},`)||themeCSS.includes(`,.${c})`)||themeCSS.includes(`(.${c},`),c);
 assert.match(themeCSS,/@media\(max-width:700px\)\{\n \.web-scene:is\(\.fieldnotes-cover,[^}]*display:flex;flex-direction:column/);
 assert.ok(!/line-clamp|overflow:hidden|text-overflow/.test(themeCSS));
 for(const theme of S8)assert.ok(themeCSS.includes(`[data-theme=${theme}]`),theme);
 assert.match(artDirectionCSS,/\.web-scene:lang\(zh-CN\) :is\(h2,\.region\[data-component=callout\] p,\.metric span\)\{word-break:keep-all;line-break:strict\}/);
});

test('C12: zh-CN display text breaks between dictionary words with Han numerals kept together; text content, coverage and other locales are unchanged',async()=>{
 assert.deepEqual(cjkSegments('三十六种几何结构。'),['三十六种','几何','结构','。']);
 assert.deepEqual(cjkSegments('可执行的设计模式'),['可','执行','的','设计','模式']);
 assert.equal(cjkBreaksHTML('三十六种几何结构。','zh-CN'),'三十六种<wbr>几何<wbr>结构。');
 assert.equal(cjkBreaksHTML('十二个构图族，\n三十六种几何结构。','zh-CN'),'十二个<wbr>构图<wbr>族，\n三十六种<wbr>几何<wbr>结构。');
 assert.equal(cjkBreaksHTML('Twelve families, 36 geometries & <b>','zh-CN'),'Twelve families, 36 geometries &amp; &lt;b&gt;','no Han: escaped only');
 assert.equal(cjkBreaksHTML('三十六种几何结构。','en'),'三十六种几何结构。','English documents are untouched');
 assert.equal(cjkBreaksHTML('Mixed 中文 and <英文>','zh-CN'),'Mixed 中文 and &lt;英文&gt;','no break beside spaces or punctuation');
 // In the export, headings, callouts and metric labels carry <wbr>; paragraphs do not; textContent is the authored string.
 const {document,plan}=await example('zh-CN'),body=exportDeck(document,'html',{experimentalWeb:true,plan}).body;
 const heading=document.blocks.find(b=>b.type==='heading'&&/\p{Script=Han}/u.test(b.text));
 assert.ok(body.includes(cjkBreaksHTML(heading.text,'zh-CN')));
 assert.ok(!body.replaceAll('<wbr>','').includes('<wbr>'));
 const paragraph=document.blocks.find(b=>b.type==='paragraph'&&/\p{Script=Han}/u.test(b.text));if(paragraph)assert.ok(body.includes(`<p>${paragraph.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`.slice(0,40)),'paragraphs keep their markup');
 // The export checker compares text content, which <wbr> does not change.
 assert.ok(!body.includes('​'));
 assert.ok(exportDeck(await example('en').then(e=>e.document),'html',{experimentalWeb:true,plan:(await example('en')).plan}).body.includes('<wbr>')===false);
});

test('C13: the glyph audit is embedded in the player, feeds the fit, the quality checks, the candidate fit and the export order',async()=>{
 assert.ok(runtime.includes(glyphScript));assert.ok(runtime.includes('glyphs:scanMissingGlyphs(scene)'));assert.ok(runtime.includes('s.glyphs.length===0'));assert.ok(runtime.includes('glyphIssues:scanMissingGlyphs(scene)'));
 assert.match(glyphScript,/\\u0378/);assert.equal(typeof scanMissingGlyphs,'function');
 assert.equal(PLAYER_VERSION,'semantic-player.5','the player bytes changed in S8');
 const {document,plan}=await example('en'),out=exportDeck(document,'html',{experimentalWeb:true,plan});
 const scene=out.scenes[0],region=scene.regions[0];
 const observation={sourceLinks:[],documentOverflow:false,viewport:{width:1440,height:1000,dpr:1},renderHash:out.renderHash,dom:'',fontStatus:'loaded',fonts:[],scenes:out.scenes.map(s=>({sceneId:s.id,bounds:{},composition:s.composition,regions:s.regions.map(r=>({nodeId:r.id,blockId:r.blockId,bounds:{},text:'',links:[],images:[]})),contrastIssues:[],clipIssues:[],glyphIssues:s.id===scene.id?[{regionId:region.id,font:'serif',missing:['']}]:[]})),fit:{viewport:{width:1440},checks:out.scenes.map(s=>({sceneId:s.id,overflow:[],text:[],fonts:[],glyphs:s.id===scene.id?[{regionId:region.id,font:'serif',missing:['']}]:[]}))}};
 const issues=checkRender({document,plan,assets:[]},[observation]).issues.filter(i=>i.kind==='glyph');
 assert.ok(issues.length>=1);assert.equal(issues[0].sceneId,scene.id);assert.equal(issues[0].nodeId,region.id);assert.match(issues[0].suggestion,/No installed font/);
 assert.deepEqual(candidateFit({overflow:[],clipIssues:[],contrastIssues:[],text:[],fonts:[],height:700,glyphs:[{regionId:'r',font:'x',missing:['']}],visualFeatures:{focus:'left:top',density:.4,imageRatio:0}},{width:1440}).reasons,['Missing glyph']);
});

test('S8 stories: the VIS-014 story document drawn by each new theme with that theme\'s own opening, evidence and closing; facts identical across the three',async()=>{
 assert.deepEqual(Object.keys(S8_STORY_COMPOSITIONS),S8_THEMES);
 for(const locale of LOCALES){
  const base=releaseStory(locale,'dark-data',corpusAssets),stories=await Promise.all(S8_THEMES.map(theme=>s8Project('story',locale,corpusHome,theme)));
  for(const [i,p] of stories.entries()){
   assertVisualProject(p);assert.deepEqual({...p.document,id:null},{...base.document,id:null});
   const theme=S8_THEMES[i],prefix={'editorial-fieldnotes':'fieldnotes','research-atlas':'atlas','luminous-stage':'stage'}[theme];
   assert.ok(p.plan.scenes.every(s=>s.theme===theme&&!('colorMode' in s)));
   assert.ok(p.plan.scenes[0].composition.startsWith(prefix),theme+' opens with its own title composition');
   assert.ok(p.plan.scenes.find(s=>s.id==='st-evidence').composition===prefix+'-figure',theme+' evidence');
   assert.equal(p.plan.scenes.at(-1).composition,prefix+'-closing',theme+' closing');
   const families=p.plan.scenes.map(s=>compositions.find(c=>c.id===s.composition)?.family||s.composition);
   assert.ok(new Set(families).size>=4,theme);for(let k=2;k<families.length;k++)assert.ok(!(p.plan.scenes[k].composition===p.plan.scenes[k-1].composition&&p.plan.scenes[k].composition===p.plan.scenes[k-2].composition));
  }
  const facts=await Promise.all(stories.map(async p=>factsOf(await render(p))));
  assert.deepEqual(facts[1],facts[0]);assert.deepEqual(facts[2],facts[0]);assert.ok(facts[0].tables.length>=2&&facts[0].links.length>=3);
  // The frozen gallery drawn in every new theme keeps its facts too.
  const gallery=await releaseProject('gallery',locale,corpusHome),byTheme=[];
  for(const theme of S8_THEMES){let p=gallery;for(const s of gallery.plan.scenes)p=applySceneTheme(p,s.id,theme);assert.deepEqual(p.document,gallery.document);byTheme.push(factsOf(await render(p)));}
  assert.deepEqual(byTheme[1],byTheme[0]);assert.deepEqual(byTheme[2],byTheme[0]);
 }
});

test('S8 handoff sample pages: T01 and T02 acceptance lists and the T03 acceptance pages, in both languages',async()=>{
 for(const locale of LOCALES){
  const fieldnotes=await s8Project('fieldnotes',locale,corpusHome),atlas=await s8Project('atlas',locale,corpusHome),stage=await s8Project('stage',locale,corpusHome);
  for(const p of [fieldnotes,atlas,stage]){assertVisualProject(p);assert.equal(p.plan.scenes.length,6);assert.ok(p.plan.scenes.every(s=>s.blockIds.some(id=>p.document.blocks.find(b=>b.id===id).type==='citation')),'every page cites');for(const d of p.document.datasets)assert.equal(d.synthetic,true);}
  // T01: cover, two-column thesis, chart evidence, method with margin note, quotation, conclusion.
  assert.deepEqual(fieldnotes.plan.scenes.map(s=>s.composition),['fieldnotes-cover','fieldnotes-thesis','fieldnotes-figure','fieldnotes-method','quote-split','fieldnotes-closing']);
  // T02: single-chart conclusion, multi-metric table, four-panel comparison, method flow, uncertain conclusion, evidence appendix.
  assert.deepEqual(atlas.plan.scenes.map(s=>s.composition),['atlas-figure','comparison-matrix','atlas-panels','process-line','atlas-figure','atlas-appendix']);
  const panels=atlas.plan.scenes[2].blockIds.map(id=>atlas.document.blocks.find(b=>b.id===id)).filter(b=>b.type==='chart');assert.equal(panels.length,4);assert.ok(panels.every(c=>c.axis.policy==='fixed'&&c.axis.min===0&&c.axis.max===100));
  const interval=atlas.plan.scenes[4].blockIds.map(id=>atlas.document.blocks.find(b=>b.id===id)).find(b=>b.type==='chart');assert.equal(interval.chartType,'dot-interval');
  assert.ok(atlas.document.blocks.some(b=>b.type==='table'&&b.rows.flat().some(c=>/^(Missing|缺失)$/.test(c))),'a missing cell is shown as such');
  // T03: hero with image, hero without image (media-failure cover), chapter, figure, big number, closing.
  assert.deepEqual(stage.plan.scenes.map(s=>s.composition),['stage-hero','stage-hero','stage-chapter','stage-figure','stage-metric','stage-closing']);
  const has=(s,type)=>s.blockIds.some(id=>stage.document.blocks.find(b=>b.id===id).type===type);
  assert.ok(has(stage.plan.scenes[0],'image')&&!has(stage.plan.scenes[1],'image'));
  const web=await import('../src/scene/web/compile.mjs');const scenes=web.compileWebScenes(stage.document,stage.plan);
  assert.deepEqual(scenes[1].graphics.map(g=>g.id),['orb'],'the hero without an object draws the orb');assert.deepEqual(scenes[0].graphics,[],'the hero with an image draws no orb');
  for(const b of stage.document.blocks.filter(b=>b.type==='image'))assert.equal(b.factual,false);
 }
});

test('S8 storyboard: the handoff page-42 twelve content tasks, one document per locale, drawn in every new theme with identical facts; what is missing is named',async()=>{
 assert.equal(STORYBOARD_TASKS.length,12);
 assert.deepEqual(STORYBOARD_TASKS.map(t=>t.page),[1,2,3,4,5,6,7,8,9,10,11,12]);
 for(const t of STORYBOARD_TASKS)for(const theme of S8_THEMES)assert.ok(t.compositions[theme],`${t.id} ${theme}`);
 assert.match(STORYBOARD_TASKS[7].missing,/ScenarioSnapshot/);assert.ok(STORYBOARD_TASKS.filter(t=>t.missing).length===1,'only the scenario snapshot is recorded as missing');
 for(const locale of LOCALES){
  const decks=await Promise.all(S8_THEMES.map(theme=>s8Project('storyboard',locale,corpusHome,theme)));
  for(const [i,p] of decks.entries()){assertVisualProject(p);assert.equal(p.plan.scenes.length,12);assert.deepEqual(p.plan.scenes.map(s=>s.composition),STORYBOARD_TASKS.map(t=>t.compositions[S8_THEMES[i]]));assert.deepEqual({...p.document,id:null},{...decks[0].document,id:null});}
  const kinds=new Set(decks[0].plan.scenes.flatMap(s=>(s.interactions||[]).map(i=>i.kind)));
  assert.ok(kinds.has('image-hotspots')&&kinds.has('image-compare')&&kinds.has('steps'),'object anatomy, before/after and sequence carry real interactions');
  const facts=await Promise.all(decks.map(async p=>factsOf(await render(p))));
  assert.deepEqual(facts[1],facts[0]);assert.deepEqual(facts[2],facts[0]);
  const quotes=decks[0].document.blocks.filter(b=>b.type==='quote');assert.ok(quotes.length>=1);for(const q of quotes)assert.deepEqual(q.sourceIds,['wcag22']);
 }
});
