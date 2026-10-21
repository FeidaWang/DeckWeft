// DWI-011 evidence: every slide of the palette variant decks has its scene's derived canvas as its background and draws its text colour. Run after scripts/export-targets.mjs --dwi.
const R=new URL('../../../../../',import.meta.url).href.replace('file://','');
const {readFile,writeFile}=await import('node:fs/promises');const {readZip}=await import(R+'src/targets/pptx/audit.mjs');const {paletteRoles}=await import(R+'src/design/semantic-colors.mjs');const {DWI_PALETTES}=await import(R+'tests/dwi-slice.mjs');
const PREFIX={as:'assertion',cmp:'comparison',sm:'chart',flow:'workflow',mech:'mechanism',brief:'brief'},result={source:'dist/dwi-export-targets (scripts/export-targets.mjs --dwi, isolated Chrome for Testing 151)',decks:{}};
let ok=true;
for(const l of ['en','zh-CN']){
 const files=readZip(await readFile(R+`dist/dwi-export-targets/decks/dwi-slice-palette-${l}/dwi-slice-palette-${l}.pptx`));
 const slides=[...files.keys()].filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)));
 result.decks[l]=slides.map((n,i)=>{const x=files.get(n).toString(),prefix=x.match(/name="([a-z]+)-[a-z0-9-]+\//)?.[1],scene=PREFIX[prefix],ref=DWI_PALETTES[scene],r=paletteRoles(ref),colors=new Set([...x.matchAll(/srgbClr val="([0-9A-F]{6})"/gi)].map(m=>m[1].toUpperCase()));
  const bg=x.match(/<p:bg>[\s\S]*?srgbClr val="([0-9A-F]{6})"/i)?.[1]?.toUpperCase(),roles=Object.fromEntries(Object.entries({text:r.text,accent:r.accent,secondary:r.secondary,mutedText:r.mutedText,...Object.fromEntries(r.series.map((c,k)=>['series'+k,c]))}).map(([k,c])=>[k,colors.has(c.slice(1))]));
  const pass=bg===r.canvas.slice(1)&&roles.text;ok&&=pass;return {slide:i+1,scene,palette:`${ref.id}/${ref.mode}`,background:bg,canvas:r.canvas.slice(1),backgroundMatches:bg===r.canvas.slice(1),rolesPresent:roles};});
}
result.pass=ok;await writeFile(R+'docs/evidence/dwi/phase-01/dwi-011/pptx-colours.json',JSON.stringify(result,null,1)+'\n');console.log('pass',ok);
