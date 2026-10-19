import test from 'node:test';
import assert from 'node:assert/strict';
import designPlanSchema from '../schemas/design-plan.schema.json' with {type:'json'};
import {createVisualTask} from '../src/agent/director.mjs';
import {assertVisualProject} from '../src/core/visual-project.mjs';
import {ARGUMENT_UNITS,DETAIL_LEVELS,DETAIL_TABLE,UNIT_LABELS,UNIT_KEYWORDS,CONTINUATION_COMPOSITION,classifyScenes,evidenceStatus,planPages,applyPagePlan} from '../src/planning/argument-units.mjs';
const local=(pages,locale)=>createVisualTask({request:pages.join('\n---\n'),...(locale?{locale}:{})}).project;
const ids=p=>p.plan.scenes.map(s=>s.id);
const en6=['Question: Why do new teams stall in their first week?\nMost teams stop before they share a first deck.','Background: Onboarding is a checklist\nTeams start from a blank page and a long list.','How it works: Templates carry the structure\nEach template names the decision the team makes after it.','Evidence: Guided teams finished sooner\nIn the pilot, guided teams finished 34% sooner.','Limits: The pilot was small\nTwelve teams over one quarter, all internal.','Next steps: Run a wider pilot\n- Recruit forty teams\n- Report the result in the autumn'];
const zh6=['问题：为什么新团队第一周就停滞？\n多数团队在分享第一份文稿前就停下了。','背景：目前入门只是一份清单\n团队从空白页开始。','原理：模板承载结构\n每个模板都写明团队接着要做的决定。','数据：引导团队完成得更快\n试点中，引导团队提前 34% 完成。','风险：试点规模很小\n十二个团队，一个季度。','下一步：扩大试点\n- 招募四十个团队\n- 秋季报告结果'];
const cues=['Can a smaller team ship every week?\nWe ship every third week now.','Reviews wait for one approver\nBecause every change queues behind a single reviewer.','Releases batch many changes\nToday a release carries a month of work.','Quality may drop\nThe risk is that faster reviews miss defects.','Plain middle page\nWords without any cue at all.','What we ship next\n- Add a second approver\n- Ship weekly for a quarter'];
const sentence='Each guided team wrote one shared page before review. ',long=sentence.repeat(7).trim();
/** A page with three movable paragraphs of 315 visible characters each (fixture construction, not module output). */
function threeParagraphs(last=false){
 const p=local(last?['Opening page\nShort words.',`Three long paragraphs\n${long}`]:[`Three long paragraphs\n${long}`,'Closing page\nShort words.']),i=last?1:0;
 p.document.blocks.push({id:`b${i}_p2`,type:'paragraph',sourceIds:[],text:long},{id:`b${i}_p3`,type:'paragraph',sourceIds:[],text:long});
 p.plan.scenes[i].blockIds.push(`b${i}_p2`,`b${i}_p3`);return assertVisualProject(p);
}
function withChart(p,i,{synthetic=false,datasetSources=['pilot'],chartSources=[]}={}){
 const q=structuredClone(p);q.document.sources.push({id:'pilot',title:'Pilot report',url:'https://example.org/pilot'});
 q.document.datasets.push({id:'d1',unit:'%',synthetic,categories:['Manual','Guided'],series:[{id:'share',label:'Finished on time',values:[41,75]}],sourceIds:datasetSources});
 q.document.blocks.push({id:'c1',type:'chart',sourceIds:chartSources,datasetId:'d1',chartType:'ranked-bar'});q.plan.scenes[i].blockIds.push('c1');return assertVisualProject(q);
}
const addBlock=(p,i,block)=>{const q=structuredClone(p);q.document.blocks.push(block);q.plan.scenes[i].blockIds.push(block.id);return assertVisualProject(q);};

