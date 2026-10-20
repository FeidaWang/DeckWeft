/**
 * PDF from the static web scene (S7). Node writes a print document: one 1440 × 810 px page per scene, each scene drawn at the
 * measured 1440 px layout and scaled as a whole to fit (the same frame as PowerPoint), followed by notes pages with what the
 * static page keeps behind disclosures. CINE-001 (2026-10-20): a scene whose text would fall below the typography minima at
 * the whole-scene fit is cut into the same bands as the PowerPoint export (`targetFit`); each band is one print page, the
 * heading repeats in a strip above a continuation band, and nothing is shrunk, removed or rasterized. A browser prints it with real text (tagged PDF). The PDF's text is read back with an
 * independent extractor (tests/inspect_pdf.py) and compared with the semantic document.
 */
import {expectedBlockText} from '../pptx/audit.mjs';
import {targetFit,PT_PER_PX} from '../target-budget.mjs';
const x=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const PDF_PAGE={width:1440,height:810};
const PRINT_CSS=`@page{size:${PDF_PAGE.width}px ${PDF_PAGE.height}px;margin:0}html,body{margin:0;padding:0;background:#fff}.dw-page{position:relative;width:${PDF_PAGE.width}px;height:${PDF_PAGE.height}px;overflow:hidden;contain:strict;break-inside:avoid;break-after:page;page-break-after:always}.dw-fit{position:absolute;left:0;top:0;transform-origin:0 0}.dw-fit>.web-scene{margin:0}.dw-strip{position:absolute;overflow:hidden}.dw-strip-fit{position:absolute;left:0;top:0;transform-origin:0 0}.dw-strip .web-scene{margin:0;min-height:0;padding-top:12px;padding-bottom:0}.dw-strip .folio{display:none}.dw-strip .regions{display:block;min-height:0}.dw-notes{break-before:page;page-break-before:always;box-sizing:border-box;width:${PDF_PAGE.width}px;min-height:${PDF_PAGE.height}px;padding:56px 72px;background:#fff;color:#171717;font:15px/1.5 "Avenir Next",Arial,"PingFang SC",sans-serif}.dw-notes h2{font-size:22px;margin:0 0 16px}.dw-notes h3{font-size:16px;margin:20px 0 6px}.dw-notes ul{margin:0;padding-left:20px}.dw-notes li{margin:2px 0}.dw-notes a{color:inherit}`;

/**
 * Chromium expands closed disclosures when printing, which would grow a scene beyond its measured height. A closed disclosure
 * keeps only its summary line, as the static page shows it; its content is printed on the scene's notes page instead.
 */
export function closedDisclosures(markup){
 // A balanced scan: nested disclosures are matched to their own closing tag; an open one keeps its content, which is scanned too.
 const tag=/<details(\s[^>]*)?>|<\/details>/g,stack=[],cuts=[];let m;
 while((m=tag.exec(markup))){
  if(m[0][1]!=='/'){const attrs=m[1]||'',open=/\sopen(\s|=|$)/.test(attrs),summary=open?null:markup.slice(tag.lastIndex).match(/^\s*<summary[\s\S]*?<\/summary>/);stack.push({start:m.index,inner:tag.lastIndex,open,attrs,summary:summary?.[0]||''});continue;}
  const d=stack.pop();if(!d)continue;
  if(!d.open&&!stack.some(o=>!o.open))cuts.push({from:d.start,to:tag.lastIndex,text:`<details${d.attrs}>${d.summary}</details>`});
 }
 let out='',at=0;for(const c of cuts.sort((a,b)=>a.from-b.from)){out+=markup.slice(at,c.from)+c.text;at=c.to;}
 return out+markup.slice(at);
}
/** The markup of one region of a scene section (a balanced scan of its div), or null. */
function regionMarkup(markup,blockId){
 const open=markup.match(new RegExp(`<div id="[^"]*" class="region" data-block-id="${blockId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>`));if(!open)return null;
 const tag=/<div(\s[^>]*)?>|<\/div>/g;tag.lastIndex=open.index+open[0].length;let depth=1,m;
 while(depth&&(m=tag.exec(markup)))depth+=m[0][1]==='/'?-1:1;
 return depth?null:markup.slice(open.index,tag.lastIndex);
}
/**
 * Pages, scales and the print document. `html` is the static web export; `layout` its measurement. With `paginate` 'auto' a
 * scene is paged on the PowerPoint bands; 'none' keeps one page per scene. Each page records its part, its clip in measured
 * page coordinates and the typography report of that band.
 */
