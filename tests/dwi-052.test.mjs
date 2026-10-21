import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {assertFilmFrameRecord,paletteIds,paletteEvidence} from '../src/design/palette-registry.mjs';
/** DWI-052 (workpacks/wes-instrument/TASKS.md): film-frame provenance is a reproducible contract; no frame is claimed until a permitted one is sampled. */
const record=()=>({format:'deckweft-film-frame-record',version:1,paletteId:'Moonrise1',
 film:{id:'moonrise-kingdom',title:'Moonrise Kingdom',year:2012,kind:'feature'},
 rights:{basis:'licensed',holder:'TEST FIXTURE — not real media',evidence:'Unit test data only; no frame was sampled.'},
 edition:{release:'Test edition',medium:'blu-ray',transferFunction:'bt1886',colorPrimaries:'bt709'},
 frames:[{timestamp:'00:12:03.120',frameSha256:'a'.repeat(64),excluded:['skin','subtitles']},{timestamp:'00:41:10.000',frameSha256:'b'.repeat(64),excluded:['letterbox']}],
 method:{clustering:'k-means-lab',k:5,seed:20261022,weighting:'pixel-count',deduplicateDeltaE76:6,tool:'test'},
 result:{colors:['#F3DF6C','#CEAB07','#D5D5D3','#24281A'],evidence:'licensed-frame-sampled'}});
const rejects=(fn,pattern)=>assert.throws(fn,e=>e.code==='FRAME_RECORD'&&(!pattern||pattern.test(e.message+JSON.stringify(e.details))));

test('a frame record needs rights, edition, transfer function, timestamps, frame hashes and a seeded method',()=>{
 assertFilmFrameRecord(record());
 for(const k of ['rights','edition','frames','method'])rejects(()=>{const r=record();delete r[k];assertFilmFrameRecord(r);},new RegExp(k));
 rejects(()=>{const r=record();delete r.edition.transferFunction;assertFilmFrameRecord(r);},/transferFunction/);
 rejects(()=>{const r=record();delete r.method.seed;assertFilmFrameRecord(r);},/seed/);
 rejects(()=>{const r=record();r.frames[0].timestamp='about a quarter in';assertFilmFrameRecord(r);});
 rejects(()=>{const r=record();r.rights.basis='found online';assertFilmFrameRecord(r);});
});
test('duplicate frames, unreviewed review claims and more colours than clusters are refused',()=>{
 rejects(()=>{const r=record();r.frames[1].timestamp=r.frames[0].timestamp;assertFilmFrameRecord(r);},/own timestamp/);
 rejects(()=>{const r=record();r.frames[1].frameSha256=r.frames[0].frameSha256;assertFilmFrameRecord(r);},/own hash/);
 rejects(()=>{const r=record();r.result.evidence='independently-reviewed-frame';assertFilmFrameRecord(r);},/reviewer/);
 rejects(()=>{const r=record();r.method.k=3;assertFilmFrameRecord(r);},/more colours/);
});
test('no frame record exists and every palette still says frame evidence is absent',async()=>{
 const walk=async dir=>{const out=[];for(const d of await readdir(new URL(dir,import.meta.url),{withFileTypes:true})){if(['node_modules','.git','dist','workpacks'].includes(d.name))continue;if(d.isDirectory())out.push(...await walk(`${dir}${d.name}/`));else if(d.name.endsWith('.json'))out.push(`${dir}${d.name}`);}return out;};
 for(const f of await walk('../themes/'))assert.ok(!(await readFile(new URL(f,import.meta.url),'utf8')).includes('"deckweft-film-frame-record"'),f);
 for(const id of paletteIds())assert.deepEqual(paletteEvidence(id).filmFrame,{verified:false,timestamp:null});
 const coverage=JSON.parse(await readFile(new URL('../workpacks/wes-instrument/data/coverage.json',import.meta.url),'utf8'));
 assert.equal(coverage.scopeComplete,false);assert.ok(coverage.libraryCoverage.every(f=>f.frameVerification==='not-started'));
});
