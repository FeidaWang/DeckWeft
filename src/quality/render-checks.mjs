import { contentHash } from '../scene/web/compile.mjs';

/** Bind receipts to source, renderer bytes, actual audience state and environment. */
export function qualityBasis(project, observation) {
 return contentHash({document:project.document,plan:project.plan,assets:project.assets,observation});
}
// Executed in the real page by the optional browser harness. No runtime dependencies.
export function inspectRenderedPage() {
 const box=n=>{const b=n.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};};
 const scenes=[...document.querySelectorAll('.web-scene')].map(s=>({sceneId:s.id,bounds:box(s),composition:[...s.classList].filter(c=>c!=='web-scene'&&c!=='active').join(' '),regions:[...s.querySelectorAll('.region')].map(n=>({nodeId:n.id,blockId:n.dataset.blockId,bounds:box(n),text:n.textContent,code:n.querySelector('.semantic-code code')?.textContent,links:[...n.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent})),images:[...n.querySelectorAll('img')].map(i=>({ready:i.complete&&i.naturalWidth>0,src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight}))})),...window.deckweftAuditScene(s)}));
 return {sourceLinks:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),documentOverflow:document.documentElement.scrollWidth>innerWidth+1,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},renderHash:document.body.dataset.renderHash,dom:document.querySelector('main').outerHTML,state:window.deckweftInteractions?.snapshot(),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),fontStatus:document.fonts.status,scenes,fit:window.deckweftFit};
}
const normalize=s=>String(s).replace(/\r\n?/g,'\n');
function expectedText(block,document) {
 if(block.type==='image')return [block.alt];
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
   for(const blockId of scene.blockIds){const b=project.document.blocks.find(b=>b.id===blockId),r=s.regions.find(r=>r.blockId===blockId);if(!r){add('coverage',s,{nodeId:null,blockId,bounds:null},'Missing block '+blockId,'Restore the stable region binding.');continue;}
    const missing=expectedText(b,project.document).filter(t=>!normalize(r.text).includes(normalize(t)));
    if(b.type==='code'&&normalize(r.code)!==normalize(b.text))missing.push('Exact code including whitespace');
    const sourceIds=[...new Set([...(b.sourceIds||[]),...(b.sourceId?[b.sourceId]:[]),...(b.datasetId?project.document.datasets.find(d=>d.id===b.datasetId)?.sourceIds||[]:[]),...(b.sourceAnchor?[b.sourceAnchor.sourceId]:[])])];
    const sources=sourceIds.map(id=>({id,present:!!project.document.sources.find(s=>s.id===id),rendered:o.sourceLinks?o.sourceLinks.includes(project.document.sources.find(s=>s.id===id)?.url):(o.dom||'').includes(project.document.sources.find(s=>s.id===id)?.url||'__missing_source__')}));
    coverage.push({viewport:o.viewport,sceneId:s.sceneId,nodeId:r.nodeId,blockId,missing,sources});
    if(missing.length)add('text-coverage',s,r,'Source text is absent from the rendered representation: '+missing.join(' | '),'Restore exact text/data; change only the affected layout.');
    if(sources.some(s=>!s.present||!s.rendered))add('source-coverage',s,r,'Source reference absent from document or output','Restore the original source anchor.');
    if(r.images.some(i=>!i.ready))add('missing-asset',s,r,'An image failed decoding or has no native pixels','Restore the original local asset; do not substitute a remote image.');
   }
   for(const [kind,list]of [['clipping',s.clipIssues],['contrast',s.contrastIssues]])for(const issue of list||[])add(kind,s,s.regions.find(r=>r.nodeId===issue.regionId),JSON.stringify(issue),kind==='contrast'?'Adjust the affected region/theme token contrast.':'Choose a feasible layout for this scene; retain all content.');
   const fit=o.fit?.checks?.find(c=>c.sceneId===s.sceneId);
   for(const t of fit?.text||[])if(!t.inside)add('clipping',s,s.regions.find(r=>r.nodeId===t.regionId),'Text lies outside the scene','Repair only the affected scene geometry.');
   for(const id of fit?.overflow||[])add('overflow',s,s.regions.find(r=>r.nodeId===id),'Region overflows its box','Change the affected layout or slot size.');
   for(const font of fit?.fonts||[])if(!font.loaded)add('font',s,s.regions.find(r=>r.nodeId===font.regionId),'Font not ready: '+font.family,'Install/select an available local font and recapture.');
  }
  if(o.viewport.width>700){let run=[];for(const s of o.scenes){run=run.at(-1)?.composition===s.composition?[...run,s]:[s];if(run.length===repetitionLimit+1)add('repeated-composition',s,null,`${run.length} adjacent scenes share ${s.composition}`,'Vary only an affected scene composition after measurement.');}}
 }
 if(requireInteractions)for(const s of project.plan.scenes)for(const i of s.interactions||[])if(!traces.some(t=>t.sceneId===s.id&&t.blockId===i.blockId))add('trace-coverage',observations[0]?.scenes.find(o=>o.sceneId===s.id),null,'No real action recorded for '+i.id,'Exercise this interaction and assert its semantic result.');
 for(const t of traces)if(!t.ok){const s=observations[0]?.scenes.find(s=>s.sceneId===t.sceneId);add('broken-interaction',s,s?.regions.find(r=>r.blockId===t.blockId),'Real action failed its semantic postcondition: '+t.action,'Restore the affected interaction binding/handler.');}
 for(const message of [...errors,...consoleEntries.filter(e=>e.type==='error').map(e=>e.text)])add('console',null,null,message,'Resolve the console/page error and rerun.');
 for(const url of externalRequests)add('external-request',null,null,url,'Remove the remote request and use explicit local resources.');
 const unique=[...new Map(issues.map(i=>[i.id,i])).values()];
 return {ok:!unique.some(i=>i.severity==='error'),issues:unique,coverage,traceCount:traces.length};
}