export function pdfPrintJob({document,plan,html,layout,delivery,paginate='auto'}){
 const zh=document.locale==='zh-CN',css=html.body.slice(html.body.indexOf('<style>')+7,html.body.indexOf('</style>')),blocks=new Map(document.blocks.map(b=>[b.id,b]));
 const pages=[],pagination=[];
 plan.scenes.forEach((s,i)=>{
  const m=layout.scenes[i],derived=html.scenes[i],titleBlock=derived.readingOrder.map(rid=>derived.regions.find(r=>r.id===rid).blockId).find(id=>blocks.get(id)?.type==='heading')||null;
  const headingStyle=m.regions.find(r=>r.blockId===titleBlock)?.texts[0]?.style||{fontSize:28,lineHeight:34},strip=Math.round((headingStyle.lineHeight||headingStyle.fontSize*1.2)+24);
  const fit=paginate==='none'?null:targetFit(m,blocks,{format:'pdf',titleBlockId:titleBlock,strip});
  const bands=fit?.bands||[null],parts=bands.length,reason=fit?fit.reason||fit.status:'off';
  if(parts>1)pagination.push({sceneId:s.id,parts,reason});
  bands.forEach((band,part)=>{
   const top=band?band.y-(part?strip:0):m.bounds.y,h=band?band.height+(part?strip:0):m.bounds.height,w=m.bounds.width;
   const scale=Math.min(PDF_PAGE.width/w,PDF_PAGE.height/h);
   pages.push({sceneId:s.id,part:part+1,parts,reason,scale:Math.round(scale*10000)/10000,offset:[(PDF_PAGE.width-w*scale)/2,(PDF_PAGE.height-h*scale)/2],width:w,height:h,top:top-m.bounds.y,strip:part?strip:0,
    clip:band?{y:band.y,height:band.height}:{y:m.bounds.y,height:m.bounds.height},overHeight:!!fit?.typography[part]?.overHeight,typography:fit?fit.typography[part]:null,titleBlockId:titleBlock,index:i,background:m.background?.hex||'FFFFFF'});
  });
 });
 const page=p=>{
  const markup=closedDisclosures(html.sceneMarkup[p.index]),tx=`translate(${p.offset[0]}px,${p.offset[1]-p.top*p.scale}px) scale(${p.scale})`;
  let strip='';
  if(p.strip){
   // The heading repeats in a strip above the band, as the PowerPoint continuation slide does, with its part number.
   const section=markup.match(/^<section[^>]*>/)[0],region=p.titleBlockId?regionMarkup(markup,p.titleBlockId):null,label=`(${p.part}/${p.parts})`;
   const heading=region?region.replace(/<\/h2>/,` <span class="dw-part">${label}</span></h2>`):`<div class="region" data-component="heading"><h2>${x(p.sceneId)} ${label}</h2></div>`;
   strip=`<div class="dw-strip" style="left:${p.offset[0]}px;top:${p.offset[1]}px;width:${p.width*p.scale}px;height:${p.strip*p.scale}px;background:#${p.background}"><div class="dw-strip-fit" style="width:${p.width}px;transform:scale(${p.scale})">${section}<div class="regions">${heading}</div></section></div></div>`;
  }
  return `<div class="dw-page" style="background:#${p.background}"><div class="dw-fit" style="width:${p.width}px;transform:${tx}">${markup}</div>${strip}</div>`;
 };
 const appendix=plan.scenes.map((s,i)=>{const r=delivery.reveal[i],it=delivery.frozen[i].interactions,mo=delivery.motion[i];
  if(!r.notes.length&&!r.sources.length&&!it.length)return null;
  const heading=`${String(i+1).padStart(2,'0')} · ${s.id}`;
  return {sceneId:s.id,html:`<section class="dw-notes" aria-label="${x((zh?'注释 ':'Notes ')+heading)}"><h2>${x((zh?'注释 · ':'Notes · ')+heading)}</h2>${it.length||mo.cuesNotPlayed?`<h3>${zh?'静态呈现':'Static delivery'}</h3><ul>${it.map(v=>`<li>${x(v.kind)}: ${x(v.delivery)}</li>`).join('')}${mo.cuesNotPlayed?`<li>${x(zh?`动效未播放（${mo.cuesNotPlayed} 个提示）。`:`Motion not played (${mo.cuesNotPlayed} cue${mo.cuesNotPlayed===1?'':'s'}).`)}</li>`:''}</ul>`:''}${r.notes.map(n=>`<h3>${x(n.title)}</h3><ul>${n.lines.map(l=>`<li>${x(l)}</li>`).join('')}</ul>`).join('')}${r.sources.length?`<h3>${zh?'来源':'Sources'}</h3><ul>${r.sources.map(v=>`<li>${x(v.title)} — <a href="${x(v.url)}">${x(v.url)}</a></li>`).join('')}</ul>`:''}</section>`};
 }).filter(Boolean);
 const csp="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; script-src 'none'";
 const doc=`<!doctype html><html lang="${x(document.locale)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>${x(document.title)}</title><style>${css}${PRINT_CSS}</style></head><body data-render-hash="${html.renderHash}">${pages.map(page).join('')}${appendix.map(a=>a.html).join('')}</body></html>`;
 const out=pages.map(({index,top,titleBlockId,...p})=>p);
 return {html:doc,page:PDF_PAGE,pages:out,pagination,appendix:appendix.map(a=>({sceneId:a.sceneId})),expected:pdfExpectations(document,plan,out)};
}

