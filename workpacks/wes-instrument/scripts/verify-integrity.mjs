#!/usr/bin/env node
/** Check the originally packaged files. Run before editing the workpack. */
import {readFileSync,lstatSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {safeRelativePath} from '../lib/validation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
try {
 const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
 const failures=[];let count=0;
 for(const file of manifest.files??[]) {
  if(!safeRelativePath(file.path)){failures.push(`Unsafe manifest path: ${file.path}`);continue;}
  try {
   const path=join(root,file.path),stat=lstatSync(path);
   if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Expected a regular file.');
   const bytes=readFileSync(path),sha=createHash('sha256').update(bytes).digest('hex');
   if(sha!==file.sha256||bytes.length!==file.bytes)failures.push(`Changed: ${file.path}`);
   count++;
  }catch(err){failures.push(`${file.path}: ${err.message}`);}
 }
 if(count===0)failures.push('Manifest contains no readable files.');
 console.log(JSON.stringify({scope:'packaged-file-integrity',passed:failures.length===0,filesChecked:count,failures,
  note:'Integrity is not authenticity or a signed release. A changed workpack is expected to differ after editing.'},null,2));
 if(failures.length)process.exitCode=1;
}catch(err){console.error(`Integrity check failed: ${err.message}`);process.exitCode=1;}
