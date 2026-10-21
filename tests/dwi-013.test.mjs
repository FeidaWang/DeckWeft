import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyScenePalette,applySceneTheme} from '../src/design/profile.mjs';
import {paletteCatalogue} from '../src/design/semantic-colors.mjs';
import {startStudio} from '../src/services/server.mjs';
import {dict} from '../public/i18n.js';
import {temp} from './helpers.mjs';
import {dwiSliceProject} from './dwi-slice.mjs';
/** DWI-013 (workpacks/wes-instrument/TASKS.md): one palette picker with compact evidence; switching keeps content, locks and undo. */
const ref=(id,mode)=>({id,registryVersion:1,mode});
const visualJs=await readFile(new URL('../public/kinds/visual.js',import.meta.url),'utf8');

test('a palette switch changes only scene.palette; clearing it returns the original plan',async()=>{
 const p=await dwiSliceProject('en'),a=applyScenePalette(p,'assertion',ref('Royal1','light'));
 assert.deepEqual(a.document,p.document,'blocks, values, sources and locks unchanged');
 assert.deepEqual(a.plan.scenes[0].palette,ref('Royal1','light'));
 assert.deepEqual({...a.plan.scenes[0],palette:undefined},{...p.plan.scenes[0],palette:undefined});
 assert.deepEqual(a.plan.scenes.slice(1),p.plan.scenes.slice(1),'other pages untouched');
 const b=applyScenePalette(a,'assertion',ref('Royal1','stage'));assert.equal(b.plan.scenes[0].palette.mode,'stage');
 assert.deepEqual(applyScenePalette(b,'assertion',null).plan,p.plan);
 const themed=applySceneTheme(b,'assertion','dark-data');assert.deepEqual(themed.plan.scenes[0].palette,ref('Royal1','stage'),'a theme change keeps the palette');
});

test('a theme lock holds the palette; invalid references are refused with the project unchanged',async()=>{
 const p=await dwiSliceProject('en');
 assert.equal(applyScenePalette(p,'mechanism',ref('Royal1','light')).plan.scenes[4].palette.id,'Royal1','a composition lock alone does not hold colours');
 p.document.authorOverrides.sceneLocks=[{sceneId:'mechanism',fields:['composition','theme']}];
 assert.throws(()=>applyScenePalette(p,'mechanism',ref('Royal1','light')),e=>e.code==='AUTHOR_LOCK'&&e.status===409);
 const before=structuredClone(p);
 assert.throws(()=>applyScenePalette(p,'assertion',ref('Rushmore','light')),e=>e.code==='PALETTE_REFERENCE'&&/Rushmore1/.test(e.message));
 assert.throws(()=>applyScenePalette(p,'nope',ref('Royal1','light')),e=>e.code==='PALETTE_SELECTION');
 assert.deepEqual(p,before);
});

test('one picker inside the Look zone, beside the theme colours, with an expandable evidence note',()=>{
 assert.equal((visualJs.match(/id="paletteSelect"/g)||[]).length,1);
 assert.equal((visualJs.match(/id="paletteEvidence"/g)||[]).length,1);
 assert.ok(visualJs.indexOf('class="theme-options"')<visualJs.indexOf('id="paletteSelect"'),'picker follows the colour swatches');
 assert.match(visualJs,/<details id="paletteEvidence"/,'evidence is behind a disclosure, not on the slide');
 assert.match(visualJs,/changed\(\(\)=>state\.project=project,\{fields:true\}\)/,'applied through the normal edit path (undo)');
 const keys=[...visualJs.matchAll(/t\('(visual\.look\.palette[A-Za-z]*)'/g),...visualJs.matchAll(/data-i18n="(visual\.look\.palette[A-Za-z]*)"/g)].map(m=>m[1]);
 for(const k of new Set(keys)){assert.ok(dict.en[k],`en ${k}`);assert.ok(dict.zh[k],`zh ${k}`);}
 assert.match(dict.en['visual.look.paletteNotOfficial'],/Not an official/);assert.match(dict.zh['visual.look.paletteNotOfficial'],/不是电影官方/);
});

test('the catalogue states the evidence that exists and nothing more',()=>{
 const c=paletteCatalogue();
 assert.equal(c.palettes.length,22);
 for(const p of c.palettes){assert.equal(p.evidence.official,false);assert.equal(p.evidence.filmFrameVerified,false);assert.equal(p.evidence.library,'library-values-verified');for(const m of c.modes)assert.ok(p.preview[m].accent);}
 assert.equal(c.palettes.filter(p=>p.evidence.screenshot).length,16);
});

test('the studio serves the catalogue and applies a palette through its API',async t=>{
 const home=await temp(t),app=await startStudio({home,port:0,seed:false});t.after(()=>app.close());
 const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const list=await(await fetch(app.url+'/api/visual/palettes',{headers})).json();assert.equal(list.palettes.length,22);
 const p=await dwiSliceProject('en');
 const r=await fetch(app.url+'/api/visual/palette',{method:'POST',headers,body:JSON.stringify({project:p,sceneId:'brief',palette:ref('GrandBudapest1','dark')})});
 assert.equal(r.status,200);assert.deepEqual((await r.json()).project.plan.scenes[5].palette,ref('GrandBudapest1','dark'));
 const bad=await fetch(app.url+'/api/visual/palette',{method:'POST',headers,body:JSON.stringify({project:p,sceneId:'brief',palette:ref('Nope','dark')})});
 assert.equal(bad.status,400);
});
