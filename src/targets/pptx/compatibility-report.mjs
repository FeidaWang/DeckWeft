/**
 * The export report for one deck (S7, VIS-016): declared levels per component and format, the export order receipts, every
 * per-element receipt, and four separate results — PowerPoint editability, PDF searchability, accessibility and visual
 * fidelity. Application compatibility is stated only from runs in that application; everything else is listed as a check
 * still to do on the user's machine.
 */
import {taskEvidence,evidenceMarkdown} from '../../quality/task-evidence.mjs';
/** Checks only PowerPoint or Keynote can answer, with what Quick Look showed for each. */
export const APPLICATION_CHECKS=[
 {id:'open',check:'Open every .pptx in PowerPoint and in Keynote: no repair prompt, no import warning, every slide present.',quickLook:'Quick Look rendered every slide; it is not PowerPoint or Keynote.'},
 {id:'edit-data',check:'Use Edit Data on each native chart: the embedded workbook opens and holds the values the chart shows.',quickLook:'Not testable; the workbook was parsed independently and equals the chart caches.'},
 {id:'focus-colours',check:'Ranked and grouped bars: the focused category is solid and the others pale with an outline (per-point fills).',quickLook:'Quick Look ignores per-point fills and draws every bar solid.'},
 {id:'chart-details',check:'Native charts: markers, dashes, value labels, end labels, first/last time labels and the value-axis steps.',quickLook:'Quick Look ignores markers, dashes, data labels, label skipping and the axis step.'},
 {id:'gaps',check:'Charts with a missing value are images (L3) in this release. Before compiling them natively: in PowerPoint and Keynote a missing value must stay a gap on its own category, never zero, and later values must keep their categories.',quickLook:'Quick Look moves later values onto earlier categories when a point is omitted, and draws #N/A as zero.'},
 {id:'text-fit',check:'Headings and paragraphs wrap as on the web; negative letter-spacing is applied.',quickLook:'Quick Look ignores negative letter-spacing and wraps some 5–6 pt chrome text despite wrap="none".'},
 {id:'fonts',check:'The fonts listed in the report are installed; otherwise the application substitutes them and line breaks change. Fonts are not embedded.',quickLook:'Rendered with this Mac’s fonts.'},
 {id:'freeform-colour',check:'Free-form decorative shapes have the same colour as rectangles of the same value.',quickLook:'Quick Look draws free-form shapes slightly lighter than the stored colour.'},
 {id:'accessibility',check:'Run PowerPoint’s Accessibility Checker and a screen reader: slide titles, alt text, reading order, decorative marks, table headers.',quickLook:'Not testable.'},
 {id:'keynote-objects',check:'Keynote: charts, tables, connectors and notes import as editable objects.',quickLook:'Not testable.'}
];
const group=receipts=>{const by={};for(const r of receipts){(by[r.code]||=[]).push(r);}return Object.entries(by).map(([code,items])=>{const same=items.every(r=>r.delivered===items[0].delivered);return {code,count:items.length,reason:items[0].reason,delivered:same?items[0].delivered:null,elements:items.map(r=>({sceneId:r.sceneId||null,blockId:r.blockId||null,element:r.element,...(same?{}:{delivered:r.delivered})}))};});};

