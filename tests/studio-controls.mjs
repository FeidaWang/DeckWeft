// Follow the same disclosure controls as an author; never unhide nodes in test code.
// Single entry step 3: Visual Studio uses the shared shell. Words and Look are always shown on a wide screen (the Edit bar opens
// them on a phone), the drawer (More) holds the prompt workbench, versions, the deck list and the developer tools, and Take away
// is the one export dialog. The image review left the browser, so there is no 'review' disclosure any more.
const isOpen=(page,selector)=>page.locator(selector).evaluate(n=>!!n.open);
// A modal dialog over the live preview: the preview is an out-of-process frame, and for the first frame after the dialog opens
// Chromium can still route a click at that point to the frame underneath. Let the dialog paint before clicking in it.
const painted=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
/** Close the drawer, Take away and the phone sheet when they are open, so the page behind them takes clicks again. */
export async function closeStudio(page){
 for(const [dialog,close] of [['#moreDialog','#moreDialog [data-close="moreDialog"]'],['#exportDialog','#exportClose'],['#drawerDialog','#drawerDialog [data-close="drawerDialog"]']])
  if(await page.locator(dialog).count()&&await isOpen(page,dialog)){await page.locator(close).click();await page.locator(dialog).waitFor({state:'hidden'});}
}
export async function revealStudio(page,kind){
 const open=async(selector)=>{if(!await page.locator(selector).evaluate(n=>n.open))await page.locator(selector+' > summary').click();};
 const drawer=async()=>{if(!await isOpen(page,'#moreDialog')){await closeStudio(page);await page.locator('#openMore').click();await page.locator('#moreDialog').waitFor({state:'visible'});await painted(page);}};
 if(kind==='create'||kind==='agent'){
  // create: the first-run paste box when the library is empty, else the prompt workbench; agent: always the prompt workbench.
  if(kind==='create'&&await page.locator('#firstRun').count()&&await page.locator('#firstRun').isVisible())return;
  await drawer();await open('#workbenchStart');
 }else if(kind==='library'||kind==='developer')await drawer();
 else if(kind==='revision'){await drawer();await open('#workbenchRevisionPanel');}
 else if(kind==='edit'||kind==='compositions'){
  await closeStudio(page);const zone=kind==='edit'?'[data-zone=words]':'[data-zone=look]';
  if(!await page.locator(zone).isVisible()){await page.locator('#toggleInspector').click();await painted(page);}
  await page.locator(zone).scrollIntoViewIfNeeded();
 }else if(kind==='file'){if(!await isOpen(page,'#exportDialog')){await closeStudio(page);await page.locator('#openExport').click();await page.locator('#exportDialog').waitFor({state:'visible'});await painted(page);}}
}
/** Open a saved deck from the drawer's deck list, then close the drawer. */
export async function openDeck(page,id){await revealStudio(page,'library');await page.locator('#projectPicker').selectOption(id);await closeStudio(page);}
/** Autosave runs 1.2 s after the last edit; resolves once the state square says saved. */
export const saved=page=>page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.state==='saved',{},{timeout:30000});
/** ⌘/Ctrl S with nothing open over the page (the shortcut does not reach a modal dialog), then the saved square. */
export async function saveNow(page){await closeStudio(page);await page.keyboard.press('Control+s');await saved(page);}

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