/** Structure of the print document before printing: every scene has its first part, parts are consecutive, each page is at a
 * scale no larger than the whole-scene fit, no script. The typography of every page is reported by role; batch 1 reports it. */
export function checkPrintJob(job,{plan}){
 const failures=[];
 if(job.pages.length<plan.scenes.length)failures.push({check:'page count',pages:job.pages.length,scenes:plan.scenes.length});
 for(const s of plan.scenes){const own=job.pages.filter(p=>p.sceneId===s.id),parts=own.map(p=>p.part);
  if(!own.length||parts[0]!==1||parts.some((n,k)=>n!==k+1)||own.some(p=>p.parts!==own.length))failures.push({check:'parts',sceneId:s.id,parts});}
 for(const p of job.pages){if(!(p.scale>0&&p.scale<=1.05))failures.push({check:'whole-scene scale',sceneId:p.sceneId,part:p.part,scale:p.scale});if(!job.html.includes(`id="${p.sceneId}"`))failures.push({check:'scene present',sceneId:p.sceneId});}
 if(/<script\b/i.test(job.html))failures.push({check:'no script'});
 const typographyFailures=job.pages.flatMap(p=>(p.typography?.minimum.failures||[]).map(f=>({sceneId:p.sceneId,part:p.part,...f})));
 const overHeight=job.pages.filter(p=>p.overHeight).map(p=>({sceneId:p.sceneId,part:p.part,height:p.clip.height,scale:p.scale}));
 const typography={status:typographyFailures.length?'fail':'pass',failures:typographyFailures,overHeight,pagination:job.pagination||[],scope:`Delivered sizes per band at ${PT_PER_PX.pdf} pt per page px, by role, against the presentation target's minima. Reported, not refused: batch 1 keeps the PDF check structural.`};
 return {status:failures.length?'fail':'pass',failures,pages:job.pages.length,appendixPages:job.appendix.length,typography};
}

/** What a reader must be able to find in the PDF text for each scene (same list as the web and PowerPoint checks). */
export function pdfExpectations(document,plan,pages=null){
 const blocks=new Map(document.blocks.map(b=>[b.id,b]));
 return plan.scenes.map((s,i)=>({sceneId:s.id,pageIndexes:pages?pages.flatMap((p,k)=>p.sceneId===s.id?[k]:[]):[i],strings:[...new Set(s.blockIds.flatMap(id=>expectedBlockText(blocks.get(id),document)).filter(Boolean))]}));
}
const norm=s=>String(s).normalize('NFKC').replace(/\s+/g,'');
/** Text extractors return right-to-left runs (Arabic-Indic digits, Arabic, Hebrew) in visual order; both orders are accepted. */
const RTL=/[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]+/g;
const variants=t=>{const a=norm(t),b=a.replace(RTL,r=>[...r].reverse().join(''));return a===b?[a]:[a,b];};
const found=(t,text)=>variants(t).some(v=>text.includes(v));
/**
 * Chromium writes some shared CJK glyphs into the PDF's Unicode map as CJK radical code points (页 → U+2EDA), so a viewer search
 * for the ideograph can miss them. NFKC folds the Kangxi radicals; these supplement radicals have no normalisation. The table is
 * used only to explain a miss, never to pass it.
 */
