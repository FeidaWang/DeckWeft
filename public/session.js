import {t} from './i18n.js';
// Shared by the classic and visual studios. A restarted local studio issues a new session token, so a 401
// asks the author to reconnect. Reconnecting fetches the new token without reloading the page; the draft
// stays in this window's memory and the next save still sends its expected revision.

// Resolves true for the confirm button and false for cancel or Escape. The dialog is removed when it closes.
export function ask(id,{title,body,confirm,cancel}){
  document.getElementById(id)?.remove();
  const dialog=document.createElement('dialog'),heading=document.createElement('h2'),text=document.createElement('p'),actions=document.createElement('div');
  dialog.id=id;dialog.setAttribute('aria-labelledby',id+'Title');heading.id=id+'Title';heading.textContent=title;text.textContent=body;actions.className='dialog-actions';
  const button=(label,role,primary)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.session=role;if(primary)b.className='primary';actions.append(b);return b;};
  const no=button(cancel,'cancel',false),yes=button(confirm,'confirm',true);
  dialog.append(heading,text,actions);document.body.append(dialog);
  return new Promise(resolve=>{
    let answer=false;
    yes.onclick=()=>{answer=true;dialog.close();};no.onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();resolve(answer);},{once:true});
    dialog.showModal();yes.focus();
  });
}

// Returns reconnect(): one shared prompt for every request that failed while the dialog is open.
// It resolves after storing the new token, or rejects with AUTH_REQUIRED when the author declines.
// After a decline, background requests fail without asking again until offerAgain() (called by Save).
export function sessionRecovery({setToken}){
  let pending=null,declined=false;
  const notConnected=()=>Object.assign(new Error(t('classic.session.notConnectedYourEditsRemainIn')),{code:'AUTH_REQUIRED'});
  function reconnect(){
    if(declined)return Promise.reject(notConnected());
    pending??=(async()=>{
      try{
        const ok=await ask('sessionDialog',{title:t('classic.session.theLocalStudioRestarted'),
          body:t('classic.session.reconnectAndKeepYourCurrentEdits'),
          confirm:t('classic.session.reconnectAndKeepEdits'),cancel:t('classic.session.notNow')});
        if(!ok){declined=true;throw notConnected();}
        const response=await fetch('/api/session');if(!response.ok)throw new Error(t('classic.session.theStudioIsNotAnsweringYet'));
        setToken((await response.json()).token);
      }finally{pending=null;}
    })();
    return pending;
  }
  reconnect.offerAgain=()=>{declined=false;};
  return reconnect;
}

// The revision check refused a save. Resolves true when the author chooses a separate copy.
export function askSaveCopy(){
  return ask('conflictDialog',{title:t('classic.session.aNewerVersionWasSavedElsewhere'),
    body:t('classic.session.yourEditsAreStillHereSave'),
    confirm:t('classic.session.saveAsASeparateCopy'),cancel:t('classic.session.keepEditing')});
}
