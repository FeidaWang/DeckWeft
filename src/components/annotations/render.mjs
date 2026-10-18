import {objectAnchor} from './identity.mjs';
import {x} from '../../render/web/components/escape.mjs';
export function annotation(b,document,{sceneId='scene'}={}){
 const t=b.target,block=document.blocks.find(v=>v.id===t.blockId),d=block.type==='chart'?document.datasets.find(d=>d.id===block.datasetId):null;
 const object=t.line?'line-'+t.line:t.objectId?t.objectId:null;
 const href=object?objectAnchor(sceneId,t.blockId,object,t.seriesId||''):null;
 return `<aside class="semantic-annotation" data-target-block="${x(t.blockId)}"${t.objectId?` data-target-object="${x(t.objectId)}"`:''}><p>${x(b.text)}</p>${href?`<a href="#${x(href)}">${x(document.locale==='zh-CN'?'查看注释对象':'View annotated object')}</a>`:`<span>${x(document.locale==='zh-CN'?'对象说明':'Object note')}</span>`}</aside>`;
}
