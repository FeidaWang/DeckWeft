/** Validate the data-only SVG path vocabulary before serialization; never repair invalid input. */
export function validPath(path){
 const token=/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[A-Za-z]/g,parts=path.match(token)||[];
 if(path.replace(token,'').replace(/[\s,]/g,'')||!/^m$/i.test(parts[0]||''))return false;
 const arity={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};let i=0,command;
 while(i<parts.length){
  if(/^[A-Za-z]$/.test(parts[i]))command=parts[i++].toUpperCase();
  if(!Object.hasOwn(arity,command))return false;
  const size=arity[command];if(!size){if(i<parts.length&&!/^[A-Za-z]$/.test(parts[i]))return false;continue;}
  if(i+size>parts.length)return false;const values=parts.slice(i,i+size).map(Number);
  if(values.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6))return false;
  if(command==='A'&&(values[0]<0||values[1]<0||![0,1].includes(values[3])||![0,1].includes(values[4])))return false;
  i+=size;
 }
 return true;
}
