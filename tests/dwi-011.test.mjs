import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {paletteIds,paletteRecord} from '../src/design/palette-registry.mjs';
import {paletteRoles,rolePairs,applyPalette,composite,effectiveContrast,contrastRatio,mixHex,STATUS_COLORS,TEXT_MIN,GRAPHIC_MIN,STAGE_BODY_TARGET} from '../src/design/semantic-colors.mjs';
import {resolveTheme,themePacks} from '../src/design/theme-registry.mjs';
import {blend} from '../src/targets/pptx/compile.mjs';
import {contrast as pptxContrast} from '../src/targets/pptx/audit.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {dwiSliceProject} from './dwi-slice.mjs';
/** DWI-011 (workpacks/wes-instrument/TASKS.md): light, dark and stage role tokens derived from the immutable palettes. */
const workpack=JSON.parse(await readFile(new URL('../workpacks/wes-instrument/PALETTES.json',import.meta.url),'utf8'));
const MODES=['light','dark','stage'],ref=(id,mode)=>({id,registryVersion:1,mode});
const all=paletteIds().flatMap(id=>MODES.map(mode=>({id,mode,t:paletteRoles(ref(id,mode))})));

test('derived roles never overwrite source colours; every adjusted value names its source swatch',()=>{
 const before=JSON.stringify(paletteIds().map(paletteRecord));
 for(const {id,t} of all){
  const src=paletteRecord(id).colors.map(c=>c.hex);
  for(const o of [t.origins.accent,t.origins.secondary,...t.origins.series]){
   assert.ok(Number.isInteger(o.sourceIndex)&&o.sourceIndex<src.length,id);
   if(o.adjusted){assert.equal(o.sourceHex,src[o.sourceIndex]);assert.notEqual(o.hex,o.sourceHex);}else assert.equal(o.hex,src[o.sourceIndex]);
  }
 }
 assert.equal(JSON.stringify(paletteIds().map(paletteRecord)),before);
});

test('normal text pairs reach 4.5:1 unrounded, meaningful graphics 3:1, stage body text 7:1',()=>{
 const failures=all.flatMap(({id,mode,t})=>rolePairs(t).filter(p=>!p.pass).map(p=>`${id}/${mode} ${p.fg} on ${p.bg} ${p.ratio}`));
 assert.deepEqual(failures,[]);
 for(const {id,mode,t} of all){
  for(const p of rolePairs(t))assert.ok(p.minimum>=(p.fg.startsWith('series')||['focusRing','essentialStroke','diagramConnector','seriesOutlines'].includes(p.fg)?GRAPHIC_MIN:TEXT_MIN));
  if(mode==='stage')for(const fg of ['text','mutedText'])for(const bg of ['canvas','surface'])assert.ok(contrastRatio(t[fg],t[bg])>=STAGE_BODY_TARGET,`${id} ${fg}`);
 }
 // Unrounded: a pair at 4.49 is a failure even though it prints as 4.5.
 assert.ok(contrastRatio('#777777','#FFFFFF')<4.5&&contrastRatio('#777777','#FFFFFF').toFixed(1)==='4.5');
});

test('status colours are semantic, identical for every palette in a mode, and readable',()=>{
 for(const {mode,t} of all)assert.deepEqual(t.status,STATUS_COLORS[mode]);
 for(const {t} of all)for(const c of Object.values(t.status))for(const bg of [t.canvas,t.surface])assert.ok(contrastRatio(c,bg)>=TEXT_MIN);
 for(const {id,t} of all)for(const c of Object.values(t.status))assert.ok(!paletteRecord(id).colors.some(s=>s.hex===c),'no status colour is a film swatch');
});

test('neutrals follow the workpack derivation v1; accents differ only where DeckWeft draws them as text',()=>{
 for(const p of workpack.palettes)for(const mode of MODES){
  const v1=p.derivedModes[mode],t=paletteRoles(ref(p.id,mode));
  assert.equal(t.canvas,v1.canvas);assert.equal(t.surface,v1.surface);assert.equal(t.text,v1.text);
  if(mode!=='stage')assert.equal(t.mutedText,v1.mutedText);
  if(contrastRatio(v1.accent,v1.canvas)>=TEXT_MIN&&contrastRatio(v1.accent,v1.surface)>=TEXT_MIN&&t.origins.accent.sourceIndex===0)assert.equal(t.accent,v1.accent);
 }
});

