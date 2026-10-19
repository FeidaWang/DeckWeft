import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {temp} from './helpers.mjs';
import {decodePNG,encodePNG,placePixelControl,detectPixelControl,CONTROL_FILL,DIGIT_GLYPHS} from '../src/quality/pixel-control.mjs';
import {reviewWithHost} from '../src/hosts/tasks.mjs';
import {createVisualTask} from '../src/agent/director.mjs';
import {createQualityReceipt,recordVisualReview} from '../src/quality/visual-review.mjs';

const ok=stdout=>({exitCode:0,stdout,stderr:'',elapsedMs:1});
const help='--output-schema --output-last-message --json --sandbox --image --json-schema --output-format --input-format --permission-mode "manual"\n --tools --no-chrome --no-session-persistence';
/** A Codex-shaped fake host. `answer(prompt, stagedImages)` returns the structured value; the prompt is what the host actually received. */
function fakeHost(answer){return async(command,args,options)=>{
 if(args.includes('--help')||args.includes('--version'))return ok(args[0]==='--version'?'codex-cli 0.160.0':help);
 const s=JSON.parse(await readFile(args[args.indexOf('--output-schema')+1],'utf8')),images=args.flatMap((a,i)=>a==='--image'?[args[i+1]]:[]);
 const value=await answer(options.input,images,s);
 await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({requestId:s.properties.requestId.enum[0],...value}));
 return ok('{"type":"turn.completed","usage":{"input_tokens":10}}\n');
};}
/** The image metadata the prompt carries: file names and hashes only. */
const sentMetadata=prompt=>JSON.parse(prompt.slice(prompt.indexOf('Image order and metadata: ')+'Image order and metadata: '.length,prompt.indexOf('\nPublic scene data')));

