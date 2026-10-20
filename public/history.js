import {historyCapacityNote} from './history-capacity.js';
import {t} from './i18n.js';
/** Version inspection never changes the active project. Restoration creates a new id. */
export function mountHistory(app){
  const {state,$,x,json,dialogs,toast,onError,measurePreview,library,switchProject}=app;
  let projectId,selected,selectedPage=0,render,rows=[],nextBefore=null,epoch=0,loading=false,restoring=false,requestId=null,restoredId=null,controller,usage;
  const dialog=$('#historyDialog');
  const error=message=>{$('#historyError').textContent=message||'';};
  function status(message){$('#historyStatus').textContent=message;}
  function capacity(){const note=historyCapacityNote(usage);$('#historyCapacity').textContent=note;$('#historyCapacity').hidden=!note;}
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
    $('#historyList').innerHTML=rows.map(row=>`<button data-revision="${row.revision}" class="revision-row ${selected?.project?.revision.number===row.revision?'selected':''}" aria-pressed="${selected?.project?.revision.number===row.revision}" ${row.unreadable?'disabled':''}><span class="revision-label">${t('classic.history.revision')} ${row.revision}</span><strong>${x(row.title||t('classic.history.needsRepair'))}</strong><span>${row.unreadable?x(row.error):x(new Date(row.savedAt).toLocaleString(state.locale))}</span><small>${row.unreadable?t('classic.history.notChangedOrRemoved'):t('classic.history.slidesReadOnly',{slides:row.slides})}</small></button>`).join('');
  }
  function paintPreview(){
    if(!selected)return;const p=selected.project;
    $('#historyMeta').textContent=t('classic.history.revisionSlides',{number:p.revision.number,slidesCount:p.slides.length,aspectRatio:p.aspectRatio,theme:p.theme});
    $('#historyPageCount').textContent=`${selectedPage+1} / ${p.slides.length}`;
    if(render){$('#historyCanvas').innerHTML=render.slides[selectedPage].svg;$('#historyMeasureNote').textContent=t('classic.history.readOnlyBrowserMeasuredPreviewThe');}
    $('#historySourceHash').textContent=`SHA-256 ${selected.sha256.slice(0,16)}…`;
    sync();
  }
  async function loadPage(append=false){
    if(loading||restoring)return;const thisEpoch=++epoch;loading=true;sync();error('');status(t('classic.history.readingSavedVersions'));
    try{
      const data=await json(`/api/projects/${projectId}/history?limit=10${append&&nextBefore?'&before='+nextBefore:''}`,undefined,'GET');
      if(thisEpoch!==epoch||!dialog.open)return;
      rows=append?[...rows,...data.snapshots]:data.snapshots;nextBefore=data.nextBefore;usage=data.usage;capacity();paintRows();status(rows.length?t('classic.history.earlierVersionsLoadedLatestSavedRevision',{rowsCount:rows.length,currentRevision:data.currentRevision}):t('classic.history.noOlderVersionsYetEditAnd'));
    }catch(e){if(thisEpoch===epoch)error(e.message);}finally{if(thisEpoch===epoch){loading=false;sync();}}
  }
  async function choose(revision){
    if(restoring)return;controller?.abort();const thisEpoch=++epoch;controller=new AbortController();loading=true;selected=null;render=null;requestId=crypto.randomUUID();restoredId=null;selectedPage=0;sync();error('');$('#historyCanvas').textContent=t('classic.history.measuringThisSavedVersion');
    try{
      const snapshot=await json(`/api/projects/${projectId}/history/${revision}`,undefined,'GET',controller.signal);
      if(thisEpoch!==epoch||!dialog.open)return;selected=snapshot;paintRows();paintPreview();
      const preview=await measurePreview(snapshot.project,snapshot.project.slides[0].id,{signal:controller.signal});
      if(thisEpoch!==epoch||!dialog.open)return;render=preview;paintPreview();
    }catch(e){if(thisEpoch===epoch&&e.name!=='AbortError'){error(e.message);$('#historyCanvas').textContent=t('classic.history.thisPreviewIsUnavailableTheSnapshot');}}
    finally{if(thisEpoch===epoch){loading=false;sync();}}
  }
  async function open(){
    if(!state.project||state.saving||restoring)return;dialogs.closeDrawer();projectId=state.project.id;selected=null;render=null;rows=[];usage=null;capacity();nextBefore=null;restoredId=null;requestId=null;loading=false;
    $('#historyList').replaceChildren();$('#historyCanvas').textContent=t('classic.history.chooseAVersionOnTheLeft');$('#historyMeta').textContent='';$('#historySourceHash').textContent='';$('#historyPageCount').textContent='';$('#historyMeasureNote').textContent='';
    $('#historyDirty').hidden=!state.dirty;$('#historyDirty').textContent=t('classic.history.yourCurrentEditsAreNotSaved');
    dialogs.open(dialog,$('#openHistory'));sync();await loadPage();
  }
  async function restore(){
    if(!selected||loading||restoring)return;restoring=true;sync();error('');
    const snapshot=selected,source=projectId;
    try{
      const result=await json(`/api/projects/${source}/history/${snapshot.project.revision.number}/restore`,{mode:'copy',snapshotHash:snapshot.sha256,requestId});
      restoredId=result.project.id;await library();
      status(t('classic.history.savedANewCopyYourCurrent',{title:result.project.title}));toast(t('classic.history.restoredAsANewCopyOpen'));
    }catch(e){error(e.message);}finally{restoring=false;sync();}
  }
  $('#openHistory').onclick=open;$('#historyRetry').onclick=()=>{if(!loading)loadPage();};$('#historyOlder').onclick=()=>loadPage(true);$('#restoreSnapshot').onclick=restore;
  $('#historyList').onclick=e=>{const b=e.target.closest('[data-revision]');if(b&&!b.disabled)choose(Number(b.dataset.revision));};
  $('#historyPrevious').onclick=()=>{if(render&&selectedPage>0){selectedPage--;paintPreview();}};$('#historyNext').onclick=()=>{if(render&&selectedPage<render.slides.length-1){selectedPage++;paintPreview();}};
  $('#historyOpenCopy').onclick=async()=>{if(!restoredId)return;const id=restoredId;dialog.close();await switchProject(id);};
  dialog.addEventListener('cancel',e=>{if(restoring)e.preventDefault();});
  dialog.addEventListener('close',()=>{controller?.abort();epoch++;loading=false;});
  window.addEventListener('deckweft:locale',()=>{if(dialog.open){capacity();paintRows();paintPreview();}});
}
