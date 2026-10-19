import { x } from './escape.mjs';
/**
 * CJK phrase breaks (C12, S8). Chinese has no spaces, so a browser may break a heading anywhere, including inside a word
 * (`三十六种几何结／构`). Display text in a zh-CN document is marked up with `<wbr>` at word boundaries from the platform's
 * dictionary segmenter and styled `word-break:keep-all`, so lines end between words; `overflow-wrap:anywhere` on the scene
 * stays as the last resort for a phrase longer than its column. `<wbr>` has no text content, so copied text, the
 * coverage check and every exporter see the authored string unchanged. Han numerals are kept together with the character
 * that follows them (三十六种, not 三十／六种).
 */
const HAN=/\p{Script=Han}/u,NUMERAL=/[〇一二三四五六七八九十百千万亿两零]$/u,NUMERAL_START=/^[〇一二三四五六七八九十百千万亿两零]/u;
const segmenter=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter('zh',{granularity:'word'}):null;
/** Word segments of one line, merging numeral runs with their measure word. Pure; no markup. */
export function cjkSegments(text){
 if(!segmenter||!HAN.test(text))return [text];
 const out=[];
 for(const {segment} of segmenter.segment(text)){
  const last=out.at(-1);
  if(last!==undefined&&NUMERAL.test(last)&&NUMERAL_START.test(segment))out[out.length-1]=last+segment;else out.push(segment);
 }
 return out;
}
/** Escaped HTML for display text in a zh-CN document: `<wbr>` between two Han-bounded words, never beside punctuation or spaces. */
export function cjkBreaksHTML(text,locale){
 if(locale!=='zh-CN'||!segmenter||!HAN.test(text))return x(text);
 return text.split(/(\r\n|\r|\n)/).map(line=>{
  if(/^(\r\n|\r|\n)$/.test(line))return line;
  const parts=cjkSegments(line);
  return parts.map((part,i)=>{const prev=parts[i-1];const breakable=i>0&&HAN.test(prev.at(-1))&&HAN.test(part[0]);return (breakable?'<wbr>':'')+x(part);}).join('');
 }).join('');
}
