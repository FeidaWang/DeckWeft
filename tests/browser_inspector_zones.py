"""M3 inspector: two zones (Words, Look) instead of three tabs, and colour matching on the canvas.
Same harness as browser_smoke.py. Keyboard order is checked with real Tab presses; no screen reader is involved.
"""
import argparse
from browser_harness import studio_browser

WORDS='rgb(255, 212, 0)';LOOK='rgb(26, 95, 224)'

def main():
  parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['direct','fixture'],default='direct');args=parser.parse_args()
  with studio_browser(args.mode,viewport={'width':1440,'height':900}) as h:
    p=h['page']
    # Function predicates: the studio CSP has no 'unsafe-eval'.
    def ready():p.wait_for_function("(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale')&&document.querySelector('#saveState').dataset.state!=='attention';})()",timeout=30000)
    def style(selector,prop):return p.eval_on_selector(selector,f'e=>getComputedStyle(e).{prop}')
    ready()
    zones=p.eval_on_selector_all('.inspector [data-zone]','els=>els.map(e=>[e.dataset.zone,e.querySelector("h2.zone-label").innerText.trim()])')
    assert zones==[['words','WORDS'],['look','LOOK']],zones
    assert style('[data-zone=words] .zone-square','backgroundColor')==WORDS and style('[data-zone=look] .zone-square','backgroundColor')==LOOK
    for hidden in ['.inspector-tabs','#notes','.quality-panel','#semanticControls','#stageStyle','#role','#contentLocale','#motion','#duration']:
      assert p.locator(hidden).is_hidden(),hidden
    labels=p.eval_on_selector_all('[data-zone=words] label:not([hidden])','els=>els.filter(e=>e.getClientRects().length).map(e=>e.textContent.trim())')
    assert labels[:5]==['Small text','Title','Explanation','Points','Numbers'],labels
    assert p.locator('[data-zone=words] details#sourcesPanel > summary').text_content().strip()=='Sources'
    assert all(t=='' for t in p.eval_on_selector_all('[data-zone=look] [data-theme]','els=>els.map(e=>[...e.childNodes].filter(n=>!n.classList?.contains("sr-only")).map(n=>n.textContent.trim()).join(""))')),'swatches only'
    assert p.locator('[data-zone=look] [data-theme] .sr-only').count()==p.locator('[data-zone=look] [data-theme]').count()
    print('PASS: two zones with yellow and blue squares; tabs, notes, quality and advanced controls hidden; labels renamed; swatches only',flush=True)
    # Colour matching: the title field outlines the title block in yellow; an empty field outlines the whole slide.
    p.locator('#slideTitle').focus()
    assert 'zone-words' in p.locator('#canvas').get_attribute('class')
    frame=p.locator('#canvas svg .zone-block-frame');assert frame.count()==1 and style('#canvas svg .zone-block-frame','stroke')==WORDS
    fb=frame.bounding_box();tb=p.locator('#canvas svg [data-node*="_title_"]').bounding_box()
    assert fb['x']<=tb['x'] and fb['y']<=tb['y'] and fb['x']+fb['width']>=tb['x']+tb['width'] and fb['y']+fb['height']>=tb['y']+tb['height'],(fb,tb)
    p.locator('#items').focus();assert p.locator('#canvas svg .zone-block-frame').count()==0
    assert style('#canvas svg','outlineColor')==WORDS and style('#canvas svg','outlineWidth')=='3px'
    p.locator('#items').blur();assert 'zone-words' not in (p.locator('#canvas').get_attribute('class') or '')
    print('PASS: title focus frames the title block in yellow; empty Points outlines the slide; blur clears',flush=True)
    p.locator('[data-theme="midnight"]').click();ready()
    assert 'zone-look' in p.locator('#canvas').get_attribute('class') and style('#canvas svg','outlineColor')==LOOK
    assert p.locator('[data-theme="midnight"]').get_attribute('aria-pressed')=='true'
    print('PASS: a swatch changes the theme and outlines the slide in blue',flush=True)
    # Tab order: the five words fields, Sources, then Look: Choose for me, the four layout cards (single entry step 3 moved
    # them to the top of Look), then the theme swatches.
    p.locator('#eyebrow').focus();seen=['eyebrow']
    for _ in range(14):
      p.keyboard.press('Tab');seen.append(p.evaluate("(()=>{const e=document.activeElement;return e.id||e.dataset.theme||e.dataset.layout&&'layout'||e.tagName.toLowerCase()})()"))
    assert seen==['eyebrow','slideTitle','body','items','metrics','summary','autoLayout','layout','layout','layout','layout','signal','paper','midnight','ocean'],seen
    print('PASS: Tab order: Small text, Title, Explanation, Points, Numbers, Sources, Choose for me, four layouts, four swatches',flush=True)
    p.locator('#uiLanguage').dispatch_event('click');ready()
    zh=p.eval_on_selector_all('.inspector [data-zone] h2.zone-label','els=>els.map(e=>e.innerText.trim())')
    zl=p.eval_on_selector_all('[data-zone=words] label','els=>els.filter(e=>e.getClientRects().length).map(e=>e.textContent.trim())')[:5]
    assert zh==['词','样子'] and zl==['小字','标题','说明','要点','数字'] and p.locator('#sourcesPanel > summary').text_content().strip()=='来源',(zh,zl)
    print('PASS: Chinese labels: 词 / 样子; 小字 / 标题 / 说明 / 要点 / 数字; 来源',flush=True)
    assert not h['errors'],h['errors']

if __name__=='__main__':main()
