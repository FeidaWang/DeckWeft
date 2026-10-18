/** Codex event JSONL is not its schema-constrained final message. */
export function codexInvocation({schemaFile,resultFile,images=[],model}){
 return {command:'codex',args:['exec','--skip-git-repo-check','--sandbox','read-only','--json','--output-schema',schemaFile,'--output-last-message',resultFile,...images.flatMap(i=>['--image',i.path]),...(model?['--model',model]:[]),'-']};
}
export function parseCodex(final,stdout){
 const events=stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 if(!events.some(e=>e.type==='turn.completed')||events.some(e=>['error','turn.failed'].includes(e.type)))throw Error('HOST_EVENT_FAILURE');
 return {value:JSON.parse(final),actualModel:null,events:{completedTurns:events.filter(e=>e.type==='turn.completed').length}};
}
