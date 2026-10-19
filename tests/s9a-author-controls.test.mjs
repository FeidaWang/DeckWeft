import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {temp} from './helpers.mjs';
import {createVisualTask} from '../src/agent/director.mjs';
import {createCompositionDemo} from '../src/core/composition-demo.mjs';
import {assertVisualProject,assertVisualLocks} from '../src/core/visual-project.mjs';
import {assertDesignPlan} from '../src/design/plan.mjs';
import {VisualProjectStore} from '../src/services/visual-store.mjs';
import {DesignProfileStore} from '../src/services/profile-store.mjs';
import {startStudio} from '../src/services/server.mjs';
import {separateLocks} from '../src/core/adapters/locks.mjs';
import {chapterRuns,startChapter} from '../src/design/chapters.mjs';
import {effectiveProfile} from '../src/design/theme-registry.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import {revealRequired,freezeViews,staticStates} from '../src/targets/static-delivery.mjs';
import {readiness} from '../src/targets/export-order.mjs';
import {planAuthorAction,AUTHOR_ACTIONS} from '../src/workbench/author-actions.mjs';
import {planDirections,applyDirection,factsHash,entryAnswers,ENTRY_OPTIONS} from '../src/workbench/directions.mjs';
import {resolveScope,describeScope} from '../src/workbench/scope.mjs';
import {promoteProfile,assertDesignProfile,tokenDrift} from '../src/design/design-profile.mjs';
import {applyChoices,preferences} from '../src/workbench/preferences.mjs';

const TEXT='Why do exports drift?\nTeams lose hours fixing slides after export.\nThe fixes are rarely recorded.\n---\nHow the pipeline works\nThe browser measures the static scene.\nEach page is repaired on its own.\n- Measure the static scene\n- Repair one page\n---\nWhat we measured\nPowerPoint editability passed on 18 of 18 decks.\n---\nLimits\nKeynote was not run.\n---\nNext steps\n- Run PowerPoint yourself\n- Record the result';
const textDeck=()=>createVisualTask({request:TEXT}).project;
async function demo(t,locale='en'){const home=await temp(t),store=await new VisualProjectStore(home).init();return {store,project:await createCompositionDemo(locale,store.home)};}
const rejects=(fn,code)=>assert.throws(fn,e=>e.code===code,code);
const sceneOf=(p,id)=>p.plan.scenes.find(s=>s.id===id);

test('S9a contract: optional chapters, page disclosure and separate locks; legacy fixtures stay valid and every negative fixture is refused',async()=>{
 for(const name of ['wave-a.en','wave-a.zh-CN','families.en','evidence-scene.zh-CN']){const f=JSON.parse(await readFile(new URL(`./fixtures/visual/${name}.json`,import.meta.url),'utf8'));assert.ok(assertDesignPlan(f.document,f.plan));assert.equal(f.plan.chapters,undefined);assert.equal(f.document.authorOverrides.lockMode,undefined);}
 const negative=JSON.parse(await readFile(new URL('./fixtures/visual/s9a.negative.json',import.meta.url),'utf8')),base=textDeck();
 // Placeholders: @n is the n-th page id, @block:n a block of page n, @focal:n page n's focal block.
 const resolve=v=>typeof v==='string'&&v.startsWith('@')?(v.startsWith('@block:')?base.plan.scenes[+v.slice(7)].blockIds.at(-1):v.startsWith('@focal:')?base.plan.scenes[+v.slice(7)].focalBlockId:base.plan.scenes[+v.slice(1)].id):Array.isArray(v)?v.map(resolve):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,resolve(x)])):v;
 for(const c of negative.cases){const p=structuredClone(base);for(const [path,raw] of Object.entries(c.set)){const value=resolve(raw);const keys=path.split('.');let o=p;for(const k of keys.slice(0,-1))o=o[/^\d+$/.test(k)?Number(k):k];o[keys.at(-1)]=value;}
  assert.throws(()=>assertVisualProject(p),e=>['INVALID_DESIGN_PLAN','INVALID_VISUAL_PROJECT','INVALID_PRESENTATION','INVALID_DOCUMENT'].includes(e.code),c.why);}
 assert.ok(negative.cases.length>=8);
});

