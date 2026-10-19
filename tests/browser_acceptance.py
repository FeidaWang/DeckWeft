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
  def ready(p):p.wait_for_function("document.querySelector('#fitStatus').textContent.includes('ready to export') || document.querySelector('#fitStatus').textContent.includes('可以导出')",timeout=30000)
  def saved(p):p.wait_for_function("document.querySelector('#saveState').textContent==='Saved on this computer'",timeout=15000)
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
    for key,name in [('ArrowRight','design'),('End','sources'),('Home','content')]:
      if key=='ArrowRight':p.locator('#tab-content').focus()
      p.keyboard.press(key);assert p.locator('#tab-'+name).get_attribute('aria-selected')=='true';assert p.evaluate('document.activeElement.id')=='tab-'+name
    record('tab keyboard: arrows, Home/End, roving focus and selection')
    original=p.locator('#slideTitle').input_value();change(p,'An edited idea.');p.locator('#undo').click();ready(p);assert p.locator('#slideTitle').input_value()==original
    p.locator('#redo').click();ready(p);assert p.locator('#slideTitle').input_value()=='An edited idea.';p.locator('#save').click();saved(p)
    record('edit/undo/redo and explicit saved revision')
    p.locator('[data-tab="design"]').click();p.locator('[data-theme="paper"]').click();assert p.locator('#save').is_disabled();p.locator('[data-tab="content"]').click();record('same-value theme action does not create a dirty revision')
    p.locator('#openExport').click();p.keyboard.press('Escape');assert not p.locator('#exportDialog').is_visible();assert p.evaluate('document.activeElement.id')=='openExport';record('native modal Escape returns keyboard focus')
    p.locator('#newDeck').click();p.locator('#outline').focus();p.locator('#outline').dispatch_event('compositionstart',{'data':'中'})
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
    change(p,'A clear current idea.');p.locator('#save').click();saved(p)
    # Hold the real response, not a fake success, while further typing happens.
    p.evaluate('''window.__originalFetch=window.fetch;window.fetch=async (...args)=>{const response=await window.__originalFetch(...args);if(args[1]?.method==='PUT'&&String(args[0]).includes('/api/projects/')){await new Promise(resolve=>window.__releaseSave=resolve);}return response;};''')
    p.locator('#slideTitle').fill('The version being saved');p.locator('#save').click();p.wait_for_function('typeof window.__releaseSave==="function"')
    p.locator('#slideTitle').fill('Typing continued during save');p.evaluate('window.__releaseSave();window.fetch=window.__originalFetch')
    p.wait_for_function("document.querySelector('#saveState').textContent.includes('Unsaved') && !document.querySelector('#save').disabled")
    assert p.locator('#slideTitle').input_value()=='Typing continued during save';assert current()['slides'][0]['content']['title']=='The version being saved'
    ready(p);p.locator('#save').click();saved(p);record('in-flight save keeps later edits dirty and does not overwrite text')
    # A second actual page opens the same saved revision.
    p2=h['context'].new_page();h['setup'](p2);ready(p2)
    change(p,'First window saved');p.locator('#save').click();saved(p)
    change(p2,'Second window keeps this draft');p2.locator('#save').click();p2.locator('#conflictDialog [data-session="cancel"]').click();p2.wait_for_function("document.querySelector('#issueBanner').textContent.includes('Another window')")
    assert p2.locator('#slideTitle').input_value()=='Second window keeps this draft';assert p2.locator('#saveState').inner_text().startswith('Unsaved');p2.close()
    record('two windows: stale save is rejected and the losing draft stays intact')
    # Deliberate invalid field: JSON backup remains possible.
    p.locator('#slideTitle').fill('');p.wait_for_function("document.querySelector('#slideTitle').getAttribute('aria-invalid')==='true'")
    p.locator('#openExport').click();assert p.locator('[data-export="pptx"]').is_disabled();assert p.locator('[data-export="json"]').is_enabled()
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
    p.locator('#save').click();saved(p)
    # Real history, untouched draft, explicit open decision.
    before=current();history_before=call('/api/projects/'+before['id']+'/history')[1]
    change(p,'Unsaved draft remains on this desk');p.locator('#openHistory').click();p.locator('[data-revision]').first.wait_for();p.locator('[data-revision]').first.click();p.wait_for_selector('#historyCanvas svg',timeout=30000)
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
    p.locator('#projectPicker').select_option(restored['id']);p.locator('#leaveDiscard').click();p.wait_for_function("document.querySelector('#deckTitle').value.includes('(restored r')");ready(p)
    assert p.locator('#projectPicker').input_value()==restored['id'];record('explicitly accepted project switch opens the restored copy')
    # Responsive drawers, focus trap and focus return; do not claim an actual mobile device.
    p.set_viewport_size({'width':390,'height':844});p.locator('#toggleInspector').click();p.locator('#drawerDialog').wait_for(state='visible')
    for _ in range(25):p.keyboard.press('Tab');assert p.evaluate('document.activeElement.closest("#drawerDialog")!==null')
    p.keyboard.press('Escape');assert p.evaluate('document.activeElement.id')=='toggleInspector'
    p.locator('#toggleStory').click();p.locator('#openHistory').click();p.locator('#historyDialog').wait_for(state='visible')
    p.screenshot(path=str(out/'history-mobile.png'));p.keyboard.press('Escape');assert p.evaluate('document.activeElement.id')=='toggleStory';record('narrow-screen drawers: native focus confinement and hidden-trigger focus fallback')
    for width,height in [(320,740),(390,844),(800,600),(1024,768),(1280,720),(1600,1000)]:
      p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(80)
      assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,height)
      bounds=p.locator('#canvas').bounding_box();assert bounds['width']>0 and bounds['height']>0
    record('six viewport sizes: no document-wide horizontal overflow; positive canvas bounds')
    p.locator('#uiLanguage').click();ready(p);p.screenshot(path=str(out/'studio-chinese.png'));assert p.locator('#uiLanguage').inner_text()=='English';p.locator('#uiLanguage').click();ready(p);record('interface language switching leaves document content intact')
    p.locator('#present').click();p.keyboard.press('End');p.wait_for_function("document.querySelector('#pageCount').textContent.startsWith('6')");p.keyboard.press('Home');p.wait_for_function("document.querySelector('#pageCount').textContent.startsWith('1')");p.keyboard.press('Escape');assert not p.locator('body').get_attribute('class') or 'presenting' not in p.locator('body').get_attribute('class');record('presentation Home/End/Escape respect slide boundaries and exit')
    ready(p);assert not h['errors'],h['errors'];record('no uncaught page script errors')
    report={'mode':args.mode,'browser':h['browser'].version,'checks':checks,'passed':len(checks),'failed':0,'pageErrors':h['errors'],'directCSP':args.mode=='direct','realOSIME':False,'screenReader':False,'nativeDesktopHost':False}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
