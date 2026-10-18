export function revisionScope(project,active,scope){if(!project)throw Error('Generate or choose a saved source first.');return scope==='page'?[active]:project.plan.scenes.map(s=>s.id);}
export function renderProgress(root,record,t){
 const output=root.querySelector('#workbenchProgress');output.dataset.status=record.status;
 const labels={running:['Working…','处理中…'],planned:['Preparing your story…','正在准备作品…'],'browser-capture':['Preview ready · image capture needed for export','预览已就绪 · 导出前需要截图'],'actual-image-review':['Preview ready · inspect the captured images','预览已就绪 · 请检查实际截图'],exported:['Reviewed work ready to export','作品已通过审阅，可以导出'],blocked:['Needs attention · your source is retained','需要处理问题 · 原文已保留'],cancelled:['Cancelled · your checkpoint is retained','已取消 · 恢复记录已保留'],'quality-repair':['Some pages need repair','部分页面需要修复'],'review-required':['Image review needed','需要审阅画面']};
 output.textContent=t(...(labels[record.running?'running':record.status]||['Review the operation details','请查看操作详情']));
 root.querySelector('#workbenchDiagnostics').textContent=record.error?.message||record.diagnostics?.at(-1)?.message||record.receipt?.review?.judgment||'';
 root.querySelector('#workbenchExport').disabled=!record.canExport;root.querySelector('#workbenchLastValid').disabled=!record.hasLastValid;root.querySelector('#workbenchCancel').disabled=!record.running;
 root.querySelector('#workbenchEvents').textContent=(record.events||[]).slice(-8).map(e=>e.tool+' · '+e.status).join('\n');
}
