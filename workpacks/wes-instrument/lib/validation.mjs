/** Bounded semantic validators. Not a general JSON Schema evaluator. */
import {hexToRgb, hexToLab, deltaE76, deriveMode, auditRolePairs} from './color.mjs';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const array = x => Array.isArray(x) ? x : [];
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function safeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !/^[a-z]:/i.test(value) && !value.startsWith('/') &&
    !value.includes('\\') && !value.includes('\0') && value.split('/').every(x=> x !== '..' && x !== '.' && x !== '');
}
export function validatePaletteData(data, {sourceIds, baseline} = {}) {
  const errors = [], counts={palettes:0,modes:0,rolePairs:0,screenshotRows:0,screenshotSamples:0};
  let minimumTextRatio = Infinity, minimumGraphicRatio = Infinity;
  if (!object(data) || data.schemaVersion !== 1 || !Array.isArray(data.palettes) || !data.palettes.length) {
    return {errors:['Invalid palette root or missing palettes.'],counts};
  }
  const ids = new Set();
  for (const p of data.palettes) {
    const label=p?.id??'<unknown>';
    try {
      if (!object(p) || !/^[A-Za-z][A-Za-z0-9]*$/.test(p.id)) throw new Error('Invalid palette ID.');
      if (ids.has(p.id)) errors.push(`${label}: duplicate ID.`);
      ids.add(p.id);counts.palettes++;
      if (!object(p.source) || p.source.evidence !== 'library-values-verified' || p.source.filmFrameVerified !== false ||
        p.source.frameTimestamp !== null || p.source.officialPalette !== false) errors.push(`${label}: seed provenance cannot claim film-frame or official verification.`);
      if (!/^[a-f0-9]{40}$/.test(p.source?.gitBlobSha??'')) errors.push(`${label}: missing Git blob SHA.`);
      if (sourceIds && !sourceIds.has(p.source?.sourceId)) errors.push(`${label}: unresolved source ID.`);
      if (!Array.isArray(p.colors) || p.colors.length === 0) throw new Error('Missing colours.');
      const colors=p.colors.map(c=>c.hex);
      for (const c of p.colors) {
        const rgb=hexToRgb(c.hex),lab=hexToLab(c.hex);
        if (!same(rgb,c.rgb)) errors.push(`${label}: RGB differs from HEX ${c.hex}.`);
        if (!Array.isArray(c.labD65) || c.labD65.length !== 3 || c.labD65.some((v,i)=>!Number.isFinite(v) || Math.abs(v-lab[i])>1e-5)) errors.push(`${label}: Lab differs from computed D65 value ${c.hex}.`);
      }
      if (baseline && !same(colors,baseline[p.id])) errors.push(`${label}: source values differ from frozen transcription.`);
      for (const mode of ['light','dark','stage']) {
        const tokens=p.derivedModes?.[mode];
        if (!object(tokens)) {errors.push(`${label}/${mode}: missing tokens.`);continue;}
        counts.modes++;
        if (!same(tokens,deriveMode(colors,mode))) errors.push(`${label}/${mode}: tokens differ from derivation v1.`);
        for (const pair of auditRolePairs(tokens)) {
          counts.rolePairs++;
          if (pair.minimum===4.5) minimumTextRatio=Math.min(minimumTextRatio,pair.ratio);
          else minimumGraphicRatio=Math.min(minimumGraphicRatio,pair.ratio);
          if (!pair.pass) errors.push(`${label}/${mode}: ${pair.fg} on ${pair.bg} fails ${pair.minimum}:1 (${pair.ratio}).`);
        }
      }
      if (p.screenshot !== null) {
        counts.screenshotRows++;
        if (!object(p.screenshot) || !/^[a-f0-9]{64}$/.test(p.screenshot.sha256??'') || !Array.isArray(p.screenshot.samples)) throw new Error('Invalid screenshot metadata.');
        if (p.screenshot.samples.length !== p.colors.length) errors.push(`${label}: screenshot sample count mismatch.`);
        for (const [i,s] of p.screenshot.samples.entries()) {
          counts.screenshotSamples++;
          if(s.index!==i || s.libraryHex!==colors[i]) errors.push(`${label}: screenshot ordering mismatch.`);
          if(s.exactMatch!==(s.sampleHex===s.libraryHex)) errors.push(`${label}: screenshot exact-match flag incorrect.`);
          const d=deltaE76(hexToLab(s.sampleHex),hexToLab(s.libraryHex));
          if(!Number.isFinite(s.deltaE76)||Math.abs(d-s.deltaE76)>1e-5) errors.push(`${label}: screenshot delta incorrect.`);
          if(!Array.isArray(s.roi)||s.roi.length!==4||s.roi.some(v=>!Number.isSafeInteger(v)||v<0)||s.roi[2]-s.roi[0]!==7||s.roi[3]-s.roi[1]!==7||s.roi[2]>439||s.roi[3]>698) errors.push(`${label}: screenshot crop invalid.`);
        }
      }
    } catch(err) {errors.push(`${label}: ${err.message}`);}
  }
  for(const [alias,target] of Object.entries(data.aliases??{})) {
    if(ids.has(alias)||!ids.has(target)||alias===target) errors.push(`Invalid alias ${alias} -> ${target}.`);
  }
  if (baseline && Object.keys(baseline).length!==ids.size) errors.push('Palette count differs from frozen transcription.');
  return {errors,counts,minimumTextRatio,minimumGraphicRatio};
}
export function validateTasks(data) {
  const errors=[];
  if(!object(data)||data.schemaVersion!==1||!Array.isArray(data.tasks)||!data.tasks.length) return {errors:['Invalid task root.'],count:0};
  const map=new Map();
  for(const t of data.tasks) {
    if(!object(t)||!/^DWI-\d{3}$/.test(t.id??'')) {errors.push('Invalid task ID.');continue;}
    if(map.has(t.id)) errors.push(`${t.id}: duplicate task.`);
    map.set(t.id,t);
    if(!Number.isInteger(t.phase)||t.phase<0||t.phase>6) errors.push(`${t.id}: invalid phase.`);
    if(!['P0','P1','P2'].includes(t.priority)) errors.push(`${t.id}: invalid priority.`);
    if(!['planned','in-progress','blocked','implemented','accepted','deferred'].includes(t.status)) errors.push(`${t.id}: invalid state.`);
    if(!Array.isArray(t.dependsOn)||t.dependsOn.some(d=>typeof d!=='string')) errors.push(`${t.id}: invalid dependencies.`);
    if(!Array.isArray(t.acceptance)||!t.acceptance.length||t.acceptance.some(x=>typeof x!=='string'||!x.trim())) errors.push(`${t.id}: missing acceptance.`);
    for(const field of ['phasePrompt','testFile','evidenceDirectory']) if(!safeRelativePath(t[field])) errors.push(`${t.id}: invalid ${field}.`);
    if(typeof t.implementation!=='string'||!t.implementation.trim()) errors.push(`${t.id}: missing implementation.`);
  }
  for(const t of map.values()) for(const dep of array(t.dependsOn)) {
    if(!map.has(dep)) errors.push(`${t.id}: missing dependency ${dep}.`);
    else if(map.get(dep).phase>t.phase) errors.push(`${t.id}: dependency points to a later phase.`);
  }
  const visiting=new Set(),visited=new Set();
  function visit(id) {
    if(visiting.has(id)) {errors.push(`Dependency cycle at ${id}.`);return;}
    if(visited.has(id)||!map.has(id))return;
    visiting.add(id);
    for(const dep of array(map.get(id).dependsOn))visit(dep);
    visiting.delete(id);visited.add(id);
  }
  for(const id of map.keys())visit(id);
  return {errors,count:data.tasks.length,phases:[...new Set(data.tasks.map(t=>t.phase))].sort()};
}
export function validateEvidence(record) {
  const errors=[];
  if(!object(record))return ['Evidence must be an object.'];
  if(record.schemaVersion!==1)errors.push('Evidence schema version must be 1.');
  if(!/^DWI-\d{3}$/.test(record.taskId??''))errors.push('Missing task ID.');
  if(!Number.isInteger(record.phase)||record.phase<0||record.phase>6)errors.push('Invalid phase.');
  if(!['planned','implemented','blocked','accepted'].includes(record.state))errors.push('Invalid state.');
  if(!['local-code','browser','host','office'].includes(record.scope))errors.push('Invalid evidence scope.');
  if(!object(record.environment)||!record.environment.node||!record.environment.os)errors.push('Missing environment.');
  if(!Array.isArray(record.limitations))errors.push('Missing limitations.');
  if(record.sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(record.sourceCommit??''))errors.push('Invalid commit.');
  if(!Array.isArray(record.checks))errors.push('Missing checks.');
  for(const c of array(record.checks)) {
    if(!object(c)) {errors.push('Invalid check.');continue;}
    if(typeof c.command!=='string'||!c.command.trim()||!['pass','fail','skipped','not-run'].includes(c.status))errors.push('Invalid check command/status.');
    if(!Array.isArray(c.artifactPaths)||c.artifactPaths.some(x=>!safeRelativePath(x)))errors.push('Invalid artifact paths.');
    if(c.status==='pass'&&(c.exitCode!==0||!c.artifactPaths?.length))errors.push('Passing checks require exit code 0 and artifacts.');
    if(['skipped','not-run'].includes(c.status)&&c.exitCode!==null)errors.push('Unrun checks must have null exit codes.');
    if(c.status==='fail'&&!(c.exitCode===null||Number.isInteger(c.exitCode)&&c.exitCode!==0))errors.push('Failing checks cannot use success exit code.');
  }
  if(record.state==='accepted'&&(!record.sourceCommit||!array(record.checks).length||array(record.checks).some(c=>c?.status!=='pass')))errors.push('Accepted evidence requires a commit and actual passing checks, not skipped work.');
  if(['host','office'].includes(record.scope)&&record.state==='accepted'&&(!record.environment?.host||!record.environment?.hostVersion))errors.push('Host/Office acceptance requires actual host name and version.');
  return errors;
}
