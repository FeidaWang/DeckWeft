import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// The registers are imported design evidence, not runtime contracts; these checks keep their status fields honest.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=async f=>JSON.parse(await readFile(path.join(root,f),'utf8'));
const patterns=await read('docs/design/pattern-register.json'),sources=await read('docs/design/source-register.json'),roadmap=await read('roadmap.json');
const tasks=new Set(roadmap.tasks.map(t=>t.id)),patternIds=new Set(patterns.patterns.map(p=>p.id)),STATES=['Proposed','Implemented','LocalVerified','HostVerified','ExportVerified'],VERIFIED=STATES.slice(2);
const MAINTENANCE_PATTERN=['patternId','version','sourceUrl','locale','sourceCheckedAt','evidenceType','observedBehavior','dataRequirements','interactionState','staticFallback','outputTier','accessibility','assetStatus','verification','deprecatedBy'],MAINTENANCE_SOURCE=['sourceUrl','locale','sourceCheckedAt','browserSample'];
const ADDED=['evidenceMarks','referenceVerified','repositoryStatus','repositoryState','implementedBy','verifiedBy','checkedAt','repositoryNote','chartClass',...MAINTENANCE_PATTERN,...MAINTENANCE_SOURCE];
const ORIGINAL={pattern:['id','title','source_ids','evidence','deckweft','acceptance_and_static','priority'],chart:['kind','misuse_risk']};
const marksOf=p=>Array.isArray(p.evidence)?[...new Set(p.evidence.map(e=>({live:'V',source:'S',text:'D'})[e.level]))].sort():[...new Set(p.evidence.match(/(?<![A-Za-z])[VSDP](?![A-Za-z])/g)||[])].sort();
const ids=(prefix,n)=>Array.from({length:n},(_,i)=>prefix+String(i+1).padStart(2,'0'));
function assertReferences(record){
 for(const ref of record.implementedBy)assert.ok(/^[A-Z]{2,3}-\d{2,3}$/.test(ref)?tasks.has(ref):/^[FMC]\d{2}$/.test(ref)?patternIds.has(ref):existsSync(path.join(root,ref)),`${record.id||record.ID}: unknown implementer ${ref}`);
 for(const ref of record.verifiedBy)assert.ok(ref.startsWith('docs/')&&existsSync(path.join(root,ref)),`${record.id||record.ID}: missing evidence ${ref}`);
 assert.match(record.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
}
test('design pattern register keeps every handoff id and its original evidence marks',()=>{
 const all=patterns.patterns.map(p=>p.id);
 assert.deepEqual([...all].sort(),[...ids('F',12),...ids('M',20),...ids('C',24)].sort());
 assert.equal(new Set(all).size,all.length);
 assert.deepEqual(patterns.counts,{composition:12,motion_interaction:20,chart_infographic:24});
 for(const p of patterns.patterns){
  for(const field of [...ORIGINAL.pattern,...(p.id.startsWith('C')?ORIGINAL.chart:[])])assert.ok(field in p,`${p.id}: original field ${field} is missing`);
  assert.deepEqual(p.evidenceMarks,marksOf(p),`${p.id}: evidenceMarks must index the untouched evidence field`);
  assert.equal(p.referenceVerified,p.evidenceMarks.includes('V'),`${p.id}: only V evidence verifies a reference behaviour`);
 }
});
test('design pattern register status fields use the agreed state words and cite existing evidence',()=>{
 for(const p of patterns.patterns){
  assert.ok(['exists','partial','missing'].includes(p.repositoryStatus),p.id);
  assert.ok(STATES.includes(p.repositoryState),`${p.id}: ${p.repositoryState} is not a state word`);
  assert.equal(p.id.startsWith('C'),'chartClass' in p,`${p.id}: chartClass is only for chart records`);
  if(p.chartClass)assert.ok(['existing','extension','new'].includes(p.chartClass),p.id);
  if(p.repositoryStatus==='missing'){assert.equal(p.repositoryState,'Proposed',p.id);assert.deepEqual(p.implementedBy,[],p.id);}
  if(VERIFIED.includes(p.repositoryState))assert.ok(p.verifiedBy.length,`${p.id}: ${p.repositoryState} needs repository evidence`);
  else assert.deepEqual(p.verifiedBy,[],`${p.id}: unverified states cite no verification evidence`);
  if(p.repositoryState!=='Proposed')assert.ok(p.implementedBy.length,`${p.id}: name the implementing task or module`);
  assert.ok(p.repositoryNote.length>10,p.id);
  assertReferences(p);
 }
});
test('design source register covers every cited source without claiming repository verification',()=>{
 const content=[...sources.sources,...sources.supplements],all=[...content,...sources.technical_sources],known=new Set(all.map(s=>s.ID));
 assert.equal(known.size,all.length);
 assert.equal(sources.sources.length,sources.coverage.reviewed_content_sources);
 assert.equal(sources.technical_sources.length,sources.coverage.technical_sources);
 for(const p of patterns.patterns)for(const id of p.source_ids)assert.ok(known.has(id),`${p.id}: unknown source ${id}`);
 const live=new Set(sources.coverage.live_interaction_evidence.map(e=>e.source_id));
 for(const s of content){
  assert.deepEqual(s.implementedBy,patterns.patterns.filter(p=>p.source_ids.includes(s.ID)).map(p=>p.id),s.ID);
  assert.equal(s.repositoryStatus,s.implementedBy.length?'cited-by-pattern':'unreferenced',s.ID);
  assert.equal(s.referenceVerified,live.has(s.ID),s.ID);
  assert.deepEqual(s.verifiedBy,[],`${s.ID}: the repository has not re-verified external pages`);
  assertReferences(s);
 }
 for(const s of sources.technical_sources){assert.equal(s.repositoryStatus,'technical-reference');assert.equal(s.referenceVerified,false);assertReferences(s);}
 for(const r of [patterns,sources])assert.match(r.import.sourceSha256,/^[0-9a-f]{64}$/);
});
const DATE=/^\d{4}-\d{2}-\d{2}$/,SEMVER=/^\d+\.\d+\.\d+$/,nullOr=(v,check,msg)=>assert.ok(v===null||check(v),msg),str=v=>typeof v==='string'&&v.length>0,strs=v=>Array.isArray(v)&&v.every(str);
const evidenceFile=ref=>ref.startsWith('docs/')&&existsSync(path.join(root,ref));
// version and deprecatedBy: a pattern is replaced only by another registered pattern that is itself live.
function assertLifecycle(records){
 const byId=new Map(records.map(p=>[p.id,p]));
 for(const p of records){
  assert.match(p.version,SEMVER,`${p.id}: version must be major.minor.patch`);
  assert.equal(p.patternId,p.id,`${p.id}: patternId equals id`);
  if(p.deprecatedBy===null)continue;
  assert.ok(str(p.deprecatedBy),`${p.id}: deprecatedBy is null or a pattern id`);
  assert.notEqual(p.deprecatedBy,p.id,`${p.id}: a pattern cannot replace itself`);
  const next=byId.get(p.deprecatedBy);
  assert.ok(next,`${p.id}: deprecatedBy ${p.deprecatedBy} is not registered`);
  assert.equal(next.deprecatedBy,null,`${p.id}: ${p.deprecatedBy} is itself deprecated; point at the live replacement`);
 }
}
test('pattern maintenance fields are present, typed or null, and derived from the untouched originals',()=>{
 const content=Object.fromEntries([...sources.sources,...sources.supplements,...sources.technical_sources].map(s=>[s.ID,s]));
 for(const p of patterns.patterns){
  for(const field of MAINTENANCE_PATTERN)assert.ok(field in p,`${p.id}: maintenance field ${field} is missing`);
  assert.deepEqual(p.sourceUrl,p.source_ids.map(i=>content[i].url),`${p.id}: sourceUrl follows source_ids`);
  assert.deepEqual(p.locale,[...new Set(p.source_ids.map(i=>content[i].language))].sort(),`${p.id}: locale`);
  nullOr(p.sourceCheckedAt,v=>DATE.test(v),`${p.id}: sourceCheckedAt is a date or null`);
  assert.equal(p.sourceCheckedAt===null,p.evidenceMarks.every(m=>m==='P'),`${p.id}: only proposal-only evidence has no check date`);
  assert.ok(strs(p.evidenceType)&&p.evidenceType.length===p.evidenceMarks.length,`${p.id}: evidenceType mirrors evidenceMarks`);
  assert.equal(p.evidenceType.includes('observed'),p.evidenceMarks.includes('V'),p.id);
  nullOr(p.observedBehavior,str,`${p.id}: observedBehavior`);
  assert.equal(p.observedBehavior!==null,p.referenceVerified,`${p.id}: observedBehavior is written only for observed references`);
  for(const field of ['dataRequirements','interactionState','staticFallback','outputTier','accessibility'])nullOr(p[field],v=>typeof v==='string'||(v&&typeof v==='object'),`${p.id}: ${field} is null, text or an object`);
  assert.equal(p.assetStatus,'no-reference-assets-bundled',p.id);
  const v=p.verification;
  assert.ok(['observed','source-or-text-only','proposal-only'].includes(v.reference),p.id);
  assert.equal(v.reference==='observed',p.referenceVerified,`${p.id}: verification.reference follows referenceVerified`);
  assert.equal(v.deckweft,p.repositoryState,`${p.id}: verification.deckweft follows repositoryState`);
  assert.ok(strs(v.evidence)&&strs(v.browserSampleSources),p.id);
  for(const ref of v.evidence)assert.ok(evidenceFile(ref),`${p.id}: verification evidence ${ref} does not exist`);
  for(const ref of p.verifiedBy)assert.ok(v.evidence.includes(ref),`${p.id}: verification.evidence keeps verifiedBy`);
  for(const id of v.browserSampleSources){
   assert.ok(p.source_ids.includes(id),`${p.id}: sampled source ${id} is not one of its sources`);
   assert.ok(content[id].browserSample,`${p.id}: ${id} has no browserSample record`);
   assert.ok(v.evidence.includes(content[id].browserSample.evidence),`${p.id}: sample evidence for ${id} is not listed`);
  }
  assert.equal(v.evidence.length,new Set([...p.verifiedBy,...v.browserSampleSources.map(i=>content[i].browserSample.evidence)]).size,`${p.id}: verification.evidence lists nothing but verifiedBy and sample files`);
 }
 assertLifecycle(patterns.patterns);
});
test('source maintenance fields trace each page and cite existing sample evidence',()=>{
 for(const s of [...sources.sources,...sources.supplements,...sources.technical_sources]){
  for(const field of MAINTENANCE_SOURCE)assert.ok(field in s,`${s.ID}: maintenance field ${field} is missing`);
  assert.equal(s.sourceUrl,s.url,s.ID);assert.equal(s.locale,s.language,s.ID);
  assert.match(s.sourceCheckedAt,DATE,s.ID);
  assert.ok(s.sourceCheckedAt<=sources.import.maintenanceUpdatedAt,`${s.ID}: sourceCheckedAt is in the future`);
  if(s.browserSample===null)continue;
  assert.match(s.browserSample.date,DATE,s.ID);
  assert.ok(evidenceFile(s.browserSample.evidence),`${s.ID}: sample evidence ${s.browserSample.evidence} does not exist`);
  assert.ok(strs(s.browserSample.states)&&s.browserSample.states.length,s.ID);
 }
});
test('every sampled page in the browser-sample file is registered, and nothing else claims a sample',async()=>{
 const sample=await read('docs/evidence/s10-pattern-maintenance/browser-sample.json'),registered=[...sources.sources,...sources.supplements,...sources.technical_sources].filter(s=>s.browserSample).map(s=>s.ID).sort();
 assert.deepEqual(registered,sample.pages.map(p=>p.sourceId).sort());
 for(const page of sample.pages){
  const record=[...sources.sources,...sources.supplements].find(s=>s.ID===page.sourceId);
  assert.equal(record.url,page.url,`${page.sourceId}: the sampled url is the registered url`);
  for(const id of page.patterns)assert.ok(patterns.patterns.find(p=>p.id===id).verification.browserSampleSources.includes(page.sourceId),`${id}: lists ${page.sourceId} as sampled`);
 }
});
test('lifecycle checks refuse bad versions and bad deprecations',()=>{
 const rec=(id,extra={})=>({id,patternId:id,version:'1.0.0',deprecatedBy:null,...extra});
 assertLifecycle([rec('A'),rec('B',{deprecatedBy:'C'}),rec('C',{version:'1.1.0'})]);
 assert.throws(()=>assertLifecycle([rec('A',{version:'1.0'})]),/major\.minor\.patch/);
 assert.throws(()=>assertLifecycle([rec('A',{deprecatedBy:'A'})]),/replace itself/);
 assert.throws(()=>assertLifecycle([rec('A',{deprecatedBy:'Z'})]),/not registered/);
 assert.throws(()=>assertLifecycle([rec('A',{deprecatedBy:'B'}),rec('B',{deprecatedBy:'A'})]),/itself deprecated/);
 assert.throws(()=>assertLifecycle([rec('A',{patternId:'B'})]),/patternId/);
});
test('EXP-001 records the P3 deferrals and no performance number',()=>{
 const exp=roadmap.tasks.find(t=>t.id==='EXP-001'),notes=exp.notes.join('\n').toLowerCase();
 assert.equal(exp.state,'planned','S10 records boundaries; it implements nothing');
 for(const phrase of ['full-screen persistent particles','multi-layer blur','3d without a static final state','mouse','number rolling','reference device','browser version','resolution','device pixel ratio','power mode'])assert.ok(notes.includes(phrase),`EXP-001 notes must mention ${phrase}`);
 assert.ok(!/\d\s*(ms|fps|hz|mb)\b/i.test(exp.notes.join(' ')),'no budget number before a reference device is recorded');
});
// Set DECKWEFT_HANDOFF_DIR to the delivered package to prove the imported originals are byte-for-byte unchanged.
const handoff=process.env.DECKWEFT_HANDOFF_DIR;
test('design registers preserve the delivered handoff records exactly',{skip:!handoff&&'DECKWEFT_HANDOFF_DIR is not set'},async()=>{
 const strip=r=>Object.fromEntries(Object.entries(r).filter(([k])=>!ADDED.includes(k)));
 for(const [file,imported,lists] of [['DeckWeft_Pattern_Register.json',patterns,['patterns']],['DeckWeft_Source_Register.json',sources,['sources','supplements','technical_sources']]]){
  const bytes=await readFile(path.join(handoff,file)),original=JSON.parse(bytes);
  assert.equal(imported.import.sourceSha256,createHash('sha256').update(bytes).digest('hex'),file);
  const {import:_,...rest}=imported;
  assert.deepEqual(Object.fromEntries(Object.entries(rest).map(([k,v])=>[k,lists.includes(k)?v.map(strip):v])),original,file);
 }
});
