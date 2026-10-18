import path from 'node:path';
import os from 'node:os';
import { mkdir,readdir,readFile,open,rm,lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assertProject } from '../core/validate.mjs';
import { DeckError } from '../core/errors.mjs';
import { atomicWrite,rejectSymlinks,stringify,readJSON } from './io.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function revisionNumber(value){if(!Number.isSafeInteger(value)||value<1||value>1_000_000_000)throw new DeckError('REVISION_RANGE','Choose a positive saved revision number.',400);return value;}
export const defaultHome=()=>path.resolve(process.env.DECKWEFT_HOME||path.join(os.homedir(),'.deckweft'));
export class ProjectStore {
  constructor(home=defaultHome()){this.home=path.resolve(home);this.directory=path.join(this.home,'projects');}
  validateRecord(value){return assertProject(value);}
  describeRecord(p){return {id:p.id,title:p.title,locale:p.locale,slides:p.slides.length,revision:p.revision.number,updatedAt:p.revision.updatedAt};}
  copyRecord(p,id,title){const copy=structuredClone(p);copy.id=id;copy.title=title;copy.revision.number=0;return copy;}
  async init(){await rejectSymlinks(this.directory);await mkdir(this.directory,{recursive:true,mode:0o700});return this;}
  file(id){
    if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id))throw new DeckError('UNSAFE_ID','Project ids may contain letters, numbers, hyphens, and underscores only.',400);
    return path.join(this.directory,`${id}.json`);
  }
  async get(id){
    const file=this.file(id);await rejectSymlinks(file);
    try{const project=this.validateRecord(await readJSON(file));if(project.id!==id)throw new DeckError('ID_MISMATCH','The stored deck id does not match its filename. Repair the file rather than overwriting it.',409);return project;}catch(e){if(e.code==='ENOENT')throw new DeckError('NOT_FOUND','This deck is not in the local library.',404);throw e;}
  }
  async list(){
    await this.init();const result=[];
    for(const name of (await readdir(this.directory)).filter(n=>n.endsWith('.json'))){
      const id=name.slice(0,-5);
      try{const p=await this.get(id);result.push(this.describeRecord(p));}
      catch(e){result.push({id,title:name,unreadable:true,error:e.code||'READ_FAILED'});}
    }
    return result.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  }
  async save(input,{expectedRevision,create=false}={}){
    this.validateRecord(input);await this.init();const file=this.file(input.id),lock=`${file}.lock`;
    await rejectSymlinks(lock);
    let handle;
    try{handle=await open(lock,'wx',0o600);await handle.writeFile(stringify({pid:process.pid,createdAt:new Date().toISOString()}));}
    catch(e){if(e.code==='EEXIST')throw new DeckError('STORE_BUSY','This deck is being saved elsewhere. Try again. After a crash, see the lock-file recovery guide.',423);throw e;}
    try{
      let current=null;
      try{current=await this.get(input.id);}catch(e){if(e.code!=='NOT_FOUND')throw e;}
      if(create&&current)throw new DeckError('ALREADY_EXISTS','A deck already uses this id. Import it as a new copy.',409);
      if(!create&&!current)throw new DeckError('NOT_FOUND','Create this deck before saving changes.',404);
      if(!create&&!Number.isInteger(expectedRevision))throw new DeckError('REVISION_REQUIRED','Send the revision number you last opened.',428);
      if(current&&current.revision.number!==expectedRevision)throw new DeckError('REVISION_CONFLICT','A newer copy was saved in another window. Keep your edits and reload, or save a separate copy.',409,[{currentRevision:current.revision.number}]);
      const next=structuredClone(input),now=new Date().toISOString();
      next.revision={number:(current?.revision.number||0)+1,createdAt:current?.revision.createdAt||now,updatedAt:now};
      this.validateRecord(next);
      if(current)await this.writeSnapshot(current);
      await atomicWrite(file,stringify(next));return next;
    }finally{await handle.close();await rm(lock,{force:true});}
  }
  snapshotFile(id,revision){this.file(id);revisionNumber(revision);return path.join(this.home,'history',id,`${revision}.json`);}
  async writeSnapshot(project){
    const file=this.snapshotFile(project.id,project.revision.number),data=stringify(project);
    await rejectSymlinks(file);await mkdir(path.dirname(file),{recursive:true});
    let handle;
    try{handle=await open(file,'wx',0o600);}catch(error){
      if(error.code!=='EEXIST')throw error;
      if(hash(await readFile(file))!==hash(data))throw new DeckError('HISTORY_CONFLICT','An existing snapshot differs from this revision. No file was overwritten. See the recovery guide.',409);
      return;
    }
    try{await handle.writeFile(data);await handle.sync();}catch(error){await handle.close();handle=null;await rm(file,{force:true});throw error;}finally{if(handle)await handle.close();}
  }
  async history(id){
    const current=await this.get(id),dir=path.join(this.home,'history',id);await rejectSymlinks(dir);
    try{return (await readdir(dir)).filter(f=>/^[1-9]\d*\.json$/.test(f)).map(f=>Number(f.slice(0,-5))).filter(n=>Number.isSafeInteger(n)&&n<current.revision.number&&n<=1_000_000_000).sort((a,b)=>b-a);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  }
  async snapshot(id,revision){
    const file=this.snapshotFile(id,revision),current=await this.get(id);
    if(revision>=current.revision.number)throw new DeckError('SNAPSHOT_NOT_FOUND','Choose an earlier saved revision.',404);
    await rejectSymlinks(file);let bytes;
    try{const stat=await lstat(file);if(!stat.isFile()||stat.size>4_000_000)throw new DeckError('SNAPSHOT_SIZE','This snapshot is not a supported project file.',413);bytes=await readFile(file);}catch(error){if(error.code==='ENOENT')throw new DeckError('SNAPSHOT_NOT_FOUND','This snapshot no longer exists.',404);throw error;}
    let project;try{project=JSON.parse(bytes.toString('utf8'));}catch{throw new DeckError('INVALID_JSON','This snapshot needs repair. No files were changed.',422);}
    this.validateRecord(project);
    if(project.id!==id||project.revision.number!==revision)throw new DeckError('SNAPSHOT_MISMATCH','The snapshot contents do not match its project and revision.',409);
    return {project,sha256:hash(bytes),bytes:bytes.length,currentRevision:current.revision.number};
  }
  async historyPage(id,{before,limit=20}={}){
    if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw new DeckError('PAGE_LIMIT','Use a history page size from 1 to 50.');
    if(before!==undefined)revisionNumber(before);
    const current=await this.get(id),all=await this.history(id),eligible=all.filter(n=>before===undefined||n<before),numbers=eligible.slice(0,limit),snapshots=[];
    for(const revision of numbers){
      try{const item=await this.snapshot(id,revision);snapshots.push({revision,title:this.describeRecord(item.project).title,savedAt:item.project.revision.updatedAt,slides:this.describeRecord(item.project).slides,bytes:item.bytes,sha256:item.sha256,unreadable:false});}
      catch(error){snapshots.push({revision,unreadable:true,error:error.code||'READ_FAILED'});}
    }
    return {projectId:id,currentRevision:current.revision.number,revisions:numbers,snapshots,nextBefore:eligible.length>limit?numbers.at(-1):null,retention:'Nothing is pruned automatically.'};
  }
  async restoreAsCopy(id,revision,{snapshotHash,requestId,title}={}){
    revisionNumber(revision);
    if(typeof snapshotHash!=='string'||!/^([a-f0-9]{64})$/.test(snapshotHash))throw new DeckError('SNAPSHOT_HASH_REQUIRED','Open the snapshot preview before restoring.',428);
    if(typeof requestId!=='string'||!/[A-Za-z0-9_-]{16,80}/.test(requestId)||!/^[-A-Za-z0-9_]+$/.test(requestId)||requestId.length>80)throw new DeckError('REQUEST_ID','Use a unique restore request id (16–80 letters, numbers, hyphens or underscores).');
    if(title!==undefined&&(typeof title!=='string'||!title.trim()||[...title].length>200))throw new DeckError('RESTORE_TITLE','Choose a copy title of 1–200 characters.');
    const snapshot=await this.snapshot(id,revision);
    if(snapshot.sha256!==snapshotHash)throw new DeckError('SNAPSHOT_CHANGED','The snapshot changed since you opened it. Refresh before restoring.',409);
    const newId='deck_restore_'+hash(`${id}:${revision}:${requestId}`).slice(0,24);
    const chosenTitle=title||[...`${this.describeRecord(snapshot.project).title} (restored r${revision})`].slice(0,200).join('');
    let existing;try{existing=await this.get(newId);}catch(error){if(error.code!=='NOT_FOUND')throw error;}
    if(existing){const proof=existing.extensions.deckweftRecovery;if(proof?.sourceHash!==snapshotHash||proof?.requestedTitle!==chosenTitle||proof?.requestId!==requestId)throw new DeckError('RESTORE_REQUEST_CONFLICT','This restore request was already used with different choices.',409);return {project:existing,replayed:true,sourceProjectId:id,sourceRevision:revision};}
    const copy=this.copyRecord(snapshot.project,newId,chosenTitle);
    copy.extensions.deckweftRecovery={sourceProjectId:id,sourceRevision:revision,sourceHash:snapshotHash,requestId,requestedTitle:chosenTitle,restoredAt:new Date().toISOString()};
    return {project:await this.save(copy,{create:true}),replayed:false,sourceProjectId:id,sourceRevision:revision};
  }
}
