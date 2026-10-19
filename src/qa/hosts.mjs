/** Real CLI probes. Never call package checks or discovery an authenticated host run. */
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp,mkdir,readFile,writeFile,realpath,lstat,readdir } from 'node:fs/promises';
import { createHash,randomBytes } from 'node:crypto';
import { buildPlugin,filesIn } from '../plugin/packager.mjs';
import { VERSION } from '../core/model.mjs';
import { validateProject } from '../core/validate.mjs';
import { stringify,rejectSymlinks } from '../services/io.mjs';

export function claudePermissionMode(help) {
  const option=help.match(/--permission-mode\b[\s\S]*?(?=\n\s+--|\nCommands:|$)/)?.[0]||'';
  // Claude renamed the normal approval mode. Only use a mode advertised by this binary.
  for(const mode of ['manual','default'])if(new RegExp(`"${mode}"`).test(option))return mode;
  return null;
}
export async function verifyHostArtifacts({work,runtime,nonce,env}) {
  const files=['host-result.deck.json','host-result.html','host-result.pptx'];
  for(const file of files){
    const name=path.join(work,file);await rejectSymlinks(name);
    const stat=await lstat(name);
    if(!stat.isFile()||stat.size===0||stat.size>10_000_000)throw Error(`Invalid artifact: ${file}`);
  }
  const project=JSON.parse(await readFile(path.join(work,files[0]),'utf8'));
  if(!validateProject(project).ok||project.slides.length!==3||!project.title.includes(nonce)||project.locale!=='en')throw Error('Expected a valid three-slide English deck with the task nonce.');
  const probes=[await commandProbe(process.execPath,[runtime,'check',path.join(work,files[0])],{cwd:work,env})];
  if(probes[0].exitCode!==0||probes[0].timedOut||probes[0].outputLimited)throw Error('Bundled CLI rejected the host project.');
  const verification=await mkdtemp(path.join(work,'.deckweft-verification-'));
  // Nonempty output alone is insufficient: both exports must match the bundled exporter.
  for(const format of ['html','pptx']){
    const regenerated=path.join(verification,`result.${format}`);
    const probe=await commandProbe(process.execPath,[runtime,'export',path.join(work,files[0]),'--format',format,'--out',regenerated],{cwd:work,env});probes.push(probe);
    if(probe.exitCode!==0||probe.timedOut||probe.outputLimited)throw Error(`Bundled ${format} export failed.`);
    if(!(await readFile(regenerated)).equals(await readFile(path.join(work,`host-result.${format}`))))throw Error(`Host ${format} does not match the bundled export.`);
  }
  return {files,probes};
}

