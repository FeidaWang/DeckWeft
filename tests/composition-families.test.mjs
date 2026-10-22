import {watermarkHTML} from '../src/render/web/watermark.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,realpath,rm} from 'node:fs/promises';
import {families,compositions,inferFamily,assertComposition,compositionOrder,describeCandidate,cardRow,eligibleFamilies} from '../src/design/compositions.mjs';
import {candidateProjects,chooseRhythm,rhythmIssues,rulePenalty,transitionCost,splitSmallMultiples,RHYTHM_RULES} from '../src/design/rhythm.mjs';
import {narrativeCost} from '../src/design/art-direction.mjs';
import {applySceneTheme} from '../src/design/profile.mjs';
import {themePacks,resolveTheme} from '../src/design/theme-registry.mjs';
import {createVisualProject,assertVisualProject} from '../src/core/visual-project.mjs';
import {createVisualDemo} from '../src/core/visual-demo.mjs';
import {compileWebScenes} from '../src/scene/web/compile.mjs';
import {exportDeck} from '../src/render/export.mjs';
import {visualAssetResources} from '../src/assets/visual.mjs';
import designPlanSchema from '../schemas/design-plan.schema.json' with {type:'json'};
import webSceneSchema from '../schemas/web-scene.schema.json' with {type:'json'};
import themePackSchema from '../schemas/theme-pack.schema.json' with {type:'json'};
import {familyProject,familyFixture,S3_FAMILIES} from './families.mjs';
import {evidenceProject,semanticView} from './evidence-scene.mjs';
const THEMES=['cream-collage','dark-data','electric-violet'],LOCALES=['en','zh-CN'];
const fixture=async fn=>{const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'dw-families-')));try{await fn(home);}finally{await rm(home,{recursive:true,force:true});}};
const rejects=(fn,pattern,code='COMPOSITION_CONTENT')=>assert.throws(fn,e=>{assert.equal(e.code,code);assert.match(e.message,pattern);return true;});
const sceneOf=(p,id)=>p.plan.scenes.find(s=>s.id===id);
const regionText=(body,id)=>{const start=body.indexOf(`<section id="${id}"`),end=body.indexOf('</section>',start),section=body.slice(start,end);return section.slice(section.indexOf('<div class="regions">')).replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,'|').split('|').map(v=>v.trim()).filter(Boolean);};

test('S3: twelve families, each with three geometries, a required block, focus, density and 1440 / 1024 / 390 rules',()=>{
 assert.equal(Object.keys(families).length,12);assert.equal(compositions.length,36);
 assert.deepEqual(Object.keys(families).filter(f=>families[f].explicit),S3_FAMILIES);
 for(const family of S3_FAMILIES){
  const f=families[family],variants=compositions.filter(c=>c.family===family);
  assert.equal(variants.length,3,family);assert.ok(f.required&&f.label.length===2,family);
  assert.equal(new Set(variants.map(v=>v.focus)).size,3,'three focus zones: '+family);
  for(const v of variants){
   assert.ok(v.density>0&&v.density<1,v.id);assert.ok(v.label.every(Boolean),v.id);
   assert.deepEqual(Object.keys(v.columns),['390','1024','1440'],v.id);assert.equal(v.columns[390],1,'narrow screens read one column: '+v.id);
  }
 }
 assert.deepEqual(families['small-multiples'].sharedScale,['chartType','unit','axis','categories']);assert.deepEqual(families['small-multiples'].panels,{min:2,perPage:2});
 assert.deepEqual(families.quote.layers,{verbatim:'quote',attribution:'citation',paraphrase:'paragraph'});
 assert.ok(families['before-after'].pair.baseline&&families['before-after'].parallel);
 // Schemas and all three theme packs enumerate every geometry; each theme keeps its own extras.
 const ids=compositions.map(c=>c.id);
 for(const list of [designPlanSchema.properties.scenes.items.properties.composition.enum,webSceneSchema.properties.composition.enum,themePackSchema.properties.compositions.items.enum])for(const id of ids)assert.ok(list.includes(id),id);
 for(const pack of themePacks()){for(const id of ids)assert.ok(pack.compositions.includes(id),pack.id+' '+id);for(const locale of LOCALES)assert.deepEqual(resolveTheme(pack.id,pack.version,locale).compositions,pack.compositions);}
});

