/**
 * Checks a compiled PowerPoint package by reading its bytes back, never the compiler's own model alone (S7, VIS-016).
 * Three of the four export results come from here: PowerPoint editability, the page-by-page check against the derived scene,
 * and accessibility of the package. A package that only opens is not a pass.
 */
import {inflateRawSync} from 'node:zlib';
import {SLIDE} from './ooxml.mjs';
import {crc32} from '../../render/zip.mjs';

/**
 * Reads a ZIP32 archive written by this repository's zip writer (stored or deflated entries). Not a general extractor: it
 * bounds the inflated size per entry and in total, checks local headers, lengths and CRC-32, and refuses duplicate names.
 */
export function readZip(bytes,{maxEntries=20000,maxBytes=256*1024*1024}={}){
 const buf=Buffer.from(bytes),files=new Map();let end=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--)if(buf.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('Not a ZIP archive.');
 const count=buf.readUInt16LE(end+10);let at=buf.readUInt32LE(end+16),total=0;if(count>maxEntries)throw new Error('Too many archive entries.');
 const inside=(o,n)=>{if(o<0||o+n>buf.length)throw new Error('Archive entry outside the file.');};
 for(let n=0;n<count;n++){
  inside(at,46);if(buf.readUInt32LE(at)!==0x02014b50)throw new Error('Corrupt central directory.');
  const method=buf.readUInt16LE(at+10),crc=buf.readUInt32LE(at+16),size=buf.readUInt32LE(at+20),raw=buf.readUInt32LE(at+24),nameLength=buf.readUInt16LE(at+28),extra=buf.readUInt16LE(at+30),comment=buf.readUInt16LE(at+32),offset=buf.readUInt32LE(at+42);
  inside(at+46,nameLength);const name=buf.toString('utf8',at+46,at+46+nameLength);if(files.has(name))throw new Error('Duplicate archive entry '+name);
  inside(offset,30);if(buf.readUInt32LE(offset)!==0x04034b50)throw new Error('Corrupt local header for '+name);
  const local=offset+30+buf.readUInt16LE(offset+26)+buf.readUInt16LE(offset+28);inside(local,size);const data=buf.subarray(local,local+size);
  if(raw>maxBytes-total)throw new Error('Archive expands beyond the limit.');
  const body=method===0?Buffer.from(data):method===8?inflateRawSync(data,{maxOutputLength:Math.max(1,raw)}):(()=>{throw new Error('Unsupported compression.');})();
  if(body.length!==raw||crc32(body)!==crc)throw new Error('Length or CRC mismatch for '+name);
  total+=raw;files.set(name,body);at+=46+nameLength+extra+comment;
 }
 return files;
}

