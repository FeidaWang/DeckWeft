// DWI-032 evidence: the share of each measured scene's useful area taken by its evidence objects, from the layouts the
// isolated-browser export run measured (node scripts/export-targets.mjs --dwi). Writes evidence-share.json beside this file.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const R=fileURLToPath(new URL('../../../../../',import.meta.url));
const a=await import(R+'src/design/attention-policy.mjs'),{dwiSliceProject}=await import(R+'tests/dwi-slice.mjs');
const out={source:'dist/dwi-export-targets/decks/*/layout.json (Chrome for Testing 151, 1440 px)',band:a.EVIDENCE_SHARE,decks:{}};
for(const deck of ['dwi-slice-en','dwi-slice-zh-CN','dwi-slice-palette-en','dwi-slice-palette-zh-CN']){
 const l=JSON.parse(await readFile(R+`dist/dwi-export-targets/decks/${deck}/layout.json`,'utf8')),p=await dwiSliceProject(deck.includes('zh')?'zh-CN':'en');
 out.decks[deck]=l.scenes.map(s=>{const sc=p.plan.scenes.find(x=>x.id===s.sceneId),family=a.layoutFamilyOf(p.document,sc),e=a.evidenceShare(s),figureLed=a.FIGURE_LED.includes(family);
  return {sceneId:s.sceneId,family,figureLed,share:Math.round(e.share*1000)/1000,evidence:e.blocks,inBand:figureLed?e.share>=a.EVIDENCE_SHARE.min&&e.share<=a.EVIDENCE_SHARE.max:null};});
}
await writeFile(new URL('./evidence-share.json',import.meta.url),JSON.stringify(out,null,1)+'\n');
console.log(Object.entries(out.decks).map(([d,r])=>d+': '+r.filter(x=>x.figureLed).map(x=>`${x.sceneId} ${x.share}${x.inBand?'':' (outside band)'}`).join(', ')).join('\n'));
