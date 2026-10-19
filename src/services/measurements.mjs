import { createHash,randomBytes } from 'node:crypto';
import { DeckError } from '../core/errors.mjs';
import { assertProject } from '../core/validate.mjs';
import { LAYOUTS } from '../core/model.mjs';
import { compileSlide } from '../layout/scene.mjs';
import { estimatedTextMeasurer,completeFit,graphemes,visibleLine,fontStack } from '../layout/text.mjs';
import { resolveScenes } from '../layout/engine.mjs';

function stable(value){return Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;}
/** Save revision alone does not alter the rendered content; every other field is bound. */
export function renderFingerprint(project){const {revision,...content}=project;return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');}
const fail=message=>{throw new DeckError('INVALID_MEASUREMENT',message,422);};
export function validateFit(request,result){
  const {text,box,style}=request;
  if(!result||result.id!==request.id)fail('A measurement does not match its text box.');
  const {fontSize,ranges,widths,ascent,descent,fontFamily}=result;
  if(!Number.isInteger(fontSize)||fontSize<style.minimum||fontSize>style.preferred)fail('Measured font size is outside the allowed range.');
  if(!style.families.includes(fontFamily))fail('Use one of the declared local font families.');
  if(![ascent,descent].every(n=>Number.isFinite(n)&&n>=0&&n<=fontSize*5)||ascent<fontSize*.5)fail('Invalid text height metrics.');
  if(!Array.isArray(ranges)||!ranges.length||ranges.length>text.length+1||!Array.isArray(widths)||ranges.length!==widths.length)fail('Invalid line ranges.');
  const boundaries=new Set([0,text.length,...graphemes(text).map(g=>g.end)]);let cursor=0;
  ranges.forEach((range,i)=>{
    if(!Array.isArray(range)||range.length!==2)fail('Each line needs a start and an end.');
    const [a,b]=range;
    if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a!==cursor||b<a||!boundaries.has(a)||!boundaries.has(b))fail('Line ranges must preserve every grapheme, in order.');
    if(a===b&&!(i===ranges.length-1&&b===text.length&&(text===''||/[\r\n]$/u.test(text))))fail('Only the final empty paragraph may have a zero-length range.');
    if(/[\r\n]/u.test(visibleLine(text.slice(a,b))))fail('A hard paragraph break cannot be hidden in a line.');
    if(!Number.isFinite(widths[i])||widths[i]<0||widths[i]>10_000_000)fail('Invalid measured width.');
    const visible=visibleLine(text.slice(a,b));
    if(visible.length&&widths[i]===0)fail('Nonempty text cannot have zero width.');
    // Same-origin metrics are trusted, not proven; this lower bound only refuses widths no font could produce (F: fabricated 0.001 px fits).
    if(visible.length&&widths[i]<graphemes(visible).length*fontSize*0.05)fail('Measured width is implausibly narrow for the text.');
    cursor=b;
  });
  if(cursor!==text.length)fail('Some source text was dropped by the measurement.');
  // Accept metrics from our same-origin client, never executable SVG/scene markup.
  return completeFit(text,box,style,{fontSize,ranges,widths,ascent,descent,fontFamily,
    fontStack:fontStack([fontFamily,...style.families.filter(f=>f!==fontFamily)],style.generic),source:'browser-canvas'});
}
export class MeasurementSessions {
  constructor({now=()=>Date.now(),limit=8,ttl=15*60_000}={}){this.plans=new Map();this.renders=new Map();this.now=now;this.limit=limit;this.ttl=ttl;}
  prune(map){for(const [id,v]of map)if(v.expires<=this.now())map.delete(id);while(map.size>=this.limit)map.delete(map.keys().next().value);}
  plan(project,{assetResources={}}={}){
    assertProject(project);this.prune(this.plans);
    const requests=[];const collector={kind:'measurement-plan',fit(text,box,style,id){requests.push({id,text,box,style});return estimatedTextMeasurer.fit(text,box,style);}};
    for(const slide of project.slides)for(const layout of LAYOUTS)compileSlide(project,slide,layout,{measurer:collector,assetResources});
    if(requests.length>12000||Buffer.byteLength(JSON.stringify(requests))>5_000_000)throw new DeckError('MEASUREMENT_BUDGET','Split this deck into smaller decks before browser measurement.',413);
    const id=randomBytes(20).toString('hex'),fingerprint=renderFingerprint(project);
    this.plans.set(id,{project:structuredClone(project),requests,assetResources,fingerprint,expires:this.now()+this.ttl});
    return {id,fingerprint,requests,method:'browser-canvas',expiresInSeconds:this.ttl/1000};
  }
  resolve(id,results,environment={}){
    const plan=this.plans.get(id);if(!plan||plan.expires<=this.now())throw new DeckError('MEASUREMENT_EXPIRED','This text measurement expired. Refresh the preview.',409);
    if(!Array.isArray(results)||results.length!==plan.requests.length)fail('Every requested box needs exactly one result.');
    const fits=new Map();
    results.forEach((r,i)=>{const request=plan.requests[i];fits.set(request.id,validateFit(request,r));});
    const measurer={kind:'browser-canvas',fit(text,box,style,key){const fit=fits.get(key);if(!fit||fit.text!==text)fail('A measured box was not found.');return structuredClone(fit);}};
    const project=plan.project,resolved=resolveScenes(project,{measurer,assetResources:plan.assetResources}),ticket=randomBytes(20).toString('hex');
    this.prune(this.renders);
    const fontProbes=Object.fromEntries([...new Set(plan.requests.flatMap(r=>r.style.families))].map(f=>[f,environment?.fontProbes?.[f]===true]));
    const receipt={method:'browser-canvas',fingerprint:plan.fingerprint,measuredAt:new Date(this.now()).toISOString(),fontProbes,
      notice:'Widths were shaped in your browser; local font probes may be privacy-restricted. Other apps can substitute fonts. No font files are embedded.'};
    this.renders.set(ticket,{fingerprint:plan.fingerprint,resolved,expires:this.now()+this.ttl,receipt});
    this.plans.delete(id);
    return {project,resolved,measurer,ticket,receipt};
  }
  get(ticket,project){
    const entry=this.renders.get(ticket);
    if(!entry||entry.expires<=this.now())throw new DeckError('MEASUREMENT_EXPIRED','Measure the deck again before exporting.',409);
    if(entry.fingerprint!==renderFingerprint(project))throw new DeckError('STALE_MEASUREMENT','The text or design changed. Wait for a fresh preview before exporting.',409);
    return entry;
  }
}
