import {createHash} from 'node:crypto';
import {sourceLines} from '../hosts/tasks.mjs';
/**
 * DWI-020: bounded intake of several local documents. Plain text and Markdown are read offline; each document keeps its own id,
 * byte hash, order and line locators, and a duplicate stays listed as a duplicate. Other formats are refused with a recovery,
 * never dropped: PDF, Word/PowerPoint packages and images are not parsed in this build (no parser dependency was reviewed for
 * offline packaging), archives are never opened, and nothing is fetched. Imported text is data: it is never executed or followed
 * as an instruction, and markup in it is escaped wherever it is rendered.
 */
export const INTAKE_LIMITS=Object.freeze({documents:12,bytesPerDocument:256*1024,totalBytes:1024*1024,sourceCharacters:12000,nameLength:120});
const TEXT_EXT=/\.(txt|md|markdown|text)$/i;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
/** The file name as metadata only: directories, control characters and over-long names are removed; it is never used as a path. */
export function safeDocumentName(name,index){
 const base=String(name??'').replace(/\\/g,'/').split('/').pop().replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,INTAKE_LIMITS.nameLength);
 return base&&base!=='.'&&base!=='..'?base:`document-${index+1}.txt`;
}
const RECOVERY={
 INTAKE_PDF:'PDF reading is not enabled in this build. Copy the text into a .txt or .md file, or paste it.',
 INTAKE_PDF_ENCRYPTED:'This PDF is encrypted. Open it with its password, copy the text into a .txt or .md file, or paste it.',
 INTAKE_OFFICE:'Word, PowerPoint and other zipped packages are not opened. Save the text as .txt or .md, or paste it.',
 INTAKE_IMAGE:'Images are not read as text and no OCR runs automatically. Type or paste the text, or add the image to a page as an image.',
 INTAKE_BINARY:'This file is not UTF-8 text. Save it as UTF-8 .txt or .md.',
 INTAKE_EMPTY:'The file has no text. Choose another file or remove it.',
 INTAKE_TOO_LARGE:`Use files of at most ${INTAKE_LIMITS.bytesPerDocument/1024} KB.`,
 INTAKE_TOTAL_TOO_LARGE:`Keep all files together under ${INTAKE_LIMITS.totalBytes/1024} KB, or make two decks.`,
 INTAKE_TOO_MANY:`Add at most ${INTAKE_LIMITS.documents} files at once.`,
 INTAKE_SOURCE_LIMIT:`Together the readable text is longer than ${INTAKE_LIMITS.sourceCharacters} characters. Shorten it or split it into two decks; nothing was cut.`,
 INTAKE_DUPLICATE:'Identical to an earlier file; it is listed but its text is used once.',
 INTAKE_ACTIVE_CONTENT:'The text contains markup or script; it is kept as text and never run.',
 INTAKE_INSTRUCTION_LIKE:'The text contains sentences addressed to an assistant; they are treated as material, not as instructions.',
 INTAKE_REMOTE_REFERENCE:'Links and images that point to the web are kept as text; nothing is downloaded.'
};
const warn=(code,documentId)=>({code,documentId,message:code.replace(/^INTAKE_/,'').toLowerCase().replace(/_/g,' '),recovery:RECOVERY[code]});
/** What a byte sequence is, from its first bytes; the extension never overrides the content. */
export function sniff(bytes){
 const head=bytes.subarray(0,8),ascii=Buffer.from(head).toString('latin1');
 if(ascii.startsWith('%PDF-'))return 'pdf';
 if(head[0]===0x50&&head[1]===0x4b&&(head[2]===3||head[2]===5||head[2]===7))return 'zip';
 if(head[0]===0xd0&&head[1]===0xcf&&head[2]===0x11&&head[3]===0xe0)return 'ole';
 if(head[0]===0x89&&ascii.slice(1,4)==='PNG'||head[0]===0xff&&head[1]===0xd8||ascii.startsWith('GIF8')||ascii.startsWith('RIFF')||ascii.startsWith('II*\u0000')||ascii.startsWith('MM\u0000*'))return 'image';
 return 'text';
}
const decoder=new TextDecoder('utf-8',{fatal:true});
function decode(bytes){
 try{const text=decoder.decode(bytes);if(/\u0000/.test(text))return null;return text.replace(/^﻿/,'').replace(/\r\n?/g,'\n');}catch{return null;}
}
/**
 * Reads `files` ([{name, bytes, mime?}], in the order supplied) into one intake result. `sourceText` joins the accepted documents
 * with `---` (the outline page separator), so the existing F3 source-line coverage applies; `sourceMap[n-1]` names the document
 * and line of protected source line n.
 */