test('S9a chapters: runs follow page order, a chapter profile sits between deck and page, and a split keeps the rendering',()=>{
 let p=textDeck();const [a,b,c]=p.plan.scenes.map(s=>s.id);
 p.plan=startChapter(p.plan,b);assert.deepEqual(chapterRuns(p.plan).map(r=>r.sceneIds),[p.plan.scenes.slice(1).map(s=>s.id)]);
 rejects(()=>startChapter(p.plan,b),'CHAPTER_EXISTS');
 p.plan.chapters[0].profile={colorIntensity:'restrained',typographicContrast:'balanced',density:'compact',motionIntensity:'off',imageEmphasis:'balanced'};
 assert.equal(effectiveProfile(p.document,sceneOf(p,a),p.plan).density,'comfortable');assert.equal(effectiveProfile(p.document,sceneOf(p,c),p.plan).density,'compact');
 sceneOf(p,c).profile={...p.plan.chapters[0].profile,density:'comfortable'};assert.equal(effectiveProfile(p.document,sceneOf(p,c),p.plan).density,'comfortable','page beats chapter');
 const html=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true}).body;
 assert.match(html,new RegExp(`id="${b}"[^>]*data-profile="compact"`));assert.match(html,new RegExp(`id="${a}"[^>]*data-profile="comfortable"`));
 const split=structuredClone(p);split.plan=startChapter(split.plan,c);assert.equal(exportDeck(split.document,'html',{plan:split.plan,experimentalWeb:true}).body.replace(/[a-f0-9]{64}/g,''),html.replace(/[a-f0-9]{64}/g,''),'a new chapter inherits its parent profile');
});

test('S9a page disclosure: moved text stays in the web page, the PowerPoint notes and the PDF appendix input',async t=>{
 const {store,project}=await demo(t),plan=planAuthorAction(project,{action:'reduce-text',level:'object',id:'chapter-body'}),next=plan.project,assetResources=await visualAssetResources(next,store.home);
 assert.deepEqual(next.document,project.document,'reduce text never edits the document');
 assert.deepEqual(sceneOf(next,'chapter').disclosure,{blockIds:['chapter-body']});
 const html=exportDeck(next.document,'html',{plan:next.plan,experimentalWeb:true,assetResources}).body,text=project.document.blocks.find(b=>b.id==='chapter-body').text;
 assert.match(html,/<details class="scene-disclosure" data-disclosure="chapter"><summary>More detail · 1 item<\/summary>/);assert.ok(html.includes(text.split('\n')[0]));
 const scenes=exportDeck(next.document,'html',{plan:next.plan,experimentalWeb:true,assetResources}).scenes;assert.ok(!scenes.find(s=>s.id==='chapter').regions.some(r=>r.blockId==='chapter-body'),'disclosed text is outside the composition');
 const states=staticStates(next.document,next.plan),notes=revealRequired(next.document,next.plan,freezeViews(next.document,next.plan,states)).find(s=>s.sceneId==='chapter').notes.find(n=>n.kind==='disclosure');
 assert.deepEqual(notes.lines,text.split('\n'));
 const bad=structuredClone(next);sceneOf(bad,'chapter').disclosure={blockIds:[sceneOf(bad,'chapter').focalBlockId]};rejects(()=>assertVisualProject(bad),'INVALID_DESIGN_PLAN');
});

