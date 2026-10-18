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
 * Dependencies are injectable for deterministic filesystem-failure tests.
 */
export async function renameWrittenFile(temporary,file,{platform=process.platform,renameFile=rename,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  for(let attempt=0;;attempt++){
    try{return await renameFile(temporary,file);}
    catch(error){
      if(platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=7)throw error;
      await wait(Math.min(10*2**attempt,100));
    }
  }
}
export async function atomicWrite(file,data){
  await rejectSymlinks(file);await mkdir(path.dirname(file),{recursive:true});
  const temporary=`${file}.tmp-${randomUUID()}`;
  try{
    const handle=await open(temporary,'wx',0o600);
    try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
    await renameWrittenFile(temporary,file);
  }finally{await rm(temporary,{force:true});}
}
export async function readJSON(file,maxBytes=4_000_000){
  const content=await readFile(file);
  if(content.length>maxBytes)throw new DeckError('FILE_SIZE','Use a JSON file smaller than 4 MB.',413);
  try{return JSON.parse(content.toString('utf8'));}catch{throw new DeckError('INVALID_JSON','This file is not valid JSON. Check for missing commas or brackets.',400);}
}
export const stringify=value=>JSON.stringify(value,null,2)+'\n';

/** Content addressed asset files are immutable; repeated uploads reuse identical bytes. */
export async function writeImmutable(file,bytes){await rejectSymlinks(file);try{const existing=await readFile(file);if(!existing.equals(bytes))throw new DeckError('ASSET_COLLISION','A content-addressed file differs. Restore it explicitly; original files are never overwritten.',409);return;}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(path.dirname(file),{recursive:true,mode:0o700});await atomicWrite(file,bytes);}
