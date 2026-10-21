#!/usr/bin/env python3
"""Optional preparation check; needs already installed Playwright and Chromium.
No installation or remote resource loading is performed. This tests the static
catalogue only, using a supplied HTML string rather than browser file navigation.
"""
from pathlib import Path
import json
import shutil
import sys
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print('BLOCKED: Playwright is not installed; nothing was installed automatically.', file=sys.stderr)
    raise SystemExit(2)
chromium = shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium:
    print('BLOCKED: Chromium executable not found; no browser was downloaded.', file=sys.stderr)
    raise SystemExit(2)
root=Path(__file__).resolve().parents[1]
results={'scope':'static-palette-catalogue-only','checks':[],'networkRequests':[],'pageErrors':[],'limitations':['Not the future DeckWeft Studio; no assistive-technology or full WCAG acceptance.','Managed Chromium blocked file-scheme navigation; tests render the supplied HTML string using set_content, not a file-navigation capability claim.']}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=chromium,headless=True,args=['--no-sandbox'])
 results['browserVersion']=browser.version
 for name,w,h in [('desktop',1440,1000),('mobile',390,844)]:
  context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
  page=context.new_page()
  page.on('pageerror',lambda e:results['pageErrors'].append(str(e)))
  def stop_remote(route):
   results['networkRequests'].append(route.request.url);route.abort()
  page.route('http://**',stop_remote);page.route('https://**',stop_remote)
  page.set_content((root/'palette-catalog.html').read_text(encoding='utf-8'),wait_until='load')
  assert page.locator('article').count()==22
  assert page.locator('article:visible').count()==22
  overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
  assert not overflow, f'{name} horizontal overflow'
  page.screenshot(path=str(root/f'reports/catalogue-{name}.png'))
  page.get_by_label('Find a palette').fill('moonrise')
  assert page.locator('article:visible').count()==3
  assert page.locator('#count').inner_text()=='3 palettes shown'
  page.get_by_label('Find a palette').fill('no-matching-palette')
  assert page.locator('article:visible').count()==0
  page.get_by_label('Find a palette').fill('BottleRocket1')
  page.locator('article:visible summary').click()
  assert page.locator('article:visible details').get_attribute('open') is not None
  results['checks'].append({'viewport':name,'width':w,'height':h,'cards':22,'search':True,'comparisonDisclosure':True,'horizontalOverflow':False,'status':'pass'})
  context.close()
 browser.close()
assert not results['pageErrors'];assert not results['networkRequests']
results['passed']=True
(root/'reports/catalogue-browser-check.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
