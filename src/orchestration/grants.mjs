import {randomUUID,createHash} from 'node:crypto';
import {DeckError} from '../core/errors.mjs';
const fail=message=>{throw new DeckError('GRANT_SCOPE',message,422);};
export function negotiateCapabilities(value={}){
 const booleans=['modelSelection','effortSelection','cancel','usage','events'];
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Capabilities must be an object.');
 for(const k of Object.keys(value))if(![...booleans,'models','conversationOperations'].includes(k))fail('Unknown host capability.');
 for(const k of booleans)if(value[k]!==undefined&&typeof value[k]!=='boolean')fail('Capability switches must be booleans.');
 if(value.conversationOperations!==undefined&&!Array.isArray(value.conversationOperations))fail('Conversation operations must be an empty array.');
 const models=value.models??[];if(!Array.isArray(models)||models.length>20)fail('Declare at most 20 actual host models.');
 for(const m of models)if(!m||Object.keys(m).some(k=>!['id','efforts'].includes(k))||typeof m?.id!=='string'||!m.id||m.id.length>80||!Array.isArray(m.efforts)||m.efforts.some(e=>!['low','medium','high','xhigh','max','ultra'].includes(e)))fail('Invalid host model/effort capability.');
 if(value.conversationOperations?.length)fail('This adapter has no conversation access. No chat operation can be granted.');
 return {...Object.fromEntries(booleans.map(k=>[k,value[k]===true])),models:structuredClone(models),conversationOperations:[],workerLimit:2};
}
export function createGrant(project,host,policy={},now=Date.now()){
 if(!policy||typeof policy!=='object'||Array.isArray(policy))fail('Grant policy must be an object.');
 const {kind='deck-generation',model='any',effort='medium',required=false,maxMinutes=10,workspacePaths=[],commands=[]}=policy;
 if(Object.keys(policy).some(k=>!['kind','model','effort','required','maxMinutes','workspacePaths','commands'].includes(k)))fail('Unknown grant policy field.');
 if(!['deck-generation','code-change'].includes(kind))fail('Choose a separate deck-generation or code-change grant.');
 if(!['any','gpt-6-astra'].includes(model)||!['medium','high'].includes(effort)||typeof required!=='boolean'||!Number.isInteger(maxMinutes)||maxMinutes<1||maxMinutes>30)fail('Choose a valid model policy and a 1–30 minute budget.');
 if(!Array.isArray(workspacePaths)||!Array.isArray(commands)||workspacePaths.length>20||commands.length>3)fail('Invalid workspace/command scope.');
 if(kind==='deck-generation'&&(workspacePaths.length||commands.length))fail('Deck generation has no repository or command permission.');
 if(kind==='code-change'&&(!workspacePaths.length||workspacePaths.some(p=>typeof p!=='string'||!/^src\/[A-Za-z0-9_/-]+\.mjs$/.test(p)||p.includes('..'))||commands.some(c=>c!=='npm run verify')))fail('Code changes need exact src/*.mjs paths and only the declared verification command.');
 return {id:randomUUID().replaceAll('-',''),kind,projectId:project.id,hostName:host.name,hostIdentityHash:createHash('sha256').update(host.session).digest('hex'),chatIds:[],conversationOperations:[],workspacePaths:[...new Set(workspacePaths)],operations:kind==='deck-generation'?['draft-selected-project','submit-proposal']:['propose-scoped-patch'],commands,network:false,tools:[],modelPolicy:{model,effort,ceiling:effort,required},maxJobs:1,maxMinutes,concurrency:1,createdAt:now,expiresAt:now+maxMinutes*60000,revokedAt:null};
}
export function modelBlock(grant,host){
 const p=grant.modelPolicy,c=host.capabilities;
 const ranks=['low','medium','high','xhigh','max','ultra'];if(host.effort&&ranks.indexOf(host.effort)>ranks.indexOf(p.ceiling))return 'Host-reported effort exceeds this grant ceiling. Select an authorized effort or create a revised request.';
 if(!p.required)return null;
 if(!c.modelSelection||!c.effortSelection||!c.models.some(m=>m.id===p.model&&m.efforts.includes(p.effort)))return 'Required model/effort cannot be selected by this host. Select an authorized capable host or create a revised request.';
 return null;
}
/** The one acceptance check for every completion and tool route: the capability block above, then, under a required policy, the host-reported model/effort must equal the policy. Host reports are not server attestation. */
export function assertModelPolicy(grant,host){
 const blocked=modelBlock(grant,host);if(blocked)return blocked;
 const p=grant.modelPolicy;if(p.required&&(host.model!==p.model||host.effort!==p.effort))return 'Host report does not match required model/effort.';
 return null;
}
export function assertGrant(grant,now){if(grant.revokedAt!==null)throw new DeckError('GRANT_REVOKED','This grant was revoked. Late results are refused.',409);if(grant.expiresAt<=now)throw new DeckError('AGENT_EXPIRED','This grant expired. Review retained checkpoints and create a new authorized request.',409);}
