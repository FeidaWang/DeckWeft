import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {deck,dots,demoCues,stageOutline} from './scene.mjs';
import {renderPlayer} from './player.mjs';
import {aeScript} from './after-effects.mjs';
import {createProject,createSlide} from '../../../src/core/model.mjs';
import {compileSlide,LAYOUT_INFO} from '../../../src/layout/scene.mjs';
import {assertProject} from '../../../src/core/validate.mjs';
import {resolveScenes,auditProject} from '../../../src/layout/engine.mjs';
import {sceneToSVG} from '../../../src/render/svg.mjs';
import {exportDeck} from '../../../src/render/export.mjs';
const {values:v}=parseArgs({options:{'runtime-modules':{type:'string'},python:{type:'string'},'presentation-skill':{type:'string'},out:{type:'string'},'figma-video':{type:'string'},bundler:{type:'string'}}});
for(const k of ['runtime-modules','python','presentation-skill','out','bundler'])if(!v[k])throw Error('Missing --'+k);
const source=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(source,'../../..'),workspace=path.resolve(v.out),build=path.join(workspace,'.build'),output=path.join(workspace,'output'),skill=path.resolve(v['presentation-skill']);
if(await fs.stat(output).then(()=>true,()=>false))throw Error('Choose a fresh output directory. Existing deliverables are preserved.');
await fs.mkdir(build,{recursive:true});await fs.mkdir(path.join(output,'assets'),{recursive:true});
process.env.RUNTIME_NODE_MODULES=path.resolve(v['runtime-modules']);
const require=createRequire(import.meta.url),{Presentation,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool',{paths:[process.env.RUNTIME_NODE_MODULES]})).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const files={studio:'studio.png',...Object.fromEntries(dots.map(d=>['dot-'+d.name.toLowerCase(),'dot-'+d.name.toLowerCase()+'.png']))},assets={},bytes={};
for(const [key,name]of Object.entries(files)){bytes[key]=await fs.readFile(path.join(source,'assets',name));assets[key]=`data:image/png;base64,${bytes[key].toString('base64')}`;await fs.copyFile(path.join(source,'assets',name),path.join(output,'assets',name));}
const presentation=Presentation.create({slideSize:{width:deck.width,height:deck.height}}),fontPolicy={basis:'design',families:['Arial']};
for(const [i,s]of deck.slides.entries()){
 const slide=presentation.slides.add();slide.background.fill=s.background;
 for(const [j,n]of s.nodes.entries()){
  if(n.kind==='text'){
   const t=slide.shapes.add({name:`${s.id}-text-${j}`,geometry:'textbox',position:{left:n.x,top:n.y,width:n.w,height:n.h},fill:'none',line:{fill:'none',width:0}});
   t.text=n.value;t.text.style={typeface:'Arial',fontSize:n.size,color:n.color,bold:n.bold,insets:0,wrap:'none',autoFit:'none',verticalAlignment:'top'};
  }else if(n.kind==='image')slide.images.add({blob:new Uint8Array(bytes[n.asset]),contentType:'image/png',alt:n.alt,fit:'contain',position:{left:n.x,top:n.y,width:n.w,height:n.h}});
 }
 if(s.dots)for(const d of dots)slide.images.add({blob:new Uint8Array(bytes['dot-'+d.name.toLowerCase()]),contentType:'image/png',alt:d.name+' Dot cropped from the supplied event artwork',fit:'contain',position:{left:d.x,top:d.y,width:d.s,height:d.s}});
 const counter=slide.shapes.add({name:`${s.id}-page`,geometry:'textbox',position:{left:1400,top:840,width:116,height:28},fill:'none',line:{fill:'none',width:0}});counter.text=String(i+1).padStart(2,'0')+' / 08';counter.text.style={typeface:'Arial',fontSize:20,color:['#101010','#075FFF'].includes(s.background)?'#FFFFFF':'#101010',insets:0};
 slide.speakerNotes.text=`${s.speech}\n\nCue: ${s.cue}\nSlot: ${s.seconds} seconds.\nEvidence: current DeckWeft source, README.md and docs/en/verification.md. Agent bridge: src/services/agent-bridge.mjs and tests/agent-bridge.test.mjs. Dot crops: user-supplied event reference, isolated and animated in Figma. No organiser endorsement implied. The PPTX is a static editable fallback. Motion and rehearsal controls run in the companion HTML; native Figma motion is separate. Actual AE and Dot host execution must not be claimed without acceptance evidence.`;
 const png=await presentation.export({slide,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
const candidatePath=path.join(build,'deckweft-stage.draft.pptx'),finalPath=path.join(output,'deckweft-stage.pptx');await(await PresentationFile.exportPptx(presentation)).save(candidatePath);
await finalizePresentation({workspaceDir:workspace,candidatePath,finalPath,pythonExecutable:path.resolve(v.python),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),explicitTotalSlideCount:8,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy,layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],verifyArtifactToolImport:true,receiptPath:path.join(build,'pptx-validation.json')});
const stage=createProject({id:'deck_dot_stage_file',title:'DeckWeft stage demo',theme:'signal',locale:'en',slides:stageOutline.map((s,i)=>createSlide({id:`stage_file_${i+1}`,role:i===0?'opening':i===2?'closing':'context',content:{eyebrow:'YOUR BUILD, CLEARLY TOLD',...s},notes:'Prepared English example for the live demonstration.'}))});
stage.revision={number:0,createdAt:'2026-10-17T00:00:00.000Z',updatedAt:'2026-10-17T00:00:00.000Z'};assertProject(stage);if(!auditProject(stage,resolveScenes(stage)).ok)throw Error('Stage demo needs layout repair.');
const explorers=Object.keys(LAYOUT_INFO).map(layout=>sceneToSVG(compileSlide(stage,stage.slides[0],layout),{title:LAYOUT_INFO[layout].label,showIssues:true}));
const threeBundle=execFileSync(path.resolve(v.bundler),[path.join(source,'three-layer.mjs'),'--bundle','--minify','--format=iife','--platform=browser','--target=es2020','--legal-comments=inline'],{encoding:'utf8',maxBuffer:8_000_000});
await fs.writeFile(path.join(build,'three-layer.bundle.js'),threeBundle);
await fs.copyFile(path.join(source,'vendor/LICENSE.three'),path.join(output,'LICENSE.three'));
await fs.writeFile(path.join(build,'three-packaging.json'),JSON.stringify({version:'0.186.1',license:'MIT',bundleBytes:Buffer.byteLength(threeBundle),gzipBytes:gzipSync(threeBundle).length,sha256:createHash('sha256').update(threeBundle).digest('hex'),benefit:'Perspective slide stacks and raycast Dot interaction. Editable slide text remains native.',offline:'Inlined in the HTML. No CDN or external requests. Static 2D fallback and reduced motion.',buildTool:'esbuild 0.28.2, MIT, build-time only and not shipped'},null,2)+'\n');
await fs.writeFile(path.join(output,'deckweft-stage.html'),renderPlayer(deck,dots,demoCues,assets,explorers,threeBundle));
await fs.writeFile(path.join(output,'stage-demo.deck.json'),JSON.stringify(stage,null,2)+'\n');
for(const format of ['html','pptx'])await fs.writeFile(path.join(output,`stage-demo-core.${format}`),exportDeck(stage,format).body);
await fs.writeFile(path.join(output,'DeckWeft-Stage.jsx'),aeScript(deck,dots));
await fs.copyFile(path.join(source,'rehearsal.en-AU.md'),path.join(output,'rehearsal.en-AU.md'));
await fs.writeFile(path.join(output,'agent-bridge.en.md'),(await fs.readFile(path.join(root,'docs/en/agent-bridge.md'),'utf8')).replace(/\[简体中文\][^\n]*\n\n/,''));
await fs.writeFile(path.join(output,'ASSET-NOTICE.txt'),'Dot characters are cropped from the participant-supplied event reference. Their original ownership is retained. The software licence does not grant a new licence to third-party artwork. No organiser endorsement is implied.\n');
await fs.writeFile(path.join(output,'START-HERE.txt'),"DeckWeft: start here\n\n1. Open deckweft-stage.html for the 3D presentation and rehearsal tools.\n2. Move the pointer for depth. Click a slide stack or a Dot to interact.\n3. Rehearse this slide shows the spoken script and timing. Close cues before projecting.\n4. Practise the 50s demo gives one action and one line at a time.\n5. Full screen hides controls. Escape returns. Arrow keys change slides.\n6. Reduce motion or the 3D toggle returns to a 2D view.\n\nIf local HTML is blocked, open a terminal in this folder and run:\npython3 -m http.server 4195 --bind 127.0.0.1\nThen open http://127.0.0.1:4195/deckweft-stage.html\nIf that port is busy, use a free port in both places. Stop with Ctrl+C.\nNo internet is needed to play the deck.\n\nThe real Studio demo needs the DeckWeft source and Node.js 22+ separately.\nRead rehearsal.en-AU.md before the live demo. Read agent-bridge.en.md for optional local connection setup.\nThe PPTX is a static editable fallback. The MP4 is the rendered Figma closing animation.\nDeckWeft-Stage.jsx needs After Effects and its adjacent assets folder. Native AE execution remains unverified.\nThe local agent interface is tested. Actual Dot host acceptance remains open.\n");
for(const name of ['LICENSE','NOTICE.md'])await fs.copyFile(path.join(root,name),path.join(output,name));
let time=0;await fs.writeFile(path.join(output,'pitch-script.en-AU.md'),'# DeckWeft: three-minute pitch\n\n'+deck.slides.map((s,i)=>{const from=time;time+=s.seconds;const mm=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');return `## ${i+1}. ${s.title} (${mm(from)}–${mm(time)})\n\n${s.speech}\n\nDelivery cue: ${s.cue}\n`}).join('\n'));
await fs.writeFile(path.join(output,'demo-50-seconds.en-AU.md'),'# The fifty-second demo\n\n| Time | Action | Say |\n| --- | --- | --- |\n'+demoCues.map(c=>`| ${c.at}–${c.until}s | ${c.action} | ${c.say} |`).join('\n')+'\n');
if(v['figma-video'])await fs.copyFile(path.resolve(v['figma-video']),path.join(output,'thanks-figma.mp4'));
await fs.writeFile(path.join(build,'report.json'),JSON.stringify({slides:8,spokenWords:deck.slides.map(s=>s.speech).join(' ').split(/\s+/).length,seconds:time,nativeTextShapes:deck.slides.reduce((n,s)=>n+s.nodes.filter(n=>n.kind==='text').length+1,0),figma:'Editable design and native timelines created in the task. Private link omitted from distributable source.',ae:'Script generated. App unavailable for execution.',dotHost:'Local MCP protocol tested. Actual Dot host acceptance pending.',fontPolicy},null,2)+'\n');
console.log(JSON.stringify({output,slides:8,seconds:time,pptx:finalPath},null,2));
