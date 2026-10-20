"""M2 page strip: thumbnails above the canvas, drag to reorder, undo, Alt+Up/Down. Same harness as browser_smoke.py.
Uses Playwright's mouse on real HTML drag-and-drop (Chromium); not a touch device or a screen reader.
"""
import argparse, json
from browser_harness import studio_browser, api

def main():
  parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['direct','fixture'],default='direct');args=parser.parse_args()
  with studio_browser(args.mode,viewport={'width':1440,'height':900}) as h:
    p=h['page']
    # Function predicates: the studio CSP has no 'unsafe-eval'.
    def ready():p.wait_for_function("() => document.querySelector('#fitStatus').textContent.includes('ready to export')",timeout=30000)
    def saved():p.wait_for_selector('#saveState[data-state="saved"]',state='attached',timeout=15000)
    def order():return p.eval_on_selector_all('#slideList .thumbnail','els=>els.map(e=>e.dataset.slide)')
    token=json.loads(api(h['server'],'/api/session')[1])['token']
    def stored():return [s['id'] for s in json.loads(api(h['server'],'/api/projects/'+p.locator('#projectPicker').input_value(),token=token)[1])['project']['slides']]
    ready()
    # Layout: the strip sits above the canvas toolbar; six 180 x 101 thumbnails sit in one row.
    assert p.evaluate("document.querySelector('.page-strip').compareDocumentPosition(document.querySelector('.canvas-toolbar'))&Node.DOCUMENT_POSITION_FOLLOWING")
    assert p.locator('.page-strip #slideList').count()==1 and p.locator('.page-strip #addSlide').count()==1 and p.locator('.story-panel').is_hidden()
    assert p.locator('#addSlide').text_content().strip()=='+' and p.locator('#addSlide').get_attribute('aria-label')=='Add a slide'
    boxes=[p.locator('#slideList .thumbnail').nth(i).bounding_box() for i in range(6)]
    assert all(round(b['width'])==180 and round(b['height'])==101 and round(b['y'])==round(boxes[0]['y']) for b in boxes),boxes
    # Six fixed 180 px thumbnails need 1160 px; at 1440 the canvas column leaves about 976 px, so the row scrolls sideways.
    visible=p.evaluate("(()=>{const l=document.querySelector('#slideList'),r=l.getBoundingClientRect();return [...l.querySelectorAll('.thumbnail')].filter(b=>b.getBoundingClientRect().right<=r.right+1).length})()")
    assert p.evaluate("(()=>{const l=document.querySelector('#slideList');return getComputedStyle(l).overflowX==='auto'})()")
    assert p.locator('#slideList .thumbnail').first.get_attribute('aria-label').startswith('Slide 1: ')
    print(f'PASS: strip above the canvas, six 180 x 101 thumbnails in one row ({visible} fully visible at 1440, the rest by sideways scroll), + keeps its label',flush=True)
    # Drag page 5 before page 2: a 2 px line marks the drop point, the order changes, undo restores it.
    before=order();assert stored()==before
    src=p.locator('#slideList .thumbnail').nth(4).bounding_box();dst=p.locator('#slideList .thumbnail').nth(1).bounding_box()
    p.mouse.move(src['x']+90,src['y']+50);p.mouse.down();p.mouse.move(src['x']+60,src['y']+50,steps=4);p.mouse.move(dst['x']+30,dst['y']+50,steps=12)
    line=p.locator('#slideList .drop-line');assert line.is_visible(),'drop line during dragover'
    lb=line.bounding_box();assert round(lb['width'])==2 and dst['x']-16<=lb['x']<=dst['x'],(lb,dst)
    p.mouse.up()
    moved=[before[0],before[4],before[1],before[2],before[3],before[5]]
    assert order()==moved,order();assert line.is_hidden()
    labels=p.eval_on_selector_all('#slideList .thumbnail','els=>els.map(e=>[e.getAttribute("aria-label").split(":")[0],e.getAttribute("aria-current"),e.draggable])')
    assert [l[0] for l in labels]==[f'Slide {i}' for i in range(1,7)] and all(l[2] for l in labels),labels
    saved();assert stored()==moved
    print('PASS: drag page 5 before page 2: drop line, new order, labels renumbered, autosaved',flush=True)
    p.locator('#undo').click();ready();assert order()==before;saved();assert stored()==before
    print('PASS: undo restores the original order',flush=True)
    # Keyboard: Alt+Down / Alt+Up on the focused thumbnail move the current page.
    p.locator('#slideList .thumbnail').first.focus();p.keyboard.press('Alt+ArrowDown');ready()
    assert order()==[before[1],before[0],*before[2:]],order()
    p.keyboard.press('Alt+ArrowUp');ready();assert order()==before
    print('PASS: Alt+Down / Alt+Up move the current page',flush=True)
    # 390 px: the strip stays at the top this round (M8 moves it to the bottom) and scrolls sideways.
    p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(150)
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    strip=p.locator('.page-strip').bounding_box();stage=p.locator('#stage').bounding_box();assert strip['y']<stage['y']
    assert p.evaluate("(()=>{const l=document.querySelector('#slideList');return l.scrollWidth>l.clientWidth&&getComputedStyle(l).overflowX==='auto'})()")
    print('PASS: 390 px: strip above the canvas, horizontal scroll, no page overflow',flush=True)
    assert not h['errors'],h['errors']

if __name__=='__main__':main()
