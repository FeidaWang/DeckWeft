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
export function sessionRecovery({t,setToken}){
  let pending=null,declined=false;
  const notConnected=()=>Object.assign(new Error(t('Not connected. Your edits remain in this window; choose Save to reconnect.','尚未连接。修改仍保留在此窗口；点击保存即可重新连接。')),{code:'AUTH_REQUIRED'});
  function reconnect(){
    if(declined)return Promise.reject(notConnected());
    pending??=(async()=>{
      try{
        const ok=await ask('sessionDialog',{title:t('The local studio restarted.','本地工作室已重新启动。'),
          body:t('Reconnect and keep your current edits? Nothing is saved until the save finishes; a newer saved version is never overwritten.','重新连接并保留当前修改？保存完成前不会写入；已保存的较新版本不会被覆盖。'),
          confirm:t('Reconnect and keep edits','重新连接并保留修改'),cancel:t('Not now','暂不')});
        if(!ok){declined=true;throw notConnected();}
        const response=await fetch('/api/session');if(!response.ok)throw new Error(t('The studio is not answering yet. Your edits remain here; try Save again.','工作室暂未响应。修改仍保留在这里，请再次保存。'));
        setToken((await response.json()).token);
      }finally{pending=null;}
    })();
    return pending;
  }
  reconnect.offerAgain=()=>{declined=false;};
  return reconnect;
}

// The revision check refused a save. Resolves true when the author chooses a separate copy.
export function askSaveCopy(t){
  return ask('conflictDialog',{title:t('A newer version was saved elsewhere.','其他位置已保存了较新版本。'),
    body:t('Your edits are still here. Save them as a separate copy; the newer version stays unchanged.','你的修改仍在这里。可另存为独立副本，较新版本保持不变。'),
    confirm:t('Save as a separate copy','另存为独立副本'),cancel:t('Keep editing','继续编辑')});
}
