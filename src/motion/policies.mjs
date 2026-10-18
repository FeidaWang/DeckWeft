/** The operating-system reduction preference always wins; state still applies instantly. */
export function effectiveMotion({policy='off',durationMs=0,reduced=false,visible=true,active=true}={}){
 return {enabled:policy==='subtle'&&!reduced&&visible&&active&&durationMs>0,durationMs:policy==='subtle'&&!reduced&&visible&&active?Math.min(400,Math.max(0,durationMs)):0};
}
