/**
 * The PresentationML package around compiled slides. The skeleton follows the classic writer (src/render/pptx.mjs), whose
 * structure opened in PowerPoint without repair: an independent notes theme, a blank layout and explicit relationships.
 * The v3 layout adds a title placeholder so each slide's title is a real slide title for assistive technology.
 */
import {zipFiles} from '../../render/zip.mjs';
import {NS,SLIDE,esc,xml,paragraph,textBody} from './ooxml.mjs';
const R=NS.r,NSATTR=`xmlns:a="${NS.a}" xmlns:p="${NS.p}" xmlns:r="${NS.r}"`,PML='application/vnd.openxmlformats-officedocument.presentationml.';
const group='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const clrMap='<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';
const override='<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>';
export const relationships=rels=>xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(([id,type,target,external])=>`<Relationship Id="${id}" Type="${type.startsWith('http')?type:R+'/'+type}" Target="${esc(target)}"${external?' TargetMode="External"':''}/>`).join('')}</Relationships>`);
const titlePlaceholder=`<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="304800"/><a:ext cx="${SLIDE.width-914400}" cy="1143000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`;
function theme(name,{colors,major,minor}){
 const c={dk1:'171717',lt1:'FFFFFF',dk2:'1C2C3C',lt2:'F5EBD9',accent1:'5114F6',accent2:'B33C1E',accent3:'166C65',accent4:'BD4027',accent5:'759786',accent6:'E7BA9F',hlink:'166C65',folHlink:'6A5ACD',...colors};
 const fills=Array.from({length:3},()=>'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join('');
 const lines=[6350,12700,19050].map(w=>`<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`).join('');
 const font=f=>`<a:latin typeface="${esc(f.latin)}"/><a:ea typeface="${esc(f.ea)}"/><a:cs typeface="${esc(f.latin)}"/>`;
 return xml(`<a:theme xmlns:a="${NS.a}" name="${esc(name)}"><a:themeElements><a:clrScheme name="DeckWeft">${['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'].map(k=>`<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>`).join('')}</a:clrScheme><a:fontScheme name="DeckWeft"><a:majorFont>${font(major)}</a:majorFont><a:minorFont>${font(minor)}</a:minorFont></a:fontScheme><a:fmtScheme name="DeckWeft"><a:fillStyleLst>${fills}</a:fillStyleLst><a:lnStyleLst>${lines}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fills}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`);
}
const notesF={x:v=>v,y:v=>v,len:v=>v,pt:v=>v*.75};
const notesStyle=lang=>({fontFamily:lang==='zh-CN'?'"PingFang SC", Arial, sans-serif':'Arial, sans-serif',fontSize:16,fontWeight:400,color:{hex:'171717',alpha:1}});
/** Notes text: one paragraph per line, plain 12 pt. */
function notesBody(lines,lang){
 const style=notesStyle(lang),ps=lines.map(t=>paragraph([{text:t,style}],{f:notesF,lang,fonts:()=>null,lineHeight:null}));
 return `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>${textBody(ps).replace('<a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" rtlCol="0"><a:noAutofit/></a:bodyPr>','<a:bodyPr/>')}</p:sp>`;
}
/**
 * slides: [{name, background, shapes (XML), rels: [[id, type, target, external]], notes: [lines]}]
 * media: [{path, bytes}], charts: [{path, xml, workbookPath, workbook}]
 */
export function packagePPTX({title,lang,slides,media,charts,themeInfo}){
 const entries=[],types=[],put=(name,data,type)=>{entries.push([name,data]);if(type)types.push([name,type]);};
 put('_rels/.rels',relationships([['rId1','officeDocument','ppt/presentation.xml'],['rId2','http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties','docProps/core.xml'],['rId3','extended-properties','docProps/app.xml']]));
 put('docProps/core.xml',xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title><dc:creator>DeckWeft</dc:creator><dc:language>${lang}</dc:language><dc:description>Compiled from the static DeckWeft scene: native text, tables, charts with embedded data, shapes, connectors, pictures and notes. Unsupported elements are listed in the export report.</dc:description></cp:coreProperties>`),'application/vnd.openxmlformats-package.core-properties+xml');
 put('docProps/app.xml',xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DeckWeft</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides><Notes>${slides.length}</Notes></Properties>`),'application/vnd.openxmlformats-officedocument.extended-properties+xml');
 put('ppt/theme/theme1.xml',theme('DeckWeft',themeInfo),'application/vnd.openxmlformats-officedocument.theme+xml');
 // PowerPoint repairs a package that shares the slide theme with its notes master (classic writer finding).
 put('ppt/theme/theme2.xml',theme('DeckWeft Notes',themeInfo),'application/vnd.openxmlformats-officedocument.theme+xml');
 put('ppt/slideMasters/slideMaster1.xml',xml(`<p:sldMaster ${NSATTR}><p:cSld><p:spTree>${group}${titlePlaceholder}</p:spTree></p:cSld>${clrMap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`),PML+'slideMaster+xml');
 put('ppt/slideMasters/_rels/slideMaster1.xml.rels',relationships([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]));
 put('ppt/slideLayouts/slideLayout1.xml',xml(`<p:sldLayout ${NSATTR} type="titleOnly" preserve="1"><p:cSld name="Title Only"><p:spTree>${group}${titlePlaceholder}</p:spTree></p:cSld>${override}</p:sldLayout>`),PML+'slideLayout+xml');
 put('ppt/slideLayouts/_rels/slideLayout1.xml.rels',relationships([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]));
 put('ppt/notesMasters/notesMaster1.xml',xml(`<p:notesMaster ${NSATTR}><p:cSld><p:spTree>${group}${notesBody([],lang)}</p:spTree></p:cSld>${clrMap}<p:notesStyle/></p:notesMaster>`),PML+'notesMaster+xml');
 put('ppt/notesMasters/_rels/notesMaster1.xml.rels',relationships([['rId1','theme','../theme/theme2.xml']]));
 for(const m of media)put(m.path,m.bytes);
 for(const c of charts){put(c.path,c.xml,'application/vnd.openxmlformats-officedocument.drawingml.chart+xml');put(c.path.replace(/charts\/(chart\d+\.xml)$/,'charts/_rels/$1.rels'),relationships([['rId1','package',c.workbookTarget]]));put(c.workbookPath,c.workbook);}
 slides.forEach((s,i)=>{const n=i+1;
  put(`ppt/slides/slide${n}.xml`,xml(`<p:sld ${NSATTR}><p:cSld name="${esc(s.name)}"><p:bg><p:bgPr>${s.background}<a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${s.shapes.join('')}</p:spTree></p:cSld>${override}</p:sld>`),PML+'slide+xml');
  put(`ppt/slides/_rels/slide${n}.xml.rels`,relationships([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','notesSlide',`../notesSlides/notesSlide${n}.xml`],...s.rels]));
  put(`ppt/notesSlides/notesSlide${n}.xml`,xml(`<p:notes ${NSATTR}><p:cSld><p:spTree>${group}${notesBody(s.notes,lang)}</p:spTree></p:cSld>${override}</p:notes>`),PML+'notesSlide+xml');
  put(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`,relationships([['rId1','notesMaster','../notesMasters/notesMaster1.xml'],['rId2','slide',`../slides/slide${n}.xml`]]));
 });
 put('ppt/presentation.xml',xml(`<p:presentation ${NSATTR}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+3}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${SLIDE.width}" cy="${SLIDE.height}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`),PML+'presentation.main+xml');
 const k=slides.length+3;
 put('ppt/_rels/presentation.xml.rels',relationships([['rId1','slideMaster','slideMasters/slideMaster1.xml'],['rId2','notesMaster','notesMasters/notesMaster1.xml'],...slides.map((_,i)=>[`rId${i+3}`,'slide',`slides/slide${i+1}.xml`]),[`rId${k}`,'presProps','presProps.xml'],[`rId${k+1}`,'theme','theme/theme1.xml'],[`rId${k+2}`,'tableStyles','tableStyles.xml']]));
 put('ppt/presProps.xml',xml(`<p:presentationPr ${NSATTR}/>`),PML+'presProps+xml');
 put('ppt/tableStyles.xml',xml(`<a:tblStyleLst xmlns:a="${NS.a}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`),PML+'tableStyles+xml');
 put('[Content_Types].xml',xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>${types.map(([part,type])=>`<Override PartName="/${part}" ContentType="${type}"/>`).join('')}</Types>`));
 return zipFiles(entries);
}
