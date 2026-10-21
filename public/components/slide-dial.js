// DWI-041: the slide dial. It represents the integer page index of the open deck on a native range input (one detent per page,
// bounded, no wrap), with previous and next buttons as the non-gesture route. Selection follows the stable page id, so a reorder
// keeps the same page and a deleted page falls back to its neighbour. It reads keys only while it has focus: no global wheel or
// arrow handling, and no navigation while text is being edited or an IME composition is open. The metal look is CSS over the input.
/** The page to show after the list changed: the same id when it still exists, otherwise the nearest earlier position. */
export function reconcileSelection(ids,selectedId,previousIndex=0){
 if(!Array.isArray(ids)||ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)throw TypeError('Page ids must be unique non-empty strings.');
 if(!ids.length)return {id:null,index:-1,count:0};
 const at=ids.indexOf(selectedId),index=at>=0?at:Math.max(0,Math.min(ids.length-1,Number.isSafeInteger(previousIndex)?previousIndex:0));
 return {id:ids[index],index,count:ids.length};
}
/** The page `delta` detents away, clamped to the deck. */
export function step(ids,selectedId,delta,previousIndex=0){
 if(!Number.isSafeInteger(delta))throw TypeError('A dial step is a whole number of pages.');
 const s=reconcileSelection(ids,selectedId,previousIndex);if(!s.count)return s;
 const index=Math.max(0,Math.min(s.count-1,s.index+delta));return {id:ids[index],index,count:s.count};
}
/** Text the dial shows and announces: "3 / 12", with the page title for assistive technology. */
export const dialText=(index,count,title='')=>count?`${index+1} / ${count}${title?` · ${title}`:''}`:'';
/**
 * Mounts the dial in `root`. `select(id)` opens a page through the kind (undo and autosave follow); `onStep()` is told about each
 * detent change the author caused (the optional tick). `update(pages)` takes the shell's thumbnails ({id, title, active}).
 */
export function mountSlideDial(root,{select,onStep=()=>{},label=()=>'Pages',previous=()=>'Previous page',next=()=>'Next page'}={}){
 root.classList.add('slide-dial');root.setAttribute('role','group');root.setAttribute('aria-label',label());
 root.innerHTML='<button type="button" class="dial-step" data-dial="prev"><span aria-hidden="true">‹</span></button><input type="range" class="dial-range" min="1" max="1" step="1" value="1"><output class="dial-value"></output><button type="button" class="dial-step" data-dial="next"><span aria-hidden="true">›</span></button>';
 const range=root.querySelector('input'),out=root.querySelector('output'),prev=root.querySelector('[data-dial=prev]'),nextButton=root.querySelector('[data-dial=next]');
 let ids=[],titles=[],active=null,index=-1;
 function paint(i){const count=ids.length;out.textContent=dialText(i,count);range.setAttribute('aria-valuetext',dialText(i,count,titles[i]));}
 function update(pages){
  ids=pages.map(p=>p.id);titles=pages.map(p=>p.title||'');const s=reconcileSelection(ids,pages.find(p=>p.active)?.id??active,index);active=s.id;index=s.index;
  root.hidden=!s.count;range.max=String(Math.max(1,s.count));range.value=String(s.index+1);range.disabled=s.count<2;
  prev.disabled=s.index<=0;nextButton.disabled=s.index<0||s.index>=s.count-1;prev.setAttribute('aria-label',previous());nextButton.setAttribute('aria-label',next());range.setAttribute('aria-label',label());paint(s.index);
 }
 let signalled=-1;
 const go=i=>{if(i===index||i<0||i>=ids.length)return;index=i;active=ids[i];paint(i);if(signalled!==i)onStep(i);signalled=-1;select(ids[i]);};
 // While dragging, the value follows the pointer; the page opens when the input settles (change), so a scrub does not rebuild every page.
 range.addEventListener('input',()=>{const i=Number(range.value)-1;paint(i);if(i!==index&&i!==signalled){signalled=i;onStep(i);}});
 range.addEventListener('change',()=>go(Number(range.value)-1));
 range.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229)e.preventDefault();});
 prev.addEventListener('click',()=>go(step(ids,active,-1,index).index));
 nextButton.addEventListener('click',()=>go(step(ids,active,1,index).index));
 return {update,get state(){return {id:active,index,count:ids.length};}};
}
