import path from 'node:path';
import {realpath,stat} from 'node:fs/promises';
import os from 'node:os';
import {hostProcess} from './process.mjs';
import {contentHash} from '../scene/web/compile.mjs';
export function assertHost(host){if(!['codex','claude-code'].includes(host))throw Error('Choose codex or claude-code.');return host;}
export async function hostConfiguration(host,cwd){
 const home=host==='codex'?(process.env.CODEX_HOME||path.join(os.homedir(),'.codex')):(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'));
 const files=host==='codex'?[path.join(home,'config.toml'),path.join(cwd,'.codex/config.toml')]:[path.join(home,'settings.json'),path.join(cwd,'.claude/settings.json'),path.join(cwd,'.claude/settings.local.json')];
 const stamps=[];for(const file of files){try{const s=await stat(file);stamps.push([file,s.size,s.mtimeMs]);}catch(e){stamps.push([file,e.code==='ENOENT'?'absent':'unreadable']);}}
 // Metadata only: never open configuration/authentication files or serialize environment values.
 return contentHash({home,cwd,path:process.env.PATH,stamps});
}
const successful=r=>r.exitCode===0&&!r.timedOut&&!r.outputLimited&&!r.cancelled;
export async function probeHost({host,cwd=process.cwd(),authentication=false,runner=hostProcess}={}){
 assertHost(host);cwd=await realpath(path.resolve(cwd));const command=host==='codex'?'codex':'claude';
 const version=await runner(command,['--version'],{cwd,timeout:5000,maxBytes:16000});
 const available=successful(version),help=available?await runner(command,host==='codex'?['exec','--help']:['--help'],{cwd,timeout:5000,maxBytes:80000}):null;
 const text=help&&successful(help)?help.stdout:'';
 const has=flag=>text.includes(flag);
 const structuredOutput=host==='codex'?has('--output-schema')&&has('--output-last-message')&&has('--json'):has('--json-schema')&&has('--output-format');
 const permissionMode=host==='codex'?null:['manual','default'].find(m=>new RegExp('"'+m+'"').test(text.match(/--permission-mode[\s\S]*?(?=\n\s+--|$)/)?.[0]||''))||null;
 const imageInput=host==='codex'?has('--image'):has('--input-format');
 let auth={status:'unknown',evidence:'not-probed'};
 if(authentication&&available){const r=await runner(command,host==='codex'?['login','status']:['auth','status'],{cwd,timeout:5000,maxBytes:32000});auth={status:successful(r)?'available':'unavailable-or-unproven',evidence:'status-exit-only; output discarded'};}
 const foundVersion=available?version.stdout.trim().match(/^(?:codex-cli\s+)?\d+\.\d+\.\d+(?:[-+.][A-Za-z0-9.-]+)?(?:\s+\(Claude Code\))?$/)?.[0]||null:null;
 const receipt={format:'deckweft-host-capabilities',version:1,host,surface:'local-cli',checkedAt:new Date().toISOString(),workspaceHash:contentHash(cwd),configurationFingerprint:await hostConfiguration(host,cwd),available,cliVersion:foundVersion,authentication:auth,billingRoute:'unknown; existing host configuration is retained',structuredOutput:structuredOutput?'advertised':'unavailable-or-unknown',imageInput:imageInput?'advertised-not-delivery-verified':'unknown',permissionMode,writableScope:host==='codex'?'read-only child; parent applies validated local tools':'built-in tools disabled; parent applies validated local tools',renderer:'shared local renderer; actual capture is supplied separately',domDiagnostics:'requires explicit browser capture callback',imageBackend:'unknown; no generation request',timeout:{supported:true,maximumMs:600000},ready:available&&structuredOutput&&(host==='codex'?has('--sandbox'):!!permissionMode&&has('--tools')&&has('--no-chrome')&&has('--no-session-persistence'))};
 return {...receipt,id:contentHash(receipt)};
}
