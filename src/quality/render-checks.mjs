import { contentHash } from '../scene/web/compile.mjs';
import { visibleBlockIds } from '../design/plan.mjs';
import { mediaRoles, subjectFraction, subjectOf } from '../design/media.mjs';

/** Bind receipts to source, renderer bytes, actual audience state and environment. */
export function qualityBasis(project, observation) {
 return contentHash({document:project.document,plan:project.plan,assets:project.assets,observation});
}
// Executed in the real page by the optional browser harness. No runtime dependencies.
export function inspectRenderedPage() {
 const box=n=>{const b=n.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};};
 const scenes=[...document.querySelectorAll('.web-scene')].map(s=>({sceneId:s.id,bounds:box(s),composition:[...s.classList].filter(c=>c!=='web-scene'&&c!=='active').join(' '),regions:[...s.querySelectorAll('.region')].map(n=>({nodeId:n.id,blockId:n.dataset.blockId,bounds:box(n),text:n.textContent,code:n.querySelector('.semantic-code code')?.textContent,links:[...n.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent})),images:[...n.querySelectorAll('img')].map(i=>({ready:i.complete&&i.naturalWidth>0,src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight,alt:i.getAttribute('alt')}))})),disclosed:[...s.querySelectorAll('[data-disclosed-block-id]')].map(n=>({blockId:n.dataset.disclosedBlockId,text:n.textContent})),...window.deckweftAuditScene(s)}));
 return {sourceLinks:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),documentOverflow:document.documentElement.scrollWidth>innerWidth+1,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},renderHash:document.body.dataset.renderHash,dom:document.querySelector('main').outerHTML,state:window.deckweftInteractions?.snapshot(),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),fontStatus:document.fonts.status,scenes,fit:window.deckweftFit};
}
const normalize=s=>String(s).replace(/\r\n?/g,'\n');
/** CINE-005: an image's visible text is its slot's caption when one is authored; the alt is checked on the <img> itself. */
export const visibleCaption=(block,scene)=>scene?.imageSlots?.find(s=>s.blockId===block.id)?.brief.visibleCaption??block.alt;
function expectedText(block,document,scene) {
 if(block.type==='image')return [visibleCaption(block,scene)];
 if(block.type==='metric')return [new Intl.NumberFormat(document.locale,{maximumSignificantDigits:21}).format(block.value),block.unit,block.label];
 if(block.type==='table')return [...block.columns,...block.rows.flat()];
 if(block.type==='list')return block.items;
 if(block.type==='diagram')return [...block.nodes.map(n=>n.label),...block.edges.map(e=>e.label).filter(Boolean)];
 if(block.type==='chart'){const d=document.datasets.find(d=>d.id===block.datasetId);return [...d.categories,...d.series.flatMap(s=>[s.label,...s.values.filter(v=>v!==null).map(String),...(s.xValues||[]).filter(v=>v!==null).map(String)])];}
 return typeof block.text==='string'?[block.text]:[];
}
export function checkRender(project,observations,{traces=[],console:consoleEntries=[],errors=[],externalRequests=[],repetitionLimit=3,requireInteractions=false}={}) {
 const issues=[],coverage=[];
 function add(kind,scene,node,reason,suggestion,severity='error') {issues.push({id:contentHash({kind,sceneId:scene?.sceneId,nodeId:node?.nodeId,reason}).slice(0,24),kind,sceneId:scene?.sceneId||null,nodeId:node?.nodeId||scene?.sceneId||null,blockId:node?.blockId||null,bounds:node?.bounds||scene?.bounds||null,severity,reason,suggestion});}
 if(!observations.length)add('measurement',null,null,'No browser observations','Capture the actual page before evaluating quality.');
 for(const o of observations){
  if(!o.fit||o.fit?.viewport?.width!==o.viewport.width)add('measurement',null,null,'Missing or stale browser fit','Wait for current fonts and viewport measurement.');
  if(o.documentOverflow)add('viewport-overflow',null,null,'Document exceeds viewport width','Repair only the affected responsive layout.');
  if(o.fontStatus&&o.fontStatus!=='loaded')add('font',null,null,'Fonts are still loading','Wait for local font readiness and recapture.');
  for(const scene of project.plan.scenes){const s=o.scenes.find(s=>s.sceneId===scene.id);if(!s){add('coverage',{sceneId:scene.id,bounds:null},null,'Missing scene '+scene.id,'Restore the scene binding.');continue;}
   // S9a: a block behind the page disclosure is not a composition region; its exact text must be inside the disclosure instead.
   for(const blockId of scene.disclosure?.blockIds||[]){const b=project.document.blocks.find(b=>b.id===blockId),d=(s.disclosed||[]).find(d=>d.blockId===blockId),missing=d?expectedText(b,project.document).filter(t=>!normalize(d.text).includes(normalize(t))):['Disclosed block '+blockId];coverage.push({viewport:o.viewport,sceneId:s.sceneId,nodeId:null,blockId,missing,sources:[],disclosed:true});if(missing.length)add('text-coverage',s,{nodeId:null,blockId,bounds:null},'Disclosed text is absent from the page disclosure: '+missing.join(' | '),'Restore the exact text; nothing behind a disclosure may be dropped.');}
   for(const blockId of visibleBlockIds(scene)){const b=project.document.blocks.find(b=>b.id===blockId),r=s.regions.find(r=>r.blockId===blockId);if(!r){add('coverage',s,{nodeId:null,blockId,bounds:null},'Missing block '+blockId,'Restore the stable region binding.');continue;}
    const missing=expectedText(b,project.document,scene).filter(t=>!normalize(r.text).includes(normalize(t)));
    if(b.type==='image'&&r.images.some(i=>typeof i.alt==='string'&&i.alt!==b.alt))missing.push('Alt text changed: expected the block alt on <img>');
    if(b.type==='code'&&normalize(r.code)!==normalize(b.text))missing.push('Exact code including whitespace');
    const sourceIds=[...new Set([...(b.sourceIds||[]),...(b.sourceId?[b.sourceId]:[]),...(b.datasetId?project.document.datasets.find(d=>d.id===b.datasetId)?.sourceIds||[]:[]),...(b.sourceAnchor?[b.sourceAnchor.sourceId]:[])])];
    const sources=sourceIds.map(id=>({id,present:!!project.document.sources.find(s=>s.id===id),rendered:o.sourceLinks?o.sourceLinks.includes(project.document.sources.find(s=>s.id===id)?.url):(o.dom||'').includes(project.document.sources.find(s=>s.id===id)?.url||'__missing_source__')}));
    coverage.push({viewport:o.viewport,sceneId:s.sceneId,nodeId:r.nodeId,blockId,missing,sources});
    if(missing.length)add('text-coverage',s,r,'Source text is absent from the rendered representation: '+missing.join(' | '),'Restore exact text/data; change only the affected layout.');
    if(sources.some(s=>!s.present||!s.rendered))add('source-coverage',s,r,'Source reference absent from document or output','Restore the original source anchor.');
    if(r.images.some(i=>!i.ready))add('missing-asset',s,r,'An image failed decoding or has no native pixels','Restore the original local asset; do not substitute a remote image.');
   }
   for(const [kind,list]of [['clipping',s.clipIssues],['contrast',s.contrastIssues],['glyph',s.glyphIssues]])for(const issue of list||[])add(kind,s,s.regions.find(r=>r.nodeId===issue.regionId),JSON.stringify(issue),kind==='contrast'?'Adjust the affected region/theme token contrast.':kind==='glyph'?'No installed font draws this character; change the text or the theme font. Never export a box.':'Choose a feasible layout for this scene; retain all content.');
   const fit=o.fit?.checks?.find(c=>c.sceneId===s.sceneId);
   for(const t of fit?.text||[])if(!t.inside)add('clipping',s,s.regions.find(r=>r.nodeId===t.regionId),'Text lies outside the scene','Repair only the affected scene geometry.');
   for(const id of fit?.overflow||[])add('overflow',s,s.regions.find(r=>r.nodeId===id),'Region overflows its box','Change the affected layout or slot size.');
   for(const g of fit?.glyphs||[])add('glyph',s,s.regions.find(r=>r.nodeId===g.regionId),'Missing glyph: '+JSON.stringify(g.missing)+' in '+g.font,'No installed font draws this character; change the text or the theme font.');
   for(const font of fit?.fonts||[])if(!font.loaded)add('font',s,s.regions.find(r=>r.nodeId===font.regionId),'Font not ready: '+font.family,'Install/select an available local font and recapture.');
  }
  if(o.viewport.width>700){let run=[];for(const s of o.scenes){run=run.at(-1)?.composition===s.composition?[...run,s]:[s];if(run.length===repetitionLimit+1)add('repeated-composition',s,null,`${run.length} adjacent scenes share ${s.composition}`,'Vary only an affected scene composition after measurement.');}}
 }
 if(requireInteractions)for(const s of project.plan.scenes)for(const i of s.interactions||[])if(!traces.some(t=>t.sceneId===s.id&&t.blockId===i.blockId))add('trace-coverage',observations[0]?.scenes.find(o=>o.sceneId===s.id),null,'No real action recorded for '+i.id,'Exercise this interaction and assert its semantic result.');
 for(const t of traces)if(!t.ok){const s=observations[0]?.scenes.find(s=>s.sceneId===t.sceneId);add('broken-interaction',s,s?.regions.find(r=>r.blockId===t.blockId),'Real action failed its semantic postcondition: '+t.action,'Restore the affected interaction binding/handler.');}
 for(const message of [...errors,...consoleEntries.filter(e=>e.type==='error').map(e=>e.text)])add('console',null,null,message,'Resolve the console/page error and rerun.');
 for(const url of externalRequests)add('external-request',null,null,url,'Remove the remote request and use explicit local resources.');
 const unique=[...new Map(issues.map(i=>[i.id,i])).values()];
 // CINE-007: soft features per measured page (player .7) and the weakest page; advisory, never an issue.
 const features=observations.flatMap(o=>observedFeatures(project,o));
 return {ok:!unique.some(i=>i.severity==='error'),issues:unique,coverage,traceCount:traces.length,features,weakestPage:weakestPage(features)};
}

