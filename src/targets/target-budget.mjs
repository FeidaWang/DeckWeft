/**
 * CINE-001 (2026-10-20): the declared presentation target. One contract names the frame, the safe area, the grid, the hard
 * typography minima (unchanged from F1) and the typography targets (reported, not enforced), and how overflow is resolved:
 * reflow first, then a stated split; never a shrunk scene. Every target reads from here: the web candidate gate
 * (`candidateHeight`), the PowerPoint pager and the PDF pager (`targetFit`), and the typography report in the evidence.
 * Pixel-to-point arithmetic: a 1440 px scene fitted to the 13.333 in slide is 960 pt wide (1 px = 2/3 pt); the PDF page is
 * 1440 × 810 CSS px (1 px = 3/4 pt).
 */
import {TYPOGRAPHY_MINIMUM_PT,TYPOGRAPHY_TARGET_PT} from './capabilities.mjs';
import {sceneBands,bandLayout,sceneElements} from './pptx/paginate.mjs';
import {SLIDE} from './pptx/ooxml.mjs';
const EMU_PER_PT=12700;
export const PT_PER_PX=Object.freeze({pptx:960/1440,pdf:.75});
export const TARGETS=Object.freeze({
 presentation:Object.freeze({frame:Object.freeze({width:1440,height:810}),safeArea:Object.freeze({x:64,y:56}),grid:Object.freeze({columns:12,gutter:32}),candidateHeight:900,
  typography:Object.freeze({minimum:TYPOGRAPHY_MINIMUM_PT,target:TYPOGRAPHY_TARGET_PT}),overflow:'reflow-then-split'}),
 reading:Object.freeze({frame:Object.freeze({width:1440,height:null}),overflow:'flow'})
});
/** The frame and unit each paged format cuts bands in: PowerPoint in EMU, PDF in CSS px of its page. */
export const TARGET_FRAMES=Object.freeze({pptx:{frame:SLIDE,unitsPerPt:EMU_PER_PT},pdf:{frame:TARGETS.presentation.frame,unitsPerPt:4/3}});
const LABEL_KINDS=new Set(['diagram-text','diagram-number','plot-text']),LABEL_BLOCKS=new Set(['chart','diagram','table']),REFERENCE_BLOCKS=new Set(['citation','image']);
/** The typography role of one measured text by its block type and element kind: title, body, label or reference. */
export function typographyRole(blockType,kind,{title=false}={}){
 if(title)return 'title';
 if(LABEL_KINDS.has(kind)||LABEL_BLOCKS.has(blockType))return 'label';
 if(REFERENCE_BLOCKS.has(blockType)||kind==='chrome-text'||!blockType)return 'reference';
 return 'body';
}
/** The role the hard minima are declared for: label and reference text are annotations there. */
export const minimumRole=role=>role==='title'?'title':role==='body'?'body':'annotation';
/**
 * Delivered point sizes per text element against the hard minima and the reported targets. `scale` is the page-px → page-px fit
 * of the scene or band; `ptPerPx` the format's points per unscaled page px. One entry per block and role, at its smallest size.
 */
export function typographyReport(elements,blocks,{titleBlockId=null,ptPerPx,scale=1,target=TYPOGRAPHY_TARGET_PT,minimum=TYPOGRAPHY_MINIMUM_PT}={}){
 const smallest=new Map();
 for(const e of elements){
  if(!(e.fontSize>0))continue;
  const type=e.chrome?null:blocks.get(e.blockId)?.type||null,role=typographyRole(type,e.kind,{title:!!e.blockId&&e.blockId===titleBlockId&&type==='heading'});
  const pt=e.fontSize*ptPerPx*scale,key=`${e.blockId||'chrome'}|${role}`,prev=smallest.get(key);
  if(!prev||pt<prev.pt)smallest.set(key,{blockId:e.blockId||null,role,pt:Math.round(pt*100)/100});
 }
 const rows=[...smallest.values()];
 const failures=rows.filter(r=>r.pt+1e-9<minimum[minimumRole(r.role)]).map(r=>({...r,minimum:minimum[minimumRole(r.role)]}));
 const below=rows.filter(r=>r.pt+1e-9<target[r.role]).map(r=>({...r,target:target[r.role]}));
 return {minimum:{status:failures.length?'fail':'pass',failures},target:{status:below.length?'below':'met',below}};
}
/**
 * How a measured scene fits the paged target: `fits` (one page at the whole-scene scale), `paged` (bands at a scale that keeps
 * the minima), `trimmed` (one band without trailing empty space) or `width-bound` (too small even at the width fit, left whole
 * and reported). The typography report is given at the whole-scene scale, or per band when paged.
 */
export function targetFit(m,blocks,{format='pptx',titleBlockId=null,strip=0,target=TARGETS.presentation}={}){
 const {frame,unitsPerPt}=TARGET_FRAMES[format],ptPerPx=PT_PER_PX[format],unitsPerPx=unitsPerPt*ptPerPx,b=m.bounds;
 const pxScale=bounds=>Math.min(frame.width/bounds.width,frame.height/bounds.height)/unitsPerPx;
 const paged=sceneBands(m,blocks,{titleBlockId,strip,minimums:target.typography.minimum,frame,unitsPerPt});
 const scale=Math.round(pxScale(b)*10000)/10000;
 const report=(els,s,extra)=>({...extra,scale:Math.round(s*10000)/10000,...typographyReport(els,blocks,{titleBlockId,ptPerPx,scale:s,target:target.typography.target,minimum:target.typography.minimum})});
 if(!paged.bands)return {status:paged.reason,bands:null,scale,typography:[report(sceneElements(m),pxScale(b),{part:1,parts:1,overHeight:false})]};
 // A band taller than the budget holds one element taken whole (a chart or image no cut may cross); it is reported, never cut.
 const typography=paged.bands.map((band,part)=>{const layout=bandLayout(m,band,{strip:part?strip:0,first:part===0});return report(sceneElements(layout),pxScale(layout.bounds),{part:part+1,parts:paged.bands.length,overHeight:band.height>paged.budget+0.5});});
 return {status:paged.reason,bands:paged.bands,scale,budget:paged.budget,typography};
}
