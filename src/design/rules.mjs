/** Match only rules in the selected pack. More specific role/mode overrides its broad preference. */
export function resolveScopedRules(pack,{role='context',mode='default'}={}){
 const matching=pack.rules.map((rule,index)=>({rule,index,specificity:(rule.sceneRole!=='any'?2:0)+(rule.mode!=='any'?1:0)})).filter(({rule})=>(rule.sceneRole==='any'||rule.sceneRole===role)&&(rule.mode==='any'||rule.mode===mode)).sort((a,b)=>a.specificity-b.specificity||a.index-b.index);
 const effective={};for(const {rule} of matching)effective[rule.property]={value:rule.value,severity:rule.severity,rationale:rule.rationale};
 // Content readability is an invariant, regardless of profile defaults or preference rules.
 effective.contrast={value:'required-text-readable',severity:'require',rationale:'Required content must remain readable.'};
 return effective;
}
