"""Compatibility entry point for the expanded acceptance suite (defaults to direct).
It first checks autosave on its own page: one typed character reaches the store within 1.5 s, with no key or click.
"""
import argparse, json, time
from browser_acceptance import main
from browser_harness import studio_browser, api

def autosave(mode):
  with studio_browser(mode) as h:
    p=h['page']
    # Function predicates: the studio CSP has no 'unsafe-eval', and Playwright evals bare expression strings.
    p.wait_for_function("() => document.querySelector('#fitStatus').textContent.includes('ready to export')",timeout=30000)
    token=json.loads(api(h['server'],'/api/session')[1])['token']
    def revision():return json.loads(api(h['server'],'/api/projects/'+p.locator('#projectPicker').input_value(),token=token)[1])['project']['revision']['number']
    before=revision();p.locator('#slideTitle').focus();p.keyboard.press('End')
    started=time.monotonic();p.keyboard.type('!')
    p.wait_for_function("() => document.querySelector('#saveState').dataset.state==='saved'",timeout=1500)
    elapsed=time.monotonic()-started
    assert revision()==before+1,'the autosave reached the store'
    assert not h['errors'],h['errors']
    print(f'PASS: autosave: one typed character saved in {elapsed:.2f} s (limit 1.5 s), revision {before} -> {before+1}',flush=True)

if __name__=='__main__':
  mode=argparse.ArgumentParser(add_help=False);mode.add_argument('--mode',choices=['direct','fixture'],default='direct')
  autosave(mode.parse_known_args()[0].mode);main()
