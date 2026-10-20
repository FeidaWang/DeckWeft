import {t} from './i18n.js';
// Shared by the classic and visual studios. The local store reports how many snapshots a deck keeps and
// their size; from 80% of the suggested limit both studios explain how to clean up. Nothing is deleted for the author.
const megabytes=bytes=>bytes<1_000_000?`${Math.max(1,Math.round(bytes/1000))} KB`:`${(bytes/1_000_000).toFixed(1)} MB`;
export function historyCapacityNote(usage,translate=t){
  if(!usage||usage.level==='ok')return '';
  const {snapshots,bytes,limits,level,directory}=usage,limit=`${limits.snapshots}`,size=`${Math.round(limits.bytes/1_000_000)} MB`;
  return level==='over'
    ?translate('classic.historyCapacity.thisDeckKeepsEarlierVersionsOver',{snapshots,bytes:megabytes(bytes),limit,size,directory})
    :translate('classic.historyCapacity.thisDeckKeepsEarlierVersionsClose',{snapshots,bytes:megabytes(bytes),limit,size,directory});
}
