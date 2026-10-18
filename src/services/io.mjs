import path from 'node:path';
import { lstat,mkdir,open,readFile,rename,rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { DeckError } from '../core/errors.mjs';
export async function rejectSymlinks(target) {
  const full=path.resolve(target),parts=full.slice(path.parse(full).root.length).split(path.sep);
  let current=path.parse(full).root;
  for(const part of parts){current=path.join(current,part);try{if((await lstat(current)).isSymbolicLink())throw new DeckError('SYMLINK_PATH','Choose a real folder, not a symbolic link.',403);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
export async function atomicWrite(file,data){
  await rejectSymlinks(file);await mkdir(path.dirname(file),{recursive:true});
  const temporary=`${file}.tmp-${randomUUID()}`;
  try{
    const handle=await open(temporary,'wx',0o600);
    try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
    await rename(temporary,file);
  }finally{await rm(temporary,{force:true});}
}
export async function readJSON(file,maxBytes=4_000_000){
  const content=await readFile(file);
  if(content.length>maxBytes)throw new DeckError('FILE_SIZE','Use a JSON file smaller than 4 MB.',413);
  try{return JSON.parse(content.toString('utf8'));}catch{throw new DeckError('INVALID_JSON','This file is not valid JSON. Check for missing commas or brackets.',400);}
}
export const stringify=value=>JSON.stringify(value,null,2)+'\n';
