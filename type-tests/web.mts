import type {PresentationDocument,DesignPlan,WebScene} from '../src/contracts/web.mjs';
declare const d:PresentationDocument;
const b=d.blocks[0]!;
if(b.type==='metric') {
  const value:number=b.value;void value;
  // @ts-expect-error typed numbers must not become presentation strings
  b.value='12%';
}
if(b.type==='chart') {
  const id:string=b.datasetId;void id;
  // @ts-expect-error chart data is referenced, never inline executable HTML
  b.html='<script>';
}
declare const p:DesignPlan;
// @ts-expect-error design plans bind content instead of copying editable facts
p.scenes[0]!.facts=[];
declare const s:WebScene;
// @ts-expect-error WebScene accepts registered components only
s.regions[0]!.component='execute';

import type {VisualProject,ThemePack} from '../src/contracts/web.mjs';
declare const project:VisualProject;
// @ts-expect-error imported records must never coerce typed numeric values
project.document.datasets[0]!.series[0]!.values[0]='81.25';
declare const theme:ThemePack;
// @ts-expect-error a theme cannot load an arbitrary executable image treatment
theme.imageGrammar.treatment='execute-script';

if(b.type==='chart') {
 b.chartType='heatmap';b.axis={policy:'fixed',min:-5,max:10};
 // @ts-expect-error chart variants are bounded by implemented renderers
 b.chartType='pie';
}
if(b.type==='annotation') {
 const stable:string=b.target.blockId;void stable;
 // @ts-expect-error object identities are strings, not positional numbers
 b.target.objectId=2;
}
project.document.datasets[0]!.series[0]!.values[0]=null;

p.scenes[0]!.interactions=[{id:'typed-chart',kind:'chart-select',blockId:'chart'}];
p.scenes[0]!.cues=[{id:'typed-cue',event:'data.filter',interactionId:'typed-chart',seriesIds:['series'],fromId:'first',toId:'last'}];
// @ts-expect-error arbitrary imported code cannot become a semantic cue
p.scenes[0]!.cues=[{id:'bad',event:'execute',interactionId:'typed-chart',script:'fetch(...)'}];