export const CJK_RADICALS={'\u2E8A':'卜','\u2E95':'彐','\u2E9F':'母','\u2EA0':'民','\u2EA4':'爫','\u2EA9':'王','\u2EAA':'疋','\u2EAE':'竹','\u2EB3':'网','\u2EB7':'羊','\u2EB9':'耂','\u2EBB':'聿','\u2EBE':'艹','\u2EC3':'覀','\u2EC4':'西','\u2EC5':'见','\u2EC6':'角','\u2EC8':'讠','\u2EC9':'贝','\u2ECA':'足','\u2ECB':'车','\u2ECC':'辶','\u2ECD':'辶','\u2ECF':'阝','\u2ED3':'长','\u2ED4':'门','\u2ED6':'阝','\u2ED7':'雨','\u2ED8':'青','\u2EDA':'页','\u2EDB':'风','\u2EDC':'飞','\u2EDD':'食','\u2EDF':'飠','\u2EE0':'饣','\u2EE2':'马','\u2EE3':'骨','\u2EE4':'鬼','\u2EE5':'鱼','\u2EE6':'鸟','\u2EE7':'卤','\u2EE8':'麦','\u2EE9':'黄','\u2EEA':'黾','\u2EEC':'齐','\u2EEE':'齿','\u2EF0':'龙','\u2EF3':'龟'};
const radicalsMapped=s=>s.replace(/[\u2E80-\u2EFF]/g,c=>CJK_RADICALS[c]||c);
/**
 * Searchability: every expected string is in the extracted text of its scene's page or of the notes pages. `extraction` is the
 * JSON written by tests/inspect_pdf.py ({pages:[{text}], …}).
 */
export function checkPdfText(expected,extraction){
 const pages=extraction.pages.map(p=>norm(p.text)),n=Math.max(expected.length,...expected.map(e=>(e.pageIndexes||[]).length?Math.max(...e.pageIndexes)+1:0)),notes=pages.slice(n).join('');
 const results=expected.map((e,i)=>{const own=(e.pageIndexes||[i]).map(k=>pages[k]||'').join(''),absent=e.strings.filter(t=>!found(t,own)&&!found(t,notes)),radical=absent.filter(t=>found(t,radicalsMapped(own))||found(t,radicalsMapped(notes))),missing=absent.filter(t=>!radical.includes(t)),onPage=e.strings.filter(t=>found(t,own)).length;return {sceneId:e.sceneId,expected:e.strings.length,onPage,inNotes:e.strings.length-onPage-absent.length,radical,missing};});
 const failures=results.filter(r=>r.missing.length),radicals=results.filter(r=>r.radical.length),codes=[...new Set(extraction.pages.flatMap(p=>[...p.text].filter(c=>/[\u2E80-\u2EFF]/.test(c))))].map(c=>`${c} U+${c.codePointAt(0).toString(16).toUpperCase()} → ${CJK_RADICALS[c]||'?'}`);
 return {status:pages.length<n||failures.length?'fail':radicals.length?'partial':'pass',pageCount:pages.length,scenes:results,failures:failures.map(f=>({sceneId:f.sceneId,missing:f.missing.slice(0,10)})),
  radicalCodePoints:radicals.length?{strings:radicals.reduce((k,r)=>k+r.radical.length,0),codePoints:codes,note:'These strings are in the PDF, but some ideographs are mapped to CJK radical code points, so a viewer search for the ideograph may not find them.'}:null};
}
/** Accessibility facts of the PDF as extracted: tagging, language, title and figure alternative text. */
export function checkPdfAccessibility(extraction,{locale}){
 const failures=[];
 if(!extraction.tagged)failures.push({check:'tagged PDF (structure tree)'});
 if(!extraction.marked)failures.push({check:'MarkInfo /Marked true'});
 if(!extraction.lang||!extraction.lang.toLowerCase().startsWith(locale.toLowerCase().slice(0,2)))failures.push({check:'document language',lang:extraction.lang||null});
 if(!extraction.title)failures.push({check:'document title'});
 if(extraction.figures>extraction.figuresWithAlt)failures.push({check:'figure alternative text',figures:extraction.figures,withAlt:extraction.figuresWithAlt,pages:(extraction.figureList||[]).filter(f=>!f.grouping&&!f.alt).map(f=>f.page)});
 // Chromium tags an HTML <figure> wrapper as a /Figure without /Alt around the image or chart that carries it; listed, not hidden.
 const limits=extraction.groupingFiguresWithoutAlt?[{check:'grouping figures without /Alt',count:extraction.groupingFiguresWithoutAlt,note:'Chromium maps each HTML <figure> to a /Figure that wraps the tagged image or chart; the inner figure has the alternative text.'}]:[];
 return {status:failures.length?'fail':limits.length?'partial':'pass',failures,limits,scope:'Structure checks on the PDF bytes. No screen reader or PDF/UA validator was run.',facts:{tagged:extraction.tagged,marked:extraction.marked,lang:extraction.lang,title:extraction.title,figures:extraction.figures,figuresWithAlt:extraction.figuresWithAlt,groupingFigures:extraction.groupingFigures}};
}
