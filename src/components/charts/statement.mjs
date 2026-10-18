import {chartFacts,chartModel,chartSummary,chartText} from './model.mjs';
/** The static view's text statement, from the same facts as the chart: every shown value in drawing order, then the filter and the sort as separate facts, never one implied by the other. */
export function chartStatement(block,full,shown,keyState,locale){
 const t=chartText(locale),f=chartFacts(block,shown,locale),zh=locale==='zh-CN',total=full.categories.length,n=shown.categories.length;
 const sentences=[`${t.staticView} · ${keyState.label||keyState.id}${t.colon}${chartSummary(f).join(t.separator)}`];
 // A range filter selects in author order; a value sort orders what is shown. Ranks among all categories show when the shown bars are not adjacent ranks.
 if(n<total)sentences.push(t.filter(f.display(0),f.display(n-1),n,total));
 if(shown.series.length<full.series.length)sentences.push(t.seriesFilter(shown.series.map(s=>s.label).join(t.separator),shown.series.length,full.series.length));
 if(f.sortLabel&&n<total){const order=chartModel(block,full).order,ranks=f.model.order.map(i=>order.indexOf(full.categoryIds.indexOf(shown.categoryIds[i]))+1);sentences.push(f.sortLabel[0].toUpperCase()+f.sortLabel.slice(1)+(zh?'；':'; ')+t.ranks(ranks.join(t.separator),total));}
 return [...sentences.map(s=>s+t.listEnd),t.completeBelow].join(zh?'':' ');
}
