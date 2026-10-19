import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url)),script=path.join(root,'scripts/export-targets.mjs');
const run=args=>spawnSync(process.execPath,[script,...args],{cwd:root,encoding:'utf8',env:{...process.env,CHROMIUM_PATH:''},timeout:60000});

test('F1: export:targets takes --paginate auto|none and refuses any other value before a browser is needed',()=>{
 const help=run(['--help']);assert.equal(help.status,0,help.stderr);assert.match(help.stdout,/--paginate auto\|none/);
 const bad=run(['--paginate','stages']);assert.notEqual(bad.status,0);assert.match(bad.stderr,/--paginate takes auto or none/);
 for(const value of ['auto','none']){const r=run(['--paginate',value]);assert.notEqual(r.status,0);assert.match(r.stderr,/CHROMIUM_PATH/,'the option is accepted; only the browser is missing');}
});
