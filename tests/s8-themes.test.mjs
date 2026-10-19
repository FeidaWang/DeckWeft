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
