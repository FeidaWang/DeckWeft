/** Render task evidence as text, including host-authored content. Never interpret it as HTML. */
export function renderEvidence(box,evidence,t){
 const h=evidence?.hostAuthored,r=evidence?.review||{attestation:'unattested',verdict:null,controls:null};
 const count=h?.total??t('not recorded','未记录'),pages=(h?.pages||[]).map(p=>t(`page ${p.page} (${p.sceneId}): ${p.lines.length}`,`第 ${p.page} 页（${p.sceneId}）：${p.lines.length} 行`));
 box.textContent=t(`Host-added lines: ${count}${pages.length?' · '+pages.join('; '):''}${h?.unlocated?` · page location unavailable: ${h.unlocated}`:''}. Unverified; check these lines. Review attestation: ${r.attestation} · verdict: ${r.verdict||'not reviewed'} · Pixel controls (hits/total): ${r.controls?`${r.controls.hits}/${r.controls.total}`:'not run'}. Attestation describes evidence, not judgment accuracy.`,
  `宿主新增：${count}${pages.length?' · '+pages.join('；'):''}${h?.unlocated?` · 页位置不可用：${h.unlocated} 行`:''}。未经核实，请复核这些行。评审声明：${r.attestation} · 结论：${r.verdict||'未评审'} · 像素对照（命中/总数）：${r.controls?`${r.controls.hits}/${r.controls.total}`:'未运行'}。声明说明证据来源，不保证判断正确。`);
}
export function renderAddedLines(box,page,t){
 box.replaceChildren();box.hidden=!page?.lines.length;if(box.hidden)return;
 const label=document.createElement('p'),list=document.createElement('ul');label.textContent=t(`Host added · ${page.lines.length} line(s) · unverified`,`宿主新增 · ${page.lines.length} 行 · 未经核实`);
 for(const text of page.lines){const li=document.createElement('li');li.dataset.hostAuthoredLine='';li.textContent=text;list.append(li);}box.append(label,list);
}
