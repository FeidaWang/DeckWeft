import registry from '../../themes/palettes/wesanderson.json' with { type: 'json' };
import screenshots from '../../themes/palettes/wesanderson.screenshot-samples.json' with { type: 'json' };
import schema from '../../schemas/palette-registry.schema.json' with { type: 'json' };
import frameSchema from '../../schemas/film-frame-record.schema.json' with { type: 'json' };
import { validateSchema } from '../core/schema.mjs';
import { DeckError } from '../core/errors.mjs';
/**
 * DWI-010: the immutable source palette registry. Records hold library hex values with their provenance; they are not film-frame
 * measurements or official colour standards (filmFrameVerified false, frameTimestamp null). Screenshot samples are a separate
 * record with their own evidence level. Role colours derived for a page live in semantic-colors.mjs, never here.
 */
const check=validateSchema(registry,schema);
if(!check.ok)throw Error('Invalid palette registry: '+JSON.stringify(check.errors.slice(0,3)));
const byId=new Map(registry.palettes.map(p=>[p.id,p]));
if(byId.size!==registry.palettes.length)throw Error('Duplicate palette ids in the registry.');
for(const [alias,target] of Object.entries(registry.aliases))if(byId.has(alias)||!byId.has(target))throw Error(`Palette alias ${alias} must name one existing palette and not duplicate it.`);
const samplesById=new Map(screenshots.rows.map(r=>[r.paletteId,r]));
export const PALETTE_REGISTRY=Object.freeze({id:registry.registryId,version:registry.registryVersion,attribution:registry.attribution,licence:registry.licence,scope:registry.scope});
export const PALETTE_MODES=Object.freeze(['light','dark','stage']);
export const PALETTE_EVIDENCE=Object.freeze(['screenshot-sample-only','library-values-verified','licensed-frame-sampled','independently-reviewed-frame']);
export const paletteIds=()=>registry.palettes.map(p=>p.id);
export const paletteAliases=()=>({...registry.aliases});
/** A source palette by id or alias. The record is a copy; `aliasOf` is set when the caller named an alias. */
export function paletteRecord(id){
 const target=registry.aliases[id]||id,p=byId.get(target);
 if(!p)throw new DeckError('PALETTE_UNKNOWN',`Choose one of the registered palettes (${paletteIds().length}); “${id}” is not one.`);
 return structuredClone({...p,...(target!==id?{aliasOf:target}:{})});
}
/** What is and is not established about one palette, for the picker's evidence note. */
export function paletteEvidence(id){
 const p=paletteRecord(id),shot=samplesById.get(p.aliasOf||p.id);
 return {paletteId:p.aliasOf||p.id,film:p.film,library:{evidence:p.source.evidence,sourceId:p.source.sourceId,path:p.source.path,gitBlobSha:p.source.gitBlobSha},official:false,filmFrame:{verified:false,timestamp:null},
  screenshot:shot?{evidence:screenshots.evidence,row:shot.row,samples:shot.samples.length,exactMatches:shot.samples.filter(s=>s.exactMatch).length,maxDeltaE76:Math.max(...shot.samples.map(s=>s.deltaE76)),metric:screenshots.image.metric}:null,
  attribution:registry.attribution};
}
/** A scene's palette reference (design plan `scene.palette`). Canonical ids only: an alias is refused with its target named, never rewritten. */
export function assertPaletteReference(ref){
 const fail=m=>{throw new DeckError('PALETTE_REFERENCE',m);};
 if(!ref||typeof ref!=='object'||Array.isArray(ref))fail('A palette reference is {id, registryVersion, mode}.');
 for(const k of Object.keys(ref))if(!['id','registryVersion','mode'].includes(k))fail(`Unknown palette reference field “${k}”.`);
 if(registry.aliases[ref.id])fail(`“${ref.id}” is an alias; use “${registry.aliases[ref.id]}”.`);
 if(!byId.has(ref.id))fail(`Choose one of the registered palettes; “${ref.id}” is not one.`);
 if(ref.registryVersion!==registry.registryVersion)fail(`Palette registry version ${ref.registryVersion} is not available; this build has version ${registry.registryVersion}.`);
 if(!PALETTE_MODES.includes(ref.mode))fail('Palette mode is light, dark or stage.');
 return ref;
}
/**
 * DWI-052: a film-frame palette record (schemas/film-frame-record.schema.json). Only permitted media qualifies; the edition,
 * transfer function, timestamps, frame hashes and the clustering seed are required so the sampling can be repeated. An
 * independently reviewed record names its reviewer. No such record exists in this repository: no licensed frame has been sampled.
 */
export function assertFilmFrameRecord(record){
 const r=validateSchema(record,frameSchema);if(!r.ok)throw new DeckError('FRAME_RECORD','Use the deckweft-film-frame-record version 1 contract.',400,r.errors);
 const fail=m=>{throw new DeckError('FRAME_RECORD',m);};
 if(new Set(record.frames.map(f=>f.timestamp)).size!==record.frames.length)fail('Each sampled frame has its own timestamp.');
 if(new Set(record.frames.map(f=>f.frameSha256)).size!==record.frames.length)fail('Each sampled frame has its own hash.');
 if(record.result.evidence==='independently-reviewed-frame'&&!record.result.reviewer)fail('An independently reviewed record names its reviewer.');
 if(record.result.colors.length>record.method.k)fail('A record cannot report more colours than its clusters.');
 return record;
}
