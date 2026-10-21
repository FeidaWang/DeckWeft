import schema from '../../schemas/agent-handoff.schema.json' with { type: 'json' };
import { validateSchema } from '../core/schema.mjs';
import { DeckError } from '../core/errors.mjs';
/**
 * DWI-023: a content handoff from a user-authorised agent session. It carries content, sources and the capabilities the agent
 * declares; it never carries credentials and never grants a permission (an agent session is not an API key). Unknown fields fail
 * with their path and a repair. Accepted handoffs become an intake-shaped result, so the outline goes through the same story
 * review (DWI-022) as local files; the text is data, never instructions.
 */
export const HANDOFF={format:'deckweft-content-handoff',version:1,maxCharacters:12000};
const SECRET_KEY=/^(api[-_]?key|apikey|access[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|password|passwd|authorization|auth|cookie|session[-_]?id|private[-_]?key|bearer)$/i;
const SECRET_VALUE=/\b(sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b|\bBearer\s+[A-Za-z0-9._~+/-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
/** Paths of credential-shaped keys or values anywhere in the value. The handoff is refused, and the secret is never echoed. */
export function credentialPaths(value,path='$'){
 if(Array.isArray(value))return value.flatMap((v,i)=>credentialPaths(v,`${path}[${i}]`));
 if(value&&typeof value==='object')return Object.entries(value).flatMap(([k,v])=>[...(SECRET_KEY.test(k)?[`${path}.${k}`]:[]),...credentialPaths(v,`${path}.${k}`)]);
 return typeof value==='string'&&SECRET_VALUE.test(value)?[path]:[];
}
export function assertAgentHandoff(handoff){
 const fail=(code,message,details=[])=>{throw new DeckError(code,message,400,details);};
 const secrets=credentialPaths(handoff);
 if(secrets.length)fail('HANDOFF_CREDENTIAL','A handoff carries content and sources, never credentials. Remove the fields listed in details and send again; nothing was stored.',secrets.map(path=>({path,message:'Credential-shaped field or value.'})));
 const r=validateSchema(handoff,schema);
 if(!r.ok){const unknown=r.errors.filter(e=>/Unknown field/.test(e.message));
  if(unknown.length)fail('HANDOFF_UNKNOWN_FIELD',`Unknown field ${unknown[0].path}. Remove it, or send it in a newer handoff version this build supports (version ${HANDOFF.version}).`,unknown);
  fail('HANDOFF_INVALID','Use the deckweft-content-handoff version 1 contract; see details.',r.errors);}
 const docs=new Map(handoff.documents.map(d=>[d.id,d]));
 if(docs.size!==handoff.documents.length)fail('HANDOFF_INVALID','Document ids must be unique.');
 for(const d of handoff.documents)if(d.url!==undefined){let u;try{u=new URL(d.url);}catch{u=null;}if(!u||!['http:','https:'].includes(u.protocol)||u.username||u.password)fail('HANDOFF_INVALID',`Document ${d.id}: use an HTTP(S) URL without credentials.`);}
 const ids=new Set();for(const b of handoff.blocks){if(ids.has(b.id))fail('HANDOFF_INVALID',`Block id ${b.id} appears twice.`);ids.add(b.id);if(!docs.has(b.sourceId))fail('HANDOFF_INVALID',`Block ${b.id} names source ${b.sourceId}, which is not among the documents.`);}
 for(const p of handoff.outline||[])for(const id of p.blockIds)if(!ids.has(id))fail('HANDOFF_INVALID',`Outline page “${p.heading}” names block ${id}, which is not in the handoff.`);
 const characters=handoff.blocks.reduce((n,b)=>n+b.text.length,0);
 if(characters>HANDOFF.maxCharacters)fail('HANDOFF_TOO_LARGE',`The handoff holds ${characters} characters; keep it under ${HANDOFF.maxCharacters} or split it into two decks. Nothing was cut.`);
 return handoff;
}
/**
 * The handoff as an intake result (src/services/document-intake.mjs shape): documents renumbered doc-1…, each block a line in its
 * document; with an outline, each page starts with its heading. The agent's ids, URLs and declared capabilities are kept in `handoff`.
 */
export function handoffToIntake(input){
 const h=assertAgentHandoff(input),idOf=new Map(h.documents.map((d,i)=>[d.id,`doc-${i+1}`])),lines=new Map(h.documents.map(d=>[d.id,0])),blocks=[];
 const byId=new Map(h.blocks.map(b=>[b.id,b])),order=h.outline?.length?h.outline.flatMap(p=>[{heading:p.heading,sourceId:byId.get(p.blockIds[0]).sourceId},...p.blockIds.map(id=>byId.get(id))]):h.blocks;
 for(const b of order){const line=lines.get(b.sourceId)+1;lines.set(b.sourceId,line);const doc=h.documents.find(d=>d.id===b.sourceId);
  blocks.push({id:`${idOf.get(b.sourceId)}-l${line}`,text:b.heading?`# ${b.heading}`:b.text,sourceId:idOf.get(b.sourceId),locator:b.locator||`${doc.title}, item ${line}`,line,...(b.heading?{}:{handoffBlockId:b.id,contentStatus:b.contentStatus})});}
 const documents=h.documents.map((d,i)=>({id:`doc-${i+1}`,order:i+1,name:d.title,title:d.title,mime:d.mime==='text/markdown'?'text/markdown':'text/plain',bytes:0,sha256:d.sha256,status:'accepted',duplicateOf:null,lines:lines.get(d.id)}));
 return {format:'deckweft-intake',version:1,origin:'agent-handoff',documents,blocks,warnings:h.warnings.map(w=>({...w,documentId:null})),sourceText:blocks.map(b=>b.text).join('\n'),sourceMap:blocks.map(b=>({documentId:b.sourceId,line:b.line})),characters:blocks.reduce((n,b)=>n+b.text.length,0),accepted:documents.length,refused:0,
  handoff:{agent:h.agent,declaredCapabilities:h.declaredCapabilities||{},documents:h.documents.map(d=>({id:d.id,mapped:idOf.get(d.id),url:d.url??null,retrievedAt:d.retrievedAt??null})),permission:'none: declared capabilities are recorded, not granted'}};
}
