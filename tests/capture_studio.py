"""Optional documentation capture, labelled by --mode; no rendered UI mockups."""
import argparse,json
from pathlib import Path
from browser_harness import studio_browser,ROOT

def main():
 a=argparse.ArgumentParser();a.add_argument('--mode',choices=['direct','fixture'],default='direct');a.add_argument('--out',default='test-results/screens');args=a.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 with studio_browser(args.mode) as h:
  p=h['page']
  # Function predicates: the studio CSP has no 'unsafe-eval'.
  def ready():p.wait_for_function("() => document.querySelector('#fitStatus').textContent.includes('ready to export') || document.querySelector('#fitStatus').textContent.includes('可以导出')",timeout=30000)
  ready();p.screenshot(path=str(out/'studio-desktop.png'))
  p.locator('#fileInput').set_input_files(ROOT/'examples/welcome.zh-CN.deck.json')
  p.wait_for_function("() => document.querySelector('#slideTitle').value.includes('好想法')");ready();p.locator('#uiLanguage').dispatch_event('click')  # hidden until the drawer (M5)
  p.screenshot(path=str(out/'studio-chinese.png'))
  p.locator('#slideTitle').fill('把好想法，讲得更清楚。');ready();p.wait_for_selector('#saveState[data-state="saved"]',state='attached')  # autosave
  p.locator('#openHistory').click();p.locator('[data-revision]').first.click();p.wait_for_selector('#historyCanvas svg',timeout=30000);p.screenshot(path=str(out/'history-chinese.png'))
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(200);p.screenshot(path=str(out/'history-mobile-loaded.png'))
  p.keyboard.press('Escape');p.wait_for_timeout(200);p.screenshot(path=str(out/'studio-mobile.png'))
  assert not h['errors'],h['errors']
  (out/'capture.json').write_text(json.dumps({'mode':args.mode,'browser':h['browser'].version,'pageErrors':h['errors'],'content':'bundled fictional/example decks'},indent=2)+'\n')
if __name__=='__main__':main()
