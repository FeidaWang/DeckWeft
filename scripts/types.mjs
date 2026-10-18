import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const schema=JSON.parse(await readFile(path.join(root,'schemas/project.schema.json'),'utf8'));
function type(rule){
 if(rule.$ref)return rule.$ref.split('/').at(-1);
 if(Object.hasOwn(rule,'const'))return JSON.stringify(rule.const);
 if(rule.enum)return rule.enum.map(v=>JSON.stringify(v)).join(' | ');
 if(rule.type==='array')return `Array<${type(rule.items)}>`;
 if(rule.type==='object')return rule.properties?`{ ${Object.entries(rule.properties).map(([key,value])=>`${JSON.stringify(key)}${rule.required?.includes(key)?'':'?'}: ${type(value)}`).join('; ')} }`:'Record<string, unknown>';
 return {string:'string',number:'number',integer:'number',boolean:'boolean',null:'null'}[rule.type]||'unknown';
}
await mkdir(path.join(root,'dist/types'),{recursive:true});
await writeFile(path.join(root,'dist/types/project.d.mts'),'// Generated from schemas/project.schema.json. Do not edit.\n'+Object.entries(schema.$defs).map(([name,rule])=>`export type ${name} = ${type(rule)};`).join('\n')+`\nexport type Project = ${type(schema)};\n`);
const schemaV1=JSON.parse(await readFile(path.join(root,'schemas/project-v1.schema.json'),'utf8'));
await writeFile(path.join(root,'dist/types/project-v1.d.mts'),'// Generated legacy contract.\n'+Object.entries(schemaV1.$defs).map(([name,rule])=>`export type ${name} = ${type(rule)};`).join('\n')+`\nexport type Project = ${type(schemaV1)};\n`);
const compiler=process.env.DECKWEFT_TSC||path.join(root,'node_modules/typescript/bin/tsc');
const start=performance.now();
for(const config of ['tsconfig.json','tsconfig.browser.json']){
 const result=spawnSync(process.execPath,[compiler,'-p',path.join(root,config)],{cwd:root,encoding:'utf8'});
 if(result.status!==0){console.error(result.stdout||result.stderr||'TypeScript compiler unavailable. Run npm ci for development tools.');process.exit(1);}
}
// Exercise the emitted pilot, not just declarations.
const speech=await import('../dist/runtime/src/core/speech.mjs');
const prefs=await import('../dist/runtime/src/core/preferences.mjs');
const {PresentationClock}=await import('../dist/runtime/src/presentation/clock.mjs');
const {actions}=await import('../dist/runtime/public/actions.js');
if(speech.speechTiming('你好 world').characters!==2||prefs.effectivePreferences({appearance:'system',motion:'full'},{dark:true,reduced:true}).motion!=='reduced'||new PresentationClock(()=>0).seconds()!==0||actions.present.role!=='present')throw Error('Emitted runtime smoke failed.');
await writeFile(path.join(root,'dist/runtime/build-manifest.json'),JSON.stringify({format:'deckweft-typed-pilot',version:1,entries:{speech:'src/core/speech.mjs',preferences:'src/core/preferences.mjs',clock:'src/presentation/clock.mjs',actions:'public/actions.js'},runtimeCompilerRequired:false},null,2)+'\n');
const report={compilerVersion:spawnSync(process.execPath,[compiler,'--version'],{encoding:'utf8'}).stdout.trim(),elapsedMs:Math.round(performance.now()-start),schemaBytes:(await stat(path.join(root,'dist/types/project.d.mts'))).size,emittedSmoke:true};
await writeFile(path.join(root,'dist/types/verification.json'),JSON.stringify(report,null,2)+'\n');
console.log('Type contracts, negative fixtures and emitted runtime passed. '+JSON.stringify(report));
