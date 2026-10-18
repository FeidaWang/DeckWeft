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
const ADDED=['evidenceMarks','referenceVerified','repositoryStatus','repositoryState','implementedBy','verifiedBy','checkedAt','repositoryNote','chartClass'];
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
