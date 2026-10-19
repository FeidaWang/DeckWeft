import {sceneThumbnail} from '../render/web/document.mjs';
import {WorkbenchService} from '../workbench/service.mjs';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {rejectSymlinks} from './io.mjs';
import {createInteractionDemo} from '../core/interaction-demo.mjs';
import {createComponentDemo} from '../core/component-demo.mjs';
import {createAssetDemo} from '../core/asset-demo.mjs';
import {uploadImageBlob,registerVisualImport,readImageBlob} from '../assets/import.mjs';
import {slotFor,configureSlot,slotCandidates,applySlotCrop,attachSlotAsset,addSlotAsset} from '../assets/slots.mjs';
import {copySourceAsset} from '../assets/selection.mjs';
import {imageCapabilities} from '../assets/generation.mjs';
import {assertVisualLocks} from '../core/visual-project.mjs';
import { createCompositionDemo } from '../core/composition-demo.mjs';
import { candidateProjects, candidateFit, chooseRhythm, moveScene } from '../design/rhythm.mjs';
import { families, describeCandidate } from '../design/compositions.mjs';
import { identifier } from '../core/model.mjs';
import { randomBytes } from 'node:crypto';
import { VisualProjectStore } from './visual-store.mjs';
import { assertVisualProject, createVisualProject } from '../core/visual-project.mjs';
import { createVisualDemo } from '../core/visual-demo.mjs';
import { migrateToPresentation } from '../core/adapters/legacy-project.mjs';
import { exportDeck } from '../render/export.mjs';
import { visualAssetResources } from '../assets/visual.mjs';
import { assetResources,registerAsset } from '../assets/registry.mjs';
import { contentHash } from '../scene/web/compile.mjs';
import { themePacks } from '../design/theme-registry.mjs';
import { applySceneTheme } from '../design/profile.mjs';
import { DeckError } from '../core/errors.mjs';
import { createVisualTask } from '../agent/director.mjs';
import { planDirections, entryAnswers } from '../workbench/directions.mjs';
import { planAuthorAction } from '../workbench/author-actions.mjs';
import { resolveScope, describeScope } from '../workbench/scope.mjs';
import { planPages, applyPagePlan } from '../planning/argument-units.mjs';
import { DesignProfileStore } from './profile-store.mjs';
import { promoteProfile, assertDesignProfile } from '../design/design-profile.mjs';
import { studioTargetExport } from '../targets/studio-export.mjs';
import { assertEvidenceSupplied } from '../design/scene-semantics.mjs';
const fail422=message=>{throw new DeckError('WORKBENCH_ENTRY',message,422);};
export async function createVisualService({home,legacyStore,body,send,browserPath,workbenchCapture,hostOptions,historyLimits}){
 const store=await new VisualProjectStore(home,{historyLimits}).init(),artifacts=new Map(),profiles=await new DesignProfileStore(store.home).init();
 const workbench=new WorkbenchService({store,browserPath,capture:workbenchCapture,hostOptions});
 const reviewed=async project=>{const id=project.extensions.deckweftWorkbench?.id;if(!id)return false;const r=await workbench.get(id).catch(()=>null);return !!r&&r.canExport&&r.receipt?.status==='passed'&&contentHash(r.project)===contentHash(project);};
 const entry=ticket=>{const item=artifacts.get(ticket);if(!item||Date.now()-item.createdAt>600000){artifacts.delete(ticket);throw new DeckError('STALE_VISUAL_RENDER','Refresh the measured visual preview.',409);}return item;};
 return {store,close:()=>workbench.close(),
  artifact(req,res,url){const match=url.pathname.match(/^\/visual-artifacts\/([a-f0-9]{48})$/);if(!match)return false;
   if(req.method!=='GET')throw new DeckError('METHOD_NOT_ALLOWED','Use GET for the preview artifact.',405);
   const a=entry(match[1]),html=url.searchParams.has('thumbnail')?sceneThumbnail(a.output,url.searchParams.get('thumbnail')):a.output.body;res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':a.output.csp+"; frame-ancestors 'self'"});res.end(html);return true;
  },
  async route(req,res,url){
   if(!url.pathname.startsWith('/api/visual/'))return false;
   const route=url.pathname.slice('/api/visual/'.length),method=req.method;
   if(route==='workbench'&&method==='POST'){send(res,202,await workbench.create(await body(req)));return true;}
   if(route==='workbench-capabilities'&&method==='GET'){send(res,200,{captureAvailable:!!workbench.capture,hosts:['local','codex'],claude:'deferred',policy:'Existing host configuration only; opt-in operation and screenshots. No login or API fallback.'});return true;}
   const w=route.match(/^workbench\/([a-f0-9-]{36})(?:\/(action|cancel|recover|export|checkpoint|image))?$/);
   if(w){const [,id,action]=w;
    if(!action&&method==='GET')send(res,200,await workbench.get(id));
    else if(action==='action'&&method==='POST')send(res,202,await workbench.action(id,await body(req)));
    else if(action==='cancel'&&method==='POST'){await body(req);send(res,200,await workbench.cancel(id));}
    else if(action==='recover'&&method==='POST'){await body(req);send(res,200,await workbench.recover(id));}
    else if(action==='checkpoint'&&method==='GET'){send(res,200,await workbench.read(id));}
    else if(action==='image'&&method==='POST'){const data=await body(req),r=await workbench.read(id);if(!r.task?.receipt?.captures.some(c=>c.file===data.file))throw new DeckError('WORKBENCH_IMAGE','Choose a current receipt image.',404);const file=path.join(workbench.directory(id),data.file);await rejectSymlinks(file);res.writeHead(200,{'Content-Type':'image/png'});res.end(await readFile(file));}
    else if(action==='export'&&method==='POST'){const data=await body(req),out=await workbench.export(id,data.lastValid===true);res.writeHead(200,{'Content-Type':out.mime,'Content-Disposition':'attachment; filename="deckweft-reviewed.html"'});res.end(out.body);}
    else throw new DeckError('METHOD_NOT_ALLOWED','Choose a documented workbench operation.',405);return true;
   }
   if(route==='asset-original'&&method==='POST'){
    const data=await body(req),p=assertVisualProject(data.project),asset=p.assets.find(a=>a.id===data.assetId);if(!asset)throw new DeckError('ASSET_SELECTION','Choose an image from this document.',422);let bytes,mime,extension;
    if(asset.original){bytes=await readImageBlob(store.home,asset.original);mime=asset.original.mime;extension=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[mime];}
    else{const resources=await assetResources({assets:[asset],slides:[{intent:{assetIds:[asset.id]}}]},store.home);if(!resources[asset.id])throw new DeckError('ASSET_MISSING','Restore the original PNG.',422);bytes=Buffer.from(resources[asset.id].dataURL.split(',')[1],'base64');mime='image/png';extension='png';}
    res.writeHead(200,{'Content-Type':mime,'Content-Disposition':`attachment; filename="deckweft-original.${extension}"`});res.end(bytes);return true;
   }
   if(route==='asset-inspection'&&method==='POST'){const data=await body(req),p=assertVisualProject(data.project),asset=p.assets.find(a=>a.id===data.assetId);if(!asset)throw new DeckError('ASSET_SELECTION','Choose an image from this document.',422);const r=await assetResources({assets:[asset],slides:[{intent:{assetIds:[asset.id]}}]},store.home);if(!r[asset.id])throw new DeckError('ASSET_MISSING','Restore the native source PNG.',422);send(res,200,{native:r[asset.id].dataURL,asset});return true;}
   if(route==='asset-capabilities'&&method==='GET'){send(res,200,imageCapabilities());return true;}
   if(route==='asset-upload'&&method==='POST'){
    const data=await body(req);if(typeof data.base64!=='string'||data.base64.length>1750000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64))throw new DeckError('ASSET_SIZE','Each local source/derivative upload must be smaller than 1.3 MB.',422);
    send(res,201,{blob:await uploadImageBlob(store.home,Buffer.from(data.base64,'base64'),data.mime)});return true;
   }
   if(route==='asset-import'&&method==='POST'){const data=await body(req);send(res,201,{asset:await registerVisualImport(store.home,data)});return true;}
   if(route==='image-slot'&&method==='POST'){
    const data=await body(req),project=assertVisualProject(data.project);
    if(data.action==='inspect')send(res,200,{...slotCandidates(project,data.sceneId,data.blockId),capabilities:imageCapabilities()});
    else if(data.action==='configure')send(res,200,{project:configureSlot(project,data.sceneId,data.blockId,data.slot)});
    else if(data.action==='crop')send(res,200,{project:applySlotCrop(project,data.sceneId,data.blockId,{mode:data.mode,aspect:data.aspect})});
    else if(['reuse','attach'].includes(data.action)){
     const asset=data.action==='reuse'?project.assets.find(a=>a.id===data.assetId):data.asset;if(!asset)throw new DeckError('ASSET_SELECTION','Choose a registered asset.',422);
     const next=data.blockId?attachSlotAsset(project,data.sceneId,data.blockId,asset):addSlotAsset(project,data.sceneId,asset);await visualAssetResources(next,store.home);send(res,200,{project:next});
    }else throw new DeckError('IMAGE_SLOT','Choose inspect, configure, crop, reuse or attach.',422);return true;
   }
   if(route==='asset-catalog'&&method==='POST'){
    await body(req);const entries=[];
    for(const [kind,library]of [['visual',store],['legacy',legacyStore]])for(const summary of (await library.list()).slice(0,100)){if(summary.unreadable||entries.length>=200)continue;const project=await library.get(summary.id);for(const asset of project.assets||[]){if(entries.length>=200)break;entries.push({kind,projectId:project.id,title:kind==='visual'?project.document.title:project.title,asset});}}
    send(res,200,{entries});return true;
   }
   if(route==='asset-extract'&&method==='POST'){
    const data=await body(req),base=assertVisualProject(data.project);if(!['visual','legacy'].includes(data.kind))throw new DeckError('ASSET_SOURCE','Choose a saved local visual or legacy document.',422);
    const library=data.kind==='visual'?store:legacyStore,source=await library.get(data.sourceProjectId),asset=source.assets?.find(a=>a.id===data.assetId);if(!asset)throw new DeckError('ASSET_SOURCE','That saved document does not contain this image.',422);
    // Refuse locks/metadata conflicts before copying any source bytes.
    const reference={kind:data.kind,projectId:source.id,revision:source.revision.number,projectHash:contentHash(source),assetId:asset.id};const project=data.blockId?attachSlotAsset(base,data.sceneId,data.blockId,asset,{sourceReference:reference}):addSlotAsset(base,data.sceneId,asset);if(!data.blockId)project.extensions.deckweftAssetSelections=[...(project.extensions.deckweftAssetSelections||[]).slice(-99),{sceneId:data.sceneId,assetId:asset.id,assetHash:asset.hash,sourceReference:reference}];
    await copySourceAsset(asset,library.home,store.home);await visualAssetResources(project,store.home);send(res,200,{project});return true;
   }
   if(route==='asset-alternative'&&method==='POST'){
    const data=await body(req),base=assertVisualProject(data.project),project=structuredClone(base),scene=project.plan.scenes.find(s=>s.id===data.sceneId);if(!scene)throw new DeckError('IMAGE_SLOT','Select a scene.',422);scene.composition='statement-banner';assertVisualLocks(base,project);send(res,200,{project:assertVisualProject(project),capabilities:imageCapabilities()});return true;
   }
   if(route==='themes'&&method==='GET'){send(res,200,{themes:themePacks()});return true;}
   if(route==='projects'&&method==='GET'){send(res,200,{projects:await store.list()});return true;}
   if(route==='interaction-demo'&&method==='POST'){const data=await body(req);send(res,201,{project:await store.save(await createInteractionDemo(data.locale,store.home),{create:true})});return true;}
   if(route==='component-demo'&&method==='POST'){const data=await body(req);send(res,201,{project:await store.save(await createComponentDemo(data.locale,store.home),{create:true})});return true;}
   if(route==='asset-demo'&&method==='POST'){const data=await body(req);send(res,201,{project:await store.save(await createAssetDemo(data.locale,store.home),{create:true})});return true;}
   if(route==='composition-demo'&&method==='POST'){const data=await body(req);send(res,201,{project:await store.save(await createCompositionDemo(data.locale,store.home),{create:true})});return true;}
   if(route==='demo'&&method==='POST'){const data=await body(req);send(res,201,{project:await store.save(await createVisualDemo(data.locale,store.home),{create:true})});return true;}
   if(route==='migrate'&&method==='POST'){const data=await body(req),original=await legacyStore.get(data.projectId),migrated=migrateToPresentation(original),project=createVisualProject(migrated.document,migrated.plan);send(res,201,{project:await store.save(project,{create:true}),warnings:migrated.warnings});return true;}
   if(route==='import'&&method==='POST'){
    const data=await body(req),original=assertVisualProject(data.project),copy=store.copyRecord(original,identifier('visual'),original.document.title);
    copy.extensions.deckweftImport={sourceId:original.id,sourceHash:contentHash(original)};
    send(res,201,{project:await store.save(copy,{create:true})});return true;
   }
   if(route==='projects'&&method==='POST'){const data=await body(req);send(res,201,{project:await store.save(assertVisualProject(data.project),{create:true})});return true;}
   const p=route.match(/^projects\/([A-Za-z0-9_-]+)(?:\/history(?:\/([1-9]\d*)(\/restore)?)?)?$/);
   if(p){const [,id,rev,restore]=p;
    if(route.includes('/history')){
     if(method==='GET'&&!rev)send(res,200,await store.historyPage(id));
     else if(method==='GET'&&!restore)send(res,200,await store.snapshot(id,Number(rev)));
     else if(method==='POST'&&restore){const data=await body(req);if(data.mode!=='copy')throw new DeckError('RESTORE_MODE','Restore an explicit separate copy.');send(res,201,await store.restoreAsCopy(id,Number(rev),data));}
     else throw new DeckError('METHOD_NOT_ALLOWED','Use a documented read-only history or restore-as-copy action.',405);
    }else if(method==='GET')send(res,200,{project:await store.get(id)});
    else if(method==='PUT'){const data=await body(req);if(data.project?.id!==id)throw new DeckError('ID_MISMATCH','The URL and visual project id must match.');const project=await store.save(data.project,{expectedRevision:data.expectedRevision});send(res,200,{project,historyUsage:await store.historyUsage(project.id)});}
    else throw new DeckError('METHOD_NOT_ALLOWED','Use GET or PUT for this project.',405);
    return true;
   }
   if(route==='move'&&method==='POST'){const data=await body(req);send(res,200,{project:moveScene(data.project,data.sceneId,data.offset)});return true;}
   if(route==='candidates'&&method==='POST'){
    const data=await body(req),base=assertVisualProject(data.project),projects=candidateProjects(base,data.families||{}),resources=await visualAssetResources(base,store.home),batch=randomBytes(16).toString('hex'),sets=[];
    for(const [index,project]of projects.entries()){
     const output=exportDeck(project.document,'html',{plan:project.plan,experimentalWeb:true,assetResources:resources}),ticket=randomBytes(24).toString('hex');
     while(artifacts.size>=8)artifacts.delete(artifacts.keys().next().value);
     artifacts.set(ticket,{createdAt:Date.now(),inputHash:contentHash(project),baseHash:contentHash(base),batch,index,project,output,fit:null,candidateFit:null});
     sets.push({index,ticket,renderHash:output.renderHash,artifactUrl:'/visual-artifacts/'+ticket,scenes:project.plan.scenes.map(s=>({sceneId:s.id,...describeCandidate(project.document,s)}))});
    }
    send(res,200,{families,sets});return true;
   }
   if(route==='candidate-measure'&&method==='POST'){
    const data=await body(req),a=entry(data.ticket),fit=data.fit;
    if(!a.batch||!fit||fit.renderHash!==a.output.renderHash||fit.viewport?.width!==1440||!Array.isArray(fit.checks)||fit.checks.length!==a.output.scenes.length||fit.checks.some((c,i)=>c.sceneId!==a.output.scenes[i].id||c.sourceHash!==a.output.scenes[i].sourceHash||!Number.isFinite(c.height)||!c.visualFeatures||!['density','imageRatio'].every(k=>Number.isFinite(c.visualFeatures[k])&&c.visualFeatures[k]>=0&&c.visualFeatures[k]<=1)||!['left','center','right'].some(f=>['top','middle','bottom'].some(y=>c.visualFeatures.focus===f+':'+y))||!['overflow','clipIssues','contrastIssues','text','fonts'].every(k=>Array.isArray(c[k]))||c.fonts.length!==a.output.scenes[i].regions.length||a.output.scenes[i].regions.filter(r=>r.component!=='chart').some(r=>!c.text.some(t=>t.regionId===r.id))||a.output.scenes[i].regions.some(r=>!c.fonts.some(f=>f.regionId===r.id))))throw new DeckError('CANDIDATE_MEASUREMENT','Measure these exact candidates at 1440px after fonts and images are ready.',422);
    a.candidateFit=fit.checks.map(c=>candidateFit(c,fit.viewport));send(res,200,{fits:a.candidateFit});return true;
   }
   if(['select-candidate','rhythm'].includes(route)&&method==='POST'){
    const data=await body(req),base=assertVisualProject(data.project);
    if(!Array.isArray(data.tickets)||data.tickets.length!==3||new Set(data.tickets).size!==3)throw new DeckError('CANDIDATE_MEASUREMENT','Supply all three measured candidate sets.',422);
    const sets=data.tickets.map(entry);
    if(sets.some((a,i)=>!a.candidateFit||a.baseHash!==contentHash(base)||a.batch!==sets[0].batch||a.index!==i))throw new DeckError('STALE_CANDIDATES','Content or page order changed. Compare again before selection.',409);
    if(route==='rhythm'){send(res,200,chooseRhythm(base,sets.map(a=>a.project),sets.map(a=>a.candidateFit)));return true;}
    if(!Number.isInteger(data.index)||data.index<0||data.index>2)throw new DeckError('CANDIDATE_SELECTION','Choose candidate 0, 1 or 2.',422);
    const i=base.plan.scenes.findIndex(s=>s.id===data.sceneId),a=sets[data.index];
    if(i<0||!a||!a.candidateFit[i].ok)throw new DeckError('NO_FEASIBLE_CANDIDATE','Choose a candidate that passes the browser layout checks.',422);
    const project=structuredClone(base);project.plan.scenes[i]=structuredClone(a.project.plan.scenes[i]);send(res,200,{project:assertVisualProject(project)});return true;
   }
   if(route==='theme'&&method==='POST'){const data=await body(req);send(res,200,{project:applySceneTheme(data.project,data.sceneId,data.theme)});return true;}
   if(route==='assets'&&method==='POST'){const data=await body(req);if(typeof data.base64!=='string'||data.base64.length>1750000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64))throw new DeckError('ASSET_SIZE','Choose a PNG smaller than 1.3 MB for browser import.',422);send(res,201,{asset:await registerAsset(store.home,Buffer.from(data.base64,'base64'),data.metadata)});return true;}
   if(route==='preview'&&method==='POST'){
    const data=await body(req),project=assertVisualProject(data.project),resources=await visualAssetResources(project,store.home),output=exportDeck(project.document,'html',{plan:project.plan,experimentalWeb:true,assetResources:resources});
    const ticket=randomBytes(24).toString('hex');while(artifacts.size>=8)artifacts.delete(artifacts.keys().next().value);
    artifacts.set(ticket,{createdAt:Date.now(),inputHash:contentHash(project),output,fit:null});send(res,200,{ticket,renderHash:output.renderHash,artifactUrl:'/visual-artifacts/'+ticket});return true;
   }
   if(route==='measure'&&method==='POST'){
    const data=await body(req),a=entry(data.ticket),fit=data.fit;
    const fails=(s,scene)=>!scene||s.sourceHash!==scene.sourceHash||!Array.isArray(s.contrastIssues)||s.contrastIssues.length||!Array.isArray(s.clipIssues)||s.clipIssues.length||!Array.isArray(s.overflow)||s.overflow.length||!Array.isArray(s.glyphs)||s.glyphs.length||!Array.isArray(s.fonts)||s.fonts.length!==scene.regions.length||new Set(s.fonts.map(f=>f.regionId)).size!==s.fonts.length||s.fonts.some(f=>f.loaded!==true||!scene.regions.some(r=>r.id===f.regionId)||!Number.isFinite(f.probeWidth)||f.probeWidth<=0)||!Array.isArray(s.text)||scene.regions.filter(r=>r.component!=='chart').some(r=>!s.text.some(t=>t.regionId===r.id&&t.inside===true))||s.text.some(t=>t.inside!==true);
    // The opening of every scene and each declared static state (what readers without JavaScript and the player open on) must pass.
    const expected=a.output.staticStates||[],scene=id=>a.output.scenes.find(v=>v.id===id);
    if(!fit||fit.renderHash!==a.output.renderHash||fit.ok!==true||!Array.isArray(fit.checks)||fit.checks.length!==a.output.scenes.length||fit.checks.some((s,i)=>fails(s,a.output.scenes[i]))||!Array.isArray(fit.states)||fit.states.length!==expected.length||fit.states.some((s,i)=>s.sceneId!==expected[i].sceneId||s.keyStateId!==expected[i].keyStateId||s.position!==expected[i].position||fails(s,scene(s.sceneId))))throw new DeckError('VISUAL_FIT','This browser-reported preview does not pass the current fit checks.',422);
    a.fit=fit;send(res,200,{measured:true,renderHash:a.output.renderHash,measurement:'browser-reported-dom'});return true;
   }
   // S9a default entry: three directions of the same content, rendered and measured like composition candidates.
   if(route==='directions'&&method==='POST'){
    const data=await body(req),answers=entryAnswers(data.answers),base=data.project?assertVisualProject(data.project):createVisualTask({request:answers.topic||fail422('Enter a topic or the text to arrange.'),locale:['en','zh-CN'].includes(data.locale)?data.locale:'en'}).project;
    const resources=await visualAssetResources(base,store.home),planned=planDirections(base,answers,resources),batch=randomBytes(16).toString('hex'),sets=[];
    for(const [index,d]of planned.directions.entries()){
     const output=exportDeck(d.project.document,'html',{plan:d.project.plan,experimentalWeb:true,assetResources:resources}),ticket=randomBytes(24).toString('hex');
     while(artifacts.size>=8)artifacts.delete(artifacts.keys().next().value);
     artifacts.set(ticket,{createdAt:Date.now(),inputHash:contentHash(d.project),baseHash:contentHash(base),batch,index,kind:'direction',project:d.project,output,fit:null,candidateFit:null});
     sets.push({index,ticket,renderHash:output.renderHash,artifactUrl:'/visual-artifacts/'+ticket,direction:d.direction,explanation:d.explanation,scenes:d.project.plan.scenes.map(s=>({sceneId:s.id,theme:s.theme,composition:s.composition}))});
    }
    send(res,200,{factsHash:planned.factsHash,differences:planned.differences,pagePlan:planPages(base,{detail:answers.detail}),base:data.project?null:base,sets});return true;
   }
   if(route==='select-direction'&&method==='POST'){
    const data=await body(req),base=assertVisualProject(data.project);
    if(!Array.isArray(data.tickets)||data.tickets.length!==3)throw new DeckError('CANDIDATE_MEASUREMENT','Supply all three measured directions.',422);
    const sets=data.tickets.map(entry),a=sets[data.index];
    if(!a||sets.some((v,i)=>v.kind!=='direction'||v.baseHash!==contentHash(base)||v.batch!==sets[0].batch||v.index!==i))throw new DeckError('STALE_CANDIDATES','Content changed. Show the three directions again.',409);
    if(!a.candidateFit)throw new DeckError('CANDIDATE_MEASUREMENT','Wait until this direction is measured at 1440 px.',409);
    // Pages over the 900 px candidate budget are reported, not blocked (alignment §17, answer 7); any other fit failure blocks.
    const hard=a.candidateFit.flatMap((f,i)=>f.reasons.filter(r=>!/presentation budget/.test(r)).map(reason=>({sceneId:a.project.plan.scenes[i].id,reason})));
    if(hard.length)throw new DeckError('NO_FEASIBLE_CANDIDATE','This direction does not fit every page. Choose another or edit the content.',422,hard);
    send(res,200,{project:a.project,overBudget:a.candidateFit.map((f,i)=>({sceneId:a.project.plan.scenes[i].id,height:Math.ceil(f.height)})).filter(f=>f.height>900)});return true;
   }
   if(route==='author-action'&&method==='POST'){
    const data=await body(req),options={...(data.options||{})};
    if(data.action==='apply-profile')options.profile=await profiles.get(options.profileId);
    send(res,200,planAuthorAction(data.project,{action:data.action,level:data.level,id:data.id,options}));return true;
   }
   if(route==='scope'&&method==='POST'){const data=await body(req),project=assertVisualProject(data.project),scope=resolveScope(project,{level:data.level,id:data.id});send(res,200,{scope,statement:describeScope(project,scope,{changes:Array.isArray(data.changes)?data.changes.filter(c=>typeof c==='string').slice(0,8):[]})});return true;}
   if(route==='page-plan'&&method==='POST'){const data=await body(req);send(res,200,planPages(assertVisualProject(data.project),{detail:data.detail,targetPages:data.targetPages,units:data.units}));return true;}
   if(route==='page-plan/apply'&&method==='POST'){const data=await body(req);send(res,200,applyPagePlan(data.project,data.plan,{split:data.split===true,mark:data.mark===true}));return true;}
   if(route==='profiles'&&method==='GET'){send(res,200,{profiles:await profiles.list()});return true;}
   if(route==='profiles'&&method==='POST'){
    const data=await body(req),project=assertVisualProject(data.project),saved=await store.get(project.id).catch(()=>null);
    if(!saved||contentHash({document:saved.document,plan:saved.plan})!==contentHash({document:project.document,plan:project.plan}))throw new DeckError('PROFILE_UNSAVED','Save the deck first: a profile records the saved design.',409);
    if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80)throw new DeckError('DESIGN_PROFILE','Name the profile (1–80 characters).',422);
    let acceptance;
    if(await reviewed(saved)){const r=await workbench.get(saved.extensions.deckweftWorkbench.id);acceptance={kind:'workbench-review',receiptId:String(r.receipt.id).slice(0,128),acceptedAt:new Date().toISOString()};}
    else if(data.attest===true)acceptance={kind:'author',acceptedAt:new Date().toISOString()};
    else throw new DeckError('PROFILE_NOT_ACCEPTED','Promote an accepted design: pass the image review, or confirm that you accept this design.',409);
    const {profile,skipped}=promoteProfile(saved,{id:identifier('profile').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64),name:data.name.trim(),acceptance});
    send(res,201,{profile:await profiles.save(profile),skipped});return true;
   }
   if(route==='profiles/import'&&method==='POST'){const data=await body(req),profile=assertDesignProfile(structuredClone(data.profile));const exists=await profiles.get(profile.id).then(()=>true,()=>false);if(exists)profile.id=identifier('profile').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64);send(res,201,{profile:await profiles.save(profile),copied:exists});return true;}
   {const m=route.match(/^profiles\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})$/);if(m&&method==='GET'){const profile=await profiles.get(m[1]);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${profile.id}.design-profile.json"`});res.end(JSON.stringify(profile,null,2)+'\n');return true;}}
   if(route==='export'&&method==='POST'){
    const data=await body(req),project=assertVisualProject(data.project);
    if(data.format==='json'){send(res,200,project);return true;}
    if(!['html','pptx','pdf'].includes(data.format))throw new DeckError('TARGET_CAPABILITY','Visual Studio exports HTML, PowerPoint, PDF and complete JSON.',422);
    // S9a: PowerPoint and PDF go through the S7 export order with the isolated capture browser; without one they are refused by name.
    if(data.format!=='html'&&!browserPath)throw new DeckError('TARGET_BROWSER_REQUIRED','PowerPoint and PDF need the isolated measuring browser: start the studio with --capture-browser /absolute/isolated/chromium.',422);
    // A page that asks for evidence is refused first: no review can make an unsupported claim final.
    assertEvidenceSupplied(project.plan);
    const saved=await store.get(project.id).catch(e=>{if(e.code==='NOT_FOUND')return null;throw e;});
    if(project.extensions.deckweftWorkbench||saved?.extensions.deckweftWorkbench){if(data.format==='html'||!await reviewed(project))throw new DeckError('WORKBENCH_REVIEW_REQUIRED','Export this task from its image-reviewed workbench.',409);}
    if(data.format!=='html'){
     if(!project.extensions.deckweftWorkbench){const a=entry(data.ticket);if(!a.fit||a.inputHash!==contentHash(project))throw new DeckError('STALE_VISUAL_RENDER','Wait for a measured preview of these exact edits before exporting.',409);}
     const file=await studioTargetExport({browserPath,project,resources:await visualAssetResources(project,store.home),format:data.format,paginate:data.paginate==='none'?'none':'auto'}),levels=Object.entries(file.report.levels.reduce((m,c)=>{const l=c[data.format]?.level;if(l)m[l]=(m[l]||0)+1;return m;},{})).map(([k,v])=>k+'='+v).join(',');
     res.writeHead(200,{'Content-Type':file.mime,'Content-Disposition':`attachment; filename="deckweft-visual.${file.extension}"`,'X-DeckWeft-Export-Order':file.report.order.map(o=>o.stage).join(','),'X-DeckWeft-Levels':levels,'X-DeckWeft-Receipts':String(file.report.receipts.length)});res.end(file.body);return true;
    }
    const a=entry(data.ticket);if(!a.fit||a.inputHash!==contentHash(project))throw new DeckError('STALE_VISUAL_RENDER','Wait for a measured preview of these exact edits before exporting.',409);
    res.writeHead(200,{'Content-Type':a.output.mime,'Content-Disposition':'attachment; filename="deckweft-visual.html"','X-DeckWeft-Render-Hash':a.output.renderHash});res.end(a.output.body);return true;
   }
   throw new DeckError('NOT_FOUND','This visual API route does not exist.',404);
  }
 };
}
