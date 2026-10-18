import {speechStats} from '/shared/speech.mjs';
export function mountAgentBridge({state,$,json,dialogs,onError,canLeave,activate,library,pitchMode}){
 let status=null,jobId=null,requestId=null,poll=null,snapshot=null;
 const dialog=$('#agentDialog'),statusText=$('#agentStatus'),error=$('#agentError');
 function fail(e){error.textContent=e.message||String(e);}
 function clearPoll(){clearTimeout(poll);poll=null;}
 function sync(){
  $('#agentEnglish').disabled=pitchMode||!!jobId;$('#agentConsent').disabled=!!jobId;$('#agentWordTarget').textContent=`About ${Number($('#agentMinutes').value)*Number($('#agentWpm').value)} spoken words in speaker notes. Keep slide text short.`;
  $('#agentGenerate').disabled=!$('#agentMinutes').checkValidity()||!$('#agentWpm').checkValidity()||!status?.workers?.some(w=>w.id===$('#agentWorker').value&&w.connected)||!$('#agentConsent').checked||!$('#agentBrief').value.trim()||!!jobId;
  for(const id of ['agentMinutes','agentWpm','agentBrief','agentModel','agentEffort','agentWorker','agentConversationId','agentConversationText'])$('#'+id).disabled=!!jobId;
  $('#agentEnable').textContent=status?.enabled?'Disable bridge':'Enable local bridge';
  statusText.textContent=status?.connected?`Connected: ${status.agent.name}. Host reports ${status.agent.reportedModel}.`:status?.enabled?'Waiting for a connected agent. Generation is unavailable until it connects.':'Bridge is off. Your project stays local.';
 }
 async function refresh(){status=await json('/api/agent/status',undefined,'GET');const selected=$('#agentWorker').value;$('#agentWorker').replaceChildren(...(status.workers||[]).map(w=>{const o=document.createElement('option');o.value=w.id;o.disabled=!w.connected;o.textContent=w.name+' · '+w.reportedModel+(w.connected?(w.activeJobId?' · working':''):' · disconnected');return o;}));$('#agentWorkers').replaceChildren(...(status.workers||[]).map(w=>{const li=document.createElement('li');li.textContent=w.name+' · '+(w.connected?w.status:'disconnected')+' · '+w.validatedArtifacts+' validated artifacts'+(w.progress?' · '+w.progress.validatedPercent+'% validated · '+w.progress.currentTask+' · '+w.progress.elapsedSeconds+'s elapsed · '+(w.progress.eta.message||('Estimated '+w.progress.eta.seconds.join('–')+'s')):'');return li;}));if([...$('#agentWorker').options].some(o=>o.value===selected))$('#agentWorker').value=selected;sync();}
 async function watch(){
  if(!dialog.open)return;
  try{
   await refresh();
   if(jobId){
    const job=await json(`/api/agent/jobs/${jobId}`,undefined,'GET');
    $('#agentBrief').value=job.request.brief;$('#agentConsent').checked=true;$('#agentModel').value=job.model?.requested?.model??'any';$('#agentEffort').value=job.model?.requested?.effort??'medium';$('#agentMinutes').value=job.request.presentation?.minutes??'';$('#agentWpm').value=job.request.presentation?.wpm??'';$('#agentWordTarget').textContent=job.request.presentation?`About ${job.request.presentation.minutes*job.request.presentation.wpm} spoken words requested.`:'No speaking-time target was requested for this job.';
    $('#agentTimelinePanel').hidden=false;$('#agentValidated').value=job.progress.validatedPercent;$('#agentWorkSummary').textContent=`${job.progress.validatedPercent}% validated work · ${job.progress.currentTask} · ${job.progress.elapsedSeconds}s elapsed${job.progress.indeterminate?' · Host turn: indeterminate':''}`;$('#agentETA').textContent=job.progress.eta.state==='estimated'?`Estimated remaining ${job.progress.eta.seconds.join('–')}s · ${job.progress.eta.confidence} confidence · ${job.progress.eta.sampleCount} comparable runs`:job.progress.eta.message;
    $('#agentTimeline').replaceChildren(...job.events.map(e=>{const li=document.createElement('li');li.textContent=`#${e.sequence} · ${e.type} · ${e.summary}`;return li;}));$('#agentGrant').textContent=JSON.stringify({grant:job.grant,model:job.model,capsuleHash:job.capsuleHash},null,2);$('#agentResume').hidden=!['expired','failed'].includes(job.status);$('#agentNew').hidden=!['blocked','expired','failed','needs-review','applied'].includes(job.status);
    if(job.blockReason)$('#agentError').textContent=job.blockReason;
    $('#agentCancel').disabled=!['queued','running','blocked','needs-review'].includes(job.status);$('#agentProgress').textContent=job.expired?'The agent lease expired. Cancel this job and request a new draft.':job.status==='running'?'Your agent is preparing a draft. Your current deck is unchanged.':`Draft status: ${job.status}.`;
    if(['needs-review','applied'].includes(job.status)){
     $('#agentNew').hidden=false;
     $('#agentReview').hidden=false;$('#agentReviewTitle').textContent=job.result.title;const stats=speechStats(job.result,{wpm:Number($('#agentWpm').value)||130,minutes:Number($('#agentMinutes').value)||5});$('#agentReviewStats').textContent=`${job.result.slides.length} slides · ${stats.words} spoken words · ${Math.round(stats.spokenSeconds)} seconds at ${stats.wpm} wpm. Review before saving.`;
     $('#agentReviewSlides').replaceChildren(...job.result.slides.map(s=>{const li=document.createElement('li');li.textContent=s.content.title;return li;}));
     $('#agentReviewJSON').textContent=JSON.stringify(job.result,null,2);$('#agentApply').disabled=job.status==='applied';$('#agentCancel').disabled=job.status==='applied';clearPoll();return;
    }
    if(job.status==='cancelled'){jobId=null;requestId=null;$('#agentCancel').disabled=true;sync();}
   }
  }catch(e){fail(e);}poll=setTimeout(watch,2500);
 }
 $('#openAgent').onclick=async()=>{
  if(!state.project)return;error.textContent='';snapshot=structuredClone(state.project);requestId=null;jobId=null;
  $('#agentReview').hidden=true;$('#agentApply').disabled=true;$('#agentCancel').disabled=true;$('#agentProgress').textContent='';$('#agentConsent').checked=false;
  $('#agentNew').hidden=true;$('#agentResume').hidden=true;$('#agentTimelinePanel').hidden=true;dialogs.closeDrawer();dialogs.open(dialog,$('#openAgent'));
  try{await refresh();jobId=status.jobs.filter(j=>j.sourceProjectId===snapshot.id&&j.status!=='cancelled'&&j.kind==='deck-generation').at(-1)?.id||null;}catch(e){fail(e);}watch();
 };
 $('#agentEnable').onclick=async()=>{try{await json('/api/agent/enable',{enabled:!status?.enabled,consent:true});await refresh();}catch(e){fail(e);}};
 $('#agentCopyTask').onclick=async()=>{try{const config=await json('/api/agent/config',undefined,'GET');await navigator.clipboard.writeText(config.dotTask+'\n\nConnection details:\n'+JSON.stringify(config,null,2));$('#agentProgress').textContent='Task copied. Send it to Dot on this computer, then return here. The bridge must be enabled.';}catch(e){fail(e);}};
 $('#agentDetails').onclick=async()=>{try{$('#agentConfig').textContent=JSON.stringify(await json('/api/agent/config',undefined,'GET'),null,2);$('#agentSetup').hidden=false;}catch(e){fail(e);}};
 for(const id of ['agentConsent','agentBrief','agentMinutes','agentWpm','agentEnglish','agentModel','agentEffort'])$('#'+id).addEventListener('input',sync);
 $('#agentGenerate').onclick=async()=>{
  if(!status?.connected||!snapshot||jobId)return;$('#agentGenerate').disabled=true;error.textContent='';
  try{
   requestId||=crypto.randomUUID().replaceAll('-','');const job=await json('/api/agent/jobs',{project:snapshot,workerId:$('#agentWorker').value,...($('#agentConversationText').value?{selectedConversation:{id:$('#agentConversationId').value,text:$('#agentConversationText').value}}:{}),brief:$('#agentBrief').value,consent:$('#agentConsent').checked,requestId,englishOnly:pitchMode||$('#agentEnglish').checked,policy:{model:$('#agentModel').value,effort:$('#agentEffort').value,required:$('#agentModel').value!=='any',maxMinutes:10},presentation:{minutes:Number($('#agentMinutes').value),wpm:Number($('#agentWpm').value)}});
   jobId=job.id;$('#agentCancel').disabled=false;sync();clearPoll();watch();
  }catch(e){fail(e);sync();}
 };
 $('#agentCancel').onclick=async()=>{try{await json(`/api/agent/jobs/${jobId}/cancel`,{});jobId=null;requestId=null;$('#agentCancel').disabled=true;sync();clearPoll();watch();}catch(e){fail(e);}};
 $('#agentResume').onclick=async()=>{try{await json(`/api/agent/jobs/${jobId}/resume`,{consent:true});clearPoll();watch();}catch(e){fail(e);}};
 $('#agentNew').onclick=()=>{$('#agentMinutes').value='5';$('#agentWpm').value='130';jobId=null;requestId=null;snapshot=structuredClone(state.project);$('#agentReview').hidden=true;$('#agentNew').hidden=true;$('#agentProgress').textContent='';$('#agentConsent').checked=false;$('#agentApply').disabled=true;sync();clearPoll();watch();};
 $('#agentApply').onclick=async()=>{
  if(!jobId||!await canLeave())return;$('#agentApply').disabled=true;
  try{const result=await json(`/api/agent/jobs/${jobId}/apply`,{confirm:true});activate(result.project);await library();dialog.close();}catch(e){fail(e);$('#agentApply').disabled=false;}
 };
 dialog.addEventListener('close',clearPoll);
}