test('S9a separate locks: the migration releases nothing; data and source locks bind without a text lock and survive theme change, source update and history restore',async t=>{
 const {store,project}=await demo(t);let p=structuredClone(project);p.document.authorOverrides.lockedBlockIds=['data-chart'];
 const sep=separateLocks(p);assert.equal(sep.document.authorOverrides.lockMode,'separate');assert.deepEqual(sep.document.authorOverrides.lockedDatasetIds,['adoption-quarterly']);assert.deepEqual(sep.document.authorOverrides.lockedSourceIds,['synthetic-source']);assert.deepEqual(separateLocks(sep),sep);
 const sneaky=structuredClone(p);sneaky.document.authorOverrides.lockMode='separate';rejects(()=>assertVisualLocks(p,sneaky),'AUTHOR_LOCK');
 // Data locked, text free: the chart's question can change, its values cannot.
 const dataOnly=structuredClone(sep);dataOnly.document.authorOverrides.lockedBlockIds=[];dataOnly.document.authorOverrides.lockedSourceIds=[];
 const words=structuredClone(dataOnly);words.document.blocks.find(b=>b.id==='data-chart').question='Which quarter grew most?';assert.doesNotThrow(()=>assertVisualLocks(dataOnly,words));
 const values=structuredClone(dataOnly);values.document.datasets[0].series[0].values[0]+=1;rejects(()=>assertVisualLocks(dataOnly,values),'AUTHOR_LOCK');
 const source=structuredClone(sep);source.document.sources[0].title='Renamed';rejects(()=>assertVisualLocks(sep,source),'AUTHOR_LOCK');
 // Survival.
 let saved=await store.save(sep,{create:true});const themed=applySceneTheme(saved,'evidence','fresh-report');assert.deepEqual(themed.document.authorOverrides,sep.document.authorOverrides);
 saved=await store.save(themed,{expectedRevision:saved.revision.number});const edited=structuredClone(saved);edited.document.blocks.find(b=>b.id==='chapter-body').text+=' Updated.';saved=await store.save(edited,{expectedRevision:saved.revision.number});
 assert.deepEqual(saved.document.authorOverrides,sep.document.authorOverrides,'source update keeps the locks');
 const restored=await store.restoreAsCopy(saved.id,1,{snapshotHash:(await store.snapshot(saved.id,1)).sha256,requestId:'s9a-restore-locks-0001'});const copy=restored.project||restored;
 assert.deepEqual(copy.document.authorOverrides,sep.document.authorOverrides,'history restore keeps the locks');
});

test('S9a scope: four levels resolve to pages and objects and the statement names locks before anything changes',async t=>{
 const {project}=await demo(t);let p=structuredClone(project);p.plan=startChapter(p.plan,'comparison');p.document.authorOverrides.sceneLocks=[{sceneId:'process',fields:['composition']}];
 assert.deepEqual(resolveScope(p,{level:'chapter',id:'ch-comparison'}).sceneIds,['comparison','process']);assert.deepEqual(resolveScope(p,{level:'object',id:'data-chart'}).sceneIds,['evidence']);
 rejects(()=>resolveScope(p,{level:'chapter',id:'missing'}),'TOOL_SCOPE');
 const s=describeScope(p,resolveScope(p,{level:'chapter',id:'ch-comparison'}),{changes:['composition']});
 assert.match(s.en,/pages 5–6; no other page changes/);assert.match(s.en,/composition locked on page 6/);assert.match(s.zh,/第 6 页构图已锁定/);
});

test('S9a author actions: each states its effect first, changes nothing until applied, keeps facts and honours locks',async t=>{
 const {project}=await demo(t),frozen=JSON.stringify(project),facts=factsHash(project.document);
 const atlas=applySceneTheme(project,'evidence','fresh-report');assert.match(planAuthorAction(atlas,{action:'chart-space',level:'object',id:'data-chart'}).effects[0].en,/figure layout draws the plot largest/);
 assert.equal(planAuthorAction(project,{action:'chart-space',level:'page',id:'evidence'}).changed,false,'a synthetic-data caveat stays beside the chart');
 for(const [action,level,id,options] of [['more-editorial','deck'],['keep-layout','page','collage'],['reduce-text','object','chapter-body'],['start-chapter','page','comparison'],['lock','object','data-chart',{kind:'data'}]]){
  const plan=planAuthorAction(project,{action,level,id,options});
  assert.equal(JSON.stringify(project),frozen,action+' leaves its input unchanged');assert.ok(plan.changed&&plan.effects.length,action+' states an effect');assert.ok(plan.scopeStatement.en&&plan.scopeStatement.zh);
  assert.equal(factsHash(plan.project.document),facts,action+' keeps facts');assertVisualLocks(project,plan.project);
 }
 // Locks win and are reported.
 const locked=structuredClone(project);locked.document.authorOverrides.sceneLocks=[{sceneId:'evidence',fields:['composition']}];
 const lockedAtlas=applySceneTheme(locked,'evidence','fresh-report'),kept=planAuthorAction(lockedAtlas,{action:'chart-space',level:'object',id:'data-chart'});assert.equal(kept.changed,false);assert.match(kept.kept[0].en,/composition locked/);
 rejects(()=>planAuthorAction(project,{action:'replace-visual',level:'page',id:'violet'}),'TOOL_SCOPE');
 assert.deepEqual(Object.keys(AUTHOR_ACTIONS).slice(0,6),['more-editorial','chart-space','quieter','keep-layout','replace-visual','reduce-text']);
});

