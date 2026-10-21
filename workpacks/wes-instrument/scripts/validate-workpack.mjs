#!/usr/bin/env node
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validatePaletteData,validateTasks,safeRelativePath} from '../lib/validation.mjs';
import {validateModelRouting,EFFORT_LABELS} from '../lib/model-routing.mjs';
export const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const essential = ['MODEL_POLICY.json','MODEL_ROUTING.md','MODEL_ROUTING.zh-CN.md',
  'lib/model-routing.mjs','scripts/task-profile.mjs','schemas/model-routing.schema.json','README.md','START_HERE.zh-CN.md','MASTER_PLAN.md','ARCHITECTURE.md','DESIGN_SYSTEM.md',
  'PALETTES.json','TASKS.json','TASKS.md','AGENTS.md','SOURCES.md','RESEARCH_AUDIT.md','TEST_PLAN.md',
  'THIRD_PARTY_NOTICES.md','DECISIONS.md','package.json','palette-catalog.html',
  'data/source-register.json','data/repository-baseline.json','data/library-values.json',
  'data/screenshot-audit.json','data/coverage.json','schemas/palette.schema.json','schemas/evidence.schema.json',
  'schemas/agent-handoff.schema.json','scripts/inspect-repo.mjs','scripts/sample_screenshot.py',
  'lib/color.mjs','lib/navigation.mjs','lib/validation.mjs','prompts/START.md',
  ...Array.from({length:7},(_,i)=>`prompts/PHASE_${String(i).padStart(2,'0')}.md`)];
