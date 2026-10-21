import {visibleBlockIds} from '../design/plan.mjs';
/**
 * DWI-021: claim records for material taken in by document-intake.mjs. A claim is a source line that states a number; it keeps
 * its document, line and the values as written. Two claims that say the same thing with different numbers form an unresolved
 * contradiction that lists each value with its attribution; nothing is averaged, chosen or merged. The ledger is data about the
 * material: no text in it is followed as an instruction. Local documents have no HTTP(S) URL, so they are never written into
 * `document.sources`; a page whose factual claims have no source is marked evidence-required instead (an existing field).
 */
export const CLAIM_LEDGER={format:'deckweft-claim-ledger',version:1};
const NUMBER=/[-+−]?\d+(?:[.,]\d+)*(?:\s?(?:%|percent|per cent|pts?|min(?:utes?)?|hours?|h|days?|weeks?|months?|years?|kg|g|km|m|cm|mm|ms|s|x|×|倍|分钟|小时|天|周|月|年|万|亿|元|美元|个|页|次|人))?/giu;
const LIST_MARK=/^\s*(?:[-*+]|\d+[.)])\s+/;
/** The values a line states, as written. A list marker ("1.") and a heading marker are not values. */
export function claimValues(text){
 const body=text.replace(LIST_MARK,'').replace(/^#+\s*/,'');
 return [...body.matchAll(NUMBER)].map(m=>{const raw=m[0].trim(),number=Number(raw.replace(/−/g,'-').match(/[-+]?\d+(?:[.,]\d+)*/)[0].replace(/,(?=\d{3}\b)/g,'').replace(',','.'));const unit=raw.replace(/^[-+−]?\d+(?:[.,]\d+)*\s?/,'')||null;return {raw,value:number,unit};}).filter(v=>Number.isFinite(v.value));
}
/** What a claim is about, with its numbers removed: the key that pairs two statements of the same thing. */
export const claimSubject=text=>text.replace(LIST_MARK,'').replace(/^#+\s*/,'').replace(NUMBER,'#').toLowerCase().replace(/[^\p{L}\p{N}#]+/gu,' ').trim();
/** Claims and unresolved contradictions from an intake result. Deterministic; the same intake gives the same ledger. */
export function claimLedger(intake){
 if(intake?.format!=='deckweft-intake')throw Object.assign(Error('Build claims from a deckweft-intake result.'),{code:'CLAIMS_INPUT'});
 const docs=new Map(intake.documents.map(d=>[d.id,d]));
 const claims=intake.blocks.map(b=>({b,values:claimValues(b.text)})).filter(x=>x.values.length).map(({b,values})=>({id:`claim-${b.sourceId}-l${b.line}`,text:b.text,documentId:b.sourceId,line:b.line,locator:b.locator,values,subject:claimSubject(b.text),status:'source-linked'}));
 const groups=new Map();for(const c of claims){if(!groups.has(c.subject))groups.set(c.subject,[]);groups.get(c.subject).push(c);}
 const key=c=>JSON.stringify(c.values.map(v=>[v.value,v.unit]));
 const contradictions=[...groups.values()].filter(g=>new Set(g.map(key)).size>1).map((g,i)=>({id:`conflict-${i+1}`,subject:g[0].subject,status:'unresolved',claims:g.map(c=>({claimId:c.id,documentId:c.documentId,document:docs.get(c.documentId)?.name??null,locator:c.locator,values:c.values.map(v=>v.raw)}))}));
 for(const x of contradictions)for(const c of x.claims)claims.find(v=>v.id===c.claimId).status='contradicted';
 return {...CLAIM_LEDGER,documents:intake.documents.map(({id,order,name,mime,bytes,sha256,status,duplicateOf,refusal})=>({id,order,name,mime,bytes,sha256,status,duplicateOf,...(refusal?{refusal}:{})})),claims,contradictions};
}
/** Strict shape check for a stored ledger (project.extensions.deckweftIntake): unknown fields are refused with the field named. */
export function assertClaimLedger(ledger){
 const fail=m=>{throw Object.assign(Error(m),{code:'CLAIM_LEDGER',status:400});};
 const only=(o,keys,where)=>{if(!o||typeof o!=='object'||Array.isArray(o))fail(`${where} must be an object.`);for(const k of Object.keys(o))if(!keys.includes(k))fail(`Unknown field “${k}” in ${where}; remove it or use a newer ledger version.`);};
 only(ledger,['format','version','documents','claims','contradictions'],'the claim ledger');
 if(ledger.format!==CLAIM_LEDGER.format||ledger.version!==CLAIM_LEDGER.version)fail(`Use ${CLAIM_LEDGER.format} version ${CLAIM_LEDGER.version}.`);
 const ids=new Set();for(const d of ledger.documents){only(d,['id','order','name','mime','bytes','sha256','status','duplicateOf','refusal'],'a ledger document');if(!/^doc-\d+$/.test(d.id)||!/^[a-f0-9]{64}$/.test(d.sha256))fail('A ledger document needs doc-N and a SHA-256.');ids.add(d.id);}
 const claimIds=new Set();for(const c of ledger.claims){only(c,['id','text','documentId','line','locator','values','subject','status'],'a claim');if(!ids.has(c.documentId)||!Number.isInteger(c.line)||c.line<1)fail(`Claim ${c.id} must name a ledger document and a line.`);if(!['source-linked','contradicted'].includes(c.status))fail(`Claim ${c.id} has an unknown status.`);claimIds.add(c.id);}
 for(const x of ledger.contradictions){only(x,['id','subject','status','claims'],'a contradiction');if(x.status!=='unresolved'&&x.status!=='resolved-by-author')fail('A contradiction is unresolved or resolved-by-author.');if(x.claims.length<2||x.claims.some(c=>!claimIds.has(c.claimId)))fail(`Contradiction ${x.id} must list at least two ledger claims.`);}
 return ledger;
}
const factual=b=>['heading','paragraph','quote','callout','list','metric','table'].includes(b.type)&&/\d/.test(b.type==='list'?b.items.join(' '):b.type==='table'?b.rows.flat().join(' '):b.type==='metric'?String(b.value??''):b.text??'');
/** v3: blocks on a page that state a number with no source while the page claims to be sourced (contentStatus absent or sourced). */
export function unsourcedClaims(document,plan){
 const blocks=new Map(document.blocks.map(b=>[b.id,b]));
 return plan.scenes.flatMap(s=>['evidence-required','illustrative'].includes(s.contentStatus)?[]:visibleBlockIds(s).map(id=>blocks.get(id)).filter(b=>factual(b)&&!b.sourceIds.length).map(b=>({code:'CLAIM_UNSOURCED',sceneId:s.id,blockId:b.id})));
}
/** Marks each such page evidence-required, explicitly and visibly; pages already sourced, illustrative or marked stay as they are. */
export function markEvidenceRequired(project){
 const copy=structuredClone(project),pages=new Set(unsourcedClaims(copy.document,copy.plan).map(i=>i.sceneId));
 for(const s of copy.plan.scenes)if(pages.has(s.id))s.contentStatus='evidence-required';
 return {project:copy,marked:[...pages]};
}