test('tables are frozen and documented: six units, three detail levels, capacity per locale and required units',()=>{
 assert.deepEqual([...ARGUMENT_UNITS],['question','background','mechanism','evidence','limits','action']);assert.deepEqual([...DETAIL_LEVELS],['brief','standard','detailed']);
 assert.deepEqual(JSON.parse(JSON.stringify(DETAIL_TABLE)),{brief:{capacity:{en:300,'zh-CN':150},required:['question','evidence','action']},standard:{capacity:{en:520,'zh-CN':260},required:['question','background','evidence','limits','action']},detailed:{capacity:{en:800,'zh-CN':400},required:ARGUMENT_UNITS}});
 for(const v of [ARGUMENT_UNITS,DETAIL_LEVELS,DETAIL_TABLE,DETAIL_TABLE.brief.capacity,DETAIL_TABLE.detailed.required,UNIT_LABELS.evidence.zh,UNIT_KEYWORDS.limits.en])assert.ok(Object.isFrozen(v));
 assert.throws(()=>{'use strict';DETAIL_TABLE.brief.capacity.en=1;},TypeError);
});
test('labels: explicit English and Chinese unit labels are read, never edited',()=>{
 const en=local(en6),zh=local(zh6,'zh-CN'),before=JSON.stringify(en);
 const c=classifyScenes(en);assert.deepEqual(c.map(x=>[x.unit,x.basis,x.cue]),[['question','label','Question'],['background','label','Background'],['mechanism','label','How it works'],['evidence','label','Evidence'],['limits','label','Limits'],['action','label','Next steps']]);
 assert.deepEqual(c.map(x=>x.sceneId),ids(en));assert.equal(JSON.stringify(en),before);
 assert.deepEqual(classifyScenes(zh).map(x=>[x.unit,x.basis,x.cue]),[['question','label','问题'],['background','label','背景'],['mechanism','label','原理'],['evidence','label','数据'],['limits','label','风险'],['action','label','下一步']]);
 // Other delimiters, a bare label, and the first paragraph; a word that merely starts with a label is not a label.
 const more=local(['Data — the pilot\nwords','Risks - small sample\nwords','Context\nwords','Plain heading\nRecommendation: approve it','Asking for help\nwords','Datasets we keep\nwords']);
 assert.deepEqual(classifyScenes(more).map(x=>[x.unit,x.basis,x.cue]),[['evidence','label','Data'],['limits','label','Risks'],['background','label','Context'],['action','label','Recommendation'],['background','position','middle-scene'],['action','position','last-scene']]);
});
test('structure, keyword and position cues explain every other page; author overrides come first',()=>{
 const p=local(cues),c=classifyScenes(p);
 assert.deepEqual(c.map(x=>[x.unit,x.basis,x.cue]),[['question','structure','question-mark'],['mechanism','keyword','Because'],['background','keyword','Today'],['limits','keyword','risk'],['background','position','middle-scene'],['action','structure','closing-list']]);
 assert.deepEqual(classifyScenes(local(['Plain opening\nA sentence.','Plain ending\nAnother sentence.'])).map(x=>[x.unit,x.basis,x.cue]),[['question','position','first-scene'],['action','position','last-scene']]);
 assert.deepEqual(classifyScenes(local(['开场\n一句话。','方法很多\n因为评审要排队。','目前的流程\n一句话。','这里尚未验证\n一句话。','结尾\n我们建议扩大试点。'],'zh-CN')).map(x=>[x.unit,x.basis,x.cue]),[['question','position','first-scene'],['mechanism','keyword','因为'],['background','keyword','目前'],['limits','keyword','尚未'],['action','keyword','建议']]);
 // Heading keywords win over body keywords; within one text the unit order is limits, mechanism, background, action.
 assert.deepEqual(classifyScenes(local(['Plain opening\nwords','Next quarter\nBecause of history','Today and the unknown\nwords','Plain end\nwords'])).slice(1,3).map(x=>[x.unit,x.cue]),[['action','Next'],['limits','unknown']]);
 const s=ids(p),author=classifyScenes(p,{units:{[s[0]]:'limits',[s[4]]:'evidence'}});
 assert.deepEqual([author[0],author[4]].map(x=>[x.unit,x.basis,x.cue]),[['limits','author','author'],['evidence','author','author']]);
 assert.throws(()=>classifyScenes(p,{units:{[s[0]]:'summary'}}),{code:'ARGUMENT_UNIT'});assert.throws(()=>classifyScenes(p,{units:{missing:'action'}}),{code:'ARGUMENT_UNIT'});
 // Evidence structure: chart, metric, attributed quote, and a callout with a number and unit.
 assert.deepEqual(classifyScenes(withChart(p,4),{}).at(4).cue,'chart');
 assert.deepEqual(classifyScenes(addBlock(p,4,{id:'m1',type:'metric',sourceIds:[],value:34,unit:'%',label:'sooner'}))[4].cue,'metric');
 assert.deepEqual(classifyScenes(addBlock(p,4,{id:'k1',type:'callout',sourceIds:[],text:'Guided teams were 2.5x faster'}))[4].cue,'callout-number');
 assert.deepEqual(classifyScenes(addBlock(p,4,{id:'k1',type:'callout',sourceIds:[],text:'Guided teams were faster'}))[4].basis,'position');
 const quoted=structuredClone(p);quoted.document.sources.push({id:'pilot',title:'Pilot report',url:'https://example.org/pilot'});quoted.document.blocks.push({id:'q1',type:'quote',sourceIds:['pilot'],text:'We finished in one sitting.'},{id:'cite1',type:'citation',sourceIds:['pilot'],sourceId:'pilot',text:'Pilot report'});quoted.plan.scenes[4].blockIds.push('q1','cite1');
 assert.deepEqual(classifyScenes(quoted)[4],{sceneId:s[4],unit:'evidence',basis:'structure',cue:'quote-citation'});
});
test('capacity follows the detail level and locale; required units per level decide what is missing',()=>{
 const en=local(en6),zh=local(zh6,'zh-CN');
 for(const detail of DETAIL_LEVELS){assert.equal(planPages(en,{detail}).capacity,DETAIL_TABLE[detail].capacity.en);assert.equal(planPages(zh,{detail}).capacity,DETAIL_TABLE[detail].capacity['zh-CN']);assert.equal(planPages(zh,{detail}).locale,'zh-CN');}
 assert.equal(planPages(en).detail,'standard');assert.throws(()=>planPages(en,{detail:'long'}),{code:'PAGE_PLAN_DETAIL'});
 const full=planPages(en,{detail:'detailed'});assert.deepEqual(full.present,[...ARGUMENT_UNITS]);assert.deepEqual(full.missing,[]);assert.equal(full.status,'fits');assert.equal(full.proposedPages,6);assert.equal(full.suppliedPages,6);assert.equal(full.targetPages,null);
 assert.deepEqual(full.scenes.map(s=>s.chars),en6.map(t=>{const [,...rest]=t.split('\n');return rest.join('').replace(/^- /gm,'').replace(/- /g,'').replace(/\s+/g,'').length;}));
 const three=local(['Why do teams stall?\nThey stop early.','Evidence: The pilot\nGuided teams finished 34% sooner.','Next steps: Decide\n- Approve the pilot']);
 assert.deepEqual(planPages(three,{detail:'brief'}).missing,[]);assert.equal(planPages(three,{detail:'brief'}).status,'fits');
 const standard=planPages(three);assert.deepEqual(standard.missing,['background','limits']);assert.equal(standard.status,'needs-material');
 assert.deepEqual(standard.questions.map(q=>[q.kind,q.unit]),[['missing-unit','background'],['missing-unit','limits'],['unsupported-evidence','evidence']]);
 assert.equal(standard.questions[2].en,'Which data, source or quotation supports the claim on page 2? DeckWeft will not invent one.');assert.equal(standard.questions[2].zh,'第 2 页的论点由哪些数据、来源或引语支持？DeckWeft 不会编造。');
 assert.deepEqual(planPages(three,{detail:'detailed'}).missing,['background','mechanism','limits']);
 const none=planPages(local(cues),{detail:'brief'});assert.deepEqual(none.missing,['evidence']);assert.equal(none.status,'needs-material');assert.deepEqual(none.evidenceRequired,[]);
 assert.match(none.questions[0].en,/Which data, source or quotation supports the main claim\? DeckWeft will not invent one\./);assert.match(none.questions[0].zh,/DeckWeft 不会编造/);
});
test('target pages: the material decides the count; DeckWeft asks instead of padding and never merges',()=>{
 const p=local(en6),short=planPages(p,{targetPages:10});
 assert.equal(short.status,'needs-material');assert.equal(short.proposedPages,6);assert.equal(short.targetPages,10);
 const ask=short.questions.find(q=>q.kind==='page-count');assert.equal(ask.unit,null);assert.equal(ask.en,'The material supports 6 pages; the target is 10. Add material for the other 4 pages, or lower the target. DeckWeft will not pad the deck.');assert.match(ask.zh,/现有材料可支撑 6 页，目标为 10 页.*DeckWeft 不会填充内容/);
 const applied=applyPagePlan(p,short,{split:true});assert.equal(applied.project.plan.scenes.length,6);assert.deepEqual(applied.changes,[]);assert.deepEqual(applied.project.document,p.document);
 const over=planPages(p,{targetPages:4});assert.equal(over.status,'over-target');assert.equal(over.advice[0].kind,'over-target');assert.match(over.advice[0].en,/merge pages yourself.*never merges pages automatically/);assert.ok(!over.questions.some(q=>q.kind==='page-count'));
 assert.equal(applyPagePlan(p,over,{split:true}).project.plan.scenes.length,6);
 assert.equal(planPages(p,{targetPages:6}).status,'fits');assert.deepEqual(planPages(p,{targetPages:6}).advice,[]);
 for(const targetPages of [0,2.5,'6',1001])assert.throws(()=>planPages(p,{targetPages}),{code:'PAGE_PLAN_TARGET'});
});
test('evidence status: sourced chart, chart sources, synthetic or unsourced data, numbers without a source, citations',()=>{
 const p=local(en6),s=ids(p);
 assert.deepEqual(evidenceStatus(p,s[3]),{supported:false,reasons:['number-without-source']});assert.deepEqual(evidenceStatus(p,s[0]),{supported:false,reasons:['no-evidence']});
 assert.deepEqual(planPages(p).evidenceRequired,[s[3]]);
 const sourced=withChart(p,3);assert.deepEqual(evidenceStatus(sourced,s[3]),{supported:true,reasons:['sourced-chart']});assert.deepEqual(planPages(sourced).evidenceRequired,[]);assert.ok(!planPages(sourced).questions.length);
 assert.deepEqual(evidenceStatus(withChart(p,3,{datasetSources:[],chartSources:['pilot']}),s[3]),{supported:true,reasons:['sourced-chart']});
 const synthetic=withChart(p,3,{synthetic:true});assert.deepEqual(evidenceStatus(synthetic,s[3]),{supported:false,reasons:['synthetic-dataset','number-without-source']});assert.deepEqual(planPages(synthetic).evidenceRequired,[s[3]]);
 assert.deepEqual(evidenceStatus(withChart(p,0,{datasetSources:[]}),s[0]),{supported:false,reasons:['unsourced-chart']});
 const para=structuredClone(p);para.document.sources.push({id:'pilot',title:'Pilot report',url:'https://example.org/pilot'});para.document.blocks.find(b=>b.id==='b3_body').sourceIds=['pilot'];assert.deepEqual(evidenceStatus(para,s[3]),{supported:true,reasons:['sourced-paragraph']});
 const cited=structuredClone(p);cited.document.sources.push({id:'pilot',title:'Pilot report',url:'https://example.org/pilot'});cited.document.blocks.push({id:'cite1',type:'citation',sourceIds:['pilot'],sourceId:'pilot',text:'Pilot report'});cited.plan.scenes[3].blockIds.push('cite1');assert.deepEqual(evidenceStatus(cited,s[3]),{supported:true,reasons:['citation']});
 assert.deepEqual(evidenceStatus(addBlock(p,0,{id:'m1',type:'metric',sourceIds:[],value:12,unit:'teams',label:'in the pilot'}),s[0]),{supported:false,reasons:['number-without-source']});
 const zh=local(zh6,'zh-CN');assert.deepEqual(evidenceStatus(zh,ids(zh)[0]).reasons,['no-evidence']);assert.deepEqual(evidenceStatus(zh,ids(zh)[3]).reasons,['number-without-source']);
 assert.throws(()=>evidenceStatus(p,'missing'),{code:'PAGE_PLAN_SCENE',status:404});
});
test('capacity splits only between whole movable blocks; one over-long block stays one page with advice',()=>{
 const one=planPages(local([`One long page\n${[long,long,long].join('\n')}`,'Closing page\nShort words.']));
 assert.equal(one.scenes[0].chars,945);assert.equal(one.scenes[0].pages,1);assert.equal(one.scenes[0].advice,'reduce-text');assert.ok(!('splitAt' in one.scenes[0]));assert.equal(one.proposedPages,2);
 const p=threeParagraphs(),standard=planPages(p).scenes[0];
 assert.deepEqual([standard.chars,standard.pages,standard.splitAt,standard.advice],[945,3,['b0_p2','b0_p3'],undefined]);
 assert.deepEqual([planPages(p,{detail:'detailed'}).scenes[0].pages,planPages(p,{detail:'detailed'}).scenes[0].splitAt],[2,['b0_p3']]);
 const brief=planPages(p,{detail:'brief'}).scenes[0];assert.deepEqual([brief.pages,brief.splitAt,brief.advice],[3,['b0_p2','b0_p3'],'reduce-text']);
 assert.equal(planPages(p).proposedPages,4);assert.equal(planPages(p).suppliedPages,2);
 // The takeaway stays: nothing after it can move without changing the reading order.
 // A block the composition needs (the list of a closing page) stays, so the page never loses its contract.
 const closing=structuredClone(p);closing.document.blocks.push({id:'b0_steps',type:'list',sourceIds:[],items:[long]});closing.plan.scenes[0].blockIds.push('b0_steps');closing.plan.scenes[0].composition='closing-split';
 const c=planPages(assertVisualProject(closing)).scenes[0];assert.deepEqual([c.pages,c.advice],[1,'reduce-text']);
 const kept=structuredClone(p);kept.plan.scenes[0].takeaway={blockId:'b0_p3'};const k=planPages(assertVisualProject(kept)).scenes[0];assert.deepEqual([k.pages,k.advice,k.splitAt],[1,'reduce-text',undefined]);
});
test('split creates continuation pages after the original; the document never changes and every block stays visible',()=>{
 const p=threeParagraphs(),[id]=ids(p),before=JSON.stringify(p),plan=planPages(p),{project,changes,skipped}=applyPagePlan(p,plan,{split:true});
 assert.equal(JSON.stringify(p),before);assert.deepEqual(project.document,p.document);assert.deepEqual(skipped,[]);
 assert.deepEqual(ids(project),[id,`${id}-2`,`${id}-3`,ids(p)[1]]);
 assert.deepEqual(changes,[{sceneId:id,kind:'split',sceneIds:[`${id}-2`,`${id}-3`],movedBlockIds:[['b0_p2'],['b0_p3']]}]);
 const [first,second,third]=project.plan.scenes;assert.deepEqual(first.blockIds,['b0_title','b0_body']);assert.equal(first.role,'opening');
 for(const [s,b] of [[second,'b0_p2'],[third,'b0_p3']])assert.deepEqual(s,{id:s.id,role:'context',theme:first.theme,themeVersion:'1.0.0',composition:CONTINUATION_COMPOSITION,blockIds:['b0_title',b],focalBlockId:'b0_title'});
 const visible=new Set(project.plan.scenes.flatMap(s=>s.blockIds));assert.ok(project.document.blocks.every(b=>visible.has(b.id)));
 assert.deepEqual(project.document.blocks.map(b=>b.text??b.items),p.document.blocks.map(b=>b.text??b.items));
 assert.equal(planPages(project).proposedPages,4);assert.equal(planPages(project).suppliedPages,4);
 // A closing page keeps its role on the last part; the first part becomes context.
 const c=threeParagraphs(true),closing=applyPagePlan(c,planPages(c),{split:true}).project.plan.scenes;assert.deepEqual(closing.map(s=>s.role),['opening','context','context','closing']);
 // Reading flow is valid for every theme.
 for(const theme of designPlanSchema.properties.scenes.items.properties.theme.enum){const t=structuredClone(p);t.plan.scenes.forEach(s=>s.theme=theme);assert.equal(applyPagePlan(assertVisualProject(t),planPages(t),{split:true}).project.plan.scenes[1].theme,theme);}
});
test('split refuses locked pages, interactions and key states, locked blocks, taken ids, stale plans and an empty request',()=>{
 const p=threeParagraphs(),[id]=ids(p),plan=planPages(p),refuse=(q,code,status)=>assert.throws(()=>applyPagePlan(assertVisualProject(q),planPages(q),{split:true}),{code,status});
 for(const fields of [['blockIds'],['composition']]){const q=structuredClone(p);q.document.authorOverrides.sceneLocks=[{sceneId:id,fields}];refuse(q,'AUTHOR_LOCK',409);}
 const theme=structuredClone(p);theme.document.authorOverrides.sceneLocks=[{sceneId:id,fields:['theme']}];assert.equal(applyPagePlan(theme,planPages(theme),{split:true}).project.plan.scenes.length,4);
 const keyed=structuredClone(p);keyed.plan.scenes[0].keyStates=[{id:'opening',position:0}];refuse(keyed,'AUTHOR_LOCK',409);
 const locked=structuredClone(p);locked.document.authorOverrides.lockedBlockIds=['b0_p3'];refuse(locked,'AUTHOR_LOCK',409);
 const headingLocked=structuredClone(p);headingLocked.document.authorOverrides.lockedBlockIds=['b0_title'];assert.equal(applyPagePlan(headingLocked,planPages(headingLocked),{split:true}).project.plan.scenes.length,4);
 const taken=structuredClone(p);taken.plan.scenes[1].id=`${id}-2`;refuse(taken,'PAGE_PLAN_ID',409);
 const longId=structuredClone(p);longId.plan.scenes[0].id='x'.repeat(63);refuse(longId,'PAGE_PLAN_ID',422);
 assert.throws(()=>applyPagePlan(p,plan),{code:'PAGE_PLAN_EMPTY'});assert.throws(()=>applyPagePlan(p,plan,{split:'yes'}),{code:'PAGE_PLAN_OPTIONS'});assert.throws(()=>applyPagePlan(p,{},{split:true}),{code:'PAGE_PLAN_INVALID'});
 assert.throws(()=>applyPagePlan(local(en6),plan,{split:true}),{code:'PAGE_PLAN_STALE',status:409});
 const edited=structuredClone(plan);edited.scenes[0].splitAt=['b0_p3','b0_p2'];assert.throws(()=>applyPagePlan(p,edited,{split:true}),{code:'PAGE_PLAN_STALE'});
 edited.scenes[0].splitAt=['b0_title'];assert.throws(()=>applyPagePlan(p,edited,{split:true}),{code:'PAGE_PLAN_STALE'});
});
test('mark sets evidence-required on unsupported evidence pages, skips pages with a content status, and continuations inherit it',()=>{
 const p=structuredClone(local(en6)),s=ids(p);p.plan.scenes[4].contentStatus='sourced';assertVisualProject(p);
 const plan=planPages(p,{units:{[s[4]]:'evidence'}});assert.deepEqual(plan.evidenceRequired,[s[3],s[4]]);
 const {project,changes,skipped}=applyPagePlan(p,plan,{mark:true});
 assert.deepEqual(changes,[{sceneId:s[3],kind:'mark',contentStatus:'evidence-required'}]);assert.deepEqual(skipped,[{sceneId:s[4],kind:'mark',reason:'sourced'}]);
 assert.deepEqual(project.plan.scenes.map(x=>x.contentStatus),[undefined,undefined,undefined,'evidence-required','sourced',undefined]);assert.deepEqual(project.document,p.document);
 assert.ok(!JSON.stringify(project).includes('DeckWeft will not invent'));
 assert.deepEqual(applyPagePlan(project,planPages(project),{mark:true}).skipped,[{sceneId:s[3],kind:'mark',reason:'already-marked'}]);
 const illustrative=structuredClone(local(en6));illustrative.plan.scenes[3].contentStatus='illustrative';assert.deepEqual(applyPagePlan(illustrative,planPages(illustrative),{mark:true}).skipped,[{sceneId:ids(illustrative)[3],kind:'mark',reason:'illustrative'}]);
 const three=threeParagraphs(),[id]=ids(three),both=applyPagePlan(three,planPages(three,{units:{[id]:'evidence'}}),{split:true,mark:true});
 assert.deepEqual(both.project.plan.scenes.slice(0,3).map(x=>x.contentStatus),['evidence-required','evidence-required','evidence-required']);assert.deepEqual(both.changes.map(c=>c.kind),['mark','split']);
});
test('deterministic: the same input gives deep-equal output and is never mutated',()=>{
 for(const p of [local(en6),local(zh6,'zh-CN'),threeParagraphs()]){
  const before=JSON.stringify(p);assert.deepEqual(classifyScenes(p),classifyScenes(structuredClone(p)));
  for(const options of [{},{detail:'brief',targetPages:9},{detail:'detailed',targetPages:2}])assert.deepEqual(planPages(p,options),planPages(structuredClone(p),options));
  const plan=planPages(p);assert.deepEqual(applyPagePlan(p,plan,{split:true,mark:true}),applyPagePlan(structuredClone(p),structuredClone(plan),{split:true,mark:true}));
  assert.equal(JSON.stringify(p),before);
 }
});

test('S9b draftPagePlan: a fitting deck with a page that holds none of the supplied lines needs review',async()=>{
 const {createVisualTask}=await import('../src/agent/director.mjs'),{draftPagePlan,pageBrief}=await import('../src/planning/argument-units.mjs');
 const source='What should we decide?\nPick one export path.\n---\nEvidence\nEditability passed on 18 of 18 decks.\n---\nNext step\nRun PowerPoint yourself.';
 const project=createVisualTask({request:source+'\n---\nAside\nA page the host wrote.'}).project,brief=pageBrief({detail:'brief'});
 const plan=draftPagePlan(project,brief,source);
 assert.equal(plan.hostAddedPages.length,1);assert.equal(plan.status,'needs-review');assert.equal(plan.draftedPages,4);
 assert.deepEqual(draftPagePlan(createVisualTask({request:source}).project,brief,source).hostAddedPages,[]);
 assert.throws(()=>pageBrief({detail:'long'}),e=>e.code==='PAGE_PLAN_DETAIL');
});