test('F5: the PNG codec round-trips RGBA and RGB images, and refuses what it cannot decode',()=>{
 const w=37,h=11,rgba=Buffer.alloc(w*h*4);for(let i=0;i<w*h;i++){rgba[i*4]=i%256;rgba[i*4+1]=(i*7)%256;rgba[i*4+2]=(i*13)%256;rgba[i*4+3]=255;}
 const png=encodePNG({width:w,height:h,data:rgba}),back=decodePNG(png);
 assert.equal(back.width,w);assert.equal(back.height,h);assert.ok(back.data.equals(rgba));
 assert.throws(()=>decodePNG(Buffer.from('not a png')),/PNG/);
 const palette=Buffer.concat([png.subarray(0,25)]);palette[25-8]=3;assert.throws(()=>decodePNG(palette),/PNG/);
});
test('F5: a placed control is a magenta tag with three black digits at a position only the control record knows; the detector reads it back from pixels alone',async()=>{
 const original=await readFile(new URL('../public/assets/visual/subject.png',import.meta.url));
 const seen=new Set();
 for(let n=0;n<6;n++){
  const placed=placePixelControl(original,{random:()=>((n*7919+13)%1000)/1000});
  assert.match(placed.text,/^\d{3}$/);seen.add(placed.text+'@'+placed.bounds.x+','+placed.bounds.y);
  assert.ok(placed.bounds.x>=8&&placed.bounds.y>=8&&placed.bounds.x+placed.bounds.width<=1200-8&&placed.bounds.y+placed.bounds.height<=800-8,JSON.stringify(placed.bounds));
  assert.notEqual(placed.sha256,createHash('sha256').update(original).digest('hex'));assert.equal(placed.sha256,createHash('sha256').update(placed.bytes).digest('hex'));
  const read=detectPixelControl(placed.bytes);
  assert.equal(read.text,placed.text);assert.deepEqual(read.bounds,placed.bounds);
  // Outside the tag the pixels are the original's.
  const a=decodePNG(original),b=decodePNG(placed.bytes);let changed=0;for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const i=(y*a.width+x)*4;if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]){changed++;assert.ok(x>=placed.bounds.x&&x<placed.bounds.x+placed.bounds.width&&y>=placed.bounds.y&&y<placed.bounds.y+placed.bounds.height,'changed pixel outside the tag');}}
  assert.equal(changed,placed.bounds.width*placed.bounds.height);
 }
 assert.ok(seen.size>=4,'positions and digits vary with the random source');
 assert.equal(detectPixelControl(original).text,null,'an untouched image has no tag');
 assert.equal(Object.keys(DIGIT_GLYPHS).length,10);assert.deepEqual(CONTROL_FILL,[255,43,214]);
});
test('F5: a host that reads pixels earns host-pixel-control; a host that only echoes metadata, or reads the wrong digits, stays host-metadata-only; the originals and their hashes are untouched',async t=>{
 const cwd=await temp(t),bytes=await readFile(new URL('../public/assets/visual/subject.png',import.meta.url)),sha256=createHash('sha256').update(bytes).digest('hex');
 await writeFile(path.join(cwd,'one.png'),bytes);await writeFile(path.join(cwd,'two.png'),bytes);
 const fresh=()=>{const task=createVisualTask({request:'One\nText\n---\nTwo\nMore'});task.observation={};task.receipt=createQualityReceipt(task.project,{},{ok:true,issues:[]},['one.png','two.png'].map(file=>({file,sha256,reviewRequired:true})));return task;};
 const base=(meta,controls)=>({judgment:'Fixture review.',verdict:'pass',issues:[],images:meta.map(m=>({file:m.file,sha256:m.sha256,finding:'Visible fixture pixels, not a real layout review.'})),...(controls?{controls}:{})});
 const reader=fakeHost(async(prompt,staged,schema)=>{const meta=sentMetadata(prompt);assert.ok(schema.required.includes('controls'),'controls are required when the control is on');
  assert.ok(meta.every(m=>Object.keys(m).every(k=>['file','sha256','reviewRequired'].includes(k))),'the metadata carries file names and hashes only');
  assert.match(prompt,/numbered colour tag/);assert.doesNotMatch(prompt,/CONTROL_|"text":"\d{3}"/);
  // The host can read its working directory, so the expected answers are not on disk while it runs.
  await assert.rejects(access(path.join(path.resolve(cwd,path.dirname(staged[0])),'control.json')),/ENOENT/);
  const controls=await Promise.all(staged.map(async(file,i)=>{const read=detectPixelControl(await readFile(file));assert.ok(!prompt.includes(read.text+'"')&&!prompt.includes('"x":'+read.bounds.x+','),'digits and positions are not in the prompt');return {file:meta[i].file,text:read.text,bounds:read.bounds};}));
  return base(meta,controls);});
 const echo=fakeHost(async prompt=>{const meta=sentMetadata(prompt);return base(meta,meta.map(m=>({file:m.file,text:'000',bounds:{x:0,y:0,width:1,height:1}})));});
 const wrong=fakeHost(async(prompt,staged)=>{const meta=sentMetadata(prompt);const controls=await Promise.all(staged.map(async(file,i)=>{const read=detectPixelControl(await readFile(file));return {file:meta[i].file,text:String((Number(read.text)+1)%1000).padStart(3,'0'),bounds:read.bounds};}));return base(meta,controls);});
 const options={host:'codex',cwd,live:true,pixelControl:true};
 const hit=await reviewWithHost({task:fresh()},{...options,runner:reader});
 assert.equal(hit.ok,true,JSON.stringify(hit.receipt).slice(0,400));assert.equal(hit.review.attestation,'host-pixel-control');assert.deepEqual(hit.review.images,['one.png','two.png']);
 assert.deepEqual(hit.review.controls.summary,{hits:2,total:2});assert.ok(hit.review.controls.images.every(c=>c.hit&&/^\d{3}$/.test(c.expected.text)&&c.reported.text===c.expected.text));
 assert.ok(hit.review.controls.images.every(c=>c.file!==c.sentFile&&c.sentFile.includes('.deckweft-pixel-control')),'the host saw copies, the review names the originals');
 const written=JSON.parse(await readFile(path.join(cwd,path.dirname(hit.review.controls.images[0].sentFile),'control.json'),'utf8'));
 assert.equal(written.writtenAfterHost,true);assert.deepEqual(written.images.map(i=>i.text),hit.review.controls.images.map(c=>c.expected.text));
 const miss=await reviewWithHost({task:fresh()},{...options,runner:echo});
 assert.equal(miss.ok,true);assert.equal(miss.review.attestation,'host-metadata-only');assert.deepEqual(miss.review.controls.summary,{hits:0,total:2});
 const off=await reviewWithHost({task:fresh()},{...options,runner:wrong});
 assert.equal(off.ok,true);assert.equal(off.review.attestation,'host-metadata-only');assert.deepEqual(off.review.controls.summary,{hits:0,total:2});assert.ok(off.review.controls.images.every(c=>!c.hit&&c.reported.text!==c.expected.text));
 // Without the control the attestation can only be metadata-only, and the schema does not ask for controls.
 const plain=await reviewWithHost({task:fresh()},{host:'codex',cwd,live:true,runner:fakeHost(async(prompt,staged,schema)=>{assert.ok(!schema.properties.controls);return base(sentMetadata(prompt));})});
 assert.equal(plain.ok,true);assert.equal(plain.review.attestation,'host-metadata-only');assert.equal(plain.review.controls,undefined);
 // Originals are untouched; a stale original still fails before any host runs.
 assert.equal(createHash('sha256').update(await readFile(path.join(cwd,'one.png'))).digest('hex'),sha256);
 await writeFile(path.join(cwd,'two.png'),Buffer.concat([bytes,Buffer.from([0])]));await assert.rejects(reviewWithHost({task:fresh()},{...options,runner:reader}),/HASH_MISMATCH/);
 // The attestation survives into the receipt; an author review records itself as such.
 const task=fresh();const recorded=recordVisualReview(task.receipt,{...hit.review,receiptId:task.receipt.id});assert.equal(recorded.review.attestation,'host-pixel-control');assert.deepEqual(recorded.review.controls.summary,{hits:2,total:2});
 const said={receiptId:task.receipt.id,reviewer:'author',delivery:'Opened both captures.',images:['one.png','two.png'],judgment:'Fine.',issues:[],verdict:'pass'};
 assert.equal(recordVisualReview(task.receipt,said).review.attestation,'unattested','nobody is assumed to be the author');
 assert.equal(recordVisualReview(task.receipt,{...said,attestation:'author'}).review.attestation,'author');
 assert.throws(()=>recordVisualReview(task.receipt,{receiptId:task.receipt.id,reviewer:'author',delivery:'x',images:['one.png','two.png'],judgment:'x',verdict:'pass',attestation:'host-pixel-control'}),/attestation/);
});
