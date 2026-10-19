import path from 'node:path';
import { lstat,mkdir,open,readFile,rename,rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { DeckError } from '../core/errors.mjs';
export async function rejectSymlinks(target) {
  const full=path.resolve(target),parts=full.slice(path.parse(full).root.length).split(path.sep);
  let current=path.parse(full).root;
  for(const part of parts){current=path.join(current,part);try{if((await lstat(current)).isSymbolicLink())throw new DeckError('SYMLINK_PATH','Choose a real folder, not a symbolic link.',403);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
/** Windows can briefly deny replacement while another process holds the destination.
 * Retry the same atomic rename only; never delete the destination or change permissions.
 * Replacement is bounded to 50 attempts / 5 seconds.
 * Dependencies are injectable for deterministic filesystem-failure tests.
 */
export async function renameWrittenFile(temporary,file,{platform=process.platform,renameFile=rename,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  const deadline=Date.now()+5000;
  for(let attempt=0;;attempt++){
    try{return await renameFile(temporary,file);}
    catch(error){
      if(platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=49||Date.now()>=deadline)throw error;
      // Stagger retries so periodic checkpoint readers cannot keep the same phase.
      const backoff=Math.min(10*2**Math.min(attempt,4),100)+(attempt*17%29);
      await wait(Math.min(backoff,Math.max(0,deadline-Date.now())));
    }
  }
}
/** Windows refuses to replace a file that any handle in this process still has open, however briefly.
 * Reads and replacements of the same path in this process therefore take turns (first come, first served);
 * the bounded retry above still covers handles held by other processes, such as a scanner.
 */
const fileTurns=new Map();
async function inTurn(file,work){
  const key=path.resolve(file),previous=fileTurns.get(key)||Promise.resolve();
  let release;const mine=new Promise(resolve=>{release=resolve;}),tail=previous.then(()=>mine);
  fileTurns.set(key,tail);
  await previous;
  try{return await work();}finally{release();if(fileTurns.get(key)===tail)fileTurns.delete(key);}
}
export async function atomicWrite(file,data){
  await rejectSymlinks(file);await mkdir(path.dirname(file),{recursive:true});
  const temporary=`${file}.tmp-${randomUUID()}`;
  try{
    const handle=await open(temporary,'wx',0o600);
    try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
    await inTurn(file,()=>renameWrittenFile(temporary,file));
  }finally{await rm(temporary,{force:true});}
}
export async function readJSON(file,maxBytes=4_000_000){
  const content=await inTurn(file,()=>readFile(file));
  if(content.length>maxBytes)throw new DeckError('FILE_SIZE','Use a JSON file smaller than 4 MB.',413);
  try{return JSON.parse(content.toString('utf8'));}catch{throw new DeckError('INVALID_JSON','This file is not valid JSON. Check for missing commas or brackets.',400);}
}
export const stringify=value=>JSON.stringify(value,null,2)+'\n';

/** Content addressed asset files are immutable; repeated uploads reuse identical bytes. */
export async function writeImmutable(file,bytes){await rejectSymlinks(file);try{const existing=await readFile(file);if(!existing.equals(bytes))throw new DeckError('ASSET_COLLISION','A content-addressed file differs. Restore it explicitly; original files are never overwritten.',409);return;}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(path.dirname(file),{recursive:true,mode:0o700});await atomicWrite(file,bytes);}
