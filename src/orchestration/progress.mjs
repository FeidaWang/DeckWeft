export const TASK_DAG=[{id:'planning',label:'Narrative and visual plan',weight:30,dependsOn:[]},{id:'draft',label:'Editable draft',weight:45,dependsOn:['planning']},{id:'validation',label:'Schema and layout checks',weight:25,dependsOn:['draft']}];
export function appendEvent(job,type,summary,now,data={}){
 const event={sequence:job.nextSequence++,timestamp:now,jobId:job.id,taskId:data.taskId??null,attempt:job.attempt??1,workerId:job.grant?.hostIdentityHash??null,type,summary,...data};
 job.events.push(event);if(job.events.length>200){job.events.shift();job.droppedEvents=(job.droppedEvents??0)+1;}return event;
}
export function jobProgress(job,now,connected,history=[]){
 const completed=job.completedTasks??[],weight=TASK_DAG.filter(t=>completed.includes(t.id)).reduce((n,t)=>n+t.weight,0);
 const samples=history.filter(j=>j.id!==job.id&&j.comparisonKey===job.comparisonKey&&j.completedTasks?.includes('validation')&&j.attempt===1&&j.completedAt&&j.startedAt&&j.input.project.locale===job.input.project.locale&&j.input.project.slides.length===job.input.project.slides.length&&j.grant?.modelPolicy.model===job.grant?.modelPolicy.model&&j.grant?.modelPolicy.effort===job.grant?.modelPolicy.effort&&j.model?.reported?.model===job.model?.reported?.model).map(j=>(j.completedAt-j.startedAt)/1000).sort((a,b)=>a-b);
 const active=['queued','running','validating'].includes(job.status),elapsedSeconds=Math.max(0,Math.floor((Math.min(now,job.completedAt??now)-job.createdAt)/1000));
 const waiting=['blocked','needs-review','cancelled','expired','failed','applied'].includes(job.status)?job.status:!connected?'host-disconnected':null;
 let eta={state:'insufficient-history',message:'Estimating — not enough comparable runs.',sampleCount:samples.length};
 if(waiting)eta={state:'waiting',message:waiting==='needs-review'?'Waiting for your review.':waiting==='host-disconnected'?'Waiting for the host to reconnect.':`Job ${waiting}.`,sampleCount:samples.length};
 else if(samples.length>=3&&active){const spent=job.startedAt?(now-job.startedAt)/1000:0;eta={state:'estimated',seconds:[Math.max(0,Math.floor(samples[0]-spent)),Math.max(0,Math.ceil(samples.at(-1)-spent))],confidence:'low',sampleCount:samples.length,method:'single-worker serial critical path; comparable locale, slide count, host-reported model and requested effort'};}
 return {validatedPercent:weight,indeterminate:active&&weight<100,elapsedSeconds,currentTask:TASK_DAG.find(t=>!completed.includes(t.id))?.label??'Review and apply',tasks:TASK_DAG.map(t=>({...t,status:completed.includes(t.id)?'validated':'pending'})),units:job.units??null,waiting,eta};
}
