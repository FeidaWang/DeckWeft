// S9a author controls: the six-question entry and three directions, planned author actions, page planning from the argument,
// design profiles, and the PowerPoint / PDF / JSON export buttons. Every change is planned on the server, stated here, and
// applied through the Studio's single edit path, so Undo, Save, conflicts and History work unchanged.
export function mountAuthor({state,json,api,apply,download,error,message,x,workbench,save}){
 const $=s=>document.querySelector(s),t=(en,zh)=>state.ui==='zh-CN'?zh:en,say=v=>v?t(v.en,v.zh):'';
 let directions=null,plan=null,planCounter=-1,pagePlan=null,captureAvailable=false;
 // Direction previews are scaled to their card; the cards change width when panels open or close, not only on window resize.
 const cardsResized=new ResizeObserver(()=>dispatchEvent(new Event('resize')));cardsResized.observe($('#directionCards'));
 const answers=()=>({topic:$('#workbenchPrompt').value,audience:$('#entryAudience').value,style:$('#entryStyle').value,detail:$('#entryDetail').value,motion:$('#entryMotion').value,output:$('#entryOutput').value});
 const unitWords={question:['question','问题'],background:['background','背景'],mechanism:['mechanism','机制'],evidence:['evidence','证据'],limits:['limits','局限'],action:['action','行动']};
 function planHTML(p){if(!p)return '';const units=Object.keys(unitWords).map(u=>`<li class="${p.present.includes(u)?'present':p.missing.includes(u)?'missing':''}">${x(t(...unitWords[u]))}${p.present.includes(u)?' ✓':p.missing.includes(u)?' · '+x(t('missing','缺少')):''}</li>`).join('');
  return `<p>${x(t(`Argument units (detail: ${p.detail}): ${p.proposedPages} page(s) from ${p.suppliedPages} supplied.`,`${({brief:'简要',standard:'标准',detailed:'详细'})[p.detail]}程度的论证单元：由 ${p.suppliedPages} 页原文规划为 ${p.proposedPages} 页。`))}</p><ul class="units">${units}</ul>${p.questions.length?`<ol class="plan-questions">${p.questions.map(q=>`<li>${x(say(q))}</li>`).join('')}</ol>`:''}<p class="hint">${x(t('DeckWeft never invents data or quotations to reach a page count; it asks, or marks a page evidence-required.','DeckWeft 不会为凑页数编造数据或引语；它会提问，或将页面标记为待补证据。'))}</p>`;}
 // ---- Three directions ----
 async function showDirections(){
  const a=answers(),deck=$('#entryBasis').value==='deck';
  if(deck&&!state.project)throw Error(t('Open a deck first, or choose “The text above”.','请先打开文稿，或选择“上方文字”。'));
  if(deck&&(state.dirty||state.drafts.size)&&!await save())return;
  if(!deck&&!a.topic.trim())throw Error(t('Enter the topic or the text to arrange first.','请先输入主题或需要排版的原文。'));
  $('#entryDirections').disabled=true;$('#entryStatus').textContent=t('Drawing the same content three ways…','正在用三种方式绘制同一内容…');
  try{
   const r=await json('/api/visual/directions',{answers:a,...(deck?{project:state.project}:{locale:document.querySelector('[data-preference="outputLanguage"]').value})});
   directions={...r,deck,answers:a,counter:state.counter};
   $('#directionFacts').textContent=t(`Facts identical in all three directions (${r.factsHash.slice(0,12)}). Pick one to ${deck?'apply to this deck':'build the deck'}; Undo returns to the previous design.`,`三个方向事实完全相同（${r.factsHash.slice(0,12)}）。选择其一${deck?'应用于当前文稿':'生成整套演示'}；撤销可回到之前的设计。`);
   $('#entryPagePlan').innerHTML=planHTML(r.pagePlan);
   $('#directionCards').innerHTML=r.sets.map((s,k)=>{const e=s.explanation;return `<article class="direction-card" data-direction="${k}"><h3>${k+1} · ${x(say(e.title))}</h3><p class="direction-why">${x(say(e.why))}</p><div class="candidate-window"><iframe title="${x(t('Direction ','方向 ')+(k+1))}" sandbox="allow-scripts" src="${s.artifactUrl}#scene=${encodeURIComponent(e.samples[0])}"></iframe></div><div class="sample-pages">${e.samples.map(id=>`<button type="button" data-sample="${x(id)}">${x(t('Page ','第 ')+(s.scenes.findIndex(v=>v.sceneId===id)+1)+t('',' 页'))}</button>`).join('')}</div><dl class="direction-explain">${[['graphics','Graphics','图形'],['type','Type','字体'],['media','Media','媒体'],['motion','Motion','动效'],['output','Output','输出']].map(([k2,en,zh])=>`<dt>${x(t(en,zh))}</dt><dd>${x(say(e[k2]))}</dd>`).join('')}</dl>${e.kept.length?`<p class="hint">${x(t(`${e.kept.length} page(s) keep an author-locked theme or composition.`,`${e.kept.length} 页保留作者锁定的主题或构图。`))}</p>`:''}<p class="candidate-fit" role="status">${x(t('Measuring fonts and layout…','正在测量字体与排版…'))}</p><button type="button" data-use-direction="${k}" disabled>${x(t('Use this direction','使用此方向'))}</button></article>`;}).join('');
   $('#directionsPanel').open=true;dispatchEvent(new Event('resize'));$('#entryStatus').textContent=t('Three directions are on the stage. Compare them, then choose.','三个方向已显示在画布区，比较后再选择。');
  }finally{$('#entryDirections').disabled=false;}
 }
 function drawDirectionFit(k){const s=directions.sets[k],card=$(`[data-direction="${k}"]`),fits=s.fits;if(!card||!fits)return;
  const hard=fits.map((f,i)=>({i,r:f.reasons.filter(r=>!/presentation budget/.test(r))})).filter(v=>v.r.length),tall=fits.map((f,i)=>({i,h:Math.ceil(f.height)})).filter(v=>v.h>900);
  card.querySelector('.candidate-fit').textContent=hard.length?t('Does not fit: ','排版未通过：')+hard.map(v=>t('page ','第 ')+(v.i+1)+t('',' 页')+' — '+v.r.join(', ')).join('; '):t(`✓ Fits all ${fits.length} pages at 1440 px`,`✓ 1440 px 下全部 ${fits.length} 页通过`)+(tall.length?t(` · taller than the 900 px candidate budget (recorded, not blocked): page ${tall.map(v=>v.i+1).join(', ')}`,` · 高于 900 px 候选预算（记录，不阻止）：第 ${tall.map(v=>v.i+1).join('、')} 页`):'');
  card.querySelector('[data-use-direction]').disabled=!!hard.length;}
 addEventListener('message',async e=>{const current=directions;if(!current)return;const k=[...document.querySelectorAll('.direction-card iframe')].findIndex(f=>f.contentWindow===e.source);if(k<0||e.data?.type!=='deckweft:web-fit'||e.data.fit?.renderHash!==current.sets[k].renderHash)return;
  try{const r=await json('/api/visual/candidate-measure',{ticket:current.sets[k].ticket,fit:e.data.fit});if(current!==directions)return;current.sets[k].fits=r.fits;drawDirectionFit(k);}catch(err){error(err);}});
 document.addEventListener('click',async e=>{
  const sample=e.target.closest('[data-sample]');if(sample){sample.closest('.direction-card').querySelector('iframe').contentWindow?.postMessage({type:'deckweft:select',sceneId:sample.dataset.sample},'*');return;}
  const use=e.target.closest('[data-use-direction]');if(!use||!directions)return;const k=Number(use.dataset.useDirection);
  try{
   if(directions.deck){if(state.counter!==directions.counter)throw Error(t('The deck changed. Show the directions again.','文稿已改变，请重新显示方向。'));const r=await json('/api/visual/select-direction',{project:state.project,tickets:directions.sets.map(s=>s.ticket),index:k});apply(r.project);message(t(`Direction ${k+1} applied to every page. Undo restores the previous design.`,`方向 ${k+1} 已应用到每一页；撤销可恢复之前的设计。`)+(r.overBudget.length?t(` ${r.overBudget.length} page(s) are taller than the 900 px candidate budget (recorded).`,` ${r.overBudget.length} 页高于 900 px 候选预算（已记录）。`):''));}
   else await workbench.generate({direction:{answers:directions.answers,index:k}});
  }catch(err){error(err);}
 });
 $('#entryDirections').onclick=()=>showDirections().catch(err=>{error(err);$('#entryStatus').textContent=err.message;});
 // ---- Author actions ----
 const page=()=>state.project?.plan.scenes.find(s=>s.id===state.active);
 const chapterOf=id=>{const p=state.project.plan,starts=new Set((p.chapters||[]).map(c=>c.startSceneId));let current=null;for(const s of p.scenes){if(starts.has(s.id))current=p.chapters.find(c=>c.startSceneId===s.id);if(s.id===id)return current;}return null;};
 const excerpt=b=>{const v=b.text||b.label||b.alt||(b.items||[]).join(' · ')||b.chartType||'';return [...v].length>34?[...v].slice(0,33).join('')+'…':v;};
 function drawControls(){
  workbench.scopeStatement?.();
  const p=state.project,s=page();if(!p||!s)return;const level=$('#actionLevel').value,ch=chapterOf(s.id);
  $('#actionLevel').querySelector('[value="chapter"]').disabled=!ch;if(level==='chapter'&&!ch)$('#actionLevel').value='page';
  const objects=s.blockIds.map(id=>p.document.blocks.find(b=>b.id===id)),keep=$('#actionObject').value;
  $('#actionObject').hidden=$('#actionLevel').value!=='object';$('#actionObject').replaceChildren(...objects.map(b=>new Option(`${b.type} · ${excerpt(b)}`,b.id)));if(objects.some(b=>b.id===keep))$('#actionObject').value=keep;
  const o=p.document.authorOverrides,locks=[[o.lockedBlockIds.filter(id=>s.blockIds.includes(id)).length,'text','文字'],[(o.lockedDatasetIds||[]).filter(d=>objects.some(b=>b.datasetId===d)).length,'data','数据'],[(o.lockedSourceIds||[]).filter(v=>objects.some(b=>b.sourceIds.includes(v))).length,'sources','来源'],[o.sceneLocks?.find(l=>l.sceneId===s.id)?.fields.includes('composition')?1:0,'composition','构图']];
  $('#lockSummary').textContent=t(`This page: ${locks.map(l=>l[0]+' '+l[1]).join(', ')} lock(s) · ${o.lockMode==='separate'?'separate':'combined'} lock mode${ch?` · chapter ${ch.id}`:''}.`,`本页锁定：${locks.map(l=>l[2]+' '+l[0]).join('，')} · ${o.lockMode==='separate'?'分项':'合并'}锁定模式${ch?` · 章节 ${ch.id}`:''}。`);
  $('#replaceAsset').replaceChildren(...p.assets.map(a=>new Option(`${a.id} · ${a.alt}`,a.id)));
 }
 function scopeOf(action){const level=['start-chapter'].includes(action)?'page':action==='remove-chapter'?'chapter':action==='replace-visual'?'object':$('#actionLevel').value,s=page();
  // Replace the visual acts on one image: the chosen object when it is an image, otherwise this page's first image.
  const image=id=>state.project.document.blocks.find(b=>b.id===id)?.type==='image';
  if(action==='replace-visual')return {level,id:$('#actionLevel').value==='object'&&image($('#actionObject').value)?$('#actionObject').value:s.blockIds.find(image)||null};
  return {level,id:level==='deck'?null:level==='chapter'?chapterOf(s.id)?.id:level==='page'?s.id:$('#actionObject').value};}
 async function planAction(button){
  const action=button.dataset.authorAction,p=state.project;if(!p)throw Error(t('Open a deck first.','请先打开文稿。'));
  if(state.drafts.size)throw Error(t('Repair unapplied field edits first.','请先修复尚未应用的字段修改。'));
  const options={};if(action==='replace-visual'){if($('#replaceFields').hidden){$('#replaceFields').hidden=false;throw Error(t('Choose the new image and describe it, then press Replace the visual again.','请选择新图片并填写替代文字，再次点击“替换视觉”。'));}options.assetId=$('#replaceAsset').value;options.alt=$('#replaceAlt').value;}
  if(['lock','unlock'].includes(action))options.kind=$('#lockKind').value;
  if(action==='apply-profile'){options.profileId=$('#profileList').value;if(!options.profileId)throw Error(t('Save or import a profile first.','请先保存或导入配置。'));}
  const scope=scopeOf(action);if(scope.level!=='deck'&&!scope.id)throw Error(action==='replace-visual'?t('This page has no image to replace.','本页没有可替换的图片。'):t('Choose the chapter or object first.','请先选择章节或对象。'));
  plan=await json('/api/visual/author-action',{project:p,action,...scope,options});planCounter=state.counter;
  $('#actionTitle').textContent=button.textContent;$('#actionScope').textContent=say(plan.scopeStatement);
  $('#actionEffects').innerHTML=plan.effects.map(v=>`<li>${x(say(v))}</li>`).join('')||`<li>${x(t('No change.','没有修改。'))}</li>`;
  $('#actionKept').innerHTML=plan.kept.map(v=>`<li>${x(say(v))}</li>`).join('');
  $('#actionApply').disabled=!plan.changed;$('#actionPlan').hidden=false;$('#actionPlan').scrollIntoView({block:'nearest'});
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-author-action]');if(b)planAction(b).catch(error);});
 $('#actionApply').onclick=()=>{try{if(!plan?.changed)return;if(planCounter!==state.counter)throw Error(t('The deck changed after this plan. Plan the action again.','计划之后文稿已改变，请重新规划。'));apply(plan.project);message(t('Applied as stated. Undo restores the previous state; Save keeps it.','已按说明应用。撤销可恢复，保存后保留。'));plan=null;$('#actionPlan').hidden=true;$('#replaceFields').hidden=true;}catch(err){error(err);}};
 $('#actionCancel').onclick=()=>{plan=null;$('#actionPlan').hidden=true;$('#replaceFields').hidden=true;};
 $('#actionLevel').onchange=drawControls;
 // ---- Pages from the argument ----
 $('#planPages').onclick=async()=>{try{if(!state.project)throw Error(t('Open a deck first.','请先打开文稿。'));const target=Number($('#planTarget').value)||undefined;pagePlan=await json('/api/visual/page-plan',{project:state.project,detail:$('#planDetail').value,...(target?{targetPages:target}:{})});pagePlan.counter=state.counter;
  const n=id=>state.project.plan.scenes.findIndex(s=>s.id===id)+1;
  $('#pagePlan').innerHTML=planHTML(pagePlan)+`<table><thead><tr><th>${x(t('Page','页'))}</th><th>${x(t('Unit','单元'))}</th><th>${x(t('Why','依据'))}</th><th>${x(t('Pages','页数'))}</th></tr></thead><tbody>${pagePlan.scenes.map(s=>`<tr><td>${n(s.sceneId)}</td><td>${x(t(...unitWords[s.unit]))}</td><td>${x(s.basis+' · '+s.cue)}</td><td>${s.pages}${s.advice?' · '+x(t('reduce text','减少文字')):''}</td></tr>`).join('')}</tbody></table>${pagePlan.evidenceRequired.length?`<p>${x(t(`Mark marks page ${pagePlan.evidenceRequired.map(n).join(', ')} evidence-required: final exports refuse them until you supply the evidence or mark them illustrative.`,`“标记”会将第 ${pagePlan.evidenceRequired.map(n).join('、')} 页设为待补证据：在补充证据或标为示意之前，最终导出会拒绝这些页面。`))}</p>`:''}${pagePlan.scenes.some(s=>s.splitAt)?`<p>${x(t(`Split moves whole blocks to continuation pages after page ${pagePlan.scenes.filter(s=>s.splitAt).map(s=>n(s.sceneId)).join(', ')}; no text is rewritten.`,`“拆分”把整块内容移到第 ${pagePlan.scenes.filter(s=>s.splitAt).map(s=>n(s.sceneId)).join('、')} 页之后的续页；不改写文字。`))}</p>`:''}`;
  $('#pagePlan').hidden=false;$('#planMark').disabled=!pagePlan.evidenceRequired.length;$('#planSplit').disabled=!pagePlan.scenes.some(s=>s.splitAt);}catch(err){error(err);}};
 async function applyPlan(kind){if(!pagePlan||pagePlan.counter!==state.counter)throw Error(t('Plan the pages again: the deck changed.','文稿已改变，请重新规划页数。'));const {counter,...plain}=pagePlan,r=await json('/api/visual/page-plan/apply',{project:state.project,plan:plain,[kind]:true});apply(r.project);message(t(`${r.changes.length} change(s) applied${r.skipped.length?`, ${r.skipped.length} skipped`:''}. Undo restores the previous pages.`,`已应用 ${r.changes.length} 项修改${r.skipped.length?`，跳过 ${r.skipped.length} 项`:''}；撤销可恢复之前的页面。`));pagePlan=null;$('#planMark').disabled=$('#planSplit').disabled=true;}
 $('#planMark').onclick=()=>applyPlan('mark').catch(error);$('#planSplit').onclick=()=>applyPlan('split').catch(error);
 // ---- Design profiles ----
 async function profiles(){const r=await json('/api/visual/profiles',undefined,'GET'),keep=$('#profileList').value;$('#profileList').replaceChildren(...r.profiles.map(p=>new Option(`${p.name} · ${p.theme}`,p.id)));if(r.profiles.some(p=>p.id===keep))$('#profileList').value=keep;return r.profiles;}
 $('#profileSave').onclick=async()=>{try{if(!state.project)throw Error(t('Open a deck first.','请先打开文稿。'));if((state.dirty||state.drafts.size)&&!await save())return;const r=await json('/api/visual/profiles',{project:state.project,name:$('#profileName').value,attest:$('#profileAttest').checked});await profiles();$('#profileList').value=r.profile.id;message(t(`Profile “${r.profile.name}” saved (${r.profile.acceptance.kind==='workbench-review'?'from the passing image review':'accepted by you'}): theme, ${r.profile.compositions.length} composition choice(s), type and motion. No text or images.`,`配置“${r.profile.name}”已保存（${r.profile.acceptance.kind==='workbench-review'?'来自通过的图片审阅':'由你确认接受'}）：主题、${r.profile.compositions.length} 项构图选择、字体与动效；不含文字与图片。`));}catch(err){error(err);}};
 $('#profileExport').onclick=async()=>{try{const id=$('#profileList').value;if(!id)throw Error(t('Choose a profile.','请选择配置。'));download(await(await api('/api/visual/profiles/'+id,undefined,'GET')).blob(),id+'.design-profile.json');}catch(err){error(err);}};
 $('#profileImport').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>200000)throw Error(t('Choose a profile smaller than 200 KB.','请选择小于 200 KB 的配置文件。'));const r=await json('/api/visual/profiles/import',{profile:JSON.parse(await file.text())});await profiles();$('#profileList').value=r.profile.id;message(t(r.copied?'Profile imported as a copy (that id was taken).':'Profile imported.',r.copied?'配置已作为副本导入（原 id 已被使用）。':'配置已导入。'));}catch(err){error(err);}finally{e.target.value='';}};
 // ---- Export menu: PowerPoint and PDF through the export order, JSON as the complete project ----
 async function exportTarget(format){const r=await api('/api/visual/export',{project:state.project,format,ticket:state.render?.ticket});download(await r.blob(),'deckweft-visual.'+format);message(t(`${format==='pptx'?'PowerPoint':'PDF'} exported through the export order (${r.headers.get('X-DeckWeft-Export-Order')}). Levels: ${r.headers.get('X-DeckWeft-Levels')}; ${r.headers.get('X-DeckWeft-Receipts')} element receipt(s). Open it in the target application to check it.`,`${format==='pptx'?'PowerPoint':'PDF'} 已按导出顺序导出（${r.headers.get('X-DeckWeft-Export-Order')}）。等级：${r.headers.get('X-DeckWeft-Levels')}；${r.headers.get('X-DeckWeft-Receipts')} 项元素回执。请在目标应用中打开检查。`));}
 $('#exportPPTX').onclick=()=>exportTarget('pptx').catch(error);$('#exportPDF').onclick=()=>exportTarget('pdf').catch(error);$('#exportJSON').onclick=()=>$('#backup').click();
 json('/api/visual/workbench-capabilities',undefined,'GET').then(c=>{captureAvailable=c.captureAvailable;status();}).catch(error);
 function status(){const html=$('#exportHTML'),blocked=!captureAvailable;for(const id of ['#exportPPTX','#exportPDF']){$(id).disabled=html.disabled||blocked;$(id).title=blocked?t('Start the studio with --capture-browser to export PowerPoint and PDF.','以 --capture-browser 启动 Studio 才能导出 PowerPoint 与 PDF。'):'';}$('#exportJSON').disabled=!state.project;}
 // The session token arrives after mount, so the list loads when the author opens these controls.
 $('#authorControls').addEventListener('toggle',()=>{if($('#authorControls').open)profiles().catch(error);});
 return {status,drawControls,profiles};
}
