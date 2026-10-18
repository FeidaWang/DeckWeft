import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {atomicWrite,rejectSymlinks} from '../services/io.mjs';
import {hash} from '../planning/storyboard.mjs';
import {DeckError} from '../core/errors.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
/** Only named source inputs enter each isolated copy. No .env, accounts, other jobs or chats. */
export async function isolateCodeJob(home,job){
 const directory=path.resolve(home,'agent-bridge','isolated',job.id,'attempt-'+job.attempt);
 await rejectSymlinks(directory);await mkdir(directory,{recursive:true,mode:0o700});
 for(const name of job.grant.workspacePaths){
  const original=path.join(root,name);await rejectSymlinks(original);const content=await readFile(original,'utf8');
  if(hash(content)!==job.capsule.sourceHashes[name])throw new DeckError('PATCH_STALE','Source changed before isolation. Create a request against the new baseline.',409);
  await atomicWrite(path.join(directory,name),content);
 }
 await atomicWrite(path.join(directory,'AGENTS.md'),job.capsule.rules+'\n\nThis is an isolated proposal copy. Edit only granted paths. Return replacements; do not write to the source workspace.\n');
 await atomicWrite(path.join(directory,'capsule.json'),JSON.stringify(job.capsule,null,2)+'\n');
 return directory;
}
