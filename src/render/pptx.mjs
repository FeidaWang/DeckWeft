import {sceneAsset} from './assets.mjs';
// A deliberately small PresentationML adapter: editable text, rectangles, ellipses, notes.
// No flattened slide screenshots, remote resources, macros, or embedded scripts.
import { zipFiles } from './zip.mjs';
import { escapeXML as esc } from './svg.mjs';
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const P='http://schemas.openxmlformats.org/presentationml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS=`xmlns:a="${A}" xmlns:p="${P}" xmlns:r="${R}"`;
const xml=body=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body;
const emu=n=>Math.round(n*9525);
const fill=color=>`<a:solidFill><a:srgbClr val="${color.replace('#','')}"/></a:solidFill>`;
const group='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const map='<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>';
const override='<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>';
const relationships=rels=>xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(([id,type,target])=>`<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join('')}</Relationships>`);
function paragraphs(lines,font,size,color,language,spacing){
  const fontProps=`${fill(color)}<a:latin typeface="${esc(font)}"/><a:ea typeface="${esc(font)}"/>`;
  return lines.map(line=>`<a:p><a:pPr marL="0" indent="0"><a:lnSpc><a:spcPts val="${Math.round(spacing*75)}"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft></a:pPr><a:r><a:rPr lang="${language}" sz="${Math.round(size*75)}" dirty="0">${fontProps}</a:rPr><a:t xml:space="preserve">${esc(line)}</a:t></a:r><a:endParaRPr lang="${language}" sz="${Math.round(size*75)}"/></a:p>`).join('');
}
function shape(n,id,locale){
  const tx=n.type==='text', preset=n.type==='ellipse'?'ellipse':n.radius?'roundRect':'rect';
  const transform=`<a:xfrm><a:off x="${emu(n.x)}" y="${emu(n.y)}"/><a:ext cx="${emu(n.w)}" cy="${emu(n.h)}"/></a:xfrm>`;
  const adjustment=!tx&&preset==='roundRect'?`<a:avLst><a:gd name="adj" fmla="val ${Math.round(Math.min(.5,n.radius/Math.min(n.w,n.h))*100000)}"/></a:avLst>`:'<a:avLst/>';
  const props=`<p:spPr>${transform}<a:prstGeom prst="${tx?'rect':preset}">${adjustment}</a:prstGeom>${tx?'<a:noFill/>':fill(n.fill)}<a:ln><a:noFill/></a:ln></p:spPr>`;
  const text=tx?`<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paragraphs(n.lines,n.fontFamily,n.fontSize,n.color,locale==='en'?'en-US':'zh-CN',n.lineHeight)}</p:txBody>`:'';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(n.id)}"/><p:cNvSpPr${tx?' txBox="1"':''}/><p:nvPr/></p:nvSpPr>${props}${text}</p:sp>`;
}
function picture(n,id,rel){
 const asset=sceneAsset(n.asset,n.resource),scale=Math.min(n.w/asset.width,n.h/asset.height),w=asset.width*scale,h=asset.height*scale,x=n.x+(n.w-w)/2,y=n.y+(n.h-h)/2;
 const xf=`<a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>`;
 return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(n.id)}" descr="${esc(n.alt)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xf}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}
