/** Small framework-free interaction primitives; also tested in Node. */
export class EditHistory {
  constructor(limit=50,clock=()=>Date.now()){this.limit=limit;this.clock=clock;this.reset();}
  reset(){this.past=[];this.future=[];this.group=null;this.last=0;}
  endGroup(){this.group=null;}
  capture(project,active,group=null){
    const now=this.clock();
    if(!group||group!==this.group||now-this.last>900){
      this.past.push({project:structuredClone(project),active});if(this.past.length>this.limit)this.past.shift();
    }
    this.group=group;this.last=now;this.future=[];
  }
  step(project,active,redo=false){
    const from=redo?this.future:this.past,to=redo?this.past:this.future;if(!from.length)return null;
    to.push({project:structuredClone(project),active});const next=from.pop();
    next.project.revision=structuredClone(project.revision);this.endGroup();return next;
  }
}
export function keyboardAction(event,{editing=false,modal=false,composing=false,presenting=false}={}){
  if(composing||event.isComposing||event.keyCode===229||event.altKey||event.repeat)return null;
  const key=event.key;
  if(key==='Escape')return modal?null:'escape';
  if(modal)return null;
  if((event.metaKey||event.ctrlKey)&&key.toLowerCase()==='s')return 'save';
  if((event.metaKey||event.ctrlKey)&&key.toLowerCase()==='z'&&!editing)return event.shiftKey?'redo':'undo';
  if(event.metaKey||event.ctrlKey||editing)return null;
  if(presenting){if(['ArrowRight','PageDown',' '].includes(key))return 'next';if(['ArrowLeft','PageUp'].includes(key))return 'previous';if(key==='Home')return 'first';if(key==='End')return 'last';return null;}
  return /^[1-4]$/.test(key)?`layout-${key}`:null;
}
export function validSlideAction(type,index,count){
  return type==='up'?index>0:type==='down'?index<count-1:type==='delete'?count>1:['add','duplicate'].includes(type)?count<100:false;
}
export class DialogManager {
  constructor(document){this.document=document;this.origins=new WeakMap();this.drawer=null;
    document.addEventListener('keydown',event=>{
      if(event.key!=='Tab'||event.isComposing)return;
      const dialog=document.activeElement?.closest('dialog[open]')||[...document.querySelectorAll('dialog[open]')].at(-1);if(!dialog)return;
      const items=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
      if(!items.length){event.preventDefault();dialog.focus();return;}
      const index=items.indexOf(document.activeElement);
      if(index<0||(!event.shiftKey&&index===items.length-1)||(event.shiftKey&&index===0)){event.preventDefault();items[event.shiftKey?items.length-1:0].focus();}
    });
    for(const dialog of document.querySelectorAll('dialog')){
      dialog.addEventListener('close',()=>{if(dialog.id==='drawerDialog')this.restoreDrawer();this.returnFocus(dialog);});
      dialog.addEventListener('click',event=>{if(event.target!==dialog||dialog.dataset.busy==='true')return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    }
  }
  open(dialog,origin=this.document.activeElement){if(dialog.open)return;this.origins.set(dialog,origin);dialog.showModal();}
  returnFocus(dialog){let el=this.origins.get(dialog);if(el?.isConnected&&!el.getClientRects().length){if(el.closest('#moreDialog'))el=this.document.querySelector('#openMore');else if(el.closest('.story-panel'))el=this.document.querySelector('#toggleStory');else if(el.closest('.inspector'))el=this.document.querySelector('#toggleInspector');}if(el?.isConnected&&!el.disabled&&el.getClientRects().length)el.focus({preventScroll:true});}
  openDrawer(kind,origin){
    const dialog=this.document.querySelector('#drawerDialog');
    if(this.drawer){dialog.close();this.restoreDrawer();}
    const selector=kind==='story'?'.story-panel':'.inspector',panel=this.document.querySelector(selector);
    const trigger=origin||this.document.querySelector(kind==='story'?'#toggleStory':'#toggleInspector');
    const placeholder=this.document.createComment(`drawer-${kind}`);panel.replaceWith(placeholder);
    this.document.querySelector('#drawerContent').append(panel);this.drawer={kind,panel,placeholder,trigger};
    dialog.dataset.side=kind;trigger.setAttribute('aria-expanded','true');this.open(dialog,trigger);
  }
  restoreDrawer(){if(!this.drawer)return;const {panel,placeholder,trigger}=this.drawer;placeholder.replaceWith(panel);trigger.setAttribute('aria-expanded','false');this.drawer=null;}
  closeDrawer(){const d=this.document.querySelector('#drawerDialog');if(d.open)d.close();this.restoreDrawer();}
  resize(width){if(this.drawer&&width>(this.drawer.kind==='story'?680:1050))this.closeDrawer();}
}
