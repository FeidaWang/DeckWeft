/** Shared text shaping contract. No DOM, Node imports, network, or font files. */
export const FONT_PREFERENCES = {
  en: {
    display: ['Georgia','Times New Roman','Liberation Serif','Noto Serif','Noto Serif CJK SC'],
    body: ['Arial','Helvetica','Liberation Sans','Noto Sans','Noto Sans CJK SC']
  },
  'zh-CN': {
    display: ['Noto Serif CJK SC','Noto Serif SC','Songti SC','Source Han Serif SC','STSong','Georgia'],
    body: ['Noto Sans CJK SC','Noto Sans SC','PingFang SC','Heiti SC','Source Han Sans SC','Arial']
  }
};
export function fontPreference(locale='en',display=false){
  const families=FONT_PREFERENCES[locale]?.[display?'display':'body']||FONT_PREFERENCES.en.body;
  return {families:[...families],generic:display?'serif':'sans-serif',fontFamily:families[0],fontStack:fontStack(families,display?'serif':'sans-serif')};
}
export function fontStack(families,generic='sans-serif'){return families.map(f=>`"${f}"`).join(', ')+`, ${generic}`;}
export function graphemes(text){return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(s=>({text:s.segment,start:s.index,end:s.index+s.segment.length}));}
export function visibleLine(text){return text.replace(/(?:\r\n|\r|\n)$/u,'').replaceAll('\t','    ');}
/** Conservative fallback only. A CLI without a browser must never label it measured. */
export function widthOf(text,size){
  let units=0;
  for(const {text:char}of graphemes(visibleLine(String(text)))){
    if(/[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(char))units+=1.08;
    else if(/^\s+$/u.test(char))units+=.34;
    else if(/^[MW@%]/u.test(char))units+=.96;
    else if(/^[ilI.,:;'!|]/u.test(char))units+=.32;
    else if(/^[A-Z0-9]/u.test(char))units+=.72;
    else units+=.59;
  }
  return units*size;
}
export const estimateMeasure=(text,size)=>({width:widthOf(text,size),ascent:size*.91,descent:size*.22});
const OPEN=/[\(\[\{“‘「『（【《〈]$/u;
const CLOSE=/^[,.;:!?\)\]\}，。！？、：；”’」』）】》〉]/u;
const NBSP=/[\u00a0\u202f\u2060]/u;
function safeBreak(left,right){return !OPEN.test(left)&&!CLOSE.test(right)&&!NBSP.test(left.slice(-1)+right.slice(0,1));}
function extent(m){return Math.max(m.width,(m.left||0)+(m.right||0));}
/** Ranges partition the original string, including spaces/newlines/ZWJ clusters. */
export function wrapRanges(text,width,size,measure=estimateMeasure){
  text=String(text);const ranges=[];
  const paragraphs=[];let start=0;const breaks=/\r\n|\r|\n/g;let match;
  while((match=breaks.exec(text))){paragraphs.push({start,end:match.index,next:breaks.lastIndex});start=breaks.lastIndex;}
  paragraphs.push({start,end:text.length,next:text.length});
  for(const paragraph of paragraphs){
    const raw=text.slice(paragraph.start,paragraph.end),g=graphemes(raw);
    if(!g.length){ranges.push([paragraph.start,paragraph.next]);continue;}
    const wordEnds=new Set([...new Intl.Segmenter(undefined,{granularity:'word'}).segment(raw)].map(s=>s.index+s.segment.length));
    let i=0;
    while(i<g.length){
      // Find the longest fitting substring, then step back to a natural boundary.
      let lo=i+1,hi=g.length,fit=i;
      while(lo<=hi){const mid=(lo+hi)>>1;const str=visibleLine(raw.slice(g[i].start,g[mid-1].end));
        if(extent(measure(str,size))<=width+.01){fit=mid;lo=mid+1;}else hi=mid-1;
      }
      let end=Math.max(i+1,fit);
      if(end<g.length&&fit>i){
        let natural=end;
        while(natural>i+1&&(!wordEnds.has(g[natural-1].end)||!safeBreak(g[natural-1].text,g[natural].text)))natural--;
        if(wordEnds.has(g[natural-1].end)&&safeBreak(g[natural-1].text,g[natural].text))end=natural;
        else while(end>i+1&&!safeBreak(g[end-1].text,g[end].text))end--;
      }
      ranges.push([paragraph.start+g[i].start,end===g.length?paragraph.next:paragraph.start+g[end-1].end]);i=end;
    }
  }
  return ranges.length?ranges:[[0,0]];
}
export function wrapText(text,width,size){return wrapRanges(String(text),width,size).map(([a,b])=>visibleLine(String(text).slice(a,b)));}
export function completeFit(text,box,style,data){
  const {fontSize,ranges,widths,ascent,descent}=data;
  const leading=style.leading??1.23;
  const lineHeight=Math.max(fontSize*leading,ascent+descent);
  const lines=ranges.map(([a,b])=>visibleLine(text.slice(a,b)));
  const requiredHeight=lines.length*lineHeight;
  const maxLineWidth=Math.max(0,...widths);
  return {text,lines,ranges,fontSize,lineHeight,baselineOffset:(lineHeight-ascent-descent)/2+ascent,
    ascent,descent,widths,maxLineWidth,requiredHeight,
    overflow:box.w<=0||box.h<=0||requiredHeight>box.h+.1||maxLineWidth>box.w*.96+.1,
    measurement:data.source||'offline-estimate',fontFamily:data.fontFamily||style.fontFamily||'Arial',
    fontStack:data.fontStack||style.fontStack||'Arial, sans-serif'};
}
export function fitText(text,box,style={},measure=estimateMeasure){
  text=String(text);const {preferred=32,minimum=20}=style;
  const at=size=>{
    const ranges=wrapRanges(text,Math.max(0,box.w*.96),size,measure);
    const metrics=ranges.map(([a,b])=>measure(visibleLine(text.slice(a,b)),size));
    const sample=measure('Mg国É🙂',size);
    const ascent=Math.max(size*.65,sample.ascent||0,...metrics.map(m=>m.ascent||0));
    const descent=Math.max(size*.12,sample.descent||0,...metrics.map(m=>m.descent||0));
    return completeFit(text,box,style,{fontSize:size,ranges,widths:metrics.map(extent),ascent,descent});
  };
  let result=at(minimum);if(result.overflow)return result;
  let lo=minimum+1,hi=preferred;
  while(lo<=hi){const mid=(lo+hi)>>1,candidate=at(mid);if(candidate.overflow)hi=mid-1;else{result=candidate;lo=mid+1;}}
  return result;
}
/** TextMeasurer: fit(text, box, style, key) -> a lossless fit result. */
export const estimatedTextMeasurer=Object.freeze({kind:'offline-estimate',fit:(text,box,style)=>fitText(text,box,style)});
export function contrastRatio(hexA,hexB){
  const luminance=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
  const a=luminance(hexA),b=luminance(hexB);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