test('S3: new families are chosen explicitly; inference and the VIS-006 families are unchanged',async()=>fixture(async home=>{
 const p=await familyProject('en',home);
 for(const s of p.plan.scenes)assert.equal(inferFamily(p.document,{...s,composition:'reading-flow'}),s.id==='before-after'?'image':s.id==='system-map'?'process':s.id==='small-multiples'?'evidence':'statement',s.id);
 for(const s of p.plan.scenes)assert.equal(inferFamily(p.document,s),s.id,'a chosen composition keeps its family');
 for(const c of compositions.filter(c=>!families[c.family].explicit))assert.equal(c.cards,c.id==='comparison-stack'?'table':undefined,c.id);
}));

test('S3: every new family renders three candidates in all themes and both languages without changing facts or assets',async()=>fixture(async home=>{
 for(const locale of LOCALES)for(const theme of THEMES){
  const p=await familyProject(locale,home);p.plan.scenes.forEach(s=>s.theme=theme);const candidates=candidateProjects(p),resources=await visualAssetResources(p,home);
  const original=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:resources}).body;
  for(const c of candidates){
   assert.deepEqual(c.document,p.document);assert.deepEqual(c.assets,p.assets);
   for(const [i,s]of c.plan.scenes.entries())assert.deepEqual({...s,composition:''},{...p.plan.scenes[i],composition:''});
   const body=exportDeck(c.document,'html',{plan:c.plan,experimentalWeb:true,assetResources:resources}).body;
   for(const s of c.plan.scenes)assert.deepEqual(regionText(body,s.id).sort(),regionText(original,s.id).sort(),s.id);
  }
  for(const [i,s]of p.plan.scenes.entries())assert.deepEqual(candidates.map(c=>describeCandidate(c.document,c.plan.scenes[i]).family),[s.id,s.id,s.id]);
  for(const [i]of p.plan.scenes.entries())assert.equal(new Set(candidates.map(c=>c.plan.scenes[i].composition)).size,3);
 }
}));

test('S3: reading orders keep the baseline first, each attribution under its quote and the panels in author order',async()=>fixture(async home=>{
 const p=await familyProject('en',home);
 for(const c of compositions.filter(c=>families[c.family].explicit)){
  const s={...sceneOf(p,c.family),composition:c.id},order=compositionOrder(p.document,s);
  assert.deepEqual([...order].sort(),[...s.blockIds].sort(),'every block keeps a region: '+c.id);assert.equal(p.document.blocks.find(b=>b.id===order[0]).type,'heading',c.id);
  if(c.family==='quote')assert.equal(order.indexOf('quote-attribution'),order.indexOf('quote-words')+1,c.id);
  if(c.family==='before-after')assert.ok(order.indexOf('pair-before')<order.indexOf('pair-after'),c.id);
  if(c.id==='before-after-triptych')assert.ok(order.indexOf('pair-before')<order.indexOf('pair-body')&&order.indexOf('pair-body')<order.indexOf('pair-after'));
  if(c.family==='small-multiples')assert.ok(order.indexOf('panel-a')<order.indexOf('panel-b'),c.id);
  const cites=s.blockIds.filter(id=>p.document.blocks.find(b=>b.id===id).type==='citation'&&id!=='quote-attribution');if(cites.length)assert.equal(order.at(-1),cites.at(-1),'sources close the page: '+c.id);
 }
 // The three variants of a family differ in reading path or in focus, never only in colour.
 for(const family of S3_FAMILIES){const orders=compositions.filter(c=>c.family===family).map(c=>JSON.stringify([c.focus,compositionOrder(p.document,{...sceneOf(p,family),composition:c.id})]));assert.equal(new Set(orders).size,3,family);}
}));

