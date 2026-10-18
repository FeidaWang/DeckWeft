/** Version inspection never changes the active project. Restoration creates a new id. */
export function mountHistory(app){
  const {state,$,t,x,json,dialogs,toast,onError,measurePreview,library,switchProject}=app;
  let projectId,selected,selectedPage=0,render,rows=[],nextBefore=null,epoch=0,loading=false,restoring=false,requestId=null,restoredId=null,controller;
  const dialog=$('#historyDialog');
  const error=message=>{$('#historyError').textContent=message||'';};
  function status(message){$('#historyStatus').textContent=message;}
  function sync(){
    $('#restoreSnapshot').disabled=!selected||loading||restoring||selected.unreadable;
    $('#historyOlder').disabled=loading||restoring||!nextBefore;$('#historyOlder').hidden=!nextBefore;
    $('#historyPrevious').disabled=!render||selectedPage===0;$('#historyNext').disabled=!render||selectedPage>=render.slides.length-1;
    $('#historyOpenCopy').hidden=!restoredId;$('#historyOpenCopy').disabled=restoring;
    dialog.dataset.busy=String(restoring);$('#historyRetry').disabled=loading||restoring;
    dialog.querySelectorAll('[data-close]').forEach(b=>b.disabled=restoring);
    dialog.querySelectorAll('[data-revision]').forEach(b=>b.disabled=restoring||rows.find(r=>r.revision===Number(b.dataset.revision))?.unreadable);
  }
  function paintRows(){
    $('#historyList').innerHTML=rows.map(row=>`<button data-revision="${row.revision}" class="revision-row ${selected?.project?.revision.number===row.revision?'selected':''}" aria-pressed="${selected?.project?.revision.number===row.revision}" ${row.unreadable?'disabled':''}><span class="revision-label">${t('Revision','版本')} ${row.revision}</span><strong>${x(row.title||t('Needs repair','需要修复'))}</strong><span>${row.unreadable?x(row.error):x(new Date(row.savedAt).toLocaleString(state.locale))}</span><small>${row.unreadable?t('Not changed or removed','未修改或删除'):t(`${row.slides} slides · read-only`,`${row.slides} 页 · 只读`)}</small></button>`).join('');
  }
  function paintPreview(){
    if(!selected)return;const p=selected.project;
    $('#historyMeta').textContent=t(`Revision ${p.revision.number} · ${p.slides.length} slides · ${p.aspectRatio} · ${p.theme}`,`版本 ${p.revision.number} · ${p.slides.length} 页 · ${p.aspectRatio} · ${p.theme}`);
    $('#historyPageCount').textContent=`${selectedPage+1} / ${p.slides.length}`;
    if(render){$('#historyCanvas').innerHTML=render.slides[selectedPage].svg;$('#historyMeasureNote').textContent=t('Read-only, browser-measured preview. The original remains unchanged.','只读、浏览器实测预览。原文稿保持不变。');}
    $('#historySourceHash').textContent=`SHA-256 ${selected.sha256.slice(0,16)}…`;
    sync();
  }
  async function loadPage(append=false){
    if(loading||restoring)return;const thisEpoch=++epoch;loading=true;sync();error('');status(t('Reading saved versions…','正在读取历史版本…'));
    try{
      const data=await json(`/api/projects/${projectId}/history?limit=10${append&&nextBefore?'&before='+nextBefore:''}`,undefined,'GET');
      if(thisEpoch!==epoch||!dialog.open)return;
      rows=append?[...rows,...data.snapshots]:data.snapshots;nextBefore=data.nextBefore;paintRows();status(rows.length?t(`${rows.length} earlier versions loaded. Latest saved revision: ${data.currentRevision}.`, `已载入 ${rows.length} 个历史版本。最新保存版本为 ${data.currentRevision}。`):t('No older versions yet. Edit and save once to keep the previous version here.','还没有历史版本。编辑并保存一次后，上一版会出现在这里。'));
    }catch(e){if(thisEpoch===epoch)error(e.message);}finally{if(thisEpoch===epoch){loading=false;sync();}}
  }
  async function choose(revision){
    if(restoring)return;controller?.abort();const thisEpoch=++epoch;controller=new AbortController();loading=true;selected=null;render=null;requestId=crypto.randomUUID();restoredId=null;selectedPage=0;sync();error('');$('#historyCanvas').textContent=t('Measuring this saved version…','正在测量这个历史版本…');
    try{
      const snapshot=await json(`/api/projects/${projectId}/history/${revision}`,undefined,'GET',controller.signal);
      if(thisEpoch!==epoch||!dialog.open)return;selected=snapshot;paintRows();paintPreview();
      const preview=await measurePreview(snapshot.project,snapshot.project.slides[0].id,{signal:controller.signal});
      if(thisEpoch!==epoch||!dialog.open)return;render=preview;paintPreview();
    }catch(e){if(thisEpoch===epoch&&e.name!=='AbortError'){error(e.message);$('#historyCanvas').textContent=t('This preview is unavailable. The snapshot has not been changed.','预览不可用。历史文件未被修改。');}}
    finally{if(thisEpoch===epoch){loading=false;sync();}}
  }
  async function open(){
    if(!state.project||state.saving||restoring)return;dialogs.closeDrawer();projectId=state.project.id;selected=null;render=null;rows=[];nextBefore=null;restoredId=null;requestId=null;loading=false;
    $('#historyList').replaceChildren();$('#historyCanvas').textContent=t('Choose a version on the left.','请在左侧选择一个版本。');$('#historyMeta').textContent='';$('#historySourceHash').textContent='';$('#historyPageCount').textContent='';$('#historyMeasureNote').textContent='';
    $('#historyDirty').hidden=!state.dirty;$('#historyDirty').textContent=t('Your current edits are not saved. Browsing is safe; a restored copy will not replace these edits.','当前修改尚未保存。浏览历史不会影响它们，恢复副本也不会覆盖当前修改。');
    dialogs.open(dialog,$('#openHistory'));sync();await loadPage();
  }
  async function restore(){
    if(!selected||loading||restoring)return;restoring=true;sync();error('');
    const snapshot=selected,source=projectId;
    try{
      const result=await json(`/api/projects/${source}/history/${snapshot.project.revision.number}/restore`,{mode:'copy',snapshotHash:snapshot.sha256,requestId});
      restoredId=result.project.id;await library();
      status(t(`Saved a new copy: ${result.project.title}. Your current deck is unchanged.`,`已保存新副本：${result.project.title}。当前文稿未改变。`));toast(t('Restored as a new copy. Open it when you are ready.','已恢复为新副本，可以在准备好后打开。'));
    }catch(e){error(e.message);}finally{restoring=false;sync();}
  }
  $('#openHistory').onclick=open;$('#historyRetry').onclick=()=>{if(!loading)loadPage();};$('#historyOlder').onclick=()=>loadPage(true);$('#restoreSnapshot').onclick=restore;
  $('#historyList').onclick=e=>{const b=e.target.closest('[data-revision]');if(b&&!b.disabled)choose(Number(b.dataset.revision));};
  $('#historyPrevious').onclick=()=>{if(render&&selectedPage>0){selectedPage--;paintPreview();}};$('#historyNext').onclick=()=>{if(render&&selectedPage<render.slides.length-1){selectedPage++;paintPreview();}};
  $('#historyOpenCopy').onclick=async()=>{if(!restoredId)return;const id=restoredId;dialog.close();await switchProject(id);};
  dialog.addEventListener('cancel',e=>{if(restoring)e.preventDefault();});
  dialog.addEventListener('close',()=>{controller?.abort();epoch++;loading=false;});
  window.addEventListener('deckweft:locale',()=>{if(dialog.open){paintRows();paintPreview();}});
}
