/** Ordinary configured authentication, no --bare, fallback or permission bypass. */
export function claudeInvocation({schema,images=[],prompt,model,permissionMode}){
 const args=['--print','--output-format','json','--json-schema',JSON.stringify(schema),'--permission-mode',permissionMode,'--tools','','--no-session-persistence','--no-chrome',...(model?['--model',model]:[])];
 if(!images.length)return {command:'claude',args,input:prompt};
 const content=[{type:'text',text:prompt},...images.map(i=>({type:'image',source:{type:'base64',media_type:i.mime,data:i.bytes.toString('base64')}}))];
 return {command:'claude',args:[...args,'--input-format','stream-json'],input:JSON.stringify({type:'user',message:{role:'user',content}})+'\n'};
}
export function parseClaude(stdout){
 const envelope=JSON.parse(stdout);
 if(envelope.type!=='result'||envelope.is_error===true||envelope.subtype!=='success'||!Object.hasOwn(envelope,'structured_output')||envelope.permission_denials?.length)throw Error('HOST_ENVELOPE_FAILURE');
 const models=Object.keys(envelope.modelUsage||{}).filter(m=>/^claude-[A-Za-z0-9_.-]{1,110}$/.test(m));
 return {value:envelope.structured_output,actualModel:models.length===1?models[0]:null,events:{resultEnvelope:true}};
}
