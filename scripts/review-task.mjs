// Bind explicit pixel judgments to current task, screenshot bytes and renderer.
import path from 'node:path';
import {parseArgs} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {executeVisualTool} from '../src/agent/tools.mjs';
import {contentHash} from '../src/scene/web/compile.mjs';
const {values:a}=parseArgs({options:{out:{type:'string',default:'dist/visual-task'},reviews:{type:'string'}}}),out=path.resolve(a.out);
if(!a.reviews)throw Error('Supply --reviews with actual image judgments, after viewing captures.');
const reviews=JSON.parse(await readFile(a.reviews,'utf8')),summaries=[];
for(const entry of reviews){
 if(!/^[a-zA-Z0-9_-]+\.task\.json$/.test(entry.task))throw Error('Choose a task checkpoint filename in the output folder.');
 let task=JSON.parse(await readFile(path.join(out,entry.task),'utf8'));
 for(const c of task.receipt.captures){if(!/^[a-zA-Z0-9_.-]+$/.test(c.file)||createHash('sha256').update(await readFile(path.join(out,c.file))).digest('hex')!==c.sha256)throw Error('Changed capture invalidates image review.');}
 const htmlFile=task.receipt.captures[0].file.replace(/-1440\.png$/,'.html');
 if(contentHash(await readFile(path.join(out,htmlFile),'utf8'))!==task.previewHash)throw Error('Changed HTML invalidates review.');
 let r=await executeVisualTool(task,'render.inspect',{expectedSequence:task.sequence,review:entry.review},{home:out});if(!r.ok)throw Error(JSON.stringify(r.error));task=r.task;
 r=await executeVisualTool(task,'artifact.export',{expectedSequence:task.sequence,format:'html'},{home:out});if(!r.ok)throw Error(JSON.stringify(r.error));task=r.task;
 const file=entry.task.replace('.task.json','.html');await writeFile(path.join(out,file),r.value.body);await writeFile(path.join(out,entry.task),JSON.stringify(task,null,2));summaries.push({task:entry.task,status:task.status,receiptId:task.receipt.id,artifact:file,htmlHash:r.value.htmlHash});
}
// Preserve the accepted export as an explicit recovery point for the next scoped run.
const accepted=JSON.parse(await readFile(path.join(out,'after.task.json'),'utf8'));const failure=JSON.parse(await readFile(path.join(out,'failure.task.json'),'utf8'));await writeFile(path.join(out,'last-valid.html'),accepted.lastValid.artifact);
const stale=structuredClone(accepted);stale.project.document.blocks[0].text+=' (revision)';const refused=await executeVisualTool(stale,'artifact.export',{expectedSequence:stale.sequence,format:'html'},{home:out});if(refused.ok||refused.error.code!=='STALE_RECEIPT')throw Error('Stale review was not refused.');
await writeFile(path.join(out,'final.json'),JSON.stringify({summaries,failure:{status:failure.status,lastValidHash:accepted.lastValid.htmlHash,diagnostics:failure.diagnostics},staleReceipt:refused.error},null,2));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DeckWeft — one local task</title><style>body{font:17px system-ui;background:#f3eddf;color:#191919;margin:40px auto;padding:0 24px;max-width:1100px}h1{font-family:Georgia;font-size:52px}article{background:white;padding:24px;margin:20px 0;border-top:4px solid #ff5638}a{color:#2455c8}img{max-width:100%}p{line-height:1.5}code{overflow-wrap:anywhere}</style><h1>One local presentation task<br>一个本地演示任务</h1><p>Real isolated-browser orchestration + actual image review. Host/model invocation not performed. / 真实浏览器编排与实际看图审阅；未调用宿主模型。</p>${summaries.map(s=>`<article><h2>${s.task.startsWith('before')?'1 · Complete supplied story / 完整故事':s.task.startsWith('after')?'2 · Only page 4 becomes an exact-data chart / 只修改第 4 页':'3 · Bounded composition repair / 有界构图修复'}</h2><p><a href="${s.artifact}">Open reviewed HTML / 打开已审阅结果</a> · <a href="${s.task}">Recover task / 恢复任务</a></p><p>${esc(s.status)} · Receipt ${s.receiptId}</p></article>`).join('')}<article><h2>4 · Failure recovery / 失败恢复</h2><p>Two rounds refuse author-locked layout changes. Missing data and stale revisions retain diagnostics. / 两轮均拒绝改动作者锁定构图，缺数据与过期修订保留诊断。</p><a href="last-valid.html">Last valid output / 最近有效结果</a> · <a href="failure.task.json">Failed source and diagnostics / 失败源与诊断</a> · <a href="recovery.task.json">Accepted-artifact recovery checkpoint / 有效产物恢复检查点</a> · <a href="accepted-recovery.json">Recovery verification / 恢复验证</a> · <a href="browser.json">Actual browser report / 真实浏览器报告</a> · <a href="final.json">Final export verification / 最终验证</a></article></html>`);
console.log(JSON.stringify({summaries,staleReceipt:refused.error.code,recovery:'last valid bytes retained'},null,2));
