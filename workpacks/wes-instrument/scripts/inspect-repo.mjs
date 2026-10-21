#!/usr/bin/env node
/** Read-only checkout inventory. Does not execute project scripts or use the network. */
import {readFileSync, existsSync, realpathSync, statSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const expectedPaths = ['AGENTS.md','package.json','README.md','ROADMAP.md','PROJECT_STATUS.json',
  'schemas/project.schema.json','src/core','src/layout','src/render','src/services','src/plugin',
  'public/shell.js','public/app.js','public/interaction.js','public/history.js'];
export function inspectRepo(directory) {
  const root = realpathSync(resolve(directory));
  if (!statSync(root).isDirectory()) throw new Error('Repository path is not a directory.');
  function git(args) {
    const result = spawnSync('git',['-C',root,...args],{encoding:'utf8',timeout:5000,maxBuffer:2*1024*1024,
      env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
    return {exitCode:result.status,stdout:(result.stdout??'').trim(),error:result.error?.message || (result.stderr??'').trim() || null};
  }
  const head = git(['rev-parse','HEAD']);
  const status = git(['status','--porcelain=v1','--untracked-files=normal']);
  let pkg = null, packageError = null;
  try {pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));}
  catch (err) {packageError = String(err.message);}
  return {schemaVersion:1,kind:'read-only-checkout-inventory',root,nodeVersion:process.version,
    git:{head,status},package:pkg ? {name:pkg.name??null,version:pkg.version??null,type:pkg.type??null,
      engines:pkg.engines??null,scripts:pkg.scripts??{},dependencies:pkg.dependencies??{},devDependencies:pkg.devDependencies??{}} : null,
    packageError,paths:expectedPaths.map(path=>({path,exists:existsSync(join(root,path))})),
    applicationTestsRun:false,networkUsed:false,filesWritten:false,
    nextAction:'Read repository instructions and inspect scripts. Resolve baseline failures before application edits.'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node inspect-repo.mjs /path/to/DeckWeft');
    const result = inspectRepo(process.argv[2]);
    console.log(JSON.stringify(result,null,2));
    if (!result.package || result.git.head.exitCode !== 0) process.exitCode = 2;
  } catch (err) {console.error(`Inventory failed: ${err.message}`);process.exitCode=1;}
}
