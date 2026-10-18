import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
import {pitch,template,stageSlides,colours,eventSource,pitchSource,designSource} from './content.mjs';
import {renderPlayer} from './player.mjs';
import {createProject,createSlide} from '../../../src/core/model.mjs';
import {assertProject} from '../../../src/core/validate.mjs';
import {resolveScenes,auditProject} from '../../../src/layout/engine.mjs';
import {exportDeck} from '../../../src/render/export.mjs';

const {values}=parseArgs({options:{'runtime-modules':{type:'string'},python:{type:'string'},'presentation-skill':{type:'string'},out:{type:'string'},'render':{type:'boolean'}}});
for(const k of ['runtime-modules','python','presentation-skill','out'])if(!values[k])throw Error(`Provide --${k}. Uses the optional document authoring runtime, not a new DeckWeft dependency.`);
const source=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(source,'../../..'),workspace=path.resolve(values.out),build=path.join(workspace,'.build'),output=path.join(workspace,'output'),skill=path.resolve(values['presentation-skill']);
// Refuse overwrites so previous finalised deliverables remain reviewable.
if(await fs.stat(output).then(()=>true,()=>false))throw Error('Choose a fresh --out directory. Existing output is preserved.');
await fs.mkdir(build,{recursive:true});await fs.mkdir(output,{recursive:true});
process.env.RUNTIME_NODE_MODULES=path.resolve(values['runtime-modules']);
const require=createRequire(import.meta.url);
const {Presentation,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool',{paths:[process.env.RUNTIME_NODE_MODULES]})).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const screenshot=await fs.readFile(await fs.access(path.join(source,'assets/studio-demo.png')).then(()=>path.join(source,'assets/studio-demo.png'),()=>path.join(root,'docs/assets/studio-desktop.png')));
const images={studio:`data:image/png;base64,${screenshot.toString('base64')}`};
const fontPolicy={basis:'design',families:['Arial']};
const reports=[];
for(const [stem,deck] of [['deckweft-melbourne-pitch',pitch],['melbourne-demo-template',template]]){
 const presentation=Presentation.create({slideSize:{width:deck.width,height:deck.height}});
 for(const [index,s] of deck.slides.entries()){
  const slide=presentation.slides.add();slide.background.fill=s.background;
  if(s.image)slide.images.add({blob:new Uint8Array(screenshot),contentType:'image/png',alt:s.image.alt,fit:'contain',position:{left:s.image.x,top:s.image.y,width:s.image.w,height:s.image.h}});
  if(s.diagram){
   const blocks=[104,609,1120].map((x,n)=>slide.shapes.add({name:`architecture-${n}`,geometry:'rect',position:{left:x-24,top:325,width:n===1?470:440,height:310},fill:'none',line:{fill:'#C6C8BF',width:2}}));
   for(let i=0;i<2;i++)slide.shapes.connect(blocks[i],blocks[i+1],{kind:'straight',fromSide:'right',toSide:'left',line:{fill:colours.orange,width:3},tail:{type:'triangle',width:'med',length:'med'}});
  }
  const texts=[...s.texts,{value:index<deck.mainCount?`${String(index+1).padStart(2,'0')} / ${String(deck.mainCount).padStart(2,'0')}`:`Q&A ${index-deck.mainCount+1}`,x:1400,y:840,w:116,h:28,size:20,color:s.background===colours.ink?colours.paper:colours.ink,font:'Arial'}];
  for(const [n,t] of texts.entries()){
   const shape=slide.shapes.add({name:`${s.id}-text-${n}`,geometry:'textbox',position:{left:t.x,top:t.y,width:t.w,height:t.h},fill:'none',line:{fill:'none',width:0}});
   shape.text=t.value;shape.text.style={typeface:t.font,fontSize:t.size,color:t.color,bold:!!t.bold,insets:0,wrap:'none',autoFit:'none',verticalAlignment:'top'};
  }
  slide.speakerNotes.text=s.notes;
  if(values.render){const png=await presentation.export({slide,format:'png',scale:1});await fs.writeFile(path.join(build,`${stem}-${String(index+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));}
 }
 const candidatePath=path.join(build,`${stem}.draft.pptx`),finalPath=path.join(output,`${stem}.pptx`);
 await(await PresentationFile.exportPptx(presentation)).save(candidatePath);
 await finalizePresentation({workspaceDir:workspace,candidatePath,finalPath,pythonExecutable:path.resolve(values.python),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),explicitTotalSlideCount:deck.slides.length,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy,layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],verifyArtifactToolImport:true,receiptPath:path.join(build,`${stem}.validation.json`)});
 await fs.writeFile(path.join(output,`${stem}.html`),renderPlayer(deck,images),{flag:'wx'});
 reports.push({stem,slides:deck.slides.length,mainSlides:deck.mainCount,editableTextShapes:deck.slides.reduce((n,s)=>n+s.texts.length+1,0)});
}
const fixedDate='2026-10-17T00:00:00.000Z';
const sources=[{id:'event',title:'DevDay Exchange Community: Melbourne',url:eventSource},{id:'mlai',title:'MLAI public website',url:designSource},{id:'pitch',title:'MLAI pitch guidance',url:pitchSource}];
const project=(id,title,slides)=>{
 const p=createProject({id,title,locale:'en',theme:'paper',aspectRatio:'16:9',brief:{prompt:'A short, honest demo pitch',audience:'Melbourne builders, including first-time participants',outcome:'Understand the project and try one useful workflow'},slides,sources});
 p.revision={number:0,createdAt:fixedDate,updatedAt:fixedDate};assertProject(p);const audit=auditProject(p,resolveScenes(p));if(!audit.ok)throw Error(JSON.stringify(audit));return p;
};
const rawContent=[
 {title:'Your build. Clearly told.',body:'DeckWeft makes an editable pitch from your own notes.'},
 {title:'The last-mile problem',body:'A newcomer has to explain the project and make the slides readable. This is our starting hypothesis.'},
 {title:'Your words stay editable',body:'Compare four layouts on your laptop. Export native PowerPoint text and shapes. Node.js 22+ required.'},
 {title:'One idea, four layouts',body:'Live walkthrough: edit one headline, choose another layout and save. A real screenshot is the fallback.'},
 {title:'How it works, simply',body:'Paper notes hold your story. The layout desk tries four arrangements. An export packs editable slides to go.'},
 {title:'What the alpha does today',body:'Four layout choices. Zero external runtime packages. Editable PowerPoint text and shapes. Wider checks remain open.'},
 {title:'The next useful test',body:'Proposed: five willing first-time builders, one rough outline each. Observe where they get stuck. This study has not run yet.'},
 {title:'A pitch for your next build',body:'Keen to try it with your own outline? Find me after the demos and we can try the local alpha together.'}
];
const rawPitch=project('deck_melbourne_pitch','DeckWeft Melbourne pitch',pitch.slides.slice(0,8).map((s,i)=>createSlide({id:`melbourne_pitch_${i+1}`,role:i===0?'opening':i===7?'closing':'context',content:{eyebrow:'MELBOURNE DEMO',...rawContent[i]},notes:s.notes,sourceIds:['event','pitch']})));
const rawTemplate=project('deck_melbourne_template','Melbourne demo template',template.slides.map((s,i)=>createSlide({id:`melbourne_template_${i+1}`,role:i===0?'opening':i===7?'closing':'context',content:{eyebrow:'YOUR DEMO',title:s.title,body:'Replace this guidance with your project. Keep one clear idea on each slide.'},notes:s.notes,sourceIds:['event','pitch']})));
const stage=project('deck_melbourne_stage','DeckWeft stage demo',stageSlides.map((s,i)=>createSlide({id:`melbourne_stage_${i+1}`,role:i===0?'opening':i===2?'closing':'context',content:{eyebrow:'BUILT IN MELBOURNE',...s},notes:'A prepared sample outline for the live workflow. This is not customer research.'})));
for(const [name,p] of [['pitch.deck.json',rawPitch],['template.deck.json',rawTemplate],['stage-demo.deck.json',stage]])await fs.writeFile(path.join(output,name),JSON.stringify(p,null,2)+'\n',{flag:'wx'});
// A real export by DeckWeft, separate from the bespoke authored presentation.
for(const format of ['html','pptx'])await fs.writeFile(path.join(output,`stage-demo-core-export.${format}`),exportDeck(stage,format).body,{flag:'wx'});
for(const lang of ['en','zh-CN'])await fs.copyFile(path.join(source,`presenter-guide.${lang}.md`),path.join(output,`presenter-guide.${lang}.md`));
for(const name of ['LICENSE','NOTICE.md'])await fs.copyFile(path.join(root,name),path.join(output,name));
await fs.writeFile(path.join(output,'pitch-script.en-AU.md'),'# DeckWeft: three-minute pitch\n\n'+pitch.slides.slice(0,8).map((s,i)=>`## ${i+1}. ${s.title}\n\n${s.notes.split('\n').slice(0,i===3?3:1).join('\n\n')}\n`).join('\n'),{flag:'wx'});
await fs.writeFile(path.join(build,'build-report.json'),JSON.stringify({reports,coreExportMeasurement:'offline-estimate',fontPolicy,externalNetworkAtPresentation:false},null,2)+'\n');
console.log(JSON.stringify({output,reports},null,2));
