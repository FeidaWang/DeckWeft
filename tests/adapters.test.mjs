import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createProject} from '../src/core/model.mjs';
import {exportDeck} from '../src/render/export.mjs';
const ae=await readFile(new URL('../integrations/after-effects/DeckWeft-Import.jsx',import.meta.url),'utf8');
const parser=ae.slice(ae.indexOf('  function parseJSON(text){'),ae.lastIndexOf('})();'));
function parse(text){return vm.runInNewContext(parser+';parseJSON('+JSON.stringify(text)+');',{}, {timeout:1000});}
test('AE parser reads valid Unicode JSON and escaped characters',()=>{const raw={title:'中文 🌱',array:[true,false,null,4.5],text:'Quote " and newline\n'};assert.equal(JSON.stringify(parse(JSON.stringify(raw))),JSON.stringify(raw));});
for(const raw of ['{"x":1,}','[1,]','{"__proto__":{}}','{"constructor":{}}','{"a":function(){}}','true;alert(1)','1e999','['])test(`AE parser rejects non-data input: ${raw}`,()=>assert.throws(()=>parse(raw)));
test('AE cancellation starts no undo group and does not access a project',()=>{let undo=0;const app={beginUndoGroup(){undo++},endUndoGroup(){undo++},get project(){throw Error('must not access project')}};vm.runInNewContext(ae,{File:{openDialog:()=>null},app,alert:()=>assert.fail('no alert on cancel')});assert.equal(undo,0);assert.ok(!/\beval\s*\(/.test(ae));});
test('Figma manifest template requests no network and invents no plugin id',async()=>{const m=JSON.parse(await readFile(new URL('../integrations/figma/manifest.template.json',import.meta.url)));assert.equal('id' in m,false);assert.deepEqual(m.networkAccess.allowedDomains,['none']);});
test('Figma mock imports editable layers rather than raster slide fills',async()=>{
 const code=await readFile(new URL('../integrations/figma/code.js',import.meta.url),'utf8'),nodes=[],messages=[];
 const make=type=>{const node={type,children:[],id:String(nodes.length+1),resize(w,h){this.width=w;this.height=h},appendChild(child){this.children.push(child)},remove(){this.removed=true}};nodes.push(node);return node};
 const figma={showUI(){},ui:{postMessage:v=>messages.push(v)},currentPage:{children:[]},viewport:{scrollAndZoomIntoView(){}},listAvailableFontsAsync:async()=>['Arial','Georgia','Inter'].map(family=>({fontName:{family,style:'Regular'}})),loadFontAsync:async()=>{},createFrame:()=>make('FRAME'),createText:()=>make('TEXT'),createRectangle:()=>make('RECTANGLE'),createEllipse:()=>make('ELLIPSE')};
 vm.runInNewContext(code,{figma,__html__:'mock'});const bundle=JSON.parse(exportDeck(createProject(),'figma').body);await figma.ui.onmessage({type:'import',bundle});assert.equal(messages[0].ok,true);assert.ok(nodes.filter(n=>n.type==='TEXT').length>=2);assert.ok(nodes.every(n=>(n.fills||[]).every(fill=>fill.type==='SOLID')));
 await figma.ui.onmessage({type:'import',bundle:{format:'wrong'}});assert.equal(messages.at(-1).ok,false);
});
