// Deterministic demo construction from the preserved original image-tool artifact.
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createProject,createSlide} from '../src/core/model.mjs';
import {migrateToPlanning} from '../src/planning/storyboard.mjs';
import {registerAsset,assetResources} from '../src/assets/registry.mjs';
import {ProjectStore} from '../src/services/store.mjs';
import {exportDeck} from '../src/render/export.mjs';
const directory=path.resolve(process.argv[2]||'dist/mb-11-15/demo');await mkdir(directory,{recursive:true});
const rows=[
 ['Local art, a clear story','One generated illustration; the title and caption remain editable.',['Blank cards give the story room.','Blue thread connects the ideas.']],
 ['An orbit of related ideas','Use spatial form to explain a relationship.',['Rotate with the keyboard controls.','Reduce motion to stop the continuous turn.']],
 ['Build one layer at a time','Static delivery keeps independent editable shapes.',['Shared brief','Independent artifacts','One reviewed integration']],
 ['每个素材都有来路','中文与 English 保留可编辑文字。',['图片是装饰，不是研究证据。','离线导出使用原生形状后备。']]
];
const base=createProject({id:'mb_media_demo',title:'Local art and spatial ideas',theme:'signal',slides:rows.map(([title,body,items],i)=>createSlide({id:'media_slide_'+i,content:{title,body,items},notes:'Private demonstration notes.',motion:{preset:'rise',duration:8}}))});
base.revision.createdAt=base.revision.updatedAt='2026-10-18T00:00:00.000Z';
const p=migrateToPlanning(base,{id:base.id}).project;p.revision.createdAt=p.revision.updatedAt='2026-10-18T00:00:00.000Z';p.planning.reviewed=true;
const original=await readFile('docs/evidence/mb-11-15/workbench-generated.png');
const a=await registerAsset(directory,original,{provenance:'Original artwork from the built-in image generation tool, 2026-10-18. Exact prompt recorded in docs/evidence/mb-11-15/image-prompt.txt. Decorative fictional still life.',license:'Generated artwork; no third-party rights clearance asserted',allowedUse:'DeckWeft demonstration and local presentation; review your intended use',alt:'Blank paper story cards on a wooden workbench with a spool of blue thread',fallback:'Paper story cards connected by blue thread; decorative artwork, not evidence.'});
p.assets=[a];p.slides.forEach((s,i)=>{s.intent.visualFamily='image-caption';s.intent.assetIds=i===0?[a.id]:[];s.intent.spatialRecipe=i===1?'orbit':i>=2?'layers':'none';});
await writeFile(path.join(directory,'media.deck.json'),JSON.stringify(p,null,2)+'\n');
const resources=await assetResources(p,directory);
for(const format of ['html','pptx','figma','motion']){const output=exportDeck(p,format,{assetResources:resources});await writeFile(path.join(directory,'media.'+output.extension),output.body);}
const store=await new ProjectStore(path.join(directory,'library')).init();
await registerAsset(store.home,original,a);try{await store.get(p.id);}catch(e){if(e.code!=='NOT_FOUND')throw e;await store.save(p,{create:true});}
console.log(JSON.stringify({directory,home:store.home,slides:p.slides.length,assetHash:a.hash,formats:['html','pptx','figma','motion']}));
