import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
/**
 * DWI-002 (workpacks/wes-instrument/TASKS.md): the archived research reports stay non-normative, their illustrative values and
 * unsupported commands never reach production code, and every planned asset has a rights disposition.
 */
const root=fileURLToPath(new URL('..',import.meta.url));
const read=async rel=>readFile(path.join(root,rel),'utf8');
const rights=JSON.parse(await read('docs/evidence/dwi/phase-00/dwi-002/rights.json'));
const register=JSON.parse(await read('workpacks/wes-instrument/data/source-register.json'));
const PRODUCTION=['src','public','schemas','themes','bin','skills'];
/** The archived executive report's illustrative palettes (PAL001, PAL002) and its two unverified commands. */
const REPORT_HEX=['#C83A22','#EEDD2F','#61A44F','#77C4D3','#D9A441','#D94560','#E38C29','#F4B27D'];
const REPORT_COMMANDS=[/openai\s+slides\b/i,/\bslides_api\b/,/\bPAL00[12]\b/];
async function files(dir){const out=[];for(const d of await readdir(path.join(root,dir),{withFileTypes:true})){const rel=`${dir}/${d.name}`;if(d.name==='vendor'||d.name==='node_modules')continue;if(d.isDirectory())out.push(...await files(rel));else if(/\.(m?js|json|css|html|md)$/.test(d.name))out.push(rel);}return out;}

test('production code carries none of the archived reports’ illustrative colours or commands',async()=>{
 const hits=[];
 for(const dir of PRODUCTION)for(const rel of await files(dir)){const text=await read(rel);for(const hex of REPORT_HEX)if(text.toUpperCase().includes(hex))hits.push(`${rel}: ${hex}`);for(const re of REPORT_COMMANDS)if(re.test(text))hits.push(`${rel}: ${re}`);}
 assert.deepEqual(hits,[]);
});

test('every planned asset has one disposition and resolvable sources',()=>{
 const ids=new Set(register.sources.map(s=>s.id));
 assert.equal(new Set(rights.assets.map(a=>a.id)).size,rights.assets.length);
 for(const a of rights.assets){
  assert.ok(['import','reference-only','excluded'].includes(a.disposition),a.id);
  assert.ok(a.licence&&a.conditions.length,a.id);
  for(const id of a.sourceIds)assert.ok(ids.has(id),`${a.id}: ${id}`);
 }
 const by=Object.fromEntries(rights.assets.map(a=>[a.id,a.disposition]));
 assert.equal(by['archived-research-reports'],'excluded');
 assert.equal(by['film-frames'],'excluded');
 assert.equal(by.fonts,'excluded');
 assert.equal(by['codex-slides-interface'],'excluded');
 assert.equal(by['user-palette-screenshot'],'reference-only');
});

test('the private input archive is ignored and never tracked',()=>{
 const tracked=execFileSync('git',['ls-files','workpacks/wes-instrument/inputs'],{cwd:root,encoding:'utf8'});
 assert.equal(tracked.trim(),'');
 const ignored=execFileSync('git',['check-ignore','workpacks/wes-instrument/inputs/palette-screenshot.png'],{cwd:root,encoding:'utf8'});
 assert.match(ignored,/inputs\/palette-screenshot\.png/);
});

test('the seed palettes keep library evidence apart from film-frame evidence',async()=>{
 const data=JSON.parse(await read('workpacks/wes-instrument/PALETTES.json'));
 assert.equal(data.palettes.length,22);
 for(const p of data.palettes){
  assert.equal(p.source.evidence,'library-values-verified',p.id);
  assert.equal(p.source.officialPalette,false,p.id);
  assert.equal(p.source.filmFrameVerified,false,p.id);
  assert.equal(p.source.frameTimestamp,null,p.id);
 }
});
