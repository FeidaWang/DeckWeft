// Wording gate for the classic workbench (design guide section 12): the default interface never shows
// engineering words. It reads the shipped HTML and the zh dictionary, so it needs no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFileSync(path.join(root,file),'utf8');

const FORBIDDEN=[
  /\bJSON\b/i,/\bhash/i,/\brevision/i,/\breceipt/i,/\bschema/i,/\bmeasured\b/i,/\bcandidate/i,/\brhythm/i,/\bcheckpoint/i,/\bbridge/i,/\bworker/i,
  /\bmodel/i,/\bCLI\b/i,/\bMCP\b/i,/\btoken/i,/\bAPI\b/i,/\bv[123]\b/i,/\balpha\b/i,
  /\S+ · [a-z][a-z-]+/
];
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const RAW=new Set(['script','style']);
const decode=s=>s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");

/** Minimal HTML walk: returns every text node with the element that holds it and whether it is shown by default. */
export function visibleText(html){
  const nodes=[],stack=[],tag=/<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let last=0,match;
  const quiet=()=>stack.some(e=>e.hidden||e.drawer||e.developer||e.raw);
  const addText=text=>{const clean=decode(text).replace(/\s+/g,' ').trim();if(clean&&stack.length&&!quiet())nodes.push({element:describe(stack.at(-1)),text:clean});};
  while((match=tag.exec(html))){
    addText(html.slice(last,match.index));last=tag.lastIndex;
    if(match[0].startsWith('<!--'))continue;
    const name=match[1].toLowerCase(),attrs=match[2]||'';
    if(match[0].startsWith('</')){
      for(let i=stack.length-1;i>=0;i--)if(stack[i].name===name){stack.length=i;break;}
      continue;
    }
    const id=/\bid="([^"]*)"/.exec(attrs)?.[1],cls=/\bclass="([^"]*)"/.exec(attrs)?.[1]||'';
    const element={name,id,cls,hidden:/(?:^|\s)hidden(?:[\s=]|$)/.test(attrs),developer:/(?:^|\s)data-developer(?:[\s=]|$)/.test(attrs),drawer:/\bmore-drawer\b/.test(cls),raw:RAW.has(name)};
    if(!VOID.has(name)&&!/\/\s*$/.test(attrs))stack.push(element);
  }
  return nodes;
}
const describe=e=>`<${e.name}${e.id?'#'+e.id:''}${e.cls?'.'+e.cls.split(/\s+/).join('.'):''}>`;

function scan(file,nodes){
  const hits=[];
  for(const {element,text} of nodes)for(const rule of FORBIDDEN)if(rule.test(text))hits.push({file,element,text,rule:String(rule)});
  return hits;
}
const report=hits=>hits.map(h=>`${h.file} ${h.element} "${h.text}" (${h.rule})`).join('\n');

/** The zh dictionary is built from `const zh={...}` plus any number of `Object.assign(zh,{...})`. */
export function zhDictionary(source){
  const literals=[];
  const open=/(?:const zh=|Object\.assign\(zh,)\{/g;let m;
  while((m=open.exec(source))){
    let depth=0,i=m.index+m[0].length-1,quote='';
    for(;i<source.length;i++){const c=source[i];
      if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
      if(c==="'"||c==='"'||c==='`'){quote=c;continue;}
      if(c==='{')depth++;else if(c==='}'&&--depth===0)break;}
    literals.push(source.slice(source.indexOf('{',m.index),i+1));
  }
  return Object.assign({},...literals.map(text=>new Function(`return (${text})`)()));
}

const index=read('public/index.html');
const app=read('public/app.js');

test('default classic interface has no engineering words',()=>{
  const hits=scan('public/index.html',visibleText(index));
  assert.equal(hits.length,0,`${hits.length} hit(s):\n${report(hits)}`);
});

test('zh dictionary has no engineering words',()=>{
  const dictionary=zhDictionary(app),hits=[];
  for(const [key,value] of Object.entries(dictionary))for(const rule of FORBIDDEN)if(rule.test(String(value)))hits.push({file:'public/app.js',element:`zh.${key}`,text:String(value),rule:String(rule)});
  assert.equal(hits.length,0,`${hits.length} hit(s):\n${report(hits)}`);
});

test('zh dictionary keys equal the data-i18n keys in index.html',()=>{
  const html=new Set([...index.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1])),zh=new Set(Object.keys(zhDictionary(app)));
  assert.deepEqual([...html].filter(k=>!zh.has(k)).sort(),[],'data-i18n keys without a zh entry');
  assert.deepEqual([...zh].filter(k=>!html.has(k)).sort(),[],'zh entries without a data-i18n key');
});

test('elements retired by the shell redesign are gone from the document',()=>{
  // Only controls that were already hidden are removed. The page list, notes, role, motion and quality panel are
  // still the working editor until the page strip and two-part panel land, so they are deliberately not asserted.
  const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  for(const id of ['openShowcase','directionsTitle','toggleDirections'])assert.ok(!ids.includes(id),`#${id} should not exist`);
  assert.ok(!/data-i18n="(?:directionsNote|scoresNote)"/.test(index),'directions notes should not exist');
  for(const cls of ['tool-rail','scoring-note'])assert.ok(!new RegExp(`class="[^"]*\\b${cls}\\b`).test(index),`.${cls} should not exist`);
  assert.ok(ids.includes('save'),'#save stays for the keyboard shortcut');
});

// Visual Studio is the M9 job: its count is recorded, not enforced.
test('Visual Studio page wording (recorded, not enforced until M9)',{todo:'M9 merges the Visual Studio entry'},()=>{
  const hits=scan('public/studio/visual.html',visibleText(read('public/studio/visual.html')));
  console.log(`visual.html: ${hits.length} hit(s)`);
  assert.equal(hits.length,0);
});
