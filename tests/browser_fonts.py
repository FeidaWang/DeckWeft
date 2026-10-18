"""Actual Chromium Canvas/SVG tests. Test-only Playwright; no font redistribution.
Default direct navigation; --mode fixture is explicitly not a CSP/real-device test.
"""
from pathlib import Path
import argparse, json
from browser_harness import studio_browser, ROOT

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['direct','fixture'],default='direct');parser.add_argument('--out',default='test-results/fonts');args=parser.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    cases=[
      ('English kerning','en','AVATAR office — a clear idea.','Tight pairs: AV WA To. Wide WWW and narrow iii. Preserve e\u0301 accents.'),
      ('Chinese punctuation','zh-CN','让每一个好想法，都有足够的空间。','“先说清楚，再排漂亮。”保留标点、层级与留白。'),
      ('Mixed scripts','zh-CN','Ideas，值得被清楚表达。','English 与中文混排。Keep 2026 and typography readable.'),
      ('Emoji clusters','en','A family of ideas 👨‍👩‍👧‍👦','Café e\u0301 · 🇦🇺 · 👩🏽‍💻 · Start together, stay together.'),
      ('Hard line breaks','en','Make room for the next idea.','  Keep spaces\tand tabs.\r\n\r\nKeep hard breaks.\n'),
      ('Long unbroken text','en','Keep all characters.','https://example.test/'+('abcXYZ0123'*8)),
      ('Dense overflow','zh-CN','内容过多时，不隐藏文字。','很多文字需要空间。'*200),
    ]
    project=json.loads((ROOT/'examples/welcome.deck.json').read_text());project['slides']=project['slides'][:1]
    with studio_browser(args.mode) as h:
      p=h['page'];p.wait_for_selector('#canvas svg',timeout=30000)
      p.evaluate('window.fontTestProjects = '+json.dumps(project))
      samples=[json.loads((ROOT/f'examples/{name}').read_text()) for name in ['welcome.deck.json','welcome.zh-CN.deck.json']]
      p.evaluate('window.fontTestSamples = '+json.dumps(samples))
      results=p.evaluate('''async ({cases,ratios})=>{
        const {BrowserTextMeasurer}=await import('./text-measurer.js');
        const {fitText,graphemes}=await import('/shared/text.mjs');
        const m=new BrowserTextMeasurer(),token=(await(await fetch('/api/session')).json()).token;
        const call=async(route,body)=>{const r=await fetch(route,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
        const rows=[];let changedFits=0,checkedBoxes=0;
        for(const [name,locale,title,body] of cases)for(const ratio of ratios){
          const project=structuredClone(window.fontTestProjects);project.locale=locale;project.aspectRatio=ratio;
          const s=project.slides[0];s.content={eyebrow:'TYPE / TEST',title,body,items:[],metrics:[]};s.design.layout='auto';
          const plan=(await call('/api/measure/plan',{project})).data,shaped=await m.resolve(plan);
          for(let i=0;i<plan.requests.length;i++){
            const request=plan.requests[i],fit=shaped.results[i],boundaries=new Set([0,request.text.length,...graphemes(request.text).map(g=>g.end)]);
            if(fit.ranges.map(([a,b])=>request.text.slice(a,b)).join('')!==request.text)throw Error('Lost text: '+name);
            if(fit.ranges.some(([a,b])=>!boundaries.has(a)||!boundaries.has(b)))throw Error('Split a grapheme');
            const estimate=fitText(request.text,request.box,request.style);
            if(estimate.fontSize!==fit.fontSize||JSON.stringify(estimate.ranges)!==JSON.stringify(fit.ranges))changedFits++;
            checkedBoxes++;
          }
          const resolved=await call('/api/measure/resolve',{planId:plan.id,...shaped});if(resolved.status!==200)throw Error(JSON.stringify(resolved));
          if(resolved.data.choices.length!==4)throw Error('Expected four layouts');
          let inspectedTextNodes=0;const boxErrors=[];
          if(resolved.data.audit.ok){
            const handoff=await call('/api/export/figma',{project,renderTicket:resolved.data.renderTicket,requireMeasured:true});
            if(handoff.status!==200)throw Error('Measured export failed');
            const scene=handoff.data.scenes[0],div=document.createElement('div');div.style.cssText='position:fixed;left:-12000px;top:0';div.innerHTML=resolved.data.slides[0].svg;document.body.append(div);
            for(const node of scene.nodes.filter(n=>n.type==='text')){
              const el=div.querySelector(`[data-node="${node.id}"] text`),bounds=el.getBBox();inspectedTextNodes++;
              // Half a pixel accommodates raster/rounding differences; overhang allowed 2 px.
              if(bounds.x<node.x-2||bounds.y<node.y-2||bounds.x+bounds.width>node.x+node.w+0.5||bounds.y+bounds.height>node.y+node.h+0.5)boxErrors.push({id:node.id,bounds:{x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height},box:{x:node.x,y:node.y,w:node.w,h:node.h}});
              if(node.measurement!=='browser-canvas')throw Error('Export lost measurement source');
            }
            div.remove();
          }else{
            const blocked=await call('/api/export/pptx',{project,renderTicket:resolved.data.renderTicket,requireMeasured:true});if(blocked.status!==422)throw Error('Overflow was not blocked');
          }
          if(boxErrors.length)throw Error(JSON.stringify({name,ratio,boxErrors}));
          rows.push({name,locale,ratio,layouts:4,requests:plan.requests.length,exportBlocked:!resolved.data.audit.ok,inspectedTextNodes,fontProbes:shaped.environment.fontProbes});
        }
        // Full bundled decks catch compound recipes (number + label + body),
        // which isolated title/body fixtures do not exercise.
        const sampleDecks=[];
        for(const project of window.fontTestSamples){
          const plan=(await call('/api/measure/plan',{project})).data,shaped=await m.resolve(plan);
          const resolved=await call('/api/measure/resolve',{planId:plan.id,...shaped});
          if(resolved.status!==200||!resolved.data.audit.ok)throw Error(JSON.stringify({sample:project.locale,audit:resolved.data.audit}));
          const handoff=await call('/api/export/figma',{project,renderTicket:resolved.data.renderTicket,requireMeasured:true});
          if(handoff.status!==200)throw Error('Sample export failed');
          let inspectedTextNodes=0;
          for(let i=0;i<handoff.data.scenes.length;i++){
            const scene=handoff.data.scenes[i],div=document.createElement('div');div.style.cssText='position:fixed;left:-12000px;top:0';div.innerHTML=resolved.data.slides[i].svg;document.body.append(div);
            for(const node of scene.nodes.filter(n=>n.type==='text')){
              const el=div.querySelector(`[data-node="${node.id}"] text`),b=el.getBBox();inspectedTextNodes++;
              if(b.x<node.x-2||b.y<node.y-2||b.x+b.width>node.x+node.w+.5||b.y+b.height>node.y+node.h+.5)throw Error('Sample geometry overflow: '+project.locale+' '+node.id);
              if(node.measurement!=='browser-canvas')throw Error('Sample lost actual measurement');
            }
            div.remove();
          }
          sampleDecks.push({locale:project.locale,slides:project.slides.length,requests:plan.requests.length,layoutCandidates:project.slides.length*4,inspectedTextNodes,exportBlocked:false});
        }
        return {rows,checkedBoxes,changedFits,sampleDecks};
      }''',{'cases':cases,'ratios':['16:9','4:3','1:1','9:16']})
      assert not h['errors'],h['errors']
      report={'mode':args.mode,'browser':h['browser'].version,'cases':len(results['rows']),'layoutCandidates':4*len(results['rows']),'actualCanvas':True,'realOSIME':False,'directCSP':args.mode=='direct',**results,'pageErrors':h['errors']}
      (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
      print(json.dumps({k:v for k,v in report.items() if k!='rows'},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