/**
 * CINE-007 soft features (docs/visual-acceptance/review.md, "Soft features"). Pure functions over the player .7 measurements of one
 * scene (regions with boxes and text-size ranges, image boxes, the strip height): named diagnostics with stated units and
 * exceptions, computed from bounding boxes. None of them is eye tracking, and none is a hard gate (candidateFit holds those).
 */
export const SOFT_FEATURES=Object.freeze({
 subjectArea:{definition:'The largest visible subject on the page as a fraction of the page: the authored subject inside its crop (annotated:true), else the image container itself.',unit:'fraction of the page',better:'higher',exceptions:'A context landscape or a chapter page may intend a small or absent subject; judge against the declared purpose.'},
 stripHeight:{definition:'How far the compact source strip exceeds its 48 px budget at presentation width.',unit:'px over budget',better:'lower',exceptions:'A source-is-subject page keeps its citations as regions and has no strip; narrow widths wrap the strip by design.'},
 groupingGapVariance:{definition:'The variance of the vertical gaps between consecutive regions in reading order (a gap below zero, from side-by-side regions, counts as 0).',unit:'px²',better:'lower',exceptions:'A deliberate pause (a chapter, a closing) can hold one large gap; two-column pages report their column breaks as zero gaps.'},
 alignmentAxes:{definition:'The number of distinct left edges the regions start on, rounded to 8 px.',unit:'count',better:'lower',exceptions:'Grids and small multiples legitimately use several axes; three or fewer is the starting point, not a rule.'},
 competingAccents:{definition:'Regions other than the focal block whose smallest text is at least as large as the focal block\'s largest text.',unit:'count',better:'lower',exceptions:'A metric page shows its number larger than its heading on purpose; a quote page sets the quotation above its paraphrase.'},
 titleFigureDistance:{definition:'The vertical distance from the bottom of the focal (title) region to the top of the first declared media region (or the first image), clamped at zero.',unit:'px',better:'lower',exceptions:'Side-by-side layouts report zero; a page without media reports null.'},
 entryClarity:{definition:'Whether the focal region\'s centre lies where the declared entry says the eye starts: the left 40 % for left, the middle fifth for center, anywhere for contextual.',unit:'boolean',better:'none',exceptions:'Null when the page declares no intent; an inferred entry is never scored.'}
});
/** Calibrated starting weights (they sum to one); a bounding-box proxy, calibrated on the batch 1 corpus, not a model of attention. */
export const SOFT_WEIGHTS=Object.freeze({subjectArea:.3,stripHeight:.1,groupingGapVariance:.1,alignmentAxes:.1,competingAccents:.15,titleFigureDistance:.1,entryClarity:.15});
const round=(v,p=1e6)=>Math.round(v*p)/p;
export function softFeatures(check,{pageWidth=1440,entry=null,focalBlockId=null,mediaBlockIds=[],subjects=[]}={}){
 const regions=check?.regions||[],images=check?.images||[],area=Math.max(1,pageWidth*(check?.height||1));
 const focal=regions.find(r=>r.blockId===focalBlockId)||regions[0]||null;
 // Subject area: the authored subject when the runner measured one, else the largest image container.
 const subject=[...subjects].sort((a,b)=>b.subjectFraction-a.subjectFraction)[0];
 const largest=[...images].sort((a,b)=>b.box.width*b.box.height-a.box.width*a.box.height)[0];
 const subjectArea=subject?{value:subject.subjectFraction,annotated:!!subject.annotated,blockId:subject.blockId,containerFraction:subject.containerFraction}:largest?{value:largest.box.width*largest.box.height/area,annotated:false,blockId:largest.blockId,containerFraction:largest.box.width*largest.box.height/area}:null;
 const stripHeight=check?.strip?{value:round(Math.max(0,check.strip.height-48),100),height:round(check.strip.height,100),budget:48,items:check.strip.items??null}:null;
 const gaps=regions.slice(1).map((r,i)=>round(Math.max(0,r.box.y-(regions[i].box.y+regions[i].box.height)),100));
 const mean=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:0,variance=gaps.length?gaps.reduce((a,g)=>a+(g-mean)**2,0)/gaps.length:0;
 const groupingGapVariance={value:round(variance,100),gaps};
 const axes=[...new Set(regions.map(r=>Math.round(r.box.x/8)*8))].sort((a,b)=>a-b);
 const alignmentAxes={value:axes.length,axes};
 const loud=focal&&Number.isFinite(focal.maxTextPx)?regions.filter(r=>r!==focal&&Number.isFinite(r.minTextPx)&&r.minTextPx>=focal.maxTextPx).map(r=>r.regionId):[];
 const competingAccents={value:loud.length,regionIds:loud};
 const figure=regions.find(r=>mediaBlockIds.includes(r.blockId))||(images[0]?regions.find(r=>r.regionId===images[0].regionId)||{regionId:images[0].regionId,box:images[0].box}:null);
 const titleFigureDistance=focal&&figure?{value:round(Math.max(0,figure.box.y-(focal.box.y+focal.box.height)),100),titleRegionId:focal.regionId,figureRegionId:figure.regionId}:null;
 let entryClarity=null;
 if(entry&&focal){const cx=(focal.box.x+focal.box.width/2)/pageWidth;entryClarity={value:entry==='left'?cx<.4:entry==='center'?cx>=.4&&cx<=.6:true,entry,focalCenterX:cx};}
 return {subjectArea,stripHeight,groupingGapVariance,alignmentAxes,competingAccents,titleFigureDistance,entryClarity};
}
/** One number per page from the weighted penalties (0 = no penalty, 1 = full); score = 1 − Σ weight × penalty. Null features cost nothing. */
export function softScore(features){
 const f=features||{},penalties={
  subjectArea:f.subjectArea?1-Math.min(1,f.subjectArea.value/.3):0,
  stripHeight:f.stripHeight?Math.min(1,f.stripHeight.value/48):0,
  groupingGapVariance:f.groupingGapVariance?Math.min(1,Math.sqrt(f.groupingGapVariance.value)/40):0,
  alignmentAxes:f.alignmentAxes?Math.min(1,Math.max(0,f.alignmentAxes.value-3)/4):0,
  competingAccents:f.competingAccents?Math.min(1,f.competingAccents.value/3):0,
  titleFigureDistance:f.titleFigureDistance?Math.min(1,f.titleFigureDistance.value/400):0,
  entryClarity:f.entryClarity&&f.entryClarity.value===false?1:0};
 const score=1-Object.entries(penalties).reduce((a,[k,v])=>a+SOFT_WEIGHTS[k]*v,0);
 return {score:round(score),penalties:Object.fromEntries(Object.entries(penalties).map(([k,v])=>[k,round(v)]))};
}
const REASONS={subjectArea:'small subject',stripHeight:'source strip over its budget',groupingGapVariance:'uneven grouping gaps',alignmentAxes:'many alignment axes',competingAccents:'competing accents',titleFigureDistance:'title far from its figure',entryClarity:'entry not where the intent says'};
/** The page with the lowest soft score, with the features that cost it most (penalty ≥ 0.5) named. Null without features. */
export function weakestPage(pages){
 const scored=(pages||[]).map(p=>({sceneId:p.sceneId,viewport:p.viewport??null,...softScore(p.features)}));
 if(!scored.length)return null;
 const w=[...scored].sort((a,b)=>a.score-b.score)[0];
 return {sceneId:w.sceneId,viewport:w.viewport,score:w.score,reasons:Object.entries(w.penalties).filter(([,v])=>v>=.5).map(([k])=>REASONS[k])};
}
/** The soft features of every scene whose fit check carries the player .7 fields, in one observation. */
function observedFeatures(project,o){
 const out=[];
 for(const scene of project.plan.scenes){
  const check=o.fit?.checks?.find(c=>c.sceneId===scene.id);if(!check||!Array.isArray(check.regions))continue;
  const pageWidth=o.viewport?.width||1440,media=[...mediaRoles(project.document,scene).keys()];
  const subjects=(check.images||[]).map(i=>({blockId:i.blockId,...subjectFraction({pageWidth,pageHeight:check.height,imageBox:i.box,subjectBounds:subjectOf(scene,i.blockId),crop:scene.crops?.find(c=>c.blockId===i.blockId)||null})}));
  const features=softFeatures(check,{pageWidth,entry:scene.intent?.entry??null,focalBlockId:scene.focalBlockId,mediaBlockIds:media,subjects});
  out.push({viewport:o.viewport,sceneId:scene.id,features,...softScore(features)});
 }
 return out;
}
