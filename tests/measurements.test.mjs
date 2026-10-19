import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../src/core/model.mjs';
import { fitText,graphemes,visibleLine,wrapRanges,fontPreference } from '../src/layout/text.mjs';
import { MeasurementSessions,renderFingerprint,validateFit } from '../src/services/measurements.mjs';
import { exportDeck } from '../src/render/export.mjs';
import { unzip } from './helpers.mjs';
// Contract tests use a deterministic fixture. These are NOT real browser/host measurements.
export function fixtureResults(plan){return plan.requests.map(r=>{const f=fitText(r.text,r.box,r.style);return {id:r.id,fontSize:f.fontSize,ranges:f.ranges,widths:f.widths,ascent:f.ascent,descent:f.descent,fontFamily:r.style.families[0]};});}
const difficult=['AVA fi office WWW iii','第一行，第二行。“保留标点”。','English + 简体中文 + 123','a\u0301 e\u0301 👨‍👩‍👧‍👦 🇦🇺 🙂','line 1\r\n\r\nline 3\n','  indent\tspaces  ','longwordwithoutbreak'.repeat(5),'a\u00a0b narrow\u202fspace',''];
for(const [i,text]of difficult.entries())test(`DW-130: lossless grapheme-safe wrapping fixture ${i+1}`,()=>{
  const boundaries=new Set([0,text.length,...graphemes(text).map(g=>g.end)]);
  for(const width of [1,20,160,700]){
    const ranges=wrapRanges(text,width,30);let end=0;
    for(const [a,b]of ranges){assert.equal(a,end);assert.ok(boundaries.has(a)&&boundaries.has(b));end=b;assert.doesNotMatch(visibleLine(text.slice(a,b)),/[\r\n]/);}
    assert.equal(end,text.length);assert.equal(ranges.map(([a,b])=>text.slice(a,b)).join(''),text);
  }
});
test('DW-130: oversized content never shrinks below floor or deletes source',()=>{const text='Dense content '.repeat(100),f=fitText(text,{w:40,h:20},{preferred:60,minimum:24});assert.equal(f.fontSize,24);assert.ok(f.overflow);assert.equal(f.text,text);});
test('DW-130: fingerprint is deterministic and ignores saved revision only',()=>{const p=createProject(),q=Object.fromEntries(Object.entries(p).reverse());assert.equal(renderFingerprint(p),renderFingerprint(q));q.revision={...p.revision,number:29};assert.equal(renderFingerprint(p),renderFingerprint(q));q.locale='zh-CN';assert.notEqual(renderFingerprint(p),renderFingerprint(q));});
test('DW-130: plans cover all directions; validated fits replay into the same export scene',()=>{const s=new MeasurementSessions(),p=createProject(),plan=s.plan(p),result=s.resolve(plan.id,fixtureResults(plan));assert.ok(new Set(plan.requests.map(r=>r.id.split(':')[0])).size===4);assert.equal(s.get(result.ticket,p).resolved,result.resolved);const out=exportDeck(p,'pptx',{resolved:result.resolved}),files=unzip(out.body),xml=files.get('ppt/slides/slide1.xml').toString();assert.match(xml,/typeface="Georgia"/);assert.equal(result.receipt.method,'browser-canvas');assert.equal(result.resolved[0].scene.measurement,'browser-canvas');});
test('DW-130: stale project changes cannot reuse an export ticket; save-only change can',()=>{const s=new MeasurementSessions(),p=createProject(),plan=s.plan(p),{ticket}=s.resolve(plan.id,fixtureResults(plan));const q=structuredClone(p);q.revision.number++;assert.ok(s.get(ticket,q));for(const key of ['title','theme']){const q=structuredClone(p);q[key]=key==='title'?'New title':'ocean';assert.throws(()=>s.get(ticket,q),{code:'STALE_MEASUREMENT'});}});
test('DW-130: expired/consumed plans and expired render tickets fail closed',()=>{let now=100;const s=new MeasurementSessions({now:()=>now,ttl:5}),p=createProject(),plan=s.plan(p);const r=s.resolve(plan.id,fixtureResults(plan));assert.throws(()=>s.resolve(plan.id,fixtureResults(plan)),{code:'MEASUREMENT_EXPIRED'});now=106;assert.throws(()=>s.get(r.ticket,p),{code:'MEASUREMENT_EXPIRED'});const next=s.plan(p);now=112;assert.throws(()=>s.resolve(next.id,fixtureResults(next)),{code:'MEASUREMENT_EXPIRED'});});
test('DW-130: bounded plan cache evicts oldest, and missing boxes are rejected',()=>{const s=new MeasurementSessions({limit:2}),p=createProject(),first=s.plan(p);s.plan(p);s.plan(p);assert.equal(s.plans.size,2);assert.throws(()=>s.resolve(first.id,fixtureResults(first)),{code:'MEASUREMENT_EXPIRED'});const plan=s.plan(p);assert.throws(()=>s.resolve(plan.id,fixtureResults(plan).slice(1)),{code:'INVALID_MEASUREMENT'});});
const req={id:'box',text:'A👨‍👩‍👧‍👦 B',box:{w:900,h:200},style:{preferred:32,minimum:20,...fontPreference()}};
const good=()=>fixtureResults({requests:[req]})[0];
for(const [name,mutate]of Object.entries({wrongId:r=>r.id='another',droppedText:r=>r.ranges=[[0,1]],splitEmoji:r=>{r.ranges=[[0,2],[2,req.text.length]];r.widths=[20,100];},wrongFamily:r=>r.fontFamily='Injected font',smallFont:r=>r.fontSize=1,nanWidth:r=>r.widths=[NaN],zeroWidth:r=>r.widths=[0],negativeAscent:r=>r.ascent=-1,duplicateRange:r=>{r.ranges=[[0,req.text.length],[0,req.text.length]];r.widths=[100,100];}}))test(`DW-130: rejects malformed measurement ${name}`,()=>{const r=good();mutate(r);assert.throws(()=>validateFit(req,r),{code:'INVALID_MEASUREMENT'});});
test('hardening: an implausibly narrow positive width for visible text is refused; a plausible one passes',()=>{
 const r=good();r.widths=r.widths.map(()=>0.001);assert.throws(()=>validateFit(req,r),{code:'INVALID_MEASUREMENT'});
 const ok=good();assert.ok(validateFit(req,ok));
});