test('S9a Make quieter, Replace the visual and Reduce text do only what they state',async t=>{
 const {project}=await demo(t);let p=structuredClone(project);p.document.visualBrief={...(p.document.visualBrief||{audience:'',outputLanguage:'en'}),profile:{colorIntensity:'bold',typographicContrast:'expressive',density:'comfortable',motionIntensity:'subtle',imageEmphasis:'large'}};
 const quiet=planAuthorAction(p,{action:'quieter',level:'page',id:'evidence'});assert.deepEqual(sceneOf(quiet.project,'evidence').motion,{policy:'off',durationMs:0});assert.match(quiet.effects[0].en,/every key state stays reachable/);
 const deckQuiet=planAuthorAction(p,{action:'quieter',level:'deck'});assert.equal(deckQuiet.project.document.visualBrief.profile.motionIntensity,'off');
 assert.equal(planAuthorAction(project,{action:'quieter',level:'deck'}).changed,false,'already quiet is stated, not changed');
 const second={...structuredClone(p.assets[0]),id:'asset_second'};p.assets.push(second);
 rejects(()=>planAuthorAction(p,{action:'replace-visual',level:'object',id:'violet-image',options:{assetId:'asset_second'}}),'AUTHOR_ACTION');
 const replaced=planAuthorAction(p,{action:'replace-visual',level:'object',id:'violet-image',options:{assetId:'asset_second',alt:'A second original image'}});
 const changedBlocks=replaced.project.document.blocks.filter((b,i)=>JSON.stringify(b)!==JSON.stringify(p.document.blocks[i])).map(b=>b.id);assert.deepEqual(changedBlocks,['violet-image']);assert.deepEqual(replaced.project.plan,p.plan);
 const lockedImage=structuredClone(p);lockedImage.document.authorOverrides.lockedBlockIds=['violet-image'];rejects(()=>planAuthorAction(lockedImage,{action:'replace-visual',level:'object',id:'violet-image',options:{assetId:'asset_second',alt:'x'}}),'AUTHOR_LOCK');
 // Reduce text on a text deck: numbers, units and qualifications stay on the page; nothing leaves the document.
 const deck=textDeck(),reduced=planAuthorAction(deck,{action:'reduce-text',level:'deck'});
 assert.deepEqual(reduced.project.document,deck.document);for(const s of reduced.project.plan.scenes)for(const id of s.disclosure?.blockIds||[]){const b=deck.document.blocks.find(b=>b.id===id);assert.ok(!/\d/.test(b.type==='list'?b.items.join(' '):b.text),'no number moves automatically');}
 assert.ok(reduced.effects.every(e=>/PowerPoint notes and in the PDF appendix/.test(e.en)));
});

