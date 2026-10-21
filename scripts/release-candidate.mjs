// DWI-062: an offline release candidate built from source, never from a patched dist. It builds the plugin twice and compares the
// archives byte for byte, scans the archive for material that must not ship (the private workpack inputs, environment files, fonts,
// credentials, home-directory paths), unpacks it into an empty folder and runs new, check and export there with the network denied by
// the macOS sandbox when available, then writes the manifest, SHA256SUMS and the capability matrix beside a copy of the archive.
// It publishes nothing: no push, tag, upload or registry step exists here.
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {mkdir,mkdtemp,readFile,realpath,rm,writeFile,copyFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {buildPlugin} from '../src/plugin/packager.mjs';
import {readZip} from '../src/targets/pptx/audit.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values:args}=parseArgs({options:{out:{type:'string'},capabilities:{type:'string'}}});
const out=path.resolve(args.out||path.join(root,'dist/release-candidate')),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>spawnSync('git',a,{cwd:root,encoding:'utf8'}).stdout.trim();
const temp=async name=>realpath(await mkdtemp(path.join(os.tmpdir(),`deckweft-rc-${name}-`)));
const cleanup=[];
try{
 const commit=git('rev-parse','HEAD'),dirty=git('status','--porcelain').split('\n').filter(Boolean);
 // 1. Reproducible build: two builds from the same source give the same archive bytes.
 const [a,b]=[await temp('a'),await temp('b')];cleanup.push(a,b);
 const first=await buildPlugin(a),second=await buildPlugin(b),bytes=await readFile(first.archive),again=await readFile(second.archive);
 const reproducible=sha(bytes)===sha(again);
 // 2. Leak scan of every entry: names and text content.
 const files=readZip(bytes),findings=[];
 const NAME=[[/(^|\/)workpacks\//,'workpack sidecar'],[/(^|\/)inputs\//,'private inputs'],[/(^|\/)\.env(\.|$)/,'environment file'],[/\.(ttf|otf|woff2?|ttc)$/i,'font file'],[/(^|\/)node_modules\//,'dependencies'],[/(^|\/)\.git\//,'git metadata'],[/(^|\/)\.deckweft\//,'user library'],[/\.(mp3|wav|ogg|m4a|flac)$/i,'sound file'],[/\.(pem|key|p12)$/i,'key file']];
 const TEXT=[[/-----BEGIN [A-Z ]*PRIVATE KEY-----/,'private key'],[/\b(sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abpr]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/,'credential-shaped value'],[/\/Users\/[a-z][\w.-]+\//,'home-directory path']];
 for(const [name,data] of files){for(const [re,what] of NAME)if(re.test(name))findings.push({name,what});
  if(/\.(m?js|json|md|html|css|txt|py|toml)$/i.test(name)){const text=data.toString('utf8');for(const [re,what] of TEXT)if(re.test(text))findings.push({name,what});}}
 // 3. Fresh offline install: unpack into an empty folder and run the CLI there with the network denied.
 const fresh=await temp('fresh');cleanup.push(fresh);
 for(const [name,data] of files){if(name.endsWith('/'))continue;const target=path.join(fresh,name);if(!target.startsWith(fresh+path.sep))throw Error('Unsafe archive path: '+name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);}
 const cli=path.join(fresh,'runtime/bin/deckweft.mjs'),work=await temp('work');cleanup.push(work);
 const sandbox=process.platform==='darwin'&&existsSync('/usr/bin/sandbox-exec');
 const run=argv=>{const cmd=sandbox?['/usr/bin/sandbox-exec',['-p','(version 1)(allow default)(deny network*)',process.execPath,cli,...argv]]:[process.execPath,[cli,...argv]];const r=spawnSync(cmd[0],cmd[1],{cwd:work,encoding:'utf8',timeout:120000,env:{PATH:process.env.PATH,HOME:work}});return {argv:argv.join(' '),status:r.status,stdout:(r.stdout||'').slice(0,400),stderr:(r.stderr||'').slice(0,400)};};
 const steps=[run(['new','--out','deck.deck.json']),run(['check','deck.deck.json']),run(['export','deck.deck.json','--format','html','--out','deck.html']),run(['export','deck.deck.json','--format','pptx','--out','deck.pptx']),run(['doctor'])];
 const outputs=Object.fromEntries(await Promise.all(['deck.deck.json','deck.html','deck.pptx'].map(async f=>[f,existsSync(path.join(work,f))?sha(await readFile(path.join(work,f))):null])));
 const offline={networkDenied:sandbox?'macOS sandbox-exec (deny network*)':'not enforced on this platform',steps,outputs,passed:steps.every(s=>s.status===0)&&Object.values(outputs).every(Boolean)};
 // 4. The release folder.
 await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
 const archiveName=path.basename(first.archive);await copyFile(first.archive,path.join(out,archiveName));
 const capabilities=args.capabilities?JSON.parse(await readFile(path.resolve(args.capabilities),'utf8')):null;
 const manifest={format:'deckweft-release-candidate',version:1,package:JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version,sourceCommit:commit,worktreeClean:!dirty.length,dirtyPaths:dirty.slice(0,50),node:process.version,platform:`${process.platform} ${os.release()}`,archive:{name:archiveName,sha256:sha(bytes),bytes:bytes.length,entries:files.size},reproducible,leakScan:{entries:files.size,findings},offline,published:false,note:'A local release candidate. Nothing was pushed, tagged, uploaded or published.'};
 await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(path.join(out,'SHA256SUMS'),`${sha(bytes)}  ${archiveName}\n`);
 if(capabilities)await writeFile(path.join(out,'capability-matrix.json'),JSON.stringify(capabilities,null,2)+'\n');
 console.log(JSON.stringify({out:path.relative(root,out),archive:archiveName,sha256:sha(bytes),reproducible,findings:findings.length,offline:offline.passed,networkDenied:offline.networkDenied,worktreeClean:!dirty.length},null,2));
 if(!reproducible||findings.length||!offline.passed)process.exitCode=1;
}finally{for(const d of cleanup)await rm(d,{recursive:true,force:true});}
