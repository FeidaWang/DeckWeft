"""Browser/API acceptance. Optional Playwright tooling, no runtime dependencies.
Use direct mode on a real developer machine; fixture mode does NOT certify CSP.
Synthetic composition events test event handling, not a real OS input method.
"""
from pathlib import Path
import argparse, json, zipfile
from browser_harness import studio_browser, api, ROOT

def main():
  parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['direct','fixture'],default='direct');parser.add_argument('--out',default='test-results/studio');args=parser.parse_args()
  out=Path(args.out);out.mkdir(parents=True,exist_ok=True);checks=[]
  def record(name):checks.append(name);print('PASS:',name,flush=True)
  def ready(p):p.wait_for_function("(()=>{const c=document.querySelector('#canvas');return c.getAttribute('aria-busy')==='false'&&!c.classList.contains('stale')&&document.querySelector('#saveState').dataset.state!=='attention';})()",timeout=30000)
  def saved(p):p.wait_for_function("document.querySelector('#saveState').dataset.state==='saved'",timeout=15000)
  def reveal_redo(p):
    # Real press-and-hold on Undo: Redo appears after 500 ms and the release must not count as an Undo.
    assert p.locator('#redo').is_hidden();box=p.locator('#undo').bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.down();p.wait_for_timeout(650);assert p.locator('#redo').is_visible();p.mouse.up()
  def change(p,text):p.locator('#slideTitle').fill(text);ready(p)
  with studio_browser(args.mode) as h:
    p=h['page'];ready(p)
    status,raw=api(h['server'],'/api/session');token=json.loads(raw)['token']
    def call(route,body=None,method=None):
      status,data=api(h['server'],route,body,token,method);return status,json.loads(data)
    def current():return call('/api/projects/'+p.locator('#projectPicker').input_value())[1]['project']
    assert p.locator('.thumbnail').count()==6 and p.locator('.candidate').count()==4
    assert p.locator('#moveUp').is_disabled();record('boot: six slides, four measured choices, first-slide boundary')
    p.screenshot(path=str(out/'studio-desktop.png'))
    # Layout candidates show a fit state, never a score: no run of two or more digits outside the preview picture.
    texts=p.evaluate("[...document.querySelectorAll('.candidate')].map(c=>[...c.children].filter(e=>!e.hasAttribute('aria-hidden')).map(e=>e.textContent).join(' ')+' '+c.title)")
    assert texts and not any(__import__('re').search(r'\d{2,}',t) for t in texts),texts;record('layout candidates carry no two-digit score text')
    # More drawer: hidden controls moved (not copied) into #moreDialog; Esc closes it and focus returns to #openMore.
    moved=['openHistory','openAgent','present','openRehearsal','uiLanguage','contentLocale','importButton','fileInput','projectPicker','newDeck','openSettings','openStoryboard']
    assert p.locator('#openMore').count()==1 and p.locator('#moreDialog').count()==1
    assert p.evaluate("ids=>ids.every(id=>document.querySelectorAll('#'+id).length===1&&document.querySelector('#'+id).closest('#moreDialog'))",moved),'moved controls live in the drawer'
    assert p.evaluate("!!document.querySelector('#moreDialog [data-export=json]')&&!!document.querySelector('#moreDialog .visual-studio-link')&&!document.querySelector('.tool-rail')&&!document.querySelector('#openShowcase')")
    p.locator('#openMore').click();assert p.locator('#moreDialog').is_visible();assert p.locator('#openHistory').is_visible();p.keyboard.press('Escape');assert not p.locator('#moreDialog').is_visible();assert p.evaluate('document.activeElement.id')=='openMore'
    record('more drawer holds the moved controls, opens from #openMore and returns focus on Escape')
    # Autosave: no click, no shortcut; the state square must settle within 1.5 s of the edit.
    p.locator('#slideTitle').fill('Autosave probe.');assert p.locator('#saveState').get_attribute('data-state')=='unsaved'
    p.wait_for_function("document.querySelector('#saveState').dataset.state==='saved'",timeout=1500);record('autosave: edit settles to data-state=saved within 1.5 s without a click')
    for key,name in [('ArrowRight','design'),('End','sources'),('Home','content')]:
      if key=='ArrowRight':p.locator('#tab-content').focus()
      p.keyboard.press(key);assert p.locator('#tab-'+name).get_attribute('aria-selected')=='true';assert p.evaluate('document.activeElement.id')=='tab-'+name
    record('tab keyboard: arrows, Home/End, roving focus and selection')
    original=p.locator('#slideTitle').input_value();change(p,'An edited idea.');p.locator('#undo').click();ready(p);assert p.locator('#slideTitle').input_value()==original
    reveal_redo(p);ready(p);assert p.locator('#slideTitle').input_value()==original;p.locator('#redo').click();ready(p);assert p.locator('#slideTitle').input_value()=='An edited idea.';saved(p);p.mouse.move(5,500)
    p.wait_for_function("document.querySelector('#redo').hidden",timeout=3000)
    record('edit/undo/redo: hold Undo to reveal Redo, release is not an Undo, Redo hides again, autosave settles')
    p.locator('[data-tab="design"]').click();p.locator('[data-theme="paper"]').click();assert p.locator('#save').is_disabled();p.locator('[data-tab="content"]').click();record('same-value theme action does not create a dirty revision')
    p.locator('#openExport').click();p.keyboard.press('Escape');assert not p.locator('#exportDialog').is_visible();assert p.evaluate('document.activeElement.id')=='openExport';record('native modal Escape returns keyboard focus')
    p.locator('#openMore').click();p.locator('#newDeck').click();p.locator('#outline').focus();p.locator('#outline').dispatch_event('compositionstart',{'data':'中'})
    p.keyboard.press('Escape');assert p.locator('#outlineDialog').is_visible();p.locator('#outline').dispatch_event('compositionend',{'data':'中'});p.keyboard.press('Escape');ready(p)
    record('synthetic IME: Escape does not dismiss a composing dialog')
    old_layout=p.locator('.candidate.selected').get_attribute('data-layout');oldrev=current()['revision']['number']
    p.locator('#slideTitle').dispatch_event('compositionstart',{'data':'中'})
    p.locator('#slideTitle').fill('中文输入中的完整句子。')
    p.locator('#slideTitle').dispatch_event('keydown',{'key':'1','isComposing':True,'bubbles':True})
    p.locator('#slideTitle').dispatch_event('keydown',{'key':'s','ctrlKey':True,'isComposing':True,'bubbles':True})
    assert current()['revision']['number']==oldrev and p.locator('#save').is_disabled()
    p.locator('#slideTitle').dispatch_event('compositionend',{'data':'中文输入中的完整句子。'});ready(p)
    assert p.locator('#slideTitle').input_value()=='中文输入中的完整句子。';record('synthetic IME: no layout hotkey/save while composing; full text preserved')
    change(p,'A clear current idea.');saved(p)
    # Hold the real response, not a fake success, while further typing happens.
    p.evaluate('''window.__originalFetch=window.fetch;window.fetch=async (...args)=>{const response=await window.__originalFetch(...args);if(args[1]?.method==='PUT'&&String(args[0]).includes('/api/projects/')){await new Promise(resolve=>window.__releaseSave=resolve);}return response;};''')
    p.locator('#slideTitle').fill('The version being saved');p.wait_for_function('typeof window.__releaseSave==="function"',timeout=5000)
    p.locator('#slideTitle').fill('Typing continued during save');p.evaluate('window.__releaseSave();window.fetch=window.__originalFetch')
    p.wait_for_function("document.querySelector('#saveState').dataset.state==='unsaved'",timeout=1100)
    assert p.locator('#slideTitle').input_value()=='Typing continued during save';assert current()['slides'][0]['content']['title']=='The version being saved'
    saved(p);assert current()['slides'][0]['content']['title']=='Typing continued during save';record('in-flight autosave keeps later edits dirty, does not overwrite text, and the next autosave stores them')
    # A second actual page opens the same saved revision.
    p2=h['context'].new_page();h['setup'](p2);ready(p2)
    change(p,'First window saved');saved(p)
    change(p2,'Second window keeps this draft');p2.wait_for_function("document.querySelector('#saveState').dataset.state==='attention'",timeout=5000)
    assert p2.locator('#issueBanner').text_content().find('Another window')>=0;assert not p2.locator('#conflictDialog').is_visible(),'autosave must not open the copy dialog by itself'
    assert current()['slides'][0]['content']['title']=='First window saved'
    p2.locator('#save').dispatch_event('click');p2.locator('#conflictDialog [data-session="cancel"]').click();p2.wait_for_function("document.querySelector('#issueBanner').textContent.includes('Another window')")
    assert p2.locator('#slideTitle').input_value()=='Second window keeps this draft';assert p2.locator('#saveState').get_attribute('data-state')=='attention';p2.close()
    record('two windows: autosave hits REVISION_CONFLICT, square turns attention without a dialog, manual save still offers the copy, losing draft stays intact')
    # Deliberate invalid field: JSON backup remains possible.
    p.locator('#slideTitle').fill('');p.wait_for_function("document.querySelector('#slideTitle').getAttribute('aria-invalid')==='true'")
    p.locator('#openExport').click();assert p.locator('[data-export="pptx"]').is_disabled();assert p.locator('[data-export="json"]').is_enabled();p.keyboard.press('Escape');p.locator('#openMore').click()
    with p.expect_download() as download:p.locator('[data-export="json"]').click()
    download.value.save_as(out/'invalid-draft.deck.json');assert json.loads((out/'invalid-draft.deck.json').read_text())['slides'][0]['content']['title']==''
    change(p,'Repaired current slide');assert p.locator('#slideTitle').get_attribute('aria-invalid') is None
    record('invalid field: inline error, visual-export block, lossless draft backup and repair')
    # Network failure is not silently swapped to an estimated ready preview.
    p.evaluate('''window.__originalFetch=window.fetch;window.fetch=(...a)=>String(a[0]).includes('/api/measure/plan')?Promise.reject(new TypeError('Offline test')):window.__originalFetch(...a);''')
    p.locator('#slideTitle').fill('Keep this during the outage');p.wait_for_function("document.querySelector('#issueBanner').textContent.includes('Offline test')")
    assert p.locator('#slideTitle').input_value()=='Keep this during the outage';assert p.locator('.candidate').first.is_disabled()
    p.evaluate('window.fetch=window.__originalFetch');change(p,'After reconnect');record('measurement network error retains draft, disables stale choices, recovers after edit')
    # New rapid edits abort stale generations; final text wins.
    p.locator('#slideTitle').fill('Old request');p.locator('#slideTitle').fill('Newest request');ready(p)
    assert 'Newest request' in p.locator('#canvas svg').text_content();assert 'Old request' not in p.locator('#canvas svg').text_content();record('rapid edits never display an older completed preview as current')
    # Measured output includes exact preview text and font family, remains native PPTX.
    p.locator('#openExport').click()
    with p.expect_download() as download:p.locator('[data-export="pptx"]').click()
    file=out/'browser-measured.pptx';download.value.save_as(file)
    with zipfile.ZipFile(file) as z:
      assert z.testzip() is None;xml=z.read('ppt/slides/slide1.xml').decode();assert 'Newest request' in xml and '<a:latin typeface=' in xml;assert not any(n.endswith(('.ttf','.otf','.woff','.woff2')) for n in z.namelist())
    record('measured export: editable PPTX text/font references; no bundled fonts')
    saved(p)
    # Real history, untouched draft, explicit open decision.
    before=current();history_before=call('/api/projects/'+before['id']+'/history')[1]
    change(p,'Unsaved draft remains on this desk');p.locator('#openMore').click();p.locator('#openHistory').click();p.locator('[data-revision]').first.wait_for();p.locator('[data-revision]').first.click();p.wait_for_selector('#historyCanvas svg',timeout=30000)
    assert p.locator('#historyDirty').is_visible();assert p.locator('#historyCanvas input').count()==0
    p.screenshot(path=str(out/'history-desktop.png'))
    p.locator('#historyNext').click();assert p.locator('#historyPageCount').inner_text().startswith('2 /');p.locator('#historyPrevious').click()
    record('history browsing: read-only measured snapshot, revision list and slide navigation')
    # Simulate successful POST with delayed response: close & selection locked until receipt.
    p.evaluate('''window.__originalFetch=window.fetch;window.fetch=async(...a)=>{const r=await window.__originalFetch(...a);if(String(a[0]).endsWith('/restore'))await new Promise(resolve=>window.__releaseRestore=resolve);return r;};''')
    p.locator('#restoreSnapshot').click();p.wait_for_function('typeof window.__releaseRestore==="function"');assert p.locator('#historyDialog [data-close]').is_disabled();assert p.locator('#historyRetry').is_disabled();p.keyboard.press('Escape');assert p.locator('#historyDialog').is_visible()
    p.evaluate('window.__releaseRestore();window.fetch=window.__originalFetch');p.locator('#historyOpenCopy').wait_for(state='visible')
    assert current()==before;record('restore: creates new id, original untouched; response race cannot dismiss the workflow')
    p.locator('#historyOpenCopy').click();p.locator('#leaveDialog').wait_for(state='visible');p.locator('#leaveDialog [data-close]').click();assert p.locator('#slideTitle').input_value()=='Unsaved draft remains on this desk';record('opening restored copy requires save/discard/keep-editing; cancellation protects draft')
    # Retrieve new id without mutating current. Open via library and explicitly discard this test draft.
    copies=call('/api/projects')[1]['projects'];restored=next(item for item in copies if item['id'].startswith('deck_restore_'))
    p.locator('#openMore').click();p.locator('#projectPicker').select_option(restored['id']);p.locator('#leaveDiscard').click();p.wait_for_function("document.querySelector('#deckTitle').value.includes('(restored r')");ready(p)
    p.locator('#moreDialog [data-close]').click();assert p.locator('#projectPicker').input_value()==restored['id'];record('explicitly accepted project switch opens the restored copy')
    # Responsive drawers, focus trap and focus return; do not claim an actual mobile device.
    p.set_viewport_size({'width':390,'height':844});p.locator('#toggleInspector').click();p.locator('#drawerDialog').wait_for(state='visible')
    for _ in range(25):p.keyboard.press('Tab');assert p.evaluate('document.activeElement.closest("#drawerDialog")!==null')
    p.keyboard.press('Escape');assert p.evaluate('document.activeElement.id')=='toggleInspector'
    p.locator('#openMore').click();p.locator('#openHistory').click();p.locator('#historyDialog').wait_for(state='visible')
    p.screenshot(path=str(out/'history-mobile.png'));p.keyboard.press('Escape');assert p.evaluate('document.activeElement.id')=='openMore';record('narrow-screen drawers: native focus confinement; history opened from More returns focus to #openMore')
    # Phone layout (design guide section 13) at 390 x 844: page strip at the bottom, Words/Look sheet, 44 px targets.
    p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(300);ready(p)
    assert p.evaluate('document.documentElement.scrollWidth')==390,'no horizontal overflow at 390'
    top=p.evaluate("[...document.querySelectorAll('.topbar button,.topbar input,.topbar [role=status]')].filter(e=>e.offsetParent!==null&&e.getBoundingClientRect().width>0).map(e=>e.id)")
    assert top==['saveState','openMore','openExport'],top
    assert p.evaluate("['deckTitle','undo'].every(id=>document.querySelector('#'+id).closest('#moreDialog'))"),'title and undo live at the top of the More drawer on phones'
    strip=p.evaluate("(()=>{const r=document.querySelector('.story-panel').getBoundingClientRect(),t=document.querySelector('.thumbnail').getBoundingClientRect();return [r.bottom,r.height,Math.round(t.width),Math.round(t.height)]})()")
    assert strip[0]==844 and round(strip[1])==96 and strip[2:]==[142,80],strip
    zones=p.evaluate("(()=>{const s=document.querySelector('.story-panel').getBoundingClientRect().top;return ['toggleStory','toggleInspector'].map(id=>{const e=document.querySelector('#'+id),r=e.getBoundingClientRect();return [e.innerText.trim(),Math.round(r.bottom),Math.round(r.height),Math.round(s),!!e.querySelector('.zone-square')]})})()")
    assert [z[0] for z in zones]==['Words','Look'] and all(z[1]<=z[3]+1 and z[2]>=44 and z[4] for z in zones),zones
    canvas=p.evaluate("(()=>{const r=document.querySelector('#canvas').getBoundingClientRect(),t=document.querySelector('.topbar').getBoundingClientRect().bottom,z=document.querySelector('#toggleStory').getBoundingClientRect().top;return [Math.round(r.left+r.width/2),r.top>=t-1,r.bottom<=z+1]})()")
    assert abs(canvas[0]-195)<=2 and canvas[1] and canvas[2],canvas
    small=p.evaluate("[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.className)")
    assert not small,small
    for button,visible,hidden in [('#toggleStory','#contentPanel','#designPanel'),('#toggleInspector','#designPanel','#contentPanel')]:
      p.locator(button).click();p.locator('#drawerDialog').wait_for(state='visible')
      sheet=p.evaluate("(()=>{const r=document.querySelector('#drawerDialog').getBoundingClientRect();return [Math.round(r.bottom),r.height<=innerHeight*0.7+1]})()")
      assert sheet==[844,True],sheet;assert p.locator(visible).is_visible() and not p.locator(hidden).is_visible()
      p.keyboard.press('Escape');assert p.evaluate('document.activeElement.id')==button[1:]
    record('phone layout 390: bottom page strip 96 high with 142x80 thumbnails, Words/Look sheet <= 70% high with one section at a time, 44 px targets, no overflow')
    for width,height in [(320,740),(390,844),(800,600),(1024,768),(1280,720),(1600,1000)]:
      p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(80)
      assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,height)
      bounds=p.locator('#canvas').bounding_box();assert bounds['width']>0 and bounds['height']>0
    record('six viewport sizes: no document-wide horizontal overflow; positive canvas bounds')
    p.locator('#openMore').click();p.locator('#uiLanguage').click();ready(p);p.screenshot(path=str(out/'studio-chinese.png'));assert p.locator('#uiLanguage').text_content()=='English';p.locator('#uiLanguage').click();ready(p);p.locator('#moreDialog [data-close]').click();record('interface language switching leaves document content intact')
    p.locator('#openMore').click();p.locator('#present').click();p.wait_for_function("document.body.classList.contains('presenting')");p.keyboard.press('End');p.wait_for_function("document.querySelector('#presenterPage').textContent.startsWith('6')");p.keyboard.press('Home');p.wait_for_function("document.querySelector('#presenterPage').textContent.startsWith('1')");p.keyboard.press('Escape');assert not p.locator('body').get_attribute('class') or 'presenting' not in p.locator('body').get_attribute('class');record('presentation Home/End/Escape respect slide boundaries and exit')
    ready(p);assert not h['errors'],h['errors'];record('no uncaught page script errors')
    report={'mode':args.mode,'browser':h['browser'].version,'checks':checks,'passed':len(checks),'failed':0,'pageErrors':h['errors'],'directCSP':args.mode=='direct','realOSIME':False,'screenReader':False,'nativeDesktopHost':False}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
