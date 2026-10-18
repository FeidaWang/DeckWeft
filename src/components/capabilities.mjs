import {htmlChartDeclarations} from './charts/semantics.mjs';
/** Describes actual compilers, never infers native host support from a manifest. */
export function componentCapabilities(block,target){
 const supported=['html','json'].includes(target);
 return {blockId:block.id,component:block.type,variant:block.chartType||block.diagramType||block.type,target,supported,editable:supported,representation:target==='html'?'semantic DOM/SVG + accessible source text/data':target==='json'?'typed original content':'unimplemented',staticFallback:supported,animation:target==='html',interactionSupport:target==='html'?({chart:['chart-select'],image:['image-compare','image-hotspots'],diagram:['steps'],code:['steps']})[block.type]||[]:[],lifecycle:target==='html'?'Finite scene-owned motion; disposal on exit/hidden/pagehide':'static',measurement:target==='html'?'actual browser font/DOM/SVG receipt required':'not applicable',...(target==='html'&&block.type==='chart'?{declarations:htmlChartDeclarations(block.chartType||'line')}:{})};
}
