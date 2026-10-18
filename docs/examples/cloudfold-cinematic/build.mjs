import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
import {deck} from './scene.mjs';
import {renderPlayer} from './player.mjs';

const {values}=parseArgs({options:{'runtime-modules':{type:'string'},python:{type:'string'},'presentation-skill':{type:'string'},out:{type:'string'}}});
for(const key of ['runtime-modules','python','presentation-skill','out'])if(!values[key])throw Error(`Provide --${key}. This optional authoring example uses the supplied document runtime, not a DeckWeft runtime dependency.`);
const source=path.dirname(fileURLToPath(import.meta.url)),workspace=path.resolve(values.out),build=path.join(workspace,'.build'),output=path.join(workspace,'output'),skill=path.resolve(values['presentation-skill']);
await fs.mkdir(build,{recursive:true});await fs.mkdir(output,{recursive:true});
const finalPath=path.join(output,'cloudfold-illustrated.pptx'),htmlPath=path.join(output,'cloudfold-animated.html');
for(const file of [finalPath,htmlPath])if(await fs.stat(file).then(()=>true,()=>false))throw Error('Choose a new output directory; previous deliverables are preserved.');
const require=createRequire(import.meta.url);
process.env.RUNTIME_NODE_MODULES=path.resolve(values['runtime-modules']);
const {Presentation,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool',{paths:[path.resolve(values['runtime-modules'])]})).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
// Typography stays native and editable. Illustrations contain no baked-in slide text.
const fontPolicy={basis:'design',families:['Georgia','Arial']};
const presentation=Presentation.create({slideSize:{width:deck.width,height:deck.height}}),images={};
for(const s of deck.slides){
  const slide=presentation.slides.add();slide.background.fill=s.background;
  const bytes=await fs.readFile(path.join(source,'assets',s.art));images[s.art]=`data:image/png;base64,${bytes.toString('base64')}`;
  const f=s.artFrame||{x:0,y:0,w:deck.width,h:deck.height};
  slide.images.add({blob:new Uint8Array(bytes),contentType:'image/png',alt:s.alt,fit:'contain',position:{left:f.x,top:f.y,width:f.w,height:f.h}});
  for(const t of s.texts){
    const shape=slide.shapes.add({name:t.id,geometry:'textbox',position:{left:t.x,top:t.y,width:t.w,height:t.h},fill:'none',line:{fill:'none',width:0}});
    shape.text=t.value;shape.text.style={typeface:t.font,fontSize:t.size,color:t.color,bold:t.bold,insets:0,wrap:'none',autoFit:'none',verticalAlignment:'top'};
  }
  slide.speakerNotes.text=`Cloudfold Club is fictional. Original example revised with generated sculptural paper illustrations and editable native text.\nIllustration: built-in image_gen; full prompts in docs/examples/cloudfold-cinematic/assets/prompts.json. No external facts or statistics.\nMotion is delivered in the companion HTML, not native PowerPoint animation. No fonts are embedded.`;
}
const candidatePath=path.join(build,'candidate.pptx');await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
await finalizePresentation({workspaceDir:workspace,candidatePath,finalPath,pythonExecutable:path.resolve(values.python),
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  explicitTotalSlideCount:3,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy,
  layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],
  verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
await fs.writeFile(htmlPath,renderPlayer(deck,images),{flag:'wx'});
await fs.writeFile(path.join(build,'scene.json'),JSON.stringify(deck,null,2)+'\n');
console.log(JSON.stringify({finalPath,htmlPath,slides:3,nativeTextBoxes:deck.slides.map(s=>s.texts.length),motion:'HTML staged reveals, art glides, transitions, keyboard/replay/reduced-motion controls; PPTX static'},null,2));
