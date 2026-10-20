// F4: one machine-checked "current" status. docs/current-status.json holds two kinds of fields:
// - live fields, read from the tree on every check: package version, PLAYER_VERSION, renderer version, roadmap open gates;
// - recorded fields, fixed when a verify log is recorded: its counts, the commit and whether the worktree was clean, and the
//   stated browser version used for the browser-gated runners. A file cannot name the commit that contains it, so the
//   commit is the one the run started from.
// `npm run check` recomputes the live fields, re-reads the counts from the recorded log, and compares both with
// docs/current-status.json and with the same-named fields of PROJECT_STATUS.json.
//
// Record after a full verify run:
//   npm run verify 2>&1 | tee docs/evidence/<name>/verify.txt
//   node scripts/status-summary.mjs --record docs/evidence/<name>/verify.txt --browser <version>
// then copy the printed fields into PROJECT_STATUS.json (moving the previous automatedTests into history[]).
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

export const CURRENT_STATUS='docs/current-status.json';
const STAGES=['types','test','check','build','demo'];
const COUNTS=['total','passed','failed','skipped'];

/** Counts of one complete `npm run verify` log. Refuses a log that stopped early, failed, or holds more than one test summary. */
export function parseVerifyLog(text){
 for(const stage of STAGES)if(!new RegExp(`^> deckweft@\\S+ ${stage}$`,'m').test(text))throw Error(`The log has no stage ${stage}; record a complete npm run verify.`);
 const read=key=>{const found=[...text.matchAll(new RegExp(`^ℹ ${key} (\\d+)$`,'gm'))];if(found.length>1)throw Error('The log must hold exactly one test summary.');if(!found.length)throw Error(`The log has no "${key}" count.`);return Number(found[0][1]);};
 const counts={total:read('tests'),passed:read('pass'),failed:read('fail'),skipped:read('skipped')},todo=/^ℹ todo (\d+)$/m.exec(text)?.[1];
 if(counts.failed)throw Error(`The run failed ${counts.failed} test(s); record a passing run.`);
 // A test marked todo (node --test) is neither passed, failed nor skipped; it still counts toward the total.
 if(counts.passed+counts.failed+counts.skipped+Number(todo||0)!==counts.total)throw Error('The counts do not add up to the total.');
 return counts;
}

const constant=async(root,file,name)=>{const m=(await readFile(path.join(root,file),'utf8')).match(new RegExp(`export const ${name}\\s*=\\s*'([^']+)'`));if(!m)throw Error(`${file} does not declare ${name}.`);return m[1];};
/** The fields that are true of the tree itself. Read as text, so nothing is executed. */
export async function liveFields(root){
 const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')),roadmap=JSON.parse(await readFile(path.join(root,'roadmap.json'),'utf8'));
 return {version:pkg.version,playerVersion:await constant(root,'src/render/web/runtime.mjs','PLAYER_VERSION'),rendererVersion:await constant(root,'src/scene/web/compile.mjs','WEB_RENDERER_VERSION'),openAcceptanceGates:roadmap.openAcceptanceGates};
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),show=v=>JSON.stringify(v)?.slice(0,120);
/** Every disagreement, named by file and field. `counts` are re-read from the recorded log (omit when it could not be read). */
export function compareCurrent({current,live,status,counts}){
 const failures=[];
 for(const key of ['version','playerVersion','rendererVersion','openAcceptanceGates'])if(!same(current[key],live[key]))failures.push(`${CURRENT_STATUS} ${key} is stale: the tree has ${show(live[key])}, the file ${show(current[key])}. Record again.`);
 if(counts)for(const key of COUNTS)if(current.automatedTests?.[key]!==counts[key])failures.push(`${CURRENT_STATUS} automatedTests.${key} does not match its log ${current.automatedTests?.log}: ${counts[key]} in the log, ${show(current.automatedTests?.[key])} in the file.`);
 const pairs=[...['version','playerVersion','rendererVersion','openAcceptanceGates'].map(k=>[k,status[k],current[k]]),
  ...['command','commit','worktreeClean','log',...COUNTS].map(k=>[`automatedTests.${k}`,status.automatedTests?.[k],current.automatedTests?.[k]]),
  ['automatedTests.browserVersion',status.automatedTests?.browserVersion,current.browserVersion]];
 for(const [key,a,b] of pairs)if(!same(a,b))failures.push(`PROJECT_STATUS.json ${key} is ${show(a)}; ${CURRENT_STATUS} has ${show(b)}.`);
 return failures;
}

/** The check run by `npm run check`. Returns failure messages; an empty list means every current entry agrees. */
export async function checkStatus(root){
 const failures=[],json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
 let current,live,status,counts;
 try{current=await json(CURRENT_STATUS);}catch{return [`${CURRENT_STATUS} is missing or unreadable. Record it with node scripts/status-summary.mjs --record <verify log> --browser <version>.`];}
 try{live=await liveFields(root);}catch(e){failures.push(`Live status fields: ${e.message}`);}
 try{status=await json('PROJECT_STATUS.json');}catch(e){failures.push(`PROJECT_STATUS.json: ${e.message}`);}
 try{counts=parseVerifyLog(await readFile(path.join(root,current.automatedTests.log),'utf8'));}catch(e){failures.push(`${CURRENT_STATUS} automatedTests.log ${current.automatedTests?.log}: ${e.message}`);}
 if(live&&status)failures.push(...compareCurrent({current,live,status,counts}));
 return failures;
}

async function record(root,log,browser){
 if(!log||!browser)throw Error('Use --record <verify log> --browser <version of the isolated test browser>.');
 const rel=path.relative(root,path.resolve(log)).split(path.sep).join('/');if(rel.startsWith('..'))throw Error('Keep the verify log inside the repository.');
 const counts=parseVerifyLog(await readFile(path.join(root,rel),'utf8')),git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error('git '+args.join(' ')+' failed.');return r.stdout.trim();};
 const live=await liveFields(root);
 const current={format:'deckweft-current-status',version:live.version,playerVersion:live.playerVersion,rendererVersion:live.rendererVersion,browserVersion:browser,
  // The log being recorded is the run's own output, so it does not make the worktree unclean.
  automatedTests:{command:'npm run verify',commit:git(['rev-parse','HEAD']),worktreeClean:git(['status','--porcelain','--untracked-files=all']).split('\n').filter(l=>l&&l.slice(3)!==rel).length===0,log:rel,...counts},
  openAcceptanceGates:live.openAcceptanceGates};
 await writeFile(path.join(root,CURRENT_STATUS),JSON.stringify(current,null,2)+'\n');
 return current;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const {values:a}=parseArgs({options:{record:{type:'string'},browser:{type:'string'},check:{type:'boolean'}}});
 try{
  if(a.record){const c=await record(root,a.record,a.browser);console.log(`Wrote ${CURRENT_STATUS}. Copy into PROJECT_STATUS.json: version, playerVersion, rendererVersion, openAcceptanceGates, and automatedTests ${JSON.stringify({...c.automatedTests,browserVersion:c.browserVersion})}`);}
  else{const failures=await checkStatus(root);if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('Current status agrees: '+CURRENT_STATUS+', its verify log, the tree and PROJECT_STATUS.json.');}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