test('S9a three directions: same facts, different graphics, type, media and motion, for every style answer; deterministic and lock-aware',async t=>{
 const {project}=await demo(t);
 for(const p of [textDeck(),project])for(const style of ENTRY_OPTIONS.style){
  const r=planDirections(p,{topic:'x',style,detail:'standard',motion:'off',output:'pptx'});
  assert.equal(new Set(r.directions.map(d=>factsHash(d.project.document))).size,1);assert.equal(r.factsHash,factsHash(p.document));
  for(const d of r.differences)assert.deepEqual(d.differs,{graphics:true,type:true,media:true,motion:true},style+' '+d.pair);
  if(style!=='auto')assert.equal(r.directions[0].direction.theme,style);
  for(const d of r.directions)for(const k of ['graphics','type','media','motion','output','facts'])assert.ok(d.explanation[k].en&&d.explanation[k].zh);
 }
 const a={topic:'x',style:'auto',detail:'detailed',motion:'subtle',output:'web',audience:'Platform team'};
 assert.deepEqual(applyDirection(project,a,1).project,applyDirection(project,a,1).project);
 const brief=applyDirection(project,a,0).project.document.visualBrief;assert.equal(brief.audience,'Platform team');assert.equal(brief.profile.density,'compact');assert.equal(brief.profile.motionIntensity,'subtle');
 const locked=structuredClone(project);locked.document.authorOverrides.sceneLocks=[{sceneId:'collage',fields:['theme']}];
 const kept=applyDirection(locked,a,0);assert.equal(sceneOf(kept.project,'collage').theme,sceneOf(project,'collage').theme);assert.deepEqual(kept.kept,[{sceneId:'collage',reason:'theme-lock'}]);
 assert.throws(()=>entryAnswers({style:'neon'}),e=>e.code==='WORKBENCH_ENTRY');assert.throws(()=>entryAnswers({colour:'x'}),e=>e.code==='WORKBENCH_ENTRY');
});

test('S9a design profiles carry no text, data, sources, images or branding, round-trip through save and reload, and apply with stated effects',async t=>{
 const home=await temp(t),store=await new VisualProjectStore(home).init(),deck=await createCompositionDemo('zh-CN',store.home);let accepted=deck;for(const s of deck.plan.scenes)accepted=applySceneTheme(accepted,s.id,'orange-launch');
 const {profile}=promoteProfile(accepted,{id:'launch',name:'Launch talk',acceptance:{kind:'author',acceptedAt:'2026-10-19T00:00:00.000Z'}});
 const json=JSON.stringify(profile),strings=[accepted.document.title,...accepted.document.blocks.flatMap(b=>[b.text,b.alt,...(b.items||[])]).filter(Boolean),...accepted.assets.flatMap(a=>[a.id,a.hash]),...accepted.document.sources.flatMap(s=>[s.id,s.url,s.title]),...accepted.document.datasets.map(d=>d.id)];
 for(const s of strings)assert.ok(!json.includes(s),'profile leaks '+s);
 assert.equal(profile.theme.id,'orange-launch');assert.ok(profile.compositions.length>=3);assert.deepEqual(tokenDrift(profile),[]);
 const profiles=await new DesignProfileStore(store.home).init();await profiles.save(profile);const reloaded=await new DesignProfileStore(store.home).init();assert.deepEqual(await reloaded.get('launch'),profile);
 await assert.rejects(profiles.save(profile),e=>e.code==='PROFILE_EXISTS');
 assert.throws(()=>assertDesignProfile({...profile,notes:'reference text'}),e=>e.code==='DESIGN_PROFILE');assert.throws(()=>assertDesignProfile({...profile,compositions:[{kind:'chart',composition:'atlas-figure'}]}),e=>e.code==='DESIGN_PROFILE');
 const other=textDeck(),applied=planAuthorAction(other,{action:'apply-profile',level:'deck',options:{profile}});
 assert.ok(applied.project.plan.scenes.every(s=>s.theme==='orange-launch'));assert.equal(factsHash(applied.project.document),factsHash(other.document));
 const html=exportDeck(applied.project.document,'html',{plan:applied.project.plan,experimentalWeb:true}).body;assert.match(html,/data-theme="orange-launch"/);
 const drifted=structuredClone(profile);drifted.motion.durationMs=999;assert.deepEqual(tokenDrift(drifted),['motion.durationMs']);
});

test('S9a evidence-required pages refuse final exports and still preview',()=>{
 const p=textDeck();p.plan.scenes[2].contentStatus='evidence-required';
 assert.ok(exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true}).body);
 rejects(()=>readiness(p.document,p.plan,'pptx',{layout:{}}),'EVIDENCE_REQUIRED');
});

