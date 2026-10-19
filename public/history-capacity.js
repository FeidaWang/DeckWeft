// Shared by the classic and visual studios. The local store reports how many snapshots a deck keeps and
// their size; from 80% of the suggested limit both studios explain how to clean up. Nothing is deleted for the author.
const megabytes=bytes=>bytes<1_000_000?`${Math.max(1,Math.round(bytes/1000))} KB`:`${(bytes/1_000_000).toFixed(1)} MB`;
export function historyCapacityNote(usage,t){
  if(!usage||usage.level==='ok')return '';
  const {snapshots,bytes,limits,level,directory}=usage,limit=`${limits.snapshots}`,size=`${Math.round(limits.bytes/1_000_000)} MB`;
  return level==='over'
    ?t(`This deck keeps ${snapshots} earlier versions (${megabytes(bytes)}), over the suggested limit of ${limit} versions or ${size}. DeckWeft never deletes them by itself. To free space, restore any version you still want as a new copy, then move older numbered files out of ${directory} (for example into an archive folder).`,
      `这份文稿保留了 ${snapshots} 个历史版本（${megabytes(bytes)}），已超过建议上限 ${limit} 个版本或 ${size}。DeckWeft 不会自动删除它们。要释放空间，先把仍想保留的版本恢复为新副本，再把较早的编号文件从 ${directory} 移出（例如移到归档文件夹）。`)
    :t(`This deck keeps ${snapshots} earlier versions (${megabytes(bytes)}), close to the suggested limit of ${limit} versions or ${size}. DeckWeft never deletes them by itself. To free space, restore any version you still want as a new copy, then move older numbered files out of ${directory} (for example into an archive folder).`,
      `这份文稿保留了 ${snapshots} 个历史版本（${megabytes(bytes)}），接近建议上限 ${limit} 个版本或 ${size}。DeckWeft 不会自动删除它们。要释放空间，先把仍想保留的版本恢复为新副本，再把较早的编号文件从 ${directory} 移出（例如移到归档文件夹）。`);
}
