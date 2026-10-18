import path from 'node:path';
import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { spawn,spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createProject,fromOutline,VERSION } from './core/model.mjs';
import { assertProject } from './core/validate.mjs';
import { importProject } from './core/migrate.mjs';
import { resolveScenes,auditProject } from './layout/engine.mjs';
import { exportDeck } from './render/export.mjs';
import { readJSON,stringify,rejectSymlinks } from './services/io.mjs';
import { startStudio } from './services/server.mjs';
import { install,uninstall } from './plugin/installer.mjs';
import {probeHost} from './hosts/capabilities.mjs';
import { hostAcceptance } from './qa/hosts.mjs';
import {assetResources} from './assets/registry.mjs';
import {migrateToPlanning} from './planning/storyboard.mjs';
import { DeckError } from './core/errors.mjs';
const USAGE=`DeckWeft ${VERSION} — small ideas, clear slides

Usage: node bin/deckweft.mjs COMMAND [file] [options]

  studio                         Open the local editor (--open, --port, --home, --capture-browser)
  new --out deck.deck.json        Create a deck (--outline notes.md, --locale zh-CN)
  check deck.deck.json            Validate data and inspect layout blockers
  layouts deck.deck.json          Show four ranked choices for every slide
  export deck.deck.json           Export (--format pptx|html|svg|json|figma|motion --out FILE)
                                 --include-notes creates a private presenter copy
  upgrade v1.json --out v2.json   Explicit planning migration as a new copy
  import old.json --out new.json  Import legacy schema 2 without changing the original
  install                        Install skills (--target both|codex|claude --scope project|user)
  uninstall                      Remove only unmodified, owned skill installations
  host-check --out evidence      Real CLI probes (--target both|codex|claude; --live is opt-in)
                                 --timeout-ms 120000 (1000–600000; no permission bypass)
  visual-task --help             Local or opt-in host-backed v3 task and scoped review/revision
  doctor [--host codex|claude-code|both --json]  CLI capability probe (auth unknown unless --probe-auth)

Install defaults to this project, not your whole computer. Use --dry-run to preview.
An existing file is never overwritten unless you pass --force.
`;
async function output(data,file,force=false){
  if(!file)throw new DeckError('OUTPUT_REQUIRED','Choose an output file with --out.');
  await rejectSymlinks(path.resolve(file));
  await mkdir(path.dirname(path.resolve(file)),{recursive:true});
  try{await writeFile(path.resolve(file),data,{flag:force?'w':'wx'});}catch(e){if(e.code==='EEXIST')throw new DeckError('OUTPUT_EXISTS','That file already exists. Choose another name, or authorize replacement with --force.',409);throw e;}
  console.log(`Wrote ${path.resolve(file)}`);
}
export async function run(argv=process.argv.slice(2)){
  const [command='help',...args]=argv;
  if(command==='visual-task'){const {runTaskCli}=await import('./hosts/task-cli.mjs');await runTaskCli(args);return;}
  const {values:v,positionals:p}=parseArgs({args,allowPositionals:true,strict:true,options:{
    host:{type:'string'},json:{type:'boolean'},'probe-auth':{type:'boolean'},out:{type:'string'},outline:{type:'string'},title:{type:'string'},locale:{type:'string'},ratio:{type:'string'},format:{type:'string'},slide:{type:'string'},
    'capture-browser':{type:'string'},port:{type:'string'},home:{type:'string'},open:{type:'boolean'},target:{type:'string'},scope:{type:'string'},project:{type:'string'},
    live:{type:'boolean'},'timeout-ms':{type:'string'},'dry-run':{type:'boolean'},replace:{type:'boolean'},force:{type:'boolean'},help:{type:'boolean'},'include-notes':{type:'boolean'} }});
  if((v.host||v['probe-auth'])&&command!=='doctor')throw new DeckError('HOST_OPTIONS','Host probe options are only supported by doctor; use visual-task for live work.',422);
  if(command==='doctor'&&v['probe-auth']&&!v.host)throw new DeckError('HOST_OPTIONS','Choose --host before --probe-auth.',422);
  if(command==='help'||command==='--help'||v.help){console.log(USAGE);return;}
  if(command==='host-check'){
    const result=await hostAcceptance({out:v.out,live:!!v.live,target:v.target||'both',timeout:v['timeout-ms']===undefined?120000:Number(v['timeout-ms'])});
    console.log(stringify(result));if(!result.releaseGatePassed)process.exitCode=2;return;
  }
  if(command==='doctor'&&v.host){const hosts=v.host==='both'?['codex','claude-code']:[v.host];console.log(stringify({application:'DeckWeft',version:VERSION,hosts:await Promise.all(hosts.map(host=>probeHost({host,authentication:!!v['probe-auth']})))}));return;}
  if(command==='doctor'){
    const hosts=Object.fromEntries(['codex','claude'].map(name=>{const r=spawnSync(name,['--version'],{encoding:'utf8',timeout:3000,windowsHide:true});return [name,{found:!r.error&&r.status===0,version:!r.error&&r.status===0?r.stdout.trim():null,authenticated:'not checked'}];}));
    console.log(stringify({application:'DeckWeft',version:VERSION,node:process.version,nodeSupported:Number(process.versions.node.split('.')[0])>=22,hosts,networkRequired:false,desktopApps:{figma:'not checked',afterEffects:'not checked'}}));return;
  }
  if(command==='studio'){
    const studio=await startStudio({port:v.port===undefined?4179:Number(v.port),home:v.home,captureBrowser:v['capture-browser']});console.log(`DeckWeft Studio: ${studio.url}\nYour data stays in the local project library. Press Ctrl+C to stop.`);
    if(v.open){const cmd=process.platform==='darwin'?'open':process.platform==='win32'?'explorer':'xdg-open';const child=spawn(cmd,[studio.url],{stdio:'ignore',detached:true});child.on('error',()=>console.error('Open the printed URL in your browser.'));child.unref();}
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>studio.close().then(()=>process.exit(0)));
    return;
  }
  if(command==='install'||command==='uninstall'){
    console.log(stringify(await (command==='install'?install:uninstall)({target:v.target||'both',scope:v.scope||'project',projectDir:v.project||process.cwd(),dryRun:!!v['dry-run'],replace:!!v.replace})));return;
  }
  if(command==='new'){
    const options={title:v.title,locale:v.locale||'en',aspectRatio:v.ratio||'16:9'};
    const project=v.outline?fromOutline(await readFile(v.outline,'utf8'),options):createProject(options);
    assertProject(project);await output(stringify(project),v.out,v.force);return;
  }
  if(!['import','upgrade','check','layouts','export'].includes(command))throw new DeckError('COMMAND',`Unknown command: ${command}. Run help.`);
  if(!p[0])throw new DeckError('INPUT_REQUIRED','Choose the input JSON file.');
  const raw=await readJSON(p[0]);
  if(command==='import'){const imported=importProject(raw);await output(stringify(imported.project),v.out,v.force);for(const warning of imported.warnings)console.error(warning);return;}
  if(command==='upgrade'){const migrated=migrateToPlanning(raw);await output(stringify(migrated.project),v.out,v.force);return;}
  const project=assertProject(raw),resources=await assetResources(project,v.home||path.dirname(path.resolve(p[0]))),resolved=resolveScenes(project,{assetResources:resources});
  if(command==='check'){const audit=auditProject(project,resolved);console.log(stringify(audit));if(!audit.ok)process.exitCode=2;return;}
  if(command==='layouts'){console.log(stringify(resolved.map(({slideId,selected,candidates})=>({slideId,selected,candidates}))));return;}
  if(command==='export'){const result=exportDeck(project,v.format||'pptx',{slideIndex:v.slide===undefined?0:Number(v.slide)-1,includeNotes:v['include-notes']??false,resolved,assetResources:resources});await output(result.body,v.out,v.force);}
}
