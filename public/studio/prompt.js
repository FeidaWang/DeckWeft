import {t} from '../i18n.js';
const base64=async file=>{const bytes=new Uint8Array(await file.arrayBuffer());let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out);};
const REFUSALS={INTAKE_PDF:'visual.intake.INTAKE_PDF',INTAKE_PDF_ENCRYPTED:'visual.intake.INTAKE_PDF_ENCRYPTED',INTAKE_OFFICE:'visual.intake.INTAKE_OFFICE',INTAKE_IMAGE:'visual.intake.INTAKE_IMAGE',INTAKE_BINARY:'visual.intake.INTAKE_BINARY',INTAKE_EMPTY:'visual.intake.INTAKE_EMPTY',INTAKE_TOO_LARGE:'visual.intake.INTAKE_TOO_LARGE',INTAKE_TOTAL_TOO_LARGE:'visual.intake.INTAKE_TOTAL_TOO_LARGE',INTAKE_TOO_MANY:'visual.intake.INTAKE_TOO_MANY',INTAKE_SOURCE_LIMIT:'visual.intake.INTAKE_SOURCE_LIMIT'};
/** DWI-020: one or more local text/Markdown files through /api/intake. A refused file stops the draft with its own recovery; nothing is dropped silently. */
export async function suppliedText(input,json){const files=[...(input.files||[])];if(!files.length)return '';
 const r=await json('/api/intake',{documents:await Promise.all(files.map(async f=>({name:f.name,base64:await base64(f)})))});
 const refused=r.documents.filter(d=>d.status==='refused');
 if(refused.length)throw Error(refused.map(d=>`${d.name}: ${REFUSALS[d.refusal]?t(REFUSALS[d.refusal]):d.refusal}`).join(' '));
 return r.sourceText;}
export function hostChoice(root){const host=root.querySelector('#workbenchHost').value,live=root.querySelector('#workbenchConsent').checked;if(host==='codex'&&!live)throw Error('Allow this Codex operation first. It uses the existing local host configuration and may consume its allowance.');return {host,live};}
