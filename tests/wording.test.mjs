// Wording gate (design guide section 12): the default interface never shows engineering words. It reads the shipped
// HTML and the one dictionary in public/i18n.js, so it needs no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdirSync} from 'node:fs';
import {dict} from '../public/i18n.js';

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

// Single entry: the shell markup lives in /*html*/ template strings in shell.js and the deck kinds, and the page (index.html)
// carries the classic dialogs. Since step 4 there is one page at one address: the walk reads the shell's templates, both
// kinds' templates (the visual kind carries its own dialogs) and index.html joined. The shell's own words are shell.* keys.
const templates=file=>[...read(file).matchAll(/\/\*html\*\/`([^`]*)`/g)].map(m=>m[1]).join('\n');
const PAGE='public/shell.js + public/kinds/classic.js + public/kinds/visual.js + public/index.html';
const index=templates('public/shell.js')+templates('public/kinds/classic.js')+templates('public/kinds/visual.js')+read('public/index.html');

test('the one page has no engineering words in its default text',()=>{
  const hits=scan(PAGE,visibleText(index));
  assert.equal(hits.length,0,`${hits.length} hit(s):\n${report(hits)}`);
});

const keysIn=html=>[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]).concat([...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap(m=>m[1].split(';').map(pair=>pair.slice(pair.indexOf(':')+1).trim())));
const sources=['public','public/studio','public/kinds'].flatMap(dir=>readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.js')&&f!=='i18n.js').map(f=>`${dir}/${f}`));
const wordingHits=include=>{
  const hits=[];
  for(const language of ['en','zh'])for(const [key,value] of Object.entries(dict[language]))if(include(key))for(const rule of FORBIDDEN)if(rule.test(String(value)))hits.push({file:'public/i18n.js',element:`${language}.${key}`,text:String(value),rule:String(rule)});
  return hits;
};
// Like the visible-text walk, words that only the developer sections show (data-developer) are not the page's default text.
const pageKeys=new Set(keysIn(index.replace(/<details data-developer>[\s\S]*?<\/details>/g,'')));

test('the dictionary has the same keys in English and Chinese',()=>{
  const en=Object.keys(dict.en),zh=new Set(Object.keys(dict.zh));
  assert.deepEqual(en.filter(k=>!zh.has(k)).sort(),[],'keys without a zh value');
  assert.deepEqual([...zh].filter(k=>!(k in dict.en)).sort(),[],'keys without an en value');
  for(const language of ['en','zh'])for(const [key,value] of Object.entries(dict[language]))assert.equal(typeof value,'string',`${language}.${key}`);
});

test('every data-i18n and data-i18n-attr key in the page is in the dictionary',()=>{
  assert.deepEqual(keysIn(index).filter(k=>!(k in dict.en)).sort(),[],`${PAGE}: keys without a dictionary entry`);
  assert.deepEqual(keysIn(index).filter(k=>!/^(?:classic|visual|shell)\./.test(k)),[],'the page uses classic.*, visual.* and shell.* keys');
});

test('every dictionary key is used by a page or a module',()=>{
  // A key counts as used when its whole string appears in a page or script; a quoted literal ending in "." covers keys built from it.
  const text=[index,...sources.map(read)].join('\n');
  const exact=new Set([...text.matchAll(/(?:classic|visual|shell)\.[\w.]*/g)].map(m=>m[0])),prefixes=[...text.matchAll(/['"`]((?:classic|visual|shell)\.[\w.]*\.)['"`]/g)].map(m=>m[1]);
  const unused=Object.keys(dict.en).filter(key=>!exact.has(key)&&!prefixes.some(prefix=>key.startsWith(prefix)));
  assert.deepEqual(unused.sort(),[],'dictionary keys that no page or module references');
});

test('dictionary values shown by the classic page have no engineering words in English or Chinese',()=>{
  const hits=wordingHits(key=>pageKeys.has(key));
  assert.equal(hits.length,0,`${hits.length} hit(s):\n${report(hits)}`);
});

// Runtime messages of the classic page (status, errors, dialogs) and every Visual Studio string were never under this gate.
// The hits are recorded, not enforced: step 3 rewords them.
test('other dictionary wording (recorded, not enforced until step 3)',{todo:'step 3 rewrites the remaining wording'},()=>{
  const hits=wordingHits(key=>!pageKeys.has(key));
  console.log(`classic runtime strings: ${hits.filter(h=>h.element.includes('.classic.')).length} hit(s); visual.* strings: ${hits.filter(h=>h.element.includes('.visual.')).length} hit(s)`);
  assert.equal(hits.length,0,report(hits));
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

