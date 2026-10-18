#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {createAgentProtocol} from '../src/adapters/agent-mcp.mjs';
const {values}=parseArgs({options:{home:{type:'string'}}}),dispatch=createAgentProtocol(values.home);
let buffer='',pending=Promise.resolve();
const send=value=>{if(value!==null)process.stdout.write(JSON.stringify(value)+'\n');};
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{
 buffer+=chunk;
 if(Buffer.byteLength(buffer)>2_000_000){process.stderr.write('MCP message exceeds 2 MB.\n');process.exitCode=1;process.stdin.destroy();return;}
 let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;
  pending=pending.then(async()=>{let message;try{message=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON.'}});return;}send(await dispatch(message));}).catch(()=>send({jsonrpc:'2.0',id:null,error:{code:-32603,message:'Local protocol failure.'}}));
 }
});
process.stdin.on('end',()=>{if(buffer.trim())send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Messages must end with a newline.'}});});
