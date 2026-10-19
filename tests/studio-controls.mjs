// Follow the same disclosure controls as an author; never unhide nodes in test code.
export async function revealStudio(page,kind){
 const open=async(selector)=>{if(!await page.locator(selector).evaluate(n=>n.open))await page.locator(selector+' > summary').click();};
 if(kind==='create'||kind==='library'){
  if(!await page.locator('#directionPanel').isVisible())await page.locator('#directionToggle').click();
  if(kind==='library')await open('.library-tools');else await open('#workbenchStart');
 }else if(kind==='edit'){
  if(!await page.locator('#inspectorPanel').isVisible())await page.locator('#inspectorToggle').click();
 }else if(kind==='revision'){
  await revealStudio(page,'edit');await open('#workbenchRevisionPanel');
 }else if(kind==='file')await open('.file-menu');
 else if(kind==='compositions')await open('.candidate-panel:not(.directions-panel)');
 else if(kind==='review')await open('#reviewPanel');
}

/**
 * The S7/F1 export dialog. Opens it from an export-group button (or keeps the open one with open:false), chooses the paging
 * option, ticks the author's acceptance when asked, runs the export and returns the dialog's state once it settled.
 * The caller waits for the download itself; a 'fail' or 'error' status downloads nothing.
 */
export async function studioExport(page,id,{paginate,accept=false,open=true}={}){
 if(open){await revealStudio(page,'file');await page.waitForFunction(s=>!document.querySelector(s).disabled,id);await page.locator(id).click();}
 await page.locator('#exportDialog').waitFor({state:'visible'});
 if(paginate&&await page.locator('#exportPaginate').isVisible())await page.locator('#exportPaginate').selectOption(paginate);
 if(accept)await page.locator('#exportAccept').check();
 await page.locator('#exportRun').click();
 await page.waitForFunction(()=>['pass','fail','accepted','error'].includes(document.querySelector('#exportStatus').dataset.status),{},{timeout:180000});
 return page.evaluate(()=>{const s=document.querySelector('#exportStatus');return {status:s.dataset.status,text:s.textContent,acceptedAt:s.dataset.acceptedAt||null,color:getComputedStyle(s).backgroundColor,failures:[...document.querySelectorAll('#exportTypography li')].map(l=>l.textContent),acceptVisible:!document.querySelector('#exportAcceptField').hidden,paginateVisible:!document.querySelector('#exportPaginateField').hidden};});
}
export const closeExportDialog=async page=>{await page.locator('#exportClose').click();await page.locator('#exportDialog').waitFor({state:'hidden'});};
