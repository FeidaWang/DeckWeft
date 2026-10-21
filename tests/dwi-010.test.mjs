import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import registry from '../themes/palettes/wesanderson.json' with {type:'json'};
import screenshots from '../themes/palettes/wesanderson.screenshot-samples.json' with {type:'json'};
import schema from '../schemas/palette-registry.schema.json' with {type:'json'};
import {validateSchema} from '../src/core/schema.mjs';
import {paletteIds,paletteRecord,paletteEvidence,paletteAliases,assertPaletteReference,PALETTE_REGISTRY} from '../src/design/palette-registry.mjs';
import {hexToRgb,hexToLab} from '../src/design/semantic-colors.mjs';
import {createVisualProject} from '../src/core/visual-project.mjs';
import {dwiSliceDocument,dwiSlicePlan} from './dwi-slice.mjs';
/** DWI-010 (workpacks/wes-instrument/TASKS.md): the immutable palette registry, its provenance and the scene reference. */
const workpack=JSON.parse(await readFile(new URL('../workpacks/wes-instrument/PALETTES.json',import.meta.url),'utf8'));
const rejects=(fn,code,pattern)=>assert.throws(fn,e=>e.code===code&&(!pattern||pattern.test(e.message)));

test('22 unique seed palettes; Rushmore is an alias, not a duplicate',()=>{
 assert.equal(paletteIds().length,22);assert.equal(new Set(paletteIds()).size,22);
 assert.deepEqual(paletteAliases(),{Rushmore:'Rushmore1'});
 assert.ok(!paletteIds().includes('Rushmore'));
 assert.equal(paletteRecord('Rushmore').aliasOf,'Rushmore1');
 assert.deepEqual(paletteRecord('Rushmore').colors,paletteRecord('Rushmore1').colors);
 assert.ok(!paletteIds().includes('Zissou1Continuous'),'the interpolated entry stays excluded');
});

test('source values are the workpack transcription exactly; RGB and Lab are recomputed from hex',()=>{
 assert.ok(validateSchema(registry,schema).ok);
 for(const p of workpack.palettes){
  const r=paletteRecord(p.id);
  assert.deepEqual(r.colors.map(c=>c.hex),p.colors.map(c=>c.hex),p.id);
  assert.deepEqual(r.source,p.source,p.id);assert.deepEqual(r.film,p.film,p.id);
  for(const c of r.colors){assert.deepEqual(hexToRgb(c.hex),c.rgb);hexToLab(c.hex).forEach((v,i)=>assert.ok(Math.abs(v-c.labD65[i])<1e-5,`${p.id} ${c.hex}`));}
 }
});

test('film timestamps stay null and nothing claims frame or official verification',()=>{
 for(const id of paletteIds()){
  const {source}=paletteRecord(id),e=paletteEvidence(id);
  assert.equal(source.frameTimestamp,null);assert.equal(source.filmFrameVerified,false);assert.equal(source.officialPalette,false);assert.equal(source.evidence,'library-values-verified');
  assert.deepEqual(e.filmFrame,{verified:false,timestamp:null});assert.equal(e.official,false);
 }
 const bad=structuredClone(registry);bad.palettes[0].source.frameTimestamp='00:12:03';
 assert.equal(validateSchema(bad,schema).ok,false,'a timestamp without a frame record is refused by the schema');
 bad.palettes[0].source.frameTimestamp=null;bad.palettes[0].source.officialPalette=true;
 assert.equal(validateSchema(bad,schema).ok,false);
});

test('screenshot samples stay a separate record with their own evidence level',()=>{
 assert.equal(screenshots.evidence,'screenshot-sample-only');
 assert.equal(screenshots.rows.length,16);assert.equal(screenshots.rows.flatMap(r=>r.samples).length,76);
 assert.equal(screenshots.rows.flatMap(r=>r.samples).filter(s=>s.exactMatch).length,1);
 for(const p of registry.palettes)assert.ok(!('screenshot' in p)&&!('derivedModes' in p),p.id);
 for(const row of screenshots.rows){const lib=paletteRecord(row.paletteId).colors.map(c=>c.hex);row.samples.forEach((s,i)=>{assert.equal(s.libraryHex,lib[i]);assert.equal(s.exactMatch,s.sampleHex===s.libraryHex);});}
 assert.equal(paletteEvidence('BottleRocket1').screenshot.samples,7);
 assert.equal(paletteEvidence('AsteroidCity1').screenshot,null);
});

test('a scene palette reference is optional, strict and canonical',async()=>{
 assertPaletteReference({id:'Moonrise1',registryVersion:PALETTE_REGISTRY.version,mode:'stage'});
 rejects(()=>assertPaletteReference({id:'Rushmore',registryVersion:1,mode:'light'}),'PALETTE_REFERENCE',/Rushmore1/);
 rejects(()=>assertPaletteReference({id:'Nope',registryVersion:1,mode:'light'}),'PALETTE_REFERENCE');
 rejects(()=>assertPaletteReference({id:'Royal1',registryVersion:2,mode:'light'}),'PALETTE_REFERENCE',/version 2/);
 rejects(()=>assertPaletteReference({id:'Royal1',registryVersion:1,mode:'sepia'}),'PALETTE_REFERENCE');
 const doc=dwiSliceDocument('en'),plan=dwiSlicePlan('en');
 await createVisualProject(doc,plan,{assets:[],id:'p-none'});
 plan.scenes[0].palette={id:'Royal1',registryVersion:1,mode:'light'};await createVisualProject(doc,plan,{assets:[],id:'p-one'});
 plan.scenes[0].palette={id:'Royal1',registryVersion:1,mode:'light',extra:true};
 await assert.rejects(async()=>createVisualProject(doc,plan,{assets:[],id:'p-bad'}),e=>/Unknown field|palette/i.test(e.message+JSON.stringify(e.details)));
});
