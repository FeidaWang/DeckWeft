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
 else if(kind==='compositions')await open('.candidate-panel');
 else if(kind==='review')await open('#reviewPanel');
}