test('S9a Studio API: directions, actions, scope, page plan, profiles and the PowerPoint/PDF refusal without a measuring browser',async t=>{
 const home=await temp(t),app=await startStudio({home,port:0,seed:false});t.after(()=>app.close());
 const {token}=await(await fetch(app.url+'/api/session')).json(),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'},call=(path,data,method=data?'POST':'GET')=>fetch(app.url+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})});
 const d=await(await call('/api/visual/directions',{answers:{topic:TEXT,style:'auto',detail:'brief',motion:'off',output:'pdf'},locale:'en'})).json();
 assert.equal(d.sets.length,3);assert.ok(d.sets.every(s=>s.artifactUrl&&s.explanation.facts.en));assert.equal(d.pagePlan.detail,'brief');
 assert.equal((await fetch(app.url+d.sets[0].artifactUrl)).status,200);
 const select=await call('/api/visual/select-direction',{project:d.base,tickets:d.sets.map(s=>s.ticket),index:0});assert.equal(select.status,409,'an unmeasured direction cannot be chosen');
 const project=(await(await call('/api/visual/demo',{locale:'en'})).json()).project;
 const action=await(await call('/api/visual/author-action',{project,action:'more-editorial',level:'deck'})).json();assert.equal(action.format,'deckweft-author-action');
 const scope=await(await call('/api/visual/scope',{project,level:'page',id:project.plan.scenes[0].id,changes:['theme']})).json();assert.match(scope.statement.en,/^Scope: Page 1/);
 const plan=await(await call('/api/visual/page-plan',{project,detail:'standard'})).json();assert.ok(Array.isArray(plan.questions));
 const unsaved=structuredClone(project);unsaved.plan.scenes[0].composition=unsaved.plan.scenes[0].composition==='statement-split'?'statement-center':'statement-split';
 const refusal=async(data,code)=>{const r=await call('/api/visual/profiles',data);assert.equal(r.status,409);assert.equal((await r.json()).error.code,code);};
 await refusal({project:unsaved,name:'Unsaved',attest:true},'PROFILE_UNSAVED');await refusal({project,name:'Demo design'},'PROFILE_NOT_ACCEPTED');
 const ok=await(await call('/api/visual/profiles',{project,name:'Demo design',attest:true})).json();assert.equal(ok.profile.acceptance.kind,'author');
 const exported=await(await call('/api/visual/profiles/'+ok.profile.id)).json();assert.deepEqual(exported,ok.profile);
 const imported=await(await call('/api/visual/profiles/import',{profile:exported})).json();assert.equal(imported.copied,true);assert.notEqual(imported.profile.id,ok.profile.id);
 assert.equal((await(await call('/api/visual/profiles')).json()).profiles.length,2);
 const pptx=await call('/api/visual/export',{project,format:'pptx'});assert.equal(pptx.status,422);assert.equal((await pptx.json()).error.code,'TARGET_BROWSER_REQUIRED');
});

test('S9a workbench: a chosen direction is re-applied to the planned deck exactly as previewed, and an invalid choice is refused',async t=>{
 const {WorkbenchService}=await import('../src/workbench/service.mjs'),home=await temp(t),store=await new VisualProjectStore(home).init(),service=new WorkbenchService({store});t.after(()=>service.close());
 const answers={topic:TEXT,style:'auto',detail:'standard',motion:'off',output:'web',audience:'Release reviewers'};
 await assert.rejects(service.create({request:TEXT,host:'local',direction:{answers,index:5}}),e=>e.code==='WORKBENCH_DIRECTION');
 const created=await service.create({request:TEXT,host:'local',preferences:{},direction:{answers,index:2}});let r;
 for(const deadline=Date.now()+30000;Date.now()<deadline;await new Promise(f=>setTimeout(f,20))){r=await service.get(created.id);if(!r.running&&r.project)break;}
 const expected=applyDirection(createVisualTask({request:TEXT}).project,answers,2).project;
 assert.deepEqual(r.project.plan.scenes.map(s=>[s.theme,s.composition]),expected.plan.scenes.map(s=>[s.theme,s.composition]));
 assert.deepEqual(r.project.document.visualBrief,expected.document.visualBrief);assert.equal(r.preferences.visualStyle,expected.plan.scenes[0].theme);
 assert.equal(factsHash(r.project.document),factsHash(expected.document));
});