export function intakeDocuments(files,{limits=INTAKE_LIMITS}={}){
 if(!Array.isArray(files)||!files.length)throw Object.assign(Error('Add at least one file.'),{code:'INTAKE_NONE',status:400});
 const documents=[],warnings=[],blocks=[],hashes=new Map();let total=0,characters=0;
 for(const [index,file] of files.entries()){
  const id=`doc-${index+1}`,name=safeDocumentName(file?.name,index),bytes=Buffer.isBuffer(file?.bytes)?file.bytes:Buffer.from(file?.bytes??[]),hash=sha256(bytes);
  const doc={id,order:index+1,name,title:name.replace(TEXT_EXT,''),mime:'application/octet-stream',bytes:bytes.length,sha256:hash,status:'refused',duplicateOf:null,lines:0};
  documents.push(doc);
  const refuse=code=>{doc.status='refused';doc.refusal=code;warnings.push(warn(code,id));};
  if(index>=limits.documents){refuse('INTAKE_TOO_MANY');continue;}
  if(bytes.length>limits.bytesPerDocument){refuse('INTAKE_TOO_LARGE');continue;}
  if(total+bytes.length>limits.totalBytes){refuse('INTAKE_TOTAL_TOO_LARGE');continue;}
  total+=bytes.length;
  const kind=sniff(bytes);
  if(kind==='pdf'){refuse(bytes.includes('/Encrypt')?'INTAKE_PDF_ENCRYPTED':'INTAKE_PDF');doc.mime='application/pdf';continue;}
  if(kind==='zip'||kind==='ole'){refuse('INTAKE_OFFICE');continue;}
  if(kind==='image'){refuse('INTAKE_IMAGE');continue;}
  const text=decode(bytes);
  if(text===null){refuse('INTAKE_BINARY');continue;}
  doc.mime=/\.(md|markdown)$/i.test(name)?'text/markdown':'text/plain';
  if(!text.trim()){refuse('INTAKE_EMPTY');continue;}
  if(hashes.has(hash)){doc.status='duplicate';doc.duplicateOf=hashes.get(hash);warnings.push(warn('INTAKE_DUPLICATE',id));continue;}
  if(characters+text.length>limits.sourceCharacters){refuse('INTAKE_SOURCE_LIMIT');continue;}
  hashes.set(hash,id);characters+=text.length;doc.status='accepted';doc.text=text;
  if(/<\s*(script|iframe|object|embed)\b|\bon\w+\s*=|javascript:/i.test(text))warnings.push(warn('INTAKE_ACTIVE_CONTENT',id));
  if(/\b(ignore|disregard)\b.{0,40}\b(previous|prior|above)\b.{0,20}\binstructions?\b|\b(system prompt|you are an? (ai|assistant))\b|忽略.{0,10}(之前|以上|前面).{0,6}指令/i.test(text))warnings.push(warn('INTAKE_INSTRUCTION_LIKE',id));
  if(/\bhttps?:\/\//i.test(text))warnings.push(warn('INTAKE_REMOTE_REFERENCE',id));
  const raw=text.split('\n');doc.lines=raw.length;
  raw.forEach((line,i)=>{if(line.trim()&&line.trim()!=='---')blocks.push({id:`${id}-l${i+1}`,text:line.trim(),sourceId:id,locator:`${name}, line ${i+1}`,line:i+1});});
 }
 const accepted=documents.filter(d=>d.status==='accepted');
 const sourceText=accepted.map(d=>d.text.replace(/\n+$/,'')).join('\n---\n');
 const sourceMap=blocks.map(b=>({documentId:b.sourceId,line:b.line}));
 if(sourceText&&sourceLines(sourceText).length!==sourceMap.length)throw Error('Intake source map disagrees with the source lines.');
 for(const d of documents)delete d.text;
 return {format:'deckweft-intake',version:1,limits:{...limits},documents,blocks,warnings,sourceText,sourceMap,characters,accepted:accepted.length,refused:documents.filter(d=>d.status==='refused').length};
}
/** The JSON route body: documents as {name, mime, base64}. Bounded before decoding. */
export function intakeRequest(body,{limits=INTAKE_LIMITS}={}){
 if(!body||!Array.isArray(body.documents))throw Object.assign(Error('Send {documents:[{name, base64}]}.'),{code:'INTAKE_REQUEST',status:400});
 if(body.documents.length>limits.documents*2)throw Object.assign(Error(RECOVERY.INTAKE_TOO_MANY),{code:'INTAKE_TOO_MANY',status:413});
 return intakeDocuments(body.documents.map(d=>{const b64=typeof d?.base64==='string'?d.base64:'';if(b64.length>Math.ceil(limits.bytesPerDocument*4/3)+8)return {name:d?.name,bytes:Buffer.alloc(limits.bytesPerDocument+1)};if(!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))return {name:d?.name,bytes:Buffer.from([0xff,0xfe,0x00])};return {name:d?.name,bytes:Buffer.from(b64,'base64')};}),{limits});
}
