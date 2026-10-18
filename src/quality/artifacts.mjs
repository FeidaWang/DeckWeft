import path from 'node:path';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {receiptCurrent} from './visual-review.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const leaf=s=>typeof s==='string'&&/^[a-zA-Z0-9_.-]+$/.test(s)&&s!=='.'&&s!=='..';
/** Keep accepted bytes and their source snapshot across any number of failed reruns. */
export async function preserveValidArtifacts(out,report) {
 const retained=new Map();
 for(const c of report?.cases||[]){
  const archived=c.repair?.artifact?.startsWith('accepted/')?c.repair.artifact:c.lastValid?.artifact;
  if(c.receipt?.status==='passed'){
   if(!leaf(c.name)||!/^[a-f0-9]{64}$/.test(c.receipt.id)||!receiptCurrent(c.receipt,c.project,c.observation))throw Error('Cannot preserve an invalid accepted receipt.');
   const files=[{file:c.name+'.html',sha256:c.htmlHash},...c.receipt.captures];
   for(const f of files)if(!leaf(f.file)||hash(await readFile(path.join(out,f.file)))!==f.sha256)throw Error('Accepted artifact bytes changed; retain existing archive and recapture.');
   const relative='accepted/'+c.receipt.id,dir=path.join(out,relative);await mkdir(dir,{recursive:true});
   for(const f of files)await copyFile(path.join(out,f.file),path.join(dir,f.file));
   const saved={project:c.project,artifact:relative+'/'+c.name+'.html',htmlHash:c.htmlHash};await writeFile(path.join(dir,'receipt.json'),JSON.stringify(saved)+'\n');retained.set(c.name,saved);
  }else if(/^accepted\/[a-f0-9]{64}\/[a-zA-Z0-9_.-]+\.html$/.test(archived||'')){
   const artifact=archived,saved=JSON.parse(await readFile(path.join(out,path.dirname(artifact),'receipt.json'),'utf8'));
   if(saved.artifact!==artifact||hash(await readFile(path.join(out,artifact)))!==saved.htmlHash)throw Error('Last-valid archive changed; preserve it for inspection.');
   retained.set(c.name,saved);
  }
 }
 return retained;
}
