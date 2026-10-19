/**
 * What PowerPoint can carry natively, and the explicit receipt for everything it cannot (S7, VIS-016).
 * A component is compiled to native objects (L1), or to a high-resolution image of exactly that element plus a semantic
 * summary (L3). No whole slide is ever rasterised. Every element dropped or changed gets its own receipt.
 */
import {chartFacts} from '../../components/charts/model.mjs';

/** Native representation per chart kind. `null` means no native chart: the element is delivered at L3. */
export const PPTX_NATIVE_CHARTS={
 line:{part:'lineChart',representation:'native line chart with embedded data'},
 area:{part:'areaChart',representation:'native area chart with embedded data'},
 'ranked-bar':{part:'barChart',representation:'native bar chart with embedded data, drawn in the declared sort order'},
 'grouped-bar':{part:'barChart',representation:'native clustered bar chart with embedded data'},
 stacked:{part:'barChart',representation:'native stacked column chart with embedded data, drawn in the declared sort order'},
 scatter:{part:'scatterChart',representation:'native scatter chart with embedded data'},
 heatmap:{part:'table',representation:'native table with value-shaded cells'},
 'benchmark-table':{part:'table',representation:'native table'},
 'dot-interval':null,
 'small-multiples':null
};
/** Why a chart kind, or a declaration on it, has no native PowerPoint form in this compiler. */
const NO_NATIVE={
 'dot-interval':'PowerPoint has no dot-and-interval chart; error bars are not compiled.',
 'small-multiples':'Panels sharing one fixed axis are not compiled as separate native charts.'
};
const evenlySpaced=d=>{if(d.categoryKind!=='datetime'||d.categories.length<3)return true;const t=d.categories.map(c=>Date.parse(c)),step=t[1]-t[0];return t.every((v,i)=>!i||Math.abs(v-t[i-1]-step)<1000);};

/**
 * The PowerPoint plan for one chart: its level, representation and, per element that is not drawn natively, a receipt.
 * `view` is the frozen dataset (after the static state's filter); receipts name only what that view shows.
 */
export function pptxChartPlan(block,dataset,view=dataset,locale='en'){
 const kind=block.chartType||'line',native=PPTX_NATIVE_CHARTS[kind],receipts=[],add=(code,element,reason,delivered,extra={})=>receipts.push({code,target:'pptx',blockId:block.id,element,reason,delivered,...extra});
 let fallback=native?null:NO_NATIVE[kind];
 if(!fallback&&dataset.series.some(s=>s.interval))fallback='Interval bounds would need error bars, which are not compiled; uncertainty is never dropped.';
 if(!fallback&&!evenlySpaced(dataset)&&native.part!=='table')fallback='Unevenly spaced times would be drawn evenly on a native category axis.';
 // A native log axis exists, but an importer that ignores it (Quick Look does) draws the values on a linear axis: a misreading. Kept as an image until PowerPoint and Keynote are checked.
 // Missing values: a native chart caches a gap by its point index, and an importer that ignores the index (Quick Look) moves later values onto earlier categories, or draws #N/A as zero. Kept as an image until PowerPoint and Keynote are checked.
 if(!fallback&&native.part!=='table'&&dataset.series.some(s=>s.values.some(v=>v===null)))fallback='A missing value is drawn on the wrong category, or as zero, by at least one importer (Quick Look); the chart stays an image until PowerPoint and Keynote are checked.';
 if(!fallback&&(block.axis?.scale==='log'||block.xAxis?.scale==='log'))fallback='A native logarithmic axis is drawn linear by at least one importer (Quick Look); the chart stays an image until PowerPoint and Keynote are checked.';
 if(fallback){
  add('PPTX_CHART_IMAGE','whole chart',fallback,'A high-resolution image of this chart only, with its question, caption, takeaway and source as native text; alt text and the slide notes carry every value.');
  return {level:'L3',representation:'high-resolution image of this chart plus a semantic summary (alt text and notes)',native:null,receipts};
 }
 const f=chartFacts(block,view,locale);
 if(native.part!=='table'){
  if(block.truncation)add('PPTX_CHART_BREAK_MARK','axis break mark','A native value axis starts at the truncated minimum but has no break symbol.','The truncation note stays as visible text under the chart.');
  for(const e of f.events)add('PPTX_CHART_EVENT_MARK',`event ${e.n} mark`,'Native charts have no event marker on the category axis.','The event is listed in the visible chart notes.',{objectId:e.id});
  for(const q of f.qualifiers)add('PPTX_CHART_QUALIFIER_MARK',`qualifier mark · ${view.series[q.j].label} · ${f.display(q.i)}`,'Native data labels do not carry the superscript qualifier number.','The qualifier is listed in the visible chart notes.',{objectId:q.categoryId,seriesId:q.seriesId});
  if(kind==='scatter')add('PPTX_CHART_POINT_LABELS','point name labels','Native scatter labels are not compiled with category names.','Each point name and value is in the slide notes and the embedded data.');
 }
 return {level:'L1',representation:native.representation,native:native.part,receipts};
}

/** Image formats PowerPoint embeds natively in this compiler. Anything else is delivered as a captured image of the element. */
export const PPTX_IMAGE_TYPES={'image/png':'png','image/jpeg':'jpeg'};

/** Receipts for drawing details the compiler does not reproduce, found in the measured layout. */
export function layoutReceipts(scene,blockOf){
 const out=[],add=(code,element,reason,delivered,extra)=>out.push({code,target:'pptx',sceneId:scene.sceneId,element,reason,delivered,...extra});
 for(const d of scene.decor){if(d.unsupported)add('PPTX_DECOR_PATH',`decorative path ${d.id||''}`.trim(),'The path uses arcs or smooth-curve shorthand that is not compiled.','The shape is omitted; it is decorative and carries no content.',{objectId:d.id});}
 if(scene.backgroundImage)add('PPTX_BACKGROUND_IMAGE','scene background image','CSS background images are not compiled.','The solid background colour is used.');
 for(const r of scene.regions){
  for(const b of r.boxes)if(b.backgroundImage)add('PPTX_BOX_BACKGROUND_IMAGE',`${b.tag} background in ${r.blockId}`,'CSS background images are not compiled.','The box keeps its solid fill and borders.',{blockId:r.blockId});
  for(const e of r.diagram?.edges||[])if(e.line.commands?.some(c=>c.c==='C'||c.c==='Q'))add('PPTX_DIAGRAM_CURVE',`relationship ${e.id}`,'Curved relationships are drawn as straight connectors between the same nodes.','Both ends and the label are kept.',{blockId:r.blockId,objectId:e.id});
  if(r.image&&!blockOf(r.blockId))add('PPTX_IMAGE_UNBOUND',`image in ${r.blockId}`,'The image has no semantic block.','Omitted.',{blockId:r.blockId});
 }
 return out;
}
