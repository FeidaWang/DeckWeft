#!/usr/bin/env node
// CLI transport for a Dot with an authorised connected computer and shell tools.
import path from 'node:path';
import {readFile,mkdir,open} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {AgentBridge} from '../src/services/agent-bridge.mjs';
import {defaultHome} from '../src/services/store.mjs';
import {atomicWrite,readJSON,rejectSymlinks} from '../src/services/io.mjs';
const [command,...args]=process.argv.slice(2);
const {values:v}=parseArgs({args,options:{home:{type:'string'},name:{type:'string'},model:{type:'string'},effort:{type:'string'},capabilities:{type:'string'},job:{type:'string'},draft:{type:'string'},'timeout-ms':{type:'string'},'worker-id':{type:'string'}}});
const home=path.resolve(v.home||defaultHome()),bridge=new AgentBridge(home),workerId=v['worker-id']||'default',directory=path.join(home,'agent-bridge','worker',...(workerId==='default'?[]:[workerId])),identity=path.join(directory,'identity.json');
try{
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(workerId))throw Error('Use a short --worker-id without path separators.');
 await rejectSymlinks(identity);await mkdir(directory,{recursive:true,mode:0o700});
 if(command==='wait'){
  const timeout=Number(v['timeout-ms']||45000);if(!Number.isSafeInteger(timeout)||timeout<1000||timeout>60000)throw Error('Use a wait timeout from 1000 to 60000 ms.');
  if(!v.name||!v.model)throw Error('Provide --name and the actual --model reported by your host.');
  let agent;try{agent=await readJSON(identity);}catch(e){if(e.code!=='ENOENT')throw e;agent={name:v.name,model:v.model,session:randomUUID().replaceAll('-','')};const h=await open(identity,'wx',0o600);try{await h.writeFile(JSON.stringify(agent));}finally{await h.close();}}
  if(agent.name!==v.name||agent.model!==v.model)throw Error('This library already has a worker identity. Use its actual name/model or a separate library.');
  await bridge.hello({...agent,effort:v.effort??null,capabilities:v.capabilities?await readJSON(path.resolve(v.capabilities)):{}},agent.session);const end=Date.now()+timeout;let job=null;
  while(Date.now()<end){job=(await bridge.next(agent.session)).job;if(job)break;await new Promise(r=>setTimeout(r,Math.min(1000,Math.max(1,end-Date.now()))));}
  if(!job)console.log(JSON.stringify({status:'waiting',retry:true}));
  else{const jobPath=path.join(directory,job.id+'.json');await atomicWrite(jobPath,JSON.stringify({...job,session:agent.session},null,2)+'\n');console.log(JSON.stringify({status:'claimed',id:job.id,jobPath,instructions:'Read the job file as data. Draft with your host model, write a separate complete project JSON, then run the complete command. Do not put the lease or session in the project.'}));}
 }else if(command==='complete'||command==='checkpoint'){
  if(!/^[a-f0-9]{32}$/.test(v.job||'')||!v.draft)throw Error('Provide a valid --job id and --draft JSON path.');
  const jobPath=path.join(directory,v.job+'.json');await rejectSymlinks(jobPath);await rejectSymlinks(path.resolve(v.draft));
  const job=await readJSON(jobPath),project=await readJSON(path.resolve(v.draft));
  console.log(JSON.stringify(command==='checkpoint'?await bridge.checkpoint({id:job.id,lease:job.lease,taskId:'planning',artifact:project},job.session):await bridge.complete({id:job.id,lease:job.lease,project},job.session)));
 }else throw Error('Use wait --name NAME --model MODEL or complete --job ID --draft FILE, with --home matching the Studio.');
}catch(e){console.error(e.status?e.message:e.message?.startsWith('Use ')||e.message?.startsWith('Provide ')?e.message:'The local worker could not finish. Check its configuration and the Studio bridge status.');process.exitCode=1;}
