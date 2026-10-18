#!/usr/bin/env node
import { run } from '../src/cli.mjs';
if(Number(process.versions.node.split('.')[0])<22){console.error('DeckWeft needs Node.js 22 or newer.');process.exit(1);}
try{await run();}catch(error){console.error(JSON.stringify({error:{code:error.code||'COMMAND_FAILED',message:error.message,details:error.details||[]}},null,2));process.exitCode=1;}
