import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {baselineBodies} from './render-baseline-diff.mjs';
import {WATERMARK_SVG,watermarkHTML} from '../src/render/web/watermark.mjs';
import {runtime} from '../src/render/web/runtime.mjs';

const root=new URL('../',import.meta.url).pathname;

test('every slide of every web export carries exactly one DeckWeft watermark, whatever the theme, palette or locale',async()=>{
 const bodies=await baselineBodies(root);
 for(const [name,body] of Object.entries(bodies)){
  const sections=body.split('<section id="').slice(1);
  assert.ok(sections.length>0,name);
  for(const s of sections)assert.equal(s.split('</section>')[0].split(watermarkHTML()).length-1,1,name+' '+s.slice(0,s.indexOf('"')));
  // The folio line (DeckWeft / theme name) and the status line are gone from the template.
  assert.ok(!/class="folio"|id="status"|DeckWeft \/ /.test(body),name);
 }
});

test('the watermark is the Figma-exported mark itself, outlined and in currentColor, and no document field reaches it',async()=>{
 const svg=(await readFile(new URL('../public/brand/deckweft-watermark.svg',import.meta.url),'utf8')).replace(/\r\n?/g,'\n').trim();
 assert.equal(WATERMARK_SVG,svg.replace('<svg ','<svg class="dw-watermark-mark" aria-hidden="true" focusable="false" '));
 assert.ok(!/<text|id=|#[0-9A-Fa-f]{6}/.test(svg),'no live text, no ids that would repeat per slide, no fixed colour');
 assert.equal(watermarkHTML.length,0,'the watermark takes no arguments, so nothing in a deck can change or remove it');
});

test('the player puts no controls on the slides: clicks and page keys drive the cue clock',()=>{
 for(const removed of ['root.append(controls,panel)','original.replaceWith(controls,view,full)','first.replaceWith(tabs,panel)',"scene.querySelector('.folio').after(timeline)","motion.id='semantic-motion'"])assert.ok(!runtime.includes(removed),removed);
 for(const kept of ['advance(sceneId)','retreat(sceneId)','semantic.advance(scenes[index].id)'])assert.ok(runtime.includes(kept),kept);
});
