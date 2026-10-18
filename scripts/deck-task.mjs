// Source-checkout entry; the same dispatcher ships in the standalone runtime.
import {runTaskCli} from '../src/hosts/task-cli.mjs';
try{await runTaskCli();}catch(error){console.error(JSON.stringify({error:error.code||'TASK_FAILED',message:error.message}));process.exitCode=1;}
