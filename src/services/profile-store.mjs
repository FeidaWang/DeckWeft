import path from 'node:path';
import {mkdir,readdir} from 'node:fs/promises';
import {atomicWrite,readJSON,rejectSymlinks,stringify} from './io.mjs';
import {assertDesignProfile} from '../design/design-profile.mjs';
import {DeckError} from '../core/errors.mjs';
/** S9a: named design profiles live beside the visual projects, one validated JSON file each. Local only; nothing is uploaded. */
export class DesignProfileStore {
 constructor(visualHome){this.directory=path.join(path.resolve(visualHome),'profiles');}
 async init(){await rejectSymlinks(this.directory);await mkdir(this.directory,{recursive:true,mode:0o700});return this;}
 file(id){if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id))throw new DeckError('NOT_FOUND','Choose an existing design profile.',404);return path.join(this.directory,id+'.json');}
 async get(id){const file=this.file(id);await rejectSymlinks(file);try{return assertDesignProfile(await readJSON(file,200_000));}catch(e){if(e.code==='ENOENT')throw new DeckError('NOT_FOUND','Choose an existing design profile.',404);throw e;}}
 async list(){const names=(await readdir(this.directory)).filter(n=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.json$/.test(n)).sort(),out=[];for(const n of names){try{const p=await this.get(n.slice(0,-5));out.push({id:p.id,name:p.name,theme:p.theme.id,acceptedAt:p.acceptance.acceptedAt});}catch{}}return out;}
 /** Saving never overwrites a different profile under the same id: the caller chooses a new id. */
 async save(profile,{replace=false}={}){assertDesignProfile(profile);const file=this.file(profile.id);if(!replace){try{await this.get(profile.id);throw new DeckError('PROFILE_EXISTS','A profile with this id exists. Import it as a copy.',409);}catch(e){if(e.code!=='NOT_FOUND')throw e;}}await atomicWrite(file,stringify(profile));return this.get(profile.id);}
}
