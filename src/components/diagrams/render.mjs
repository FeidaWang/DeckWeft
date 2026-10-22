import {objectAnchor} from '../annotations/identity.mjs';
import {x} from '../../render/web/components/escape.mjs';
/** DWI-033: the scale statement a diagram declares, shown as page text (never a tooltip) so every export carries it. */
export const SCALE=Object.freeze({'not-to-scale':['Schematic, not to scale.','示意图，非比例。'],unverified:['Illustrative; physical properties not verified.','仅作示意；物理属性未经核实。'],'to-scale':['Drawn to scale.','按比例绘制。']});
export function diagram(b,document,theme,{sceneId='scene'}={}){
 const kind=b.diagramType||'relationship',prefix=objectAnchor(sceneId,b.id),marker=prefix+'-arrow',sequence=kind==='sequence',n=b.nodes.length,index=id=>b.nodes.findIndex(n=>n.id===id);
 // A forward process chain (every edge joins one node to the next in author order, each step once) reads as one row: straight arrows, centred labels, each edge label under its arrow.
 const linear=kind==='process'&&n>=2&&n<=6&&b.edges.length===n-1&&b.edges.every(e=>index(e.to)===index(e.from)+1)&&new Set(b.edges.map(e=>e.from)).size===n-1,BW=190,BH=82,GAP=64,M=24,wrap=linear?16:18,lineHeight=linear?23:19;
 const ranks=!sequence&&!linear&&n>=2&&n<=12?layerRanks(b):null;
 if(ranks)return frame(b,document,kind,layered(b,theme,{sceneId,marker,ranks}));
 const edgeRows=Math.max(0,...b.edges.map(e=>(e.label||'').split('\n').reduce((sum,line)=>sum+Math.ceil(Array.from(line).length/wrap),0))),labelY=M+BH+34;
 const width=linear?M*2+n*BW+(n-1)*GAP:Math.max(800,n*240),height=linear?labelY+(edgeRows?edgeRows*lineHeight+8:-14):sequence?150+b.edges.length*64:kind==='process'?Math.ceil(n/3)*170+40+b.edges.length*32:Math.max(250,Math.ceil(n/3)*170+20+b.edges.length*32);
 const positions=b.nodes.map((_,i)=>linear?{x:M+BW/2+i*(BW+GAP),y:M+BH/2}:sequence?{x:(i+.5)*width/n,y:48}:{x:135+(i%3)*265,y:60+Math.floor(i/3)*170}),at=id=>positions[index(id)];
 // Opposite/repeated edges share a node pair, but need separate tracks and label rows.
 const pair=e=>JSON.stringify([e.from,e.to].sort()),tracks=b.edges.map(e=>{const peers=b.edges.filter(v=>pair(v)===pair(e));return {count:peers.length,index:peers.indexOf(e)};}),labelRows=Math.max(1,...b.edges.map(e=>(e.label||'').split('\n').reduce((sum,line)=>sum+Math.ceil(Array.from(line).length/18),0))),laneHeight=labelRows*19+12,mobileSpacing=150+Math.max(0,...tracks.map(t=>t.count-1))*laneHeight;
 const responsive=!sequence&&n<=6&&b.edges.every(e=>Math.abs(b.nodes.findIndex(n=>n.id===e.from)-b.nodes.findIndex(n=>n.id===e.to))===1),mobilePositions=b.nodes.map((_,i)=>({x:180,y:48+i*mobileSpacing})),mobileAt=id=>mobilePositions[b.nodes.findIndex(n=>n.id===id)],mobileHeight=mobileSpacing*n;
 const attr=(name,wide,narrow)=>`${name}="${wide}"${responsive?` data-wide-${name.toLowerCase()}="${wide}" data-narrow-${name.toLowerCase()}="${narrow}"`:''}`;
 // Lines break between words; only a word longer than a line (or unspaced CJK text) is split inside.
 const wrapLine=line=>{const out=[];let current='';for(const word of line.split(/(?<=\s)/u)){if(Array.from(current+word).length<=wrap){current+=word;continue;}if(current.trim())out.push(current.trimEnd());let rest=Array.from(word);while(rest.length>wrap){out.push(rest.slice(0,wrap).join(''));rest=rest.slice(wrap);}current=rest.join('');}if(current.trim()||!out.length)out.push(current.trimEnd());return out;};
 const split=label=>label.split('\n').flatMap(wrapLine);
 const text=(label,xx,yy,centre=false)=>{const lines=split(label),top=centre?yy-(lines.length-1)*lineHeight/2+7:yy;return `<text x="${xx}" y="${top}" text-anchor="middle">${lines.map((line,i)=>`<tspan x="${xx}" dy="${i?lineHeight:0}">${x(line)}</tspan>`).join('')}</text>`;};
 const nodes=b.nodes.map((node,i)=>{const p=positions[i];return `<g id="${objectAnchor(sceneId,b.id,node.id)}" data-object-id="${x(node.id)}" ${attr('transform','translate(0 0)',`translate(${mobilePositions[i].x-p.x} ${mobilePositions[i].y-p.y})`)}>${linear?`<rect x="${p.x-BW/2}" y="${p.y-BH/2}" width="${BW}" height="${BH}" rx="8" fill="var(--paper)" stroke="${theme.accent}" stroke-width="2"/>${text(node.label,p.x,p.y,true)}`:`<rect x="${p.x-102}" y="${p.y-26}" width="204" height="82" rx="8" fill="var(--paper)" stroke="${theme.accent}" stroke-width="2"/>${text(node.label,p.x,p.y)}`}${sequence?`<path d="M${p.x} ${p.y+56}V${height-12}" stroke="currentColor" stroke-dasharray="5 5" opacity=".4"/>`:''}</g>`;}).join('');
 const edges=b.edges.map((e,i)=>{const a=at(e.from),c=at(e.to),self=e.from===e.to,yy=150+i*64,lane=Math.max(a.y,c.y)+90+i*32;
  const ma=mobileAt(e.from),mc=mobileAt(e.to),track=tracks[i].index-(tracks[i].count-1)/2,mobileX=ma.x+track*24,mobilePath=linear?`M${mobileX} ${ma.y+BH/2+6}V${mc.y-BH/2-4}`:self?`M${ma.x+102} ${ma.y}h35v65h-35`:`M${mobileX} ${ma.y+(mc.y>ma.y?56:-26)}V${mc.y+(mc.y>ma.y?-38:68)}`;
  const path=linear?`M${a.x+BW/2+4} ${a.y}H${c.x-BW/2-6}`:sequence?(self?`M${a.x} ${yy}h48v26h-48`:`M${a.x} ${yy}H${c.x}`):(self?`M${a.x+50} ${a.y+56}v40h45v-40`:`M${a.x-20} ${a.y+56}V${lane}H${c.x+20}V${c.y+56}`);
  return `<g ${e.id?`id="${objectAnchor(sceneId,b.id,e.id)}" data-object-id="${x(e.id)}"`:''}><title>${x(e.from+' → '+e.to+(e.label?': '+e.label:''))}</title><path ${attr('d',path,mobilePath)} fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#${x(marker)})"/>${e.label?(()=>{const lx=sequence||!self?(a.x+c.x)/2:a.x+100,ly=linear?labelY:sequence?yy-12:self?a.y+120:lane-8;return `<g data-edge-label="true" ${attr('transform','translate(0 0)',`translate(${self?ma.x+135-lx:270-lx} ${(ma.y+mc.y)/2+16+track*laneHeight-ly})`)}>`+text((sequence?(i+1)+'. ':'')+e.label,lx,ly)+'</g>';})():''}</g>`;
 }).join('');
 return frame(b,document,kind,`<svg ${sequence&&width>800?`style="min-width:${width}px;max-width:none"`:""} ${responsive?'data-responsive-diagram="true"':''}${linear?' data-linear-diagram="true"':''} ${attr('viewBox',`0 0 ${sequence||linear?width:800} ${height}`,`0 0 360 ${mobileHeight}`)} role="img" aria-label="${x(b.nodes.map(n=>n.label).join(' / '))}"><title>${x(kind)}</title><defs><marker id="${x(marker)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>${nodes}${edges}</svg>`);
}
/** The figure around a drawn diagram: caption, the SVG, the exact relationship list, node notes and the scale statement. */
function frame(b,document,kind,svg){
 const zh=document.locale==='zh-CN';
 return `<figure class="semantic-diagram"><figcaption>${x(zh?({relationship:'节点关系',sequence:'时序',process:'带注释流程'})[kind]:kind)}</figcaption><div class="diagram-scroll">${svg}</div><details><summary>${zh?'关系与节点说明':'Relationships and node notes'}</summary><ul>${b.nodes.map(n=>`<li>${x(n.label)}${n.note?' — '+x(n.note):''}</li>`).join('')}</ul><ol>${b.edges.map(e=>`<li>${x(b.nodes.find(n=>n.id===e.from).label)} → ${x(b.nodes.find(n=>n.id===e.to).label)}${e.label?' · '+x(e.label):''}</li>`).join('')}</ol></details>${b.nodes.filter(n=>n.note).map(n=>`<p class="component-note">${x(n.label)}: ${x(n.note)}</p>`).join('')}${b.scale?`<p class="diagram-scale" data-scale="${b.scale}">${x(SCALE[b.scale][zh?1:0])}</p>`:''}</figure>`;
}
/** Each node's layer, one after its furthest predecessor; null when the graph has a cycle or a self edge (those keep the grid layout). */
function layerRanks(b){
 const indeg=new Map(b.nodes.map(n=>[n.id,0])),out=new Map(b.nodes.map(n=>[n.id,[]])),rank=new Map(b.nodes.map(n=>[n.id,0]));
 for(const e of b.edges){if(e.from===e.to)return null;indeg.set(e.to,indeg.get(e.to)+1);out.get(e.from).push(e.to);}
 const queue=b.nodes.map(n=>n.id).filter(id=>!indeg.get(id));let seen=0;
 while(queue.length){const id=queue.shift();seen++;for(const to of out.get(id)){rank.set(to,Math.max(rank.get(to),rank.get(id)+1));indeg.set(to,indeg.get(to)-1);if(!indeg.get(to))queue.push(to);}}
 return seen===b.nodes.length?rank:null;
}
/**
 * An acyclic graph that is not a single chain, drawn in layers from left to right. Connectors between neighbouring layers are
 * right-angled and run only in the gap between the two columns: a fan-out shares one trunk from its source, a fan-in one trunk into
 * its target, and every other connector has its own track. A connector that skips a layer runs in its own lane under the nodes.
 * Each label sits on the stretch of its connector no other connector shares, and the gaps widen to fit the labels, so no line
 * crosses a node and no label covers a line.
 */
