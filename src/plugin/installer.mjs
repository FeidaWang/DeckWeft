import path from 'node:path';
import os from 'node:os';
import { mkdir,readFile,writeFile,rename,rm,lstat } from 'node:fs/promises';
import { randomUUID,createHash } from 'node:crypto';
import { ROOT,copyRuntime,filesIn } from './packager.mjs';
import { VERSION } from '../core/model.mjs';
import { DeckError } from '../core/errors.mjs';
import { rejectSymlinks,stringify } from '../services/io.mjs';
const RECEIPT='.deckweft-receipt.json';
export function installPlan({target='both',scope='project',projectDir=process.cwd(),home=os.homedir()}={}){
  if(!['both','codex','claude'].includes(target))throw new DeckError('TARGET','Choose codex, claude, or both.');
  if(!['project','user'].includes(scope))throw new DeckError('SCOPE','Choose project or user.');
  const base=path.resolve(scope==='user'?home:projectDir);
  const destinations=[];
  if(target!=='claude')destinations.push({host:'codex',destination:path.join(base,'.agents/skills/deckweft')});
  if(target!=='codex')destinations.push({host:'claude',destination:path.join(base,'.claude/skills/deckweft')});
  return {mode:'standalone-skill',target,scope,destinations,note:'Installs portable local skills. It does not enable native marketplace plugins or change host permissions.'};
}
async function exists(file){try{await lstat(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export async function directoryHash(directory){
  const hash=createHash('sha256');
  for(const [name,bytes]of await filesIn(directory))if(name!==RECEIPT)hash.update(name+'\0').update(bytes).update('\0');
  return hash.digest('hex');
}
async function owned(directory){
  let receipt;try{receipt=JSON.parse(await readFile(path.join(directory,RECEIPT),'utf8'));}catch{throw new DeckError('UNOWNED_INSTALL','This folder is not a verified DeckWeft installation. Move it aside yourself instead of overwriting it.',409);}
  if(receipt.application!=='deckweft'||receipt.kind!=='standalone-skill')throw new DeckError('UNOWNED_INSTALL','This folder belongs to something else.',409);
  return receipt;
}
export async function install(options={}){
  const plan=installPlan(options);
  for(const item of plan.destinations)await rejectSymlinks(item.destination);
  if(options.dryRun)return {...plan,dryRun:true};
  // Preflight every target before changing any of them.
  for(const item of plan.destinations)if(await exists(item.destination)){
    await owned(item.destination);
    if(!options.replace)throw new DeckError('INSTALL_EXISTS','Already installed. Use --replace to update; a backup will be kept.',409);
  }
  const changed=[];
  try{
    for(const item of plan.destinations){
      const suffix=randomUUID(),stage=`${item.destination}.incoming-${suffix}`,backup=`${item.destination}.backup-${suffix}`;
      await mkdir(path.dirname(item.destination),{recursive:true});
      const record={...item,stage,backup:null,installed:false};changed.push(record);
      await mkdir(stage);await copyRuntime(path.join(stage,'runtime'));
      const skill=(await readFile(path.join(ROOT,'skills/deck/SKILL.md'),'utf8')).replace('name: deck\n','name: deckweft\n').replaceAll('../../runtime/','runtime/').replaceAll('references/format.md','runtime/skills/deck/references/format.md');
      await writeFile(path.join(stage,'SKILL.md'),skill);
      await writeFile(path.join(stage,RECEIPT),stringify({application:'deckweft',kind:'standalone-skill',version:VERSION,hash:await directoryHash(stage),installedAt:new Date().toISOString()}));
      if(await exists(item.destination)){await rename(item.destination,backup);record.backup=backup;}
      await rename(stage,item.destination);record.installed=true;
    }
  }catch(error){
    for(const item of changed.reverse()){
      if(item.installed)await rm(item.destination,{recursive:true,force:true});
      if(item.backup)await rename(item.backup,item.destination);
      await rm(item.stage,{recursive:true,force:true});
    }
    throw error;
  }
  return {...plan,installed:changed.map(({host,destination,backup})=>({host,destination,backup})),hostVerification:'not run'};
}
export async function uninstall(options={}){
  const plan=installPlan(options),present=[];
  for(const item of plan.destinations){
    await rejectSymlinks(item.destination);if(!await exists(item.destination))continue;
    const receipt=await owned(item.destination);
    if(receipt.hash!==await directoryHash(item.destination))throw new DeckError('MODIFIED_INSTALL','Your installed skill contains changes. Move or back it up yourself; DeckWeft will not delete it.',409);
    present.push(item);
  }
  if(!options.dryRun)for(const item of present)await rm(item.destination,{recursive:true});
  return {...plan,removed:present,dryRun:!!options.dryRun};
}
