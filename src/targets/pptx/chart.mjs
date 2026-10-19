/** Native DrawingML charts with an embedded workbook, so PowerPoint's Edit Data opens the values the chart shows. */
import {zipFiles} from '../../render/zip.mjs';
import {NS,esc,xml,solid,presetDash,typefaces} from './ooxml.mjs';

const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
/** Column layout of the embedded sheet: A holds categories; each series takes one column (scatter: x then y). */
export function sheetLayout(data){
 const cols=[];let c=1;for(const s of data.series){if(data.scatter){cols.push({x:col(c),y:col(c+1)});c+=2;}else{cols.push({y:col(c)});c++;}}
 return {rows:data.categories.length,cols,last:data.categories.length+1};
}
/** A minimal SpreadsheetML package: one sheet with inline strings, no formulas, no macros. */
export function workbook(data){
 const L=sheetLayout(data),cell=(ref,v)=>v===null||v===undefined?'':typeof v==='number'?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
 const header=[cell('A1',data.categoryHeader),...data.series.flatMap((s,j)=>data.scatter?[cell(L.cols[j].x+'1',s.name+' · x'),cell(L.cols[j].y+'1',s.name)]:[cell(L.cols[j].y+'1',s.name)])].join('');
 const rows=data.categories.map((name,i)=>`<row r="${i+2}">${cell('A'+(i+2),name)}${data.series.map((s,j)=>(data.scatter?cell(L.cols[j].x+(i+2),s.xValues[i]):'')+cell(L.cols[j].y+(i+2),s.values[i])).join('')}</row>`).join('');
 const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 return zipFiles([
  ['[Content_Types].xml',xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)],
  ['_rels/.rels',xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`)],
  ['xl/workbook.xml',xml(`<workbook xmlns="${S}" xmlns:r="${R}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`)],
  ['xl/_rels/workbook.xml.rels',xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`)],
  ['xl/styles.xml',xml(`<styleSheet xmlns="${S}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)],
  ['xl/worksheets/sheet1.xml',xml(`<worksheet xmlns="${S}"><sheetData><row r="1">${header}</row>${rows}</sheetData></worksheet>`)]
 ]);
}

const str=(ref,values)=>`<c:strRef><c:f>${ref}</c:f><c:strCache><c:ptCount val="${values.length}"/>${values.map((v,i)=>`<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef>`;
const num=(ref,values)=>`<c:numRef><c:f>${ref}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${values.map((v,i)=>v===null||v===undefined?'':`<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache></c:numRef>`;
const txPr=(style,lang,size)=>{const {latin,ea}=typefaces(style,style.platform);return `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}"${style.fontWeight>=600?' b="1"':' b="0"'}>${solid(style.color)}<a:latin typeface="${esc(latin)}"/><a:ea typeface="${esc(ea)}"/><a:cs typeface="${esc(latin)}"/></a:defRPr></a:pPr><a:endParaRPr lang="${lang}"/></a:p></c:txPr>`;};
const lineSp=(c,w,dash)=>`<c:spPr><a:noFill/><a:ln w="${Math.round(w)}" cap="rnd">${solid(c)}<a:prstDash val="${presetDash(dash)}"/><a:round/></a:ln></c:spPr>`;
const barSp=(fill,stroke,w)=>`<c:spPr>${solid(fill)}${stroke?`<a:ln w="${Math.round(w)}">${solid(stroke)}</a:ln>`:'<a:ln><a:noFill/></a:ln>'}</c:spPr>`;
const marker=(m,size)=>m?`<c:marker><c:symbol val="${m.symbol}"/><c:size val="${Math.max(2,Math.min(72,Math.round(size)))}"/><c:spPr>${m.hollow?'<a:noFill/>':solid(m.color)}<a:ln w="19050">${solid(m.color)}</a:ln></c:spPr></c:marker>`:'<c:marker><c:symbol val="none"/></c:marker>';
const labels=(mode,{pos,series,n,style,lang,size})=>{
 const flags=(val,ser)=>`<c:showLegendKey val="0"/><c:showVal val="${val?1:0}"/><c:showCatName val="0"/><c:showSerName val="${ser?1:0}"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>`;
 if(mode==='none')return '<c:dLbls><c:delete val="1"/></c:dLbls>';
 if(mode==='end'){let i=series.values.length-1;while(i>=0&&(series.values[i]===null||series.values[i]===undefined))i--;
  return `<c:dLbls>${i>=0?`<c:dLbl><c:idx val="${i}"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(style,lang,size)}<c:dLblPos val="r"/>${flags(true,true)}<c:separator> </c:separator></c:dLbl>`:''}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(style,lang,size)}${flags(false,false)}</c:dLbls>`;}
 return `<c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(style,lang,size)}${pos?`<c:dLblPos val="${pos}"/>`:''}${flags(true,false)}</c:dLbls>`;
};
const axisLine=c=>c?`<c:spPr><a:noFill/><a:ln w="9525">${solid(c)}</a:ln></c:spPr>`:'<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>';
const scaling=a=>`<c:scaling>${a.log?'<c:logBase val="10"/>':''}<c:orientation val="${a.reverse?'maxMin':'minMax'}"/>${Number.isFinite(a.max)?`<c:max val="${a.max}"/>`:''}${Number.isFinite(a.min)?`<c:min val="${a.min}"/>`:''}</c:scaling>`;
function valAx(id,cross,a,{pos,style,lang,size,grid,crosses='autoZero',line:ax}){
 return `<c:valAx><c:axId val="${id}"/>${scaling(a)}<c:delete val="${a.hidden?1:0}"/><c:axPos val="${pos}"/>${grid?`<c:majorGridlines><c:spPr><a:ln w="9525">${solid(grid)}</a:ln></c:spPr></c:majorGridlines>`:''}<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${axisLine(ax)}${txPr(style,lang,size)}<c:crossAx val="${cross}"/><c:crosses val="${crosses}"/><c:crossBetween val="${a.between||'between'}"/>${a.majorUnit>0&&!a.log?`<c:majorUnit val="${a.majorUnit}"/>`:''}</c:valAx>`;
}
function catAx(id,cross,a,{pos,style,lang,size,line:ax}){
 return `<c:catAx><c:axId val="${id}"/>${scaling(a)}<c:delete val="0"/><c:axPos val="${pos}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="${a.labelPos||'nextTo'}"/>${axisLine(ax)}${txPr(style,lang,size)}<c:crossAx val="${cross}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/>${a.skip>1?`<c:tickLblSkip val="${a.skip}"/>`:''}<c:noMultiLvlLbl val="1"/></c:catAx>`;
}
/**
 * One chart part. `data` is the frozen view: categories in drawing order, shown series with colours, markers and dashes.
 * Sizes are in hundredths of a point; widths in EMU.
 */
export function chartXML(data,{lang,style,size}){
 const L=sheetLayout(data),cats=`Sheet1!$A$2:$A$${L.last}`,ref=c=>`Sheet1!$${c}$2:$${c}$${L.last}`,tx=(j,s)=>`<c:tx>${str(`Sheet1!$${L.cols[j].y}$1`,[s.name])}</c:tx>`;
 const grid=data.grid&&{hex:data.grid.hex,alpha:data.grid.alpha},axisColor=data.axisLine,kind=data.kind,common={style,lang,size};
 let plot;
 if(kind==='bar'||kind==='column'){
  // Horizontal bars are stored bottom-to-top (rows and series), so renderers that ignore a reversed axis still draw the declared order top-down.
  const ser=data.series.map((s,j)=>`<c:ser><c:idx val="${j}"/><c:order val="${kind==='bar'?data.series.length-1-j:j}"/>${tx(j,s)}${barSp(s.fill,s.stroke,s.strokeWidth)}<c:invertIfNegative val="0"/>${(s.points||[]).map(p=>`<c:dPt><c:idx val="${p.idx}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/>${barSp(p.fill,p.stroke,p.strokeWidth)}</c:dPt>`).join('')}${labels(data.labels,{pos:data.stacked?'ctr':'outEnd',series:s,...common})}<c:cat>${str(cats,data.categories)}</c:cat><c:val>${num(ref(L.cols[j].y),s.values)}</c:val></c:ser>`).join('');
  plot=`<c:barChart><c:barDir val="${kind==='bar'?'bar':'col'}"/><c:grouping val="${data.stacked?'stacked':'clustered'}"/><c:varyColors val="0"/>${ser}<c:gapWidth val="${data.gapWidth??60}"/>${data.stacked?'<c:overlap val="100"/>':`<c:overlap val="${data.overlap??-8}"/>`}<c:axId val="5001"/><c:axId val="5002"/></c:barChart>`
   +catAx(5001,5002,{},{pos:kind==='bar'?'l':'b',...common,line:axisColor})+valAx(5002,5001,data.axis,{pos:kind==='bar'?'b':'l',...common,grid});
 }else if(kind==='line'||kind==='area'){
  const ser=data.series.map((s,j)=>`<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx(j,s)}${kind==='area'?`<c:spPr>${solid(s.fill)}<a:ln w="${Math.round(s.strokeWidth)}">${solid(s.stroke)}</a:ln></c:spPr>`:lineSp(s.stroke,s.strokeWidth,s.dash)}${kind==='line'?marker(s.marker,s.markerSize):''}${labels(s.labels||data.labels,{pos:kind==='line'?'t':null,series:s,...common})}<c:cat>${str(cats,data.categories)}</c:cat><c:val>${num(ref(L.cols[j].y),s.values)}</c:val>${kind==='line'?'<c:smooth val="0"/>':''}</c:ser>`).join('');
  plot=`<c:${kind}Chart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}${kind==='line'?'<c:marker val="1"/>':''}<c:axId val="5001"/><c:axId val="5002"/></c:${kind}Chart>`
   +catAx(5001,5002,{skip:data.labelSkip},{pos:'b',...common,line:axisColor})+valAx(5002,5001,data.axis,{pos:'l',...common,grid});
 }else if(kind==='scatter'){
  const ser=data.series.map((s,j)=>`<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx(j,s)}<c:spPr><a:ln w="19050"><a:noFill/></a:ln></c:spPr>${marker(s.marker,s.markerSize)}<c:dLbls><c:delete val="1"/></c:dLbls><c:xVal>${num(ref(L.cols[j].x),s.xValues)}</c:xVal><c:yVal>${num(ref(L.cols[j].y),s.values)}</c:yVal><c:smooth val="0"/></c:ser>`).join('');
  plot=`<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${ser}<c:axId val="5001"/><c:axId val="5002"/></c:scatterChart>`+valAx(5001,5002,{...data.xAxis,between:'midCat'},{pos:'b',...common,line:axisColor})+valAx(5002,5001,{...data.axis,between:'midCat'},{pos:'l',...common,grid});
 }else throw new Error('Unsupported native chart kind '+kind);
 return xml(`<c:chartSpace xmlns:c="${NS.c}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><c:date1904 val="0"/><c:lang val="${lang}"/><c:roundedCorners val="0"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${plot}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${data.legend?`<c:legend><c:legendPos val="t"/><c:overlay val="0"/>${txPr(style,lang,size)}</c:legend>`:''}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(style,lang,size)}<c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>`);
}
