import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createSlide,fromOutline,editSlides} from '../src/core/model.mjs';
import {validateProject,assertProject} from '../src/core/validate.mjs';
import {importProject} from '../src/core/migrate.mjs';

test('a new project satisfies the closed schema',()=>assert.equal(validateProject(createProject()).ok,true));
test('markdown preserves title, body, points, and slide boundaries',()=>{
 const p=fromOutline('# A useful idea\nBody\n- First\n- Second\n---\n# Conclusion');
 assert.equal(p.slides.length,2);assert.equal(p.slides[0].content.title,'A useful idea');assert.deepEqual(p.slides[0].content.items,['First','Second']);assert.equal(p.slides[1].role,'closing');
});
test('empty and excessive outlines are rejected',()=>{assert.throws(()=>fromOutline(''));assert.throws(()=>fromOutline('x'.repeat(100001)));assert.throws(()=>fromOutline(Array(101).fill('Slide').join('\n---\n')));});
for(const [name,mutate]of [
 ['required fields',p=>delete p.brief],['unknown fields',p=>p.cloudSecret='x'],['unknown versions',p=>p.schemaVersion=9],['unsupported locale',p=>p.locale='fr'],['unsafe ids',p=>p.id='../steal'],['duplicate slides',p=>p.slides.push(structuredClone(p.slides[0]))],['missing source target',p=>p.slides[0].sourceIds.push('missing')],['nonfinite numeric input',p=>p.slides[0].motion.duration=NaN],['negative revision',p=>p.revision.number=-1],['empty slide array',p=>p.slides=[]],['control characters',p=>p.slides[0].content.title='bad\u0000xml'],['invalid Unicode',p=>p.title='broken\ud800'],['reserved keys',p=>p.extensions=JSON.parse('{"__proto__":{"polluted":true}}')]
])test(`validation rejects ${name} without silently repairing it`,()=>{const p=createProject();mutate(p);assert.equal(validateProject(p).ok,false);assert.throws(()=>assertProject(p),{code:'INVALID_PROJECT'});assert.equal({}.polluted,undefined);});
test('valid Unicode, emoji, and arbitrary safe extension metadata survive',()=>{const p=createProject({title:'中文 🌱'});p.extensions.example={safe:true};assertProject(p);});
for(const url of ['javascript:alert(1)','file:///etc/passwd','https://user:password@example.com'])test(`unsafe source protocol or credentials rejected: ${url}`,()=>{const p=createProject({sources:[{id:'src_1',title:'Source',url}]});assert.equal(validateProject(p).ok,false);});
test('HTTP source references are validated but not marked verified',()=>{const p=createProject({sources:[{id:'src_1',title:'Example',url:'https://example.com/report'}]});p.slides[0].sourceIds=['src_1'];assertProject(p);assert.equal('verified' in p.sources[0],false);});
test('duplicate / reorder / remove actions are immutable and preserve unique ids',()=>{const p=createProject(),q=editSlides(p,{type:'duplicate',slideId:p.slides[0].id});assert.equal(p.slides.length,1);assert.notEqual(q.slides[0].id,q.slides[1].id);const r=editSlides(q,{type:'move',slideId:q.slides[1].id,to:0});assert.equal(r.slides[0].id,q.slides[1].id);assert.equal(editSlides(r,{type:'remove',slideId:r.slides[0].id}).slides.length,1);});
test('last slide deletion and invalid move fail',()=>{const p=createProject();assert.throws(()=>editSlides(p,{type:'remove',slideId:p.slides[0].id}),{code:'LAST_SLIDE'});assert.throws(()=>editSlides(p,{type:'move',slideId:p.slides[0].id,to:-1}));});
test('legacy import retains original data and explains lossy rendering',()=>{const raw={schemaVersion:2,title:'Legacy',slides:[{id:'old',kind:'cover',content:{title:'An idea',quote:'Quotation',bullets:['A'],metrics:[{label:'Count',value:4}]},layout:{selectedId:'editorial-split'},media:{opaque:'kept'}}]};const saved=JSON.stringify(raw),result=importProject(raw);assertProject(result.project);assert.equal(result.project.slides[0].design.layout,'editorial');assert.equal(result.project.slides[0].content.body,'Quotation');assert.deepEqual(result.project.extensions.legacy.original,raw);assert.equal(JSON.stringify(raw),saved);assert.ok(result.warnings.length>=2);});
test('legacy unsafe and duplicate ids are regenerated',()=>{const p=importProject({schemaVersion:2,slides:[{id:'../x',content:{title:'A'}},{id:'same',content:{title:'B'}},{id:'same',content:{title:'C'}}]}).project;assertProject(p);assert.equal(new Set(p.slides.map(s=>s.id)).size,3);});
test('unsupported import and broken current schema are rejected',()=>{assert.throws(()=>importProject({schemaVersion:99,slides:[]}));assert.throws(()=>importProject({format:'deckweft',schemaVersion:1}));});