test('S3: verbatim quote, paraphrase and attribution stay separate; the before/after baseline label needs no interaction',async()=>fixture(async home=>{
 const p=await familyProject('zh-CN',home),resources=await visualAssetResources(p,home),body=exportDeck(p.document,'html',{plan:p.plan,experimentalWeb:true,assetResources:resources}).body;
 const quote=body.slice(body.indexOf('<section id="quote"'),body.indexOf('</section>',body.indexOf('<section id="quote"')));
 const words=p.document.blocks.find(b=>b.id==='quote-words').text,paraphrase=p.document.blocks.find(b=>b.id==='quote-paraphrase').text;
 assert.ok(quote.includes(`<blockquote>${words}</blockquote>`));assert.ok(quote.includes(`<p>${paraphrase}</p>`));assert.equal((quote.match(/<blockquote>/g)||[]).length,1,'paraphrase is never set as a quotation');
 const regions=[...quote.matchAll(/data-block-id="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(regions,['quote-title','quote-paraphrase','quote-words','quote-attribution'],'split path: claim, paraphrase, then the quote with its attribution directly under it');
 for(const label of ['content:"Before · baseline"','content:"After"','content:"之前 · 基线"','content:"之后"'])assert.ok(body.includes(label),label);
 // The DeckWeft watermark is decorative and aria-hidden on every slide; the check is about the two images.
 const pair=body.slice(body.indexOf('<section id="before-after"'),body.indexOf('</section>',body.indexOf('<section id="before-after"'))).replace(watermarkHTML(),'');
 for(const id of ['pair-before','pair-after'])assert.ok(pair.includes(`<figcaption>${p.document.blocks.find(b=>b.id===id).alt}</figcaption>`),id);
 assert.ok(!/hidden|aria-hidden|data-tab/.test(pair),'no state hides either image in the static page');
 assert.ok(body.includes('.web-scene blockquote{font-family:var(--display);border-left:3px solid var(--accent);padding-left:20px}'),'verbatim quotation keeps a distinct treatment outside the quote family too');
}));

test('S3: family contracts refuse incompatible content with a reason and never repair it',async()=>fixture(async home=>{
 const p=await familyProject('en',home),doc=p.document,scene=id=>structuredClone(sceneOf(p,id)),copyDoc=()=>structuredClone(doc);
 // Chapter: an opener, not an evidence page.
 rejects(()=>assertComposition(doc,{...scene('chapter'),blockIds:[...scene('chapter').blockIds,'panel-a']}),/chapter page opens a section/);
 // Before/after: two images of one object, baseline first, same kind, baseline never hidden.
 rejects(()=>assertComposition(doc,{...scene('before-after'),blockIds:scene('before-after').blockIds.filter(id=>id!=='pair-after')}),/exactly two images/);
 {const d=copyDoc();d.blocks.find(b=>b.id==='pair-after').factual=true;rejects(()=>assertComposition(d,scene('before-after')),/same kind of image/);}
 rejects(()=>assertComposition(doc,{...scene('before-after'),interactions:[{id:'swap',kind:'image-compare',blockId:'pair-after',otherBlockId:'pair-before'}]}),/pair the baseline/);
 rejects(()=>assertComposition(doc,{...scene('before-after'),interactions:[{id:'hide',kind:'image-compare',blockId:'pair-before',otherBlockId:'pair-after',initialTab:'second'}]}),/baseline must stay visible/);
 assertComposition(doc,{...scene('before-after'),interactions:[{id:'both',kind:'image-compare',blockId:'pair-before',otherBlockId:'pair-after',initialTab:'both'}]});
 {const q=structuredClone(p);sceneOf(q,'before-after').crops[1].height=.4;rejects(()=>assertVisualProject(q),/same aspect ratio/);}
 // System map: relationships that branch or loop.
 {const d=copyDoc();d.blocks.find(b=>b.id==='map-diagram').diagramType='sequence';rejects(()=>assertComposition(d,scene('system-map')),/draws relationships/);}
 {const d=copyDoc(),m=d.blocks.find(b=>b.id==='map-diagram');m.edges=[{from:'document',to:'plan'},{from:'plan',to:'theme'},{from:'theme',to:'scene'}];rejects(()=>assertComposition(d,scene('system-map')),/single chain is a process/);}
 // Small multiples: two or more panels on one declared scale.
 rejects(()=>assertComposition(doc,{...scene('small-multiples'),blockIds:scene('small-multiples').blockIds.filter(id=>id!=='panel-b')}),/at least two chart panels/);
 {const d=copyDoc();d.datasets[1].unit='%';rejects(()=>assertComposition(d,scene('small-multiples')),/same chart type and unit/);}
 {const d=copyDoc();d.blocks.find(b=>b.id==='panel-b').chartType='area';rejects(()=>assertComposition(d,scene('small-multiples')),/same chart type and unit/);}
 {const d=copyDoc();d.blocks.find(b=>b.id==='panel-b').axis={policy:'zero'};rejects(()=>assertComposition(d,scene('small-multiples')),/shared scale/);}
 {const d=copyDoc();d.blocks.find(b=>b.id==='panel-b').axis.max=30;rejects(()=>assertComposition(d,scene('small-multiples')),/shared scale/);}
 {const d=copyDoc();d.datasets[1].categories=['W2','W3','W4','W5','W6','W7'];rejects(()=>assertComposition(d,scene('small-multiples')),/same categories/);}
 // Quote: every verbatim quotation is attributed; paraphrase cannot pose as one.
 rejects(()=>assertComposition(doc,{...scene('quote'),blockIds:scene('quote').blockIds.filter(id=>id!=='quote-attribution')}),/Attribute every verbatim quotation/);
 {const d=copyDoc();d.blocks.find(b=>b.id==='quote-words').sourceIds=['family-sample'];rejects(()=>assertComposition(d,scene('quote')),/Attribute every verbatim quotation/);}
 // Conclusion / next step needs its next steps.
 rejects(()=>assertComposition(doc,{...scene('closing'),blockIds:scene('closing').blockIds.filter(id=>id!=='close-steps')}),/needs a heading and list/);
 // Candidates for an explicit family override are refused, not repaired.
 assert.throws(()=>candidateProjects(p,{chapter:'quote'}),/needs a heading and quote/);
 assert.deepEqual(eligibleFamilies(doc,scene('quote')).sort(),['chapter','quote','statement'],'a quotation can also open a chapter as an epigraph');
}));

test('S3: theme switches change composition and type roles only; the semantic document is deep-equal for every new family',async()=>fixture(async home=>{
 for(const locale of LOCALES){
  const p=await familyProject(locale,home),before=semanticView(p),resources=await visualAssetResources(p,home),text=q=>{const body=exportDeck(q.document,'html',{plan:q.plan,experimentalWeb:true,assetResources:resources}).body;return Object.fromEntries(q.plan.scenes.map(s=>[s.id,regionText(body,s.id)]));};
  const baseline=text(p),order=q=>compileWebScenes(q.document,q.plan).map(s=>s.readingOrder.map(id=>s.regions.find(r=>r.id===id).blockId));
  for(const family of S3_FAMILIES)for(const theme of THEMES.filter(t=>t!=='cream-collage')){
   const changed=applySceneTheme(p,family,theme),s=sceneOf(changed,family);
   assert.deepEqual(semanticView(changed),before,family+' '+theme);assert.deepEqual(changed.assets,p.assets);
   assert.equal(s.composition,sceneOf(p,family).composition,'the family geometry is kept');assert.deepEqual({...s,theme:'',themeVersion:''},{...sceneOf(p,family),theme:'',themeVersion:''});
   assert.deepEqual(order(changed),order(p));assert.deepEqual(text(changed),baseline,'same text and values in every region');
   const a=resolveTheme('cream-collage','1.0.0',locale),b=resolveTheme(theme,'1.0.0',locale);assert.ok(a.display!==b.display||a.paper!==b.paper);
  }
 }
}));

test('S3 / C9: a theme round trip leaves the plan, the scene source hash and the render hash unchanged',async()=>fixture(async home=>{
 const html=async q=>exportDeck(q.document,'html',{plan:q.plan,experimentalWeb:true,assetResources:await visualAssetResources(q,home)});
 for(const locale of LOCALES)for(const project of [await evidenceProject(locale),await createVisualDemo(locale,home),await familyProject(locale,home)]){
  const original=await html(project);
  for(const s of project.plan.scenes)for(const theme of THEMES.filter(t=>t!==s.theme)){
   const back=applySceneTheme(applySceneTheme(project,s.id,theme),s.id,s.theme);
   assert.deepEqual(back.plan,project.plan,`${project.id} ${s.id} via ${theme}`);
  }
  const s=project.plan.scenes[0],back=applySceneTheme(applySceneTheme(project,s.id,THEMES.find(t=>t!==s.theme)),s.id,s.theme),again=await html(back);
  assert.equal(again.renderHash,original.renderHash);assert.deepEqual(again.scenes.map(v=>v.sourceHash),original.scenes.map(v=>v.sourceHash));
 }
 // An explicit colour mode is the author's: kept, and violet chapter is offered only when it can use its chapter colour.
 const demo=await createVisualDemo('en',home);
 const cream=applySceneTheme(demo,'chapter','cream-collage');assert.equal(sceneOf(cream,'chapter').colorMode,'chapter');assert.equal(sceneOf(cream,'chapter').composition,'reading-flow');
 const plain=structuredClone(demo);Object.assign(sceneOf(plain,'chapter'),{theme:'dark-data',composition:'reading-flow',colorMode:'default'});
 const toViolet=applySceneTheme(assertVisualProject(plain),'chapter','electric-violet');assert.equal(sceneOf(toViolet,'chapter').composition,'reading-flow');assert.equal(sceneOf(toViolet,'chapter').colorMode,'default');
 const implicit=structuredClone(plain);delete sceneOf(implicit,'chapter').colorMode;assert.equal(sceneOf(applySceneTheme(assertVisualProject(implicit),'chapter','electric-violet'),'chapter').composition,'violet-chapter');
}));

// Synthetic decks for the rhythm rules: one heading plus the block each family requires.
function deck(ids,{locks=[]}={}){
 const blocks=[],scenes=[];
 ids.forEach((composition,i)=>{
  const family=compositions.find(c=>c.id===composition).family,id='p'+i,add=(type,fields)=>{blocks.push({id:`${id}-${type}`,type,sourceIds:['s'],...fields});return `${id}-${type}`;},blockIds=[add('heading',{text:'Page '+i})];
  if(['statement','chapter'].includes(family))blockIds.push(add('paragraph',{text:'Body '+i}));
  if(family==='comparison')blockIds.push(add('table',{columns:['A','B'],rows:[['1','2'],['3','4'],['5','6']]}));
  if(family==='closing')blockIds.push(add('list',{items:['One','Two','Three']}));
  if(family==='metric')blockIds.push(add('metric',{value:i,unit:'%',label:'Share'}));
  scenes.push({id,role:'context',theme:'cream-collage',themeVersion:'1.0.0',composition,blockIds,focalBlockId:blockIds[0]});
 });
 const document={format:'deckweft-presentation',schemaVersion:3,id:'rhythm',title:'Rhythm',locale:'en',blocks,datasets:[],sources:[{id:'s',title:'Synthetic',url:'https://example.org/s'}],authorOverrides:{lockedBlockIds:[],sceneLocks:locks.map(sceneId=>({sceneId,fields:['composition']}))},migration:{}};
 return createVisualProject(document,{format:'deckweft-design-plan',version:1,documentId:'rhythm',scenes},{id:'rhythm'});
}
const rules=p=>rhythmIssues(p).map(i=>[i.rule,i.sceneIds?.join(' ')??i.families.join(' '),i.author]);

test('S3 rhythm: the same composition at most twice in a row unless the pages are a sequence or comparison',()=>{
 assert.deepEqual(rules(deck(['statement-banner','statement-banner','metric-band'])),[]);
 assert.deepEqual(rules(deck(['statement-banner','statement-banner','statement-banner','statement-banner'])),[['repeat','p0 p1 p2 p3',false]]);
 assert.deepEqual(rules(deck(['comparison-matrix','comparison-matrix','comparison-matrix'])),[],'a comparison may keep its structure');
 assert.deepEqual(rules(deck(['statement-split','statement-split','statement-split'])),[['repeat','p0 p1 p2',false]]);
 const a={id:'x',family:'statement',cards:false},c={id:'y',family:'comparison',cards:true};
 assert.equal(rulePenalty(undefined,a,a),0);assert.equal(rulePenalty(a,a,a),100);assert.equal(rulePenalty(c,{...c},{...c}),100,'cards still count for parallel pages');assert.equal(rulePenalty({...c,cards:false},{...c,cards:false},{...c,cards:false}),0);
});

test('S3 rhythm: no three consecutive heading-plus-three-cards pages',()=>{
 const p=deck(['comparison-stack','closing-steps','comparison-stack','statement-split']);
 assert.deepEqual(p.plan.scenes.map(s=>cardRow(p.document,s)),[true,true,true,false]);
 assert.deepEqual(rules(p),[['card-run','p0 p1 p2',false]]);
 const two=structuredClone(p);two.document.blocks.find(b=>b.id==='p1-list').items=['One','Two'];assert.deepEqual(rules(assertVisualProject(two)),[],'two cards are not the pattern');
});

test('S3 rhythm: a 10–15 page deck uses at least four families; the rule advises and never changes a family',()=>{
 const rotate=(n,ids)=>Array.from({length:n},(_,i)=>ids[i%ids.length]);
 const three=deck(rotate(12,['statement-split','comparison-matrix','closing-split'])),issue=rhythmIssues(three).find(i=>i.rule==='variety');
 assert.deepEqual(issue.families,['statement','comparison','closing']);assert.equal(issue.required,RHYTHM_RULES.variety.minFamilies);
 assert.ok(issue.suggestions.some(s=>s.family==='chapter')&&issue.suggestions.every(s=>!issue.families.includes(s.family)));
 assert.deepEqual(rules(deck(rotate(12,['statement-split','comparison-matrix','closing-split','metric-left']))),[]);
 assert.deepEqual(rules(deck(rotate(9,['statement-split','comparison-matrix']))),[],'below ten pages the rule does not apply');
 assert.deepEqual(rules(deck(rotate(16,['statement-split','comparison-matrix']))).filter(r=>r[0]==='variety'),[]);
 const c=candidateProjects(three),chosen=chooseRhythm(three,c,c.map(v=>v.plan.scenes.map(()=>({ok:true}))));
 assert.deepEqual(chosen.project.plan.scenes.map(s=>describeCandidate(chosen.project.document,s).family),three.plan.scenes.map(s=>describeCandidate(three.document,s).family));
 assert.ok(chosen.report.rules.issues.some(i=>i.rule==='variety'));assert.deepEqual(chosen.report.rules.limits,RHYTHM_RULES);
});

test('S3 rhythm: selection is the global optimum including the rules; forced and author-locked runs are kept and reported',()=>{
 const ids=['comparison-stack','comparison-stack','closing-steps','statement-banner','statement-banner','statement-banner','comparison-stack','closing-steps','comparison-stack','metric-band'];
 const p=deck(ids),c=candidateProjects(p);let seed=7;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let round=0;round<4;round++){
  const fits=c.map(()=>p.plan.scenes.map(()=>({ok:random()>.35})));p.plan.scenes.forEach((_,i)=>{if(!fits.some(r=>r[i].ok))fits[Math.floor(random()*3)][i].ok=true;});
  const r=chooseRhythm(p,c,fits),n=ids.length;let minimum=Infinity;
  (function search(i,path,cost){if(i===n){minimum=Math.min(minimum,cost);return;}for(let k=0;k<3;k++)if(fits[k][i].ok){const d=describeCandidate(c[k].document,c[k].plan.scenes[i]);search(i+1,[...path,d],cost+narrativeCost(c[k].plan.scenes[i],d,i,n).cost+(i?transitionCost(path.at(-1),d).total+rulePenalty(path.at(-2),path.at(-1),d):0));}})(0,[],0);
  assert.equal(r.report.cost,minimum,'round '+round);
 }
 // Forced: only one geometry fits, so the run stays and is reported as unavoidable.
 const forced=deck(['statement-banner','statement-banner','statement-banner']),fc=candidateProjects(forced),fit=fc.map((_,k)=>forced.plan.scenes.map(()=>({ok:k===1})));
 const kept=chooseRhythm(forced,fc,fit);assert.deepEqual(kept.project.plan.scenes.map(s=>s.composition),['statement-banner','statement-banner','statement-banner']);assert.deepEqual(kept.report.rules.issues.map(i=>[i.rule,i.author]),[['repeat',false]]);
 // Author locks win: the locked run is kept and marked as the author's choice.
 const locked=deck(['closing-steps','closing-steps','closing-steps','statement-split'],{locks:['p0','p1','p2']}),lc=candidateProjects(locked),r=chooseRhythm(locked,lc,lc.map(v=>v.plan.scenes.map(()=>({ok:true}))));
 assert.deepEqual(r.project.plan.scenes.slice(0,3).map(s=>s.composition),['closing-steps','closing-steps','closing-steps']);
 assert.deepEqual(r.report.rules.issues.map(i=>[i.rule,i.sceneIds.join(' '),i.author]),[['repeat','p0 p1 p2',true],['card-run','p0 p1 p2',true]]);
});

test('S3 small multiples: page splitting keeps every panel in order on the shared scale and never changes the document',async()=>fixture(async home=>{
 const p=await familyProject('en',home),wide=structuredClone(p),d=wide.document;
 for(const k of ['c','d','e'])d.datasets.push({...structuredClone(d.datasets[0]),id:'team-'+k,series:[{...structuredClone(d.datasets[0].series[0]),id:`team-${k}-hours`}]}),d.blocks.push({id:'panel-'+k,type:'chart',sourceIds:['family-sample'],datasetId:'team-'+k,chartType:'line',axis:{policy:'fixed',min:0,max:40}});
 const s=sceneOf(wide,'small-multiples'),five=structuredClone(wide);s.blockIds.splice(3,0,'panel-c','panel-d');sceneOf(five,'small-multiples').blockIds.splice(3,0,'panel-c','panel-d','panel-e');wide.document.blocks=wide.document.blocks.filter(b=>b.id!=='panel-e');wide.document.datasets=wide.document.datasets.filter(v=>v.id!=='team-e');assertVisualProject(wide);assertVisualProject(five);
 const split=splitSmallMultiples(wide,'small-multiples'),pages=split.plan.scenes.filter(v=>v.id.startsWith('small-multiples'));
 assert.deepEqual(split.document,wide.document);assert.deepEqual(pages.map(v=>v.id),['small-multiples','small-multiples-2']);
 assert.deepEqual(pages.map(v=>v.blockIds.filter(id=>id.startsWith('panel-'))),[['panel-a','panel-b'],['panel-c','panel-d']]);
 for(const v of pages){assert.ok(v.blockIds.includes('panels-title')&&v.blockIds.includes('panels-source'));assert.equal(v.composition,s.composition);assertComposition(split.document,v);}
 assert.ok(pages[0].blockIds.includes('panels-body')&&!pages[1].blockIds.includes('panels-body'));assert.deepEqual(split.plan.scenes.map(v=>v.id).filter(id=>!id.startsWith('small-multiples')),wide.plan.scenes.map(v=>v.id).filter(id=>id!=='small-multiples'));
 assert.throws(()=>splitSmallMultiples(p,'small-multiples'),{code:'PANEL_SPLIT'});assert.throws(()=>splitSmallMultiples(wide,'quote'),{code:'PANEL_SPLIT'});
 assert.throws(()=>splitSmallMultiples(five,'small-multiples'),/at least two panels on every page/);assert.deepEqual(splitSmallMultiples(five,'small-multiples',3).plan.scenes.filter(v=>v.id.startsWith('small-multiples')).map(v=>v.blockIds.filter(id=>id.startsWith('panel-'))),[['panel-a','panel-b','panel-c'],['panel-d','panel-e']]);
 const locked=structuredClone(wide);locked.document.authorOverrides.sceneLocks=[{sceneId:'small-multiples',fields:['composition']}];assert.throws(()=>splitSmallMultiples(assertVisualProject(locked),'small-multiples'),{code:'AUTHOR_LOCK'});
}));

test('S3 fixtures: both languages share every id and mark their content as illustrative',async()=>{
 const [en,zh]=await Promise.all(LOCALES.map(familyFixture));
 assert.deepEqual(en.document.blocks.map(b=>[b.id,b.type]),zh.document.blocks.map(b=>[b.id,b.type]));assert.deepEqual(en.plan.scenes.map(s=>[s.id,s.composition,s.blockIds]),zh.plan.scenes.map(s=>[s.id,s.composition,s.blockIds]));
 for(const f of [en,zh]){assert.ok(f.document.datasets.every(d=>d.synthetic));assert.ok(f.document.sources.every(s=>/synthetic|虚构|demonstration|演示/i.test(s.title)));assert.deepEqual(f.plan.scenes.map(s=>s.id),S3_FAMILIES);}
});