const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(m,e)=>{if(e[0]==='#')return String.fromCodePoint(e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):+e.slice(1));if(!Object.hasOwn(ENT,e))throw new Error('Unknown XML entity &'+e+';');return ENT[e];});
/** A strict, small XML reader: elements, attributes and text. Throws on mismatched or unclosed tags. */
export function parseXML(text){
 const root={name:'#document',attrs:{},children:[],text:''},stack=[root],re=/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;let m,last=0;
 while((m=re.exec(text))){
  if(m.index!==last)throw new Error('Malformed XML near offset '+last);last=re.lastIndex;
  const top=stack.at(-1);
  if(m[1]!==undefined){top.text+=m[1];continue;}
  if(m[2]){const open=stack.pop();if(!open||open.name!==m[2])throw new Error(`Mismatched </${m[2]}>`);continue;}
  if(m[3]){const attrs={};for(const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1]]=decode(a[2]??a[3]);const el={name:m[3],attrs,children:[],text:''};top.children.push(el);if(!m[5])stack.push(el);continue;}
  if(m[6]!==undefined){if(stack.length===1){if(m[6].trim())throw new Error('Text outside the root element.');continue;}top.text+=decode(m[6]);}
 }
 if(last!==text.length||stack.length!==1)throw new Error('Unclosed XML element.');
 if(root.children.length!==1)throw new Error('XML needs exactly one root element.');
 return root.children[0];
}
const all=(el,name,out=[])=>{for(const c of el.children){if(c.name===name)out.push(c);all(c,name,out);}return out;};
const first=(el,name)=>all(el,name)[0]||null;
const textOf=el=>all(el,'a:t').map(t=>t.text).join('');
const norm=s=>String(s).normalize('NFKC').replace(/\s+/g,'');
const lum=hex=>{const c=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
export const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

/** The text a reader must find for one block; it mirrors the web render check (src/quality/render-checks.mjs). */
export function expectedBlockText(block,document){
 if(block.type==='image')return [block.alt];
 if(block.type==='metric')return [new Intl.NumberFormat(document.locale,{maximumSignificantDigits:21}).format(block.value),block.unit,block.label];
 if(block.type==='table')return [...block.columns,...block.rows.flat()];
 if(block.type==='list')return block.items;
 if(block.type==='diagram')return [...block.nodes.map(n=>n.label),...block.edges.map(e=>e.label).filter(Boolean)];
 if(block.type==='chart'){const d=document.datasets.find(d=>d.id===block.datasetId);return [...d.categories,...d.series.flatMap(s=>[s.label,...s.values.filter(v=>v!==null).map(String),...(s.xValues||[]).filter(v=>v!==null).map(String)])];}
 return typeof block.text==='string'?[block.text]:[];
}

/** Every slide part, its shapes and relationships, its notes text and the chart parts with their embedded workbooks. */
export function inspectPackage(bytes){
 const files=readZip(bytes),errors=[],xml={};
 for(const [name,data]of files)if(/\.(xml|rels)$/.test(name)){try{xml[name]=parseXML(data.toString('utf8'));}catch(e){errors.push({part:name,message:e.message});}}
 const types=xml['[Content_Types].xml'],defaults=new Set(all(types,'Default').map(d=>d.attrs.Extension)),overrides=new Set(all(types,'Override').map(o=>o.attrs.PartName.slice(1)));
 for(const name of files.keys())if(!name.endsWith('/')&&!overrides.has(name)&&!defaults.has(name.split('.').pop()))errors.push({part:name,message:'No content type.'});
 const rels={};
 for(const [name,tree]of Object.entries(xml))if(name.endsWith('.rels')){const owner=name==='_rels/.rels'?'':name.replace(/_rels\/([^/]+)\.rels$/,'$1'),dir=owner.includes('/')?owner.slice(0,owner.lastIndexOf('/')+1):'';
  rels[owner]=all(tree,'Relationship').map(r=>{const external=r.attrs.TargetMode==='External',target=external?r.attrs.Target:resolve(dir,r.attrs.Target);if(!external&&!files.has(target))errors.push({part:name,message:'Missing relationship target '+target});return {id:r.attrs.Id,type:r.attrs.Type.split('/').pop(),target,external};});}
 const pres=xml['ppt/presentation.xml'],presRels=rels['ppt/presentation.xml']||[];
 const slideNames=all(pres,'p:sldId').map(s=>presRels.find(r=>r.id===s.attrs['r:id'])?.target);
 const slides=slideNames.map(name=>{
  const tree=xml[name],r=rels[name]||[],tr=first(tree,'p:spTree'),shapes=[];
  for(const el of tr.children){if(!['p:sp','p:pic','p:graphicFrame','p:cxnSp','p:grpSp'].includes(el.name))continue;
   const c=first(el,'p:cNvPr'),xf=first(el,'a:xfrm')||first(el,'p:xfrm'),off=xf&&first(xf,'a:off'),ext=xf&&first(xf,'a:ext'),graphic=first(el,'a:graphicData');
   const kind=el.name==='p:pic'?'picture':el.name==='p:cxnSp'?'connector':el.name==='p:graphicFrame'?(graphic?.attrs.uri.endsWith('/chart')?'chart':graphic?.attrs.uri.endsWith('/table')?'table':'frame'):first(el,'p:txBody')&&textOf(el).length?'text':'shape';
   const runs=all(el,'a:rPr'),chartRel=kind==='chart'?first(el,'c:chart')?.attrs['r:id']:null,picRel=kind==='picture'?first(el,'a:blip')?.attrs['r:embed']:null;
   shapes.push({id:+c.attrs.id,name:c.attrs.name,descr:c.attrs.descr||'',decorative:all(c,'adec:decorative').some(d=>d.attrs.val==='1'),title:all(el,'p:ph').some(p=>p.attrs.type==='title'),kind,
    box:off&&ext?{x:+off.attrs.x,y:+off.attrs.y,width:+ext.attrs.cx,height:+ext.attrs.cy}:null,text:kind==='table'?all(el,'a:tc').map(textOf).join('\n'):textOf(el),
    langs:[...new Set(runs.map(r=>r.attrs.lang).filter(Boolean))],runsWithoutLang:runs.filter(r=>!r.attrs.lang).length,sizes:runs.map(r=>+r.attrs.sz).filter(Boolean),colors:runs.map(r=>first(r,'a:srgbClr')?.attrs.val).filter(Boolean),
    links:all(el,'a:hlinkClick').map(h=>r.find(x=>x.id===h.attrs['r:id'])||{missing:h.attrs['r:id']}),chart:chartRel?r.find(x=>x.id===chartRel)?.target:null,image:picRel?r.find(x=>x.id===picRel)?.target:null});
  }
  const notesName=r.find(x=>x.type==='notesSlide')?.target,bg=first(tree,'p:bg');
  return {name,title:tree.children[0]?.attrs?.name,background:first(bg,'a:srgbClr')?.attrs.val||null,shapes,timing:!!first(tree,'p:timing'),transition:!!first(tree,'p:transition'),notes:notesName&&xml[notesName]?textOf(xml[notesName]):'',notesLines:notesName&&xml[notesName]?all(xml[notesName],'a:p').map(textOf):[]};
 });
 const charts={};
 for(const [name,tree]of Object.entries(xml))if(/^ppt\/charts\/chart\d+\.xml$/.test(name)){
  const ext=first(tree,'c:externalData')?.attrs['r:id'],target=(rels[name]||[]).find(r=>r.id===ext)?.target;let workbook=null;
  if(target&&files.has(target)){try{const wb=readZip(files.get(target)),sheet=parseXML(wb.get('xl/worksheets/sheet1.xml').toString('utf8'));workbook=all(sheet,'c').map(c=>({ref:c.attrs.r,value:c.attrs.t==='inlineStr'?all(c,'t').map(t=>t.text).join(''):first(c,'v')?.text??''}));}catch(e){errors.push({part:target,message:'Embedded workbook: '+e.message});}}
  const cells=(el)=>{if(!el)return [];const ref=first(el,'c:f')?.text.match(/^Sheet1!\$([A-Z]+)\$(\d+):\$[A-Z]+\$(\d+)$/);return all(el,'c:pt').map(p=>({idx:+p.attrs.idx,value:first(p,'c:v')?.text,ref:ref?ref[1]+(+ref[2]+ +p.attrs.idx):null}));};
  const series=all(tree,'c:ser').map(s=>({name:all(first(s,'c:tx')||{children:[]},'c:v').map(v=>v.text).join(''),categories:cells(first(s,'c:cat')||first(s,'c:xVal')),values:cells(first(s,'c:val')||first(s,'c:yVal'))}));
  charts[name]={workbookPart:target||null,workbook,series,kind:['c:lineChart','c:barChart','c:areaChart','c:scatterChart'].find(k=>first(tree,k))?.slice(2)||null};
 }
 return {parts:[...files.keys()],errors,slides,charts,rels};
}
const resolve=(dir,target)=>{const parts=(dir+target).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');};

/**
 * The PowerPoint results for one deck. `compiled` is the compiler's return value (its receipts and per-slide records give the
 * declared level of each element); everything else is read from the bytes.
 */
export function auditPPTX({bytes,document,plan,scenes,compiled,levels}){
 const pkg=inspectPackage(bytes),blocks=new Map(document.blocks.map(b=>[b.id,b])),receipts=compiled.receipts;
 const fail=(list,check,detail)=>list.push({check,...detail});
 const scene=[],edit=[],access=[],editNotes=[];
 if(pkg.errors.length)fail(edit,'package',{errors:pkg.errors});
 for(const r of receipts.filter(r=>r.error))fail(edit,'element delivered',{sceneId:r.sceneId,blockId:r.blockId,code:r.code,element:r.element});
 if(pkg.slides.length!==plan.scenes.length)fail(scene,'slide count',{slides:pkg.slides.length,scenes:plan.scenes.length});
 const counts={text:0,title:0,table:0,chart:0,connector:0,shape:0,picture:0,l3Picture:0,decorative:0,receipts:receipts.length,charts:Object.keys(pkg.charts).length};
 plan.scenes.forEach((sp,i)=>{
  const slide=pkg.slides[i];if(!slide)return;const derived=scenes[i],order=derived.readingOrder.map(r=>derived.regions.find(x=>x.id===r).blockId);
  const owner=s=>s.name.includes('/')&&blocks.has(s.name.split('/')[0])?s.name.split('/')[0]:null;
  if(slide.timing||slide.transition)fail(scene,'motion stopped',{sceneId:sp.id,timing:slide.timing,transition:slide.transition});
  // Reading order: blocks appear in the derived scene's reading order.
  const seen=[];for(const s of slide.shapes){const b=owner(s);if(b&&!s.decorative&&!seen.includes(b))seen.push(b);}
  const expectedOrder=order.filter(b=>seen.includes(b));if(JSON.stringify(seen)!==JSON.stringify(expectedOrder))fail(scene,'reading order',{sceneId:sp.id,slide:seen,scene:expectedOrder});
  for(const blockId of sp.blockIds){
   const block=blocks.get(blockId),own=slide.shapes.filter(s=>owner(s)===blockId),level=levels.find(l=>l.blockId===blockId)?.pptx.level;
   const hidden=receipts.some(r=>r.sceneId===sp.id&&r.blockId===blockId&&r.code==='PPTX_DISCLOSURE')&&block.type==='image';
   const disclosed=!!sp.disclosure?.blockIds.includes(blockId)&&receipts.some(r=>r.sceneId===sp.id&&r.blockId===blockId&&r.code==='PPTX_DISCLOSURE');
   if(!own.length&&!hidden&&!disclosed){fail(scene,'block present',{sceneId:sp.id,blockId});continue;}
   // Text coverage: slide text, table cells, chart caches, alt text and the notes all count; nothing may be lost.
   const chartText=own.filter(s=>s.chart).flatMap(s=>{const c=pkg.charts[s.chart];return c?c.series.flatMap(x=>[x.name,...x.categories.map(p=>p.value),...x.values.map(p=>p.value)]):[];});
   const pool=norm([...own.map(s=>s.text+' '+s.descr),...chartText,slide.notes].join(' '));
   const missing=expectedBlockText(block,document).filter(t=>t!==''&&!pool.includes(norm(t)));
   if(missing.length)fail(scene,'text coverage',{sceneId:sp.id,blockId,missing:missing.slice(0,10)});
   // Editability: a block declared L1 is native objects; only image blocks and L3 elements are pictures.
   const pics=own.filter(s=>s.kind==='picture');
   if(level==='L1'&&block.type!=='image'&&pics.length)fail(edit,'L1 without pictures',{sceneId:sp.id,blockId,pictures:pics.map(p=>p.name)});
   if(level==='L3'&&!receipts.some(r=>r.blockId===blockId&&r.code==='PPTX_CHART_IMAGE'))fail(edit,'L3 has a receipt',{sceneId:sp.id,blockId});
   if(block.type==='chart'&&level==='L1'){const frame=own.find(s=>s.kind==='chart'||s.kind==='table');if(!frame)fail(edit,'native chart',{sceneId:sp.id,blockId});
    else if(frame.kind==='chart'){const c=pkg.charts[frame.chart];if(!c?.workbook)fail(edit,'embedded chart data',{sceneId:sp.id,blockId});
     else{const d=document.datasets.find(d=>d.id===block.datasetId),cache=c.series.flatMap(x=>x.values.map(p=>Number(p.value))),cell=new Map(c.workbook.map(w=>[w.ref,w.value]));
      const misaligned=c.series.flatMap(x=>[...x.values,...x.categories]).filter(p=>!p.ref||String(cell.get(p.ref))!==String(p.value)&&Number(cell.get(p.ref))!==Number(p.value));
      if(misaligned.length)fail(edit,'workbook equals chart cache',{sceneId:sp.id,blockId,cells:misaligned.slice(0,5).map(p=>p.ref)});
      const values=new Set(d.series.flatMap(s=>s.values.filter(v=>v!==null)));if(cache.some(v=>!values.has(v)))fail(edit,'chart values come from the dataset',{sceneId:sp.id,blockId});}}}
   if(['heading','paragraph','quote','callout','list','metric','citation','annotation','code'].includes(block.type)&&!disclosed&&!own.some(s=>s.kind==='text'||s.title))fail(edit,'native text',{sceneId:sp.id,blockId});
   if(block.type==='table'&&!own.some(s=>s.kind==='table')&&!receipts.some(r=>r.sceneId===sp.id&&r.blockId===blockId&&r.code==='PPTX_TABLE_AS_CARDS'))fail(edit,'native table',{sceneId:sp.id,blockId});
   if(block.type==='diagram'){const nodes=own.filter(s=>s.kind==='text'||s.kind==='shape').length,edges=own.filter(s=>s.kind==='connector').length;if(nodes<block.nodes.length||edges<block.edges.length)fail(edit,'diagram shapes and connectors',{sceneId:sp.id,blockId,nodes,edges});}
  }
  // No whole-slide screenshot: a picture covering most of the slide must be an image block's own picture.
  for(const s of slide.shapes.filter(s=>s.kind==='picture')){const area=s.box?(s.box.width*s.box.height)/(SLIDE.width*SLIDE.height):0,b=owner(s);
   if(!b||!(blocks.get(b)?.type==='image'&&s.name.endsWith('/image'))&&!(blocks.get(b)?.type==='chart'&&s.name.endsWith('/chart-image')))fail(edit,'picture belongs to an element',{sceneId:sp.id,name:s.name});
   if(area>=.9&&blocks.get(b)?.type!=='image')fail(edit,'no whole-slide picture',{sceneId:sp.id,name:s.name,area:Math.round(area*100)});}
  for(const s of slide.shapes){
   counts[s.title?'title':s.kind]=(counts[s.title?'title':s.kind]||0)+1;if(s.decorative)counts.decorative++;if(s.kind==='picture'&&s.name.endsWith('/chart-image'))counts.l3Picture++;
   if(s.box&&(s.box.x<-SLIDE.width*.01||s.box.y<-SLIDE.height*.01||s.box.x+s.box.width>SLIDE.width*1.01||s.box.y+s.box.height>SLIDE.height*1.01))fail(scene,'inside the slide',{sceneId:sp.id,name:s.name});
  }
  // Accessibility of the package.
  if(!slide.shapes.some(s=>s.title&&s.text.trim()))fail(access,'slide title',{sceneId:sp.id});
  for(const s of slide.shapes)if(['picture','chart','table'].includes(s.kind)&&!s.descr.trim()&&!s.decorative)fail(access,'alternative text',{sceneId:sp.id,name:s.name});
  for(const s of slide.shapes)if((s.name.startsWith('decor/')||s.name.startsWith('chrome/'))&&!s.decorative)fail(access,'decoration marked decorative',{sceneId:sp.id,name:s.name});
  for(const s of slide.shapes)if(s.runsWithoutLang)fail(access,'language on every run',{sceneId:sp.id,name:s.name});
  for(const s of slide.shapes)for(const l of s.links)if(l.missing||!l.external||!/^https?:\/\//.test(l.target))fail(access,'links resolve to sources',{sceneId:sp.id,name:s.name});
  if(!slide.notes.trim())fail(access,'notes present',{sceneId:sp.id});
  if(JSON.stringify(seen)!==JSON.stringify(expectedOrder))fail(access,'reading order',{sceneId:sp.id});
 });
 // Contrast is computed by the compiler against what lies under each text box; the package colours are the measured web colours.
 const low=compiled.slides.flatMap(s=>s.elements.filter(e=>e.contrast&&e.contrast.ratio+.01<e.contrast.required).map(e=>({sceneId:s.sceneId,name:e.name,...e.contrast})));
 if(low.length)fail(access,'text contrast',{items:low});
 const sizes=pkg.slides.flatMap(s=>s.shapes.filter(x=>!x.decorative).flatMap(x=>x.sizes)),smallest=sizes.length?Math.min(...sizes)/100:null;
 if(smallest!==null&&smallest<7)editNotes.push(`Smallest text is ${smallest} pt after fitting the scene to the slide.`);
 const status=list=>list.length?'fail':'pass';
 return {
  package:{parts:pkg.parts.length,errors:pkg.errors},
  editability:{status:status(edit),failures:edit,counts,notes:editNotes},
  sceneCheck:{status:status(scene),failures:scene},
  accessibility:{status:status(access),failures:access,smallestTextPt:smallest,scope:'Package checks only: slide titles, alt text, decorative marking, reading order, language, links, notes and contrast. No screen reader or PowerPoint Accessibility Checker was run.'},
  slides:pkg.slides.map(s=>({name:s.name,title:s.title,shapes:s.shapes.length,pictures:s.shapes.filter(x=>x.kind==='picture').length,charts:s.shapes.filter(x=>x.kind==='chart').length,tables:s.shapes.filter(x=>x.kind==='table').length,notesLines:s.notesLines.length}))
 };
}