test('alpha: composited colours agree with the PowerPoint exporter and contrast is measured on the result',()=>{
 const vectors=[['#A42820',.5,'#FFFFFF'],['#3B9AB2',.25,'#151716'],['#000000',.1,'#FCF7F7'],['#F21A00',1,'#123456'],['#ECCBAE',0,'#046C9A']];
 for(const [fg,a,bg] of vectors){const ours=composite(fg,a,bg),theirs=blend({hex:fg.slice(1),alpha:a},{hex:bg.slice(1)}).hex;assert.equal(ours.slice(1),theirs.toUpperCase(),`${fg}@${a} over ${bg}`);}
 for(const [a,b] of [['#171917','#FCF7F7'],['#A42820','#FFFFFF'],['#FAFAF7','#232624']])assert.ok(Math.abs(contrastRatio(a,b)-pptxContrast(a.slice(1),b.slice(1)))<1e-12);
 // A translucent accent fails where the opaque one passes: the audit composites first.
 assert.ok(effectiveContrast('#A42820','#FFFFFF')>=TEXT_MIN);assert.ok(effectiveContrast('#A42820','#FFFFFF',{alpha:.4})<TEXT_MIN);
 assert.equal(mixHex('#000000','#FFFFFF',.5),'#808080');
});

test('without a palette the theme is unchanged; with one only colours change',()=>{
 for(const pack of themePacks())for(const locale of ['en','zh-CN']){
  const plain=resolveTheme(pack.id,pack.version,locale);
  assert.deepEqual(resolveTheme(pack.id,pack.version,locale,{palette:null}),plain);
  const t=resolveTheme(pack.id,pack.version,locale,{palette:ref('Royal1','dark')}),r=paletteRoles(ref('Royal1','dark'));
  assert.equal(t.paper,r.canvas);assert.equal(t.ink,r.text);assert.equal(t.accent,r.accent);assert.equal(t.secondary,r.secondary);assert.deepEqual(t.chart,r.series);
  assert.equal(t.tokens.palette.reference,r.referenceText);assert.equal(t.tokens.palette.missing,r.missingMark);
  for(const k of ['display','body','code','page','gap','displayScale','split','motion','compositions','rules'])assert.deepEqual(t[k],plain[k],k);
 }
 const theme=resolveTheme('cream-collage','1.0.0','en');assert.equal(applyPalette(theme,null),theme);
});

test('the HTML export draws the derived tokens on the declaring page only; other pages keep the theme colours',async()=>{
 const p=await dwiSliceProject('en');p.plan.scenes[0].palette=ref('Darjeeling2','light');p.plan.scenes[2].palette=ref('Darjeeling2','stage');
 const out=exportDeck(p.document,'html',{experimentalWeb:true,plan:p.plan,assetResources:{}}),r=paletteRoles(ref('Darjeeling2','light')),s=paletteRoles(ref('Darjeeling2','stage'));
 const style=i=>out.sceneMarkup[i].match(/style="([^"]+)"/)[1];
 assert.ok(style(0).includes(`--paper:${r.canvas};--ink:${r.text};--accent:${r.accent};--secondary:${r.secondary}`));
 assert.match(out.sceneMarkup[0],/data-palette="Darjeeling2" data-palette-mode="light"/);
 assert.ok(style(2).includes(`--paper:${s.canvas}`));
 for(const c of s.series.slice(0,2))assert.ok(out.sceneMarkup[2].includes(c),`series ${c} drawn on the chart page`);
 const pack=themePacks().find(t=>t.id==='silver-gray-editorial');
 assert.ok(style(1).includes(`--paper:${pack.palette.paper}`));assert.ok(!/data-palette=/.test(out.sceneMarkup[1]));
});
