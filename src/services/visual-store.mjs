import path from 'node:path';
import { ProjectStore, defaultHome } from './store.mjs';
import { assertVisualProject, assertVisualLocks } from '../core/visual-project.mjs';
/** Same atomic writer, conflict checks, immutable history and restore-as-copy; separate library. */
export class VisualProjectStore extends ProjectStore {
 constructor(home=defaultHome()){super(path.join(home,'visual'));}
 validateRecord(p){return assertVisualProject(p);}
 describeRecord(p){return {id:p.id,title:p.document.title,locale:p.document.locale,slides:p.plan.scenes.length,revision:p.revision.number,updatedAt:p.revision.updatedAt};}
 copyRecord(p,id,title){const copy=structuredClone(p);copy.id=id;copy.document.id=id;copy.document.title=title;copy.plan.documentId=id;copy.revision.number=0;return copy;}
 async save(input,options={}){
  assertVisualProject(input);
  if(!options.create){let previous;try{previous=await this.get(input.id);}catch(e){if(e.code!=='NOT_FOUND')throw e;}if(previous)assertVisualLocks(previous,input);}
  return super.save(input,options);
 }
}