function layered(b,theme,{sceneId,marker,ranks}){
 const BW=170,BH=78,VG=44,M=24,LH=20,WRAP=9,FONT=16;
 const lines=label=>{const out=[];for(const part of String(label||'').split('\n')){let line='',w=0;for(const ch of Array.from(part)){const cw=/[⺀-￯]/u.test(ch)?1:.56;if(w+cw>WRAP&&line){out.push(line);line='';w=0;}line+=ch;w+=cw;}if(line||!out.length)out.push(line);}return out;};
 const width=label=>Math.max(0,...lines(label).map(l=>Array.from(l).reduce((s,ch)=>s+(/[⺀-￯]/u.test(ch)?1:.56),0)))*FONT;
 const text=(label,cx,cy,anchorBottom=false)=>{const ls=lines(label),top=anchorBottom?cy-(ls.length-1)*LH:cy-(ls.length-1)*LH/2+6;return `<text x="${cx}" y="${top}" text-anchor="middle">${ls.map((l,i)=>`<tspan x="${cx}" dy="${i?LH:0}">${x(l)}</tspan>`).join('')}</text>`;};
 const cols=Math.max(...ranks.values())+1,columns=Array.from({length:cols},()=>[]);
 for(const node of b.nodes)columns[ranks.get(node.id)].push(node.id);
 const preds=id=>b.edges.filter(e=>e.to===id).map(e=>e.from),row=new Map();
 columns.forEach((col,c)=>{if(c)col.sort((p,q)=>{const mean=id=>{const r=preds(id).filter(v=>ranks.get(v)===c-1).map(v=>row.get(v));return r.length?r.reduce((s,v)=>s+v,0)/r.length:Infinity;};return mean(p)-mean(q)||0;});col.forEach((id,i)=>row.set(id,i));});
 const outdeg=id=>b.edges.filter(e=>e.from===id).length,indeg=id=>b.edges.filter(e=>e.to===id).length;
 const adjacent=b.edges.filter(e=>ranks.get(e.to)===ranks.get(e.from)+1),skips=b.edges.filter(e=>ranks.get(e.to)>ranks.get(e.from)+1);
 // fan-out shares its source's trunk, fan-in its target's; every group gets one vertical track in the gap
 const groupOf=e=>outdeg(e.from)>1?'s:'+e.from:indeg(e.to)>1?'t:'+e.to:'e:'+b.edges.indexOf(e);
 const maxRows=Math.max(...columns.map(c=>c.length)),nodeArea=maxRows*BH+(maxRows-1)*VG,cy=id=>{const c=columns[ranks.get(id)];return M+(nodeArea-(c.length*BH+(c.length-1)*VG))/2+row.get(id)*(BH+VG)+BH/2;};
 const gaps=Array.from({length:Math.max(0,cols-1)},(_,g)=>{const es=adjacent.filter(e=>ranks.get(e.from)===g),groups=[...new Set(es.map(groupOf))];groups.sort((p,q)=>{const y=k=>{const m=es.filter(e=>groupOf(e)===k);return m.reduce((s,e)=>s+cy(e.from)+cy(e.to),0)/m.length;};return y(p)-y(q);});return {groups,width:Math.max(112,(groups.length+1)*(Math.max(0,...es.map(e=>width(e.label)))+28))};});
 const left=[];for(let c=0,acc=M;c<cols;c++){left.push(acc);acc+=BW+(gaps[c]?.width||0);}
 const at=id=>({x:left[ranks.get(id)]+BW/2,y:cy(id)}),edgeG=(e,inner)=>`<g ${e.id?`id="${objectAnchor(sceneId,b.id,e.id)}" data-object-id="${x(e.id)}"`:''}><title>${x(e.from+' → '+e.to+(e.label?': '+e.label:''))}</title>${inner}</g>`;
 const arrow=d=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#${x(marker)})"/>`;
 const drawn=new Map(adjacent.map(e=>[e,(()=>{
  const a=at(e.from),c=at(e.to),gap=gaps[ranks.get(e.from)],k=gap.groups.indexOf(groupOf(e)),gx=a.x+BW/2,tx=Math.round(gx+(k+1)*gap.width/(gap.groups.length+1)),ar=a.x+BW/2+4,cl=c.x-BW/2-6;
  const straight=a.y===c.y&&groupOf(e).startsWith('e:'),d=straight?`M${ar} ${a.y}H${cl}`:`M${ar} ${a.y}H${tx}V${c.y}H${cl}`;
  // the label goes on the stretch this connector does not share: after the trunk for a fan-out, before it for a fan-in
  const fanIn=groupOf(e).startsWith('t:'),label=!e.label?'':straight?text(e.label,(ar+cl)/2,a.y-10,true):fanIn?text(e.label,(ar+tx)/2,a.y-10,true):text(e.label,(tx+cl)/2,c.y-10,true);
  return edgeG(e,arrow(d)+(label?`<g data-edge-label="true">${label}</g>`:''));
 })()]));
 let lane=M+nodeArea+28;
 skips.forEach((e,i)=>{const a=at(e.from),c=at(e.to),y=lane+(e.label?lines(e.label).length*LH:0)+8;lane=y+14;const off=(i%3-1)*18,d=`M${a.x+off} ${a.y+BH/2+2}V${y}H${c.x+off}V${c.y+BH/2+6}`;drawn.set(e,edgeG(e,arrow(d)+(e.label?`<g data-edge-label="true">${text(e.label,(a.x+c.x)/2,y-8,true)}</g>`:'')));});
 const W=left[cols-1]+BW+M,H=(skips.length?lane+M:M+nodeArea+M);
 const nodes=b.nodes.map(node=>{const p=at(node.id);return `<g id="${objectAnchor(sceneId,b.id,node.id)}" data-object-id="${x(node.id)}"><rect x="${p.x-BW/2}" y="${p.y-BH/2}" width="${BW}" height="${BH}" rx="8" fill="var(--paper)" stroke="${theme.accent}" stroke-width="2"/>${text(node.label,p.x,p.y)}</g>`;}).join('');
 return `<svg data-layered-diagram="true" viewBox="0 0 ${W} ${H}" role="img" aria-label="${x(b.nodes.map(n=>n.label).join(' / '))}"><title>${x(b.diagramType||'relationship')}</title><defs><marker id="${x(marker)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>${nodes}${b.edges.map(e=>drawn.get(e)).join('')}</svg>`;
}