function theme(){
  const colors={dk1:'232B27',lt1:'FFFFFF',dk2:'182923',lt2:'F8F5EE',accent1:'A6422A',accent2:'166C65',accent3:'6A5ACD',accent4:'D8D1C4',accent5:'759786',accent6:'E7BA9F',hlink:'166C65',folHlink:'6A5ACD'};
  const fills=Array.from({length:3},()=>'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join('');
  const lines=[6350,12700,19050].map(w=>`<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`).join('');
  return xml(`<a:theme xmlns:a="${A}" name="DeckWeft"><a:themeElements><a:clrScheme name="DeckWeft">${Object.entries(colors).map(([k,v])=>`<a:${k}><a:srgbClr val="${v}"/></a:${k}>`).join('')}</a:clrScheme><a:fontScheme name="DeckWeft"><a:majorFont><a:latin typeface="Georgia"/><a:ea typeface="Noto Serif CJK SC"/><a:cs typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface="Noto Sans CJK SC"/><a:cs typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="DeckWeft"><a:fillStyleLst>${fills}</a:fillStyleLst><a:lnStyleLst>${lines}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fills}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`);
}
export function renderPPTX(project,resolved,{includeNotes=false}={}){
  const entries=[],types=[],media=new Map();
  for(const result of resolved)for(const n of result.scene.nodes)if(n.type==='image'&&!media.has(n.asset))media.set(n.asset,{...sceneAsset(n.asset,n.resource),index:media.size+1});
  const put=(name,data,type)=>{entries.push([name,data]);if(type)types.push([name,type]);};
  for(const asset of media.values())put(`ppt/media/image${asset.index}.${asset.extension}`,asset.bytes);
  const ppt='application/vnd.openxmlformats-officedocument.presentationml.';
  put('_rels/.rels',xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`));
  put('docProps/core.xml',xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(project.title)}</dc:title><dc:creator>DeckWeft</dc:creator><dc:description>Editable text and shapes. Review fonts in the target presentation app.</dc:description></cp:coreProperties>`),'application/vnd.openxmlformats-package.core-properties+xml');
  put('docProps/app.xml',xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DeckWeft</Application><PresentationFormat>Custom</PresentationFormat><Slides>${resolved.length}</Slides><Notes>${resolved.length}</Notes></Properties>`),'application/vnd.openxmlformats-officedocument.extended-properties+xml');
  put('ppt/theme/theme1.xml',theme(),'application/vnd.openxmlformats-officedocument.theme+xml');
  // PowerPoint repairs a package that shares the slide theme with its notes master.
  // Keep notes independently addressable, even when both themes have identical values.
  put('ppt/theme/theme2.xml',theme(),'application/vnd.openxmlformats-officedocument.theme+xml');
  put('ppt/slideMasters/slideMaster1.xml',xml(`<p:sldMaster ${NS}><p:cSld><p:spTree>${group}</p:spTree></p:cSld>${map}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`),ppt+'slideMaster+xml');
  put('ppt/slideMasters/_rels/slideMaster1.xml.rels',relationships([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]));
  put('ppt/slideLayouts/slideLayout1.xml',xml(`<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld>${override}</p:sldLayout>`),ppt+'slideLayout+xml');
  put('ppt/slideLayouts/_rels/slideLayout1.xml.rels',relationships([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]));
  const notesBody=(text)=>`<p:sp><p:nvSpPr><p:cNvPr id="2" name="Speaker notes"/><p:cNvSpPr txBox="1"/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs(text.split('\n'),'Arial',16,'#232B27','en-US',20)}</p:txBody></p:sp>`;
  put('ppt/notesMasters/notesMaster1.xml',xml(`<p:notesMaster ${NS}><p:cSld><p:spTree>${group}${notesBody('')}</p:spTree></p:cSld>${map}<p:notesStyle/></p:notesMaster>`),ppt+'notesMaster+xml');
  put('ppt/notesMasters/_rels/notesMaster1.xml.rels',relationships([['rId1','theme','../theme/theme2.xml']]));
  resolved.forEach((result,i)=>{
    const s=result.scene,slide=project.slides[i],n=i+1;
    put(`ppt/slides/slide${n}.xml`,xml(`<p:sld ${NS}><p:cSld name="${esc(slide.content.title)}"><p:bg><p:bgPr>${fill(s.background)}<a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${s.nodes.map((node,j)=>node.type==='image'?picture(node,j+2,`rIdImage${j}`):shape(node,j+2,project.locale)).join('')}</p:spTree></p:cSld>${override}</p:sld>`),ppt+'slide+xml');
    put(`ppt/slides/_rels/slide${n}.xml.rels`,relationships([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','notesSlide',`../notesSlides/notesSlide${n}.xml`],...s.nodes.flatMap((node,j)=>node.type==='image'?[[`rIdImage${j}`,'image',`../media/image${media.get(node.asset).index}.${media.get(node.asset).extension}`]]:[]) ]));
    const sources=slide.sourceIds.map(id=>{const source=project.sources.find(s=>s.id===id);return `${source.title}: ${source.url}`});
    const notes=includeNotes?[slide.notes,...sources].filter(Boolean).join('\n\n'):'';
    put(`ppt/notesSlides/notesSlide${n}.xml`,xml(`<p:notes ${NS}><p:cSld><p:spTree>${group}${notesBody(notes)}</p:spTree></p:cSld>${override}</p:notes>`),ppt+'notesSlide+xml');
    put(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`,relationships([['rId1','notesMaster','../notesMasters/notesMaster1.xml'],['rId2','slide',`../slides/slide${n}.xml`]]));
  });
  put('ppt/presentation.xml',xml(`<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${resolved.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${emu(resolved[0].scene.width)}" cy="${emu(resolved[0].scene.height)}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`),ppt+'presentation.main+xml');
  put('ppt/_rels/presentation.xml.rels',relationships([['rId1','slideMaster','slideMasters/slideMaster1.xml'],['rId2','notesMaster','notesMasters/notesMaster1.xml'],...resolved.map((_,i)=>[`rId${i+3}`,'slide',`slides/slide${i+1}.xml`]),[`rId${resolved.length+3}`,'presProps','presProps.xml'],[`rId${resolved.length+4}`,'theme','theme/theme1.xml']]));
  put('ppt/presProps.xml',xml(`<p:presentationPr ${NS}/>`),ppt+'presProps+xml');
  put('[Content_Types].xml',xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${types.map(([part,type])=>`<Override PartName="/${part}" ContentType="${type}"/>`).join('')}</Types>`));
  return zipFiles(entries);
}
