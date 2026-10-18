import {assertPresentation} from '../blocks.mjs';
import {isPercentUnit} from '../../components/charts/semantics.mjs';
import {DeckError} from '../errors.mjs';
/** Explicit opt-in to the strict misreading guards. Declarations come from the author; nothing is guessed and the input is not changed. */
export function declareChartSemantics(document,{datasets={}}={}){
 assertPresentation(document);
 const copy=structuredClone(document),ids=new Set(copy.datasets.map(d=>d.id));
 for(const id of Object.keys(datasets))if(!ids.has(id))throw new DeckError('MIGRATION_DECLARATION',`Dataset "${id}" does not exist; declarations must name existing datasets.`,422);
 for(const d of copy.datasets){
  const declared=datasets[d.id]||{};
  if(declared.definition)d.definition={...d.definition,...declared.definition};
  for(const key of ['version','collectedAt','validPeriod'])if(declared[key]!==undefined)d[key]=structuredClone(declared[key]);
  if(isPercentUnit(d.unit)&&!d.definition?.denominator)throw new DeckError('MIGRATION_DECLARATION',`Declare the denominator of percentage dataset "${d.id}" before opting into strict misreading guards. No denominator was inferred.`,422);
 }
 copy.rules={misreading:'strict'};
 return assertPresentation(copy);
}