function hash(file) {return createHash('sha256').update(readFileSync(file)).digest('hex');}
export function validateWorkpack(root=DEFAULT_ROOT) {
  const errors=[];
  for(const path of essential)if(!existsSync(join(root,path)))errors.push(`Missing file: ${path}`);
  function json(path) {try{return JSON.parse(readFileSync(join(root,path),'utf8'));}catch(err){errors.push(`${path}: ${err.message}`);return null;}}
  const sources=json('data/source-register.json');
  const sourceIds=new Set();
  for(const s of sources?.sources??[]) {
    if(sourceIds.has(s.id))errors.push(`Duplicate source: ${s.id}`);
    sourceIds.add(s.id);
    if(!s.accessLevel||!Array.isArray(s.limitations))errors.push(`${s.id}: missing source limitations.`);
    const local=s.locator?.localPath;
    if(local) {
      if(!safeRelativePath(local)||!existsSync(join(root,local)))errors.push(`${s.id}: missing local source.`);
      else if(hash(join(root,local))!==s.locator.sha256)errors.push(`${s.id}: archived source hash mismatch.`);
    }
  }
  const frozen=json('data/library-values.json');
  const palettes=json('PALETTES.json');
  const p=validatePaletteData(palettes,{sourceIds,baseline:frozen?.palettes});
  errors.push(...p.errors);
  const tasks=json('TASKS.json');
  const t=validateTasks(tasks);errors.push(...t.errors);
  const modelPolicy=json('MODEL_POLICY.json');
  const routing=validateModelRouting(modelPolicy,tasks); errors.push(...routing.errors);
  for(const id of modelPolicy?.sourceIds??[]) if(!sourceIds.has(id))errors.push(`Model policy: unresolved source ${id}.`);
  for(const task of tasks?.tasks??[]) {
    const m=task.modelRouting;if(!m)continue;
    const taskPrompt=m.taskPrompt;
    if(!safeRelativePath(taskPrompt)||!existsSync(join(root,taskPrompt)))errors.push(`${task.id}: missing task prompt.`);
    else {
      const body=readFileSync(join(root,taskPrompt),'utf8');
      for(const expected of [task.id,`**${EFFORT_LABELS[m.buildEffort]}** (\`${m.buildEffort}\`)`,
        `**${EFFORT_LABELS[m.reviewEffort]}** (\`${m.reviewEffort}\`)`,
        `**${EFFORT_LABELS[m.escalationEffort]}** (\`${m.escalationEffort}\`)`,m.reason,m.escalationTrigger])
        if(!body.includes(expected))errors.push(`${task.id}: task prompt routing mismatch.`);
    }
    if(safeRelativePath(task.phasePrompt)&&existsSync(join(root,task.phasePrompt))) {
      const phaseBody=readFileSync(join(root,task.phasePrompt),'utf8');
      const row=`| ${task.id} | ${EFFORT_LABELS[m.buildEffort]} | ${EFFORT_LABELS[m.reviewEffort]} | ${EFFORT_LABELS[m.escalationEffort]} |`;
      if(!phaseBody.includes(row))errors.push(`${task.id}: phase model table mismatch.`);
    }
  }

  for(const task of tasks?.tasks??[]) {
    if(safeRelativePath(task.phasePrompt)&&!existsSync(join(root,task.phasePrompt)))errors.push(`${task.id}: missing phase prompt.`);
    else if(safeRelativePath(task.phasePrompt)&&!readFileSync(join(root,task.phasePrompt),'utf8').includes(task.id))errors.push(`${task.id}: absent from phase prompt.`);
    if(!readFileSync(join(root,'TASKS.md'),'utf8').includes(task.id))errors.push(`${task.id}: absent from human task queue.`);
  }
  const audit=json('data/screenshot-audit.json');
  if(audit) {
    if(!safeRelativePath(audit.image)||!existsSync(join(root,audit.image)))errors.push('Screenshot input missing.');
    else if(hash(join(root,audit.image))!==audit.sha256)errors.push('Screenshot hash differs from audit.');
    const rows=audit.rows??[];
    const samples=rows.reduce((n,r)=>n+(r.samples?.length??0),0);
    const exact=rows.reduce((n,r)=>n+(r.samples??[]).filter(s=>s.exactMatch===true).length,0);
    if(rows.length!==audit.totals?.rows||samples!==audit.totals?.colorsCompared||exact!==audit.totals?.exactMatches)errors.push('Screenshot audit totals disagree.');
    for(const row of rows) {
      const pal=palettes?.palettes?.find(x=>x.id===row.id);
      if(!pal||JSON.stringify(row.samples)!==JSON.stringify(pal.screenshot?.samples)||pal.screenshot?.sha256!==audit.sha256)errors.push(`${row.id}: screenshot records disagree.`);
    }
  }
  const baseline=json('data/repository-baseline.json');
  for(const repo of baseline?.repositories??[]) {
    if(!/^[a-f0-9]{40}$/.test(repo.commit??''))errors.push(`${repo.id}: invalid baseline commit.`);
    if(repo.applicationExecutedHere!==false)errors.push(`${repo.id}: this workpack cannot claim an application test run.`);
    for(const id of repo.sourceIds??[])if(!sourceIds.has(id))errors.push(`${repo.id}: unresolved source ${id}.`);
  }
  const coverage=json('data/coverage.json');
  if(coverage?.scopeComplete!==false)errors.push('The research scope must remain explicitly incomplete.');
  const coverageIds=(coverage?.libraryCoverage??[]).flatMap(x=>x.paletteIds).sort();
  const paletteIds=(palettes?.palettes??[]).map(x=>x.id).sort();
  if(JSON.stringify(coverageIds)!==JSON.stringify(paletteIds))errors.push('Film coverage and palette IDs differ.');
  for(const name of readdirSync(root).filter(n=>n.endsWith('.md'))) {
    const text=readFileSync(join(root,name),'utf8');
    for(const id of text.match(/\b(?:SRC|INPUT)-[A-Z0-9-]+\b/g)??[])if(!sourceIds.has(id))errors.push(`${name}: unresolved source reference ${id}.`);
  }
  for(const path of ['schemas/model-routing.schema.json','schemas/palette.schema.json','schemas/evidence.schema.json','schemas/agent-handoff.schema.json']) {
    const schema=json(path);if(schema&&!schema.$schema)errors.push(`${path}: missing schema dialect.`);
  }
  if(p.counts.palettes!==22||p.counts.screenshotRows!==16||p.counts.screenshotSamples!==76)errors.push('Version 1 seed counts differ from the recorded scope.');
  if(t.count!==29||t.phases?.length!==7)errors.push('Version 1 task/phase counts differ from the execution scope.');
  return {schemaVersion:1,scope:'workpack-only',passed:errors.length===0,errors,
    counts:{...p.counts,tasks:t.count,phases:t.phases?.length??0,sources:sourceIds.size,modelRoutes:routing.count,buildEffortCounts:routing.buildEffortCounts},
    contrast:{minimumTextRatio:p.minimumTextRatio,minimumGraphicRatio:p.minimumGraphicRatio,roundingAppliedBeforeThreshold:false},
    limitations:['Not a full JSON Schema implementation.','No rendered UI, assistive-technology, host or Office application acceptance.','Screenshot pixels are replayed separately by the optional Python script.','No complete filmography, TE catalogue or current literature review.']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const unknown=process.argv.slice(2).filter(x=>x!=='--json');
    if(unknown.length)throw new Error('Usage: node scripts/validate-workpack.mjs [--json]');
    const result=validateWorkpack();
    if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
    else {console.log(`${result.passed?'PASS':'FAIL'} — workpack checks only`);console.log(JSON.stringify(result.counts));for(const err of result.errors)console.error(err);}
    if(!result.passed)process.exitCode=1;
  } catch(err){console.error(`Validation failed: ${err.message}`);process.exitCode=1;}
}