export function exportReport({deck,document,plan,pptx,pdf,fidelity,environment,applications,task}){
 const run=pptx.run,audit=run.check,receipts=run.output.receipts,levels=run.levels;
 const fonts=[...new Set([...(run.ready.fonts||[]),...(pdf.run?.ready.fonts||[])])].sort();
 const results={
  pptxEditability:{status:audit.editability.status==='pass'&&(!pptx.inspection||pptx.inspection.status==='pass')?'pass':'fail',compiler:audit.editability,independent:pptx.inspection?{status:pptx.inspection.status,failures:pptx.inspection.failures,missingText:pptx.inspection.missingText,chartsChecked:pptx.inspection.chartsChecked}:{status:'not-run'},sceneCheck:audit.sceneCheck},
  pdfSearchability:pdf.searchability||{status:'not-run'},
  accessibility:{status:[audit.accessibility.status,pdf.accessibility?.status||'not-run'].every(s=>s==='pass')?'pass':[audit.accessibility.status,pdf.accessibility?.status].includes('fail')?'fail':'partial',pptx:audit.accessibility,pdf:pdf.accessibility||{status:'not-run'},notTested:['screen readers','PowerPoint Accessibility Checker','PDF/UA validation']},
  visualFidelity:fidelity||{status:'not-run'},
  typography:audit.typography||{status:'not-run'}
 };
 return {format:'deckweft-export-report',version:1,deck,locale:document.locale,title:document.title,environment,
  levels:levels.map(l=>({blockId:l.blockId,component:l.variant,web:l.html.level,pdf:l.pdf.level,pptx:l.pptx.level,pptxRepresentation:l.pptx.representation})),
  levelCounts:Object.fromEntries(['html','pdf','pptx'].map(f=>[f==='html'?'web':f,Object.fromEntries(['L1','L2','L3'].map(k=>[k,levels.filter(l=>l[f].level===k).length]))])),
  exportOrder:{pptx:run.order,pdf:pdf.run?.order||null},
  receipts:group(receipts),
  results,
  evidence:taskEvidence(task,{document,plan}),
  pagination:run.output.pagination||[],
  delivery:run.delivery.frozen.map((s,i)=>({sceneId:s.sceneId,staticState:run.delivery.states[i].keyStateId,interactions:s.interactions.map(v=>({id:v.id,kind:v.kind,rule:v.rule,delivered:v.delivery})),motion:run.delivery.motion[i]})),
  fonts:{used:fonts,embedded:false,note:'Fonts are referenced by name, never embedded or redistributed. A machine without them substitutes another face.'},
  files:{pptxBytes:run.output.bytes.length,slides:run.output.slides.length,charts:run.output.charts.length,pictures:run.output.media,pdfPages:pdf.inspection?.pageCount??null},
  applications,
  applicationChecks:APPLICATION_CHECKS
 };
}

/** 'fail · accepted by author at <time>' when the author accepted text below the minimum (F1); the status alone otherwise. */
export const typographyStatus=t=>!t?'not-run':t.acceptedBy?`${t.status} · accepted by ${t.acceptedBy} at ${t.acceptedAt}`:t.status;
/** A short Markdown summary of one report, for review records. */
export function reportMarkdown(r){
 const row=(k,v)=>`| ${k} | ${v} |`;
 return [`# Export report · ${r.deck}`,'',`${r.title} (${r.locale}) · ${r.files.slides} slides · ${r.files.charts} native charts · ${r.files.pictures} pictures · PDF ${r.files.pdfPages??'not printed'} pages`,'',
  '| Result | Status |','|---|---|',row('PowerPoint editability',r.results.pptxEditability.status),row('Page check against the derived scene',r.results.pptxEditability.sceneCheck.status),row('PDF searchability',r.results.pdfSearchability.status),row('Accessibility (package checks)',r.results.accessibility.status),row('Typography (presentable text size by role)',typographyStatus(r.results.typography)),row('Visual fidelity',r.results.visualFidelity.status),'',
  '| Level | Web | PDF | PowerPoint |','|---|---|---|---|',...['L1','L2','L3'].map(k=>`| ${k} | ${r.levelCounts.web[k]} | ${r.levelCounts.pdf[k]} | ${r.levelCounts.pptx[k]} |`),'',
  '## Receipts','',...(r.receipts.length?r.receipts.flatMap(g=>g.delivered?[`- \`${g.code}\` × ${g.count}: ${g.reason} ${g.delivered}`]:[`- \`${g.code}\` × ${g.count}: ${g.reason}`,...g.elements.map(e=>`  - ${e.sceneId||''} ${e.element}: ${e.delivered}`)]):['None.']),'',
  evidenceMarkdown(r.evidence||taskEvidence(null)),
  '## Fonts referenced, not embedded','',r.fonts.used.join(', ')||'None measured.','',
  '## Applications','',...Object.entries(r.applications).map(([k,v])=>`- ${k}: ${v.state}${v.detail?` — ${v.detail}`:''}`),''].join('\n');
}
