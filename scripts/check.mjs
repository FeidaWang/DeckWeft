import path from 'node:path';
import {readdir,readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {VERSION} from '../src/core/model.mjs';
import {assertProject} from '../src/core/validate.mjs';
import {checkStatus} from './status-summary.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),failures=[];
async function all(dir,prefix=''){let result=[];for(const d of await readdir(dir,{withFileTypes:true})){if(['.git','dist','node_modules'].includes(d.name))continue;const rel=prefix?`${prefix}/${d.name}`:d.name;if(d.isDirectory())result.push(...await all(path.join(dir,d.name),rel));else result.push(rel);}return result;}
const files=await all(root);
for(const file of files){
 if(/\.(mjs|js)$/.test(file)){const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});if(result.status!==0)failures.push(`${file}: ${result.stderr}`);}
 if(/\.(ttf|otf|woff2?)$/i.test(file))failures.push(`${file}: do not redistribute font binaries.`);
 if(/\.md$/.test(file)){
  const text=(await readFile(path.join(root,file),'utf8')).replace(/```[\s\S]*?```/g,'');
  for(const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
   const target=match[1];if(/^(?:https?:|mailto:|#)/.test(target))continue;
   const resource=decodeURIComponent(target.split('#')[0]);if(!resource)continue;
   try{await access(path.resolve(root,path.dirname(file),resource));}catch{failures.push(`${file}: missing relative link ${target}`);}
  }
 }
}
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(pkg.name!=='deckweft'||pkg.version!==VERSION||pkg.license!=='MIT')failures.push('Root package identity/version/license mismatch.');
if(Object.keys(pkg.dependencies||{}).length)failures.push('Runtime dependency added: review packaging/offline policy first.');
for(const file of ['plugin.json','.codex-plugin/plugin.json','.claude-plugin/plugin.json']){const m=JSON.parse(await readFile(path.join(root,file),'utf8'));if(m.name!=='deckweft'||m.version!==VERSION)failures.push(`${file}: identity mismatch.`);}
const supported=new Set(['$schema','$id','title','description','$defs','$ref','type','const','enum','properties','required','additionalProperties','items','minItems','maxItems','minLength','maxLength','pattern','minimum','maximum','uniqueItems','oneOf']);
function checkSchema(rule,schema){for(const [key,value]of Object.entries(rule)){if(!supported.has(key))failures.push(`Unsupported schema keyword: ${key}`);if(key==='$ref'&&!(typeof value==='string'&&value.startsWith('#/$defs/')&&schema.$defs[value.split('/').at(-1)]))failures.push('Only existing local $defs are supported.');if(['properties','$defs'].includes(key))Object.values(value).forEach(v=>checkSchema(v,schema));if(key==='items')checkSchema(value,schema);if(key==='oneOf')value.forEach(v=>checkSchema(v,schema));}}
for(const file of files.filter(f=>f.startsWith('schemas/')&&f.endsWith('.schema.json'))) { const contract=JSON.parse(await readFile(path.join(root,file),'utf8'));checkSchema(contract,contract); }
for(const file of files.filter(f=>f.startsWith('examples/')&&f.endsWith('.deck.json')))try{assertProject(JSON.parse(await readFile(path.join(root,file),'utf8')));}catch(e){failures.push(`${file}: ${e.message}`);}
const roadmap=JSON.parse(await readFile(path.join(root,'roadmap.json'),'utf8')),ids=new Set(roadmap.tasks.map(t=>t.id));
for(const task of roadmap.tasks)for(const id of task.dependsOn)if(!ids.has(id))failures.push(`Missing task dependency ${id}`);
const active=['README.md','README.zh-CN.md','package.json','public/index.html','public/app.js','public/styles.css','plugin.json','.codex-plugin/plugin.json','.claude-plugin/plugin.json'];
// The opt-in bridge names an explicitly requested current model. Keep the legacy
// identity check everywhere else, including any other standalone Astra branding.
for(const file of active)if(/open[- ]deck|astra|kimi/i.test((await readFile(path.join(root,file),'utf8')).replaceAll('GPT-6 Astra','').replaceAll('gpt-6-astra','').replaceAll('astra-evaluation.md','')))failures.push(`${file}: legacy branding on an active surface.`);
// F4: docs/current-status.json, its recorded verify log, the tree and PROJECT_STATUS.json must agree.
failures.push(...await checkStatus(root));
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`Checked ${files.length} source files: syntax, relative document links, schema subset, examples, task dependencies, version identity, font exclusions, and current status.`);
