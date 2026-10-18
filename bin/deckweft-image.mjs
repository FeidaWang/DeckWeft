#!/usr/bin/env node
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {ImageJobs} from '../src/assets/generation.mjs';
import {defaultHome} from '../src/services/store.mjs';
import {rejectSymlinks} from '../src/services/io.mjs';
const [command,...args]=process.argv.slice(2);
try{
 const {values:v}=parseArgs({args,options:{home:{type:'string'},id:{type:'string'},image:{type:'string'}}});
 if(!/^[a-f0-9]{32}$/.test(v.id||''))throw Error('Provide --id from the approved image request.');
 const jobs=new ImageJobs(path.resolve(v.home||defaultHome()));let result;
 if(command==='dispatch')result=await jobs.dispatch(v.id);
 else if(command==='status')result=await jobs.get(v.id);
 else if(command==='cancel')result=await jobs.cancel(v.id);
 else if(command==='complete'&&v.image){await rejectSymlinks(path.resolve(v.image));result=await jobs.complete(v.id,await readFile(path.resolve(v.image)));}
 else throw Error('Use dispatch/status/cancel --id ID or complete --id ID --image ORIGINAL.png with --home LIBRARY.');
 console.log(JSON.stringify(result,null,2));
}catch(e){console.error(e.status?e.message:'Image command failed. Check its arguments and the original local PNG.');process.exitCode=1;}
