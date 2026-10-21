import {DeckError} from '../core/errors.mjs';
import {planStory} from '../agent/director.mjs';
import {applyDirection,directionThemes,entryAnswers} from '../workbench/directions.mjs';
import {assertVisualProject} from '../core/visual-project.mjs';
import {claimLedger,assertClaimLedger,markEvidenceRequired} from './claims.mjs';
/**
 * DWI-022: the story is reviewed before any page is composed. From an intake result the local, deterministic planner proposes a
 * concise outline (a page per document section or Markdown heading), with each point's document and line, its claims and any
 * contradiction. The author states audience and outcome, may rename or drop pages and points, and picks one of at most three
 * directions. Approval builds a new deck; the deck that was open is never overwritten (the store keeps it, and the caller saves the
 * new deck under a new id). No model is called: an outline supplied by an agent goes through the same review as a handoff (DWI-023).
 */
export const STORY_REVIEW={format:'deckweft-story-review',version:1};
export const STORY_DIRECTIONS=Object.freeze(['first','second','third']);
const MAX_POINTS=6,MAX_HEADING=120;
const strip=t=>t.replace(/^\s*(?:[-*+]|\d+[.)])\s+/,'').replace(/^#+\s*/,'').trim();
/** A proposed outline from intake: one page per document section; a Markdown heading starts a new page. */
export function proposeStoryReview(intake,{audience='',outcome='',locale='en'}={}){
 if(intake?.format!=='deckweft-intake')throw new DeckError('STORY_INPUT','Review a story built from added material.',400);
 if(!intake.accepted)throw new DeckError('STORY_EMPTY','Add at least one readable text or Markdown file first.',422);
 if(!['en','zh-CN'].includes(locale))throw new DeckError('STORY_LOCALE','Use en or zh-CN.',400);
 const ledger=claimLedger(intake),claimsByLine=new Map(ledger.claims.map(c=>[`${c.documentId}:${c.line}`,c])),contradicted=new Set(ledger.contradictions.flatMap(x=>x.claims.map(c=>c.claimId)));
 const pages=[];let page=null,doc=null;
 for(const b of intake.blocks){
  const heading=/^#{1,6}\s/.test(b.text);
  if(!page||b.sourceId!==doc||heading){page={id:`page-${pages.length+1}`,heading:strip(b.text).slice(0,MAX_HEADING),headingFrom:{documentId:b.sourceId,line:b.line},headingClaimId:claimsByLine.get(`${b.sourceId}:${b.line}`)?.id??null,points:[]};pages.push(page);doc=b.sourceId;
   // A section without a Markdown heading takes its first line as heading; the line keeps its locator in headingFrom.
   if(page.heading)continue;}
  const claim=claimsByLine.get(`${b.sourceId}:${b.line}`);
  page.points.push({text:strip(b.text),documentId:b.sourceId,line:b.line,locator:b.locator,claimId:claim?.id??null,contradicted:!!claim&&contradicted.has(claim.id)});
 }
 for(const p of pages){p.long=p.points.length>MAX_POINTS;const claimIds=[p.headingClaimId,...p.points.map(x=>x.claimId)].filter(Boolean);p.status=claimIds.some(id=>contradicted.has(id))?'contradiction':claimIds.length?'evidence-required':'from-material';}
 // The three directions in the order the content suggests (directions.mjs), named before anything is composed.
 const directions=directionThemes(planStory(reviewOutline({pages}),{locale}),entryAnswers({style:'auto'})).map((d,index)=>({index,group:d.group,theme:d.theme}));
 // Refused files are listed with their recovery, so nothing the author added disappears from the review.
 const refused=intake.documents.filter(d=>d.status==='refused').map(d=>({documentId:d.id,name:d.name,refusal:d.refusal,recovery:intake.warnings.find(w=>w.documentId===d.id&&w.code===d.refusal)?.recovery??''}));
 return {...STORY_REVIEW,state:'outline-review',locale,refused,audience:String(audience).slice(0,1000),outcome:String(outcome).slice(0,500),pages,ledger,directions,sourceHash:ledger.documents.map(d=>d.sha256).join(':')};
}
/** The outline as the local planner reads it: pages separated by ---, the first line of each page its heading. */
export const reviewOutline=review=>review.pages.filter(p=>!p.dropped).map(p=>[p.heading,...p.points.filter(x=>!x.dropped).map(x=>x.text)].join('\n')).join('\n---\n');
/**
 * Author edits: rename a page, drop a page or a point, set audience and outcome. Text of a kept point is never rewritten here:
 * changing material belongs to the source, so the point keeps its locator.
 */
export function editStoryReview(review,{audience,outcome,pages=[]}={}){
 const next=structuredClone(review);if(next.state!=='outline-review')throw new DeckError('STORY_STATE','This outline was already approved.',409);
 if(audience!==undefined)next.audience=String(audience).slice(0,1000);if(outcome!==undefined)next.outcome=String(outcome).slice(0,500);
 for(const e of pages){const p=next.pages.find(p=>p.id===e.id);if(!p)throw new DeckError('STORY_PAGE',`No page ${e.id} in this outline.`,422);
  if(e.heading!==undefined){const h=String(e.heading).trim();if(!h)throw new DeckError('STORY_PAGE','A page heading cannot be empty.',422);p.heading=h.slice(0,MAX_HEADING);}
  if(e.dropped!==undefined)p.dropped=!!e.dropped;
  for(const i of e.dropPoints||[]){if(!p.points[i])throw new DeckError('STORY_PAGE',`Page ${e.id} has no point ${i}.`,422);p.points[i].dropped=true;}}
 if(!next.pages.some(p=>!p.dropped))throw new DeckError('STORY_PAGE','Keep at least one page.',422);
 return next;
}
/**
 * Approve: a new visual deck from the reviewed outline. Pages with claims are marked evidence-required (local files are not URL
 * sources); the ledger and the reviewed outline travel in project.extensions.deckweftIntake. `direction` is 0, 1 or 2.
 */
export function approveStoryReview(review,{direction=0,previous=null}={}){
 if(review?.format!==STORY_REVIEW.format||review.version!==STORY_REVIEW.version)throw new DeckError('STORY_INPUT','Approve a deckweft-story-review.',400);
 if(review.state!=='outline-review')throw new DeckError('STORY_STATE','This outline was already approved.',409);
 if(!Number.isInteger(direction)||direction<0||direction>=STORY_DIRECTIONS.length)throw new DeckError('STORY_DIRECTION','Choose direction 1, 2 or 3.',422);
 assertClaimLedger(review.ledger);
 const before=previous?JSON.stringify(previous):null;
 let project=planStory(reviewOutline(review),{locale:review.locale});
 project.document.visualBrief={...project.document.visualBrief,audience:review.audience,outputLanguage:review.locale,profile:project.document.visualBrief?.profile||{colorIntensity:'restrained',typographicContrast:'balanced',density:'comfortable',motionIntensity:'off',imageEmphasis:'large'}};
 project=markEvidenceRequired(project).project;
 project=applyDirection(project,{audience:review.audience,style:'auto'},direction).project;
 project.extensions={...project.extensions,deckweftIntake:{ledger:review.ledger,outline:review.pages,audience:review.audience,outcome:review.outcome,direction,approvedFrom:review.sourceHash}};
 if(previous&&JSON.stringify(previous)!==before)throw Error('The previous deck changed during approval.');
 return {project:assertVisualProject(project),previousKept:!!previous,review:{...review,state:'approved'}};
}