export function sanitizeOutput(value, roots=[]) {
  let text=String(value||'').replace(/\u001b\[[0-9;]*m/g,'');
  // Best effort only: known prefixes, bearer tokens, JWT/AWS shapes, generic key=value secrets, emails and supplied roots plus the home directory. Arbitrary secrets can survive.
  const home=os.homedir();
  for(const root of [...roots,home].filter(Boolean)) text=text.split(root).join('<local-path>');
  text=text.replace(/(^|[\s"'(])~\//g,'$1<local-path>/');
  return text.replace(/\b(?:sk-|sk-ant-|sess-)[A-Za-z0-9_-]{12,}\b/g,'<redacted>')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'<redacted>')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,'<redacted>')
    .replace(/\b((?:api[_-]?key|secret|password|passwd|token|access[_-]?token)\s*[:=]\s*)[^\s"']+/gi,'$1<redacted>')
    .replace(/Bearer\s+[^\s"']+/gi,'Bearer <redacted>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'<email>');
}
export function commandProbe(command,args,{cwd,env=process.env,timeout=15000}={}) {
  return new Promise(resolve=>{
    const started=Date.now(); let stdout='',stderr='',settled=false,limited=false,timedOut=false;
    // Same bounded rule as src/hosts/process.mjs (F7): a POSIX process group so grandchildren stop too; Windows stops the direct child only (tree behaviour unverified).
    const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],windowsHide:true,shell:false,detached:process.platform!=='win32'});
    const stop=sig=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,sig);else child.kill(sig);}catch{}};
    const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolve({command,args,...result,elapsedMs:Date.now()-started,timedOut,outputLimited:limited,stdout,stderr});};
    const append=key=>chunk=>{if((stdout.length+stderr.length)>1_000_000){limited=true;stop('SIGTERM');return;}if(key==='stdout')stdout+=chunk;else stderr+=chunk;};
    child.stdout?.on('data',append('stdout'));child.stderr?.on('data',append('stderr'));
    const timer=setTimeout(()=>{timedOut=true;stop('SIGTERM');setTimeout(()=>stop('SIGKILL'),1000).unref();},timeout);
    child.on('error',error=>finish({exitCode:null,error:error.code||error.message}));
    child.on('close',(code,signal)=>finish({exitCode:code,signal}));
  });
}
export async function hostAcceptance({out,live=false,target='both',timeout=120000}={}) {
  if(!['both','codex','claude'].includes(target))throw Error('Choose both, codex, or claude.');
  if(!Number.isInteger(timeout)||timeout<1000||timeout>600000)throw Error('Task timeout must be an integer from 1000 to 600000 milliseconds.');
  const output=path.resolve(out||`host-evidence-${Date.now()}`);
  await rejectSymlinks(output); await mkdir(output,{recursive:true});
  // An interrupted run can have task files without a receipt. Preserve those too.
  if((await readdir(output)).length)throw Error('Evidence folder is not empty. Choose a new output folder before running another host task.');
  const marker=path.join(output,'report.json');
  const temp=await realpath(await mkdtemp(path.join(os.tmpdir(),'deckweft-host-')));
  const isolatedHome=path.join(temp,'home'); await mkdir(isolatedHome);
  const isolatedEnv={...process.env,HOME:isolatedHome,USERPROFILE:isolatedHome,CODEX_HOME:path.join(isolatedHome,'.codex'),CLAUDE_CONFIG_DIR:path.join(isolatedHome,'.claude')};
  await mkdir(isolatedEnv.CODEX_HOME);await mkdir(isolatedEnv.CLAUDE_CONFIG_DIR);
  for(const key of ['OPENAI_API_KEY','CODEX_API_KEY','ANTHROPIC_API_KEY','CLAUDE_CODE_OAUTH_TOKEN'])delete isolatedEnv[key];
  const plugin=await buildPlugin(path.join(temp,'bundle'));
  const entries=await filesIn(plugin.directory);
  const hashEntries=items=>{const digest=createHash('sha256');for(const [name,content]of items)digest.update(name+'\0').update(content);return digest.digest('hex');};
  const portable=await commandProbe(process.execPath,[path.join(plugin.directory,'runtime/bin/deckweft.mjs'),'check',path.join(plugin.directory,'runtime/examples/welcome.deck.json')],{cwd:temp,env:isolatedEnv});
  const report={format:'deckweft-host-evidence',version:1,projectVersion:VERSION,recordedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,node:process.version,mode:live?'explicit-live':'preflight',taskTimeoutMs:timeout,nativeDesktop:'not tested',remoteCI:'not run',bundleSha256:hashEntries(entries),bundleRuntime:{passed:portable.exitCode===0,probe:portable},hosts:{},policy:'No permission bypass, secret copying, host auto-install, automatic marketplace registration, or global host configuration edits. Live mode uses your existing host authentication; it may use your plan/API allowance.'};
  for(const name of (target==='both'?['codex','claude']:[target])) {
    const version=await commandProbe(name,['--version'],{cwd:temp,env:isolatedEnv});
    const host=report.hosts[name]={available:version.exitCode===0,version:version.exitCode===0?version.stdout.trim():null,probes:[version],validator:'not run',authenticatedTask:'not run',gate:'blocked'};
    if(!host.available){host.reason='HOST_EXECUTABLE_UNAVAILABLE';continue;}
    const help=await commandProbe(name,['--help'],{cwd:temp,env:isolatedEnv});host.probes.push(help);
    if(name==='claude') {
      const validator=await commandProbe(name,['plugin','validate',plugin.directory],{cwd:temp,env:isolatedEnv});host.probes.push(validator);
      host.validator=validator.exitCode===0?'passed':'failed or unsupported';
    }else host.validator='No generic manifest validator assumed; use the native plugin UI for discovery.';
    if(!live){host.reason='LIVE_RUN_REQUIRES_EXPLICIT_OPT_IN';continue;}
    if(!report.bundleRuntime.passed){host.reason='BUNDLED_RUNTIME_FAILED';continue;}
    const permissionMode=name==='claude'?claudePermissionMode(help.stdout):null;
    if(name==='claude'&&(host.validator!=='passed'||!permissionMode)){host.reason=host.validator!=='passed'?'PLUGIN_VALIDATION_FAILED':'NORMAL_PERMISSION_MODE_UNSUPPORTED';continue;}
    const auth=await commandProbe(name,name==='codex'?['login','status']:['auth','status'],{cwd:temp});
    // Auth output may contain account identifiers. Record only status, not contents.
    host.authentication={exitCode:auth.exitCode,error:auth.error||null};
    if(auth.exitCode!==0){host.reason='HOST_AUTHENTICATION_UNAVAILABLE';continue;}
    const work=path.join(temp,name);await mkdir(work);
    const runtime=path.join(plugin.directory,'runtime/bin/deckweft.mjs');
    if(name==='codex'){
      const installation=await commandProbe(process.execPath,[runtime,'install','--target','codex','--scope','project','--project',work],{cwd:work});host.probes.push(installation);
      if(installation.exitCode!==0||installation.timedOut||installation.outputLimited){host.reason='SKILL_INSTALLATION_FAILED';continue;}
    }
    const nonce=randomBytes(6).toString('hex');
    const prompt=`${name==='claude'?'/deckweft:deck':'$deckweft'}\nReal DeckWeft acceptance task. Work only in ${work}. Discover and read the installed skill through this host's skill mechanism; stop if it is unavailable. Use its bundled CLI, not your own exporter. Create exactly three short English slides about a FICTIONAL paper-airplane club. Include ${nonce} in the deck title. No external facts, metrics, sources, or network research. Save host-result.deck.json and export host-result.html and host-result.pptx. Run check and layouts. Visual inspection will be performed separately by the acceptance reviewer; do not access browsers, unrelated connectors, personal files, or other applications. Keep normal permission checks. Stop if an approval is required; never bypass it. Do not alter any plugin or host settings.`;
    await writeFile(path.join(output,`${name}-task.txt`),prompt.replaceAll(temp,'<temporary-workspace>'),{flag:'wx'});
    const args=name==='codex'?['exec','--skip-git-repo-check','--sandbox','workspace-write','--json',prompt]:['--plugin-dir',plugin.directory,'--permission-mode',permissionMode,'-p',prompt,'--output-format','stream-json','--verbose'];
    const run=await commandProbe(name,args,{cwd:work,timeout});
    const taskSucceeded=run.exitCode===0&&!run.timedOut&&!run.outputLimited;
    host.probes.push(run);host.authenticatedTask=taskSucceeded?'process completed':'failed or needs approval';
    host.route=name==='codex'?'standalone project skill; not native-plugin certification':'session-local native plugin';
    host.artifacts=[];
    host.bundleUnchanged=false;
    try{
      host.bundleUnchanged=hashEntries(await filesIn(plugin.directory))===report.bundleSha256;
      if(!host.bundleUnchanged)throw Error('The host modified the plugin bundle.');
      const verified=await verifyHostArtifacts({work,runtime,nonce,env:isolatedEnv});host.probes.push(...verified.probes);
      for(const file of verified.files){
        const bytes=await readFile(path.join(work,file));
        if(!bytes.length)throw Error('Empty output');
        await writeFile(path.join(output,`${name}-${file}`),bytes,{flag:'wx'});
        host.artifacts.push({file:`${name}-${file}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
      }
      host.artifactCheck=true;
      host.gate=taskSucceeded?'manual-trace-and-visual-review-required':'failed';
      host.reason='Artifacts alone are not proof of skill invocation or visual inspection. Review sanitized host trace and inspect all slides.';
    }catch(error){host.artifactCheck=false;host.gate='failed';host.reason='HOST_ARTIFACT_VERIFICATION_FAILED';host.artifactError=error.message;}
  }
  const redact=value=>typeof value==='string'?sanitizeOutput(value,[temp,os.homedir()]):Array.isArray(value)?value.map(redact):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,redact(item)])):value;
  const clean=redact(report);
  await writeFile(marker,stringify(clean),{flag:'wx'});
  // Keep temporary workspace for debugging; disclose its location on the terminal only.
  return {report:clean,output,workspace:temp,releaseGatePassed:false};
}
