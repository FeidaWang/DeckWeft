#!/usr/bin/env node
/** Print a recommendation only. Never launches a model or changes host settings. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {taskProfile} from '../lib/model-routing.mjs';
export function printProfile(args, write = text => console.log(text)) {
  if (args.length !== 1 || !/^DWI-\d{3}$/.test(args[0])) throw new TypeError('Usage: node scripts/task-profile.mjs DWI-034');
  const json = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
  const output = taskProfile(json('MODEL_POLICY.json'), json('TASKS.json'), args[0]);
  write(JSON.stringify(output, null, 2));
  return output;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { printProfile(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
