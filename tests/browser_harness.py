"""Explicit browser modes. 'direct' checks actual loopback navigation and CSP.
'fixture' loads real source into an offline page and bridges to the live API.
It never changes managed browser policy. Playwright is a TEST dependency only.
"""
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlparse
import json, os, subprocess, tempfile, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
@contextmanager
def studio_browser(mode='direct', viewport=None):
    with tempfile.TemporaryDirectory(prefix='deckweft-browser-') as folder:
        process=subprocess.Popen(['node',str(ROOT/'bin/deckweft.mjs'),'studio','--home',str(Path(folder).resolve()),'--port','0'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        try:
            line=process.stdout.readline().strip()
            if not line.startswith('DeckWeft Studio: '): raise RuntimeError('Studio did not start: '+line)
            server=line.split(': ',1)[1]
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True)
                context=browser.new_context(viewport=viewport or {'width':1600,'height':1000},accept_downloads=True)
                errors=[]
                def page_setup(page):
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    if mode=='direct':
                        page.goto(server,wait_until='domcontentloaded');return
                    if mode!='fixture':raise ValueError('Use direct or fixture')
                    def route(r):
                        req=r.request;u=urlparse(req.url)
                        if u.netloc!='deckweft.test':r.abort();return
                        headers={}
                        for key in ['authorization','content-type']:
                            if req.headers.get(key): headers[key]=req.headers[key]
                        request=urllib.request.Request(server+u.path+('?' + u.query if u.query else ''),data=req.post_data_buffer,headers=headers,method=req.method)
                        try:response=urllib.request.urlopen(request,timeout=25)
                        except urllib.error.HTTPError as e:response=e
                        out_headers=dict(response.headers)
                        # This is an offline cross-origin fixture, NOT CSP certification.
                        out_headers.pop('Content-Security-Policy',None)
                        out_headers['Access-Control-Allow-Origin']='*'
                        out_headers['Access-Control-Allow-Headers']='*'
                        r.fulfill(status=response.status,headers=out_headers,body=response.read())
                    page.route('**/*',route)
                    page.evaluate("""if(!crypto.randomUUID) Object.defineProperty(crypto,'randomUUID',{value:()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return [...b].map((v,i)=>([4,6,8,10].includes(i)?'-':'')+v.toString(16).padStart(2,'0')).join('')}})""")
                    page.set_content((ROOT/'public/index.html').read_text().replace('<head>','<head><base href="https://deckweft.test/">'))
                page=context.new_page();page_setup(page)
                try:
                    yield {'page':page,'context':context,'setup':page_setup,'server':server,'browser':browser,'errors':errors,'folder':Path(folder),'mode':mode}
                finally:
                    # Runs when the test body raises too; the browser owns only its own temporary context.
                    browser.close()
        finally:
            # TERM, bounded wait, then KILL and wait: a server that ignores TERM does not keep the port or profile alive.
            process.terminate()
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill();process.wait(timeout=10)

def api(server,route,body=None,token=None,method=None):
    req=urllib.request.Request(server+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},method=method or ('POST' if body is not None else 'GET'))
    try: response=urllib.request.urlopen(req,timeout=25)
    except urllib.error.HTTPError as e:response=e
    return response.status, response.read()
